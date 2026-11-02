import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize } from '@formepdf/react'

import { LandscapeFormeDocument } from '../../components/pdf/forme/LandscapeFormeDocument'
import { MinimalFormeDocument } from '../../components/pdf/forme/MinimalFormeDocument'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import { ensureFormeFontFamily } from '../../components/pdf/forme/fonts'
import { adaptCommercialDocumentData } from '../../components/pdf/industryAdapter'
import type { PdfColumnDefinition, PdfDocumentModel, PdfLineItem } from '../../components/pdf/types'

type SampleOptions = {
  count: number
  missing?: boolean
}

const COLUMNS: PdfColumnDefinition[] = [
  { key: 'num', label: '#', kind: 'builtin', align: 'center' },
  { key: 'description', label: 'Description', kind: 'builtin', align: 'left' },
  { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center' },
  { key: 'unit_price', label: 'Unit Price', kind: 'builtin', align: 'right' },
  { key: 'amount', label: 'Amount', kind: 'builtin', align: 'right' },
]

const GROUP_TITLES = ['Electrical Distribution', 'Mechanical Plant', 'Site Infrastructure']

function buildSampleModel({ count, missing = false }: SampleOptions): PdfDocumentModel {
  const items: PdfLineItem[] = []
  const groupSize = Math.max(1, Math.ceil(count / 3))
  let lineNumber = 0

  for (let index = 0; index < count; index += 1) {
    if (index % groupSize === 0) {
      const groupIndex = Math.floor(index / groupSize)
      items.push({
        id: `group-${groupIndex}`,
        rowType: 'group_header',
        groupId: `g${groupIndex}`,
        groupLabel: `Group ${String.fromCharCode(65 + groupIndex)} — ${GROUP_TITLES[groupIndex] || 'General Works'}`,
        cells: {},
        customData: { showSubtotal: true },
      })
    }

    lineNumber += 1
    const quantity = (index % 7) + 1
    const unitPrice = 125000 + index * 4750
    items.push({
      id: `item-${index}`,
      rowType: 'line',
      groupId: `g${Math.floor(index / groupSize)}`,
      description: `Supply of certified cable assembly ${lineNumber}`,
      subDescription: `Specification ref ${1000 + index}`,
      quantity,
      unit: 'pcs',
      unitPrice,
      amount: quantity * unitPrice,
      cells: {
        num: String(lineNumber),
        quantity: String(quantity),
        unit: 'pcs',
        unit_price: unitPrice,
        amount: quantity * unitPrice,
      },
      customData: {},
    })
  }

  const subtotal = count * 125000
  const vat = Math.round(subtotal * 0.075)

  return {
    identity: {
      id: 'doc-batch-1',
      kind: 'invoice',
      number: 'INV-2026-0147',
      title: 'INVOICE',
      issueDate: missing ? null : '02/11/2026',
      dueDate: missing ? null : '16/11/2026',
      validUntil: null,
      poNumber: missing ? null : 'PO-2026-9912',
      currency: 'NGN',
    },
    issuer: missing
      ? null
      : {
          name: 'Kestrel Industrial Supply Ltd',
          taxId: 'TIN-22910488-0001',
          phone: '+234 800 555 0110',
          email: 'accounts@kestrel.example',
          website: 'kestrel.example',
          addressLines: ['Plot 14, Block C, Agbara Industrial Estate', 'Agbara, Ogun State'],
          customInfo: [],
        },
    recipient: missing
      ? null
      : {
          name: 'Northgate Foods Processing Nigeria Ltd',
          attention: 'Ms. Adaeze Obi',
          phone: '+234 800 555 0177',
          email: 'procurement@northgate.example',
          addressLines: ['Km 18, Lagos–Ibadan Expressway', 'Mowe, Ogun State'],
        },
    headerFields: missing ? [] : [{ label: 'Project Ref', value: 'NGF/CON/2026/P2-014' }],
    items,
    columns: COLUMNS,
    totals: missing
      ? { rows: [] }
      : {
          rows: [
            { key: 'subtotal', label: 'Subtotal', amount: subtotal },
            { key: 'vat', label: 'VAT (7.5%)', amount: vat },
            { key: 'total', label: 'Total Due', amount: subtotal + vat, emphasis: true },
          ],
          amountInWords: 'One Hundred And Thirty Four Million Naira Only',
          balanceDue: subtotal + vat,
        },
    bankDetails: missing
      ? null
      : {
          bankName: 'Access Bank Plc',
          accountName: 'Kestrel Industrial Supply Ltd',
          accountNumber: '0123456789',
          sortCode: '044150149',
        },
    notes: missing
      ? null
      : {
          title: 'Notes',
          content: 'Goods supplied in good condition.\nAll items carry test certificates.',
          plainText: 'Goods supplied in good condition.\nAll items carry test certificates.',
        },
    terms: missing
      ? null
      : {
          title: 'Terms & Conditions',
          content: 'Payment is due within 14 calendar days.\nTitle passes on full settlement.',
          plainText: 'Payment is due within 14 calendar days.\nTitle passes on full settlement.',
        },
    attachments: missing ? [] : [{ label: 'Technical Datasheet', url: 'https://example.com/datasheet.pdf' }],
    signature: missing ? null : { name: 'Engr. Tunde Bakare', role: 'Managing Director', imageUrl: null },
    logo: null,
    tagline: missing ? null : 'Certified industrial supply',
    footerText: missing ? null : 'Registered in Nigeria',
    pageLayout: { size: 'A4', orientation: 'portrait' },
    template: null,
  }
}

type FormeKind = { content?: unknown; runs?: Array<{ content?: unknown }> }

function extractFormeText(node: unknown, output: string[] = []): string[] {
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
  const record = node as Record<string, unknown>
  const kind = record.kind as FormeKind | undefined
  if (kind && typeof kind === 'object') {
    if (typeof kind.content === 'string' && kind.content) output.push(kind.content)
    if (Array.isArray(kind.runs)) {
      kind.runs.forEach((run) => {
        if (run && typeof run.content === 'string' && run.content) output.push(run.content)
      })
    }
  }
  for (const [key, value] of Object.entries(record)) {
    if (key !== 'kind') extractFormeText(value, output)
  }
  return output
}

async function renderPages(element: React.ReactElement) {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Noto Sans')

  const bytes = await renderPdfcnToBytes(element)
  assert.ok(bytes instanceof Uint8Array, 'Forme must return a Uint8Array')
  assert.ok(bytes.length > 1000, `PDF bytes must be non-empty (got ${bytes.length})`)
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString('utf8'), '%PDF-')

  const mupdf = await import('mupdf')
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf')
  const pages: Array<{ width: number; height: number; text: string }> = []
  for (let index = 0; index < doc.countPages(); index += 1) {
    const page = doc.loadPage(index)
    const bounds = page.getBounds()
    pages.push({
      width: bounds[2] - bounds[0],
      height: bounds[3] - bounds[1],
      text: page.toStructuredText('preserve-whitespace').asText(),
    })
  }
  return pages
}

