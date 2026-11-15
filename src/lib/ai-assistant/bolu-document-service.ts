/**
 * bolu-document-service.ts — Application-Side Persistence Service for Bolu Operations
 *
 * Implements authoritative application-owned execution and database persistence
 * for invoices and quotations initiated through Bolu.
 *
 * Strict Guardrails:
 * - Enforces authorization at the tenant boundary and database RPC.
 * - Reuses existing transactional RPC (`save_invoice_with_items_transaction`) when entityId is present.
 * - Employs `withUniqueRetry` for collision-safe sequence numbering.
 * - Cleans up partial writes if sequential fallback is used.
 * - Enforces Gate 1 and Gate 2 before database writes.
 * - Recalculates financial fields via authoritative `calculateDocument`.
 * - Prevents duplicate submissions and rejects stale proposals.
 */

import { numberToWords } from '@/lib/formatters/money'
import type { TenantClient } from '@/lib/tenantClient'
import { toDbItem } from '@/domain/invoice'
import { getNextInvoiceNumber } from '@/domain/documentConversion'
import { resolvePrefix } from '@/domain/prefixConstants'
import { advanceAutoCursor, fetchAutoCursor } from '@/domain/documentNumbering'
import { getNextQuotationNumber } from '@/domain/quotation'
import { parseTrailingSequence } from '@/domain/prefixConstants'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import type { BoluReadAuthorization, BoluWriteAuthorization } from './bolu-data'
import {
  computeAuthoritativeTotals,
  isProposalStale,
  type BoluInvoiceCreateProposal,
  type BoluInvoiceModifyProposal,
} from './bolu-operations'

// Track executed opIds to prevent duplicate submissions or replay attacks
const executedOperationIds = new Set<string>()

export interface BoluOperationExecutionResult {
  success: boolean
  documentId?: string
  documentNumber?: string
  error?: string
}

/**
 * Asserts that the tenant is ready and has a valid authenticated schema.
 */
function assertTenantAuthorization(
  tenantClient: TenantClient,
  canWrite: BoluWriteAuthorization,
  resource: 'invoice' | 'quotation',
): void {
  if (!tenantClient.isReady || !tenantClient.schemaName) {
    throw new Error('Tenant context is not ready or unauthorized.')
  }
  if (!canWrite(resource, 'save')) {
    throw new Error(`You do not have permission to save ${resource}s in this business entity.`)
  }
}

/**
 * Executes persistence for an approved document creation proposal.
 *
 * Routes by `documentFamily`: quotations write to `quotations` and
 * `quotation_items`, invoices to `invoices` and `invoice_items`.
 */
