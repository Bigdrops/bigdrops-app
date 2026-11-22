/**
 * bolu-proposal-engine.ts — Authoritative Shared Proposal Interpretation Engine
 *
 * Unifies proposal interpretation, input validation, snapshot resolution,
 * client resolution, and proposal construction across both:
 * 1. The in-memory runtime engine (`bolu-runtime.ts` / `bolu-reducer.ts`)
 * 2. The active React thread pipeline (`bolu-generation.ts` / `useBoluThread.ts`)
 *
 * Guarantees that production UI and automated test suites apply identical
 * business rules, snapshot guards, Gate 1 reviews, and fail-closed checks.
 */

import {
  parseStructuredOperationEnvelope,
  validateInvoiceCreateInput,
  validateInvoiceModifyInput,
  validateBoluAdvanceConfigInput,
  buildDocumentCreateProposal,
  mergeDocumentCreateProposal,
  buildInvoiceModifyProposal,
  buildBoluAdvanceConfigProposal,
  clarificationForClientResolution,
  type BoluProposal,
  type BoluClientResolution,
} from './bolu-operations'
import { buildCommercialSuggestions } from './bolu-commercial-language'
import type { TenantClient } from '@/lib/tenantClient'
import {
  readBoluClient,
  searchBoluClients,
  readBoluInvoiceAdvanceConfig,
  readBoluModifySnapshot,
  resolveSignatoryForPresentation,
  resolveBankAccountForPresentation,
  type BoluClientMatch,
  type BoluReadAuthorization,
} from './bolu-data'


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

export interface InterpretBoluProposalInput {
  rawText: string
  tenantClient?: TenantClient
  canRead?: BoluReadAuthorization
  previousProposal?: BoluProposal | null
  previousProposalMessageId?: string | null
}

export interface InterpretBoluProposalResult {
  hasOperation: boolean
  proposal: BoluProposal | null
  finalText: string
  mergedFromMessageId: string | null
  error?: string
}

/**
 * Authoritative interpretation of AI model output into a validated Bolu proposal.
 * Used identically by bolu-generation (live UI) and bolu-runtime (headless/tests).
 */
