import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const invoicePreviewPath = path.resolve('src/domain/invoice/previewModel.ts')
const quotationPreviewPath = path.resolve('src/domain/quotation/previewModel.ts')
const invoiceCardPath = path.resolve('src/components/document-view/invoice/InvoiceDocumentCard.tsx')

test('invoice preview model uses the shared pdf table interpreter and industry structural pass', () => {
  const source = fs.readFileSync(invoicePreviewPath, 'utf8').replace(/\s+/g, ' ')

  assert.match(source, /interpretPdfTableSettings/)
  assert.match(source, /adaptPdfTemplateData/)
  assert.match(source, /hideEmptyGroups/)
  assert.match(source, /previewItems: buildInvoicePreviewItems\(/)
})

test('quotation preview model uses the shared pdf table interpreter and industry structural pass', () => {
  const source = fs.readFileSync(quotationPreviewPath, 'utf8').replace(/\s+/g, ' ')

  assert.match(source, /interpretPdfTableSettings/)
  assert.match(source, /adaptPdfTemplateData/)
  assert.match(source, /hideEmptyGroups/)
  assert.match(source, /previewItems: buildQuotationPreviewItems\(/)
})

test('invoice document preview renders synchronized preview items instead of raw line items', () => {
  const source = fs.readFileSync(invoiceCardPath, 'utf8')

  assert.match(source, /previewModel\?\.previewItems/)
  assert.match(source, /item\?\.(type|rowType) === ["']group/)
  assert.doesNotMatch(source, /items\.map\(\(item, index\) =>/)
})
