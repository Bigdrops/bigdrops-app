import { safeParseJson } from '../../lib/json/safeParseJson'

export type AdvanceInvoiceMetadataMode = 'fixed' | 'percentage'

export type AdvanceInvoiceMetadata = {
  enabled: boolean
  amount: number
  mode: AdvanceInvoiceMetadataMode
  value: number
  document_number?: string
  issued_at?: string
  due_at?: string
  status?: string
  primary_label?: string
  secondary_label?: string
  suffix?: string
  contract_value?: number
  legacy_child_invoice_id?: string
  legacy_child_invoice_number?: string
  legacy_child_invoice_total?: number
  print_snapshot?: unknown
}

type AdvanceCarrier =
  | {
      custom_fields?: unknown
      invoice_number?: string | null
      issue_date?: string | null
      due_date?: string | null
      status?: string | null
      total?: number | string | null
    }
  | null
  | undefined

type AdvanceConfigLike = Record<string, unknown>

function toNumber(value: unknown) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function pickString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function pickUnknownObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function parseAdvanceContainer(input: AdvanceCarrier | unknown) {
  if (!input) return {}

  if (typeof input === 'string') {
    return safeParseJson(input, {} as Record<string, unknown>)
  }

  if (typeof input !== 'object' || Array.isArray(input)) {
    return {}
  }

  const record = input as Record<string, unknown>
  if (record.custom_fields !== undefined) {
    return parseAdvanceContainer(record.custom_fields)
  }

  return record
}

function getRawAdvanceConfig(input: AdvanceCarrier | unknown): AdvanceConfigLike | null {
  const container = parseAdvanceContainer(input)
  const advanceConfig = container.advance_invoice
  if (!advanceConfig || typeof advanceConfig !== 'object' || Array.isArray(advanceConfig)) {
    return null
  }
  return advanceConfig as AdvanceConfigLike
}

