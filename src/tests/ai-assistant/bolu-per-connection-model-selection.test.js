import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

import {
  ROUTING_PROVIDER_CATALOGUE,
} from '../../lib/ai-assistant/routing/bolu-provider-catalog.ts'

import {
  PROVIDER_CATALOGUE,
  getCatalogueEntry,
} from '../../lib/ai-assistant/provider-catalog.ts'

import {
  claimEligibleConnection,
} from '../../lib/ai-assistant/routing/bolu-account-pool.ts'

import {
  encryptSecret,
} from '../../lib/ai-assistant/bolu-secret-vault.ts'

const TEST_MASTER_KEY = crypto.createHash('sha256').update('test-master-key-bolu-2026').digest()
const MIGRATION = path.resolve(
  'supabase/migrations/20261115150000_bolu_per_connection_model_selection.sql',
)
const CHAT_ROUTE = path.resolve('api/bolu-chat.ts')

// ============================================================
// 1. PER-CONNECTION MODEL SELECTION
// ============================================================

test('Migration: the target model ranks candidates instead of filtering them out', () => {
  const sql = fs.readFileSync(MIGRATION, 'utf8')

  // A hard filter on the target model must be gone.
  assert.ok(
    !/AND\s+\(c\.model = p_target_model OR p_target_model = ANY\(c\.allowed_models\)\)/.test(sql),
    'The hard target-model filter must be removed from the candidate WHERE clause',
  )

  // A candidate that serves the target model must rank before one that does not.
  assert.ok(
    sql.includes("WHEN (c.model = p_target_model OR p_target_model = ANY(c.allowed_models))"),
    'The target-model match must be expressed once and reused',
  )
  assert.ok(sql.includes('THEN 0 ELSE 1 END)'), 'The target-model match must rank first')

  // The model sent upstream must be the effective model, not always the target.
  assert.ok(sql.includes('selected_model := v_effective_model;'), 'selected_model must report the effective model')
  assert.ok(
    sql.includes('ELSE v_rec.model') && sql.includes('v_rec.model;'),
    'A connection that does not serve the target model must be called with its own model',
  )

  // The per-model cooldown must key on the effective model too.
  assert.ok(
    sql.includes('c.model_cooldowns ? (CASE'),
    'The model cooldown check must use the effective model',
  )

  // The guards that protect the system must survive the change.
  assert.ok(sql.includes('routing_enabled = false'), 'The emergency routing shutdown guard must remain')
  assert.ok(sql.includes('FOR UPDATE OF c SKIP LOCKED'), 'Atomic claim locking must remain')
  assert.ok(sql.includes("c.health_status <> 'quarantined'"), 'Quarantined connections must stay excluded')
})

test('Migration: execution grants stay locked to service_role', () => {
  const sql = fs.readFileSync(MIGRATION, 'utf8')
  assert.ok(
    sql.includes('REVOKE ALL ON FUNCTION public.claim_eligible_ai_connection FROM PUBLIC, anon, authenticated;'),
    'Client roles must not execute the claim RPC',
  )
  assert.ok(
    sql.includes('GRANT EXECUTE ON FUNCTION public.claim_eligible_ai_connection TO service_role;'),
    'Only service_role may execute the claim RPC',
  )
})

// ============================================================
// 2. CONNECTION TIMEOUT IS USED AT RUNTIME
// ============================================================

test('Account Pool: claimEligibleConnection returns the connection timeout', async () => {
  const secretKey = 'sk-real-secret-key-12345'
  const encrypted = encryptSecret(secretKey, TEST_MASTER_KEY)
  const fakeConnectionId = '22222222-2222-3333-4444-555555555555'

  const mockClient = {
    rpc: async () => ({
      data: [
        {
          connection_id: fakeConnectionId,
          provider_id: 'nvidia',
          protocol: 'openai',
          base_url: 'https://integrate.api.nvidia.com/v1',
          default_model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
          selected_model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
          is_paid_tier: false,
        },
      ],
      error: null,
    }),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              encrypted_key: encrypted.ciphertext,
              key_nonce: encrypted.nonce,
              key_tag: encrypted.tag,
              key_version: encrypted.version,
              timeout_ms: 120000,
            },
            error: null,
          }),
        }),
      }),
    }),
  }

  const claimed = await claimEligibleConnection(
    mockClient,
    { allowedProviders: ['nvidia'], targetModel: 'DeepSeek-V4-Flash', allowPaid: false },
    [],
    TEST_MASTER_KEY,
  )

  assert.ok(claimed)
  assert.equal(claimed.timeoutMs, 120000, 'The stored connection timeout must reach the runtime adapter')
})

test('Chat route: the adapter timeout comes from the claimed connection', () => {
  const source = fs.readFileSync(CHAT_ROUTE, 'utf8')
  assert.ok(
    source.includes('timeoutMs: claimed.timeoutMs'),
    'The chat route must use the claimed connection timeout',
  )
  assert.ok(
    !/model: claimed\.selectedModel \|\| claimed\.defaultModel,\s*\n\s*timeoutMs: 30000,/.test(source),
    'The chat route must not hardcode a 30 second timeout',
  )
})

// ============================================================
// 3. CATALOGUE PARITY
// ============================================================

test('Catalogue: every provider exists in both catalogues with a matching endpoint and model', () => {
  for (const entry of PROVIDER_CATALOGUE) {
    const routing = ROUTING_PROVIDER_CATALOGUE[entry.id]
    assert.ok(routing, `Provider "${entry.id}" must exist in the routing catalogue`)
    assert.equal(routing.verifiedEndpoint, entry.baseUrl, `Endpoint mismatch for "${entry.id}"`)
    assert.equal(
      routing.verifiedModels.find((m) => m.isDefault)?.id,
      entry.defaultModel,
      `Default model mismatch for "${entry.id}"`,
    )
  }
})

test('Catalogue: 100milionseek is declared as a routable provider', () => {
  const entry = getCatalogueEntry('100milionseek')
  assert.ok(entry, '100milionseek must exist in the production catalogue')
  assert.equal(entry.baseUrl, 'https://100milionseek.top/v1')
  assert.equal(entry.defaultModel, 'deepseek-v4.1-flash-free')
  assert.equal(entry.authScheme, 'bearer')

  const routing = ROUTING_PROVIDER_CATALOGUE['100milionseek']
  assert.ok(routing, '100milionseek must exist in the routing catalogue')
  assert.equal(routing.approvedForRouting, true)
  assert.equal(routing.verifiedEndpoint, 'https://100milionseek.top/v1')
})
