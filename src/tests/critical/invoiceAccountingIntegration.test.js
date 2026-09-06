import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  INVOICE_SOURCE_TYPE,
  buildInvoiceAmount,
  buildInvoiceSourceTransactionInput,
  buildInvoiceClaimPosting,
} from '../../modules/invoices/services/invoiceAccountingService.ts'
import { Decimal } from 'decimal.js'

const here = path.dirname(fileURLToPath(import.meta.url))

const sourceTransactionMigrationPath = path.join(
  here,
  '../../../supabase/migrations/20260906103000_source_transactions.sql',
)
const adapterMigrationPath = path.join(
  here,
  '../../../supabase/migrations/20260906120000_invoice_accounting_adapter.sql',
)
const invoiceSavePath = path.join(here, '../../hooks/useInvoiceSave.ts')
const adapterServicePath = path.join(
  here,
  '../../modules/invoices/services/invoiceAccountingService.ts',
)

const sourceTransactionMigrationSql = readFileSync(sourceTransactionMigrationPath, 'utf8')
const adapterMigrationSql = readFileSync(adapterMigrationPath, 'utf8')
const invoiceSaveSource = readFileSync(invoiceSavePath, 'utf8')
const adapterServiceSource = readFileSync(adapterServicePath, 'utf8')

const sampleInvoice = {
  id: '11111111-1111-1111-1111-111111111111',
  invoice_number: 'SASINV-B001',
  client_name: 'Acme Ltd',
  issue_date: '2026-09-06',
  total: '12500.5',
}

// ── Accounting event: amount normalization ──

test('buildInvoiceAmount preserves exact decimal totals as kobo strings', () => {
  assert.equal(buildInvoiceAmount('12500.5'), '12500.50')
  assert.equal(buildInvoiceAmount('12500.05'), '12500.05')
  assert.equal(buildInvoiceAmount(12500), '12500.00')
  assert.equal(buildInvoiceAmount('0.1'), '0.10')
})

test('buildInvoiceAmount applies Decimal ROUND_HALF_UP without float drift', () => {
  assert.equal(buildInvoiceAmount('0.145'), '0.15')
  assert.equal(buildInvoiceAmount('19.999'), '20.00')
})

test('buildInvoiceAmount rejects missing, malformed, zero, and negative totals', () => {
  assert.throws(() => buildInvoiceAmount(null), /positive amount|missing/i)
  assert.throws(() => buildInvoiceAmount(undefined), /positive amount|missing/i)
  assert.throws(() => buildInvoiceAmount(''), /positive amount|missing/i)
  assert.throws(() => buildInvoiceAmount('abc'), /valid amount|positive/i)
  assert.throws(() => buildInvoiceAmount('0'), /positive amount/i)
  assert.throws(() => buildInvoiceAmount('-5'), /positive amount/i)
})

// ── Accounting event: source transaction payload ──

test('source transaction payload uses invoice id provenance and derived idempotency key', () => {
  const input = buildInvoiceSourceTransactionInput(sampleInvoice)
  assert.equal(input.sourceType, 'invoice')
  assert.equal(input.sourceId, sampleInvoice.id)
  assert.equal(input.idempotencyKey, 'invoice:11111111-1111-1111-1111-111111111111:ingest')
  assert.equal(input.transactionDate, '2026-09-06')
  assert.equal(input.amount, '12500.50')
  assert.equal(input.currencyCode, 'NGN')
  assert.equal(input.counterpartyType, 'customer')
  assert.equal(input.counterpartyName, 'Acme Ltd')
  assert.equal(input.sourceDocumentRef, 'SASINV-B001')
})

// ── Account mapping: only the seeded claim pair ──

test('claim posting maps to seeded receivable and revenue accounts only', () => {
  const posting = buildInvoiceClaimPosting(sampleInvoice)
  const codes = posting.lines.map((line) => line.account_code)
  assert.deepEqual(codes.sort(), ['1200', '4000'])
})

test('claim posting balances exactly with equal debit and credit amounts', () => {
  const posting = buildInvoiceClaimPosting(sampleInvoice)
  assert.equal(posting.lines.length, 2)
  const debit = posting.lines.find((line) => line.side === 'debit')
  const credit = posting.lines.find((line) => line.side === 'credit')
  assert.ok(debit && credit)
  assert.equal(debit.amount, credit.amount)
  assert.equal(
    new Decimal(debit.amount).toFixed(2),
    new Decimal(credit.amount).toFixed(2),
  )
})

test('claim posting idempotency key is derived from the invoice id, not random', () => {
  const first = buildInvoiceClaimPosting(sampleInvoice)
  const second = buildInvoiceClaimPosting(sampleInvoice)
  assert.equal(first.entry.idempotency_key, second.entry.idempotency_key)
  assert.equal(
    first.entry.idempotency_key,
    'invoice:11111111-1111-1111-1111-111111111111:post',
  )
})

// ── Controlled boundary: adapter must go through the RPCs, never direct writes ──

