import test from 'node:test'
import assert from 'node:assert/strict'

import { classifyPolicyFetch, sanitizeErrorCode } from '../../domain/appUpdate/policyFetchResult.ts'

const VALID_ROW = {
  version_code: 1007,
  version_name: '1.0.7',
  mandatory: true,
  effective_at: '2026-09-17T12:50:04.310Z',
  apk_asset_prefix: 'BIGDROPS-test-release-',
  web_release_url: 'https://github.com/Bigdrops/bigdrops-app/releases/tag/test-release-20260917-02',
  release_notes: null,
  server_now: '2026-09-26T01:13:02.633Z',
}

test('transport failure is distinguished with a safe code only', () => {
  const result = classifyPolicyFetch(null, {
    code: 'PGRST301',
    message: 'JWT expired for anon key eyJhbGciOiJIUzI1NiJ9.FAKE-SECRET-TOKEN',
    details: 'session cookie abc123',
  })
  assert.equal(result.available, false)
  assert.equal(result.policy, null)
  assert.equal(result.diagnosis, 'transport-error')
  assert.equal(result.errorCode, 'PGRST301')
  assert.ok(
    !JSON.stringify(result).includes('FAKE-SECRET-TOKEN'),
    'secret-bearing message must never enter the diagnostic result',
  )
})

test('transport failure without a code still classifies safely', () => {
  const result = classifyPolicyFetch(null, new Error('network down'))
  assert.equal(result.diagnosis, 'transport-error')
  assert.equal(result.errorCode, null)
})

test('empty source means no update configured, not a failure', () => {
  for (const data of [[], null, undefined]) {
    const result = classifyPolicyFetch(data, null)
    assert.equal(result.available, true)
    assert.equal(result.policy, null)
    assert.equal(result.diagnosis, 'no-row')
  }
})

test('malformed row is distinguished from transport failure', () => {
  const result = classifyPolicyFetch([{ ...VALID_ROW, version_code: 'oops' }], null)
  assert.equal(result.available, true)
  assert.equal(result.policy, null)
  assert.equal(result.diagnosis, 'malformed')
})

test('sanitizer keeps only a safe error code', () => {
  assert.equal(sanitizeErrorCode({ code: 'PGRST116' }), 'PGRST116')
  assert.equal(sanitizeErrorCode({}), null)
  assert.equal(sanitizeErrorCode(null), null)
  assert.equal(sanitizeErrorCode('PGRST116'), null)
  assert.equal(sanitizeErrorCode({ code: 401 }), null)
  assert.equal(sanitizeErrorCode({ code: '   ' }), null)
})

test('valid row validates with the live 1007 shape', () => {  for (const data of [[VALID_ROW], VALID_ROW]) {
    const result = classifyPolicyFetch(data, null)
    assert.equal(result.available, true)
    assert.equal(result.diagnosis, 'valid')
    assert.equal(result.policy?.versionCode, 1007)
    assert.ok(typeof result.serverNowMs === 'number')
  }
})
