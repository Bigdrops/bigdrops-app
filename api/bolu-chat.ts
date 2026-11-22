/**
 * Bolu chat runtime (server-only).
 *
 * Configuration precedence:
 *   1. Administrator-activated primary connection (app_ai_provider_routing) with explicitly approved fallbacks
 *   2. Legacy singleton credential (app_ai_provider_config)
 *   3. Server environment variables (BOLU_PROVIDER_*)
 *   4. Deterministic mock mode — only when BOLU_PROVIDER_MODE=mock is explicit
 *
 * Pre-first-token failover:
 *   Failure before any content is delivered to the client records diagnostics and advances only to
 *   the administrator-activated primary or its explicitly approved fallbacks. Post-first-token
 *   generations are locked in and never replayed.
 *
 * Security: All decrypted credentials remain exclusively within serverless memory.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getRequestHeader } from '../src/lib/ai-assistant/bolu-auth.js'
import {
  getBoluProviderConfig,
  validateBoluProviderRequest,
  type BoluProviderMessage,
} from '../src/lib/ai-assistant/bolu-provider.js'
import { DETERMINISTIC_FIXTURES, type MockScenario } from '../src/lib/ai-assistant/bolu-mock-provider.js'
import {
  streamAdapterChat,
  type AdapterConfig,
  type AdapterMessage,
  type ProviderDiagnostics,
} from '../src/lib/ai-assistant/provider-adapters.js'
import { buildBoluSystemPrompt, isBoluDocumentOperationTurn } from '../src/lib/ai-assistant/bolu-prompt.js'
import {
  claimEligibleConnection,
  claimExactConnection,
  recordAiFailure,
  recordAiRequestStart,
  recordAiSuccess,
} from '../src/lib/ai-assistant/routing/bolu-account-pool.js'
import { discoverEligibleAlternatives } from '../src/lib/ai-assistant/routing/bolu-alternative-discovery.js'
import { resolveRoutingPolicy } from '../src/lib/ai-assistant/routing/bolu-policy-router.js'
import { classifyProviderError } from '../src/lib/ai-assistant/routing/bolu-error-classifier.js'
import {
  computeCostUsd,
  computeStreamMetrics,
  createUsageScanner,
  estimateTokens,
  recordUsage,
  type StreamMetrics,
  type TokenSource,
  type UsageCounts,
} from '../src/lib/ai-assistant/bolu-usage-ledger.js'

const TRANSIENT_FAILOVER_CATEGORIES = new Set([
  'rate_limit',
  'provider_unavailable',
  'network',
  'timeout',
  'authentication',
  'quota_exhausted',
])


const CHAT_MAX_TOKENS = 1000
const CHAT_TEMPERATURE = 0.1

function jsonError(message: string, status: number, code?: string) {
  return Response.json(code ? { error: message, code } : { error: message }, { status })
}

async function resolveUser(request: Request) {
  const authorization = getRequestHeader(request, 'authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!token || !url || !anonKey) return null
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

function getAdminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function diagnosticsToError(diagnostics: ProviderDiagnostics): Response {
  switch (diagnostics.category) {
    case 'provider_auth':
      return jsonError(
        'Bolu provider authentication failed. A platform administrator must verify the connection credential in Settings.',
        502,
        diagnostics.category,
      )
    case 'provider_rate_limit': {
      const wait = diagnostics.retryAfterSeconds ? ` Retry in about ${diagnostics.retryAfterSeconds}s.` : ''
      return jsonError(`Bolu is rate-limited by the AI provider.${wait}`, 429, diagnostics.category)
    }
    case 'provider_not_found':
      return jsonError(
        'The configured Bolu model or endpoint was not found. A platform administrator must review the connection.',
        502,
        diagnostics.category,
      )
    case 'provider_bad_request':
      return jsonError(`The AI provider rejected the request: ${diagnostics.message}`, 502, diagnostics.category)
    case 'timeout':
      return jsonError('The AI provider request timed out. Please try again.', 504, diagnostics.category)
    case 'network':
      return jsonError('Bolu could not reach the AI provider. Please try again.', 502, diagnostics.category)
    default:
      return jsonError('Bolu is temporarily unavailable from the provider. Please try again.', 502, diagnostics.category)
  }
}

/**
 * Validates a client-supplied tenant id against the caller's workspace
 * membership. An unverified tenant is dropped rather than trusted.
 */
