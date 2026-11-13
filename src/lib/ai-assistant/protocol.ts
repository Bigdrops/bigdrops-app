/**
 * Pure helpers for the assistant's network layer. No imports, so a test can
 * load this file without a browser or a native shell.
 */

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type ChatRequestBody = {
  model: string
  messages: ChatMessage[]
  stream: true
  max_tokens: number
}

export const AI_CHAT_MAX_TOKENS = 700

/**
 * The request carries only the parameters the accepted set allows:
 * model, messages, stream and max_tokens. No seed, stop, logprobs or penalties.
 */
export function buildChatRequestBody(model: string, messages: ChatMessage[]): ChatRequestBody {
  return {
    model,
    messages: messages.map((message) => ({ role: message.role, content: message.content })),
    stream: true,
    max_tokens: AI_CHAT_MAX_TOKENS,
  }
}

export type ProviderFailureAction = 'advance' | 'stop'

/**
 * A quota, rate limit, auth or server failure moves to the next provider.
 * A bad request does not, because the same request fails the same way there.
 */
export function classifyProviderFailure(status: number): ProviderFailureAction {
  if (status === 429) return 'advance'
  if (status === 401 || status === 403) return 'advance'
  if (status === 404) return 'advance'
  if (status >= 500) return 'advance'
  return 'stop'
}

/** One `data:` line of a server sent event. Returns null when it carries no text. */
export function extractSseText(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return null
  const payload = trimmed.slice(5).trim()
  if (!payload || payload === '[DONE]') return null
  try {
    const parsed: unknown = JSON.parse(payload)
    if (!parsed || typeof parsed !== 'object') return null
    const choices = (parsed as { choices?: unknown }).choices
    if (!Array.isArray(choices) || choices.length === 0) return null
    const first = choices[0] as { delta?: { content?: unknown }; message?: { content?: unknown } }
    const content = first?.delta?.content ?? first?.message?.content
    return typeof content === 'string' && content.length > 0 ? content : null
  } catch {
    return null
  }
}

/** Only the last four characters are ever shown. */
export function maskKey(key: string): string {
  const trimmed = key.trim()
  if (!trimmed) return ''
  if (trimmed.length <= 8) return '••••'
  return `••••${trimmed.slice(-4)}`
}

export type ProviderErrorDetail = {
  status: number
  message: string
}

/** Reads the message from a provider error body without leaking the key. */
export function readProviderErrorBody(raw: string): string {
  const text = raw.trim()
  if (!text) return 'The provider returned no message.'
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>
      const errorValue = record.error
      if (typeof errorValue === 'string' && errorValue) return errorValue
      if (errorValue && typeof errorValue === 'object') {
        const message = (errorValue as Record<string, unknown>).message
        if (typeof message === 'string' && message) return message
      }
      const message = record.message
      if (typeof message === 'string' && message) return message
    }
  } catch {
    // A plain text or HTML body. Fall through and clip it.
  }
  return text.length > 240 ? `${text.slice(0, 240)}…` : text
}
