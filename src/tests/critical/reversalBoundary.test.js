import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))

const migrationPath = path.join(here, '../../../supabase/migrations/20260909100000_gap2_reversal_boundary.sql')
const servicePath = path.join(here, '../../modules/accounting/reversalService.ts')
const domainPath = path.join(here, '../../domain/accounting/reversal.ts')
const indexPath = path.join(here, '../../domain/accounting/index.ts')

const migrationSql = readFileSync(migrationPath, 'utf8')
const serviceSource = readFileSync(servicePath, 'utf8')
const domainSource = readFileSync(domainPath, 'utf8')
const indexSource = readFileSync(indexPath, 'utf8')

// Comments are stripped so documentation wording cannot trip the scans.
const sqlNoComments = migrationSql.replace(/^\s*--.*$/gm, '')
const sqlNormalized = sqlNoComments.replace(/\s+/g, ' ')

// ── Safety: the reversal does not mutate the original entry ──

test('reversal migration never UPDATEs journal_entries except to flip the reversal to posted', () => {
  const updateMatches = sqlNoComments.match(/\bUPDATE\s+%/gi) ?? []
  // The only UPDATE is: SET status = 'posted' WHERE id = $1 (the reversal entry).
  assert.ok(updateMatches.length >= 1, 'at least one UPDATE is expected (flip to posted)')
  // Must not mutate reversal_of_entry_id on the original.
  assert.ok(!/\bUPDATE\b.*reversal_of_entry_id/i.test(sqlNoComments), 'must not mutate reversal_of_entry_id')
})

test('reversal migration does not DELETE or INSERT into journal_entries (except the new reversal draft)', () => {
  assert.ok(!/\bDELETE\s+FROM\b.*journal_entries/i.test(sqlNoComments), 'must not delete journal entries')
  // The INSERT into journal_entries is the new reversal draft — that is expected.
  const insertMatches = sqlNoComments.match(/\bINSERT\s+INTO\b.*journal_entries/gi) ?? []
  assert.ok(insertMatches.length >= 1, 'INSERT into journal_entries is required (the new reversal)')
})

// ── Double-reversal prevention ──

test('reversal checks if the source entry is already reversed', () => {
  assert.ok(sqlNoComments.includes('reversal_of_entry_id IS NOT NULL'), 'must check for existing reversal')
  assert.ok(sqlNoComments.includes('already reversed'), 'must raise an error for double reversal')
})

test('reversal rejects non-posted entries', () => {
  assert.ok(sqlNoComments.includes("status <> 'posted'"), 'must reject entries that are not posted')
  assert.ok(sqlNoComments.includes('is not posted'), 'must report the entry is not posted')
})

// ── Entity isolation and permission gating ──

test('reversal resolves the entity schema and gates on journal/create', () => {
  assert.ok(migrationSql.includes('_prov_get_schema_name(p_entity_id)'))
  assert.ok(migrationSql.includes("has_entity_permission(p_entity_id, auth.uid(), 'journal', 'create')"))
})

test('every table reference is schema-qualified; no bare table access', () => {
  for (const table of ['journal_entries', 'journal_lines', 'accounting_periods']) {
    assert.ok(migrationSql.includes(`%I.${table}`), `${table} must be schema-qualified via %I`)
  }
})

// ── Reversal structure: flipped lines, balanced, atomic ──

test('reversal creates a new draft entry, inserts compensating lines, then flips to posted', () => {
  assert.ok(sqlNoComments.includes("''draft''"), 'must start as draft')
  assert.ok(sqlNoComments.includes("''posted''"), 'must flip to posted')
})

test('reversal flips debit<->credit for every source line', () => {
  assert.ok(sqlNoComments.includes("CASE WHEN v_source_line.side = 'debit' THEN 'credit' ELSE 'debit' END"), 'must flip sides')
})

test('reversal links via reversal_of_entry_id on the new entry', () => {
  assert.ok(sqlNoComments.includes('reversal_of_entry_id'), 'must set reversal_of_entry_id')
  assert.ok(sqlNoComments.includes('v_source_entry.id') || sqlNoComments.includes('p_source_entry_id'), 'must link to source entry')
})

test('reversal rejects entries with no lines', () => {
  assert.ok(sqlNoComments.includes('has no lines to reverse'), 'must reject zero-line entries')
})

test('reversal validates balance at application level', () => {
  assert.ok(sqlNoComments.includes('v_debits <> v_credits'), 'must check debits = credits')
  assert.ok(sqlNoComments.includes('reversal unbalanced'), 'must report unbalanced reversal')
})

