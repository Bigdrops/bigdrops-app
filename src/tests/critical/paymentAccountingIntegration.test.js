import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  PAYMENT_SOURCE_TYPE,
  buildPaymentAmount,
  buildPaymentSourceTransactionInput,
  buildPaymentSettlementPosting,
  isPaymentVoided,
} from '../../modules/invoices/services/paymentAccountingService.ts'

const here = path.dirname(fileURLToPath(import.meta.url))

const paymentServicePath = path.join(here, '../../modules/invoices/services/paymentService.ts')
const paymentAdapterPath = path.join(here, '../../modules/invoices/services/paymentAccountingService.ts')

const paymentServiceSource = readFileSync(paymentServicePath, 'utf8')
const paymentAdapterSource = readFileSync(paymentAdapterPath, 'utf8')

const INVOICE_ID = '11111111-1111-1111-1111-111111111111'
const PAYMENT_ID = '22222222-2222-2222-2222-222222222222'

/** Full-amount payment: 10000 cash received, 500 WHT deducted, 10500 settled. */
const samplePayment = {
  id: PAYMENT_ID,
  invoice_id: INVOICE_ID,
  cash_amount: 10000,
  wht_amount: 500,
  amount: 10500,
  date: '2026-09-06',
  method: 'Transfer',
  reference: 'TRF-001',
  bank_account_id: null,
}

// ── Accounting event: amount normalization ──

test('buildPaymentAmount preserves exact decimal cash amounts as kobo strings', () => {
  assert.equal(buildPaymentAmount('10000'), '10000.00')
  assert.equal(buildPaymentAmount('12500.5'), '12500.50')
  assert.equal(buildPaymentAmount('2500.05'), '2500.05')
  assert.equal(buildPaymentAmount(0.1), '0.10')
})

test('buildPaymentAmount applies Decimal ROUND_HALF_UP without float drift', () => {
  assert.equal(buildPaymentAmount('0.145'), '0.15')
  assert.equal(buildPaymentAmount('19.999'), '20.00')
})

test('buildPaymentAmount rejects missing, malformed, zero, and negative amounts', () => {
  assert.throws(() => buildPaymentAmount(null), /positive amount|missing/i)
  assert.throws(() => buildPaymentAmount(undefined), /positive amount|missing/i)
  assert.throws(() => buildPaymentAmount(''), /positive amount|missing/i)
  assert.throws(() => buildPaymentAmount('abc'), /valid amount|positive/i)
  assert.throws(() => buildPaymentAmount('0'), /positive amount|missing/i)
  assert.throws(() => buildPaymentAmount('-5'), /positive amount|valid amount/i)
})

// ── Provenance: payment identity, never invoice identity ──

test('source transaction payload uses payment id provenance and derived idempotency key', () => {
  const input = buildPaymentSourceTransactionInput(samplePayment)
  assert.equal(input.sourceType, 'payment')
  assert.equal(input.sourceId, PAYMENT_ID)
  assert.equal(input.idempotencyKey, `payment:${PAYMENT_ID}:ingest`)
  assert.equal(input.transactionDate, '2026-09-06')
  assert.equal(input.currencyCode, 'NGN')
  assert.equal(input.counterpartyType, 'customer')
})

test('ingest amount is the cash received, never the gross settlement total', () => {
  const input = buildPaymentSourceTransactionInput(samplePayment)
  assert.equal(input.amount, '10000.00')
  assert.notEqual(input.amount, '10500.00')
})

test('multiple payments against one invoice get distinct provenance and idempotency keys', () => {
  const first = buildPaymentSourceTransactionInput(samplePayment)
  const second = buildPaymentSourceTransactionInput({ ...samplePayment, id: '33333333-3333-3333-3333-333333333333' })
  assert.notEqual(first.sourceId, second.sourceId)
  assert.notEqual(first.idempotencyKey, second.idempotencyKey)
  assert.equal(first.sourceType, second.sourceType)
})

test('builder output is deterministic for the same payment (safe re-delivery)', () => {
  const a = buildPaymentSourceTransactionInput(samplePayment)
  const b = buildPaymentSourceTransactionInput(samplePayment)
  assert.deepEqual(a, b)
  const postingA = buildPaymentSettlementPosting(samplePayment)
  const postingB = buildPaymentSettlementPosting(samplePayment)
  assert.deepEqual(postingA, postingB)
})

test('missing payment date falls back to an ISO today date', () => {
  const input = buildPaymentSourceTransactionInput({ ...samplePayment, date: '' })
  assert.match(input.transactionDate, /^\d{4}-\d{2}-\d{2}$/)
})

// ── Settlement posting: settle the receivable, never revenue ──

test('settlement posting debits bank and credits accounts receivable with the exact cash amount', () => {
  const posting = buildPaymentSettlementPosting(samplePayment)
  assert.equal(posting.lines.length, 2)
  const [debit, credit] = posting.lines
  assert.equal(debit.account_code, '1100')
  assert.equal(debit.side, 'debit')
  assert.equal(debit.amount, '10000.00')
  assert.equal(credit.account_code, '1200')
  assert.equal(credit.side, 'credit')
  assert.equal(credit.amount, '10000.00')
  assert.equal(debit.amount, credit.amount)
})

