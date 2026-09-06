import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  RECONCILIATION_FINDING_TYPES,
  isReconciliationFindingType,
} from '../../domain/accounting/reconciliation.ts'

const here = path.dirname(fileURLToPath(import.meta.url))

const migrationPath = path.join(here, '../../../supabase/migrations/20260906130000_accounting_reconciliation.sql')
const servicePath = path.join(here, '../../modules/accounting/reconciliationService.ts')

const migrationSql = readFileSync(migrationPath, 'utf8')
const serviceSource = readFileSync(servicePath, 'utf8')

// ── Explicit finding types ──

test('finding types are an explicit closed whitelist of the seven required types', () => {
  assert.deepEqual([...RECONCILIATION_FINDING_TYPES], [
    'MISSING_SOURCE_TRANSACTION',
    'SOURCE_TRANSACTION_CAPTURED',
    'SOURCE_TRANSACTION_CONFIRMED',
    'ORPHANED_SOURCE_TRANSACTION',
    'MISSING_JOURNAL',
    'JOURNAL_MISMATCH',
    'DUPLICATE_ACCOUNTING_FACT',
  ])
})

test('isReconciliationFindingType accepts known types and rejects free-form strings', () => {
  assert.equal(isReconciliationFindingType('MISSING_JOURNAL'), true)
  assert.equal(isReconciliationFindingType('something_else'), false)
  assert.equal(isReconciliationFindingType(42), false)
  assert.equal(isReconciliationFindingType(null), false)
})

// ── Safety: reconciliation never mutates accounting state ──

test('reconciliation RPC is read-only: no INSERT, UPDATE, or DELETE statements', () => {
  // Strip comment lines so documentation wording cannot trip the scan.
  const sqlNoComments = migrationSql.replace(/^\s*--.*$/gm, '')
  assert.ok(!/\bINSERT\s+INTO\b/i.test(sqlNoComments), 'migration must not contain INSERT INTO')
  assert.ok(!/\bUPDATE\b/i.test(sqlNoComments), 'migration must not contain UPDATE')
  assert.ok(!/\bDELETE\s+FROM\b/i.test(sqlNoComments), 'migration must not contain DELETE FROM')
})

test('reconciliation never calls the posting kernel or the source boundary lifecycle', () => {
  assert.ok(!migrationSql.includes('post_accounting_entry'))
  assert.ok(!migrationSql.includes('post_from_source_transaction'))
  assert.ok(!migrationSql.includes('ingest_source_transaction'))
  assert.ok(!migrationSql.includes('confirm_source_transaction'))
  assert.ok(!migrationSql.includes('record_payment_transaction'))
})

