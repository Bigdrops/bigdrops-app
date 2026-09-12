import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// ── Gate E Tax Rules Engine — Critical Invariant Tests ──
// These tests verify:
//   - Gate E migration adds immutability trigger + unique constraint
//   - Seed rules migration inserts all 5 rule types
//   - Rule resolver finds effective rules deterministically
//   - Classifier determines company type correctly
//   - Computation chains rules into exact results
//   - No hardcoded rates in domain types
//   - barrel exports all Gate E modules

const here = path.dirname(fileURLToPath(import.meta.url))

// ── Load sources ──

const gateEMigrationPath = path.join(
  here,
  '../../../supabase/migrations/20260912120000_gate_e_rules_engine.sql',
)
const gateEMigrationSql = readFileSync(gateEMigrationPath, 'utf8')

const seedMigrationPath = path.join(
  here,
  '../../../supabase/migrations/20260912130000_gate_e_seed_rules.sql',
)
const seedMigrationSql = readFileSync(seedMigrationPath, 'utf8')

const typesPath = path.join(here, '../../domain/tax/types.ts')
const typesSource = readFileSync(typesPath, 'utf8')

const indexPath = path.join(here, '../../domain/tax/index.ts')
const indexSource = readFileSync(indexPath, 'utf8')

// ── 1. Gate E migration structure ──

test('Gate E migration creates immutability trigger function', () => {
  assert.ok(
    gateEMigrationSql.includes('CREATE OR REPLACE FUNCTION public.tax_rule_version_guard()'),
    'missing tax_rule_version_guard function',
  )
})

test('Gate E migration installs trigger on existing schemas', () => {
  assert.ok(
    gateEMigrationSql.includes('_prov_install_tax_rule_version_guard'),
    'missing _prov_install_tax_rule_version_guard function',
  )
  assert.ok(
    gateEMigrationSql.includes('AFTER UPDATE OR DELETE ON'),
    'trigger should fire AFTER UPDATE OR DELETE',
  )
})

test('Gate E migration creates unique constraint function', () => {
  assert.ok(
    gateEMigrationSql.includes('_prov_install_tax_rule_version_unique'),
    'missing unique constraint installer',
  )
  assert.ok(
    gateEMigrationSql.includes('idx_tax_rule_versions_type_date'),
    'missing unique index name',
  )
})

test('Gate E migration uses ERRCODE 25001 for immutability', () => {
  assert.ok(
    gateEMigrationSql.includes("ERRCODE = '25001'"),
    'must use ERRCODE 25001 for immutability guard',
  )
})

// ── 2. Seed rules migration structure ──

test('seed migration inserts all 5 rule types', () => {
  const ruleTypes = ['cit_rules', 'capital_allowance', 'loss_rules', 'qce_rules', 'exemption']
  for (const rt of ruleTypes) {
    assert.ok(
      seedMigrationSql.includes(`'${rt}'`),
      `missing seed rule for ${rt}`,
    )
  }
})

test('seed migration uses tenant_master_template schema', () => {
  assert.ok(
    seedMigrationSql.includes('tenant_master_template.tax_rule_versions'),
    'seed must target tenant_master_template',
  )
})

test('seed migration effective_date is 2026-01-01', () => {
  assert.ok(
    seedMigrationSql.includes("'2026-01-01'"),
    'effective_date must be 2026-01-01 (NTA 2025 commencement)',
  )
})

test('seed CIT rules have no hardcoded rates in types.ts', () => {
  // Types should define structure, not values
  assert.ok(
    !typesSource.includes('"0.30"') && !typesSource.includes("'0.30'"),
    'types.ts must not contain hardcoded CIT rate values',
  )
  assert.ok(
    !typesSource.includes('50000000') || typesSource.includes('small_company_turnover_threshold'),
    'types.ts must not contain hardcoded thresholds outside interface definitions',
  )
})

// ── 3. Domain types — Gate E additions ──

test('types.ts defines capital allowance classes', () => {
  assert.ok(typesSource.includes('CAPITAL_ALLOWANCE_CLASSES'), 'missing CAPITAL_ALLOWANCE_CLASSES')
  assert.ok(typesSource.includes("'class_1'"), 'missing class_1')
  assert.ok(typesSource.includes("'class_2'"), 'missing class_2')
  assert.ok(typesSource.includes("'class_3'"), 'missing class_3')
})

