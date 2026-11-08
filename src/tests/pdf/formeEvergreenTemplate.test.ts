import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { serialize } from '@formepdf/react'

import { EvergreenFormeDocument } from '../../components/pdf/forme/EvergreenFormeDocument'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import { ensureFormeFontFamily } from '../../components/pdf/forme/fonts'
import { adaptCommercialDocumentData } from '../../components/pdf/industryAdapter'
import {
  INVOICE_PDF_TEMPLATE_IDS,
  normalizeInvoicePdfTemplateId,
  isInvoicePdfTemplateId,
} from '../../domain/invoice/types'
import type { PdfDocumentModel } from '../../components/pdf/types'

const SAMPLE_BASE64_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function buildSampleInvoice(): any {
  return {
    identity: {
      id: 'inv-1',
      kind: 'invoice',
      number: 'INV-2026-0044',
      title: 'INVOICE',
      issueDate: '08/11/2026',
      dueDate: '22/11/2026',
      validUntil: null,
      poNumber: 'PO-9912',
      currency: 'NGN',
    },
    issuer: {
      name: 'Evergreen Agro Industrial Ltd',
      taxId: 'TIN-44556677-0001',
      phone: '+234 803 444 5566',
      email: 'accounts@evergreen.ng',
      addressLines: ['44 Commercial Way, Ikeja Industrial Estate', 'Lagos State'],
      logoUrl: SAMPLE_BASE64_IMAGE,
    },
    recipient: {
      name: 'BOUXRE Farms & Processing Co.',
      addressLines: ['Km 14 Sagamu-Benin Expressway', 'Ogun State'],
      phone: '+234 802 999 8877',
      email: 'procurement@bouxrefarms.ng',
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
        description: 'Organic Nitrogen Fertilizer (50kg)',
        subDescription: 'Batch NF-2026-90',
        quantity: 20,
        unit: 'bags',
        unitPrice: 18500,
        amount: 370000,
        cells: {
          num: '1',
          description: 'Organic Nitrogen Fertilizer (50kg)',
          quantity: '20 bags',
          unit_price: '18,500',
          amount: '370,000',
        },
      },
      {
        id: '2',
        rowType: 'line',
        description: 'High-Yield Hybrid Maize Seed (10kg)',
        subDescription: 'Germination rate 98% certified',
        quantity: 10,
        unit: 'packs',
        unitPrice: 12000,
        amount: 120000,
        cells: {
          num: '2',
          description: 'High-Yield Hybrid Maize Seed (10kg)',
          quantity: '10 packs',
          unit_price: '12,000',
          amount: '120,000',
        },
      },
      {
        id: '3',
        rowType: 'line',
        description: 'Drip Irrigation Tubing 16mm (500m)',
        subDescription: 'UV resistant agricultural grade',
        quantity: 2,
        unit: 'rolls',
        unitPrice: 65000,
        amount: 130000,
        cells: {
          num: '3',
          description: 'Drip Irrigation Tubing 16mm (500m)',
          quantity: '2 rolls',
          unit_price: '65,000',
          amount: '130,000',
        },
      },
    ],
    totals: {
      rows: [
        { key: 'subtotal', label: 'Subtotal', value: '₦ 620,000' },
        { key: 'vat', label: 'VAT (7.5%)', value: '₦ 46,500' },
        { key: 'shipping', label: 'Delivery & Handling', value: '₦ 25,000' },
        { key: 'total', label: 'Balance Due', value: '₦ 691,500', isBold: true },
      ],
      amountInWords: 'Six Hundred And Ninety One Thousand Five Hundred Naira Only',
      balanceDue: '₦ 691,500',
    },
    bankDetails: {
      bankName: 'First Bank of Nigeria',
      accountName: 'Evergreen Agro Industrial Ltd',
      accountNumber: '3099887766',
      sortCode: '011150001',
    },
    notes: {
      title: 'Storage & Application Notes',
      content: '<p>Store fertilizer in a cool, dry warehouse. Keep maize seeds sealed until planting.</p>',
    },
    terms: {
      title: 'Terms of Supply',
      content: '<p>Payment due within 14 calendar days from invoice date. Goods remain property of seller until payment in full.</p>',
    },
    footerText: 'Thank you for choosing Evergreen as your trusted agribusiness partner.',
    tagline: 'Cultivating sustainable agricultural excellence across West Africa',
    metaFooter: {
      documentNumber: 'INV-2026-0044',
      companyName: 'Evergreen Agro Industrial Ltd',
    },
    logo: {
      imageUrl: SAMPLE_BASE64_IMAGE,
      width: 64,
      height: 64,
    },
    signature: {
      name: 'Dr. Folake Balogun',
      title: 'Managing Director',
    },
    template: {},
  }
}

