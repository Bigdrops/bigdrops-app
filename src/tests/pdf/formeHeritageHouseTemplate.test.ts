import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize } from '@formepdf/react'

import { HeritageHouseFormeDocument, HERITAGE_TOKENS } from '../../components/pdf/forme/HeritageHouseFormeDocument'
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
      id: 'inv-hh-1',
      kind: 'invoice',
      number: 'INV-2026-0147',
      title: 'INVOICE',
      issueDate: '30/10/2026',
      dueDate: '29/11/2026',
      validUntil: null,
      poNumber: 'NGF-LPO-4471',
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
      {
        id: '2',
        rowType: 'line',
        description: 'High-yield deformed reinforcement bar Y16',
        subDescription: 'BS 4449:2005 Grade B500B',
        quantity: 85,
        unit: 'tonnes',
        unitPrice: 1150000,
        amount: 97750000,
        cells: {
          num: '2',
          description: 'High-yield deformed reinforcement bar Y16',
          quantity: '85 tonnes',
          unit_price: '1,150,000',
          amount: '97,750,000',
        },
      },
    ],
    totals: {
      rows: [
        { key: 'subtotal', label: 'Gross Subtotal', value: '₦ 110,230,000.00' },
        { key: 'discount', label: 'Subtotal discount (2.5%)', value: '−₦ 2,755,750.00', isDeduction: true },
        { key: 'vat', label: 'VAT (7.5%)', value: '₦ 8,060,568.75' },
        { key: 'total', label: 'Total Amount Due', value: '₦ 115,534,818.75', emphasis: true, isBold: true },
      ],
      amountInWords: 'One Hundred and Fifteen Million, Five Hundred and Thirty-Four Thousand, Eight Hundred and Eighteen Naira and Seventy-Five Kobo Only',
      balanceDue: '₦ 115,534,818.75',
    },
    paymentDetails: {
      bankName: 'First Meridian Bank',
      accountName: 'Kestrel Industrial Supply Ltd',
      accountNumber: '0123456789',
      sortCode: '044150',
    },
    notes: 'Materials, equipment and supplies for Phase 2 awarded under contract NGF/CON/2026/P2-014.',
    terms: 'Payment Net 30 days. Overdue balances attract statutory interest.',
    signature: {
      imageUrl: SAMPLE_BASE64_IMAGE,
      name: 'Mr. Chukwuemeka Daniels',
      role: 'Authorised Signatory',
    },
    design: {
      theme: 'heritage',
    },
    customFields: {
      'Project Manager': 'Engr. C. Okeke',
      'Contract Ref': 'NGF/CON/2026/P2-014',
    },
  }
}

test('Heritage House Forme template ID normalization and routing', () => {
  assert.equal(isInvoicePdfTemplateId('heritage'), true)
  assert.equal(normalizeInvoicePdfTemplateId('heritage'), 'heritage')
  assert.equal(normalizeInvoicePdfTemplateId('heritage-house'), 'heritage')
  assert.equal(resolveCommercialPdfRoute('heritage'), 'heritage-forme')
  assert.equal(resolveCommercialPdfRoute('heritage-house'), 'heritage-forme')
})

test('Heritage House Forme serializes into a valid node tree', () => {
  const model = buildSampleInvoice()
  const data = adaptCommercialDocumentData(model as PdfDocumentModel)
  const element = React.createElement(HeritageHouseFormeDocument, { data, compact: false })
  const tree = serialize(element)
  assert.ok(tree, 'serialize output must exist')
  assert.ok(Array.isArray(tree.children), 'tree.children must be an array')
})

test('Heritage House Forme renders to valid PDF bytes starting with %PDF-', async () => {
  await Promise.all([
    ensureFormeFontFamily('Inter'),
    ensureFormeFontFamily('PT Serif'),
    ensureFormeFontFamily('Noto Sans'),
  ])
  const model = buildSampleInvoice()
  const data = adaptCommercialDocumentData(model as PdfDocumentModel)
  const element = React.createElement(HeritageHouseFormeDocument, { data, compact: false })
  const bytes = await renderPdfcnToBytes(element)
  assert.ok(bytes.length > 1000, 'PDF size should exceed 1KB')
  const header = String.fromCharCode(...bytes.subarray(0, 5))
  assert.equal(header, '%PDF-')
})

test('Heritage House Forme renders Quotation with valid PDF bytes', async () => {
  const invoiceModel = buildSampleInvoice()
  const quotationModel = {
    ...invoiceModel,
    identity: {
      ...invoiceModel.identity,
      id: 'quo-hh-1',
      kind: 'quotation',
      number: 'QUO-2026-0147',
      title: 'QUOTATION',
      validUntil: '20/12/2026',
    },
  }
  const data = adaptCommercialDocumentData(quotationModel as PdfDocumentModel)
  const element = React.createElement(HeritageHouseFormeDocument, { data, compact: false })
  const bytes = await renderPdfcnToBytes(element)
  assert.ok(bytes.length > 1000)
  const header = String.fromCharCode(...bytes.subarray(0, 5))
  assert.equal(header, '%PDF-')
})

test('Heritage House Forme tokens and structure are defined', () => {
  assert.equal(HERITAGE_TOKENS.burgundy, '#5c1a26')
  assert.equal(HERITAGE_TOKENS.bronze, '#9a7b45')
  assert.equal(HERITAGE_TOKENS.paper, '#f8f2e3')
  assert.equal(HERITAGE_TOKENS.ivory, '#f2e9d4')
})
