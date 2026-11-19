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
  buildBoluAdvanceConfigProposal,
  validateBoluAdvanceConfigInput,
  clarificationForClientResolution,
  mergeDocumentCreateProposal,
  parseStructuredOperationEnvelope,
  validateInvoiceCreateInput,
  validateInvoiceModifyInput,
  type BoluClientResolution,
  type BoluProposal,
} from './bolu-operations'
import {
  buildCommercialSuggestions,
  formatCommercialEvidence,
  parseCommercialList,
  standardizeCommercialItems,
} from './bolu-commercial-language'
import {
  readBoluClient,
  readBoluContextFacts,
  readBoluInvoiceAdvanceConfig,
  readBoluModifySnapshot,
  resolveBankAccountForPresentation,
  resolveSignatoryForPresentation,
  resolveOperationFacts,
  searchBoluClients,
  type BoluClientMatch,
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
    return {
      kind: 'message',
      text: '[SYSTEM ERROR: The database lookup failed. Inform the user you encountered a technical issue querying their records.]',
    }
  }
}

/**
 * Resolves a proposal's client against the tenant directory.
 *
 * Order: verify a model-supplied client_id, then search by name. Never invents
 * an ID. An ambiguous or missing client is returned as a resolution outcome so
 * the caller can retain the proposal and ask the user.
 */
