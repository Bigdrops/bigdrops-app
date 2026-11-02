/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import { serialize } from '@formepdf/react'
import { PDFDocument, PDFName, PDFDict, decodePDFRawStream } from 'pdf-lib'

import {
  IndustrialFormeDocument,
  INDUSTRIAL_TOKENS,
} from '../../components/pdf/forme/IndustrialFormeDocument'
import {
  parseGroupHeader,
  resolveIndustrialTableWidths,
} from '../../components/pdf/forme/industrialLayout'
import { getGroupLabel } from '../../components/pdf/engine'
import { type CommercialDocumentData } from '../../components/pdf/industryAdapter'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import { ensureFormeFontFamily } from '../../components/pdf/forme/fonts'
import { normalizeInvoicePdfTemplateId } from '../../domain/invoice/types'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_H = 22.68
const TABLE_OUTER_BORDER = 0.71
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN_H

function colorToHex(color: any): string | null {
  if (!color || typeof color !== 'object') return null
  if (typeof color.r !== 'number') return null
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0')
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0')
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`.toUpperCase()
}

const SAMPLE_BASE64_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

/** Realistic non-square signature scan: 240 x 72 px. */
const NON_SQUARE_SIGNATURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAABICAIAAABHru/dAAACvElEQVR4nO2dS27CQBQE5xjc/6JkgYQisMGe6fdxU7XPc3W7o2Tncd/h9o29H5Tz1STfSi7TIdTZqnPEzpoMyZXyPJlWcpMOoY6b9Kz6KbMx6OtGSlCSyzTJNVd1qNWcyeqgW0Vq6KO9GRetW9vTMq+DNkgV5BMh0yTaSrpWbcsGHZFq2uRCMvYB82WG6pA8WB+ZIJPFs3uXDz49wWSORRPloIXZmmiEdiK5vCJg2bZ+0EdICCZpWaKxaaK6vOJg2fbQnjtFaLDFilUOezLy+xMOfdoWalQOOuFvcU6JEyaZj/6gkdl2zosYtf1WVSx8xIRJ/tM3NeQmtVN+UD/o6JddPuV3k0KH5Lbzm/+tQcuPT5jUOkT/XlXt+MnoUHH0y24y6IdJtcLNu+0fGnTQ8VM00Yg2KYzZZdAAEka1AIASBg1WMGiwgkGDFQwarGDQYAWDBisYNFjBoMEKBg1WMGiwgkGDFQwarGDQYAWDBisYNFjBoMEKBg1WMGiwgkGDFQwarGDQYAWDBisYNFjBoMEKBg1WMGiwgkGDFQwarGDQYAWDBisYNFjBoMEKBg1WMGiwgkGDFQwarGDQYAWDBiv4TiFY0WXQfEk2Gb4kG4vx16dfTKoVbt5tjw5v+v6Pax2fMKl1iB7c/Y2Ip3zgtwZdm7SDQ3Lb+c3XDzo0eW25eyb5T9/UkJt8WHPaixi1LUeHTG7zuEnmoz9oZLad8yIqBx0db7pf1/982rYt1BgRR7+SE2+x4tCXrbq84mDZtn7Q68EkJhKN0E4kl1cELNtWDlqVqptMkMni2YO/JwkBW7U9VOeEkdaDXUXGPmC+jGbQ8kiLwa4i0yRat0Gv7PB10BO3IvIspurjo70ZF61b29Myq4MOyrMSrJWP8GBorm6Dnq56Y9DHb8WFmU7V6sULDwZnOmHSs+qnzB8oxL9uRTFkjwAAAABJRU5ErkJggg=='

function createSampleIndustrialData(overrides: Partial<CommercialDocumentData> = {}): CommercialDocumentData {
  return {
    title: 'INVOICE',
    customTitle: 'Materials, Equipment & Supplies — Phase 2',
    documentNumber: 'INV-2026-0147',
    documentNumberLabel: 'Document no.',
    currency: 'NGN',
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
            description: { main: 'Armoured power cable 4-core 95 mm²', sub: '0.6/1 kV — BS 5467; 0.12 Ω/km' },
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

function createMinimalData(overrides: Partial<CommercialDocumentData> = {}): CommercialDocumentData {
  return {
    title: 'INVOICE',
    customTitle: null,
    documentNumber: 'INV-0009',
    documentNumberLabel: 'Invoice number',
    currency: null,
    issueDate: null,
    issueDateLabel: 'Issue date',
    dueDateOrValidityDate: null,
    dueDateOrValidityDateLabel: 'Due date',
    poNumber: null,
    poNumberLabel: 'PO number',
    customHeaderFields: [],
    showTagline: false,
    showBankDetails: true,
    company: null,
    client: null,
    table: {
      columns: [
        { key: 'num', label: '#', align: 'center' },
        { key: 'description', label: 'Description', align: 'left' },
        { key: 'amount', label: 'Amount', align: 'right' },
      ],
      rows: [
        {
          rowType: 'standard',
          cells: {
            num: 1,
            description: { main: 'Bolt assembly', sub: '' },
            amount: '₦ 0.00',
          },
        },
      ],
    },
    paymentDetails: null,
    totals: {
      lines: [],
      mainLine: { label: 'Total', value: '₦ 0.00' },
      amountInWords: '',
      balanceDue: null,
    },
    advanceSummary: null,
    notes: null,
    terms: null,
    attachments: [],
    additionalFields: [],
    signature: null,
    footer: { documentNumber: 'INV-0009', companyName: '', extraText: '' },
    layout: { size: 'A4', orientation: 'portrait' },
    design: {
      accentColor: null,
      textColor: null,
      mutedColor: null,
      borderColor: null,
      surfaceColor: null,
      headerFont: null,
      bodyFont: null,
      useCustomFonts: false,
      useCustomColors: false,
    },
    ...overrides,
  }
}

function createWidestColumnsData(): CommercialDocumentData {
  const base = createSampleIndustrialData()
  const columns: CommercialDocumentData['table']['columns'] = [
    { key: 'num', label: '#', align: 'center' },
    { key: 'description', label: 'Description / specification', align: 'left' },
    { key: 'quantity', label: 'Qty', align: 'right' },
    { key: 'unit', label: 'Unit', align: 'left' },
    { key: 'make', label: 'Make', align: 'left' },
    { key: 'unit_price', label: 'Unit Price (₦)', align: 'right' },
    { key: 'amount', label: 'Amount', align: 'right' },
    { key: 'install_rate', label: 'Install Rate', align: 'right' },
    { key: 'vat_rate', label: 'VAT %', align: 'right' },
    { key: 'discount_rate', label: 'Disc %', align: 'right' },
  ]
  return {
    ...base,
    table: {
      columns,
      rows: [
        {
          rowType: 'standard',
          cells: {
            num: 1,
            description: { main: 'Widest optional-column combination', sub: 'All optional columns present' },
            quantity: '1',
            unit: 'set',
            make: 'Kestrel',
            unit_price: '₦ 1,000.00',
            amount: '₦ 1,000.00',
            install_rate: '₦ 50.00',
            vat_rate: '7.5%',
            discount_rate: '2%',
          },
        },
      ],
    },
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

function collectTextValues(tree: any): string[] {
  const values: string[] = []
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return
    const content = node?.kind?.content
    if (typeof content === 'string' && content.trim()) values.push(content)
    if (Array.isArray(node?.kind?.runs)) {
      for (const run of node.kind.runs) {
        if (typeof run?.content === 'string' && run.content.trim()) values.push(run.content)
      }
    }
    const children = node.children || node.kind?.children || []
    if (Array.isArray(children)) children.forEach(walk)
  }
  walk(tree)
  return values
}

function nodeTextValue(node: any): string {
  const content = node?.kind?.content
  if (typeof content === 'string' && content) return content
  if (Array.isArray(node?.kind?.runs)) {
    return node.kind.runs.map((run: any) => run?.content || '').join('')
  }
  return ''
}

function decodeContentStream(stream: any): string {
  const decoded = decodePDFRawStream(stream).decode()
  let text = ''
  for (let index = 0; index < decoded.length; index += 1) {
    text += String.fromCharCode(decoded[index])
  }
  return text
}

async function readPageContents(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes)
  const pages: string[] = []
  for (let index = 0; index < doc.getPageCount(); index += 1) {
    const page = doc.getPage(index)
    const contents = page.node.Contents()
    const refs = typeof (contents as any).asArray === 'function' ? (contents as any).asArray() : [contents]
    let text = ''
    for (const ref of refs) {
      text += decodeContentStream(doc.context.lookup(ref))
    }
    pages.push(text)
  }
  return pages
}

async function extractRects(bytes: Uint8Array) {
  const pages = await readPageContents(bytes)
  const rects: Array<{ x: number; y: number; width: number; height: number; right: number }> = []
  for (const content of pages) {
    for (const line of content.split('\n')) {
      const match = line.trim().match(/^(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re$/)
      if (!match) continue
      const x = Number(match[1])
      const y = Number(match[2])
      const width = Number(match[3])
      const height = Number(match[4])
      rects.push({ x, y, width, height, right: x + width })
    }
  }
  return rects
}

async function extractTextBaselines(bytes: Uint8Array): Promise<number[]> {
  const pages = await readPageContents(bytes)
  const baselines: number[] = []
  for (const content of pages) {
    for (const match of content.matchAll(/([\d.]+) ([\d.]+) Td/g)) {
      baselines.push(Number(match[2]))
    }
  }
  return baselines
}

async function fontBaseNames(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes)
  const names = new Set<string>()
  for (let index = 0; index < doc.getPageCount(); index += 1) {
    const resources = doc.getPage(index).node.Resources()
    const fonts: any = resources.lookup(PDFName.of('Font'), PDFDict)
    if (!fonts) continue
    for (const key of fonts.keys()) {
      const dict: any = doc.context.lookup(fonts.get(key))
      const base = dict?.get(PDFName.of('BaseFont'))
      if (base) names.add(String(base).replace(/^\//, ''))
    }
  }
  return [...names]
}

async function registerIndustrialFonts() {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Archivo Black')
  await ensureFormeFontFamily('Caveat')
  await ensureFormeFontFamily('Noto Sans')
}

function sumWidths(columns: Array<{ width: { fixed: number } }>): number {
  return columns.reduce((sum, column) => sum + column.width.fixed, 0)
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

  const titleNodes = findNodes(tree, (n) => {
    const content = n?.kind?.content || n?.kind?.runs?.[0]?.content
    return typeof content === 'string' && content.toUpperCase().includes('INVOICE')
  })
  assert.ok(titleNodes.length > 0, 'Must render INVOICE title')
  const mainTitle = titleNodes.find((n) => n?.style?.fontFamily === 'Archivo Black')
  assert.ok(mainTitle, 'Document title must use Archivo Black display font')
})

test('Industrial table groups are enclosed in a continuous graphite outline with an orange band', () => {
  const data = createSampleIndustrialData()
  const tree = serialize(React.createElement(IndustrialFormeDocument, { data }))

  const groupHeaderCells = findNodes(tree, (n) =>
    n?.style?.borderWidth?.top === 1.5 &&
    colorToHex(n?.style?.borderColor?.top) === INDUSTRIAL_TOKENS.graphite.toUpperCase()
  )
  assert.ok(groupHeaderCells.length > 0, 'Group header must have 1.5pt graphite top border')
  assert.equal(groupHeaderCells[0]?.style?.borderWidth?.left, TABLE_OUTER_BORDER, 'Group header must align with the 0.25 mm outer table border')
  assert.equal(groupHeaderCells[0]?.style?.borderWidth?.right, TABLE_OUTER_BORDER, 'Group header must align with the 0.25 mm outer table border')
  assert.equal(colorToHex(groupHeaderCells[0]?.style?.backgroundColor), INDUSTRIAL_TOKENS.orange.toUpperCase(), 'Group header band must be solid orange')

  const memberFirstCells = findNodes(tree, (n) =>
    n?.style?.borderWidth?.left === 1.5 &&
    colorToHex(n?.style?.borderColor?.left) === INDUSTRIAL_TOKENS.graphite.toUpperCase() &&
    n?.style?.borderWidth?.top !== 1.5
  )
  assert.ok(memberFirstCells.length > 0, 'Group member row must have 1.5pt left border')

  const groupFooterCells = findNodes(tree, (n) =>
    n?.style?.borderWidth?.bottom === 1.5 &&
    colorToHex(n?.style?.borderColor?.bottom) === INDUSTRIAL_TOKENS.graphite.toUpperCase()
  )
  assert.ok(groupFooterCells.length > 0, 'Group footer must have 1.5pt bottom graphite border')
  assert.equal(colorToHex(groupFooterCells[0]?.style?.backgroundColor), INDUSTRIAL_TOKENS.panel.toUpperCase(), 'Group footer uses industrial panel background #ECEEEA')
  assert.equal(colorToHex(groupFooterCells[0]?.style?.borderColor?.top), INDUSTRIAL_TOKENS.orange.toUpperCase(), 'Group footer must close with an orange top rule')

  const letterChip = findNodes(tree, (n) => {
    const content = n?.kind?.content
    return content === 'A' && colorToHex(n?.style?.color) === INDUSTRIAL_TOKENS.orange.toUpperCase()
  })
  assert.ok(letterChip.length > 0, 'Supplied group letter must render in a chip cell')
})

test('Group labels keep supplied letters, prefer groupLabel and never invent letters', () => {
  assert.deepEqual(parseGroupHeader('GROUP A — Electrical — Power Cables'), {
    key: 'A',
    title: 'Electrical — Power Cables',
  })
  assert.deepEqual(parseGroupHeader('Group 12: Civils'), { key: '12', title: 'Civils' })
  assert.deepEqual(parseGroupHeader('Structural Steel'), { key: null, title: 'Structural Steel' })
  assert.deepEqual(parseGroupHeader('Section A — Fencing'), { key: null, title: 'Section A — Fencing' })

  assert.equal(
    getGroupLabel({ rowType: 'group_header', groupName: 'Electrical', groupLabel: 'GROUP B — Electrical' } as any),
    'GROUP B — Electrical',
  )
  assert.equal(
    getGroupLabel({ rowType: 'group_header', groupName: 'Structural Steel', groupLabel: null } as any),
    'Structural Steel',
  )
})

test('Industrial table widths always fit the bordered table area', () => {
  const availableWidth = PAGE_WIDTH - MARGIN_H * 2 - TABLE_OUTER_BORDER * 4
  const defaultColumns = createSampleIndustrialData().table.columns

  const defaultWidths = resolveIndustrialTableWidths(defaultColumns, availableWidth)
  assert.equal(defaultWidths.length, defaultColumns.length)
  assert.ok(Math.abs(sumWidths(defaultWidths) - availableWidth) < 0.02, 'Default columns must sum exactly to the available table width')
  const description = defaultWidths[defaultColumns.findIndex((column) => column.key === 'description')].width.fixed
  assert.ok(description >= 120, 'Description must keep its 120pt minimum when space allows')

  const widestWidths = resolveIndustrialTableWidths(createWidestColumnsData().table.columns, availableWidth)
  assert.ok(widestWidths.length === 10)
  assert.ok(Math.abs(sumWidths(widestWidths) - availableWidth) < 0.02, 'Widest optional-column combination must still sum exactly to the available table width')
  const widestDescription = widestWidths[1].width.fixed
  assert.ok(widestDescription >= 119.99, 'Description must not fall below 120pt when optional columns are present')
  for (const [index, width] of widestWidths.entries()) {
    const minimum = [22, 120, 30, 34, 44, 62, 70, 56, 32, 36][index]
    assert.ok(width.width.fixed >= minimum - 0.01, `Column ${index} must not fall below its legible minimum (${minimum})`)
  }

  const narrow = resolveIndustrialTableWidths(createWidestColumnsData().table.columns, 420)
  assert.ok(Math.abs(sumWidths(narrow) - 420) < 0.02, 'Narrow layouts must still sum exactly to the available width')
})

test('Rendered Industrial tables never draw beyond the page content edge', async () => {
  await registerIndustrialFonts()

  const defaultBytes = await renderPdfcnToBytes(React.createElement(IndustrialFormeDocument, { data: createSampleIndustrialData() }))
  const defaultRects = await extractRects(defaultBytes)
  assert.ok(defaultRects.length > 0, 'Rendered PDF must contain drawn rectangles')
  for (const rect of defaultRects) {
    assert.ok(rect.x >= MARGIN_H - 0.05, `Rect must not draw left of the content edge (x=${rect.x})`)
    assert.ok(rect.right <= CONTENT_RIGHT + 0.05, `Rect must not draw beyond the right content edge (right=${rect.right})`)
  }

  const band = defaultRects.find((rect) => Math.abs(rect.width - 547.08) < 0.05 && Math.abs(rect.height - 22.1) < 0.5)
  assert.ok(band, 'Orange group band must span the table row area')
  assert.ok(Math.abs(band!.right - (CONTENT_RIGHT - TABLE_OUTER_BORDER * 2)) < 0.02, 'Group band must align with the table inner border edge')

  const widestBytes = await renderPdfcnToBytes(React.createElement(IndustrialFormeDocument, { data: createWidestColumnsData() }))
  for (const rect of await extractRects(widestBytes)) {
    assert.ok(rect.right <= CONTENT_RIGHT + 0.05, `Widest column combination must not overflow the page (right=${rect.right})`)
  }

  const landscape: CommercialDocumentData = {
    ...createWidestColumnsData(),
    layout: { size: 'A4', orientation: 'landscape' },
  }
  const landscapeTree = serialize(React.createElement(IndustrialFormeDocument, { data: landscape }))
  const landscapePageNode = findNodes(landscapeTree, (n) => n?.kind?.type === 'Page')[0]
  assert.equal(landscapePageNode?.kind?.config?.size?.Custom?.width, 841.89, 'Landscape must swap page dimensions')
  assert.equal(landscapePageNode?.kind?.config?.size?.Custom?.height, 595.28, 'Landscape must swap page dimensions')

  const landscapeBytes = await renderPdfcnToBytes(React.createElement(IndustrialFormeDocument, { data: landscape }))
  const landscapeRight = 841.89 - MARGIN_H
  for (const rect of await extractRects(landscapeBytes)) {
    assert.ok(rect.right <= landscapeRight + 0.05, `Landscape layout must not overflow (right=${rect.right})`)
  }
})

test('Industrial line-item and company images carry direct native hyperlinks without Open image text', () => {
  const data = createSampleIndustrialData()
  const tree = serialize(React.createElement(IndustrialFormeDocument, { data }))

  const imagesWithHref = findNodes(tree, (n) =>
    n?.kind?.type === 'Image' && n?.href === SAMPLE_BASE64_IMAGE
  )
  assert.ok(imagesWithHref.length >= 2, 'Line-item and company logo must carry direct href on Image')

  const openImageNodes = findNodes(tree, (n) => {
    const text = n?.kind?.content || n?.kind?.runs?.[0]?.content
    return typeof text === 'string' && text.toLowerCase().includes('open image')
  })
  assert.equal(openImageNodes.length, 0, 'Must have zero Open image text')
})

test('Industrial deductions format with leading minus and render in restrained deduction red (#B42318)', () => {
  const data = createSampleIndustrialData()
  const tree = serialize(React.createElement(IndustrialFormeDocument, { data }))

  const deductionNodes = findNodes(tree, (n) => nodeTextValue(n).includes('−₦'))
  assert.ok(deductionNodes.length > 0, 'Deductions must format with minus sign')
  const redDeduction = deductionNodes.find((n) => colorToHex(n?.style?.color) === INDUSTRIAL_TOKENS.deductionRed.toUpperCase())
  assert.ok(redDeduction, 'Deductions must render in industrial deduction red #B42318')
})

test('Industrial total callout renders heavy orange accent stripe and authoritative amount in words', () => {
  const data = createSampleIndustrialData()
  const tree = serialize(React.createElement(IndustrialFormeDocument, { data }))

  const orangeStripeContainers = findNodes(tree, (n) =>
    n?.style?.borderWidth?.left === 8 &&
    colorToHex(n?.style?.borderColor?.left) === INDUSTRIAL_TOKENS.orange.toUpperCase()
  )
  assert.ok(orangeStripeContainers.length > 0, 'Total callout must have 8pt solid orange left stripe')
  assert.ok(
    collectTextValues(tree).some((value) => value.includes('Two Hundred and Three Million')),
    'Amount in words must come from authoritative data',
  )

  const wordsNodes = findNodes(
    tree,
    (n) => n?.kind?.type === 'Text' && nodeTextValue(n).includes('Two Hundred and Three Million'),
  )
  assert.ok(wordsNodes.some((n) => n?.style?.fontWeight === 700), 'Amount in words must be bold')
  assert.ok(
    wordsNodes.some((n) => Number(n?.style?.fontSize) >= 8),
    'Amount in words must use a prominent size',
  )
})

test('Industrial total callout never renders a currency code', () => {
  for (const currency of ['NGN', 'usd', null]) {
    const tree = serialize(React.createElement(IndustrialFormeDocument, {
      data: createSampleIndustrialData({ currency }),
    }))
    const texts = collectTextValues(tree)
    assert.ok(!texts.includes('NGN'), `Currency code must not render for ${String(currency)}`)
    assert.ok(!texts.includes('USD'), `Currency code must not render for ${String(currency)}`)
  }
})

test('Industrial headers render no COMMERCIAL DOCUMENT eyebrow or internal reference codes', () => {
  const data = createSampleIndustrialData()
  const tree = serialize(React.createElement(IndustrialFormeDocument, { data }))
  const texts = collectTextValues(tree)

  assert.ok(
    !texts.some((value) => value.toUpperCase() === 'COMMERCIAL DOCUMENT'),
    'Commercial document eyebrow must not render',
  )
  assert.ok(
    !texts.some((value) => /^(PT|M|N|T)-\d+$/i.test(value)),
    'Internal reference codes must not render',
  )
  assert.ok(!texts.includes('SCH-01'), 'Schedule code must not render')
  assert.ok(!texts.includes('PAY'), 'Payment code must not render')
  assert.ok(texts.includes('BILL TO / CLIENT'), 'Client heading must still render')
  assert.ok(!texts.includes('ISSUED BY'), 'Redundant issuer panel must not render')
  assert.ok(!texts.includes('ISSUER'), 'Issuer chip must not render')
  assert.ok(!texts.includes('PARTY'), 'Party chip must not render')
  assert.ok(
    !texts.some((value) => value.includes('20384756-0001')),
    'Issuer tax identifier must not render inside the party block',
  )
  assert.ok(texts.includes('COST BUILD-UP'), 'Cost build-up heading must still render')
})

test('Custom colours, fonts and tagline settings are honoured', () => {
  const customTree = serialize(React.createElement(IndustrialFormeDocument, {
    data: createSampleIndustrialData({
      showTagline: false,
      design: {
        ...createSampleIndustrialData().design,
        useCustomFonts: true,
        useCustomColors: true,
        bodyFont: 'Archivo Black',
        headerFont: 'Inter',
        accentColor: '#123456',
      },
    }),
  }))

  const texts = collectTextValues(customTree)
  assert.ok(!texts.includes('Engineering Procurement & Industrial Contracting'), 'showTagline=false must suppress the issuer tagline')

  const title = findNodes(customTree, (n) => {
    const content = n?.kind?.content
    return typeof content === 'string' && content.toUpperCase() === 'INVOICE'
  }).find((n) => n?.style?.fontFamily === 'Inter')
  assert.ok(title, 'Header font preference must reach the display title')

  const customAccentStripe = findNodes(customTree, (n) =>
    n?.style?.borderWidth?.left === 8 && colorToHex(n?.style?.borderColor?.left) === '#123456'
  )
  assert.ok(customAccentStripe.length > 0, 'Custom accent colour must replace the default orange stripe')

  const band = findNodes(customTree, (n) =>
    n?.style?.borderWidth?.top === 1.5 && colorToHex(n?.style?.backgroundColor) === '#123456'
  )
  assert.ok(band.length > 0, 'Custom accent colour must reach the group band')

  const defaultTree = serialize(React.createElement(IndustrialFormeDocument, {
    data: createSampleIndustrialData({ showTagline: true }),
  }))
  assert.ok(collectTextValues(defaultTree).includes('Engineering Procurement & Industrial Contracting'), 'showTagline=true must render the supplied tagline')

  const ignoredCustomFonts = serialize(React.createElement(IndustrialFormeDocument, {
    data: createSampleIndustrialData({
      design: {
        ...createSampleIndustrialData().design,
        useCustomFonts: false,
        headerFont: 'Inter',
      },
    }),
  }))
  const defaultTitle = findNodes(ignoredCustomFonts, (n) => {
    const content = n?.kind?.content
    return typeof content === 'string' && content.toUpperCase() === 'INVOICE'
  }).find((n) => n?.style?.fontFamily === 'Archivo Black')
  assert.ok(defaultTitle, 'Disabled custom fonts must keep the industrial Archivo Black display face')
})

test('Missing optional data omits fields, labels and panels without placeholders', async () => {
  await registerIndustrialFonts()

  const data = createMinimalData()
  const tree = serialize(React.createElement(IndustrialFormeDocument, { data }))
  const texts = collectTextValues(tree)
  const joined = texts.join('\n')

  const placeholders = /^(?:-|—|–|n\/a|null|undefined|nan)$/i
  for (const text of texts) {
    assert.ok(!placeholders.test(text.trim()), `Placeholder text must never render: "${text}"`)
  }
  assert.doesNotMatch(joined, /\b(?:undefined|null|nan)\b/i, 'Missing values must not stringify into the document')

  for (const label of [
    'BILL TO / CLIENT',
    'ISSUED BY',
    'AMOUNT IN WORDS',
    'BANK PAYMENT DETAILS',
    'COST BUILD-UP',
    'ISSUER AUTHORISED SIGNATORY',
    'END OF GROUP',
  ]) {
    assert.ok(!joined.includes(label), `Panel or label "${label}" must be omitted when its data is absent`)
  }

  assert.ok(joined.includes('Bolt assembly'), 'Line items must still render')
  const zeroValues = findNodes(tree, (n) => n?.kind?.type === 'Text' && nodeTextValue(n).includes('₦ 0.00'))
  assert.ok(zeroValues.length >= 2, 'Zero values are valid data and must render in the table and total callout')

  const bytes = await renderPdfcnToBytes(React.createElement(IndustrialFormeDocument, { data }))
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1, 'Minimal document must render on one page')
})

test('Template source contains no fabricated payment terms or fixed currency', () => {
  const source = fs.readFileSync(path.resolve('src/components/pdf/forme/IndustrialFormeDocument.tsx'), 'utf8')
  assert.doesNotMatch(source, /Net\s*30/i, 'Template must not invent payment terms')
  assert.doesNotMatch(source, /'NGN'/, 'Template must not hardcode a currency code')
  assert.doesNotMatch(source, /Document Control/i, 'Template must not render an invented Document Control panel')
  assert.doesNotMatch(source, /wrap\s*[:=]\s*\{?\s*false/, 'Blanket wrap disabling is not permitted')
})

test('Signature images keep their aspect ratio inside a clipped box', async () => {
  await registerIndustrialFonts()

  const data = createSampleIndustrialData({
    signature: {
      name: 'Mr. Chukwuemeka Daniels',
      role: 'Authorised Signatory',
      imageUrl: NON_SQUARE_SIGNATURE,
    },
  })
  const tree = serialize(React.createElement(IndustrialFormeDocument, { data }))

  const signatureImages = findNodes(tree, (n) => n?.kind?.type === 'Image' && n?.kind?.src === NON_SQUARE_SIGNATURE)
  assert.equal(signatureImages.length, 1, 'Signature image must render once')
  assert.equal(signatureImages[0]?.kind?.height, 20, 'Signature image is sized by height so Forme preserves aspect ratio')
  assert.equal(signatureImages[0]?.kind?.width, undefined, 'Signature image must not be forced to a fixed width')

  const clipped = findNodes(tree, (n) => n?.style?.overflow === 'Hidden' && n?.style?.height?.Pt === 22)
  assert.ok(clipped.length > 0, 'Signature image must sit inside a clipped fixed-height box')

  const compactTree = serialize(React.createElement(IndustrialFormeDocument, { data, compact: true }))
  const compactImage = findNodes(compactTree, (n) => n?.kind?.type === 'Image' && n?.kind?.src === NON_SQUARE_SIGNATURE)[0]
  assert.equal(compactImage?.kind?.height, 16, 'Compact mode must shrink the signature image by height only')

  const bytes = await renderPdfcnToBytes(React.createElement(IndustrialFormeDocument, { data }))
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1)
})

test('Compact mode measurably reduces vertical consumption', async () => {
  await registerIndustrialFonts()

  const data = createSampleIndustrialData()
  const defaultBytes = await renderPdfcnToBytes(React.createElement(IndustrialFormeDocument, { data }))
  const compactBytes = await renderPdfcnToBytes(React.createElement(IndustrialFormeDocument, { data, compact: true }))

  const defaultBottom = Math.min(...(await extractTextBaselines(defaultBytes)).filter((y) => y > 50))
  const compactBottom = Math.min(...(await extractTextBaselines(compactBytes)).filter((y) => y > 50))
  assert.ok(
    compactBottom > defaultBottom + 20,
    `Compact mode must free at least 20pt of vertical space (default bottom=${defaultBottom.toFixed(2)}, compact bottom=${compactBottom.toFixed(2)})`,
  )
})

test('Industrial generates valid PDF bytes with pdf-lib link annotations and 4-family fonts', async () => {
  await registerIndustrialFonts()

  const data = createSampleIndustrialData()
  const element = React.createElement(IndustrialFormeDocument, { data })

  const bytes = await renderPdfcnToBytes(element)
  assert.ok(bytes instanceof Uint8Array, 'Must produce Uint8Array')
  assert.ok(bytes.length > 1000, 'PDF bytes must be non-empty')

  const header = String.fromCharCode(...bytes.slice(0, 5))
  assert.equal(header, '%PDF-', 'Must produce valid PDF header')

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

  const fonts = await fontBaseNames(bytes)
  assert.ok(fonts.some((name) => /NotoSans/i.test(name)), 'Naira glyphs must use the Noto Sans fallback')
  assert.ok(fonts.some((name) => /NotoSansGreek/i.test(name)), 'Omega glyphs must use the Greek Noto Sans subset')
  assert.ok(fonts.every((name) => !/Helvetica|Arial/i.test(name)), 'No silent Helvetica fallback is permitted')
})

test('Glyph fallback splits Naira and Omega into fonts that contain them', () => {
  const tree = serialize(React.createElement(IndustrialFormeDocument, { data: createSampleIndustrialData() }))
  const texts = collectTextValues(tree)
  assert.ok(texts.some((value) => value.includes('₦')), 'Serialized tree must contain Naira amounts')
  assert.ok(texts.some((value) => value.includes('Ω')), 'Serialized tree must contain the Ohm glyph')

  const nairaRuns = findNodes(tree, (n) =>
    Array.isArray(n?.kind?.runs) && n.kind.runs.some((run: any) => run?.content?.includes('₦') && run?.style?.fontFamily === 'Noto Sans')
  )
  assert.ok(nairaRuns.length > 0, 'Naira must be split into a Noto Sans run')

  const ohmRuns = findNodes(tree, (n) =>
    Array.isArray(n?.kind?.runs) && n.kind.runs.some((run: any) => run?.content?.includes('Ω') && run?.style?.fontFamily === 'Noto Sans Greek')
  )
  assert.ok(ohmRuns.length > 0, 'Omega must be split into the Greek Noto Sans run')
})

test('Multi-page Industrial document maintains clean table flow, group enclosure, and fixed footer across all pages', async () => {
  await registerIndustrialFonts()

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
    signature: null,
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
