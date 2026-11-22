export type BoluProviderMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type BoluProviderRequest = {
  userId: string
  messages: BoluProviderMessage[]
  contextFacts?: string
}

export type BoluProviderConfig = {
  provider: string
  baseUrl: string
  endpoint: string
  model: string
  apiKey: string | null
  timeoutMs: number
  mode: 'live' | 'mock'
  isConfigured: boolean
}

export const MAX_MESSAGES = 24
export const MAX_MESSAGE_LENGTH = 32000
export const MAX_TOTAL_LENGTH = 64000
export const MAX_FACTS_LENGTH = 32000

export type BoluValidationErrorReason =
  | 'invalid_user'
  | 'invalid_messages_shape'
  | 'message_count_exceeded'
  | 'message_empty'
  | 'message_invalid_role'
  | 'message_too_long'
  | 'aggregate_too_long'
  | 'context_facts_too_long'

export type BoluValidationResult =
  | {
      ok: true
      messages: BoluProviderMessage[]
      contextFacts: string
    }
  | {
      ok: false
      messages: []
      contextFacts: ''
      error: string
      code: BoluValidationErrorReason
    }

export function validateBoluProviderRequest(input: BoluProviderRequest): BoluValidationResult {
  if (!input.userId) {
    return {
      ok: false,
      messages: [],
      contextFacts: '',
      error: 'Authentication required. User ID is missing.',
      code: 'invalid_user',
    }
  }
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    return {
      ok: false,
      messages: [],
      contextFacts: '',
      error: 'Messages payload must be a non-empty array.',
      code: 'invalid_messages_shape',
    }
  }
  if (input.messages.length > MAX_MESSAGES) {
    return {
      ok: false,
      messages: [],
      contextFacts: '',
      error: `Message count exceeds the limit of ${MAX_MESSAGES} messages.`,
      code: 'message_count_exceeded',
    }
  }

  const messages: BoluProviderMessage[] = []
  let totalLength = 0
  for (let i = 0; i < input.messages.length; i++) {
    const message = input.messages[i]
    if (!message || typeof message.content !== 'string' || !message.content.trim()) {
      return {
        ok: false,
        messages: [],
        contextFacts: '',
        error: `Message ${i + 1} content cannot be empty.`,
        code: 'message_empty',
      }
    }
    if (message.role !== 'user' && message.role !== 'assistant') {
      return {
        ok: false,
        messages: [],
        contextFacts: '',
        error: `Message ${i + 1} role is invalid. Role must be user or assistant.`,
        code: 'message_invalid_role',
      }
    }
    if (message.content.length > MAX_MESSAGE_LENGTH) {
      return {
        ok: false,
        messages: [],
        contextFacts: '',
        error: `Message ${i + 1} exceeds the limit of ${MAX_MESSAGE_LENGTH.toLocaleString('en-US')} characters.`,
        code: 'message_too_long',
      }
    }
    totalLength += message.content.length
    if (totalLength > MAX_TOTAL_LENGTH) {
      return {
        ok: false,
        messages: [],
        contextFacts: '',
        error: `Conversation history exceeds the aggregate limit of ${MAX_TOTAL_LENGTH.toLocaleString('en-US')} characters.`,
        code: 'aggregate_too_long',
      }
    }
    messages.push({ role: message.role, content: message.content.trim() })
  }

  const contextFacts = input.contextFacts?.trim() ?? ''
  if (contextFacts.length > MAX_FACTS_LENGTH) {
    return {
      ok: false,
      messages: [],
      contextFacts: '',
      error: `Context facts exceed the limit of ${MAX_FACTS_LENGTH.toLocaleString('en-US')} characters.`,
      code: 'context_facts_too_long',
    }
  }
  return { ok: true, messages, contextFacts }
}

/**
 * Normalizes an OpenAI-compatible base URL into a chat completions endpoint.
 * E.g. "https://openrouter.ai/api/v1" -> "https://openrouter.ai/api/v1/chat/completions"
 */
export function normalizeChatEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (trimmed.endsWith('/chat/completions')) return trimmed
  return `${trimmed}/chat/completions`
}

/**
 * Extracts and validates server-side AI provider configuration.
 * Secrets remain on the server; never expose them to browser clients.
 */
export function getBoluProviderConfig(env: Record<string, string | undefined>): BoluProviderConfig {
  const apiKey = env.BOLU_PROVIDER_API_KEY?.trim() || env.BOLU_AMD_API_KEY?.trim() || ''
  const inferredProvider = (env.BOLU_AMD_API_KEY?.trim() || apiKey.startsWith('rc-')) ? 'amd' : 'openrouter'
  const providerName = env.BOLU_PROVIDER_NAME?.trim() || inferredProvider
  const defaultBaseUrl = providerName === 'amd'
    ? 'https://developer.amd.com.cn/radeon/api/v1'
    : 'https://openrouter.ai/api/v1'
  const baseUrl = env.BOLU_PROVIDER_BASE_URL?.trim() || defaultBaseUrl
  const defaultModel = providerName === 'amd' ? 'DeepSeek-V4-Flash' : 'openrouter/free'
  const modelId = env.BOLU_PROVIDER_MODEL?.trim() || defaultModel
  const parsedTimeout = Number(env.BOLU_PROVIDER_TIMEOUT_MS)
  const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout >= 5000 && parsedTimeout <= 120000
    ? parsedTimeout
    : 45000
  const mode = env.BOLU_PROVIDER_MODE?.trim() === 'mock' ? 'mock' : 'live'

  return {
    provider: providerName,
    baseUrl,
    endpoint: normalizeChatEndpoint(baseUrl),
    model: modelId,
    apiKey: apiKey || null,
    timeoutMs,
    mode,
    isConfigured: Boolean(apiKey) || mode === 'mock',
  }
}

/**
 * Constructs provider-compatible request headers.
 */
export function buildProviderHeaders(config: BoluProviderConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }
  if (config.provider === 'openrouter' || config.baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://bouxre.com'
    headers['X-Title'] = 'BOUXRE Bolu'
  }
  return headers
}

// Re-export routing engine contracts from the dedicated routing subsystem
export * from './routing/bolu-provider-catalog.js'
export * from './routing/bolu-error-classifier.js'
export * from './routing/bolu-policy-router.js'
export * from './routing/bolu-balance-sync.js'
export * from './routing/bolu-account-pool.js'
