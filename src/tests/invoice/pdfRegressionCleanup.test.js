import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const previewModelPath = path.resolve('src/domain/invoice/previewModel.ts')
const documentMediaPath = path.resolve('src/domain/documentMedia.js')
const industryStylesPath = path.resolve('src/components/pdf-new/templates/industryStyles.ts')
const industryTemplatePath = path.resolve('src/components/pdf-new/templates/Industry.tsx')
const industryAdapterPath = path.resolve('src/components/pdf-new/industryAdapter.ts')
const tablePath = path.resolve('src/components/pdf-new/table.ts')
const pdfOutputSettingsPath = path.resolve('src/components/PdfOutputSettings.tsx')
const customizeSheetPath = path.resolve('src/components/document-view/shared/PdfOutputCustomizeSheet.tsx')
const invoiceMoreSheetPath = path.resolve('src/components/document-view/invoice/InvoiceMoreSheet.tsx')
const viewInvoicePath = path.resolve('src/pages/ViewInvoice.tsx')
const pdfIndexPath = path.resolve('src/components/pdf-new/index.ts')

test('invoice preview detail rows exclude duplicate title and client header entries', () => {
  const source = fs.readFileSync(previewModelPath, 'utf8')

  assert.doesNotMatch(source, /\{\s*label:\s*'Client'/)
  assert.doesNotMatch(source, /\{\s*label:\s*'Title'/)
  assert.match(source, /\{\s*label:\s*'PO Number'/)
  assert.match(source, /\{\s*label:\s*'Payment Terms'/)
})

test('advance invoices keep the shared totals block and balance due rows', () => {
  const source = fs.readFileSync(previewModelPath, 'utf8').replace(/\s+/g, ' ')

  assert.match(source, /const previewTotals: PreviewTotalRow\[] = \[ \.\.\.buildSummaryRows\(\{/)
  assert.doesNotMatch(source, /Contract Value/)
  assert.doesNotMatch(source, /This Advance/)
  assert.match(source, /previewBalanceDue: pdfOutput\?\.showBalanceDue === false \? null : \{/)
  assert.match(source, /previewBalanceDueAmount: pdfOutput\?\.showBalanceDue === false \? null : balanceDue/)
})

test('merged qty and unit render as a tight single token', () => {
  const source = fs.readFileSync(documentMediaPath, 'utf8')

  assert.match(source, /return `\$\{quantityText\}\$\{unitText\}`/)
  assert.doesNotMatch(source, /\\u00A0/)
})

test('industry pdf header keeps a wider logo and stable horizontal meta layout', () => {
  const source = fs.readFileSync(industryStylesPath, 'utf8')

  assert.match(source, /headerRight:\s*\{[^}]*width:\s*96/s)
  assert.match(source, /logo:\s*\{[^}]*width:\s*86,[^}]*height:\s*86/s)
  assert.match(source, /metaLabel:\s*\{[^}]*flexShrink:\s*0/s)
  assert.match(source, /metaValue:\s*\{[^}]*flexShrink:\s*1/s)
})

test('advance invoice summary renders after the shared totals block', () => {
  const source = fs.readFileSync(industryTemplatePath, 'utf8')

  assert.ok(source.indexOf('{data.totals.mainLine ? (') < source.indexOf('{data.advanceSummary ? ('), 'advance summary should render after the main totals block')
  assert.ok(source.indexOf('{data.totals.balanceDue ? (') < source.indexOf('{data.advanceSummary ? ('), 'advance summary should render after balance due handling')
})

test('industry adapter removes duplicated standard metadata from custom header fields', () => {
  const source = fs.readFileSync(industryAdapterPath, 'utf8')

  assert.match(source, /const standardHeaderLabels = new Set\(\[/)
  assert.match(source, /normalizeHeaderLabel\('PO Number'\)/)
  assert.match(source, /customHeaderFields: \(model\.headerFields \|\| \[\]\)\.filter\(\(field\) => !standardHeaderLabels\.has\(normalizeHeaderLabel\(field\.label\)\)\)/)
})

test('advance invoice pdf removes balance due while keeping the shared totals lines', () => {
  const source = fs.readFileSync(industryAdapterPath, 'utf8').replace(/\s+/g, ' ')

  assert.match(source, /const isAdvanceDocument = Boolean\(model\.totals\.advanceSummary\)/)
  assert.match(source, /balanceDue: !isAdvanceDocument && model\.totals\.balanceDue !== null && model\.totals\.balanceDue !== undefined/)
})

test('merged qty and unit column gets extra width in pdf table settings', () => {
  const source = fs.readFileSync(tablePath, 'utf8')

  assert.match(source, /label: 'Qty'/)
  assert.match(source, /pdfWidth: 76/)
  assert.match(source, /pdfFlex: 0/)
})

test('document settings use Document options instead of Advanced Options', () => {
  const source = fs.readFileSync(pdfOutputSettingsPath, 'utf8')

  assert.match(source, /Document options/)
  assert.doesNotMatch(source, /Advanced Options/)
})

test('customize sheet supports design-only mode for the paint popup', () => {
  const source = fs.readFileSync(customizeSheetPath, 'utf8')

  assert.match(source, /designOnly\?: boolean/)
  assert.match(source, /!designOnly \? \(/)
  assert.match(source, /<PdfDocumentOptionsCard/)
})

test('invoice customize sheet includes industry, civicslate, and naijabiz template picker options', () => {
  const source = fs.readFileSync(customizeSheetPath, 'utf8')

  assert.match(source, /INVOICE_PDF_TEMPLATE_OPTIONS/)
  assert.match(source, /id: 'industry'/)
  assert.match(source, /id: 'civicslate'/)
  assert.match(source, /id: 'naijabiz'/)
  assert.match(source, /setDraftTemplateId\(option\.id\)/)
})

test('view invoice page exposes bank controls and document options below the preview', () => {
  const source = fs.readFileSync(viewInvoicePath, 'utf8')

  assert.match(source, /previewControls=\{/)
  assert.match(source, /<PdfBankControls/)
  assert.match(source, /<PdfDocumentOptionsCard/)
  assert.match(source, /designOnly/)
})

test('view invoice saves and reuses the selected pdf template id', () => {
  const source = fs.readFileSync(viewInvoicePath, 'utf8')

  assert.match(source, /isInvoicePdfTemplateId\(customFields\?\.pdfTemplateId\) \? customFields\.pdfTemplateId : 'industry'/)
  assert.match(source, /pdfTemplateId: nextTemplateId/)
  assert.match(source, /templateId=\{pdfTemplateId\}/)
  assert.match(source, /templateId: targetTemplateId/)
})

test('view invoice actions include the qty plus unit merge toggle with persistent state', () => {
  const source = fs.readFileSync(invoiceMoreSheetPath, 'utf8')

  assert.match(source, /id: 'qty-unit-merge'/)
  assert.match(source, /closeOnClick: false/)
  assert.match(source, /statusLabel: mergeQtyUnit \? 'On' : 'Off'/)
})

test('pdf generation can switch invoice output to civicslate and naijabiz', () => {
  const source = fs.readFileSync(pdfIndexPath, 'utf8')

  assert.match(source, /import\('\.\/templates\/Civicslate'\)/)
  assert.match(source, /import\('\.\/templates\/Naijabiz'\)/)
  assert.match(source, /case 'civicslate':/)
  assert.match(source, /case 'naijabiz':/)
})
