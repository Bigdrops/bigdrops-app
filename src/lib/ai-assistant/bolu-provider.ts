export type BoluProviderMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type BoluProviderRequest = {
  userId: string
  messages: BoluProviderMessage[]
  contextFacts?: string
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

export function getBoluProviderConfig(env: Record<string, string | undefined>) {
  const apiKey = env.BOLU_AMD_API_KEY?.trim() ?? ''
  return {
    provider: 'amd' as const,
    endpoint: 'https://developer.amd.com.cn/radeon/api/v1/chat/completions',
    model: 'DeepSeek-V4-Flash',
    apiKey: apiKey || null,
  }
}
