import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

import {
  VAULT_SALT_V1,
  KEY_VERSION_SERVICE_ROLE,
  KEY_VERSION_DEDICATED,
  deriveServiceRoleMasterKey,
  encryptSecret,
  decryptSecret,
  decryptVaultSecret,
} from '../../lib/ai-assistant/bolu-secret-vault.js'

import {
  classifyProviderError,
} from '../../lib/ai-assistant/routing/bolu-error-classifier.js'

import {
  claimEligibleConnection,
  claimExactConnection,
  recordAiFailure,
} from '../../lib/ai-assistant/routing/bolu-account-pool.js'

import {
  discoverEligibleAlternatives,
} from '../../lib/ai-assistant/routing/bolu-alternative-discovery.js'

// ============================================================
// 1. VAULT CRYPTOGRAPHIC SALT & DERIVATION COMPATIBILITY
// ============================================================

test('Vault: Version-1 salt is immutable and matches production ciphertext derivation', () => {
  assert.equal(VAULT_SALT_V1, 'bourxe-bolu-vault-v1')
  assert.equal(typeof VAULT_SALT_V1, 'string')
})

test('Vault: Master key derivation with original salt decrypts ciphertexts; mutated salt fails', () => {
  const dummyServiceRoleKey = 'test-supabase-service-role-key-secret-12345'
  const envOriginal = { SUPABASE_SERVICE_ROLE_KEY: dummyServiceRoleKey }

  const masterKeyOriginal = deriveServiceRoleMasterKey(envOriginal)
  assert.ok(masterKeyOriginal)
  assert.equal(masterKeyOriginal.length, 32)

  // Verify derivation matches HMAC-SHA256(bourxe-bolu-vault-v1, key)
  const expectedKey = crypto.createHmac('sha256', 'bourxe-bolu-vault-v1').update(dummyServiceRoleKey).digest()
  assert.deepEqual(masterKeyOriginal, expectedKey)

  // Encrypt with original master key
  const plainSecret = 'rc-production-ai-test-key-9999'
  const encrypted = encryptSecret(plainSecret, masterKeyOriginal, KEY_VERSION_SERVICE_ROLE)

  // Decrypt with original master key via decryptVaultSecret
  const decrypted = decryptVaultSecret(encrypted, envOriginal)
  assert.equal(decrypted, plainSecret)

  // Decryption with mutated salt master key must fail GCM tag validation
  const mutatedMasterKey = crypto.createHmac('sha256', 'bouxre-bolu-vault-v1').update(dummyServiceRoleKey).digest()
  assert.throws(
    () => {
      decryptSecret(encrypted, mutatedMasterKey)
    },
    /Unsupported state or unable to authenticate data|authentication tag/i,
  )
})

// ============================================================
// 2. FAILURE CLASSIFICATION: DECRYPTION VS AUTHENTICATION
// ============================================================

test('Failure Classification: Decryption failures are classified as request-scoped, NOT account authentication', () => {
  const decryptionError = new Error('Unsupported state or unable to authenticate data')
  const classified = classifyProviderError({
    status: 500,
    error: decryptionError,
  })

  assert.equal(classified.category, 'unknown')
  assert.equal(classified.scope, 'request')
  assert.equal(classified.httpStatus, 500)
  assert.equal(classified.requiresQuarantine, false)
  assert.equal(classified.retryable, false)
})

test('Failure Classification: Genuine provider 401 requires account quarantine', () => {
  const classified = classifyProviderError({
    status: 401,
  })

  assert.equal(classified.category, 'authentication')
  assert.equal(classified.scope, 'account')
  assert.equal(classified.requiresQuarantine, true)
  assert.equal(classified.retryable, true)
})

test('Failure Classification: Model-tier 403 restricts scope to model/provider without account quarantine', () => {
  const modelTierError = classifyProviderError(
    { status: 403, errorBody: { error: { message: 'Model tier access required.' } } },
    { targetModel: 'deepseek-ai/DeepSeek-V4.1-Flash' },
  )

  assert.equal(modelTierError.category, 'permission')
  assert.equal(modelTierError.scope, 'model')
  assert.equal(modelTierError.requiresQuarantine, false)
  assert.equal(modelTierError.requiresCooldown, true)

  const providerPermissionError = classifyProviderError({
    status: 403,
    errorBody: { error: { message: 'Forbidden country.' } },
  })

  assert.equal(providerPermissionError.category, 'permission')
  assert.equal(providerPermissionError.scope, 'provider')
  assert.equal(providerPermissionError.requiresQuarantine, false)
})

// ============================================================
// 3. ACCOUNT POOL: DECRYPTION DEFECT GUARD IN ROUTER
// ============================================================

