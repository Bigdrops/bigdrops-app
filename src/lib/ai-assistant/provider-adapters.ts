/**
 * Protocol-aware provider adapters for the Bolu AI subsystem.
 *
 * Two request protocols are supported: OpenAI-compatible chat completions and
 * Anthropic-compatible messages. Authentication is provider-aware (Bearer vs
 * x-api-key). Provider-specific behavior lives here, not in the Bolu runtime.
 *
 * Node-only (outbound fetch). Never import from browser code.
 */

import type { ProviderAuthScheme, ProviderProtocol } from './provider-catalog.js'
import { safeProviderFetch } from './provider-security.js'
import { readProviderErrorBody } from './protocol.js'

export type AdapterConfig = {
  providerId: string
  protocol: ProviderProtocol
  authScheme: ProviderAuthScheme
  baseUrl: string
  apiKey: string
  model: string
  timeoutMs: number
}

export type AdapterMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ProviderErrorCategory =
  | 'provider_auth'
  | 'provider_rate_limit'
  | 'provider_not_found'
  | 'provider_bad_request'
  | 'provider_server'
  | 'network'
  | 'timeout'
  | 'unknown'

export type ProviderDiagnostics = {
  ok: boolean
  status: number
  category: ProviderErrorCategory | 'ok'
  message: string
  suggestedAction: string
  latencyMs: number
  retryAfterSeconds?: number
}

export type DiscoveredModel = {
  id: string
  label: string
  metadata?: Record<string, unknown>
}

const ANTHROPIC_VERSION = '2023-06-01'

function trimBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

