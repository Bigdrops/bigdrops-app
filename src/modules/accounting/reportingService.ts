import { supabase } from '@/supabase'
import type { AccountingReportingReport } from '@/domain/accounting/reporting'

/**
 * Gap 1 — Journal-Derived Reporting Foundation service.
 *
 * Thin read-only wrapper over the derivation RPC. It runs the
 * derivation inside the current entity boundary and returns structured
 * derived facts: account balances, period totals with bounded opening
 * and closing chains, and the trial balance with its equality
 * assertion. It never posts, never writes journal rows, never mutates
 * any table, and never repairs a mismatch.
 *
 * Pattern: src/modules/accounting/reconciliationService.ts
 * (Increment 5 read-only RPC wrapper).
 *
 * Amounts are exact decimal strings end to end. No JavaScript number
 * arithmetic touches money anywhere in this module.
 */
export async function deriveAccountingReporting(
  entityId: string,
  periodId: string | null = null,
): Promise<AccountingReportingReport> {
  if (!entityId) fail('Entity id is required to derive accounting reporting.')

  const { data, error } = await supabase.rpc('derive_accounting_reporting', {
    p_entity_id: entityId,
    p_period_id: periodId,
  })
  if (error) fail(`derive_accounting_reporting failed: ${error.message}`)

  const report = data as AccountingReportingReport | null
  if (!report || typeof report !== 'object') {
    fail('derive_accounting_reporting returned no report.')
  }
  if (!report.scope || typeof report.scope.posted_only !== 'boolean') {
    fail('derive_accounting_reporting returned an invalid scope block.')
  }
  if (!Array.isArray(report.balances)) {
    fail('derive_accounting_reporting returned no balances.')
  }
  if (!Array.isArray(report.periods)) {
    fail('derive_accounting_reporting returned no period totals.')
  }
  if (!report.trial_balance || !Array.isArray(report.trial_balance.rows)) {
    fail('derive_accounting_reporting returned no trial balance.')
  }
  if (!Array.isArray(report.source_trace)) {
    fail('derive_accounting_reporting returned no source trace.')
  }
  if (!report.draft_residue || typeof report.draft_residue.count !== 'number') {
    fail('derive_accounting_reporting returned no draft residue check.')
  }

  // Defense in depth: the report carries the canonical v1.1 rules. A
  // payload produced under different selection rules is rejected
  // rather than silently consumed.
  if (report.scope.posted_only !== true || report.scope.active_entries_only !== true) {
    fail('derive_accounting_reporting scope does not pin the canonical rules.')
  }

  return report
}

function fail(message: string): never {
  throw new Error(message)
}