function normalizeMode(value: unknown): AdvanceInvoiceMetadataMode {
  if (value === 'fixed') return 'fixed'
  if (value === 'percentage' || value === 'percent') return 'percentage'
  return 'percentage'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

const VALID_METADATA_KEYS = new Set<string>([
  'enabled', 'amount', 'mode', 'value',
  'document_number', 'issued_at', 'due_at', 'status',
  'primary_label', 'secondary_label', 'suffix',
  'contract_value',
  'legacy_child_invoice_id', 'legacy_child_invoice_number',
  'legacy_child_invoice_total',
  'print_snapshot',
])

/**
 * Authority order for advance amount derivation:
 * 1. explicit amount (stored in metadata) — sole runtime authority
 * 2. calculated from mode + value (fixed/percentage of contract value)
 *
 * Legacy child totals (legacy_child_invoice_total) are preserved in metadata
 * for historical traceability only. They must NEVER outrank explicit or
 * calculated amounts in the active runtime.
 */
function deriveAdvanceAmount({
  amount,
  contractValue,
  mode,
  value,
}: {
  amount: unknown
  contractValue: unknown
  mode: AdvanceInvoiceMetadataMode
  value: unknown
}) {
  const explicitAmount = toNumber(amount)
  if (explicitAmount > 0) return explicitAmount

  const numericValue = Math.max(0, toNumber(value))
  const numericContractValue = Math.max(0, toNumber(contractValue))

  if (mode === 'fixed') {
    return roundCurrency(clamp(numericValue, 0, numericContractValue || numericValue))
  }

  if (numericContractValue <= 0) return 0
  return roundCurrency(numericContractValue * (clamp(numericValue, 0, 100) / 100))
}

function deriveDocumentNumber({
  documentNumber,
  legacyChildInvoiceNumber,
  parentInvoiceNumber,
  suffix,
}: {
  documentNumber: unknown
  legacyChildInvoiceNumber: unknown
  parentInvoiceNumber: unknown
  suffix: unknown
}) {
  const explicitDocumentNumber = pickString(documentNumber)
  if (explicitDocumentNumber) return explicitDocumentNumber

  const explicitLegacyNumber = pickString(legacyChildInvoiceNumber)
  if (explicitLegacyNumber) return explicitLegacyNumber

  const parentNumber = pickString(parentInvoiceNumber)
  if (!parentNumber) return undefined

  if (suffix === undefined) return undefined
  const nextSuffix = String(suffix)
  if (!nextSuffix.trim()) return parentNumber
  return `${parentNumber}-${nextSuffix.trim()}`
}

function hasMeaningfulParentMetadata(config: AdvanceConfigLike | null) {
  if (!config) return false

  if (config.role === 'advance') return false

  if (isMalformedAdvanceMetadata(config)) return false

  if (config.enabled === true) return true
  if (config.amount !== undefined) return true
  if (config.value !== undefined) return true
  if (config.childInvoiceId !== undefined || config.legacy_child_invoice_id !== undefined) return true
  if (config.document_number !== undefined) return true
  if (config.primary_label !== undefined || config.primaryLabel !== undefined) return true
  if (config.secondary_label !== undefined || config.secondaryLabel !== undefined) return true
  if (config.contract_value !== undefined || config.contractValue !== undefined) return true
  return false
}

export function isAdvanceInvoiceChild(input: AdvanceCarrier | unknown) {
  return getRawAdvanceConfig(input)?.role === 'advance'
}

export function isAdvanceInvoiceParent(input: AdvanceCarrier | unknown) {
  const config = getRawAdvanceConfig(input)
  return hasMeaningfulParentMetadata(config)
}

export function buildAdvanceInvoiceMetadata(
  input: Partial<AdvanceInvoiceMetadata> & {
    mode?: AdvanceInvoiceMetadataMode | 'percent'
    value?: number | string
    amount?: number | string
    contract_value?: number | string
    legacy_child_invoice_total?: number | string
  },
): AdvanceInvoiceMetadata {
  const mode = normalizeMode(input.mode)
  const rawValue = toNumber(input.value)
  const value = mode === 'percentage' ? clamp(rawValue, 0, 100) : Math.max(0, rawValue)
  const amount = Math.max(0, toNumber(input.amount))
  const contractValue = toNumber(input.contract_value)
  const childTotal = toNumber(input.legacy_child_invoice_total)

  const metadata: AdvanceInvoiceMetadata = {
    enabled: input.enabled !== false,
    amount,
    mode,
    value,
  }

  const optionalFields: Array<[keyof AdvanceInvoiceMetadata, unknown]> = [
    ['document_number', input.document_number],
    ['issued_at', input.issued_at],
    ['due_at', input.due_at],
    ['status', input.status],
    ['primary_label', input.primary_label],
    ['secondary_label', input.secondary_label],
    ['suffix', input.suffix],
    ['legacy_child_invoice_id', input.legacy_child_invoice_id],
    ['legacy_child_invoice_number', input.legacy_child_invoice_number],
    ['print_snapshot', input.print_snapshot],
  ]

  for (const [key, valueCandidate] of optionalFields) {
    if (valueCandidate !== undefined && VALID_METADATA_KEYS.has(key)) {
      ;(metadata as Record<string, unknown>)[key] = valueCandidate
    }
  }

  if (contractValue > 0) metadata.contract_value = contractValue
  if (childTotal > 0) metadata.legacy_child_invoice_total = childTotal

  return metadata
}

export function isMalformedAdvanceMetadata(input: unknown): boolean {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return true
  
  const record = input as Record<string, unknown>

  if (record.role === 'advance') return true

  if (record.enabled !== undefined && typeof record.enabled !== 'boolean') return true

  if (record.mode !== undefined && typeof record.mode !== 'string') return true
  if (typeof record.mode === 'string' && !['fixed', 'percentage', 'percent'].includes(record.mode as string)) return true

  if (record.amount !== undefined && record.amount !== null && !Number.isFinite(Number(record.amount))) return true
  if (record.value !== undefined && record.value !== null && !Number.isFinite(Number(record.value))) return true
  if (record.contract_value !== undefined && record.contract_value !== null && !Number.isFinite(Number(record.contract_value))) return true

  for (const key of Object.keys(record)) {
    if (!VALID_METADATA_KEYS.has(key) && key !== 'role') {
      return true
    }
  }

  return false
}

export function getAdvanceInvoiceMetadata(input: AdvanceCarrier | unknown): AdvanceInvoiceMetadata | null {
  const config = getRawAdvanceConfig(input)
  if (!hasMeaningfulParentMetadata(config)) return null

  if (isMalformedAdvanceMetadata(config)) return null

  const record = (input && typeof input === 'object' ? input : null) as Record<string, unknown> | null
  const mode = normalizeMode(config?.mode)
  const value = Math.max(0, toNumber(config?.value))
  const contractValue = toNumber(config?.contract_value ?? config?.contractValue ?? record?.total)
  const amount = Math.max(
    0,
    deriveAdvanceAmount({
      amount: config?.amount,
      contractValue,
      mode,
      value,
    }),
  )

  return buildAdvanceInvoiceMetadata({
    enabled: config?.enabled === false ? false : true,
    amount,
    mode,
    value,
    document_number: deriveDocumentNumber({
      documentNumber: config?.document_number,
      legacyChildInvoiceNumber: config?.legacy_child_invoice_number,
      parentInvoiceNumber: record?.invoice_number,
      suffix: config?.suffix,
    }),
    issued_at: pickString(config?.issued_at) || pickString(record?.issue_date),
    due_at: pickString(config?.due_at) || pickString(record?.due_date),
    status: pickString(config?.status) || 'unpaid',
    primary_label:
      pickString(config?.primary_label) ||
      pickString(config?.primaryLabel),
    secondary_label:
      pickString(config?.secondary_label) ||
      pickString(config?.secondaryLabel),
    suffix: pickString(config?.suffix),
    contract_value: contractValue,
    legacy_child_invoice_id:
      pickString(config?.legacy_child_invoice_id) ||
      pickString(config?.childInvoiceId),
    legacy_child_invoice_number:
      pickString(config?.legacy_child_invoice_number),
    legacy_child_invoice_total: toNumber(config?.legacy_child_invoice_total),
    print_snapshot: config?.print_snapshot,
  })
}

export function mergeAdvanceInvoiceMetadata(customFields: unknown, metadata: AdvanceInvoiceMetadata): Record<string, unknown> & { advance_invoice: AdvanceInvoiceMetadata } {
  return {
    ...parseAdvanceContainer(customFields),
    advance_invoice: buildAdvanceInvoiceMetadata(metadata),
  }
}

export function clearAdvanceInvoiceMetadata(customFields: unknown): Record<string, unknown> {
  const nextCustomFields = {
    ...parseAdvanceContainer(customFields),
  }
  delete nextCustomFields.advance_invoice
  return nextCustomFields
}

/**
 * Normalize and validate advance metadata in one step.
 * Returns null if the input is malformed or cannot be normalized safely.
 * This is the fail-closed entry point for external callers.
 * Preserves unrelated custom_fields keys.
 */
export function normalizeAdvanceMetadata(
  input: Partial<AdvanceInvoiceMetadata> & {
    mode?: AdvanceInvoiceMetadataMode | 'percent'
    value?: number | string
    amount?: number | string
    contract_value?: number | string
    legacy_child_invoice_total?: number | string
  },
): AdvanceInvoiceMetadata | null {
  if (isMalformedAdvanceMetadata(input)) return null
  const built = buildAdvanceInvoiceMetadata(input)
  if (isMalformedAdvanceMetadata(built)) return null
  return built
}
