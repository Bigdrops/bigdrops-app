import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  INVOICE_PDF_TEMPLATE_IDS,
  normalizeInvoicePdfTemplateId,
  isInvoicePdfTemplateId,
} from '../../domain/invoice/types'

test('INVOICE_PDF_TEMPLATE_IDS includes dual Industry options and retained commercial templates', () => {
  assert.ok(isInvoicePdfTemplateId('industry'))
  assert.ok(isInvoicePdfTemplateId('industry-forme'))
  assert.ok(isInvoicePdfTemplateId('industry-react-pdf'))
  assert.ok(isInvoicePdfTemplateId('crest'))
  assert.ok(isInvoicePdfTemplateId('minimal'))
  assert.ok(isInvoicePdfTemplateId('evergreen'))

  assert.equal(isInvoicePdfTemplateId('bolt'), false)
  assert.equal(isInvoicePdfTemplateId('ledger'), false)
  assert.equal(isInvoicePdfTemplateId('ember'), false)

  assert.equal(normalizeInvoicePdfTemplateId('industry'), 'industry')
  assert.equal(normalizeInvoicePdfTemplateId('industry-forme'), 'industry')
  assert.equal(normalizeInvoicePdfTemplateId('industry-react-pdf'), 'industry-react-pdf')
  assert.equal(normalizeInvoicePdfTemplateId('crest'), 'crest')
  assert.equal(normalizeInvoicePdfTemplateId('minimal'), 'minimal')
  assert.equal(normalizeInvoicePdfTemplateId('evergreen'), 'evergreen')
  assert.equal(normalizeInvoicePdfTemplateId('bolt'), null)
})

test('CommercialTemplatePicker exposes exact required labels and IDs', () => {
  const filePath = path.resolve('src/components/document-view/shared/CommercialTemplatePicker.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.match(content, /label:\s*['"]Industry — Forme['"]/)
  assert.match(content, /label:\s*['"]Industry — React-PDF['"]/)
  assert.match(content, /id:\s*['"]industry['"]/)
  assert.match(content, /id:\s*['"]industry-react-pdf['"]/)
  assert.match(content, /id:\s*['"]crest['"]/)
  assert.match(content, /id:\s*['"]minimal['"]/)
  assert.match(content, /id:\s*['"]evergreen['"]/)
  assert.match(content, /value === 'industry-forme'\s*\?\s*'industry'\s*:\s*value/)
})

test('DocumentDesignControls configures previews for both Industry renderer choices', () => {
  const filePath = path.resolve('src/components/document/DocumentDesignControls.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.match(content, /['"]?industry['"]?\s*:\s*\{/)
  assert.match(content, /['"]industry-forme['"]\s*:\s*\{/)
  assert.match(content, /['"]industry-react-pdf['"]\s*:\s*\{/)
})

test('PDFCN deterministic resolver resolves Industry Forme for Invoice and Quotation', async () => {
  const { resolvePdfcnDocument } = await import('../../components/pdf/pdfcn')
  const { registerCommercialPdfcnTemplates } = await import('../../components/pdf/pdfcn/commercial')
  registerCommercialPdfcnTemplates()

  const dummyDoc = {
    identity: { id: 'd-1', kind: 'invoice', number: 'INV-100', title: 'Invoice' },
    items: [],
    totals: { rows: [] },
  }

  // Canonical 'industry' template ID
  const resIndustry = resolvePdfcnDocument({
    documentType: 'invoice',
    templateId: 'industry',
    rawDocument: dummyDoc as any,
  })
  assert.equal(resIndustry.success, true)
  assert.equal(resIndustry.envelope?.templateId, 'industry')

  // Explicit 'industry-forme' template ID
  const resForme = resolvePdfcnDocument({
    documentType: 'invoice',
    templateId: 'industry-forme',
    rawDocument: dummyDoc as any,
  })
  assert.equal(resForme.success, true)
  assert.equal(resForme.envelope?.templateId, 'industry-forme')

  // 'industry-react-pdf' is NOT a PDFCN Forme template
  const resReactPdf = resolvePdfcnDocument({
    documentType: 'invoice',
    templateId: 'industry-react-pdf',
    rawDocument: dummyDoc as any,
  })
  assert.equal(resReactPdf.success, false)
})

test('generatePdf enforces routing logic between Forme and React-PDF', () => {
  const indexPath = path.resolve('src/components/pdf/index.ts')
  const indexContent = fs.readFileSync(indexPath, 'utf8')

  // Verifies explicit non-overridable routing
  assert.match(indexContent, /isExplicitReactPdf\s*=\s*activeTemplateId === 'industry-react-pdf'/)
  assert.match(indexContent, /isExplicitForme\s*=\s*activeTemplateId === 'industry-forme'/)
  assert.match(indexContent, /shouldUseForme\s*=/)
  assert.match(indexContent, /case 'industry-react-pdf':/)
})
