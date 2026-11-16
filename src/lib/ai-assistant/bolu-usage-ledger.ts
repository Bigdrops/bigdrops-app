/**
 * bolu-usage-ledger.ts — AI consumption capture.
 *
 * Records what every user actually consumes from the shared provider pool:
 * request identity, tenant, provider, model, tokens and cost.
 *
 * Design constraints:
 * - Never blocks or slows the chat response. The ledger write happens after
 *   the upstream stream ends and is fire-and-forget.
 * - Never changes the outbound provider request. Usage is read from the
 *   response when the provider reports it, and estimated locally when it does
 *   not. The estimate is always labelled, never presented as a provider count.
 * - Cost is null when the price is unknown. Zero never means "unknown".
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type TokenSource = 'provider' | 'estimated' | 'unavailable'

export type UsageCounts = {
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  source: TokenSource
}

export type UsageEntry = {
  tenantId?: string | null
  userId?: string | null
  userEmail?: string | null
  conversationId?: string | null
  providerId: string
  modelId: string
  connectionId?: string | null
  isPaidTier?: boolean
  counts: UsageCounts
  costUsd: number | null
  costCurrency: string
  success: boolean
  latencyMs?: number | null
  /** Milliseconds from the upstream request leaving until the first content token. */
  ttftMs?: number | null
  /** Milliseconds between the first and the last generated content token. */
  generationMs?: number | null
  /** Generated tokens per second over the generation window. */
  tokensPerSecond?: number | null
}

/** Measured speed of one streamed completion. */
export type StreamMetrics = {
  ttftMs: number | null
  generationMs: number | null
  tokensPerSecond: number | null
}

/**
 * Computes time to first token and generation speed from stream timestamps.
 *
 * TTFT is measured from the moment the upstream request was sent. The
 * generation speed uses the window between the first and the last content
 * token, because the total request time also carries prompt processing and
 * the wait for the response headers. A missing or unusable measurement
 * returns null, never a fabricated number.
 */
export function computeStreamMetrics(params: {
  requestStartedAtMs: number | null
  firstContentAtMs: number | null
  lastContentAtMs: number | null
  completionTokens: number | null
}): StreamMetrics {
  const { requestStartedAtMs, firstContentAtMs, lastContentAtMs, completionTokens } = params

  let ttftMs: number | null = null
  if (requestStartedAtMs !== null && firstContentAtMs !== null) {
    const delta = firstContentAtMs - requestStartedAtMs
    if (delta >= 0) ttftMs = Math.round(delta)
  }

  let generationMs: number | null = null
  if (firstContentAtMs !== null && lastContentAtMs !== null) {
    const delta = lastContentAtMs - firstContentAtMs
    if (delta >= 0) generationMs = Math.round(delta)
  }

  let tokensPerSecond: number | null = null
  if (
    completionTokens !== null &&
    completionTokens > 0 &&
    generationMs !== null &&
    generationMs > 0
  ) {
    tokensPerSecond = Math.round((completionTokens / (generationMs / 1000)) * 100) / 100
  }

  return { ttftMs, generationMs, tokensPerSecond }
}

/**
 * Rough token estimate for text the provider did not count.
 * Four characters per token is the standard English approximation.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}

/**
 * Reads a usage object out of one OpenAI-compatible SSE frame.
 * Returns null when the frame carries no usage.
 */
export function extractUsageFromSseFrame(frame: string): UsageCounts | null {
  const trimmed = frame.trim()
  if (!trimmed.startsWith('data:')) return null
  const payload = trimmed.slice(5).trim()
  if (!payload || payload === '[DONE]') return null

  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null

  const usage = (parsed as Record<string, unknown>).usage as Record<string, unknown> | undefined
  if (!usage || typeof usage !== 'object') return null

  const prompt = toInt(usage.prompt_tokens)
  const completion = toInt(usage.completion_tokens)
  const total = toInt(usage.total_tokens) ?? (prompt !== null || completion !== null ? (prompt ?? 0) + (completion ?? 0) : null)

  if (prompt === null && completion === null && total === null) return null

  return {
    promptTokens: prompt,
    completionTokens: completion,
    totalTokens: total,
    source: 'provider',
  }
}

function toInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.round(value))
}

/**
 * Timestamps of the first and last generated content token in a stream.
 * A role-only delta or a keep-alive frame is not content, so it does not count.
 */
export type StreamTiming = {
  firstContentAtMs: number | null
  lastContentAtMs: number | null
}

/**
 * Scans a byte stream for provider-reported usage and the generated text.
 * Usage normally arrives in the final frame, but frames can be split across
 * chunk boundaries, so the scanner keeps a partial line buffer.
 */
