/**
 * Multi-connection provider vault and runtime routing (server-only).
 *
 * Reuses the verified AES-256-GCM envelope and key derivation from
 * bolu-secret-vault. Public shapes never include ciphertext, nonces, tags or
 * plaintext credentials. The legacy singleton is left intact for compatibility.
 *
 * Node-only. Never import from browser code.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  KEY_VERSION_DEDICATED,
  KEY_VERSION_SERVICE_ROLE,
  decryptSecret,
  decryptVaultSecret,
  deriveActiveEncryptionKey,
  deriveDedicatedMasterKey,
  deriveMasterKey,
  encryptSecret,
  maskApiKey,
} from './bolu-secret-vault.js'
import type { AdapterConfig, DiscoveredModel, ProviderDiagnostics } from './provider-adapters.js'
import type { ProviderAuthScheme, ProviderProtocol } from './provider-catalog.js'

export type ConnectionRecord = {
  id: string; provider_id: string; name: string; protocol: ProviderProtocol; auth_scheme: ProviderAuthScheme
  base_url: string; model: string; allowed_models?: string[]; metadata?: { enabledModels?: string[]; [key: string]: unknown }; timeout_ms: number
  encrypted_key: string; key_nonce: string; key_tag: string; key_version: number; masked_key: string
  is_enabled: boolean; in_pool?: boolean; priority?: number; is_paid_tier?: boolean
  health_status?: 'healthy' | 'cooling_down' | 'exhausted' | 'quarantined' | 'unknown'
  account_cooldown_until?: string | null; model_cooldowns?: Record<string, string>
  consecutive_failures?: number; last_error_code?: string | null; last_error_message?: string | null
  last_success_at?: string | null; last_failure_at?: string | null; last_selected_at?: string | null
  total_selections?: number; total_requests_started?: number; total_successful_requests?: number; total_tokens?: number
  known_balance_amount?: number | null; known_balance_currency?: string; known_balance_usd?: number | null
  balance_source?: 'api' | 'unsupported'; balance_updated_at?: string | null
  verification_status: 'unverified' | 'verified' | 'failed'; last_verified_at: string | null
  last_test_status: number | null; last_test_message: string | null
  discovered_models: DiscoveredModel[]; models_fetched_at: string | null; migrated_from: string | null
  created_at: string; updated_at: string; created_by: string | null; updated_by: string | null
}

export type PublicConnection = {
  id: string; providerId: string; name: string; protocol: ProviderProtocol; authScheme: ProviderAuthScheme
  baseUrl: string; model: string; allowedModels: string[]; metadata?: { enabledModels?: string[]; [key: string]: unknown }; timeoutMs: number; maskedKey: string
  isEnabled: boolean; inPool: boolean; priority: number; isPaidTier: boolean
  healthStatus: 'healthy' | 'cooling_down' | 'exhausted' | 'quarantined' | 'unknown'
  accountCooldownUntil: string | null; modelCooldowns: Record<string, string>; consecutiveFailures: number
  lastErrorCode: string | null; lastErrorMessage: string | null; lastSuccessAt: string | null; lastFailureAt: string | null; lastSelectedAt: string | null
  totalSelections: number; totalRequestsStarted: number; totalSuccessfulRequests: number; totalTokens: number
  knownBalanceAmount: number | null; knownBalanceCurrency: string; knownBalanceUsd: number | null
  balanceSource: 'api' | 'unsupported'; balanceUpdatedAt: string | null
  verificationStatus: 'unverified' | 'verified' | 'failed'; lastVerifiedAt: string | null
  lastTestStatus: number | null; lastTestMessage: string | null
  discoveredModels: DiscoveredModel[]; modelsFetchedAt: string | null; createdAt: string; updatedAt: string
}

export type RoutingState = {
  primaryConnectionId: string | null
  fallbackEnabled: boolean
  fallbackConnectionIds: string[]
  routingEnabled: boolean
}

export type CreateConnectionInput = {
  providerId: string; name: string; protocol: ProviderProtocol; authScheme: ProviderAuthScheme
  baseUrl: string; apiKey: string; model: string; allowedModels?: string[]
  priority?: number; inPool?: boolean; isPaidTier?: boolean; timeoutMs: number
}

export type UpdateConnectionInput = {
  name?: string; protocol?: ProviderProtocol; authScheme?: ProviderAuthScheme
  baseUrl?: string; model?: string; allowedModels?: string[]
  metadata?: { enabledModels?: string[]; [key: string]: unknown }
  priority?: number; inPool?: boolean; isPaidTier?: boolean; timeoutMs?: number
  isEnabled?: boolean; apiKey?: string
}

const CONNECTION_COLUMNS =
  'id, provider_id, name, protocol, auth_scheme, base_url, model, allowed_models, metadata, timeout_ms, encrypted_key, key_nonce, key_tag, key_version, masked_key, is_enabled, in_pool, priority, is_paid_tier, health_status, account_cooldown_until, model_cooldowns, consecutive_failures, last_error_code, last_error_message, last_success_at, last_failure_at, last_selected_at, total_selections, total_requests_started, total_successful_requests, total_tokens, known_balance_amount, known_balance_currency, known_balance_usd, balance_source, balance_updated_at, verification_status, last_verified_at, last_test_status, last_test_message, discovered_models, models_fetched_at, migrated_from, created_at, updated_at, created_by, updated_by'

const PUBLIC_COLUMNS =
  'id, provider_id, name, protocol, auth_scheme, base_url, model, allowed_models, metadata, timeout_ms, masked_key, is_enabled, in_pool, priority, is_paid_tier, health_status, account_cooldown_until, model_cooldowns, consecutive_failures, last_error_code, last_error_message, last_success_at, last_failure_at, last_selected_at, total_selections, total_requests_started, total_successful_requests, total_tokens, known_balance_amount, known_balance_currency, known_balance_usd, balance_source, balance_updated_at, verification_status, last_verified_at, last_test_status, last_test_message, discovered_models, models_fetched_at, created_at, updated_at'

export function toPublicConnection(r: ConnectionRecord): PublicConnection {
  return {
    id: r.id, providerId: r.provider_id, name: r.name, protocol: r.protocol, authScheme: r.auth_scheme,
    baseUrl: r.base_url, model: r.model,
    allowedModels: Array.isArray(r.allowed_models) ? r.allowed_models : r.model ? [r.model] : [],
    metadata: (r.metadata && typeof r.metadata === 'object') ? r.metadata : { enabledModels: r.allowed_models ?? [] },
    timeoutMs: r.timeout_ms, maskedKey: r.masked_key, isEnabled: Boolean(r.is_enabled),
    inPool: r.in_pool !== undefined ? Boolean(r.in_pool) : true,
    priority: typeof r.priority === 'number' ? r.priority : 100, isPaidTier: Boolean(r.is_paid_tier),
    healthStatus: r.health_status ?? 'unknown', accountCooldownUntil: r.account_cooldown_until ?? null,
    modelCooldowns: (r.model_cooldowns && typeof r.model_cooldowns === 'object') ? r.model_cooldowns : {},
    consecutiveFailures: typeof r.consecutive_failures === 'number' ? r.consecutive_failures : 0,
    lastErrorCode: r.last_error_code ?? null, lastErrorMessage: r.last_error_message ?? null,
    lastSuccessAt: r.last_success_at ?? null, lastFailureAt: r.last_failure_at ?? null,
    lastSelectedAt: r.last_selected_at ?? null,
    totalSelections: Number(r.total_selections ?? 0),
    totalRequestsStarted: Number(r.total_requests_started ?? 0),
    totalSuccessfulRequests: Number(r.total_successful_requests ?? 0),
    totalTokens: Number(r.total_tokens ?? 0),
    knownBalanceAmount: typeof r.known_balance_amount === 'number' ? r.known_balance_amount : null,
    knownBalanceCurrency: r.known_balance_currency || 'USD',
    knownBalanceUsd: typeof r.known_balance_usd === 'number' ? r.known_balance_usd : null,
    balanceSource: r.balance_source === 'api' ? 'api' : 'unsupported',
    balanceUpdatedAt: r.balance_updated_at ?? null, verificationStatus: r.verification_status,
    lastVerifiedAt: r.last_verified_at, lastTestStatus: r.last_test_status,
    lastTestMessage: r.last_test_message,
    discoveredModels: Array.isArray(r.discovered_models) ? r.discovered_models : [],
    modelsFetchedAt: r.models_fetched_at, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

export async function listConnections(client: SupabaseClient): Promise<PublicConnection[]> {
  const { data, error } = await client
    .from('app_ai_provider_connections')
    .select(PUBLIC_COLUMNS)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Failed to list connections: ${error.message}`)
  return ((data ?? []) as ConnectionRecord[]).map(toPublicConnection)
}

export async function getRouting(client: SupabaseClient): Promise<RoutingState> {
  const { data } = await client
    .from('app_ai_provider_routing')
    .select('primary_connection_id, fallback_enabled, fallback_connection_ids, routing_enabled')
    .eq('id', 'default')
    .maybeSingle()
  if (!data) {
    return { primaryConnectionId: null, fallbackEnabled: false, fallbackConnectionIds: [], routingEnabled: true }
  }
  const record = data as Record<string, unknown>
  return {
    primaryConnectionId: (record.primary_connection_id as string) ?? null,
    fallbackEnabled: Boolean(record.fallback_enabled),
    fallbackConnectionIds: Array.isArray(record.fallback_connection_ids)
      ? (record.fallback_connection_ids as string[])
      : [],
    routingEnabled: record.routing_enabled !== undefined ? Boolean(record.routing_enabled) : true,
  }
}

async function loadRecord(client: SupabaseClient, connectionId: string): Promise<ConnectionRecord | null> {
  const { data, error } = await client
    .from('app_ai_provider_connections')
    .select(CONNECTION_COLUMNS)
    .eq('id', connectionId)
    .maybeSingle()
  if (error || !data) return null
  return data as ConnectionRecord
}

export async function createConnection(
  client: SupabaseClient,
  input: CreateConnectionInput,
  userId: string,
  masterKey?: Buffer,
): Promise<PublicConnection> {
  const apiKey = input.apiKey.trim()
  if (!apiKey) throw new Error('API key is required.')
  const activeKeyInfo = masterKey
    ? { key: masterKey, version: KEY_VERSION_SERVICE_ROLE }
    : deriveActiveEncryptionKey()
  const encrypted = encryptSecret(apiKey, activeKeyInfo.key, activeKeyInfo.version)
  const allowedModels = Array.isArray(input.allowedModels) && input.allowedModels.length > 0
    ? input.allowedModels
    : input.model ? [input.model] : []

  const row = {
    provider_id: input.providerId,
    name: input.name,
    protocol: input.protocol,
    auth_scheme: input.authScheme,
    base_url: input.baseUrl,
    model: input.model,
    allowed_models: allowedModels,
    priority: typeof input.priority === 'number' && Number.isFinite(input.priority) ? input.priority : 100,
    in_pool: input.inPool !== undefined ? Boolean(input.inPool) : true,
    is_paid_tier: Boolean(input.isPaidTier),
    timeout_ms: input.timeoutMs,
    encrypted_key: encrypted.ciphertext,
    key_nonce: encrypted.nonce,
    key_tag: encrypted.tag,
    key_version: encrypted.version,
    masked_key: maskApiKey(apiKey),
    is_enabled: true,
    health_status: 'healthy',
    verification_status: 'unverified',
    created_by: userId,
    updated_by: userId,
  }

  const { data, error } = await client.from('app_ai_provider_connections').insert(row).select(PUBLIC_COLUMNS).single()
  if (error || !data) throw new Error(`Failed to create connection: ${error?.message ?? 'no row returned'}`)
  return toPublicConnection(data as ConnectionRecord)
}

export async function updateConnection(
  client: SupabaseClient,
  connectionId: string,
  patch: UpdateConnectionInput,
  userId: string,
  masterKey?: Buffer,
): Promise<PublicConnection> {
  const existing = await loadRecord(client, connectionId)
  if (!existing) throw new Error('Connection not found.')

  const row: Record<string, unknown> = { updated_by: userId }
  if (patch.name !== undefined) row.name = patch.name
  if (patch.protocol !== undefined) row.protocol = patch.protocol
  if (patch.authScheme !== undefined) row.auth_scheme = patch.authScheme
  if (patch.baseUrl !== undefined) row.base_url = patch.baseUrl
  if (patch.model !== undefined) row.model = patch.model
  if (patch.allowedModels !== undefined) {
    row.allowed_models = patch.allowedModels
    row.metadata = { ...(existing.metadata ?? {}), enabledModels: patch.allowedModels }
  }
  if (patch.metadata !== undefined) {
    row.metadata = patch.metadata
    if (Array.isArray(patch.metadata.enabledModels)) row.allowed_models = patch.metadata.enabledModels
  }
  if (patch.timeoutMs !== undefined) row.timeout_ms = patch.timeoutMs
  if (patch.isEnabled !== undefined) row.is_enabled = patch.isEnabled
  if (patch.inPool !== undefined) row.in_pool = patch.inPool
  if (patch.priority !== undefined) row.priority = patch.priority
  if (patch.isPaidTier !== undefined) row.is_paid_tier = patch.isPaidTier

  if (patch.apiKey?.trim()) {
    const activeKeyInfo = masterKey
      ? { key: masterKey, version: KEY_VERSION_SERVICE_ROLE }
      : deriveActiveEncryptionKey()
    const enc = encryptSecret(patch.apiKey.trim(), activeKeyInfo.key, activeKeyInfo.version)
    row.encrypted_key = enc.ciphertext
    row.key_nonce = enc.nonce
    row.key_tag = enc.tag
    row.key_version = enc.version
    row.masked_key = maskApiKey(patch.apiKey.trim())
    row.verification_status = 'unverified'
  }

  const { data, error } = await client.from('app_ai_provider_connections').update(row).eq('id', connectionId).select(PUBLIC_COLUMNS).single()
  if (error || !data) throw new Error(`Failed to update connection: ${error?.message ?? 'no row returned'}`)
  return toPublicConnection(data as ConnectionRecord)
}

export async function deleteConnection(client: SupabaseClient, connectionId: string): Promise<void> {
  const routing = await getRouting(client)
  const { error } = await client.from('app_ai_provider_connections').delete().eq('id', connectionId)
  if (error) throw new Error(`Failed to delete connection: ${error.message}`)

  if (routing.fallbackConnectionIds.includes(connectionId)) {
    const remaining = routing.fallbackConnectionIds.filter((id) => id !== connectionId)
    await client.from('app_ai_provider_routing').update({ fallback_connection_ids: remaining }).eq('id', 'default')
  }
}

export async function setPrimaryConnection(
  client: SupabaseClient,
  connectionId: string,
  userId: string,
): Promise<RoutingState> {
  const record = await loadRecord(client, connectionId)
  if (!record) throw new Error('Connection not found.')
  if (!record.is_enabled) throw new Error('Enable the connection before activating it.')

  // Promote connection to priority 1 in the pool
  await client
    .from('app_ai_provider_connections')
    .update({ priority: 1, in_pool: true, updated_by: userId })
    .eq('id', connectionId)

  const current = await getRouting(client)
  const { error } = await client
    .from('app_ai_provider_routing')
    .upsert(
      {
        id: 'default',
        primary_connection_id: connectionId,
        fallback_enabled: current.fallbackEnabled,
        fallback_connection_ids: current.fallbackConnectionIds,
        routing_enabled: current.routingEnabled,
        updated_by: userId,
      },
      { onConflict: 'id' },
    )
  if (error) console.error('[connection-vault] Legacy routing update failed:', error.message)
  return getRouting(client)
}

export async function setConnectionPriority(
  client: SupabaseClient,
  connectionId: string,
  priority: number,
  userId: string,
): Promise<PublicConnection> {
  const { data, error } = await client.from('app_ai_provider_connections').update({ priority, updated_by: userId }).eq('id', connectionId).select(PUBLIC_COLUMNS).single()
  if (error || !data) throw new Error(`Failed to update priority: ${error?.message ?? 'no row returned'}`)
  return toPublicConnection(data as ConnectionRecord)
}

export async function setConnectionPool(
  client: SupabaseClient,
  connectionId: string,
  inPool: boolean,
  userId: string,
): Promise<PublicConnection> {
  const { data, error } = await client.from('app_ai_provider_connections').update({ in_pool: inPool, updated_by: userId }).eq('id', connectionId).select(PUBLIC_COLUMNS).single()
  if (error || !data) throw new Error(`Failed to update pool state: ${error?.message ?? 'no row returned'}`)
  return toPublicConnection(data as ConnectionRecord)
}

export async function recordBalanceUpdate(
  client: SupabaseClient,
  connectionId: string,
  balance: {
    amount: number | null
    currency: string
    source: 'api' | 'unsupported'
  },
): Promise<PublicConnection> {
  const now = new Date().toISOString()
  const isUsd = balance.currency.toUpperCase() === 'USD'
  const { data, error } = await client
    .from('app_ai_provider_connections')
    .update({
      known_balance_amount: balance.amount,
      known_balance_currency: balance.currency,
      known_balance_usd: isUsd ? balance.amount : null,
      balance_source: balance.source,
      balance_updated_at: now,
    })
    .eq('id', connectionId)
    .select(PUBLIC_COLUMNS)
    .single()
  if (error || !data) throw new Error(`Failed to update balance: ${error?.message ?? 'no row returned'}`)
  return toPublicConnection(data as ConnectionRecord)
}

export type RoutingEventRecord = {
  id: string; created_at: string; connection_id: string | null; provider_id: string | null
  model_id: string | null; event_type: string; http_status: number | null; cooldown_seconds: number | null; reason_summary: string | null
}

export async function listRoutingEvents(
  client: SupabaseClient,
  limit: number = 20,
  connectionId?: string,
): Promise<RoutingEventRecord[]> {
  let query = client
    .from('app_ai_routing_events')
    .select('id, created_at, connection_id, provider_id, model_id, event_type, http_status, cooldown_seconds, reason_summary')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (connectionId) query = query.eq('connection_id', connectionId)
  const { data, error } = await query
  if (error) {
    console.error('[connection-vault] Failed to fetch routing events:', error.message)
    return []
  }
  return (data ?? []) as RoutingEventRecord[]
}

export async function setRouting(
  client: SupabaseClient,
  routing: { fallbackEnabled: boolean; fallbackConnectionIds: string[] },
  userId: string,
): Promise<RoutingState> {
  const current = await getRouting(client)
  const approved: string[] = []
  for (const id of routing.fallbackConnectionIds) {
    if (id === current.primaryConnectionId) continue
    const record = await loadRecord(client, id)
    if (record && record.is_enabled) approved.push(id)
  }
  const { error } = await client.from('app_ai_provider_routing').upsert(
    {
      id: 'default',
      primary_connection_id: current.primaryConnectionId,
      fallback_enabled: routing.fallbackEnabled,
      fallback_connection_ids: routing.fallbackEnabled ? approved : [],
      routing_enabled: current.routingEnabled,
      updated_by: userId,
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(`Failed to update routing: ${error.message}`)
  return getRouting(client)
}

export async function setGlobalRoutingEnabled(
  client: SupabaseClient,
  enabled: boolean,
  userId: string,
): Promise<RoutingState> {
  const current = await getRouting(client)
  const { error } = await client.from('app_ai_provider_routing').upsert(
    {
      id: 'default',
      primary_connection_id: current.primaryConnectionId,
      fallback_enabled: current.fallbackEnabled,
      fallback_connection_ids: current.fallbackConnectionIds,
      routing_enabled: Boolean(enabled),
      updated_by: userId,
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(`Failed to update global routing state: ${error.message}`)
  await writeAudit(client, userId, enabled ? 'routing.resumed' : 'routing.emergency_shutdown', null, {
    routing_enabled: Boolean(enabled),
  })
  return getRouting(client)
}

export async function recordTestResult(
  client: SupabaseClient,
  connectionId: string,
  diagnostics: ProviderDiagnostics,
): Promise<void> {
  const row: Record<string, unknown> = {
    verification_status: diagnostics.ok ? 'verified' : 'failed',
    health_status: diagnostics.ok
      ? 'healthy'
      : diagnostics.category === 'provider_auth'
        ? 'quarantined'
        : 'unknown',
    last_test_status: diagnostics.status,
    last_test_message: diagnostics.message.slice(0, 500),
  }
  if (diagnostics.ok) {
    row.last_verified_at = new Date().toISOString()
    row.consecutive_failures = 0
  }
  await client.from('app_ai_provider_connections').update(row).eq('id', connectionId)
}

export async function cacheDiscoveredModels(
  client: SupabaseClient,
  connectionId: string,
  models: DiscoveredModel[],
): Promise<void> {
  await client
    .from('app_ai_provider_connections')
    .update({ discovered_models: models, models_fetched_at: new Date().toISOString() })
    .eq('id', connectionId)
}

export async function writeAudit(
  client: SupabaseClient,
  actorId: string,
  action: string,
  connectionId: string | null,
  detail: Record<string, unknown>,
): Promise<void> {
  await client.from('app_ai_provider_audit').insert({
    actor_id: actorId,
    action,
    connection_id: connectionId,
    detail,
  })
}

function toAdapterConfig(record: ConnectionRecord, apiKey: string): AdapterConfig {
  return {
    providerId: record.provider_id,
    protocol: record.protocol,
    authScheme: record.auth_scheme,
    baseUrl: record.base_url,
    apiKey,
    model: record.model,
    timeoutMs: record.timeout_ms,
  }
}

/** Loads and decrypts a single connection's credential (server memory only). */
export async function loadConnectionSecret(
  client: SupabaseClient,
  connectionId: string,
  masterKey?: Buffer,
): Promise<{ record: ConnectionRecord; config: AdapterConfig } | null> {
  const record = await loadRecord(client, connectionId)
  if (!record) return null
  try {
    const apiKey = decryptVaultSecret(
      { ciphertext: record.encrypted_key, nonce: record.key_nonce, tag: record.key_tag, version: record.key_version },
      process.env,
      masterKey,
    )
    return { record, config: toAdapterConfig(record, apiKey) }
  } catch (err) {
    console.error('[connection-vault] Failed to decrypt connection:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Safely re-encrypts a connection's credentials to the active dedicated key (version 2).
 * Verifies decryption of the newly encrypted ciphertext before updating the database.
 */
export async function reencryptConnection(
  client: SupabaseClient,
  connectionId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<{ reencrypted: boolean; version: number }> {
  const dedicated = deriveDedicatedMasterKey(env)
  if (!dedicated) {
    return { reencrypted: false, version: KEY_VERSION_SERVICE_ROLE }
  }

  const record = await loadRecord(client, connectionId)
  if (!record) throw new Error('Connection not found.')
  if (record.key_version === KEY_VERSION_DEDICATED) {
    return { reencrypted: false, version: KEY_VERSION_DEDICATED }
  }

  // 1. Decrypt using the vault key ring
  const plainText = decryptVaultSecret(
    { ciphertext: record.encrypted_key, nonce: record.key_nonce, tag: record.key_tag, version: record.key_version },
    env,
  )

  // 2. Encrypt with dedicated master key (version 2)
  const newEncrypted = encryptSecret(plainText, dedicated, KEY_VERSION_DEDICATED)

  // 3. Verify before replacing stored ciphertext
  const verifiedDecrypted = decryptSecret(newEncrypted, dedicated)
  if (verifiedDecrypted !== plainText) {
    throw new Error('Re-encryption verification failed: decrypted plainText does not match.')
  }

  // 4. Update the stored ciphertext
  const { error } = await client
    .from('app_ai_provider_connections')
    .update({
      encrypted_key: newEncrypted.ciphertext,
      key_nonce: newEncrypted.nonce,
      key_tag: newEncrypted.tag,
      key_version: newEncrypted.version,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
  if (error) throw new Error(`Failed to persist re-encrypted credentials: ${error.message}`)

  return { reencrypted: true, version: KEY_VERSION_DEDICATED }
}

export type RuntimeCandidate = { connectionId: string; config: AdapterConfig; label: 'primary' | 'fallback' }
export type RuntimeResolution = { primary: AdapterConfig; primaryConnectionId: string; fallbacks: AdapterConfig[]; candidates: RuntimeCandidate[] }

/**
 * Resolves the active primary connection and explicitly approved fallbacks.
 * Returns null when no enabled primary connection is configured.
 */
export async function resolveRuntimeConnections(
  client: SupabaseClient,
  masterKey?: Buffer,
): Promise<RuntimeResolution | null> {
  const routing = await getRouting(client)
  if (!routing.primaryConnectionId) return null

  const primaryLoaded = await loadConnectionSecret(client, routing.primaryConnectionId, masterKey)
  if (!primaryLoaded || !primaryLoaded.record.is_enabled || !primaryLoaded.config.model) return null

  const fallbacks: AdapterConfig[] = []
  const candidates: RuntimeCandidate[] = [
    { connectionId: routing.primaryConnectionId, config: primaryLoaded.config, label: 'primary' },
  ]
  if (routing.fallbackEnabled) {
    for (const id of routing.fallbackConnectionIds) {
      if (id === routing.primaryConnectionId) continue
      const loaded = await loadConnectionSecret(client, id, masterKey)
      if (loaded && loaded.record.is_enabled && loaded.config.model) {
        fallbacks.push(loaded.config)
        candidates.push({ connectionId: id, config: loaded.config, label: 'fallback' })
      }
    }
  }

  return { primary: primaryLoaded.config, primaryConnectionId: routing.primaryConnectionId, fallbacks, candidates }
}