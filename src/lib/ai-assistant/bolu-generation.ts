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
import { buildProviderMessages, factsAsPrompt } from './bolu-formatting'
import {
  buildDocumentCreateProposal,
  buildInvoiceModifyProposal,
  parseStructuredOperationEnvelope,
  validateInvoiceCreateInput,
  validateInvoiceModifyInput,
  type BoluProposal,
} from './bolu-operations'
import {
  readBoluContextFacts,
  readBoluInvoice,
  validateBoluClient,
  type BoluFactResult,
  type BoluReadAuthorization,
} from './bolu-data'
import type { BoluPageContext } from './bolu-context'
import { extractBoluSearchTerm, matchBoluIntent } from './bolu-capabilities'
import {
  mapRowToMessage,
  MESSAGE_COLUMNS,
  type ClerkState,
  type ProductionBoluMessage,
  type RawMessageRow,
} from './hooks/types'

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
    if (!capability) return null
    const factsContext: BoluPageContext = {
      ...input.pageContext,
      filters: { ...input.pageContext.filters, query: extractBoluSearchTerm(input.text) },
    }
    return await readBoluContextFacts(input.tenantClient, capability, factsContext, input.canRead)
  } catch (err) {
    console.warn('[useBoluThread] Intent lookup failed:', err)
    return {
      kind: 'message',
      text: '[SYSTEM ERROR: The database lookup failed. Inform the user you encountered a technical issue querying their records.]',
    }
  }
}

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

  const factsPrompt = facts ? factsAsPrompt(facts) : ''
  const controller = new AbortController()
  refs.abortController.current = controller

  /** A regenerated row already exists, so an interrupted turn must persist. */
  const persistReplacedStatus = async (content: string, status: 'completed' | 'stopped' | 'failed') => {
    if (!replaceAssistantId) return
    const { error: updateError } = await (supabase.from('bolu_messages') as any)
      .update({ content, status, updated_at: new Date().toISOString() })
      .eq('id', replaceAssistantId)
    if (updateError) {
      console.warn('[useBoluThread] Could not persist regenerated message:', updateError.message)
    }
  }

  try {
    const response = await sendBoluProviderRequest({
      messages: priorMessages,
      contextFacts: factsPrompt,
      connectionId: options.connectionId,
      modelId: options.modelId,
      tenantId,
      conversationId: targetConversationId,
      signal: controller.signal,
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

    let finalText = response.text.replace(/—/g, ' - ').replace(/–/g, '-')
    state.setStreamingContent('')
    state.setIsStreaming(false)

    let parsedProposal: BoluProposal | null = null
    const envelope = parseStructuredOperationEnvelope(finalText)

    if (envelope.hasOperation && envelope.rawOperation) {
      const rawOp = envelope.rawOperation as Record<string, unknown>
      const documentFamily: 'invoice' | 'quotation' | null =
        rawOp.documentFamily === 'invoice' || rawOp.documentFamily === 'quotation'
          ? rawOp.documentFamily
          : null
      if (documentFamily) {
        if (rawOp.operationType === 'create-document') {
          const validation = validateInvoiceCreateInput(rawOp.payload)
          if (validation.valid && validation.data) {
            if (options.tenantClient) {
              const clientValidation = await validateBoluClient(options.tenantClient, validation.data.client_name)
              if (clientValidation.status === 'exact_match') {
                parsedProposal = buildDocumentCreateProposal(documentFamily, {
                  ...validation.data,
                  client_id: clientValidation.client.id,
                  client_name: clientValidation.client.name,
                })
              } else if (clientValidation.status === 'ambiguous') {
                const matchesList = clientValidation.matches.map((m) => `• ${m.name}`).join('\n')
                finalText = `${finalText}\n\nI found multiple clients matching "${validation.data.client_name}":\n${matchesList}\n\nPlease clarify which client you would like to create this invoice for.`
              } else {
                finalText = `${finalText}\n\nI couldn't find an existing client named "${validation.data.client_name}" in your business records. Please verify the client name or register them under Clients first.`
              }
            } else {
              parsedProposal = buildDocumentCreateProposal(documentFamily, validation.data)
            }
          }
        } else if (rawOp.operationType === 'modify-document' && documentFamily === 'invoice') {
          const validation = validateInvoiceModifyInput(rawOp.payload)
          if (validation.valid && validation.data) {
            let targetNum = 'INV-TARGET'
            if (options.tenantClient) {
              try {
                const doc = await readBoluInvoice(options.tenantClient, validation.data.documentId, options.canRead)
                if (doc) targetNum = doc.number
              } catch {
                // Fallback to placeholder if lookup fails
              }
            }
            parsedProposal = buildInvoiceModifyProposal({
              targetDocumentId: validation.data.documentId,
              targetDocumentNumber: targetNum,
              field: validation.data.field,
              oldValue: validation.data.oldValue,
              newValue: validation.data.newValue,
              itemsChange: validation.data.items && validation.data.oldItems
                ? { oldItems: validation.data.oldItems, newItems: validation.data.items }
                : undefined,
            })
          }
        }
      }
    }

    let finalMsg: ProductionBoluMessage

    if (replaceAssistantId) {
      const { data: savedRow, error: saveError } = await (supabase.from('bolu_messages') as any)
        .update({
          content: finalText,
          status: 'completed',
          proposal_payload: parsedProposal,
          records_payload: facts,
          updated_at: new Date().toISOString(),
        })
        .eq('id', replaceAssistantId)
        .select(MESSAGE_COLUMNS)
        .single()

      if (saveError) throw new Error(saveError.message)
      finalMsg = mapRowToMessage(savedRow as RawMessageRow)
    } else {
      const { data: savedRow, error: saveError } = await (supabase.from('bolu_messages') as any)
        .insert({
          conversation_id: targetConversationId, tenant_id: tenantId,
          role: 'assistant', content: finalText, status: 'completed',
          proposal_payload: parsedProposal, records_payload: facts,
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

    if (parsedProposal) {
      state.setActiveProposal(parsedProposal)
      state.setActiveProposalMessageId(finalMsg.id)
      state.setClerkState('listening')
    } else {
      state.setClerkState('idle')
    }
    return true
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      const partial = refs.streamingBuffer.current
      await persistReplacedStatus(partial, 'stopped')
      state.setMessages((prev) =>
        prev.map((m) => (m.id === tempAssistantId ? { ...m, content: partial, status: 'stopped' } : m)),
      )
      state.setClerkState('idle')
      return false
    }

    const errorMsg = err instanceof Error ? err.message : 'Inference request failed.'
    state.setError(errorMsg)
    const failedContent = `Bolu could not complete this request: ${errorMsg}`
    await persistReplacedStatus(failedContent, 'failed')
    state.setMessages((prev) =>
      prev.map((m) => (m.id === tempAssistantId ? { ...m, content: failedContent, status: 'failed' } : m)),
    )
    state.setClerkState('idle')
    return false
  } finally {
    state.setIsStreaming(false)
    refs.abortController.current = null
  }
}
