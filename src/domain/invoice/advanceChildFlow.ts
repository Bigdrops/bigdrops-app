export const ADVANCE_SUFFIX_DEFAULT = 'A'
export const ADVANCE_PRIMARY_LABEL_DEFAULT = 'Advance invoice due now'
export const ADVANCE_SECONDARY_LABEL_DEFAULT = 'Balance upon completion'

import {
  buildAdvanceInvoiceMetadata,
  getAdvanceInvoiceMetadata,
  isAdvanceInvoiceParent,
} from './advanceMetadata'

export type AdvanceMode = 'percent' | 'fixed'

function getAdvanceNumber(parentNumber: string, suffix?: string) {
  if (!parentNumber) return ''
  if (suffix === undefined) {
    return `${parentNumber}-${ADVANCE_SUFFIX_DEFAULT}`
  }
  if (!suffix.trim()) {
    return parentNumber
  }
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
  inputValue: string | number
}) {
  const total = Math.max(0, toNumber(contractValue))
  const rawValue = Math.max(0, toNumber(inputValue))

  if (mode === 'fixed') {
    return roundCurrency(clamp(rawValue, 0, total))
  }

  return roundCurrency(total * (clamp(rawValue, 0, 100) / 100))
}

export function getAdvanceDraftFromInvoice(invoice?: AdvanceParentInvoice | null) {
  const metadata = isAdvanceInvoiceParent(invoice)
    ? getAdvanceInvoiceMetadata(invoice)
    : null

  const mode: AdvanceMode = metadata?.mode === 'fixed' ? 'fixed' : 'percent'
  const inputValue = metadata?.value ?? (mode === 'fixed' ? 0 : 30)
  const invoiceNumber = String(invoice?.invoice_number || '')

  const suffix = metadata?.suffix
  const hasExistingSuffix = suffix !== undefined

  let finalSuffix: string
  if (!hasExistingSuffix) {
    finalSuffix = invoiceNumber.includes('-') ? invoiceNumber.split('-').pop()! : ADVANCE_SUFFIX_DEFAULT
  } else {
    finalSuffix = suffix === undefined ? ADVANCE_SUFFIX_DEFAULT : String(suffix)
  }

  return {
    mode,
    inputValue: Number(inputValue),
    suffix: finalSuffix,
    primaryLabel: String(
      metadata?.primary_label ||
      ADVANCE_PRIMARY_LABEL_DEFAULT
    ),
    secondaryLabel: String(
      metadata?.secondary_label ||
      ADVANCE_SECONDARY_LABEL_DEFAULT
    ),
  }
}

export function buildAdvanceParentInvoiceMetadata({
  parentInvoice,
  mode,
  inputValue,
  suffix,
  primaryLabel,
  secondaryLabel,
  legacyChildInvoiceId,
  legacyChildInvoiceNumber,
  legacyChildInvoiceTotal,
  issuedAt,
  dueAt,
  status,
  printSnapshot,
}: {
  parentInvoice: AdvanceParentInvoice
  mode: AdvanceMode
  inputValue: string | number
  suffix: string | undefined
  primaryLabel: string
  secondaryLabel: string
  legacyChildInvoiceId?: string | null
  legacyChildInvoiceNumber?: string | null
  legacyChildInvoiceTotal?: number | string | null
  issuedAt?: string | null
  dueAt?: string | null
  status?: string | null
  printSnapshot?: unknown
}) {
  const contractValue = Math.max(0, toNumber(parentInvoice?.total))
  const numericInput = clamp(
    toNumber(inputValue),
    0,
    mode === 'fixed' ? contractValue : 100,
  )
  const finalSuffix = suffix === undefined ? ADVANCE_SUFFIX_DEFAULT : suffix
  const normalizedMode = mode === 'fixed' ? 'fixed' : 'percentage'
  const advanceAmount = calculateAdvanceAmount({ contractValue, mode, inputValue: numericInput })

  return buildAdvanceInvoiceMetadata({
    enabled: true,
    amount: advanceAmount,
    mode: normalizedMode,
    value: numericInput,
    document_number: getAdvanceNumber(String(parentInvoice?.invoice_number || ''), finalSuffix),
    issued_at: issuedAt || parentInvoice?.issue_date || undefined,
    due_at: dueAt || parentInvoice?.due_date || undefined,
    status: status || 'unpaid',
    primary_label: primaryLabel || ADVANCE_PRIMARY_LABEL_DEFAULT,
    secondary_label: secondaryLabel || ADVANCE_SECONDARY_LABEL_DEFAULT,
    suffix: finalSuffix,
    contract_value: contractValue,
    legacy_child_invoice_id: legacyChildInvoiceId || undefined,
    legacy_child_invoice_number: legacyChildInvoiceNumber || undefined,
    legacy_child_invoice_total:
      legacyChildInvoiceTotal === null || legacyChildInvoiceTotal === undefined
        ? undefined
        : toNumber(legacyChildInvoiceTotal),
    print_snapshot: printSnapshot,
  })
}