async function resolveVerifiedTenantId(
  adminClient: SupabaseClient,
  tenantId: string | null,
  userId: string,
): Promise<string | null> {
  if (!tenantId) return null
  try {
    const { data: entity } = await adminClient
      .from('entities')
      .select('id, workspace_id')
      .eq('id', tenantId)
      .maybeSingle()
    if (!entity) return null
    const { data: isMember } = await adminClient.rpc('is_workspace_member', {
      p_workspace_id: entity.workspace_id,
      p_user_id: userId,
    })
    return isMember ? tenantId : null
  } catch {
    return null
  }
}

/**
 * Writes one AI consumption row for the caller.
 *
 * Never throws and never delays the response: the caller awaits it only after
 * the upstream stream has already ended.
 */
async function logBoluUsage(params: {
  adminClient: SupabaseClient
  userId: string
  userEmail: string | null
  tenantId: string | null
  conversationId: string | null
  providerId: string
  modelId: string
  connectionId: string | null
  isPaidTier?: boolean
  usage: UsageCounts | null
  outputText: string
  promptChars: number
  success: boolean
  latencyMs: number
  ttftMs?: number | null
  generationMs?: number | null
  tokensPerSecond?: number | null
}): Promise<void> {
  const counts: UsageCounts = params.usage ?? {
    promptTokens: estimateTokens('x'.repeat(params.promptChars)),
    completionTokens: params.outputText ? estimateTokens(params.outputText) : 0,
    totalTokens: null,
    source: 'estimated' as TokenSource,
  }
  const promptTokens = counts.promptTokens ?? 0
  const completionTokens = counts.completionTokens ?? 0
  const totalTokens = counts.totalTokens ?? promptTokens + completionTokens

  const cost = computeCostUsd({
    isPaidTier: params.isPaidTier,
    providerId: params.providerId,
    modelId: params.modelId,
    promptTokens,
    completionTokens,
  })

  const tenantId = await resolveVerifiedTenantId(params.adminClient, params.tenantId, params.userId)

  await recordUsage(params.adminClient, {
    tenantId,
    userId: params.userId,
    userEmail: params.userEmail,
    conversationId: params.conversationId,
    providerId: params.providerId,
    modelId: params.modelId,
    connectionId: params.connectionId,
    isPaidTier: params.isPaidTier,
    counts: { ...counts, totalTokens },
    costUsd: cost.costUsd,
    costCurrency: cost.costCurrency,
    success: params.success,
    latencyMs: params.latencyMs,
    ttftMs: params.ttftMs ?? null,
    generationMs: params.generationMs ?? null,
    tokensPerSecond: params.tokensPerSecond ?? null,
  })
}

/**
 * Wraps an upstream ReadableStream to enforce the post-first-token lock-in contract
 * and trigger telemetry success callback upon completion.
 *
 * The same pass scans the stream for provider-reported token usage. The scan is
 * a string search on bytes already in flight and adds no upstream round trip.
 */