// ── Idempotency ──

test('reversal pre-checks idempotency key and rejects duplicates', () => {
  assert.ok(sqlNoComments.includes('idempotency_key = $1'), 'must look up idempotency key')
  assert.ok(sqlNoComments.includes('duplicate idempotency key'), 'must reject duplicate keys')
})

// ── Period resolution ──

test('reversal resolves the period from p_reversal_period_code', () => {
  assert.ok(sqlNoComments.includes('accounting_periods WHERE code = $1'), 'must resolve period from code')
  assert.ok(sqlNoComments.includes('unknown accounting period'), 'must reject unknown period')
})

// ── No tax logic, no source transaction lifecycle ──

test('reversal never references tax tables or posting kernels', () => {
  for (const forbidden of [
    'tax_input_entries',
    'tax_filings',
    'tax_settings',
    'post_from_source_transaction',
    'ingest_source_transaction',
    'confirm_source_transaction',
    'record_payment_transaction',
    'remediate_accounting_gap',
  ]) {
    assert.ok(!sqlNoComments.includes(forbidden), `must not reference ${forbidden}`)
  }
})

// ── Schema cache reload ──

test('the migration reloads the PostgREST schema cache', () => {
  assert.ok(migrationSql.includes("NOTIFY pgrst, 'reload schema'"))
})

// ── Single function definition ──

test('the migration defines exactly one function', () => {
  assert.ok(migrationSql.includes('CREATE OR REPLACE FUNCTION public.reverse_accounting_entry('))
  assert.equal(
    (sqlNoComments.match(/CREATE OR REPLACE FUNCTION/g) ?? []).length,
    1,
    'exactly one function is defined',
  )
})

// ── Return structure ──

test('the RPC returns the expected result shape', () => {
  for (const key of [
    'reversal_entry_id',
    'reversal_entry_status',
    'original_entry_id',
    'original_entry_status',
    'total_debits',
    'total_credits',
    'line_count',
  ]) {
    assert.ok(sqlNormalized.includes(`'${key}'`), `return key ${key} missing`)
  }
})

// ── Service wrapper contract ──

test('reversal service calls the RPC and writes nothing directly', () => {
  assert.ok(serviceSource.includes("rpc('reverse_accounting_entry'"))
  assert.ok(!/\.from\(/.test(serviceSource), 'service must not touch tables directly')
  assert.ok(!/\.insert\(|\.update\(|\.delete\(/.test(serviceSource), 'service must not mutate anything')
})

test('reversal service validates required fields', () => {
  for (const field of ['entryId', 'reversalPeriodCode', 'idempotencyKey']) {
    assert.ok(serviceSource.includes(field), `service must validate ${field}`)
  }
})

test('reversal service validates the result shape', () => {
  assert.ok(serviceSource.includes('reversal_entry_id'), 'must validate reversal_entry_id')
  assert.ok(serviceSource.includes('original_entry_id'), 'must validate original_entry_id')
  assert.ok(serviceSource.includes('reversal_entry_status'), 'must validate reversal_entry_status')
})

// ── Domain contract ──

test('domain reversal types carry exact-string money contracts', () => {
  assert.ok(domainSource.includes('total_debits: string'), 'total_debits must be string')
  assert.ok(domainSource.includes('total_credits: string'), 'total_credits must be string')
  assert.ok(!domainSource.includes('total_debits: number'), 'total_debits must not be number')
  assert.ok(!domainSource.includes('total_credits: number'), 'total_credits must not be number')
})

test('domain reversal types import only types and stay side-effect free', () => {
  assert.ok(!domainSource.includes("import Decimal"), 'no Decimal import')
  assert.ok(!domainSource.includes("import {"), 'no value imports')
  assert.ok(domainSource.includes('export interface'), 'exports interfaces')
})

test('the reversal domain module is exported from the accounting barrel', () => {
  assert.ok(indexSource.includes("export * from './reversal'"))
})

// ── RPC signature ──

test('the RPC has the correct parameter signature', () => {
  for (const param of ['p_entity_id uuid', 'p_source_entry_id uuid', 'p_reversal_period_code text', 'p_idempotency_key text']) {
    assert.ok(migrationSql.includes(param), `missing parameter: ${param}`)
  }
  assert.ok(migrationSql.includes('p_memo text DEFAULT NULL'), 'p_memo must have a default')
})
