import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  INVOICE_PDF_TEMPLATE_IDS,
  normalizeInvoicePdfTemplateId,
  isInvoicePdfTemplateId,
} from '../../domain/invoice/types'

test('INVOICE_PDF_TEMPLATE_IDS includes Industrial, Industry, Forme templates and Evergreen', () => {
  assert.ok(isInvoicePdfTemplateId('industrial'))
  assert.ok(isInvoicePdfTemplateId('industry'))
  assert.ok(isInvoicePdfTemplateId('industry-forme'))
  assert.equal(isInvoicePdfTemplateId('industry-react-pdf'), false, 'Industry React-PDF is retired')
  assert.ok(isInvoicePdfTemplateId('landscape'))
  assert.equal(isInvoicePdfTemplateId('crest'), false, 'Crest is retired')
  assert.ok(isInvoicePdfTemplateId('minimal'))
  assert.ok(isInvoicePdfTemplateId('evergreen'))

  assert.equal(isInvoicePdfTemplateId('modern-minimal'), false, 'Modern Minimal is retired')
  assert.equal(isInvoicePdfTemplateId('bolt'), false)
  assert.equal(isInvoicePdfTemplateId('ledger'), false)
  assert.equal(isInvoicePdfTemplateId('ember'), false)

  assert.equal(normalizeInvoicePdfTemplateId('industrial'), 'industrial')
  assert.equal(normalizeInvoicePdfTemplateId('industry'), 'industry')
  assert.equal(normalizeInvoicePdfTemplateId('industry-forme'), 'industry')
  assert.equal(normalizeInvoicePdfTemplateId('industry-react-pdf'), 'industry', 'Retired Industry React-PDF falls back to Industry')
  assert.equal(normalizeInvoicePdfTemplateId('landscape'), 'landscape')
  assert.equal(normalizeInvoicePdfTemplateId('modern-minimal'), 'minimal', 'Retired selections continue as Minimal')
  assert.equal(normalizeInvoicePdfTemplateId('crest'), null, 'Retired Crest normalizes to null')
  assert.equal(normalizeInvoicePdfTemplateId('minimal'), 'minimal')
  assert.equal(normalizeInvoicePdfTemplateId('evergreen'), 'evergreen')
  assert.equal(normalizeInvoicePdfTemplateId('bolt'), null)
})

test('CommercialTemplatePicker exposes exact required labels and IDs without retired templates', () => {
  const filePath = path.resolve('src/components/document-view/shared/CommercialTemplatePicker.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.match(content, /label:\s*['"]Industry — Forme['"]/)
  assert.doesNotMatch(content, /label:\s*['"]Industry — React-PDF['"]/)
  assert.match(content, /label:\s*['"]Minimal — Forme['"]/)
  assert.match(content, /id:\s*['"]industry['"]/)
  assert.doesNotMatch(content, /id:\s*['"]industry-react-pdf['"]/)
  assert.doesNotMatch(content, /id:\s*['"]crest['"]/)
  assert.match(content, /id:\s*['"]minimal['"]/)
  assert.match(content, /id:\s*['"]evergreen['"]/)
  assert.doesNotMatch(content, /id:\s*['"]modern-minimal['"]/, 'Retired Modern Minimal must leave the picker')
  assert.match(content, /value === 'industry-forme'\s*\?\s*'industry'\s*:\s*value/)
})

test('DocumentDesignControls configures previews for Industry renderer', () => {
  const filePath = path.resolve('src/components/document/DocumentDesignControls.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.match(content, /['"]?industry['"]?\s*:\s*\{/)
  assert.match(content, /['"]industry-forme['"]\s*:\s*\{/)
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

test('resolveCommercialPdfRoute keeps Industrial Forme, Industry Forme and retained templates deterministic', async () => {
  const { resolveCommercialPdfRoute } = await import('../../components/pdf')

  assert.equal(resolveCommercialPdfRoute('industrial'), 'industrial-forme')
  assert.equal(resolveCommercialPdfRoute('industrial', 'react-pdf'), 'industrial-forme', 'Industrial always uses Forme')

  assert.equal(resolveCommercialPdfRoute('industry'), 'industry-forme')
  assert.equal(resolveCommercialPdfRoute('industry', 'forme'), 'industry-forme')
  assert.equal(resolveCommercialPdfRoute('industry-forme'), 'industry-forme', 'Explicit Forme normalises to industry and stays Forme')
  assert.equal(resolveCommercialPdfRoute('industry-react-pdf'), 'industry-forme', 'Retired Industry React-PDF routes to Industry Forme')

  assert.equal(resolveCommercialPdfRoute('evergreen'), 'evergreen-forme')
  assert.equal(resolveCommercialPdfRoute('evergreen', 'forme'), 'evergreen-forme')
  assert.equal(resolveCommercialPdfRoute('evergreen', 'react-pdf'), 'evergreen-forme', 'Evergreen is Forme-only')
  assert.equal(resolveCommercialPdfRoute('crest'), 'industry-forme', 'Retired Crest routes to Industry Forme default')

  assert.equal(resolveCommercialPdfRoute('landscape'), 'landscape-forme')
  assert.equal(resolveCommercialPdfRoute('landscape', 'forme'), 'landscape-forme')
  assert.equal(resolveCommercialPdfRoute('landscape', 'react-pdf'), 'landscape-forme', 'Landscape is Forme-only')

  assert.equal(resolveCommercialPdfRoute('minimal'), 'minimal-forme')
  assert.equal(resolveCommercialPdfRoute('minimal', 'forme'), 'minimal-forme')
  assert.equal(resolveCommercialPdfRoute('minimal', 'react-pdf'), 'minimal-forme', 'Minimal is Forme-only')
  assert.equal(resolveCommercialPdfRoute('modern-minimal'), 'minimal-forme', 'Retired Modern Minimal resolves to Minimal')

  assert.equal(resolveCommercialPdfRoute(null), 'industry-forme', 'Missing template ids keep the Industry Forme default')
  assert.equal(resolveCommercialPdfRoute(undefined), 'industry-forme')
  assert.equal(resolveCommercialPdfRoute('bolt'), 'industry-forme', 'Removed template ids fall back to the Industry default')
})