test('reconciliation service only calls the read-only RPC and writes nothing', () => {
  assert.ok(serviceSource.includes("rpc('reconcile_accounting_integrity'"))
  assert.ok(!/\.from\(/.test(serviceSource), 'service must not touch tables directly')
  assert.ok(!/\.insert\(|\.update\(|\.delete\(/.test(serviceSource), 'service must not mutate anything')
})

test('service drops findings whose type is outside the whitelist', () => {
  const knownTypes = [
    'MISSING_SOURCE_TRANSACTION',
    'SOURCE_TRANSACTION_CAPTURED',
    'SOURCE_TRANSACTION_CONFIRMED',
    'ORPHANED_SOURCE_TRANSACTION',
    'MISSING_JOURNAL',
    'JOURNAL_MISMATCH',
    'DUPLICATE_ACCOUNTING_FACT',
  ]
  for (const t of knownTypes) assert.ok(serviceSource.includes(`'${t}'`))
  assert.ok(serviceSource.includes('filter'), 'service must filter findings')
})

// ── Entity isolation ──

test('reconciliation resolves the entity schema and gates on journal/view', () => {
  assert.ok(migrationSql.includes('_prov_get_schema_name(p_entity_id)'))
  assert.ok(migrationSql.includes("has_entity_permission(p_entity_id, auth.uid(), 'journal', 'view')"))
})

test('every table reference is schema-qualified; no bare table access', () => {
  for (const table of ['invoices', 'payments', 'source_transactions', 'journal_entries', 'journal_lines']) {
    assert.ok(migrationSql.includes(`%I.${table}`), `${table} must be schema-qualified via %I`)
    assert.ok(
      !new RegExp(`\\bFROM\\s+${table}\\b`).test(migrationSql),
      `${table} must never be referenced without the entity schema`,
    )
  }
})

// ── Invoice integrity checks ──

test('missing source transaction check qualifies invoices and excludes non-accounting statuses', () => {
  assert.ok(migrationSql.includes("i.status NOT IN ('cancelled', 'voided', 'archived')"))
  const invoiceCheck = migrationSql.slice(
    migrationSql.indexOf('1. MISSING_SOURCE_TRANSACTION: qualified invoices'),
    migrationSql.indexOf('2. MISSING_SOURCE_TRANSACTION'),
  )
  assert.ok(invoiceCheck.includes("'finding_type', 'MISSING_SOURCE_TRANSACTION'"))
  assert.ok(invoiceCheck.includes('NOT EXISTS'))
})

test('findings never branch on specific invoice statuses (status changes create no false findings)', () => {
  // Findings depend only on the qualification filter (non-accounting
  // states excluded) and on source-transaction/journal state. No check
  // compares invoice status to a specific value, so a flip between two
  // accounting-qualified statuses can never create or remove a finding.
  assert.ok(migrationSql.includes("i.status NOT IN ('cancelled', 'voided', 'archived')"))
  assert.ok(!/i\.status\s*=(?!=)/.test(migrationSql), 'no equality branching on invoice status')
  assert.ok(!/i\.status\s+IN\s+\(/.test(migrationSql), 'no positive IN branching on invoice status')
})

test('captured and confirmed source transactions map to distinct finding types', () => {
  assert.ok(migrationSql.includes("WHEN 'captured' THEN 'SOURCE_TRANSACTION_CAPTURED'"))
  assert.ok(migrationSql.includes("ELSE 'SOURCE_TRANSACTION_CONFIRMED'"))
})

// ── Payment integrity checks ──

test('missing source transaction check qualifies payments on voided_at and positive cash', () => {
  const paymentCheck = migrationSql.slice(
    migrationSql.indexOf('2. MISSING_SOURCE_TRANSACTION: qualified payments'),
    migrationSql.indexOf('3. SOURCE_TRANSACTION_CAPTURED'),
  )
  assert.ok(paymentCheck.includes('p.voided_at IS NULL'))
  assert.ok(paymentCheck.includes('p.cash_amount > 0'))
  assert.ok(paymentCheck.includes('p.cash_amount::text'))
})

test('multiple legitimate payments are not duplicates: duplicates group by per-payment identity', () => {
  const dupCheck = migrationSql.slice(migrationSql.indexOf('7. DUPLICATE_ACCOUNTING_FACT'))
  assert.ok(dupCheck.includes('GROUP BY st.source_type, st.source_id'))
  assert.ok(dupCheck.includes('HAVING count(*) > 1'))
})

// ── Journal/source integrity checks ──

test('missing journal check fires for posted source transactions without a journal entry', () => {
  const missingJournal = migrationSql.slice(
    migrationSql.indexOf('4. MISSING_JOURNAL'),
    migrationSql.indexOf('5. JOURNAL_MISMATCH'),
  )
  assert.ok(missingJournal.includes("st.lifecycle_status = 'posted'"))
  assert.ok(missingJournal.includes('NOT EXISTS'))
  assert.ok(missingJournal.includes('%I.journal_entries'))
})

test('journal mismatch compares NUMERIC debit/credit sums and never gates on entry status', () => {
  const mismatch = migrationSql.slice(
    migrationSql.indexOf('5. JOURNAL_MISMATCH'),
    migrationSql.indexOf('6. ORPHANED_SOURCE_TRANSACTION'),
  )
  assert.ok(mismatch.includes("SUM(jl.amount) FILTER (WHERE jl.side = 'debit')"))
  assert.ok(mismatch.includes("SUM(jl.amount) FILTER (WHERE jl.side = 'credit')"))
  assert.ok(mismatch.includes('COALESCE(b.debits, 0) <> COALESCE(b.credits, 0)'))
  assert.ok(!mismatch.includes('je.status'), 'entry status must not gate health: kernel inserts stay draft')
})

test('orphaned source transactions are detected for both invoices and payments', () => {
  const orphan = migrationSql.slice(
    migrationSql.indexOf('6. ORPHANED_SOURCE_TRANSACTION'),
    migrationSql.indexOf('7. DUPLICATE_ACCOUNTING_FACT'),
  )
  assert.ok(orphan.includes("'finding_type', 'ORPHANED_SOURCE_TRANSACTION'"))
  assert.ok(orphan.includes('NOT EXISTS'))
  assert.ok(orphan.includes('%I.invoices'))
  assert.ok(orphan.includes('%I.payments'))
})

test('duplicate accounting facts are detected on both the source and journal sides', () => {
  const dup = migrationSql.slice(migrationSql.indexOf('7. DUPLICATE_ACCOUNTING_FACT'))
  assert.ok(dup.includes('DUPLICATE_ACCOUNTING_FACT:source_transaction:'))
  assert.ok(dup.includes('DUPLICATE_ACCOUNTING_FACT:journal_entry:'))
})

test('boundary bypass is detectable: journal entry without any source transaction', () => {
  const bypass = migrationSql.slice(migrationSql.indexOf('8. MISSING_SOURCE_TRANSACTION (journal category)'))
  assert.ok(bypass.includes("je.source_type IN ('invoice', 'payment')"))
  assert.ok(bypass.includes('NOT EXISTS'))
  assert.ok(bypass.includes('outside the controlled boundary'))
})

// ── Finding shape and determinism ──

test('every finding carries the full required shape', () => {
  for (const key of [
    "'finding_id',",
    "'entity_id',",
    "'category',",
    "'source_type',",
    "'source_id',",
    "'source_transaction_id',",
    "'journal_entry_id',",
    "'finding_type',",
    "'severity',",
    "'explanation',",
    "'transaction_date',",
    "'amount',",
    "'actionable',",
  ]) {
    assert.ok(migrationSql.includes(key), `finding key ${key} missing`)
  }
})

test('finding identifiers embed the finding type and source identity for deterministic deduplication', () => {
  assert.ok(migrationSql.includes("'finding_id', 'MISSING_SOURCE_TRANSACTION:invoice:' || i.id::text"))
  assert.ok(migrationSql.includes("st.id::text"))
  assert.ok(migrationSql.includes("je.id::text"))
})

test('report is entity-scoped and self-consistent', () => {
  assert.ok(migrationSql.includes("'entity_id', p_entity_id"))
  assert.ok(migrationSql.includes("'finding_count', jsonb_array_length(v_findings)"))
  assert.ok(migrationSql.includes("'findings', v_findings"))
})

// ── Exact monetary comparison strategy ──

test('amounts cross the boundary as exact text, never JavaScript numbers', () => {
  assert.ok(migrationSql.includes('i.total::text'))
  assert.ok(migrationSql.includes('st.amount::text'))
  const mismatch = migrationSql.slice(
    migrationSql.indexOf('5. JOURNAL_MISMATCH'),
    migrationSql.indexOf('6. ORPHANED_SOURCE_TRANSACTION'),
  )
  assert.ok(mismatch.includes('COALESCE(b.debits, 0)::text'))
})
