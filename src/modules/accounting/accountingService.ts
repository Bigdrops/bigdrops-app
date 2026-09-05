import Decimal from 'decimal.js'
import { supabase } from '@/supabase'
import type { TenantClient } from '@/lib/tenantClient'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export interface AccountingAccount {
  id: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  normal_balance: 'debit' | 'credit'
  parent_code: string | null
  active: boolean
}

export interface AccountingPeriod {
  id: string
  code: string
  state: 'planned' | 'open' | 'closed' | 'locked'
  start_date: string
  end_date: string
}

export interface JournalEntryRow {
  id: string
  period_id: string
  transaction_date: string
  posting_date: string
  source_type: string
  source_id: string
  idempotency_key: string
  status: 'draft' | 'posted'
  reversal_of_entry_id: string | null
  memo: string | null
  created_at: string
}

export interface JournalLineRow {
  id: string
  entry_id: string
  account_id: string
  side: 'debit' | 'credit'
  amount: string
  line_no: number
  memo: string | null
}

export interface PostingLineInput {
  accountCode: string
  side: 'debit' | 'credit'
  amount: string
  memo?: string | null
}

export interface PostingEntryInput {
  periodCode: string
  transactionDate: string
  sourceType: string
  sourceId: string
  idempotencyKey: string
  memo?: string | null
  reversalOfEntryId?: string | null
}

export interface PostingResult {
  id: string
  status: string
  total_debits: string
  total_credits: string
  line_count: number
}

const KOBO_PATTERN = /^\d+(\.\d{1,2})?$/

function fail(message: string): never {
  throw new Error(message)
}

/** Client-side pre-validation with exact decimal arithmetic. The database re-enforces every rule. */
export function validatePostingLines(lines: PostingLineInput[]): { debits: string; credits: string } {
  if (lines.length === 0) fail('Add at least one journal line.')
  let debits = new Decimal(0)
  let credits = new Decimal(0)
  let debitCount = 0
  let creditCount = 0
  lines.forEach((line, index) => {
    if (!line.accountCode) fail(`Line ${index + 1}: select an account.`)
    if (line.side !== 'debit' && line.side !== 'credit') fail(`Line ${index + 1}: side must be debit or credit.`)
    const raw = (line.amount ?? '').trim()
    if (!KOBO_PATTERN.test(raw)) fail(`Line ${index + 1}: enter a non-negative amount with at most 2 decimals.`)
    const amount = new Decimal(raw)
    if (line.side === 'debit') {
      debits = debits.plus(amount)
      debitCount += 1
    } else {
      credits = credits.plus(amount)
      creditCount += 1
    }
  })
  if (debitCount < 1 || creditCount < 1) fail('A posted entry needs at least one debit and one credit line.')
  if (!debits.eq(credits)) fail(`Unbalanced entry: debits ${debits.toFixed(2)} do not equal credits ${credits.toFixed(2)}.`)
  return { debits: debits.toFixed(2), credits: credits.toFixed(2) }
}

async function throwIfError(error: { message: string } | null, fallback: string) {
  if (error) fail(error.message || fallback)
}

export async function listAccounts(tenantClient: TenantClient): Promise<AccountingAccount[]> {
  const { data, error } = await tenantClient
    .from('accounting_accounts')
    .select('id, code, name, type, normal_balance, parent_code, active')
    .order('code')
  await throwIfError(error as { message: string } | null, 'Could not load accounts.')
  return (data ?? []) as AccountingAccount[]
}

export async function listPeriods(tenantClient: TenantClient): Promise<AccountingPeriod[]> {
  const { data, error } = await tenantClient
    .from('accounting_periods')
    .select('id, code, state, start_date, end_date')
    .order('start_date', { ascending: false })
  await throwIfError(error as { message: string } | null, 'Could not load accounting periods.')
  return (data ?? []) as AccountingPeriod[]
}

export async function createPeriod(
  tenantClient: TenantClient,
  input: { code: string; startDate: string; endDate: string },
): Promise<void> {
  const code = input.code.trim()
  if (!code) fail('Enter a period code.')
  if (!input.startDate || !input.endDate) fail('Enter start and end dates.')
  if (input.endDate < input.startDate) fail('The period ends before it starts.')
  const { error } = await tenantClient.from('accounting_periods').insert({
    code,
    start_date: input.startDate,
    end_date: input.endDate,
  })
  await throwIfError(error as { message: string } | null, 'Could not create the period.')
}

/** Planned -> open is the only supported opening transition. RLS + trigger enforce it. */
export async function openPeriod(tenantClient: TenantClient, periodId: string): Promise<void> {
  const { error } = await tenantClient.from('accounting_periods').update({ state: 'open' }).eq('id', periodId)
  await throwIfError(error as { message: string } | null, 'Could not open the period.')
}

export async function listEntries(tenantClient: TenantClient): Promise<JournalEntryRow[]> {
  const { data, error } = await tenantClient
    .from('journal_entries')
    .select('id, period_id, transaction_date, posting_date, source_type, source_id, idempotency_key, status, reversal_of_entry_id, memo, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  await throwIfError(error as { message: string } | null, 'Could not load journal entries.')
  return (data ?? []) as JournalEntryRow[]
}

export async function listEntryLines(tenantClient: TenantClient, entryId: string): Promise<JournalLineRow[]> {
  const { data, error } = await tenantClient
    .from('journal_lines')
    .select('id, entry_id, account_id, side, amount, line_no, memo')
    .eq('entry_id', entryId)
    .order('line_no')
  await throwIfError(error as { message: string } | null, 'Could not load journal lines.')
  return (data ?? []) as JournalLineRow[]
}

/**
 * Post through the authenticated root-client RPC (public.post_accounting_entry).
 * Same call pattern as record_payment_transaction consumers: the RPC resolves
 * the tenant schema from p_entity_id and enforces journal/create + balance.
 */
export async function postJournalEntry(
  entityId: string,
  entry: PostingEntryInput,
  lines: PostingLineInput[],
): Promise<PostingResult> {
  validatePostingLines(lines)
  if (!entry.periodCode.trim()) fail('Select an open period.')
  if (!entry.transactionDate) fail('Enter a transaction date.')
  if (!entry.sourceType.trim() || !entry.sourceId.trim()) fail('Enter source reference details.')
  if (!entry.idempotencyKey.trim()) fail('Missing idempotency key.')

  const { data, error } = await supabase.rpc('post_accounting_entry', {
    p_entity_id: entityId,
    p_entry: {
      period_code: entry.periodCode.trim(),
      transaction_date: entry.transactionDate,
      source_type: entry.sourceType.trim(),
      source_id: entry.sourceId.trim(),
      idempotency_key: entry.idempotencyKey.trim(),
      memo: entry.memo?.trim() || null,
      reversal_of_entry_id: entry.reversalOfEntryId ?? null,
    },
    p_lines: lines.map((line) => ({
      account_code: line.accountCode,
      side: line.side,
      amount: line.amount.trim(),
      memo: line.memo?.trim() || null,
    })),
  })
  if (error) fail(error.message)
  return data as PostingResult
}

export function buildIdempotencyKey(sourceType: string, sourceId: string, purpose: string): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : String(Date.now())
  return `${sourceType}:${sourceId}:${purpose}:${rand}`
}
