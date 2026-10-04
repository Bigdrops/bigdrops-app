import test from 'node:test'
import assert from 'node:assert/strict'

import { computeCpsCommercialView } from '../../domain/cps/calculations.ts'
import {
  applyInstantMarkup,
  getCpsRowKey,
  previewInstantMarkup,
  resetInstantMarkupSellingPrices,
} from '../../domain/cps/instant-markup.ts'

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
    selection[getCpsRowKey(row, index)] = true
    return selection
  }, {})
}

test('percentage markup stacks on current SP', () => {
  const rows = [item({ cp: '18500', sp: '25000' })]
  const result = applyInstantMarkup(rows, {
    mode: 'percentage',
    value: 5,
    included: includeAll(rows),
  })

  assert.equal(result.ok, true)
  assert.equal(result.nextRows[0].sp, '26250.00')
})

test('value markup stacks on current SP', () => {
  const rows = [item({ cp: '18500', sp: '25000' })]
  const result = applyInstantMarkup(rows, {
    mode: 'value',
    value: 600,
    included: includeAll(rows),
  })

  assert.equal(result.ok, true)
  assert.equal(result.nextRows[0].sp, '25600.00')
})

test('sequential markup operations remain cumulative', () => {
  const rows = [item({ cp: '18500', sp: '25000' })]
  const first = applyInstantMarkup(rows, {
    mode: 'percentage',
    value: 5,
    included: includeAll(rows),
  })
  assert.equal(first.ok, true)
  const second = applyInstantMarkup(first.nextRows, {
    mode: 'value',
    value: 600,
    included: includeAll(first.nextRows),
  })

  assert.equal(second.ok, true)
  assert.equal(second.nextRows[0].sp, '26850.00')
})

test('three sequential operations keep stacking from working SP', () => {
  const rows = [item({ cp: '100', sp: '200' })]
  const a = applyInstantMarkup(rows, { mode: 'percentage', value: 10, included: includeAll(rows) })
  assert.equal(a.ok, true)
  const b = applyInstantMarkup(a.nextRows, { mode: 'value', value: 5, included: includeAll(a.nextRows) })
  assert.equal(b.ok, true)
  const c = applyInstantMarkup(b.nextRows, { mode: 'percentage', value: 10, included: includeAll(b.nextRows) })
  assert.equal(c.ok, true)
  assert.equal(c.nextRows[0].sp, '247.50')
  assert.equal(c.nextRows[0].cp, '100')
})

test('excluded row SP remains unchanged', () => {
  const rows = [item({ cp: '100', sp: '117.35' })]
  const result = applyInstantMarkup(rows, {
    mode: 'percentage',
    value: 20,
    included: { [getCpsRowKey(rows[0], 0)]: false },
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
  included[getCpsRowKey(rows[2], 2)] = false
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
  const before = computeCpsCommercialView({ table_rows: rows, table_columns: [], custom_fields: {} }).costing
  const preview = previewInstantMarkup(rows, {
    mode: 'percentage',
    value: 20,
    included: includeAll(rows),
  })

  assert.equal(preview.ok, true)
  assert.equal(preview.sellingBefore, before.total_selling_price)
  assert.equal(preview.sellingAfter, 264)
  assert.equal(preview.grossProfitAfter, 64)
  assert.equal(preview.rows[0].currentSp, '110')
  assert.equal(preview.rows[0].proposedSp, '132.00')

  const undo = computeCpsCommercialView({ table_rows: rows, table_columns: [], custom_fields: {} }).costing
  assert.equal(undo.total_selling_price, before.total_selling_price)
  assert.equal(undo.gross_profit, before.gross_profit)
})

test('invalid and negative markup values are rejected', () => {
  const rows = [item()]
  assert.equal(applyInstantMarkup(rows, { mode: 'percentage', value: -1, included: includeAll(rows) }).ok, false)
  assert.equal(applyInstantMarkup(rows, { mode: 'percentage', value: 'abc', included: includeAll(rows) }).ok, false)
  assert.equal(applyInstantMarkup(rows, { mode: 'percentage', value: Number.POSITIVE_INFINITY, included: includeAll(rows) }).ok, false)
})

test('zero SP stacks from zero without CP fallback', () => {
  const rows = [item({ cp: '100', sp: '0' })]
  const pct = applyInstantMarkup(rows, { mode: 'percentage', value: 5, included: includeAll(rows) })
  assert.equal(pct.ok, true)
  assert.equal(pct.nextRows[0].sp, '0.00')

  const fixed = applyInstantMarkup(rows, { mode: 'value', value: 600, included: includeAll(rows) })
  assert.equal(fixed.ok, true)
  assert.equal(fixed.nextRows[0].sp, '600.00')
})

test('reset zeros all item working SP values without changing identity, CP, or groups', () => {
  const rows = [
    section({ id: 's1', group_id: 'g1', section_title: 'A' }),
    item({ id: 'a', group_id: 'g1', cp: '100', sp: '150' }),
    item({ id: 'b', group_id: null, cp: '0', sp: '80' }),
  ]
  const next = resetInstantMarkupSellingPrices(rows)
  assert.equal(next[0].sp, '')
  assert.equal(next[1].sp, '0.00')
  assert.equal(next[2].sp, '0.00')
  assert.equal(next[1].cp, '100')
  assert.equal(next[2].cp, '0')
  assert.equal(next[1].id, 'a')
  assert.equal(next[1].group_id, 'g1')
})
