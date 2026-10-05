import test from 'node:test'
import assert from 'node:assert/strict'

import {
  denormalizeToDbCps,
  denormalizeToDbCpsRow,
  getNextCpsNumber,
  normalizeDbCps,
} from '../../domain/cps/normalize.ts'
import { validateCpsGroupStructure } from '../../domain/cps/group-structure.ts'

test('CPS normalize round-trip preserves fields and colors', () => {
  const dbCps = {
    id: 'b1',
    cps_number: 'BOQ-001',
    title: 'BILL OF QUANTITIES',
    user_id: 'u1',
    background_primary: '#111827',
    background_secondary: '#D1D5DB',
    text_color: '#FFFFFF',
    accent_color: '#0F172A',
    palette_name: 'Slate',
    show_brand_name: true,
    issue_date: '2026-08-19',
    custom_fields: JSON.stringify({
      show_vendor_identity: true,
      template_id: 'bordered_schedule',
      table_rows: [],
    }),
  }

  const cps = normalizeDbCps(dbCps, [])
  assert.equal(cps.background_color, '#111827')
  assert.equal(cps.border_color, '#D1D5DB')
  assert.equal(cps.preset_name, 'Slate')
  assert.equal(cps.show_brand_name, true)
  assert.equal(cps.show_vendor_identity, true)
  assert.equal(cps.template_id, 'bordered_schedule')
  assert.ok(cps.table_columns.length > 0)

  const back = denormalizeToDbCps(cps)
  assert.equal(back.background_primary, '#111827')
  assert.equal(back.palette_name, 'Slate')
  assert.equal(typeof back.custom_fields, 'object')
})

test('CPS row round-trip packs specification into cells', () => {
  const dbRow = {
    cps_sheet_id: 'b1',
    sort_order: 0,
    row_type: 'item',
    description: 'Cement',
    unit: 'bag',
    quantity: 10,
    cells: JSON.stringify({ specification: '42.5R', make_brand: 'Dangote', cp: '100', sp: '150' }),
  }

  const row = normalizeDbCps({ id: 'b1' }, [dbRow]).table_rows[0]
  assert.equal(row.description, 'Cement')
  assert.equal(row.specification, '42.5R')
  assert.equal(row.cp, '100')
  assert.equal(row.sp, '150')
  assert.equal(row.quantity, 10)

  const back = denormalizeToDbCpsRow(row, 'b1')
  assert.equal(back.cps_sheet_id, 'b1')
  assert.equal(back.cells?.specification, '42.5R')
  assert.equal(back.quantity, 10)
  assert.equal(back.sort_order, 0)
})

test('getNextCpsNumber increments from existing rows', () => {
  assert.equal(getNextCpsNumber([], 'BOQ'), 'BOQ-000001')
  assert.equal(getNextCpsNumber([{ cps_number: 'BOQ-000001' }, { cps_number: 'BOQ-000004' }], 'BOQ'), 'BOQ-000005')
  assert.equal(getNextCpsNumber([{ cps_number: 'RFQ-100' }], 'BOQ'), 'BOQ-000001')
})

test('CPS client identity, site, and notes survive the persistence round trip', () => {
  const cps = {
    id: 'b1',
    cps_number: 'BOQ-000007',
    template_id: 'bordered_schedule',
    title: 'Cost & Pricing Sheet',
    client_name: 'Wellspring Homes Ltd',
    project_name: 'Lekki Phase 1',
    issue_date: '2026-09-30',
    show_vendor_identity: false,
    show_brand_name: false,
    brand_name_override: '',
    background_color: '#FFFFFF',
    text_color: '#1F2937',
    border_color: '#94A3B8',
    accent_color: '#0F172A',
    preset_name: 'Clean Slate',
    notes: 'Site notes',
    table_rows: [],
    table_columns: [],
    created_at: '2026-09-30T00:00:00.000Z',
    updated_at: '2026-09-30T00:00:00.000Z',
    custom_fields: {
      client_id: 'client-42',
      client_snapshot: { id: 'client-42', name: 'Wellspring Homes Ltd', phone: '0803' },
    },
  }

  const dbCps = denormalizeToDbCps(cps)
  const restored = normalizeDbCps({ ...dbCps, id: 'b1' }, [])

  assert.equal(restored.custom_fields.client_id, 'client-42')
  assert.equal(restored.custom_fields.client_snapshot.name, 'Wellspring Homes Ltd')
  assert.equal(restored.client_name, 'Wellspring Homes Ltd')
  assert.equal(restored.project_name, 'Lekki Phase 1')
  assert.equal(restored.notes, 'Site notes')
})

test('CPS legacy record without client identity hydrates safely', () => {
  const restored = normalizeDbCps(
    {
      id: 'b2',
      cps_number: 'BOQ-000008',
      vendor_name: 'Old Vendor',
      vendor_contact: 'Old Site',
      notes: 'Legacy note',
      custom_fields: JSON.stringify({ table_rows: [] }),
    },
    [],
  )

  // Legacy rows stored the client in `vendor_name` and the site in `vendor_contact`.
  assert.equal(restored.client_name, 'Old Vendor')
  assert.equal(restored.project_name, 'Old Site')
  assert.equal(restored.notes, 'Legacy note')
  assert.equal(restored.custom_fields.client_id, undefined)
  assert.ok(restored.table_columns.length > 0)
})

test('CPS normalization detects but does not rewrite persisted non-contiguous groups', () => {
  const groupId = 'grp-a'
  const row = (sortOrder, description, group_id) => ({
    id: `row-${sortOrder}`,
    cps_sheet_id: 'b3',
    sort_order: sortOrder,
    row_type: sortOrder === 0 ? 'section' : 'item',
    section_title: sortOrder === 0 ? 'Group A' : '',
    description,
    quantity: 1,
    unit: '',
    notes: '',
    group_id,
    cells: JSON.stringify({ group_id }),
  })

  const restored = normalizeDbCps(
    { id: 'b3', custom_fields: {} },
    [
      row(0, 'Group A', groupId),
      row(1, 'A1', groupId),
      row(2, 'Standalone', null),
      row(3, 'A2', groupId),
    ],
  )

  assert.deepEqual(restored.table_rows.map((entry) => entry.description || entry.section_title), [
    'Group A',
    'A1',
    'Standalone',
    'A2',
  ])
  assert.match(validateCpsGroupStructure(restored.table_rows), /Group A|contiguous|split/i)
})
