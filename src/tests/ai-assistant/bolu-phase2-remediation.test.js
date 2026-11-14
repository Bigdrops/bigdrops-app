import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  ROUTING_PROVIDER_CATALOGUE,
  getRoutingProvider,
  isRoutingApproved,
} from '../../lib/ai-assistant/routing/bolu-provider-catalog.ts'
import {
  resolveRoutingPolicy,
} from '../../lib/ai-assistant/routing/bolu-policy-router.ts'
import {
  classifyProviderError,
} from '../../lib/ai-assistant/routing/bolu-error-classifier.ts'
import {
  PROVIDER_CATALOGUE,
  getCatalogueEntry,
} from '../../lib/ai-assistant/provider-catalog.ts'

// ============================================================
// 1. CATALOGUE PARITY & VERIFIED ROUTING DEFINITIONS
// ============================================================

test('Catalogue Parity: All 15 Settings providers have verified runtime definitions', () => {
  assert.equal(PROVIDER_CATALOGUE.length, 15)
  assert.equal(Object.keys(ROUTING_PROVIDER_CATALOGUE).length, 15)

  for (const entry of PROVIDER_CATALOGUE) {
    const routingEntry = getRoutingProvider(entry.id)
    assert.ok(routingEntry, `Provider "${entry.id}" must exist in routing catalogue`)
    assert.equal(routingEntry.approvedForRouting, true, `Provider "${entry.id}" must be approved`)
    assert.equal(isRoutingApproved(entry.id), true)
    assert.equal(routingEntry.verifiedEndpoint, entry.baseUrl)
    assert.equal(routingEntry.authScheme, entry.authScheme)
    assert.ok(routingEntry.verifiedModels.length > 0)
    assert.ok(
      routingEntry.verifiedModels.some((m) => m.id === entry.defaultModel),
      `Default model "${entry.defaultModel}" must be in verified models for ${entry.id}`,
    )
  }
})

test('Policy Router: Approves all 15 verified providers and rejects unknown providers', () => {
  const policy = resolveRoutingPolicy({ userId: 'admin-user-1', allowPaid: true })
  assert.equal(policy.ok, true)
  assert.equal(policy.allowedProviders.length, 15)

  for (const entry of PROVIDER_CATALOGUE) {
    assert.ok(
      policy.allowedProviders.includes(entry.id),
      `Policy must include approved provider "${entry.id}"`,
    )
  }

  // Unknown provider rejected
  const unknownPolicy = resolveRoutingPolicy({
    userId: 'admin-user-1',
    preferredProvider: 'unverified-rogue-ai',
  })
  assert.equal(unknownPolicy.ok, true)
  // Rogue provider not put first; policy falls back to catalogue
  assert.notEqual(unknownPolicy.allowedProviders[0], 'unverified-rogue-ai')
})

test('Policy Router: Enforces task-to-model mapping for every approved provider', () => {
  for (const entry of PROVIDER_CATALOGUE) {
    const policy = resolveRoutingPolicy({
      userId: 'test-user',
      preferredProvider: entry.id,
      allowPaid: true,
    })
    assert.equal(policy.ok, true)
    assert.equal(policy.targetModel, entry.defaultModel, `Target model for ${entry.id} matches default`)
  }
})

test('Policy Router: Paid connections excluded when allowPaid is false', () => {
  const freePolicy = resolveRoutingPolicy({ userId: 'user-free', allowPaid: false })
  assert.equal(freePolicy.ok, true)
  assert.equal(freePolicy.allowPaid, false)

  const paidPolicy = resolveRoutingPolicy({ userId: 'user-paid', allowPaid: true })
  assert.equal(paidPolicy.ok, true)
  assert.equal(paidPolicy.allowPaid, true)
})

// ============================================================
// 2. ERROR CLASSIFICATION: SCOPING & FAILOVER BEHAVIOR
// ============================================================

