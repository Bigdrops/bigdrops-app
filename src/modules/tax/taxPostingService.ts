/**
 * Gate G: Tax Computation → Journal Entry persistence service.
 *
 * Reads chart of accounts and open periods from the entity,
 * calls the pure bridge function, and returns a draft journal entry.
 * The entry is not posted — caller routes through the posting kernel.
 *
 * Entity isolation is schema-based (TenantClient sets search_path),
 * not via an entity_id column.
 *
 * Pattern: src/modules/compliance/repositories/complianceRepository.ts
 */

import type { TenantClient } from '@/lib/tenantClient'
import { createTaxJournalEntry, TAX_ACCOUNTS } from '@/domain/tax/taxBridge'
import type { Account, AccountingPeriod, JournalEntry } from '@/domain/accounting/types'
import type { GateEComputationResult } from '@/domain/tax/types'

/**
 * Build a draft journal entry from a finalized tax computation result.
 *
 * Reads the entity's chart of accounts and open periods via TenantClient,
 * then delegates to the pure bridge function.
 */
export async function buildTaxPosting(
  client: TenantClient,
  result: GateEComputationResult,
  development_levy: string,
): Promise<JournalEntry> {
  // Fetch accounts — entity isolation via TenantClient schema
  const { data: accountRows, error: acctError } = await client
    .from('accounts')
    .select('*')

  if (acctError) {
    throw new Error(`Gate G: failed to fetch accounts: ${acctError.message}`)
  }

  const accounts: Account[] = (accountRows ?? []).map((row: Record<string, unknown>) => ({
    code: row.code as string,
    name: row.name as string,
    type: row.type as Account['type'],
    normalBalance: row.normal_balance as Account['normalBalance'],
    active: row.active as boolean,
    parentCode: row.parent_code as string | null,
    entityRef: row.entity_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))

  // Fetch periods — entity isolation via TenantClient schema
  const { data: periodRows, error: periodError } = await client
    .from('accounting_periods')
    .select('*')

  if (periodError) {
    throw new Error(`Gate G: failed to fetch periods: ${periodError.message}`)
  }

  const periods: AccountingPeriod[] = (periodRows ?? []).map((row: Record<string, unknown>) => ({
    code: row.code as string,
    state: row.state as AccountingPeriod['state'],
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    entityRef: row.entity_id as string | null,
  }))

  // Validate required tax accounts exist
  const requiredCodes = [TAX_ACCOUNTS.TAX_EXPENSE, TAX_ACCOUNTS.CIT_PAYABLE]
  if (development_levy !== '0') {
    requiredCodes.push(TAX_ACCOUNTS.DEV_LEVY_PAYABLE)
  }

  const availableCodes = new Set(accounts.map((a) => a.code))
  const missing = requiredCodes.filter((c) => !availableCodes.has(c))
  if (missing.length > 0) {
    throw new Error(`Gate G: missing required accounts: ${missing.join(', ')}`)
  }

  // Delegate to pure bridge
  return createTaxJournalEntry({
    result,
    development_levy,
    accounts,
    periods,
  })
}
