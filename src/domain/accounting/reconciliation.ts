/**
 * Increment 5 — Reconciliation & Integrity types.
 *
 * Reconciliation is detection-only. It observes integrity between
 * operational facts, source transactions, and journal entries.
 * A finding never mutates accounting state; repair is deferred to
 * a controlled future increment.
 */

/** Explicit finding types. Never free-form strings. */
export const RECONCILIATION_FINDING_TYPES = [
  'MISSING_SOURCE_TRANSACTION',
  'SOURCE_TRANSACTION_CAPTURED',
  'SOURCE_TRANSACTION_CONFIRMED',
  'ORPHANED_SOURCE_TRANSACTION',
  'MISSING_JOURNAL',
  'JOURNAL_MISMATCH',
  'DUPLICATE_ACCOUNTING_FACT',
] as const

export type ReconciliationFindingType = (typeof RECONCILIATION_FINDING_TYPES)[number]

export type ReconciliationSeverity = 'warning' | 'error'

export type ReconciliationCategory = 'invoice' | 'payment' | 'journal'

/**
 * A single provable integrity finding. Identifiers are deterministic:
 * `finding_id` doubles as the deduplication identity for unchanged data.
 */
export interface ReconciliationFinding {
  finding_id: string
  entity_id: string
  category: ReconciliationCategory
  source_type: string
  source_id: string
  source_transaction_id: string | null
  journal_entry_id: string | null
  finding_type: ReconciliationFindingType
  severity: ReconciliationSeverity
  explanation: string
  transaction_date: string | null
  amount: string | null
  actionable: boolean
}

/** Entity-scoped reconciliation report returned by the read-only RPC. */
export interface ReconciliationReport {
  entity_id: string
  generated_at: string
  finding_count: number
  findings: ReconciliationFinding[]
}

export function isReconciliationFindingType(value: unknown): value is ReconciliationFindingType {
  return (
    typeof value === 'string' &&
    (RECONCILIATION_FINDING_TYPES as readonly string[]).includes(value)
  )
}
