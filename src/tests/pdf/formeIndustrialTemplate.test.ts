/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize } from '@formepdf/react'
import { PDFDocument, PDFName } from 'pdf-lib'

import { IndustrialFormeDocument, INDUSTRIAL_TOKENS } from '../../components/pdf/forme/IndustrialFormeDocument'
import { type CommercialDocumentData } from '../../components/pdf/industryAdapter'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import { ensureFormeFontFamily } from '../../components/pdf/forme/fonts'
import { normalizeInvoicePdfTemplateId } from '../../domain/invoice/types'

function colorToHex(color: any): string | null {
  if (!color || typeof color !== 'object') return null
  if (typeof color.r !== 'number') return null
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0')
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0')
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`.toUpperCase()
}

const SAMPLE_BASE64_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function createSampleIndustrialData(overrides: Partial<CommercialDocumentData> = {}): CommercialDocumentData {
  return {
    title: 'INVOICE',
    customTitle: 'Materials, Equipment & Supplies — Phase 2',
    documentNumber: 'INV-2026-0147',
    documentNumberLabel: 'Document no.',
    issueDate: '30/10/2026',
    issueDateLabel: 'Issue date',
    dueDateOrValidityDate: '29/11/2026',
    dueDateOrValidityDateLabel: 'Due date',
    poNumber: 'NGF-LPO-4471',
    poNumberLabel: 'Client PO Ref.',
    customHeaderFields: [
      { label: 'Project Manager', value: 'Eng. C. Okeke' },
      { label: 'Delivery Window', value: '4–6 weeks' },
    ],
    showTagline: true,
    showBankDetails: true,
    company: {
      companyLogoUrl: SAMPLE_BASE64_IMAGE,
      name: 'Kestrel Industrial Supply Ltd',
      tagline: 'Engineering Procurement & Industrial Contracting',
      address: 'Plot 14, Block C, Agbara Industrial Estate',
      cityState: 'Agbara, Ogun State',
      phone: '+234 800 555 0142',
      email: 'sales@kestrel-industrial.example',
      website: 'www.kestrel-industrial.example',
      customInfo: [{ label: 'TIN', value: '20384756-0001' }],
    },
    client: {
      name: 'Northgate Foods Processing Nigeria Ltd',
      attention: 'Ms. Adaeze Obi — Procurement Lead',
      address: 'Km 18, Lagos–Ibadan Expressway',
      cityState: 'Mowe, Ogun State',
      phone: '+234 800 555 0177',
      email: 'procurement@northgate-foods.example',
    },
    table: {
      columns: [
        { key: 'num', label: '#', align: 'center', width: 26 },
        { key: 'description', label: 'Description / specification', align: 'left' },
        { key: 'quantity', label: 'Qty', align: 'right', width: 34 },
        { key: 'unit', label: 'Unit', align: 'left', width: 40 },
        { key: 'unit_price', label: 'Unit Price (₦)', align: 'right', width: 72 },
        { key: 'amount', label: 'Amount', align: 'right', width: 80 },
      ],
      rows: [
        {
          rowType: 'standard',
          cells: {
            num: 1,
            description: { main: 'Reinforcing steel rebar 16mm TMT', sub: 'Grade 500B — BS 4449; 12 m lengths' },
            quantity: '120',
            unit: 'tonnes',
            unit_price: '₦ 1,250,000.00',
            amount: '₦ 150,000,000.00',
          },
        },
        {
          rowType: 'group_header',
          groupName: 'Electrical — Power Cables & Distribution',
          groupLabel: 'GROUP A — Electrical — Power Cables & Distribution',
        },
        {
          rowType: 'standard',
          isInGroup: true,
          imageUrl: SAMPLE_BASE64_IMAGE,
          cells: {
            num: 2,
            description: { main: 'Armoured power cable 4-core 95 mm²', sub: '0.6/1 kV — BS 5467' },
            quantity: '1,500',
            unit: 'm',
            unit_price: '₦ 28,400.00',
            amount: '₦ 42,600,000.00',
          },
        },
        {
          rowType: 'standard',
          isInGroup: true,
          cells: {
            num: 3,
            description: { main: 'Main LV distribution board, 800 A, TPN', sub: 'Form 2b, IP54 floor-standing' },
            quantity: '6',
            unit: 'pcs',
            unit_price: '₦ 1,850,000.00',
            amount: '₦ 11,100,000.00',
          },
        },
        {
          rowType: 'group_footer',
          showSubtotal: true,
          groupSubtotalValue: '₦ 53,700,000.00',
        },
      ],
    },
    paymentDetails: {
      bankName: 'First Meridian Bank',
      accountName: 'Kestrel Industrial Supply Ltd',
      accountNumber: '0123456789',
      sortCode: '044150',
    },
    totals: {
      lines: [
        { label: 'Gross subtotal', value: '₦ 203,700,000.00' },
        { label: 'Subtotal discount (2.5%)', value: '₦ 5,092,500.00', isDeduction: true },
        { label: 'VAT (7.5%)', value: '₦ 14,895,562.50' },
        { label: 'WHT (5.0%) — deducted', value: '₦ 9,930,375.00', isDeduction: true },
      ],
      mainLine: { label: 'Total Amount Due', value: '₦ 203,672,687.50' },
      amountInWords: 'Two Hundred and Three Million, Six Hundred and Seventy-Two Thousand, Six Hundred and Eighty-Seven Naira and Fifty Kobo Only',
      balanceDue: { label: 'Balance Due', value: '₦ 203,672,687.50' },
    },
    advanceSummary: null,
    notes: {
      title: 'Notes',
      content: 'Scope: materials, equipment and supplies for Phase 2 under contract NGF/CON/2026/P2-014.',
      plainText: 'Scope: materials, equipment and supplies for Phase 2 under contract NGF/CON/2026/P2-014.',
    },
    terms: {
      title: 'Terms & Conditions',
      content: 'Net 30 days from invoice date. Goods remain the property of the issuer until paid in full.',
      plainText: 'Net 30 days from invoice date. Goods remain the property of the issuer until paid in full.',
    },
    attachments: [],
    additionalFields: [],
    signature: {
      name: 'Mr. Chukwuemeka Daniels',
      role: 'Authorised Signatory',
      imageUrl: SAMPLE_BASE64_IMAGE,
    },
    footer: {
      documentNumber: 'INV-2026-0147',
      companyName: 'Kestrel Industrial Supply Ltd',
      extraText: '',
    },
    layout: {
      size: 'A4',
      orientation: 'portrait',
    },
    design: {
      accentColor: '#DC5A21',
      textColor: '#1D2528',
      mutedColor: '#5D6B70',
      borderColor: '#AEB6B4',
      surfaceColor: '#ECEEEA',
      headerFont: 'Archivo Black',
      bodyFont: 'Inter',
      useCustomFonts: false,
      useCustomColors: false,
    },
    ...overrides,
  }
}

function findNodes(node: any, predicate: (n: any) => boolean, results: any[] = []): any[] {
  if (!node || typeof node !== 'object') return results
  if (predicate(node)) results.push(node)

  const children = node.children || node.kind?.children || []
  if (Array.isArray(children)) {
    for (const child of children) {
      findNodes(child, predicate, results)
    }
  }
  return results
}

test('Industrial template identity resolves cleanly', () => {
  assert.equal(normalizeInvoicePdfTemplateId('industrial'), 'industrial')
})

test('Industrial Forme document renders with correct page geometry and graphite/orange tokens', () => {
  const data = createSampleIndustrialData()
  const tree = serialize(React.createElement(IndustrialFormeDocument, { data }))

  const page = findNodes(tree, (n) => n?.kind?.type === 'Page')[0]
  assert.ok(page, 'Must contain a Page node')
  assert.equal(page.kind?.config?.size, 'A4', 'Page size must be A4')
  assert.equal(colorToHex(page?.style?.backgroundColor), INDUSTRIAL_TOKENS.paper.toUpperCase(), 'Page must use industrial paper background #F6F6F2')

  // Check display title uses Archivo Black
  const titleNodes = findNodes(tree, (n) => {
    const content = n?.kind?.content || n?.kind?.runs?.[0]?.content
    return typeof content === 'string' && content.toUpperCase().includes('INVOICE')
  })
  assert.ok(titleNodes.length > 0, 'Must render INVOICE title')
  const mainTitle = titleNodes.find((n) => n?.style?.fontFamily === 'Archivo Black')
  assert.ok(mainTitle, 'Document title must use Archivo Black display font')
})

test('Industrial table groups are enclosed in continuous rectangular graphite outline with neutral row background', () => {
  const data = createSampleIndustrialData()
  const tree = serialize(React.createElement(IndustrialFormeDocument, { data }))

  // Group header: cell has 1.5pt top, left, right border with #1D2528 and white background
  const groupHeaderCells = findNodes(tree, (n) =>
    n?.style?.borderWidth?.top === 1.5 &&
    colorToHex(n?.style?.borderColor?.top) === INDUSTRIAL_TOKENS.graphite.toUpperCase()
  )
  assert.ok(groupHeaderCells.length > 0, 'Group header must have 1.5pt graphite top border')
  assert.equal(groupHeaderCells[0]?.style?.borderWidth?.left, 1.5, 'Group header must have 1.5pt left border')
  assert.equal(groupHeaderCells[0]?.style?.borderWidth?.right, 1.5, 'Group header must have 1.5pt right border')

  // Check group member row cells have left/right graphite border
  const memberFirstCells = findNodes(tree, (n) =>
    n?.style?.borderWidth?.left === 1.5 &&
    colorToHex(n?.style?.borderColor?.left) === INDUSTRIAL_TOKENS.graphite.toUpperCase() &&
    n?.style?.borderWidth?.top !== 1.5
  )
  assert.ok(memberFirstCells.length > 0, 'Group member row must have 1.5pt left border')

  // Check group footer (subtotal) has bottom, left, right 1.5pt graphite border
  const groupFooterCells = findNodes(tree, (n) =>
    n?.style?.borderWidth?.bottom === 1.5 &&
    colorToHex(n?.style?.borderColor?.bottom) === INDUSTRIAL_TOKENS.graphite.toUpperCase()
  )
  assert.ok(groupFooterCells.length > 0, 'Group footer must have 1.5pt bottom graphite border')
  assert.equal(colorToHex(groupFooterCells[0]?.style?.backgroundColor), INDUSTRIAL_TOKENS.panel.toUpperCase(), 'Group footer uses industrial panel background #ECEEEA')
})

test('Industrial line-item and company images carry direct native hyperlinks without Open image text', () => {
  const data = createSampleIndustrialData()
  const tree = serialize(React.createElement(IndustrialFormeDocument, { data }))

  const imagesWithHref = findNodes(tree, (n) =>
    n?.kind?.type === 'Image' && n?.href === SAMPLE_BASE64_IMAGE
  )
  assert.ok(imagesWithHref.length >= 2, 'Line-item and company logo must carry direct href on Image')

  // Verify zero "Open image" text
  const openImageNodes = findNodes(tree, (n) => {
    const text = n?.kind?.content || n?.kind?.runs?.[0]?.content
    return typeof text === 'string' && text.toLowerCase().includes('open image')
  })
  assert.equal(openImageNodes.length, 0, 'Must have zero Open image text')
})

test('Industrial deductions format with leading minus and render in restrained deduction red (#B42318)', () => {
  const data = createSampleIndustrialData()
  const tree = serialize(React.createElement(IndustrialFormeDocument, { data }))

  const deductionNodes = findNodes(tree, (n) => {
    const content = n?.kind?.content || n?.kind?.runs?.[0]?.content
    return typeof content === 'string' && content.includes('−₦')
  })
  assert.ok(deductionNodes.length > 0, 'Deductions must format with minus sign')
  const redDeduction = deductionNodes.find((n) => colorToHex(n?.style?.color) === INDUSTRIAL_TOKENS.deductionRed.toUpperCase())
  assert.ok(redDeduction, 'Deductions must render in industrial deduction red #B42318')
})

test('Industrial total callout renders heavy orange accent stripe and NGN currency code', () => {
  const data = createSampleIndustrialData()
  const tree = serialize(React.createElement(IndustrialFormeDocument, { data }))

  const orangeStripeContainers = findNodes(tree, (n) =>
    n?.style?.borderWidth?.left === 8 &&
    colorToHex(n?.style?.borderColor?.left) === INDUSTRIAL_TOKENS.orange.toUpperCase()
  )
  assert.ok(orangeStripeContainers.length > 0, 'Total callout must have 8pt solid orange left stripe')
})

test('Industrial generates valid PDF bytes with pdf-lib link annotations and 4-family fonts', async () => {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Archivo Black')
  await ensureFormeFontFamily('Caveat')
  await ensureFormeFontFamily('Noto Sans')

  const data = createSampleIndustrialData()
  const element = React.createElement(IndustrialFormeDocument, { data })

  const bytes = await renderPdfcnToBytes(element)
  assert.ok(bytes instanceof Uint8Array, 'Must produce Uint8Array')
  assert.ok(bytes.length > 1000, 'PDF bytes must be non-empty')

  // Check PDF signature
  const header = String.fromCharCode(...bytes.slice(0, 5))
  assert.equal(header, '%PDF-', 'Must produce valid PDF header')

  // Parse with pdf-lib to verify link annotations
  const doc = await PDFDocument.load(bytes)
  assert.equal(doc.getPageCount(), 1, 'Sample document should be 1 page')

  const page = doc.getPage(0)
  const annots = page.node.Annots()
  assert.ok(annots && annots.size() >= 2, 'Page must contain at least 2 annotations')

  let linkCount = 0
  for (let i = 0; i < annots.size(); i++) {
    const dict = doc.context.lookup(annots.get(i)) as any
    const subtype = dict?.get(PDFName.of('Subtype'))?.toString()
    if (subtype === '/Link') {
      linkCount++
      const a = dict.get(PDFName.of('A'))
      const resolvedA = doc.context.lookup(a) as any
      const uri = resolvedA?.get(PDFName.of('URI'))
      assert.ok(uri, 'Link annotation must contain destination URI')
    }
  }
  assert.ok(linkCount >= 2, 'Should have at least 2 link annotations (logo and line item image)')
})

test('Multi-page Industrial document maintains clean table flow, group enclosure, and fixed footer across all pages', async () => {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Archivo Black')
  await ensureFormeFontFamily('Caveat')
  await ensureFormeFontFamily('Noto Sans')

  const baseData = createSampleIndustrialData()
  const rows: any[] = []
  for (let g = 1; g <= 3; g++) {
    rows.push({
      rowType: 'group_header',
      groupName: `Section ${g} — Industrial Materials`,
      groupLabel: `GROUP ${String.fromCharCode(64 + g)} — Section ${g} — Industrial Materials`,
    })
    for (let r = 1; r <= 8; r++) {
      rows.push({
        rowType: 'standard',
        isInGroup: true,
        cells: {
          num: (g - 1) * 8 + r,
          description: { main: `Industrial Component ${g}-${r}`, sub: `Specification for component ${g}-${r}` },
          quantity: `${r * 10}`,
          unit: 'pcs',
          unit_price: `₦ ${(r * 15000).toLocaleString()}`,
          amount: `₦ ${(r * 10 * r * 15000).toLocaleString()}`,
        },
      })
    }
    rows.push({
      rowType: 'group_footer',
      showSubtotal: true,
      groupSubtotalValue: `₦ ${(g * 5000000).toLocaleString()}`,
    })
  }

  const multiPageData = {
    ...baseData,
    table: {
      ...baseData.table,
      rows,
    },
  }

  const bytes = await renderPdfcnToBytes(React.createElement(IndustrialFormeDocument, { data: multiPageData }))
  const doc = await PDFDocument.load(bytes)
  const pageCount = doc.getPageCount()
  assert.ok(pageCount >= 2, `Multi-page document should produce at least 2 pages, got ${pageCount}`)

  for (let p = 0; p < pageCount; p++) {
    const page = doc.getPage(p)
    assert.equal(page.getWidth(), 595.28, `Page ${p + 1} width must be 595.28 pt`)
    assert.equal(page.getHeight(), 841.89, `Page ${p + 1} height must be 841.89 pt`)
  }
})

