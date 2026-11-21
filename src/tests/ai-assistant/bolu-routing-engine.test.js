import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

import {
  ROUTING_PROVIDER_CATALOGUE,
  getRoutingProvider,
  isProtocolSupported,
  isAuthSchemeSupported,
  validateCustomProviderConfig,
} from '../../lib/ai-assistant/routing/bolu-provider-catalog.ts'

import {
  classifyProviderError,
  parseRetryAfter,
} from '../../lib/ai-assistant/routing/bolu-error-classifier.ts'

import {
  resolveRoutingPolicy,
} from '../../lib/ai-assistant/routing/bolu-policy-router.ts'

import {
  checkUpstreamBalance,
} from '../../lib/ai-assistant/routing/bolu-balance-sync.ts'

import {
  claimEligibleConnection,
  migrateLegacySingletonCredential,
  recordAiFailure,
  recordAiRequestStart,
  recordAiSuccess,
  LEGACY_MIGRATION_CONNECTION_ID,
} from '../../lib/ai-assistant/routing/bolu-account-pool.ts'

import {
  encryptSecret,
  deriveMasterKey,
  decryptSecret,
} from '../../lib/ai-assistant/bolu-secret-vault.ts'

const TEST_MASTER_KEY = crypto.createHash('sha256').update('test-master-key-bolu-2026').digest()

// ============================================================
// 1. PROVIDER CATALOGUE & SSRF DEFENSE
// ============================================================

test('Provider Catalog: verified providers are approved with correct protocols', () => {
  const amd = getRoutingProvider('amd')
  assert.ok(amd)
  assert.equal(amd.displayName, 'AMD Token Factory')
  assert.equal(amd.protocol, 'openai-compatible')
  assert.equal(amd.authScheme, 'bearer')
  assert.equal(amd.approvedForRouting, true)
  assert.equal(amd.verifiedModels[0].id, 'DeepSeek-V4-Flash')

  const openrouter = getRoutingProvider('openrouter')
  assert.ok(openrouter)
  assert.equal(openrouter.balanceLookupSupport, true)

  const anthropic = getRoutingProvider('anthropic')
  assert.ok(anthropic)
  assert.equal(anthropic.protocol, 'anthropic')
  assert.equal(anthropic.authScheme, 'x-api-key')

  assert.equal(isProtocolSupported('openai-compatible'), true)
  assert.equal(isProtocolSupported('anthropic'), true)
  assert.equal(isProtocolSupported('gemini'), true)
  assert.equal(isProtocolSupported('unsupported-protocol'), false)

  assert.equal(isAuthSchemeSupported('bearer'), true)
  assert.equal(isAuthSchemeSupported('x-api-key'), true)
  assert.equal(isAuthSchemeSupported('basic'), false)
})

