import { supabase } from '@/supabase'
import { buildInvoiceCsv, downloadInvoiceCsv } from '@/components/invoice/exportInvoiceCsv'
import { buildAdvanceChildInvoicePayload } from '@/domain/invoice/advanceChildFlow'
import { getNextQuotationNumber } from '@/domain/quotation'
import { parseDocumentCustomFields, toQuotationItemRow, withSourceTrail, buildTrailLink } from '@/domain/documentConversion'

export function downloadInvoiceCsvFile({
  invoice,
  items,
  invoiceTotal,
}: {
  invoice: any
  items: any[]
  invoiceTotal: number
}) {
  const csv = buildInvoiceCsv({
    invoice,
    items,
    totals: {
      rawSubtotal: Number(invoice.subtotal || 0),
      installRateTotal: Number(invoice.install_rate_total || 0),
      vatAmount: Number(invoice.vat || 0),
      discountAmount: Number(invoice.discount || 0),
      whtAmount: Number(invoice.wht || 0),
      totalPayable: invoiceTotal,
    },
  })
  downloadInvoiceCsv(`${invoice.invoice_number || 'invoice'}.csv`, csv)
}

export async function duplicateInvoiceDraft({
  invoice,
  items,
}: {
  invoice: any
  items: any[]
}) {
  const { data: all } = await supabase.from('invoices').select('invoice_number').like('invoice_number', 'SASINV-B%').order('created_at', { ascending: false })
  let nextNum = 1
  if (all && all.length > 0) {
    const nums = all
      .map((entry: any) => parseInt(String(entry.invoice_number || '').replace('SASINV-B', ''), 10))
      .filter((value: number) => !Number.isNaN(value))
    nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1
  }
  return {
    prefill: {
      ...invoice,
      invoice_number: `SASINV-B${String(nextNum).padStart(3, '0')}`,
      client_id: null,
      client_name: '',
      project_id: null,
      status: 'unpaid',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: null,
    },
    prefillItems: items.map((item) => ({ ...item, id: null })),
  }
}

export function buildWaybillPrefill(invoice: any) {
  return {
    sourceInvoice: {
      invoiceId: invoice?.id,
      invoiceNumber: invoice?.invoice_number || '',
      clientId: invoice?.client_id || '',
      clientName: invoice?.client_name || '',
      poNumber: String(invoice?.po_number || ''),
    },
  }
}

export async function archiveInvoiceRecord(id: string) {
  const { error } = await supabase.from('invoices').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteInvoiceRecord(id: string) {
  const { error } = await supabase.rpc('delete_invoice_transaction', { p_invoice_id: id })
  if (error) throw error
}

export async function createAdvanceInvoiceRecord({
  parentInvoice,
  mode,
  inputValue,
  suffix,
  primaryLabel,
  secondaryLabel,
}: {
  parentInvoice: any
  mode: 'percent' | 'fixed'
  inputValue: string
  suffix: string
  primaryLabel: string
  secondaryLabel: string
}) {
  const { data: existingAdvance, error: existingAdvanceError } = await supabase
    .from('invoices')
    .select('id, invoice_number, invoice_title, total, custom_fields')
    .ilike('custom_fields', `%"parentId":"${parentInvoice?.id}"%`)
    .is('archived_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingAdvanceError) throw existingAdvanceError

  if (existingAdvance) {
    return { invoice: existingAdvance, created: false }
  }

  const payload = buildAdvanceChildInvoicePayload({
    parentInvoice,
    mode,
    inputValue,
    suffix,
    primaryLabel,
    secondaryLabel,
    threadPosition: 1,
  })

  console.log('Advance invoice insert payload:', payload)

  const { data, error } = await supabase
    .from('invoices')
    .insert([{
      ...payload,
      custom_fields: JSON.stringify(payload.custom_fields)
    }])
    .select()
    .single()

  if (error) {
    console.error('Supabase error creating advance invoice:', error)
    throw new Error(`Could not save advance invoice: ${error.message}`)
  }
  if (!data) {
    throw new Error('Could not save advance invoice: No data returned from server')
  }
  return { invoice: data, created: true }
}

export async function updateAdvanceInvoiceRecord({
  advanceInvoiceId,
  parentInvoice,
  mode,
  inputValue,
  suffix,
  primaryLabel,
  secondaryLabel,
  threadPosition,
}: {
  advanceInvoiceId: string
  parentInvoice: any
  mode: 'percent' | 'fixed'
  inputValue: string
  suffix: string
  primaryLabel: string
  secondaryLabel: string
  threadPosition?: number
}) {
  const payload = buildAdvanceChildInvoicePayload({
    parentInvoice,
    mode,
    inputValue,
    suffix,
    primaryLabel,
    secondaryLabel,
    threadPosition,
  })

  console.log('Advance invoice update payload:', payload)

  const { data, error } = await supabase
    .from('invoices')
    .update({
      ...payload,
      custom_fields: JSON.stringify(payload.custom_fields)
    })
    .eq('id', advanceInvoiceId)
    .select()
    .single()

  if (error) {
    console.error('Supabase error updating advance invoice:', error)
    throw new Error(`Could not save advance invoice: ${error.message}`)
  }
  if (!data) {
    throw new Error('Could not save advance invoice: No data returned from server')
  }
  return data
}

export async function deleteAdvanceInvoiceRecord(id: string) {
  const { error } = await supabase.rpc('delete_invoice_transaction', { p_invoice_id: id })
  if (error) throw error
}

export async function revertInvoiceToQuotation({
  invoice,
  items,
  customFields,
}: {
  invoice: any
  items: any[]
  customFields: any
}) {
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
      withSourceTrail(
        {
          ...sourceInvoiceFields,
          quotationTitle: invoice.invoice_title || '',
          clientName: invoice.client_name || '',
          notesHtml: invoice.notes || '',
          termsHtml: invoice.terms || '',
        },
        buildTrailLink({
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

  if (error || !createdQuotation) throw new Error(error?.message || 'Failed to revert invoice')
  return createdQuotation
}
