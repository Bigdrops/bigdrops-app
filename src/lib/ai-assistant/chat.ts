import { getProviderKey } from './keys'
import { orderedAIProviderRows, type AIProviderRow } from './providerCatalog'
import {
  buildChatRequestBody,
  classifyProviderFailure,
  extractSseText,
  readProviderErrorBody,
  type ChatMessage,
} from './protocol'

export class AIAssistantError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'AIAssistantError'
    this.status = status
  }
}

export type ChatSendResult = {
  text: string
  provider: AIProviderRow
}

async function consumeStream(
  response: Response,
  onDelta?: (delta: string) => void,
): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''

  const handleLine = (line: string) => {
    const delta = extractSseText(line)
    if (!delta) return
    text += delta
    onDelta?.(delta)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    lines.forEach(handleLine)
  }
  if (buffer) handleLine(buffer)
  return text
}

/**
 * Walks the provider rows in catalog order and uses the first one that has a
 * key and answers. A quota, auth or server failure moves to the next row. A
 * bad request stops, because the same request would fail the same way.
 */
export async function sendAssistantChat(params: {
  messages: ChatMessage[]
  onDelta?: (delta: string) => void
  signal?: AbortSignal
}): Promise<ChatSendResult> {
  const rows = orderedAIProviderRows()
  let lastFailure: string | null = null
  let sawKey = false

  for (const row of rows) {
    const key = await getProviderKey(row.id)
    if (!key) continue
    sawKey = true

    let response: Response
    try {
      response = await fetch(`${row.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(buildChatRequestBody(row.model, params.messages)),
        signal: params.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error
      lastFailure = `${row.label} could not be reached. Check the network.`
      continue
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      const message = readProviderErrorBody(body)
      lastFailure = `${row.label}: ${message}`
      if (classifyProviderFailure(response.status) === 'advance') continue
      throw new AIAssistantError(lastFailure, response.status)
    }

    const text = await consumeStream(response, params.onDelta)
    if (!text.trim()) {
      lastFailure = `${row.label} returned an empty answer.`
      continue
    }
    return { text, provider: row }
  }

  if (!sawKey) throw new AIAssistantError('No provider key is set up yet.')
  throw new AIAssistantError(lastFailure || 'Every provider failed. Try again later.')
}