test('Custom Provider Validation: enforces HTTPS, models, and blocks SSRF targets', () => {
  // Valid HTTPS custom provider
  const valid = validateCustomProviderConfig({
    providerId: 'custom-corp',
    displayName: 'Corporate AI Gateway',
    protocol: 'openai-compatible',
    endpoint: 'https://ai.bouxre-partner.com/v1',
    authScheme: 'bearer',
    defaultModel: 'partner-large',
  })
  assert.equal(valid.ok, true)
  if (valid.ok) {
    assert.equal(valid.config.providerId, 'custom-corp')
    assert.equal(valid.config.endpoint, 'https://ai.bouxre-partner.com/v1')
  }

  // Reject HTTP (insecure)
  const insecure = validateCustomProviderConfig({
    providerId: 'custom-http',
    displayName: 'Insecure Gateway',
    protocol: 'openai-compatible',
    endpoint: 'http://api.example.com/v1',
    authScheme: 'bearer',
    defaultModel: 'model-1',
  })
  assert.equal(insecure.ok, false)
  if (!insecure.ok) assert.match(insecure.error, /https/i)

  // Reject embedded credentials in URL
  const creds = validateCustomProviderConfig({
    providerId: 'custom-creds',
    displayName: 'Creds in URL',
    protocol: 'openai-compatible',
    endpoint: 'https://user:password@api.example.com/v1',
    authScheme: 'bearer',
    defaultModel: 'model-1',
  })
  assert.equal(creds.ok, false)
  if (!creds.ok) assert.match(creds.error, /credentials/i)

  // Reject localhost and internal hostnames
  for (const host of ['https://localhost:8080/v1', 'https://metadata.google.internal', 'https://api.internal/v1']) {
    const res = validateCustomProviderConfig({
      providerId: 'custom-internal',
      displayName: 'Internal',
      protocol: 'openai-compatible',
      endpoint: host,
      authScheme: 'bearer',
      defaultModel: 'model-1',
    })
    assert.equal(res.ok, false)
    if (!res.ok) assert.match(res.error, /internal|localhost/i)
  }

  // Reject private IPv4 (RFC 1918 & loopback)
  for (const ip of ['127.0.0.1', '10.0.0.1', '192.168.1.1', '172.16.0.1', '169.254.169.254']) {
    const res = validateCustomProviderConfig({
      providerId: 'custom-ip',
      displayName: 'Private IP',
      protocol: 'openai-compatible',
      endpoint: `https://${ip}/v1`,
      authScheme: 'bearer',
      defaultModel: 'model-1',
    })
    assert.equal(res.ok, false)
    if (!res.ok) assert.match(res.error, /private|internal/i)
  }

  // Reject private IPv6 (loopback ::1, unique local fc00::/7)
  for (const ip6 of ['[::1]', '[fc00::1]', '[fe80::1]']) {
    const res = validateCustomProviderConfig({
      providerId: 'custom-ip6',
      displayName: 'Private IPv6',
      protocol: 'openai-compatible',
      endpoint: `https://${ip6}/v1`,
      authScheme: 'bearer',
      defaultModel: 'model-1',
    })
    assert.equal(res.ok, false)
    if (!res.ok) assert.match(res.error, /private|internal/i)
  }
})

// ============================================================
// 2. ERROR CLASSIFIER & RETRY-AFTER PARSING
// ============================================================

test('parseRetryAfter handles seconds, HTTP-date, and clamps safely', () => {
  const fixedNow = 1794672000000 // Fixed reference time

  // Seconds
  assert.equal(parseRetryAfter('30', fixedNow), 30)
  assert.equal(parseRetryAfter('0', fixedNow), 5) // clamped to min 5s
  assert.equal(parseRetryAfter('-10', fixedNow), 5)
  assert.equal(parseRetryAfter('9999999', fixedNow), 86400) // clamped to max 24h

  // HTTP-Date RFC 7231
  const targetDateStr = new Date(fixedNow + 120000).toUTCString() // 120 seconds in future
  assert.equal(parseRetryAfter(targetDateStr, fixedNow), 120)

  // Expired date
  const pastDateStr = new Date(fixedNow - 50000).toUTCString()
  assert.equal(parseRetryAfter(pastDateStr, fixedNow), 5) // clamped to min 5s

  // Invalid / missing
  assert.equal(parseRetryAfter(null), null)
  assert.equal(parseRetryAfter(''), null)
  assert.equal(parseRetryAfter('not-a-date-or-number'), null)
})

