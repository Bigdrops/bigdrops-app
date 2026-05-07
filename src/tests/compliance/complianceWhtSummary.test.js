import test from 'node:test'
import assert from 'node:assert/strict'

import { summarizeComplianceWht } from '../../domain/compliance/whtSummary.ts'

test('invoices with WHT but no payments keep expected exposure above zero and actual awaiting receipt at zero', () => {
  const result = summarizeComplianceWht(
    [{ wht: 15 }, { wht: 5 }],
    [],
    [],
  )

  assert.equal(result.expectedWhtAmount, 20)
  assert.equal(result.expectedWhtInvoiceCount, 2)
  assert.equal(result.actualWhtAwaitingReceiptAmount, 0)
  assert.equal(result.actualWhtPaymentCount, 0)
})

test('payments with WHT and no receipts count as actual awaiting receipt', () => {
  const result = summarizeComplianceWht(
    [],
    [{ id: 'pay-1', wht_amount: 12 }],
    [],
  )

  assert.equal(result.expectedWhtAmount, 0)
  assert.equal(result.actualWhtAwaitingReceiptAmount, 12)
  assert.equal(result.actualWhtPaymentCount, 1)
})

test('verified WHT receipts are excluded from awaiting receipt totals', () => {
  const result = summarizeComplianceWht(
    [],
    [{ id: 'pay-1', wht_amount: 18 }],
    [
      {
        id: 'receipt-1',
        payment_id: 'pay-1',
        invoice_id: null,
        client_name: null,
        gross_base_amount: null,
        wht_rate: null,
        wht_amount: 18,
        receipt_status: 'verified',
        receipt_number: null,
        receipt_file_url: null,
        received_at: null,
        notes: null,
        created_at: '',
        updated_at: '',
      },
    ],
  )

  assert.equal(result.actualWhtAwaitingReceiptAmount, 0)
  assert.equal(result.actualWhtPaymentCount, 0)
})

test('null invoice and payment WHT values are treated as zero', () => {
  const result = summarizeComplianceWht(
    [{ wht: null }, {}],
    [{ id: 'pay-1', wht_amount: null }],
    [],
  )

  assert.equal(result.expectedWhtAmount, 0)
  assert.equal(result.expectedWhtInvoiceCount, 0)
  assert.equal(result.actualWhtAwaitingReceiptAmount, 0)
  assert.equal(result.actualWhtPaymentCount, 0)
})
