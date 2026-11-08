import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import { serialize } from '@formepdf/react'

import { IndustryFormeDocument } from '../../components/pdf/forme/IndustryFormeDocument'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import { ensureFormeFontFamily } from '../../components/pdf/forme/fonts'
import {
  INVOICE_PDF_TEMPLATE_IDS,
  normalizeInvoicePdfTemplateId,
} from '../../domain/invoice/types'
import type { CommercialDocumentData } from '../../components/pdf/industryAdapter'

function createSampleCommercialData(): CommercialDocumentData {
  return {
    title: 'INVOICE',
    customTitle: 'Commercial Supply Contract',
    documentNumber: 'INV-2026-0881',
    documentNumberLabel: 'Invoice Number',
    issueDate: '01/11/2026',
    issueDateLabel: 'Issue Date',
    dueDateOrValidityDate: '15/11/2026',
    dueDateOrValidityDateLabel: 'Due Date',
    poNumber: 'PO-99120',
    poNumberLabel: 'PO Number',
    customHeaderFields: [{ label: 'Project Ref', value: 'PRJ-DELTA-44' }],
    showTagline: true,
    showBankDetails: true,
    company: {
      companyLogoUrl: '',
      name: 'BOUXRE Engineering Ltd',
      tagline: 'Reliable Engineering & Energy Solutions',
      address: 'Plot 14 Victoria Island',
      cityState: 'Lagos State',
      phone: '+234 801 234 5678',
      email: 'finance@bouxre.ng',
      website: 'www.bouxre.ng',
      customInfo: [{ label: 'TIN', value: '12345678-0001' }],
    },
    client: {
      name: 'Dangote Industries Ltd',
      attention: 'Chief Procurement Officer',
      address: '1 Alfred Rewane Road',
      cityState: 'Ikoyi, Lagos',
      phone: '+234 802 987 6543',
      email: 'procurement@dangote.com',
    },
    table: {
      columns: [
        { key: 'num', label: '#', align: 'center', width: 28 },
        { key: 'description', label: 'Description', align: 'left' },
        { key: 'quantity', label: 'Qty', align: 'center', width: 48 },
        { key: 'unit_price', label: 'Unit Price', align: 'right', width: 74 },
        { key: 'amount', label: 'Amount', align: 'right', width: 80 },
      ],
      rows: [
        {
          rowType: 'group_header',
          groupName: 'Electrical Power Inverters',
          groupLabel: 'Electrical Power Inverters',
        },
        {
          rowType: 'standard',
          cells: {
            num: '1',
            description: {
              main: 'Schneider Electric 15kVA Solar Inverter',
              sub: 'Three-phase hybrid pure sine wave system',
            },
            quantity: '2',
            unit_price: '₦2,450,000.00',
            amount: '₦4,900,000.00',
          },
        },
        {
          rowType: 'group_footer',
          showSubtotal: true,
          groupSubtotalValue: '₦4,900,000.00',
        },
      ],
    },
    paymentDetails: {
      bankName: 'Access Bank Plc',
      accountName: 'BOUXRE Engineering Ltd',
      accountNumber: '0123456789',
      sortCode: '044150149',
    },
    totals: {
      lines: [
        { label: 'Subtotal', value: '₦4,900,000.00' },
        { label: 'VAT (7.5%)', value: '₦367,500.00' },
      ],
      mainLine: { label: 'Total Due', value: '₦5,267,500.00' },
      amountInWords: 'Five Million Two Hundred And Sixty Seven Thousand Five Hundred Naira Only',
      balanceDue: { label: 'Balance Due', value: '₦5,267,500.00' },
    },
    advanceSummary: null,
    notes: {
      title: 'Notes',
      content: 'Goods supplied in good condition with 2-year warranty.',
      plainText: 'Goods supplied in good condition with 2-year warranty.',
    },
    terms: {
      title: 'Terms & Conditions',
      content: 'Payment is due within 14 calendar days.',
      plainText: 'Payment is due within 14 calendar days.',
    },
    attachments: [{ label: 'Technical Datasheet' }],
    additionalFields: [],
    signature: {
      name: 'Engr. Tunde Bakare',
      role: 'Managing Director',
      imageUrl: null,
    },
    footer: {
      documentNumber: 'INV-2026-0881',
      companyName: 'BOUXRE Engineering Ltd',
      extraText: '',
    },
    layout: { size: 'A4', orientation: 'portrait' },
    design: {
      accentColor: '#1e3a8a',
      textColor: '#0f172a',
      mutedColor: '#475569',
      borderColor: '#cbd5e1',
      surfaceColor: '#f8fafc',
      headerFont: 'Inter',
      bodyFont: 'Inter',
      useCustomFonts: true,
      useCustomColors: true,
    },
  }
}

