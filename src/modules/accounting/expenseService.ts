/**
 * Expense / Money-Out service layer.
 *
 * Accounting flow per blueprint:
 *   Expense draft
 *   → ingest_source_transaction (captured)
 *   → confirm_source_transaction (confirmed)
 *   → post_from_source_transaction (posted, via posting kernel)
 *
 * Void uses the authoritative reversal boundary:
 *   reverse_accounting_entry (creates equal-and-opposite entry)
 *
 * All operations go through the tenant-scoped Supabase client.
 * No parallel ledger, no tax engine, no fixed assets.
 */
import Decimal from 'decimal.js'
import { supabase } from '@/supabase'
import type { TenantClient } from '@/lib/tenantClient'
import type {
  ExpenseEntry,
  ExpenseCategory,
  CreateExpenseInput,
  PostExpenseInput,
  VoidExpenseInput,
} from '@/domain/accounting/expenseTypes'
import { CATEGORY_JOURNAL_EFFECT } from '@/domain/accounting/expenseTypes'
import { reverseAccountingEntry } from './reversalService'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

// ─── Helpers ───────────────────────────────────────────────────

function fail(message: string): never {
  throw new Error(message)
}

const KOBO_PATTERN = /^\d+(\.\d{1,2})?$/

function validateAmount(amount: string): void {
  const trimmed = amount.trim()
  if (!KOBO_PATTERN.test(trimmed)) {
    fail(`Invalid amount: ${trimmed}. Must be non-negative with at most 2 decimals.`)
  }
  const value = new Decimal(trimmed)
  if (value.lte(0)) {
    fail('Expense amount must be greater than zero.')
  }
}

// ─── Create ────────────────────────────────────────────────────

