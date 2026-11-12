/**
 * Generate static miniature previews for the commercial invoice template picker.
 *
 * Each preview is rendered from the *actual production Forme renderer* with a
 * deterministic fictional sample document, then rasterized with MuPDF. The
 * committed PNGs are displayed statically by CommercialTemplatePicker —
 * nothing here runs when the picker opens.
 *
 * Usage (Bun only, from repo root):
 *   bun scripts/generate-commercial-template-previews.ts
 *
 * Re-run after any Forme template design change to refresh the miniatures.
 * Fixture is intentionally fictional ("Sample Motors Ltd", "Sample Client
 * Ltd", "INV-PREVIEW-001") and never enters production document data.
 */

import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { renderPdfcnToBytes } from '../src/components/pdf/pdfcn/adapter'
import { ensureFormeFontFamily } from '../src/components/pdf/forme/fonts'
import { adaptCommercialDocumentData } from '../src/components/pdf/industryAdapter'
import type { PdfDocumentModel } from '../src/components/pdf/types'
import { IndustrialFormeDocument } from '../src/components/pdf/forme/IndustrialFormeDocument'
import { IndustryFormeDocument } from '../src/components/pdf/forme/IndustryFormeDocument'
import { MinimalFormeDocument } from '../src/components/pdf/forme/MinimalFormeDocument'
import { LandscapeFormeDocument } from '../src/components/pdf/forme/LandscapeFormeDocument'
import { EvergreenFormeDocument } from '../src/components/pdf/forme/EvergreenFormeDocument'
import { ArchitecturalFormeDocument } from '../src/components/pdf/forme/ArchitecturalFormeDocument'
import { ExecutiveFormeDocument } from '../src/components/pdf/forme/ExecutiveFormeDocument'
import { HeritageHouseFormeDocument } from '../src/components/pdf/forme/HeritageHouseFormeDocument'
import { MosaicFormeDocument } from '../src/components/pdf/forme/MosaicFormeDocument'

type TemplateId =
  | 'industrial'
  | 'industry'
  | 'minimal'
  | 'landscape'
  | 'evergreen'
  | 'architectural'
  | 'executive'
  | 'heritage'
  | 'mosaic'

/** 1×1 opaque PNG, deterministic offline fixture asset (stretched to fit the
 *  fixed-square logo/signature slots — proves the slot renders, not fidelity). */
const FIXTURE_PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

const TEMPLATES: Array<{
  id: TemplateId
  Component: React.ComponentType<any>
  orientation: 'portrait' | 'landscape'
}> = [
  { id: 'industrial', Component: IndustrialFormeDocument, orientation: 'portrait' },
  { id: 'industry', Component: IndustryFormeDocument, orientation: 'portrait' },
  { id: 'minimal', Component: MinimalFormeDocument, orientation: 'portrait' },
  { id: 'landscape', Component: LandscapeFormeDocument, orientation: 'landscape' },
  { id: 'evergreen', Component: EvergreenFormeDocument, orientation: 'portrait' },
  { id: 'architectural', Component: ArchitecturalFormeDocument, orientation: 'portrait' },
  { id: 'executive', Component: ExecutiveFormeDocument, orientation: 'portrait' },
  { id: 'heritage', Component: HeritageHouseFormeDocument, orientation: 'portrait' },
  { id: 'mosaic', Component: MosaicFormeDocument, orientation: 'portrait' },
]

/**
 * Deterministic fictional sample document.
 * Exercised: header + meta, both parties, 3-row table with sub-description,
 * totals + total + amount in words, notes, footer (no bank/signature/TIN).
 */