export async function interpretBoluProposal(
  input: InterpretBoluProposalInput,
): Promise<InterpretBoluProposalResult> {
  let finalText = input.rawText.replace(/—/g, ' - ').replace(/–/g, '-')
  let parsedProposal: BoluProposal | null = null
  let mergedFromMessageId: string | null = null
  const envelope = parseStructuredOperationEnvelope(finalText)

  if (!envelope.hasOperation) {
    return {
      hasOperation: false,
      proposal: null,
      finalText,
      mergedFromMessageId: null,
    }
  }

  if (envelope.error) {
    const errorMsg = `I received an operation proposal, but the structured payload was malformed:\n- ${envelope.error}`
    return {
      hasOperation: true,
      proposal: null,
      finalText: `${finalText}\n\n${errorMsg}`,
      mergedFromMessageId: null,
      error: envelope.error,
    }
  }

  if (!envelope.rawOperation) {
    return {
      hasOperation: true,
      proposal: null,
      finalText,
      mergedFromMessageId: null,
    }
  }

  const rawOp = envelope.rawOperation as Record<string, unknown>
  const opType = rawOp.operationType
  const documentFamily: 'invoice' | 'quotation' | null =
    rawOp.documentFamily === 'invoice' || rawOp.documentFamily === 'quotation'
      ? rawOp.documentFamily
      : null

  // Reject unsupported operation types
  if (opType !== 'create-document' && opType !== 'modify-document' && opType !== 'advance-invoice-config') {
    const errorMsg = `Unsupported operation type "${String(opType)}". Bolu supports creating and modifying documents, and Advance Invoice configuration on invoices.`
    return {
      hasOperation: true,
      proposal: null,
      finalText: `${finalText}\n\n${errorMsg}`,
      mergedFromMessageId: null,
      error: errorMsg,
    }
  }

  // Reject unsupported document families
  if (opType !== 'advance-invoice-config' && !documentFamily) {
    const docFamilyRaw = String(rawOp.documentFamily ?? '')
    const errorMsg = `I detected a proposal for document family "${docFamilyRaw}", but Bolu currently only supports invoices and quotations.`
    return {
      hasOperation: true,
      proposal: null,
      finalText: `${finalText}\n\n${errorMsg}`,
      mergedFromMessageId: null,
      error: errorMsg,
    }
  }

  // Case 1: Advance Invoice Configuration
  if (opType === 'advance-invoice-config') {
    const advPayload =
      rawOp.payload && typeof rawOp.payload === 'object' && !Array.isArray(rawOp.payload)
        ? (rawOp.payload as Record<string, unknown>)
        : {}
    const validation = validateBoluAdvanceConfigInput({ ...advPayload, documentFamily: 'invoice' })
    if (validation.valid && validation.data) {
      let snapshot = null as Awaited<ReturnType<typeof readBoluInvoiceAdvanceConfig>> | null
      if (input.tenantClient) {
        try {
          snapshot = await readBoluInvoiceAdvanceConfig(
            input.tenantClient,
            validation.data.targetDocumentId,
            input.canRead ?? (() => true),
          )
        } catch (advErr) {
          console.warn('[bolu-proposal-engine] Advance Invoice snapshot lookup failed:', advErr)
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
      } else if (input.tenantClient) {
        finalText = `${finalText}\n\nI could not locate that parent invoice in your business records. I did not prepare an Advance Invoice proposal.`
      }
    } else {
      finalText = `${finalText}\n\nI could not prepare the Advance Invoice proposal:\n- ${validation.errors.join('\n- ')}`
    }
    return {
      hasOperation: true,
      proposal: parsedProposal,
      finalText,
      mergedFromMessageId: null,
    }
  }

  // Case 2: Create Document
  if (opType === 'create-document' && documentFamily) {
    const validation = validateInvoiceCreateInput(rawOp.payload)
    if (validation.valid && validation.data) {
      // Gate 1 sees the supplied wording. Any improvement is offered as a
      // recommendation and applied only after the user accepts that exact
      // wording and approves the proposal.
      const suppliedPayload = validation.data
      const { client, resolution } = await resolveProposalClient({
        tenantClient: input.tenantClient,
        clientName: suppliedPayload.client_name,
        clientId: suppliedPayload.client_id,
      })
      const resolvedPayload = client
        ? { ...suppliedPayload, client_id: client.id, client_name: client.name }
        : suppliedPayload

      const previous = input.previousProposal
      const correctsExistingDraft =
        previous?.operationType === 'create-document' &&
        previous.documentFamily === documentFamily &&
        (previous.status === 'pending_approval' || previous.status === 'approved_pending_save')

      const proposal = correctsExistingDraft
        ? mergeDocumentCreateProposal(previous, resolvedPayload, resolution)
        : buildDocumentCreateProposal(
            documentFamily,
            resolvedPayload,
            documentFamily === 'quotation' ? 'QTN-DRAFT' : 'INV-DRAFT',
            resolution,
          )

      if (correctsExistingDraft) mergedFromMessageId = input.previousProposalMessageId ?? null

      // The builder attaches wording recommendations as `pending`. A
      // regenerated proposal therefore starts from supplied wording again: no
      // decision is assumed from an earlier turn.
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
          finalText = `${finalText}\n\nI could not search your client directory just now, so no client is attached yet. The draft is kept. Try the client search again in a moment.`
        }
      }

      parsedProposal = proposal
    } else {
      finalText = `${finalText}\n\nI attempted to prepare the ${documentFamily} creation proposal, but required details were invalid or missing:\n- ${validation.errors.join('\n- ')}`
    }
    return {
      hasOperation: true,
      proposal: parsedProposal,
      finalText,
      mergedFromMessageId,
    }
  }

  // Case 3: Modify Document
  if (opType === 'modify-document' && documentFamily) {
    const validation = validateInvoiceModifyInput(rawOp.payload, { documentFamily })
    if (validation.valid && validation.data) {
      let targetNum = documentFamily === 'quotation' ? 'QTN-TARGET' : 'INV-TARGET'
      let snapshot: Awaited<ReturnType<typeof readBoluModifySnapshot>> | null = null
      if (input.tenantClient) {
        try {
          snapshot = await readBoluModifySnapshot(
            input.tenantClient,
            documentFamily,
            validation.data.documentId,
            input.canRead ?? (() => true),
          )
        } catch (snapshotErr) {
          console.warn('[bolu-proposal-engine] Modification snapshot lookup failed:', snapshotErr)
          snapshot = null
        }
        if (!snapshot) {
          // Fail-closed: without persisted baseline the proposal cannot stale-gate the write
          finalText = `${finalText}\n\nI could not load the current ${documentFamily} with its saved items, so I did not prepare a change proposal. Reopen the document or try again.`
          return {
            hasOperation: true,
            proposal: null,
            finalText,
            mergedFromMessageId: null,
          }
        }
      }
      if (!input.tenantClient || snapshot) {
        let resolvedSignatory: { id: string; name: string; role: string } | null | undefined
        let resolvedBankAccount: { id: string; label: string } | null | undefined
        const presentationPatch = validation.data.presentationChange
        if (input.tenantClient && presentationPatch?.signatory) {
          const resolution = await resolveSignatoryForPresentation(input.tenantClient, presentationPatch.signatory)
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
        if (input.tenantClient && presentationPatch?.pdfOutput?.bankAccountId) {
          const resolution = await resolveBankAccountForPresentation(input.tenantClient, presentationPatch.pdfOutput.bankAccountId)
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

          const fieldErrors = parsedProposal.customFieldsChange?.errors ?? []
          const groupErrors = parsedProposal.groupsApplication?.errors ?? []
          const attachmentErrors = parsedProposal.attachmentsChange?.errors ?? []
          if (fieldErrors.length > 0 || groupErrors.length > 0 || attachmentErrors.length > 0) {
            finalText = `${finalText}\n\nI could not prepare that change after checking the saved ${documentFamily}:\n- ${[...fieldErrors, ...groupErrors, ...attachmentErrors].join('\n- ')}\n\nPlease check the details and try again.`
            parsedProposal = null
          }
        }
      }
    } else {
      finalText = `${finalText}\n\nI could not prepare that document change:\n- ${validation.errors.join('\n- ')}`
    }
    return {
      hasOperation: true,
      proposal: parsedProposal,
      finalText,
      mergedFromMessageId: null,
    }
  }

  return {
    hasOperation: true,
    proposal: null,
    finalText,
    mergedFromMessageId: null,
  }
}
