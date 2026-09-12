/**
 * Gate E: Computation — chains resolved rules into deterministic tax results.
 * Pure function: all inputs explicit, no database access.
 * Exact money via Decimal.js (precision 20, ROUND_HALF_UP).
 */

import Decimal from 'decimal.js'
import type {
  ResolvedTaxRules,
  GateEComputationInput,
  GateEComputationResult,
  GateEComputationTrace,
  TaxClassification,
  AdjustmentType,
  AdjustmentCategory,
  CapitalAllowanceClass,
  CapitalAllowanceCategory,
  QceType,
} from './types'
import { classifyEntity } from './classifier'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

/** Wrap a value into Decimal, treating null/undefined as 0. */
function D(value: string | number | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined) return new Decimal(0)
  if (value instanceof Decimal) return value
  if (typeof value === 'number') return new Decimal(String(value))
  return new Decimal(value)
}

/** Serialize to 2-decimal string (exact money). */
function toMoney(d: Decimal): string {
  return d.toFixed(2)
}

/**
 * Map a QCE category to a capital allowance class using the rule payload.
 * Returns null if the category doesn't map to any class.
 */
function mapCategoryToClass(
  category: CapitalAllowanceCategory,
  capitalAllowanceRules: ResolvedTaxRules['capital_allowance']['rule_snapshot'],
): CapitalAllowanceClass | null {
  for (const cls of capitalAllowanceRules.classes) {
    if (cls.categories.includes(category)) return cls.class
  }
  return null
}

/**
 * Run the full Gate E computation.
 *
 * Pipeline:
 *   1. Classify entity (s.202, s.56)
 *   2. Accounting profit + tax adjustments → adjusted profit
 *   3. QCE → capital allowances by class (First Schedule)
 *   4. Adjusted profit − capital allowances → assessable profit
 *   5. Assessable profit − loss deduction → chargeable income
 *   6. Chargeable income × CIT rate → CIT payable
 *   7. Development levy on assessable profit (s.59)
 *   8. Return result with trace
 */
export function computeTax(
  rules: ResolvedTaxRules,
  input: GateEComputationInput,
  classificationFacts: { gross_turnover: string; total_fixed_assets: string; sector: string | null },
): GateEComputationResult {
  const classification = classifyEntity(rules, classificationFacts)
  const trace = buildTrace(rules, input, classification)
  return {
    assessment_profit: trace.assessable_profit,
    chargeable_income: trace.chargeable_income,
    tax_payable: trace.tax_payable,
    tax_credits: trace.tax_credits,
    development_levy: trace.development_levy,
    trace,
    classification,
  }
}

function buildTrace(
  rules: ResolvedTaxRules,
  input: GateEComputationInput,
  classification: TaxClassification,
): GateEComputationTrace {
  // ── Step 1: Accounting profit ──
  const accountingProfit = D(input.accounting_profit)
  const traceAdjustments: GateEComputationTrace['tax_adjustments'] = []

  // ── Step 2: Apply tax adjustments → adjusted profit ──
  let adjustedProfit = new Decimal(accountingProfit)
  for (const adj of input.adjustments) {
    const amount = D(adj.tax_amount)
    // Permanent adjustments affect adjusted profit
    if (adj.adjustment_type === 'permanent') {
      // income/exemption = subtract from profit (tax-exempt income in accounting)
      // non_deductible/expense = add to profit (disallowed expense deducted in accounting)
      const isAddBack = adj.category === 'non_deductible' || adj.category === 'expense'
      adjustedProfit = isAddBack
        ? adjustedProfit.plus(amount)
        : adjustedProfit.minus(amount)
    }
    traceAdjustments.push({
      type: adj.adjustment_type,
      category: adj.category,
      amount: toMoney(amount),
    })
  }

  // ── Step 3: Capital allowances from QCE facts ──
  const capitalAllowances: GateEComputationTrace['capital_allowances'] = []
  const classAmounts: Record<string, Decimal> = {}

  for (const qce of input.qce) {
    if (qce.qce_type !== 'qualifying') continue
    const cls = mapCategoryToClass(qce.category, rules.capital_allowance.rule_snapshot)
    if (!cls) continue
    if (!classAmounts[cls]) classAmounts[cls] = new Decimal(0)
    classAmounts[cls] = classAmounts[cls].plus(D(qce.amount))
  }

  // Apply first-year rate per class
  for (const classDef of rules.capital_allowance.rule_snapshot.classes) {
    const basis = classAmounts[classDef.class]
    if (!basis || basis.isZero()) continue
    const rate = D(classDef.rate)
    const allowance = basis.times(rate)
    capitalAllowances.push({
      class: classDef.class,
      amount: toMoney(allowance),
      basis: `QCE ${toMoney(basis)} × ${toMoney(rate)}`,
    })
  }

  const totalCapitalAllowances = capitalAllowances.reduce(
    (sum, ca) => sum.plus(D(ca.amount)),
    new Decimal(0),
  )

  // ── Step 4: Assessable profit (s.27) ──
  // s.27: total profits = assessable profits − losses − capital allowances
  // Here: assessable profit = adjusted profit − capital allowances
  const assessableProfit = adjustedProfit.minus(totalCapitalAllowances)

  // ── Step 5: Loss deduction (s.27(6), s.97) ──
  const lossOpening = D(input.loss_opening_balance)
  const lossArising = D(input.loss_arising)
  const totalLossAvailable = lossOpening.plus(lossArising)

  const lossRules = rules.loss.rule_snapshot
  let lossDeducted = new Decimal(0)

  if (lossRules.trade_specific && totalLossAvailable.isPositive()) {
    // s.27(6): loss deduction capped at current period's assessable profit
    const maxDeduction = assessableProfit.times(D(lossRules.max_deduction_ratio))
    lossDeducted = Decimal.min(totalLossAvailable, maxDeduction)
    if (lossDeducted.isNegative()) lossDeducted = new Decimal(0)
  }

  // ── Step 6: Chargeable income ──
  const chargeableIncome = assessableProfit.minus(lossDeducted)
  // Cannot be negative
  const chargeableIncomeFinal = chargeableIncome.isNegative()
    ? new Decimal(0)
    : chargeableIncome

  // ── Step 7: CIT payable (s.56) ──
  const citRate = D(classification.cit_rate)
  const citBeforeCredits = chargeableIncomeFinal.times(citRate)
  const taxCredits = new Decimal(0) // placeholder — tax credits applied at filing layer
  const taxPayable = citBeforeCredits.minus(taxCredits)

  // ── Step 8: Development levy (s.59) ──
  const devLevy = classification.development_levy_applies
    ? assessableProfit.times(D(classification.development_levy_rate))
    : new Decimal(0)

  // ── Assemble trace ──
  return {
    accounting_profit: toMoney(accountingProfit),
    tax_adjustments: traceAdjustments,
    adjusted_profit: toMoney(adjustedProfit),
    capital_allowances: capitalAllowances,
    total_capital_allowances: toMoney(totalCapitalAllowances),
    assessable_profit: toMoney(assessableProfit),
    loss_deducted: toMoney(lossDeducted),
    chargeable_income: toMoney(chargeableIncomeFinal),
    cit_rate: classification.cit_rate,
    cit_before_credits: toMoney(citBeforeCredits),
    tax_credits: toMoney(taxCredits),
    development_levy: toMoney(devLevy),
    tax_payable: toMoney(taxPayable),
    classification,
  }
}
