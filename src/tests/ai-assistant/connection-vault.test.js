import test from 'node:test'
import assert from 'node:assert/strict'

import { getRouting, setRouting, toPublicConnection } from '../../lib/ai-assistant/connection-vault.ts'

const secretRecord = {
  id: 'conn-1',
  provider_id: 'openai',
  name: 'Primary OpenAI',
  protocol: 'openai',
  auth_scheme: 'bearer',
  base_url: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  timeout_ms: 45000,
  encrypted_key: 'CIPHERTEXT-SECRET',
  key_nonce: 'NONCE-SECRET',
  key_tag: 'TAG-SECRET',
  key_version: 1,
  masked_key: 'sk-…abcd',
  is_enabled: true,
  verification_status: 'verified',
  last_verified_at: '2026-11-14T00:00:00.000Z',
  last_test_status: 200,
  last_test_message: 'OK',
  discovered_models: [{ id: 'gpt-4o-mini', label: 'GPT-4o mini' }],
  models_fetched_at: '2026-11-14T00:00:00.000Z',
  migrated_from: null,
  created_at: '2026-11-14T00:00:00.000Z',
  updated_at: '2026-11-14T00:00:00.000Z',
  created_by: 'user-1',
  updated_by: 'user-1',
}

test('toPublicConnection maps fields and never leaks credential material', () => {
  const publicConnection = toPublicConnection(secretRecord)
  assert.equal(publicConnection.id, 'conn-1')
  assert.equal(publicConnection.providerId, 'openai')
  assert.equal(publicConnection.authScheme, 'bearer')
  assert.equal(publicConnection.timeoutMs, 45000)
  assert.equal(publicConnection.maskedKey, 'sk-…abcd')
  assert.equal(publicConnection.isEnabled, true)
  assert.equal(publicConnection.verificationStatus, 'verified')
  assert.equal(publicConnection.discoveredModels.length, 1)

  // No ciphertext, nonce, tag, version or plaintext key may appear.
  const serialized = JSON.stringify(publicConnection)
  for (const secret of ['CIPHERTEXT-SECRET', 'NONCE-SECRET', 'TAG-SECRET', 'encrypted_key', 'key_nonce', 'key_tag', 'key_version']) {
    assert.equal(serialized.includes(secret), false, `must not expose ${secret}`)
  }
  assert.equal('encryptedKey' in publicConnection, false)
  assert.equal('apiKey' in publicConnection, false)
})

test('toPublicConnection tolerates a missing discovered-model cache', () => {
  const publicConnection = toPublicConnection({ ...secretRecord, discovered_models: null })
  assert.deepEqual(publicConnection.discoveredModels, [])
})

function routingClient(routingRow) {
  return {
    from(table) {
      assert.equal(table, 'app_ai_provider_routing')
      const builder = {
        select() { return builder },
        eq() { return builder },
        maybeSingle() { return Promise.resolve({ data: routingRow }) },
      }
      return builder
    },
  }
}

test('getRouting returns a safe empty default when no routing row exists', async () => {
  const routing = await getRouting(routingClient(null))
  assert.deepEqual(routing, { primaryConnectionId: null, fallbackEnabled: false, fallbackConnectionIds: [] })
})

test('getRouting normalizes the persisted routing row', async () => {
  const routing = await getRouting(routingClient({
    primary_connection_id: 'c1',
    fallback_enabled: true,
    fallback_connection_ids: ['c2', 'c3'],
  }))
  assert.deepEqual(routing, { primaryConnectionId: 'c1', fallbackEnabled: true, fallbackConnectionIds: ['c2', 'c3'] })

  const malformed = await getRouting(routingClient({ primary_connection_id: null, fallback_enabled: false, fallback_connection_ids: 'not-an-array' }))
  assert.deepEqual(malformed.fallbackConnectionIds, [])
})

function vaultClient({ routing, connections, onUpsert }) {
  return {
    from(table) {
      const builder = {
        _eq: null,
        select() { return builder },
        eq(col, val) { builder._eq = [col, val]; return builder },
        order() { return builder },
        upsert(row) { if (onUpsert) onUpsert(row); return Promise.resolve({ error: null }) },
        maybeSingle() {
          if (table === 'app_ai_provider_routing') return Promise.resolve({ data: routing })
          if (table === 'app_ai_provider_connections') {
            const id = builder._eq ? builder._eq[1] : null
            return Promise.resolve({ data: connections[id] ?? null })
          }
          return Promise.resolve({ data: null })
        },
      }
      return builder
    },
  }
}

test('setRouting approves only enabled, existing, non-primary fallback connections', async () => {
  let captured = null
  const client = vaultClient({
    routing: { primary_connection_id: 'primary', fallback_enabled: false, fallback_connection_ids: [] },
    connections: {
      primary: { is_enabled: true },
      fb1: { is_enabled: true },
      fb2: { is_enabled: false },
      fb3: { is_enabled: true },
    },
    onUpsert: (row) => { captured = row },
  })

  await setRouting(client, {
    fallbackEnabled: true,
    fallbackConnectionIds: ['primary', 'fb1', 'fb2', 'fb3', 'missing'],
  }, 'user-1')

  assert.equal(captured.primary_connection_id, 'primary')
  assert.equal(captured.fallback_enabled, true)
  // primary excluded (self), fb2 excluded (disabled), missing excluded (no record).
  assert.deepEqual(captured.fallback_connection_ids, ['fb1', 'fb3'])
})

test('setRouting clears the fallback list when fallback is disabled', async () => {
  let captured = null
  const client = vaultClient({
    routing: { primary_connection_id: 'primary', fallback_enabled: true, fallback_connection_ids: ['fb1'] },
    connections: { fb1: { is_enabled: true } },
    onUpsert: (row) => { captured = row },
  })

  await setRouting(client, { fallbackEnabled: false, fallbackConnectionIds: ['fb1'] }, 'user-1')
  assert.equal(captured.fallback_enabled, false)
  assert.deepEqual(captured.fallback_connection_ids, [])
})