function buildSampleQuotation(): any {
  const inv = buildSampleInvoice()
  return {
    ...inv,
    identity: {
      id: 'quot-1',
      kind: 'quotation',
      number: 'QUOT-2026-088',
      title: 'QUOTATION',
      issueDate: '08/11/2026',
      dueDate: null,
      validUntil: '08/12/2026',
      poNumber: null,
      currency: 'NGN',
    },
  }
}

function buildMultiPageInvoice(): any {
  const base = buildSampleInvoice()
  const items: any[] = []
  for (let g = 0; g < 3; g++) {
    const groupName = g === 0 ? 'Soil Amendments & Fertilizers' : g === 1 ? 'Irrigation & Water Management' : 'Crop Protection'
    items.push({
      id: `gh-${g}`,
      rowType: 'group_header',
      groupName,
      groupLabel: groupName,
      cells: {},
    })
    for (let i = 1; i <= 6; i++) {
      const idx = g * 6 + i
      items.push({
        id: `item-${idx}`,
        rowType: 'line',
        description: `Industrial Agricultural Component Item ${idx}`,
        subDescription: `Technical specification standard ISO-AGR-${1000 + idx}`,
        quantity: i * 2,
        unit: 'units',
        unitPrice: 15000 + idx * 500,
        amount: (i * 2) * (15000 + idx * 500),
        cells: {
          num: String(idx),
          description: `Industrial Agricultural Component Item ${idx}`,
          quantity: `${i * 2} units`,
          unit_price: `${(15000 + idx * 500).toLocaleString()}`,
          amount: `${((i * 2) * (15000 + idx * 500)).toLocaleString()}`,
        },
      })
    }
    items.push({
      id: `gf-${g}`,
      rowType: 'group_footer',
      showSubtotal: true,
      groupSubtotalValue: '₦ 450,000.00',
      cells: {},
    })
  }

  return {
    ...base,
    identity: {
      ...base.identity,
      number: 'INV-2026-LONG-01',
    },
    items,
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

test('Evergreen template remains a valid commercial template identifier', () => {
  assert.ok(isInvoicePdfTemplateId('evergreen'), 'Evergreen must be recognized as valid')
  assert.equal(normalizeInvoicePdfTemplateId('evergreen'), 'evergreen')
  assert.ok(INVOICE_PDF_TEMPLATE_IDS.includes('evergreen'))
})

test('Evergreen Forme document serializes with exact commercial structure and financial content', () => {
  const data = adaptCommercialDocumentData(buildSampleInvoice())
  const element = React.createElement(EvergreenFormeDocument, { data })
  const tree = serialize(element)

  assert.ok(tree, 'Forme serialized tree must exist')
  assert.ok(Array.isArray(tree.children), 'Forme document must contain children')

  const texts = extractFormeText(tree).join(' ')

  assert.ok(texts.includes('INVOICE'), 'Document title must be present')
  assert.ok(texts.includes('INV-2026-0044'), 'Document number must be present')
  assert.ok(texts.includes('Evergreen Agro Industrial Ltd'), 'Issuer company name must be present')
  assert.ok(texts.includes('BOUXRE Farms & Processing Co.'), 'Client name must be present')
  assert.ok(texts.includes('Organic Nitrogen Fertilizer'), 'Line item must be present')
  assert.ok(texts.includes('First Bank of Nigeria'), 'Bank name must be present')
  assert.ok(texts.includes('Dr. Folake Balogun'), 'Signer name must be present')
})

test('Evergreen Forme generates valid PDF bytes with approved fonts', { timeout: 30000 }, async () => {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Noto Sans')

  const data = adaptCommercialDocumentData(buildSampleInvoice())
  const element = React.createElement(EvergreenFormeDocument, { data })
  const bytes = await renderPdfcnToBytes(element)

  assert.ok(bytes instanceof Uint8Array, 'Forme must return a Uint8Array')
  assert.ok(bytes.length > 1000, `PDF bytes must be non-empty (got ${bytes.length} bytes)`)

  const header = Buffer.from(bytes.slice(0, 5)).toString('utf8')
  assert.equal(header, '%PDF-', 'PDF bytes must start with standard PDF header')
})

test('Evergreen Forme renders quotation with validity date and correct quotation header', { timeout: 30000 }, async () => {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Noto Sans')

  const data = adaptCommercialDocumentData(buildSampleQuotation())
  const formeBytes = await renderPdfcnToBytes(React.createElement(EvergreenFormeDocument, { data }))

  const mupdf = await import('mupdf')
  const doc = mupdf.Document.openDocument(formeBytes, 'application/pdf')
  assert.ok(doc.countPages() >= 1)
  const text = Array.from({ length: doc.countPages() }, (_, i) => doc.loadPage(i).toStructuredText('preserve-whitespace').asText()).join('\n')

  assert.ok(text.includes('QUOTATION'))
  assert.ok(text.includes('QUOT-2026-088'))
  assert.ok(text.includes('08/12/2026'), 'Must display validity date')
})

test('Evergreen Forme handles natural multi-page flow with repeating header bar and footer', { timeout: 30000 }, async () => {
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Noto Sans')

  const data = adaptCommercialDocumentData(buildMultiPageInvoice())
  const formeBytes = await renderPdfcnToBytes(React.createElement(EvergreenFormeDocument, { data }))

  const mupdf = await import('mupdf')
  const doc = mupdf.Document.openDocument(formeBytes, 'application/pdf')
  assert.ok(doc.countPages() >= 2, `Long document must naturally paginate across multiple pages (got ${doc.countPages()} pages)`)

  for (let i = 0; i < doc.countPages(); i++) {
    const page = doc.loadPage(i)
    const text = page.toStructuredText('preserve-whitespace').asText()
    assert.ok(text.includes('INV-2026-LONG-01'), `Page ${i + 1} must include fixed document number in footer`)
    assert.ok(text.includes('Evergreen Agro Industrial Ltd'), `Page ${i + 1} must include company name in footer`)
    assert.ok(text.includes(`Page ${i + 1} of ${doc.countPages()}`), `Page ${i + 1} must include correct page numbering`)
  }
})

test('Retired React-PDF Evergreen files are physically deleted from disk', () => {
  const templatesDir = path.resolve('src/components/pdf/templates')
  const deletedFiles = ['Evergreen.tsx', 'EvergreenStyles.ts']

  for (const file of deletedFiles) {
    const fullPath = path.join(templatesDir, file)
    assert.ok(!fs.existsSync(fullPath), `Retired file ${file} must not exist on disk`)
  }
})

test('adaptCommercialDocumentData correctly resolves companyLogoUrl from issuer.logoUrl fallback', () => {
  const model = buildSampleInvoice()
  delete (model as any).logo
  assert.ok((model.issuer as any)?.logoUrl, 'issuer.logoUrl must be present in sample model')

  const adapted = adaptCommercialDocumentData(model)
  assert.equal(adapted.company?.companyLogoUrl, SAMPLE_BASE64_IMAGE, 'Fallback to issuer.logoUrl must succeed')
})

test('Evergreen Forme page margin is anchored at bottom 20 (compact 16) to prevent floating footer', () => {
  const data = adaptCommercialDocumentData(buildSampleInvoice())
  const regularTree: any = serialize(React.createElement(EvergreenFormeDocument, { data, compact: false }))
  const compactTree: any = serialize(React.createElement(EvergreenFormeDocument, { data, compact: true }))

  const regularPage = regularTree.children?.[0]
  const compactPage = compactTree.children?.[0]

  assert.equal(regularPage?.kind?.config?.margin?.bottom, 20, 'Regular layout bottom margin must be 20pt')
  assert.equal(compactPage?.kind?.config?.margin?.bottom, 16, 'Compact layout bottom margin must be 16pt')
})

test('Evergreen Forme serializes logo in both header and footer when companyLogoUrl is available', () => {
  const data = adaptCommercialDocumentData(buildSampleInvoice())
  const tree: any = serialize(React.createElement(EvergreenFormeDocument, { data }))

  function findImages(node: any, found: any[] = []): any[] {
    if (!node || typeof node !== 'object') return found
    if (node?.kind?.type === 'Image') found.push(node)
    for (const val of Object.values(node)) {
      if (Array.isArray(val)) {
        val.forEach((item) => findImages(item, found))
      } else if (typeof val === 'object') {
        findImages(val, found)
      }
    }
    return found
  }

  const images = findImages(tree)
  const logoImages = images.filter((img) => img?.kind?.src === SAMPLE_BASE64_IMAGE)
  assert.ok(logoImages.length >= 2, `Expected at least 2 company logo instances (header and footer), found ${logoImages.length}`)
})