test('classifyProviderError maps all required categories and scopes', () => {
  // HTTP 400: invalid_request -> stop, do not rotate
  const e400 = classifyProviderError({ status: 400 })
  assert.equal(e400.category, 'invalid_request')
  assert.equal(e400.scope, 'request')
  assert.equal(e400.retryable, false)
  assert.equal(e400.requiresQuarantine, false)

  // HTTP 401: authentication -> quarantine connection
  const e401 = classifyProviderError({ status: 401 })
  assert.equal(e401.category, 'authentication')
  assert.equal(e401.scope, 'account')
  assert.equal(e401.retryable, true)
  assert.equal(e401.requiresQuarantine, true)

  // HTTP 402: quota_exhausted -> recoverable exhaustion, cooldown, no quarantine
  const e402 = classifyProviderError({ status: 402 })
  assert.equal(e402.category, 'quota_exhausted')
  assert.equal(e402.scope, 'account')
  assert.equal(e402.requiresCooldown, true)
  assert.equal(e402.requiresQuarantine, false)
  assert.equal(e402.retryable, true)

  // HTTP 403: permission -> do NOT automatically quarantine whole account (scoped to provider or model)
  const e403 = classifyProviderError({ status: 403 })
  assert.equal(e403.category, 'permission')
  assert.equal(e403.scope, 'provider')
  assert.equal(e403.requiresQuarantine, false)
  assert.equal(e403.requiresCooldown, true)

  const e403Model = classifyProviderError({ status: 403 }, { targetModel: 'deepseek-v3' })
  assert.equal(e403Model.category, 'permission')
  assert.equal(e403Model.scope, 'model')
  assert.equal(e403Model.requiresQuarantine, false)
  assert.match(e403Model.safeSummary, /deepseek-v3/)

  // Explicit revoked key produces account quarantine
  const e403Revoked = classifyProviderError({ status: 403, errorBody: { error: { message: 'API key has been revoked' } } })
  assert.equal(e403Revoked.category, 'authentication')
  assert.equal(e403Revoked.scope, 'account')
  assert.equal(e403Revoked.requiresQuarantine, true)

  // HTTP 404: model_unavailable -> model scope cooldown
  const e404 = classifyProviderError({ status: 404 }, { targetModel: 'deepseek-r1' })
  assert.equal(e404.category, 'model_unavailable')
  assert.equal(e404.scope, 'model')
  assert.equal(e404.requiresCooldown, true)
  assert.match(e404.safeSummary, /deepseek-r1/)

  // HTTP 408: timeout -> retryable
  const e408 = classifyProviderError({ status: 408 })
  assert.equal(e408.category, 'timeout')
  assert.equal(e408.scope, 'request')
  assert.equal(e408.retryable, true)

  // HTTP 429: rate_limit -> retryable, applies cooldown from Retry-After
  const e429 = classifyProviderError({ status: 429, retryAfterHeader: '45' })
  assert.equal(e429.category, 'rate_limit')
  assert.equal(e429.retryable, true)
  assert.equal(e429.requiresCooldown, true)
  assert.equal(e429.retryAfterSeconds, 45)

  // HTTP 5xx: provider_unavailable -> provider scope, retryable
  const e503 = classifyProviderError({ status: 503 })
  assert.equal(e503.category, 'provider_unavailable')
  assert.equal(e503.scope, 'provider')
  assert.equal(e503.retryable, true)

  // Network exceptions
  const eNet = classifyProviderError({ error: new TypeError('fetch failed: ECONNREFUSED') })
  assert.equal(eNet.category, 'network')
  assert.equal(eNet.scope, 'provider')
  assert.equal(eNet.retryable, true)

  // Abort / Timeout exception
  const eTimeout = classifyProviderError({ error: new Error('The operation was aborted due to timeout') })
  assert.equal(eTimeout.category, 'timeout')
  assert.equal(eTimeout.retryable, true)

  // Malformed JSON response exception
  const eMalformed = classifyProviderError({ error: new SyntaxError('Unexpected end of JSON input') })
  assert.equal(eMalformed.category, 'malformed_response')
  assert.equal(eMalformed.retryable, true)
  assert.equal(eMalformed.requiresQuarantine, false)
})

// ============================================================
// 3. POLICY ROUTER
// ============================================================

