import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize, Document, Page } from '@formepdf/react'

import { buildWaybillRenderModel } from '../../domain/waybill/engine/assembly'
import { WaybillFormeDocument } from '../../components/pdf/forme/waybill/WaybillFormeDocument'
import { WaybillMinimalFormeContent } from '../../components/pdf/forme/waybill/BlankWaybillFormeDocument'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'
import type { PdfDesignPreset } from '../../lib/pdfDesignPreset'
import type { RawWaybill, CompanySettings, ResolvedColumn } from '../../domain/waybill/engine/types'

// Local copy of the waybill default preset (importing pdfDesignPreset as a
// value pulls .woff assets that only resolve under Vite)
const preset: PdfDesignPreset = {
  useCustomColors: false,
  useCustomFonts: false,
  accentColor: '#0f172a',
  textColor: '#0f172a',
  mutedColor: '#475569',
  borderColor: '#cbd5e1',
  surfaceColor: '#f8fafc',
  headerFont: 'Inter',
  bodyFont: 'Inter',
  fillableFont: 'Caveat',
  fillableFontMode: 'custom',
  fillableColor: '#0f172a',
}

const TEMPLATE_IDS = ['evergreen', 'minimal', 'thermal', 'classic', 'premium', 'slate'] as const

const columns: ResolvedColumn[] = [
  { key: 'description', label: 'Description' },
  { key: 'qtyLabel', label: 'Qty/Unit' },
  { key: 'condition', label: 'Condition' },
]

const company: CompanySettings = {
  name: 'BOUXRE Engineering Ltd',
  tagline: 'Reliable Engineering & Energy Solutions',
  logo: null,
  address: 'Plot 14 Victoria Island, Lagos',
  phone: '+234 801 234 5678',
  email: 'operations@bouxre.ng',
  website: 'www.bouxre.ng',
  customInfo: [{ label: 'TIN', value: '12345678-0001' }],
  city: 'Lagos',
  state: 'Lagos State',
}

function sampleWaybill(): RawWaybill {
  return {
    waybill_number: 'WB-2026-0042',
    type: 'external',
    date: '2026-11-10',
    time: '09:30',
    po_number: 'PO-99120',
    client_name: 'Dangote Industries Ltd',
    client_address: '1 Alfred Rewane Road, Ikoyi',
    client_phone: '+234 802 987 6543',
    client_email: 'procurement@dangote.com',
    client_city_state: 'Ikoyi, Lagos',
    sender_name: 'Engr. Tunde Bakare',
    receiver_name: 'Alh. Musa Ibrahim',
    vehicle_plate: 'LAG 123 XY',
    driver_name: 'Mr. John Chukwu',
    transport_mode: 'By Vehicle',
    delivery_location: 'Dangote Refinery Gate A, Ibeju-Lekki',
    purpose: 'Supply',
    notes: 'Deliver to security reception, obtain stamped copy.',
    custom_fields: undefined,
    items: [
      { description: 'Schneider 15kVA Solar Inverter', qty: 2, unit: 'Pieces', condition: 'New', custom_data: { qtyLabel: '2 pcs', condition: 'New' } },
      { description: 'Megger insulation tester set', qty: 1, unit: 'Set', condition: 'Used', custom_data: { qtyLabel: '1 set', condition: 'Used' } },
    ],
  } as RawWaybill
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

for (const template of TEMPLATE_IDS) {
  test(`Waybill ${template} template serializes expected content`, () => {
    const model = buildWaybillRenderModel({ waybill: sampleWaybill(), columns, company })
    const element = React.createElement(WaybillFormeDocument, { model, designPreset: preset, template })
    const text = extractFormeText(serialize(element)).join(' ')

    assert.ok(text.includes('WB-2026-0042'), 'waybill number must be present')
    assert.ok(text.includes('BOUXRE Engineering Ltd'), 'company name must be present')
    assert.ok(text.includes('Dangote Industries Ltd'), 'client name must be present')
    assert.ok(text.includes('LAG 123 XY'), 'vehicle plate must be present')
  })

  test(`Waybill ${template} template generates valid PDF bytes`, async () => {
    const model = buildWaybillRenderModel({ waybill: sampleWaybill(), columns, company })
    const element = React.createElement(WaybillFormeDocument, { model, designPreset: preset, template })

    const bytes = await renderPdfcnToBytes(element)

    assert.ok(bytes instanceof Uint8Array, 'Forme must return a Uint8Array')
    assert.ok(bytes.length > 1000, `PDF bytes must be non-empty (got ${bytes.length} bytes)`)
    const header = Buffer.from(bytes.slice(0, 5)).toString('utf8')
    assert.equal(header, '%PDF-', 'PDF bytes must start with standard PDF header')
  })
}

test('Blank waybill content serializes expected zones', () => {
  const element = React.createElement(
    Document,
    { title: 'Blank waybill' },
    React.createElement(
      Page,
      { size: 'A4', margin: 20 },
      React.createElement(WaybillMinimalFormeContent, {
        data: {
          type: 'external',
          waybillNumber: 'WB-2026-0099',
          date: '10 Nov 2026',
          companyName: 'BOUXRE Engineering Ltd',
          companyAddress: 'Plot 14 Victoria Island',
          companyPhone: '+234 801 234 5678',
          companyEmail: 'operations@bouxre.ng',
          tagline: 'Reliable Engineering',
        },
      }),
    ),
  )
  const text = extractFormeText(serialize(element)).join(' ')

  assert.ok(text.includes('WAYBILL / DELIVERY NOTE'), 'title must be present')
  assert.ok(text.includes('BOUXRE Engineering Ltd'), 'company name must be present')
  assert.ok(text.includes('WB-2026-0099'), 'waybill number must be present')
  assert.ok(text.includes('Delivered By / Driver'), 'sender signature zone must be present')
  assert.ok(text.includes('Received By'), 'receiver signature zone must be present')
})