function buildSampleInvoice(orientation: 'portrait' | 'landscape'): any {
  const items = [
    {
      id: 'p1',
      rowType: 'line',
      description: 'Portal framing - 50 mm angle, 6 m',
      subDescription: 'Galvanised mild steel',
      quantity: 12,
      unit: 'pcs',
      unitPrice: 5000,
      amount: 60000,
      cells: {
        num: '1',
        description: 'Portal framing - 50 mm angle, 6 m',
        quantity: '12 pcs',
        unit_price: '5,000',
        amount: '60,000',
      },
    },
    {
      id: 'p2',
      rowType: 'line',
      description: 'Delivery and assembly',
      subDescription: 'On-site by request',
      quantity: 4,
      unit: 'hrs',
      unitPrice: 25000,
      amount: 100000,
      cells: {
        num: '2',
        description: 'Delivery and assembly',
        quantity: '4 hrs',
        unit_price: '25,000',
        amount: '100,000',
      },
    },
    {
      id: 'p3',
      rowType: 'line',
      description: 'Protective coating',
      subDescription: 'Two-coat system',
      quantity: 2,
      unit: 'lots',
      unitPrice: 45500,
      amount: 91000,
      cells: {
        num: '3',
        description: 'Protective coating',
        quantity: '2 lots',
        unit_price: '45,500',
        amount: '91,000',
      },
    },
  ]
    // Grouped item rows — expose group band leakage and dark-logo-on-charcoal contrast failure.
    const groupedItems = [
      {
        id: 'g1',
        rowType: 'group_header',
        groupLabel: 'Group A: Foundations',
        cells: {
          description: 'Concrete work',
          quantity: '5',
          unit: 'm3',
          unitPrice: 3000,
          amount: 15000,
        },
      },
      {
        id: 'g2',
        rowType: 'line',
        description: 'Curing and sealing',
        subDescription: 'membrane application',
        quantity: 1,
        unit: 'batch',
        unitPrice: 8000,
        amount: 8000,
        cells: {
          num: '4',
          description: 'Curing and sealing',
          quantity: '1 batch',
          unit_price: '8,000',
          amount: '8,000',
        },
      },
      {
        id: 'g3',
        rowType: 'group_footer',
        groupLabel: 'Group A Subtotal',
        groupSubtotalValue: 15000,
        cells: {
          description: 'Group A total',
          quantity: '-',
          unit: '-',
          unitPrice: '-',
          amount: 15000,
        },
      },
    ]

  return {
    identity: {
      id: 'preview-1',
      kind: 'invoice',
      number: 'INV-PREVIEW-001',
      title: 'INVOICE',
      issueDate: '08/11/2026',
      dueDate: '22/11/2026',
      validUntil: null,
      poNumber: 'SAMPLE-PO-01',
      currency: 'NGN',
    },
    issuer: {
      name: 'Sample Motors Ltd',
      addressLines: ['1 Sample Road', 'Ikeja, Lagos'],
      phone: '+234 800 555 0100',
      email: 'hello@samplemotors.example',
      website: 'www.samplemotors.example',
      customInfo: [],
    },
    recipient: {
      name: 'Sample Client Ltd',
      addressLines: ['2 Client Avenue', 'Victoria Island, Lagos'],
      phone: '+234 800 555 0101',
      email: 'team@sampleclient.example',
      attention: 'Sample Contact',
    },
    headerFields: [],
    columns: [
      { key: 'num', label: '#', kind: 'builtin', align: 'center', pdfWidth: 26 },
      { key: 'description', label: 'Description / specification', kind: 'builtin', align: 'left' },
      { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center', pdfWidth: 50 },
      { key: 'unit_price', label: 'Unit Price', kind: 'builtin', align: 'right', pdfWidth: 80 },
      { key: 'amount', label: 'Amount', kind: 'builtin', align: 'right', pdfWidth: 90 },
    ],
    pageLayout: { size: 'A4', orientation },
    mergeQtyUnit: false,
    // Realistic item set: 3 line items + grouped rows + advance card.
    items: [...items, ...groupedItems],
    totals: {
      rows: [
        { key: 'subtotal', label: 'Subtotal', amount: 251000 },
        { key: 'vat', label: 'VAT (7.5%)', amount: 18825 },
        { key: 'total', label: 'Total Amount Due', amount: 269825, emphasis: true },
      ],
      amountInWords:
        'Two Hundred and Sixty-Nine Thousand, Eight Hundred and Twenty-Five Naira Only',
      balanceDue: null,
    },
    bankDetails: null,
    notes: {
      title: 'Notes',
      content: 'Sample delivery note - illustrative content for preview only.',
      format: 'html',
    },
    terms: {
      title: 'Terms and Conditions',
      content: 'Sample terms - illustrative content for preview only.',
      format: 'html',
    },
    additionalSections: [],
    additionalFields: [],
    referenceLinks: [],
    advanceSummary: {
      primaryLabel: 'Advance Payment',
      advanceAmount: '25,000',
      balanceRemaining: '75,000',
    },
    signature: {
      imageUrl: FIXTURE_PIXEL_PNG,
      name: 'Sample Authorised Signatory',
      role: 'Managing Director',
    },
    logo: { imageUrl: FIXTURE_PIXEL_PNG, altText: 'Sample Motors Ltd' },
    // Advance summary for group-band and contrast exposure.
    advanceSummary: {
      primaryLabel: 'Advance Payment',
      advanceAmount: '25,000',
      balanceRemaining: '75,000',
    },
    footerText: 'Thank you for your business.',
    tagline: '',
    metaFooter: { companyName: 'Sample Motors Ltd' },
    template: {
      designPreset: {
        useCustomColors: false,
        useCustomFonts: false,
        accentColor: '#14b8a6',
        textColor: '#0f172a',
        mutedColor: '#475569',
        borderColor: '#cbd5e1',
        surfaceColor: '#f8fafc',
        headerFont: 'Inter',
        bodyFont: 'Inter',
        fillableFont: 'Inter',
        fillableFontMode: 'auto',
        fillableColor: '#0f172a',
      },
    },
  }
}

async function run() {
  await Promise.all([
    ensureFormeFontFamily('Inter'),
    ensureFormeFontFamily('Archivo Black'),
    ensureFormeFontFamily('PT Serif'),
    ensureFormeFontFamily('Noto Sans'),
    ensureFormeFontFamily('Caveat'),
    ensureFormeFontFamily('Plus Jakarta Sans'),
  ])

  const mupdf = await import('mupdf')
  const outDir = path.resolve('src/assets/template-previews')
  fs.mkdirSync(outDir, { recursive: true })

  // Optional CLI filter: `bun scripts/generate-commercial-template-previews.ts mosaic executive`
  const requested = new Set(process.argv.slice(2).filter((arg) => !arg.startsWith('-')))
  const selected = requested.size > 0 ? TEMPLATES.filter((t) => requested.has(t.id)) : TEMPLATES
  if (requested.size > 0 && selected.length === 0) {
    throw new Error(`No matching template ids: ${[...requested].join(', ')}`)
  }

  for (const { id, Component, orientation } of selected) {
    const model = buildSampleInvoice(orientation) as unknown as PdfDocumentModel
    const data = adaptCommercialDocumentData(model)
    const element = React.createElement(Component, { data })
    const bytes = await renderPdfcnToBytes(element)
    const doc = mupdf.Document.openDocument(bytes, 'application/pdf')
    const pageCount = doc.countPages()
    if (pageCount < 1) throw new Error(`${id}: expected at least one page, got ${pageCount}`)
    // First page represents the template (documented decision).
    const page = doc.loadPage(0)
    // Scale 2 ≈ 144 dpi — crisp in the 80px card without excessive file size.
    const pix = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, true)
    const outPath = path.join(outDir, `${id}.png`)
    fs.writeFileSync(outPath, pix.asPNG())
    console.log(
      `${id}: pages=${pageCount} bytes=${bytes.length} -> ${pix.getWidth()}x${pix.getHeight()} ${outPath}`,
    )
  }

  console.log('Done.')
}

run().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})
