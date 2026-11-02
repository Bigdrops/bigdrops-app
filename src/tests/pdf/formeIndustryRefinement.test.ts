/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize } from '@formepdf/react'

import { IndustryFormeDocument } from '../../components/pdf/forme/IndustryFormeDocument'
import { INDUSTRY_DEFAULT_ACCENT, INDUSTRY_GROUP_TOKENS, type CommercialDocumentData } from '../../components/pdf/industryAdapter'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import { PDFDocument, PDFName } from 'pdf-lib'
import { renderDocumentWithLayout } from '@formepdf/core'
import { getFixedRegions } from '@formepdf/core/layout'
import { ensureFormeFontFamily } from '../../components/pdf/forme/fonts'
import DocumentBrandBlock from '../../components/document-view/shared/DocumentBrandBlock'

function colorToHex(color: any): string | null {
  if (!color || typeof color !== 'object') return null
  if (typeof color.r !== 'number') return null
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0')
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0')
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`.toUpperCase()
}

function getNodeWidth(node: any): number | null {
  const w = node?.style?.width
  if (typeof w === 'number') return w
  if (w && typeof w.Pt === 'number') return w.Pt
  return null
}

const SAMPLE_BASE64_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function createSampleRefinementData(overrides: Partial<CommercialDocumentData> = {}): CommercialDocumentData {
  return {
    title: 'INVOICE',
    customTitle: null,
    documentNumber: 'SASINV-000126',
    documentNumberLabel: 'Invoice Number',
    issueDate: '28/10/2026',
    issueDateLabel: 'Issue Date',
    dueDateOrValidityDate: '11/11/2026',
    dueDateOrValidityDateLabel: 'Due Date',
    poNumber: 'PO-77821',
    poNumberLabel: 'PO Number',
    customHeaderFields: [],
    showTagline: false,
    showBankDetails: true,
    company: {
      companyLogoUrl: SAMPLE_BASE64_IMAGE,
      name: 'BOUXRE Engineering Ltd',
      tagline: '',
      address: 'Plot 14 Victoria Island',
      cityState: 'Lagos State',
      phone: '+234 801 234 5678',
      email: 'finance@bouxre.ng',
      website: 'www.bouxre.ng',
      customInfo: [{ label: 'TIN', value: '12345678-0001' }],
    },
    client: {
      name: 'Dangote Industries Ltd',
      attention: 'Procurement Dept',
      address: '1 Alfred Rewane Road',
      cityState: 'Ikoyi, Lagos',
      phone: '+234 802 987 6543',
      email: 'procurement@dangote.com',
    },
    table: {
      columns: [
        { key: 'num', label: '#', align: 'center', width: 28 },
        { key: 'description', label: 'Description', align: 'left' },
        { key: 'quantity', label: 'Qty', align: 'center', width: 48 },
        { key: 'unit_price', label: 'Unit Price', align: 'right', width: 74 },
        { key: 'amount', label: 'Amount', align: 'right', width: 80 },
      ],
      rows: [
        {
          rowType: 'group_header',
          groupName: 'Electrical Infrastructure',
          groupLabel: 'Electrical Infrastructure',
        },
        {
          rowType: 'standard',
          cells: {
            num: '1',
            description: {
              main: 'Solar Inverter 15kVA',
              sub: 'Three-phase hybrid system',
            },
            quantity: '2',
            unit_price: '₦2,450,000.00',
            amount: '₦4,900,000.00',
          },
          imageUrl: SAMPLE_BASE64_IMAGE,
          isInGroup: true,
        },
        {
          rowType: 'group_footer',
          showSubtotal: true,
          groupSubtotalValue: '₦4,900,000.00',
        },
      ],
    },
    paymentDetails: {
      bankName: 'Access Bank Plc',
      accountName: 'BOUXRE Engineering Ltd',
      accountNumber: '0123456789',
      sortCode: '044150149',
    },
    totals: {
      lines: [
        { label: 'Subtotal', value: '₦4,900,000.00', isDeduction: false },
        { label: 'Trade Discount (5%)', value: '-₦245,000.00', isDeduction: true },
        { label: 'VAT (7.5%)', value: '₦349,125.00', isDeduction: false },
      ],
      mainLine: { label: 'Total Due', value: '₦5,004,125.00' },
      amountInWords: 'Five Million Four Thousand One Hundred And Twenty Five Naira Only',
      balanceDue: { label: 'Balance Due', value: '₦5,004,125.00' },
    },
    advanceSummary: null,
    notes: {
      title: 'Notes',
      content: 'Standard terms apply.',
      plainText: 'Standard terms apply.',
    },
    terms: null,
    attachments: [],
    additionalFields: [{ label: 'Site Reference', value: 'Lagos Main Substation' }],
    signature: null,
    footer: {
      documentNumber: 'SASINV-000126',
      companyName: 'BOUXRE Engineering Ltd',
      extraText: '',
    },
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

function findNodes(node: any, predicate: (n: any) => boolean, results: any[] = []): any[] {
  if (!node || typeof node !== 'object') return results
  if (predicate(node)) results.push(node)
  if (Array.isArray(node)) {
    for (const item of node) findNodes(item, predicate, results)
    return results
  }
  for (const value of Object.values(node)) {
    findNodes(value, predicate, results)
  }
  return results
}

test('Forme Industry uses #7D8A88 as default accent when custom colors are disabled', () => {
  assert.equal(INDUSTRY_DEFAULT_ACCENT, '#7D8A88')

  const data = createSampleRefinementData()
  const tree = serialize(React.createElement(IndustryFormeDocument, { data }))

  // Check header cells style: should have backgroundColor '#7D8A88'
  const headerCells = findNodes(tree, (n) => colorToHex(n?.style?.backgroundColor) === '#7D8A88')
  assert.ok(headerCells.length > 0, 'Table header cells must use #7D8A88 as default background')
})

test('Forme Industry footer includes company logo thumbnail with click hyperlink', () => {
  const data = createSampleRefinementData()
  const tree = serialize(React.createElement(IndustryFormeDocument, { data }))

  // Find Image nodes in tree
  const imageNodes = findNodes(tree, (n) => n?.kind?.type === 'Image')
  assert.ok(imageNodes.length >= 2, 'Must include both header and footer images')

  // Footer image has width 14 and href matching company logo
  const footerLogo = imageNodes.find((n) => getNodeWidth(n) === 14)
  assert.ok(footerLogo, 'Footer logo image node must exist with width 14')
  assert.equal(footerLogo.href, data.company?.companyLogoUrl)
})

test('Forme Industry header logo includes click hyperlink to full-resolution image', () => {
  const data = createSampleRefinementData()
  const tree = serialize(React.createElement(IndustryFormeDocument, { data }))

  const imageNodes = findNodes(tree, (n) => n?.kind?.type === 'Image')
  const headerLogo = imageNodes.find((n) => getNodeWidth(n) === 86)
  assert.ok(headerLogo, 'Header logo image node must exist with width 86')
  assert.equal(headerLogo.href, data.company?.companyLogoUrl)
})

test('Totals deductions render label in muted color and numeric value in restrained red (#991b1b) with leading minus', () => {
  const data = createSampleRefinementData()
  const tree = serialize(React.createElement(IndustryFormeDocument, { data }))

  // Deduction numeric value must be colored #991B1B (restrained red, not #DC2626)
  const redTextNodes = findNodes(tree, (n) => colorToHex(n?.style?.color) === '#991B1B')
  assert.ok(redTextNodes.length >= 1, 'Deduction value must be colored #991B1B')

  // Deduction label must be colored mutedColor (#64748B), NOT red
  const deductionLabelNodes = findNodes(tree, (n) => {
    const text = n?.kind?.content || n?.kind?.runs?.[0]?.content
    return typeof text === 'string' && text.includes('Trade Discount')
  })
  assert.ok(deductionLabelNodes.length > 0, 'Deduction label must exist')
  assert.notEqual(colorToHex(deductionLabelNodes[0]?.style?.color), '#991B1B', 'Deduction label must not be red')
  assert.notEqual(colorToHex(deductionLabelNodes[0]?.style?.color), '#DC2626', 'Deduction label must not be red')

  // Deduction value text must have leading minus sign without double negation
  const deductionValueNodes = findNodes(tree, (n) => {
    const text = n?.kind?.content || n?.kind?.runs?.[0]?.content
    return typeof text === 'string' && (text.includes('-₦') || text.includes('- ₦') || text.startsWith('-'))
  })
  assert.ok(deductionValueNodes.length > 0, 'Deduction value must render with leading minus sign')
  const deductionText = deductionValueNodes[0]?.kind?.content || deductionValueNodes[0]?.kind?.runs?.[0]?.content
  assert.ok(!deductionText.includes('--') && !deductionText.includes('(-'), 'No double negation')

  // Check that Subtotal is not colored red
  const subtotalTexts = findNodes(tree, (n) => {
    const text = n?.kind?.content || n?.kind?.runs?.[0]?.content
    return text === 'Subtotal' && colorToHex(n?.style?.color) === '#991B1B'
  })
  assert.equal(subtotalTexts.length, 0, 'Subtotal line must NOT be colored red')
})

test('Group sections are enclosed in a simple rectangular outline (#8299A8) preserving existing row styling without sand fills', () => {
  const data = createSampleRefinementData()
  const tree = serialize(React.createElement(IndustryFormeDocument, { data }))

  // Verify NO warm sand/ivory or bronze colors remain in the tree
  const rejectedColors = ['#F8F6F2', '#B89C72', '#F3EBDD', '#FAF6F0', '#F5EFE4', '#ECE0CC', '#E2D3BE', '#D8C6A5']
  for (const color of rejectedColors) {
    const matchingBg = findNodes(tree, (n) => colorToHex(n?.style?.backgroundColor) === color)
    assert.equal(matchingBg.length, 0, `No elements may use rejected sand color ${color} as background`)
    const matchingBorder = findNodes(tree, (n) =>
      colorToHex(n?.style?.borderColor?.top) === color ||
      colorToHex(n?.style?.borderColor?.bottom) === color ||
      colorToHex(n?.style?.borderColor?.left) === color ||
      colorToHex(n?.style?.borderColor?.right) === color
    )
    assert.equal(matchingBorder.length, 0, `No elements may use rejected sand/bronze color ${color} as border`)
  }

  // Group header: has cell with top, left, right borders 1.5pt with #8299A8
  const groupHeaderCells = findNodes(tree, (n) =>
    (n?.colSpan === 5 || n?.kind?.col_span === 5) &&
    n?.style?.borderWidth?.top === 1.5 &&
    colorToHex(n?.style?.borderColor?.top) === INDUSTRY_GROUP_TOKENS.border
  )
  assert.ok(groupHeaderCells.length > 0, 'Group header cell must have 1.5pt #8299A8 top border')
  assert.equal(groupHeaderCells[0]?.style?.borderWidth?.left, 1.5, 'Group header must have 1.5pt left border')
  assert.equal(colorToHex(groupHeaderCells[0]?.style?.borderColor?.left), INDUSTRY_GROUP_TOKENS.border, 'Group header left border must use #8299A8')
  assert.equal(groupHeaderCells[0]?.style?.borderWidth?.right, 1.5, 'Group header must have 1.5pt right border')
  assert.equal(colorToHex(groupHeaderCells[0]?.style?.borderColor?.right), INDUSTRY_GROUP_TOKENS.border, 'Group header right border must use #8299A8')
  assert.equal(colorToHex(groupHeaderCells[0]?.style?.backgroundColor), '#FFFFFF', 'Group header must retain white background')

  // Explicitly verify NO vertical indicator bar or decorative marker in group header
  const indicatorBars = findNodes(groupHeaderCells[0], (n) => n?.style?.width === 4 || n?.style?.width?.Pt === 4)
  assert.equal(indicatorBars.length, 0, 'Must have zero vertical indicator bars or decorative markers beside group heading')

  // Group member row: has 1.5pt blue-grey left border on first cell, 1.5pt blue-grey right border on last cell
  const groupMemberFirstCells = findNodes(tree, (n) =>
    (n?.kind?.col_span === 1 || !n?.kind?.col_span) &&
    n?.style?.borderWidth?.left === 1.5 &&
    colorToHex(n?.style?.borderColor?.left) === INDUSTRY_GROUP_TOKENS.border
  )
  assert.ok(groupMemberFirstCells.length > 0, 'Group member row first cell must have 1.5pt #8299A8 left border')

  const groupMemberLastCells = findNodes(tree, (n) =>
    (n?.kind?.col_span === 1 || !n?.kind?.col_span) &&
    n?.style?.borderWidth?.right === 1.5 &&
    colorToHex(n?.style?.borderColor?.right) === INDUSTRY_GROUP_TOKENS.border
  )
  assert.ok(groupMemberLastCells.length > 0, 'Group member row last cell must have 1.5pt #8299A8 right border')

  // Group member background must preserve existing white/light-grey table appearance (#FFFFFF or #F8FAFC)
  const memberBg = colorToHex(groupMemberFirstCells[0]?.style?.backgroundColor)
  assert.ok(
    memberBg === '#FFFFFF' || memberBg === '#F8FAFC',
    `Member row background must preserve existing white/light-grey table appearance, got ${memberBg}`
  )

  // Group footer: shows group subtotal with closing bottom rule (1.5pt #8299A8), left and right 1.5pt borders, and white background
  const groupFooterCells = findNodes(tree, (n) =>
    n?.style?.borderWidth?.bottom === 1.5 &&
    colorToHex(n?.style?.borderColor?.bottom) === INDUSTRY_GROUP_TOKENS.border &&
    n?.style?.borderWidth?.left === 1.5 &&
    n?.style?.borderWidth?.right === 1.5
  )
  assert.ok(groupFooterCells.length > 0, 'Group footer must have complete bottom, left, right 1.5pt #8299A8 boundary')
  assert.equal(colorToHex(groupFooterCells[0]?.style?.backgroundColor), '#FFFFFF', 'Footer must retain clean white background')

  const subtotalLabels = findNodes(tree, (n) => {
    const content = n?.kind?.content || n?.kind?.runs?.[0]?.content
    return typeof content === 'string' && content.includes('Group Subtotal')
  })
  assert.ok(subtotalLabels.length > 0, 'Group subtotal label must be rendered as Group Subtotal')
})

test('Line-item image renders with direct image hyperlink and completely eliminates Open image text', () => {
  const data = createSampleRefinementData()
  const tree = serialize(React.createElement(IndustryFormeDocument, { data }))

  const lineItemImages = findNodes(tree, (n) =>
    n?.kind?.type === 'Image' && n?.href === SAMPLE_BASE64_IMAGE
  )
  assert.ok(lineItemImages.length > 0, 'Line item image must have href matching image URL')

  // Explicitly verify NO "Open image" text exists anywhere
  const openImageNodes = findNodes(tree, (n) => {
    const text = n?.kind?.content || n?.kind?.runs?.[0]?.content
    return typeof text === 'string' && text.toLowerCase().includes('open image')
  })
  assert.equal(openImageNodes.length, 0, 'Must not render any Open image text fallback')
})

test('Generated PDF contains native link annotations directly on image bounds matching displayed dimensions', async () => {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Archivo Black')
  await ensureFormeFontFamily('Noto Sans')

  const data = createSampleRefinementData()
  const bytes = await renderPdfcnToBytes(React.createElement(IndustryFormeDocument, { data }))
  const pdfDoc = await PDFDocument.load(bytes)
  const page = pdfDoc.getPages()[0]
  const annots = page.node.Annots()

  assert.ok(annots && annots.size() >= 3, 'Must contain at least 3 link annotations on page 0')

  const parsedAnnots: Array<{ rect: number[]; uri: string; width: number; height: number }> = []
  for (let i = 0; i < annots.size(); i++) {
    const dict = pdfDoc.context.lookup(annots.get(i)) as any
    const subtype = dict.get(PDFName.of('Subtype'))?.toString()
    if (subtype === '/Link') {
      const rectArray = dict.get(PDFName.of('Rect')) as any
      const rect = rectArray.asArray().map((item: any) => item.asNumber())
      const action = pdfDoc.context.lookup(dict.get(PDFName.of('A'))) as any
      const uriObj = action?.get(PDFName.of('URI'))
      const uri = typeof uriObj?.value === 'string'
        ? uriObj.value
        : (typeof uriObj?.value === 'function' ? uriObj.value() : uriObj?.toString() || '')
      parsedAnnots.push({
        rect,
        uri,
        width: Math.round(rect[2] - rect[0]),
        height: Math.round(rect[3] - rect[1]),
      })
    }
  }

  // 1. Header logo: displayed at 86x86
  const headerLogoAnnot = parsedAnnots.find((a) => a.width === 86 && a.height === 86)
  assert.ok(headerLogoAnnot, 'Header logo link annotation must match 86x86 bounds')
  assert.ok(headerLogoAnnot.uri.includes(SAMPLE_BASE64_IMAGE), 'Header logo link annotation must point to logo URL')

  // 2. Line-item product image: displayed at 48x48
  const lineItemAnnot = parsedAnnots.find((a) => a.width === 48 && a.height === 48)
  assert.ok(lineItemAnnot, 'Line-item product image link annotation must match 48x48 displayed bounds')
  assert.ok(lineItemAnnot.uri.includes(SAMPLE_BASE64_IMAGE), 'Line-item link annotation must point to product image URL')

  // 3. Footer logo: displayed at 14x14
  const footerLogoAnnot = parsedAnnots.find((a) => a.width === 14 && a.height === 14)
  assert.ok(footerLogoAnnot, 'Footer logo link annotation must match 14x14 bounds')
  assert.ok(footerLogoAnnot.uri.includes(SAMPLE_BASE64_IMAGE), 'Footer logo link annotation must point to logo URL')
})

test('Page bottom margin is 8pt standard and 6pt compact to anchor footer at red-line position', () => {
  const data = createSampleRefinementData()
  const treeStandard = serialize(React.createElement(IndustryFormeDocument, { data, compact: false }))
  const treeCompact = serialize(React.createElement(IndustryFormeDocument, { data, compact: true }))

  // Verify page margins match exact intended bottom offset
  const pagesStandard = findNodes(treeStandard, (n) => n?.kind?.type === 'Page')
  assert.ok(pagesStandard.length > 0, 'Standard page node exists')
  assert.equal(pagesStandard[0]?.kind?.config?.margin?.bottom, 8, 'Standard page margin.bottom must be 8pt')

  const pagesCompact = findNodes(treeCompact, (n) => n?.kind?.type === 'Page')
  assert.ok(pagesCompact.length > 0, 'Compact page node exists')
  assert.equal(pagesCompact[0]?.kind?.config?.margin?.bottom, 6, 'Compact page margin.bottom must be 6pt')
})

test('Multi-page document maintains identical fixed footer vertical position on all pages', async () => {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Archivo Black')
  await ensureFormeFontFamily('Noto Sans')

  // Generate 45 table rows to force multi-page layout
  const rows: any[] = [
    { rowType: 'group_header', groupName: 'Batch 1' },
  ]
  for (let i = 1; i <= 35; i++) {
    rows.push({
      rowType: 'standard',
      cells: { num: String(i), description: `Multi-page test item ${i}`, quantity: '1', unit_price: '₦10,000.00', amount: '₦10,000.00' },
      isInGroup: true,
    })
  }
  rows.push({ rowType: 'group_footer', showSubtotal: true, groupSubtotalValue: '₦350,000.00' })

  const multiPageData = createSampleRefinementData({
    table: {
      columns: [
        { key: 'num', label: '#', align: 'center', width: 28 },
        { key: 'description', label: 'Description', align: 'left' },
        { key: 'quantity', label: 'Qty', align: 'center', width: 48 },
        { key: 'unit_price', label: 'Unit Price', align: 'right', width: 74 },
        { key: 'amount', label: 'Amount', align: 'right', width: 80 },
      ],
      rows,
    },
  })

  const res = await renderDocumentWithLayout(React.createElement(IndustryFormeDocument, { data: multiPageData, compact: false }))
  assert.ok(res.layout.pages.length >= 2, 'Must generate at least 2 pages')

  const page0Footer = getFixedRegions(res.layout.pages[0]).footer[0]
  const page1Footer = getFixedRegions(res.layout.pages[1]).footer[0]
  assert.ok(page0Footer, 'Page 1 must have fixed footer')
  assert.ok(page1Footer, 'Page 2 must have fixed footer')

  // Fixed footer vertical Y position must be identical across pages
  assert.equal(page0Footer.y, page1Footer.y, 'Footer vertical Y offset must be identical across all pages')
  const bottomGap = res.layout.pages[0].height - (page0Footer.y + page0Footer.height)
  assert.ok(Math.abs(bottomGap - 8) < 0.1, `Footer bottom gap must be ~8pt, got ${bottomGap}`)
})

test('Party block renders customInfo (TIN) and attention for content parity', () => {
  const data = createSampleRefinementData()
  const tree = serialize(React.createElement(IndustryFormeDocument, { data }))

  const tinNodes = findNodes(tree, (n) => {
    const content = n?.kind?.content || n?.kind?.runs?.[0]?.content
    return typeof content === 'string' && content.includes('TIN: 12345678-0001')
  })
  assert.ok(tinNodes.length > 0, 'Company party block must render TIN from customInfo')

  const attnNodes = findNodes(tree, (n) => {
    const content = n?.kind?.content || n?.kind?.runs?.[0]?.content
    return typeof content === 'string' && content.includes('ATTN: Procurement Dept')
  })
  assert.ok(attnNodes.length > 0, 'Client party block must render ATTN attention line')
})

test('DocumentBrandBlock renders interactive anchor wrapping logo for full-resolution view', () => {
  const logoUrl = 'https://example.com/logo-full.png'
  const rendered = DocumentBrandBlock({
    logoUrl,
    companyName: 'BOUXRE',
  })

  assert.equal(rendered.type, 'div')
  const anchor = rendered.props.children
  assert.equal(anchor.type, 'a')
  assert.equal(anchor.props.href, logoUrl)
  assert.equal(anchor.props.target, '_blank')
})

test('Amount in words renders as a dark bold block independent of muted colours', () => {
  const data = createSampleRefinementData({
    design: {
      accentColor: '#7D8A88',
      textColor: '#1E293B',
      mutedColor: '#CBD5E1',
      borderColor: '#E2E8F0',
      surfaceColor: '#F8FAFC',
      headerFont: null,
      bodyFont: null,
      useCustomFonts: false,
      useCustomColors: true,
    },
  })
  const tree = serialize(React.createElement(IndustryFormeDocument, { data }))

  const wordsNodes = findNodes(
    tree,
    (n) => n?.kind?.type === 'Text' && n?.kind?.content === data.totals.amountInWords,
  )
  assert.equal(wordsNodes.length, 1, 'Amount in words must render from the authoritative totals value')
  const words = wordsNodes[0]
  assert.equal(words.style.fontWeight, 700, 'Amount in words must be bold')
  assert.notEqual(words.style.fontStyle, 'italic', 'Amount in words must not use italic')
  assert.ok(Number(words.style.fontSize) >= 8.5, 'Amount in words must use a readable size')
  assert.equal(
    colorToHex(words.style.color),
    '#1E293B',
    'Amount in words must use the dark body text colour, not the muted colour',
  )

  const blocks = findNodes(
    tree,
    (n) =>
      n?.style?.borderWidth?.left === 2 &&
      colorToHex(n?.style?.borderColor?.left) === '#7D8A88' &&
      colorToHex(n?.style?.backgroundColor) === '#FFFFFF',
  )
  assert.ok(blocks.length > 0, 'Amount in words must sit on a white block with the accent stripe')
})

test('Industry Forme generates valid PDF bytes with refinements applied', async () => {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Archivo Black')
  await ensureFormeFontFamily('Noto Sans')

  const data = createSampleRefinementData()
  const element = React.createElement(IndustryFormeDocument, { data })
  const bytes = await renderPdfcnToBytes(element)

  assert.ok(bytes instanceof Uint8Array, 'PDF output must be Uint8Array')
  assert.ok(bytes.length > 1000, 'PDF output must be valid non-empty byte stream')
  const header = Buffer.from(bytes.slice(0, 5)).toString('utf8')
  assert.equal(header, '%PDF-', 'PDF must begin with %PDF- header')
})
