/**
 * Accounting invariants (blueprint sections 8 and 26).
 * Pure validation. No persistence side effects.
 */
import type { Account, AccountingPeriod, JournalEntry, JournalLine } from './types'
import { isNegative, sum } from './money'

export interface PostingValidationIssue {
  code: string
  message: string
}

export class PostingError extends Error {
  issues: PostingValidationIssue[]

  constructor(issues: PostingValidationIssue[]) {
    super(`Posting rejected: ${issues.map((i) => i.code).join(', ')}`)
    this.name = 'PostingError'
    this.issues = issues
  }
}

/**
 * Invariant: every posted journal entry balances — total debits equal total credits.
 */
export function linesAreBalanced(lines: JournalLine[]): boolean {
  if (lines.length === 0) return false
  const debitTotal = sum(...lines.filter((l) => l.side === 'debit').map((l) => l.amount))
  const creditTotal = sum(...lines.filter((l) => l.side === 'credit').map((l) => l.amount))
  return debitTotal.eq(creditTotal)
}

function validateLines(lines: JournalLine[], accounts: Account[], issues: PostingValidationIssue[]): void {
  if (lines.length === 0) {
    issues.push({ code: 'no-lines', message: 'An entry must have at least one line' })
  }
  for (const line of lines) {
    if (isNegative(line.amount)) {
      issues.push({
        code: 'negative-amount',
        message: `Line ${line.accountCode} has a negative amount. Use the opposite side instead`,
      })
    }
    const account = accounts.find((a) => a.code === line.accountCode)
    if (!account) {
      issues.push({ code: 'unknown-account', message: `Account ${line.accountCode} does not exist` })
    } else if (!account.active) {
      issues.push({ code: 'inactive-account', message: `Account ${line.accountCode} is inactive` })
    }
  }
}

function validatePeriod(
  entry: JournalEntry,
  periods: AccountingPeriod[],
  issues: PostingValidationIssue[],
): void {
  const period = periods.find((p) => p.code === entry.periodCode)
  if (!period) {
    issues.push({ code: 'unknown-period', message: `Period ${entry.periodCode} does not exist` })
    return
  }
  if (period.state !== 'open') {
    issues.push({
      code: 'period-not-open',
      message: `Period ${entry.periodCode} is ${period.state}; ordinary postings enter open periods only`,
    })
  }
  if (entry.transactionDate < period.startDate || entry.transactionDate > period.endDate) {
    issues.push({
      code: 'outside-period',
      message: `Transaction date ${entry.transactionDate} is outside period ${entry.periodCode} boundaries`,
    })
  }
}

/**
 * Validate a draft entry against the posting rules.
 * Returns the list of issues; an empty list means the entry may post.
 */
export function validatePosting(
  entry: JournalEntry,
  accounts: Account[],
  periods: AccountingPeriod[],
): PostingValidationIssue[] {
  const issues: PostingValidationIssue[] = []

  if (!entry.idempotencyKey || entry.idempotencyKey.trim().length === 0) {
    issues.push({ code: 'missing-idempotency-key', message: 'An idempotency key is required' })
  }
  if (!entry.sourceRef || !entry.sourceRef.sourceType || !entry.sourceRef.sourceId) {
    issues.push({ code: 'missing-source-ref', message: 'Every posting must reference its source transaction' })
  }
  if (!linesAreBalanced(entry.lines)) {
    issues.push({
      code: 'unbalanced',
      message: 'Total debits must equal total credits',
    })
  }
  validateLines(entry.lines, accounts, issues)
  validatePeriod(entry, periods, issues)
  return issues
}

/**
 * Throw a PostingError when the entry cannot post.
 */
export function assertPostable(
  entry: JournalEntry,
  accounts: Account[],
  periods: AccountingPeriod[],
): void {
  const issues = validatePosting(entry, accounts, periods)
  if (issues.length > 0) {
    throw new PostingError(issues)
  }
}

/**
 * A reversal must be equal and opposite to its original: same amounts, flipped sides.
 */
export function assertReversalMatches(original: JournalEntry, reversal: JournalEntry): void {
  if (original.lines.length !== reversal.lines.length) {
    throw new PostingError([
      { code: 'reversal-line-mismatch', message: 'Reversal must mirror the original line count' },
    ])
  }
  for (const originalLine of original.lines) {
    const reversalLine = reversal.lines.find(
      (l) => l.accountCode === originalLine.accountCode && l.side !== originalLine.side,
    )
    if (!reversalLine) {
      throw new PostingError([
        {
          code: 'reversal-not-opposite',
          message: `Reversal must flip the side of ${originalLine.accountCode}`,
        },
      ])
    }
  }
  if (!linesAreBalanced(reversal.lines)) {
    throw new PostingError([{ code: 'unbalanced', message: 'Total debits must equal total credits' }])
  }
}