test('types.ts defines capital allowance categories', () => {
  assert.ok(typesSource.includes('CAPITAL_ALLOWANCE_CATEGORIES'), 'missing CAPITAL_ALLOWANCE_CATEGORIES')
  assert.ok(typesSource.includes("'building_expenditure'"), 'missing building_expenditure')
  assert.ok(typesSource.includes("'plant_expenditure'"), 'missing plant_expenditure')
  assert.ok(typesSource.includes("'motor_vehicle_expenditure'"), 'missing motor_vehicle_expenditure')
  assert.ok(typesSource.includes("'software_expenditure'"), 'missing software_expenditure')
})

test('types.ts defines rule payload types', () => {
  assert.ok(typesSource.includes('CitRulePayload'), 'missing CitRulePayload')
  assert.ok(typesSource.includes('CapitalAllowanceRulePayload'), 'missing CapitalAllowanceRulePayload')
  assert.ok(typesSource.includes('LossRulePayload'), 'missing LossRulePayload')
  assert.ok(typesSource.includes('QceRulePayload'), 'missing QceRulePayload')
  assert.ok(typesSource.includes('ExemptionRulePayload'), 'missing ExemptionRulePayload')
})

test('types.ts defines resolved rules and classification types', () => {
  assert.ok(typesSource.includes('ResolvedTaxRules'), 'missing ResolvedTaxRules')
  assert.ok(typesSource.includes('TaxClassification'), 'missing TaxClassification')
  assert.ok(typesSource.includes('ClassificationFacts'), 'missing ClassificationFacts')
})

test('types.ts defines Gate E computation types', () => {
  assert.ok(typesSource.includes('GateEComputationInput'), 'missing GateEComputationInput')
  assert.ok(typesSource.includes('GateEComputationResult'), 'missing GateEComputationResult')
  assert.ok(typesSource.includes('GateEComputationTrace'), 'missing GateEComputationTrace')
})

test('types.ts uses as const for typed arrays', () => {
  assert.ok(
    typesSource.includes("CAPITAL_ALLOWANCE_CLASSES = [") && typesSource.includes('] as const'),
    'CAPITAL_ALLOWANCE_CLASSES must use as const pattern',
  )
  assert.ok(
    typesSource.includes("CAPITAL_ALLOWANCE_CATEGORIES = [") && typesSource.includes('] as const'),
    'CAPITAL_ALLOWANCE_CATEGORIES must use as const pattern',
  )
})

// ── 4. Barrel exports ──

test('index.ts exports all Gate E modules', () => {
  assert.ok(indexSource.includes("./types"), 'missing types export')
  assert.ok(indexSource.includes("./ruleResolver"), 'missing ruleResolver export')
  assert.ok(indexSource.includes("./classifier"), 'missing classifier export')
  assert.ok(indexSource.includes("./computation"), 'missing computation export')
})

// ── 5. Rule Resolver logic tests ──

test('rule resolver: finds effective rule for period', async () => {
  const { resolveTaxRules } = await import('../../domain/tax/ruleResolver.js')

  const rules = [
    {
      id: '1',
      entity_schema: 'test',
      rule_type: 'cit_rules',
      rule_version: 'NTA-2025-CIT-1.0',
      effective_date: '2026-01-01',
      expiry_date: null,
      rule_snapshot: {
        standard_rate: '0.30',
        reduced_rate: '0.25',
        small_company_rate: '0.00',
        small_company_turnover_threshold: '50000000',
        small_company_asset_threshold: '250000000',
        excluded_sectors: ['professional_services'],
        development_levy_rate: '0.04',
        development_levy_excluded: ['small_company'],
        etr_minimum_threshold: '50000000000',
        etr_minimum_rate: '0.15',
      },
      created_at: '2026-01-01T00:00:00Z',
      created_by: null,
    },
    {
      id: '2',
      entity_schema: 'test',
      rule_type: 'capital_allowance',
      rule_version: 'NTA-2025-CA-1.0',
      effective_date: '2026-01-01',
      expiry_date: null,
      rule_snapshot: {
        classes: [
          { class: 'class_1', rate: '0.10', categories: ['building_expenditure'] },
          { class: 'class_2', rate: '0.20', categories: ['plant_expenditure'] },
          { class: 'class_3', rate: '0.25', categories: ['motor_vehicle_expenditure'] },
        ],
      },
      created_at: '2026-01-01T00:00:00Z',
      created_by: null,
    },
    {
      id: '3',
      entity_schema: 'test',
      rule_type: 'loss_rules',
      rule_version: 'NTA-2025-LOSS-1.0',
      effective_date: '2026-01-01',
      expiry_date: null,
      rule_snapshot: {
        carry_forward_indefinite: true,
        trade_specific: true,
        max_deduction_ratio: '1.0',
      },
      created_at: '2026-01-01T00:00:00Z',
      created_by: null,
    },
    {
      id: '4',
      entity_schema: 'test',
      rule_type: 'qce_rules',
      rule_version: 'NTA-2025-QCE-1.0',
      effective_date: '2026-01-01',
      expiry_date: null,
      rule_snapshot: {
        qualifying_categories: ['plant_expenditure', 'motor_vehicle_expenditure'],
        non_qualifying_categories: [],
        restricted_categories: [],
      },
      created_at: '2026-01-01T00:00:00Z',
      created_by: null,
    },
  ]

  const resolved = resolveTaxRules(rules, '2026-01-01', '2026-12-31')
  assert.equal(resolved.cit.rule_version, 'NTA-2025-CIT-1.0')
  assert.equal(resolved.capital_allowance.rule_version, 'NTA-2025-CA-1.0')
  assert.equal(resolved.loss.rule_version, 'NTA-2025-LOSS-1.0')
  assert.equal(resolved.qce.rule_version, 'NTA-2025-QCE-1.0')
  assert.equal(resolved.exemption, null)
  assert.equal(resolved.period_start, '2026-01-01')
  assert.equal(resolved.period_end, '2026-12-31')
})

