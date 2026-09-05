/**
 * Factories for accounting primitives.
 */
import type { Account, AccountingPeriod, JournalEntry, JournalLine, SourceTransactionRef } from './types'

export interface CreateAccountInput {
  code: string
  name: string
  type: Account['type']
  normalBalance: Account['normalBalance']
  parentCode?: string | null
  entityRef?: string | null
}

export function createAccount(input: CreateAccountInput): Account {
  return {
    code: input.code,
    name: input.name,
    type: input.type,
    normalBalance: input.normalBalance,
    active: true,
    parentCode: input.parentCode ?? null,
    entityRef: input.entityRef ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export interface CreatePeriodInput {
  code: string
  startDate: string
  endDate: string
  entityRef?: string | null
}

/**
 * A period is created in the planned state (blueprint section 10).
 */
export function createPeriod(input: CreatePeriodInput): AccountingPeriod {
  if (input.endDate < input.startDate) {
    throw new Error(`Period ${input.code} ends before it starts`)
  }
  return {
    code: input.code,
    state: 'planned',
    startDate: input.startDate,
    endDate: input.endDate,
    entityRef: input.entityRef ?? null,
  }
}

export interface CreateJournalEntryInput {
  idempotencyKey: string
  periodCode: string
  transactionDate: string
  sourceRef: SourceTransactionRef
  lines: JournalLine[]
  memo?: string | null
  entityRef?: string | null
}

/**
 * Create a draft entry. It is not posted until it passes the posting kernel.
 */
export function createJournalEntry(input: CreateJournalEntryInput): JournalEntry {
  return {
    idempotencyKey: input.idempotencyKey,
    periodCode: input.periodCode,
    transactionDate: input.transactionDate,
    postingDate: input.transactionDate,
    sourceRef: input.sourceRef,
    lines: input.lines,
    status: 'draft',
    reversalOfEntryId: null,
    reversedByEntryId: null,
    memo: input.memo ?? null,
    entityRef: input.entityRef ?? null,
    createdAt: new Date().toISOString(),
    postedAt: null,
  }
}

export function debit(accountCode: string, amount: string, memo?: string | null): JournalLine {
  return { accountCode, side: 'debit', amount, memo: memo ?? null }
}

export function credit(accountCode: string, amount: string, memo?: string | null): JournalLine {
  return { accountCode, side: 'credit', amount, memo: memo ?? null }
}