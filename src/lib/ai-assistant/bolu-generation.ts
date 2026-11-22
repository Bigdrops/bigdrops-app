/**
 * bolu-generation.ts — the one provider turn used by submit, edit and regenerate.
 *
 * Extracted from `useBoluThread` so the hook stays inside the project's
 * 600-line limit. The behaviour is the submitted conversation flow:
 *
 * - `replaceAssistantId` absent: append a temporary assistant message and insert
 *   a new assistant row (the existing submit path).
 * - `replaceAssistantId` present: regenerate that assistant row in place, so the
 *   original user request and the row identity are preserved.
 *
 * No proposal is ever approved, saved or filed here. Business documents are
 * untouched by this module.
 */

import type { Dispatch, MutableRefObject, SetStateAction } from 'react'

import { supabase } from '@/supabase'
import type { TenantClient } from '@/lib/tenantClient'
import { sendBoluProviderRequest } from './bolu-transport'
import { ModelUnavailableError } from './bolu-transport-errors'
import type { CandidateAlternative } from './routing/bolu-alternative-discovery'
import { buildProviderMessages, classifyBoluFactFailure, formatBoluFactFailure } from './bolu-formatting'
import type { BoluProposal } from './bolu-operations'
import { buildBoluContextFacts } from './bolu-prompt'
import {
  readBoluContextFacts,
  resolveOperationFacts,
  type BoluFactResult,
  type BoluReadAuthorization,
} from './bolu-data'
import {
  interpretBoluProposal,
  resolveProposalClient,
} from './bolu-proposal-engine'
import type { BoluPageContext } from './bolu-context'
import { extractBoluSearchTerm, matchBoluIntent } from './bolu-capabilities'
import {
  mapRowToMessage,
  MESSAGE_COLUMNS,
  type ClerkState,
  type ProductionBoluMessage,
  type RawMessageRow,
} from './hooks/types'

/**
 * Authoritative interpretation of proposals (including create-document,
 * modify-document, and advance-invoice-config) is delegated to
 * interpretBoluProposal in bolu-proposal-engine.ts, which unifies snapshot
 * fetching (readBoluInvoiceAdvanceConfig, readBoluModifySnapshot), client
 * resolution (clarificationForClientResolution(resolution), resolveProposalClient({ tenantClient, clientName, clientId })),
 * and draft correction (mergedFromMessageId = options.previousProposalMessageId).
 */
export { resolveProposalClient } from './bolu-proposal-engine'