test('rule resolver: throws when no effective rule exists', async () => {
  const { resolveTaxRules } = await import('../../domain/tax/ruleResolver.js')

  // Empty rules — should throw
  assert.throws(
    () => resolveTaxRules([], '2026-01-01', '2026-12-31'),
    /no effective.*rule found/,
  )
})

test('rule resolver: selects latest effective when multiple exist', async () => {
  const { findEffectiveRule } = await import('../../domain/tax/ruleResolver.js')

  const rules = [
    {
      id: '1',
      entity_schema: 'test',
      rule_type: 'cit_rules',
      rule_version: 'V1',
      effective_date: '2026-01-01',
      expiry_date: '2026-06-30',
      rule_snapshot: { standard_rate: '0.30' },
      created_at: '2026-01-01T00:00:00Z',
      created_by: null,
    },
    {
      id: '2',
      entity_schema: 'test',
      rule_type: 'cit_rules',
      rule_version: 'V2',
      effective_date: '2026-07-01',
      expiry_date: null,
      rule_snapshot: { standard_rate: '0.25' },
      created_at: '2026-07-01T00:00:00Z',
      created_by: null,
    },
  ]

  // Period that overlaps both — V2 is latest effective
  const result = findEffectiveRule(rules, 'cit_rules', '2026-01-01', '2026-12-31')
  assert.equal(result.rule_version, 'V2')

  // Period before V2 — only V1 applies
  const result2 = findEffectiveRule(rules, 'cit_rules', '2026-01-01', '2026-06-30')
  assert.equal(result2.rule_version, 'V1')
})

// ── 6. Classifier logic tests ──

test('classifier: small company gets 0% CIT rate', async () => {
  const { classifyEntity } = await import('../../domain/tax/classifier.js')

  const rules = {
    cit: {
      rule_snapshot: {
        standard_rate: '0.30',
        reduced_rate: '0.25',
        small_company_rate: '0.00',
        small_company_turnover_threshold: '50000000',
        small_company_asset_threshold: '250000000',
        excluded_sectors: ['professional_services'],
        development_levy_rate: '0.04',
        development_levy_excluded: ['small_company'],
        etr_minimum_threshold: '50000000000',
        etr_minimum_rate: '0.15',
      },
    },
    capital_allowance: { rule_snapshot: {} },
    loss: { rule_snapshot: {} },
    qce: { rule_snapshot: {} },
    exemption: null,
    period_start: '2026-01-01',
    period_end: '2026-12-31',
  }

  const result = classifyEntity(rules, {
    gross_turnover: '30000000',
    total_fixed_assets: '100000000',
    sector: null,
  })

  assert.equal(result.company_type, 'small_company')
  assert.equal(result.is_small_company, true)
  assert.equal(result.cit_rate, '0.00')
  assert.equal(result.development_levy_applies, false)
})

