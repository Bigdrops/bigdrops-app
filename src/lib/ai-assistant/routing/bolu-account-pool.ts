/**
 * Bolu AI Routing Subsystem — Account Pool Manager
 *
 * Server-only module managing the multi-account connection pool:
 * - Atomic connection claiming via `claim_eligible_ai_connection` RPC
 * - Decryption of credentials strictly inside trusted serverless execution
 * - Telemetry recording (request started, success, failure) via dedicated RPCs
 * - Safe, idempotent legacy credential migration from `app_ai_provider_config`
 *
 * Security: Node-only. Plaintext credentials never leave serverless memory.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptSecret, decryptVaultSecret, deriveMasterKey, encryptSecret, maskApiKey } from '../bolu-secret-vault.js'
import type { FailureCategory, FailureScope } from './bolu-error-classifier.js'

export type ClaimedConnection = {
  connectionId: string
  providerId: string
  protocol: string
  baseUrl: string | null
  defaultModel: string
  selectedModel: string
  isPaidTier: boolean
  timeoutMs: number
  apiKey: string // Decrypted plaintext, exclusively in serverless memory
}

export type SelectionMetadata = {
  connection_id: string
  provider_id: string
  protocol: string
  base_url: string | null
  default_model: string
  selected_model: string
  is_paid_tier: boolean
}

export type RecordFailureParams = {
  connectionId: string
  modelId: string
  failureCategory: FailureCategory
  failureScope: FailureScope
  httpStatus?: number | null
  cooldownSeconds?: number | null
  errorCode?: string | null
  reasonSummary: string
}

export type MigrationResult = {
  migrated: boolean
  alreadyMigrated?: boolean
  connectionId?: string
  error?: string
}

export const LEGACY_MIGRATION_CONNECTION_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Claims an eligible connection atomically from the pool via PostgreSQL RPC.
 * Fetches encrypted secret fields separately via service_role and decrypts them.
 */
export async function claimEligibleConnection(
  adminClient: SupabaseClient,
  policy: {
    allowedProviders: string[]
    targetModel: string
    allowPaid: boolean
  },
  excludedConnectionIds: string[] = [],
  masterKey?: Buffer,
): Promise<ClaimedConnection | null> {
  if (!policy.allowedProviders || policy.allowedProviders.length === 0 || !policy.targetModel) {
    return null
  }

  // 1. Call atomic selection RPC (returns routing metadata only, no secrets)
  const { data: rpcData, error: rpcError } = await adminClient.rpc('claim_eligible_ai_connection', {
    p_allowed_providers: policy.allowedProviders,
    p_target_model: policy.targetModel,
    p_allow_paid: policy.allowPaid,
    p_excluded_connection_ids: excludedConnectionIds,
  })

  if (rpcError) {
    console.error('[bolu-account-pool] claim_eligible_ai_connection error:', rpcError.message)
    return null
  }

  const selectedList = (Array.isArray(rpcData) ? rpcData : rpcData ? [rpcData] : []) as SelectionMetadata[]
  if (selectedList.length === 0 || !selectedList[0]?.connection_id) {
    return null
  }

  const meta = selectedList[0]

  // 2. Fetch encrypted secret columns directly via trusted service_role
  const { data: secretRow, error: secretError } = await adminClient
    .from('app_ai_provider_connections')
    .select('encrypted_key, key_nonce, key_tag, key_version, timeout_ms')
    .eq('id', meta.connection_id)
    .maybeSingle()

  if (secretError || !secretRow) {
    console.error('[bolu-account-pool] Failed to retrieve encrypted secret for claimed connection:', meta.connection_id)
    return null
  }

  // 3. Decrypt the secret
  try {
    const decryptedKey = decryptVaultSecret(
      {
        ciphertext: secretRow.encrypted_key,
        nonce: secretRow.key_nonce,
        tag: secretRow.key_tag,
        version: secretRow.key_version,
      },
      process.env,
      masterKey,
    )

    return {
      connectionId: meta.connection_id,
      providerId: meta.provider_id,
      protocol: meta.protocol,
      baseUrl: meta.base_url,
      defaultModel: meta.default_model,
      selectedModel: meta.selected_model,
      isPaidTier: meta.is_paid_tier,
      timeoutMs: Number(secretRow.timeout_ms) || 30000,
      apiKey: decryptedKey,
    }
  } catch (err) {
    console.error('[bolu-account-pool] Secret decryption failed for connection:', meta.connection_id, err)
    // Quarantine the damaged connection
    await recordAiFailure(adminClient, {
      connectionId: meta.connection_id,
      modelId: meta.selected_model,
      failureCategory: 'authentication',
      failureScope: 'account',
      httpStatus: 500,
      reasonSummary: 'Server failed to decrypt connection credential.',
    })
    return null
  }
}

