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
import { advanceAutoCursor, fetchAutoCursor, fetchDocumentPrefixes } from '@/domain/documentNumbering'
import { getNextQuotationNumber } from '@/domain/quotation'
import { parseTrailingSequence } from '@/domain/prefixConstants'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import type { BoluReadAuthorization, BoluWriteAuthorization } from './bolu-data'
import {
  recordBoluDocumentCreationAudit,
  recordBoluDocumentModificationAudit,
  type BoluAuditActor,
} from './bolu-audit'
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
  action: 'create' | 'edit',
): void {
  if (!tenantClient.isReady || !tenantClient.schemaName) {
    throw new Error('Tenant context is not ready or unauthorized.')
  }
  if (!canWrite(resource, action)) {
    // The action is the canonical has_entity_permission action, so this reads
    // exactly like the permission the tenant RPC enforces.
    throw new Error(`You do not have permission to ${action} ${resource}s in this business entity.`)
  }
}

/**
 * Serializes the commercial metadata the standard document forms persist in
 * `custom_fields`. Keeping this shape identical lets reopened documents and the
 * authoritative calculation engine read Bolu-created records unchanged.
 */
function buildBoluCustomFields(
  proposal: BoluInvoiceCreateProposal,
): string {
  const payload = proposal.payload
  return JSON.stringify({
    created_via: 'bolu_assistant',
    operation_id: proposal.opId,
    extraCharges: (payload.extra_charges ?? []).map((charge) => ({
      label: charge.label,
      value: charge.value,
      withTax: charge.vatApplicable,
    })),
    chargeLabels: {},
    calculationInputs: {
      vatPercent: payload.global_vat_percent ?? 7.5,
      discountValue: payload.discount ?? 0,
      whtValue: payload.wht ?? 0,
      discountType: payload.discount_type ?? 'percent',
      discountTiming: payload.discount_timing ?? 'before_tax',
      whtType: payload.wht_type ?? 'percent',
    },
    discountType: payload.discount_type ?? 'percent',
    discountTiming: payload.discount_timing ?? 'before_tax',
    whtType: payload.wht_type ?? 'percent',
  })
}

/**
 * Finds a document already written for this operation.
 *
 * `executedOperationIds` only protects one serverless instance. The document's
 * own persisted `custom_fields.operation_id` is the durable idempotency key, so
 * an ambiguous save that is retried (or replayed through a stale card) returns
 * the existing record instead of allocating a second number.
 */
async function findPersistedOperation(
  tenantClient: TenantClient,
  family: 'invoice' | 'quotation',
  opId: string,
): Promise<{ id: string; number: string } | null> {
  if (!opId) return null
  const table = family === 'invoice' ? 'invoices' : 'quotations'
  const numberColumn = family === 'invoice' ? 'invoice_number' : 'quotation_number'
  try {
    const { data, error } = await tenantClient
      .from(table)
      .select(`id, ${numberColumn}`)
      .filter('custom_fields->>operation_id', 'eq', opId)
      .limit(1)
      .maybeSingle()
    if (error || !data) return null
    const row = data as Record<string, unknown>
    return {
      id: String(row.id),
      number: String(row[numberColumn] ?? ''),
    }
  } catch {
    // A lookup failure is not proof of absence: the unique retry below still
    // prevents duplicate numbers, and the caller never trusts this as a write.
    return null
  }
}