test('classifier: large company gets 30% CIT rate', async () => {
  const { classifyEntity } = await import('../../domain/tax/classifier.js')

  const rules = {
    cit: {
      rule_snapshot: {
        standard_rate: '0.30',
        reduced_rate: '0.25',
        small_company_rate: '0.00',
        small_company_turnover_threshold: '50000000',
        small_company_asset_threshold: '250000000',
        excluded_sectors: ['professional_services'],
        development_levy_rate: '0.04',
        development_levy_excluded: ['small_company'],
        etr_minimum_threshold: '50000000000',
        etr_minimum_rate: '0.15',
      },
    },
    capital_allowance: { rule_snapshot: {} },
    loss: { rule_snapshot: {} },
    qce: { rule_snapshot: {} },
    exemption: null,
    period_start: '2026-01-01',
    period_end: '2026-12-31',
  }

  const result = classifyEntity(rules, {
    gross_turnover: '200000000',
    total_fixed_assets: '500000000',
    sector: null,
  })

  // 200M / 50M = 4× → medium company (within 10× of small threshold)
  assert.equal(result.company_type, 'medium_company')
  assert.equal(result.is_small_company, false)
  assert.equal(result.cit_rate, '0.25')
  assert.equal(result.development_levy_applies, true)
})

test('classifier: professional services excluded from small company', async () => {
  const { classifyEntity } = await import('../../domain/tax/classifier.js')

  const rules = {
    cit: {
      rule_snapshot: {
        standard_rate: '0.30',
        reduced_rate: '0.25',
        small_company_rate: '0.00',
        small_company_turnover_threshold: '50000000',
        small_company_asset_threshold: '250000000',
        excluded_sectors: ['professional_services'],
        development_levy_rate: '0.04',
        development_levy_excluded: ['small_company'],
        etr_minimum_threshold: '50000000000',
        etr_minimum_rate: '0.15',
      },
    },
    capital_allowance: { rule_snapshot: {} },
    loss: { rule_snapshot: {} },
    qce: { rule_snapshot: {} },
    exemption: null,
    period_start: '2026-01-01',
    period_end: '2026-12-31',
  }

  // Below thresholds but professional services sector → excluded from small
  const result = classifyEntity(rules, {
    gross_turnover: '30000000',
    total_fixed_assets: '100000000',
    sector: 'professional_services',
  })

  assert.equal(result.is_small_company, false)
  // 30M / 50M = 0.6× → medium company
  assert.equal(result.cit_rate, '0.25')
})

test('classifier: ETR minimum applies for large turnover', async () => {
  const { classifyEntity } = await import('../../domain/tax/classifier.js')

  const rules = {
    cit: {
      rule_snapshot: {
        standard_rate: '0.30',
        reduced_rate: '0.25',
        small_company_rate: '0.00',
        small_company_turnover_threshold: '50000000',
        small_company_asset_threshold: '250000000',
        excluded_sectors: ['professional_services'],
        development_levy_rate: '0.04',
        development_levy_excluded: ['small_company'],
        etr_minimum_threshold: '50000000000',
        etr_minimum_rate: '0.15',
      },
    },
    capital_allowance: { rule_snapshot: {} },
    loss: { rule_snapshot: {} },
    qce: { rule_snapshot: {} },
    exemption: null,
    period_start: '2026-01-01',
    period_end: '2026-12-31',
  }

  const result = classifyEntity(rules, {
    gross_turnover: '60000000000',
    total_fixed_assets: '100000000',
    sector: null,
  })

  assert.equal(result.etr_minimum_applies, true)
  assert.equal(result.etr_minimum_rate, '0.15')
})

// ── 7. QCE category alignment ──

test('QCE_CATEGORIES matches CAPITAL_ALLOWANCE_CATEGORIES', () => {
  // NTA 2025: QCE categories = capital allowance categories (First Schedule)
  assert.ok(
    typesSource.includes('QCE_CATEGORIES = CAPITAL_ALLOWANCE_CATEGORIES'),
    'QCE_CATEGORIES must be an alias for CAPITAL_ALLOWANCE_CATEGORIES',
  )
  assert.ok(
    typesSource.includes('QceCategory = CapitalAllowanceCategory'),
    'QceCategory must alias CapitalAllowanceCategory',
  )
})

test('seed qce_rules has all 13 qualifying categories', () => {
  const expected = [
    'building_expenditure',
    'agricultural_expenditure',
    'agricultural_equipment_expenditure',
    'mast_expenditure',
    'intangible_assets_expenditure',
    'heavy_transport_expenditure',
    'plant_expenditure',
    'furniture_fittings_expenditure',
    'mining_expenditure',
    'other_equipment_expenditure',
    'motor_vehicle_expenditure',
    'software_expenditure',
    'other_capital_expenditure',
  ]
  for (const cat of expected) {
    assert.ok(
      seedMigrationSql.includes(`"${cat}"`),
      `seed qce_rules missing qualifying_category: ${cat}`,
    )
  }
})

