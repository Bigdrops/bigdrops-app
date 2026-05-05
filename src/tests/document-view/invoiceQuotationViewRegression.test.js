import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf8').replace(/\s+/g, ' ')

test('quotation view passes a live preview model, avoids raw id hero tags, and keeps footer clearance', () => {
  const viewQuotationSource = read('src/pages/ViewQuotation.tsx')
  const quotationViewPageSource = read('src/components/document-view/quotation/QuotationViewPage.tsx')
  const quotationViewCss = read('src/components/document-view/quotation/QuotationViewPage.module.css')

  assert.match(viewQuotationSource, /const quotationPreviewModel = useMemo\(\(\) => \(\{/)
  assert.match(viewQuotationSource, /previewModel=\{quotationPreviewModel\}/)
  assert.doesNotMatch(viewQuotationSource, /previewModel=\{quotation\}/)
  assert.doesNotMatch(viewQuotationSource, /quotation\.id\?\.slice\(0,\s*8\)/)
  assert.doesNotMatch(quotationViewPageSource, /QuotationMoneyStrip/)
  assert.match(quotationViewCss, /padding-bottom:\s*calc\(/)
})

test('invoice view no longer uses legacy Tax Invoice fallback or top money-strip metrics', () => {
  const viewInvoiceSource = read('src/pages/ViewInvoice.tsx')
  const invoiceHeroSource = read('src/components/document-view/invoice/InvoiceFidelityPrimitives.tsx')

  assert.doesNotMatch(viewInvoiceSource, /subtitle=\{invoice\.invoice_title \|\| 'Tax Invoice'\}/)
  assert.match(viewInvoiceSource, /subtitle=\{invoice\.invoice_title \|\| 'Invoice'\}/)
  assert.match(viewInvoiceSource, /metrics=\{\[\]\}/)
  assert.match(invoiceHeroSource, /guardedMetrics\.length > 0 \? \(/)
})
