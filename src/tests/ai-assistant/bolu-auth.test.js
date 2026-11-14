import test from 'node:test'
import assert from 'node:assert/strict'
import process from 'node:process'

import { getAdminClient, verifyPlatformAdmin } from '../../lib/ai-assistant/bolu-auth.ts'

const ENV_KEYS = ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']

function withoutServerEnv(fn) {
  const saved = {}
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
  try {
    return fn()
  } finally {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  }
}

test('verifyPlatformAdmin rejects requests without a bearer token', async () => {
  const result = await verifyPlatformAdmin(new Request('https://example.com/api', { method: 'GET' }))
  assert.equal(result.ok, false)
  assert.equal(result.status, 401)
  assert.equal(result.code, 'authentication_required')
})

test('verifyPlatformAdmin rejects non-bearer authorization schemes', async () => {
  const result = await verifyPlatformAdmin(new Request('https://example.com/api', {
    headers: { authorization: 'Basic abc123' },
  }))
  assert.equal(result.ok, false)
  assert.equal(result.code, 'authentication_required')
})

test('getAdminClient fails closed and names the missing server variables', () => {
  withoutServerEnv(() => {
    assert.throws(
      () => getAdminClient(),
      (err) => {
        assert.equal(err.name, 'ServerConfigMissingError')
        assert.match(err.message, /SUPABASE_URL/)
        assert.match(err.message, /SUPABASE_SERVICE_ROLE_KEY/)
        return true
      },
    )
  })
})

test('verifyPlatformAdmin surfaces server_config_missing when env is absent', async () => {
  await withoutServerEnv(async () => {
    const result = await verifyPlatformAdmin(new Request('https://example.com/api', {
      headers: { authorization: 'Bearer some-token' },
    }))
    assert.equal(result.ok, false)
    assert.equal(result.status, 500)
    assert.equal(result.code, 'server_config_missing')
  })
})