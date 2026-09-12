/**
 * Gate F: Tax Computation persistence service.
 *
 * Writes computation inputs and results as two draft rows.
 * The immutability trigger on tax_computation_results prevents
 * changes to input_snapshot after finalization.
 *
 * Pattern: src/modules/accounting/reportingService.ts
 */

import { supabase } from '@/supabase'
import type { GateEComputationResult } from '@/domain/tax/types'
import type { GateFComputationData } from '@/domain/tax/orchestrator'

/**
 * Persist a computation as two draft rows:
 *   1. tax_computation_inputs  — full input snapshot (JSONB)
 *   2. tax_computation_results — core result columns + extra data in snapshot
 *
 * The input_snapshot on the result row stores:
 *   - development_levy (no dedicated column)
 *   - trace (full computation trace)
 *   - classification (entity classification)
 *
 * Caller finalizes by updating status to 'finalized'.
 */
export async function persistComputation(
  entityId: string,
  accountingPeriodId: string,
  result: GateEComputationResult,
  data: GateFComputationData,
): Promise<{ computationId: string; result: GateEComputationResult }> {
  const inputSnapshot = {
    accounting_profit: data.accounting_profit,
    adjustments: data.adjustments,
    qce: data.qce,
    loss_opening_balance: data.loss_opening_balance,
    loss_arising: data.loss_arising,
    classification_facts: data.classification_facts,
    // Extra result data stored here (no dedicated DB columns)
    development_levy: result.development_levy,
    trace: result.trace,
    classification: result.classification,
  }

  const { data: inputRow, error: inputError } = await supabase
    .from('tax_computation_inputs')
    .insert({
      entity_id: entityId,
      accounting_period_id: accountingPeriodId,
      input_snapshot: inputSnapshot,
      status: 'draft',
    })
    .select()
    .single()

  if (inputError) {
    throw new Error(`Gate F: failed to persist computation input: ${inputError.message}`)
  }

  const { data: resultRow, error: resultError } = await supabase
    .from('tax_computation_results')
    .insert({
      entity_id: entityId,
      accounting_period_id: accountingPeriodId,
      computation_input_id: inputRow.id,
      assessment_profit: result.assessment_profit,
      chargeable_income: result.chargeable_income,
      tax_payable: result.tax_payable,
      tax_credits: result.tax_credits,
      rule_versions: result.trace.rule_versions,
      status: 'draft',
    })
    .select()
    .single()

  if (resultError) {
    throw new Error(`Gate F: failed to persist computation result: ${resultError.message}`)
  }

  return { computationId: resultRow.id as string, result }
}
