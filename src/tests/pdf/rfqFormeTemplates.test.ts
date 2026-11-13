import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize } from '@formepdf/react'

import { RfqFormeDocument } from '../../components/pdf/forme/rfq/RfqFormeDocument'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import { normalizeRfqTemplateId } from '../../domain/rfq/templates'
import type { TableDocumentColumn, TableDocumentRow } from '../../domain/table-document/types'
import type { Rfq } from '../../domain/rfq/types'

const defaultColumns: TableDocumentColumn[] = [
  { key: 'description', label: 'Item / Description', visible: true },
  { key: 'specification', label: 'Specification', visible: true },
  { key: 'quantity', label: 'Qty', visible: true },
  { key: 'unit', label: 'Unit', visible: true },
  { key: 'make_brand', label: 'Make / Brand', visible: false },
  { key: 'cp', label: 'CP', visible: false },
  { key: 'sp', label: 'SP', visible: false },
]

const cpSpColumns = defaultColumns.map((c) => (c.key === 'cp' || c.key === 'sp' ? { ...c, visible: true } : c))

const standardRows: TableDocumentRow[] = [
  { row_type: 'section', sort_order: 0, section_title: 'Electrical Power Systems', description: '', specification: '', quantity: 0, unit: '', notes: '', make_brand: '', cp: '', sp: '' },
  { row_type: 'item', sort_order: 1, section_title: '', description: '15kVA Solar Inverter', specification: 'Rated 400V, 50Hz', quantity: 2, unit: 'Pieces', notes: '', make_brand: 'Schneider', cp: '2500000', sp: '3125000' },
  { row_type: 'item', sort_order: 2, section_title: '', description: 'Megger insulation tester set', specification: 'Model MIT525', quantity: 1, unit: 'Set', notes: '', make_brand: 'Megger', cp: '2500000', sp: '3125000' },
]

function makeRfq(overrides: Partial<Rfq> = {}): Rfq {
  return {
    rfq_number: 'RFQ-2026-0042',
    template_id: 'mosaic',
    title: 'Dangote Refinery Turnaround — Electrical Spares',
    vendor_name: 'Dangote Industries Ltd',
    vendor_contact: 'procurement@dangote.com · +234 802 987 6543',
    show_vendor_identity: true,
    issue_date: '2026-11-10',
    expiry_date: '2026-11-24',
    show_brand_name: true,
    brand_name_override: '',
    background_color: '#FFFFFF',
    text_color: '#1F2937',
    border_color: '#D1D5DB',
    accent_color: '#1D4ED8',
    preset_name: 'Clean Slate',
    export_order_seed: 42,
    notes: 'Submit pricing no later than the deadline.',
    custom_fields: {},
    status: 'open',
    ...overrides,
  } as Rfq
}

const settings = {
  company_name: 'BOUXRE Engineering Ltd',
  company_address: 'Plot 14 Victoria Island, Lagos',
  company_phone: '+234 801 234 5678',
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

function textOf(element: React.ReactElement): string {
  return extractFormeText(serialize(element)).join(' ')
}

for (const template of ['mosaic', 'executive'] as const) {
  test(`RFQ ${template} template serializes identity, schedule and parties`, () => {
    const rfq = makeRfq({ template_id: template })
    const text = textOf(React.createElement(RfqFormeDocument, { rfq, rows: standardRows, columns: defaultColumns, settings }))

    assert.ok(text.includes('REQUEST FOR QUOTE'), 'document title must be present')
    assert.ok(text.includes('RFQ-2026-0042'), 'RFQ number must be present')
    assert.ok(text.includes('Dangote Industries Ltd'), 'vendor name must be present')
    assert.ok(text.includes('BOUXRE Engineering Ltd'), 'issuer must be present')
    assert.ok(text.includes('Electrical Power Systems'), 'section band must be present')
    assert.ok(text.includes('15kVA Solar Inverter'), 'item description must be present')
    assert.ok(text.includes('Submit pricing no later than the deadline.'), 'notes must be present')
  })

  test(`RFQ ${template} CP/SP columns render right-aligned profit with ₦ glyph`, () => {
    const rfq = makeRfq({ template_id: template })
    const text = textOf(React.createElement(RfqFormeDocument, { rfq, rows: standardRows, columns: cpSpColumns, settings }))

    assert.ok(text.includes('Profit'), 'profit column must be present when CP/SP visible')
    assert.ok(text.includes('₦'), 'profit cell must render the ₦ glyph')
    assert.ok(text.includes('1250000'), 'profit value must be present')
  })

  test(`RFQ ${template} with vendor identity hidden omits vendor lines`, () => {
    const rfq = makeRfq({ template_id: template, show_vendor_identity: false, vendor_name: 'Secret Supplier Ltd' })
    const text = textOf(React.createElement(RfqFormeDocument, { rfq, rows: standardRows, columns: defaultColumns, settings }))

    assert.ok(!text.includes('Secret Supplier Ltd'), 'vendor name must be omitted')
  })

  test(`RFQ ${template} generates valid PDF bytes`, async () => {
    const rfq = makeRfq({ template_id: template })
    const bytes = await renderPdfcnToBytes(
      React.createElement(RfqFormeDocument, { rfq, rows: standardRows, columns: defaultColumns, settings }),
    )

    assert.ok(bytes instanceof Uint8Array, 'Forme must return a Uint8Array')
    assert.ok(bytes.length > 1000, `PDF bytes must be non-empty (got ${bytes.length} bytes)`)
    const header = Buffer.from(bytes.slice(0, 5)).toString('utf8')
    assert.equal(header, '%PDF-', 'PDF bytes must start with standard PDF header')
  })
}

test('Legacy template ids map to Forme templates', () => {
  assert.equal(normalizeRfqTemplateId('modern'), 'mosaic')
  assert.equal(normalizeRfqTemplateId('bordered_schedule'), 'executive')
  assert.equal(normalizeRfqTemplateId('mosaic'), 'mosaic')
  assert.equal(normalizeRfqTemplateId('executive'), 'executive')
  assert.equal(normalizeRfqTemplateId('unknown-value'), 'mosaic')
  assert.equal(normalizeRfqTemplateId(undefined), 'mosaic')
})

test('Legacy ‘modern’ RFQ renders byte-identical output to Mosaic', async () => {
  const legacy = makeRfq({ template_id: 'modern' as any })
  const modern = makeRfq({ template_id: 'mosaic' })
  const [legacyBytes, mosaicBytes] = await Promise.all([
    renderPdfcnToBytes(React.createElement(RfqFormeDocument, { rfq: legacy, rows: standardRows, columns: defaultColumns, settings })),
    renderPdfcnToBytes(React.createElement(RfqFormeDocument, { rfq: modern, rows: standardRows, columns: defaultColumns, settings })),
  ])
  assert.equal(Buffer.from(legacyBytes).equals(Buffer.from(mosaicBytes)), true)
})