export function createUsageScanner(): {
  push: (chunk: string) => void
  flush: () => void
  result: () => UsageCounts | null
  text: () => string
  generatedText: () => string
  timing: () => StreamTiming
} {
  let buffer = ''
  let found: UsageCounts | null = null
  let outputText = ''
  let reasoningText = ''
  let firstContentAtMs: number | null = null
  let lastContentAtMs: number | null = null

  const scanLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') return

    if (!found) {
      const usage = extractUsageFromSseFrame(line)
      if (usage) found = usage
    }

    // Accumulate the generated text for the completion-token estimate.
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>
      const choices = parsed.choices as Array<Record<string, unknown>> | undefined
      const delta = choices?.[0]?.delta as Record<string, unknown> | undefined
      const content = delta?.content
      if (typeof content === 'string') outputText += content

      // A reasoning model streams its thinking tokens in `reasoning` or
      // `reasoning_content`. They are generated tokens, and they are what the
      // caller waits for, so they count towards the timing.
      const reasoning = delta?.reasoning
      if (typeof reasoning === 'string') reasoningText += reasoning
      const reasoningContent = delta?.reasoning_content
      if (typeof reasoningContent === 'string') reasoningText += reasoningContent

      const generated =
        (typeof content === 'string' && content.length > 0) ||
        (typeof reasoning === 'string' && reasoning.length > 0) ||
        (typeof reasoningContent === 'string' && reasoningContent.length > 0)

      if (generated) {
        const now = Date.now()
        if (firstContentAtMs === null) firstContentAtMs = now
        lastContentAtMs = now
      }
    } catch {
      // A malformed frame is ignored; the stream itself is unaffected.
    }
  }

  return {
    push(chunk: string) {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) scanLine(line)
    },
    flush() {
      if (buffer.trim()) scanLine(buffer)
      buffer = ''
    },
    result() {
      return found
    },
    timing() {
      return { firstContentAtMs, lastContentAtMs }
    },
    generatedText() {
      return outputText + reasoningText
    },
    text() {
      return outputText
    },
  }
}

/**
 * Prices in USD per million tokens, converted from the published list price.
 * Each entry carries the date the price was last verified.
 */
export type ModelPrice = {
  promptUsdPerMTok: number
  completionUsdPerMTok: number
  currency: string
  verifiedAt: string
}

/** Published JPY prices converted to USD. Rate verified 2026-11-15. */
const JPY_PER_USD = 150

const MODEL_PRICES: Record<string, ModelPrice> = {
  'plamo:plamo-3.1-prime': {
    promptUsdPerMTok: 60 / JPY_PER_USD,
    completionUsdPerMTok: 250 / JPY_PER_USD,
    currency: 'USD',
    verifiedAt: '2026-11-15',
  },
  'plamo:plamo-3.0-prime': {
    promptUsdPerMTok: 60 / JPY_PER_USD,
    completionUsdPerMTok: 250 / JPY_PER_USD,
    currency: 'USD',
    verifiedAt: '2026-11-15',
  },
  // No token charge on any plan.
  'plamo:plamo-3.0-fin-beta': {
    promptUsdPerMTok: 0,
    completionUsdPerMTok: 0,
    currency: 'USD',
    verifiedAt: '2026-11-15',
  },
  'zro:deepseek-v4.1-flash': {
    promptUsdPerMTok: 0.3,
    completionUsdPerMTok: 1.1,
    currency: 'USD',
    verifiedAt: '2026-11-16',
  },
  'zro:glm-5.3': {
    promptUsdPerMTok: 1.4,
    completionUsdPerMTok: 4.2,
    currency: 'USD',
    verifiedAt: '2026-11-16',
  },
}

export function lookupModelPrice(providerId: string, modelId: string): ModelPrice | null {
  return MODEL_PRICES[`${providerId}:${modelId}`] ?? null
}

/**
 * Computes the cost of one request.
 *
 * A connection the administrator marked as a free tier costs nothing. A paid
 * connection costs its published rate when the price is known. An unknown price
 * returns null so the report can say "unknown" instead of a false zero.
 */
export function computeCostUsd(params: {
  isPaidTier?: boolean
  providerId: string
  modelId: string
  promptTokens: number | null
  completionTokens: number | null
}): { costUsd: number | null; costCurrency: string } {
  if (params.isPaidTier === false) {
    return { costUsd: 0, costCurrency: 'USD' }
  }

  const price = lookupModelPrice(params.providerId, params.modelId)
  if (!price) {
    return { costUsd: null, costCurrency: 'USD' }
  }

  const prompt = params.promptTokens ?? 0
  const completion = params.completionTokens ?? 0
  const cost =
    (prompt / 1_000_000) * price.promptUsdPerMTok +
    (completion / 1_000_000) * price.completionUsdPerMTok

  return {
    costUsd: Math.round(cost * 1e8) / 1e8,
    costCurrency: price.currency,
  }
}

/**
 * Builds the ledger row. Callers pass the counts they already have.
 */
export function buildUsageRow(entry: UsageEntry): Record<string, unknown> {
  return {
    tenant_id: entry.tenantId ?? null,
    user_id: entry.userId ?? null,
    user_email: entry.userEmail ?? null,
    conversation_id: entry.conversationId ?? null,
    provider_id: entry.providerId,
    model_id: entry.modelId,
    connection_id: entry.connectionId ?? null,
    prompt_tokens: entry.counts.promptTokens,
    completion_tokens: entry.counts.completionTokens,
    total_tokens: entry.counts.totalTokens,
    cost_usd: entry.costUsd,
    cost_currency: entry.costCurrency,
    token_source: entry.counts.source,
    success: entry.success,
    latency_ms: entry.latencyMs ?? null,
    ttft_ms: entry.ttftMs ?? null,
    generation_ms: entry.generationMs ?? null,
    tokens_per_second: entry.tokensPerSecond ?? null,
  }
}

/**
 * Writes one ledger row. Failures are logged and swallowed: a broken ledger
 * must never break a customer conversation.
 */
export async function recordUsage(
  client: SupabaseClient | null,
  entry: UsageEntry,
): Promise<void> {
  if (!client) return
  try {
    const { error } = await client
      .from('app_ai_usage_ledger')
      .insert(buildUsageRow(entry))
    if (error) {
      console.error('[bolu-usage] ledger insert failed:', error.message)
    }
  } catch (err) {
    console.error('[bolu-usage] ledger insert threw:', err instanceof Error ? err.message : err)
  }
}
