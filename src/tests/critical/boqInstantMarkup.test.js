import test from 'node:test'
import assert from 'node:assert/strict'

import { computeBoqCommercialView } from '../../domain/boq/calculations.ts'
import {
  applyInstantMarkup,
  getBoqRowKey,
  previewInstantMarkup,
} from '../../domain/boq/instant-markup.ts'

function item(overrides = {}) {
  return {
    row_type: 'item',
    sort_order: 0,
    section_title: '',
    description: 'Item',
    specification: '',
    quantity: 1,
    unit: 'pcs',
    notes: '',
    make_brand: '',
    cp: '100',
    sp: '100',
    ...overrides,
  }
}

function section(overrides = {}) {
  return {
    row_type: 'section',
    sort_order: 0,
    section_title: 'Group',
    description: '',
    specification: '',
    quantity: 0,
    unit: '',
    notes: '',
    make_brand: '',
    cp: '',
    sp: '',
    ...overrides,
  }
}

function includeAll(rows) {
  return rows.reduce((selection, row, index) => {
    selection[getBoqRowKey(row, index)] = true
    return selection
  }, {})
}

test('percentage markup derives SP from CP', () => {
  const rows = [item({ cp: '100', sp: '100' })]
  const result = applyInstantMarkup(rows, {
    mode: 'percentage',
    value: 20,
    included: includeAll(rows),
  })

  assert.equal(result.ok, true)
  assert.equal(result.nextRows[0].sp, '120.00')
})

test('value markup adds a per-unit value to CP', () => {
  const rows = [item({ cp: '100', sp: '100' })]
  const result = applyInstantMarkup(rows, {
    mode: 'value',
    value: 20,
    included: includeAll(rows),
  })

  assert.equal(result.ok, true)
  assert.equal(result.nextRows[0].sp, '120.00')
})

test('reapplication derives from CP and does not compound current SP', () => {
  const rows = [item({ cp: '100', sp: '120' })]
  const result = applyInstantMarkup(rows, {
    mode: 'percentage',
    value: 20,
    included: includeAll(rows),
  })

  assert.equal(result.ok, true)
  assert.equal(result.nextRows[0].sp, '120.00')
})

test('excluded row SP remains unchanged', () => {
  const rows = [item({ cp: '100', sp: '117.35' })]
  const result = applyInstantMarkup(rows, {
    mode: 'percentage',
    value: 20,
    included: { [getBoqRowKey(rows[0], 0)]: false },
  })

  assert.equal(result.ok, true)
  assert.equal(result.nextRows[0].sp, '117.35')
})

test('zero and missing CP rows remain ineligible and unchanged', () => {
  const rows = [
    item({ cp: '0', sp: '88.10' }),
    item({ cp: '', sp: '92.25' }),
  ]
  const result = applyInstantMarkup(rows, {
    mode: 'percentage',
    value: 20,
    included: includeAll(rows),
  })

  assert.equal(result.ok, true)
  assert.equal(result.nextRows[0].sp, '88.10')
  assert.equal(result.nextRows[1].sp, '92.25')
  assert.equal(result.affectedCount, 0)
})

test('group headers never participate', () => {
  const rows = [section({ cp: '100', sp: '100' }), item({ cp: '100', sp: '100' })]
  const result = applyInstantMarkup(rows, {
    mode: 'percentage',
    value: 20,
    included: includeAll(rows),
  })

  assert.equal(result.ok, true)
  assert.equal(result.nextRows[0].sp, '100')
  assert.equal(result.nextRows[1].sp, '120.00')
  assert.equal(result.affectedCount, 1)
})

test('mixed rows update only included eligible rows and never mutate CP', () => {
  const rows = [
    section(),
    item({ cp: '100', sp: '100' }),
    item({ cp: '200', sp: '210' }),
    item({ cp: '0', sp: '55' }),
  ]
  const included = includeAll(rows)
  included[getBoqRowKey(rows[2], 2)] = false
  const result = applyInstantMarkup(rows, {
    mode: 'value',
    value: 20,
    included,
  })

  assert.equal(result.ok, true)
  assert.equal(result.nextRows[1].sp, '120.00')
  assert.equal(result.nextRows[2].sp, '210')
  assert.equal(result.nextRows[3].sp, '55')
  assert.equal(result.nextRows[1].cp, '100')
  assert.equal(result.nextRows[2].cp, '200')
})

test('preview totals and undo path use the CPS calculation adapter', () => {
  const rows = [item({ cp: '100', sp: '110', quantity: 2 })]
  const before = computeBoqCommercialView({ table_rows: rows, table_columns: [], custom_fields: {} }).costing
  const preview = previewInstantMarkup(rows, {
    mode: 'percentage',
    value: 20,
    included: includeAll(rows),
  })

  assert.equal(preview.ok, true)
  assert.equal(preview.sellingBefore, before.total_selling_price)
  assert.equal(preview.sellingAfter, 240)
  assert.equal(preview.grossProfitAfter, 40)

  const undo = computeBoqCommercialView({ table_rows: rows, table_columns: [], custom_fields: {} }).costing
  assert.equal(undo.total_selling_price, before.total_selling_price)
  assert.equal(undo.gross_profit, before.gross_profit)
})

test('invalid and negative markup values are rejected', () => {
  const rows = [item()]
  assert.equal(applyInstantMarkup(rows, { mode: 'percentage', value: -1, included: includeAll(rows) }).ok, false)
  assert.equal(applyInstantMarkup(rows, { mode: 'percentage', value: 'abc', included: includeAll(rows) }).ok, false)
  assert.equal(applyInstantMarkup(rows, { mode: 'percentage', value: Number.POSITIVE_INFINITY, included: includeAll(rows) }).ok, false)
})
