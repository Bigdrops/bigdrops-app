import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeChatEndpoint } from './bolu-provider.js'

export type EncryptedSecret = {
  ciphertext: string
  nonce: string
  tag: string
  version: number
}

export type InAppProviderRecord = {
  id: string
  provider: string
  base_url: string
  model: string
  timeout_ms: number
  encrypted_key: string
  key_nonce: string
  key_tag: string
  key_version: number
  masked_key: string
  status: string
  created_at: string
  updated_at: string
  updated_by?: string | null
}

export type InAppProviderPublicStatus = {
  configured: boolean
  provider?: string
  model?: string
  baseUrl?: string
  timeoutMs?: number
  maskedKey?: string
  status?: string
  updatedAt?: string
}

export type InAppDecryptedProviderConfig = {
  provider: string
  baseUrl: string
  endpoint: string
  model: string
  apiKey: string
  timeoutMs: number
  maskedKey: string
  status: string
}

export type SaveProviderConfigInput = {
  provider?: string
  baseUrl?: string
  model?: string
  apiKey: string
  timeoutMs?: number
}

export const KEY_VERSION_SERVICE_ROLE = 1
export const KEY_VERSION_DEDICATED = 2

/**
 * Version 1 key-derivation salt.
 *
 * CRITICAL CRYPTOGRAPHIC DERIVATION CONSTANT:
 * Do NOT alter, refactor, or rename during brand renaming or re-theming.
 * All existing ciphertexts in `app_ai_provider_connections` were encrypted at rest
 * using AES-256-GCM with a master key derived via HMAC-SHA256 from this exact salt.
 * Mutating this string causes authentication tag validation to fail across all stored credentials.
 */
export const VAULT_SALT_V1 = Object.freeze('bourxe-bolu-vault-v1')
const VAULT_SALT = VAULT_SALT_V1

/**
 * Derives a 32-byte master key from explicit BOLU_ENCRYPTION_KEY (version 2).
 * Returns null if BOLU_ENCRYPTION_KEY is unset or empty.
 */