function wrapStreamForFirstTokenBoundary(
  upstreamStream: ReadableStream<Uint8Array>,
  onSuccess: () => Promise<void> | void,
  onComplete?: (
    usage: UsageCounts | null,
    outputText: string,
    metrics: StreamMetrics,
  ) => Promise<void> | void,
  requestStartedAt: number | null = null,
): ReadableStream<Uint8Array> {
  const reader = upstreamStream.getReader()
  const scanner = createUsageScanner()
  const decoder = new TextDecoder()
  let firstChunkReceived = false
  let isClosed = false

  /** Reads the scanner once and derives the speed metrics from it. */
  const collect = (): { counts: UsageCounts | null; outputText: string; metrics: StreamMetrics } => {
    const outputText = scanner.text()
    const counts = scanner.result()
    const timing = scanner.timing()
    const generatedText = scanner.generatedText()
    return {
      counts,
      outputText,
      metrics: computeStreamMetrics({
        requestStartedAtMs: requestStartedAt,
        firstContentAtMs: timing.firstContentAtMs,
        lastContentAtMs: timing.lastContentAtMs,
        completionTokens: counts?.completionTokens ?? (generatedText ? estimateTokens(generatedText) : null),
      }),
    }
  }

  const finalizeStream = async (controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (isClosed) return
    isClosed = true
    try {
      if (firstChunkReceived) {
        await Promise.resolve(onSuccess()).catch((err) => {
          console.error('[bolu-chat] onSuccess callback failed:', err)
        })
      }
      scanner.flush()
      const { counts, outputText, metrics } = collect()
      onComplete?.(counts, outputText, metrics)

      // Send authoritative server timing event BEFORE [DONE] and stream termination
      try {
        const encoder = new TextEncoder()
        const metricsPayload = JSON.stringify({
          metrics: {
            completedAt: new Date().toISOString(),
            durationMs: metrics.generationMs,
            ttftMs: metrics.ttftMs,
          },
        })
        controller.enqueue(encoder.encode(`data: ${metricsPayload}\n\n`))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch {}
    } finally {
      try {
        controller.close()
      } catch {}
    }
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (;;) {
          // Read next chunk with a 25s timeout to avoid indefinite hanging on keep-alive
          let timeoutId: any
          const chunkPromise = reader.read()
          const timeoutPromise = new Promise<{ done: true; value: undefined }>((resolve) => {
            timeoutId = setTimeout(() => {
              if (firstChunkReceived) {
                resolve({ done: true, value: undefined })
              }
            }, 25000)
          })

          const { done, value } = await Promise.race([chunkPromise, timeoutPromise])
          clearTimeout(timeoutId)

          if (done) {
            await finalizeStream(controller)
            break
          }

          if (value && value.length > 0) {
            firstChunkReceived = true
            const text = decoder.decode(value, { stream: true })
            scanner.push(text)

            // OpenAI / PlaMo / SSE completion detection: close immediately on [DONE]
            const donePos = text.indexOf('data: [DONE]') !== -1
              ? text.indexOf('data: [DONE]')
              : text.indexOf('[DONE]')

            if (donePos !== -1) {
              // Enqueue any leading tokens in this chunk that occurred before [DONE]
              const preDoneText = text.slice(0, donePos).trim()
              if (preDoneText) {
                const encoder = new TextEncoder()
                controller.enqueue(encoder.encode(preDoneText + '\n\n'))
              }
              await finalizeStream(controller)
              break
            } else {
              controller.enqueue(value)
            }
          }
        }
      } catch (err) {
        console.error('[bolu-chat] Upstream stream read error:', err)
        try {
          scanner.flush()
          if (onComplete) {
            const { counts, outputText, metrics } = collect()
            await Promise.resolve(onComplete(counts, outputText, metrics)).catch(() => {})
          }
        } finally {
          try {
            controller.error(err)
          } catch {}
        }
      } finally {
        try {
          reader.releaseLock()
        } catch {}
      }
    },
    async cancel() {
      try {
        await reader.cancel()
      } catch {}
    },
  })
}

