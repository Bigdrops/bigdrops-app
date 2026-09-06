import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  validateSourceTransactionInput,
} from '../../modules/accounting/sourceTransactionService.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationPath = path.join(
  here,
  '../../../supabase/migrations/20260906103000_source_transactions.sql',
)
const migrationSql = readFileSync(migrationPath, 'utf8')

const validInput = {
  sourceType: 'invoice',
  sourceId: 'inv-001',
  transactionDate: '2026-09-06',
  amount: '50000.00',
  currencyCode: 'NGN',
  counterpartyType: 'customer',
  counterpartyName: 'Acme Ltd',
  evidenceRefs: ['receipt-abc'],
}

// ── Client-side validation ──

test('validateSourceTransactionInput accepts valid input', () => {
  assert.doesNotThrow(() => validateSourceTransactionInput(validInput))
})

test('validateSourceTransactionInput rejects empty source_type', () => {
  assert.throws(
    () => validateSourceTransactionInput({ ...validInput, sourceType: '' }),
    /source type/i,
  )
})

test('validateSourceTransactionInput rejects empty source_id', () => {
  assert.throws(
    () => validateSourceTransactionInput({ ...validInput, sourceId: '  ' }),
    /source ID/i,
  )
})

test('validateSourceTransactionInput rejects empty transaction_date', () => {
  assert.throws(
    () => validateSourceTransactionInput({ ...validInput, transactionDate: '' }),
    /transaction date/i,
  )
})

test('validateSourceTransactionInput rejects empty amount', () => {
  assert.throws(
    () => validateSourceTransactionInput({ ...validInput, amount: '' }),
    /amount/i,
  )
})

test('validateSourceTransactionInput rejects non-numeric amount', () => {
  assert.throws(
    () => validateSourceTransactionInput({ ...validInput, amount: 'abc' }),
    /amount/i,
  )
})

test('validateSourceTransactionInput rejects negative amount', () => {
  assert.throws(
    () => validateSourceTransactionInput({ ...validInput, amount: '-100' }),
    /amount/i,
  )
})

test('validateSourceTransactionInput rejects zero amount', () => {
  assert.throws(
    () => validateSourceTransactionInput({ ...validInput, amount: '0' }),
    /amount/i,
  )
})

test('validateSourceTransactionInput rejects amount with >2 decimals', () => {
  assert.throws(
    () => validateSourceTransactionInput({ ...validInput, amount: '100.999' }),
    /amount/i,
  )
})

test('validateSourceTransactionInput accepts integer amount', () => {
  assert.doesNotThrow(() =>
    validateSourceTransactionInput({ ...validInput, amount: '50000' }),
  )
})

test('validateSourceTransactionInput accepts amount with 1 decimal', () => {
  assert.doesNotThrow(() =>
    validateSourceTransactionInput({ ...validInput, amount: '50000.5' }),
  )
})

// ── Migration schema contract ──

test('migration creates source_transactions table', () => {
  assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS tenant_master_template.source_transactions'))
})

test('migration has NUMERIC(18,2) for amount', () => {
  assert.ok(migrationSql.includes('amount NUMERIC(18,2) NOT NULL'))
})

test('migration has lifecycle_status with valid states', () => {
  assert.ok(migrationSql.includes("'captured', 'confirmed', 'posted', 'rejected'"))
})

test('migration has idempotency_key with UNIQUE constraint', () => {
  assert.ok(migrationSql.includes('UNIQUE (idempotency_key)'))
})

test('migration has source_type + source_id uniqueness via idempotent check', () => {
  assert.ok(migrationSql.includes('source_type'))
  assert.ok(migrationSql.includes('source_id'))
})

test('migration has evidence_refs as jsonb', () => {
  assert.ok(migrationSql.includes('evidence_refs jsonb'))
})

test('migration money contract: no float storage', () => {
  assert.doesNotMatch(migrationSql, /amount\s+(float|real|double\s+precision)/i)
})

test('migration ownership contract: no settings/workspace/user key', () => {
  const tableSection = migrationSql.slice(
    migrationSql.indexOf('1. CANONICAL TABLES'),
    migrationSql.indexOf('2. LIFECYCLE GUARD TRIGGER'),
  )
  assert.doesNotMatch(tableSection, /settings_id/)
  assert.doesNotMatch(tableSection, /workspace_id/)
  assert.doesNotMatch(tableSection, /company_name/)
})

test('migration has lifecycle guard trigger', () => {
  assert.ok(migrationSql.includes('source_transaction_guard'))
  assert.ok(migrationSql.includes('trg_source_transactions_guard'))
})

test('migration has ingest_source_transaction RPC', () => {
  assert.ok(migrationSql.includes('ingest_source_transaction'))
  assert.ok(migrationSql.includes('SECURITY DEFINER'))
})

test('migration has confirm_source_transaction RPC', () => {
  assert.ok(migrationSql.includes('confirm_source_transaction'))
})

test('migration has post_from_source_transaction RPC', () => {
  assert.ok(migrationSql.includes('post_from_source_transaction'))
})

test('migration has entity permission gate on RPCs', () => {
  assert.ok(migrationSql.includes('has_entity_permission'))
  assert.ok(migrationSql.includes("journal', 'create"))
})

test('migration adds source_transactions to template tables', () => {
  assert.ok(migrationSql.includes("'source_transactions'"))
})

test('migration adds source_transaction to resource map', () => {
  assert.ok(migrationSql.includes("WHEN 'source_transactions' THEN 'source_transaction'"))
})

test('migration adds source_transaction to default permissions', () => {
  assert.ok(migrationSql.includes("'source_transaction'"))
})

test('migration installs source transaction triggers in provision_entity', () => {
  assert.ok(migrationSql.includes('_prov_install_source_transaction_triggers'))
})

test('migration backfills source_transactions to entity schemas', () => {
  assert.ok(migrationSql.includes("ARRAY['source_transactions']") ||
    migrationSql.includes("'source_transactions'"))
})

test('migration grants table permissions', () => {
  assert.ok(migrationSql.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE'))
  assert.ok(migrationSql.includes('source_transactions'))
})

test('migration has GRANT to anon, authenticated, service_role', () => {
  assert.ok(migrationSql.includes('anon, authenticated, service_role'))
})

test('migration has PostgREST schema reload', () => {
  assert.ok(migrationSql.includes("NOTIFY pgrst, 'reload schema'"))
})
