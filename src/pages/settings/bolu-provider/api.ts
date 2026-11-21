import { supabase } from '@/supabase'
import { safeParseApiResponse } from '@/lib/ai-assistant/safe-api-response'
import type { ProviderAuthScheme, ProviderProtocol } from '@/lib/ai-assistant/provider-catalog'
import { isNativePlatform } from '@/lib/native/capacitor'

const DEFAULT_NATIVE_API_URL = 'https://bourxe-api.cloudzyro.app'

/**
 * Resolves the backend API base URL, stripping any trailing slash.
 * On native Capacitor (Android/iOS), if VITE_API_URL is unset, falls back to the
 * production Cloudzyro backend rather than calling a bare relative /api path that
 * would resolve against the local WebView (http://localhost) and return index.html.
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
  if (envUrl) {
    return envUrl
  }
  if (typeof isNativePlatform === 'function' && isNativePlatform()) {
    return DEFAULT_NATIVE_API_URL
  }
  return ''
}

export function getEndpointUrl(path: string): string {
  const base = getApiBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

export type DiscoveredModel = {
  id: string
  label: string
  metadata?: Record<string, unknown>
}

export type ProviderDiagnostics = {
  ok: boolean
  status: number
  category: string
  message: string
  suggestedAction: string
  latencyMs: number
  retryAfterSeconds?: number
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
  // Multi-account routing & pool telemetry
  allowedModels: string[]
  metadata?: { enabledModels?: string[]; [key: string]: unknown }
  inPool: boolean
  priority: number
  isPaidTier: boolean
  healthStatus: 'healthy' | 'cooling_down' | 'exhausted' | 'quarantined' | 'unknown'
  accountCooldownUntil: string | null
  modelCooldowns: Record<string, string>
  consecutiveFailures: number
  lastErrorCode: string | null
  lastErrorMessage: string | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastSelectedAt: string | null
  totalSelections: number
  totalRequestsStarted: number
  totalSuccessfulRequests: number
  totalTokens: number
  knownBalanceAmount: number | null
  knownBalanceCurrency: string
  knownBalanceUsd: number | null
  balanceSource: 'api' | 'unsupported'
  balanceUpdatedAt: string | null
  createdAt: string
  updatedAt: string
}

export type RoutingEventRecord = {
  id: string
  created_at: string
  connection_id: string | null
  provider_id: string | null
  model_id: string | null
  event_type: string
  failure_category: string | null
  failure_scope: string | null
  http_status: number | null
  cooldown_seconds: number | null
  reason_summary: string | null
}

export type PoolSummary = {
  totalCount: number
  inPoolCount: number
  healthyCount: number
  coolingDownCount: number
  exhaustedCount: number
  quarantinedCount: number
}

export type RoutingState = {
  primaryConnectionId: string | null
  fallbackEnabled: boolean
  fallbackConnectionIds: string[]
}

export type RuntimeInfo = {
  source: 'connection' | 'legacy' | 'environment' | 'unconfigured'
  primaryConnectionId: string | null
  provider: string | null
  model: string | null
}

export type LegacyStatus = {
  configured: boolean
  provider?: string
  model?: string
  baseUrl?: string
  timeoutMs?: number
  maskedKey?: string
  status?: string
  updatedAt?: string
}

export type ProviderStatusResponse = {
  connections: PublicConnection[]
  routing: RoutingState
  schemaReady: boolean
  poolSummary?: PoolSummary
  routingEvents?: RoutingEventRecord[]
  runtime: RuntimeInfo
  inApp: LegacyStatus
  activeSource: string
  envFallback: {
    configured: boolean
    provider?: string
    model?: string
    maskedKey?: string | null
  }
}

export type CreateConnectionInput = {
  providerId: string
  name?: string
  baseUrl?: string
  protocol?: ProviderProtocol
  authScheme?: ProviderAuthScheme
  apiKey: string
  model?: string
  timeoutMs?: number
  priority?: number
  inPool?: boolean
  allowedModels?: string[]
  metadata?: { enabledModels?: string[]; [key: string]: unknown }
  isPaidTier?: boolean
}

export type UpdateConnectionInput = {
  name?: string
  baseUrl?: string
  protocol?: ProviderProtocol
  authScheme?: ProviderAuthScheme
  apiKey?: string
  model?: string
  timeoutMs?: number
  isEnabled?: boolean
  priority?: number
  inPool?: boolean
  allowedModels?: string[]
  metadata?: { enabledModels?: string[]; [key: string]: unknown }
  isPaidTier?: boolean
}

export type TestTarget =
  | { connectionId: string; model?: string }
  | {
      providerId: string
      apiKey: string
      baseUrl?: string
      protocol?: ProviderProtocol
      authScheme?: ProviderAuthScheme
      model?: string
      timeoutMs?: number
    }

export interface FetchRetryOptions extends RequestInit {
  timeoutMs?: number
  maxRetries?: number
  retryDelays?: number[]
}

const DEFAULT_FETCH_TIMEOUT_MS = 15000
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_RETRY_DELAYS = [400, 1000, 2000]

export function isTransientNetworkError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      return true
    }
    const msg = err.message.toLowerCase()
    return (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('load failed') ||
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      msg.includes('econnreset')
    )
  }
  return false
}

export function isTransientResponseStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504
}

/**
 * Resilient fetch utility with bounded automatic retries and per-attempt timeout
 * to handle serverless cold starts and transient network glitches.
 */
