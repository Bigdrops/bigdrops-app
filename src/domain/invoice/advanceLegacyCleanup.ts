import { safeParseJson } from '../../lib/json/safeParseJson'

export type AdvanceLegacyChildRow = {
  id: string
  invoice_number: string | null
  custom_fields?: unknown
  parent_invoice_id?: string | null
}

export type LegacyAdvanceConfig = {
  role: 'advance'
  parentId?: string | null
  position?: number
  mode?: string
  value?: number
  contractValue?: number
  primaryLabel?: string
  secondaryLabel?: string
  suffix?: string
}

export type QuarantineStatus = 'active' | 'archived' | 'quarantined' | 'orphan'

function parseCustomFields(input: unknown): Record<string, unknown> {
  if (!input) return {}
  if (typeof input === 'string') {
    return safeParseJson(input, {})
  }
  if (typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>
  }
  return {}
}

function getAdvanceConfigFromCustomFields(customFields: unknown): LegacyAdvanceConfig | null {
  const parsed = parseCustomFields(customFields)
  const advanceConfig = parsed.advance_invoice
  if (!advanceConfig || typeof advanceConfig !== 'object') return null
  const config = advanceConfig as Record<string, unknown>
  if (config.role !== 'advance') return null
  return config as LegacyAdvanceConfig
}

export function isLegacyAdvanceChildRow(invoice: { custom_fields?: unknown } | null | undefined): boolean {
  if (!invoice) return false
  const config = getAdvanceConfigFromCustomFields(invoice.custom_fields)
  return config !== null
}

export function isLegacyAdvanceChildRowWithParent(invoice: AdvanceLegacyChildRow & { parent_invoice_id?: string | null }): boolean {
  if (!isLegacyAdvanceChildRow(invoice)) return false
  return !!invoice.parent_invoice_id
}

export function isOrphanAdvanceChildRow(invoice: AdvanceLegacyChildRow & { parent_invoice_id?: string | null }): boolean {
  if (!isLegacyAdvanceChildRow(invoice)) return false
  return !invoice.parent_invoice_id
}

export function isArchivedOrQuarantinedAdvanceChildRow(invoice: { custom_fields?: unknown; archived_at?: string }): boolean {
  if (!isLegacyAdvanceChildRow(invoice)) return false
  return !!invoice.archived_at
}

export function getLegacyAdvanceStatus(invoice: AdvanceLegacyChildRow & { parent_invoice_id?: string | null; archived_at?: string }): QuarantineStatus {
  if (invoice.archived_at) return 'quarantined'
  if (!invoice.parent_invoice_id) return 'orphan'
  if (isLegacyAdvanceChildRow(invoice)) return 'active'
  return 'active'
}

export function getLegacyAdvanceChildRowLabel(invoice: AdvanceLegacyChildRow & { parent_invoice_id?: string | null }): string {
  const number = invoice.invoice_number || 'Unknown'
  const status = getLegacyAdvanceStatus(invoice)
  switch (status) {
    case 'orphan':
      return `${number} (orphan)`
    case 'quarantined':
      return `${number} (archived)`
    case 'archived':
      return `${number} (archived)`
    default:
      return number
  }
}

export type BackfillResult = {
  enabled: boolean
  amount: number
  mode: 'fixed' | 'percentage'
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
}

export function buildCanonicalMetadataFromLegacyChild(
  legacyChildRow: AdvanceLegacyChildRow & { total?: number | string | null },
  parentInvoiceNumber?: string | null,
  existingParentMetadata?: BackfillResult | null,
): BackfillResult | null {
  if (!isLegacyAdvanceChildRow(legacyChildRow)) {
    return null
  }

  const config = getAdvanceConfigFromCustomFields(legacyChildRow.custom_fields)
  if (!config) {
    return null
  }

  const toNumber = (val: unknown) => {
    const parsed = Number(val || 0)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const parentNumber = parentInvoiceNumber || ''
  const suffix = config.suffix || 'A'
  const documentNumber = parentNumber ? `${parentNumber}-${suffix}` : undefined

  const contractValue = toNumber(config.contractValue)
  const value = toNumber(config.value)
  const mode = config.mode === 'fixed' ? 'fixed' : 'percentage'

  let amount = toNumber(legacyChildRow.total)
  if (mode === 'percentage' && contractValue > 0) {
    amount = Math.round(contractValue * (value / 100)) / 100
  }

  if (existingParentMetadata) {
    return {
      ...existingParentMetadata,
      legacy_child_invoice_id: legacyChildRow.id,
      legacy_child_invoice_number: legacyChildRow.invoice_number || undefined,
      legacy_child_invoice_total: amount,
    }
  }

  return {
    enabled: true,
    amount,
    mode,
    value,
    document_number: documentNumber,
    primary_label: config.primaryLabel || 'Advance invoice due now',
    secondary_label: config.secondaryLabel || 'Balance upon completion',
    suffix,
    contract_value: contractValue,
    legacy_child_invoice_id: legacyChildRow.id,
    legacy_child_invoice_number: legacyChildRow.invoice_number || undefined,
    legacy_child_invoice_total: amount,
  }
}

export function shouldExcludeFromRuntime(invoice: AdvanceLegacyChildRow & { parent_invoice_id?: string | null; archived_at?: string }): boolean {
  const status = getLegacyAdvanceStatus(invoice)
  return status === 'quarantined' || status === 'orphan'
}

export function getActiveLegacyAdvanceChildren(
  invoices: Array<AdvanceLegacyChildRow & { parent_invoice_id?: string | null; archived_at?: string }>,
): Array<AdvanceLegacyChildRow & { parent_invoice_id?: string | null; archived_at?: string }> {
  return invoices.filter((inv) => {
    const status = getLegacyAdvanceStatus(inv)
    return status === 'active'
  })
}

export function getQuarantinedLegacyAdvanceChildren(
  invoices: Array<AdvanceLegacyChildRow & { parent_invoice_id?: string | null; archived_at?: string }>,
): Array<AdvanceLegacyChildRow & { parent_invoice_id?: string | null; archived_at?: string }> {
  return invoices.filter((inv) => {
    const status = getLegacyAdvanceStatus(inv)
    return status === 'quarantined' || status === 'orphan'
  })
}

export function countLegacyAdvanceByStatus(
  invoices: Array<AdvanceLegacyChildRow & { parent_invoice_id?: string | null; archived_at?: string }>,
): Record<QuarantineStatus, number> {
  return invoices.reduce(
    (acc, inv) => {
      const status = getLegacyAdvanceStatus(inv)
      acc[status]++
      return acc
    },
    { active: 0, archived: 0, quarantined: 0, orphan: 0 },
  )
}