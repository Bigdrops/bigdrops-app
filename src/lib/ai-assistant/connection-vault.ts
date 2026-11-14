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
import { decryptSecret, deriveMasterKey, encryptSecret, maskApiKey } from './bolu-secret-vault'
import type { AdapterConfig, DiscoveredModel, ProviderDiagnostics } from './provider-adapters'
import type { ProviderAuthScheme, ProviderProtocol } from './provider-catalog'

export type ConnectionRecord = {
  id: string
  provider_id: string
  name: string
  protocol: ProviderProtocol
  auth_scheme: ProviderAuthScheme
  base_url: string
  model: string
  timeout_ms: number
  encrypted_key: string
  key_nonce: string
  key_tag: string
  key_version: number
  masked_key: string
  is_enabled: boolean
  verification_status: 'unverified' | 'verified' | 'failed'
  last_verified_at: string | null
  last_test_status: number | null
  last_test_message: string | null
  discovered_models: DiscoveredModel[]
  models_fetched_at: string | null
  migrated_from: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export type PublicConnection = {
  id: string
  providerId: string
  name: string
  protocol: ProviderProtocol
  authScheme: ProviderAuthScheme
  baseUrl: string
  model: string
  timeoutMs: number
  maskedKey: string
  isEnabled: boolean
  verificationStatus: 'unverified' | 'verified' | 'failed'
  lastVerifiedAt: string | null
  lastTestStatus: number | null
  lastTestMessage: string | null
  discoveredModels: DiscoveredModel[]
  modelsFetchedAt: string | null
  createdAt: string
  updatedAt: string
}

export type RoutingState = {
  primaryConnectionId: string | null
  fallbackEnabled: boolean
  fallbackConnectionIds: string[]
}

export type CreateConnectionInput = {
  providerId: string
  name: string
  protocol: ProviderProtocol
  authScheme: ProviderAuthScheme
  baseUrl: string
  apiKey: string
  model: string
  timeoutMs: number
}

export type UpdateConnectionInput = {
  name?: string
  protocol?: ProviderProtocol
  authScheme?: ProviderAuthScheme
  baseUrl?: string
  model?: string
  timeoutMs?: number
  isEnabled?: boolean
  apiKey?: string
}

const CONNECTION_COLUMNS =
  'id, provider_id, name, protocol, auth_scheme, base_url, model, timeout_ms, encrypted_key, key_nonce, key_tag, key_version, masked_key, is_enabled, verification_status, last_verified_at, last_test_status, last_test_message, discovered_models, models_fetched_at, migrated_from, created_at, updated_at, created_by, updated_by'

const PUBLIC_COLUMNS =
  'id, provider_id, name, protocol, auth_scheme, base_url, model, timeout_ms, masked_key, is_enabled, verification_status, last_verified_at, last_test_status, last_test_message, discovered_models, models_fetched_at, created_at, updated_at'

export function toPublicConnection(record: ConnectionRecord): PublicConnection {
  return {
    id: record.id,
    providerId: record.provider_id,
    name: record.name,
    protocol: record.protocol,
    authScheme: record.auth_scheme,
    baseUrl: record.base_url,
    model: record.model,
    timeoutMs: record.timeout_ms,
    maskedKey: record.masked_key,
    isEnabled: record.is_enabled,
    verificationStatus: record.verification_status,
    lastVerifiedAt: record.last_verified_at,
    lastTestStatus: record.last_test_status,
    lastTestMessage: record.last_test_message,
    discoveredModels: Array.isArray(record.discovered_models) ? record.discovered_models : [],
    modelsFetchedAt: record.models_fetched_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

export async function listConnections(client: SupabaseClient): Promise<PublicConnection[]> {
  const { data, error } = await client
    .from('app_ai_provider_connections')
    .select(PUBLIC_COLUMNS)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Failed to list connections: ${error.message}`)
  return ((data ?? []) as ConnectionRecord[]).map(toPublicConnection)
}

export async function getRouting(client: SupabaseClient): Promise<RoutingState> {
  const { data } = await client
    .from('app_ai_provider_routing')
    .select('primary_connection_id, fallback_enabled, fallback_connection_ids')
    .eq('id', 'default')
    .maybeSingle()
  if (!data) {
    return { primaryConnectionId: null, fallbackEnabled: false, fallbackConnectionIds: [] }
  }
  const record = data as Record<string, unknown>
  return {
    primaryConnectionId: (record.primary_connection_id as string) ?? null,
    fallbackEnabled: Boolean(record.fallback_enabled),
    fallbackConnectionIds: Array.isArray(record.fallback_connection_ids)
      ? (record.fallback_connection_ids as string[])
      : [],
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
  const key = masterKey ?? deriveMasterKey()
  const encrypted = encryptSecret(apiKey, key)

  const row = {
    provider_id: input.providerId,
    name: input.name,
    protocol: input.protocol,
    auth_scheme: input.authScheme,
    base_url: input.baseUrl,
    model: input.model,
    timeout_ms: input.timeoutMs,
    encrypted_key: encrypted.ciphertext,
    key_nonce: encrypted.nonce,
    key_tag: encrypted.tag,
    key_version: encrypted.version,
    masked_key: maskApiKey(apiKey),
    is_enabled: true,
    verification_status: 'unverified',
    created_by: userId,
    updated_by: userId,
  }

  const { data, error } = await client
    .from('app_ai_provider_connections')
    .insert(row)
    .select(PUBLIC_COLUMNS)
    .single()
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
  if (patch.timeoutMs !== undefined) row.timeout_ms = patch.timeoutMs
  if (patch.isEnabled !== undefined) row.is_enabled = patch.isEnabled

  if (patch.apiKey !== undefined && patch.apiKey.trim()) {
    const key = masterKey ?? deriveMasterKey()
    const encrypted = encryptSecret(patch.apiKey.trim(), key)
    row.encrypted_key = encrypted.ciphertext
    row.key_nonce = encrypted.nonce
    row.key_tag = encrypted.tag
    row.key_version = encrypted.version
    row.masked_key = maskApiKey(patch.apiKey.trim())
    row.verification_status = 'unverified'
  }

  const { data, error } = await client
    .from('app_ai_provider_connections')
    .update(row)
    .eq('id', connectionId)
    .select(PUBLIC_COLUMNS)
    .single()
  if (error || !data) throw new Error(`Failed to update connection: ${error?.message ?? 'no row returned'}`)
  return toPublicConnection(data as ConnectionRecord)
}

export async function deleteConnection(client: SupabaseClient, connectionId: string): Promise<void> {
  const routing = await getRouting(client)
  const { error } = await client.from('app_ai_provider_connections').delete().eq('id', connectionId)
  if (error) throw new Error(`Failed to delete connection: ${error.message}`)

  if (routing.fallbackConnectionIds.includes(connectionId)) {
    const remaining = routing.fallbackConnectionIds.filter((id) => id !== connectionId)
    await client
      .from('app_ai_provider_routing')
      .update({ fallback_connection_ids: remaining })
      .eq('id', 'default')
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

  const { error } = await client
    .from('app_ai_provider_routing')
    .upsert(
      { id: 'default', primary_connection_id: connectionId, updated_by: userId },
      { onConflict: 'id' },
    )
  if (error) throw new Error(`Failed to activate connection: ${error.message}`)
  return getRouting(client)
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

  const { error } = await client
    .from('app_ai_provider_routing')
    .upsert(
      {
        id: 'default',
        primary_connection_id: current.primaryConnectionId,
        fallback_enabled: routing.fallbackEnabled,
        fallback_connection_ids: routing.fallbackEnabled ? approved : [],
        updated_by: userId,
      },
      { onConflict: 'id' },
    )
  if (error) throw new Error(`Failed to update routing: ${error.message}`)
  return getRouting(client)
}

export async function recordTestResult(
  client: SupabaseClient,
  connectionId: string,
  diagnostics: ProviderDiagnostics,
): Promise<void> {
  const row: Record<string, unknown> = {
    verification_status: diagnostics.ok ? 'verified' : 'failed',
    last_test_status: diagnostics.status,
    last_test_message: diagnostics.message.slice(0, 500),
  }
  if (diagnostics.ok) row.last_verified_at = new Date().toISOString()
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
    const key = masterKey ?? deriveMasterKey()
    const apiKey = decryptSecret(
      { ciphertext: record.encrypted_key, nonce: record.key_nonce, tag: record.key_tag, version: record.key_version },
      key,
    )
    return { record, config: toAdapterConfig(record, apiKey) }
  } catch (err) {
    console.error('[connection-vault] Failed to decrypt connection:', err instanceof Error ? err.message : err)
    return null
  }
}

export type RuntimeResolution = {
  primary: AdapterConfig
  primaryConnectionId: string
  fallbacks: AdapterConfig[]
}

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
  if (routing.fallbackEnabled) {
    for (const id of routing.fallbackConnectionIds) {
      if (id === routing.primaryConnectionId) continue
      const loaded = await loadConnectionSecret(client, id, masterKey)
      if (loaded && loaded.record.is_enabled && loaded.config.model) {
        fallbacks.push(loaded.config)
      }
    }
  }

  return {
    primary: primaryLoaded.config,
    primaryConnectionId: routing.primaryConnectionId,
    fallbacks,
  }
}