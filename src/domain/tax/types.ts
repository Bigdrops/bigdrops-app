/**
 * Phase 2A Tax Architecture — Domain types.
 * 7 core tables across 3 layers:
 *   Layer 2: Tax Facts (adjustments, qce, loss_balances, entity_config)
 *   Layer 3: Tax Computation (inputs, results, rule_versions)
 *
 * Architectural rules:
 *   - accounting_periods is the canonical period entity — no separate period model
 *   - No hardcoded statutory rates or thresholds
 *   - Finalized computations are immutable (supersession = new row)
 *   - input_snapshot is immutable once created
 *   - Provenance via typed refs (source_transaction_id, journal_line_id)
 */

// ── Layer 2: Tax Facts ──────────────────────────────────────────────

export const ADJUSTMENT_TYPES = [
  'permanent',
  'temporary',
  'taxable_income',
  'deductible_expense',
] as const
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number]

export const ADJUSTMENT_CATEGORIES = [
  'income',
  'expense',
  'capital_allowance',
  'loss',
  'exemption',
  'non_deductible',
] as const
export type AdjustmentCategory = (typeof ADJUSTMENT_CATEGORIES)[number]

/**
 * Tax adjustment — classifies an existing accounting fact for tax purposes.
 * Links to source_transaction_id + journal_line_id for traceability.
 * No auto journal entries.
 */
