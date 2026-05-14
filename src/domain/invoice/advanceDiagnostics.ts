/**
 * =============================================================================
 * ADVANCE DIAGNOSTIC UTILITIES
 * =============================================================================
 *
 * Read-only diagnostic functions for validating the advance metadata cutover.
 * These are pure analysis utilities — they do NOT mutate rows, delete data,
 * or modify the database. All are safe to run against production data.
 *
 * Use cases:
 *   - Migration verification
 *   - Pre-archival safety checks
 *   - Integrity audits
 * =============================================================================
 */

import {
  isLegacyAdvanceChildRow,
  getLegacyAdvanceStatus,
  countLegacyAdvanceByStatus,
  type AdvanceLegacyChildRow,
} from './advanceLegacyCleanup'
import {
  getAdvanceInvoiceMetadata,
  isAdvanceInvoiceParent,
  isMalformedAdvanceMetadata,
} from './advanceMetadata'

type DiagnosticInvoiceRow = {
  id: string
  invoice_number?: string | null
  custom_fields?: unknown
  parent_invoice_id?: string | null
  archived_at?: string | null
  total?: number | string | null
}

export type AdvanceDiagnosticSummary = {
  totalRows: number
  legacyChildren: number
  archivedOrQuarantined: number
  orphans: number
  activeLegacy: number
  parentsWithMetadata: number
  parentsMissingMetadata: number
  malformedMetadata: number
  safeForArchival: number
}

export type AdvanceDiagnosticWarning = {
  invoiceId: string
  invoiceNumber: string
  warning: string
  details?: string
}

/**
 * Full diagnostic scan of a set of invoice rows.
 * Returns summary counts and a list of warnings.
 */
export function runAdvanceDiagnostics(
  rows: DiagnosticInvoiceRow[],
): { summary: AdvanceDiagnosticSummary; warnings: AdvanceDiagnosticWarning[] } {
  const legacyRows = rows.filter((r) => isLegacyAdvanceChildRow(r))
  const statusCounts = countLegacyAdvanceByStatus(legacyRows as any[])
  const warnings: AdvanceDiagnosticWarning[] = []

  let parentsWithMetadata = 0
  let parentsMissingMetadata = 0
  let malformedMetadata = 0

  for (const row of rows) {
    if (isLegacyAdvanceChildRow(row)) continue

    const metadata = getAdvanceInvoiceMetadata(row)
    const hasAdvanceConfig = hasRawAdvanceConfig(row)

    if (metadata) {
      parentsWithMetadata++
    } else if (hasAdvanceConfig) {
      parentsMissingMetadata++
      warnings.push({
        invoiceId: row.id,
        invoiceNumber: row.invoice_number || '(unknown)',
        warning: 'Has advance_invoice config but no valid parent metadata',
        details: 'Config may be malformed or a bare role:advance child row misclassified as parent',
      })
    }

    if (hasAdvanceConfig) {
      const raw = extractRawAdvanceConfig(row)
      if (raw && isMalformedAdvanceMetadata(raw)) {
        malformedMetadata++
      }
    }
  }

  const safeForArchival =
    statusCounts.quarantined + statusCounts.orphan + statusCounts.archived

  return {
    summary: {
      totalRows: rows.length,
      legacyChildren:
        statusCounts.active + statusCounts.quarantined + statusCounts.orphan + statusCounts.archived,
      archivedOrQuarantined: statusCounts.quarantined + statusCounts.archived,
      orphans: statusCounts.orphan,
      activeLegacy: statusCounts.active,
      parentsWithMetadata,
      parentsMissingMetadata,
      malformedMetadata,
      safeForArchival,
    },
    warnings,
  }
}

/**
 * Detects parent invoices that reference an advance but have no
 * canonical metadata stored in custom_fields.advance_invoice.
 */
export function detectParentsMissingCanonicalMetadata(
  rows: DiagnosticInvoiceRow[],
): DiagnosticInvoiceRow[] {
  return rows.filter((row) => {
    if (isLegacyAdvanceChildRow(row)) return false
    return isAdvanceInvoiceParent(row) === false && hasRawAdvanceConfig(row)
  })
}

