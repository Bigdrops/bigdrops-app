/**
 * Bolu provider management API (server-only).
 *
 * Global AI infrastructure is restricted to platform administrators. Connection
 * credentials are encrypted at rest and never returned to the browser. Errors
 * carry stable diagnostic codes so the Settings UI can show actionable guidance
 * instead of collapsed generic messages.
 */

import { verifyPlatformAdmin } from '../src/lib/ai-assistant/bolu-auth.js'
import { getBoluProviderConfig } from '../src/lib/ai-assistant/bolu-provider.js'
import {
  deriveMasterKey,
  getPublicProviderStatus,
} from '../src/lib/ai-assistant/bolu-secret-vault.js'
import {
  PROVIDER_CATALOGUE,
  getCatalogueEntry,
  isCustomProvider,
  resolveProviderDefaults,
} from '../src/lib/ai-assistant/provider-catalog.js'
import {
  assertEndpointResolvesSafe,
  checkRateLimit,
  clampTimeout,
  isAuthScheme,
  isProtocol,
  sanitizeConnectionName,
  sanitizeModelId,
  validateEndpointSyntax,
} from '../src/lib/ai-assistant/provider-security.js'
import {
  discoverAdapterModels,
  testAdapterConnection,
  type AdapterConfig,
} from '../src/lib/ai-assistant/provider-adapters.js'
import {
  cacheDiscoveredModels,
  createConnection,
  deleteConnection,
  getRouting,
  listConnections,
  listRoutingEvents,
  loadConnectionSecret,
  isDuplicateNameError,
  recordBalanceUpdate,
  recordTestResult,
  setConnectionPool,
  setConnectionPriority,
  setGlobalRoutingEnabled,
  setPrimaryConnection,
  setRouting,
  updateConnection,
  writeAudit,
  type PublicConnection,
  type RoutingEventRecord,
  type RoutingState,
} from '../src/lib/ai-assistant/connection-vault.js'
import { checkUpstreamBalance } from '../src/lib/ai-assistant/routing/bolu-balance-sync.js'
import type { SupabaseClient } from '@supabase/supabase-js'

type ErrorCode =
  | 'server_config_missing'
  | 'authentication_required'
  | 'invalid_session'
  | 'forbidden'
  | 'auth_check_failed'
  | 'rate_limited'
  | 'invalid_request'
  | 'not_found'
  | 'endpoint_blocked'
  | 'storage_unavailable'
  | 'discovery_unsupported'
  | 'duplicate_name'
  | 'operation_failed'

function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function jsonError(message: string, status: number, code: ErrorCode) {
  return jsonResponse({ error: message, code }, status)
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_API_KEY_LENGTH = 512
const MAX_FALLBACKS = 5

function isConnectionId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

function isStorageMissingError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return /does not exist|schema cache|Could not find the table/i.test(message)
}

function storageUnavailableResponse() {
  return jsonError(
    'Provider connection storage is not available. Apply database migration 20261114170000_bolu_provider_connections.sql, then retry.',
    503,
    'storage_unavailable',
  )
}

/**
 * The connection name carries a UNIQUE constraint. A collision must read as
 * "that name is taken", not as an opaque storage failure.
 */
function duplicateNameResponse(name: string): Response {
  return jsonError(
    `A connection named "${name}" already exists. Choose a different name.`,
    409,
    'duplicate_name',
  )
}

/** Audit writes must never fail an otherwise successful mutation. */
async function audit(
  client: SupabaseClient,
  actorId: string,
  action: string,
  connectionId: string | null,
  detail: Record<string, unknown>,
) {
  try {
    await writeAudit(client, actorId, action, connectionId, detail)
  } catch (err) {
    console.error('[bolu-provider-config] Audit write failed:', err instanceof Error ? err.message : err)
  }
}

function rateLimitResponse(retryAfterMs: number) {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000))
  return jsonError(
    `Too many requests. Retry in ${seconds} second${seconds === 1 ? '' : 's'}.`,
    429,
    'rate_limited',
  )
}

type InlineTarget = {
  providerId: string
  baseUrl: string
  protocol: 'openai' | 'anthropic'
  authScheme: 'bearer' | 'x-api-key'
  apiKey: string
  model: string
  timeoutMs: number
}

