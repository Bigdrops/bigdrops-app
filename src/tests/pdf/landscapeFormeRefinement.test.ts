import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize } from '@formepdf/react'

import { LandscapeFormeDocument } from '../../components/pdf/forme/LandscapeFormeDocument'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import { ensureFormeFontFamily } from '../../components/pdf/forme/fonts'
import { adaptCommercialDocumentData } from '../../components/pdf/industryAdapter'
import { buildDetailRowsProjection } from '../../domain/invoice/projections/contentProjection'
import type { PdfDocumentModel } from '../../components/pdf/types'

function createSampleModel(): PdfDocumentModel {
  return {
    identity: {
      id: 'doc-1',
      kind: 'invoice',
      number: 'SASINV-000130',
      title: 'INVOICE',
      issueDate: '08/11/2026',
      dueDate: '22/11/2026',
      validUntil: null,
      poNumber: 'PO-7788',
      currency: 'NGN',
    },
    issuer: {
      name: 'Safe & Secure Ltd',
      taxId: 'TIN-99887766',
      phone: '+234 803 111 2233',
      email: 'billing@safesecure.ng',
      addressLines: ['12 Industrial Avenue', 'Ikeja, Lagos'],
      logoUrl: 'https://example.com/logo.png',
    },
    recipient: {
      name: 'Dangote Refinery Complex',
      addressLines: ['Lekki Free Trade Zone', 'Lagos'],
      phone: '+234 802 333 4455',
      email: 'procurement@dangote.com',
    },
    columns: [
      { key: 'num', label: '#', kind: 'builtin', align: 'center', pdfWidth: 24 },
      { key: 'description', label: 'Description', kind: 'builtin', align: 'left', pdfWidth: 200 },
      { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center', pdfWidth: 50 },
      { key: 'unit_price', label: 'Unit Price', kind: 'builtin', align: 'right', pdfWidth: 80 },
      { key: 'amount', label: 'Amount', kind: 'builtin', align: 'right', pdfWidth: 90 },
    ],
    items: [
      {
        id: 'item-1',
        rowType: 'line',
        description: 'Industrial Safety Helmet',
        quantity: 1,
        unit: 'set',
        unitPrice: 25000,
        amount: 25000,
        cells: {
          num: '1',
          description: 'Industrial Safety Helmet',
          quantity: '1set',
          unit_price: '25,000',
          amount: '25,000',
        },
      },
      {
        id: 'item-2',
        rowType: 'line',
        description: 'Hydraulic Lubricant Oil',
        quantity: 3,
        unit: 'Gallons',
        unitPrice: 45000,
        amount: 135000,
        cells: {
          num: '2',
          description: 'Hydraulic Lubricant Oil',
          quantity: '3Gallons',
          unit_price: '45,000',
          amount: '135,000',
        },
      },
    ],
    totals: {
      mode: 'standard',
      rows: [
        { label: 'Subtotal', value: '160,000' },
        { label: 'VAT (7.5%)', value: '12,000' },
      ],
      amountInWords: 'One Hundred And Seventy Two Thousand Naira Only',
      balanceDue: '172,000',
      advanceSummary: null,
    },
    bankDetails: {
      bankName: 'Zenith Bank',
      accountName: 'Safe & Secure Ltd',
      accountNumber: '1012345678',
    },
    notes: {
      title: 'Notes',
      content: '<p>All materials are inspected and certified.</p>',
    },
    terms: null,
    additionalSections: [],
    referenceLinks: [],
    attachments: [],
    signature: {
      name: 'Engr. D. Adeleke',
      title: 'Project Lead',
    },
    logo: {
      imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      width: 100,
      height: 100,
    },
    footerText: '',
    tagline: 'Leading the future of industrial safety',
    metaFooter: {
      documentNumber: 'SASINV-000130',
      companyName: 'Safe & Secure Ltd',
    },
    template: {},
  }
}

function extractAllNodes(node: any, matchFn: (node: any) => boolean, results: any[] = []): any[] {
  if (!node || typeof node !== 'object') return results
  if (matchFn(node)) results.push(node)
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => extractAllNodes(entry, matchFn, results))
    } else if (typeof value === 'object') {
      extractAllNodes(value, matchFn, results)
    }
  }
  return results
}

function extractTextContent(node: any, out: string[] = []): string[] {
  if (!node) return out
  if (typeof node === 'string') {
    out.push(node)
    return out
  }
  if (Array.isArray(node)) {
    node.forEach((item) => extractTextContent(item, out))
    return out
  }
  if (typeof node !== 'object') return out
  if (node.kind && typeof node.kind === 'object') {
    if (typeof node.kind.content === 'string') out.push(node.kind.content)
    if (Array.isArray(node.kind.runs)) {
      node.kind.runs.forEach((run: any) => {
        if (run && typeof run.content === 'string') out.push(run.content)
      })
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'kind') extractTextContent(value, out)
  }
  return out
}