/**
 * Claims an exact connection by ID, bypassing pool priority ranking.
 * Used when the user explicitly targets a connection and model in the chat UI.
 */
export async function claimExactConnection(
  adminClient: SupabaseClient,
  connectionId: string,
  modelId?: string | null,
  masterKey?: Buffer,
): Promise<ClaimedConnection | null> {
  if (!connectionId) return null

  const { data: row, error } = await adminClient
    .from('app_ai_provider_connections')
    .select('id, provider_id, protocol, base_url, model, timeout_ms, is_enabled, is_paid_tier, encrypted_key, key_nonce, key_tag, key_version')
    .eq('id', connectionId)
    .eq('is_enabled', true)
    .maybeSingle()

  if (error || !row) {
    console.warn('[bolu-account-pool] Exact connection not found or disabled:', connectionId)
    return null
  }

  try {
    const decryptedKey = decryptVaultSecret(
      {
        ciphertext: row.encrypted_key,
        nonce: row.key_nonce,
        tag: row.key_tag,
        version: row.key_version,
      },
      process.env,
      masterKey,
    )

    return {
      connectionId: row.id,
      providerId: row.provider_id,
      protocol: row.protocol,
      baseUrl: row.base_url,
      defaultModel: row.model,
      selectedModel: modelId?.trim() || row.model,
      isPaidTier: row.is_paid_tier,
      timeoutMs: Number(row.timeout_ms) || 30000,
      apiKey: decryptedKey,
    }
  } catch (err) {
    console.error('[bolu-account-pool] Secret decryption failed for exact connection:', connectionId, err)
    return null
  }
}

/**
 * Records that an upstream inference request has been initiated.
 */
export async function recordAiRequestStart(
  adminClient: SupabaseClient,
  connectionId: string,
  modelId: string,
): Promise<boolean> {
  const { data, error } = await adminClient.rpc('record_ai_request_started', {
    p_connection_id: connectionId,
    p_model_id: modelId,
  })

  if (error) {
    console.error('[bolu-account-pool] record_ai_request_started error:', error.message)
    return false
  }
  return Boolean(data)
}

/**
 * Records successful completion of an upstream inference request.
 */
export async function recordAiSuccess(
  adminClient: SupabaseClient,
  connectionId: string,
  modelId: string,
  tokens?: number | null,
): Promise<boolean> {
  const { data, error } = await adminClient.rpc('record_ai_connection_success', {
    p_connection_id: connectionId,
    p_model_id: modelId,
    p_tokens: tokens && tokens > 0 ? tokens : 0,
  })

  if (error) {
    console.error('[bolu-account-pool] record_ai_connection_success error:', error.message)
    return false
  }
  return Boolean(data)
}

/**
 * Records an upstream failure, updating health status, failure count, and cooldowns.
 */
export async function recordAiFailure(
  adminClient: SupabaseClient,
  params: RecordFailureParams,
): Promise<boolean> {
  const { data, error } = await adminClient.rpc('record_ai_connection_failure', {
    p_connection_id: params.connectionId,
    p_model_id: params.modelId,
    p_failure_category: params.failureCategory,
    p_failure_scope: params.failureScope,
    p_http_status: params.httpStatus ?? null,
    p_cooldown_seconds: params.cooldownSeconds ?? null,
    p_error_code: params.errorCode ?? null,
    p_reason_summary: params.reasonSummary,
  })

  if (error) {
    console.error('[bolu-account-pool] record_ai_connection_failure error:', error.message)
    return false
  }
  return Boolean(data)
}

/**
 * Migrates a legacy singleton credential from `app_ai_provider_config` into
 * `app_ai_provider_connections`.
 *
 * Safeguards:
 * - Idempotent: checks `migrated_to_connections` flag and deterministic connection ID.
 * - Non-destructive: preserves original row and ciphertext intact.
 * - Verifies decryption of the newly inserted connection before flagging migration complete.
 */
