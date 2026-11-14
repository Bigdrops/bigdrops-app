import { supabase } from '@/supabase'
import { safeParseApiResponse } from '@/lib/ai-assistant/safe-api-response'
import type { ProviderAuthScheme, ProviderProtocol } from '@/lib/ai-assistant/provider-catalog'

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
  createdAt: string
  updatedAt: string
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

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Please sign in to manage Bolu provider infrastructure.')
  }
  return { Authorization: `Bearer ${session.access_token}` }
}

async function post<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch('/api/bolu-provider-config', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  const parsed = await safeParseApiResponse<T>(res, action)
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.errorMessage || 'The operation failed.')
  }
  return parsed.data
}

export const boluProviderApi = {
  async getStatus(): Promise<ProviderStatusResponse> {
    const headers = await authHeaders()
    const res = await fetch('/api/bolu-provider-config', { headers })
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
}