import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  REMEDIATION_RESULT_CODES,
  remediateAccountingGap,
} from '../../modules/accounting/remediationService.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationPath = path.join(here, '../../../supabase/migrations/20260906140000_accounting_remediation.sql')
const servicePath = path.join(here, '../../modules/accounting/remediationService.ts')

const migrationSql = readFileSync(migrationPath, 'utf8')
const serviceSource = readFileSync(servicePath, 'utf8')

const INVOICE_ID = '11111111-1111-1111-1111-111111111111'
const PAYMENT_ID = '22222222-2222-2222-2222-222222222222'

// ---------------------------------------------------------------------------
// 1. Result codes are exactly the five required codes
// ---------------------------------------------------------------------------

test('result codes are exactly REPAIRED, ALREADY_RESOLVED, BLOCKED_NO_OPEN_PERIOD, NOT_REPAIRABLE, NOT_FOUND', () => {
  assert.deepEqual([...REMEDIATION_RESULT_CODES], [
    'REPAIRED',
    'ALREADY_RESOLVED',
    'BLOCKED_NO_OPEN_PERIOD',
    'NOT_REPAIRABLE',
    'NOT_FOUND',
  ])
})

// ---------------------------------------------------------------------------
// 2. No new posting path: remediation reuses the existing boundary RPCs
// ---------------------------------------------------------------------------

test('remediator never calls post_accounting_entry directly', () => {
  // The remitter calls post_from_source_transaction, which delegates to
  // post_accounting_entry. The remitter itself must never call
  // post_accounting_entry directly.
  const codeLines = migrationSql.split('\n')
    .filter(l => !l.trim().startsWith('--'))
    .join('\n')
  assert.ok(!codeLines.includes('post_accounting_entry'), 'remediator must not call post_accounting_entry directly')
})

test('remediator never INSERTs journal rows directly', () => {
  // The corrected migration uses format() and the existing RPCs; no raw
  // INSERT INTO journal_entries or journal_lines.
  assert.ok(!/\bINSERT\s+INTO\s+%?\s*[a-z_]*\.?\s*(journal_entries|journal_lines)\b/i.test(migrationSql),
    'remediator must not insert journal rows directly')
})

test('remediator calls ingest -> confirm -> post_from_source_transaction', () => {
  assert.ok(migrationSql.includes("public.ingest_source_transaction("))
  assert.ok(migrationSql.includes("public.confirm_source_transaction("))
  assert.ok(migrationSql.includes("public.post_from_source_transaction("))
})

test('remediator does not call a poll endpoint or read a quarantine table', () => {
  assert.ok(!migrationSql.includes('reconciliation_remediation_status'))
})

// ---------------------------------------------------------------------------
// 3. Row-level lock under the operational record
// ---------------------------------------------------------------------------

test('remediation locks the invoice row with FOR UPDATE', () => {
  assert.ok(migrationSql.includes('SELECT id FROM %I.invoices WHERE id = $1 FOR UPDATE'))
})

test('remediation locks the payment row with FOR UPDATE', () => {
  assert.ok(migrationSql.includes('SELECT id FROM %I.payments WHERE id = $1 FOR UPDATE'))
})

test('remediation re-validates qualification under the lock', () => {
  // After the FOR UPDATE there is a re-read of the row and a
  // re-check of ST/journal existence.
  const afterInvoiceLock = migrationSql.slice(migrationSql.indexOf('SELECT id FROM %I.invoices WHERE id = $1 FOR UPDATE'))
  const idxFirstRevalidate = afterInvoiceLock.indexOf('SELECT id, total, issue_date, currency_code FROM %I.invoices')
  assert.ok(idxFirstRevalidate > -1)
  assert.ok(idxFirstRevalidate < afterInvoiceLock.length)
})

// ---------------------------------------------------------------------------
// 4. Re-validation of existing ST/journal BEFORE any mutation (no
//    duplicate remediation)
// ---------------------------------------------------------------------------

