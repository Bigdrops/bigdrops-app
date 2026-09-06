import { supabase } from '@/supabase'
import type { ReconciliationFinding, ReconciliationReport } from '@/domain/accounting/reconciliation'

/**
 * Increment 5 — Reconciliation & Integrity service.
 *
 * Thin read-only wrapper over the reconciliation RPC. It runs the
 * integrity checks inside the current entity boundary and returns
 * structured findings. It never posts, never creates source
 * transactions, and never writes journal rows.
 */
export async function runReconciliation(entityId: string): Promise<ReconciliationReport> {
  if (!entityId) fail('Entity id is required to run reconciliation.')

  const { data, error } = await supabase.rpc('reconcile_accounting_integrity', {
    p_entity_id: entityId,
  })
  if (error) fail(`reconcile_accounting_integrity failed: ${error.message}`)

  const report = data as ReconciliationReport | null
  if (!report || !Array.isArray(report.findings)) {
    fail('reconcile_accounting_integrity returned no report.')
  }

  // Defense in depth: every finding carries an explicit whitelisted
  // type. Unknown types are dropped rather than surfaced.
  const knownTypes = new Set([
    'MISSING_SOURCE_TRANSACTION',
    'SOURCE_TRANSACTION_CAPTURED',
    'SOURCE_TRANSACTION_CONFIRMED',
    'ORPHANED_SOURCE_TRANSACTION',
    'MISSING_JOURNAL',
    'JOURNAL_MISMATCH',
    'DUPLICATE_ACCOUNTING_FACT',
  ])
  report.findings = report.findings.filter((finding) =>
    knownTypes.has(finding?.finding_type),
  ) as ReconciliationFinding[]

  return report
}

function fail(message: string): never {
  throw new Error(message)
}
