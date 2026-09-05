import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import {
  createSeedChartOfAccounts,
  toKoboString,
  isNegative,
  sum,
  toDecimal,
} from '../../domain/accounting/index.ts'

// Increment 2 persistence-boundary contract. These tests pin the
// money normalization every adapter must apply before persistence,
// the seed chart the database seed mirrors, and the static guards
// of the persistence migration (money types, ownership keys,
// enforcement hooks). Live database behavior is verified against
// the hosted project through the migration backfill notices and
// the verification queries in the implementation report.

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationPath = path.join(
  here,
  '../../../supabase/migrations/20260905142503_accounting_persistence.sql',
)
const migrationSql = readFileSync(migrationPath, 'utf8')

test('kobo normalization preserves exact zero', () => {
  assert.equal(toKoboString('0'), '0.00')
  assert.equal(toKoboString('0.00'), '0.00')
})

test('kobo normalization keeps two decimals without float drift', () => {
  assert.equal(toKoboString(sum('0.10', '0.20')), '0.30')
  assert.equal(toKoboString('100'), '100.00')
  assert.equal(toKoboString('19.9'), '19.90')
})

test('kobo normalization rejects malformed input instead of coercing', () => {
  assert.throws(() => toDecimal('abc'))
  assert.throws(() => toDecimal(''))
  assert.equal(isNegative('-5.00'), true)
})

test('seed chart is deterministic across builds', () => {
  const first = createSeedChartOfAccounts()
  const second = createSeedChartOfAccounts()
  assert.deepEqual(
    first.map((a) => [a.code, a.name, a.type, a.normalBalance]),
    second.map((a) => [a.code, a.name, a.type, a.normalBalance]),
  )
})

test('seed chart holds the 11-account policy with unique codes', () => {
  const chart = createSeedChartOfAccounts()
  assert.equal(chart.length, 11)
  const codes = chart.map((a) => a.code)
  assert.equal(new Set(codes).size, codes.length)
})

test('migration persists seed codes identical to the domain chart', () => {
  for (const account of createSeedChartOfAccounts()) {
    assert.ok(
      migrationSql.includes(`''${account.code}''`),
      `seed code ${account.code} missing from migration`,
    )
    assert.ok(
      migrationSql.includes(account.name),
      `seed name ${account.name} missing from migration`,
    )
  }
})

test('migration money contract: NUMERIC(18,2), no float storage', () => {
  assert.ok(migrationSql.includes('NUMERIC(18,2)'))
  assert.match(migrationSql, /amount NUMERIC\(18,2\) NOT NULL CHECK \(amount >= 0\)/)
  assert.doesNotMatch(migrationSql, /amount\s+(float|real|double\s+precision)/i)
  assert.doesNotMatch(migrationSql, /FLOAT\s*,\s*REAL/i)
})

test('migration ownership contract: no settings/workspace/user key', () => {
  // workspace_id appears only in the backfill entity-resolution join
  // (same precedent as existing backfills); it must never be an
  // accounting table column. Slice the canonical table definitions
  // and assert the ownership keys are absent there.
  const tableSection = migrationSql.slice(
    migrationSql.indexOf('1. CANONICAL TABLES'),
    migrationSql.indexOf('2. KOBO AMOUNT VALIDATOR'),
  )
  assert.doesNotMatch(tableSection, /settings_id/)
  assert.doesNotMatch(tableSection, /workspace_id/)
  assert.doesNotMatch(tableSection, /company_name/)
  assert.ok(migrationSql.includes('tenant_master_template'))
  assert.ok(migrationSql.includes('_prov_get_schema_name(p_entity_id)'))
})

test('migration enforcement hooks exist', () => {
  for (const hook of [
    'accounting_kobo_amount',
    'accounting_entry_guard',
    'accounting_line_guard',
    'accounting_period_guard',
    'post_accounting_entry',
    '_prov_seed_chart_of_accounts',
    '_prov_install_accounting_triggers',
    'has_entity_permission',
  ]) {
    assert.ok(migrationSql.includes(hook), `${hook} missing from migration`)
  }
})

test('migration idempotency and immutability guards exist', () => {
  assert.ok(migrationSql.includes('UNIQUE (idempotency_key)'))
  assert.ok(migrationSql.includes('ON CONFLICT (code) DO NOTHING'))
  assert.ok(migrationSql.includes('immutable'))
  assert.ok(migrationSql.includes('unbalanced posting'))
})
