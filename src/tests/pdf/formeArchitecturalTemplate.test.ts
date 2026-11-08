import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize } from '@formepdf/react'

import { ArchitecturalFormeDocument, ARCHITECTURAL_TOKENS } from '../../components/pdf/forme/ArchitecturalFormeDocument'
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

function buildSampleInvoice(): any {
  return {
    identity: {
      id: 'inv-arch-1',
      kind: 'invoice',
      number: 'SASINV-000130',
      title: 'INVOICE',
      issueDate: '08/11/2026',
      dueDate: '22/11/2026',
      validUntil: null,
      poNumber: 'PO-ENG-9912',
      currency: 'NGN',
    },
    issuer: {
      name: 'Apex Engineering & Structural Ltd',
      taxId: 'TIN-44556677-0001',
      registrationNumber: 'RC-1928374',
      phone: '+234 803 444 5566',
      email: 'projects@apexeng.ng',
      addressLines: ['Plot 12 Industrial Avenue', 'Ikeja, Lagos State'],
      logoUrl: SAMPLE_BASE64_IMAGE,
    },
    recipient: {
      name: 'Northgate Foods Processing Nigeria Ltd',
      addressLines: ['Km 18 Lagos-Ibadan Expressway', 'Mowe, Ogun State'],
      phone: '+234 802 999 8877',
      email: 'procurement@northgate.ng',
      attention: 'Ms. Adaeze Obi',
    },
    columns: [
      { key: 'num', label: '#', kind: 'builtin', align: 'center', pdfWidth: 26 },
      { key: 'description', label: 'Description', kind: 'builtin', align: 'left' },
      { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center', pdfWidth: 50 },
      { key: 'unit_price', label: 'Unit Price', kind: 'builtin', align: 'right', pdfWidth: 80 },
      { key: 'amount', label: 'Amount', kind: 'builtin', align: 'right', pdfWidth: 90 },
    ],
    items: [
      {
        id: '1',
        rowType: 'line',
        description: 'Portland-limestone cement CEM II 42.5R',
        subDescription: '50 kg bags, palletised',
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
      {
        id: '2',
        rowType: 'line',
        description: 'Hot-dip galvanised structural I-beam IPE 300',
        subDescription: '12 m lengths, S275JR - EN 10025',
        quantity: 42,
        unit: 'pcs',
        unitPrice: 486500,
        amount: 20433000,
        cells: {
          num: '2',
          description: 'Hot-dip galvanised structural I-beam IPE 300',
          quantity: '42 pcs',
          unit_price: '486,500',
          amount: '20,433,000',
        },
      },
    ],
    totals: {
      rows: [
        { key: 'subtotal', label: 'Subtotal', value: '₦ 32,913,000.00' },
        { key: 'vat', label: 'VAT (7.5%)', value: '₦ 2,468,475.00' },
        { key: 'total', label: 'Total Amount Due', value: '₦ 35,381,475.00', emphasis: true, isBold: true },
      ],
      amountInWords: 'Thirty-Five Million, Three Hundred and Eighty-One Thousand, Four Hundred and Seventy-Five Naira Only',
      balanceDue: '₦ 35,381,475.00',
    },
    bankDetails: {
      bankName: 'First Meridian Bank',
      accountName: 'Apex Engineering Ltd',
      accountNumber: '0123456789',
      sortCode: '044150',
    },
    notes: 'Structural steel components mill-certified according to BS EN 10025 standard.',
    terms: 'Net 30 days. Late payment subject to statutory interest.',
    signature: {
      imageUrl: SAMPLE_BASE64_IMAGE,
      name: 'Engr. Babatunde Lawal',
      role: 'Chief Structural Engineer',
    },
    design: {
      theme: 'architectural',
    },
    customFields: {
      'Project Manager': 'Engr. C. Okeke',
      'Delivery Window': '4-6 weeks',
    },
  }
}

test('Architectural Forme template ID normalization and routing', () => {
  assert.equal(isInvoicePdfTemplateId('architectural'), true)
  assert.equal(normalizeInvoicePdfTemplateId('architectural'), 'architectural')
  assert.equal(normalizeInvoicePdfTemplateId('architectural-frame'), 'architectural')
  assert.equal(resolveCommercialPdfRoute('architectural'), 'architectural-forme')
  assert.equal(resolveCommercialPdfRoute('architectural-frame'), 'architectural-forme')
})

test('Architectural Forme serializes into a valid node tree', () => {
  const model = buildSampleInvoice()
  const data = adaptCommercialDocumentData(model as PdfDocumentModel)
  const element = React.createElement(ArchitecturalFormeDocument, { data, compact: false })
  const tree = serialize(element)
  assert.ok(tree, 'serialize output must exist')
  assert.ok(Array.isArray(tree.children), 'tree.children must be an array')
})

test('Architectural Forme renders to valid PDF bytes starting with %PDF-', async () => {
  await Promise.all([
    ensureFormeFontFamily('Inter'),
    ensureFormeFontFamily('Noto Sans'),
  ])
  const model = buildSampleInvoice()
  const data = adaptCommercialDocumentData(model as PdfDocumentModel)
  const element = React.createElement(ArchitecturalFormeDocument, { data, compact: false })
  const bytes = await renderPdfcnToBytes(element)
  assert.ok(bytes.length > 1000, 'PDF size should exceed 1KB')
  const header = String.fromCharCode(...bytes.subarray(0, 5))
  assert.equal(header, '%PDF-')
})

test('Architectural Forme renders Quotation with valid PDF bytes', async () => {
  const invoiceModel = buildSampleInvoice()
  const quotationModel = {
    ...invoiceModel,
    identity: {
      ...invoiceModel.identity,
      id: 'quo-arch-1',
      kind: 'quotation',
      number: 'SASQUO-000427',
      title: 'QUOTATION',
      validUntil: '15/12/2026',
    },
  }
  const data = adaptCommercialDocumentData(quotationModel as PdfDocumentModel)
  const element = React.createElement(ArchitecturalFormeDocument, { data, compact: false })
  const bytes = await renderPdfcnToBytes(element)
  assert.ok(bytes.length > 1000)
  const header = String.fromCharCode(...bytes.subarray(0, 5))
  assert.equal(header, '%PDF-')
})

test('Architectural Forme tokens and structure are defined', () => {
  assert.equal(ARCHITECTURAL_TOKENS.charcoal, '#1e2427')
  assert.equal(ARCHITECTURAL_TOKENS.copper, '#a4663f')
  assert.equal(ARCHITECTURAL_TOKENS.ivory, '#f6f0e4')
})