const data = adaptCommercialDocumentData(buildSampleModel({ count: 8 }))

test('Landscape serializes the full commercial content including supported bullets', () => {
  const tree = serialize(React.createElement(LandscapeFormeDocument, { data }))
  // glyphRuns splits ₦ into its own run, so serialized text carries a run boundary there.
  const texts = extractFormeText(tree).join(' ').replace(/\s+/g, ' ')

  for (const expected of [
    'INVOICE',
    'INV-2026-0147',
    'Kestrel Industrial Supply Ltd',
    'Northgate Foods Processing Nigeria Ltd',
    'Electrical Distribution',
    'Supply of certified cable assembly 1',
    '₦ 125,000',
    'Total Due',
    'Access Bank Plc',
    'Payment is due within 14 calendar days.',
    'Engr. Tunde Bakare',
  ]) {
    assert.ok(texts.includes(expected), `Landscape must contain "${expected}"`)
  }

  assert.ok(texts.includes('•'), 'Landscape notes must use the supported bullet glyph')
  assert.ok(!texts.includes('▪'), 'Landscape must not emit the unsupported U+25AA glyph')
})

test('Minimal serializes the full commercial content', () => {
  const tree = serialize(React.createElement(MinimalFormeDocument, { data }))
  const texts = extractFormeText(tree).join(' ').replace(/\s+/g, ' ')

  for (const expected of [
    'INVOICE',
    'INV-2026-0147',
    'Kestrel Industrial Supply Ltd',
    'Northgate Foods Processing Nigeria Ltd',
    'Electrical Distribution',
    'Supply of certified cable assembly 1',
    '₦ 125,000',
    'Total Due',
    'Access Bank Plc',
    'Payment is due within 14 calendar days.',
    'Engr. Tunde Bakare',
  ]) {
    assert.ok(texts.includes(expected), `Minimal must contain "${expected}"`)
  }
})

