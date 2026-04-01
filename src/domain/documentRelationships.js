import { supabase } from '@/supabase'
import { parseDocumentCustomFields } from '@/domain/documentConversion'

function toArray(value) {
  return Array.isArray(value) ? value : []
}

export function getConversionTrail(customFields) {
  const parsed = parseDocumentCustomFields(customFields)
  const trail = parsed?.conversionTrail
  return trail && typeof trail === 'object' ? trail : {}
}

export function getInvoiceSourceDocument(invoice) {
  const trail = getConversionTrail(invoice?.custom_fields)
  const source = trail?.source
  return source && typeof source === 'object' ? source : null
}

export function getQuotationDocumentRelations(quotation) {
  const trail = getConversionTrail(quotation?.custom_fields)
  const source = trail?.source && typeof trail.source === 'object' ? trail.source : null
  const derived = toArray(trail?.derived).filter((entry) => entry && typeof entry === 'object')
  return { source, derived }
}

export function hasQuotationRelatedDocuments(quotation) {
  const { source, derived } = getQuotationDocumentRelations(quotation)
  return Boolean(source?.id || source?.number || derived.length > 0)
}

export function hasInvoiceRelatedDocuments(invoice, relatedChildren) {
  const source = getInvoiceSourceDocument(invoice)
  return Boolean(
    source?.id
      || source?.number
      || (relatedChildren?.csrs || []).length > 0
      || (relatedChildren?.waybills || []).length > 0,
  )
}

export function hasCsrRelatedDocuments(csr) {
  return Boolean(csr?.linked_invoice_id)
}

export function hasWaybillRelatedDocuments(waybill) {
  return Boolean(waybill?.invoice_id)
}

export async function fetchProjectSummary(projectId) {
  if (!projectId) return null
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (error || !data) return null
  return data
}

export async function fetchInvoiceSummary(invoiceId) {
  if (!invoiceId) return null
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number')
    .eq('id', invoiceId)
    .single()

  if (error || !data) return null
  return data
}

export async function fetchInvoiceChildDocuments(invoiceId) {
  if (!invoiceId) return { csrs: [], waybills: [] }

  const [{ data: csrs }, { data: waybills }] = await Promise.all([
    supabase
      .from('csrs')
      .select('id, csr_number')
      .eq('linked_invoice_id', invoiceId)
      .order('created_at', { ascending: false }),
    supabase
      .from('waybills')
      .select('id, waybill_number')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false }),
  ])

  return {
    csrs: csrs || [],
    waybills: waybills || [],
  }
}
