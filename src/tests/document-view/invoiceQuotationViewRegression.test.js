import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf8').replace(/\s+/g, ' ')

test('quotation view passes a live preview model, restores real support sections, avoids raw id hero tags, and keeps footer clearance', () => {
  const viewQuotationSource = read('src/pages/ViewQuotation.tsx')
  const quotationViewPageSource = read('src/components/document-view/quotation/QuotationViewPage.tsx')
  const quotationViewCss = read('src/components/document-view/quotation/QuotationViewPage.module.css')

  assert.match(viewQuotationSource, /const quotationPreviewModel = useMemo\(\(\) => \(\{/)
  assert.match(viewQuotationSource, /previewModel=\{quotationPreviewModel\}/)
  assert.match(viewQuotationSource, /const relatedDocuments = useMemo<RelatedDocumentItem\[\]>/)
  assert.match(viewQuotationSource, /<PdfBankControls/)
  assert.match(viewQuotationSource, /<PdfDocumentOptionsCard/)
  assert.match(viewQuotationSource, /<AuditTrailPanel/)
  assert.match(viewQuotationSource, /attachments=\{quotationAttachments\}/)
  assert.doesNotMatch(viewQuotationSource, /previewModel=\{quotation\}/)
  assert.doesNotMatch(viewQuotationSource, /quotation\.id\?\.slice\(0,\s*8\)/)
  assert.doesNotMatch(quotationViewPageSource, /QuotationMoneyStrip/)
  assert.match(quotationViewPageSource, /<DocumentRelatedDocsSection items=\{guardedRelatedDocuments\} \/>/)
  assert.match(quotationViewPageSource, /<SupportingSection title="Attachments">/)
  assert.match(quotationViewCss, /\.supportingArea/)
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

test('download actions stay icon-only and invoice-quotation chrome stays in parity', () => {
  const floatingButtonSource = read('src/components/document-view/shared/FloatingDownloadButton.tsx')
  const quotationPrimaryActionsSource = read('src/components/document-view/quotation/QuotationPrimaryActions.tsx')
  const quotationViewPageSource = read('src/components/document-view/quotation/QuotationViewPage.tsx')
  const viewQuotationSource = read('src/pages/ViewQuotation.tsx')
  const viewInvoiceSource = read('src/pages/ViewInvoice.tsx')
  const invoiceViewPageSource = read('src/components/document-view/invoice/InvoiceViewPage.tsx')
  const invoiceHeroSource = read('src/components/document-view/invoice/InvoiceFidelityPrimitives.tsx')
  const invoiceHeroCss = read('src/components/document-view/invoice/InvoicePresentation.module.css')
  const sharedHeroCss = read('src/components/document-view/shared/DocumentHero.module.css')

  assert.doesNotMatch(floatingButtonSource, /<Download[^>]*\/>\s*\{label\}/)
  assert.match(floatingButtonSource, /aria-label=\{accessibleLabel\}/)
  assert.match(floatingButtonSource, /title=\{accessibleLabel\}/)
  assert.match(floatingButtonSource, /className=\{styles\.srOnly\}/)

  assert.match(quotationPrimaryActionsSource, /onDownload: \(\) => void/)
  assert.doesNotMatch(quotationPrimaryActionsSource, /Duplicate/)
  assert.match(quotationPrimaryActionsSource, /title="Download PDF"/)
  assert.match(quotationPrimaryActionsSource, /aria-label="Download PDF"/)

  assert.match(quotationViewPageSource, /<QuotationPrimaryActions onConvert=\{onConvert\} onEdit=\{onEdit\} onDownload=\{onDownload\} \/>/)
  assert.match(viewQuotationSource, /onDownload=\{\(\) => void handleDownload\(\)\}/)
  assert.match(invoiceViewPageSource, /title="Download PDF"/)
  assert.match(invoiceViewPageSource, /aria-label="Download PDF"/)

  assert.match(invoiceHeroSource, /import heroStyles from '..\/shared\/DocumentHero\.module\.css'/)
  assert.match(invoiceHeroSource, /heroStyles\.title/)
  assert.match(invoiceHeroCss, /\.heroNumberMeta/)
  assert.match(sharedHeroCss, /\.title/)
})
