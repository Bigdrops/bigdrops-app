/**
 * D2 runtime evidence: render a real BOQ PDF via TableDocumentPdfDocument.
 *
 * Produces two artifacts in docs/reports/boq/artifacts/:
 *   d2-boq-qa.pdf        - the rendered PDF
 *   d2-boq-qa-page1.png  - rasterized page 1 for visual inspection
 *
 * Uses representative BOQ data with all columns visible (including
 * specification, which is hidden by default in the registry) and one
 * long description/specification pair to exercise wrapping.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Alias mapping for bun so '@/...' imports resolve exactly like Vite does.
import { plugin } from 'bun' // eslint-disable-line

import { BoqPdfDocument } from '@/components/boq/BoqPdfDocument'
import type { Boq } from '@/domain/boq/types'
import { computeBoqTotals } from '@/domain/boq/calculateBoqTotals'
import { numberToWords } from '@/lib/formatters/money'

console.log('render starting')

const rows: Boq['table_rows'] = [
  {
    id: 'r0',
    row_type: 'section',
    sort_order: 0,
    section_title: 'Section A - Civil Works',
    description: '',
    specification: '',
    quantity: 0,
    unit: '',
    notes: '',
    make_brand: '',
    cp: '0',
    sp: '0',
  },
  {
    id: 'r1',
    row_type: 'item',
    sort_order: 1,
    section_title: '',
    description: 'Portland cement, grade 42.5R, 50kg bag, moisture resistant packaging',
    specification: 'BS EN 197-1 CEM I 42.5R; initial set >= 45min; 28-day strength >= 42.5 MPa',
    quantity: 400,
    unit: 'bags',
    notes: '',
    make_brand: 'Dangote 3X',
    cp: '5200',
    sp: '6100',
  },
  {
    id: 'r2',
    row_type: 'item',
    sort_order: 2,
    section_title: '',
    description: 'Reinforcement steel, high yield deformed bars, T12 diameter',
    specification: 'BS4449 grade B500B; ribbed surface; standard 12m lengths',
    quantity: 120,
    unit: 'lengths',
    notes: '',
    make_brand: 'African Foundries',
    cp: '9800.75',
    sp: '11500',
  },
  {
    id: 'r3',
    row_type: 'item',
    sort_order: 3,
    section_title: '',
    description: 'This is a deliberately very long single-line material description intended to stress the wrapping behaviour of the description column at its allocated 30 percent width, to prove that text wraps instead of overflowing or truncating in the rendered PDF output.',
    specification: 'This is a deliberately very long specification string that must wrap across several lines inside the 16 percent specification column without clipping, bleeding into the adjacent make brand column, or breaking the row layout.',
    quantity: 2,
    unit: 'lot',
    notes: '',
    make_brand: 'Generic Import',
    cp: '150000',
    sp: '185000.5',
  },
  {
    id: 'r4',
    row_type: 'item',
    sort_order: 4,
    section_title: '',
    description: 'Sharp sand, river dredged',
    specification: '',
    quantity: 30,
    unit: 'trips',
    notes: '',
    make_brand: 'Local',
    cp: '28000',
    sp: '33500',
  },
]

const boq: Boq = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Renovation Materials Schedule',
  boq_number: 'BOQ-2026-TEST-001',
  issue_date: '2026-09-17',
  vendor_name: 'Test Construction Vendor Ltd',
  vendor_contact: 'REF-D2-001',
  status: 'open',
  template_id: 'modern',
  notes: 'D2 visual QA artifact.',
  table_rows: rows,
  table_columns: [
    { key: 'description', label: 'Material Description', visible: true },
    { key: 'specification', label: 'Specification', visible: true },
    { key: 'quantity', label: 'Required Qty.', visible: true },
    { key: 'unit', label: 'UOM', visible: true },
    { key: 'make_brand', label: 'Make / Brand', visible: true },
    { key: 'cp', label: 'CP', visible: true },
    { key: 'sp', label: 'SP', visible: true },
  ],
} as unknown as Boq

const totals = computeBoqTotals(boq.table_rows || [])
console.log('totals:', JSON.stringify(totals))
console.log('words:', numberToWords(totals.total_selling_price))

import { renderToBuffer } from '@react-pdf/renderer'

const doc = BoqPdfDocument({ boq })
const buffer = await renderToBuffer(doc as never)

const outDir = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts')
mkdirSync(outDir, { recursive: true })
const pdfPath = path.join(outDir, 'd2-boq-qa.pdf')
writeFileSync(pdfPath, buffer)
console.log('wrote', pdfPath, buffer.length, 'bytes')
