/**
 * Expense / Money-Out domain types.
 *
 * Extends the accounting foundation without parallel ledgers or tax engines.
 * All monetary values are exact decimal strings (NUMERIC(18,2)).
 *
 * @see docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Expense-Money-Out-PRD-v1.md
 */
import type { Decimal } from 'decimal.js'

// ─── Category Enum ─────────────────────────────────────────────
export const EXPENSE_CATEGORIES = ['operational', 'capital', 'personal', 'non_deductible'] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

// ─── Status Enum ───────────────────────────────────────────────
export const EXPENSE_STATUSES = ['draft', 'posted', 'voided'] as const
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number]

// ─── Expense Entry (DB row shape) ──────────────────────────────
export interface ExpenseEntry {
  readonly id: string
  readonly entity_id: string
  readonly period_code: string
  readonly transaction_date: string
  readonly amount: string          // NUMERIC(18,2) stored as string
  readonly category: ExpenseCategory
  readonly description: string
  readonly vendor_name: string | null
  readonly receipt_url: string | null
  readonly account_code: string    // chart of accounts code
  readonly status: ExpenseStatus
  readonly journal_entry_id: string | null
  readonly source_transaction_id: string | null
  readonly created_at: string
  readonly updated_at: string
}

// ─── Create Input ──────────────────────────────────────────────
export interface CreateExpenseInput {
  readonly entityId: string
  readonly periodCode: string
  readonly transactionDate: string
  readonly amount: string
  readonly category: ExpenseCategory
  readonly description: string
  readonly vendorName?: string | null
  readonly receiptUrl?: string | null
  readonly accountCode: string
}

// ─── Post Input ────────────────────────────────────────────────
export interface PostExpenseInput {
  readonly expenseId: string
  readonly entityId: string
}

// ─── Void Input ────────────────────────────────────────────────
export interface VoidExpenseInput {
  readonly expenseId: string
  readonly entityId: string
  readonly reason: string
}

// ─── Posting Line (for journal) ────────────────────────────────
export interface ExpensePostingLine {
  readonly accountCode: string
  readonly side: 'debit' | 'credit'
  readonly amount: string
  readonly memo: string | null
}

// ─── Category → Journal Effect ─────────────────────────────────
export const CATEGORY_JOURNAL_EFFECT: Record<ExpenseCategory, { debit: string; credit: string }> = {
  operational:    { debit: '5000', credit: '1100' },  // Dr Operating Expenses, Cr Bank
  capital:        { debit: '1500', credit: '1100' },  // Dr Fixed Assets, Cr Bank
  personal:       { debit: '3000', credit: '1100' },  // Dr Equity, Cr Bank
  non_deductible: { debit: '5000', credit: '1100' },  // Dr Operating Expenses, Cr Bank
}