export async function createExpense(
  tenantClient: TenantClient,
  input: CreateExpenseInput,
): Promise<ExpenseEntry> {
  // Validate
  if (!input.entityId?.trim()) fail('Entity ID is required.')
  if (!input.periodCode?.trim()) fail('Period code is required.')
  if (!input.transactionDate?.trim()) fail('Transaction date is required.')
  validateAmount(input.amount)
  if (!input.category?.trim()) fail('Category is required.')
  if (!input.description?.trim()) fail('Description is required.')
  if (!input.accountCode?.trim()) fail('Account code is required.')

  // Validate period exists and is open
  const { data: period, error: periodError } = await tenantClient
    .from('accounting_periods')
    .select('id, state')
    .eq('code', input.periodCode.trim())
    .single()

  if (periodError || !period) {
    fail(`Accounting period '${input.periodCode}' not found.`)
  }
  if (period.state !== 'open') {
    fail(`Accounting period '${input.periodCode}' is ${period.state}. Only open periods accept expenses.`)
  }

  // Validate account exists and is active
  const { data: account, error: accountError } = await tenantClient
    .from('accounting_accounts')
    .select('id, code, active')
    .eq('code', input.accountCode.trim())
    .single()

  if (accountError || !account) {
    fail(`Account '${input.accountCode}' not found in chart of accounts.`)
  }
  if (!account.active) {
    fail(`Account '${input.accountCode}' is inactive.`)
  }

  // Validate category
  if (!['operational', 'capital', 'personal', 'non_deductible'].includes(input.category)) {
    fail(`Invalid category: ${input.category}.`)
  }

  // Insert expense
  const { data, error } = await tenantClient
    .from('expenses')
    .insert({
      period_code: input.periodCode.trim(),
      transaction_date: input.transactionDate.trim(),
      amount: input.amount.trim(),
      category: input.category,
      description: input.description.trim(),
      vendor_name: input.vendorName?.trim() || null,
      receipt_url: input.receiptUrl?.trim() || null,
      account_code: input.accountCode.trim(),
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    fail(`Failed to create expense: ${error.message}`)
  }

  return data as ExpenseEntry
}

// ─── Post ──────────────────────────────────────────────────────

/**
 * Post a draft expense through the full accounting chain:
 *   1. ingest_source_transaction  — captured
 *   2. confirm_source_transaction — confirmed
 *   3. post_from_source_transaction — posted (kernel flip)
 *
 * Follows the exact same pattern as paymentAccountingService.ts.
 */
export async function postExpense(
  tenantClient: TenantClient,
  input: PostExpenseInput,
): Promise<{ expenseId: string; journalEntryId: string; sourceTransactionId: string }> {
  if (!input.expenseId?.trim()) fail('Expense ID is required.')
  if (!input.entityId?.trim()) fail('Entity ID is required.')

  // Fetch expense
  const { data: expense, error: fetchError } = await tenantClient
    .from('expenses')
    .select('*')
    .eq('id', input.expenseId.trim())
    .single()

  if (fetchError || !expense) {
    fail(`Expense '${input.expenseId}' not found.`)
  }

  if (expense.status !== 'draft') {
    fail(`Expense '${input.expenseId}' is ${expense.status}. Only draft expenses can be posted.`)
  }

  // Get journal effect for category
  const effect = CATEGORY_JOURNAL_EFFECT[expense.category as ExpenseCategory]
  if (!effect) {
    fail(`Invalid expense category: ${expense.category}.`)
  }

  const amount = expense.amount.trim()
  const transactionDate = expense.transaction_date
  const sourceId = expense.id

  // Step 1: Ingest source transaction
  const { data: ingestData, error: ingestError } = await supabase.rpc('ingest_source_transaction', {
    p_entity_id: input.entityId,
    p_source_type: 'expense',
    p_source_id: sourceId,
    p_transaction_date: transactionDate,
    p_amount: amount,
    p_currency_code: 'NGN',
    p_counterparty_type: 'vendor',
    p_counterparty_name: expense.vendor_name ?? null,
    p_source_document_ref: null,
    p_evidence_refs: expense.receipt_url ? [expense.receipt_url] : [],
    p_idempotency_key: `expense:${sourceId}:ingest`,
    p_memo: expense.description,
  })
  if (ingestError) fail(`ingest_source_transaction failed: ${ingestError.message}`)
  const ingest = ingestData as { id?: string } | null
  if (!ingest?.id) fail('ingest_source_transaction returned no id')

  // Step 2: Confirm source transaction
  const { error: confirmError } = await supabase.rpc('confirm_source_transaction', {
    p_entity_id: input.entityId,
    p_source_transaction_id: ingest.id,
  })
  if (confirmError) fail(`confirm_source_transaction failed: ${confirmError.message}`)

  // Step 3: Post from source transaction
  const postingKey = `expense:${sourceId}:post`
  const { data: postData, error: postError } = await supabase.rpc('post_from_source_transaction', {
    p_entity_id: input.entityId,
    p_source_transaction_id: ingest.id,
    p_entry: {
      period_code: expense.period_code,
      transaction_date: transactionDate,
      source_type: 'expense',
      source_id: sourceId,
      idempotency_key: postingKey,
      memo: expense.description,
    },
    p_lines: [
      {
        account_code: effect.debit,
        side: 'debit',
        amount,
        memo: `Expense: ${expense.description}`,
      },
      {
        account_code: effect.credit,
        side: 'credit',
        amount,
        memo: `Expense: ${expense.description}`,
      },
    ],
  })
  if (postError) fail(`post_from_source_transaction failed: ${postError.message}`)
  const posted = postData as { journal_entry_id?: string } | null

  // Update expense status
  const { error: updateError } = await tenantClient
    .from('expenses')
    .update({
      status: 'posted',
      journal_entry_id: posted?.journal_entry_id ?? null,
      source_transaction_id: ingest.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expense.id)

  if (updateError) {
    fail(`Failed to update expense status: ${updateError.message}`)
  }

  return {
    expenseId: expense.id,
    journalEntryId: posted?.journal_entry_id ?? '',
    sourceTransactionId: ingest.id,
  }
}

// ─── Void ──────────────────────────────────────────────────────

/**
 * Void a posted expense via the authoritative reversal boundary.
 *
 * Uses reverseAccountingEntry (reverse_accounting_entry RPC) which:
 *   - Creates an equal-and-opposite posted entry
 *   - Sets reversal_of_entry_id on the reversal
 *   - Preserves original entry immutability
 *   - Rejects double-reversal
 *
 * The expense status is updated to 'voided' after successful reversal.
 */
export async function voidExpense(
  tenantClient: TenantClient,
  input: VoidExpenseInput,
): Promise<{ expenseId: string; reversalEntryId: string }> {
  if (!input.expenseId?.trim()) fail('Expense ID is required.')
  if (!input.entityId?.trim()) fail('Entity ID is required.')
  if (!input.reason?.trim()) fail('Void reason is required.')

  // Fetch expense
  const { data: expense, error: fetchError } = await tenantClient
    .from('expenses')
    .select('*')
    .eq('id', input.expenseId.trim())
    .single()

  if (fetchError || !expense) {
    fail(`Expense '${input.expenseId}' not found.`)
  }

  if (expense.status !== 'posted') {
    fail(`Expense '${input.expenseId}' is ${expense.status}. Only posted expenses can be voided.`)
  }

  if (!expense.journal_entry_id) {
    fail(`Expense '${input.expenseId}' has no journal entry to reverse.`)
  }

  // Use the authoritative reversal boundary
  const reversalPeriodCode = expense.period_code
  const idempotencyKey = `expense:${expense.id}:void`
  const memo = `Void: ${input.reason}`

  const result = await reverseAccountingEntry(input.entityId, {
    entryId: expense.journal_entry_id,
    reversalPeriodCode,
    idempotencyKey,
    memo,
  })

  // Update expense status
  const { error: updateError } = await tenantClient
    .from('expenses')
    .update({
      status: 'voided',
      updated_at: new Date().toISOString(),
    })
    .eq('id', expense.id)

  if (updateError) {
    fail(`Failed to update expense status: ${updateError.message}`)
  }

  return { expenseId: expense.id, reversalEntryId: result.reversal_entry_id }
}

// ─── List ──────────────────────────────────────────────────────

export async function listExpenses(
  tenantClient: TenantClient,
  options?: { status?: string; category?: string; limit?: number },
): Promise<ExpenseEntry[]> {
  let query = tenantClient
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false })

  if (options?.status) {
    query = query.eq('status', options.status)
  }
  if (options?.category) {
    query = query.eq('category', options.category)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  } else {
    query = query.limit(100)
  }

  const { data, error } = await query

  if (error) {
    fail(`Failed to list expenses: ${error.message}`)
  }

  return (data ?? []) as ExpenseEntry[]
}

// ─── Get ───────────────────────────────────────────────────────

export async function getExpense(
  tenantClient: TenantClient,
  expenseId: string,
): Promise<ExpenseEntry> {
  if (!expenseId?.trim()) fail('Expense ID is required.')

  const { data, error } = await tenantClient
    .from('expenses')
    .select('*')
    .eq('id', expenseId.trim())
    .single()

  if (error || !data) {
    fail(`Expense '${expenseId}' not found.`)
  }

  return data as ExpenseEntry
}