export async function persistInvoiceCreation(
  tenantClient: TenantClient,
  proposal: BoluInvoiceCreateProposal,
  canWrite: BoluWriteAuthorization,
  canRead: BoluReadAuthorization,
  entityId?: string | null,
): Promise<BoluOperationExecutionResult> {
  if (proposal?.documentFamily === 'quotation') {
    return persistQuotationCreation(tenantClient, proposal, canWrite, canRead, entityId)
  }

  assertTenantAuthorization(tenantClient, canWrite, 'invoice')

  if (!proposal || !proposal.opId) {
    throw new Error('Valid proposal is required for persistence.')
  }

  if (!canRead('invoice', 'view')) {
    return { success: false, error: 'Read authorization missing for invoice verification.' }
  }

  // Prevent duplicate execution
  if (executedOperationIds.has(proposal.opId)) {
    return { success: false, error: 'This operation has already been submitted and executed.' }
  }

  // Stale check
  if (isProposalStale(proposal)) {
    return { success: false, error: 'This proposal has expired. Please create a new proposal.' }
  }

  // Gate check: Must be approved and confirmed for save
  if (proposal.status !== 'approved_pending_save' && proposal.status !== 'saving') {
    return { success: false, error: 'Operation requires user approval (Gate 1) and save confirmation (Gate 2).' }
  }

  try {
    // 1. Authoritative financial recalculation
    const calculation = computeAuthoritativeTotals(proposal.payload.items)

    // 2. Authoritative numbering setup with collision retry
    const invoicePrefix = resolvePrefix(undefined, 'invoice')
    const invoiceFamily = `${invoicePrefix}-`
    const regenerateInvoiceNumber = async () => {
      const [{ data: rows }, cursor] = await Promise.all([
        tenantClient.from('invoices').select('invoice_number'),
        fetchAutoCursor(tenantClient, invoiceFamily),
      ])
      return getNextInvoiceNumber(rows || [], invoicePrefix, cursor)
    }

    // 3. Prepare complete database fields matching useInvoiceSave
    const basePayload = {
      po_number: null,
      invoice_title: null,
      client_id: proposal.payload.client_id ?? null,
      client_name: proposal.payload.client_name,
      project_id: null,
      issue_date: proposal.payload.issue_date || new Date().toISOString().split('T')[0],
      due_date: proposal.payload.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'unpaid',
      document_type: 'invoice',
      payment_terms: proposal.payload.payment_terms || '',
      notes: proposal.payload.notes || '',
      terms: proposal.payload.payment_terms || '',
      workmanship: 0,
      transportation: 0,
      shipping: 0,
      discount: 0,
      vat: calculation.vat,
      wht: calculation.wht,
      custom_fields: JSON.stringify({
        created_via: 'bolu_assistant',
        operation_id: proposal.opId,
      }),
      work_duration: null,
      subtotal: calculation.subtotal,
      install_rate_total: 0,
      total: calculation.totalPayable,
      amount_in_words: numberToWords(calculation.totalPayable),
    }

    const itemsToSave = proposal.payload.items.map((item, index) =>
      toDbItem(
        {
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit: item.unit || '',
          row_type: 'standard',
        } as any,
        null,
        index,
      ),
    )

    // 4. Persistence with collision-safe unique retry
    let createdInvoice: { id: string; invoice_number: string } | null = null

    const retryResult = await withUniqueRetry(
      async (candidateNumber: string) => {
        const payload = { ...basePayload, invoice_number: candidateNumber }

        // Phase 3 atomic transaction when entityId is available
        if (entityId) {
          const { data, error } = await tenantClient.rpc('save_invoice_with_items_transaction', {
            p_entity_id: entityId,
            p_invoice_payload: payload,
            p_items: itemsToSave,
            p_mode: 'create',
          })
          if (error) return { data: null, error: error as any }
          const rpcResult = Array.isArray(data) ? data[0] : data
          const resolved = rpcResult?.invoice ?? rpcResult
          return {
            data: {
              id: resolved?.id ?? rpcResult?.id,
              invoice_number: resolved?.invoice_number ?? payload.invoice_number,
            },
            error: null,
          }
        }

        // Sequential fallback (pre-cutover or test mock)
        return (tenantClient.from('invoices') as any)
          .insert([payload])
          .select('id, invoice_number')
          .single() as Promise<{ data: any; error: any }>
      },
      regenerateInvoiceNumber,
    )

    if (retryResult.error || !retryResult.data) {
      return {
        success: false,
        error: `Failed to persist invoice: ${retryResult.error?.message || 'Database insert failed'}`,
      }
    }

    createdInvoice = retryResult.data
    const effectiveId = createdInvoice.id
    const effectiveNumber = createdInvoice.invoice_number

    // 5. If sequential fallback was used (no entityId), insert items with rollback on error
    if (!entityId) {
      const itemsWithInvoiceId = itemsToSave.map((item) => ({ ...item, invoice_id: effectiveId }))
      const { error: itemsError } = await (tenantClient.from('invoice_items') as any).insert(itemsWithInvoiceId)

      if (itemsError) {
        console.error('[bolu-persistence] Error saving items; rolling back header:', itemsError.message)
        await (tenantClient.from('invoices') as any).delete().eq('id', effectiveId)
        return {
          success: false,
          error: `Invoice item saving failed: ${itemsError.message}. The draft was rolled back.`,
        }
      }
    }

    // 6. Advance automatic numbering cursor
    const seq = parseTrailingSequence(effectiveNumber)
    if (seq !== null) {
      await advanceAutoCursor(tenantClient, invoiceFamily, seq)
    }

    // Mark operation as executed to prevent duplicates
    executedOperationIds.add(proposal.opId)

    return {
      success: true,
      documentId: effectiveId,
      documentNumber: effectiveNumber,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected persistence error'
    return { success: false, error: message }
  }
}

/**
 * Executes persistence for an approved quotation creation proposal.
 *
 * The quotation payload reuses the invoice payload contract and recomputes
 * every financial field through `computeAuthoritativeTotals`, so a quotation
 * can never carry model-generated totals.
 */
export async function persistQuotationCreation(
  tenantClient: TenantClient,
  proposal: BoluInvoiceCreateProposal,
  canWrite: BoluWriteAuthorization,
  canRead: BoluReadAuthorization,
  entityId?: string | null,
): Promise<BoluOperationExecutionResult> {
  assertTenantAuthorization(tenantClient, canWrite, 'quotation')

  if (!proposal || !proposal.opId) {
    throw new Error('Valid proposal is required for persistence.')
  }

  if (!canRead('quotation', 'view')) {
    return { success: false, error: 'Read authorization missing for quotation verification.' }
  }

  if (executedOperationIds.has(proposal.opId)) {
    return { success: false, error: 'This operation has already been submitted and executed.' }
  }

  if (isProposalStale(proposal)) {
    return { success: false, error: 'This proposal has expired. Please create a new proposal.' }
  }

  if (proposal.status !== 'approved_pending_save' && proposal.status !== 'saving') {
    return { success: false, error: 'Operation requires user approval (Gate 1) and save confirmation (Gate 2).' }
  }

  try {
    // 1. Authoritative financial recalculation (identical engine to invoices)
    const calculation = computeAuthoritativeTotals(proposal.payload.items)

    // 2. Authoritative numbering setup with collision retry
    const quotationPrefix = resolvePrefix(undefined, 'quotation')
    const quotationFamily = `${quotationPrefix}-`
    const regenerateQuotationNumber = async () => {
      const [{ data: rows }, cursor] = await Promise.all([
        tenantClient.from('quotations').select('quotation_number'),
        fetchAutoCursor(tenantClient, quotationFamily),
      ])
      return getNextQuotationNumber(rows || [], quotationPrefix, cursor)
    }

    // 3. Prepare database fields matching the quotation save contract
    const basePayload = {
      quotation_number: '',
      po_number: null,
      quotation_title: null,
      client_id: proposal.payload.client_id ?? null,
      client_name: proposal.payload.client_name,
      project_id: null,
      issue_date: proposal.payload.issue_date || new Date().toISOString().split('T')[0],
      valid_until: proposal.payload.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'open',
      notes: proposal.payload.notes || '',
      terms: proposal.payload.payment_terms || '',
      workmanship: 0,
      transportation: 0,
      shipping: 0,
      discount: 0,
      vat: calculation.vat,
      wht: calculation.wht,
      subtotal: calculation.subtotal,
      install_rate_total: 0,
      total: calculation.totalPayable,
      amount_in_words: numberToWords(calculation.totalPayable),
      custom_fields: JSON.stringify({
        created_via: 'bolu_assistant',
        operation_id: proposal.opId,
      }),
    }

    const itemsToSave = proposal.payload.items.map((item, index) =>
      toDbItem(
        {
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit: item.unit || '',
          row_type: 'standard',
        } as any,
        null,
        index,
      ),
    )

    // 4. Persistence with collision-safe unique retry
    const retryResult = await withUniqueRetry(
      async (candidateNumber: string) => {
        const payload = { ...basePayload, quotation_number: candidateNumber }

        // Phase 3.5 atomic quotation transaction when entityId is available
        if (entityId) {
          const { data, error } = await tenantClient.rpc('save_quotation_with_items_transaction', {
            p_entity_id: entityId,
            p_quotation_payload: payload,
            p_items: itemsToSave,
            p_mode: 'create',
            p_cps_feedback: null,
          })
          if (error) return { data: null, error: error as any }
          const rpcResult = Array.isArray(data) ? data[0] : data
          const resolved = rpcResult?.quotation ?? rpcResult
          return {
            data: {
              id: resolved?.id ?? rpcResult?.id,
              quotation_number: resolved?.quotation_number ?? payload.quotation_number,
            },
            error: null,
          }
        }

        // Sequential fallback (pre-cutover or test mock)
        return (tenantClient.from('quotations') as any)
          .insert([payload])
          .select('id, quotation_number')
          .single() as Promise<{ data: any; error: any }>
      },
      regenerateQuotationNumber,
    )

    if (retryResult.error || !retryResult.data) {
      return {
        success: false,
        error: `Failed to persist quotation: ${retryResult.error?.message || 'Database insert failed'}`,
      }
    }

    const effectiveId = retryResult.data.id as string
    const effectiveNumber = retryResult.data.quotation_number as string

    // 5. Sequential fallback writes items separately, with header rollback on error
    if (!entityId) {
      const itemsWithQuotationId = itemsToSave.map((item) => ({ ...item, quotation_id: effectiveId }))
      const { error: itemsError } = await (tenantClient.from('quotation_items') as any).insert(itemsWithQuotationId)

      if (itemsError) {
        console.error('[bolu-persistence] Error saving quotation items; rolling back header:', itemsError.message)
        await (tenantClient.from('quotations') as any).delete().eq('id', effectiveId)
        return {
          success: false,
          error: `Quotation item saving failed: ${itemsError.message}. The draft was rolled back.`,
        }
      }
    }

    // 6. Advance the automatic numbering cursor
    const seq = parseTrailingSequence(effectiveNumber)
    if (seq !== null) {
      await advanceAutoCursor(tenantClient, quotationFamily, seq)
    }

    executedOperationIds.add(proposal.opId)

    return {
      success: true,
      documentId: effectiveId,
      documentNumber: effectiveNumber,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected persistence error'
    return { success: false, error: message }
  }
}

/**
 * Executes persistence for an approved invoice modification proposal.
 */
export async function persistInvoiceModification(
  tenantClient: TenantClient,
  proposal: BoluInvoiceModifyProposal,
  canWrite: BoluWriteAuthorization,
  canRead: BoluReadAuthorization,
  entityId?: string | null,
): Promise<BoluOperationExecutionResult> {
  assertTenantAuthorization(tenantClient, canWrite, 'invoice')

  if (!proposal || !proposal.opId) {
    throw new Error('Valid proposal is required for persistence.')
  }

  if (!canRead('invoice', 'modify')) {
    return { success: false, error: 'Modify authorization missing for this invoice.' }
  }

  // Prevent duplicate execution
  if (executedOperationIds.has(proposal.opId)) {
    return { success: false, error: 'This modification has already been submitted and executed.' }
  }

  // Stale check
  if (isProposalStale(proposal)) {
    return { success: false, error: 'This proposal has expired. Please propose the change again.' }
  }

  // Gate check
  if (proposal.status !== 'approved_pending_save' && proposal.status !== 'saving') {
    return { success: false, error: 'Modification requires user approval (Gate 1) and save confirmation (Gate 2).' }
  }

  try {
    // 1. Fetch current authoritative document state to verify existence & prevent stale writes
    const { data: currentDoc, error: fetchError } = await tenantClient
      .from('invoices')
      .select('id, invoice_number, client_name, notes, terms, due_date, issue_date, total, archived_at')
      .eq('id', proposal.targetDocumentId)
      .is('archived_at', null)
      .single()

    if (fetchError || !currentDoc) {
      return { success: false, error: 'Target invoice could not be found or has been archived.' }
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // 2. Handle field modifications
    if (proposal.field) {
      const dbField = proposal.field === 'payment_terms' ? 'terms' : proposal.field
      const currentValueInDb = (currentDoc as any)[dbField]

      // Concurrency check
      if (proposal.oldValue !== undefined && proposal.oldValue !== null && String(currentValueInDb) !== String(proposal.oldValue)) {
        return {
          success: false,
          error: `Document has been modified by another process (current ${proposal.field}: "${currentValueInDb}"). Proposal is stale.`,
        }
      }

      updates[dbField] = proposal.newValue
    }

    // 3. Handle line item modifications if present
    let itemsToSave: any[] = []
    if (proposal.itemsChange?.newItems) {
      const calculation = computeAuthoritativeTotals(proposal.itemsChange.newItems)
      updates.subtotal = calculation.subtotal
      updates.vat = calculation.vat
      updates.total = calculation.totalPayable
      updates.amount_in_words = numberToWords(calculation.totalPayable)

      itemsToSave = proposal.itemsChange.newItems.map((item, idx) =>
        toDbItem(
          {
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit: item.unit || '',
            row_type: 'standard',
          } as any,
          proposal.targetDocumentId,
          idx,
        ),
      )
    }

    // 4. Atomic RPC update when entityId is present and items are modified
    if (entityId && proposal.itemsChange?.newItems) {
      const payload = {
        ...currentDoc,
        ...updates,
        id: proposal.targetDocumentId,
      }
      const { error: rpcError } = await tenantClient.rpc('save_invoice_with_items_transaction', {
        p_entity_id: entityId,
        p_invoice_payload: payload,
        p_items: itemsToSave,
        p_mode: 'update',
      })
      if (rpcError) {
        return { success: false, error: `Transactional update failed: ${rpcError.message}` }
      }
    } else {
      // Fallback or non-item update
      if (proposal.itemsChange?.newItems) {
        await (tenantClient.from('invoice_items') as any).delete().eq('invoice_id', proposal.targetDocumentId)
        const { error: itemsError } = await (tenantClient.from('invoice_items') as any).insert(itemsToSave)
        if (itemsError) {
          return { success: false, error: `Failed to update invoice items: ${itemsError.message}` }
        }
      }

      const { error: updateError } = await (tenantClient.from('invoices') as any)
        .update(updates)
        .eq('id', proposal.targetDocumentId)

      if (updateError) {
        return { success: false, error: `Failed to update invoice: ${updateError.message}` }
      }
    }

    // Mark as executed
    executedOperationIds.add(proposal.opId)

    return {
      success: true,
      documentId: proposal.targetDocumentId,
      documentNumber: currentDoc.invoice_number,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected modification persistence error'
    return { success: false, error: message }
  }
}