test('Minimal contains only the React Minimal composition', () => {
  const tree = serialize(React.createElement(MinimalFormeDocument, { data }))
  const texts = extractFormeText(tree).join(' ').replace(/\s+/g, ' ')

  for (const invented of [
    'Schedule of Items',
    'Billed To · Client Party',
    'Project & Reference Details',
    'Summary',
    'Payment Details',
    'Authorisation',
    'Name & Date',
  ]) {
    assert.ok(!texts.includes(invented), `Minimal must not render the retired Modern heading "${invented}"`)
  }

  for (const expected of ['From', 'Bill To', 'Bank Details', 'Attachments', 'Notes', 'Terms & Conditions']) {
    assert.ok(texts.includes(expected), `Minimal must render the React section "${expected}"`)
  }
})

test('Landscape renders at forced landscape geometry and repeats group names across pages', { timeout: 30000 }, async () => {
  const model = adaptCommercialDocumentData(buildSampleModel({ count: 40 }))
  const pages = await renderPages(React.createElement(LandscapeFormeDocument, { data: model }))

  assert.ok(pages.length > 1, 'Forty line items must span multiple pages')
  for (const page of pages) {
    assert.ok(Math.abs(page.width - 841.89) < 0.5, `Landscape page width must be 841.89pt (got ${page.width})`)
    assert.ok(Math.abs(page.height - 595.28) < 0.5, `Landscape page height must be 595.28pt (got ${page.height})`)
  }

  const continuationPages = pages.filter((page) => page.text.includes('Specification ref'))
  assert.ok(continuationPages.length > 1, 'Line items must continue onto later pages')
  for (const page of continuationPages) {
    assert.match(
      page.text,
      /Electrical Distribution|Mechanical Plant|Site Infrastructure/i,
      'Every page carrying line items must repeat the actual group name',
    )
  }
})

test('Minimal stays portrait and repeats the table header across pages', { timeout: 30000 }, async () => {
  const model = adaptCommercialDocumentData(buildSampleModel({ count: 40 }))
  const pages = await renderPages(React.createElement(MinimalFormeDocument, { data: model }))

  assert.ok(pages.length > 1, 'Forty line items must span multiple pages')
  for (const page of pages) {
    assert.ok(Math.abs(page.width - 595.28) < 0.5, `Minimal page width must be 595.28pt (got ${page.width})`)
    assert.ok(Math.abs(page.height - 841.89) < 0.5, `Minimal page height must be 841.89pt (got ${page.height})`)
  }

  const continuationPages = pages.filter((page) => page.text.includes('Specification ref'))
  assert.ok(continuationPages.length > 1, 'Line items must continue onto later pages')
  for (const page of continuationPages) {
    assert.match(page.text, /description/i, 'Every page carrying line items must repeat the table header')
  }
})

test('Both templates render a valid document when optional commercial data is missing', { timeout: 30000 }, async () => {
  const model = adaptCommercialDocumentData(buildSampleModel({ count: 8, missing: true }))

  for (const component of [LandscapeFormeDocument, MinimalFormeDocument]) {
    const pages = await renderPages(React.createElement(component, { data: model }))
    assert.ok(pages.length >= 1, 'Missing-data documents must still render a page')
    const firstPageText = pages[0].text.replace(/\s+/g, ' ')
    assert.ok(
      firstPageText.includes('Supply of certified cable assembly 1'),
      'Line items must survive missing company data',
    )
  }
})
