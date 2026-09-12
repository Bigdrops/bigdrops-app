/**
 * Gate F: Tax Computation Orchestrator.
 *
 * Pure function that chains accounting facts → tax facts → rule
 * resolution → entity classification → deterministic computation.
 *
 * No database access. All inputs explicit. Same inputs always
 * produce the same result.
 *
 * Persistence lives in src/modules/tax/computationService.ts.
 * The orchestrator never duplicates accounting-profit derivation.
 * It reads the output of derive_accounting_reporting and passes
 * accounting_profit as an opaque string to computeTax().
 *
 * Exact money: all monetary values are decimal strings end to end.
 */

import type {
  GateEComputationInput,
  GateEComputationResult,
  ResolvedTaxRules,
  TaxAdjustmentRow,
  TaxQceRow,
} from './types'
import { computeTax } from './computation'

/**
 * Accounting profit derived from the reporting foundation.
 * Caller extracts this from AccountingReportingReport.periods.
 */
export interface AccountingProfitFact {
  /** Total revenue for the period (sum of revenue-account nets). */
  revenue: string
  /** Total expense for the period (sum of expense-account nets). */
  expenses: string
  /** accounting_profit = revenue − expenses. Exact decimal string. */
  accounting_profit: string
}

/**
 * Classification facts for entity type determination.
 * Derived from account balances + entity config.
 */
export interface ClassificationFactSet {
  gross_turnover: string
  total_fixed_assets: string
  sector: string | null
}

/**
 * Gate F computation input — all data the orchestrator needs.
 * Caller gathers these from reporting + Phase 2A tables.
 */
export interface GateFComputationData {
  accounting_profit: AccountingProfitFact
  adjustments: TaxAdjustmentRow[]
  qce: TaxQceRow[]
  loss_opening_balance: string
  loss_arising: string
  classification_facts: ClassificationFactSet
  rules: ResolvedTaxRules
}

/**
 * Pure computation: all inputs explicit, no database access.
 * Chains input snapshot → computeTax().
 *
 * Same inputs always produce the same result (deterministic).
 */
export function computeTaxFromFacts(data: GateFComputationData): GateEComputationResult {
  const input: GateEComputationInput = {
    accounting_profit: data.accounting_profit.accounting_profit,
    adjustments: data.adjustments,
    qce: data.qce,
    loss_opening_balance: data.loss_opening_balance,
    loss_arising: data.loss_arising,
  }

  return computeTax(data.rules, input, data.classification_facts)
}
