import test from 'node:test'
import assert from 'node:assert/strict'

import {
  checkRateLimit,
  clampTimeout,
  isAuthScheme,
  isPrivateAddress,
  isProtocol,
  resetRateLimits,
  sanitizeConnectionName,
  sanitizeModelId,
  validateEndpointSyntax,
} from '../../lib/ai-assistant/provider-security.ts'

test('validateEndpointSyntax enforces https, no credentials, no internal targets', () => {
  assert.equal(validateEndpointSyntax('').ok, false)
  assert.equal(validateEndpointSyntax('not a url').ok, false)
  assert.equal(validateEndpointSyntax('http://api.example.com/v1').ok, false)
  assert.equal(validateEndpointSyntax('https://user:pass@api.example.com/v1').ok, false)
  assert.equal(validateEndpointSyntax('https://localhost/v1').ok, false)
  assert.equal(validateEndpointSyntax('https://metadata.google.internal/v1').ok, false)
  assert.equal(validateEndpointSyntax('https://service.internal/v1').ok, false)
  assert.equal(validateEndpointSyntax('https://127.0.0.1/v1').ok, false)
  assert.equal(validateEndpointSyntax('https://10.0.0.1/v1').ok, false)
  assert.equal(validateEndpointSyntax('https://192.168.1.1/v1').ok, false)
  assert.equal(validateEndpointSyntax('https://169.254.169.254/v1').ok, false)
  assert.equal(validateEndpointSyntax('https://[::1]/v1').ok, false)
  assert.equal(validateEndpointSyntax('https://[fc00::1]/v1').ok, false)
  assert.equal(validateEndpointSyntax('https://[fe80::1]/v1').ok, false)

  const ok = validateEndpointSyntax('https://api.openai.com/v1')
  assert.equal(ok.ok, true)
  assert.equal(ok.url, 'https://api.openai.com/v1')
  // Public literal addresses pass syntax; DNS resolution is checked separately.
  assert.equal(validateEndpointSyntax('https://8.8.8.8/v1').ok, true)
  assert.equal(validateEndpointSyntax('https://[2001:4860:4860::8888]/v1').ok, true)
})

test('isPrivateAddress blocks internal ranges and fails safe on non-addresses', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.0.1', '169.254.1.1', '100.64.0.1', '0.0.0.0', '198.18.0.1', '224.0.0.1']) {
    assert.equal(isPrivateAddress(ip), true, `${ip} is private`)
  }
  for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '100.128.0.1']) {
    assert.equal(isPrivateAddress(ip), false, `${ip} is public`)
  }
  for (const ip of ['::1', '::', 'fc00::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
    assert.equal(isPrivateAddress(ip), true, `${ip} is private`)
  }
  assert.equal(isPrivateAddress('::ffff:8.8.8.8'), false)
  assert.equal(isPrivateAddress('2001:4860:4860::8888'), false)
  // Unparseable input is treated as private (fail-safe).
  assert.equal(isPrivateAddress('not-an-ip'), true)
})

test('checkRateLimit enforces a sliding window per key and resets cleanly', () => {
  resetRateLimits()
  const first = checkRateLimit('user-a:test', 2, 60000)
  const second = checkRateLimit('user-a:test', 2, 60000)
  const third = checkRateLimit('user-a:test', 2, 60000)
  assert.equal(first.allowed, true)
  assert.equal(second.allowed, true)
  assert.equal(third.allowed, false)
  assert.ok(third.retryAfterMs > 0)

  // Independent keys do not share a bucket.
  assert.equal(checkRateLimit('user-b:test', 2, 60000).allowed, true)

  resetRateLimits()
  assert.equal(checkRateLimit('user-a:test', 2, 60000).allowed, true)
})

test('clampTimeout bounds values to the supported 5s-120s window', () => {
  assert.equal(clampTimeout(undefined), 45000)
  assert.equal(clampTimeout('not-a-number'), 45000)
  assert.equal(clampTimeout(1000), 5000)
  assert.equal(clampTimeout(999999), 120000)
  assert.equal(clampTimeout(60000), 60000)
  assert.equal(clampTimeout(45000.7), 45001)
  assert.equal(clampTimeout(NaN, 30000), 30000)
})

test('sanitizeModelId rejects whitespace, markup and oversized identifiers', () => {
  assert.equal(sanitizeModelId('gpt-4o'), 'gpt-4o')
  assert.equal(sanitizeModelId('  gpt-4o  '), 'gpt-4o')
  assert.equal(sanitizeModelId(''), null)
  assert.equal(sanitizeModelId('   '), null)
  assert.equal(sanitizeModelId('a b'), null)
  assert.equal(sanitizeModelId('a<b>'), null)
  assert.equal(sanitizeModelId('a"b'), null)
  assert.equal(sanitizeModelId('x'.repeat(201)), null)
  assert.equal(sanitizeModelId('x'.repeat(200)), 'x'.repeat(200))
  assert.equal(sanitizeModelId(123), null)
})

test('sanitizeConnectionName trims, collapses whitespace and bounds length', () => {
  assert.equal(sanitizeConnectionName('My  Key'), 'My Key')
  assert.equal(sanitizeConnectionName('  padded  '), 'padded')
  assert.equal(sanitizeConnectionName(''), null)
  assert.equal(sanitizeConnectionName('x'.repeat(81)), null)
  assert.equal(sanitizeConnectionName('x'.repeat(80)), 'x'.repeat(80))
  assert.equal(sanitizeConnectionName(42), null)
})

test('protocol and auth-scheme guards accept only supported literals', () => {
  assert.equal(isProtocol('openai'), true)
  assert.equal(isProtocol('anthropic'), true)
  assert.equal(isProtocol('grpc'), false)
  assert.equal(isProtocol(undefined), false)
  assert.equal(isAuthScheme('bearer'), true)
  assert.equal(isAuthScheme('x-api-key'), true)
  assert.equal(isAuthScheme('basic'), false)
})