export async function resolveProposalClient(input: {
  tenantClient?: TenantClient
  clientName: string
  clientId?: string | null
}): Promise<{ client: BoluClientMatch | null; resolution: BoluClientResolution }> {
  const { tenantClient, clientName, clientId } = input

  if (!tenantClient?.isReady) {
    return {
      client: null,
      resolution: { status: 'search_error', query: clientName, error: 'Business records are not available yet.' },
    }
  }

  try {
    // A model-supplied ID is only trusted after a read of that exact record.
    if (clientId) {
      const verified = await readBoluClient(tenantClient, clientId)
      if (verified) return { client: verified, resolution: { status: 'resolved', client: verified } }
    }

    const search = await searchBoluClients(tenantClient, clientName)
    switch (search.status) {
      case 'exact_match':
      case 'single_match':
        return { client: search.client, resolution: { status: 'resolved', client: search.client } }
      case 'ambiguous':
        return { client: null, resolution: { status: 'ambiguous', query: search.query, matches: search.matches } }
      case 'not_found':
        return { client: null, resolution: { status: 'not_found', query: search.query } }
      case 'search_error':
        return { client: null, resolution: { status: 'search_error', query: search.query, error: search.error } }
    }
  } catch {
    // A lookup failure is not an empty client directory.
    return {
      client: null,
      resolution: { status: 'search_error', query: clientName, error: 'Client lookup failed.' },
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

  // The user may have supplied the commercial details across several turns
  // (pasted price lists, then names). Parsing the recent user turns keeps that
  // evidence grounded in the user's own words.
  const recentUserText = [
    ...options.history.filter((turn) => turn.role === 'user').slice(-3).map((turn) => turn.content),
    options.userText,
  ].join('\n')
  const commercialEvidence = formatCommercialEvidence(parseCommercialList(recentUserText))
  const factsPrompt = [facts ? factsAsPrompt(facts) : '', commercialEvidence]
    .filter(Boolean)
    .join('\n\n')
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
    let mergedFromMessageId: string | null = null
    const envelope = parseStructuredOperationEnvelope(finalText)

    if (envelope.hasOperation && envelope.rawOperation) {
      const rawOp = envelope.rawOperation as Record<string, unknown>
      const documentFamily: 'invoice' | 'quotation' | null =
        rawOp.documentFamily === 'invoice' || rawOp.documentFamily === 'quotation'
          ? rawOp.documentFamily
          : null
      if (rawOp.operationType === 'advance-invoice-config') {
        // One dedicated branch for Advance Invoice configuration. The
        // persisted snapshot is read fresh here so the proposal's oldValues
        // guard reflects reality at proposal time, never the model's view.
        const advPayload =
          rawOp.payload && typeof rawOp.payload === 'object' && !Array.isArray(rawOp.payload)
            ? (rawOp.payload as Record<string, unknown>)
            : {}
        const validation = validateBoluAdvanceConfigInput({ ...advPayload, documentFamily: 'invoice' })
        if (validation.valid && validation.data) {
          let snapshot = null as Awaited<ReturnType<typeof readBoluInvoiceAdvanceConfig>> | null
          if (options.tenantClient) {
            try {
              snapshot = await readBoluInvoiceAdvanceConfig(
                options.tenantClient,
                validation.data.targetDocumentId,
                options.canRead,
              )
            } catch (advErr) {
              console.warn('[bolu-generation] Advance Invoice snapshot lookup failed:', advErr)
              snapshot = null
            }
          }
          if (snapshot) {
            const FIVE = ['suffix', 'mode', 'value', 'primary_label', 'secondary_label'] as const
            const oldValues: Partial<Record<(typeof FIVE)[number], string | number | null>> = {}
            for (const key of FIVE) oldValues[key] = snapshot.current[key] ?? null
            parsedProposal = buildBoluAdvanceConfigProposal({
              targetDocumentId: snapshot.id,
              targetDocumentNumber: snapshot.number,
              intent: validation.data.intent,
              newValues: validation.data.newValues,
              oldValues,
              current: snapshot.current,
              parent: {
                invoice_number: snapshot.number,
                issue_date: snapshot.issue_date,
                due_date: snapshot.due_date,
                total: snapshot.total,
              },
            })
          } else if (options.tenantClient) {
            finalText = `${finalText}\n\nI could not locate that parent invoice in your business records. I did not prepare an Advance Invoice proposal.`
          }
        } else {
          finalText = `${finalText}\n\nI could not prepare the Advance Invoice proposal:\n- ${validation.errors.join('\n- ')}`
        }
      } else if (documentFamily) {
        if (rawOp.operationType === 'create-document') {
          const validation = validateInvoiceCreateInput(rawOp.payload)
          if (validation.valid && validation.data) {
            // Presentation-only standardisation (unit notation, casing, the
            // approved cable shorthand). No value is added.
            const suppliedPayload = {
              ...validation.data,
              items: standardizeCommercialItems(validation.data.items),
            }
            const { client, resolution } = await resolveProposalClient({
              tenantClient: options.tenantClient,
              clientName: suppliedPayload.client_name,
              clientId: suppliedPayload.client_id,
            })
            const resolvedPayload = client
              ? { ...suppliedPayload, client_id: client.id, client_name: client.name }
              : suppliedPayload

            const previous = options.previousProposal
            const correctsExistingDraft =
              previous?.operationType === 'create-document' &&
              previous.documentFamily === documentFamily &&
              (previous.status === 'pending_approval' || previous.status === 'approved_pending_save')

            // A correction updates the existing operation. It never becomes a
            // second invoice, and it always drops back to Gate 1 review.
            const proposal = correctsExistingDraft
              ? mergeDocumentCreateProposal(previous, resolvedPayload, resolution)
              : buildDocumentCreateProposal(
                  documentFamily,
                  resolvedPayload,
                  documentFamily === 'quotation' ? 'QTN-DRAFT' : 'INV-DRAFT',
                  resolution,
                )

            if (correctsExistingDraft) mergedFromMessageId = options.previousProposalMessageId ?? null

            proposal.suggestions = buildCommercialSuggestions({
              items: proposal.payload.items,
              payment_terms: proposal.payload.payment_terms,
              title: proposal.payload.title,
            })

            const clarification = clarificationForClientResolution(resolution)
            if (clarification) {
              proposal.clarificationAnswers = undefined
              proposal.clarification = clarification
              if (resolution.status === 'ambiguous') {
                const matchesList = resolution.matches.map((m) => `• ${m.name}`).join('\n')
                finalText = `${finalText}\n\nI found multiple clients matching "${validation.data.client_name}":\n${matchesList}\n\nPlease choose the client below.`
              } else if (resolution.status === 'not_found') {
                finalText = `${finalText}\n\nI couldn't find an existing client named "${validation.data.client_name}" in your business records. Search your client directory below or enter the exact name.`
              } else if (resolution.status === 'search_error') {
                // A failed search is not an empty directory. Never claim no client exists.
                finalText = `${finalText}\n\nI could not search your client directory just now, so no client is attached yet. The draft is kept. Try the client search again in a moment.`
              }
            }

            parsedProposal = proposal
          }
        } else if (rawOp.operationType === 'modify-document') {
          const validation = validateInvoiceModifyInput(rawOp.payload, { documentFamily })
          if (validation.valid && validation.data) {
            let targetNum = documentFamily === 'quotation' ? 'QTN-TARGET' : 'INV-TARGET'
            let snapshot: Awaited<ReturnType<typeof readBoluModifySnapshot>> | null = null
            if (options.tenantClient) {
              try {
                snapshot = await readBoluModifySnapshot(
                  options.tenantClient,
                  documentFamily,
                  validation.data.documentId,
                  options.canRead,
                )
              } catch (snapshotErr) {
                console.warn('[bolu-generation] Modification snapshot lookup failed:', snapshotErr)
                snapshot = null
              }
              if (!snapshot) {
                // Fail-closed: without the persisted baseline the proposal cannot
                // stale-gate the write, so nothing is proposed.
                finalText = `${finalText}\n\nI could not load the current ${documentFamily} with its saved items, so I did not prepare a change proposal. Reopen the document or try again.`
              }
            }
            if (!options.tenantClient || snapshot) {
              let resolvedSignatory: { id: string; name: string; role: string } | null | undefined
              let resolvedBankAccount: { id: string; label: string } | null | undefined
              const presentationPatch = validation.data.presentationChange
              if (options.tenantClient && presentationPatch?.signatory) {
                const resolution = await resolveSignatoryForPresentation(options.tenantClient, presentationPatch.signatory)
                if (resolution.kind === 'resolved') {
                  resolvedSignatory = { id: resolution.id, name: resolution.name, role: resolution.role }
                } else if (resolution.kind === 'ambiguous') {
                  finalText = `${finalText}\n\nI found several signatories matching "${resolution.query}":\n${resolution.matches.map((m) => `• ${m.name}${m.role ? `, ${m.role}` : ''}`).join('\n')}\nTell me which one you mean.`
                } else if (resolution.kind === 'not_found') {
                  finalText = `${finalText}\n\nI could not find a signatory named "${resolution.query}" in this business. Choose an existing signatory and try again.`
                } else {
                  finalText = `${finalText}\n\nI could not check the signatory list just now, so I did not prepare the change. Please try again shortly.`
                }
              }
              if (options.tenantClient && presentationPatch?.pdfOutput?.bankAccountId) {
                const resolution = await resolveBankAccountForPresentation(options.tenantClient, presentationPatch.pdfOutput.bankAccountId)
                if (resolution.kind === 'resolved') {
                  resolvedBankAccount = { id: resolution.id, label: resolution.label }
                } else if (resolution.kind === 'not_found') {
                  finalText = `${finalText}\n\nI could not find that bank account in this business. Choose an existing account and try again.`
                } else {
                  finalText = `${finalText}\n\nI could not check the bank accounts just now, so I did not prepare the change. Please try again shortly.`
                }
              }
              const signatoryFailed = Boolean(presentationPatch?.signatory) && resolvedSignatory === undefined
              const bankFailed = Boolean(presentationPatch?.pdfOutput?.bankAccountId) && resolvedBankAccount === undefined
              if (signatoryFailed || bankFailed) {
                // Referenced records could not be resolved; no proposal is built.
                parsedProposal = null
              } else {
                if (snapshot) targetNum = snapshot.documentNumber
                parsedProposal = buildInvoiceModifyProposal({
                  targetDocumentId: validation.data.documentId,
                  targetDocumentNumber: targetNum,
                  documentFamily,
                  field: validation.data.field,
                  oldValue: validation.data.oldValue,
                  newValue: validation.data.newValue,
                  itemsChange: validation.data.items && validation.data.oldItems
                    ? { oldItems: validation.data.oldItems, newItems: validation.data.items }
                    : undefined,
                  extraChargesChange: validation.data.extraChargesChange,
                  calculationInputsChange: validation.data.calculationInputsChange,
                  customFieldsChange: validation.data.customFieldsChange,
                  groupsChange: validation.data.groupsChange,
                  presentationChange: validation.data.presentationChange,
                  attachmentsChange: validation.data.attachmentsChange,
                  lifecycleChange: validation.data.lifecycleChange,
                  resolvedSignatory,
                  resolvedBankAccount,
                  current: snapshot
                    ? { document: snapshot.document, items: snapshot.items }
                    : undefined,
                })
              // A proposal whose document-fields or groups plan do not resolve
              // against the persisted snapshot must never reach Gate 1.
              const fieldErrors = parsedProposal.customFieldsChange?.errors ?? []
              const groupErrors = parsedProposal.groupsApplication?.errors ?? []
              const attachmentErrors = parsedProposal.attachmentsChange?.errors ?? []
              if (fieldErrors.length > 0 || groupErrors.length > 0 || attachmentErrors.length > 0) {
                finalText = `${finalText}\n\nI could not prepare that change after checking the saved document:\n- ${[...fieldErrors, ...groupErrors, ...attachmentErrors].join('\n- ')}\n\nPlease check the details and try again.`
                parsedProposal = null
              }
              }
            }
          } else {
            finalText = `${finalText}\n\nI could not prepare that document change:\n- ${validation.errors.join('\n- ')}`
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
