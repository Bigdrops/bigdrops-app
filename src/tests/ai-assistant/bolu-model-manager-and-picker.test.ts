import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

import { claimExactConnection } from '@/lib/ai-assistant/routing/bolu-account-pool'
import { encryptSecret } from '@/lib/ai-assistant/bolu-secret-vault'
import { isFreeModel } from '@/lib/ai-assistant/openrouter-pricing'

const TEST_MASTER_KEY = crypto.createHash('sha256').update('test-master-key-bolu-picker-2026').digest()
const MIGRATION = path.resolve('supabase/migrations/20261115160000_bolu_connection_metadata.sql')
const CHAT_ROUTE = path.resolve('api/bolu-chat.ts')
const MODEL_PILL = path.resolve('src/components/ai-assistant/chat/assistant-chat-model-pill.tsx')
const MODELS_MANAGER = path.resolve('src/pages/settings/bolu-provider/ModelsManagerSection.tsx')

// ============================================================
// 1. DATABASE MIGRATION INTEGRITY (METADATA & ENABLED MODELS)
// ============================================================

test('Migration: metadata column exists and backfills from allowed_models', () => {
  const sql = fs.readFileSync(MIGRATION, 'utf8')
  assert.ok(
    sql.includes('ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT \'{}\'::jsonb;'),
    'The migration must add metadata jsonb column with default empty json object',
  )
  assert.ok(
    sql.includes('enabledModels'),
    'The migration must backfill metadata.enabledModels from existing allowed_models',
  )
  assert.ok(
    sql.includes('idx_ai_provider_connections_metadata'),
    'The migration must create a GIN index on metadata for fast JSONB querying',
  )
})

// ============================================================
// 2. SERVER-SIDE ROUTING: EXACT CONNECTION CLAIM
// ============================================================

test('Server Routing: claimExactConnection successfully claims exact connection and requested model', async () => {
  const secretKey = 'sk-or-v1-my-secret-openrouter-key'
  const encrypted = encryptSecret(secretKey, TEST_MASTER_KEY)
  const connectionId = '11111111-2222-3333-4444-555555555555'

  const mockAdminClient: any = {
    from: (table: string) => {
      assert.equal(table, 'app_ai_provider_connections')
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: {
            id: connectionId,
            name: 'OpenRouter Free Tier',
            provider_id: 'openrouter',
            protocol: 'openai',
            base_url: 'https://openrouter.ai/api/v1',
            model: 'openrouter/free',
            allowed_models: ['openrouter/free', 'deepseek/deepseek-r1:free'],
            metadata: { enabledModels: ['openrouter/free', 'deepseek/deepseek-r1:free'] },
            is_enabled: true,
            health_status: 'healthy',
            is_paid_tier: false,
            timeout_ms: 45000,
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
    'deepseek/deepseek-r1:free',
    TEST_MASTER_KEY,
  )

  assert.ok(claimed, 'Exact connection claim must succeed')
  assert.equal(claimed.connectionId, connectionId)
  assert.equal(claimed.providerId, 'openrouter')
  assert.equal(claimed.selectedModel, 'deepseek/deepseek-r1:free', 'Selected model must match requested model')
  assert.equal(claimed.apiKey, secretKey, 'Decrypted key must match original secret')
  assert.equal(claimed.timeoutMs, 45000)
})

test('Server Routing: claimExactConnection rejects disabled or missing connections', async () => {
  const mockAdminClient: any = {
    from: () => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: null,
          error: null,
        }),
      }
      return builder
    },
  }

  const claimed = await claimExactConnection(
    mockAdminClient,
    'disabled-conn',
    'any-model',
    TEST_MASTER_KEY,
  )

  assert.equal(claimed, null, 'Disabled or missing connection must never be claimed')
})

test('Chat route: honors explicit connectionId and modelId payload', () => {
  const source = fs.readFileSync(CHAT_ROUTE, 'utf8')
  assert.ok(
    source.includes('payload.connectionId') && source.includes('payload.modelId'),
    'api/bolu-chat.ts must inspect payload.connectionId and payload.modelId',
  )
  assert.ok(
    source.includes('claimExactConnection('),
    'api/bolu-chat.ts must call claimExactConnection when connectionId is provided',
  )
})

// ============================================================
// 3. OPENROUTER PRICING & FREE DETECTION
// ============================================================

test('Free Model Detection: isFreeModel correctly identifies free models and rate-limited tags', () => {
  assert.equal(isFreeModel('openrouter/free'), true)
  assert.equal(isFreeModel('meta-llama/llama-3.2-3b-instruct:free'), true)
  assert.equal(isFreeModel('deepseek/deepseek-r1:free'), true)
  assert.equal(isFreeModel('nvidia/nemotron-3.5-lightning-free'), true)

  // Paid models with non-zero pricing
  assert.equal(isFreeModel('anthropic/claude-3.5-sonnet'), false)
  assert.equal(
    isFreeModel('custom/paid-model', {
      pricing: { prompt: '0.000003', completion: '0.000015' },
    }),
    false,
  )

  // Explicit $0 pricing in metadata
  assert.equal(
    isFreeModel('vendor/zero-price-model', {
      pricing: { prompt: '0', completion: '0' },
    }),
    true,
  )
})

// ============================================================
// 4. OPENCODE-STYLE GROUPED MODEL PICKER (CHAT UI)
// ============================================================

test('Model Picker: assistant-chat-model-pill implements Image 6 OpenCode specification', () => {
  const source = fs.readFileSync(MODEL_PILL, 'utf8')

  // Search input and quick action icons (+ and tune/settings)
  assert.ok(source.includes('Search models'), 'Must render Search models input placeholder')
  assert.ok(source.includes('SlidersHorizontal'), 'Must render SlidersHorizontal settings icon')
  assert.ok(source.includes('Plus'), 'Must render Plus add connection icon')

  // Gold / Amber group headers matching Image 6
  assert.ok(source.includes('text-amber-500'), 'Must render gold/amber group header')

  // Free badges and Default > indicator
  assert.ok(source.includes('Free'), 'Must render Free badge')
  assert.ok(source.includes('Default >'), 'Must render Default > indicator')

  // Direct selection callback with connectionId and modelId
  assert.ok(source.includes('onSelectModel'), 'Must support onSelectModel callback')
})

// ============================================================
// 5. SETTINGS MODEL MANAGER ACCORDION (IMAGE 5)
// ============================================================

test('Settings Model Manager: ModelsManagerSection implements Image 5 specification', () => {
  const source = fs.readFileSync(MODELS_MANAGER, 'utf8')

  // Title and subtitle matching Image 5
  assert.ok(source.includes('Models'), 'Must have Models heading')
  assert.ok(
    source.includes('Choose which models appear in model picker'),
    'Must have Image 5 subtitle',
  )

  // Search models input
  assert.ok(source.includes('Search models'), 'Must have Search models input')

  // Switch toggles per model row
  assert.ok(source.includes('<Switch'), 'Must render switch toggle per model row')

  // Auto-enable free button for OpenRouter
  assert.ok(source.includes('Auto-enable Free'), 'Must support Auto-enable Free button')
})
