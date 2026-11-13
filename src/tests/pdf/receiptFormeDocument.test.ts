import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize } from '@formepdf/react'

import { ReceiptFormeDocument } from '../../components/pdf/forme/ReceiptFormeDocument'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import type { ReceiptPreviewData } from '../../domain/receipt/previewModel'

function createSampleReceipt(overrides: Partial<ReceiptPreviewData> = {}): ReceiptPreviewData {
  return {
    receiptNumber: 'RCT-2026-0042',
    createdAt: '2026-11-10T09:30:00.000Z',
    companyName: 'BOUXRE Engineering Ltd',
    companyAddress: 'Plot 14 Victoria Island, Lagos',
    companyEmail: 'finance@bouxre.ng',
    companyPhone: '+234 801 234 5678',
    companyLogoUrl: null,
    clientName: 'Dangote Industries Ltd',
    clientAddress: '1 Alfred Rewane Road',
    clientCity: 'Lagos',
    clientState: 'Lagos',
    clientPhone: '+234 802 987 6543',
    clientEmail: 'procurement@dangote.com',
    paymentAmount: 4900000,
    paymentDate: '10 Nov 2026',
    paymentMethod: 'Bank Transfer',
    paymentReference: 'TRF-88213',
    cashAmount: 0,
    whtAmount: 367500,
    currencyCode: 'NGN',
    invoiceNumber: 'INV-2026-0881',
    invoiceTotal: 5267500,
    invoiceSubtotal: 4900000,
    invoiceVat: 367500,
    invoiceWht: 0,
    invoiceDiscount: 0,
    projectName: 'Dangote Refinery Shutdown',
    projectCode: 'PRJ-DELTA-44',
    bankName: 'Access Bank Plc',
    bankAccountNumber: '0123456789',
    bankAccountName: 'BOUXRE Engineering Ltd',
    signatoryName: 'Engr. Tunde Bakare',
    signatoryRole: 'Managing Director',
    signatorySignatureUrl: null,
    status: 'active',
    amountInWords: 'Four Million Nine Hundred Thousand Naira',
    ...overrides,
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

function serializedText(element: React.ReactElement): string {
  const tree = serialize(element)
  assert.ok(tree, 'Forme serialized tree must exist')
  return extractFormeText(tree).join(' ')
}

test('Receipt Forme document serializes required sections and fields', () => {
  const model = createSampleReceipt()
  const text = serializedText(React.createElement(ReceiptFormeDocument, { model }))

  assert.ok(text.includes('PAYMENT RECEIPT'), 'Title must be present')
  assert.ok(text.includes('RCT-2026-0042'), 'Receipt number must be present')
  assert.ok(text.includes('BOUXRE Engineering Ltd'), 'Company name must be present')
  assert.ok(text.includes('Dangote Industries Ltd'), 'Client name must be present')
  assert.ok(text.includes('4,900,000'), 'Payment amount must be present')
  assert.ok(text.includes('Bank Transfer'), 'Payment method must be present')
  assert.ok(text.includes('TRF-88213'), 'Payment reference must be present')
  assert.ok(text.includes('Four Million Nine Hundred Thousand Naira'), 'Amount in words must be present')
  assert.ok(text.includes('INV-2026-0881'), 'Invoice number must be present')
  assert.ok(text.includes('Dangote Refinery Shutdown'), 'Project name must be present')
  assert.ok(text.includes('PRJ-DELTA-44'), 'Project code must be present')
  assert.ok(text.includes('Access Bank Plc'), 'Bank name must be present')
  assert.ok(text.includes('0123456789'), 'Account number must be present')
  assert.ok(text.includes('Engr. Tunde Bakare'), 'Signatory name must be present')
  assert.ok(text.includes('Managing Director'), 'Signatory role must be present')
  assert.ok(text.includes('Authorized Signature'), 'Signature label must be present')
  assert.ok(text.includes('Terms & Conditions'), 'Terms title must be present')
  assert.ok(text.includes('computer-generated receipt'), 'Disclaimer must be present')
})

test('Voided receipt renders the voided notice and VOIDED status', () => {
  const model = createSampleReceipt({ status: 'voided' })
  const text = serializedText(React.createElement(ReceiptFormeDocument, { model }))

  assert.ok(text.includes('VOIDED'), 'Status must render VOIDED')
  assert.ok(text.includes('This receipt has been voided.'), 'Void notice must be present')
})

test('Active receipt without optional sections omits them', () => {
  const model = createSampleReceipt({
    projectName: null,
    projectCode: null,
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    companyLogoUrl: null,
    signatorySignatureUrl: null,
    paymentReference: '—',
  })
  const text = serializedText(React.createElement(ReceiptFormeDocument, { model }))

  assert.ok(!text.includes('Project Reference'), 'Project section must be omitted')
  assert.ok(!text.includes('Bank Details'), 'Bank section must be omitted')
  assert.ok(!text.includes('TRF-88213'), 'Reference row must be omitted for dash fallback')
})

test('Receipt Forme document generates valid PDF bytes', async () => {
  const model = createSampleReceipt()
  const element = React.createElement(ReceiptFormeDocument, { model })

  const bytes = await renderPdfcnToBytes(element)

  assert.ok(bytes instanceof Uint8Array, 'Forme must return a Uint8Array')
  assert.ok(bytes.length > 1000, `PDF bytes must be non-empty (got ${bytes.length} bytes)`)

  const header = Buffer.from(bytes.slice(0, 5)).toString('utf8')
  assert.equal(header, '%PDF-', 'PDF bytes must start with standard PDF header')
})