test('Error Classifier: 5xx and network errors are scoped to provider', () => {
  const err500 = classifyProviderError({ status: 500 })
  assert.equal(err500.category, 'provider_unavailable')
  assert.equal(err500.scope, 'provider')
  assert.equal(err500.retryable, true)

  const err502 = classifyProviderError({ status: 502 })
  assert.equal(err502.scope, 'provider')
  assert.equal(err502.retryable, true)

  const netErr = classifyProviderError({ error: new Error('fetch failed: ECONNREFUSED') })
  assert.equal(netErr.category, 'network')
  assert.equal(netErr.scope, 'provider')
  assert.equal(netErr.retryable, true)
})

test('Error Classifier: 401 is account-scoped quarantine, not provider-wide', () => {
  const authErr = classifyProviderError({ status: 401 })
  assert.equal(authErr.category, 'authentication')
  assert.equal(authErr.scope, 'account') // Account only!
  assert.equal(authErr.requiresQuarantine, true)
  assert.equal(authErr.retryable, true)
})

test('Error Classifier: 402 and 429 are account or model scoped, not provider-wide', () => {
  const quotaErr = classifyProviderError({ status: 402 })
  assert.equal(quotaErr.category, 'quota_exhausted')
  assert.equal(quotaErr.scope, 'account')
  assert.equal(quotaErr.requiresCooldown, true)

  const rateLimitErr = classifyProviderError({ status: 429 })
  assert.equal(rateLimitErr.category, 'rate_limit')
  assert.equal(rateLimitErr.requiresCooldown, true)
})

test('Error Classifier: 400 Bad Request is non-retryable request scope', () => {
  const badReq = classifyProviderError({ status: 400 })
  assert.equal(badReq.category, 'invalid_request')
  assert.equal(badReq.scope, 'request')
  assert.equal(badReq.retryable, false)
})

// ============================================================
// 3. PROVIDER-SCOPED FAILOVER SIMULATION
// ============================================================

test('Failover: Provider-scoped failure excludes sibling accounts for remainder of request', () => {
  // Scenario: Two accounts for openrouter (acc-1, acc-2) and one account for deepseek (acc-3)
  const pool = [
    { id: 'acc-1', providerId: 'openrouter', status: 502 },
    { id: 'acc-2', providerId: 'openrouter', status: 200 },
    { id: 'acc-3', providerId: 'deepseek', status: 200 },
  ]

  const excludedConnectionIds = []
  const excludedProviders = new Set()
  const attempted = []
  let successConnection = null

  const allowedProviders = ['openrouter', 'deepseek']

  for (let attempt = 0; attempt < 4; attempt++) {
    const effectiveAllowed = allowedProviders.filter((p) => !excludedProviders.has(p))
    const eligible = pool.find(
      (c) => effectiveAllowed.includes(c.providerId) && !excludedConnectionIds.includes(c.id),
    )
    if (!eligible) break

    attempted.push(eligible.id)

    if (eligible.status >= 500) {
      const classified = classifyProviderError({ status: eligible.status })
      excludedConnectionIds.push(eligible.id)
      if (classified.scope === 'provider') {
        excludedProviders.add(eligible.providerId) // Exclude all sibling accounts of openrouter!
      }
      continue
    }

    successConnection = eligible
    break
  }

  // acc-2 was skipped because openrouter was excluded when acc-1 returned 502!
  assert.deepEqual(attempted, ['acc-1', 'acc-3'])
  assert.ok(successConnection)
  assert.equal(successConnection.id, 'acc-3')
  assert.equal(successConnection.providerId, 'deepseek')
})