test('remediation checks for an existing source transaction before posting', () => {
  const checks = migrationSql.match(/SELECT id INTO v_existing_st[^;]*LIMIT 1/g) ?? []
  assert.ok(checks.length >= 2, 'expected at least two v_existing_st checks')
})

test('remediation checks for an existing journal entry before posting', () => {
  const checks = migrationSql.match(/SELECT id INTO v_existing_je[^;]*LIMIT 1/g) ?? []
  assert.ok(checks.length >= 2, 'expected at least two v_existing_je checks')
})

test('remediation returns ALREADY_RESOLVED when another process fixed the fact under lock', () => {
  // ALREADY_RESOLVED returns exist for both the invoice and payment paths.
  assert.ok(migrationSql.includes("'result', 'ALREADY_RESOLVED'"))
  assert.ok(migrationSql.includes("'explanation', 'Another process resolved this invoice fact while remediation was in progress.'"))
  assert.ok(migrationSql.includes("'explanation', 'Another process resolved this payment fact while remediation was in progress.'"))
  assert.ok(migrationSql.includes("'source_transaction_id', v_existing_st::text"))
  assert.ok(migrationSql.includes("'journal_entry_id', v_existing_je::text"))
  assert.ok(migrationSql.includes("'entity_id', p_entity_id"))
  assert.ok(migrationSql.includes("'source_type', 'invoice'"))
  assert.ok(migrationSql.includes("'source_type', 'payment'"))
  assert.ok(migrationSql.includes("'source_id', v_source_id"))
})

// ---------------------------------------------------------------------------
// 5. Period block without creating or reopening a period
// ---------------------------------------------------------------------------

test('remediation blocks when no open period covers the transaction date', () => {
  assert.ok(migrationSql.includes("'result', 'BLOCKED_NO_OPEN_PERIOD'"))
  assert.ok(migrationSql.includes("'explanation', 'No open accounting period covers the transaction date; remediation is blocked.'"))
  assert.ok(migrationSql.includes("'transaction_date', v_txn_date::text"))
  assert.ok(migrationSql.includes("'amount', v_amount_text"))
  assert.ok(migrationSql.includes("'source_type', p_source_type"))
  assert.ok(migrationSql.includes("'source_id', v_source_id"))
})

test('remediation does not create an accounting period', () => {
  // The only reference to period creation would be an INSERT into
  // accounting_periods. Confirm none exists.
  assert.ok(!/\bINSERT\s+INTO\s+%?[a-z_]*accounting_periods\b/i.test(migrationSql))
})

test('remediation does not reopen an existing closed period', () => {
  assert.ok(!/UPDATE\s+%?[a-z_]*accounting_periods\b/i.test(migrationSql) ||
    // update is fine for the existing schema, but here we mean no remediation-driven update
    migrationSql.indexOf('UPDATE') === -1)
})

// ---------------------------------------------------------------------------
// 6. Ambiguous findings are explicitly NOT repaired
// ---------------------------------------------------------------------------

test('journal mismatches are not remediated (no journal-rewriting path)', () => {
  // The remitter ends with a final re-query under lock and returns
  // NOT_REPAIRABLE if no JE was created. There is no branch that
  // mutates an existing journal.
  const afterLockInvoice = migrationSql.slice(
    migrationSql.indexOf('SELECT id FROM %I.invoices WHERE id = $1 FOR UPDATE'),
    migrationSql.indexOf('v_period_code')
  )
  // Confirm there is no UPDATE of an existing journal entry id.
  assert.ok(!afterLockInvoice.includes('UPDATE %I.journal_entries SET'))
})