function mockResponse(messages: BoluProviderMessage[]): Response {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content.toLowerCase() ?? ''
  let scenario: MockScenario = 'authorized-record-retrieval'
  if (lastUserMsg.includes('invalid') || lastUserMsg.includes('malformed')) {
    scenario = 'invalid-operation-payload'
  } else if (lastUserMsg.includes('change') || lastUserMsg.includes('modify') || lastUserMsg.includes('update notes')) {
    scenario = 'valid-modification-proposal'
  } else if (lastUserMsg.includes('create invoice') && (lastUserMsg.includes('cement') || lastUserMsg.includes('dangote'))) {
    scenario = 'valid-creation-proposal'
  } else if (lastUserMsg.includes('create') && lastUserMsg.includes('invoice')) {
    scenario = 'missing-required-fields'
  } else if (lastUserMsg.includes('unauthorized')) {
    scenario = 'unauthorized-record'
  }

  const fixture = DETERMINISTIC_FIXTURES[scenario]
  const text = fixture ? fixture.text : 'Bolu mock mode response.'
  const sseBody = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`
  return new Response(sseBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Bolu-Source': 'mock',
    },
  })
}

export async function POST(request: Request): Promise<Response> {
  if (request.method !== 'POST') return jsonError('Method not allowed.', 405)
  const user = await resolveUser(request)
  if (!user) return jsonError('Sign in to use Bolu.', 401)

  let payload: {
    messages?: unknown
    contextFacts?: unknown
    connectionId?: unknown
    modelId?: unknown
    tenantId?: unknown
    conversationId?: unknown
  }
  try {
    payload = await request.json()
  } catch {
    return jsonError('Invalid request body.', 400)
  }

  const explicitConnectionId =
    typeof payload.connectionId === 'string' && payload.connectionId.trim() ? payload.connectionId.trim() : null
  const explicitModelId =
    typeof payload.modelId === 'string' && payload.modelId.trim() ? payload.modelId.trim() : null
  // Untrusted attribution hints. The tenant is re-verified against workspace
  // membership before it is written to the ledger.
  const requestedTenantId =
    typeof payload.tenantId === 'string' && payload.tenantId.trim() ? payload.tenantId.trim() : null
  const requestedConversationId =
    typeof payload.conversationId === 'string' && payload.conversationId.trim() ? payload.conversationId.trim() : null

  const validation = validateBoluProviderRequest({
    userId: user.id,
    messages: Array.isArray(payload.messages) ? (payload.messages as BoluProviderMessage[]) : [],
    contextFacts: typeof payload.contextFacts === 'string' ? payload.contextFacts : '',
  })
  if (!validation.ok) {
    const failure = validation as { ok: false; error: string; code: string }
    return jsonError(failure.error, 400, failure.code)
  }

  // System prompt respects approved BOUXRE product direction:
  // - Application owns tenant scope, permissions, validation, calculations, numbering, persistence
  // - Financial calculations are locked to the application; the model must never compute them
  // - Gate 1 (proposal review) and Gate 2 (save confirmation) remain in effect
  // The conversational core is always supplied; the document payload contract only
  // when the turn is actually a document operation.
  const documentOperation = isBoluDocumentOperationTurn(validation.messages)
  const systemPrompt = buildBoluSystemPrompt({
    contextFacts: validation.contextFacts,
    documentOperation,
  })

  const messages: AdapterMessage[] = [
    { role: 'system', content: systemPrompt },
    ...validation.messages,
  ]
  const promptChars = messages.reduce((total, message) => total + message.content.length, 0)

  // Priority 1: Multi-Account Connection Pool via Atomic Routing Engine
  const adminClient = getAdminClient()
  if (adminClient) {
    try {
      const excludedConnectionIds: string[] = []
      const excludedProviders: Set<string> = new Set()
      let lastDiagnostics: ProviderDiagnostics | null = null

      // MANUAL MODE: User explicitly selected a specific connection and model in the UI
      if (explicitConnectionId && explicitConnectionId !== 'auto') {
        const exactClaimed = await claimExactConnection(adminClient, explicitConnectionId, explicitModelId)
        if (!exactClaimed) {
          // Pinned connection is unavailable, disabled, quarantined, or in active cooldown.
          // Discover eligible alternatives and return structured 409 unavailable response immediately.
          const alternatives = await discoverEligibleAlternatives(adminClient, explicitConnectionId, explicitModelId, 4)
          return Response.json(
            {
              error: 'The selected AI model is currently unavailable.',
              code: 'MODEL_UNAVAILABLE',
              failedConnectionId: explicitConnectionId,
              failedModelId: explicitModelId,
              reason: 'The selected AI connection is unavailable, cooling down, or quarantined.',
              alternatives,
            },
            { status: 409, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const adapterConfig: AdapterConfig = {
          providerId: exactClaimed.providerId,
          protocol: exactClaimed.protocol === 'anthropic' ? 'anthropic' : 'openai',
          authScheme: exactClaimed.protocol === 'anthropic' ? 'x-api-key' : 'bearer',
          baseUrl: exactClaimed.baseUrl || undefined,
          apiKey: exactClaimed.apiKey,
          model: exactClaimed.selectedModel,
          timeoutMs: exactClaimed.timeoutMs || 30000,
        }

        await recordAiRequestStart(adminClient, exactClaimed.connectionId, adapterConfig.model)

        // Attempt 1 on pinned connection
        let controller = new AbortController()
        let timeoutId = setTimeout(() => controller.abort(), adapterConfig.timeoutMs)
        let result = await streamAdapterChat(adapterConfig, messages, {
          maxTokens: CHAT_MAX_TOKENS,
          temperature: CHAT_TEMPERATURE,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        // If transient failure, perform 1 deliberate retry on the pinned connection
        if ('diagnostics' in result) {
          const classified = classifyProviderError(
            {
              status: result.diagnostics.status,
              retryAfterHeader: result.diagnostics.retryAfterSeconds ? String(result.diagnostics.retryAfterSeconds) : null,
              error: new Error(result.diagnostics.message),
            },
            { providerId: adapterConfig.providerId, targetModel: adapterConfig.model },
          )

          if (classified.retryable && TRANSIENT_FAILOVER_CATEGORIES.has(classified.category)) {
            const backoffMs = Math.min(classified.retryAfterSeconds ? classified.retryAfterSeconds * 1000 : 500, 1500)
            await new Promise((resolve) => setTimeout(resolve, backoffMs))

            controller = new AbortController()
            timeoutId = setTimeout(() => controller.abort(), adapterConfig.timeoutMs)
            result = await streamAdapterChat(adapterConfig, messages, {
              maxTokens: CHAT_MAX_TOKENS,
              temperature: CHAT_TEMPERATURE,
              signal: controller.signal,
            })
            clearTimeout(timeoutId)
          }
        }

        // If still failed after retry (or non-retryable error)
        if ('diagnostics' in result) {
          const classified = classifyProviderError(
            {
              status: result.diagnostics.status,
              retryAfterHeader: result.diagnostics.retryAfterSeconds ? String(result.diagnostics.retryAfterSeconds) : null,
              error: new Error(result.diagnostics.message),
            },
            { providerId: adapterConfig.providerId, targetModel: adapterConfig.model },
          )

          await recordAiFailure(adminClient, {
            connectionId: exactClaimed.connectionId,
            modelId: adapterConfig.model,
            failureCategory: classified.category,
            failureScope: classified.scope,
            httpStatus: classified.httpStatus,
            cooldownSeconds: classified.retryAfterSeconds,
            reasonSummary: classified.safeSummary,
          })

          void logBoluUsage({
            adminClient,
            userId: user.id,
            userEmail: user.email ?? null,
            tenantId: requestedTenantId,
            conversationId: requestedConversationId,
            providerId: adapterConfig.providerId,
            modelId: adapterConfig.model,
            connectionId: exactClaimed.connectionId,
            isPaidTier: exactClaimed.isPaidTier,
            usage: null,
            outputText: '',
            promptChars,
            success: false,
            latencyMs: result.diagnostics.latencyMs,
          })

          // Non-retryable user input error (e.g. 400 Bad Request) returns standard diagnostic
          if (classified.category === 'invalid_request') {
            return diagnosticsToError(result.diagnostics)
          }

          // Discover 3-5 eligible alternatives for the frontend negotiation countdown
          const alternatives = await discoverEligibleAlternatives(
            adminClient,
            exactClaimed.connectionId,
            adapterConfig.model,
            4,
          )

          return Response.json(
            {
              error: `The selected AI model "${adapterConfig.model}" is currently unavailable.`,
              code: 'MODEL_UNAVAILABLE',
              failedConnectionId: exactClaimed.connectionId,
              failedModelId: adapterConfig.model,
              reason: classified.safeSummary,
              alternatives,
            },
            { status: 409, headers: { 'Content-Type': 'application/json' } },
          )
        }

        // Successful stream on pinned manual connection
        const headers = new Headers(result.response.headers)
        headers.set('X-Bolu-Source', 'connection')
        headers.set('X-Bolu-Connection-Id', exactClaimed.connectionId)
        headers.set('X-Bolu-Model', adapterConfig.model)

        const startedAt = Date.now()

        const bodyStream = result.response.body
          ? wrapStreamForFirstTokenBoundary(
              result.response.body,
              () => {
                recordAiSuccess(adminClient, exactClaimed.connectionId, adapterConfig.model).catch((err) => {
                  console.error('[bolu-chat] recordAiSuccess error:', err)
                })
              },
              (usage, outputText, metrics) => {
                void logBoluUsage({
                  adminClient,
                  userId: user.id,
                  userEmail: user.email ?? null,
                  tenantId: requestedTenantId,
                  conversationId: requestedConversationId,
                  providerId: adapterConfig.providerId,
                  modelId: adapterConfig.model,
                  connectionId: exactClaimed.connectionId,
                  isPaidTier: exactClaimed.isPaidTier,
                  usage,
                  outputText,
                  promptChars,
                  success: true,
                  latencyMs: Date.now() - startedAt,
                  ttftMs: metrics.ttftMs,
                  generationMs: metrics.generationMs,
                  tokensPerSecond: metrics.tokensPerSecond,
                })
              },
              result.requestStartedAt,
            )
          : null

        return new Response(bodyStream, { status: 200, headers })
      }

      const policyDecision = resolveRoutingPolicy({
        userId: user.id,
        taskType: 'invoice-chat',
        preferredModel: explicitModelId || undefined,
        allowPaid: true,
        allowCustom: true,
      })

      if (!policyDecision.ok) {
        return jsonError(policyDecision.error || 'Routing policy denied request.', 403, 'policy_denied')
      }

      const maxAttempts = Math.min(policyDecision.maxAttempts || 4, 4)

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const allowed = policyDecision.allowedProviders.filter((p) => !excludedProviders.has(p))
        if (allowed.length === 0) break

        let claimed = await claimEligibleConnection(
          adminClient,
          {
            allowedProviders: allowed,
            targetModel: policyDecision.targetModel,
            allowPaid: policyDecision.allowPaid,
          },
          excludedConnectionIds,
        )

        // If no connection matched targetModel on attempt 0 (e.g. pool connections serve other models),
        // retry once without restricting to targetModel so healthy pool connections (OpenRouter, custom endpoints, etc.)
        // serve using their own configured default model.
        if (!claimed && attempt === 0 && policyDecision.targetModel) {
          claimed = await claimEligibleConnection(
            adminClient,
            {
              allowedProviders: allowed,
              targetModel: '*',
              allowPaid: policyDecision.allowPaid,
            },
            excludedConnectionIds,
          )
        }

        if (!claimed) break

        const resolvedModel =
          claimed.selectedModel && claimed.selectedModel !== '*'
            ? claimed.selectedModel
            : claimed.defaultModel

        const adapterConfig: AdapterConfig = {
          providerId: claimed.providerId,
          protocol: claimed.protocol === 'anthropic' ? 'anthropic' : 'openai',
          authScheme: claimed.protocol === 'anthropic' ? 'x-api-key' : 'bearer',
          baseUrl: claimed.baseUrl || undefined,
          apiKey: claimed.apiKey,
          model: resolvedModel || claimed.defaultModel,
          timeoutMs: claimed.timeoutMs || 30000,
        }

        await recordAiRequestStart(adminClient, claimed.connectionId, adapterConfig.model)

        let controller = new AbortController()
        let timeoutId = setTimeout(() => controller.abort(), adapterConfig.timeoutMs)

        let result: Awaited<ReturnType<typeof streamAdapterChat>>
        try {
          result = await streamAdapterChat(adapterConfig, messages, {
            maxTokens: CHAT_MAX_TOKENS,
            temperature: CHAT_TEMPERATURE,
            signal: controller.signal,
          })
        } finally {
          clearTimeout(timeoutId)
        }

        // Auto mode: retry transient failures on current connection once before switching to next candidate
        if ('diagnostics' in result) {
          const classified = classifyProviderError(
            {
              status: result.diagnostics.status,
              retryAfterHeader: result.diagnostics.retryAfterSeconds
                ? String(result.diagnostics.retryAfterSeconds)
                : null,
              error: new Error(result.diagnostics.message),
            },
            { providerId: adapterConfig.providerId, targetModel: adapterConfig.model },
          )

          if (classified.retryable && TRANSIENT_FAILOVER_CATEGORIES.has(classified.category)) {
            const backoffMs = Math.min(classified.retryAfterSeconds ? classified.retryAfterSeconds * 1000 : 500, 1500)
            await new Promise((resolve) => setTimeout(resolve, backoffMs))

            controller = new AbortController()
            timeoutId = setTimeout(() => controller.abort(), adapterConfig.timeoutMs)
            try {
              result = await streamAdapterChat(adapterConfig, messages, {
                maxTokens: CHAT_MAX_TOKENS,
                temperature: CHAT_TEMPERATURE,
                signal: controller.signal,
              })
            } finally {
              clearTimeout(timeoutId)
            }
          }
        }

        if ('diagnostics' in result) {
          lastDiagnostics = result.diagnostics
          const classified = classifyProviderError(
            {
              status: result.diagnostics.status,
              retryAfterHeader: result.diagnostics.retryAfterSeconds
                ? String(result.diagnostics.retryAfterSeconds)
                : null,
              error: new Error(result.diagnostics.message),
            },
            { providerId: adapterConfig.providerId, targetModel: adapterConfig.model },
          )

          await recordAiFailure(adminClient, {
            connectionId: claimed.connectionId,
            modelId: adapterConfig.model,
            failureCategory: classified.category,
            failureScope: classified.scope,
            httpStatus: classified.httpStatus,
            cooldownSeconds: classified.retryAfterSeconds,
            reasonSummary: classified.safeSummary,
          })

          // A failed attempt still consumes provider allowance.
          void logBoluUsage({
            adminClient,
            userId: user.id,
            userEmail: user.email ?? null,
            tenantId: requestedTenantId,
            conversationId: requestedConversationId,
            providerId: adapterConfig.providerId,
            modelId: adapterConfig.model,
            connectionId: claimed.connectionId,
            isPaidTier: claimed.isPaidTier,
            usage: null,
            outputText: '',
            promptChars,
            success: false,
            latencyMs: result.diagnostics.latencyMs,
          })

          excludedConnectionIds.push(claimed.connectionId)
          if (classified.scope === 'provider') {
            excludedProviders.add(adapterConfig.providerId)
          }

          if (classified.retryable && TRANSIENT_FAILOVER_CATEGORIES.has(classified.category)) {
            continue
          }
          break
        }

        const headers = new Headers(result.response.headers)
        headers.set('X-Bolu-Source', 'connection')
        headers.set('X-Bolu-Connection-Id', claimed.connectionId)
        headers.set('X-Bolu-Model', adapterConfig.model)
        if (attempt > 0) {
          headers.set('X-Bolu-Fallback', 'true')
        }

        const startedAt = Date.now()

        const bodyStream = result.response.body
          ? wrapStreamForFirstTokenBoundary(
              result.response.body,
              () => {
                recordAiSuccess(adminClient, claimed.connectionId, adapterConfig.model).catch((err) => {
                  console.error('[bolu-chat] recordAiSuccess error:', err)
                })
              },
              (usage, outputText, metrics) => {
                void logBoluUsage({
                  adminClient,
                  userId: user.id,
                  userEmail: user.email ?? null,
                  tenantId: requestedTenantId,
                  conversationId: requestedConversationId,
                  providerId: adapterConfig.providerId,
                  modelId: adapterConfig.model,
                  connectionId: claimed.connectionId,
                  isPaidTier: claimed.isPaidTier,
                  usage,
                  outputText,
                  promptChars,
                  success: true,
                  latencyMs: Date.now() - startedAt,
                  ttftMs: metrics.ttftMs,
                  generationMs: metrics.generationMs,
                  tokensPerSecond: metrics.tokensPerSecond,
                })
              },
              result.requestStartedAt,
            )
          : null

        return new Response(bodyStream, { status: 200, headers })
      }

      if (lastDiagnostics) {
        return diagnosticsToError(lastDiagnostics)
      }

      return jsonError(
        'No eligible Bolu AI provider connection is currently available in the active pool. A platform administrator must configure or enable connections in Settings, or wait for cooldowns to expire.',
        503,
        'provider_pool_exhausted',
      )
    } catch (err) {
      console.error('[bolu-chat] Database runtime execution failed:', err instanceof Error ? err.message : err)
      return jsonError(
        'Bolu provider infrastructure is unavailable. Please check database connectivity and configuration.',
        503,
        'provider_infrastructure_unavailable',
      )
    }
  }

  // Non-production test & mock mode ONLY
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  const envConfig = getBoluProviderConfig(process.env)

  if (envConfig.mode === 'mock') {
    if (isProduction) {
      return jsonError('Mock mode is disabled in production environments.', 503, 'unconfigured')
    }
    return mockResponse(validation.messages)
  }

  return jsonError(
    'Bolu provider infrastructure is not configured. Server environment is missing Supabase service configuration.',
    503,
    'unconfigured',
  )
}
