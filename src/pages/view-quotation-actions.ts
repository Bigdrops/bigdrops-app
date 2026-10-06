import type { TenantClient } from '@/lib/tenantClient'
import { buildQuotationCsv, downloadQuotationCsv } from '@/components/quotation/exportQuotationCsv'
import { normalizeSettings } from '@/hooks/useSettings'
import { appendDerivedTrail, buildTrailLink, getNextInvoiceNumber, parseDocumentCustomFields, withSourceTrail } from '@/domain/documentConversion'
import { buildQuotationFormState, type DbQuotation, type DbQuotationItem } from '@/domain/quotation'
import { normalizeExtraCharges, buildCalculationInputs, BUILTIN_COLUMNS } from '@/domain/invoice'
import { resolveDocumentSignatory } from '@/domain/invoice/previewModel'
import { computeDocument } from '@/lib/Calculations'
import { toDbItem } from '@/domain/invoice/factories'
import {
  authorityTransitionSummary,
  newConversionChainId,
  normalizeChainId,
  normalizeLineageId,
  resolveActiveFeedbackAuthority,
  withoutLineage,
} from '@/domain/cps/lineage'
import { persistChainAuthority } from '@/domain/cps/lineageStore'
import { resolvePrefix, type DocumentPrefixes } from '@/domain/prefixConstants'

export async function loadQuotationViewData(id: string, tenantClient: TenantClient) {
  const [quoRes, itemsRes, settingsRes, bankAccountsRes, signatoriesRes] = await Promise.all([
    tenantClient.from('quotations').select('*').eq('id', id).single(),
    tenantClient.from('quotation_items').select('*').eq('quotation_id', id).order('sort_order'),
    tenantClient.from('settings').select('*').eq('id', 1).single(),
    tenantClient.from('bank_accounts').select('*').order('is_default', { ascending: false }),
    tenantClient.from('signatories').select('id, name, role, signature_url').order('name'),
  ])

  if (quoRes.error || !quoRes.data) {
    return null
  }

  const data = quoRes.data
  const itemRows = itemsRes.data || []
  const state = buildQuotationFormState(data as DbQuotation, itemRows as DbQuotationItem[])
  const parsedCustomFields = (state.quotation.custom_fields || {}) as Record<string, any>
  const mappedItems = state.items
  const calcInputs = buildCalculationInputs({
    invoice: {
      ...state.quotation,
      vat: state.quotation.vat,
      discount: state.quotation.discount,
      wht: state.quotation.wht,
    },
    discountType: state.discountType,
    discountTiming: state.discountTiming,
    whtType: state.whtType,
  })
  const totals = computeDocument({
    items: mappedItems,
    columns: BUILTIN_COLUMNS,
    document: state.quotation,
    cf: {
      calculationInputs: calcInputs,
      extraCharges: normalizeExtraCharges(parsedCustomFields?.extraCharges || []),
    },
  })
  const clientRes = data.client_id
    ? await tenantClient.from('clients').select('*').eq('id', data.client_id).single()
    : { data: null }

  return {
    quotation: state.quotation,
    items: mappedItems,
    totals,
    client: clientRes.data || null,
    settings: normalizeSettings(settingsRes.data),
    bankAccounts: bankAccountsRes.data || [],
    signatory: resolveDocumentSignatory(parsedCustomFields?.signatoryId, signatoriesRes.data || []),
    customFields: parsedCustomFields,
  }
}

export async function downloadQuotationCsvFile({
  quotation,
  items,
  totals,
  customFields,
}: {
  quotation: any
  items: any[]
  totals: any
  customFields?: Record<string, any>
}) {
  const quotationCustomFields =
    quotation?.custom_fields && typeof quotation.custom_fields === 'object'
      ? (quotation.custom_fields as Record<string, any>)
      : undefined

  const csv = buildQuotationCsv({
    quotation,
    items,
    totals,
    customFields: customFields || quotationCustomFields,
  })
  await downloadQuotationCsv(`${quotation.quotation_number || 'quotation'}.csv`, csv)
}

