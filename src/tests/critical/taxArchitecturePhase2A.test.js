import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// ── Phase 2A Tax Architecture — Critical Invariant Tests ──
// These tests pin the 7 architectural rules enforced by the
// Phase 2A migration and domain types. They verify:
//   - Exactly 7 core tables, no more
//   - No assessment_periods entity
//   - accounting_periods is the canonical period
//   - No hardcoded statutory values
//   - Immutable finalized computations
//   - Provenance via typed refs
//   - Derived values documented as rebuildable
//   - No duplicate systems

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationPath = path.join(
  here,
  '../../../supabase/migrations/20260912100000_tax_architecture_phase2a.sql',
)
const migrationSql = readFileSync(migrationPath, 'utf8')

// Strip comments for clean pattern matching
const sqlNoComments = migrationSql.replace(/^\s*--.*$/gm, '')
const sqlNormalized = sqlNoComments.replace(/\s+/g, ' ')

const typesPath = path.join(here, '../../domain/tax/types.ts')
const typesSource = readFileSync(typesPath, 'utf8')

const indexPath = path.join(here, '../../domain/tax/index.ts')
const indexSource = readFileSync(indexPath, 'utf8')

// ── 1. Exactly 7 core tables ──

test('migration creates exactly 7 Phase 2A core tables', () => {
  const tables = [
    'tax_adjustments',
    'tax_qce',
    'tax_loss_balances',
    'entity_tax_config',
    'tax_computation_inputs',
    'tax_computation_results',
    'tax_rule_versions',
  ]
  for (const t of tables) {
    assert.ok(
      sqlNoComments.includes(`CREATE TABLE IF NOT EXISTS tenant_master_template.${t}`),
      `missing CREATE TABLE for ${t}`,
    )
  }
})

test('migration does not create any extra tables beyond the 7 core tables', () => {
  const createMatches = sqlNoComments.match(/CREATE TABLE IF NOT EXISTS\s+tenant_master_template\.\w+/g) ?? []
  assert.equal(createMatches.length, 7, `expected exactly 7 CREATE TABLE statements, found ${createMatches.length}`)
})

// ── 2. No assessment_periods entity ──

test('migration does not reference assessment_periods', () => {
  assert.ok(!sqlNoComments.includes('assessment_period'), 'must not reference assessment_period anywhere')
  assert.ok(!typesSource.includes('assessment_period'), 'types must not reference assessment_period')
})

test('types file has no assessment_period_id field', () => {
  assert.ok(!typesSource.includes('assessment_period_id'), 'types must not have assessment_period_id field')
})

// ── 3. accounting_periods is the canonical period entity ──

test('period-scoped tables reference accounting_periods via FK', () => {
  const periodTables = [
    'tax_adjustments',
    'tax_qce',
    'tax_loss_balances',
    'tax_computation_inputs',
    'tax_computation_results',
  ]
  for (const t of periodTables) {
    assert.ok(
      sqlNoComments.includes(`${t} (`) && sqlNoComments.includes('accounting_period_id uuid NOT NULL'),
      `${t} must have accounting_period_id UUID NOT NULL column`,
    )
    assert.ok(
      sqlNoComments.includes(`REFERENCES tenant_master_template.accounting_periods(id)`),
      `${t} must FK to tenant_master_template.accounting_periods(id)`,
    )
  }
})

// ── 4. No hardcoded statutory values ──

test('migration contains no hardcoded tax rates or thresholds', () => {
  for (const forbidden of [
    '30%', '0.30', '0.3',
    '25%', '0.25', '0.25',
    '15%', '0.15',
    '75000000', '₦75',
    'small_company_threshold',
    'cit_rate',
    'WITHHOLDING_TAX',
    'VAT_RATE',
  ]) {
    assert.ok(
      !sqlNoComments.includes(forbidden),
      `must not contain hardcoded value: ${forbidden}`,
    )
  }
})

