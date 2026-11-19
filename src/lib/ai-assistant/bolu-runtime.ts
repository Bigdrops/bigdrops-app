import { type BoluPageContext, type BoluRecordReference } from './bolu-context'
import { extractBoluSearchTerm, getAvailableBoluCapabilities, matchBoluIntent } from './bolu-capabilities'
import {
  readBoluContextFacts,
  readBoluInvoice,
  readBoluQuotation,
  resolveOperationFacts,
  searchBoluInvoices,
  searchBoluQuotations,
  type BoluReadAuthorization,
  type BoluWriteAuthorization,
} from './bolu-data'
import { sendBoluProviderRequest } from './bolu-transport'
import type { TenantClient } from '@/lib/tenantClient'
import {
  isProposalStale,
} from './bolu-operations'
import {
  interpretBoluProposal,
} from './bolu-proposal-engine'
// Architecture note: buildBoluAdvanceConfigProposal and proposal interpretation
// are unified in bolu-proposal-engine for both bolu-runtime and bolu-generation.
import {
  persistInvoiceCreation,
  persistInvoiceModification,
  persistQuotationModification,
  persistAdvanceInvoiceConfig,
  type BoluOperationExecutionResult,
} from './bolu-document-service'
import {
  buildProviderMessages,
  factsAsPrompt,
  formatFactAnswer,
} from './bolu-formatting'
import {
  boluConversationReducer,
  createBoluConversationState,
  nextRequestId,
  type BoluMessage,
  type BoluRuntimeAction,
  type BoluRuntimeState,
  type BoluRuntimeStatus,
} from './bolu-reducer'

export type {
  BoluMessage,
  BoluRuntimeAction,
  BoluRuntimeState,
  BoluRuntimeStatus,
}
export {
  boluConversationReducer,
  createBoluConversationState,
}

export type BoluRuntimeDependencies = {
  tenantClient: TenantClient
  entityId?: string | null
  canRead: BoluReadAuthorization
  canWrite: BoluWriteAuthorization
  providerAvailable: boolean
  providerSend?: typeof sendBoluProviderRequest
}

