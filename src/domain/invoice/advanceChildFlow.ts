export const ADVANCE_SUFFIX_DEFAULT = 'A'
export const ADVANCE_PRIMARY_LABEL_DEFAULT = 'Advance invoice due now'
export const ADVANCE_SECONDARY_LABEL_DEFAULT = 'Balance upon completion'

import {
  buildAdvanceInvoiceMetadata,
  getAdvanceInvoiceMetadata,
  isAdvanceInvoiceParent,
} from './advanceMetadata'
import {
  isLegacyAdvanceChildRow,
  isOrphanAdvanceChildRow,
  isArchivedOrQuarantinedAdvanceChildRow,
} from './advanceLegacyCleanup'
import { safeParseJson } from '../../lib/json/safeParseJson'

export type AdvanceMode = 'percent' | 'fixed'

function getAdvanceNumber(parentNumber: string, suffix?: string) {
  if (!parentNumber) return ''
  // Empty suffix should produce just the base number (e.g., SASINV-B022)
  // Undefined/new config defaults to ADVANCE_SUFFIX_DEFAULT (e.g., SASINV-B022-A)
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

type AdvanceInvoiceLike = {
  invoice_number?: string | null
  total?: number | string | null
  custom_fields?: any
  advance_primary_label?: string | null
  advance_secondary_label?: string | null
  archived_at?: string | null
}

function canUseLegacyChildFallback(invoice: AdvanceInvoiceLike | null | undefined): boolean {
  if (!invoice) return false
  if (!isLegacyAdvanceChildRow(invoice)) return false
  if (isArchivedOrQuarantinedAdvanceChildRow(invoice)) return false
  if (isOrphanAdvanceChildRow(invoice as any)) return false
  return true
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

export function getAdvanceDraftFromInvoice(invoice: AdvanceInvoiceLike | null | undefined) {
  const normalizedMetadata = isAdvanceInvoiceParent(invoice)
    ? getAdvanceInvoiceMetadata(invoice)
    : null

  let advanceConfig = invoice?.custom_fields?.advance_invoice
  if (typeof invoice?.custom_fields === 'string') {
    const parsed = safeParseJson(invoice.custom_fields, {} as any)
    advanceConfig = parsed?.advance_invoice
  }

  const useLegacyFallback = normalizedMetadata === null && canUseLegacyChildFallback(invoice)

  const mode: AdvanceMode =
    normalizedMetadata?.mode === 'fixed' || (useLegacyFallback && advanceConfig?.mode === 'fixed')
      ? 'fixed'
      : 'percent'
  const inputValue = normalizedMetadata?.value ?? (useLegacyFallback ? advanceConfig?.value : undefined) ?? (mode === 'fixed' ? 0 : 30)
  const invoiceNumber = String(invoice?.invoice_number || '')

  // Preserve existing suffix in config, even if empty string
  // Only default to ADVANCE_SUFFIX_DEFAULT if suffix is undefined (not present in config)
  // Only use legacy config if fallback is allowed
  const suffix = useLegacyFallback ? advanceConfig?.suffix : undefined
  const hasExistingSuffix = useLegacyFallback && 'suffix' in (advanceConfig || {})

  // If no suffix exists in config, derive from invoice number or default
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
      normalizedMetadata?.primary_label ||
      (useLegacyFallback ? advanceConfig?.primaryLabel : undefined) ||
      (useLegacyFallback ? advanceConfig?.primary_label : undefined) ||
      ADVANCE_PRIMARY_LABEL_DEFAULT
    ),
    secondaryLabel: String(
      normalizedMetadata?.secondary_label ||
      (useLegacyFallback ? advanceConfig?.secondaryLabel : undefined) ||
      (useLegacyFallback ? advanceConfig?.secondary_label : undefined) ||
      ADVANCE_SECONDARY_LABEL_DEFAULT
    ),
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
  inputValue: string | number
  suffix: string | undefined
  primaryLabel: string
  secondaryLabel: string
  threadPosition?: number
}) {
  // Use invoice total for calculations only - do not persist in custom_fields
  const contractValue = Math.max(0, toNumber(parentInvoice?.total))
  const advanceAmount = calculateAdvanceAmount({ contractValue, mode, inputValue })
  const numericInput = clamp(
    toNumber(inputValue),
    0,
    mode === 'fixed' ? contractValue : 100,
  )

  if (!parentInvoice?.client_id) {
    throw new Error('Cannot create advance invoice: Parent invoice is missing a client ID.')
  }

  const status = 'unpaid'
  const allowedStatuses = ['unpaid', 'partially_paid', 'paid', 'archived']
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Cannot create advance invoice: Invalid status "${status}"`)
  }

  const customFieldsString = typeof parentInvoice?.custom_fields === 'string' 
    ? parentInvoice.custom_fields 
    : JSON.stringify(parentInvoice?.custom_fields || {})

  const currentCustomFields = safeParseJson(customFieldsString, {} as Record<string, unknown>)
  
  // Validation: Ensure safeParseJson did not return {} if input was potentially valid
  if (customFieldsString !== '{}' && Object.keys(currentCustomFields).length === 0) {
    console.warn('Warning: custom_fields parsed to empty object from non-empty string')
  }

  // Only default suffix to ADVANCE_SUFFIX_DEFAULT when undefined
  const finalSuffix = suffix === undefined ? ADVANCE_SUFFIX_DEFAULT : suffix

  const advanceConfig = {
    mode,
    value: numericInput,
    contractValue,
    primaryLabel: primaryLabel || ADVANCE_PRIMARY_LABEL_DEFAULT,
    secondaryLabel: secondaryLabel || ADVANCE_SECONDARY_LABEL_DEFAULT,
    parentId: parentInvoice?.id || null,
    role: 'advance',
    position: threadPosition,
    suffix: finalSuffix,
  }

  return {
    invoice_number: getAdvanceNumber(String(parentInvoice?.invoice_number || ''), finalSuffix),
    invoice_title: parentInvoice?.invoice_title || null,
    po_number: parentInvoice?.po_number || null,
    client_id: parentInvoice?.client_id || null,
    client_name: parentInvoice?.client_name || '',
    project_id: parentInvoice?.project_id || null,
    issue_date: parentInvoice?.issue_date || new Date().toISOString().split('T')[0],
    due_date: parentInvoice?.due_date || null,
    status: 'unpaid',
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
    custom_fields: {
      ...currentCustomFields,
      advance_invoice: advanceConfig,
    },
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