function extractFormeText(node: any, output: string[] = []): string[] {
  if (node === null || node === undefined) return output
  if (typeof node === 'string') {
    output.push(node)
    return output
  }
  if (Array.isArray(node)) {
    node.forEach((entry) => extractFormeText(entry, output))
    return output
  }
  if (typeof node !== 'object') return output
  const kind = node.kind
  if (kind && typeof kind === 'object') {
    if (typeof kind.content === 'string' && kind.content) output.push(kind.content)
    if (Array.isArray(kind.runs)) {
      kind.runs.forEach((run: any) => {
        if (run && typeof run.content === 'string' && run.content) output.push(run.content)
      })
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'kind') extractFormeText(value, output)
  }
  return output
}

test('Industry Forme document serializes with exact commercial structure and financial content', () => {
  const data = createSampleCommercialData()
  const element = React.createElement(IndustryFormeDocument, { data })
  const tree = serialize(element)

  assert.ok(tree, 'Forme serialized tree must exist')
  assert.ok(Array.isArray(tree.children), 'Forme document must contain children')

  const texts = extractFormeText(tree).join(' ')

  assert.ok(texts.includes('INVOICE'), 'Document title must be present')
  assert.ok(texts.includes('INV-2026-0881'), 'Document number must be present')
  assert.ok(texts.includes('BOUXRE Engineering Ltd'), 'Company name must be present')
  assert.ok(texts.includes('Dangote Industries Ltd'), 'Client name must be present')
  assert.ok(texts.includes('Schneider Electric 15kVA Solar Inverter'), 'Line item must be present')
  assert.ok(texts.includes('₦4,900,000.00'), 'Line item amount must be present')
  assert.ok(texts.includes('Total Due'), 'Totals main line must be present')
  assert.ok(texts.includes('₦5,267,500.00'), 'Total value must be present')
  assert.ok(texts.includes('Access Bank Plc'), 'Bank name must be present')
  assert.ok(texts.includes('Engr. Tunde Bakare'), 'Signer name must be present')
})

test('Industry Forme document generates valid PDF bytes with approved fonts', async () => {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Archivo Black')
  await ensureFormeFontFamily('Noto Sans')

  const data = createSampleCommercialData()
  const element = React.createElement(IndustryFormeDocument, { data })

  const bytes = await renderPdfcnToBytes(element)

  assert.ok(bytes instanceof Uint8Array, 'Forme must return a Uint8Array')
  assert.ok(bytes.length > 1000, `PDF bytes must be non-empty (got ${bytes.length} bytes)`)

  const header = Buffer.from(bytes.slice(0, 5)).toString('utf8')
  assert.equal(header, '%PDF-', 'PDF bytes must start with standard PDF header')
})

test('Retained commercial templates include Forme options and Evergreen', () => {
  assert.deepStrictEqual(
    [...INVOICE_PDF_TEMPLATE_IDS].sort(),
    ['architectural', 'evergreen', 'executive', 'heritage', 'industrial', 'industry', 'industry-forme', 'landscape', 'minimal'].sort(),
  )

  assert.equal(normalizeInvoicePdfTemplateId('industrial'), 'industrial')
  assert.equal(normalizeInvoicePdfTemplateId('industry'), 'industry')
  assert.equal(normalizeInvoicePdfTemplateId('industry-forme'), 'industry')
  assert.equal(normalizeInvoicePdfTemplateId('industry-react-pdf'), 'industry')
  assert.equal(normalizeInvoicePdfTemplateId('landscape'), 'landscape')
  assert.equal(normalizeInvoicePdfTemplateId('modern-minimal'), 'minimal')
  assert.equal(normalizeInvoicePdfTemplateId('architectural'), 'architectural')
  assert.equal(normalizeInvoicePdfTemplateId('executive'), 'executive')
  assert.equal(normalizeInvoicePdfTemplateId('heritage'), 'heritage')
  assert.equal(normalizeInvoicePdfTemplateId('heritage-house'), 'heritage')
  assert.equal(normalizeInvoicePdfTemplateId('crest'), null)
  assert.equal(normalizeInvoicePdfTemplateId('minimal'), 'minimal')
  assert.equal(normalizeInvoicePdfTemplateId('evergreen'), 'evergreen')

  // Retired templates normalize to null
  assert.equal(normalizeInvoicePdfTemplateId('bolt'), null)
  assert.equal(normalizeInvoicePdfTemplateId('ledger'), null)
  assert.equal(normalizeInvoicePdfTemplateId('ember'), null)
})

