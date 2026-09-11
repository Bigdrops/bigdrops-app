import { supabase } from '@/supabase'
import type { ReverseEntryRequest, ReverseEntryResult } from '@/domain/accounting/reversal'

/**
 * Gap 2 — Posted-Entry Reversal Boundary service.
 *
 * Thin write wrapper over the reversal RPC. It validates client-side,
 * calls the database RPC which enforces the full reversal contract
 * (posted, not already reversed, entity-scoped, permission-gated),
 * and returns structured results. The original entry is never mutated.
 *
 * Pattern: src/modules/accounting/reportingService.ts
 *          src/modules/accounting/reconciliationService.ts
 */
export async function reverseAccountingEntry(
  entityId: string,
  request: ReverseEntryRequest,
): Promise<ReverseEntryResult> {
  if (!entityId) fail('Entity id is required to reverse a journal entry.')
  if (!request.entryId?.trim()) fail('Entry id is required.')
  if (!request.reversalPeriodCode?.trim()) fail('Reversal period code is required.')
  if (!request.idempotencyKey?.trim()) fail('Idempotency key is required.')

  const { data, error } = await supabase.rpc('reverse_accounting_entry', {
    p_entity_id: entityId,
    p_source_entry_id: request.entryId.trim(),
    p_reversal_period_code: request.reversalPeriodCode.trim(),
    p_idempotency_key: request.idempotencyKey.trim(),
    p_memo: request.memo?.trim() || null,
  })
  if (error) fail(`reverse_accounting_entry failed: ${error.message}`)

  const result = data as ReverseEntryResult | null
  if (!result || typeof result !== 'object') {
    fail('reverse_accounting_entry returned no result.')
  }
  if (!result.reversal_entry_id || !result.original_entry_id) {
    fail('reverse_accounting_entry returned incomplete result.')
  }
  if (result.reversal_entry_status !== 'posted') {
    fail('Reversal entry was not posted.')
  }

  return result
}

function fail(message: string): never {
  throw new Error(message)
}