export function createBoluRuntime(dependencies: BoluRuntimeDependencies) {
  let state: BoluRuntimeState | null = null
  let abortController: AbortController | null = null
  const listeners = new Set<(next: BoluRuntimeState) => void>()

  const notify = () => {
    if (state) listeners.forEach((listener) => listener(state as BoluRuntimeState))
  }
  const dispatch = (action: BoluRuntimeAction) => {
    if (!state) return
    state = boluConversationReducer(state, action)
    notify()
  }

  return {
    getState: () => state,
    subscribe(listener: (next: BoluRuntimeState) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    open(context: BoluPageContext) {
      if (!state) {
        state = createBoluConversationState(context)
        notify()
      } else {
        dispatch({ type: 'REOPEN', context })
      }
    },
    applyContext() {
      dispatch({ type: 'APPLY_CONTEXT' })
    },
    async submit(text: string) {
      const clean = text.trim()
      if (!state || !clean || state.status !== 'idle') return
      const requestId = nextRequestId()
      dispatch({ type: 'SUBMIT', text: clean, requestId })

      let verifiedFacts: Awaited<ReturnType<typeof readBoluContextFacts>> | null = null
      let factAnswer = ''

      try {
        const capability = matchBoluIntent(clean, state.context)

        // Write/mutation intents still hydrate relevant business records.
        if (!capability) {
          verifiedFacts = await resolveOperationFacts({
            text: clean,
            tenantClient: dependencies.tenantClient,
            pageContext: state.context,
            canRead: dependencies.canRead,
          })
        }

        // Read intent lookup
        if (capability) {
          const current = state
          const intentContext: BoluPageContext = {
            ...current.context,
            filters: { ...current.context.filters, query: extractBoluSearchTerm(clean) },
          }
          const isDiscovery = capability === 'search-invoices' || capability === 'search-quotations'
          if (isDiscovery && intentContext.filters.query.length >= 2) {
            const search = capability === 'search-quotations' ? searchBoluQuotations : searchBoluInvoices
            const matches = await search(
              dependencies.tenantClient,
              intentContext.filters.query,
              dependencies.canRead,
            )
            if (matches.records.length === 1) {
              const only = matches.records[0]
              if (only.kind === 'invoice') {
                const invoice = await readBoluInvoice(dependencies.tenantClient, only.id, dependencies.canRead)
                const facts = invoice
                  ? { kind: 'records' as const, records: [invoice], hasMore: false }
                  : { kind: 'records' as const, records: [], hasMore: false }
                dispatch({ type: 'RESULT', requestId, content: formatFactAnswer(facts, clean), records: facts })
                return
              }
              dispatch({
                type: 'RESULT',
                requestId,
                content: formatFactAnswer(
                  { kind: 'records', records: matches.records, hasMore: matches.hasMore },
                  clean,
                ),
                records: { kind: 'records', records: matches.records, hasMore: matches.hasMore },
              })
              return
            }
            dispatch({
              type: 'RESULT',
              requestId,
              content: matches.records.length
                ? 'I found several matching records. Choose one below to continue with that record.'
                : 'I could not find a matching record. Try a document number or customer name.',
              records: { kind: 'records', records: matches.records, hasMore: matches.hasMore },
            })
            return
          }

          const facts = await readBoluContextFacts(
            dependencies.tenantClient,
            capability,
            intentContext,
            dependencies.canRead,
          )
          verifiedFacts = facts
          factAnswer = formatFactAnswer(facts, clean)

          if (!dependencies.providerAvailable || !dependencies.providerSend) {
            dispatch({ type: 'RESULT', requestId, content: factAnswer, records: facts })
            return
          }
        }

        // Provider invocation
        if (!dependencies.providerAvailable || !dependencies.providerSend) {
          dispatch({
            type: 'RESULT',
            requestId,
            content: 'Bolu is available in offline mode. I can retrieve business records and verify invoices, but automated proposals require a provider.',
          })
          return
        }

        const current = state
        abortController = new AbortController()
        const providerMessages = buildProviderMessages(current.messages)

        dispatch({ type: 'STATUS', status: 'sending' })

        const factsPrompt = verifiedFacts ? factsAsPrompt(verifiedFacts) : 'No specific record queried yet.'

        const response = await dependencies.providerSend({
          messages: providerMessages,
          contextFacts: [
            'You are Bolu, a BOUXRE conversational business operations assistant.',
            'You support reading authorized business records, preparing structured document proposals, and guiding document persistence.',
            'Two approval gates are in effect:',
            '  1. User must explicitly approve proposed changes before application applies them.',
            '  2. User must explicitly confirm before documents are saved or filed.',
            'Never claim changes were saved without Gate 2 confirmation.',
            'Financial calculations remain authoritative and must not be independently calculated or altered by the model.',
            'When proposing a document creation or modification, output a structured JSON code block:',
            '```json',
            '{',
            '  "bolu_operation": {',
            '    "operationType": "create-document" | "modify-document" | "advance-invoice-config",',
            '    "documentFamily": "invoice" | "quotation",',
            '    "payload": { ... }',
            '  }',
            '}',
            '```',
            'Advance Invoice configuration lives on the parent invoice only; it never creates a separate advance record. For it use "operationType": "advance-invoice-config" with payload { "targetDocumentId": "<parent invoice UUID>", "intent": "configure" | "update" | "remove", "newValues": { ... } }. Only these fields may be changed: "suffix" (string), "mode" ("percentage" | "percent" | "fixed"), "value" (number; 0-100 for percentage modes), "primary_label" (string), "secondary_label" (string). For "update" include only the fields to change; for "remove" do not include "newValues". Never output "oldValues": the application fills them from the persisted configuration. Target the parent invoice only via its verified UUID from the application facts. Configure/update/remove require Gate 1 review and Gate 2 confirmation.',
            'Authorized application facts:',
            factsPrompt,
          ].join('\n'),
          signal: abortController.signal,
          onDelta: (delta) => dispatch({ type: 'DELTA', requestId, delta }),
        })

        // Inspect response for structured operation
        const interpretation = await interpretBoluProposal({
          rawText: response.text,
          tenantClient: dependencies.tenantClient,
          canRead: dependencies.canRead,
          previousProposal: state.activeProposal,
        })

        if (interpretation.hasOperation) {
          dispatch({
            type: 'RESULT',
            requestId,
            content: interpretation.finalText,
            proposal: interpretation.proposal ?? undefined,
          })
          return
        }

        // Standard text response
        dispatch({ type: 'RESULT', requestId, content: response.text, records: verifiedFacts ?? undefined })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          dispatch({ type: 'RESULT', requestId, content: 'I stopped that request.' })
          return
        }
        if (verifiedFacts) {
          dispatch({
            type: 'RESULT',
            requestId,
            content: `${factAnswer}\n\nThe AI service is unavailable, so this is the verified record information only.`,
            records: verifiedFacts,
          })
          return
        }
        dispatch({
          type: 'ERROR',
          requestId,
          message: error instanceof Error ? error.message : 'Bolu could not answer this request.',
        })
      }
    },
    async suggest(suggestionId: string) {
      if (!state || state.status !== 'idle') return
      const suggestions = getAvailableBoluCapabilities(state.context)
      if (!suggestions.length) return
      await this.submit(suggestionId)
    },
    async searchRecords(term: string, kind: 'invoice' | 'quotation' = 'invoice') {
      if (!state) return
      dispatch({ type: 'STATUS', status: 'searching' })
      try {
        const result = kind === 'invoice'
          ? await searchBoluInvoices(dependencies.tenantClient, term, dependencies.canRead)
          : await searchBoluQuotations(dependencies.tenantClient, term, dependencies.canRead)
        dispatch({ type: 'PICKER_RESULTS', records: result.records, hasMore: result.hasMore })
      } catch (error) {
        if (state) {
          state = {
            ...state,
            status: 'idle',
            error: error instanceof Error ? error.message : 'Record search failed.',
          }
          notify()
        }
      }
    },
    async selectRecord(reference: BoluRecordReference) {
      if (!state) return
      const nextContext = {
        ...state.context,
        record: reference,
      }
      state = { ...state, context: nextContext, pendingContext: null }
      notify()
      await this.submit(reference.kind === 'invoice' ? 'Explain this invoice' : 'Show this quotation status')
    },
    approveProposal(opId?: string) {
      if (!state?.activeProposal) return
      if (opId && state.activeProposal.opId !== opId) return
      if (isProposalStale(state.activeProposal)) {
        dispatch({ type: 'ERROR', requestId: state.activeRequestId ?? 0, message: 'This proposal has expired. Please propose again.' })
        return
      }
      dispatch({ type: 'GATE1_APPROVE', opId })
    },
    rejectProposal(opId?: string) {
      if (!state?.activeProposal) return
      if (opId && state.activeProposal.opId !== opId) return
      dispatch({ type: 'GATE1_REJECT', opId })
    },
    async confirmSave(opId?: string) {
      if (!state?.activeProposal) return
      if (opId && state.activeProposal.opId !== opId) return
      if (state.activeProposal.status !== 'approved_pending_save') return

      const proposal = state.activeProposal
      dispatch({ type: 'GATE2_START_SAVE', opId })

      let execResult: BoluOperationExecutionResult
      if (proposal.operationType === 'create-document') {
        execResult = await persistInvoiceCreation(
          dependencies.tenantClient,
          proposal,
          dependencies.canWrite,
          dependencies.canRead,
          dependencies.entityId,
        )
      } else if (proposal.operationType === 'advance-invoice-config') {
        execResult = await persistAdvanceInvoiceConfig(
          dependencies.tenantClient,
          proposal,
          dependencies.canWrite,
          dependencies.canRead,
        )
      } else if (proposal.documentFamily === 'quotation') {
        execResult = await persistQuotationModification(
          dependencies.tenantClient,
          proposal,
          dependencies.canWrite,
          dependencies.canRead,
          dependencies.entityId,
        )
      } else {
        execResult = await persistInvoiceModification(
          dependencies.tenantClient,
          proposal,
          dependencies.canWrite,
          dependencies.canRead,
          dependencies.entityId,
        )
      }

      if (execResult.success) {
        dispatch({ type: 'GATE2_SAVE_SUCCESS', result: execResult, operationType: proposal.operationType })
      } else {
        dispatch({ type: 'GATE2_SAVE_FAILURE', error: execResult.error || 'Failed to save document' })
      }
    },
    cancelSave() {
      dispatch({ type: 'GATE2_CANCEL_SAVE' })
    },
    stop() {
      abortController?.abort()
      abortController = null
      dispatch({ type: 'STOP' })
    },
  }
}

