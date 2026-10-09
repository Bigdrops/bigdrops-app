import test from 'node:test'
import assert from 'node:assert/strict'

import {
  computeCpsRowEconomics,
  computeCpsTotals,
} from '../../domain/cps/calculateCpsTotals.ts'
import { applyInstantMarkup, previewInstantMarkup } from '../../domain/cps/instant-markup.ts'
import { normalizeDbCps } from '../../domain/cps/normalize.ts'
import { createCpsRow } from '../../domain/cps/row-operations.ts'
import { buildCpsViewData } from '../../domain/cps/viewData.ts'

// Edge-case matrix for the canonical CPS calculation authority. Every
// expectation below is produced by the production domain functions, never
// by copied formulas.

function itemRow(sortOrder, patch = {}) {
  return {
    ...createCpsRow('item', sortOrder, { groupId: patch.group_id ?? null }),
    description: patch.description ?? 'Item',
    quantity: patch.quantity ?? 1,
    unit: patch.unit ?? 'pcs',
    make_brand: patch.make_brand ?? '',
    specification: patch.specification ?? '',
    cp: patch.cp ?? 0,
    sp: patch.sp ?? 0,
    image_url: null,
  }
}

function sectionRow(sortOrder, groupId, title = 'Group') {
  const row = createCpsRow('section', sortOrder)
  return { ...row, section_title: title, group_id: groupId ?? row.group_id }
}

test('A: one ordinary item produces exact row and document economics', () => {
  const row = itemRow(0, { quantity: 2, cp: 100, sp: 150 })
  const econ = computeCpsRowEconomics(row)
  assert.equal(econ.total_cost_price, 200)
  assert.equal(econ.total_selling_price, 300)
  assert.equal(econ.profit, 100)
  assert.equal(econ.margin_percent, 33.333333333333336)
  assert.equal(econ.unit_profit, 50)

  const totals = computeCpsTotals([row])
  assert.equal(totals.total_cost, 200)
  assert.equal(totals.total_selling_price, 300)
  assert.equal(totals.gross_profit, 100)
  assert.equal(totals.margin_percent, 33.333333333333336)
})

test('B: multiple ungrouped items sum', () => {
  const rows = [
    itemRow(0, { quantity: 1, cp: 10, sp: 20 }),
    itemRow(1, { quantity: 3, cp: 5, sp: 9 }),
  ]
  const totals = computeCpsTotals(rows)
  assert.equal(totals.total_cost, 10 + 15)
  assert.equal(totals.total_selling_price, 20 + 27)
  assert.equal(totals.gross_profit, (20 + 27) - (10 + 15))
})

test('C/D/E/F: grouped, mixed, multi-group, and non-contiguous rows share one arithmetic', () => {
  const groupA = 'grp-a'
  const groupB = 'grp-b'
  const grouped = [
    sectionRow(0, groupA, 'A'),
    itemRow(1, { quantity: 2, cp: 100, sp: 150, group_id: groupA }),
    itemRow(2, { quantity: 1, cp: 10, sp: 20, group_id: null }),
    itemRow(3, { quantity: 4, cp: 25, sp: 30, group_id: groupA }),
    sectionRow(4, groupB, 'B'),
    itemRow(5, { quantity: 1, cp: 7, sp: 14, group_id: groupB }),
  ]
  const flat = [
    itemRow(0, { quantity: 2, cp: 100, sp: 150 }),
    itemRow(1, { quantity: 1, cp: 10, sp: 20 }),
    itemRow(2, { quantity: 4, cp: 25, sp: 30 }),
    itemRow(3, { quantity: 1, cp: 7, sp: 14 }),
  ]
  assert.deepEqual(computeCpsTotals(grouped), computeCpsTotals(flat))
})

