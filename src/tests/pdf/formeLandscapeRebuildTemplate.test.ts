import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize } from '@formepdf/react'

import {
  LandscapeFormeDocument,
  LANDSCAPE_TOKENS,
} from '../../components/pdf/forme/LandscapeFormeDocument'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import { ensureFormeFontFamily } from '../../components/pdf/forme/fonts'
import { adaptCommercialDocumentData } from '../../components/pdf/industryAdapter'
import { resolveCommercialPdfRoute } from '../../components/pdf/index'
import { normalizeInvoicePdfTemplateId } from '../../domain/invoice/types'
import type { PdfDocumentModel } from '../../components/pdf/types'

function createSampleLandscapeModel(kind: 'invoice' | 'quotation' = 'invoice'): any {
  return {
    identity: {
      id: 'doc-ls-1',
      kind,
      number: kind === 'invoice' ? 'SASINV-000130' : 'SASQUO-000427',
      title: kind === 'invoice' ? 'INVOICE' : 'QUOTATION',
      issueDate: '08/11/2026',
      dueDate: kind === 'invoice' ? '22/11/2026' : null,
      validUntil: kind === 'quotation' ? '08/12/2026' : null,
      poNumber: 'PO-2026-9912',
      currency: 'NGN',
    },
    issuer: {
      name: 'Safe & Secure Engineering Ltd',
      taxId: 'TIN-99887766-0001',
      phone: '+234 803 111 2233',
      email: 'engineering@safesecure.ng',
      addressLines: ['Plot 14, Block C, Agbara Industrial Estate', 'Ogun State'],
    },
    recipient: {
      name: 'Dangote Refinery Complex',
      addressLines: ['Lekki Free Trade Zone', 'Lagos State'],
      phone: '+234 802 333 4455',
      email: 'procurement@dangote.example',
    },
    columns: [
      { key: 'num', label: '#', kind: 'builtin', align: 'center', pdfWidth: 24 },
      { key: 'description', label: 'Description', kind: 'builtin', align: 'left', pdfWidth: 220 },
      { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center', pdfWidth: 50 },
      { key: 'unit_price', label: 'Unit Price', kind: 'builtin', align: 'right', pdfWidth: 90 },
      { key: 'amount', label: 'Amount', kind: 'builtin', align: 'right', pdfWidth: 100 },
    ],
    items: [
      {
        id: 'group-0',
        rowType: 'group_header',
        groupId: 'g0',
        groupLabel: 'Group A — High-Voltage Distribution Switchgear',
        cells: {},
        customData: { showSubtotal: true },
      },
      {
        id: 'item-1',
        rowType: 'line',
        groupId: 'g0',
        description: 'Schneider Electric 33kV Vacuum Circuit Breaker',
        subDescription: 'Model HV-VCB-33/1250, 25kA breaking capacity with test certificate',
        quantity: 2,
        unit: 'sets',
        unitPrice: 18500000,
        amount: 37000000,
        cells: {
          num: '1',
          description: 'Schneider Electric 33kV Vacuum Circuit Breaker',
          quantity: '2sets',
          unit_price: '18,500,000',
          amount: '37,000,000',
        },
      },
      {
        id: 'group-1',
        rowType: 'group_header',
        groupId: 'g1',
        groupLabel: 'Group B — Backup Power Plant',
        cells: {},
        customData: { showSubtotal: true },
      },
      {
        id: 'item-2',
        rowType: 'line',
        groupId: 'g1',
        description: 'Cummins QSV91G Gas Generator Set 2000kVA',
        subDescription: 'Complete with ComAp synchronizing panel and bypass switch',
        quantity: 1,
        unit: 'unit',
        unitPrice: 125000000,
        amount: 125000000,
        cells: {
          num: '2',
          description: 'Cummins QSV91G Gas Generator Set 2000kVA',
          quantity: '1unit',
          unit_price: '125,000,000',
          amount: '125,000,000',
        },
      },
    ],
    totals: {
      mode: 'standard',
      rows: [
        { label: 'Subtotal', amount: 162000000 },
        { label: 'VAT (7.5%)', amount: 12150000 },
        { label: 'Withholding Tax (5%)', amount: 8100000, tone: 'danger' },
        { label: 'Total Due', amount: 166050000, emphasis: true },
      ],
      amountInWords: 'One Hundred And Sixty-Six Million Fifty Thousand Naira Only',
      balanceDue: 166050000,
      advanceSummary: null,
    },
    bankDetails: {
      bankName: 'Access Bank Plc',
      accountName: 'Safe & Secure Engineering Ltd',
      accountNumber: '0123456789',
      sortCode: '044150149',
    },
    notes: {
      title: 'Engineering Notes',
      content: 'All plant commissioning performed according to IEEE standard 1547.',
    },
    terms: {
      title: 'Commercial Terms',
      content: '30% advance on order, balance upon successful factory acceptance test.',
    },
    additionalSections: [],
    referenceLinks: [],
    attachments: [{ label: 'Single Line Diagram Rev 3', url: 'https://example.com/sld-r3.pdf' }],
    signature: {
      name: 'Engr. Babatunde Adeleke, FNSE',
      role: 'Chief Technical Director',
    },
    logo: {
      imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
    footerText: 'Registered in Nigeria · RC-1849204',
    tagline: 'High-Voltage Power & Industrial Plant Engineering',
    template: {},
  }
}

test('Landscape Forme rebuild template ID normalization and routing', () => {
  assert.equal(normalizeInvoicePdfTemplateId('landscape'), 'landscape')
  assert.equal(normalizeInvoicePdfTemplateId('landscape-blueprint'), 'landscape')
  assert.equal(normalizeInvoicePdfTemplateId('blueprint'), 'landscape')
  assert.equal(resolveCommercialPdfRoute('landscape'), 'landscape-forme')
  assert.equal(resolveCommercialPdfRoute('landscape-blueprint'), 'landscape-forme')
})

test('Landscape Forme rebuild serializes into a valid node tree with technical blueprint aura', () => {
  const model = createSampleLandscapeModel('invoice')
  const data = adaptCommercialDocumentData(model)
  const tree = serialize(React.createElement(LandscapeFormeDocument, { data }))

  assert.ok(tree, 'Serialization tree must exist')
  assert.ok(Array.isArray(tree.children), 'Tree must contain children pages')
  assert.equal(tree.children.length, 1, 'Single page document must serialize one page')

  // Extract all text content
  function extractAllText(node: any, out: string[] = []): string[] {
    if (!node) return out
    if (typeof node === 'string') {
      out.push(node)
      return out
    }
    if (Array.isArray(node)) {
      node.forEach((item) => extractAllText(item, out))
      return out
    }
    if (typeof node !== 'object') return out
    if (node.kind && typeof node.kind === 'object') {
      if (typeof node.kind.content === 'string') out.push(node.kind.content)
      if (Array.isArray(node.kind.runs)) {
        node.kind.runs.forEach((r: any) => r?.content && out.push(r.content))
      }
    }
    for (const [k, v] of Object.entries(node)) {
      if (k !== 'kind') extractAllText(v, out)
    }
    return out
  }

  const texts = extractAllText(tree).join(' ')
  assert.ok(texts.includes('INVOICE'), 'Must render DOCTYPE INVOICE')
  assert.ok(texts.includes('SASINV-000130'), 'Must render invoice number')
  assert.ok(texts.includes('Safe & Secure Engineering Ltd'), 'Must render company name')
  assert.ok(texts.includes('Dangote Refinery Complex'), 'Must render client name')
  assert.ok(texts.includes('Schneider Electric 33kV Vacuum Circuit Breaker'), 'Must render item description')
  assert.ok(texts.includes('Cummins QSV91G Gas Generator Set 2000kVA'), 'Must render item description 2')
  assert.ok(texts.includes('Access Bank Plc'), 'Must render bank name')
  assert.ok(texts.includes('Engr. Babatunde Adeleke, FNSE'), 'Must render signatory')
})

test('Landscape Forme rebuild renders to valid PDF bytes starting with %PDF-', async () => {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Noto Sans')

  const model = createSampleLandscapeModel('invoice')
  const data = adaptCommercialDocumentData(model)
  const bytes = await renderPdfcnToBytes(React.createElement(LandscapeFormeDocument, { data }))

  assert.ok(bytes instanceof Uint8Array, 'PDF bytes must be a Uint8Array')
  assert.ok(bytes.length > 2000, `PDF bytes must be non-empty (got ${bytes.length} bytes)`)
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString('utf8'), '%PDF-')
})

test('Landscape Forme rebuild renders Quotation with valid PDF bytes and validity date', async () => {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Noto Sans')

  const model = createSampleLandscapeModel('quotation')
  const data = adaptCommercialDocumentData(model)
  const bytes = await renderPdfcnToBytes(React.createElement(LandscapeFormeDocument, { data }))

  assert.ok(bytes instanceof Uint8Array, 'PDF bytes must be a Uint8Array')
  assert.ok(bytes.length > 2000, `PDF bytes must be non-empty (got ${bytes.length} bytes)`)
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString('utf8'), '%PDF-')
})

test('Landscape Forme tokens and geometry are mathematically verified', () => {
  assert.equal(LANDSCAPE_TOKENS.navy, '#07192b')
  assert.equal(LANDSCAPE_TOKENS.cobalt, '#0f3156')
  assert.equal(LANDSCAPE_TOKENS.amber, '#b84a14')
  assert.equal(LANDSCAPE_TOKENS.paper, '#ffffff')
})
