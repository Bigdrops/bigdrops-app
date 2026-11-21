import type { BoluProviderMessage } from './bolu-provider'
import { extractSseText } from './protocol'
import { supabase } from '@/supabase'
import type { CandidateAlternative } from './routing/bolu-alternative-discovery'
import { ModelUnavailableError } from './bolu-transport-errors'

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
}): Promise<{ text: string; resolvedConnectionId: string | null; resolvedModel: string | null; isFallback: boolean }> {
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
  let buffer = ''
  let text = ''
  let isDone = false
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed === 'data: [DONE]' || trimmed === '[DONE]') {
          isDone = true
          break
        }
        const delta = extractSseText(line)
        if (delta) {
          text += delta
          params.onDelta?.(delta)
        }
      }
      if (isDone) break
    }
    if (buffer && !isDone) {
      const trimmed = buffer.trim()
      if (trimmed !== 'data: [DONE]' && trimmed !== '[DONE]') {
        const delta = extractSseText(buffer)
        if (delta) {
          text += delta
          params.onDelta?.(delta)
        }
      }
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {}
  }
  if (!text.trim()) throw new Error('Bolu returned an empty response.')
  return { text, resolvedConnectionId, resolvedModel, isFallback }
}
