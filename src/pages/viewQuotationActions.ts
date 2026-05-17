import { supabase } from '@/supabase'
import { buildQuotationCsv, downloadQuotationCsv } from '@/components/quotation/exportQuotationCsv'
import { normalizeSettings } from '@/hooks/useSettings'
import { appendDerivedTrail, buildTrailLink, getNextInvoiceNumber, parseDocumentCustomFields, toQuotationItemRow, withSourceTrail } from '@/domain/documentConversion'
import { buildQuotationFormState, getNextQuotationNumber, type DbQuotation, type DbQuotationItem } from '@/domain/quotation'
import { normalizeExtraCharges, buildCalculationInputs, BUILTIN_COLUMNS } from '@/domain/invoice'
import { resolveDocumentSignatory } from '@/domain/invoice/previewModel'
import { computeDocument } from '@/lib/Calculations'
import { toDbItem } from '@/domain/invoice/factories'

export async function loadQuotationViewData(id: string) {
  const [quoRes, itemsRes, settingsRes, bankAccountsRes, signatoriesRes] = await Promise.all([
    supabase.from('quotations').select('*').eq('id', id).single(),
    supabase.from('quotation_items').select('*').eq('quotation_id', id).order('sort_order'),
    supabase.from('settings').select('*').eq('id', 1).single(),
    supabase.from('bank_accounts').select('*').order('is_default', { ascending: false }),
    supabase.from('signatories').select('id, name, role, signature_url').order('name'),
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
    ? await supabase.from('clients').select('*').eq('id', data.client_id).single()
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
}: {
  quotation: any
  items: any[]
  totals: any
}) {
  const csv = buildQuotationCsv({ quotation, items, totals })
  downloadQuotationCsv(`${quotation.quotation_number || 'quotation'}.csv`, csv)
}

export async function duplicateQuotationRecord({
  quotation,
  items,
}: {
  quotation: any
  items: any[]
}) {
  const { data: quotationRows } = await supabase.from('quotations').select('quotation_number')
  const nextQuotationNumber = getNextQuotationNumber((quotationRows || []) as Array<{ quotation_number?: string | null }>)
  const cleanCustomFields = parseDocumentCustomFields(quotation.custom_fields || {})
  const { conversionTrail: _ignoredTrail, ...restCustomFields } = cleanCustomFields
  const payload = {
    quotation_number: nextQuotationNumber,
    po_number: quotation.po_number || null,
    quotation_title: quotation.quotation_title || null,
    client_id: quotation.client_id || null,
    client_name: quotation.client_name || '',
    project_id: quotation.project_id || null,
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: quotation.valid_until || null,
    status: 'open',
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
    custom_fields: JSON.stringify({
      ...restCustomFields,
      quotationTitle: quotation.quotation_title || '',
      clientName: quotation.client_name || '',
      notesHtml: quotation.notes || '',
      termsHtml: quotation.terms || '',
    }),
  }
  const { data: createdQuotation, error } = await supabase.from('quotations').insert([payload]).select().single()
  if (error || !createdQuotation) throw new Error(error?.message || 'Failed to clone quotation')

  // Audit Trail
  try {
    const { recordQuotationCreated, recordAuditLog, QUOTATION_TRACKED_FIELDS } = await import('@/lib/audit')
    await recordQuotationCreated(createdQuotation.id)
    await recordAuditLog({
      entityType: 'quotation',
      recordId: createdQuotation.id,
      entityLabel: createdQuotation.quotation_number,
      action: 'CREATE',
      oldData: null,
      newData: createdQuotation,
      trackedFields: QUOTATION_TRACKED_FIELDS,
    })
  } catch (auditErr) {
    console.error('Audit trail failed:', auditErr)
  }
  const itemRows = items
    .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
    .map((item, index) => toQuotationItemRow(item, String(createdQuotation.id), index))
  if (itemRows.length > 0) {
    const { error: itemError } = await supabase.from('quotation_items').insert(itemRows)
    if (itemError) throw itemError
  }
  return createdQuotation
}

export async function convertQuotationToInvoice({
  id,
  quotation,
  items,
}: {
  id: string
  quotation: any
  items: any[]
}) {
  const [{ data: invoiceRows }, { data: latestQuotation }] = await Promise.all([
    supabase.from('invoices').select('invoice_number'),
    supabase.from('quotations').select('custom_fields').eq('id', id).single(),
  ])
  const nextInvoiceNumber = getNextInvoiceNumber((invoiceRows || []) as Array<{ invoice_number?: string | null }>)
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
    status: quotation.status || 'unpaid',
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
  const { data: createdInvoice, error } = await supabase.from('invoices').insert([invoicePayload]).select().single()
  if (error || !createdInvoice) throw new Error(error?.message || 'Failed to create invoice')

  const itemRows = items
    .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
    .map((item, index) => toDbItem(item, createdInvoice.id, index))
  if (itemRows.length > 0) {
    const { error: itemError } = await supabase.from('invoice_items').insert(itemRows)
    if (itemError) throw itemError
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
  const { error: trailError } = await supabase
    .from('quotations')
    .update({ status: 'converted', custom_fields: JSON.stringify(updatedQuotationFields) })
    .eq('id', id)
  if (trailError) throw trailError

  try {
    const { recordQuotationLinked, recordInvoiceCreated, recordAuditLog, INVOICE_TRACKED_FIELDS, QUOTATION_TRACKED_FIELDS } = await import('@/lib/audit')
    await recordQuotationLinked(id, createdInvoice.id)
    await recordInvoiceCreated(createdInvoice.id)
    await recordAuditLog({
      entityType: 'invoice',
      recordId: createdInvoice.id,
      entityLabel: createdInvoice.invoice_number,
      action: 'CREATE',
      oldData: null,
      newData: createdInvoice,
      trackedFields: INVOICE_TRACKED_FIELDS,
    })

    const { data: updatedQuotation } = await supabase.from('quotations').select('*').eq('id', id).single()
    await recordAuditLog({
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

export async function deleteQuotationRecord(id: string) {
  const { error: itemError } = await supabase.from('quotation_items').delete().eq('quotation_id', id)
  if (itemError) throw itemError
  const { error } = await supabase.from('quotations').delete().eq('id', id)
  if (error) throw error
}

export async function archiveQuotationRecord(id: string) {
  const { error } = await supabase.from('quotations').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function updateQuotationStatus(id: string, status: string) {
  const { data: oldQuo } = await supabase.from('quotations').select('*').eq('id', id).single()
  const { error } = await supabase.from('quotations').update({ status }).eq('id', id)
  if (error) throw error

  // Audit Trail
  try {
    const { recordQuotationStatusChanged, recordAuditLog, QUOTATION_TRACKED_FIELDS } = await import('@/lib/audit')
    const { data: updatedQuotation } = await supabase.from('quotations').select('*').eq('id', id).single()
    await recordQuotationStatusChanged(id, oldQuo?.status || 'unknown', status)
    await recordAuditLog({
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
