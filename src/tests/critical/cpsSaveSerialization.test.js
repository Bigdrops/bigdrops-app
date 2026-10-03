import test from 'node:test'
import assert from 'node:assert/strict'

import { denormalizeToDbCpsRow, normalizeDbCps } from '../../domain/cps/normalize.ts'
import {
  appendCpsRow,
  createCpsRow,
  normalizeCpsRowOrder,
} from '../../domain/cps/row-operations.ts'

// Canonical hosted contract for cps_rows (see migration
// 20261003204928_cps_rows_row_type_canonical.sql):
// CHECK (row_type = ANY (ARRAY['item'::text, 'section'::text])).
const CANONICAL_ROW_TYPES = new Set(['item', 'section'])

function buildMixedRows() {
  // Group A with two members, group B with one member, ungrouped items
  // before, between, and after the groups (non-contiguous membership
  // is representable and must survive serialization).
  const groupA = createCpsRow('section', 0)
  groupA.section_title = 'Group A'
  const groupB = createCpsRow('section', 1)
  groupB.section_title = 'Group B'

  const item = (sortOrder, groupId, description) => ({
    ...createCpsRow('item', sortOrder, { groupId }),
    description,
    quantity: 2,
    cp: '100',
    sp: '150',
  })

  const rows = normalizeCpsRowOrder([
    item(0, null, 'Ungrouped prelim'),
    groupA,
    item(2, groupA.group_id, 'A member one'),
    { ...item(3, null, 'Ungrouped between'), description: 'Ungrouped between' },
    item(4, groupA.group_id, 'A member two (non-contiguous)'),
    groupB,
    item(6, groupB.group_id, 'B member one'),
    item(7, null, 'Ungrouped tail'),
  ])

  return { rows, groupAId: groupA.group_id, groupBId: groupB.group_id }
}

test('CPS mixed save payload uses only canonical DB row_type values', () => {
  const { rows } = buildMixedRows()
  const payload = rows.map((row) => denormalizeToDbCpsRow({ ...row }, 'sheet-1'))

  assert.ok(payload.length > 0)
  for (const dbRow of payload) {
    assert.ok(
      CANONICAL_ROW_TYPES.has(dbRow.row_type),
      `row_type ${String(dbRow.row_type)} is outside the canonical (item, section) contract`,
    )
    assert.ok(
      dbRow.row_type !== 'section_header' && dbRow.row_type !== 'option' && dbRow.row_type !== 'group',
      `legacy row_type ${String(dbRow.row_type)} must never reach cps_rows`,
    )
  }

  const groups = payload.filter((row) => row.row_type === 'section')
  const items = payload.filter((row) => row.row_type === 'item')
  assert.equal(groups.length, 2)
  assert.equal(items.length, 6)
})

test('CPS mixed save payload preserves group_id membership and nulls', () => {
  const { rows, groupAId, groupBId } = buildMixedRows()
  const payload = rows.map((row) => denormalizeToDbCpsRow({ ...row }, 'sheet-1'))
  const byDescription = new Map(payload.map((row) => [row.description, row]))

  assert.equal(byDescription.get('A member one').cells.group_id, groupAId)
  assert.equal(byDescription.get('A member two (non-contiguous)').cells.group_id, groupAId)
  assert.equal(byDescription.get('B member one').cells.group_id, groupBId)
  assert.equal(byDescription.get('Ungrouped prelim').cells.group_id, null)
  assert.equal(byDescription.get('Ungrouped between').cells.group_id, null)
  assert.equal(byDescription.get('Ungrouped tail').cells.group_id, null)
})

test('CPS mixed save payload keeps stable string group identity', () => {
  const { rows, groupAId } = buildMixedRows()
  assert.ok(typeof groupAId === 'string' && groupAId.length > 0)

  const first = rows.map((row) => denormalizeToDbCpsRow({ ...row }, 'sheet-1'))
  const second = rows.map((row) => denormalizeToDbCpsRow({ ...row }, 'sheet-1'))
  assert.deepEqual(
    first.map((row) => row.cells.group_id),
    second.map((row) => row.cells.group_id),
  )
})

test('CPS mixed rows round-trip through normalization without type drift', () => {
  const { rows } = buildMixedRows()
  const dbRows = rows.map((row, index) => ({
    id: `row-${index}`,
    cps_sheet_id: 'sheet-1',
    sort_order: index,
    ...denormalizeToDbCpsRow({ ...row }, 'sheet-1'),
    cells: JSON.stringify(denormalizeToDbCpsRow({ ...row }, 'sheet-1').cells),
  }))

  const normalized = normalizeDbCps({ id: 'sheet-1', custom_fields: {} }, dbRows)
  const types = normalized.table_rows.map((row) => row.row_type).sort()
  assert.deepEqual(types, ['item', 'item', 'item', 'item', 'item', 'item', 'section', 'section'])

  const members = normalized.table_rows.filter(
    (row) => row.row_type === 'item' && row.group_id !== null,
  )
  assert.equal(members.length, 3)
})

test('CPS append path never emits non-canonical row types', () => {
  let rows = []
  rows = appendCpsRow(rows, 'item')
  rows = appendCpsRow(rows, 'section')
  rows = appendCpsRow(rows, 'item')
  const payload = rows.map((row) => denormalizeToDbCpsRow({ ...row }, 'sheet-1'))
  for (const dbRow of payload) {
    assert.ok(CANONICAL_ROW_TYPES.has(dbRow.row_type))
  }
})