/** Maps a Bolu line item onto the shared database item shape. */
function serializeBoluItem(item: BoluInvoiceCreateProposal['payload']['items'][number], index: number) {
  // Part number and condition are not columns on `invoice_items` /
  // `quotation_items`; the document forms store them in `custom_data`.
  const customData: Record<string, string> = {}
  if (item.part_number) customData.partNo = item.part_number
  if (item.condition) customData.condition = item.condition

  return toDbItem(
    {
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit: item.unit || '',
      row_type: 'standard',
      group_id: item.group_id ?? null,
      group_name: item.group_name ?? null,
      item_id: item.item_id ?? null,
      install_rate: item.install_rate ?? null,
      install_rate_taxable: item.install_rate_taxable ?? false,
      vat_rate: item.vat_rate ?? null,
      discount_rate: item.discount_rate ?? null,
      sub_description: item.sub_description ?? null,
      make: item.make ?? null,
      custom_data: customData,
    } as any,
    null,
    index,
  )
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
  actor?: BoluAuditActor | null,
): Promise<BoluOperationExecutionResult> {
  if (proposal?.documentFamily === 'quotation') {
    return persistQuotationCreation(tenantClient, proposal, canWrite, canRead, entityId, actor)
  }

  assertTenantAuthorization(tenantClient, canWrite, 'invoice', 'create')

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

  // A previously committed save for this exact operation is returned as-is.
  // This is the durable guard against a retried or replayed Gate 2 confirmation.
  const alreadyPersisted = await findPersistedOperation(tenantClient, 'invoice', proposal.opId)
  if (alreadyPersisted) {
    executedOperationIds.add(proposal.opId)
    return {
      success: true,
      documentId: alreadyPersisted.id,
      documentNumber: alreadyPersisted.number,
    }
  }

  try {
    // 1. Authoritative financial recalculation using the full commercial payload
    const calculation = computeAuthoritativeTotals(proposal.payload.items, {
      globalVatPercent: proposal.payload.global_vat_percent ?? 7.5,
      discountType: proposal.payload.discount_type ?? 'percent',
      discountTiming: proposal.payload.discount_timing ?? 'before_tax',
      discountValue: proposal.payload.discount ?? 0,
      whtType: proposal.payload.wht_type ?? 'percent',
      whtValue: proposal.payload.wht ?? 0,
      extraCharges: proposal.payload.extra_charges ?? [],
      fixedCharges: {
        workmanship: proposal.payload.workmanship,
        transportation: proposal.payload.transportation,
        shipping: proposal.payload.shipping,
      },
    })

    // 2. Authoritative numbering setup with collision retry.
    // The tenant's configured prefix is the same authority the invoice form
    // uses (`resolvePrefix(settings.document_prefixes, 'invoice')`). Passing
    // `undefined` would silently fall back to the global `INV` default and
    // allocate from a different sequence family than manual invoices.
    const documentPrefixes = await fetchDocumentPrefixes(tenantClient)
    const invoicePrefix = resolvePrefix(documentPrefixes, 'invoice')
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
      po_number: proposal.payload.po_number ?? null,
      invoice_title: proposal.payload.title ?? null,
      client_id: proposal.payload.client_id ?? null,
      client_name: proposal.payload.client_name,
      project_id: proposal.payload.project_id ?? null,
      issue_date: proposal.payload.issue_date || new Date().toISOString().split('T')[0],
      due_date: proposal.payload.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'unpaid',
      document_type: 'invoice',
      payment_terms: proposal.payload.payment_terms || '',
      notes: proposal.payload.notes || '',
      terms: proposal.payload.terms || proposal.payload.payment_terms || '',
      workmanship: proposal.payload.workmanship ?? 0,
      transportation: proposal.payload.transportation ?? 0,
      shipping: proposal.payload.shipping ?? 0,
      discount: calculation.discount,
      vat: calculation.vat,
      wht: calculation.wht,
      custom_fields: buildBoluCustomFields(proposal),
      work_duration: proposal.payload.work_duration ?? null,
      subtotal: calculation.subtotal,
      install_rate_total: calculation.installRateTotal,
      total: calculation.totalPayable,
      amount_in_words: numberToWords(calculation.totalPayable),
    }

    const itemsToSave = proposal.payload.items.map((item, index) => serializeBoluItem(item, index))

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

    // 7. Canonical CREATE audit event: same infrastructure as the form, with
    // the authenticated user as actor and `bolu` as the operation source.
    await recordBoluDocumentCreationAudit(tenantClient, {
      family: 'invoice',
      documentId: effectiveId,
      documentNumber: effectiveNumber,
      clientName: proposal.payload.client_name,
      total: calculation.totalPayable,
      opId: proposal.opId,
      actor,
    })

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
  actor?: BoluAuditActor | null,
): Promise<BoluOperationExecutionResult> {
  assertTenantAuthorization(tenantClient, canWrite, 'quotation', 'create')

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

  const alreadyPersisted = await findPersistedOperation(tenantClient, 'quotation', proposal.opId)
  if (alreadyPersisted) {
    executedOperationIds.add(proposal.opId)
    return {
      success: true,
      documentId: alreadyPersisted.id,
      documentNumber: alreadyPersisted.number,
    }
  }

  try {
    // 1. Authoritative financial recalculation (identical engine to invoices)
    const calculation = computeAuthoritativeTotals(proposal.payload.items, {
      globalVatPercent: proposal.payload.global_vat_percent ?? 7.5,
      discountType: proposal.payload.discount_type ?? 'percent',
      discountTiming: proposal.payload.discount_timing ?? 'before_tax',
      discountValue: proposal.payload.discount ?? 0,
      whtType: proposal.payload.wht_type ?? 'percent',
      whtValue: proposal.payload.wht ?? 0,
      extraCharges: proposal.payload.extra_charges ?? [],
      fixedCharges: {
        workmanship: proposal.payload.workmanship,
        transportation: proposal.payload.transportation,
        shipping: proposal.payload.shipping,
      },
    })

    // 2. Authoritative numbering setup with collision retry. The tenant's
    // configured quotation prefix drives this, exactly as the quotation form does.
    const documentPrefixes = await fetchDocumentPrefixes(tenantClient)
    const quotationPrefix = resolvePrefix(documentPrefixes, 'quotation')
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
      po_number: proposal.payload.po_number ?? null,
      quotation_title: proposal.payload.title ?? null,
      client_id: proposal.payload.client_id ?? null,
      client_name: proposal.payload.client_name,
      project_id: proposal.payload.project_id ?? null,
      issue_date: proposal.payload.issue_date || new Date().toISOString().split('T')[0],
      valid_until: proposal.payload.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'open',
      notes: proposal.payload.notes || '',
      terms: proposal.payload.terms || proposal.payload.payment_terms || '',
      workmanship: proposal.payload.workmanship ?? 0,
      transportation: proposal.payload.transportation ?? 0,
      shipping: proposal.payload.shipping ?? 0,
      discount: calculation.discount,
      vat: calculation.vat,
      wht: calculation.wht,
      subtotal: calculation.subtotal,
      install_rate_total: calculation.installRateTotal,
      total: calculation.totalPayable,
      amount_in_words: numberToWords(calculation.totalPayable),
      custom_fields: buildBoluCustomFields(proposal),
      work_duration: proposal.payload.work_duration ?? null,
    }

    const itemsToSave = proposal.payload.items.map((item, index) => serializeBoluItem(item, index))

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

    // 7. Canonical CREATE audit event for the quotation family.
    await recordBoluDocumentCreationAudit(tenantClient, {
      family: 'quotation',
      documentId: effectiveId,
      documentNumber: effectiveNumber,
      clientName: proposal.payload.client_name,
      total: calculation.totalPayable,
      opId: proposal.opId,
      actor,
    })

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
  actor?: BoluAuditActor | null,
): Promise<BoluOperationExecutionResult> {
  assertTenantAuthorization(tenantClient, canWrite, 'invoice', 'edit')

  if (!proposal || !proposal.opId) {
    throw new Error('Valid proposal is required for persistence.')
  }

  if (!canRead('invoice', 'view')) {
    return { success: false, error: 'Read authorization missing for this invoice.' }
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

    await recordBoluDocumentModificationAudit(tenantClient, {
      family: 'invoice',
      documentId: proposal.targetDocumentId,
      documentNumber: currentDoc.invoice_number,
      opId: proposal.opId,
      changedField: proposal.field ?? null,
      oldValue: proposal.oldValue,
      newValue: proposal.newValue,
      itemsChanged: Boolean(proposal.itemsChange?.newItems),
      actor,
    })

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

/**
 * Executes persistence for an approved quotation modification proposal.
 *
 * Mirrors the invoice modification path and uses the existing tenant
 * `save_quotation_with_items_transaction` RPC with `p_mode = 'update'`, so the
 * database permission gate and atomic item replacement remain authoritative.
 */
export async function persistQuotationModification(
  tenantClient: TenantClient,
  proposal: BoluInvoiceModifyProposal,
  canWrite: BoluWriteAuthorization,
  canRead: BoluReadAuthorization,
  entityId?: string | null,
  actor?: BoluAuditActor | null,
): Promise<BoluOperationExecutionResult> {
  assertTenantAuthorization(tenantClient, canWrite, 'quotation', 'edit')

  if (!proposal || !proposal.opId) {
    throw new Error('Valid proposal is required for persistence.')
  }

  if (!canRead('quotation', 'view')) {
    return { success: false, error: 'Read authorization missing for this quotation.' }
  }

  if (executedOperationIds.has(proposal.opId)) {
    return { success: false, error: 'This modification has already been submitted and executed.' }
  }

  if (isProposalStale(proposal)) {
    return { success: false, error: 'This proposal has expired. Please propose the change again.' }
  }

  if (proposal.status !== 'approved_pending_save' && proposal.status !== 'saving') {
    return { success: false, error: 'Modification requires user approval (Gate 1) and save confirmation (Gate 2).' }
  }

  try {
    const { data: currentDoc, error: fetchError } = await tenantClient
      .from('quotations')
      .select('id, quotation_number, client_name, notes, terms, valid_until, issue_date, total, archived_at')
      .eq('id', proposal.targetDocumentId)
      .is('archived_at', null)
      .single()

    if (fetchError || !currentDoc) {
      return { success: false, error: 'Target quotation could not be found or has been archived.' }
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (proposal.field) {
      const dbField =
        proposal.field === 'payment_terms' ? 'terms'
          : proposal.field === 'due_date' ? 'valid_until'
            : proposal.field
      const currentValueInDb = (currentDoc as any)[dbField]

      if (proposal.oldValue !== undefined && proposal.oldValue !== null && String(currentValueInDb) !== String(proposal.oldValue)) {
        return {
          success: false,
          error: `Document has been modified by another process (current ${proposal.field}: "${currentValueInDb}"). Proposal is stale.`,
        }
      }

      updates[dbField] = proposal.newValue
    }

    let itemsToSave: any[] = []
    if (proposal.itemsChange?.newItems) {
      const calculation = computeAuthoritativeTotals(proposal.itemsChange.newItems)
      updates.subtotal = calculation.subtotal
      updates.vat = calculation.vat
      updates.total = calculation.totalPayable
      updates.install_rate_total = calculation.installRateTotal
      updates.amount_in_words = numberToWords(calculation.totalPayable)

      itemsToSave = proposal.itemsChange.newItems.map((item, idx) => serializeBoluItem(item, idx))
    }

    if (entityId && proposal.itemsChange?.newItems) {
      const payload = {
        ...currentDoc,
        ...updates,
        id: proposal.targetDocumentId,
      }
      const { error: rpcError } = await tenantClient.rpc('save_quotation_with_items_transaction', {
        p_entity_id: entityId,
        p_quotation_payload: payload,
        p_items: itemsToSave,
        p_mode: 'update',
      })
      if (rpcError) {
        return { success: false, error: `Transactional update failed: ${rpcError.message}` }
      }
    } else {
      if (proposal.itemsChange?.newItems) {
        // Keep the previous rows so a failed replacement cannot empty the quotation.
        const { data: previousItems } = await (tenantClient.from('quotation_items') as any)
          .select('description, quantity, unit_price, total, unit, row_order, sub_description, make, discount_rate, install_rate, group_name, group_id, row_type, item_id, install_rate_taxable')
          .eq('quotation_id', proposal.targetDocumentId)

        await (tenantClient.from('quotation_items') as any).delete().eq('quotation_id', proposal.targetDocumentId)
        const { error: itemsError } = await (tenantClient.from('quotation_items') as any)
          .insert(itemsToSave.map((item) => ({ ...item, quotation_id: proposal.targetDocumentId })))
        if (itemsError) {
          if (Array.isArray(previousItems) && previousItems.length > 0) {
            await (tenantClient.from('quotation_items') as any).insert(previousItems)
          }
          return {
            success: false,
            error: `Failed to update quotation items: ${itemsError.message}. The previous items were restored.`,
          }
        }
      }

      const { error: updateError } = await (tenantClient.from('quotations') as any)
        .update(updates)
        .eq('id', proposal.targetDocumentId)

      if (updateError) {
        return { success: false, error: `Failed to update quotation: ${updateError.message}` }
      }
    }

    await recordBoluDocumentModificationAudit(tenantClient, {
      family: 'quotation',
      documentId: proposal.targetDocumentId,
      documentNumber: currentDoc.quotation_number,
      opId: proposal.opId,
      changedField: proposal.field ?? null,
      oldValue: proposal.oldValue,
      newValue: proposal.newValue,
      itemsChanged: Boolean(proposal.itemsChange?.newItems),
      actor,
    })

    executedOperationIds.add(proposal.opId)

    return {
      success: true,
      documentId: proposal.targetDocumentId,
      documentNumber: currentDoc.quotation_number,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected modification persistence error'
    return { success: false, error: message }
  }
}
