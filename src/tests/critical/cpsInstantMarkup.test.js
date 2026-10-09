import test from 'node:test'
import assert from 'node:assert/strict'

import { computeCpsCommercialView } from '../../domain/cps/calculations.ts'
import {
  applyInstantMarkup,
  cloneInstantMarkupRows,
  getCpsRowKey,
  previewInstantMarkup,
  resetInstantMarkupWorkingRows,
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

test('percentage markup uses current SP', () => {
  const rows = [item({ cp: '18500', sp: '25000' })]
  const result = applyInstantMarkup(rows, {
    mode: 'percentage',
    value: 5,
    included: includeAll(rows),
  })

  assert.equal(result.ok, true)
  assert.equal(result.nextRows[0].sp, '26250.00')
})

test('value markup uses current SP', () => {
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

test('three sequential operations keep using working SP', () => {
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

test('zero and missing CP rows remain eligible under the zero-SP law', () => {
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
  assert.equal(result.nextRows[0].sp, '105.72')
  assert.equal(result.nextRows[1].sp, '110.70')
  assert.equal(result.affectedCount, 2)
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
  assert.equal(result.nextRows[3].sp, '75.00')
  assert.equal(result.nextRows[1].cp, '100')
  assert.equal(result.nextRows[2].cp, '200')
  assert.equal(result.nextRows[3].cp, '0')
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

test('percentage markup falls back to CP when working SP is zero', () => {
  for (const [cp, value, expected] of [
    ['10', 100, '20.00'],
    ['10', 1000, '110.00'],
    ['270', 1000, '2970.00'],
  ]) {
    const rows = [item({ cp, sp: '0' })]
    const pct = applyInstantMarkup(rows, { mode: 'percentage', value, included: includeAll(rows) })
    assert.equal(pct.ok, true)
    assert.equal(pct.nextRows[0].sp, expected)
    assert.equal(pct.nextRows[0].cp, cp)
  }
})

test('fixed markup uses CP when working SP is zero and SP when it is positive', () => {
  const fromCpRows = [item({ cp: '270', sp: '0' })]
  const fromCp = applyInstantMarkup(fromCpRows, { mode: 'value', value: 1000, included: includeAll(fromCpRows) })
  assert.equal(fromCp.ok, true)
  assert.equal(fromCp.nextRows[0].sp, '1270.00')
  assert.equal(fromCp.nextRows[0].cp, '270')

  const fromSpRows = [item({ cp: '270', sp: '500' })]
  const fromSp = applyInstantMarkup(fromSpRows, { mode: 'value', value: 1000, included: includeAll(fromSpRows) })
  assert.equal(fromSp.ok, true)
  assert.equal(fromSp.nextRows[0].sp, '1500.00')
  assert.equal(fromSp.nextRows[0].cp, '270')
})

test('existing positive SP remains the percentage markup base', () => {
  const rows = [item({ cp: '100', sp: '150' })]
  const result = applyInstantMarkup(rows, { mode: 'percentage', value: 50, included: includeAll(rows) })
  assert.equal(result.ok, true)
  assert.equal(result.nextRows[0].sp, '225.00')
  assert.equal(result.nextRows[0].cp, '100')
})

test('repeated markup uses CP only until a working SP exists', () => {
  const rows = [item({ cp: '10', sp: '0' })]
  const a = applyInstantMarkup(rows, { mode: 'percentage', value: 100, included: includeAll(rows) })
  assert.equal(a.ok, true)
  assert.equal(a.nextRows[0].sp, '20.00')

  const b = applyInstantMarkup(a.nextRows, { mode: 'percentage', value: 50, included: includeAll(a.nextRows) })
  assert.equal(b.ok, true)
  assert.equal(b.nextRows[0].sp, '30.00')

  const c = applyInstantMarkup(b.nextRows, { mode: 'value', value: 5, included: includeAll(b.nextRows) })
  assert.equal(c.ok, true)
  assert.equal(c.nextRows[0].sp, '35.00')

  const d = applyInstantMarkup(c.nextRows, { mode: 'percentage', value: 100, included: includeAll(c.nextRows) })
  assert.equal(d.ok, true)
  assert.equal(d.nextRows[0].sp, '70.00')
  assert.equal(d.nextRows[0].cp, '10')
})

test('zero base remains zero for percentage and accepts fixed markup', () => {
  const rows = [item({ cp: '0', sp: '0' })]
  const pct = applyInstantMarkup(rows, { mode: 'percentage', value: 5, included: includeAll(rows) })
  assert.equal(pct.ok, true)
  assert.equal(pct.nextRows[0].sp, '0.00')
  assert.equal(pct.nextRows[0].cp, '0')

  const fixed = applyInstantMarkup(rows, { mode: 'value', value: 1000, included: includeAll(rows) })
  assert.equal(fixed.ok, true)
  assert.equal(fixed.nextRows[0].sp, '1000.00')
  assert.equal(fixed.nextRows[0].cp, '0')
})

test('preview preserves row identity, group identity, and custom data', () => {
  const rows = [
    item({
      id: 'line-1',
      _uiKey: 'ui-1',
      group_id: 'grp-1',
      cp: '270',
      sp: '0',
      custom_data: { part_no: 'DT04-2P' },
    }),
  ]
  const result = applyInstantMarkup(rows, { mode: 'percentage', value: 1000, included: includeAll(rows) })

  assert.equal(result.ok, true)
  assert.equal(result.nextRows[0].sp, '2970.00')
  assert.equal(result.nextRows[0].id, 'line-1')
  assert.equal(result.nextRows[0]._uiKey, 'ui-1')
  assert.equal(result.nextRows[0].group_id, 'grp-1')
  assert.deepEqual(result.nextRows[0].custom_data, { part_no: 'DT04-2P' })
  assert.equal(result.rows[0].baseSp, '270.00')
})

test('supplied runtime example CP270 SP0 at 20 percent proposes 324', () => {
  const rows = [item({ cp: '270', sp: '0' })]
  const result = applyInstantMarkup(rows, { mode: 'percentage', value: '20', included: includeAll(rows) })

  assert.equal(result.ok, true)
  assert.equal(result.nextRows[0].sp, '324.00')
  assert.equal(result.nextRows[0].cp, '270')
})

test('supplied runtime example CP285 SP0 at 20 percent proposes 342', () => {
  const rows = [item({ cp: '285', sp: '0' })]
  const result = applyInstantMarkup(rows, { mode: 'percentage', value: '20', included: includeAll(rows) })

  assert.equal(result.ok, true)
  assert.equal(result.nextRows[0].sp, '342.00')
  assert.equal(result.nextRows[0].cp, '285')
})

test('proposal recomputes from current input without a preview step', () => {
  const rows = [item({ cp: '270', sp: '0' })]
  const at2 = applyInstantMarkup(rows, { mode: 'percentage', value: '2', included: includeAll(rows) })
  const at20 = applyInstantMarkup(rows, { mode: 'percentage', value: '20', included: includeAll(rows) })

  assert.equal(at2.ok, true)
  assert.equal(at20.ok, true)
  assert.equal(at2.nextRows[0].sp, '275.40')
  assert.equal(at20.nextRows[0].sp, '324.00')
})

test('switching mode recomputes the proposal from the same base', () => {
  const rows = [item({ cp: '270', sp: '0' })]
  const pct = applyInstantMarkup(rows, { mode: 'percentage', value: '20', included: includeAll(rows) })
  const fixed = applyInstantMarkup(rows, { mode: 'value', value: '20', included: includeAll(rows) })

  assert.equal(pct.ok, true)
  assert.equal(fixed.ok, true)
  assert.equal(pct.nextRows[0].sp, '324.00')
  assert.equal(fixed.nextRows[0].sp, '290.00')
})

test('excluding an item updates live aggregates', () => {
  const rows = [item({ cp: '100', sp: '100', quantity: 2 }), item({ cp: '200', sp: '200', quantity: 3 })]
  const included = includeAll(rows)
  included[getCpsRowKey(rows[1], 1)] = false
  const result = applyInstantMarkup(rows, { mode: 'percentage', value: 10, included })

  assert.equal(result.ok, true)
  assert.equal(result.affectedCount, 1)
  assert.equal(result.sellingAfter, 220 + 600)
  assert.equal(result.aggregateChange, 20)
})

test('include all and exclude all update live aggregates', () => {
  const rows = [item({ cp: '100', sp: '100', quantity: 2 }), item({ cp: '200', sp: '200', quantity: 3 })]
  const all = applyInstantMarkup(rows, { mode: 'percentage', value: 10, included: includeAll(rows) })
  assert.equal(all.ok, true)
  assert.equal(all.affectedCount, 2)
  assert.equal(all.sellingAfter, 220 + 660)

  const none = applyInstantMarkup(rows, { mode: 'percentage', value: 10, included: {} })
  assert.equal(none.ok, true)
  assert.equal(none.affectedCount, 0)
  assert.equal(none.sellingAfter, 800)
  assert.equal(none.aggregateChange, 0)
})

test('proposal derivation never mutates source rows', () => {
  const rows = [item({ id: 'x', cp: '270', sp: '0' }), section({ id: 's' })]
  const before = JSON.parse(JSON.stringify(rows))
  const result = applyInstantMarkup(rows, { mode: 'percentage', value: '20', included: includeAll(rows) })

  assert.equal(result.ok, true)
  assert.deepEqual(rows, before)
})

test('reset restores session-opening rows without zeroing positive opening SP', () => {
  const openingRows = [
    section({ id: 's1', _uiKey: 's1-ui', group_id: 'g1', section_title: 'A' }),
    item({ id: 'a', _uiKey: 'a-ui', group_id: 'g1', cp: '100', sp: '150', custom_data: { part: 'A' } }),
    item({ id: 'b', _uiKey: 'b-ui', group_id: null, cp: '0', sp: '0', custom_data: { part: 'B' } }),
    item({ id: 'c', _uiKey: 'c-ui', group_id: null, cp: '50', sp: '700', custom_data: { part: 'C' } }),
  ]
  const workingRows = cloneInstantMarkupRows(openingRows)
  workingRows[1].sp = '300.00'
  workingRows[2].sp = '100.00'
  workingRows[3].sp = '900.00'

  const reset = resetInstantMarkupWorkingRows(openingRows)

  assert.equal(reset[0].sp, '')
  assert.equal(reset[1].sp, '150')
  assert.equal(reset[2].sp, '0')
  assert.equal(reset[3].sp, '700')
  assert.equal(reset[1].cp, '100')
  assert.equal(reset[1].id, 'a')
  assert.equal(reset[1]._uiKey, 'a-ui')
  assert.equal(reset[1].group_id, 'g1')
  assert.deepEqual(reset[1].custom_data, { part: 'A' })
  assert.notEqual(reset[1], openingRows[1])
  assert.notEqual(reset[1].custom_data, openingRows[1].custom_data)

  const undoReset = cloneInstantMarkupRows(workingRows)
  assert.equal(undoReset[1].sp, '300.00')
  assert.equal(undoReset[2].sp, '100.00')
  assert.equal(undoReset[3].sp, '900.00')
  assert.equal(undoReset[1].cp, '100')
  assert.equal(undoReset[1].group_id, 'g1')
  assert.deepEqual(undoReset[1].custom_data, { part: 'A' })
})
