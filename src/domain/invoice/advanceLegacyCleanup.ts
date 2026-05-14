/**
 * =============================================================================
 * HISTORICAL / DIAGNOSTIC ACCESS BOUNDARY
 * =============================================================================
 *
 * This file is the sole gateway for interacting with legacy advance child rows.
 * All functions here deal with the OLD model where advances were separate DB
 * rows with `role: 'advance'` in custom_fields.
 *
 * ACTIVE RUNTIME (src/domain/invoice/advanceMetadata.ts):
 *   Parent `custom_fields.advance_invoice` is the canonical source of truth.
 *   No function in this file is used to hydrate or derive active advance state.
 *
 * HISTORICAL / DIAGNOSTIC (this file):
 *   Classification, counting, backfill, and migration utilities for legacy
 *   child rows. Used by:
 *     - UI filters (exclude legacy rows from invoice lists)
 *     - Diagnostics / migration verification
 *     - Backfill tooling
 *
 * WARNING: Do not reintroduce child-row authority into the active runtime.
 * Legacy child rows are historical artifacts only.
 * =============================================================================
 */

import { safeParseJson } from '../../lib/json/safeParseJson'
import { isAdvanceInvoiceParent } from './advanceMetadata'

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

/**
 * =============================================================================
 * EXPLICIT HISTORICAL ACCESS BOUNDARY
 * =============================================================================
 *
 * These helpers deterministically separate active runtime invoices from
 * historical legacy artifacts. Use them to prevent accidental reintroduction
 * of child-row authority into the active runtime.
 */

/**
 * Returns true when an invoice row carries canonical parent-side advance
 * metadata and should be treated as the active runtime source of truth.
 * Legacy child rows and rows without advance metadata return false.
 */
export function isActiveRuntimeAdvanceMetadata(
  invoice: { custom_fields?: unknown } | null | undefined,
): boolean {
  if (!invoice) return false
  return isAdvanceInvoiceParent(invoice) && !isLegacyAdvanceChildRow(invoice)
}

/**
 * Returns true when an invoice row is a legacy advance child row that exists
 * solely as a historical artifact. These rows must never drive runtime behavior,
 * UI display, or metadata derivation in the active code path.
 */
export function isHistoricalAdvanceArtifact(
  invoice: { custom_fields?: unknown } | null | undefined,
): boolean {
  return isLegacyAdvanceChildRow(invoice)
}

export function shouldExcludeFromRuntime(invoice: AdvanceLegacyChildRow & { parent_invoice_id?: string | null; archived_at?: string }): boolean {
  const status = getLegacyAdvanceStatus(invoice)
  return status === 'quarantined' || status === 'orphan'
}

/**
 * Returns true for ANY legacy advance child row.
 *
 * Used by the UI filter in useInvoiceDetailData.js to EXCLUDE legacy child rows
 * from the advance invoices list. All legacy child rows are historical artifacts
 * and should never appear in the active UI.
 */
export function isLegacyAdvanceChildRowForRuntime(invoice: { custom_fields?: unknown } | null | undefined): boolean {
  return isLegacyAdvanceChildRow(invoice) ?? false
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