import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  computeCostUsd,
  createUsageScanner,
  estimateTokens,
  extractUsageFromSseFrame,
  lookupModelPrice,
  recordUsage,
  buildUsageRow,
} from '../../lib/ai-assistant/bolu-usage-ledger.ts'

const CHAT_ROUTE = path.resolve('api/bolu-chat.ts')
const LEDGER_MIGRATION = path.resolve('supabase/migrations/20261115170000_bolu_usage_ledger.sql')
const USAGE_API = path.resolve('api/ai-usage.ts')

// ============================================================
// 0. WIRING
// ============================================================

test('Wiring: the chat route logs usage on both success paths and both failure paths', () => {
  const source = fs.readFileSync(CHAT_ROUTE, 'utf8')
  const calls = source.split('logBoluUsage(').length - 1
  // Two definition-independent call sites per path: exact connection and pool.
  assert.ok(calls >= 4, `Expected at least four logBoluUsage call sites, found ${calls}`)
  assert.ok(source.includes('onComplete?.(scanner.result(), scanner.text())'), 'The stream must report usage on completion')
  assert.ok(source.includes('success: true'), 'A completed request must be logged as a success')
  assert.ok(source.includes('success: false'), 'A failed attempt must be logged')
})

test('Wiring: the chat route never blocks the response on the ledger write', () => {
  const source = fs.readFileSync(CHAT_ROUTE, 'utf8')
  assert.ok(
    source.includes('void logBoluUsage('),
    'Ledger writes must be fire-and-forget so the response is never delayed',
  )
})

test('Wiring: a client-supplied tenant is re-verified before it is written', () => {
  const source = fs.readFileSync(CHAT_ROUTE, 'utf8')
  assert.ok(source.includes('resolveVerifiedTenantId'), 'The tenant id must be verified')
  assert.ok(source.includes("rpc('is_workspace_member'"), 'Verification must use workspace membership')
})

test('Wiring: the ledger migration denies client access and grants the summary to service_role', () => {
  const sql = fs.readFileSync(LEDGER_MIGRATION, 'utf8')
  assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'), 'The ledger must have RLS enabled')
  assert.ok(sql.includes('USING (false)'), 'Client access must be denied')
  assert.ok(
    sql.includes('REVOKE ALL ON FUNCTION public.app_ai_usage_summary(integer, integer) FROM PUBLIC, anon, authenticated;'),
    'The summary function must not be executable by browser roles',
  )
  assert.ok(
    sql.includes('GRANT EXECUTE ON FUNCTION public.app_ai_usage_summary(integer, integer) TO service_role;'),
    'Only service_role may execute the summary function',
  )
})

test('Wiring: the usage API is restricted to platform administrators', () => {
  const source = fs.readFileSync(USAGE_API, 'utf8')
  assert.ok(source.includes('verifyPlatformAdmin'), 'The usage API must require a platform administrator')
})

// ============================================================
// 1. PROVIDER-REPORTED USAGE
// ============================================================

test('Usage: a provider usage frame is read from the SSE payload', () => {
  const frame =
    'data: {"id":"chatcmpl-1","choices":[],"model":"nvidia/nemotron-3.5-bolt-e4b",' +
    '"usage":{"prompt_tokens":10,"completion_tokens":11,"total_tokens":21,' +
    '"prompt_tokens_details":{"cached_tokens":0},"completion_tokens_details":{"reasoning_tokens":0}}}'

  const usage = extractUsageFromSseFrame(frame)
  assert.ok(usage)
  assert.equal(usage.promptTokens, 10)
  assert.equal(usage.completionTokens, 11)
  assert.equal(usage.totalTokens, 21)
  assert.equal(usage.source, 'provider')
})

test('Usage: a frame without usage, a non-data line and malformed JSON return null', () => {
  assert.equal(extractUsageFromSseFrame('data: {"choices":[{"delta":{"content":"hi"}}]}'), null)
  assert.equal(extractUsageFromSseFrame('event: ping'), null)
  assert.equal(extractUsageFromSseFrame('data: [DONE]'), null)
  assert.equal(extractUsageFromSseFrame('data: {not json'), null)
  assert.equal(extractUsageFromSseFrame(''), null)
})

test('Usage: a missing total is derived from prompt and completion', () => {
  const usage = extractUsageFromSseFrame('data: {"usage":{"prompt_tokens":5,"completion_tokens":7}}')
  assert.ok(usage)
  assert.equal(usage.totalTokens, 12)
})

// ============================================================
// 2. STREAM SCANNING
// ============================================================

test('Usage: the scanner finds usage and accumulates output text across chunks', () => {
  const scanner = createUsageScanner()

  scanner.push('data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n')
  scanner.push('data: {"choices":[{"delta":{"content":"lo"}}]}\n\n')
  scanner.push('data: {"choices":[],"usage":{"prompt_tokens":12,' +
    '"completion_tokens":3,"total_tokens":15}}\n\n')
  scanner.push('data: [DONE]\n\n')
  scanner.flush()

  const usage = scanner.result()
  assert.ok(usage)
  assert.equal(usage.promptTokens, 12)
  assert.equal(usage.totalTokens, 15)
  assert.equal(scanner.text(), 'Hello')
})