/**
 * Detects orphan advance child rows — legacy children with no parent link.
 */
export function detectOrphanAdvanceRows(
  rows: DiagnosticInvoiceRow[],
): Array<AdvanceLegacyChildRow & { parent_invoice_id?: string | null }> {
  return rows.filter((row) => {
    if (!isLegacyAdvanceChildRow(row)) return false
    return getLegacyAdvanceStatus(row as any) === 'orphan'
  }) as any[]
}

/**
 * Detects legacy advance children whose parent metadata is inconsistent
 * with the child row's own data (e.g., parent has no advance_invoice key,
 * or amounts don't match).
 */
export function detectInconsistentParentChildMetadata(
  rows: DiagnosticInvoiceRow[],
): AdvanceDiagnosticWarning[] {
  const warnings: AdvanceDiagnosticWarning[] = []

  const parentMap = new Map<string, DiagnosticInvoiceRow>()
  for (const row of rows) {
    if (!isLegacyAdvanceChildRow(row)) {
      parentMap.set(row.id, row)
    }
  }

  for (const row of rows) {
    if (!isLegacyAdvanceChildRow(row)) continue
    const parentId = row.parent_invoice_id
    if (!parentId) continue

    const parent = parentMap.get(parentId)
    if (!parent) {
      warnings.push({
        invoiceId: row.id,
        invoiceNumber: row.invoice_number || '(unknown)',
        warning: 'Legacy child references missing parent',
        details: `parent_invoice_id=${parentId}`,
      })
      continue
    }

    const parentMetadata = getAdvanceInvoiceMetadata(parent)
    if (!parentMetadata) {
      warnings.push({
        invoiceId: row.id,
        invoiceNumber: row.invoice_number || '(unknown)',
        warning: 'Parent has no advance metadata but linked legacy child exists',
        details: `Parent: ${parent.invoice_number || parentId}`,
      })
    }
  }

  return warnings
}

/**
 * Returns rows that are safe for future archival or permanent deletion.
 * These are quarantined rows (archived), orphan rows, and any legacy
 * children whose parent already has migrated metadata.
 */
export function identifyRowsSafeForArchival(
  rows: DiagnosticInvoiceRow[],
): Array<{ id: string; invoice_number: string | null | undefined; reason: string }> {
  const parentMap = new Map<string, DiagnosticInvoiceRow>()
  for (const row of rows) {
    if (!isLegacyAdvanceChildRow(row)) {
      parentMap.set(row.id, row)
    }
  }

  return rows
    .filter((row) => isLegacyAdvanceChildRow(row))
    .map((row) => {
      const status = getLegacyAdvanceStatus(row as any)

      if (status === 'quarantined' || status === 'archived') {
        return { id: row.id, invoice_number: row.invoice_number, reason: 'archived' }
      }
      if (status === 'orphan') {
        return { id: row.id, invoice_number: row.invoice_number, reason: 'orphan' }
      }

      const parentId = row.parent_invoice_id
      if (parentId) {
        const parent = parentMap.get(parentId)
        if (parent) {
          const parentMetadata = getAdvanceInvoiceMetadata(parent)
          if (parentMetadata) {
            return { id: row.id, invoice_number: row.invoice_number, reason: 'parent_has_metadata' }
          }
        }
      }

      return null
    })
    .filter((entry): entry is { id: string; invoice_number: string | null | undefined; reason: string } => entry !== null)
}

function hasRawAdvanceConfig(row: DiagnosticInvoiceRow): boolean {
  try {
    const cf = row.custom_fields
    if (!cf) return false
    const parsed = typeof cf === 'string' ? JSON.parse(cf) : cf
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'advance_invoice' in parsed
  } catch {
    return false
  }
}

function extractRawAdvanceConfig(row: DiagnosticInvoiceRow): Record<string, unknown> | null {
  try {
    const cf = row.custom_fields
    if (!cf) return null
    const parsed = typeof cf === 'string' ? JSON.parse(cf) : cf
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const config = (parsed as Record<string, unknown>).advance_invoice
    if (!config || typeof config !== 'object' || Array.isArray(config)) return null
    return config as Record<string, unknown>
  } catch {
    return null
  }
}
