import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  appendCpsRow,
  createCpsRow,
  findCpsGroupInsertIndex,
  getCpsSectionGroupId,
  insertCpsRow,
  removeCpsRow,
} from '../../domain/cps/row-operations.ts'

function group(title, sortOrder = 0) {
  const row = createCpsRow('section', sortOrder)
  row.section_title = title
  return row
}

function item(description, sortOrder = 0, groupId = null) {
  const row = createCpsRow('item', sortOrder, { groupId })
  row.description = description
  return row
}

test('CPS Add Line Item with zero groups creates an ungrouped item', () => {
  const rows = appendCpsRow([], 'item')

  assert.equal(rows.length, 1)
  assert.equal(rows[0].row_type, 'item')
  assert.equal(rows[0].group_id, null)
})

test('CPS Add Line Item with one existing group creates an ungrouped item', () => {
  const groupA = group('Group A')
  const rows = appendCpsRow([groupA], 'item')

  assert.equal(rows[1].row_type, 'item')
  assert.equal(rows[1].group_id, null)
  assert.equal(rows[0].group_id, groupA.group_id)
})

test('CPS Add Line Item with multiple existing groups creates an ungrouped item', () => {
  const groupA = group('Group A')
  const groupB = group('Group B')
  const rows = appendCpsRow([groupA, groupB], 'item')

  assert.equal(rows[2].row_type, 'item')
  assert.equal(rows[2].group_id, null)
  assert.deepEqual(rows.slice(0, 2).map((row) => row.group_id), [groupA.group_id, groupB.group_id])
})

test('CPS Add Item to Group A assigns only Group A', () => {
  const groupA = group('Group A')
  const groupId = getCpsSectionGroupId(groupA)
  const rows = insertCpsRow([groupA], 1, 'item', { groupId })

  assert.equal(rows[1].row_type, 'item')
  assert.equal(rows[1].group_id, groupId)
})

test('CPS Add Item to Group B assigns only Group B', () => {
  const groupA = group('Group A')
  const groupB = group('Group B')
  const groupBId = getCpsSectionGroupId(groupB)
  const rows = insertCpsRow([groupA, groupB], 2, 'item', { groupId: groupBId })

  assert.equal(rows[2].row_type, 'item')
  assert.equal(rows[2].group_id, groupBId)
  assert.notEqual(rows[2].group_id, getCpsSectionGroupId(groupA))
})

test('CPS ungrouped item after grouped item does not inherit the previous group', () => {
  const groupA = group('Group A')
  const groupAId = getCpsSectionGroupId(groupA)
  const grouped = item('Grouped item', 1, groupAId)
  const rows = appendCpsRow([groupA, grouped], 'item')

  assert.equal(rows[1].group_id, groupAId)
  assert.equal(rows[2].group_id, null)
})

test('CPS Insert Below preserves the source row explicit group membership', () => {
  const groupA = group('Group A')
  const groupAId = getCpsSectionGroupId(groupA)
  const grouped = item('Grouped item', 1, groupAId)
  const ungrouped = item('Ungrouped item', 2, null)

  const afterGrouped = insertCpsRow([groupA, grouped, ungrouped], 2, 'item', { groupId: grouped.group_id })
  assert.equal(afterGrouped[2].group_id, groupAId)

  const afterUngrouped = insertCpsRow([groupA, grouped, ungrouped], 3, 'item', { groupId: ungrouped.group_id })
  assert.equal(afterUngrouped[3].group_id, null)
})

test('CPS ungrouped item creation does not mutate existing groups or grouped items', () => {
  const groupA = group('Group A')
  const groupAId = getCpsSectionGroupId(groupA)
  const grouped = item('Grouped item', 1, groupAId)
  const rows = appendCpsRow([groupA, grouped], 'item')

  assert.equal(rows[0].group_id, groupAId)
  assert.equal(rows[1].group_id, groupAId)
  assert.equal(rows[2].group_id, null)
})

test('CPS non-contiguous group membership exists without row reordering', () => {
  const groupA = group('Group A')
  const groupB = group('Group B')
  const groupAId = getCpsSectionGroupId(groupA)
  const groupBId = getCpsSectionGroupId(groupB)
  const rows = [
    groupA,
    item('A1', 1, groupAId),
    item('Ungrouped', 2, null),
    item('A2', 3, groupAId),
    groupB,
    item('B1', 5, groupBId),
    item('Tail ungrouped', 6, null),
  ]

  assert.deepEqual(rows.map((row) => row.description || row.section_title), [
    'Group A',
    'A1',
    'Ungrouped',
    'A2',
    'Group B',
    'B1',
    'Tail ungrouped',
  ])
  assert.deepEqual(rows.filter((row) => row.row_type === 'item').map((row) => row.group_id ?? null), [
    groupAId,
    null,
    groupAId,
    groupBId,
    null,
  ])
})

test('CPS Add Group does not absorb unrelated rows', () => {
  const ungrouped = item('Ungrouped item', 0, null)
  const rows = appendCpsRow([ungrouped], 'section')

  assert.equal(rows[0].description, 'Ungrouped item')
  assert.equal(rows[0].group_id, null)
  assert.equal(rows[1].row_type, 'section')
  assert.notEqual(rows[1].group_id, null)
})

test('CPS row X removal deletes only the intended row', () => {
  const rows = [
    item('First', 0, null),
    item('Remove me', 1, null),
    item('Last', 2, null),
  ]
  const next = removeCpsRow(rows, 1)

  assert.deepEqual(next.map((row) => row.description), ['First', 'Last'])
  assert.deepEqual(next.map((row) => row.sort_order), [0, 1])
})

test('CPS duplicate placeholder does not delete or mutate rows', () => {
  const source = readFileSync(new URL('../../components/cps/CostPricingSheetFormPresentations.tsx', import.meta.url), 'utf8')

  assert.match(source, /aria-label="Duplicate row placeholder"/)
  assert.match(source, /<Copy size=\{12\} \/>/)
  assert.doesNotMatch(source, /Duplicate row placeholder"[^>]*onClick=/)
})

test('CPS group insert index targets the explicit group without using adjacency', () => {
  const groupA = group('Group A')
  const groupB = group('Group B')
  const groupAId = getCpsSectionGroupId(groupA)
  const groupBId = getCpsSectionGroupId(groupB)
  const rows = [
    groupA,
    item('A1', 1, groupAId),
    item('Ungrouped', 2, null),
    item('A2', 3, groupAId),
    groupB,
    item('B1', 5, groupBId),
  ]

  assert.equal(findCpsGroupInsertIndex(rows, groupAId, 0), 4)
  assert.equal(findCpsGroupInsertIndex(rows, groupBId, 4), 6)
})