export async function migrateLegacySingletonCredential(
  adminClient: SupabaseClient,
  masterKey?: Buffer,
): Promise<MigrationResult> {
  // 1. Check legacy row
  const { data: legacyRow, error: fetchError } = await adminClient
    .from('app_ai_provider_config')
    .select('*')
    .eq('id', 'primary')
    .maybeSingle()

  if (fetchError || !legacyRow) {
    return { migrated: false, error: fetchError?.message || 'No legacy configuration row found.' }
  }

  if (legacyRow.migrated_to_connections === true) {
    return { migrated: false, alreadyMigrated: true }
  }

  if (!legacyRow.encrypted_key || legacyRow.status !== 'active') {
    return { migrated: false, error: 'Legacy row does not contain an active encrypted credential.' }
  }

  const key = masterKey || deriveMasterKey()

  // 2. Decrypt legacy credential to ensure it is valid
  let plainKey: string
  try {
    plainKey = decryptSecret(
      {
        ciphertext: legacyRow.encrypted_key,
        nonce: legacyRow.key_nonce,
        tag: legacyRow.key_tag,
        version: legacyRow.key_version,
      },
      key,
    )
  } catch (err) {
    return {
      migrated: false,
      error: `Failed to decrypt legacy credential: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  const { data: existingPrimary } = await adminClient
    .from('app_ai_provider_connections')
    .select('id')
    .eq('migrated_from', 'primary')
    .limit(1)
    .maybeSingle()

  if (existingPrimary?.id) {
    await adminClient
      .from('app_ai_provider_config')
      .update({ migrated_to_connections: true, updated_at: new Date().toISOString() })
      .eq('id', 'primary')
    return { migrated: false, alreadyMigrated: true, connectionId: existingPrimary.id as string }
  }

  // 3. Encrypt fresh envelope for the new connection
  const encrypted = encryptSecret(plainKey, key)
  const masked = maskApiKey(plainKey)

  const connectionRow = {
    id: LEGACY_MIGRATION_CONNECTION_ID,
    provider_id: legacyRow.provider || 'amd',
    name: 'Migrated Primary Connection',
    protocol: legacyRow.provider === 'anthropic' ? 'anthropic' : 'openai',
    auth_scheme: legacyRow.provider === 'anthropic' ? 'x-api-key' : 'bearer',
    base_url: legacyRow.base_url || 'https://developer.amd.com.cn/radeon/api/v1',
    model: legacyRow.model || 'DeepSeek-V4-Flash',
    allowed_models: [legacyRow.model || 'DeepSeek-V4-Flash'],
    timeout_ms: typeof legacyRow.timeout_ms === 'number' ? legacyRow.timeout_ms : 45000,
    is_paid_tier: true,
    encrypted_key: encrypted.ciphertext,
    key_nonce: encrypted.nonce,
    key_tag: encrypted.tag,
    key_version: encrypted.version,
    masked_key: masked,
    is_enabled: true,
    in_pool: false,
    health_status: 'unknown',
    priority: 100,
    migrated_from: 'primary',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // 4. Insert or update the migrated connection
  const { error: insertError } = await adminClient
    .from('app_ai_provider_connections')
    .upsert(connectionRow, { onConflict: 'id' })

  if (insertError) {
    return {
      migrated: false,
      error: `Failed to insert migrated connection: ${insertError.message}`,
    }
  }

  // 5. Verification Gate: Read back the inserted record and decrypt
  const { data: readBack, error: readBackError } = await adminClient
    .from('app_ai_provider_connections')
    .select('encrypted_key, key_nonce, key_tag, key_version')
    .eq('id', LEGACY_MIGRATION_CONNECTION_ID)
    .maybeSingle()

  if (readBackError || !readBack) {
    return {
      migrated: false,
      error: 'Migration verification failed: Could not read back destination connection.',
    }
  }

  try {
    const verifiedKey = decryptSecret(
      {
        ciphertext: readBack.encrypted_key,
        nonce: readBack.key_nonce,
        tag: readBack.key_tag,
        version: readBack.key_version,
      },
      key,
    )
    if (verifiedKey !== plainKey) {
      return {
        migrated: false,
        error: 'Migration verification failed: Decrypted secret does not match original.',
      }
    }
  } catch (err) {
    return {
      migrated: false,
      error: `Migration verification failed during destination decryption: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // 6. Only after verification succeeds, mark `migrated_to_connections = true`
  const { error: markError } = await adminClient
    .from('app_ai_provider_config')
    .update({
      migrated_to_connections: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'primary')

  if (markError) {
    return {
      migrated: true,
      connectionId: LEGACY_MIGRATION_CONNECTION_ID,
      error: `Destination verified, but failed to set flag on legacy table: ${markError.message}`,
    }
  }

  return {
    migrated: true,
    connectionId: LEGACY_MIGRATION_CONNECTION_ID,
  }
}