test('Account Pool: Vault decryption failure inside claimEligibleConnection records request scope without quarantine', async () => {
  const recordedFailures: any[] = []

  const mockAdminClient: any = {
    rpc: async (fn: string, params: any) => {
      if (fn === 'claim_eligible_ai_connection') {
        return {
          data: [
            {
              connection_id: 'conn-test-decryption-failure',
              provider_id: 'runcrate',
              protocol: 'openai',
              base_url: 'https://api.runcrate.com/v1',
              default_model: 'deepseek-ai/DeepSeek-V4.1-Flash',
              selected_model: 'deepseek-ai/DeepSeek-V4.1-Flash',
              is_paid_tier: false,
            },
          ],
          error: null,
        }
      }
      if (fn === 'record_ai_connection_failure') {
        recordedFailures.push(params)
        return { data: true, error: null }
      }
      return { data: null, error: null }
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              // Corrupted ciphertext payload that triggers decryption throw
              encrypted_key: 'AAAA',
              key_nonce: 'BBBB',
              key_tag: 'CCCC',
              key_version: 1,
              timeout_ms: 30000,
            },
            error: null,
          }),
        }),
      }),
    }),
  }

  const result = await claimEligibleConnection(mockAdminClient, {
    allowedProviders: ['runcrate'],
    targetModel: 'deepseek-ai/DeepSeek-V4.1-Flash',
    allowPaid: true,
  })

  assert.equal(result, null)
  assert.equal(recordedFailures.length, 1)

  const failure = recordedFailures[0]
  assert.equal(failure.p_connection_id, 'conn-test-decryption-failure')
  assert.equal(failure.p_failure_category, 'unknown')
  assert.equal(failure.p_failure_scope, 'request')
  assert.equal(failure.p_http_status, 500)
  assert.notEqual(failure.p_failure_category, 'authentication')
  assert.notEqual(failure.p_failure_scope, 'account')
})

// ============================================================
// 4. QUARANTINE EXCLUSION & DISCOVERY RESPECTING HEALTH
// ============================================================

test('Account Pool: claimExactConnection immediately rejects quarantined connection', async () => {
  const mockAdminClient: any = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: 'conn-quarantined',
                provider_id: 'runcrate',
                protocol: 'openai',
                base_url: 'https://api.runcrate.com/v1',
                model: 'deepseek-ai/DeepSeek-V4.1-Flash',
                timeout_ms: 30000,
                is_enabled: true,
                is_paid_tier: false,
                health_status: 'quarantined', // QUARANTINED
                account_cooldown_until: null,
                encrypted_key: 'dummy',
                key_nonce: 'dummy',
                key_tag: 'dummy',
                key_version: 1,
              },
              error: null,
            }),
          }),
        }),
      }),
    }),
  }

  const claimed = await claimExactConnection(mockAdminClient, 'conn-quarantined', 'deepseek-ai/DeepSeek-V4.1-Flash')
  assert.equal(claimed, null)
})

test('Alternative Discovery: excludes quarantined connections and returns only healthy candidates', async () => {
  const candidates = [
    {
      id: 'conn-quarantined-1',
      name: 'Quarantined Runcrate',
      provider_id: 'runcrate',
      model: 'deepseek-ai/DeepSeek-V4.1-Flash',
      is_enabled: true,
      in_pool: true,
      health_status: 'quarantined',
      priority: 100,
      account_cooldown_until: null,
      model_cooldowns: {},
      is_paid_tier: false,
    },
    {
      id: 'conn-healthy-gemini',
      name: 'Healthy Gemini',
      provider_id: 'gemini',
      model: 'models/gemini-4-hydrogen',
      is_enabled: true,
      in_pool: true,
      health_status: 'healthy',
      priority: 100,
      account_cooldown_until: null,
      model_cooldowns: {},
      is_paid_tier: false,
    },
  ]

  const mockQuery: any = {
    order: () => mockQuery,
    then: (resolve: any) => resolve({ data: candidates, error: null }),
  }

  const mockAdminClient: any = {
    from: () => ({
      select: () => mockQuery,
    }),
  }

  const alternatives = await discoverEligibleAlternatives(
    mockAdminClient,
    'conn-quarantined-1',
    'deepseek-ai/DeepSeek-V4.1-Flash',
    4,
  )

  assert.equal(alternatives.length, 1)
  assert.equal(alternatives[0].connectionId, 'conn-healthy-gemini')
  assert.equal(alternatives[0].providerId, 'gemini')
  assert.equal(alternatives[0].modelId, 'models/gemini-4-hydrogen')
})