export async function fetchWithRetry(
  url: string,
  fetchInit: RequestInit = {},
  options: FetchRetryOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const retryDelays = options.retryDelays ?? DEFAULT_RETRY_DELAYS

  let lastError: unknown = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
    }, timeoutMs)

    // Merge external abort signal if present
    if (fetchInit.signal) {
      if (fetchInit.signal.aborted) {
        clearTimeout(timer)
        throw new DOMException('Aborted', 'AbortError')
      }
      fetchInit.signal.addEventListener('abort', () => controller.abort())
    }

    try {
      const res = await fetch(url, {
        ...fetchInit,
        signal: controller.signal,
      })
      clearTimeout(timer)

      // If serverless container is warming up (502/503/504), retry with backoff
      if (attempt < maxRetries && isTransientResponseStatus(res.status)) {
        const delay = retryDelays[attempt] ?? 2000
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      return res
    } catch (err: unknown) {
      clearTimeout(timer)
      lastError = err

      // Do not retry if caller explicitly aborted
      if (fetchInit.signal?.aborted) {
        throw err
      }

      // Retry on transient network drops or per-attempt cold-start timeouts
      if (attempt < maxRetries && isTransientNetworkError(err)) {
        const delay = retryDelays[attempt] ?? 2000
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // If timed out after all retries, provide a clear, actionable message
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
        throw new Error(`Connection timed out after ${timeoutMs / 1000}s. Bolu backend may be starting up.`)
      }
      throw err
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to fetch from Bolu backend.')
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data, error } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (error || !token) {
    throw new Error('Please sign in to manage Bolu provider infrastructure.')
  }
  return { Authorization: `Bearer ${token}` }
}

async function post<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const headers = await authHeaders()
  const res = await fetchWithRetry(
    getEndpointUrl('/api/bolu-provider-config'),
    {
      method: 'POST',
      credentials: 'include',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    },
    {
      timeoutMs: 15000,
      maxRetries: 2,
      retryDelays: [500, 1500],
    },
  )
  const parsed = await safeParseApiResponse<T>(res, action)
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.errorMessage || 'The operation failed.')
  }
  return parsed.data
}

export const boluProviderApi = {
  async getStatus(): Promise<ProviderStatusResponse> {
    const headers = await authHeaders()
    const res = await fetchWithRetry(
      getEndpointUrl('/api/bolu-provider-config'),
      {
        credentials: 'include',
        headers,
      },
      {
        timeoutMs: 15000,
        maxRetries: 3,
        retryDelays: [400, 1000, 2000],
      },
    )
    const parsed = await safeParseApiResponse<ProviderStatusResponse>(res, 'Status check')
    if (!parsed.ok || !parsed.data) {
      throw new Error(parsed.errorMessage || 'Failed to load provider status.')
    }
    return parsed.data
  },

  create(input: CreateConnectionInput) {
    return post<{ ok: boolean; message: string; connection: PublicConnection }>('create', { ...input })
  },

  update(connectionId: string, patch: UpdateConnectionInput) {
    return post<{ ok: boolean; message: string; connection: PublicConnection }>('update', { connectionId, ...patch })
  },

  remove(connectionId: string) {
    return post<{ ok: boolean; message: string; routing?: RoutingState }>('delete', { connectionId })
  },

  activate(connectionId: string) {
    return post<{ ok: boolean; message: string; routing: RoutingState }>('activate', { connectionId })
  },

  test(target: TestTarget) {
    return post<{ ok: boolean; diagnostics: ProviderDiagnostics }>('test', { ...target })
  },

  discover(target: TestTarget) {
    return post<{ ok: boolean; models: DiscoveredModel[]; diagnostics: ProviderDiagnostics }>('discover', { ...target })
  },

  setRouting(fallbackEnabled: boolean, fallbackConnectionIds: string[]) {
    return post<{ ok: boolean; message: string; routing: RoutingState }>('set_routing', {
      fallbackEnabled,
      fallbackConnectionIds,
    })
  },

  setPool(connectionId: string, inPool: boolean) {
    return post<{ ok: boolean; message: string; connection: PublicConnection }>('set_pool', {
      connectionId,
      inPool,
    })
  },

  setPriority(connectionId: string, priority: number) {
    return post<{ ok: boolean; message: string; connection: PublicConnection }>('set_priority', {
      connectionId,
      priority,
    })
  },

  syncBalance(connectionId: string) {
    return post<{
      ok: boolean
      supported: boolean
      message?: string
      balance?: {
        balanceAmount?: number | null
        currency?: string
        balanceUsd: number | null
        source: string
      }
      connection?: PublicConnection
    }>('sync_balance', { connectionId })
  },

  getRoutingEvents(limit = 20, connectionId?: string) {
    return post<{ ok: boolean; events: RoutingEventRecord[] }>('get_routing_events', {
      limit,
      connectionId,
    })
  },
}