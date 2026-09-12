/**
 * Gate E: Classifier — determines company type, CIT rate, and Development Levy.
 * Pure function: resolved rules + entity facts → classification.
 * No database access.
 */

import type {
  ResolvedTaxRules,
  ClassificationFacts,
  TaxClassification,
  CompanyType,
} from './types'

/**
 * Classify entity based on resolved rules + facts.
 * Logic follows NTA 2025:
 *   s.202 — small company: turnover ≤ threshold AND fixed assets ≤ threshold
 *            AND sector not excluded
 *   s.56(a) — small company rate: 0%
 *   s.56(b) — standard rate: 30% (or 25% if Presidential Order)
 *   s.59(1) — development levy: 4% on assessable profits (excl. small + non-resident)
 *   s.57 — ETR minimum: 15% if turnover ≥ ₦50B
 */
export function classifyEntity(
  rules: ResolvedTaxRules,
  facts: ClassificationFacts,
): TaxClassification {
  const cit = rules.cit.rule_snapshot

  // ── s.202 — Small company classification ──
  const turnoverBelowThreshold =
    BigInt(facts.gross_turnover) <= BigInt(cit.small_company_turnover_threshold)
  const assetsBelowThreshold =
    BigInt(facts.total_fixed_assets) <= BigInt(cit.small_company_asset_threshold)
  const sectorExcluded = facts.sector !== null && cit.excluded_sectors.includes(facts.sector)

  const isSmallCompany = turnoverBelowThreshold && assetsBelowThreshold && !sectorExcluded

  // ── s.56 — CIT rate selection ──
  let companyType: CompanyType
  let citRate: string
  if (isSmallCompany) {
    companyType = 'small_company'
    citRate = cit.small_company_rate
  } else if (BigInt(facts.gross_turnover) <= BigInt(cit.small_company_turnover_threshold) * 10n) {
    // ponytail: simplified medium/large split — medium = within 10x of small threshold
    // Real classification may use additional thresholds; upgrade when NTA specifies
    companyType = 'medium_company'
    citRate = cit.reduced_rate ?? cit.standard_rate
  } else {
    companyType = 'large_company'
    citRate = cit.standard_rate
  }

  // ── s.59(1) — Development Levy ──
  const developmentLevyExcluded = cit.development_levy_excluded.includes(companyType)
  const developmentLevyApplies = !developmentLevyExcluded
  const developmentLevyRate = developmentLevyApplies ? cit.development_levy_rate : '0'

  // ── s.57 — ETR minimum ──
  const etrMinimumApplies =
    BigInt(facts.gross_turnover) >= BigInt(cit.etr_minimum_threshold)

  // ── Citation ──
  const citation = [
    `s.202: ${companyType}`,
    `s.56: CIT rate ${citRate}`,
    developmentLevyApplies ? `s.59: DL ${developmentLevyRate}` : 's.59: DL N/A',
    etrMinimumApplies ? `s.57: ETR min ${cit.etr_minimum_rate}` : 's.57: ETR min N/A',
  ].join('; ')

  return {
    company_type: companyType,
    is_small_company: isSmallCompany,
    cit_rate: citRate,
    development_levy_applies: developmentLevyApplies,
    development_levy_rate: developmentLevyRate,
    etr_minimum_applies: etrMinimumApplies,
    etr_minimum_rate: cit.etr_minimum_rate,
    citation,
  }
}
