import { supabase } from '@/supabase'
import { getNextQuotationNumber } from '@/domain/quotation'
import { parseDocumentCustomFields, toQuotationItemRow } from '@/domain/documentConversion'
import { buildInvoiceTrailLink, withInvoiceSourceTrail } from '../domain/invoiceConversionTrail'

export interface RevertToQuotationInput {
  invoice: any
  items: any[]
  customFields: any
}

export async function revertInvoiceToQuotationService({
  invoice,
  items,
  customFields,
}: RevertToQuotationInput) {
  const [{ data: quotationRows }, { data: latestInvoice }] = await Promise.all([
    supabase.from('quotations').select('quotation_number'),
    supabase.from('invoices').select('custom_fields').eq('id', invoice.id).single(),
  ])

  const nextQuotationNumber = getNextQuotationNumber((quotationRows || []) as Array<{ quotation_number?: string | null }>)
  const sourceInvoiceFields = parseDocumentCustomFields(latestInvoice?.custom_fields || customFields)
  
  const quotationPayload = {
    quotation_number: nextQuotationNumber,
    po_number: invoice.po_number || null,
    quotation_title: invoice.invoice_title || null,
    client_id: invoice.client_id || null,
    client_name: invoice.client_name || '',
    project_id: invoice.project_id || null,
    issue_date: invoice.issue_date || new Date().toISOString().split('T')[0],
    valid_until: invoice.due_date || null,
    status: 'open',
    notes: invoice.notes || '',
    terms: invoice.terms || '',
    workmanship: Number(invoice.workmanship || 0),
    transportation: Number(invoice.transportation || 0),
    shipping: Number(invoice.shipping || 0),
    discount: Number(invoice.discount || 0),
    vat: Number(invoice.vat || 0),
    wht: Number(invoice.wht || 0),
    subtotal: Number(invoice.subtotal || 0),
    install_rate_total: Number(invoice.install_rate_total || 0),
    total: Number(invoice.total || 0),
    amount_in_words: invoice.amount_in_words || '',
    custom_fields: JSON.stringify(
      withInvoiceSourceTrail(
        {
          ...sourceInvoiceFields,
          quotationTitle: invoice.invoice_title || '',
          clientName: invoice.client_name || '',
          notesHtml: invoice.notes || '',
          termsHtml: invoice.terms || '',
        },
        buildInvoiceTrailLink({
          id: invoice.id,
          type: 'invoice',
          number: invoice.invoice_number,
          project_id: invoice.project_id || null,
          po_number: invoice.po_number || null,
        }),
      ),
    ),
  }

  const itemRows = items
    .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
    .map((item, index) => toQuotationItemRow(item, '' as any, index))

  const { data: createdQuotation, error } = await supabase.rpc('revert_invoice_to_quotation_transaction', {
    p_invoice_id: invoice.id,
    p_quotation_payload: quotationPayload,
    p_quotation_items_payload: itemRows,
  })

  if (error || !createdQuotation) {
    throw new Error(error?.message || 'Failed to revert invoice')
  }

  return createdQuotation
}