test('G: section rows contribute zero', () => {
  const totals = computeCpsTotals([sectionRow(0, 'g', 'Group'), itemRow(1, { quantity: 1, cp: 10, sp: 20 })])
  assert.equal(totals.total_cost, 10)
  assert.equal(totals.total_selling_price, 20)
  assert.deepEqual(computeCpsRowEconomics(sectionRow(0, 'g')), {
    quantity: 0,
    cp: 0,
    sp: 0,
    total_cost_price: 0,
    total_selling_price: 0,
    profit: 0,
    margin_percent: 0,
    unit_profit: 0,
  })
})

test('H/I/J: decimal quantity, CP, and SP stay exact', () => {
  const row = itemRow(0, { quantity: 0.1, cp: 19.99, sp: 29.99 })
  const econ = computeCpsRowEconomics(row)
  assert.equal(econ.total_cost_price, 1.999)
  assert.equal(econ.total_selling_price, 2.999)
  assert.equal(econ.profit, 1)
})

test('K: zero CP keeps full selling as profit', () => {
  const econ = computeCpsRowEconomics(itemRow(0, { quantity: 2, cp: 0, sp: 50 }))
  assert.equal(econ.total_cost_price, 0)
  assert.equal(econ.total_selling_price, 100)
  assert.equal(econ.profit, 100)
  assert.equal(econ.margin_percent, 100)
})

test('L: zero SP is representable at calculation level', () => {
  const totals = computeCpsTotals([itemRow(0, { quantity: 2, cp: 100, sp: 0 })])
  assert.equal(totals.total_cost, 200)
  assert.equal(totals.total_selling_price, 0)
  assert.equal(totals.gross_profit, -200)
})

test('M: zero total selling forces zero margin at row and document level', () => {
  assert.equal(computeCpsRowEconomics(itemRow(0, { quantity: 2, cp: 100, sp: 0 })).margin_percent, 0)
  assert.equal(computeCpsTotals([itemRow(0, { quantity: 2, cp: 100, sp: 0 })]).margin_percent, 0)
  assert.equal(computeCpsTotals([]).margin_percent, 0)
})

test('N/O: markup percentage and fixed value stack from current SP only', () => {
  const rows = [itemRow(0, { quantity: 2, cp: 100, sp: 10 })]
  const byKey = { [rows[0].id || rows[0]._uiKey]: true }

  const pct = applyInstantMarkup(rows, { mode: 'percentage', value: '25', included: byKey })
  assert.equal(pct.ok, true)
  if (pct.ok) assert.equal(String(pct.nextRows[0].sp), '12.50')

  const fixed = applyInstantMarkup(rows, { mode: 'value', value: '15', included: byKey })
  assert.equal(fixed.ok, true)
  if (fixed.ok) assert.equal(String(fixed.nextRows[0].sp), '25.00')
})

test('P/Q: excluded rows survive markup unchanged; zero-base rows process to an identical zero', () => {
  const rows = [
    itemRow(0, { quantity: 1, cp: 100, sp: 100 }),
    itemRow(1, { quantity: 1, cp: 0, sp: 0 }),
  ]
  const keys = rows.map((row) => row.id || row._uiKey)
  const included = { [keys[0]]: false, [keys[1]]: true }
  const result = applyInstantMarkup(rows, { mode: 'percentage', value: '10', included })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.nextRows[0].sp, rows[0].sp)
    assert.equal(result.nextRows[1].sp, '0.00')
    assert.equal(result.affectedCount, 1)
  }
})

test('R: markup apply is pure and totals recompute through the canonical path', () => {
  const rows = [itemRow(0, { quantity: 2, cp: 100, sp: 100 })]
  const before = computeCpsTotals(rows)
  const byKey = { [rows[0].id || rows[0]._uiKey]: true }
  const preview = previewInstantMarkup(rows, { mode: 'percentage', value: '10', included: byKey })
  assert.equal(preview.ok, true)
  if (!preview.ok) return
  assert.equal(rows[0].sp, 100)
  assert.deepEqual(computeCpsTotals(preview.nextRows), {
    total_cost: 200,
    total_selling_price: 220,
    gross_profit: 20,
    margin_percent: (20 / 220) * 100,
  })
  assert.equal(preview.sellingAfter, computeCpsTotals(preview.nextRows).total_selling_price)
  assert.equal(before.total_selling_price, 200)
})

