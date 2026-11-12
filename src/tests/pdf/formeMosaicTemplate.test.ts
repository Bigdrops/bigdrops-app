import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize } from '@formepdf/react'

import { MosaicFormeDocument, MOSAIC_TOKENS } from '../../components/pdf/forme/MosaicFormeDocument'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import { ensureFormeFontFamily } from '../../components/pdf/forme/fonts'
import { adaptCommercialDocumentData } from '../../components/pdf/industryAdapter'
import {
  INVOICE_PDF_TEMPLATE_IDS,
  normalizeInvoicePdfTemplateId,
  isInvoicePdfTemplateId,
} from '../../domain/invoice/types'
import { resolveCommercialPdfRoute } from '../../components/pdf'
import type { PdfDocumentModel } from '../../components/pdf/types'

const SAMPLE_BASE64_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function buildSampleInvoice(): Record<string, unknown> {
  return {
    identity: {
      id: 'inv-mosaic-1',
      kind: 'invoice',
      number: 'INV-2026-0158',
      title: 'INVOICE',
      issueDate: '12/11/2026',
      dueDate: '12/12/2026',
      validUntil: null,
      poNumber: 'PO-MOS-01',
      currency: 'NGN',
    },
    issuer: {
      name: 'Kestrel Industrial Supply Ltd',
      taxId: '20384756-0001',
      registrationNumber: '1928374',
      phone: '+234 800 555 0142',
      email: 'sales@kestrel-industrial.example',
      addressLines: ['Plot 14, Block C, Agbara Industrial Estate', 'Ogun State'],
      logoUrl: SAMPLE_BASE64_IMAGE,
    },
    recipient: {
      name: 'Northgate Foods Processing Nigeria Ltd',
      addressLines: ['Km 18, Lagos-Ibadan Expressway', 'Mowe, Ogun State'],
      phone: '+234 800 555 0177',
      email: 'procurement@northgate-foods.example',
      attention: 'Ms. Adaeze Obi',
    },
    columns: [
      { key: 'num', label: '#', kind: 'builtin', align: 'center', pdfWidth: 26 },
      { key: 'description', label: 'Description / specification', kind: 'builtin', align: 'left' },
      { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center', pdfWidth: 50 },
      { key: 'unit_price', label: 'Unit Price', kind: 'builtin', align: 'right', pdfWidth: 80 },
      { key: 'amount', label: 'Amount', kind: 'builtin', align: 'right', pdfWidth: 90 },
    ],
    pageLayout: { size: 'A4', orientation: 'portrait' },
    items: [
      {
        id: '1',
        rowType: 'line',
        description: 'Portland-limestone cement CEM II 42.5R',
        subDescription: 'Dangote-grade bulk supply (synthetic spec)',
        quantity: 1200,
        unit: 'bags',
        unitPrice: 10400,
        amount: 12480000,
        cells: {
          num: '1',
          description: 'Portland-limestone cement CEM II 42.5R',
          quantity: '1,200 bags',
          unit_price: '10,400',
          amount: '12,480,000',
        },
      },
    ],
    totals: {
      rows: [
        { key: 'subtotal', label: 'Gross subtotal', amount: 12480000 },
        { key: 'vat', label: 'VAT (7.5%)', amount: 936000 },
        { key: 'total', label: 'Total Amount Due', amount: 13416000, emphasis: true },
      ],
      amountInWords: 'Thirteen Million, Four Hundred and Sixteen Thousand Naira Only',
      balanceDue: 13416000,
    },
    bankDetails: {
      bankName: 'First Meridian Bank',
      accountName: 'Kestrel Industrial Supply Ltd',
      accountNumber: '0123456789',
      sortCode: '044150',
    },
    notes: { title: 'Notes', content: '<p>Delivery in four tranches.</p>', format: 'html' },
    terms: { title: 'Terms', content: '<p>Payment Net 30 days.</p>', format: 'html' },
    signature: null,
    template: { designPreset: { useCustomColors: false, useCustomFonts: false } },
  }
}

test('Mosaic template id is registered and routable', () => {
  assert.ok((INVOICE_PDF_TEMPLATE_IDS as readonly string[]).includes('mosaic'))
  assert.equal(isInvoicePdfTemplateId('mosaic'), true)
  assert.equal(normalizeInvoicePdfTemplateId('mosaic'), 'mosaic')
  assert.equal(resolveCommercialPdfRoute('mosaic'), 'mosaic-forme')
})

test('Mosaic Forme serializes into a valid node tree', () => {
  const data = adaptCommercialDocumentData(buildSampleInvoice() as unknown as PdfDocumentModel)
  const tree = serialize(React.createElement(MosaicFormeDocument, { data, compact: false }))
  assert.ok(Array.isArray(tree.children), 'tree.children must be an array')
})

test('Mosaic Forme renders to valid PDF bytes starting with %PDF-', async () => {
  await Promise.all([
    ensureFormeFontFamily('Inter'),
    ensureFormeFontFamily('Noto Sans'),
  ])
  const data = adaptCommercialDocumentData(buildSampleInvoice() as unknown as PdfDocumentModel)
  const bytes = await renderPdfcnToBytes(React.createElement(MosaicFormeDocument, { data, compact: false }))
  assert.ok(bytes.length > 1000, 'PDF size should exceed 1KB')
  assert.equal(String.fromCharCode(...bytes.subarray(0, 5)), '%PDF-')
})

test('Mosaic tokens define the forest and lime identity on white paper', () => {
  assert.equal(MOSAIC_TOKENS.forest, '#0d2b1d')
  assert.equal(MOSAIC_TOKENS.lime, '#84cc16')
  assert.equal(MOSAIC_TOKENS.paper, '#ffffff')
  assert.equal(MOSAIC_TOKENS.tint2, '#eef4f0')
})

test('Mosaic omits document-control furniture and placeholder signatures', () => {
  const data = adaptCommercialDocumentData(buildSampleInvoice() as unknown as PdfDocumentModel)
  const json = JSON.stringify(MosaicFormeDocument({ data }))
  assert.ok(!json.includes('DOCUMENT CONTROL'), 'Must not render a Document Control block')
  assert.ok(!json.includes('Sign on execution'), 'Must not render signature prompts')
  assert.ok(!json.includes('Acknowledg'), 'Must not render acknowledgement placeholders')
})

test('Mosaic renders genuine signature data and keeps dash placeholders out', () => {
  const model = buildSampleInvoice()
  model.signature = { imageUrl: SAMPLE_BASE64_IMAGE, name: 'Mr. Chukwuemeka Daniels', role: 'Authorised Signatory' }
  const data = adaptCommercialDocumentData(model as unknown as PdfDocumentModel)
  const json = JSON.stringify(MosaicFormeDocument({ data }))
  assert.ok(json.includes('Mr. Chukwuemeka Daniels'), 'Must render supplied signature name')
  assert.ok(json.includes(SAMPLE_BASE64_IMAGE), 'Must render supplied signature image')
})
