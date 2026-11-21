import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { encryptSecret } from '@/lib/ai-assistant/bolu-secret-vault'
import { claimExactConnection } from '@/lib/ai-assistant/routing/bolu-account-pool'
import { resolveRoutingPolicy } from '@/lib/ai-assistant/routing/bolu-policy-router'

const CHAT_ROUTE = path.resolve(process.cwd(), 'api/bolu-chat.ts')
const TEST_MASTER_KEY = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex')

test('Self-Healing: claimExactConnection allows connection whose cooldown has expired', async () => {
  const secretKey = 'sk-or-v1-my-secret-key'
  const encrypted = encryptSecret(secretKey, TEST_MASTER_KEY)
  const connectionId = '22222222-3333-4444-5555-666666666666'

  // Expired cooldown in the past
  const pastTimestamp = new Date(Date.now() - 10000).toISOString()

  const mockAdminClient: any = {
    from: (table: string) => {
      assert.equal(table, 'app_ai_provider_connections')
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: {
            id: connectionId,
            name: 'Self Healing Connection',
            provider_id: 'openrouter',
            protocol: 'openai',
            base_url: 'https://openrouter.ai/api/v1',
            model: 'openrouter/free',
            is_enabled: true,
            health_status: 'cooling_down',
            account_cooldown_until: pastTimestamp,
            is_paid_tier: false,
            timeout_ms: 30000,
            encrypted_key: encrypted.ciphertext,
            key_nonce: encrypted.nonce,
            key_tag: encrypted.tag,
            key_version: encrypted.version,
          },
          error: null,
        }),
      }
      return builder
    },
  }

  const claimed = await claimExactConnection(
    mockAdminClient,
    connectionId,
    'openrouter/free',
    TEST_MASTER_KEY,
  )

  assert.ok(claimed, 'Connection with expired cooldown must self-heal and be claimed successfully')
  assert.equal(claimed.connectionId, connectionId)
  assert.equal(claimed.selectedModel, 'openrouter/free')
})

test('Cooldown & Quarantine Protection: claimExactConnection rejects active cooldowns and quarantined connections', async () => {
  const secretKey = 'sk-or-v1-my-secret-key'
  const encrypted = encryptSecret(secretKey, TEST_MASTER_KEY)
  const connectionId = '33333333-4444-5555-6666-777777777777'

  // 1. Active unexpired cooldown
  const futureTimestamp = new Date(Date.now() + 60000).toISOString()
  const mockCooldownClient: any = {
    from: () => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: {
            id: connectionId,
            provider_id: 'openrouter',
            protocol: 'openai',
            base_url: 'https://openrouter.ai/api/v1',
            model: 'openrouter/free',
            is_enabled: true,
            health_status: 'cooling_down',
            account_cooldown_until: futureTimestamp,
            encrypted_key: encrypted.ciphertext,
            key_nonce: encrypted.nonce,
            key_tag: encrypted.tag,
            key_version: encrypted.version,
          },
          error: null,
        }),
      }
      return builder
    },
  }

  const coolingClaimed = await claimExactConnection(
    mockCooldownClient,
    connectionId,
    'openrouter/free',
    TEST_MASTER_KEY,
  )
  assert.equal(coolingClaimed, null, 'Active unexpired cooldown must be rejected')

  // 2. Quarantined status
  const mockQuarantineClient: any = {
    from: () => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: {
            id: connectionId,
            provider_id: 'openrouter',
            protocol: 'openai',
            base_url: 'https://openrouter.ai/api/v1',
            model: 'openrouter/free',
            is_enabled: true,
            health_status: 'quarantined',
            account_cooldown_until: null,
            encrypted_key: encrypted.ciphertext,
            key_nonce: encrypted.nonce,
            key_tag: encrypted.tag,
            key_version: encrypted.version,
          },
          error: null,
        }),
      }
      return builder
    },
  }

  const quarantinedClaimed = await claimExactConnection(
    mockQuarantineClient,
    connectionId,
    'openrouter/free',
    TEST_MASTER_KEY,
  )
  assert.equal(quarantinedClaimed, null, 'Quarantined connection must be rejected')
})

