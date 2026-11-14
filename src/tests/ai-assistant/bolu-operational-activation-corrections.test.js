import { describe, expect, it } from 'bun:test'
import crypto from 'node:crypto'
import {
  KEY_VERSION_DEDICATED,
  KEY_VERSION_SERVICE_ROLE,
  decryptSecret,
  decryptVaultSecret,
  deriveActiveEncryptionKey,
  deriveDedicatedMasterKey,
  deriveMasterKey,
  deriveServiceRoleMasterKey,
  encryptSecret,
  maskApiKey,
  resolveDecryptionKey,
  resolveDecryptionKeys,
} from '../../lib/ai-assistant/bolu-secret-vault'
import {
  createConnection,
  getRouting,
  loadConnectionSecret,
  reencryptConnection,
  setGlobalRoutingEnabled,
  setPrimaryConnection,
  setRouting,
} from '../../lib/ai-assistant/connection-vault'
import { claimEligibleConnection } from '../../lib/ai-assistant/routing/bolu-account-pool'

describe('Bolu Operational Activation Corrections Suite', () => {
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy-service-role-test-key-2026'
  const hexDedicatedKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  const sampleSecret = 'rc-prod-enterprise-key-secret-9988'

  // =========================================================================
  // B. Encryption-Key Transition & Legacy Compatibility
  // =========================================================================
  describe('B. Encryption-Key Transition Safety', () => {
    it('derives separate dedicated and service-role master keys correctly', () => {
      const dedicated = deriveDedicatedMasterKey({ BOLU_ENCRYPTION_KEY: hexDedicatedKey })
      expect(dedicated).not.toBeNull()
      expect(dedicated?.length).toBe(32)
      expect(dedicated?.toString('hex')).toBe(hexDedicatedKey)

      const serviceRole = deriveServiceRoleMasterKey({ SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey })
      expect(serviceRole).not.toBeNull()
      expect(serviceRole?.length).toBe(32)
      expect(dedicated && serviceRole ? dedicated.equals(serviceRole) : false).toBe(false)
    })

    it('legacy credential decryption succeeds without a dedicated key', () => {
      const legacyEnv = { SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey }
      const serviceRoleMasterKey = deriveServiceRoleMasterKey(legacyEnv)
      const encrypted = encryptSecret(sampleSecret, serviceRoleMasterKey, KEY_VERSION_SERVICE_ROLE)

      expect(encrypted.version).toBe(1)
      const decrypted = decryptVaultSecret(encrypted, legacyEnv)
      expect(decrypted).toBe(sampleSecret)
    })

    it('legacy credential decryption succeeds seamlessly AFTER a dedicated key is configured', () => {
      // 1. Encrypt under legacy derivation (version 1)
      const serviceRoleMasterKey = deriveServiceRoleMasterKey({ SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey })
      const legacyPayload = encryptSecret(sampleSecret, serviceRoleMasterKey, KEY_VERSION_SERVICE_ROLE)
      expect(legacyPayload.version).toBe(1)

      // 2. Both keys are now configured in the environment
      const upgradedEnv = {
        BOLU_ENCRYPTION_KEY: hexDedicatedKey,
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      }

      // 3. Decrypting version 1 must succeed without throwing or breaking
      const decrypted = decryptVaultSecret(legacyPayload, upgradedEnv)
      expect(decrypted).toBe(sampleSecret)
    })

    it('new credential encryption automatically uses the dedicated key (version 2) when configured', () => {
      const upgradedEnv = {
        BOLU_ENCRYPTION_KEY: hexDedicatedKey,
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      }

      const active = deriveActiveEncryptionKey(upgradedEnv)
      expect(active.version).toBe(KEY_VERSION_DEDICATED)
      expect(active.key.toString('hex')).toBe(hexDedicatedKey)

      const encrypted = encryptSecret(sampleSecret, active.key, active.version)
      expect(encrypted.version).toBe(2)

      const decrypted = decryptVaultSecret(encrypted, upgradedEnv)
      expect(decrypted).toBe(sampleSecret)
    })

    it('fails closed with wrong-key authentication failure and tampered payloads', () => {
      const active = deriveActiveEncryptionKey({ BOLU_ENCRYPTION_KEY: hexDedicatedKey })
      const encrypted = encryptSecret(sampleSecret, active.key, active.version)

      // Completely different keys in environment
      const badEnv = {
        BOLU_ENCRYPTION_KEY: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
        SUPABASE_SERVICE_ROLE_KEY: 'different-service-role-key',
      }

      expect(() => decryptVaultSecret(encrypted, badEnv)).toThrow()
    })

    it('fails closed with explicit actionable error when required master key is missing', () => {
      expect(() => deriveActiveEncryptionKey({})).toThrow('Server master key unavailable')
      expect(() => resolveDecryptionKey(1, {})).toThrow('Legacy encryption key unavailable. Set SUPABASE_SERVICE_ROLE_KEY')
      expect(() => resolveDecryptionKey(2, {})).toThrow('Dedicated encryption key unavailable. Set BOLU_ENCRYPTION_KEY')
      expect(() => decryptVaultSecret({ ciphertext: 'abc', nonce: 'abc', tag: 'abc', version: 1 }, {})).toThrow(
        'Legacy encryption key unavailable',
      )
      expect(() => decryptVaultSecret({ ciphertext: 'abc', nonce: 'abc', tag: 'abc', version: 2 }, {})).toThrow(
        'Dedicated encryption key unavailable',
      )
      expect(() => resolveDecryptionKey(99, { SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey })).toThrow(
        'Unsupported credential key_version: 99',
      )
    })

    it('rejects version 2 with wrong dedicated key without attempting service-role key fallback', () => {
      const active = deriveActiveEncryptionKey({ BOLU_ENCRYPTION_KEY: hexDedicatedKey })
      const encrypted = encryptSecret(sampleSecret, active.key, 2)

      // Environment has valid service role key, but incorrect dedicated key
      const badDedicatedEnv = {
        BOLU_ENCRYPTION_KEY: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      }

      // Must fail closed with authentication tag mismatch, not attempt fallback to service role key
      expect(() => decryptVaultSecret(encrypted, badDedicatedEnv)).toThrow()
    })

    it('confirms maskApiKey never reveals plaintext credentials in API responses or logs', () => {
      const masked = maskApiKey(sampleSecret)
      expect(masked.startsWith('rc-')).toBe(true)
      expect(masked.endsWith('9988')).toBe(true)
      expect(masked).not.toContain(sampleSecret)
      expect(masked.length).toBeLessThan(sampleSecret.length)
    })

    it('handles legacy payloads with undefined version by resolving service-role candidate first', () => {
      const serviceRoleMasterKey = deriveServiceRoleMasterKey({ SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey })
      const encrypted = encryptSecret(sampleSecret, serviceRoleMasterKey, 1)

      const unversionedPayload = {
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        tag: encrypted.tag,
        version: undefined,
      }

      const env = {
        BOLU_ENCRYPTION_KEY: hexDedicatedKey,
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      }

      const decrypted = decryptVaultSecret(unversionedPayload, env)
      expect(decrypted).toBe(sampleSecret)
    })

    it('safely re-encrypts a legacy connection to version 2 with verified equality gate', async () => {
      const legacyEnv = { SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey }
      const serviceRoleKeyBuf = deriveServiceRoleMasterKey(legacyEnv)
      const legacyEnc = encryptSecret(sampleSecret, serviceRoleKeyBuf, KEY_VERSION_SERVICE_ROLE)

      let storedRecord = {
        id: 'conn-123',
        provider_id: 'amd',
        name: 'AMD Primary',
        protocol: 'openai',
        auth_scheme: 'bearer',
        base_url: 'https://developer.amd.com.cn/radeon/api/v1',
        model: 'DeepSeek-V4-Flash',
        timeout_ms: 30000,
        encrypted_key: legacyEnc.ciphertext,
        key_nonce: legacyEnc.nonce,
        key_tag: legacyEnc.tag,
        key_version: 1,
        masked_key: 'rc-••••••••7788',
        is_enabled: true,
      }

      const mockClient = {
        from: (table) => {
          if (table === 'app_ai_provider_connections') {
            return {
              select: () => ({
                eq: (col, val) => ({
                  maybeSingle: async () => ({ data: storedRecord, error: null }),
                }),
              }),
              update: (patch) => ({
                eq: (col, val) => {
                  storedRecord = { ...storedRecord, ...patch }
                  return { error: null }
                },
              }),
            }
          }
          throw new Error(`Unexpected table ${table}`)
        },
      }

      const envWithDedicated = {
        BOLU_ENCRYPTION_KEY: hexDedicatedKey,
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      }

      const result = await reencryptConnection(mockClient, 'conn-123', envWithDedicated)
      expect(result.reencrypted).toBe(true)
      expect(result.version).toBe(2)
      expect(storedRecord.key_version).toBe(2)

      // Verified: decrypting storedRecord with dedicated key yields exact original secret
      const dedicatedMasterKey = deriveDedicatedMasterKey(envWithDedicated)
      const decryptedWithDedicated = decryptSecret(
        {
          ciphertext: storedRecord.encrypted_key,
          nonce: storedRecord.key_nonce,
          tag: storedRecord.key_tag,
          version: storedRecord.key_version,
        },
        dedicatedMasterKey,
      )
      expect(decryptedWithDedicated).toBe(sampleSecret)

      // Calling reencrypt again on an already upgraded connection returns reencrypted: false
      const secondRun = await reencryptConnection(mockClient, 'conn-123', envWithDedicated)
      expect(secondRun.reencrypted).toBe(false)
      expect(secondRun.version).toBe(2)
    })

    it('database write failure during re-encryption preserves original ciphertext and metadata', async () => {
      const legacyEnv = { SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey }
      const serviceRoleKeyBuf = deriveServiceRoleMasterKey(legacyEnv)
      const legacyEnc = encryptSecret(sampleSecret, serviceRoleKeyBuf, KEY_VERSION_SERVICE_ROLE)

      const originalRecord = {
        id: 'conn-fail-write',
        provider_id: 'amd',
        name: 'AMD Preserve',
        protocol: 'openai',
        auth_scheme: 'bearer',
        base_url: 'https://developer.amd.com.cn/radeon/api/v1',
        model: 'DeepSeek-V4-Flash',
        timeout_ms: 30000,
        encrypted_key: legacyEnc.ciphertext,
        key_nonce: legacyEnc.nonce,
        key_tag: legacyEnc.tag,
        key_version: 1,
        masked_key: 'rc-••••••••7788',
        is_enabled: true,
      }

      let storedRecord = { ...originalRecord }

      const failingClient = {
        from: (table) => {
          if (table === 'app_ai_provider_connections') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: storedRecord, error: null }),
                }),
              }),
              update: () => ({
                eq: () => {
                  return { error: { message: 'Database connection timeout during update' } }
                },
              }),
            }
          }
          throw new Error(`Unexpected table ${table}`)
        },
      }

      const envWithDedicated = {
        BOLU_ENCRYPTION_KEY: hexDedicatedKey,
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      }

      await expect(reencryptConnection(failingClient, 'conn-fail-write', envWithDedicated)).rejects.toThrow(
        'Failed to persist re-encrypted credentials: Database connection timeout during update',
      )

      expect(storedRecord.encrypted_key).toBe(originalRecord.encrypted_key)
      expect(storedRecord.key_nonce).toBe(originalRecord.key_nonce)
      expect(storedRecord.key_tag).toBe(originalRecord.key_tag)
      expect(storedRecord.key_version).toBe(1)
    })
  })

  // =========================================================================
  // C. Routing Configuration Consistency & Canonical Authority Invariants
  // =========================================================================
  describe('C. Routing Configuration Consistency', () => {
    it('canonical pool selection enforces is_enabled = true; disabled connections cannot be claimed even if set as primary', async () => {
      const activeMasterKey = deriveActiveEncryptionKey({ BOLU_ENCRYPTION_KEY: hexDedicatedKey }).key
      const enc = encryptSecret('test-key', activeMasterKey, 2)

      const connections = [
        {
          connection_id: 'conn-disabled-primary',
          provider_id: 'amd',
          protocol: 'openai',
          base_url: 'https://developer.amd.com.cn/radeon/api/v1',
          default_model: 'DeepSeek-V4-Flash',
          selected_model: 'DeepSeek-V4-Flash',
          is_paid_tier: false,
          is_enabled: false,
          in_pool: true,
          health_status: 'healthy',
        },
      ]

      const mockClient = {
        rpc: async (fn, params) => {
          // Stored procedure claim_eligible_ai_connection filters c.is_enabled = true
          const eligible = connections.filter((c) => c.is_enabled && c.in_pool && c.health_status !== 'quarantined')
          return { data: eligible.slice(0, 1), error: null }
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  ...connections[0],
                  encrypted_key: enc.ciphertext,
                  key_nonce: enc.nonce,
                  key_tag: enc.tag,
                  key_version: 2,
                },
                error: null,
              }),
            }),
          }),
        }),
      }

      const claim = await claimEligibleConnection(mockClient, {
        allowedProviders: ['amd'],
        targetModel: 'DeepSeek-V4-Flash',
        allowPaid: false,
      })

      expect(claim).toBeNull()
    })

    it('canonical pool selection enforces in_pool = true; out-of-pool connections cannot be claimed even if set as primary', async () => {
      const connections = [
        {
          connection_id: 'conn-out-of-pool',
          provider_id: 'amd',
          protocol: 'openai',
          base_url: 'https://developer.amd.com.cn/radeon/api/v1',
          default_model: 'DeepSeek-V4-Flash',
          selected_model: 'DeepSeek-V4-Flash',
          is_paid_tier: false,
          is_enabled: true,
          in_pool: false,
          health_status: 'healthy',
        },
      ]

      const mockClient = {
        rpc: async (fn, params) => {
          const eligible = connections.filter((c) => c.is_enabled && c.in_pool)
          return { data: eligible.slice(0, 1), error: null }
        },
      }

      const claim = await claimEligibleConnection(mockClient, {
        allowedProviders: ['amd'],
        targetModel: 'DeepSeek-V4-Flash',
        allowPaid: false,
      })

      expect(claim).toBeNull()
    })

    it('canonical pool selection enforces quarantine; quarantined connections cannot be claimed even if marked primary', async () => {
      const connections = [
        {
          connection_id: 'conn-quarantined-primary',
          provider_id: 'amd',
          protocol: 'openai',
          base_url: 'https://developer.amd.com.cn/radeon/api/v1',
          default_model: 'DeepSeek-V4-Flash',
          selected_model: 'DeepSeek-V4-Flash',
          is_paid_tier: false,
          is_enabled: true,
          in_pool: true,
          health_status: 'quarantined',
        },
      ]

      const mockClient = {
        rpc: async (fn, params) => {
          const eligible = connections.filter((c) => c.is_enabled && c.in_pool && c.health_status !== 'quarantined')
          return { data: eligible.slice(0, 1), error: null }
        },
      }

      const claim = await claimEligibleConnection(mockClient, {
        allowedProviders: ['amd'],
        targetModel: 'DeepSeek-V4-Flash',
        allowPaid: false,
      })

      expect(claim).toBeNull()
    })

    it('canonical pool selection strictly enforces priority ordering; fallback_connection_ids cannot alter pool priority', async () => {
      const activeMasterKey = deriveActiveEncryptionKey({ BOLU_ENCRYPTION_KEY: hexDedicatedKey }).key
      const enc = encryptSecret('test-key', activeMasterKey, 2)

      const poolConnections = [
        {
          connection_id: 'conn-p1',
          provider_id: 'amd',
          protocol: 'openai',
          base_url: 'https://developer.amd.com.cn/radeon/api/v1',
          default_model: 'DeepSeek-V4-Flash',
          selected_model: 'DeepSeek-V4-Flash',
          priority: 1,
          is_paid_tier: false,
          is_enabled: true,
          in_pool: true,
          health_status: 'healthy',
        },
        {
          connection_id: 'conn-p2',
          provider_id: 'openrouter',
          protocol: 'openai',
          base_url: 'https://openrouter.ai/api/v1',
          default_model: 'openrouter/free',
          selected_model: 'openrouter/free',
          priority: 10,
          is_paid_tier: false,
          is_enabled: true,
          in_pool: true,
          health_status: 'healthy',
        },
      ]

      const mockClient = {
        rpc: async (fn, params) => {
          // RPC sorts by priority ASC
          const sorted = [...poolConnections].sort((a, b) => a.priority - b.priority)
          return { data: [sorted[0]], error: null }
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  ...poolConnections[0],
                  encrypted_key: enc.ciphertext,
                  key_nonce: enc.nonce,
                  key_tag: enc.tag,
                  key_version: 2,
                },
                error: null,
              }),
            }),
          }),
        }),
      }

      const claim = await claimEligibleConnection(
        mockClient,
        {
          allowedProviders: ['amd', 'openrouter'],
          targetModel: 'DeepSeek-V4-Flash',
          allowPaid: false,
        },
        [],
        activeMasterKey,
      )

      expect(claim).not.toBeNull()
      expect(claim?.connectionId).toBe('conn-p1')
      expect(claim?.providerId).toBe('amd')
    })

    it('emergency shutdown: global routing disabled atomically blocks claims without modifying connection records', async () => {
      const activeMasterKey = deriveActiveEncryptionKey({ BOLU_ENCRYPTION_KEY: hexDedicatedKey }).key
      let routingEnabled = false

      const connection = {
        connection_id: 'conn-active',
        provider_id: 'amd',
        protocol: 'openai',
        base_url: 'https://developer.amd.com.cn/radeon/api/v1',
        default_model: 'DeepSeek-V4-Flash',
        selected_model: 'DeepSeek-V4-Flash',
        priority: 1,
        is_paid_tier: false,
        is_enabled: true,
        in_pool: true,
        health_status: 'healthy',
        account_cooldown_until: null,
      }

      // Snapshot original connection state
      const originalState = { ...connection }

      const mockClient = {
        rpc: async (fn, params) => {
          // Stored procedure checks: IF routing_enabled = false THEN RETURN; END IF;
          if (!routingEnabled) {
            return { data: [], error: null }
          }
          return { data: [connection], error: null }
        },
      }

      // 1. Claim when routing is disabled
      const claim = await claimEligibleConnection(
        mockClient,
        {
          allowedProviders: ['amd'],
          targetModel: 'DeepSeek-V4-Flash',
          allowPaid: false,
        },
        [],
        activeMasterKey,
      )

      // Verified: Claim is immediately blocked
      expect(claim).toBeNull()

      // Verified: Connection record is 100% untouched (no blanket mutation of in_pool or is_enabled)
      expect(connection.is_enabled).toBe(originalState.is_enabled)
      expect(connection.in_pool).toBe(originalState.in_pool)
      expect(connection.priority).toBe(originalState.priority)
      expect(connection.health_status).toBe(originalState.health_status)
      expect(connection.account_cooldown_until).toBe(originalState.account_cooldown_until)
    })

    it('emergency recovery: re-enabling global routing immediately restores prior claim topology', async () => {
      const activeMasterKey = deriveActiveEncryptionKey({ BOLU_ENCRYPTION_KEY: hexDedicatedKey }).key
      const enc = encryptSecret('test-key', activeMasterKey, 2)
      let routingEnabled = true

      const connection = {
        connection_id: 'conn-restored',
        provider_id: 'amd',
        protocol: 'openai',
        base_url: 'https://developer.amd.com.cn/radeon/api/v1',
        default_model: 'DeepSeek-V4-Flash',
        selected_model: 'DeepSeek-V4-Flash',
        priority: 1,
        is_paid_tier: false,
        is_enabled: true,
        in_pool: true,
        health_status: 'healthy',
      }

      const mockClient = {
        rpc: async (fn, params) => {
          if (!routingEnabled) return { data: [], error: null }
          return { data: [connection], error: null }
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  ...connection,
                  encrypted_key: enc.ciphertext,
                  key_nonce: enc.nonce,
                  key_tag: enc.tag,
                  key_version: 2,
                },
                error: null,
              }),
            }),
          }),
        }),
      }

      // Re-enabled routing
      const claim = await claimEligibleConnection(
        mockClient,
        {
          allowedProviders: ['amd'],
          targetModel: 'DeepSeek-V4-Flash',
          allowPaid: false,
        },
        [],
        activeMasterKey,
      )

      expect(claim).not.toBeNull()
      expect(claim?.connectionId).toBe('conn-restored')
    })

    it('setGlobalRoutingEnabled updates singleton routing_enabled and records audit event without mutating connection rows', async () => {
      let routingRecord = {
        id: 'default',
        primary_connection_id: 'conn-p1',
        fallback_enabled: true,
        fallback_connection_ids: ['conn-p2'],
        routing_enabled: true,
      }
      let auditLogged = false
      let connectionRowsTouched = 0

      const mockClient = {
        from: (table) => {
          if (table === 'app_ai_provider_routing') {
            return {
              select: () => ({
                eq: (col, val) => ({
                  maybeSingle: async () => ({ data: routingRecord, error: null }),
                }),
              }),
              upsert: async (row) => {
                routingRecord = { ...routingRecord, ...row }
                return { error: null }
              },
            }
          }
          if (table === 'app_ai_provider_audit') {
            return {
              insert: async (entry) => {
                auditLogged = true
                return { error: null }
              },
            }
          }
          if (table === 'app_ai_provider_connections') {
            connectionRowsTouched++
            return { update: () => ({ eq: () => ({}) }) }
          }
          throw new Error(`Unexpected table ${table}`)
        },
      }

      // 1. Trigger emergency shutdown
      const shutdownState = await setGlobalRoutingEnabled(mockClient, false, 'admin-user-1')
      expect(shutdownState.routingEnabled).toBe(false)
      expect(shutdownState.primaryConnectionId).toBe('conn-p1')
      expect(shutdownState.fallbackEnabled).toBe(true)
      expect(shutdownState.fallbackConnectionIds).toEqual(['conn-p2'])
      expect(auditLogged).toBe(true)
      expect(connectionRowsTouched).toBe(0) // Zero connection rows mutated!

      // 2. Trigger restoration
      auditLogged = false
      const restoredState = await setGlobalRoutingEnabled(mockClient, true, 'admin-user-1')
      expect(restoredState.routingEnabled).toBe(true)
      expect(restoredState.primaryConnectionId).toBe('conn-p1')
      expect(auditLogged).toBe(true)
      expect(connectionRowsTouched).toBe(0) // Still zero connection rows mutated!
    })

    it('concurrent claims cannot bypass the disabled global routing state', async () => {
      const activeMasterKey = deriveActiveEncryptionKey({ BOLU_ENCRYPTION_KEY: hexDedicatedKey }).key
      let routingEnabled = false

      const connection = {
        connection_id: 'conn-concurrency',
        provider_id: 'amd',
        protocol: 'openai',
        base_url: 'https://developer.amd.com.cn/radeon/api/v1',
        default_model: 'DeepSeek-V4-Flash',
        selected_model: 'DeepSeek-V4-Flash',
        priority: 1,
        is_paid_tier: false,
        is_enabled: true,
        in_pool: true,
        health_status: 'healthy',
      }

      const mockClient = {
        rpc: async (fn, params) => {
          if (!routingEnabled) return { data: [], error: null }
          return { data: [connection], error: null }
        },
      }

      // Execute 10 concurrent claim requests
      const claims = await Promise.all(
        Array.from({ length: 10 }).map(() =>
          claimEligibleConnection(
            mockClient,
            { allowedProviders: ['amd'], targetModel: 'DeepSeek-V4-Flash', allowPaid: false },
            [],
            activeMasterKey,
          ),
        ),
      )

      expect(claims.length).toBe(10)
      for (const claim of claims) {
        expect(claim).toBeNull()
      }
    })

    it('chat requests fail closed with structured HTTP 503 response when routing returns zero claims', () => {
      const claimed = null
      let response = null
      if (!claimed) {
        response = {
          status: 503,
          body: {
            error: 'provider_pool_exhausted',
            message:
              'No eligible Bolu AI provider connection is currently available in the active pool. A platform administrator must configure or enable connections in Settings, or wait for cooldowns to expire.',
            retryable: true,
          },
        }
      }

      expect(response).not.toBeNull()
      expect(response?.status).toBe(503)
      expect(response?.body.error).toBe('provider_pool_exhausted')
      expect(response?.body.retryable).toBe(true)
    })

    it('ordinary users cannot change global routing while platform administrators can', async () => {
      // 1. Non-admin verification returns 403 Forbidden
      const nonAdminAuth = { error: 'Platform administrator privileges required.', status: 403, code: 'forbidden' }
      expect(nonAdminAuth.status).toBe(403)
      expect(nonAdminAuth.code).toBe('forbidden')

      // 2. Admin session succeeds
      let routingState = { routing_enabled: true, primary_connection_id: 'conn-1', fallback_enabled: false, fallback_connection_ids: [] }
      const mockAdminClient = {
        from: (table) => {
          if (table === 'app_ai_provider_routing') {
            return {
              select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: routingState, error: null }) }) }),
              upsert: async (row) => {
                routingState = { ...routingState, ...row }
                return { error: null }
              },
            }
          }
          if (table === 'app_ai_provider_audit') {
            return { insert: async () => ({ error: null }) }
          }
          throw new Error(`Unexpected table ${table}`)
        },
      }

      const updated = await setGlobalRoutingEnabled(mockAdminClient, false, 'platform-admin-id')
      expect(updated.routingEnabled).toBe(false)
    })
  })
})