/** Normalizes a base URL to a chat endpoint without blind suffix appending. */
export function resolveChatEndpoint(baseUrl: string, protocol: ProviderProtocol): string {
  const base = trimBase(baseUrl)
  if (protocol === 'anthropic') {
    return base.endsWith('/messages') ? base : `${base}/messages`
  }
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`
}

/** Normalizes a base URL to a model-discovery endpoint (both protocols use /models). */
export function resolveModelsEndpoint(baseUrl: string): string {
  let base = trimBase(baseUrl)
  if (base.endsWith('/chat/completions')) base = base.slice(0, -'/chat/completions'.length)
  if (base.endsWith('/messages')) base = base.slice(0, -'/messages'.length)
  return `${base}/models`
}

export function buildAdapterHeaders(config: AdapterConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const key = config.apiKey.trim()

  if (config.authScheme === 'x-api-key') {
    headers['x-api-key'] = key
    if (config.protocol === 'anthropic') headers['anthropic-version'] = ANTHROPIC_VERSION
  } else {
    headers['Authorization'] = `Bearer ${key}`
  }

  if (config.providerId === 'openrouter' || config.baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://bouxre.com'
    headers['X-Title'] = 'BOUXRE Bolu'
  }

  return headers
}

export function buildChatPayload(
  config: AdapterConfig,
  messages: AdapterMessage[],
  opts: { stream: boolean; maxTokens: number; temperature?: number },
): Record<string, unknown> {
  if (config.protocol === 'anthropic') {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
    const turns = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }))
    const payload: Record<string, unknown> = {
      model: config.model,
      messages: turns,
      max_tokens: opts.maxTokens,
      stream: opts.stream,
    }
    if (system) payload.system = system
    if (opts.temperature !== undefined) payload.temperature = opts.temperature
    return payload
  }

  const payload: Record<string, unknown> = {
    model: config.model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: opts.maxTokens,
    stream: opts.stream,
  }
  if (opts.temperature !== undefined) payload.temperature = opts.temperature
  return payload
}

function retryAfterFromHeaders(res: Response): number | undefined {
  const header = res.headers.get('retry-after')
  if (!header) return undefined
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds)
  const date = Date.parse(header)
  if (!Number.isNaN(date)) return Math.max(0, Math.round((date - Date.now()) / 1000))
  return undefined
}

export function classifyProviderFailure(
  status: number,
  bodyText: string,
): { category: ProviderErrorCategory; message: string; suggestedAction: string } {
  const detail = readProviderErrorBody(bodyText)
  if (status === 401 || status === 403) {
    return {
      category: 'provider_auth',
      message: `Provider rejected the credential (HTTP ${status}). ${detail}`.trim(),
      suggestedAction: 'Verify the API key is correct, active, and authorized for this endpoint.',
    }
  }
  if (status === 404) {
    return {
      category: 'provider_not_found',
      message: `Model or endpoint not found (HTTP 404). ${detail}`.trim(),
      suggestedAction: 'Check the model identifier and base URL. Use model discovery to list valid models.',
    }
  }
  if (status === 410) {
    return {
      category: 'provider_not_found',
      message: `Model or endpoint is retired (HTTP 410). ${detail}`.trim(),
      suggestedAction: 'The model reached end of life. Pick a current model from the provider list, or run model discovery.',
    }
  }
  if (status === 429) {
    return {
      category: 'provider_rate_limit',
      message: `Provider rate-limited the request (HTTP 429). ${detail}`.trim(),
      suggestedAction: 'Wait for the rate limit to reset, or reduce request frequency.',
    }
  }
  if (status === 400 || status === 422) {
    return {
      category: 'provider_bad_request',
      message: `Provider rejected the request parameters (HTTP ${status}). ${detail}`.trim(),
      suggestedAction: 'Check the model identifier, protocol, and request parameters.',
    }
  }
  if (status >= 500) {
    return {
      category: 'provider_server',
      message: `Provider server error (HTTP ${status}). ${detail}`.trim(),
      suggestedAction: 'The provider is unavailable. Retry shortly or switch to another configured connection.',
    }
  }
  return {
    category: 'unknown',
    message: `Provider returned HTTP ${status}. ${detail}`.trim(),
    suggestedAction: 'Review the provider documentation and connection configuration.',
  }
}

function networkDiagnostics(err: unknown, latencyMs: number): ProviderDiagnostics {
  const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')
  if (isTimeout) {
    return {
      ok: false,
      status: 504,
      category: 'timeout',
      message: 'The provider request timed out.',
      suggestedAction: 'Verify the base URL and network connectivity, or increase the timeout.',
      latencyMs,
    }
  }
  return {
    ok: false,
    status: 502,
    category: 'network',
    message: 'Could not reach the provider endpoint.',
    suggestedAction: 'Check the base URL, DNS resolution, and outbound network access.',
    latencyMs,
  }
}

/** Lightweight verification completion. Measures real latency. */
export async function testAdapterConnection(config: AdapterConfig): Promise<ProviderDiagnostics> {
  const endpoint = resolveChatEndpoint(config.baseUrl, config.protocol)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 20000)
  const started = Date.now()

  try {
    const res = await safeProviderFetch(endpoint, {
      method: 'POST',
      headers: buildAdapterHeaders(config),
      body: JSON.stringify(
        buildChatPayload(config, [{ role: 'user', content: 'ping' }], {
          stream: false,
          maxTokens: config.protocol === 'anthropic' ? 16 : 5,
        }),
      ),
      signal: controller.signal,
    })
    const latencyMs = Date.now() - started

    if (res.ok) {
      return {
        ok: true,
        status: res.status,
        category: 'ok',
        message: 'Provider connection verified. The model responded.',
        suggestedAction: 'No action required.',
        latencyMs,
      }
    }

    const body = await res.text().catch(() => '')
    const failure = classifyProviderFailure(res.status, body)
    return {
      ok: false,
      status: res.status,
      ...failure,
      latencyMs,
      retryAfterSeconds: res.status === 429 ? retryAfterFromHeaders(res) : undefined,
    }
  } catch (err) {
    return networkDiagnostics(err, Date.now() - started)
  } finally {
    clearTimeout(timeout)
  }
}

export function normalizeModelEntry(raw: unknown): DiscoveredModel | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const id = typeof record.id === 'string' ? record.id.trim() : ''
  if (!id) return null
  const label = typeof record.display_name === 'string' && record.display_name.trim()
    ? record.display_name.trim()
    : typeof record.name === 'string' && record.name.trim()
      ? record.name.trim()
      : id
  const metadata: Record<string, unknown> = {}
  for (const field of [
    'created',
    'owned_by',
    'type',
    'object',
    'context_length',
    'description',
    'pricing',
    'architecture',
    'top_provider',
    'per_request_limits',
  ]) {
    if (record[field] !== undefined) metadata[field] = record[field]
  }
  return { id, label, metadata: Object.keys(metadata).length > 0 ? metadata : undefined }
}

/** Queries the provider's real model endpoint and normalizes identifiers. */
export async function discoverAdapterModels(
  config: AdapterConfig,
): Promise<{ ok: boolean; models: DiscoveredModel[]; diagnostics: ProviderDiagnostics }> {
  const endpoint = resolveModelsEndpoint(config.baseUrl)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 20000)
  const started = Date.now()

  try {
    const res = await safeProviderFetch(endpoint, {
      method: 'GET',
      headers: buildAdapterHeaders(config),
      signal: controller.signal,
    })
    const latencyMs = Date.now() - started

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const failure = classifyProviderFailure(res.status, body)
      return {
        ok: false,
        models: [],
        diagnostics: { ok: false, status: res.status, ...failure, latencyMs },
      }
    }

    const text = await res.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return {
        ok: false,
        models: [],
        diagnostics: {
          ok: false,
          status: res.status,
          category: 'unknown',
          message: 'Model discovery returned a non-JSON response.',
          suggestedAction: 'Verify the endpoint supports model listing, or enter a model identifier manually.',
          latencyMs,
        },
      }
    }

    const record = parsed as Record<string, unknown>
    const list = Array.isArray(record.data) ? record.data : Array.isArray(record.models) ? record.models : []
    const models = list
      .map(normalizeModelEntry)
      .filter((m): m is DiscoveredModel => m !== null)
      .sort((a, b) => a.id.localeCompare(b.id))

    return {
      ok: true,
      models,
      diagnostics: {
        ok: true,
        status: res.status,
        category: 'ok',
        message: `Discovered ${models.length} model${models.length === 1 ? '' : 's'}.`,
        suggestedAction: 'Select a model for this connection.',
        latencyMs,
      },
    }
  } catch (err) {
    return { ok: false, models: [], diagnostics: networkDiagnostics(err, Date.now() - started) }
  } finally {
    clearTimeout(timeout)
  }
}

function sseResponse(body: BodyInit | null): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

function openAiDeltaEvent(text: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`
}