test('Usage: a usage frame split across chunk boundaries is still found', () => {
  const scanner = createUsageScanner()
  scanner.push('data: {"choices":[],"usage":{"prompt_tokens":7,')
  scanner.push('"completion_tokens":2,"total_tokens":9}}\n\n')
  scanner.flush()

  const usage = scanner.result()
  assert.ok(usage)
  assert.equal(usage.totalTokens, 9)
})

test('Usage: a stream with no usage reports nothing rather than a false zero', () => {
  const scanner = createUsageScanner()
  scanner.push('data: {"choices":[{"delta":{"content":"only text"}}]}\n\n')
  scanner.flush()
  assert.equal(scanner.result(), null)
})

// ============================================================
// 3. ESTIMATION AND COST
// ============================================================

test('Usage: estimation is proportional to text length and never zero for content', () => {
  assert.equal(estimateTokens(''), 0)
  assert.ok(estimateTokens('hello world') > 0)
  assert.ok(estimateTokens('a'.repeat(400)) > estimateTokens('a'.repeat(40)))
})

test('Usage: a free-tier connection costs nothing', () => {
  const cost = computeCostUsd({
    isPaidTier: false,
    providerId: 'openrouter',
    modelId: 'baidu/ernie-5.5-flash-preview:free',
    promptTokens: 1000,
    completionTokens: 500,
  })
  assert.equal(cost.costUsd, 0)
  assert.equal(cost.costCurrency, 'USD')
})

test('Usage: a paid connection with a known price is costed', () => {
  const price = lookupModelPrice('plamo', 'plamo-3.1-prime')
  assert.ok(price)
  const cost = computeCostUsd({
    isPaidTier: true,
    providerId: 'plamo',
    modelId: 'plamo-3.1-prime',
    promptTokens: 1_000_000,
    completionTokens: 1_000_000,
  })
  assert.ok(cost.costUsd !== null)
  // 60 + 250 yen per million tokens, converted at the declared rate.
  assert.equal(Math.round(cost.costUsd * 1e6) / 1e6, Math.round(((60 + 250) / 150) * 1e6) / 1e6)
})

test('Usage: Zro free-tier Flash costs nothing on a free connection', () => {
  const cost = computeCostUsd({
    isPaidTier: false,
    providerId: 'zro',
    modelId: 'deepseek-v4.1-flash',
    promptTokens: 1_000_000,
    completionTokens: 1_000_000,
  })
  assert.equal(cost.costUsd, 0)
})

test('Usage: Zro paid prices come from the published model catalogue', () => {
  const price = lookupModelPrice('zro', 'deepseek-v4.1-flash')
  assert.ok(price)
  assert.equal(price.promptUsdPerMTok, 0.3)
  assert.equal(price.completionUsdPerMTok, 1.1)

  const cost = computeCostUsd({
    isPaidTier: true,
    providerId: 'zro',
    modelId: 'deepseek-v4.1-flash',
    promptTokens: 1_000_000,
    completionTokens: 1_000_000,
  })
  assert.equal(Math.round(cost.costUsd * 1e6) / 1e6, 1.4)
})

test('Usage: an unknown price is null, never a false zero', () => {
  const cost = computeCostUsd({
    isPaidTier: true,
    providerId: 'unknown-provider',
    modelId: 'unknown-model',
    promptTokens: 1000,
    completionTokens: 500,
  })
  assert.equal(cost.costUsd, null)
})

// ============================================================
// 4. LEDGER ROW AND WRITE
// ============================================================

test('Usage: the ledger row keeps the token source and never stores a false zero cost', () => {
  const row = buildUsageRow({
    tenantId: 'tenant-1',
    userId: 'user-1',
    userEmail: 'a@example.com',
    providerId: 'nvidia',
    modelId: 'nvidia/nemotron-3.5-bolt-e4b',
    connectionId: 'connection-1',
    counts: { promptTokens: 10, completionTokens: 11, totalTokens: 21, source: 'provider' },
    costUsd: null,
    costCurrency: 'USD',
    success: true,
    latencyMs: 420,
  })

  assert.equal(row.token_source, 'provider')
  assert.equal(row.total_tokens, 21)
  assert.equal(row.cost_usd, null)
  assert.equal(row.user_email, 'a@example.com')
  assert.equal(row.success, true)
})

test('Usage: a ledger write failure never throws', async () => {
  const client = {
    from: () => ({
      insert: async () => ({ error: { message: 'insert failed' } }),
    }),
  }
  await recordUsage(client, {
    providerId: 'nvidia',
    modelId: 'm',
    counts: { promptTokens: 1, completionTokens: 1, totalTokens: 2, source: 'provider' },
    costUsd: 0,
    costCurrency: 'USD',
    success: true,
  })
})