export async function duplicateQuotationRecord({
  quotation,
  items,
}: {
  quotation: any
  items: any[]
}) {
  const cleanCustomFields = parseDocumentCustomFields(quotation.custom_fields || {})
  const { conversionTrail: _ignoredTrail, ...restCustomFields } = cleanCustomFields

  // Build prefill payload — no DB persistence. Law 2: Duplicate = clean draft.
  const prefill = {
    quotation_number: '',
    po_number: quotation.po_number || '',
    quotation_title: quotation.quotation_title || '',
    client_id: '',
    client_name: '',
    project_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    status: 'open',
    notes: quotation.notes || '',
    terms: quotation.terms || '',
    workmanship: Number(quotation.workmanship || 0),
    transportation: Number(quotation.transportation || 0),
    shipping: Number(quotation.shipping || 0),
    discount: Number(quotation.discount || 0),
    vat: Number(quotation.vat || 0),
    wht: Number(quotation.wht || 0),
    subtotal: 0,
    install_rate_total: 0,
    total: 0,
    amount_in_words: '',
    custom_fields: JSON.stringify({
      ...restCustomFields,
      quotationTitle: quotation.quotation_title || '',
      clientName: '',
      notesHtml: quotation.notes || '',
      termsHtml: quotation.terms || '',
    }),
  }

  // Law 2: a duplicate is a clean draft. Phase 2 lineage is stripped so a
  // duplicated row can never claim ancestry (or later feedback authority)
  // over a Cost & Pricing Sheet it did not come from.
  const prefillItems = items
    .filter((item: any) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
    .map((item: any) => ({
      ...withoutLineage(JSON.parse(JSON.stringify(item)) as Record<string, unknown>),
      id: null,
    }))

  return { prefill, prefillItems }
}

export async function convertQuotationToInvoice(
  {
    id,
    quotation,
    items,
    prefixes,
  }: {
    id: string
    quotation: any
    items: any[]
    prefixes?: DocumentPrefixes | null
  },
  tenantClient: TenantClient,
  entityId?: string | null,
) {
  // Phase 3: invoices/invoice_items are aggregate → tenant. Quotation
  // read/write also routes through the tenant schema.
  const [{ data: invoiceRows }, { data: latestQuotation }] = await Promise.all([
    tenantClient.from('invoices').select('invoice_number'),
    tenantClient
      .from('quotations')
      .select(
        'custom_fields, quotation_number, source_cps_id, conversion_chain_id, feedback_authority, feedback_authority_document_id',
      )
      .eq('id', id)
      .single(),
  ])

  // ── Idempotency gate ──────────────────────────────────────────────────────
  // One Quotation conversion owns at most one active Invoice. A retry must
  // resolve to the Invoice that already exists instead of minting a competing
  // one, so authority can never be silently moved to a second document. The
  // guard reads persisted state and is backed by a UNIQUE index on
  // invoices.source_quotation_id, so it also holds under concurrent clicks.
  const existingInvoice = await resolveConvertedInvoice(tenantClient, id, latestQuotation as any)
  if (existingInvoice) {
    await recordConversionRetry({
      tenantClient,
      quotation: quotation,
      quotationRow: latestQuotation as any,
      existingInvoice,
    })
    return existingInvoice
  }

  const { fetchAutoCursor, advanceAutoCursor } = await import('@/domain/documentNumbering')
  const { parseTrailingSequence } = await import('@/domain/prefixConstants')
  const invoicePrefix = resolvePrefix(prefixes, 'invoice')
  const invoiceFamily = `${invoicePrefix}-`
  const nextInvoiceNumber = getNextInvoiceNumber(
    (invoiceRows || []) as Array<{ invoice_number?: string | null }>,
    invoicePrefix,
    await fetchAutoCursor(tenantClient, invoiceFamily),
  )
  const quotationCustomFields = parseDocumentCustomFields(latestQuotation?.custom_fields || quotation.custom_fields)
  const chainId =
    normalizeChainId((latestQuotation as { conversion_chain_id?: string | null } | null)?.conversion_chain_id) ??
    newConversionChainId()
  const sourceLink = buildTrailLink({
    id: quotation.id,
    type: 'quotation',
    number: quotation.quotation_number,
    project_id: quotation.project_id ?? null,
    po_number: quotation.po_number ?? null,
  })
  const invoicePayload = {
    invoice_number: nextInvoiceNumber,
    po_number: quotation.po_number || null,
    invoice_title: quotation.quotation_title || null,
    client_id: quotation.client_id || null,
    client_name: quotation.client_name || '',
    project_id: quotation.project_id || null,
    issue_date: quotation.issue_date || new Date().toISOString().split('T')[0],
    due_date: quotation.valid_until || null,
    status: 'unpaid',
    document_type: 'INVOICE',
    payment_terms: null,
    notes: quotation.notes || '',
    terms: quotation.terms || '',
    workmanship: Number(quotation.workmanship || 0),
    transportation: Number(quotation.transportation || 0),
    shipping: Number(quotation.shipping || 0),
    discount: Number(quotation.discount || 0),
    vat: Number(quotation.vat || 0),
    wht: Number(quotation.wht || 0),
    subtotal: Number(quotation.subtotal || 0),
    install_rate_total: Number(quotation.install_rate_total || 0),
    total: Number(quotation.total || 0),
    amount_in_words: quotation.amount_in_words || '',
    custom_fields: JSON.stringify(withSourceTrail(quotationCustomFields, sourceLink)),
    // Explicit document-level ancestry + chain identity. The UNIQUE index on
    // source_quotation_id is what makes the conversion retry-safe.
    source_quotation_id: id,
    conversion_chain_id: chainId,
  }
  // The exact serialized rows handed to the write. They carry the persisted
  // CPS/Quotation lineage and the sort order they are written with.
  const persistedItems = items
    .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
    .map((item, index) => toDbItem(item, null, index) as Record<string, unknown>)

  // Phase 3: composite create (invoice + items) is atomic via the tenant RPC
  // when the entity id is available; otherwise sequential tenant writes.
  // Phase 2.5: the RPC writes all four lineage columns in the same INSERT as
  // the item rows, so no post-write stamp is required on either path.
  let createdInvoice: any = null
  if (entityId) {
    const { data, error } = await tenantClient.rpc('save_invoice_with_items_transaction', {
      p_entity_id: entityId,
      p_invoice_payload: invoicePayload,
      p_items: persistedItems,
      p_mode: 'create',
    })
    if (error) {
      // A concurrent conversion won the race: the UNIQUE index on
      // source_quotation_id rejected this insert. Resolve to the winner
      // instead of creating a competing Invoice.
      const raced = await resolveConvertedInvoice(tenantClient, id, latestQuotation as any)
      if (raced) {
        await recordConversionRetry({
          tenantClient,
          quotation,
          quotationRow: latestQuotation as any,
          existingInvoice: raced,
        })
        return raced
      }
      throw new Error(error.message || 'Failed to create invoice')
    }
    if (!data) throw new Error('Failed to create invoice')
    // PostgREST wraps jsonb function returns in an array.
    const rpcResult = Array.isArray(data) ? data[0] : data
    createdInvoice = rpcResult?.invoice ?? rpcResult
    // Fallback: if the RPC response shape is unexpected, query the latest invoice.
    if (!createdInvoice?.id) {
      const { data: latest } = await tenantClient
        .from('invoices')
        .select('*')
        .eq('invoice_number', invoicePayload.invoice_number)
        .single()
      if (latest) createdInvoice = latest
    }
  } else {
    const { data, error } = await tenantClient.from('invoices').insert([invoicePayload]).select().single()
    if (error) {
      const raced = await resolveConvertedInvoice(tenantClient, id, latestQuotation as any)
      if (raced) {
        await recordConversionRetry({
          tenantClient,
          quotation,
          quotationRow: latestQuotation as any,
          existingInvoice: raced,
        })
        return raced
      }
      throw new Error(error.message || 'Failed to create invoice')
    }
    if (!data) throw new Error('Failed to create invoice')
    createdInvoice = data

    // Lineage is part of the same insert that creates these rows.
    const itemRows = persistedItems.map((row) => ({ ...row, invoice_id: createdInvoice.id }))
    if (itemRows.length > 0) {
      const { error: itemError } = await tenantClient.from('invoice_items').insert(itemRows)
      if (itemError) throw itemError
    }
  }

  const derivedLink = buildTrailLink({
    id: createdInvoice.id,
    type: 'invoice',
    number: createdInvoice.invoice_number,
    project_id: createdInvoice.project_id ?? quotation.project_id ?? null,
    po_number: createdInvoice.po_number ?? quotation.po_number ?? null,
  })
  // Converted documents consume automatic numbers: advance the cursor.
  const convertedSeq = parseTrailingSequence(createdInvoice.invoice_number)
  if (convertedSeq !== null) await advanceAutoCursor(tenantClient, invoiceFamily, convertedSeq)
  const updatedQuotationFields = appendDerivedTrail(quotationCustomFields, derivedLink)
  const quotationBeforeLink = {
    ...quotation,
    status: quotation.status || 'open',
  }
  const { error: trailError } = await tenantClient
    .from('quotations')
    .update({ status: 'converted', custom_fields: JSON.stringify(updatedQuotationFields) })
    .eq('id', id)
  if (trailError) throw trailError

  await recordInvoiceAuthorityHandoff({
    tenantClient,
    quotation,
    invoice: createdInvoice,
    chainId,
  })

  try {
    const { recordQuotationLinked, recordInvoiceCreated, recordAuditLog, INVOICE_TRACKED_FIELDS, QUOTATION_TRACKED_FIELDS } = await import('@/lib/audit')
    await recordQuotationLinked(tenantClient, id, createdInvoice.id)
    await recordInvoiceCreated(tenantClient, createdInvoice.id)
    await recordAuditLog(tenantClient, {
      entityType: 'invoice',
      recordId: createdInvoice.id,
      entityLabel: createdInvoice.invoice_number,
      action: 'CREATE',
      oldData: null,
      newData: createdInvoice,
      trackedFields: INVOICE_TRACKED_FIELDS,
    })

    const { data: updatedQuotation } = await tenantClient.from('quotations').select('*').eq('id', id).single()
    await recordAuditLog(tenantClient, {
      entityType: 'quotation',
      recordId: id,
      entityLabel: updatedQuotation?.quotation_number || quotation.quotation_number || null,
      action: 'LINK',
      oldData: quotationBeforeLink,
      newData: updatedQuotation,
      trackedFields: QUOTATION_TRACKED_FIELDS,
    })
  } catch (auditErr) {
    console.error('Audit trail failed:', auditErr)
  }
  return createdInvoice
}

/**
 * Resolve the Invoice that already owns this Quotation conversion, if any.
 *
 * Two explicit stored links are consulted, never a heuristic:
 *   1. the quotation's persisted authority pointer (the chain owner), and
 *   2. `invoices.source_quotation_id`, which is UNIQUE per tenant.
 *
 * Returns null when the conversion has not happened yet.
 */
async function resolveConvertedInvoice(
  tenantClient: TenantClient,
  quotationId: string,
  quotationRow:
    | {
        feedback_authority?: string | null
        feedback_authority_document_id?: string | null
      }
    | null
    | undefined,
): Promise<any | null> {
  const authority = resolveActiveFeedbackAuthority(quotationRow ?? undefined)
  if (authority?.stage === 'invoice' && authority.documentId) {
    const { data } = await tenantClient.from('invoices').select('*').eq('id', authority.documentId).limit(1)
    const found = (data as any[] | null)?.[0]
    if (found?.id) return found
  }

  const { data } = await tenantClient
    .from('invoices')
    .select('*')
    .eq('source_quotation_id', quotationId)
    .limit(1)
  return (data as any[] | null)?.[0] ?? null
}

/**
 * Record that a conversion request resolved to an Invoice that already exists.
 * This is a deterministic "already converted" outcome, not a silent retry, so
 * it is written to the chain's CPS history.
 */
async function recordConversionRetry({
  tenantClient,
  quotation,
  quotationRow,
  existingInvoice,
}: {
  tenantClient: TenantClient
  quotation: any
  quotationRow: { source_cps_id?: string | null; conversion_chain_id?: string | null } | null | undefined
  existingInvoice: any
}) {
  const sourceCpsId = normalizeLineageId(quotationRow?.source_cps_id)
  if (!sourceCpsId) return

  try {
    const { CPS_AUDIT_SOURCE, buildCpsAuditMeta, recordCpsAuditEvent } = await import('@/domain/cps/audit')
    await recordCpsAuditEvent(tenantClient, {
      recordId: sourceCpsId,
      entityLabel: null,
      meta: buildCpsAuditMeta({
        event: 'CONVERSION_RETRY',
        rootId: sourceCpsId,
        chainId: normalizeChainId(quotationRow?.conversion_chain_id),
        sourceContext: CPS_AUDIT_SOURCE.view,
        related: {
          type: 'invoice',
          id: existingInvoice.id,
          number: String(existingInvoice.invoice_number || ''),
        },
        summary: 'Conversion already completed',
        detail: `${String(existingInvoice.invoice_number || 'The Invoice')} already owns this conversion. Feedback authority was not moved.`,
      }),
    })
  } catch (auditError) {
    console.error('CPS conversion retry audit failed:', auditError)
  }
}

/**
 * Phase 2 / 2.5 authority handoff.
 *
 * A Quotation that descends from a Cost & Pricing Sheet owns downstream
 * feedback authority while it is the newest document in its conversion chain.
 * When that Quotation becomes an Invoice, authority moves to the Invoice and
 * the Quotation's authority ends.
 *
 * The move is written to persisted state — never derived from edit recency —
 * and targets the quotation row that owns the chain, so a chain keeps exactly
 * one authority row across a conversion, a retry, or a revert. It is
 * idempotent: repeating it converges on the same state.
 *
 * Quotations with no CPS ancestry have no chain to hand off, so nothing is
 * recorded. This function never mutates CPS content: it records provenance
 * only.
 */
async function recordInvoiceAuthorityHandoff({
  tenantClient,
  quotation,
  invoice,
  chainId,
}: {
  tenantClient: TenantClient
  quotation: any
  invoice: any
  chainId: string
}) {
  const sourceCpsId = normalizeLineageId(quotation?.source_cps_id)
  if (!sourceCpsId || !invoice?.id) return

  const authority = await persistChainAuthority(tenantClient, {
    chainId,
    quotationId: quotation.id,
    stage: 'invoice',
    documentId: invoice.id,
  })

  // A failed authority write must never be reported as a successful handoff.
  if (!authority.ok) {
    console.error('CPS feedback authority handoff failed:', authority.error)
  }

  try {
    const { data: cpsRow } = await tenantClient
      .from('cps_sheets')
      .select('cps_number')
      .eq('id', sourceCpsId)
      .single()
    const cpsNumber = String((cpsRow as { cps_number?: string | null } | null)?.cps_number || '')

    const { CPS_AUDIT_SOURCE, buildCpsAuditMeta, recordCpsAuditEvent } = await import('@/domain/cps/audit')

    const transition = authorityTransitionSummary(quotation?.quotation_number, invoice?.invoice_number)
    const applied = authority.ok
      ? transition
      : `${transition} (authority write failed: ${authority.error})`

    await recordCpsAuditEvent(tenantClient, {
      recordId: sourceCpsId,
      entityLabel: cpsNumber || null,
      meta: buildCpsAuditMeta({
        event: 'CONVERTED_TO_INVOICE',
        rootId: sourceCpsId,
        chainId,
        sourceContext: CPS_AUDIT_SOURCE.view,
        related: { type: 'invoice', id: invoice.id, number: String(invoice.invoice_number || '') },
        summary: 'Quotation converted to Invoice',
        detail: applied,
        actorType: authority.ok ? 'user' : 'system',
      }),
    })
  } catch (auditError) {
    // Audit is evidence, not a control path: it must never fail the conversion.
    console.error('CPS authority audit failed:', auditError)
  }
}

export async function deleteQuotationRecord(id: string, tenantClient: TenantClient) {
  const { error: itemError } = await tenantClient.from('quotation_items').delete().eq('quotation_id', id)
  if (itemError) throw itemError
  const { error } = await tenantClient.from('quotations').delete().eq('id', id)
  if (error) throw error
}

export async function archiveQuotationRecord(id: string, tenantClient: TenantClient) {
  const { error } = await tenantClient.from('quotations').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function updateQuotationStatus(id: string, status: string, tenantClient: TenantClient) {
  const { data: oldQuo } = await tenantClient.from('quotations').select('*').eq('id', id).single()
  const { error } = await tenantClient.from('quotations').update({ status }).eq('id', id)
  if (error) throw error

  // Audit Trail
  try {
    const { recordQuotationStatusChanged, recordAuditLog, QUOTATION_TRACKED_FIELDS } = await import('@/lib/audit')
    const { data: updatedQuotation } = await tenantClient.from('quotations').select('*').eq('id', id).single()
    await recordQuotationStatusChanged(tenantClient, id, oldQuo?.status || 'unknown', status)
    await recordAuditLog(tenantClient, {
      entityType: 'quotation',
      recordId: id,
      entityLabel: updatedQuotation?.quotation_number || null,
      action: 'STATUS_CHANGE',
      oldData: oldQuo,
      newData: updatedQuotation,
      trackedFields: QUOTATION_TRACKED_FIELDS,
    })
  } catch (auditErr) {
    console.error('Audit trail failed:', auditErr)
  }
}
