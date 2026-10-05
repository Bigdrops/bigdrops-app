import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  assignCpsRowToGroup,
  appendCpsRow,
  createCpsRow,
  findCpsGroupInsertIndex,
  getCpsSectionGroupId,
  insertCpsRow,
  moveCpsGroupBlock,
  moveCpsRow,
  removeCpsRowFromGroup,
  removeCpsRow,
} from '../../domain/cps/row-operations.ts'
import { validateCpsGroupStructure } from '../../domain/cps/group-structure.ts'

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

function labels(rows) {
  return rows.map((row) => row.description || row.section_title)
}

function assertContiguous(rows) {
  assert.equal(validateCpsGroupStructure(rows), null)
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

test('CPS contiguous group structure validator rejects A standalone A', () => {
  const groupA = group('Group A')
  const groupAId = getCpsSectionGroupId(groupA)
  const rows = [
    groupA,
    item('A1', 1, groupAId),
    item('Ungrouped', 2, null),
    item('A2', 3, groupAId),
  ]

  assert.match(validateCpsGroupStructure(rows), /Group A|contiguous|split|reopen/i)
})

test('CPS contiguous group structure validator rejects A B A', () => {
  const groupA = group('Group A')
  const groupB = group('Group B')
  const groupAId = getCpsSectionGroupId(groupA)
  const groupBId = getCpsSectionGroupId(groupB)
  const rows = [groupA, item('A1', 1, groupAId), groupB, item('B1', 3, groupBId), item('A2', 4, groupAId)]

  assert.match(validateCpsGroupStructure(rows), /Group A|contiguous|split|reopen/i)
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

test('CPS group insert index targets the explicit contiguous group block', () => {
  const groupA = group('Group A')
  const groupB = group('Group B')
  const groupAId = getCpsSectionGroupId(groupA)
  const groupBId = getCpsSectionGroupId(groupB)
  const rows = [
    groupA,
    item('A1', 1, groupAId),
    item('A2', 2, groupAId),
    item('Ungrouped', 3, null),
    groupB,
    item('B1', 5, groupBId),
  ]

  assert.equal(findCpsGroupInsertIndex(rows, groupAId, 0), 3)
  assert.equal(findCpsGroupInsertIndex(rows, groupBId, 4), 6)
  assertContiguous(rows)
})

test('CPS create contiguous group and add item to existing group preserve the invariant', () => {
  const groupA = group('Group A')
  const groupAId = getCpsSectionGroupId(groupA)
  let rows = [item('Intro', 0, null), groupA, item('A1', 2, groupAId), item('Tail', 3, null)]

  rows = insertCpsRow(rows, 99, 'item', { groupId: groupAId })

  assert.deepEqual(labels(rows), ['Intro', 'Group A', 'A1', '', 'Tail'])
  assert.equal(rows[3].group_id, groupAId)
  assertContiguous(rows)
})

test('CPS assign standalone item to group moves it into the group block', () => {
  const groupA = group('Group A')
  const groupAId = getCpsSectionGroupId(groupA)
  const rows = [groupA, item('A1', 1, groupAId), item('Standalone', 2, null), item('Tail', 3, null)]

  const next = assignCpsRowToGroup(rows, 2, groupAId)

  assert.deepEqual(labels(next), ['Group A', 'A1', 'Standalone', 'Tail'])
  assert.equal(next[2].group_id, groupAId)
  assertContiguous(next)
})

test('CPS remove first, middle, and last members from a group preserves one remaining block', () => {
  const groupA = group('Group A')
  const groupAId = getCpsSectionGroupId(groupA)
  const base = [
    groupA,
    item('A1', 1, groupAId),
    item('A2', 2, groupAId),
    item('A3', 3, groupAId),
    item('Tail', 4, null),
  ]

  const firstRemoved = removeCpsRowFromGroup(base, 1)
  assert.deepEqual(firstRemoved.map((row) => row.group_id ?? null), [groupAId, groupAId, groupAId, null, null])
  assertContiguous(firstRemoved)

  const middleRemoved = removeCpsRowFromGroup(base, 2)
  assert.deepEqual(labels(middleRemoved), ['Group A', 'A1', 'A3', 'A2', 'Tail'])
  assert.equal(middleRemoved[3].group_id, null)
  assertContiguous(middleRemoved)

  const lastRemoved = removeCpsRowFromGroup(base, 3)
  assert.deepEqual(lastRemoved.map((row) => row.group_id ?? null), [groupAId, groupAId, groupAId, null, null])
  assertContiguous(lastRemoved)
})

test('CPS reorder item inside same group is allowed but moving grouped item outside is refused', () => {
  const groupA = group('Group A')
  const groupAId = getCpsSectionGroupId(groupA)
  const rows = [groupA, item('A1', 1, groupAId), item('A2', 2, groupAId), item('Tail', 3, null)]

  const withinGroup = moveCpsRow(rows, 2, 1)
  assert.deepEqual(labels(withinGroup), ['Group A', 'A2', 'A1', 'Tail'])
  assertContiguous(withinGroup)

  const refused = moveCpsRow(rows, 1, 4)
  assert.deepEqual(labels(refused), labels(rows))
  assertContiguous(refused)
})

test('CPS moving standalone item into a group block is refused', () => {
  const groupA = group('Group A')
  const groupAId = getCpsSectionGroupId(groupA)
  const rows = [groupA, item('A1', 1, groupAId), item('A2', 2, groupAId), item('Standalone', 3, null)]

  const refused = moveCpsRow(rows, 3, 2)

  assert.deepEqual(labels(refused), labels(rows))
  assertContiguous(refused)
})

test('CPS moving a complete group block preserves contiguous groups', () => {
  const groupA = group('Group A')
  const groupB = group('Group B')
  const groupAId = getCpsSectionGroupId(groupA)
  const groupBId = getCpsSectionGroupId(groupB)
  const rows = [
    item('Intro', 0, null),
    groupA,
    item('A1', 2, groupAId),
    item('A2', 3, groupAId),
    groupB,
    item('B1', 5, groupBId),
    item('Tail', 6, null),
  ]

  const movedAfterB = moveCpsGroupBlock(rows, groupAId, 6)
  assert.deepEqual(labels(movedAfterB), ['Intro', 'Group B', 'B1', 'Group A', 'A1', 'A2', 'Tail'])
  assertContiguous(movedAfterB)

  const movedBeforeA = moveCpsGroupBlock(movedAfterB, groupBId, 3)
  assert.deepEqual(labels(movedBeforeA), ['Intro', 'Group B', 'B1', 'Group A', 'A1', 'A2', 'Tail'])
  assertContiguous(movedBeforeA)
})

test('CPS duplicate grouped item remains inside its group block', () => {
  const groupA = group('Group A')
  const groupAId = getCpsSectionGroupId(groupA)
  const rows = [groupA, item('A1', 1, groupAId), item('Tail', 2, null)]

  const next = insertCpsRow(rows, 2, 'item', { groupId: groupAId })

  assert.equal(next[2].group_id, groupAId)
  assertContiguous(next)
})

test('CPS delete grouped item and delete group preserve the invariant', () => {
  const groupA = group('Group A')
  const groupAId = getCpsSectionGroupId(groupA)
  const rows = [groupA, item('A1', 1, groupAId), item('A2', 2, groupAId), item('Tail', 3, null)]

  const deletedItem = removeCpsRow(rows, 1)
  assert.deepEqual(labels(deletedItem), ['Group A', 'A2', 'Tail'])
  assertContiguous(deletedItem)

  const deletedGroup = removeCpsRow(rows, 0)
  assert.deepEqual(deletedGroup.map((row) => row.group_id ?? null), [null, null, null])
  assertContiguous(deletedGroup)
})

test('CPS valid standalone-only, grouped-only, and mixed documents are accepted', () => {
  const groupA = group('Group A')
  const groupB = group('Group B')
  const groupAId = getCpsSectionGroupId(groupA)
  const groupBId = getCpsSectionGroupId(groupB)

  assertContiguous([item('One', 0, null), item('Two', 1, null)])
  assertContiguous([groupA, item('A1', 1, groupAId), item('A2', 2, groupAId)])
  assertContiguous([
    item('Intro', 0, null),
    groupA,
    item('A1', 2, groupAId),
    item('Between', 3, null),
    groupB,
    item('B1', 5, groupBId),
    item('Tail', 6, null),
  ])
})