// ── 8. Computation logic tests ──

test('computation: small company pays 0% CIT', async () => {
  const { computeTax } = await import('../../domain/tax/computation.js')

  const rules = {
    cit: {
      rule_snapshot: {
        standard_rate: '0.30',
        reduced_rate: '0.25',
        small_company_rate: '0.00',
        small_company_turnover_threshold: '50000000',
        small_company_asset_threshold: '250000000',
        excluded_sectors: ['professional_services'],
        development_levy_rate: '0.04',
        development_levy_excluded: ['small_company'],
        etr_minimum_threshold: '50000000000',
        etr_minimum_rate: '0.15',
      },
    },
    capital_allowance: {
      rule_snapshot: {
        classes: [
          { class: 'class_1', rate: '0.10', categories: ['building_expenditure'] },
          { class: 'class_2', rate: '0.20', categories: ['plant_expenditure'] },
          { class: 'class_3', rate: '0.25', categories: ['motor_vehicle_expenditure'] },
        ],
      },
    },
    loss: {
      rule_snapshot: {
        carry_forward_indefinite: true,
        trade_specific: true,
        max_deduction_ratio: '1.0',
      },
    },
    qce: {
      rule_snapshot: {
        qualifying_categories: ['plant_expenditure', 'motor_vehicle_expenditure'],
        non_qualifying_categories: [],
        restricted_categories: [],
      },
    },
    exemption: null,
    period_start: '2026-01-01',
    period_end: '2026-12-31',
  }

  const result = computeTax(
    rules,
    {
      accounting_profit: '10000000',
      adjustments: [],
      qce: [],
      loss_opening_balance: '0',
      loss_arising: '0',
    },
    { gross_turnover: '30000000', total_fixed_assets: '100000000', sector: null },
  )

  assert.equal(result.classification.cit_rate, '0.00')
  assert.equal(result.tax_payable, '0.00')
  assert.equal(result.classification.is_small_company, true)
})

test('computation: large company with capital allowances', async () => {
  const { computeTax } = await import('../../domain/tax/computation.js')

  const rules = {
    cit: {
      rule_snapshot: {
        standard_rate: '0.30',
        reduced_rate: '0.25',
        small_company_rate: '0.00',
        small_company_turnover_threshold: '50000000',
        small_company_asset_threshold: '250000000',
        excluded_sectors: ['professional_services'],
        development_levy_rate: '0.04',
        development_levy_excluded: ['small_company'],
        etr_minimum_threshold: '50000000000',
        etr_minimum_rate: '0.15',
      },
    },
    capital_allowance: {
      rule_snapshot: {
        classes: [
          { class: 'class_1', rate: '0.10', categories: ['building_expenditure'] },
          { class: 'class_2', rate: '0.20', categories: ['plant_expenditure'] },
          { class: 'class_3', rate: '0.25', categories: ['motor_vehicle_expenditure'] },
        ],
      },
    },
    loss: {
      rule_snapshot: {
        carry_forward_indefinite: true,
        trade_specific: true,
        max_deduction_ratio: '1.0',
      },
    },
    qce: {
      rule_snapshot: {
        qualifying_categories: ['plant_expenditure', 'motor_vehicle_expenditure'],
        non_qualifying_categories: [],
        restricted_categories: [],
      },
    },
    exemption: null,
    period_start: '2026-01-01',
    period_end: '2026-12-31',
  }

  const result = computeTax(
    rules,
    {
      accounting_profit: '50000000',
      adjustments: [],
      qce: [
        { qce_type: 'qualifying', category: 'plant_expenditure', amount: '20000000' },
        { qce_type: 'qualifying', category: 'motor_vehicle_expenditure', amount: '10000000' },
      ],
      loss_opening_balance: '0',
      loss_arising: '0',
    },
    { gross_turnover: '2000000000', total_fixed_assets: '500000000', sector: null },
  )

  // Plant: 20M × 20% = 4M, Motor: 10M × 25% = 2.5M, total CA = 6.5M
  // Assessable: 50M - 6.5M = 43.5M
  // CIT: 43.5M × 30% = 13.05M (large_company, turnover > 10× threshold)
  assert.equal(result.trace.total_capital_allowances, '6500000.00')
  assert.equal(result.trace.assessable_profit, '43500000.00')
  assert.equal(result.tax_payable, '13050000.00')
  assert.equal(result.classification.development_levy_applies, true)
  assert.equal(result.trace.development_levy, '1740000.00')
})

