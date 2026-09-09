/**
 * Gap 1 — Journal-Derived Reporting Foundation types.
 *
 * Read-only derivation of accounting facts from the posted journal.
 * The derivation never mutates accounting data and never repairs a
 * mismatch. A mismatch is surfaced as data (spec section 9.5).
 *
 * All monetary amounts cross the boundary as exact decimal strings
 * (Gate B: Decimal.js scale rules; storage scale NUMERIC(18,2)).
 * JavaScript numbers are never used for money in this module.
 */

import type { AccountType, NormalBalance, PeriodState } from './types'

/**
 * One account's derived balance over all active posted lines of the
 * book (spec 9.3). Inactive accounts still report.
 */
export interface DerivedAccountBalance {
  account_id: string
  code: string
  name: string
  type: AccountType
  normal_balance: NormalBalance
  active: boolean
  /** Exact-text SUM(amount) where side = debit. */
  debit_total: string
  /** Exact-text SUM(amount) where side = credit. */
  credit_total: string
  /** Exact-text debit_total - credit_total. */
  net: string
}

/**
 * One account's derived totals inside one accounting period, with the
 * bounded opening and closing chain (spec 9.4).
 */
export interface DerivedPeriodTotal {
  period_id: string
  period_code: string
  period_state: PeriodState
  start_date: string
  account_id: string
  account_code: string
  account_name: string
  /** Exact-text debit total of active posted lines of this period. */
  debit_total: string
  /** Exact-text credit total of active posted lines of this period. */
  credit_total: string
  /** Exact-text period net: debit_total - credit_total. */
  net: string
  /**
   * Exact-text cumulative net over strictly earlier periods in
   * (start_date, code) order. Zero for the first period.
   */
  opening_net: string
  /** Exact-text opening_net + net. */
  closing_net: string
}

/**
 * One trial-balance row: the account's derived totals over the whole
 * active posted set in scope. A single row's debit and credit totals
 * are independent sums; debit_total ≠ credit_total on a row is normal
 * accounting state, never an error.
 */
export interface TrialBalanceRow {
  account_id: string
  code: string
  name: string
  type: AccountType
  normal_balance: NormalBalance
  active: boolean
  debit_total: string
  credit_total: string
  net: string
}

/**
 * Trial-balance assertion (spec 9.5). Grand debits must equal grand
 * credits. A mismatch is reported loudly as data and never repaired;
 * repair belongs to reconciliation and remediation.
 */
export interface TrialBalanceAssertion {
  rows: TrialBalanceRow[]
  /** Exact-text grand total across all rows. */
  grand_debits: string
  /** Exact-text grand total across all rows. */
  grand_credits: string
  /** NUMERIC equality asserted in Postgres, never in floating point. */
  is_equal: boolean
}

/**
 * Journal provenance for every derived figure (spec 11): balance →
 * account → journal lines → entries → period + source. One row per
 * active posted entry in scope.
 */
export interface ReportingSourceTraceRow {
  entry_id: string
  period_id: string
  period_code: string
  start_date: string
  transaction_date: string
  source_type: string
  source_id: string
  reversal_of_entry_id: string | null
}

/**
 * Draft-residue discrepancy check (spec 9.6). Draft entries contribute
 * nothing to any derived figure. The count is surfaced, never repaired.
 */
export interface DraftResidueCheck {
  count: number
  contributes: false
  note: string
}

/**
 * Scope metadata describing the exact selection rules the derivation
 * applied. Fixed values pin the canonical v1.1 rules at runtime.
 */
export interface ReportingScope {
  posted_only: true
  active_entries_only: true
  reversal_rule: string
  period_ordering: string
  entry_count: number
  first_period_code: string | null
  last_period_code: string | null
}

/**
 * The full derivation report returned by the read-only RPC
 * derive_accounting_reporting (one call per entity book).
 */
export interface AccountingReportingReport {
  entity_id: string
  generated_at: string
  /** Present only when the derivation was bounded to one period. */
  period_bound: string | null
  scope: ReportingScope
  balances: DerivedAccountBalance[]
  periods: DerivedPeriodTotal[]
  trial_balance: TrialBalanceAssertion
  source_trace: ReportingSourceTraceRow[]
  draft_residue: DraftResidueCheck
}