test('orphaned source transactions are not remediated', () => {
  // There is no branch that creates a new ST for an orphaned fact
  // without a qualifying operational record. The only ST creation
  // path is the existing ingest for the current invoice/payment.
  const checks = migrationSql.match(/ingest_source_transaction\(/g) ?? []
  assert.ok(checks.length === 2, 'expect exactly two ingest calls (one per source type)')
})

test('duplicate accounting facts (duplicate STs or duplicate JEs) are not auto-repaired', () => {
  // There is no branch that resolves duplicates. The remitter treats
  // existence of *any* ST or JE for the source id as ALREADY_RESOLVED,
  // but does not repair the duplicate itself.
  assert.ok(!migrationSql.match(/DELETE FROM %I.source_transactions/))
  assert.ok(!migrationSql.match(/DELETE FROM %I.journal_entries/))
})

test('remediation returns NOT_REPAIRABLE when the fact cannot be proven to be missing', () => {
  assert.ok(migrationSql.includes("'result', 'NOT_REPAIRABLE'"))
  assert.ok(migrationSql.includes("'explanation', 'Invoice does not have an authoritative recoverable total for remediation.'"))
  assert.ok(migrationSql.includes("'explanation', 'Payment has no positive recoverable cash amount for remediation.'"))
  assert.ok(migrationSql.includes("'explanation', 'Invoice no longer qualifies under remediation lock.'"))
  assert.ok(migrationSql.includes("'explanation', 'Payment transaction date is missing; remediation requires an authoritative date.'"))
  assert.ok(migrationSql.includes("'explanation', 'Invoice vanished between validation and remediation lock.'"))
  assert.ok(migrationSql.includes("'explanation', 'Payment vanished between validation and remediation lock.'"))
  assert.ok(migrationSql.includes("'explanation', 'Remediation did not result in a journal entry for the requested fact.'"))
})

// ---------------------------------------------------------------------------
// 7. Exact decimal semantics: amount text preserved exactly
// ---------------------------------------------------------------------------

test('remediation carries the exact amount as text, not a JavaScript number', () => {
  assert.ok(migrationSql.includes('v_amount_text'))
  assert.ok(migrationSql.includes('v_amount::text'))
  assert.ok(migrationSql.includes("'amount', v_amount_text"))
})

test('invoice remediation uses the 4A chart accounts exactly (1200 + 4000)', () => {
  const invoiceMarker = "'source_type', 'invoice',\n                'source_id', v_source_id,\n                'idempotency_key', 'invoice:"
  const paymentMarker = "'source_type', 'payment',
                'source_id', v_source_id,
                'idempotency_key', 'payment:"
  const invoiceEnd = migrationSql.indexOf(paymentMarker, invoiceStart)
  assert.ok(invoiceEnd > invoiceStart, 'payment block marker must appear after invoice block')
  const invoiceBlock = migrationSql.slice(invoiceStart, invoiceEnd)
  assert.ok(invoiceBlock.includes("'account_code','1200'"), 'invoice remediation must debit 1200 A/R')
  assert.ok(invoiceBlock.includes("'account_code','4000'"), 'invoice remediation must credit 4000 Revenue')
  assert.ok(!invoiceBlock.includes("'account_code','2200'"), 'invoice remediation must not touch WHT control')
  assert.ok(!invoiceBlock.includes("'account_code','1100'"), 'invoice remediation must not debit 1100 Bank')
  assert.ok(!invoiceBlock.includes("'side','debit','account_code','1100'"), 'invoice remediation must not have a debit line referencing 1100 Bank')
  // ----
  const start = migrationSql.indexOf(paymentMarker)
  assert.ok(start > -1, 'payment block marker must exist')
  const paymentBlock = migrationSql.slice(start)
  assert.ok(paymentBlock.includes("'account_code','1100'"), 'payment remediation must debit 1100 Bank')
  assert.ok(paymentBlock.includes("'account_code','1200'"), 'payment remediation must credit 1200 A/R')
  assert.ok(paymentBlock.includes("'side','debit','amount', v_amount_text, 'memo','Remediation of payment received'"))
  assert.ok(paymentBlock.includes("'side','credit','amount', v_amount_text, 'memo','Remediation of amount settled'"))
  assert.ok(!paymentBlock.includes("'account_code','4000'"), 'payment remediation must not credit 4000 Revenue')
  assert.ok(!paymentBlock.includes("'account_code','2200'"), 'payment remediation must not touch WHT control')
  assert.ok(!paymentBlock.includes("'side','credit','account_code','4000'"))
})

test('-----
    invoiceStart,
    migrationSql.indexOf("'source_type', 'payment',
                'source_id', v_source_id,\n                'idempotency_key', 'payment:")
  )
  assert.ok(invoiceBlock.includes("'account_code','1200'"), 'invoice remediation must debit 1200 A/R')
  assert.ok(invoiceBlock.includes("'account_code','4000'"), 'invoice remediation must credit 4000 Revenue')
  assert.ok(!invoiceBlock.includes("'account_code','2200'"), 'invoice remediation must not touch WHT control')
  assert.ok(!invoiceBlock.includes("'account_code','1100'"), 'invoice remediation must not debit 1100 Bank')
  assert.ok(!invoiceBlock.includes("'side','debit','account_code','1100'"), 'invoice remediation must not have a debit line referencing 1100 Bank')
})