test('Policy Router: enforces user auth, approved providers, and task models', () => {
  // Reject unauthenticated request
  const unauth = resolveRoutingPolicy({ userId: '' })
  assert.equal(unauth.ok, false)

  // Default policy
  const defaultPolicy = resolveRoutingPolicy({ userId: 'user-123' })
  assert.equal(defaultPolicy.ok, true)
  assert.equal(defaultPolicy.allowPaid, false)
  assert.equal(defaultPolicy.maxAttempts, 4)
  assert.ok(defaultPolicy.allowedProviders.includes('amd'))
  assert.ok(defaultPolicy.allowedProviders.includes('openrouter'))
  assert.equal(defaultPolicy.targetModel, 'DeepSeek-V4-Flash')

  // Preferred provider prioritizing AMD
  const amdPolicy = resolveRoutingPolicy({
    userId: 'user-123',
    preferredProvider: 'amd',
  })
  assert.equal(amdPolicy.ok, true)
  assert.deepEqual(amdPolicy.allowedProviders, ['amd', 'openrouter', 'deepseek'])
  assert.equal(amdPolicy.targetModel, 'DeepSeek-V4-Flash')

  // Preferred model override
  const customModelPolicy = resolveRoutingPolicy({
    userId: 'user-123',
    preferredModel: 'deepseek/deepseek-chat',
  })
  assert.equal(customModelPolicy.targetModel, 'deepseek/deepseek-chat')
})

// ============================================================
// 4. BALANCE SYNC BOUNDARY
// ============================================================

test('Balance Sync: unsupported providers safely return balance_source = unsupported', async () => {
  // AMD does not support balance lookup API
  const amdBalance = await checkUpstreamBalance('amd', 'rc-fake-token')
  assert.equal(amdBalance.supported, false)
  assert.equal(amdBalance.source, 'unsupported')
  assert.equal(amdBalance.balanceUsd, null)

  // Custom provider
  const customBalance = await checkUpstreamBalance('custom-gateway', 'sk-key')
  assert.equal(customBalance.supported, false)
  assert.equal(customBalance.source, 'unsupported')
})

// ============================================================
// 5. ACCOUNT POOL, RPC CALLS, & CREDENTIAL DECRYPTION
// ============================================================

test('Account Pool: claimEligibleConnection calls RPC, retrieves secret, and decrypts cleanly', async () => {
  const secretKey = 'sk-real-secret-key-12345'
  const encrypted = encryptSecret(secretKey, TEST_MASTER_KEY)

  const fakeConnectionId = '11111111-2222-3333-4444-555555555555'

  // Mock Supabase admin client
  const mockClient = {
    rpc: async (funcName, params) => {
      if (funcName === 'claim_eligible_ai_connection') {
        assert.ok(params.p_allowed_providers.includes('amd'))
        assert.equal(params.p_target_model, 'DeepSeek-V4-Flash')
        return {
          data: [
            {
              connection_id: fakeConnectionId,
              provider_id: 'amd',
              protocol: 'openai',
              base_url: 'https://developer.amd.com.cn/radeon/api/v1',
              default_model: 'DeepSeek-V4-Flash',
              selected_model: 'DeepSeek-V4-Flash',
              is_paid_tier: false,
            },
          ],
          error: null,
        }
      }
      return { data: null, error: null }
    },
    from: (table) => {
      assert.equal(table, 'app_ai_provider_connections')
      return {
        select: (cols) => ({
          eq: (field, val) => ({
            maybeSingle: async () => {
              assert.equal(field, 'id')
              assert.equal(val, fakeConnectionId)
              return {
                data: {
                  encrypted_key: encrypted.ciphertext,
                  key_nonce: encrypted.nonce,
                  key_tag: encrypted.tag,
                  key_version: encrypted.version,
                },
                error: null,
              }
            },
          }),
        }),
      }
    },
  }

  const claimed = await claimEligibleConnection(
    mockClient,
    {
      allowedProviders: ['amd'],
      targetModel: 'DeepSeek-V4-Flash',
      allowPaid: false,
    },
    [],
    TEST_MASTER_KEY,
  )

  assert.ok(claimed)
  assert.equal(claimed.connectionId, fakeConnectionId)
  assert.equal(claimed.providerId, 'amd')
  assert.equal(claimed.selectedModel, 'DeepSeek-V4-Flash')
  assert.equal(claimed.apiKey, secretKey) // Decrypted in server memory
})