test('settlement posting never credits revenue', () => {
  const posting = buildPaymentSettlementPosting(samplePayment)
  const revenueLines = posting.lines.filter((line) => line.account_code === '4000')
  assert.equal(revenueLines.length, 0)
})

test('settlement posting never touches WHT control', () => {
  const posting = buildPaymentSettlementPosting(samplePayment)
  const whtLines = posting.lines.filter((line) => line.account_code === '2200')
  assert.equal(whtLines.length, 0)
})

test('payment with WHT still posts only the cash amount (WHT treatment deferred)', () => {
  assert.equal(samplePayment.wht_amount, 500)
  assert.equal(samplePayment.amount, 10500)
  const posting = buildPaymentSettlementPosting(samplePayment)
  const totalPosted = posting.lines
    .filter((line) => line.side === 'credit')
    .reduce((sum, line) => sum + Number(line.amount), 0)
  assert.equal(totalPosted, 10000)
})

// ── Partial payments ──

test('partial payment settles only the actual cash received', () => {
  const partial = { ...samplePayment, cash_amount: 2500, wht_amount: 0, amount: 2500 }
  const posting = buildPaymentSettlementPosting(partial)
  assert.equal(posting.lines[0].amount, '2500.00')
  assert.equal(posting.lines[1].amount, '2500.00')
})

test('partial payment never posts the invoice-scale gross amount', () => {
  const partial = { ...samplePayment, cash_amount: 2500, wht_amount: 0, amount: 10500 }
  const posting = buildPaymentSettlementPosting(partial)
  for (const line of posting.lines) {
    assert.notEqual(line.amount, '10500.00')
  }
})

// ── Voided payments ──

test('voided payments are detected and excluded from accounting', () => {
  assert.equal(isPaymentVoided({ voided_at: '2026-09-06T10:00:00Z' }), true)
  assert.equal(isPaymentVoided({ voided_at: null }), false)
  assert.equal(isPaymentVoided({}), false)
})

// ── Boundary integrity: source-code assertions ──

test('payment adapter never writes journal rows directly', () => {
  assert.ok(!/from\(\s*['"]journal_(entries|lines)['"]/.test(paymentAdapterSource))
  assert.ok(!/insert\s*\(\s*\[?\s*['"]journal_(entries|lines)['"]/.test(paymentAdapterSource))
})

test('payment adapter drives the controlled boundary RPCs in lifecycle order', () => {
  const ingestAt = paymentAdapterSource.indexOf("'ingest_source_transaction'")
  const confirmAt = paymentAdapterSource.indexOf("'confirm_source_transaction'")
  const postAt = paymentAdapterSource.indexOf("'post_from_source_transaction'")
  assert.ok(ingestAt > -1, 'ingest_source_transaction call missing')
  assert.ok(confirmAt > ingestAt, 'confirm_source_transaction must follow ingest')
  assert.ok(postAt > confirmAt, 'post_from_source_transaction must follow confirm')
})

test('payment adapter posts through post_from_source_transaction, not the kernel directly', () => {
  assert.ok(paymentAdapterSource.includes("'post_from_source_transaction'"))
  assert.ok(!paymentAdapterSource.includes("'post_accounting_entry'"))
})

test('payment accounting event is wired only in the entity-aware payment path', () => {
  assert.ok(paymentServiceSource.includes('syncPaymentAccountingEvent'))
  const wireAt = paymentServiceSource.indexOf('syncPaymentAccountingEvent')
  const rpcAt = paymentServiceSource.indexOf("'record_payment_transaction'")
  const legacyAt = paymentServiceSource.indexOf('LEGACY FALLBACK PATH')
  assert.ok(rpcAt > -1, 'record_payment_transaction call missing')
  assert.ok(wireAt > rpcAt, 'accounting event must follow the payment RPC')
  assert.ok(legacyAt > -1, 'legacy fallback marker missing')
  const legacySection = paymentServiceSource.slice(legacyAt)
  assert.ok(!legacySection.includes('syncPaymentAccountingEvent'), 'legacy path must not post accounting')
})

test('payment accounting dispatch never blocks payment recording', () => {
  const wireAt = paymentServiceSource.indexOf('syncPaymentAccountingEvent')
  const afterWire = paymentServiceSource.slice(wireAt, wireAt + 800)
  assert.ok(afterWire.includes('catch'), 'dispatch must be wrapped in try/catch')
})

test('payment adapter is best-effort: failures never propagate to payment recording', () => {
  const syncBody = paymentAdapterSource.slice(
    paymentAdapterSource.indexOf('export async function syncPaymentAccountingEvent'),
  )
  assert.ok(syncBody.includes('catch (error)'))
  assert.ok(syncBody.includes('return {'), 'failures resolve instead of throwing')
})

test('payment adapter reuses the shared open-period resolver (no second implementation)', () => {
  assert.ok(paymentAdapterSource.includes("resolveOpenPeriod } from './invoiceAccountingService'"))
  assert.ok(!/export async function resolveOpenPeriod/.test(paymentAdapterSource))
})
