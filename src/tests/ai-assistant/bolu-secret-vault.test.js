import { describe, expect, it } from 'bun:test'
import crypto from 'node:crypto'
import {
  decryptSecret,
  deleteInAppProviderConfig,
  deriveMasterKey,
  encryptSecret,
  getPublicProviderStatus,
  loadInAppProviderConfig,
  maskApiKey,
  saveInAppProviderConfig,
  testProviderConnection,
} from '../../lib/ai-assistant/bolu-secret-vault'
import { safeParseApiResponse } from '../../lib/ai-assistant/safe-api-response'
import { getBoluProviderConfig } from '../../lib/ai-assistant/bolu-provider'

describe('Bolu Secret Vault & Encryption Suite', () => {
  const sampleAmdKey = 'rc-prod-enterprise-key-99887766'
  const sampleMasterKey = crypto.randomBytes(32)

  it('derives a 32-byte master key from BOLU_ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY', () => {
    // 1. From 64-character hex key
    const hexKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    const derivedHex = deriveMasterKey({ BOLU_ENCRYPTION_KEY: hexKey })
    expect(derivedHex.length).toBe(32)
    expect(derivedHex.toString('hex')).toBe(hexKey)

    // 2. From arbitrary passphrase string (hashed with SHA-256)
    const passKey = 'super-secret-bourxe-passphrase-2026'
    const derivedPass = deriveMasterKey({ BOLU_ENCRYPTION_KEY: passKey })
    expect(derivedPass.length).toBe(32)
    const expectedHash = crypto.createHash('sha256').update(passKey).digest()
    expect(derivedPass.equals(expectedHash)).toBe(true)

    // 3. Fallback to SUPABASE_SERVICE_ROLE_KEY via HMAC
    const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy-service-role'
    const derivedService = deriveMasterKey({ SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey })
    expect(derivedService.length).toBe(32)

    // 4. Fails closed when neither is set
    expect(() => deriveMasterKey({})).toThrow('Server master key unavailable')
  })

  it('encrypts and decrypts secrets using AES-256-GCM', () => {
    const encrypted = encryptSecret(sampleAmdKey, sampleMasterKey)

    expect(encrypted.version).toBe(1)
    expect(encrypted.ciphertext).toBeTypeOf('string')
    expect(encrypted.nonce).toBeTypeOf('string')
    expect(encrypted.tag).toBeTypeOf('string')

    // Nonce must be 12 bytes (base64 length 16)
    expect(Buffer.from(encrypted.nonce, 'base64').length).toBe(12)
    // Tag must be 16 bytes (base64 length 24)
    expect(Buffer.from(encrypted.tag, 'base64').length).toBe(16)

    // Decrypts accurately
    const decrypted = decryptSecret(encrypted, sampleMasterKey)
    expect(decrypted).toBe(sampleAmdKey)
  })

  it('fails closed when ciphertext or authentication tag is tampered with', () => {
    const encrypted = encryptSecret(sampleAmdKey, sampleMasterKey)

    // Tampered ciphertext
    const badCiphertext = Buffer.from(encrypted.ciphertext, 'base64')
    badCiphertext[0] = badCiphertext[0] ^ 0xff
    const tamperedPayload = {
      ...encrypted,
      ciphertext: badCiphertext.toString('base64'),
    }

    expect(() => decryptSecret(tamperedPayload, sampleMasterKey)).toThrow()

    // Tampered tag
    const badTag = Buffer.from(encrypted.tag, 'base64')
    badTag[0] = badTag[0] ^ 0xff
    const badTagPayload = {
      ...encrypted,
      tag: badTag.toString('base64'),
    }

    expect(() => decryptSecret(badTagPayload, sampleMasterKey)).toThrow()

    // Wrong master key
    const differentKey = crypto.randomBytes(32)
    expect(() => decryptSecret(encrypted, differentKey)).toThrow()
  })

  it('safely masks API keys for administrative UI display', () => {
    expect(maskApiKey(sampleAmdKey)).toBe('rc-••••••••••••7766')
    expect(maskApiKey('sk-dummy-key-redacted')).toBe('sk-••••••••cted')
    expect(maskApiKey('short123')).toBe('••••23')
    expect(maskApiKey('')).toBe('')
  })

  it('persists and loads in-app encrypted credentials via Supabase mock client', async () => {
    let storedRow = null

    const mockSupabase = {
      from: (table) => {
        expect(table).toBe('app_ai_provider_config')
        return {
          select: () => ({
            eq: (_col1, _val1) => ({
              eq: (_col2, _val2) => ({
                maybeSingle: async () => ({ data: storedRow, error: null }),
              }),
              maybeSingle: async () => ({ data: storedRow, error: null }),
            }),
          }),
          upsert: async (row) => {
            storedRow = { ...row }
            return { data: storedRow, error: null }
          },
          delete: () => ({
            eq: async (col, val) => {
              if (col === 'id' && val === 'primary') {
                storedRow = null
              }
              return { error: null }
            },
          }),
        }
      },
    }

    // 1. Initial load returns null
    const initial = await loadInAppProviderConfig(mockSupabase, sampleMasterKey)
    expect(initial).toBeNull()

    // 2. Save config
    const saved = await saveInAppProviderConfig(
      mockSupabase,
      {
        provider: 'amd',
        baseUrl: 'https://api.tokenfactory.amd.com/v1',
        model: 'DeepSeek-V4-Flash',
        apiKey: sampleAmdKey,
      },
      sampleMasterKey,
      'admin-user-uuid',
    )

    expect(saved.configured).toBe(true)
    expect(saved.provider).toBe('amd')
    expect(saved.model).toBe('DeepSeek-V4-Flash')
    expect(saved.maskedKey).toBe('rc-••••••••••••7766')

    // 3. Stored row in DB contains ONLY ciphertext, nonce, tag, and masked key
    expect(storedRow.encrypted_key).not.toBe(sampleAmdKey)
    expect(storedRow.key_nonce).toBeTypeOf('string')
    expect(storedRow.key_tag).toBeTypeOf('string')
    expect(storedRow.masked_key).toBe('rc-••••••••••••7766')

    // 4. Public status never exposes secrets
    const publicStatus = await getPublicProviderStatus(mockSupabase)
    expect(publicStatus.configured).toBe(true)
    expect(publicStatus.maskedKey).toBe('rc-••••••••••••7766')
    expect(publicStatus).not.toHaveProperty('encrypted_key')
    expect(publicStatus).not.toHaveProperty('key_nonce')
    expect(publicStatus).not.toHaveProperty('apiKey')

    // 5. Load and decrypt in memory on server
    const loaded = await loadInAppProviderConfig(mockSupabase, sampleMasterKey)
    expect(loaded).not.toBeNull()
    expect(loaded?.apiKey).toBe(sampleAmdKey)
    expect(loaded?.endpoint).toBe('https://api.tokenfactory.amd.com/v1/chat/completions')

    // 6. Delete config
    const deleted = await deleteInAppProviderConfig(mockSupabase)
    expect(deleted).toBe(true)
    const afterDelete = await loadInAppProviderConfig(mockSupabase, sampleMasterKey)
    expect(afterDelete).toBeNull()
  })

  it('enforces precedence hierarchy: In-App Database > Environment Variables > Mock Mode', async () => {
    const mockInAppConfig = {
      provider: 'amd',
      baseUrl: 'https://developer.amd.com.cn/radeon/api/v1',
      endpoint: 'https://developer.amd.com.cn/radeon/api/v1/chat/completions',
      model: 'DeepSeek-V4-Flash',
      apiKey: 'rc-in-app-database-key',
      timeoutMs: 45000,
      maskedKey: 'rc-••••••••••••-key',
      status: 'active',
    }

    const envWithKey = {
      BOLU_PROVIDER_API_KEY: 'sk-env-fallback-key',
      BOLU_PROVIDER_MODEL: 'openrouter/fallback-model',
    }

    const envWithoutKey = {
      BOLU_PROVIDER_MODE: 'mock',
    }

    // Case 1: In-app database is configured -> wins over environment variable
    const resolvedFromDb = mockInAppConfig
      ? {
          provider: mockInAppConfig.provider,
          baseUrl: mockInAppConfig.baseUrl,
          endpoint: mockInAppConfig.endpoint,
          model: mockInAppConfig.model,
          apiKey: mockInAppConfig.apiKey,
          timeoutMs: mockInAppConfig.timeoutMs,
          mode: 'live',
          isConfigured: true,
        }
      : getBoluProviderConfig(envWithKey)

    expect(resolvedFromDb.apiKey).toBe('rc-in-app-database-key')
    expect(resolvedFromDb.model).toBe('DeepSeek-V4-Flash')

    // Case 2: In-app database is null -> falls back to environment variables
    const inAppNull = null
    const resolvedFromEnv = inAppNull
      ? null
      : getBoluProviderConfig(envWithKey)

    expect(resolvedFromEnv.apiKey).toBe('sk-env-fallback-key')
    expect(resolvedFromEnv.model).toBe('openrouter/fallback-model')

    // Case 3: In-app null and no env key -> falls back to mock mode
    const resolvedMock = inAppNull
      ? null
      : getBoluProviderConfig(envWithoutKey)

    expect(resolvedMock.mode).toBe('mock')
    expect(resolvedMock.apiKey).toBeNull()
  })

  it('tests provider connection and handles responses gracefully', async () => {
    const originalFetch = globalThis.fetch

    // Mock successful 200 response
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'pong' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const successRes = await testProviderConnection({
      baseUrl: 'https://api.tokenfactory.amd.com/v1',
      model: 'DeepSeek-V4-Flash',
      apiKey: sampleAmdKey,
    })
    expect(successRes.ok).toBe(true)
    expect(successRes.status).toBe(200)

    // Mock 401 unauthorized response
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'Invalid API Key' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })

    const authRes = await testProviderConnection({
      baseUrl: 'https://api.tokenfactory.amd.com/v1',
      model: 'DeepSeek-V4-Flash',
      apiKey: 'rc-bad-key',
    })
    expect(authRes.ok).toBe(false)
    expect(authRes.status).toBe(401)
    expect(authRes.message).toContain('Authentication failed')

    // Restore fetch
    globalThis.fetch = originalFetch
  })

  describe('Safe API Response Parser & Error Resilience', () => {
    it('handles 0-byte empty responses without throwing "Unexpected end of JSON input"', async () => {
      // Simulates the exact empty 404 response Vite was returning before middleware
      const empty404 = new Response('', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      })

      const parsed = await safeParseApiResponse(empty404, 'Provider test')
      expect(parsed.ok).toBe(false)
      expect(parsed.status).toBe(404)
      expect(parsed.data).toBeNull()
      expect(parsed.errorMessage).toContain('was not found (HTTP 404)')
      expect(parsed.errorMessage).toContain('Vite dev API middleware')
    })

    it('handles empty 204 or 200 responses gracefully', async () => {
      const empty204 = new Response('', { status: 204 })
      const parsed = await safeParseApiResponse(empty204, 'Operation')
      expect(parsed.ok).toBe(true)
      expect(parsed.status).toBe(204)
      expect(parsed.errorMessage).toBeNull()
    })

    it('handles non-JSON HTML error responses (502/504) without throwing syntax errors', async () => {
      const htmlBody = '<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head><body><p>Cloudflare Gateway Error</p></body></html>'
      const html502 = new Response(htmlBody, {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      })

      const parsed = await safeParseApiResponse(html502, 'Connection test')
      expect(parsed.ok).toBe(false)
      expect(parsed.status).toBe(502)
      expect(parsed.data).toBeNull()
      expect(parsed.errorMessage).toContain('non-JSON response (HTTP 502)')
      expect(parsed.errorMessage).toContain('502 Bad Gateway Cloudflare Gateway Error')
      // HTML angle brackets should be stripped
      expect(parsed.errorMessage).not.toContain('<p>')
    })

    it('parses valid JSON successfully', async () => {
      const jsonRes = new Response(JSON.stringify({ ok: true, message: 'All systems operational' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      const parsed = await safeParseApiResponse(jsonRes, 'Check')
      expect(parsed.ok).toBe(true)
      expect(parsed.status).toBe(200)
      expect(parsed.data?.ok).toBe(true)
      expect(parsed.data?.message).toBe('All systems operational')
      expect(parsed.errorMessage).toBeNull()
    })

    it('extracts error from JSON error bodies', async () => {
      const errRes = new Response(JSON.stringify({ error: 'Administrator authorization required.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })

      const parsed = await safeParseApiResponse(errRes, 'Save credential')
      expect(parsed.ok).toBe(false)
      expect(parsed.status).toBe(403)
      expect(parsed.errorMessage).toBe('Administrator authorization required.')
    })

    it('extracts message when ok: false in JSON payload', async () => {
      const errRes = new Response(JSON.stringify({ ok: false, message: 'Provider rate limited the connection.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })

      const parsed = await safeParseApiResponse(errRes, 'Test connection')
      expect(parsed.ok).toBe(false)
      expect(parsed.status).toBe(400)
      expect(parsed.errorMessage).toBe('Provider rate limited the connection.')
    })
  })
})
