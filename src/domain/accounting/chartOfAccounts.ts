/**
 * v1 seed chart of accounts (blueprint section 7).
 * Minimal NGN accounts: cash, bank, receivables, payables, VAT control,
 * WHT control, revenue, expense categories, fixed assets, accumulated
 * depreciation, equity. Tax control accounts hold collected and withheld
 * amounts until remitted.
 */
import type { Account } from './types'
import { createAccount } from './factories'

export interface SeedChartInput {
  entityRef?: string | null
}

export const SEED_ACCOUNT_GROUPS: { code: string; name: string; type: Account['type']; normalBalance: Account['normalBalance'] }[] = [
  { code: '1000', name: 'Cash', type: 'asset', normalBalance: 'debit' },
  { code: '1100', name: 'Bank', type: 'asset', normalBalance: 'debit' },
  { code: '1200', name: 'Accounts Receivable', type: 'asset', normalBalance: 'debit' },
  { code: '1500', name: 'Fixed Assets', type: 'asset', normalBalance: 'debit' },
  { code: '1510', name: 'Accumulated Depreciation', type: 'asset', normalBalance: 'credit' },
  { code: '2000', name: 'Accounts Payable', type: 'liability', normalBalance: 'credit' },
  { code: '2100', name: 'VAT Control', type: 'liability', normalBalance: 'credit' },
  { code: '2200', name: 'WHT Control', type: 'liability', normalBalance: 'credit' },
  { code: '3000', name: 'Equity', type: 'equity', normalBalance: 'credit' },
  { code: '4000', name: 'Revenue', type: 'revenue', normalBalance: 'credit' },
  { code: '5000', name: 'Operating Expenses', type: 'expense', normalBalance: 'debit' },
]

/**
 * Build the v1 seed chart. Codes are unique. Entity scope follows the
 * accounting-book boundary decision (GATE A), represented opaquely here.
 */
export function createSeedChartOfAccounts(input: SeedChartInput = {}): Account[] {
  const seen = new Set<string>()
  return SEED_ACCOUNT_GROUPS.map((group) => {
    if (seen.has(group.code)) {
      throw new Error(`Duplicate account code in seed chart: ${group.code}`)
    }
    seen.add(group.code)
    return createAccount({
      code: group.code,
      name: group.name,
      type: group.type,
      normalBalance: group.normalBalance,
      entityRef: input.entityRef ?? null,
    })
  })
}