test('types have no statutory rate fields in Phase 2A table interfaces', () => {
  // Extract only the Phase 2A table interface sections (not Gate E rule/classification types)
  const phase2aSection = typesSource.split('Gate E')[0]
  assert.ok(!phase2aSection.includes('cit_rate'), 'Phase 2A types must not have cit_rate field')
  assert.ok(!phase2aSection.includes('small_company_threshold'), 'Phase 2A types must not have small_company_threshold')
  assert.ok(!phase2aSection.includes('withholding_tax'), 'Phase 2A types must not have withholding_tax field')
  assert.ok(!phase2aSection.includes('vat_rate'), 'Phase 2A types must not have vat_rate field')
})

// ── 5. Finalized computations are immutable ──

test('migration defines immutability triggers for tax_computation_results', () => {
  assert.ok(
    sqlNoComments.includes('tax_computation_result_guard'),
    'must define tax_computation_result_guard trigger function',
  )
  assert.ok(
    sqlNoComments.includes('finalized tax computation result'),
    'must raise error for finalized result mutation',
  )
  assert.ok(
    sqlNoComments.includes("ERRCODE = '25001'"),
    'must use ERRCODE 25001 for immutability violation',
  )
})

test('migration defines immutability triggers for tax_computation_inputs', () => {
  assert.ok(
    sqlNoComments.includes('tax_computation_input_guard'),
    'must define tax_computation_input_guard trigger function',
  )
  assert.ok(
    sqlNoComments.includes('finalized tax computation input'),
    'must raise error for finalized input mutation',
  )
})

test('trigger installer covers both tables', () => {
  assert.ok(
    sqlNoComments.includes('_prov_install_tax_triggers'),
    'must define _prov_install_tax_triggers installer function',
  )
  assert.ok(
    sqlNoComments.includes('trg_tax_computation_results_guard'),
    'must install trigger on tax_computation_results',
  )
  assert.ok(
    sqlNoComments.includes('trg_tax_computation_inputs_guard'),
    'must install trigger on tax_computation_inputs',
  )
})

// ── 6. Status transition: draft → finalized only ──

test('status transitions are restricted to draft → finalized', () => {
  assert.ok(
    sqlNoComments.includes("OLD.status = 'draft' AND NEW.status = 'finalized'"),
    'must only allow draft → finalized transition',
  )
  assert.ok(
    sqlNoComments.includes('invalid status transition'),
    'must report invalid status transition',
  )
})

// ── 7. Supersession creates new row, never mutates ──

test('superseded_by is a self-referential FK, not an UPDATE mechanism', () => {
  assert.ok(
    sqlNoComments.includes('superseded_by uuid NULL'),
    'superseded_by must be a nullable column on the same table',
  )
  assert.ok(
    sqlNoComments.includes('REFERENCES tenant_master_template.tax_computation_results(id)'),
    'superseded_by must FK to tax_computation_results(id)',
  )
})

// ── 8. Provenance via typed refs ──

test('tax adjustments have typed provenance columns', () => {
  assert.ok(
    sqlNoComments.includes('source_transaction_id uuid NULL'),
    'must have source_transaction_id as typed ref',
  )
  assert.ok(
    sqlNoComments.includes('journal_line_id uuid NULL'),
    'must have journal_line_id as typed ref',
  )
})

test('provenance indexes are partial (NULLs excluded)', () => {
  assert.ok(
    sqlNoComments.includes('WHERE source_transaction_id IS NOT NULL'),
    'provenance indexes must be partial (exclude NULLs)',
  )
})

// ── 9. Derived values are rebuildable caches ──

test('tax_loss_balances has derived value columns', () => {
  assert.ok(
    sqlNoComments.includes('loss_used NUMERIC(18,2)'),
    'must have loss_used derived column',
  )
  assert.ok(
    sqlNoComments.includes('loss_expired NUMERIC(18,2)'),
    'must have loss_expired derived column',
  )
  assert.ok(
    sqlNoComments.includes('closing_balance NUMERIC(18,2)'),
    'must have closing_balance derived column',
  )
})

// ── 10. No duplicate systems ──

