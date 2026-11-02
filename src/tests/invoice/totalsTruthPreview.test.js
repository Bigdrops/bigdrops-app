import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const calculationsPath = path.resolve('src/domain/invoice/calculations.ts')
const previewModelPath = path.resolve('src/domain/invoice/previewModel.ts')
const invoiceActionsPath = path.resolve('src/components/document-view/invoice/invoicePdfActions.ts')
const quotationPreviewModelPath = path.resolve('src/domain/quotation/previewModel.ts')

test('invoice preview model resolves amount in words and keeps balance due separate', () => {
  const source = fs.readFileSync(previewModelPath, 'utf8').replace(/\s+/g, ' ')

  assert.match(source, /buildTotalsProjection\(\{/)
  assert.doesNotMatch(source, /Cash Received/)
  assert.match(source, /buildAmountInWordsProjection\(invoice, pdfOutput, invoiceTotal\)/)
  assert.match(source, /previewBalanceDue: previewBalanceDueRow/)
  assert.match(source, /type: 'group_footer'/)
})

test('invoice download transports preview totals and amount in words', () => {
  const source = fs.readFileSync(invoiceActionsPath, 'utf8').replace(/\s+/g, ' ')

  assert.match(source, /computeDocument\(\{/)
  assert.match(source, /rows: \(Array\.isArray\(targetPreviewModel\?\.previewTotals\) \? targetPreviewModel\.previewTotals : \[\]\)\.map\(\(row\) => \(\{/)
  assert.match(source, /amountInWords: String\(targetPreviewModel\?\.previewAmountInWords \|\| ""\)/)
  assert.match(source, /balanceDue: targetPreviewModel\?\.previewBalanceDueAmount \?\? null/)
})

test('shared summary rows normalize compatibility extra-charge sources instead of reading custom fields blindly', () => {
  const source = fs.readFileSync(calculationsPath, 'utf8').replace(/\s+/g, ' ')

  assert.match(source, /function resolveExtraCharges\(/)
  assert.match(source, /customFields\?\.extraCharges/)
  assert.match(source, /invoice\?_extraCharges|invoice\?\._extraCharges/)
  assert.match(source, /const extraCharges = resolveExtraCharges\(/)
})

test('quotation preview model builds totals from the shared summary row builder', () => {
  const source = fs.readFileSync(quotationPreviewModelPath, 'utf8').replace(/\s+/g, ' ')

  assert.match(source, /buildSummaryRows\(\{/)
  assert.doesNotMatch(source, /const previewTotals = \[ \{ label: 'Subtotal'/)
  assert.match(source, /buildQuotationPreviewModel\(/)
})