test('Landscape Forme footer wraps logo in white container badge with contain fitting', () => {
  const model = createSampleModel()
  const data = adaptCommercialDocumentData(model)
  const tree = serialize(React.createElement(LandscapeFormeDocument, { data }))

  const images = extractAllNodes(tree, (n) => n.kind && typeof n.kind === 'object' && n.kind.type === 'Image')
  assert.ok(images.length > 0, 'Document must contain serialized images')

  const footerLogo = images.find((img) => typeof img.kind.src === 'string' && img.kind.src.startsWith('data:image/png;base64,'))
  assert.ok(footerLogo, 'Footer logo image must exist')
  assert.equal(footerLogo.style?.width?.Pt, 11)
  assert.equal(footerLogo.style?.height?.Pt, 11)

  // Find parent container with white background
  const whiteBadges = extractAllNodes(
    tree,
    (n) => n.style?.backgroundColor?.r === 1 && n.style?.backgroundColor?.g === 1 && n.style?.backgroundColor?.b === 1 && n.style?.width?.Pt === 14,
  )
  assert.ok(whiteBadges.length > 0, 'Footer logo must be contained in a 14x14 white badge')
  assert.equal(whiteBadges[0].style?.height?.Pt, 14)
  assert.equal(whiteBadges[0].style?.borderRadius?.top_left, 2)
})

test('Landscape Forme renders bottom 12-cell coordinate ruler strip in footer', () => {
  const model = createSampleModel()
  const data = adaptCommercialDocumentData(model)
  const tree = serialize(React.createElement(LandscapeFormeDocument, { data }))

  const fixedFooters = extractAllNodes(tree, (n) => n.kind?.type === 'Fixed' && n.kind?.position === 'Footer')
  assert.equal(fixedFooters.length, 1, 'Page must contain one Fixed Footer')

  const footerRuler = fixedFooters[0].children[0]
  assert.ok(footerRuler, 'Footer ruler view must exist')
  assert.equal(footerRuler.children.length, 12, 'Footer ruler must contain 12 cells')

  const cellNumbers = footerRuler.children.map((c: any) => c.children?.[0]?.kind?.content)
  assert.deepEqual(cellNumbers, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])
})

test('Landscape Forme suppresses duplicate Notes label when only notes section is present', () => {
  const model = createSampleModel()
  assert.equal(model.terms, null, 'Sample has notes but no terms')

  const data = adaptCommercialDocumentData(model)
  const tree = serialize(React.createElement(LandscapeFormeDocument, { data }))

  const allTexts = extractTextContent(tree)
  // "Notes" should appear in SectionBand title, but NOT as an inner SectionLabel
  const notesOccurrences = allTexts.filter((t) => t.trim().toLowerCase() === 'notes')
  assert.equal(notesOccurrences.length, 1, 'Notes title must appear exactly once, without an inner duplicate label')
})

test('Landscape Forme formats merged quantity-unit with spacing at presentation time', () => {
  const model = createSampleModel()
  const data = adaptCommercialDocumentData(model)
  const tree = serialize(React.createElement(LandscapeFormeDocument, { data }))

  const allTexts = extractTextContent(tree).join(' ')
  assert.ok(allTexts.includes('1 set'), 'Quantity "1set" must be rendered with space as "1 set"')
  assert.ok(allTexts.includes('3 Gallons'), 'Quantity "3Gallons" must be rendered with space as "3 Gallons"')
})

test('buildDetailRowsProjection emits custom payment terms when payment_terms is Custom', () => {
  const rows = buildDetailRowsProjection({
    poNumber: 'PO-100',
    invoice: {
      payment_terms: 'Custom',
      custom_payment_terms: '50% advance deposit, 50% upon delivery',
    } as any,
  })

  const termsRow = rows.find((r) => r.label === 'Payment Terms')
  assert.ok(termsRow, 'Payment terms row must exist')
  assert.equal(termsRow.value, '50% advance deposit, 50% upon delivery')
})

test('Landscape Forme generates valid PDF bytes with all refinements applied', async () => {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Archivo Black')
  await ensureFormeFontFamily('Noto Sans')

  const model = createSampleModel()
  const data = adaptCommercialDocumentData(model)
  const bytes = await renderPdfcnToBytes(React.createElement(LandscapeFormeDocument, { data }))

  assert.ok(bytes instanceof Uint8Array, 'PDF bytes must be a Uint8Array')
  assert.ok(bytes.length > 1000, `PDF bytes must be non-empty (got ${bytes.length} bytes)`)
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString('utf8'), '%PDF-')
})