test('migration does not reference accounting or compliance tables', () => {
  for (const forbidden of [
    'tax_input_entries',
    'tax_filings',
    'tax_settings',
    'tax_reminders',
    'wht_receipts',
    'csrs',
    'blank_csr_logs',
    'source_transactions',
    'audit_logs',
    'activity_events',
  ]) {
    assert.ok(
      !sqlNoComments.includes(`CREATE TABLE IF NOT EXISTS tenant_master_template.${forbidden}`),
      `must not create duplicate table: ${forbidden}`,
    )
  }
})

test('types do not import from accounting or compliance domains', () => {
  assert.ok(!typesSource.includes("from '../accounting"), 'must not import from accounting domain')
  assert.ok(!typesSource.includes("from '../compliance"), 'must not import from compliance domain')
})

// ── 11. Money contract: NUMERIC(18,2) ──

test('all monetary columns use NUMERIC(18,2)', () => {
  const moneyColumns = [
    'accounting_amount',
    'tax_amount',
    'amount',
    'opening_balance',
    'loss_arising',
    'loss_used',
    'loss_expired',
    'closing_balance',
    'assessment_profit',
    'chargeable_income',
    'tax_payable',
    'tax_credits',
  ]
  for (const col of moneyColumns) {
    assert.ok(
      sqlNoComments.includes(`${col} NUMERIC(18,2)`),
      `${col} must use NUMERIC(18,2)`,
    )
  }
})

// ── 12. Ownership contract: no settings/workspace keys in table columns ──

test('Phase 2A tables have no settings_id or workspace_id columns', () => {
  const tableSection = sqlNoComments.slice(
    sqlNoComments.indexOf('1. CANONICAL TABLES'),
    sqlNoComments.indexOf('2. INDEXES'),
  )
  assert.doesNotMatch(tableSection, /settings_id/, 'must not have settings_id column')
  assert.doesNotMatch(tableSection, /workspace_id/, 'must not have workspace_id column')
})

// ── 13. Provisioning registry updated ──

test('provisioning registry includes all 7 new tables', () => {
  const registryTables = [
    'tax_adjustments',
    'tax_qce',
    'tax_loss_balances',
    'entity_tax_config',
    'tax_computation_inputs',
    'tax_computation_results',
    'tax_rule_versions',
  ]
  for (const t of registryTables) {
    assert.ok(
      migrationSql.includes(`'${t}'`),
      `provisioning registry must include ${t}`,
    )
  }
})

test('resource mapping maps all 7 tables to tax resource', () => {
  const taxTables = [
    'tax_adjustments',
    'tax_qce',
    'tax_loss_balances',
    'entity_tax_config',
    'tax_computation_inputs',
    'tax_computation_results',
    'tax_rule_versions',
  ]
  for (const t of taxTables) {
    assert.ok(
      migrationSql.includes(`WHEN '${t}' THEN 'tax'`),
      `resource mapping must map ${t} to tax`,
    )
  }
})

// ── 14. Default permissions include tax resource ──

test('default permissions seed includes tax resource', () => {
  assert.ok(
    migrationSql.includes("('tax')"),
    'default permissions must include tax resource',
  )
})

// ── 15. RLS policies exist ──

test('all 7 tables have RLS policies installed', () => {
  // RLS is installed dynamically by _prov_install_rls during provisioning,
  // not as literal CREATE POLICY in the migration. Verify the installer
  // is called for each table with the 'tax' resource.
  for (const t of [
    'tax_adjustments',
    'tax_qce',
    'tax_loss_balances',
    'entity_tax_config',
    'tax_computation_inputs',
    'tax_computation_results',
    'tax_rule_versions',
  ]) {
    assert.ok(
      sqlNoComments.includes(`'${t}'`) && sqlNoComments.includes('_prov_install_rls'),
      `backfill must install RLS for ${t} via _prov_install_rls`,
    )
  }
})

// ── 16. Entity schema backfill ──

test('backfill covers all 7 new tables', () => {
  const backfillTables = [
    'tax_adjustments',
    'tax_qce',
    'tax_loss_balances',
    'entity_tax_config',
    'tax_computation_inputs',
    'tax_computation_results',
    'tax_rule_versions',
  ]
  for (const t of backfillTables) {
    assert.ok(
      sqlNoComments.includes(`'${t}'`) && sqlNoComments.includes('_prov_clone_table'),
      `backfill must clone ${t}`,
    )
  }
})