/** Resolves an inline (unsaved) test/discover target from the request body. */
function resolveInlineTarget(body: Record<string, unknown>): { ok: true; target: InlineTarget } | { ok: false; response: Response } {
  const providerId = typeof body.providerId === 'string' ? body.providerId.trim() : ''
  if (!providerId) {
    return { ok: false, response: jsonError('providerId is required for an inline test.', 400, 'invalid_request') }
  }

  const overrides = {
    protocol: isProtocol(body.protocol) ? body.protocol : undefined,
    authScheme: isAuthScheme(body.authScheme) ? body.authScheme : undefined,
    baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl : undefined,
  }
  const defaults = resolveProviderDefaults(providerId, overrides)
  if (!defaults) {
    return {
      ok: false,
      response: jsonError(
        isCustomProvider(providerId)
          ? 'Custom connections require baseUrl, protocol and authScheme.'
          : 'Unknown provider. Choose a catalogue provider or "custom".',
        400,
        'invalid_request',
      ),
    }
  }

  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  if (!apiKey || apiKey.length > MAX_API_KEY_LENGTH) {
    return { ok: false, response: jsonError('A valid API key is required.', 400, 'invalid_request') }
  }

  const entry = getCatalogueEntry(providerId)
  const model = sanitizeModelId(body.model) ?? entry?.defaultModel ?? ''
  if (!model) {
    return { ok: false, response: jsonError('A model identifier is required.', 400, 'invalid_request') }
  }

  return {
    ok: true,
    target: {
      providerId,
      baseUrl: defaults.baseUrl,
      protocol: defaults.protocol,
      authScheme: defaults.authScheme,
      apiKey,
      model,
      timeoutMs: clampTimeout(body.timeoutMs, 25000),
    },
  }
}

async function endpointGuard(baseUrl: string): Promise<Response | null> {
  const syntax = validateEndpointSyntax(baseUrl)
  if ('error' in syntax) return jsonError(syntax.error, 400, 'endpoint_blocked')
  const resolved = await assertEndpointResolvesSafe(baseUrl)
  if ('error' in resolved) return jsonError(resolved.error, 400, 'endpoint_blocked')
  return null
}

export async function GET(request: Request): Promise<Response> {
  return handleRequest(request)
}

