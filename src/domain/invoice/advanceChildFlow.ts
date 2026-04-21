export const ADVANCE_SUFFIX_DEFAULT = 'A'
export const ADVANCE_PRIMARY_LABEL_DEFAULT = 'Advance invoice due now'
export const ADVANCE_SECONDARY_LABEL_DEFAULT = 'Balance upon completion'

export type AdvanceMode = 'percent' | 'fixed'

function getAdvanceNumber(parentNumber: string, suffix?: string) {
  if (!parentNumber) return ''
  if (!suffix || !suffix.trim()) return parentNumber
  return `${parentNumber}-${suffix.trim()}`
}

type AdvanceParentInvoice = {
  id?: string | null
  invoice_number?: string | null
  invoice_title?: string | null
  po_number?: string | null
  client_id?: string | null
  client_name?: string | null
  project_id?: string | null
  issue_date?: string | null
  due_date?: string | null
  notes?: string | null
  terms?: string | null
  total?: number | string | null
  custom_fields?: unknown
}

type AdvanceInvoiceLike = {
  invoice_number?: string | null
  total?: number | string | null
  total_contract_value?: number | string | null
  advance_mode?: string | null
  advance_value?: number | string | null
  advance_primary_label?: string | null
  advance_secondary_label?: string | null
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

export function calculateAdvanceAmount({
  contractValue,
  mode,
  inputValue,
}: {
  contractValue: number | string | null | undefined
  mode: AdvanceMode
  inputValue: string
}) {
  const total = Math.max(0, toNumber(contractValue))
  const rawValue = Math.max(0, toNumber(inputValue))

  if (mode === 'fixed') {
    return roundCurrency(clamp(rawValue, 0, total))
  }

  return roundCurrency(total * (clamp(rawValue, 0, 100) / 100))
}

export function getAdvanceDraftFromInvoice(invoice: AdvanceInvoiceLike | null | undefined) {
  const mode: AdvanceMode = invoice?.advance_mode === 'fixed' ? 'fixed' : 'percent'
  const inputValue = String(invoice?.advance_value ?? '')
  const invoiceNumber = String(invoice?.invoice_number || '')
  const suffix = invoiceNumber.includes('-') ? invoiceNumber.split('-').pop() || ADVANCE_SUFFIX_DEFAULT : ADVANCE_SUFFIX_DEFAULT

  return {
    mode,
    inputValue,
    suffix: suffix || ADVANCE_SUFFIX_DEFAULT,
    primaryLabel: String(invoice?.advance_primary_label || ADVANCE_PRIMARY_LABEL_DEFAULT),
    secondaryLabel: String(invoice?.advance_secondary_label || ADVANCE_SECONDARY_LABEL_DEFAULT),
  }
}

export function buildAdvanceChildInvoicePayload({
  parentInvoice,
  mode,
  inputValue,
  suffix,
  primaryLabel,
  secondaryLabel,
  threadPosition = 1,
}: {
  parentInvoice: AdvanceParentInvoice
  mode: AdvanceMode
  inputValue: string
  suffix: string
  primaryLabel: string
  secondaryLabel: string
  threadPosition?: number
}) {
  const contractValue = Math.max(0, toNumber(parentInvoice?.total))
  const advanceAmount = calculateAdvanceAmount({ contractValue, mode, inputValue })
  const numericInput = clamp(
    toNumber(inputValue),
    0,
    mode === 'fixed' ? contractValue : 100,
  )

  return {
    invoice_number: getAdvanceNumber(String(parentInvoice?.invoice_number || ''), suffix || ADVANCE_SUFFIX_DEFAULT),
    invoice_title: parentInvoice?.invoice_title || null,
    po_number: parentInvoice?.po_number || null,
    client_id: parentInvoice?.client_id || null,
    client_name: parentInvoice?.client_name || '',
    project_id: parentInvoice?.project_id || null,
    issue_date: parentInvoice?.issue_date || new Date().toISOString().split('T')[0],
    due_date: parentInvoice?.due_date || null,
    status: 'draft',
    document_type: 'INVOICE',
    notes: parentInvoice?.notes || '',
    terms: parentInvoice?.terms || '',
    workmanship: 0,
    transportation: 0,
    shipping: 0,
    discount: 0,
    vat: 0,
    wht: 0,
    subtotal: advanceAmount,
    install_rate_total: 0,
    total: advanceAmount,
    amount_in_words: '',
    custom_fields: parentInvoice?.custom_fields || null,
    advance_mode: mode,
    advance_value: numericInput,
    total_contract_value: contractValue,
    thread_id: parentInvoice?.id || null,
    thread_role: 'advance',
    thread_position: threadPosition,
    advance_primary_label: primaryLabel || ADVANCE_PRIMARY_LABEL_DEFAULT,
    advance_secondary_label: secondaryLabel || ADVANCE_SECONDARY_LABEL_DEFAULT,
  }
}