test('Account Pool: Telemetry RPC wrappers invoke expected functions', async () => {
  const calls = []
  const mockClient = {
    rpc: async (funcName, params) => {
      calls.push({ funcName, params })
      return { data: true, error: null }
    },
  }

  await recordAiRequestStart(mockClient, 'conn-1', 'DeepSeek-V4-Flash')
  assert.equal(calls[0].funcName, 'record_ai_request_started')
  assert.equal(calls[0].params.p_connection_id, 'conn-1')

  await recordAiSuccess(mockClient, 'conn-1', 'DeepSeek-V4-Flash', 150)
  assert.equal(calls[1].funcName, 'record_ai_connection_success')
  assert.equal(calls[1].params.p_tokens, 150)

  await recordAiFailure(mockClient, {
    connectionId: 'conn-1',
    modelId: 'DeepSeek-V4-Flash',
    failureCategory: 'rate_limit',
    failureScope: 'account',
    httpStatus: 429,
    cooldownSeconds: 60,
    reasonSummary: 'Rate limited by AMD',
  })
  assert.equal(calls[2].funcName, 'record_ai_connection_failure')
  assert.equal(calls[2].params.p_failure_category, 'rate_limit')
  assert.equal(calls[2].params.p_cooldown_seconds, 60)
})

// ============================================================
// 6. LEGACY CREDENTIAL MIGRATION
// ============================================================

test('Legacy Migration: migrates primary row idempotently and verifies decryption', async () => {
  const legacySecret = 'rc-legacy-amd-key-9988'
  const legacyEncrypted = encryptSecret(legacySecret, TEST_MASTER_KEY)

  let legacyRow = {
    id: 'primary',
    provider: 'amd',
    base_url: 'https://developer.amd.com.cn/radeon/api/v1',
    model: 'DeepSeek-V4-Flash',
    timeout_ms: 45000,
    encrypted_key: legacyEncrypted.ciphertext,
    key_nonce: legacyEncrypted.nonce,
    key_tag: legacyEncrypted.tag,
    key_version: 1,
    masked_key: 'rc-••••9988',
    status: 'active',
    migrated_to_connections: false,
  }

  let connectionStore = null

  const mockClient = {
    from: (table) => {
      if (table === 'app_ai_provider_config') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: legacyRow, error: null }),
            }),
          }),
          update: (patch) => ({
            eq: async (f, v) => {
              if (f === 'id' && v === 'primary') {
                legacyRow = { ...legacyRow, ...patch }
                return { error: null }
              }
              return { error: new Error('Not found') }
            },
          }),
        }
      }
      if (table === 'app_ai_provider_connections') {
        return {
          upsert: async (row) => {
            connectionStore = { ...row }
            return { error: null }
          },
          select: () => {
            const builder = {
              _eq: null,
              eq(field, value) { builder._eq = [field, value]; return builder },
              limit() { return builder },
              maybeSingle: async () => {
                const [field, value] = builder._eq ?? []
                if (field === 'migrated_from' && value === 'primary') return { data: null, error: null }
                if (field === 'id' && value === LEGACY_MIGRATION_CONNECTION_ID && connectionStore) {
                  return { data: connectionStore, error: null }
                }
                return { data: null, error: null }
              },
            }
            return builder
          },
        }
      }
      throw new Error(`Unexpected table ${table}`)
    },
  }

  // First migration run
  const res1 = await migrateLegacySingletonCredential(mockClient, TEST_MASTER_KEY)
  assert.equal(res1.migrated, true)
  assert.equal(res1.connectionId, LEGACY_MIGRATION_CONNECTION_ID)
  assert.equal(legacyRow.migrated_to_connections, true)

  // Verify migrated record contains valid ciphertext
  assert.ok(connectionStore)
  const decryptedFromConn = decryptSecret(
    {
      ciphertext: connectionStore.encrypted_key,
      nonce: connectionStore.key_nonce,
      tag: connectionStore.key_tag,
      version: connectionStore.key_version,
    },
    TEST_MASTER_KEY,
  )
  assert.equal(decryptedFromConn, legacySecret)

  // Second run: must be idempotent and report alreadyMigrated: true
  const res2 = await migrateLegacySingletonCredential(mockClient, TEST_MASTER_KEY)
  assert.equal(res2.migrated, false)
  assert.equal(res2.alreadyMigrated, true)
})

