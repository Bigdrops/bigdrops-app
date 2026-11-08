import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize } from '@formepdf/react'

import { ExecutiveFormeDocument, EXECUTIVE_TOKENS } from '../../components/pdf/forme/ExecutiveFormeDocument'
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
      id: 'inv-exec-1',
      kind: 'invoice',
      number: 'EXE-2026-0881',
      title: 'INVOICE',
      issueDate: '08/11/2026',
      dueDate: '22/11/2026',
      validUntil: null,
      poNumber: 'PO-EXEC-4410',
      currency: 'NGN',
    },
    issuer: {
      name: 'St. James Commercial Advisory Ltd',
      taxId: 'TIN-99887766-0001',
      registrationNumber: 'RC-8837192',
      phone: '+234 802 111 2233',
      email: 'partners@stjamesadvisory.ng',
      addressLines: ['Victoria Island Financial Centre', 'Lagos State, Nigeria'],
      logoUrl: SAMPLE_BASE64_IMAGE,
    },
    recipient: {
      name: 'Zenith Holdings & Investments Plc',
      addressLines: ['Plot 88 Ozumba Mbadiwe Way', 'Victoria Island, Lagos State'],
      phone: '+234 805 777 6655',
      email: 'treasury@zenithholdings.ng',
      attention: 'Chief Financial Officer',
    },
    columns: [
      { key: 'num', label: '#', kind: 'builtin', align: 'center', pdfWidth: 26 },
      { key: 'description', label: 'Description', kind: 'builtin', align: 'left' },
      { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center', pdfWidth: 50 },
      { key: 'unit_price', label: 'Unit Fee', kind: 'builtin', align: 'right', pdfWidth: 80 },
      { key: 'amount', label: 'Amount', kind: 'builtin', align: 'right', pdfWidth: 90 },
    ],
    items: [
      {
        id: '1',
        rowType: 'line',
        description: 'Corporate M&A Advisory Retainer — Q4 2026',
        subDescription: 'Cross-border regulatory due diligence & structuring',
        quantity: 1,
        unit: 'session',
        unitPrice: 15000000,
        amount: 15000000,
        cells: {
          num: '1',
          description: 'Corporate M&A Advisory Retainer — Q4 2026',
          quantity: '1 session',
          unit_price: '15,000,000',
          amount: '15,000,000',
        },
      },
      {
        id: '2',
        rowType: 'line',
        description: 'Tax Optimization & Compliance Review',
        subDescription: 'FIRS & State internal revenue compliance audit',
        quantity: 1,
        unit: 'engagement',
        unitPrice: 8500000,
        amount: 8500000,
        cells: {
          num: '2',
          description: 'Tax Optimization & Compliance Review',
          quantity: '1 engagement',
          unit_price: '8,500,000',
          amount: '8,500,000',
        },
      },
    ],
    totals: {
      rows: [
        { key: 'subtotal', label: 'Subtotal', value: '₦ 23,500,000.00' },
        { key: 'vat', label: 'VAT (7.5%)', value: '₦ 1,762,500.00' },
        { key: 'total', label: 'Total Amount Due', value: '₦ 25,262,500.00', emphasis: true, isBold: true },
      ],
      amountInWords: 'Twenty-Five Million, Two Hundred and Sixty-Two Thousand, Five Hundred Naira Only',
      balanceDue: '₦ 25,262,500.00',
    },
    bankDetails: {
      bankName: 'Standard Chartered Bank Nigeria',
      accountName: 'St. James Commercial Advisory',
      accountNumber: '0012345678',
      sortCode: '030150',
    },
    notes: 'Professional services rendered in accordance with master engagement agreement dated 15/01/2026.',
    terms: 'Payment due within 14 banking days from date of presentation.',
    signature: {
      imageUrl: SAMPLE_BASE64_IMAGE,
      name: 'Dr. Alistair Sterling, SAN',
      role: 'Managing Partner',
    },
    design: {
      theme: 'executive',
    },
    customFields: {
      'Lead Counsel': 'Dr. Alistair Sterling, SAN',
      'Client Matter Ref': 'ZEN-MA-2026-04',
    },
  }
}

test('Executive Forme template ID normalization and routing', () => {
  assert.equal(isInvoicePdfTemplateId('executive'), true)
  assert.equal(normalizeInvoicePdfTemplateId('executive'), 'executive')
  assert.equal(resolveCommercialPdfRoute('executive'), 'executive-forme')
})

test('Executive Forme serializes into a valid node tree', () => {
  const model = buildSampleInvoice()
  const data = adaptCommercialDocumentData(model as PdfDocumentModel)
  const element = React.createElement(ExecutiveFormeDocument, { data, compact: false })
  const tree = serialize(element)
  assert.ok(tree, 'serialize output must exist')
  assert.ok(Array.isArray(tree.children), 'tree.children must be an array')
})

test('Executive Forme renders to valid PDF bytes starting with %PDF-', async () => {
  await Promise.all([
    ensureFormeFontFamily('Inter'),
    ensureFormeFontFamily('PT Serif'),
    ensureFormeFontFamily('Noto Sans'),
  ])
  const model = buildSampleInvoice()
  const data = adaptCommercialDocumentData(model as PdfDocumentModel)
  const element = React.createElement(ExecutiveFormeDocument, { data, compact: false })
  const bytes = await renderPdfcnToBytes(element)
  assert.ok(bytes.length > 1000, 'PDF size should exceed 1KB')
  const header = String.fromCharCode(...bytes.subarray(0, 5))
  assert.equal(header, '%PDF-')
})

test('Executive Forme renders Quotation with valid PDF bytes', async () => {
  const invoiceModel = buildSampleInvoice()
  const quotationModel = {
    ...invoiceModel,
    identity: {
      ...invoiceModel.identity,
      id: 'quo-exec-1',
      kind: 'quotation',
      number: 'EXE-QUO-2026-012',
      title: 'QUOTATION',
      validUntil: '30/11/2026',
    },
  }
  const data = adaptCommercialDocumentData(quotationModel as PdfDocumentModel)
  const element = React.createElement(ExecutiveFormeDocument, { data, compact: false })
  const bytes = await renderPdfcnToBytes(element)
  assert.ok(bytes.length > 1000)
  const header = String.fromCharCode(...bytes.subarray(0, 5))
  assert.equal(header, '%PDF-')
})

test('Executive Forme tokens and structure are defined', () => {
  assert.equal(EXECUTIVE_TOKENS.forest, '#173a2c')
  assert.equal(EXECUTIVE_TOKENS.gold, '#a9854f')
  assert.equal(EXECUTIVE_TOKENS.paper, '#fcf9f2')
})
