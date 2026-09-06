import { supabase } from '@/supabase'
import type { TenantClient } from '@/lib/tenantClient'

/**
 * Increment 6 — Controlled Remediation service (v1).
 *
 * Thin read/write wrapper over public.remediate_accounting_gap.
 * Present a structured remediation result with the required result codes.
 *
 * SCOPE (v1): disposable/test fixtures only. The ~300 real pre-cutover
 * gaps on `main` remain quarantined reconciliation findings from
 * Increment 5. This service does not bulk-repair them. A future
 * increment defines the approval workflow and production backfill
 * authority.
 *
 * Audit/traceability (v1):
 *   The remitter return payload carries the full chain:
 *     operational record id
 *     -> source transaction id
 *     -> journal entry id
 *     -> period code, transaction date, exact amount
 *   No existing server-side audit helper fits the remitter's RPC context
 *   without bringing in web-side auth/actor machinery (documented
 *   limitation). The return payload itself is the primary audit artifact
 *   for v1.
 */

export const REMEDIATION_RESULT_CODES = [
  'REPAIRED',
  'ALREADY_RESOLVED',
  'BLOCKED_NO_OPEN_PERIOD',
  'NOT_REPAIRABLE',
  'NOT_FOUND',
] as const

export type RemediationResultCode = (typeof REMEDIATION_RESULT_CODES)[number]

export interface RemediationResult {
  result: RemediationResultCode
  entityId: string
  sourceType: 'invoice' | 'payment'
  sourceId: string
  sourceTransactionId: string | null
  journalEntryId: string | null
  transactionDate: string | null
  amount: string | null
  explanation: string
  remediatorId: string | null
  remediatorLabel: string | null
  periodCode: string | null
}

/**
 * Remediate one explicitly identified accounting gap.
 *
 * Caller supplies entity id, source type, and operational source id.
 * Server re-validates the fact under row-level lock and re-checks that
 * the accounting fact is still genuinely missing before any posting.
 */
export async function remediateAccountingGap(
  entityId: string,
  sourceType: 'invoice' | 'payment',
  sourceId: string,
): Promise<RemediationResult> {
  if (!entityId) fail('entityId is required')
  if (!sourceId) fail('sourceId is required')

  const { data, error } = await supabase.rpc('remediate_accounting_gap', {
    p_entity_id: entityId,
    p_source_type: sourceType,
    p_source_id: sourceId,
  })

  if (error) {
    fail(`remediate_accounting_gap failed: ${error.message}`)
  }

  const result = (data as RemediationResult | null) ?? null
  if (!result || !REMEDIATION_RESULT_CODES.includes(result.result)) {
    fail('remediate_accounting_gap returned an unrecognized result.')
  }

  return result as RemediationResult
}

function fail(message: string): never {
  throw new Error(message)
}