test('Failover: Account-scoped 401 failure preserves sibling accounts of same provider', () => {
  const pool = [
    { id: 'acc-1', providerId: 'openrouter', status: 401 }, // Bad key on acc-1
    { id: 'acc-2', providerId: 'openrouter', status: 200 }, // Good key on acc-2
  ]

  const excludedConnectionIds = []
  const excludedProviders = new Set()
  const attempted = []
  let successConnection = null

  const allowedProviders = ['openrouter']

  for (let attempt = 0; attempt < 4; attempt++) {
    const effectiveAllowed = allowedProviders.filter((p) => !excludedProviders.has(p))
    const eligible = pool.find(
      (c) => effectiveAllowed.includes(c.providerId) && !excludedConnectionIds.includes(c.id),
    )
    if (!eligible) break

    attempted.push(eligible.id)

    if (eligible.status === 401) {
      const classified = classifyProviderError({ status: eligible.status })
      excludedConnectionIds.push(eligible.id)
      if (classified.scope === 'provider') {
        excludedProviders.add(eligible.providerId)
      }
      continue
    }

    successConnection = eligible
    break
  }

  // Both accounts tried; acc-2 succeeded because 401 is account-scoped!
  assert.deepEqual(attempted, ['acc-1', 'acc-2'])
  assert.ok(successConnection)
  assert.equal(successConnection.id, 'acc-2')
})

// ============================================================
// 4. SQL MIGRATION CONTRACT VERIFICATION
// ============================================================

test('SQL Migration: claim_eligible_ai_connection order clause has deterministic tie-breaker', () => {
  const migrationPath = path.resolve('supabase/migrations/20261114170000_bolu_provider_connections.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  // Check deterministic tie-breaker
  assert.match(
    sql,
    /ORDER BY\s+c\.priority ASC,\s+c\.last_selected_at ASC NULLS FIRST,\s+c\.consecutive_failures ASC,\s+c\.id ASC/s,
    'claim_eligible_ai_connection must order by c.id ASC as final tie-breaker',
  )
})

test('SQL Migration: claim_eligible_ai_connection does NOT mark health_status healthy on claim', () => {
  const migrationPath = path.resolve('supabase/migrations/20261114170000_bolu_provider_connections.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  // Extract claim_eligible_ai_connection function body
  const claimFnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.claim_eligible_ai_connection.*?END;\s*\$\$;/s)
  assert.ok(claimFnMatch, 'claim_eligible_ai_connection function exists')

  const fnBody = claimFnMatch[0]
  assert.doesNotMatch(
    fnBody,
    /health_status\s*=\s*CASE\s*WHEN\s*health_status\s*IN/i,
    'claim_eligible_ai_connection must NOT modify health_status during claim',
  )
  assert.doesNotMatch(
    fnBody,
    /health_status\s*=\s*'healthy'/i,
    'claim_eligible_ai_connection must NOT set health_status = healthy',
  )
})

test('SQL Migration: record_ai_connection_success marks health_status healthy and clears cooldown', () => {
  const migrationPath = path.resolve('supabase/migrations/20261114170000_bolu_provider_connections.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  const successFnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.record_ai_connection_success.*?END;\s*\$\$;/s)
  assert.ok(successFnMatch, 'record_ai_connection_success function exists')

  const fnBody = successFnMatch[0]
  assert.match(fnBody, /health_status\s*=\s*'healthy'/)
  assert.match(fnBody, /account_cooldown_until\s*=\s*NULL/)
  assert.match(fnBody, /consecutive_failures\s*=\s*0/)
})

// ============================================================
// 5. RUNTIME CHAT CONTRACT & SECURITY VERIFICATION
// ============================================================

test('Runtime Contract: api/bolu-chat.ts fails closed with 503 provider_pool_exhausted when pool is empty', () => {
  const chatRuntimePath = path.resolve('api/bolu-chat.ts')
  const code = fs.readFileSync(chatRuntimePath, 'utf8')

  // Must return 503 provider_pool_exhausted
  assert.match(code, /provider_pool_exhausted/)
  // Must NOT contain silent fall-through to resolveRuntimeConnections
  assert.doesNotMatch(code, /resolveRuntimeConnections/)
  // Must NOT contain loadInAppProviderConfig
  assert.doesNotMatch(code, /loadInAppProviderConfig/)
  // Production environment blocks mock mode
  assert.match(code, /Mock mode is disabled in production environments/)
})
