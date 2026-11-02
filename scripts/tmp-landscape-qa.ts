/**
 * Landscape Forme QA harness. Renders a realistic matrix of invoice and
 * quotation documents, rasterizes every page with MuPDF, and writes a
 * text/geometry manifest. Temporary evidence tool; not part of the app.
 */
import path from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import React from 'react'
import { renderPdfcnToBytes } from '../src/components/pdf/pdfcn/adapter'
import { ensureFormeFontFamily } from '../src/components/pdf/forme/fonts'
import { LandscapeFormeDocument } from '../src/components/pdf/forme/LandscapeFormeDocument'
import type { PdfColumnDefinition, PdfDocumentModel, PdfLineItem } from '../src/components/pdf/types'
import { adaptCommercialDocumentData } from '../src/components/pdf/industryAdapter'
import { numberToWords } from '../src/lib/formatters/money'

const OUT_DIR = path.join(process.cwd(), 'docs', 'reports', 'invoice-quote', 'artifacts', 'landscape-forme')
const PROBE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

type QaCase = {
  name: string
  kind: 'invoice' | 'quotation'
  count: number
  groups?: boolean
  longDescriptions?: boolean
  longNotes?: boolean
  richNotes?: boolean
  shortCompany?: boolean
  longCompany?: boolean
  missing?: boolean
  longClient?: boolean
  optionalColumns?: boolean
  deductions?: boolean
  zeroValues?: boolean
  noBank?: boolean
  noSignature?: boolean
  noAttachments?: boolean
  additionalFields?: boolean
  itemImages?: boolean
  logo?: boolean
  signatureImage?: boolean
  compact?: boolean
  customFont?: boolean
  customTitle?: string
}

const LONG_DESCRIPTION =
  'Armoured power cable 4-core 95 mm² Cu/XLPE/SWA/PVC, 0.6/1 kV to BS 5467, supplied on returnable steel drums with mill certificates, heat-number tagging and third-party routine test reports for the Northgate Foods factory phase two production hall and utilities infrastructure package.'
const LONG_SUBDESCRIPTION =
  'Delivery in tranches. Includes factory acceptance test, packing, haulage and site offloading at Gate 2. Coordinate with the resident engineer before each call-off.'

const RICH_NOTES = [
  '<h2>Delivery and acceptance</h2>',
  '<p>All <strong>equipment</strong> is supplied against the approved submittal and is subject to <em>factory acceptance testing</em> before dispatch. Delivery dates are confirmed by written call-off.</p>',
  '<ul>',
  '<li>Offloading and storage at site are the responsibility of the client.</li>',
  '<li>Any shortage must be notified within 48 hours of delivery.</li>',
  '<li>Test certificates and O&amp;M manuals accompany each consignment.</li>',
  '</ul>',
  '<h2>Warranty</h2>',
  '<p>The supplier warrants that all goods conform to the specification and applicable Nigerian standards for a period of twenty-four months from acceptance.</p>',
].join('')

const LONG_RICH_TERMS = Array.from({ length: 7 }).map((_, index) => (
  `<p><strong>Clause ${index + 1}.</strong> The supplier warrants that all goods conform to the specification and applicable Nigerian standards. Delivery is subject to written call-off and site access. Title and risk pass as stated in the contract. Payment is due within fourteen calendar days of a correctly rendered invoice, failing which interest may accrue at the agreed rate.</p>`
)).join('')

