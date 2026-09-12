/**
 * Gate E: Rule Resolver — finds effective tax rules for a period + entity.
 * Deterministic: same inputs always produce the same resolved set.
 * No database access — pure function over rule versions.
 */

import type {
  RuleType,
  TaxRuleVersion,
  CitRulePayload,
  CapitalAllowanceRulePayload,
  LossRulePayload,
  QceRulePayload,
  ExemptionRulePayload,
  ResolvedTaxRules,
} from './types'

/**
 * Find the effective rule for a given type and date range.
 * Rules are effective if:
 *   effective_date <= period_end
 *   AND (expiry_date IS NULL OR expiry_date > period_start)
 *
 * If multiple rules match, the one with the latest effective_date wins.
 * Throws if no rule matches (statutory coverage must be complete).
 */
export function findEffectiveRule<T extends Record<string, unknown>>(
  rules: TaxRuleVersion[],
  ruleType: RuleType,
  periodStart: string,
  periodEnd: string,
): TaxRuleVersion & { rule_snapshot: T } {
  const candidates = rules
    .filter(
      (r) =>
        r.rule_type === ruleType &&
        r.effective_date <= periodEnd &&
        (r.expiry_date === null || r.expiry_date > periodStart),
    )
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date))

  if (candidates.length === 0) {
    throw new Error(
      `Gate E: no effective ${ruleType} rule found for period ${periodStart} to ${periodEnd}`,
    )
  }

  return candidates[0] as TaxRuleVersion & { rule_snapshot: T }
}

/**
 * Resolve all effective rules for a computation period.
 * Returns a complete, ordered set that the computation engine consumes.
 * Throws if any required rule type has no effective version.
 */
export function resolveTaxRules(
  allRules: TaxRuleVersion[],
  periodStart: string,
  periodEnd: string,
): ResolvedTaxRules {
  const cit = findEffectiveRule<CitRulePayload>(allRules, 'cit_rules', periodStart, periodEnd)
  const capital_allowance = findEffectiveRule<CapitalAllowanceRulePayload>(
    allRules,
    'capital_allowance',
    periodStart,
    periodEnd,
  )
  const loss = findEffectiveRule<LossRulePayload>(allRules, 'loss_rules', periodStart, periodEnd)
  const qce = findEffectiveRule<QceRulePayload>(allRules, 'qce_rules', periodStart, periodEnd)

  // Exemption rules are optional — some periods may have none
  let exemption: ResolvedTaxRules['exemption'] = null
  try {
    exemption = findEffectiveRule<ExemptionRulePayload>(
      allRules,
      'exemption',
      periodStart,
      periodEnd,
    )
  } catch {
    // No exemption rule is acceptable
  }

  return {
    cit,
    capital_allowance,
    loss,
    qce,
    exemption,
    period_start: periodStart,
    period_end: periodEnd,
  }
}
