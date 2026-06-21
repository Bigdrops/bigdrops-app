import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWaybillRenderModel } from '../../domain/waybill/engine/assembly'

const FORBIDDEN_KEYS = new Set([
  'item_id', 'id', 'created_at', 'updated_at',
  'unit_price', 'rate', 'vat', 'discount', 'subtotal', 'grand_total', 'custom_data',
])

const sampleInput = {
  waybill: {
    waybill_number: 'WBL-E-000042',
    type: 'external' as const,
    date: '2026-06-20',
    time: null,
    po_number: 'PO-99823',
    client_name: 'Global Industrial Logistics',
    sender_name: 'Sun & Shield Power Solutions',
    receiver_name: 'Site Manager — Ikoyi Depot',
    vehicle_plate: 'AKD-421-XY',
    driver_name: 'Emeka Nwosu',
    transport_mode: 'By Vehicle',
    delivery_location: 'Plot 42, Ikoyi Crescent, Lagos',
    purpose: 'Supply',
    notes: '<p>Handle with care. <strong>Fragile</strong> items.</p>',
    custom_fields: {
      signatures: {
        sender: { image_url: 'https://example.com/sig-sender.png', drawn_data_url: null },
        receiver: null,
      },
    },
    items: [
      {
        description: 'Oil Filter Element',
        qty: 2,
        unit: 'pcs',
        condition: 'good',
        custom_data: { part_no: 'FLT-101', make: 'Cummins' },
      },
      {
        description: 'Fuel Injector',
        qty: 4,
        unit: 'pcs',
        condition: 'damaged',
        custom_data: { part_no: 'INJ-505', make: 'Bosch' },
      },
      {
        description: 'Air Intake Gasket',
        qty: 1,
        unit: 'kit',
        condition: null,
        custom_data: { part_no: 'GSK-001' },
      },
    ],
  },
  columns: [
    { key: 'description', label: 'Description' },
    { key: 'qtyLabel', label: 'Qty / Unit' },
    { key: 'condition', label: 'Condition' },
    { key: 'part_no', label: 'Part No' },
    { key: 'make', label: 'Make' },
  ],
  company: {
    name: 'Sun & Shield Power Solutions',
    tagline: 'Power You Can Trust',
    logo: 'https://example.com/logo.png',
    address: '43 Oshola Street, Ifako-Ijaiye, Lagos',
    phone: '+2348066190685',
    email: 'info@sunshield.com',
  },
}

test('1. Model shape — all top-level keys present', () => {
  const result = buildWaybillRenderModel(sampleInput)
  const expectedKeys = ['branding', 'header', 'parties', 'logistics', 'notes', 'signatures', 'footer', 'pagination', 'table']
  for (const key of expectedKeys) {
    assert.ok(key in result, `missing top-level key: ${key}`)
  }
})

test('2. Blank preservation — null time becomes "", purpose stays "Supply", receiver sig null', () => {
  const result = buildWaybillRenderModel(sampleInput)
  assert.equal(result.header.time, '')
  assert.equal(result.logistics.purpose, 'Supply')
  assert.equal(result.signatures.receiver, null)
})

test('3. HTML stripped from notes', () => {
  const result = buildWaybillRenderModel(sampleInput)
  assert.equal(result.notes, 'Handle with care. Fragile items.')
})

test('4. Signature normalization', () => {
  const result = buildWaybillRenderModel(sampleInput)
  assert.deepEqual(result.signatures.sender, {
    url: 'https://example.com/sig-sender.png',
    width: 110,
    height: 42,
  })
  assert.equal(result.signatures.receiver, null)
})

test('5. Forbidden fields excluded from all rows', () => {
  const result = buildWaybillRenderModel(sampleInput)
  for (const row of result.table.rows) {
    for (const key of Object.keys(row.cells)) {
      assert.ok(!FORBIDDEN_KEYS.has(key), `forbidden key "${key}" found in cells`)
    }
  }
})

test('6. qtyLabel computed correctly', () => {
  const result = buildWaybillRenderModel(sampleInput)
  const rows = result.table.rows
  assert.equal(rows[0].cells.qtyLabel, '2 pcs')
  assert.equal(rows[1].cells.qtyLabel, '4 pcs')
  assert.equal(rows[2].cells.qtyLabel, '1 kit')
})

test('7. Custom columns mapped from custom_data', () => {
  const result = buildWaybillRenderModel(sampleInput)
  const rows = result.table.rows
  assert.equal(rows[0].cells.part_no, 'FLT-101')
  assert.equal(rows[0].cells.make, 'Cummins')
  assert.equal(rows[2].cells.make, '')
})

test('8. Table columns match input', () => {
  const result = buildWaybillRenderModel(sampleInput)
  assert.equal(result.table.columns.length, 5)
  assert.equal(result.table.columns[0].key, 'description')
  assert.equal(result.table.columns[0].label, 'Description')
  assert.equal(result.table.columns[1].key, 'qtyLabel')
  assert.equal(result.table.columns[1].label, 'Qty / Unit')
  assert.equal(result.table.columns[4].key, 'make')
  assert.equal(result.table.columns[4].label, 'Make')
})

test('9. Footer values', () => {
  const result = buildWaybillRenderModel(sampleInput)
  assert.equal(result.footer.waybillNumber, 'WBL-E-000042')
  assert.equal(result.footer.companyName, 'Sun & Shield Power Solutions')
})

test('10. Pagination defaults', () => {
  const result = buildWaybillRenderModel(sampleInput)
  assert.equal(result.pagination.repeatTableHeader, true)
  assert.equal(result.pagination.keepSignatureTogether, true)
  assert.equal(result.pagination.keepNotesTogether, true)
})

test('11. Determinism — same input produces identical output', () => {
  const a = buildWaybillRenderModel(sampleInput)
  const b = buildWaybillRenderModel(sampleInput)
  assert.equal(JSON.stringify(a), JSON.stringify(b))
})
