/**
 * Accounting domain contracts (Accounting-foundation-blueprint-v1.md).
 * Schema-free. The persistence boundary is not decided here.
 */

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

export type NormalBalance = 'debit' | 'credit'

export type PeriodState = 'planned' | 'open' | 'closed' | 'locked'

export type PostingSide = 'debit' | 'credit'

export type JournalEntryStatus = 'draft' | 'posted' | 'reversed'

/**
 * Chart of accounts entry (blueprint section 7).
 */
export interface Account {
  code: string
  name: string
  type: AccountType
  normalBalance: NormalBalance
  active: boolean
  parentCode?: string | null
  /** Opaque accounting-book reference. The entity/settings boundary is an open gate. */
  entityRef?: string | null
  createdAt?: string
  updatedAt?: string
}

/**
 * Accounting period (blueprint section 10).
 */
export interface AccountingPeriod {
  code: string
  state: PeriodState
  /** Inclusive ISO date boundaries. */
  startDate: string
  endDate: string
  entityRef?: string | null
}

/**
 * Provenance link to the business fact that produced the posting (blueprint section 6).
 */
export interface SourceTransactionRef {
  sourceType: string
  sourceId: string
}

/**
 * One debit or credit line. Amounts are exact decimal strings (kobo, 2 decimal places).
 */
export interface JournalLine {
  accountCode: string
  side: PostingSide
  amount: string
  memo?: string | null
}

/**
 * One posting unit: header plus lines (blueprint section 8).
 * Posted entries are immutable. Corrections use reversal plus linked correcting entries.
 */
export interface JournalEntry {
  id?: string
  /** Required for post. Prevents duplicate posting of the same source event. */
  idempotencyKey: string
  periodCode: string
  /** When the business event happened. */
  transactionDate: string
  /** When the entry is posted. Defaults to transactionDate unless set. */
  postingDate: string
  sourceRef: SourceTransactionRef
  lines: JournalLine[]
  status: JournalEntryStatus
  reversalOfEntryId?: string | null
  reversedByEntryId?: string | null
  memo?: string | null
  entityRef?: string | null
  createdAt?: string
  postedAt?: string | null
}