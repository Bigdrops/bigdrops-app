/**
 * Gate G: Tax Computation → Journal Entry Bridge.
 *
 * Pure function that converts a finalized tax computation result
 * into a balanced draft journal entry for the accounting ledger.
 *
 * Journal entry structure:
 *   Dr  Tax Expense (5500)        — total tax burden for the period
 *   Cr  CIT Payable (2310)        — corporate income tax liability
 *   Cr  Dev Levy Payable (2320)   — development levy liability (if applicable)
 *
 * The entry is DRAFT. Caller posts through the posting kernel.
 * No database access. All inputs explicit.
 */
import type { Account, AccountingPeriod, JournalEntry } from '../accounting/types'
import { createJournalEntry, debit, credit } from '../accounting/factories'
import { toDecimal } from '../accounting/money'
import type { GateEComputationResult } from './types'

/** Account codes for the tax bridge. */
export const TAX_ACCOUNTS = {
  /** Tax expense — debit normal (expense account) */
  TAX_EXPENSE: '5500',
  /** CIT payable — credit normal (liability account) */
  CIT_PAYABLE: '2310',
  /** Development levy payable — credit normal (liability account) */
  DEV_LEVY_PAYABLE: '2320',
} as const

export interface TaxPostingInput {
  /** Finalized computation result from Gate E/F. */
  result: GateEComputationResult
  /** Development levy amount from the computation input snapshot. */
  development_levy: string
  /** Chart of accounts — must include tax accounts. */
  accounts: Account[]
  /** Accounting periods — bridge picks the open period. */
  periods: AccountingPeriod[]
}

/**
 * Convert a tax computation result into a balanced draft journal entry.
 *
 * Same inputs always produce the same entry (deterministic).
 * The entry is not posted — caller routes through the posting kernel.
 */
export function createTaxJournalEntry(input: TaxPostingInput): JournalEntry {
  const { result, development_levy, accounts, periods } = input

  const taxPayable = toDecimal(result.tax_payable)
  const devLevy = toDecimal(development_levy)
  const totalExpense = taxPayable.plus(devLevy)

  if (totalExpense.isZero()) {
    throw new Error('Gate G: total tax expense is zero — nothing to post')
  }

  // Validate required accounts exist
  const taxExpenseAcct = accounts.find((a) => a.code === TAX_ACCOUNTS.TAX_EXPENSE)
  if (!taxExpenseAcct) {
    throw new Error(`Gate G: account ${TAX_ACCOUNTS.TAX_EXPENSE} (Tax Expense) not found in chart`)
  }
  if (!taxExpenseAcct.active) {
    throw new Error(`Gate G: account ${TAX_ACCOUNTS.TAX_EXPENSE} (Tax Expense) is inactive`)
  }

  const citPayableAcct = accounts.find((a) => a.code === TAX_ACCOUNTS.CIT_PAYABLE)
  if (!citPayableAcct) {
    throw new Error(`Gate G: account ${TAX_ACCOUNTS.CIT_PAYABLE} (CIT Payable) not found in chart`)
  }
  if (!citPayableAcct.active) {
    throw new Error(`Gate G: account ${TAX_ACCOUNTS.CIT_PAYABLE} (CIT Payable) is inactive`)
  }

  // Find an open period
  const openPeriod = periods.find((p) => p.state === 'open')
  if (!openPeriod) {
    throw new Error('Gate G: no open accounting period found')
  }

  // Build journal lines
  const lines = [
    debit(TAX_ACCOUNTS.TAX_EXPENSE, totalExpense.toFixed(2), 'CIT expense for period'),
    credit(TAX_ACCOUNTS.CIT_PAYABLE, taxPayable.toFixed(2), 'CIT payable'),
  ]

  // Add development levy line if non-zero
  // ponytail: Decimal.js isPositive() includes zero — use greaterThan
  if (devLevy.greaterThan(0)) {
    const devLevyAcct = accounts.find((a) => a.code === TAX_ACCOUNTS.DEV_LEVY_PAYABLE)
    if (!devLevyAcct) {
      throw new Error(`Gate G: account ${TAX_ACCOUNTS.DEV_LEVY_PAYABLE} (Dev Levy Payable) not found in chart`)
    }
    if (!devLevyAcct.active) {
      throw new Error(`Gate G: account ${TAX_ACCOUNTS.DEV_LEVY_PAYABLE} (Dev Levy Payable) is inactive`)
    }
    lines.push(credit(TAX_ACCOUNTS.DEV_LEVY_PAYABLE, devLevy.toFixed(2), 'Development levy payable'))
  }

  return createJournalEntry({
    idempotencyKey: `tax-computation:${result.assessment_profit}:${openPeriod.code}`,
    periodCode: openPeriod.code,
    transactionDate: openPeriod.endDate,
    sourceRef: {
      sourceType: 'tax_computation',
      sourceId: `assessment=${result.assessment_profit}`,
    },
    lines,
    memo: `CIT computation — assessable profit ${result.assessment_profit}`,
    entityRef: null,
  })
}
