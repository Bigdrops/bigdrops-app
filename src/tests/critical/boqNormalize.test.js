import test from 'node:test'
import assert from 'node:assert/strict'

import {
  denormalizeToDbBoq,
  denormalizeToDbBoqRow,
  getNextBoqNumber,
  normalizeDbBoq,
} from '../../domain/boq/normalize.ts'

test('boq normalize round-trip preserves fields and colors', () => {
  const dbBoq = {
    id: 'b1',
    boq_number: 'BOQ-001',
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

  const boq = normalizeDbBoq(dbBoq, [])
  assert.equal(boq.background_color, '#111827')
  assert.equal(boq.border_color, '#D1D5DB')
  assert.equal(boq.preset_name, 'Slate')
  assert.equal(boq.show_brand_name, true)
  assert.equal(boq.show_vendor_identity, true)
  assert.equal(boq.template_id, 'bordered_schedule')
  assert.ok(boq.table_columns.length > 0)

  const back = denormalizeToDbBoq(boq)
  assert.equal(back.background_primary, '#111827')
  assert.equal(back.palette_name, 'Slate')
  assert.equal(typeof back.custom_fields, 'object')
})

test('boq row round-trip packs specification into cells', () => {
  const dbRow = {
    boq_id: 'b1',
    sort_order: 0,
    row_type: 'item',
    description: 'Cement',
    unit: 'bag',
    quantity: 10,
    cells: JSON.stringify({ specification: '42.5R', make_brand: 'Dangote', cp: '100', sp: '150' }),
  }

  const row = normalizeDbBoq({ id: 'b1' }, [dbRow]).table_rows[0]
  assert.equal(row.description, 'Cement')
  assert.equal(row.specification, '42.5R')
  assert.equal(row.cp, '100')
  assert.equal(row.sp, '150')
  assert.equal(row.quantity, 10)

  const back = denormalizeToDbBoqRow(row, 'b1')
  assert.equal(back.boq_id, 'b1')
  assert.equal(back.cells?.specification, '42.5R')
  assert.equal(back.quantity, 10)
  assert.equal(back.sort_order, 0)
})

test('getNextBoqNumber increments from existing rows', () => {
  assert.equal(getNextBoqNumber([], 'BOQ'), 'BOQ-001')
  assert.equal(getNextBoqNumber([{ boq_number: 'BOQ-001' }, { boq_number: 'BOQ-004' }], 'BOQ'), 'BOQ-005')
  assert.equal(getNextBoqNumber([{ boq_number: 'RFQ-100' }], 'BOQ'), 'BOQ-001')
})