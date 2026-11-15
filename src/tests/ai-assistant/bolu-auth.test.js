import test from 'node:test'
import assert from 'node:assert/strict'
import process from 'node:process'

import { getAdminClient, getRequestHeader, verifyPlatformAdmin } from '../../lib/ai-assistant/bolu-auth.ts'

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

test('getRequestHeader defensively extracts headers across Web API and Node.js environments', () => {
  // Web API Headers instance with .get()
  const webReq = new Request('https://example.com/api', {
    headers: { authorization: 'Bearer web-token', 'X-Custom-Header': 'custom-val' },
  })
  assert.equal(getRequestHeader(webReq, 'authorization'), 'Bearer web-token')
  assert.equal(getRequestHeader(webReq, 'x-custom-header'), 'custom-val')
  assert.equal(getRequestHeader(webReq, 'non-existent'), null)

  // Node.js IncomingMessage / VercelRequest dictionary (lowercase)
  const nodeReq = {
    headers: {
      authorization: 'Bearer node-token',
      'content-type': 'application/json',
    },
  }
  assert.equal(getRequestHeader(nodeReq, 'authorization'), 'Bearer node-token')
  assert.equal(getRequestHeader(nodeReq, 'content-type'), 'application/json')
  assert.equal(getRequestHeader(nodeReq, 'non-existent'), null)

  // Node.js dictionary with uppercase casing
  const nodeReqCased = {
    headers: {
      Authorization: 'Bearer cased-token',
      'X-API-KEY': 'secret-123',
    },
  }
  assert.equal(getRequestHeader(nodeReqCased, 'authorization'), 'Bearer cased-token')
  assert.equal(getRequestHeader(nodeReqCased, 'Authorization'), 'Bearer cased-token')
  assert.equal(getRequestHeader(nodeReqCased, 'x-api-key'), 'secret-123')

  // Node.js array header value
  const nodeReqArray = {
    headers: {
      authorization: ['Bearer array-token', 'Bearer second-token'],
    },
  }
  assert.equal(getRequestHeader(nodeReqArray, 'authorization'), 'Bearer array-token')

  // Null safety & edge cases
  assert.equal(getRequestHeader(null, 'authorization'), null)
  assert.equal(getRequestHeader(undefined, 'authorization'), null)
  assert.equal(getRequestHeader({}, 'authorization'), null)
  assert.equal(getRequestHeader({ headers: null }, 'authorization'), null)
  assert.equal(getRequestHeader({ headers: {} }, 'authorization'), null)
})

test('verifyPlatformAdmin handles Node.js request objects without throwing TypeError (headers.get)', async () => {
  // Node.js request without authorization
  const nodeReqMissing = {
    headers: {
      'content-type': 'application/json',
    },
  }
  const res1 = await verifyPlatformAdmin(nodeReqMissing)
  assert.equal(res1.ok, false)
  assert.equal(res1.status, 401)
  assert.equal(res1.code, 'authentication_required')

  // Node.js request with invalid scheme
  const nodeReqBasic = {
    headers: {
      authorization: 'Basic dXNlcjpwYXNz',
    },
  }
  const res2 = await verifyPlatformAdmin(nodeReqBasic)
  assert.equal(res2.ok, false)
  assert.equal(res2.status, 401)
  assert.equal(res2.code, 'authentication_required')

  // Node.js request with Bearer token when env is absent -> fails closed at server_config_missing, NOT TypeError
  await withoutServerEnv(async () => {
    const nodeReqBearer = {
      headers: {
        authorization: 'Bearer valid-looking-token',
      },
    }
    const res3 = await verifyPlatformAdmin(nodeReqBearer)
    assert.equal(res3.ok, false)
    assert.equal(res3.status, 500)
    assert.equal(res3.code, 'server_config_missing')
  })
})
