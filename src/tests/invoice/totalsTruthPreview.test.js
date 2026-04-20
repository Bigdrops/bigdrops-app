import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const calculationsPath = path.resolve('src/domain/invoice/calculations.ts')
const previewModelPath = path.resolve('src/domain/invoice/previewModel.ts')
const viewInvoicePath = path.resolve('src/pages/ViewInvoice.tsx')
const viewQuotationPath = path.resolve('src/pages/ViewQuotation.tsx')

test('invoice preview model builds totals from the shared summary row builder and keeps balance due separate', () => {
  const source = fs.readFileSync(previewModelPath, 'utf8').replace(/\s+/g, ' ')

  assert.match(source, /buildSummaryRows\(\{/)
  assert.doesNotMatch(source, /Cash Received/)
  assert.match(source, /previewAmountInWords: String\(invoice\.amount_in_words \|\| ''\)/)
  assert.match(source, /previewBalanceDue: advanceSummary \|\| pdfOutput\?\.showBalanceDue === false \? null : \{/)
})

test('invoice totals source is recomputed from current document fields before preview and pdf generation', () => {
  const source = fs.readFileSync(viewInvoicePath, 'utf8').replace(/\s+/g, ' ')

  assert.match(source, /computeDocument\(\{/)
  assert.match(source, /rows: \(Array\.isArray\(previewModel\?\.previewTotals\) \? previewModel\.previewTotals : \[\]\)\.map\(\(row\) => \(\{/)
  assert.match(source, /amountInWords: String\(previewModel\?\.previewAmountInWords \|\| ''\)/)
  assert.match(source, /balanceDue: previewModel\?\.previewBalanceDueAmount \?\? null/)
})

test('shared summary rows normalize compatibility extra-charge sources instead of reading custom fields blindly', () => {
  const source = fs.readFileSync(calculationsPath, 'utf8').replace(/\s+/g, ' ')

  assert.match(source, /function resolveExtraCharges\(/)
  assert.match(source, /customFields\?\.extraCharges/)
  assert.match(source, /invoice\?_extraCharges|invoice\?\._extraCharges/)
  assert.match(source, /const extraCharges = resolveExtraCharges\(/)
})

test('quotation view page builds preview totals from the shared summary row builder', () => {
  const source = fs.readFileSync(viewQuotationPath, 'utf8').replace(/\s+/g, ' ')

  assert.match(source, /buildSummaryRows\(\{/)
  assert.doesNotMatch(source, /const previewTotals = \[ \{ label: 'Subtotal'/)
})
