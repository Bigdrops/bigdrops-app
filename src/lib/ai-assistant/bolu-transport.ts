import type { BoluProviderMessage } from './bolu-provider'
import { createSseParserState, feedSseChunk, flushSseBuffer } from './protocol'
import { supabase } from '@/supabase'
import type { CandidateAlternative } from './routing/bolu-alternative-discovery'
import { ModelUnavailableError } from './bolu-transport-errors'

export interface BoluTimingMetrics {
  completedAt: string
  durationMs: number
  ttftMs?: number | null
  isServerTelemetry: boolean
  source: 'server' | 'client_fallback'
}

export { ModelUnavailableError }

export async function sendBoluProviderRequest(params: {
  messages: BoluProviderMessage[]
  contextFacts?: string
  connectionId?: string | null
  modelId?: string | null
  tenantId?: string | null
  conversationId?: string | null
  signal?: AbortSignal
  onDelta?: (delta: string) => void
  onResponseHeaders?: (headers: { connectionId: string | null; model: string | null; isFallback: boolean }) => void
}): Promise<{
  text: string
  resolvedConnectionId: string | null
  resolvedModel: string | null
  isFallback: boolean
  metrics?: BoluTimingMetrics
}> {
  const startMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const { data, error } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (error || !accessToken) throw new Error('Sign in to use Bolu.')

  const apiBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
  const response = await fetch(`${apiBase}/api/bolu-chat`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: params.messages,
      contextFacts: params.contextFacts ?? '',
      connectionId: params.connectionId ?? undefined,
      modelId: params.modelId ?? undefined,
      tenantId: params.tenantId ?? undefined,
      conversationId: params.conversationId ?? undefined,
    }),
    signal: params.signal,
  })
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string
      code?: string
      failedConnectionId?: string
      failedModelId?: string
      alternatives?: CandidateAlternative[]
    } | null

    if (response.status === 409 && result?.code === 'MODEL_UNAVAILABLE' && Array.isArray(result?.alternatives)) {
      throw new ModelUnavailableError(
        result.error || 'The selected AI model is currently unavailable.',
        result.alternatives,
        result.failedConnectionId,
        result.failedModelId,
      )
    }

    throw new Error(result?.error || 'Bolu is not available right now.')
  }

  const resolvedConnectionId = response.headers.get('X-Bolu-Connection-Id')
  const resolvedModel = response.headers.get('X-Bolu-Model')
  const isFallback = response.headers.get('X-Bolu-Fallback') === 'true'

  if (params.onResponseHeaders) {
    params.onResponseHeaders({
      connectionId: resolvedConnectionId,
      model: resolvedModel,
      isFallback,
    })
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Bolu returned no response stream.')
  const decoder = new TextDecoder()
  const parserState = createSseParserState()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      feedSseChunk(parserState, chunk, params.onDelta)
      if (parserState.isDone) {
        break
      }
    }
    flushSseBuffer(parserState, params.onDelta)
  } finally {
    try {
      reader.releaseLock()
    } catch {}
  }
  const text = parserState.text
  if (!text.trim()) throw new Error('Bolu returned an empty response.')

  const endMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const fallbackDurationMs = Math.max(1, Math.round(endMs - startMs))
  const metrics: BoluTimingMetrics = parserState.serverMetrics
    ? {
        completedAt: parserState.serverMetrics.completedAt,
        durationMs: parserState.serverMetrics.durationMs,
        ttftMs: parserState.serverMetrics.ttftMs ?? null,
        isServerTelemetry: true,
        source: 'server',
      }
    : {
        completedAt: new Date().toISOString(),
        durationMs: fallbackDurationMs,
        ttftMs: null,
        isServerTelemetry: false,
        source: 'client_fallback',
      }

  return { text, resolvedConnectionId, resolvedModel, isFallback, metrics }
}