test('Master Deterministic Resolver resolves Industry template for invoice and quotation', async () => {
  const { resolvePdfcnDocument } = await import('../../components/pdf/pdfcn')
  const { registerCommercialPdfcnTemplates } = await import('../../components/pdf/pdfcn/commercial')
  registerCommercialPdfcnTemplates()

  const rawInvoice = {
    identity: { id: 'inv-1', kind: 'invoice', number: 'INV-2026-001', title: 'Invoice' },
    items: [],
    totals: { rows: [] },
  }

  const invoiceResolution = resolvePdfcnDocument({
    documentType: 'invoice',
    templateId: 'industry',
    rawDocument: rawInvoice as any,
  })

  assert.equal(invoiceResolution.success, true, 'Invoice resolution must succeed')
  assert.ok(invoiceResolution.envelope, 'Invoice envelope must exist')
  assert.equal(invoiceResolution.envelope?.templateId, 'industry')
  assert.ok(invoiceResolution.element, 'Invoice rendered element must exist')

  const rawQuotation = {
    identity: { id: 'quot-1', kind: 'quotation', number: 'QUOT-2026-001', title: 'Quotation' },
    items: [],
    totals: { rows: [] },
  }

  const quotationResolution = resolvePdfcnDocument({
    documentType: 'quotation',
    templateId: 'industry',
    rawDocument: rawQuotation as any,
  })

  assert.equal(quotationResolution.success, true, 'Quotation resolution must succeed')
  assert.ok(quotationResolution.envelope, 'Quotation envelope must exist')
  assert.equal(quotationResolution.envelope?.templateId, 'industry')
  assert.ok(quotationResolution.element, 'Quotation rendered element must exist')

  const invoiceFormeResolution = resolvePdfcnDocument({
    documentType: 'invoice',
    templateId: 'industry-forme',
    rawDocument: rawInvoice as any,
  })
  assert.equal(invoiceFormeResolution.success, true, 'Invoice industry-forme resolution must succeed')
  assert.equal(invoiceFormeResolution.envelope?.templateId, 'industry-forme')

  const quotationFormeResolution = resolvePdfcnDocument({
    documentType: 'quotation',
    templateId: 'industry-forme',
    rawDocument: rawQuotation as any,
  })
  assert.equal(quotationFormeResolution.success, true, 'Quotation industry-forme resolution must succeed')
  assert.equal(quotationFormeResolution.envelope?.templateId, 'industry-forme')
})

test('Commercial template picker provides valid options without retired React-PDF templates', async () => {
  const pickerSource = fs.readFileSync(
    path.resolve('src/components/document-view/shared/CommercialTemplatePicker.tsx'),
    'utf8',
  )

  assert.match(pickerSource, /label:\s*['"]Industry — Forme['"]/, 'Picker must include exact label "Industry — Forme"')
  assert.doesNotMatch(pickerSource, /label:\s*['"]Industry — React-PDF['"]/, 'Picker must not include "Industry — React-PDF"')
  assert.match(pickerSource, /id:\s*['"]industry['"]/, 'Picker must include id "industry"')
  assert.doesNotMatch(pickerSource, /id:\s*['"]industry-react-pdf['"]/, 'Picker must not include id "industry-react-pdf"')
  assert.doesNotMatch(pickerSource, /id:\s*['"]crest['"]/, 'Picker must not include Crest')
  assert.match(pickerSource, /id:\s*['"]minimal['"]/, 'Picker must preserve Minimal')
  assert.match(pickerSource, /id:\s*['"]evergreen['"]/, 'Picker must preserve Evergreen')
})

test('Retired commercial template files are physically deleted from the codebase', () => {
  const templatesDir = path.resolve('src/components/pdf/templates')
  const deletedFiles = [
    'Bolt.tsx',
    'BoltStyles.ts',
    'Ember.tsx',
    'EmberStyles.ts',
    'Ledger.tsx',
    'LedgerStyles.ts',
    'Crest.tsx',
    'CrestStyles.ts',
    'Minimal.tsx',
    'MinimalStyles.ts',
    'Industry.tsx',
    'Evergreen.tsx',
    'EvergreenStyles.ts',
  ]

  for (const file of deletedFiles) {
    const fullPath = path.join(templatesDir, file)
    assert.ok(!fs.existsSync(fullPath), `Retired file ${file} must not exist on disk`)
  }

  const retainedFiles = [
    'industryStyles.ts',
  ]

  for (const file of retainedFiles) {
    const fullPath = path.join(templatesDir, file)
    assert.ok(fs.existsSync(fullPath), `Retained file ${file} must exist on disk`)
  }
})