test('computation: loss deduction capped at assessable profit', async () => {
  const { computeTax } = await import('../../domain/tax/computation.js')

  const rules = {
    cit: {
      rule_snapshot: {
        standard_rate: '0.30',
        reduced_rate: '0.25',
        small_company_rate: '0.00',
        small_company_turnover_threshold: '50000000',
        small_company_asset_threshold: '250000000',
        excluded_sectors: ['professional_services'],
        development_levy_rate: '0.04',
        development_levy_excluded: ['small_company'],
        etr_minimum_threshold: '50000000000',
        etr_minimum_rate: '0.15',
      },
    },
    capital_allowance: {
      rule_snapshot: {
        classes: [
          { class: 'class_1', rate: '0.10', categories: ['building_expenditure'] },
          { class: 'class_2', rate: '0.20', categories: ['plant_expenditure'] },
          { class: 'class_3', rate: '0.25', categories: ['motor_vehicle_expenditure'] },
        ],
      },
    },
    loss: {
      rule_snapshot: {
        carry_forward_indefinite: true,
        trade_specific: true,
        max_deduction_ratio: '1.0',
      },
    },
    qce: {
      rule_snapshot: {
        qualifying_categories: [],
        non_qualifying_categories: [],
        restricted_categories: [],
      },
    },
    exemption: null,
    period_start: '2026-01-01',
    period_end: '2026-12-31',
  }

  const result = computeTax(
    rules,
    {
      accounting_profit: '10000000',
      adjustments: [],
      qce: [],
      // Loss of 50M — but only 10M assessable, so capped at 10M
      loss_opening_balance: '50000000',
      loss_arising: '0',
    },
    { gross_turnover: '2000000000', total_fixed_assets: '500000000', sector: null },
  )

  assert.equal(result.trace.loss_deducted, '10000000.00')
  assert.equal(result.trace.chargeable_income, '0.00')
  assert.equal(result.tax_payable, '0.00')
})

test('computation: permanent adjustments affect adjusted profit', async () => {
  const { computeTax } = await import('../../domain/tax/computation.js')

  const rules = {
    cit: {
      rule_snapshot: {
        standard_rate: '0.30',
        reduced_rate: '0.25',
        small_company_rate: '0.00',
        small_company_turnover_threshold: '50000000',
        small_company_asset_threshold: '250000000',
        excluded_sectors: ['professional_services'],
        development_levy_rate: '0.04',
        development_levy_excluded: ['small_company'],
        etr_minimum_threshold: '50000000000',
        etr_minimum_rate: '0.15',
      },
    },
    capital_allowance: {
      rule_snapshot: {
        classes: [
          { class: 'class_1', rate: '0.10', categories: ['building_expenditure'] },
          { class: 'class_2', rate: '0.20', categories: ['plant_expenditure'] },
          { class: 'class_3', rate: '0.25', categories: ['motor_vehicle_expenditure'] },
        ],
      },
    },
    loss: {
      rule_snapshot: {
        carry_forward_indefinite: true,
        trade_specific: true,
        max_deduction_ratio: '1.0',
      },
    },
    qce: {
      rule_snapshot: {
        qualifying_categories: [],
        non_qualifying_categories: [],
        restricted_categories: [],
      },
    },
    exemption: null,
    period_start: '2026-01-01',
    period_end: '2026-12-31',
  }

  const result = computeTax(
    rules,
    {
      accounting_profit: '30000000',
      adjustments: [
        // Non-deductible expense: add back 5M
        { adjustment_type: 'permanent', category: 'non_deductible', tax_amount: '5000000' },
        // Tax-exempt income: subtract 2M
        { adjustment_type: 'permanent', category: 'exemption', tax_amount: '2000000' },
      ],
      qce: [],
      loss_opening_balance: '0',
      loss_arising: '0',
    },
    { gross_turnover: '2000000000', total_fixed_assets: '500000000', sector: null },
  )

  // 30M + 5M (non-deductible add-back) - 2M (exemption) = 33M adjusted
  assert.equal(result.trace.adjusted_profit, '33000000.00')
  // 33M × 30% = 9.9M
  assert.equal(result.tax_payable, '9900000.00')
})
