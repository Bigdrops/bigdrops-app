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

const MAX_MESSAGES = 24
const MAX_MESSAGE_LENGTH = 4000
const MAX_TOTAL_LENGTH = 12000
const MAX_FACTS_LENGTH = 8000

export function validateBoluProviderRequest(input: BoluProviderRequest): {
  ok: boolean
  messages: BoluProviderMessage[]
  contextFacts: string
} {
  if (!input.userId || !Array.isArray(input.messages) || input.messages.length === 0 || input.messages.length > MAX_MESSAGES) {
    return { ok: false, messages: [], contextFacts: '' }
  }

  const messages: BoluProviderMessage[] = []
  let totalLength = 0
  for (const message of input.messages) {
    if (
      !message ||
      (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.content !== 'string' ||
      !message.content.trim() ||
      message.content.length > MAX_MESSAGE_LENGTH
    ) {
      return { ok: false, messages: [], contextFacts: '' }
    }
    totalLength += message.content.length
    if (totalLength > MAX_TOTAL_LENGTH) return { ok: false, messages: [], contextFacts: '' }
    messages.push({ role: message.role, content: message.content.trim() })
  }

  const contextFacts = input.contextFacts?.trim() ?? ''
  if (contextFacts.length > MAX_FACTS_LENGTH) return { ok: false, messages: [], contextFacts: '' }
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
    headers['HTTP-Referer'] = 'https://bourxe.com'
    headers['X-Title'] = 'BOURXE Bolu'
  }
  return headers
}

// Re-export routing engine contracts from the dedicated routing subsystem
export * from './routing/bolu-provider-catalog'
export * from './routing/bolu-error-classifier'
export * from './routing/bolu-policy-router'
export * from './routing/bolu-balance-sync'
export * from './routing/bolu-account-pool'
