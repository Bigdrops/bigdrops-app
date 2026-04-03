import { supabase } from '@/supabase'
import { appendDerivedTrail, buildTrailLink, parseDocumentCustomFields, withSourceTrail } from '@/domain/documentConversion'

export type AdvanceMode = 'percent' | 'fixed'

type SourceInvoiceLike = {
  id?: string | null
  invoice_number?: string | null
  po_number?: string | null
  client_id?: string | null
  client_name?: string | null
  project_id?: string | null
  issue_date?: string | null
  due_date?: string | null
  status?: string | null
  document_type?: string | null
  payment_terms?: string | null
  notes?: string | null
  terms?: string | null
  workmanship?: number | string | null
  transportation?: number | string | null
  shipping?: number | string | null
  discount?: number | string | null
  vat?: number | string | null
  wht?: number | string | null
  subtotal?: number | string | null
  install_rate_total?: number | string | null
  total?: number | string | null
  amount_in_words?: string | null
  invoice_title?: string | null
  work_duration?: string | null
  custom_fields?: unknown
  thread_id?: string | null
  thread_position?: number | null
  total_contract_value?: number | string | null
}

type CreateAdvanceInvoiceArgs = {
  sourceInvoice: SourceInvoiceLike
  mode: AdvanceMode
  value: number
  suffix?: string
}

export function composeAdvanceInvoiceNumber(sourceNumber: string, suffix: string) {
  const cleanSource = String(sourceNumber || '').trim()
  const cleanSuffix = String(suffix || '').trim()
  if (!cleanSource) return cleanSuffix
  if (!cleanSuffix) return cleanSource
  return `${cleanSource}-${cleanSuffix}`
}

export function extractAdvanceSuffix(invoiceNumber: string, sourceNumber: string) {
  const cleanInvoiceNumber = String(invoiceNumber || '').trim()
  const cleanSourceNumber = String(sourceNumber || '').trim()
  if (!cleanInvoiceNumber || !cleanSourceNumber) return ''
  const prefix = `${cleanSourceNumber}-`
  if (!cleanInvoiceNumber.startsWith(prefix)) return ''
  return cleanInvoiceNumber.slice(prefix.length)
}

export function validateAdvanceInput({
  sourceTotal,
  mode,
  value,
}: {
  sourceTotal: number
  mode: AdvanceMode
  value: number
}) {
  if (!Number.isFinite(sourceTotal) || sourceTotal <= 0) return 'Source invoice total must be greater than zero.'
  if (!Number.isFinite(value) || value <= 0) return 'Advance value must be greater than zero.'
  if (mode === 'percent' && value > 100) return 'Percent advance must be 100 or less.'
  if (mode === 'fixed' && value > sourceTotal) return 'Fixed advance cannot be greater than source invoice total.'
  return null
}

function computeAdvanceAmount(sourceTotal: number, mode: AdvanceMode, value: number) {
  if (mode === 'percent') return (sourceTotal * value) / 100
  return value
}

export async function createAdvanceInvoiceFromSource({
  sourceInvoice,
  mode,
  value,
  suffix = 'A',
}: CreateAdvanceInvoiceArgs) {
  const sourceId = sourceInvoice.id
  if (!sourceId) throw new Error('Missing source invoice ID.')

  const sourceTotal = Number(sourceInvoice.total || 0)
  const validationError = validateAdvanceInput({ sourceTotal, mode, value })
  if (validationError) throw new Error(validationError)

  const amountDueNow = computeAdvanceAmount(sourceTotal, mode, value)
  const remainingBalance = Math.max(0, sourceTotal - amountDueNow)
  const today = new Date().toISOString().split('T')[0]
  const threadId = sourceInvoice.thread_id || crypto.randomUUID()
  const sourceCustomFields = parseDocumentCustomFields(sourceInvoice.custom_fields)
  const sourceNumber = String(sourceInvoice.invoice_number || '').trim()
  const nextInvoiceNumber = composeAdvanceInvoiceNumber(sourceNumber, suffix)

  const sourceLink = buildTrailLink({
    id: sourceInvoice.id,
    type: 'invoice',
    number: sourceInvoice.invoice_number,
    project_id: sourceInvoice.project_id || null,
    po_number: null,
  })

  const childCustomFields = withSourceTrail(
    {
      ...sourceCustomFields,
      advanceStage: {
        kind: 'advance',
        mode,
        value,
        amountDueNow,
        remainingBalance,
        sourceInvoiceId: sourceInvoice.id,
        sourceInvoiceNumber: sourceNumber,
        sourceInvoiceTotal: sourceTotal,
        sourceNumberPrefix: sourceNumber,
        suffix: String(suffix || '').trim(),
      },
    },
    sourceLink
  )

  const { data: createdInvoice, error: createError } = await supabase
    .from('invoices')
    .insert([
      {
        invoice_number: nextInvoiceNumber,
        po_number: sourceInvoice.po_number || null,
        invoice_title: sourceInvoice.invoice_title || null,
        client_id: sourceInvoice.client_id || null,
        client_name: sourceInvoice.client_name || '',
        issue_date: today,
        due_date: sourceInvoice.due_date || null,
        status: 'draft',
        document_type: 'ADVANCE INVOICE',
        payment_terms: sourceInvoice.payment_terms || '',
        notes: sourceInvoice.notes || '',
        terms: sourceInvoice.terms || '',
        workmanship: Number(sourceInvoice.workmanship || 0),
        transportation: Number(sourceInvoice.transportation || 0),
        shipping: Number(sourceInvoice.shipping || 0),
        discount: Number(sourceInvoice.discount || 0),
        vat: Number(sourceInvoice.vat || 0),
        wht: Number(sourceInvoice.wht || 0),
        subtotal: Number(sourceInvoice.subtotal || 0),
        install_rate_total: Number(sourceInvoice.install_rate_total || 0),
        total: amountDueNow,
        amount_in_words: sourceInvoice.amount_in_words || '',
        work_duration: sourceInvoice.work_duration || '',
        custom_fields: JSON.stringify(childCustomFields),
        thread_id: threadId,
        thread_role: 'advance',
        thread_position: Number(sourceInvoice.thread_position || 1) + 1,
        total_contract_value: Number(sourceInvoice.total_contract_value || sourceTotal),
        is_advance: true,
        advance_mode: mode,
        advance_value: value,
      },
    ])
    .select('*')
    .single()

  if (createError || !createdInvoice?.id) throw createError || new Error('Failed to create advance invoice.')

  const { data: sourceItems, error: sourceItemsError } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', sourceId)
    .order('sort_order')

  if (sourceItemsError) throw sourceItemsError

  const nextItems = (sourceItems || []).map((item, index) => ({
    ...item,
    id: undefined,
    invoice_id: createdInvoice.id,
    sort_order: index,
    created_at: undefined,
    updated_at: undefined,
  }))

  if (nextItems.length > 0) {
    const { error: insertItemsError } = await supabase.from('invoice_items').insert(nextItems)
    if (insertItemsError) throw insertItemsError
  }

  const sourceDerivedLink = buildTrailLink({
    id: createdInvoice.id,
    type: 'invoice',
    number: createdInvoice.invoice_number,
    project_id: createdInvoice.project_id || null,
    po_number: createdInvoice.po_number || null,
  })
  const updatedSourceCustomFields = appendDerivedTrail(sourceCustomFields, sourceDerivedLink)

  await supabase
    .from('invoices')
    .update({ custom_fields: JSON.stringify(updatedSourceCustomFields), thread_id: threadId })
    .eq('id', sourceId)

  return createdInvoice
}