export interface TaxAdjustment {
  id: string
  entity_schema: string
  accounting_period_id: string
  source_transaction_id: string | null
  journal_line_id: string | null
  adjustment_type: AdjustmentType
  category: AdjustmentCategory
  description: string
  accounting_amount: string
  tax_amount: string
  rule_snapshot: Record<string, unknown> | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export const QCE_TYPES = [
  'qualifying',
  'non_qualifying',
  'restricted',
] as const
export type QceType = (typeof QCE_TYPES)[number]

export const QCE_CATEGORIES = [
  'rent',
  'repair',
  'depreciation',
  'fuel',
  'maintenance',
  'other',
] as const
export type QceCategory = (typeof QCE_CATEGORIES)[number]

/**
 * Qualifying Capital Expenditure facts only.
 * No capital allowance calculations, no WDV, no annual/initial allowance.
 */
export interface TaxQce {
  id: string
  entity_schema: string
  accounting_period_id: string
  source_transaction_id: string | null
  journal_line_id: string | null
  qce_type: QceType
  category: QceCategory
  description: string
  amount: string
  rule_snapshot: Record<string, unknown> | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

/**
 * Tax loss balances — opening_balance and loss_arising are FACTS;
 * loss_used, loss_expired, closing_balance are DERIVED VALUES
 * (rebuildable caches, not stored as authoritative).
 */
export interface TaxLossBalance {
  id: string
  entity_schema: string
  accounting_period_id: string
  opening_balance: string
  loss_arising: string
  loss_used: string
  loss_expired: string
  closing_balance: string
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export const COMPANY_TYPES = [
  'small_company',
  'medium_company',
  'large_company',
] as const
export type CompanyType = (typeof COMPANY_TYPES)[number]

export const REMITTANCE_SCHEDULES = [
  'monthly',
  'quarterly',
  'annually',
] as const
export type RemittanceSchedule = (typeof REMITTANCE_SCHEDULES)[number]

/**
 * Entity-level tax configuration — operational config only.
 * No TIN, entity_name, year_end, is_small_company, statutory rates.
 */
export interface EntityTaxConfig {
  id: string
  entity_schema: string
  company_type: CompanyType
  is_vat_registered: boolean
  remittance_schedule: RemittanceSchedule
  sector: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

// ── Layer 3: Tax Computation ────────────────────────────────────────

export const COMPUTATION_INPUT_STATUS = ['draft', 'finalized'] as const
export type ComputationInputStatus = (typeof COMPUTATION_INPUT_STATUS)[number]

/**
 * Tax computation inputs — immutable snapshot of all tax facts
 * at the time of computation creation.
 */
export interface TaxComputationInput {
  id: string
  entity_schema: string
  accounting_period_id: string
  input_snapshot: InputSnapshot
  status: ComputationInputStatus
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export const COMPUTATION_RESULT_STATUS = ['draft', 'finalized'] as const
export type ComputationResultStatus = (typeof COMPUTATION_RESULT_STATUS)[number]

/**
 * Tax computation results — draft → finalized lifecycle.
 * Immutable after finalization. Supersession = new row, never UPDATE.
 */
export interface TaxComputationResult {
  id: string
  entity_schema: string
  accounting_period_id: string
  computation_input_id: string
  assessment_profit: string
  chargeable_income: string
  tax_payable: string
  tax_credits: string
  status: ComputationResultStatus
  finalized_at: string | null
  finalized_by: string | null
  superseded_by: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export const RULE_TYPES = [
  'cit_rules',
  'qce_rules',
  'loss_rules',
  'capital_allowance',
  'exemption',
] as const
export type RuleType = (typeof RULE_TYPES)[number]

/**
 * Tax rule versions — frozen snapshots for reproducibility.
 * Owned by Gate E. Phase 2A has no hardcoded rates/thresholds.
 */
export interface TaxRuleVersion {
  id: string
  entity_schema: string
  rule_type: RuleType
  rule_version: string
  effective_date: string
  expiry_date: string | null
  rule_snapshot: Record<string, unknown>
  created_at: string
  created_by: string | null
}

// ── Snapshot contract (C.6) ─────────────────────────────────────────

export interface InputSnapshot {
  adjustments: SnapshotAdjustment[]
  qce: SnapshotQce[]
  loss_balances: SnapshotLossBalance
  entity_config: SnapshotEntityConfig
}

export interface SnapshotAdjustment {
  id: string
  adjustment_type: AdjustmentType
  category: AdjustmentCategory
  description: string
  accounting_amount: string
  tax_amount: string
  source_transaction_id: string | null
  journal_line_id: string | null
  rule_snapshot: Record<string, unknown> | null
}

export interface SnapshotQce {
  id: string
  qce_type: QceType
  category: QceCategory
  description: string
  amount: string
  source_transaction_id: string | null
  journal_line_id: string | null
  rule_snapshot: Record<string, unknown> | null
}

export interface SnapshotLossBalance {
  opening_balance: string
  loss_arising: string
}

export interface SnapshotEntityConfig {
  company_type: CompanyType
  is_vat_registered: boolean
  remittance_schedule: RemittanceSchedule
  sector: string | null
}

// ── Gate E: Rule Payloads ────────────────────────────────────────────
// Frozen JSONB shapes stored inside tax_rule_versions.rule_snapshot.
// No hardcoded rates or thresholds — all values come from rule_snapshot.

export const CAPITAL_ALLOWANCE_CLASSES = ['class_1', 'class_2', 'class_3'] as const
export type CapitalAllowanceClass = (typeof CAPITAL_ALLOWANCE_CLASSES)[number]

export const CAPITAL_ALLOWANCE_CATEGORIES = [
  'building_expenditure',
  'agricultural_expenditure',
  'mast_expenditure',
  'intangible_assets_expenditure',
  'heavy_transport_expenditure',
  'plant_expenditure',
  'agricultural_equipment_expenditure',
  'furniture_fittings_expenditure',
  'mining_expenditure',
  'other_equipment_expenditure',
  'motor_vehicle_expenditure',
  'software_expenditure',
  'other_capital_expenditure',
] as const
export type CapitalAllowanceCategory = (typeof CAPITAL_ALLOWANCE_CATEGORIES)[number]

/** Section 56 — CIT rate and company classification rules. */
export interface CitRulePayload {
  /** s.56 — standard CIT rate (e.g. 30%) */
  standard_rate: string
  /** s.56 proviso — reduced rate if Presidential Order (e.g. 25%) */
  reduced_rate: string | null
  /** s.56(a) — small company rate (e.g. 0%) */
  small_company_rate: string
  /** s.202 — small company gross turnover threshold */
  small_company_turnover_threshold: string
  /** s.202 — small company fixed asset threshold */
  small_company_asset_threshold: string
  /** Sectors excluded from small company treatment */
  excluded_sectors: string[]
  /** s.59(1) — development levy rate on assessable profits */
  development_levy_rate: string
  /** s.59(1) — development levy excluded company types */
  development_levy_excluded: string[]
  /** s.57(2) — ETR minimum applicable turnover threshold */
  etr_minimum_threshold: string
  /** s.57(1)(a) — ETR minimum rate */
  etr_minimum_rate: string
}

/** First Schedule — capital allowance rates by class. */
export interface CapitalAllowanceRulePayload {
  classes: {
    class: CapitalAllowanceClass
    rate: string
    categories: CapitalAllowanceCategory[]
  }[]
}

/** s.27(6) — loss carry-forward rules. */
export interface LossRulePayload {
  /** Whether losses can be carried forward indefinitely */
  carry_forward_indefinite: boolean
  /** Whether losses are trade-specific (restricted to same trade) */
  trade_specific: boolean
  /** Maximum deductible loss per period as fraction of assessable profit (1.0 = 100%) */
  max_deduction_ratio: string
}

/** QCE classification rules (informational — no computation). */
export interface QceRulePayload {
  /** List of qualifying expenditure categories */
  qualifying_categories: string[]
  /** List of non-qualifying expenditure categories */
  non_qualifying_categories: string[]
  /** List of restricted expenditure categories with caps */
  restricted_categories: { category: string; cap_ratio: string }[]
}

/** Exemption rules. */
export interface ExemptionRulePayload {
  exemptions: {
    code: string
    description: string
    rate: string | null
    conditions: string[]
  }[]
}

/** Union of all rule payloads stored in rule_snapshot. */
export type RulePayload =
  | CitRulePayload
  | CapitalAllowanceRulePayload
  | LossRulePayload
  | QceRulePayload
  | ExemptionRulePayload

// ── Gate E: Resolved Rules ───────────────────────────────────────────

/** Entity facts needed for rule classification. */
export interface ClassificationFacts {
  /** Gross annual turnover for classification */
  gross_turnover: string
  /** Total fixed assets for classification */
  total_fixed_assets: string
  /** Sector from entity config */
  sector: string | null
}

/** Resolved set of effective rules for a computation. */
export interface ResolvedTaxRules {
  /** Effective CIT rules */
  cit: TaxRuleVersion & { rule_snapshot: CitRulePayload }
  /** Effective capital allowance rules */
  capital_allowance: TaxRuleVersion & { rule_snapshot: CapitalAllowanceRulePayload }
  /** Effective loss rules */
  loss: TaxRuleVersion & { rule_snapshot: LossRulePayload }
  /** Effective QCE rules */
  qce: TaxRuleVersion & { rule_snapshot: QceRulePayload }
  /** Effective exemption rules (if any) */
  exemption: (TaxRuleVersion & { rule_snapshot: ExemptionRulePayload }) | null
  /** Accounting period the rules apply to */
  period_start: string
  period_end: string
}

/** Classification result derived from resolved rules + entity facts. */
export interface TaxClassification {
  /** Determined company type (small/medium/large) */
  company_type: CompanyType
  /** Whether small company treatment applies */
  is_small_company: boolean
  /** CIT rate applicable */
  cit_rate: string
  /** Whether Development Levy applies */
  development_levy_applies: boolean
  /** Development Levy rate (if applicable) */
  development_levy_rate: string
  /** Whether ETR minimum applies based on turnover */
  etr_minimum_applies: boolean
  /** ETR minimum rate (if applicable) */
  etr_minimum_rate: string
  /** Citation for the classification */
  citation: string
}

// ── Gate E: Computation Types ────────────────────────────────────────

/** Input facts for Gate E computation. All values are string (exact decimal). */
export interface GateEComputationInput {
  /** Accounting profit/loss before tax */
  accounting_profit: string
  /** Tax adjustments (from Phase 2A tax_adjustments table) */
  adjustments: { adjustment_type: AdjustmentType; category: AdjustmentCategory; tax_amount: string }[]
  /** QCE facts (from Phase 2A tax_qce table) */
  qce: { qce_type: QceType; category: CapitalAllowanceCategory; amount: string }[]
  /** Loss opening balance */
  loss_opening_balance: string
  /** Loss arising in current period */
  loss_arising: string
}

/** Step-by-step computation trace for auditability. */
export interface GateEComputationTrace {
  accounting_profit: string
  tax_adjustments: { type: AdjustmentType; category: AdjustmentCategory; amount: string }[]
  adjusted_profit: string
  capital_allowances: { class: CapitalAllowanceClass; amount: string; basis: string }[]
  total_capital_allowances: string
  assessable_profit: string
  loss_deducted: string
  chargeable_income: string
  cit_rate: string
  cit_before_credits: string
  tax_credits: string
  development_levy: string
  tax_payable: string
  classification: TaxClassification
}

/** Final output of Gate E computation. */
export interface GateEComputationResult {
  /** Computed assessment profit */
  assessment_profit: string
  /** Computed chargeable income */
  chargeable_income: string
  /** CIT payable */
  tax_payable: string
  /** Tax credits applied */
  tax_credits: string
  /** Development levy amount */
  development_levy: string
  /** Step-by-step computation trace */
  trace: GateEComputationTrace
  /** Classification used */
  classification: TaxClassification
}