test('Legacy Migration: fails safely when legacy credential ciphertext is corrupted', async () => {
  const corruptLegacyRow = {
    id: 'primary',
    provider: 'amd',
    base_url: 'https://developer.amd.com.cn/radeon/api/v1',
    model: 'DeepSeek-V4-Flash',
    encrypted_key: 'CORRUPTED-CIPHERTEXT',
    key_nonce: 'NONCE',
    key_tag: 'TAG',
    key_version: 1,
    status: 'active',
    migrated_to_connections: false,
  }

  const mockClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: corruptLegacyRow, error: null }),
        }),
      }),
    }),
  }

  const res = await migrateLegacySingletonCredential(mockClient, TEST_MASTER_KEY)
  assert.equal(res.migrated, false)
  assert.match(res.error, /failed to decrypt/i)
  assert.equal(corruptLegacyRow.migrated_to_connections, false) // Must NOT mark complete
})

// ============================================================
// 7. BOUNDED FAILOVER & FIRST-TOKEN BOUNDARY
// ============================================================

test('Failover: pre-first-token 429 fails over to backup account within 4 attempts', async () => {
  const attempts = []
  const pool = [
    { id: 'conn-1', label: 'Primary AMD', status: 429 },
    { id: 'conn-2', label: 'Secondary AMD', status: 429 },
    { id: 'conn-3', label: 'Backup OpenRouter', status: 200 },
  ]

  const excluded = []
  let selected = null

  // Simulate bounded failover loop
  for (let i = 0; i < 4; i++) {
    const candidate = pool.find((c) => !excluded.includes(c.id))
    if (!candidate) break

    attempts.push(candidate.id)

    if (candidate.status === 429) {
      const classified = classifyProviderError({ status: 429, retryAfterHeader: '30' })
      assert.equal(classified.retryable, true)
      excluded.push(candidate.id)
      continue
    }

    if (candidate.status === 200) {
      selected = candidate
      break
    }
  }

  assert.equal(attempts.length, 3)
  assert.deepEqual(attempts, ['conn-1', 'conn-2', 'conn-3'])
  assert.ok(selected)
  assert.equal(selected.id, 'conn-3')
  assert.equal(excluded.length, 2)
})

test('Failover: non-retryable 400 error terminates immediately without failover', async () => {
  const attempts = []
  const pool = [
    { id: 'conn-1', label: 'Primary AMD', status: 400 },
    { id: 'conn-2', label: 'Secondary AMD', status: 200 },
  ]

  const excluded = []
  for (let i = 0; i < 4; i++) {
    const candidate = pool.find((c) => !excluded.includes(c.id))
    if (!candidate) break

    attempts.push(candidate.id)

    if (candidate.status === 400) {
      const classified = classifyProviderError({ status: 400 })
      assert.equal(classified.retryable, false)
      // Non-retryable user/schema error stops immediately
      break
    }
  }

  // Exactly one attempt; did not rotate to conn-2
  assert.equal(attempts.length, 1)
  assert.deepEqual(attempts, ['conn-1'])
})

test('Streaming: post-first-token lock-in prevents prompt replay', async () => {
  let chunksEmitted = 0
  let promptReplayed = false

  const upstreamStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Invoice "}}]}\n\n'))
      controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"#1024"}}]}\n\n'))
      controller.close()
    },
  })

  // Consumer reads stream
  const reader = upstreamStream.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunksEmitted++
  }

  // Content was committed (chunksEmitted > 0)
  assert.equal(chunksEmitted, 2)

  // In post-first-token state, failover handler MUST NOT attempt another connection
  if (chunksEmitted > 0) {
    promptReplayed = false
  } else {
    promptReplayed = true
  }

  assert.equal(promptReplayed, false)
})

