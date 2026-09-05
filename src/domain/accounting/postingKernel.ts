/**
 * Posting kernel (blueprint section 8).
 * The single entry point for creating accounting postings. Application
 * modules do not write journal lines directly.
 *
 * Pure domain logic. Persistence, idempotency uniqueness, and RLS are
 * implementation-boundary concerns enforced by storage.
 */
import type { Account, AccountingPeriod, JournalEntry } from './types'
import { assertPostable, assertReversalMatches } from './invariants'
import { createJournalEntry, credit, debit } from './factories'
import { isZero } from './money'

export interface PostInput {
  entry: JournalEntry
  accounts: Account[]
  periods: AccountingPeriod[]
}

/**
 * Post a draft entry. Returns a new posted entry; the input is not mutated.
 * Invariant: every posted journal entry balances.
 * Invariant: posted entries are immutable — there is no update path here.
 */
export function postEntry(input: PostInput): JournalEntry {
  const { entry, accounts, periods } = input
  assertPostable(entry, accounts, periods)
  return {
    ...entry,
    status: 'posted',
    postedAt: entry.postedAt ?? new Date().toISOString(),
  }
}

export interface ReverseInput {
  entry: JournalEntry
  /** The period the reversal will post into (reversal posts to an open period). */
  reversalPeriodCode: string
  accounts: Account[]
  periods: AccountingPeriod[]
  reversalIdempotencyKey: string
  memo?: string | null
}

export interface ReverseResult {
  /** Draft reversal entry. Post it through postEntry to complete the reversal. */
  reversal: JournalEntry
  /** The original entry with reversal linkage set. Immutable semantics: a new object. */
  updatedOriginal: JournalEntry
}

/**
 * Create an equal-and-opposite reversal of a posted entry and link it to
 * the original (blueprint section 16). Corrections preserve history.
 */
export function reverseEntry(input: ReverseInput): ReverseResult {
  const { entry, reversalPeriodCode, accounts, periods, reversalIdempotencyKey, memo } = input

  if (entry.reversedByEntryId) {
    throw new Error('Entry is already reversed')
  }
  if (entry.status !== 'posted') {
    throw new Error('Only posted entries can be reversed')
  }

  const reversalLines = entry.lines.map((line) =>
    line.side === 'debit'
      ? credit(line.accountCode, line.amount, line.memo)
      : debit(line.accountCode, line.amount, line.memo),
  )

  const reversal = createJournalEntry({
    idempotencyKey: reversalIdempotencyKey,
    periodCode: reversalPeriodCode,
    transactionDate: entry.transactionDate,
    sourceRef: { sourceType: 'correction', sourceId: entry.id ?? entry.idempotencyKey },
    lines: reversalLines,
    memo: memo ?? `Reversal of ${entry.idempotencyKey}`,
    entityRef: entry.entityRef ?? null,
  })
  reversal.reversalOfEntryId = entry.id ?? entry.idempotencyKey
  assertReversalMatches(entry, reversal)

  // The reversal must itself be postable (balanced, open period, valid accounts).
  assertPostable(reversal, accounts, periods)

  const reversalId = reversal.id ?? reversal.idempotencyKey

  return {
    reversal,
    updatedOriginal: {
      ...entry,
      status: 'reversed',
      reversedByEntryId: reversalId,
    },
  }
}

/**
 * Idempotency-key normalization. Storage enforces uniqueness; the domain
 * defines the canonical shape so the same source event yields the same key.
 */
export function normalizeIdempotencyKey(sourceType: string, sourceId: string, purpose: string): string {
  return `${sourceType}:${sourceId}:${purpose}`
}

/**
 * True when an entry has no net effect on a balance after reversal handling.
 * Used by reporting to exclude reversed effects (blueprint section 11).
 */
export function isReversed(entry: JournalEntry): boolean {
  return entry.status === 'reversed'
}

export { isZero }