export async function POST(request: Request): Promise<Response> {
  return handleRequest(request)
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return jsonError('Method not allowed.', 405, 'invalid_request')
  }

  const auth = await verifyPlatformAdmin(request)
  if ('error' in auth) {
    return jsonError(auth.error, auth.status, auth.code)
  }
  const { adminClient, user } = auth

  if (request.method === 'GET') {
    return handleGet(adminClient)
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return jsonError('Invalid JSON request body.', 400, 'invalid_request')
  }

  const action = typeof body.action === 'string' ? body.action.toLowerCase() : ''
  const mutationActions = [
    'create',
    'update',
    'delete',
    'activate',
    'set_routing',
    'set_global_routing',
    'set_pool',
    'set_priority',
    'sync_balance',
  ]
  const outboundActions = ['test', 'discover', 'get_routing_events']
  if (!mutationActions.includes(action) && !outboundActions.includes(action)) {
    return jsonError(
      'Valid action ("create", "update", "delete", "activate", "test", "discover", "set_routing", "set_global_routing", "set_pool", "set_priority", "sync_balance", "get_routing_events") is required.',
      400,
      'invalid_request',
    )
  }

  const limit = outboundActions.includes(action) ? 10 : 30
  const rate = checkRateLimit(`${user.id}:${action}`, limit, 60_000)
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterMs)
  }

  try {
    switch (action) {
      case 'create':
        return await handleCreate(adminClient, user.id, body)
      case 'update':
        return await handleUpdate(adminClient, user.id, body)
      case 'delete':
        return await handleDelete(adminClient, user.id, body)
      case 'activate':
        return await handleActivate(adminClient, user.id, body)
      case 'test':
        return await handleTest(adminClient, body)
      case 'discover':
        return await handleDiscover(adminClient, body)
      case 'set_routing':
        return await handleSetRouting(adminClient, user.id, body)
      case 'set_global_routing':
        return await handleSetGlobalRouting(adminClient, user.id, body)
      case 'set_pool':
        return await handleSetPool(adminClient, user.id, body)
      case 'set_priority':
        return await handleSetPriority(adminClient, user.id, body)
      case 'sync_balance':
        return await handleSyncBalance(adminClient, user.id, body)
      case 'get_routing_events':
        return await handleGetRoutingEvents(adminClient, body)
      default:
        return jsonError('Unsupported action.', 400, 'invalid_request')
    }
  } catch (err) {
    if (isStorageMissingError(err)) return storageUnavailableResponse()
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[bolu-provider-config] ${action} failed:`, msg)

    if (/permission denied|insufficient permissions/i.test(msg) || (err as any)?.code === '42501') {
      return jsonError('You do not have permission to manage AI provider connections.', 403, 'forbidden')
    }
    if (/master key|vault_key|credential_key|encryption key/i.test(msg)) {
      return jsonError('Server encryption key configuration is unavailable.', 500, 'server_config_missing')
    }
    if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|fetch failed|network timeout|network error/i.test(msg)) {
      return jsonError('The remote provider endpoint could not be reached or timed out.', 502, 'endpoint_blocked')
    }

    return jsonError('The operation failed. Retry, or review the server logs.', 500, 'operation_failed')
  }
}

async function handleGet(adminClient: SupabaseClient): Promise<Response> {
  let inApp = { configured: false } as Awaited<ReturnType<typeof getPublicProviderStatus>>
  try {
    inApp = await getPublicProviderStatus(adminClient)
  } catch (err) {
    console.error('[bolu-provider-config] Legacy status read failed:', err instanceof Error ? err.message : err)
  }

  const envConfig = getBoluProviderConfig(process.env)
  const hasEnvFallback = Boolean(envConfig.apiKey)

  let connections: PublicConnection[] = []
  let routing: RoutingState = { primaryConnectionId: null, fallbackEnabled: false, fallbackConnectionIds: [], routingEnabled: true }
  let routingEvents: RoutingEventRecord[] = []
  let schemaReady = true
  try {
    connections = await listConnections(adminClient)
    routing = await getRouting(adminClient)
    try {
      routingEvents = await listRoutingEvents(adminClient, 20)
    } catch {
      // Non-fatal if routing events table does not exist or empty
    }
  } catch (err) {
    schemaReady = false
    console.error('[bolu-provider-config] Connection storage unavailable:', err instanceof Error ? err.message : err)
  }

  const primary = routing.primaryConnectionId
    ? connections.find((c) => c.id === routing.primaryConnectionId) ?? null
    : null

  const runtimeSource = primary
    ? 'connection'
    : inApp.configured
      ? 'legacy'
      : hasEnvFallback
        ? 'environment'
        : 'unconfigured'

  const poolSummary = {
    totalCount: connections.length,
    inPoolCount: connections.filter((c) => c.inPool && c.isEnabled).length,
    healthyCount: connections.filter((c) => c.healthStatus === 'healthy').length,
    coolingDownCount: connections.filter((c) => c.healthStatus === 'cooling_down').length,
    exhaustedCount: connections.filter((c) => c.healthStatus === 'exhausted').length,
    quarantinedCount: connections.filter((c) => c.healthStatus === 'quarantined').length,
  }

  return jsonResponse({
    catalogue: PROVIDER_CATALOGUE,
    connections,
    routing,
    schemaReady,
    poolSummary,
    routingEvents,
    runtime: {
      source: runtimeSource,
      primaryConnectionId: routing.primaryConnectionId,
      provider: primary?.providerId ?? (inApp.configured ? inApp.provider : hasEnvFallback ? envConfig.provider : null),
      model: primary?.model ?? (inApp.configured ? inApp.model : hasEnvFallback ? envConfig.model : null),
    },
    // Legacy compatibility fields (pre-multi-connection clients).
    inApp,
    activeSource: inApp.configured ? 'database' : hasEnvFallback ? 'environment' : 'unconfigured',
    envFallback: {
      configured: hasEnvFallback,
      provider: envConfig.provider,
      model: envConfig.model,
      maskedKey: envConfig.apiKey ? `${envConfig.apiKey.slice(0, 3)}••••${envConfig.apiKey.slice(-4)}` : null,
    },
  })
}

async function handleCreate(adminClient: SupabaseClient, userId: string, body: Record<string, unknown>): Promise<Response> {
  const providerId = typeof body.providerId === 'string' ? body.providerId.trim() : ''
  if (!providerId || (!getCatalogueEntry(providerId) && !isCustomProvider(providerId))) {
    return jsonError('Choose a catalogue provider or "custom".', 400, 'invalid_request')
  }

  const overrides = {
    protocol: isProtocol(body.protocol) ? body.protocol : undefined,
    authScheme: isAuthScheme(body.authScheme) ? body.authScheme : undefined,
    baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl : undefined,
  }
  if (body.protocol !== undefined && !isProtocol(body.protocol)) {
    return jsonError('protocol must be "openai" or "anthropic".', 400, 'invalid_request')
  }
  if (body.authScheme !== undefined && !isAuthScheme(body.authScheme)) {
    return jsonError('authScheme must be "bearer" or "x-api-key".', 400, 'invalid_request')
  }

  const defaults = resolveProviderDefaults(providerId, overrides)
  if (!defaults) {
    return jsonError('Custom connections require baseUrl, protocol and authScheme.', 400, 'invalid_request')
  }

  const blocked = await endpointGuard(defaults.baseUrl)
  if (blocked) return blocked

  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  if (!apiKey || apiKey.length > MAX_API_KEY_LENGTH) {
    return jsonError('A valid API key is required.', 400, 'invalid_request')
  }

  const entry = getCatalogueEntry(providerId)
  const model = sanitizeModelId(body.model) ?? entry?.defaultModel ?? ''
  if (!model) {
    return jsonError('A model identifier is required.', 400, 'invalid_request')
  }

  const name =
    sanitizeConnectionName(body.name) ??
    (entry ? `${entry.name} connection` : 'Custom connection')

  const existingConnections = await listConnections(adminClient)
  if (existingConnections.some((c) => c.name === name)) {
    return duplicateNameResponse(name)
  }

  const priority =
    typeof body.priority === 'number' && Number.isInteger(body.priority) && body.priority >= 1
      ? body.priority
      : 100
  const inPool = typeof body.inPool === 'boolean' ? body.inPool : true
  const allowedModels = Array.isArray(body.allowedModels)
    ? body.allowedModels.map(String).filter(Boolean)
    : []
  const isPaidTier = typeof body.isPaidTier === 'boolean' ? body.isPaidTier : false

  let masterKey: Buffer
  try {
    masterKey = deriveMasterKey()
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Server master key unavailable.', 500, 'server_config_missing')
  }

  let connection: PublicConnection
  try {
    connection = await createConnection(
      adminClient,
      {
        providerId,
        name,
        protocol: defaults.protocol,
        authScheme: defaults.authScheme,
        baseUrl: defaults.baseUrl,
        apiKey,
        model,
        timeoutMs: clampTimeout(body.timeoutMs),
        priority,
        inPool,
        allowedModels,
        isPaidTier,
      },
      userId,
      masterKey,
    )
  } catch (err) {
    if (isDuplicateNameError(err)) return duplicateNameResponse(name)
    throw err
  }

  await audit(adminClient, userId, 'connection_created', connection.id, {
    providerId,
    name,
    model,
    priority,
    inPool,
  })

  return jsonResponse({
    ok: true,
    message: 'Connection saved. The credential is encrypted at rest.',
    connection,
  })
}

async function handleUpdate(adminClient: SupabaseClient, userId: string, body: Record<string, unknown>): Promise<Response> {
  if (!isConnectionId(body.connectionId)) {
    return jsonError('A valid connectionId is required.', 400, 'invalid_request')
  }
  const connectionId = body.connectionId

  const patch: Parameters<typeof updateConnection>[2] = {}

  if (body.name !== undefined) {
    const name = sanitizeConnectionName(body.name)
    if (!name) return jsonError('Connection name must be 1–80 characters.', 400, 'invalid_request')
    const existingConnections = await listConnections(adminClient)
    if (existingConnections.some((c) => c.name === name && c.id !== connectionId)) {
      return duplicateNameResponse(name)
    }
    patch.name = name
  }
  if (body.model !== undefined) {
    const model = sanitizeModelId(body.model)
    if (!model) return jsonError('Model identifier is invalid.', 400, 'invalid_request')
    patch.model = model
  }
  if (body.protocol !== undefined) {
    if (!isProtocol(body.protocol)) return jsonError('protocol must be "openai" or "anthropic".', 400, 'invalid_request')
    patch.protocol = body.protocol
  }
  if (body.authScheme !== undefined) {
    if (!isAuthScheme(body.authScheme)) return jsonError('authScheme must be "bearer" or "x-api-key".', 400, 'invalid_request')
    patch.authScheme = body.authScheme
  }
  if (body.baseUrl !== undefined) {
    if (typeof body.baseUrl !== 'string') return jsonError('baseUrl must be a string.', 400, 'invalid_request')
    const blocked = await endpointGuard(body.baseUrl)
    if (blocked) return blocked
    patch.baseUrl = body.baseUrl.trim()
  }
  if (body.timeoutMs !== undefined) patch.timeoutMs = clampTimeout(body.timeoutMs)
  if (body.isEnabled !== undefined) {
    if (typeof body.isEnabled !== 'boolean') return jsonError('isEnabled must be a boolean.', 400, 'invalid_request')
    patch.isEnabled = body.isEnabled
  }
  if (body.priority !== undefined) {
    const p = typeof body.priority === 'number' ? Math.floor(body.priority) : NaN
    if (isNaN(p) || p < 1 || p > 1000) {
      return jsonError('priority must be an integer between 1 and 1000.', 400, 'invalid_request')
    }
    patch.priority = p
  }
  if (body.inPool !== undefined) {
    if (typeof body.inPool !== 'boolean') return jsonError('inPool must be a boolean.', 400, 'invalid_request')
    patch.inPool = body.inPool
  }
  if (body.allowedModels !== undefined) {
    if (!Array.isArray(body.allowedModels)) return jsonError('allowedModels must be an array of strings.', 400, 'invalid_request')
    patch.allowedModels = body.allowedModels.map(String).filter(Boolean)
  }
  if (body.metadata !== undefined) {
    if (typeof body.metadata !== 'object' || body.metadata === null) return jsonError('metadata must be an object.', 400, 'invalid_request')
    const metadata = body.metadata as Record<string, unknown>
    patch.metadata = metadata
    if (Array.isArray(metadata.enabledModels)) {
      patch.allowedModels = metadata.enabledModels.map(String).filter(Boolean)
    }
  }
  if (body.isPaidTier !== undefined) {
    if (typeof body.isPaidTier !== 'boolean') return jsonError('isPaidTier must be a boolean.', 400, 'invalid_request')
    patch.isPaidTier = body.isPaidTier
  }
  if (body.apiKey !== undefined) {
    if (typeof body.apiKey !== 'string' || !body.apiKey.trim() || body.apiKey.trim().length > MAX_API_KEY_LENGTH) {
      return jsonError('A valid API key is required.', 400, 'invalid_request')
    }
    patch.apiKey = body.apiKey.trim()
  }

  if (Object.keys(patch).length === 0) {
    return jsonError('No changes supplied.', 400, 'invalid_request')
  }

  let masterKey: Buffer | undefined
  if (patch.apiKey !== undefined) {
    try {
      masterKey = deriveMasterKey()
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : 'Server master key unavailable.', 500, 'server_config_missing')
    }
  }

  let connection: PublicConnection
  try {
    connection = await updateConnection(adminClient, connectionId, patch, userId, masterKey)
  } catch (err) {
    if (isDuplicateNameError(err)) return duplicateNameResponse(patch.name ?? '')
    throw err
  }
  await audit(adminClient, userId, 'connection_updated', connectionId, {
    fields: Object.keys(patch).filter((k) => k !== 'apiKey'),
    credentialReplaced: patch.apiKey !== undefined,
  })

  return jsonResponse({ ok: true, message: 'Connection updated.', connection })
}

async function handleDelete(adminClient: SupabaseClient, userId: string, body: Record<string, unknown>): Promise<Response> {
  if (!isConnectionId(body.connectionId)) {
    return jsonError('A valid connectionId is required.', 400, 'invalid_request')
  }
  await deleteConnection(adminClient, body.connectionId)
  await audit(adminClient, userId, 'connection_deleted', body.connectionId, {})

  let routing: RoutingState | undefined
  try {
    routing = await getRouting(adminClient)
  } catch {
    // Client refetches status; deletion already succeeded.
  }
  return jsonResponse({ ok: true, message: 'Connection deleted.', routing })
}

async function handleActivate(adminClient: SupabaseClient, userId: string, body: Record<string, unknown>): Promise<Response> {
  if (!isConnectionId(body.connectionId)) {
    return jsonError('A valid connectionId is required.', 400, 'invalid_request')
  }
  const routing = await setPrimaryConnection(adminClient, body.connectionId, userId)
  await audit(adminClient, userId, 'connection_activated', body.connectionId, {})
  return jsonResponse({ ok: true, message: 'Connection activated as primary.', routing })
}

/** Loads a saved connection's decrypted config, or resolves an inline target. */
async function resolveTestTarget(
  adminClient: SupabaseClient,
  body: Record<string, unknown>,
): Promise<{ ok: true; config: AdapterConfig; connectionId: string | null } | { ok: false; response: Response }> {
  if (body.connectionId !== undefined) {
    if (!isConnectionId(body.connectionId)) {
      return { ok: false, response: jsonError('A valid connectionId is required.', 400, 'invalid_request') }
    }
    const loaded = await loadConnectionSecret(adminClient, body.connectionId)
    if (!loaded) {
      return {
        ok: false,
        response: jsonError('Connection not found, or its credential cannot be decrypted.', 404, 'not_found'),
      }
    }
    const config = { ...loaded.config }
    const modelOverride = sanitizeModelId(body.model)
    if (modelOverride) config.model = modelOverride
    const blocked = await endpointGuard(config.baseUrl)
    if (blocked) return { ok: false, response: blocked }
    return { ok: true, config, connectionId: body.connectionId }
  }

  const inline = resolveInlineTarget(body)
  if ('response' in inline) return inline
  const blocked = await endpointGuard(inline.target.baseUrl)
  if (blocked) return { ok: false, response: blocked }
  const t = inline.target
  return {
    ok: true,
    connectionId: null,
    config: {
      providerId: t.providerId,
      protocol: t.protocol,
      authScheme: t.authScheme,
      baseUrl: t.baseUrl,
      apiKey: t.apiKey,
      model: t.model,
      timeoutMs: t.timeoutMs,
    },
  }
}

async function handleTest(adminClient: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
  const target = await resolveTestTarget(adminClient, body)
  if ('response' in target) return target.response

  const diagnostics = await testAdapterConnection(target.config)

  if (target.connectionId) {
    try {
      await recordTestResult(adminClient, target.connectionId, diagnostics)
    } catch (err) {
      console.error('[bolu-provider-config] Test result write failed:', err instanceof Error ? err.message : err)
    }
  }

  // A failed provider test is still a successful API operation: HTTP 200 with
  // categorized diagnostics so the UI can render actionable guidance.
  return jsonResponse({ ok: diagnostics.ok, diagnostics })
}

async function handleDiscover(adminClient: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
  const target = await resolveTestTarget(adminClient, body)
  if ('response' in target) return target.response

  const entry = getCatalogueEntry(target.config.providerId)
  if (entry && !entry.supportsDiscovery) {
    return jsonResponse({
      ok: false,
      models: [],
      diagnostics: {
        ok: false,
        status: 0,
        category: 'unknown',
        message: `${entry.name} does not expose a documented model-listing endpoint.`,
        suggestedAction: 'Enter a model identifier manually from the provider documentation.',
        latencyMs: 0,
      },
    })
  }

  const result = await discoverAdapterModels(target.config)

  if (target.connectionId && result.ok) {
    try {
      await cacheDiscoveredModels(adminClient, target.connectionId, result.models)
    } catch (err) {
      console.error('[bolu-provider-config] Model cache write failed:', err instanceof Error ? err.message : err)
    }
  }

  return jsonResponse({ ok: result.ok, models: result.models, diagnostics: result.diagnostics })
}

async function handleSetRouting(adminClient: SupabaseClient, userId: string, body: Record<string, unknown>): Promise<Response> {
  if (typeof body.fallbackEnabled !== 'boolean') {
    return jsonError('fallbackEnabled must be a boolean.', 400, 'invalid_request')
  }
  const rawIds = Array.isArray(body.fallbackConnectionIds) ? body.fallbackConnectionIds : []
  if (rawIds.length > MAX_FALLBACKS) {
    return jsonError(`At most ${MAX_FALLBACKS} fallback connections are allowed.`, 400, 'invalid_request')
  }
  const fallbackConnectionIds: string[] = []
  for (const id of rawIds) {
    if (!isConnectionId(id)) return jsonError('fallbackConnectionIds must contain valid connection ids.', 400, 'invalid_request')
    if (!fallbackConnectionIds.includes(id)) fallbackConnectionIds.push(id)
  }

  const routing = await setRouting(adminClient, { fallbackEnabled: body.fallbackEnabled, fallbackConnectionIds }, userId)
  await audit(adminClient, userId, 'routing_updated', null, {
    fallbackEnabled: routing.fallbackEnabled,
    fallbackCount: routing.fallbackConnectionIds.length,
  })
  return jsonResponse({ ok: true, message: 'Routing updated.', routing })
}

async function handleSetGlobalRouting(
  adminClient: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  if (typeof body.routingEnabled !== 'boolean') {
    return jsonError('"routingEnabled" (boolean) is required.', 400, 'invalid_request')
  }
  const routing = await setGlobalRoutingEnabled(adminClient, body.routingEnabled, userId)
  return jsonResponse({
    ok: true,
    message: body.routingEnabled
      ? 'Global provider routing enabled.'
      : 'Global provider routing disabled (emergency shutdown).',
    routing,
  })
}

async function handleSetPool(
  adminClient: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  if (!isConnectionId(body.connectionId)) {
    return jsonError('A valid connectionId is required.', 400, 'invalid_request')
  }
  if (typeof body.inPool !== 'boolean') {
    return jsonError('inPool must be a boolean.', 400, 'invalid_request')
  }
  const connection = await setConnectionPool(adminClient, body.connectionId, body.inPool, userId)
  await audit(adminClient, userId, 'connection_pool_toggled', body.connectionId, { inPool: body.inPool })
  return jsonResponse({
    ok: true,
    message: `Connection ${body.inPool ? 'added to' : 'removed from'} pool.`,
    connection,
  })
}

async function handleSetPriority(
  adminClient: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  if (!isConnectionId(body.connectionId)) {
    return jsonError('A valid connectionId is required.', 400, 'invalid_request')
  }
  const priority = typeof body.priority === 'number' ? Math.floor(body.priority) : NaN
  if (isNaN(priority) || priority < 1 || priority > 1000) {
    return jsonError('priority must be an integer between 1 and 1000.', 400, 'invalid_request')
  }
  const connection = await setConnectionPriority(adminClient, body.connectionId, priority, userId)
  await audit(adminClient, userId, 'connection_priority_updated', body.connectionId, { priority })
  return jsonResponse({ ok: true, message: 'Connection priority updated.', connection })
}

async function handleSyncBalance(
  adminClient: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  if (!isConnectionId(body.connectionId)) {
    return jsonError('A valid connectionId is required.', 400, 'invalid_request')
  }
  const loaded = await loadConnectionSecret(adminClient, body.connectionId)
  if (!loaded) {
    return jsonError('Connection not found or credential cannot be decrypted.', 404, 'not_found')
  }
  const result = await checkUpstreamBalance(
    loaded.config.providerId,
    loaded.config.apiKey,
    loaded.config.baseUrl,
  )
  if (result.supported && result.balanceAmount !== undefined && result.balanceAmount !== null) {
    const updated = await recordBalanceUpdate(adminClient, body.connectionId, {
      amount: result.balanceAmount,
      currency: result.currency || 'USD',
      source: result.source || 'api',
    })
    await audit(adminClient, userId, 'connection_balance_synced', body.connectionId, {
      amount: result.balanceAmount,
      currency: result.currency,
    })
    return jsonResponse({ ok: true, supported: true, balance: result, connection: updated })
  }
  return jsonResponse({
    ok: true,
    supported: result.supported,
    balance: result,
    message: result.error || 'Balance inquiry is not supported by this provider protocol.',
  })
}

async function handleGetRoutingEvents(
  adminClient: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Response> {
  const limit = typeof body.limit === 'number' ? Math.min(100, Math.max(1, Math.floor(body.limit))) : 20
  const connectionId = isConnectionId(body.connectionId) ? body.connectionId : undefined
  const events = await listRoutingEvents(adminClient, limit, connectionId)
  return jsonResponse({ ok: true, events })
}