function bufferedToSse(text: string, usage?: unknown): Response {
  const delta = openAiDeltaEvent(text)
  // Preserve the provider's usage block so the caller can account for the
  // request even when the provider answered without streaming.
  if (usage && typeof usage === 'object') {
    const payload = JSON.parse(delta.slice('data: '.length).trim()) as Record<string, unknown>
    payload.usage = usage
    return sseResponse(`data: ${JSON.stringify(payload)}\n\ndata: [DONE]\n\n`)
  }
  return sseResponse(`${delta}data: [DONE]\n\n`)
}

/** Translates an Anthropic SSE stream into OpenAI-style delta events. */
function transformAnthropicStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader()
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const payload = trimmed.slice(5).trim()
            if (!payload || payload === '[DONE]') continue
            try {
              const event = JSON.parse(payload) as Record<string, unknown>
              const type = event.type
              if (type === 'content_block_delta') {
                const delta = event.delta as Record<string, unknown> | undefined
                const text = delta?.text
                if (typeof text === 'string' && text.length > 0) {
                  controller.enqueue(encoder.encode(openAiDeltaEvent(text)))
                }
              } else if (type === 'message_stop') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              }
            } catch {
              // Ignore malformed event lines.
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.error(err)
      } finally {
        reader.releaseLock()
      }
    },
  })
}

export type StreamResult =
  | { ok: true; response: Response; requestStartedAt: number }
  | { ok: false; diagnostics: ProviderDiagnostics }

/**
 * Opens a streaming chat completion and normalizes the response to OpenAI-style
 * SSE so the existing Bolu client transport keeps working across protocols.
 */
export async function streamAdapterChat(
  config: AdapterConfig,
  messages: AdapterMessage[],
  opts: { maxTokens: number; temperature?: number; signal?: AbortSignal },
): Promise<StreamResult> {
  const endpoint = resolveChatEndpoint(config.baseUrl, config.protocol)
  const started = Date.now()

  let res: Response
  try {
    res = await safeProviderFetch(endpoint, {
      method: 'POST',
      headers: buildAdapterHeaders(config),
      body: JSON.stringify(
        buildChatPayload(config, messages, {
          stream: true,
          maxTokens: opts.maxTokens,
          temperature: opts.temperature,
        }),
      ),
      signal: opts.signal,
    })
  } catch (err) {
    return { ok: false, diagnostics: networkDiagnostics(err, Date.now() - started) }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const failure = classifyProviderFailure(res.status, body)
    return {
      ok: false,
      diagnostics: {
        ok: false,
        status: res.status,
        ...failure,
        latencyMs: Date.now() - started,
        retryAfterSeconds: res.status === 429 ? retryAfterFromHeaders(res) : undefined,
      },
    }
  }

  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('text/event-stream')) {
    if (!res.body) {
      return {
        ok: false,
        diagnostics: {
          ok: false,
          status: 502,
          category: 'unknown',
          message: 'Provider returned an empty stream body.',
          suggestedAction: 'Retry the request.',
          latencyMs: Date.now() - started,
        },
      }
    }
    if (config.protocol === 'anthropic') {
      return { ok: true, response: sseResponse(transformAnthropicStream(res.body)), requestStartedAt: started }
    }
    return { ok: true, response: sseResponse(res.body), requestStartedAt: started }
  }

  if (contentType.includes('application/json')) {
    const text = await res.text().catch(() => '')
    try {
      const data = JSON.parse(text) as Record<string, unknown>
      if (config.protocol === 'anthropic') {
        const content = Array.isArray(data.content) ? (data.content as Array<Record<string, unknown>>) : []
        const out = content.map((block) => (typeof block.text === 'string' ? block.text : '')).join('')
        return { ok: true, response: bufferedToSse(out), requestStartedAt: started }
      }
      const choices = Array.isArray(data.choices) ? (data.choices as Array<Record<string, unknown>>) : []
      const message = choices[0]?.message as Record<string, unknown> | undefined
      const out = typeof message?.content === 'string' ? message.content : ''
      return { ok: true, response: bufferedToSse(out, data.usage), requestStartedAt: started }
    } catch {
      return {
        ok: false,
        diagnostics: {
          ok: false,
          status: 502,
          category: 'unknown',
          message: 'Failed to parse the provider response.',
          suggestedAction: 'Retry the request.',
          latencyMs: Date.now() - started,
        },
      }
    }
  }

  return {
    ok: false,
    diagnostics: {
      ok: false,
      status: 502,
      category: 'unknown',
      message: 'Unsupported provider content-type.',
      suggestedAction: 'Verify the endpoint is a chat completions or messages API.',
      latencyMs: Date.now() - started,
    },
  }
}