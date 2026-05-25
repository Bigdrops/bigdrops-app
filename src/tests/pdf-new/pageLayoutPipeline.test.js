import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const tablePath = path.resolve('src/components/pdf-new/table.ts')
const typesPath = path.resolve('src/components/pdf-new/types.ts')
const adapterPath = path.resolve('src/components/pdf-new/industryAdapter.ts')
const invoiceDownloadPath = path.resolve('src/components/document-view/invoice/invoicePdfActions.ts')
const quotationDownloadPath = path.resolve('src/domain/quotation/pdfDownloadHandler.ts')
const invoicePreviewPath = path.resolve('src/components/document-view/invoice/InvoiceDocumentCard.tsx')
const quotationPreviewPath = path.resolve('src/components/document-view/quotation/QuotationDocumentPreview.tsx')
const invoicePreviewCssPath = path.resolve('src/components/document-view/shared/DocumentPreview.module.css')
const quotationPreviewCssPath = path.resolve('src/components/document-view/quotation/QuotationDocumentPreview.css')

const templatePaths = [
  path.resolve('src/components/pdf-new/templates/Industry.tsx'),
  path.resolve('src/components/pdf-new/templates/Ledger.tsx'),
  path.resolve('src/components/pdf-new/templates/Apex.tsx'),
  path.resolve('src/components/pdf-new/templates/Bolt.tsx'),
  path.resolve('src/components/pdf-new/templates/ObsidianReceipt.tsx'),
]

test('table settings expose the computed pdf page layout', () => {
  const tableSource = fs.readFileSync(tablePath, 'utf8').replace(/\s+/g, ' ')
  const typesSource = fs.readFileSync(typesPath, 'utf8')

  assert.match(typesSource, /pageLayout:\s*PdfPageLayout/)
  assert.match(typesSource, /pageLayout\?:\s*PdfPageLayout\s*\|\s*null/)
  assert.match(tableSource, /pageLayout:\s*resolvePdfPageLayout\(resultColumns\)/)
})

test('download builders pass resolved page layout into the pdf model', () => {
  const invoiceSource = fs.readFileSync(invoiceDownloadPath, 'utf8')
  const quotationSource = fs.readFileSync(quotationDownloadPath, 'utf8')

  assert.match(invoiceSource, /pageLayout:\s*resolvedTable\.pageLayout/)
  assert.match(quotationSource, /pageLayout:\s*resolvedTable\.pageLayout/)
})

test('pdf adapter and templates use model layout instead of hardcoded portrait pages', () => {
  const adapterSource = fs.readFileSync(adapterPath, 'utf8').replace(/\s+/g, ' ')

  assert.match(adapterSource, /layout:\s*model\.pageLayout\s*\|\|\s*\{\s*size:\s*'A4',\s*orientation:\s*'portrait'\s*\}/)

  for (const templatePath of templatePaths) {
    const source = fs.readFileSync(templatePath, 'utf8').replace(/\s+/g, ' ')
    assert.match(source, /<Page size=\{data\.layout\?\.size \|\| ['"]A4['"]\} orientation=\{data\.layout\?\.orientation \|\| ['"]portrait['"]\}/, templatePath)
  }
})

test('live invoice and quotation previews expose landscape orientation to css', () => {
  const invoiceSource = fs.readFileSync(invoicePreviewPath, 'utf8')
  const quotationSource = fs.readFileSync(quotationPreviewPath, 'utf8')
  const invoiceCssSource = fs.readFileSync(invoicePreviewCssPath, 'utf8')
  const quotationCssSource = fs.readFileSync(quotationPreviewCssPath, 'utf8')

  assert.match(invoiceSource, /data-orientation=\{previewModel\?\.pageLayout\?\.orientation \|\| "portrait"\}/)
  assert.match(quotationSource, /data-orientation=\{previewModel\?\.pageLayout\?\.orientation \|\| 'portrait'\}/)
  assert.match(invoiceCssSource, /\.invCard\[data-orientation="landscape"\]/)
  assert.match(quotationCssSource, /\.quotationDocumentPreview\[data-orientation="landscape"\]/)
})
