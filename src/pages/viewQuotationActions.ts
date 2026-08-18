import type { TenantClient } from '@/lib/tenantClient'
import { buildQuotationCsv, downloadQuotationCsv } from '@/components/quotation/exportQuotationCsv'
import { normalizeSettings } from '@/hooks/useSettings'
import { appendDerivedTrail, buildTrailLink, getNextInvoiceNumber, parseDocumentCustomFields, withSourceTrail } from '@/domain/documentConversion'
import { buildQuotationFormState, type DbQuotation, type DbQuotationItem } from '@/domain/quotation'
import { normalizeExtraCharges, buildCalculationInputs, BUILTIN_COLUMNS } from '@/domain/invoice'
import { resolveDocumentSignatory } from '@/domain/invoice/previewModel'
import { computeDocument } from '@/lib/Calculations'
import { toDbItem } from '@/domain/invoice/factories'
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

export function downloadQuotationCsvFile({
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
  downloadQuotationCsv(`${quotation.quotation_number || 'quotation'}.csv`, csv)
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

  const prefillItems = items
    .filter((item: any) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
    .map((item: any) => ({
      ...JSON.parse(JSON.stringify(item)),
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
  // Phase 3: invoices/invoice_items are aggregate → tenant. The quotation
  // read/write remains public (quotations are not in the aggregate).
  const [{ data: invoiceRows }, { data: latestQuotation }] = await Promise.all([
    tenantClient.from('invoices').select('invoice_number'),
    tenantClient.from('quotations').select('custom_fields').eq('id', id).single(),
  ])
  const nextInvoiceNumber = getNextInvoiceNumber(
    (invoiceRows || []) as Array<{ invoice_number?: string | null }>,
    resolvePrefix(prefixes, 'invoice'),
  )
  const quotationCustomFields = parseDocumentCustomFields(latestQuotation?.custom_fields || quotation.custom_fields)
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
  }
  // Phase 3: composite create (invoice + items) is atomic via the tenant RPC
  // when the entity id is available; otherwise sequential tenant writes.
  let createdInvoice: any = null
  if (entityId) {
    const { data, error } = await tenantClient.rpc('save_invoice_with_items_transaction', {
      p_entity_id: entityId,
      p_invoice_payload: invoicePayload,
      p_items: items
        .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
        .map((item, index) => toDbItem(item, null, index)),
      p_mode: 'create',
    })
    if (error || !data) throw new Error(error?.message || 'Failed to create invoice')
    createdInvoice = data?.invoice ?? data
  } else {
    const { data, error } = await tenantClient.from('invoices').insert([invoicePayload]).select().single()
    if (error || !data) throw new Error(error?.message || 'Failed to create invoice')
    createdInvoice = data

    const itemRows = items
      .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
      .map((item, index) => toDbItem(item, createdInvoice.id, index))
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