test('payment remediation uses the 4B chart accounts exactly (1100 + 1200) and cash only', () => {
  const paymentMarker = "'source_type', 'payment',\n                'source_id', v_source_id,\n                'idempotency_key', 'payment:"
  const start = migrationSql.indexOf(paymentMarker)
  assert.ok(start > -1, 'payment block marker must exist')
  const paymentBlock = migrationSql.slice(start)
  assert.ok(paymentBlock.includes("'account_code','1100'"), 'payment remediation must debit 1100 Bank')
  assert.ok(paymentBlock.includes("'account_code','1200'"), 'payment remediation must credit 1200 A/R')
  assert.ok(paymentBlock.includes("'side','debit','amount', v_amount_text, 'memo','Remediation of payment received'"))
  assert.ok(paymentBlock.includes("'side','credit','amount', v_amount_text, 'memo','Remediation of amount settled'"))
  assert.ok(!paymentBlock.includes("'account_code','4000'"), 'payment remediation must not credit 4000 Revenue')
  assert.ok(!paymentBlock.includes("'account_code','2200'"), 'payment remediation must not touch WHT control')
  assert.ok(!paymentBlock.includes("'side','credit','account_code','4000'"))
})

// ---------------------------------------------------------------------------
// 8. Historical date preservation
// ---------------------------------------------------------------------------

test('remediation uses the operational transaction date, not the current date', () => {
  assert.ok(migrationSql.includes('v_txn_date::text'))
  assert.ok(migrationSql.includes("'transaction_date', v_txn_date::text"))
  assert.ok(!migrationSql.includes("now() AT"))
  assert.ok(!migrationSql.includes("current_timestamp"))
})

// ---------------------------------------------------------------------------
// 9. Entity isolation: all tables are schema-qualified via %I
// ---------------------------------------------------------------------------

test('every table access is schema-qualified via %I', () => {
  for (const table of ['invoices', 'payments', 'source_transactions', 'journal_entries', 'journal_lines', 'accounting_periods']) {
    assert.ok(migrationSql.includes(`%I.${table}`))
    // Bare references without the schema qualification are blocked.
    assert.ok(
      !new RegExp(`\\bFROM\\s+${table}\\b`).test(migrationSql),
      `${table} must never be referenced without the entity schema`
    )
  }
})

test('permission gate is journal/create, the established accounting-fact create permission', () => {
  assert.ok(migrationSql.includes("has_entity_permission(p_entity_id, auth.uid(), 'journal', 'create')"))
})

// ---------------------------------------------------------------------------
// 10. Final re-query under lock guarantees consistency
// ---------------------------------------------------------------------------

test('remediation re-queries the final ST and JE under lock and returns NOT_REPAIRABLE if no JE was created', () => {
  const finalReRead = migrationSql.slice(migrationSql.indexOf('v_period_code'))
  assert.ok(finalReRead.includes("SELECT id INTO v_final_st_id"))
  assert.ok(finalReRead.includes("SELECT id INTO v_final_je_id"))
  assert.ok(finalReRead.includes("'result', 'NOT_REPAIRABLE'"))
  assert.ok(finalReRead.includes("'explanation', 'Remediation did not result in a journal entry for the requested fact.'"))
})
