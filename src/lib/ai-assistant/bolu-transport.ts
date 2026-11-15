import type { BoluProviderMessage } from './bolu-provider'
import { extractSseText } from './protocol'
import { supabase } from '@/supabase'

export async function sendBoluProviderRequest(params: {
  messages: BoluProviderMessage[]
  contextFacts?: string
  connectionId?: string | null
  modelId?: string | null
  tenantId?: string | null
  conversationId?: string | null
  signal?: AbortSignal
  onDelta?: (delta: string) => void
}): Promise<{ text: string }> {
  const { data, error } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (error || !accessToken) throw new Error('Sign in to use Bolu.')

  const response = await fetch('/api/bolu-chat', {
    method: 'POST',
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
    const result = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(result?.error || 'Bolu is not available right now.')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Bolu returned no response stream.')
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const delta = extractSseText(line)
      if (delta) {
        text += delta
        params.onDelta?.(delta)
      }
    }
  }
  if (buffer) {
    const delta = extractSseText(buffer)
    if (delta) {
      text += delta
      params.onDelta?.(delta)
    }
  }
  if (!text.trim()) throw new Error('Bolu returned an empty response.')
  return { text }
}