test('S: import-shaped string numerics total identically', () => {
  const rows = [
    { ...itemRow(0, { quantity: '2', cp: '100.50', sp: '150.25' }) },
  ]
  const totals = computeCpsTotals(rows)
  assert.equal(totals.total_cost, 201)
  assert.equal(totals.total_selling_price, 300.5)
})

test('T: large monetary values stay exact', () => {
  const row = itemRow(0, { quantity: 100000, cp: 999999999.99, sp: 1000000000.99 })
  const econ = computeCpsRowEconomics(row)
  assert.equal(econ.total_cost_price, 99999999999000)
  assert.equal(econ.total_selling_price, 100000000099000)
  assert.equal(econ.profit, 100000)
})

test('U: repeated recomputation does not drift', () => {
  const rows = [
    itemRow(0, { quantity: 3, cp: 19.99, sp: 29.99, group_id: 'g1' }),
    sectionRow(1, 'g1'),
    itemRow(2, { quantity: 7, cp: 0.1, sp: 0.3 }),
  ]
  const first = computeCpsTotals(rows)
  const second = computeCpsTotals(rows.map((row) => ({ ...row })))
  assert.deepEqual(first, second)
  assert.equal(first.total_cost, 60.67)
  assert.equal(first.total_selling_price, 92.07)
})

test('V: normalization round-trip preserves economics inputs', () => {
  const source = [
    { ...itemRow(0, { quantity: 2, cp: '100', sp: '150', description: 'Cement' }) },
  ]
  const normalized = normalizeDbCps(
    { id: 'sheet-1', custom_fields: {} },
    source.map((row, index) => ({
      id: `row-${index}`,
      cps_sheet_id: 'sheet-1',
      sort_order: index,
      row_type: row.row_type,
      description: row.description,
      specification: row.specification,
      quantity: row.quantity,
      unit: row.unit,
      make_brand: row.make_brand,
      cells: JSON.stringify({ cp: row.cp, sp: row.sp, group_id: row.group_id }),
      image_url: null,
    })),
  )
  const totals = computeCpsTotals(normalized.table_rows)
  assert.equal(totals.total_cost, 200)
  assert.equal(totals.total_selling_price, 300)
})

test('W: reordered rows produce identical totals', () => {
  const a = itemRow(0, { quantity: 2, cp: 100, sp: 150, group_id: 'g1' })
  const b = itemRow(1, { quantity: 1, cp: 10, sp: 20, group_id: null })
  const section = sectionRow(2, 'g1')
  assert.deepEqual(computeCpsTotals([a, b, section]), computeCpsTotals([section, b, a]))
})

test('view rows use the canonical row economics including Decimal dust cases', () => {
  const dust = itemRow(0, { quantity: 3, cp: 0.1, sp: 0.2, description: 'Dust' })
  const plain = itemRow(1, { quantity: 2, cp: 100, sp: 150, description: 'Plain' })
  const data = buildCpsViewData({
    table_rows: [dust, plain],
    custom_fields: {},
    table_columns: [],
  })
  const dustView = data.rows.find((row) => row.type === 'item' && row.description === 'Dust')
  assert.ok(dustView && dustView.type === 'item')
  if (dustView.type === 'item') {
    assert.equal(dustView.cost, 0.3)
    assert.equal(dustView.selling, 0.6)
    assert.equal(dustView.profit, 0.3)
    const engine = computeCpsRowEconomics(dust)
    assert.equal(dustView.cost, engine.total_cost_price)
    assert.equal(dustView.selling, engine.total_selling_price)
    assert.equal(dustView.profit, engine.profit)
    assert.equal(dustView.marginPercent, engine.margin_percent)
  }
  assert.equal(data.totals.total_cost, 0.3 + 200)
})
