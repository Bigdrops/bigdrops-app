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
  return value === 'fixed' ? 'fixed' : 'percentage'
}

function hasMeaningfulParentMetadata(config: AdvanceConfigLike | null) {
  if (!config) return false

  if (config.role === 'advance') return false
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
  const value = Math.max(0, toNumber(input.value))
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
    if (valueCandidate !== undefined) {
      ;(metadata as Record<string, unknown>)[key] = valueCandidate
    }
  }

  if (contractValue > 0) metadata.contract_value = contractValue
  if (childTotal > 0) metadata.legacy_child_invoice_total = childTotal

  return metadata
}

export function getAdvanceInvoiceMetadata(input: AdvanceCarrier | unknown): AdvanceInvoiceMetadata | null {
  const config = getRawAdvanceConfig(input)
  if (!hasMeaningfulParentMetadata(config)) return null

  const record = (input && typeof input === 'object' ? input : null) as Record<string, unknown> | null
  const mode = normalizeMode(config?.mode)
  const value = Math.max(0, toNumber(config?.value))
  const amount = Math.max(
    0,
    toNumber(config?.amount ?? config?.legacy_child_invoice_total ?? record?.total),
  )

  return buildAdvanceInvoiceMetadata({
    enabled: config?.enabled === false ? false : true,
    amount,
    mode,
    value,
    document_number:
      pickString(config?.document_number) ||
      pickString(config?.legacy_child_invoice_number) ||
      pickString(record?.invoice_number),
    issued_at: pickString(config?.issued_at) || pickString(record?.issue_date),
    due_at: pickString(config?.due_at) || pickString(record?.due_date),
    status: pickString(config?.status) || pickString(record?.status),
    primary_label:
      pickString(config?.primary_label) ||
      pickString(config?.primaryLabel),
    secondary_label:
      pickString(config?.secondary_label) ||
      pickString(config?.secondaryLabel),
    suffix: pickString(config?.suffix),
    contract_value: toNumber(config?.contract_value ?? config?.contractValue),
    legacy_child_invoice_id:
      pickString(config?.legacy_child_invoice_id) ||
      pickString(config?.childInvoiceId),
    legacy_child_invoice_number:
      pickString(config?.legacy_child_invoice_number),
    legacy_child_invoice_total: toNumber(config?.legacy_child_invoice_total),
    print_snapshot: config?.print_snapshot,
  })
}

export function mergeAdvanceInvoiceMetadata(customFields: unknown, metadata: AdvanceInvoiceMetadata) {
  return {
    ...parseAdvanceContainer(customFields),
    advance_invoice: buildAdvanceInvoiceMetadata(metadata),
  }
}

export function clearAdvanceInvoiceMetadata(customFields: unknown) {
  const nextCustomFields = {
    ...parseAdvanceContainer(customFields),
  }
  delete nextCustomFields.advance_invoice
  return nextCustomFields
}