test('adapter uses ingest, confirm, and post_from_source_transaction RPCs', () => {
  assert.match(adapterServiceSource, /rpc\(\s*'ingest_source_transaction'/)
  assert.match(adapterServiceSource, /rpc\(\s*'confirm_source_transaction'/)
  assert.match(adapterServiceSource, /rpc\(\s*'post_from_source_transaction'/)
})

test('adapter never writes journal_entries or journal_lines directly', () => {
  assert.doesNotMatch(adapterServiceSource, /from\(['"]journal_entries['"]\)/)
  assert.doesNotMatch(adapterServiceSource, /from\(['"]journal_lines['"]\)/)
  assert.doesNotMatch(adapterServiceSource, /\.insert\(\s*\{[^)]*journal/i)
})

test('adapter posts through the Increment 2 kernel boundary by RPC name', () => {
  assert.ok(adapterServiceSource.includes("'post_from_source_transaction'"))
})

// ── Wire-in: only the creation path triggers the event ──

test('invoice save wiring lives inside the create branch of the composite save', () => {
  const createBranchStart = invoiceSaveSource.indexOf("entityId && isCreate")
  const updateBranchStart = invoiceSaveSource.indexOf("entityId && !isCreate")
  assert.ok(createBranchStart !== -1, 'create branch not found')
  assert.ok(updateBranchStart !== -1, 'update branch not found')
  assert.ok(createBranchStart < updateBranchStart, 'create branch must precede update branch')

  const wiring = invoiceSaveSource.slice(createBranchStart, updateBranchStart)
  assert.match(wiring, /syncInvoiceAccountingEvent/)
  assert.match(wiring, /isCreate/)
})

test('invoice update path does not trigger the accounting event', () => {
  const updateBranchStart = invoiceSaveSource.indexOf("entityId && !isCreate")
  const updateBranch = invoiceSaveSource.slice(
    updateBranchStart,
    invoiceSaveSource.indexOf('}', updateBranchStart + 500),
  )
  assert.doesNotMatch(updateBranch, /syncInvoiceAccountingEvent/)
})

// ── Migration contract: repaired RPC preserves the Increment 3 gates ──

test('adapter migration repairs post_from_source_transaction', () => {
  assert.ok(adapterMigrationSql.includes('CREATE OR REPLACE FUNCTION public.post_from_source_transaction'))
})

test('repaired RPC keeps jsonb return and the confirmation gate', () => {
  const functionBody = adapterMigrationSql.slice(
    adapterMigrationSql.indexOf('CREATE OR REPLACE FUNCTION public.post_from_source_transaction'),
  )
  assert.ok(functionBody.includes('RETURNS jsonb'))
  assert.ok(functionBody.includes("v_source_status <> 'confirmed'"))
  assert.ok(functionBody.includes("only confirmed transactions can be posted'"))
})

test('repaired RPC extracts the entry id from the kernel jsonb result', () => {
  const functionBody = adapterMigrationSql.slice(
    adapterMigrationSql.indexOf('CREATE OR REPLACE FUNCTION public.post_from_source_transaction'),
  )
  assert.ok(functionBody.includes('v_post_result jsonb'))
  assert.ok(functionBody.includes("(v_post_result->>'id')::uuid"))
  assert.ok(functionBody.includes('post_accounting_entry(p_entity_id, p_entry, p_lines)'))
})

test('repaired RPC still flips the source transaction to posted', () => {
  const functionBody = adapterMigrationSql.slice(
    adapterMigrationSql.indexOf('CREATE OR REPLACE FUNCTION public.post_from_source_transaction'),
  )
  assert.ok(functionBody.includes("SET lifecycle_status = ''posted''"))
})

test('adapter migration reloads the PostgREST schema cache', () => {
  assert.ok(adapterMigrationSql.includes("NOTIFY pgrst, 'reload schema'"))
})

test('adapter migration adds no journal writes of its own', () => {
  assert.doesNotMatch(adapterMigrationSql, /INSERT INTO %I\.journal/i)
  assert.doesNotMatch(adapterMigrationSql, /CREATE TABLE/i)
})

// ── Idempotency chain across both migrations ──

test('ingest idempotency derivation matches the adapter idempotency key', () => {
  // Increment 3 RPC derives source_type:source_id:ingest when no key is given;
  // the adapter passes the same shape explicitly.
  assert.ok(sourceTransactionMigrationSql.includes("v_key := v_source_type || ':' || v_source_id || ':ingest'"))
  assert.ok(adapterServiceSource.includes('`${INVOICE_SOURCE_TYPE}:${invoice.id}:ingest`'))
})

test('kernel duplicate idempotency key guard remains the posting backstop', () => {
  const kernelPath = path.join(
    here,
    '../../../supabase/migrations/20260905142503_accounting_persistence.sql',
  )
  const kernelSql = readFileSync(kernelPath, 'utf8')
  assert.ok(kernelSql.includes('CONSTRAINT journal_entries_idempotency_key_key UNIQUE (idempotency_key)'))
  assert.ok(kernelSql.includes("RAISE EXCEPTION 'duplicate idempotency key: %', v_key"))
})

// ── Source type vocabulary ──

test('invoice source type is the declared constant', () => {
  assert.equal(INVOICE_SOURCE_TYPE, 'invoice')
})