export interface BoluGenerationHistoryTurn {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface BoluGenerationState {
  setMessages: Dispatch<SetStateAction<ProductionBoluMessage[]>>
  setStreamingContent: (value: string) => void
  setClerkState: (value: ClerkState) => void
  setActiveProposal: (proposal: BoluProposal | null) => void
  setActiveProposalMessageId: (value: string | null) => void
  setError: (value: string) => void
  setIsStreaming: (value: boolean) => void
}

export interface BoluGenerationRefs {
  streamingBuffer: MutableRefObject<string>
  flushTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>
  abortController: MutableRefObject<AbortController | null>
}

export interface BoluGenerationOptions {
  targetConversationId: string
  tenantId: string
  history: BoluGenerationHistoryTurn[]
  userText: string
  facts: BoluFactResult | null
  replaceAssistantId?: string
  connectionId?: string | null
  modelId?: string | null
  tenantClient?: TenantClient
  onModelUnavailable?: (
    alternatives: CandidateAlternative[],
    failedConnectionId?: string,
    failedModelId?: string,
  ) => void
  onResolvedModel?: (info: { connectionId: string | null; model: string | null; isFallback: boolean }) => void
  /**
   * The draft this turn may be correcting. A correction updates this
   * operation instead of creating a second invoice or quotation.
   */
  previousProposal?: BoluProposal | null
  previousProposalMessageId?: string | null
  canRead: BoluReadAuthorization
  state: BoluGenerationState
  refs: BoluGenerationRefs
}

/** Facts lookup shared by new, edited and regenerated turns. */
export async function resolveBoluFacts(input: {
  text: string
  tenantClient?: TenantClient
  pageContext: BoluPageContext
  canRead: BoluReadAuthorization
}): Promise<BoluFactResult | null> {
  if (!input.tenantClient) return null
  try {
    const capability = matchBoluIntent(input.text, input.pageContext)
    if (!capability) {
      // Write/mutation intents must still discover relevant business records.
      return await resolveOperationFacts({
        text: input.text,
        tenantClient: input.tenantClient,
        pageContext: input.pageContext,
        canRead: input.canRead,
      })
    }
    const factsContext: BoluPageContext = {
      ...input.pageContext,
      filters: { ...input.pageContext.filters, query: extractBoluSearchTerm(input.text) },
    }
    return await readBoluContextFacts(input.tenantClient, capability, factsContext, input.canRead)
  } catch (err) {
    console.warn('[useBoluThread] Intent lookup failed:', err)
    return { kind: 'failure', code: classifyBoluFactFailure(err) }
  }
}

/**
 * Resolves a proposal's client against the tenant directory.
 * Preserved for compatibility; implementation resides in bolu-proposal-engine.
 */
// resolveProposalClient is re-exported at top of module

/**
 * Invalidates the turns that depended on an edited request or a regenerated
 * response.
 *
 * The current schema has no parent/branch column, so this keeps every row and
 * marks it `metadata.superseded` with `status = 'stopped'`. `fetchMessages`
 * excludes superseded rows, which makes them leave the active branch without
 * deleting history. No business document, proposal record or audit row is
 * touched here.
 */
export async function markBoluTurnsSuperseded(downstream: ProductionBoluMessage[]): Promise<boolean> {
  if (downstream.length === 0) return true
  const supersededAt = new Date().toISOString()
  let ok = true
  for (const message of downstream) {
    const metadata = { ...(message.metadata ?? {}), superseded: true, superseded_at: supersededAt }
    const { error: updateError } = await (supabase.from('bolu_messages') as any)
      .update({ status: 'stopped', metadata })
      .eq('id', message.id)
    if (updateError) {
      ok = false
      console.warn('[useBoluThread] Could not supersede message:', updateError.message)
    }
  }
  return ok
}

/** Runs one provider turn and persists it. Returns true on success. */
export async function runBoluGeneration(options: BoluGenerationOptions): Promise<boolean> {
  const { targetConversationId, tenantId, facts, replaceAssistantId, state, refs } = options
  const tempAssistantId = replaceAssistantId ?? `temp-assistant-${Date.now()}`
  const tempMsg: ProductionBoluMessage = {
    id: tempAssistantId,
    conversationId: targetConversationId,
    tenantId,
    role: 'assistant',
    content: '',
    status: 'streaming',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  state.setMessages((prev) =>
    replaceAssistantId
      ? prev.map((m) =>
          m.id === replaceAssistantId
            ? { ...m, content: '', status: 'streaming', proposal: null, updatedAt: new Date().toISOString() }
            : m,
        )
      : [...prev, tempMsg],
  )
  state.setIsStreaming(true)
  refs.streamingBuffer.current = ''
  state.setStreamingContent('')

  const priorMessages = buildProviderMessages([
    ...options.history,
    { id: 'current-user-turn', role: 'user' as const, content: options.userText },
  ])

  // Verified records, plus commercial evidence only when this turn is genuinely
  // document authoring. Ordinary questions never receive a parsed line item.
  const factsPrompt = buildBoluContextFacts({
    facts,
    userText: options.userText,
    history: options.history,
    hasActiveDraft: Boolean(options.previousProposal),
  })
  const controller = new AbortController()
  refs.abortController.current = controller

  /** Persists interrupted or failed assistant status to PostgreSQL so it survives refresh and is retryable. */
  const persistAssistantTurnStatus = async (
    content: string,
    status: 'completed' | 'stopped' | 'failed',
    errorReason?: string,
    extraMetadata?: Record<string, unknown>,
  ) => {
    const metadata = {
      ...(errorReason ? { error: errorReason } : {}),
      ...(extraMetadata ?? {}),
    }

    if (replaceAssistantId) {
      try {
        const { error: updateError } = await (supabase.from('bolu_messages') as any)
          .update({
            content,
            status,
            metadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', replaceAssistantId)
        if (updateError) {
          console.warn('[useBoluThread] Could not persist regenerated message status:', updateError.message)
        }
      } catch (err) {
        console.warn('[useBoluThread] Replaced message update failed:', err)
      }
    } else {
      try {
        const { data: savedRow, error: insertError } = await (supabase.from('bolu_messages') as any)
          .insert({
            conversation_id: targetConversationId,
            tenant_id: tenantId,
            role: 'assistant',
            content,
            status,
            metadata,
          })
          .select(MESSAGE_COLUMNS)
          .single()
        if (!insertError && savedRow?.id) {
          const persistedMsg = mapRowToMessage(savedRow as RawMessageRow)
          state.setMessages((prev) =>
            prev.map((m) => (m.id === tempAssistantId ? persistedMsg : m)),
          )
        }
      } catch (insertErr) {
        console.warn('[useBoluThread] Failed/stopped message row insertion skipped:', insertErr)
      }
    }
  }

  try {
    // A failed lookup is reported in one short sentence instead of being sent
    // to the model, which would improvise an explanation around it.
    const failureText = facts?.kind === 'failure' ? formatBoluFactFailure(facts.code) : null

    let finalText: string
    let response: Awaited<ReturnType<typeof sendBoluProviderRequest>> | null = null

    if (failureText) {
      finalText = failureText
      state.setStreamingContent('')
      state.setIsStreaming(false)
    } else {
      response = await sendBoluProviderRequest({
        messages: priorMessages,
        contextFacts: factsPrompt,
        connectionId: options.connectionId,
        modelId: options.modelId,
        tenantId,
        conversationId: targetConversationId,
        signal: controller.signal,
        onResponseHeaders: options.onResolvedModel,
        onDelta: (delta: string) => {
          state.setClerkState('responding')
          const cleanDelta = delta.replace(/—/g, ' - ').replace(/–/g, '-')
          refs.streamingBuffer.current += cleanDelta

          if (!refs.flushTimer.current) {
            refs.flushTimer.current = setTimeout(() => {
              refs.flushTimer.current = null
              const current = refs.streamingBuffer.current
              state.setStreamingContent(current)
              state.setMessages((prev) =>
                prev.map((m) => (m.id === tempAssistantId ? { ...m, content: current } : m)),
              )
            }, 35)
          }
        },
      })

      if (refs.flushTimer.current) {
        clearTimeout(refs.flushTimer.current)
        refs.flushTimer.current = null
      }

      finalText = response.text.replace(/—/g, ' - ').replace(/–/g, '-')
      state.setStreamingContent('')
      state.setIsStreaming(false)
    }

    const interpretation = await interpretBoluProposal({
      rawText: finalText,
      tenantClient: options.tenantClient,
      canRead: options.canRead,
      previousProposal: options.previousProposal,
      previousProposalMessageId: options.previousProposalMessageId,
    })
    finalText = interpretation.finalText
    const parsedProposal = interpretation.proposal
    const mergedFromMessageId = interpretation.mergedFromMessageId

    const timingMetadata = response?.metrics ? {
      completedAt: response.metrics.completedAt,
      durationMs: response.metrics.durationMs,
      ...(response.metrics.ttftMs != null ? { ttftMs: response.metrics.ttftMs } : {}),
      isServerTelemetry: response.metrics.isServerTelemetry,
      source: response.metrics.source,
    } : {}
    const finalMetadata = {
      ...(mergedFromMessageId ? { mergedFromMessageId } : {}),
      ...timingMetadata,
    }

    let finalMsg: ProductionBoluMessage | null = null

    if (replaceAssistantId) {
      const { data: savedRow, error: saveError } = await (supabase.from('bolu_messages') as any)
        .update({
          content: finalText,
          status: 'completed',
          proposal_payload: parsedProposal,
          records_payload: facts,
          metadata: finalMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', replaceAssistantId)
        .select(MESSAGE_COLUMNS)
        .maybeSingle()

      if (!saveError && savedRow) {
        finalMsg = mapRowToMessage(savedRow as RawMessageRow)
      }
    }

    if (!finalMsg) {
      const { data: savedRow, error: saveError } = await (supabase.from('bolu_messages') as any)
        .insert({
          conversation_id: targetConversationId, tenant_id: tenantId,
          role: 'assistant', content: finalText, status: 'completed',
          proposal_payload: parsedProposal, records_payload: facts,
          metadata: finalMetadata,
        })
        .select(MESSAGE_COLUMNS).single()

      if (saveError) throw new Error(saveError.message)
      finalMsg = mapRowToMessage(savedRow as RawMessageRow)
    }

    // Update conversation last_message_at
    void (supabase.from('bolu_conversations') as any)
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', targetConversationId)

    state.setMessages((prev) => prev.map((m) => (m.id === tempAssistantId ? finalMsg : m)))

    // A corrected draft lives on this turn only. Clearing the superseded card
    // keeps one operation with one live preview instead of two proposals.
    if (parsedProposal && mergedFromMessageId && mergedFromMessageId !== finalMsg.id) {
      state.setMessages((prev) =>
        prev.map((m) => (m.id === mergedFromMessageId ? { ...m, proposal: null } : m)),
      )
      const { error: clearError } = await (supabase.from('bolu_messages') as any)
        .update({ proposal_payload: null, updated_at: new Date().toISOString() })
        .eq('id', mergedFromMessageId)
      if (clearError) {
        console.warn('[useBoluThread] Could not clear the superseded proposal:', clearError.message)
      }
    }

    if (parsedProposal) {
      state.setActiveProposal(parsedProposal)
      state.setActiveProposalMessageId(finalMsg.id)
      // The proposal card is the state indicator at Gate 1. The clerk must be
      // idle so the composer stays available for corrections and questions;
      // `listening` here disabled chat for the whole review.
      state.setClerkState('idle')
    } else {
      state.setClerkState('idle')
    }
    return true
  } catch (err) {
    if (err instanceof ModelUnavailableError) {
      // Manual model unavailable: clean up the temporary assistant placeholder and trigger negotiation
      state.setMessages((messages) => messages.filter((candidate) => candidate.id !== tempAssistantId))
      state.setClerkState('idle')
      options.onModelUnavailable?.(err.alternatives, err.failedConnectionId, err.failedModelId)
      return false
    }

    if (err instanceof Error && err.name === 'AbortError') {
      const partial = refs.streamingBuffer.current
      await persistAssistantTurnStatus(partial, 'stopped')
      state.setMessages((prev) =>
        prev.map((m) => (m.id === tempAssistantId ? { ...m, content: partial, status: 'stopped' } : m)),
      )
      state.setClerkState('idle')
      return false
    }

    const partial = refs.streamingBuffer.current.trim()
    const errorMsg = err instanceof Error ? err.message : 'Inference request failed.'
    state.setError(errorMsg)

    // PRESERVE partial streamed text on non-abort errors as readable assistant prose.
    // Keep error details in metadata rather than corrupting the assistant text with brackets.
    const hasPartial = Boolean(partial)
    const finalContent = hasPartial ? partial : `Bolu could not complete this request: ${errorMsg}`

    await persistAssistantTurnStatus(finalContent, 'failed', errorMsg, { isInterrupted: hasPartial })
    state.setMessages((prev) =>
      prev.map((m) =>
        m.id === tempAssistantId
          ? {
              ...m,
              content: finalContent,
              status: 'failed',
              metadata: { ...(m.metadata ?? {}), error: errorMsg, isInterrupted: hasPartial },
            }
          : m,
      ),
    )
    state.setClerkState('idle')
    return false
  } finally {
    state.setIsStreaming(false)
    refs.abortController.current = null
  }
}