export function deriveDedicatedMasterKey(env: Record<string, string | undefined> = process.env): Buffer | null {
  const directKey = env.BOLU_ENCRYPTION_KEY?.trim().replace(/^["']|["']$/g, '').trim()
  if (!directKey) return null
  if (/^[0-9a-fA-F]{64}$/.test(directKey)) {
    return Buffer.from(directKey, 'hex')
  }
  if (/^[A-Za-z0-9+/]{43}=$/.test(directKey) || /^[A-Za-z0-9+/]{44}$/.test(directKey)) {
    const buf = Buffer.from(directKey, 'base64')
    if (buf.length === 32) return buf
  }
  return crypto.createHash('sha256').update(directKey).digest()
}

/**
 * Derives a 32-byte master key from SUPABASE_SERVICE_ROLE_KEY via HMAC-SHA256 (version 1).
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is unset or empty.
 */
export function deriveServiceRoleMasterKey(env: Record<string, string | undefined> = process.env): Buffer | null {
  const rawKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!rawKey) return null
  const serviceRoleKey = rawKey.replace(/^["']|["']$/g, '').trim()
  if (!serviceRoleKey) return null
  return crypto.createHmac('sha256', VAULT_SALT).update(serviceRoleKey).digest()
}

/**
 * Derives the active master key and corresponding key_version for new encryption operations.
 * Precedence:
 * 1. BOLU_ENCRYPTION_KEY -> Version 2 (Dedicated master key)
 * 2. SUPABASE_SERVICE_ROLE_KEY -> Version 1 (Legacy service-role HMAC derivation)
 */
export function deriveActiveEncryptionKey(env: Record<string, string | undefined> = process.env): {
  key: Buffer
  version: number
} {
  const dedicated = deriveDedicatedMasterKey(env)
  if (dedicated) {
    return { key: dedicated, version: KEY_VERSION_DEDICATED }
  }
  const serviceRole = deriveServiceRoleMasterKey(env)
  if (serviceRole) {
    return { key: serviceRole, version: KEY_VERSION_SERVICE_ROLE }
  }
  throw new Error('Server master key unavailable for Bolu vault. Set BOLU_ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY.')
}

/**
 * Backward-compatible helper returning the active 32-byte master key buffer.
 */
export function deriveMasterKey(env: Record<string, string | undefined> = process.env): Buffer {
  return deriveActiveEncryptionKey(env).key
}

/**
 * Encrypts an API secret using AES-256-GCM.
 * Generates an unpredictable 12-byte nonce per encryption and returns authentication tag.
 */
export function encryptSecret(
  plainText: string,
  masterKey: Buffer,
  keyVersion: number = KEY_VERSION_SERVICE_ROLE,
): EncryptedSecret {
  if (typeof plainText !== 'string' || !plainText.trim()) {
    throw new Error('Cannot encrypt empty secret.')
  }
  if (!Buffer.isBuffer(masterKey) || masterKey.length !== 32) {
    throw new Error('Master key must be a 32-byte Buffer.')
  }

  const nonce = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, nonce)
  const ciphertext = Buffer.concat([cipher.update(plainText.trim(), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    ciphertext: ciphertext.toString('base64'),
    nonce: nonce.toString('base64'),
    tag: tag.toString('base64'),
    version: keyVersion,
  }
}

/**
 * Decrypts an AES-256-GCM encrypted secret using a single master key.
 * Validates the 16-byte authentication tag; fails closed if ciphertext or tag was tampered with.
 */
export function decryptSecret(
  payload: { ciphertext: string; nonce: string; tag: string; version?: number },
  masterKey: Buffer,
): string {
  if (!payload || !payload.ciphertext || !payload.nonce || !payload.tag) {
    throw new Error('Invalid encrypted payload structure.')
  }
  if (!Buffer.isBuffer(masterKey) || masterKey.length !== 32) {
    throw new Error('Master key must be a 32-byte Buffer.')
  }

  const nonce = Buffer.from(payload.nonce, 'base64')
  const tag = Buffer.from(payload.tag, 'base64')
  const ciphertext = Buffer.from(payload.ciphertext, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, nonce)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}

/**
 * Resolves the exact master key for a specific key_version.
 * Enforces an explicit versioned key strategy:
 * - key_version 2 (KEY_VERSION_DEDICATED) requires BOLU_ENCRYPTION_KEY
 * - key_version 1 (KEY_VERSION_SERVICE_ROLE) or undefined/legacy requires SUPABASE_SERVICE_ROLE_KEY
 * Missing required keys throw an explicit safe error.
 * Authentication failures fail closed immediately without arbitrary key fallback.
 */
export function resolveDecryptionKey(
  keyVersion?: number,
  env: Record<string, string | undefined> = process.env,
  explicitMasterKey?: Buffer,
): Buffer {
  if (explicitMasterKey) {
    return explicitMasterKey
  }

  const normalizedVersion = keyVersion ?? KEY_VERSION_SERVICE_ROLE

  if (normalizedVersion === KEY_VERSION_DEDICATED) {
    const dedicated = deriveDedicatedMasterKey(env)
    if (!dedicated) {
      throw new Error('Dedicated encryption key unavailable. Set BOLU_ENCRYPTION_KEY to decrypt key_version 2 credentials.')
    }
    return dedicated
  }

  if (normalizedVersion === KEY_VERSION_SERVICE_ROLE) {
    const serviceRole = deriveServiceRoleMasterKey(env)
    if (!serviceRole) {
      throw new Error('Legacy encryption key unavailable. Set SUPABASE_SERVICE_ROLE_KEY to decrypt key_version 1 credentials.')
    }
    return serviceRole
  }

  throw new Error(`Unsupported credential key_version: ${keyVersion}. Supported versions are 1 (legacy service-role) and 2 (dedicated).`)
}

/**
 * Backward-compatible helper returning candidate master key array.
 */
export function resolveDecryptionKeys(
  keyVersion?: number,
  env: Record<string, string | undefined> = process.env,
  explicitMasterKey?: Buffer,
): Buffer[] {
  return [resolveDecryptionKey(keyVersion, env, explicitMasterKey)]
}

/**
 * Decrypts a vault secret strictly using the master key derived for the payload's key_version.
 * Fails closed immediately if the required key is missing or authentication tag verification fails.
 */
export function decryptVaultSecret(
  payload: { ciphertext: string; nonce: string; tag: string; version?: number },
  env: Record<string, string | undefined> = process.env,
  explicitMasterKey?: Buffer,
): string {
  const masterKey = resolveDecryptionKey(payload.version, env, explicitMasterKey)
  return decryptSecret(payload, masterKey)
}

/**
 * Masks an API key for safe display in administrative dashboards.
 * Shows prefix (e.g. 'rc-') and last 4 characters; masks everything in between.
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || typeof apiKey !== 'string') return ''
  const trimmed = apiKey.trim()
  if (trimmed.length <= 8) {
    return '••••' + trimmed.slice(-2)
  }
  if (trimmed.startsWith('rc-')) {
    const suffix = trimmed.slice(-4)
    return `rc-••••••••••••${suffix}`
  }
  const prefix = trimmed.slice(0, 3)
  const suffix = trimmed.slice(-4)
  return `${prefix}••••••••${suffix}`
}

/**
 * Loads and decrypts the application's shared Bolu provider configuration.
 * Returns null if no active in-app configuration is present.
 */
export async function loadInAppProviderConfig(
  supabaseClient: SupabaseClient,
  masterKey?: Buffer,
): Promise<InAppDecryptedProviderConfig | null> {
  const { data, error } = await supabaseClient
    .from('app_ai_provider_config')
    .select('*')
    .eq('id', 'primary')
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) return null
  const record = data as InAppProviderRecord

  try {
    const decryptedKey = decryptVaultSecret(
      {
        ciphertext: record.encrypted_key,
        nonce: record.key_nonce,
        tag: record.key_tag,
        version: record.key_version,
      },
      process.env,
      masterKey,
    )

    return {
      provider: record.provider,
      baseUrl: record.base_url,
      endpoint: normalizeChatEndpoint(record.base_url),
      model: record.model,
      apiKey: decryptedKey,
      timeoutMs: record.timeout_ms || 45000,
      maskedKey: record.masked_key,
      status: record.status,
    }
  } catch (err) {
    console.error('[bolu-secret-vault] Failed to decrypt provider config:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Queries safe, non-sensitive provider configuration status for administrative UI.
 * Never returns ciphertexts, nonces, tags, or decrypted keys.
 */
export async function getPublicProviderStatus(
  supabaseClient: SupabaseClient,
): Promise<InAppProviderPublicStatus> {
  const { data, error } = await supabaseClient
    .from('app_ai_provider_config')
    .select('id, provider, base_url, model, timeout_ms, masked_key, status, updated_at')
    .eq('id', 'primary')
    .maybeSingle()

  if (error || !data) {
    return { configured: false }
  }

  const record = data as Record<string, unknown>
  return {
    configured: record.status === 'active',
    provider: String(record.provider || 'amd'),
    model: String(record.model || 'DeepSeek-V4-Flash'),
    baseUrl: String(record.base_url || ''),
    timeoutMs: Number(record.timeout_ms) || 45000,
    maskedKey: String(record.masked_key || ''),
    status: String(record.status || 'active'),
    updatedAt: String(record.updated_at || ''),
  }
}

/**
 * Encrypts and persists in-app Bolu provider configuration.
 */
export async function saveInAppProviderConfig(
  supabaseClient: SupabaseClient,
  input: SaveProviderConfigInput,
  masterKey?: Buffer,
  userId?: string,
): Promise<InAppProviderPublicStatus> {
  const apiKey = input.apiKey?.trim()
  if (!apiKey) {
    throw new Error('API key is required.')
  }

  const activeKeyInfo = masterKey
    ? { key: masterKey, version: KEY_VERSION_SERVICE_ROLE }
    : deriveActiveEncryptionKey()
  const encrypted = encryptSecret(apiKey, activeKeyInfo.key, activeKeyInfo.version)
  const masked = maskApiKey(apiKey)

  const inferredProvider = (input.provider || (apiKey.startsWith('rc-') ? 'amd' : 'openrouter')).toLowerCase()
  const defaultBaseUrl = inferredProvider === 'amd'
    ? 'https://developer.amd.com.cn/radeon/api/v1'
    : 'https://openrouter.ai/api/v1'
  const baseUrl = input.baseUrl?.trim() || defaultBaseUrl
  const defaultModel = inferredProvider === 'amd' ? 'DeepSeek-V4-Flash' : 'openrouter/free'
  const model = input.model?.trim() || defaultModel
  const timeoutMs = input.timeoutMs && input.timeoutMs >= 5000 && input.timeoutMs <= 120000
    ? input.timeoutMs
    : 45000

  const row = {
    id: 'primary',
    provider: inferredProvider,
    base_url: baseUrl,
    model,
    timeout_ms: timeoutMs,
    encrypted_key: encrypted.ciphertext,
    key_nonce: encrypted.nonce,
    key_tag: encrypted.tag,
    key_version: encrypted.version,
    masked_key: masked,
    status: 'active',
    updated_at: new Date().toISOString(),
    ...(userId ? { updated_by: userId } : {}),
  }

  const { error } = await supabaseClient
    .from('app_ai_provider_config')
    .upsert(row, { onConflict: 'id' })

  if (error) {
    throw new Error(`Failed to persist provider config: ${error.message}`)
  }

  return {
    configured: true,
    provider: inferredProvider,
    model,
    baseUrl,
    timeoutMs,
    maskedKey: masked,
    status: 'active',
    updatedAt: row.updated_at,
  }
}

/**
 * Deletes the in-app Bolu provider configuration.
 */
export async function deleteInAppProviderConfig(supabaseClient: SupabaseClient): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_ai_provider_config')
    .delete()
    .eq('id', 'primary')

  if (error) {
    throw new Error(`Failed to delete provider config: ${error.message}`)
  }
  return true
}

/**
 * Tests the connection to an AI provider by sending a lightweight verification completion request.
 */
export async function testProviderConnection(config: {
  baseUrl: string
  model: string
  apiKey: string
  timeoutMs?: number
  provider?: string
}): Promise<{ ok: boolean; status: number; message: string }> {
  const endpoint = normalizeChatEndpoint(config.baseUrl)
  const controller = new AbortController()
  const timeoutMs = config.timeoutMs || 20000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey.trim()}`,
  }
  if (config.provider === 'openrouter' || config.baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://bouxre.com'
    headers['X-Title'] = 'BOUXRE Bolu'
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
        stream: false,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      return { ok: true, status: res.status, message: 'Provider connection successful. Model responded.' }
    }

    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: res.status, message: 'Authentication failed. Check your API key.' }
    }
    if (res.status === 429) {
      return { ok: false, status: 429, message: 'Provider rate-limited the connection. Try again shortly.' }
    }
    if (res.status === 404) {
      return { ok: false, status: 404, message: `Model "${config.model}" not found or endpoint URL is incorrect.` }
    }

    const errorText = await res.text().catch(() => '')
    const brief = errorText.slice(0, 120)
    return { ok: false, status: res.status, message: `Provider returned status ${res.status}: ${brief || 'Check configuration.'}` }
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      return { ok: false, status: 504, message: 'Connection timed out. Verify base URL and network connectivity.' }
    }
    return { ok: false, status: 502, message: err instanceof Error ? err.message : 'Connection failed.' }
  }
}