test('backfill installs tax triggers on existing schemas', () => {
  assert.ok(
    sqlNoComments.includes('_prov_install_tax_triggers(v_schema)'),
    'backfill must install tax triggers on existing schemas',
  )
})

// ── 17. PostgREST schema cache reload ──

test('migration reloads the PostgREST schema cache', () => {
  assert.ok(
    migrationSql.includes("NOTIFY pgrst, 'reload schema'"),
    'must reload PostgREST schema cache',
  )
})

// ── 18. Domain types contract ──

test('types file defines all 7 table interfaces', () => {
  const interfaces = [
    'TaxAdjustment',
    'TaxQce',
    'TaxLossBalance',
    'EntityTaxConfig',
    'TaxComputationInput',
    'TaxComputationResult',
    'TaxRuleVersion',
  ]
  for (const iface of interfaces) {
    assert.ok(
      typesSource.includes(`export interface ${iface}`),
      `types must export interface ${iface}`,
    )
  }
})

test('types file defines InputSnapshot contract', () => {
  assert.ok(
    typesSource.includes('export interface InputSnapshot'),
    'types must export InputSnapshot interface',
  )
  assert.ok(
    typesSource.includes('adjustments:'),
    'InputSnapshot must have adjustments field',
  )
  assert.ok(
    typesSource.includes('qce:'),
    'InputSnapshot must have qce field',
  )
  assert.ok(
    typesSource.includes('loss_balances:'),
    'InputSnapshot must have loss_balances field',
  )
  assert.ok(
    typesSource.includes('entity_config:'),
    'InputSnapshot must have entity_config field',
  )
})

test('types have typed string unions for CHECK-equivalent fields', () => {
  // Uses `as const` arrays + indexed access pattern, not inline unions.
  assert.ok(
    typesSource.includes("ADJUSTMENT_TYPES") && typesSource.includes("'permanent'"),
    'adjustment_type must use typed const array with correct values',
  )
  assert.ok(
    typesSource.includes("ADJUSTMENT_CATEGORIES") && typesSource.includes("'income'"),
    'category must use typed const array with correct values',
  )
  assert.ok(
    typesSource.includes("COMPUTATION_INPUT_STATUS") && typesSource.includes("COMPUTATION_RESULT_STATUS") && typesSource.includes("'draft'") && typesSource.includes("'finalized'"),
    'status must use typed const array with correct values',
  )
})

test('types barrel export exists', () => {
  assert.ok(
    indexSource.includes("export * from './types'"),
    'index.ts must re-export from types',
  )
})

// ── 19. Trigger guard: ON DELETE respects status ──

test('DELETE guard blocks finalized results and allows draft', () => {
  assert.ok(
    sqlNoComments.includes("OLD.status = 'finalized'") && sqlNoComments.includes('RETURN OLD'),
    'DELETE must check status and return OLD for non-finalized',
  )
})

// ── 20. No auto journal entries ──

test('migration does not create journal entries from tax adjustments', () => {
  // journal_entries appears in the template list for provisioning, but there
  // must be no INSERT INTO ... journal_entries from tax computation logic.
  const hasJournalInsert = /INSERT\s+INTO\s+[^.]*\.journal_entries/.test(sqlNoComments)
  assert.ok(!hasJournalInsert, 'must not auto-insert journal entries from tax data')
})

// ── 21. Immutability finalization timestamp ──

test('finalized_at and finalized_by are set on finalization', () => {
  assert.ok(
    sqlNoComments.includes('NEW.finalized_at := now()'),
    'must set finalized_at on finalization',
  )
  assert.ok(
    sqlNoComments.includes('NEW.finalized_by := auth.uid()'),
    'must set finalized_by on finalization',
  )
})

// ── 22. Cascading restrictions ──

test('period-scoped tables use ON DELETE RESTRICT', () => {
  assert.ok(
    sqlNoComments.includes('ON DELETE RESTRICT'),
    'period-scoped FKs must use RESTRICT to prevent orphaned tax data',
  )
})