function buildColumns(optional: boolean): PdfColumnDefinition[] {
  const columns: PdfColumnDefinition[] = [
    { key: 'num', label: '#', kind: 'builtin', align: 'center' },
    { key: 'description', label: 'Description', kind: 'builtin', align: 'left' },
    { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center' },
    { key: 'unit', label: 'Unit', kind: 'builtin', align: 'center' },
    { key: 'unit_price', label: 'Unit Price', kind: 'builtin', align: 'right' },
    { key: 'amount', label: 'Amount', kind: 'builtin', align: 'right' },
  ]
  if (optional) {
    columns.push(
      { key: 'make', label: 'Make', kind: 'builtin', align: 'left' },
      { key: 'install_rate', label: 'Install Rate', kind: 'builtin', align: 'right', dataType: 'install_rate' },
      { key: 'vat_rate', label: 'VAT Rate', kind: 'builtin', align: 'center', dataType: 'vat_rate' },
      { key: 'discount_rate', label: 'Discount Rate', kind: 'builtin', align: 'center', dataType: 'discount_rate' },
    )
  }
  return columns
}

function buildModel(options: QaCase): PdfDocumentModel {
  const items: PdfLineItem[] = []
  const groupSize = Math.max(1, Math.ceil(options.count / 3))
  let lineNumber = 0

  for (let index = 0; index < options.count; index += 1) {
    if (options.groups && index % groupSize === 0) {
      const groupIndex = Math.floor(index / groupSize)
      const letter = String.fromCharCode(65 + groupIndex)
      items.push({
        id: `group-${groupIndex}`,
        rowType: 'group_header',
        groupId: `g${groupIndex}`,
        groupLabel: `Group ${letter} — ${['Electrical Distribution', 'Mechanical Plant', 'Site Infrastructure'][groupIndex] || 'General Works'}`,
        cells: {},
        customData: { showSubtotal: true },
      })
    }

    lineNumber += 1
    const quantity = options.zeroValues && index === 0 ? 0 : (index % 7) + 1
    const unitPrice = options.zeroValues ? 0 : 125000 + index * 4750
    const amount = quantity * unitPrice
    const unit = ['pcs', 'sets', 'm', 'tonnes'][index % 4]
    const make = ['Schneider Electric', 'Havells', 'Grundfos', 'Siemens'][index % 4]
    const description = options.longDescriptions
      ? `${LONG_DESCRIPTION} Line ${lineNumber}.`
      : `Supply of certified ${['cable', 'switchgear', 'pump set', 'valve', 'fan'][index % 5]} assembly ${lineNumber}`
    const subDescription = options.longDescriptions
      ? LONG_SUBDESCRIPTION
      : `Specification ref ${1000 + index} · batch ${(index % 9) + 1}`

    items.push({
      id: `item-${index}`,
      rowType: 'line',
      groupId: options.groups ? `g${Math.floor(index / groupSize)}` : null,
      description,
      subDescription,
      make,
      quantity,
      unit,
      unitPrice,
      amount,
      installRate: options.optionalColumns ? 2.5 : null,
      vatRate: options.optionalColumns ? 7.5 : null,
      discountRate: options.optionalColumns ? 1.5 : null,
      imageUrl: options.itemImages ? PROBE_IMAGE : null,
      cells: {
        num: String(lineNumber),
        quantity: String(quantity),
        unit,
        make,
        unit_price: unitPrice,
        amount,
        ...(options.optionalColumns
          ? { install_rate: '2.5%', vat_rate: '7.5%', discount_rate: '1.5%' }
          : {}),
      },
      customData: {},
    })
  }

  const subtotal = items
    .filter((item) => item.rowType !== 'group_header')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const vat = Math.round(subtotal * 0.075)
  const discount = options.deductions ? -Math.round(subtotal * 0.025) : 0
  const wht = options.deductions ? -Math.round(subtotal * 0.05) : 0
  const total = subtotal + vat + discount + wht
  const dueDate = options.kind === 'invoice' ? '16/11/2026' : null
  const validUntil = options.kind === 'quotation' ? '30/11/2026' : null

  const issuer = options.missing
    ? null
    : options.shortCompany
      ? {
          name: 'Kestrel Supply Co.',
          taxId: null,
          phone: '+234 800 555 0110',
          email: 'accounts@kestrel.example',
          website: null,
          addressLines: ['14 Agbara Estate', 'Ogun State'],
          customInfo: [],
        }
      : options.longCompany
        ? {
            name: 'Kestrel Industrial Supply and Engineering Services Nigeria Limited',
            taxId: 'TIN-22910488-0001',
            phone: '+234 800 555 0110',
            email: 'accounts.and.credit.control@kestrel-industrial.example',
            website: 'www.kestrel-industrial-supply.example',
            addressLines: [
              'Plot 14, Block C, Agbara Industrial Estate, along Lagos–Badagry Expressway, Agbara, Ogun State',
              'Lagos Liaison Office: 27 Adeola Odeku Street, Victoria Island, Lagos',
              'Abuja Project Office: Suite 4B, EFAB Plaza, Area 11, Garki, Abuja',
            ],
            customInfo: [
              { label: 'RC', value: 'RC 1842093' },
              { label: 'CAC', value: 'BN 2291048' },
              { label: 'Vendor', value: 'NGN-2026-00417' },
              { label: 'ISO', value: '9001:2015 certified' },
              { label: 'Hours', value: 'Mon–Fri, 08:00–17:00' },
            ],
          }
        : {
            name: 'Kestrel Industrial Supply Ltd',
            taxId: 'TIN-22910488-0001',
            phone: '+234 800 555 0110',
            email: 'accounts@kestrel.example',
            website: 'kestrel.example',
            addressLines: ['Plot 14, Block C, Agbara Industrial Estate', 'Agbara, Ogun State'],
            customInfo: [{ label: 'RC', value: 'RC 1842093' }],
          }

  const recipient = options.missing
    ? null
    : options.longClient
      ? {
          name: 'Northgate Foods Processing and Cold Chain Nigeria Limited',
          attention: 'Ms. Adaeze Obi — Group Procurement and Supply Chain Manager',
          phone: '+234 800 555 0177',
          email: 'procurement.and.contracts@northgate-foods.example',
          addressLines: [
            'Km 18, Lagos–Ibadan Expressway, opposite OPIC Estate, Mowe, Ogun State',
            'Plant 2, Cold Store Extension, Gate 2 Administration Block',
          ],
        }
      : {
          name: 'Northgate Foods Processing Nigeria Ltd',
          attention: 'Ms. Adaeze Obi — Procurement Lead',
          phone: '+234 800 555 0177',
          email: 'procurement@northgate.example',
          addressLines: ['Km 18, Lagos–Ibadan Expressway', 'Mowe, Ogun State'],
        }

  const headerFields = options.missing ? [] : [
    ...(options.kind === 'quotation' ? [
      { label: 'Title', value: options.customTitle || 'Quotation for mechanical works' },
      { label: 'Client', value: 'Northgate Foods Processing Nigeria Ltd' },
    ] : []),
    ...(options.kind === 'invoice' ? [
      { label: 'Payment Terms', value: 'Net 14' },
      { label: 'Work Duration', value: '6 weeks from written call-off' },
    ] : []),
    { label: 'PO Number', value: 'PO-2026-9912' },
    { label: 'Project Ref', value: 'NGF/CON/2026/P2-014' },
  ]

  const totalsRows = options.missing ? [] : options.zeroValues
    ? [
        { key: 'subtotal', label: 'Subtotal', amount: 0 },
        { key: 'vat', label: 'VAT (7.5%)', amount: 0 },
        { key: 'total', label: 'Total Due', amount: 0, emphasis: true },
      ]
    : [
        { key: 'subtotal', label: 'Subtotal', amount: subtotal },
        ...(options.deductions ? [{ key: 'discount', label: 'Discount (2.5%)', amount: discount }] : []),
        { key: 'vat', label: 'VAT (7.5%)', amount: vat },
        ...(options.deductions ? [{ key: 'wht', label: 'WHT (5%)', amount: wht }] : []),
        { key: 'total', label: 'Total Due', amount: total, emphasis: true },
      ]

  const notes = options.missing
    ? null
    : options.richNotes
      ? { title: 'Notes', content: RICH_NOTES, format: 'html' as const }
      : options.longNotes
        ? {
            title: 'Notes',
            content: Array.from({ length: 10 }).map((_, index) => `Clause ${index + 1}: The supplier warrants that all goods conform to the specification and applicable Nigerian standards. Delivery is subject to written call-off and site access. Title and risk pass as stated in the contract.`).join('\n'),
          }
        : {
            title: 'Notes',
            content: 'Goods supplied in good condition with a two-year warranty.\nAll items carry manufacturer test certificates.',
          }

  const terms = options.missing
    ? null
    : options.richNotes
      ? { title: 'Terms & Conditions', content: LONG_RICH_TERMS, format: 'html' as const }
      : options.longNotes
        ? {
            title: 'Terms & Conditions',
            content: Array.from({ length: 12 }).map((_, index) => `${index + 1}. Payment is due within fourteen calendar days of a correctly rendered invoice. Title passes on full settlement. The supplier is not liable for delays caused by site access, force majeure or late approvals.`).join('\n'),
          }
        : {
            title: 'Terms & Conditions',
            content: 'Payment is due within 14 calendar days of invoice date.\nTitle passes on full settlement.',
          }

  return {
    identity: {
      id: `doc-${options.name}`,
      kind: options.kind,
      number: options.kind === 'invoice' ? 'INV-2026-0147' : 'QUO-2026-0147',
      title: options.kind === 'invoice'
        ? 'INVOICE'
        : options.customTitle || 'QUOTATION',
      issueDate: options.missing ? null : '02/11/2026',
      dueDate: options.missing ? null : dueDate,
      validUntil: options.missing ? null : validUntil,
      poNumber: options.missing ? null : 'PO-2026-9912',
      currency: options.kind === 'invoice' ? 'NGN' : undefined,
    },
    issuer,
    recipient,
    headerFields,
    items,
    columns: buildColumns(options.optionalColumns === true),
    mergeQtyUnit: false,
    hideEmptyGroups: true,
    totals: options.missing
      ? { rows: [] }
      : {
          rows: totalsRows,
          amountInWords: numberToWords(options.zeroValues ? 0 : total),
          balanceDue: options.zeroValues ? 0 : total,
        },
    bankDetails: options.missing || options.noBank
      ? null
      : {
          bankName: 'Access Bank Plc',
          accountName: 'Kestrel Industrial Supply Ltd',
          accountNumber: '0123456789',
          sortCode: '044150149',
        },
    notes,
    terms,
    additionalSections: options.additionalFields
      ? [
          { title: 'Delivery Window', content: 'Within 21 days of written call-off.' },
          { title: 'Packing', content: 'Seaworthy export packing.' },
          { title: 'Inspection', content: 'Client inspection before dispatch.' },
          { title: 'Documentation', content: 'Test certificates and packing list.' },
        ]
      : [],
    referenceLinks: options.missing || options.noAttachments
      ? []
      : [
          { label: 'Approved submittal', url: 'https://example.com/submittals/ngf-p2-014.pdf' },
          { label: 'Site access procedure', url: 'example.com/site-access' },
        ],
    attachments: options.missing || options.noAttachments
      ? []
      : [{ label: 'Technical Datasheet', url: 'https://example.com/datasheet.pdf' }],
    signature: options.missing || options.noSignature
      ? null
      : {
          name: 'Engr. Tunde Bakare',
          role: 'Managing Director',
          imageUrl: options.signatureImage ? PROBE_IMAGE : null,
          signedAt: options.signatureImage ? '02/11/2026' : null,
        },
    logo: options.missing || !options.logo ? null : { imageUrl: PROBE_IMAGE, altText: 'Kestrel' },
    footerText: options.missing ? null : 'Registered in Nigeria · RC 1842093 · VAT NG-22910488-0001',
    tagline: options.missing ? null : 'Certified industrial supply and engineering',
    metaFooter: { companyName: issuer?.name || 'Kestrel Industrial Supply Ltd' },
    pageLayout: { size: 'A4', orientation: 'landscape' },
    template: options.customFont
      ? {
          designPreset: {
            useCustomFonts: true,
            bodyFont: 'Inter',
            useCustomColors: true,
            accentColor: '#0f6b5c',
          },
        }
      : null,
  }
}

const CASES: QaCase[] = [
  { name: 'invoice-standard', kind: 'invoice', count: 8, groups: true, logo: true },
  { name: 'invoice-single', kind: 'invoice', count: 1, shortCompany: true },
  { name: 'invoice-large', kind: 'invoice', count: 60, groups: true },
  { name: 'invoice-large-ungrouped', kind: 'invoice', count: 45 },
  { name: 'invoice-longdesc', kind: 'invoice', count: 14, groups: true, longDescriptions: true },
  { name: 'invoice-longclient', kind: 'invoice', count: 6, longClient: true },
  { name: 'invoice-longcompany', kind: 'invoice', count: 6, longCompany: true },
  { name: 'invoice-missing', kind: 'invoice', count: 4, missing: true },
  { name: 'invoice-optional-cols', kind: 'invoice', count: 10, groups: true, optionalColumns: true },
  { name: 'invoice-deductions', kind: 'invoice', count: 8, groups: true, deductions: true },
  { name: 'invoice-zero', kind: 'invoice', count: 4, zeroValues: true },
  { name: 'invoice-rich-notes', kind: 'invoice', count: 6, groups: true, richNotes: true },
  { name: 'invoice-long-notes', kind: 'invoice', count: 6, groups: true, longNotes: true },
  { name: 'invoice-no-bank', kind: 'invoice', count: 6, noBank: true },
  { name: 'invoice-no-signature', kind: 'invoice', count: 6, noSignature: true, noAttachments: true },
  { name: 'invoice-images', kind: 'invoice', count: 5, itemImages: true, logo: true },
  { name: 'invoice-signature-image', kind: 'invoice', count: 5, signatureImage: true },
  { name: 'invoice-additional-fields', kind: 'invoice', count: 5, additionalFields: true },
  { name: 'invoice-compact', kind: 'invoice', count: 30, groups: true, compact: true },
  { name: 'invoice-custom-font', kind: 'invoice', count: 6, groups: true, customFont: true },
  { name: 'quotation-standard', kind: 'quotation', count: 10, groups: true, customTitle: 'PROPOSAL FOR MECHANICAL WORKS' },
  { name: 'quotation-long', kind: 'quotation', count: 30, groups: true, longNotes: true },
  { name: 'quotation-missing', kind: 'quotation', count: 3, missing: true },
]

const FORBIDDEN = [
  'SEC 03',
  'SEC 04',
  'SEC 05',
  'Official Commercial Document',
  'A4-L',
  'Document Control',
  'Received By',
  'Client Acknowledgement',
]

function flatten(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  await ensureFormeFontFamily('Inter')
  await ensureFormeFontFamily('Noto Sans')

  const mupdf = await import('mupdf')
  const manifest: string[] = []
  const failures: string[] = []

  const only = process.env.QA_ONLY
  for (const testCase of only ? CASES.filter((item) => item.name === only) : CASES) {
    const model = buildModel(testCase)
    const data = adaptCommercialDocumentData(model)
    console.log(`[case] ${testCase.name} font=${data.design.bodyFont} customFonts=${data.design.useCustomFonts}`)
    const element = React.createElement(LandscapeFormeDocument, { data, compact: testCase.compact === true })
    try {
      const bytes = await renderPdfcnToBytes(element)
      const pdfPath = path.join(OUT_DIR, `${testCase.name}.pdf`)
      writeFileSync(pdfPath, bytes)

      const doc = mupdf.Document.openDocument(bytes, 'application/pdf')
      const pageCount = doc.countPages()
      manifest.push(`\n=== ${testCase.name} | ${testCase.kind} | ${testCase.count} items | ${pageCount} page(s) | ${bytes.length} bytes ===`)

      for (let index = 0; index < pageCount; index += 1) {
        const page = doc.loadPage(index)
        const bounds = page.getBounds()
        const width = Math.round((bounds[2] - bounds[0]) * 100) / 100
        const height = Math.round((bounds[3] - bounds[1]) * 100) / 100
        const pixmap = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, true)
        const pngPath = path.join(OUT_DIR, `${testCase.name}-p${index + 1}.png`)
        writeFileSync(pngPath, pixmap.asPNG())
        const text = page.toStructuredText('preserve-whitespace').asText()
        const flat = flatten(text)
        manifest.push(`p${index + 1} ${width}x${height} ${pixmap.getWidth()}x${pixmap.getHeight()}px :: ${flat.slice(0, 500)}`)

        if (Math.abs(width - 841.89) > 0.5 || Math.abs(height - 595.28) > 0.5) {
          failures.push(`${testCase.name} p${index + 1}: wrong geometry ${width}x${height}`)
        }
        for (const forbidden of FORBIDDEN) {
          if (flat.includes(forbidden)) failures.push(`${testCase.name} p${index + 1}: invented text "${forbidden}"`)
        }
        if (pageCount > 1 && index > 0 && flat.length < 80) {
          failures.push(`${testCase.name} p${index + 1}: continuation page has almost no text`)
        }
        if (index === 0 && !flat.includes('INVOICE') && !flat.includes('QUOTATION') && !flat.includes('PROPOSAL FOR MECHANICAL WORKS')) {
          failures.push(`${testCase.name} p${index + 1}: missing document title`)
        }
        if (index === 0 && !flat.includes(testCase.kind === 'invoice' ? 'INV-2026-0147' : 'QUO-2026-0147')) {
          failures.push(`${testCase.name} p${index + 1}: missing document number`)
        }
      }

      console.log(`${testCase.name}: ${pageCount} page(s), ${bytes.length} bytes`)
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      failures.push(`${testCase.name}: render failed — ${message}`)
      console.error(`${testCase.name}: FAILED — ${message}`)
    }
  }

  writeFileSync(path.join(OUT_DIR, 'manifest.txt'), manifest.join('\n'))
  writeFileSync(path.join(OUT_DIR, 'failures.txt'), failures.join('\n'))
  console.log(`\nWrote ${OUT_DIR}`)
  console.log(`Failures: ${failures.length}`)
  if (failures.length > 0) console.log(failures.join('\n'))
}

await main()