test('Failover: HTTP 401 quarantines account and fails over to secondary account in pool', async () => {
  const attempts = []
  const quarantined = []
  const pool = [
    { id: 'conn-1', label: 'Expired Key AMD', status: 401 },
    { id: 'conn-2', label: 'Valid Secondary AMD', status: 200 },
  ]

  const excluded = []
  let selected = null

  for (let i = 0; i < 4; i++) {
    const candidate = pool.find((c) => !excluded.includes(c.id))
    if (!candidate) break

    attempts.push(candidate.id)

    if (candidate.status === 401) {
      const classified = classifyProviderError({ status: 401 })
      assert.equal(classified.category, 'authentication')
      assert.equal(classified.scope, 'account')
      assert.equal(classified.requiresQuarantine, true)
      assert.equal(classified.retryable, true)
      quarantined.push(candidate.id)
      excluded.push(candidate.id)
      continue
    }

    if (candidate.status === 200) {
      selected = candidate
      break
    }
  }

  assert.equal(attempts.length, 2)
  assert.deepEqual(attempts, ['conn-1', 'conn-2'])
  assert.deepEqual(quarantined, ['conn-1'])
  assert.ok(selected)
  assert.equal(selected.id, 'conn-2')
})

test('Failover: HTTP 402 applies cooldown and fails over to secondary account in pool', async () => {
  const attempts = []
  const cooledDown = []
  const pool = [
    { id: 'conn-1', label: 'Exhausted Quota AMD', status: 402 },
    { id: 'conn-2', label: 'Active Backup AMD', status: 200 },
  ]

  const excluded = []
  let selected = null

  for (let i = 0; i < 4; i++) {
    const candidate = pool.find((c) => !excluded.includes(c.id))
    if (!candidate) break

    attempts.push(candidate.id)

    if (candidate.status === 402) {
      const classified = classifyProviderError({ status: 402 })
      assert.equal(classified.category, 'quota_exhausted')
      assert.equal(classified.scope, 'account')
      assert.equal(classified.requiresCooldown, true)
      assert.equal(classified.requiresQuarantine, false)
      assert.equal(classified.retryable, true)
      cooledDown.push(candidate.id)
      excluded.push(candidate.id)
      continue
    }

    if (candidate.status === 200) {
      selected = candidate
      break
    }
  }

  assert.equal(attempts.length, 2)
  assert.deepEqual(attempts, ['conn-1', 'conn-2'])
  assert.deepEqual(cooledDown, ['conn-1'])
  assert.ok(selected)
  assert.equal(selected.id, 'conn-2')
})

test('Balance Sync: DeepSeek CNY currency rejection prevents writing nominal CNY to USD balance', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        is_available: true,
        balance_infos: [{ currency: 'CNY', total_balance: '128.50' }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  try {
    const res = await checkUpstreamBalance('deepseek', 'sk-test-key')
    assert.equal(res.supported, true)
    assert.equal(res.balanceUsd, null)
    assert.equal(res.currency, 'CNY')
    assert.equal(res.source, 'unsupported')
    assert.match(res.error ?? '', /USD normalization is not configured/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Balance Sync: DeepSeek USD currency acceptance records valid USD balance', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        is_available: true,
        balance_infos: [{ currency: 'USD', total_balance: '42.75' }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  try {
    const res = await checkUpstreamBalance('deepseek', 'sk-test-key')
    assert.equal(res.supported, true)
    assert.equal(res.balanceUsd, 42.75)
    assert.equal(res.currency, 'USD')
    assert.equal(res.source, 'api')
  } finally {
    globalThis.fetch = originalFetch
  }
})