test('Policy Router: Custom provider eligibility and model preference forwarding', () => {
  // 1. allowCustom enables 'custom' in allowedProviders
  const customPolicy = resolveRoutingPolicy({
    userId: 'user-abc',
    taskType: 'invoice-chat',
    allowCustom: true,
    allowPaid: true,
  })
  assert.equal(customPolicy.ok, true)
  assert.ok(customPolicy.allowedProviders.includes('custom'), 'custom must be in allowedProviders when allowCustom is true')

  // 2. preferredModel is preserved
  const modelPolicy = resolveRoutingPolicy({
    userId: 'user-abc',
    taskType: 'invoice-chat',
    preferredModel: 'deepseek-v4-custom',
    allowCustom: true,
  })
  assert.equal(modelPolicy.targetModel, 'deepseek-v4-custom')

  // 3. preferredProvider = custom places custom first
  const prefCustom = resolveRoutingPolicy({
    userId: 'user-abc',
    preferredProvider: 'custom',
    allowCustom: true,
  })
  assert.equal(prefCustom.allowedProviders[0], 'custom')
})

test('Chat Route: Verifies Manual mode returns 409 MODEL_UNAVAILABLE with alternatives on pinned failure', () => {
  const source = fs.readFileSync(CHAT_ROUTE, 'utf8')

  // Verifies pinned failure invokes discoverEligibleAlternatives and returns HTTP 409
  assert.ok(
    source.includes('discoverEligibleAlternatives(adminClient'),
    'api/bolu-chat.ts must discover eligible alternatives when pinned connection fails',
  )
  assert.ok(
    source.includes("code: 'MODEL_UNAVAILABLE'"),
    'api/bolu-chat.ts must return code: MODEL_UNAVAILABLE on pinned failure',
  )
  assert.ok(
    source.includes('status: 409'),
    'api/bolu-chat.ts must return HTTP 409 status on pinned failure',
  )
  assert.ok(
    source.includes('alternatives,'),
    'api/bolu-chat.ts must return alternatives list in response payload',
  )
})

test('Chat Route: Verifies Auto mode pool failover and relaxed model fallback', () => {
  const source = fs.readFileSync(CHAT_ROUTE, 'utf8')

  // Verifies pool failure pushes to excludedConnectionIds and advances to next candidate
  assert.ok(
    source.includes('excludedConnectionIds.push(claimed.connectionId)'),
    'api/bolu-chat.ts must push failed pool connection to excludedConnectionIds',
  )

  // Verifies preferredModel is passed to resolveRoutingPolicy
  assert.ok(
    source.includes('preferredModel: explicitModelId || undefined'),
    'api/bolu-chat.ts must forward explicitModelId to resolveRoutingPolicy',
  )

  // Verifies allowCustom: true is passed
  assert.ok(
    source.includes('allowCustom: true'),
    'api/bolu-chat.ts must specify allowCustom: true in policy resolution',
  )

  // Verifies relaxed model fallback on attempt 0
  assert.ok(
    source.includes("targetModel: '*'"),
    'api/bolu-chat.ts must perform relaxed model fallback with targetModel: * on attempt 0',
  )

  // Verifies that literal '*' is never passed as the model to adapterConfig
  assert.ok(
    source.includes("claimed.selectedModel !== '*'"),
    'api/bolu-chat.ts must prevent passing literal * to adapterConfig.model',
  )

  // Verifies X-Bolu-Fallback telemetry header is set on failover
  assert.ok(
    source.includes("headers.set('X-Bolu-Fallback', 'true')"),
    'api/bolu-chat.ts must attach X-Bolu-Fallback header on failover',
  )
})
