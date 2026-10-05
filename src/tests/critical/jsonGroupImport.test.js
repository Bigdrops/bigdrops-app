import test from 'node:test'
import assert from 'node:assert/strict'

import { parseImportText } from '../../domain/import/parse.ts'
import { normalizeImportData } from '../../domain/import/normalize.ts'
import { validateImportData } from '../../domain/import/validate.ts'
import { resolveImportColumns } from '../../domain/import/resolve.ts'
import { buildApplyResult } from '../../domain/import/apply.ts'

const GROUPED_JSON = JSON.stringify({
  groups: [
    { id: 'grp_1', name: 'Civil Works', itemIds: ['item_1', 'item_2'] },
    { id: 'grp_2', name: 'Electrical', itemIds: ['item_3'] },
  ],
  items: [
    { temp_ref: 'item_1', group_id: 'grp_1', description: 'Excavation', quantity: 1, unit_price: 100 },
    { temp_ref: 'item_2', group_id: 'grp_1', description: 'Concrete', quantity: 2, unit_price: 200 },
    { temp_ref: 'item_3', group_id: 'grp_2', description: 'Wiring', quantity: 3, unit_price: 300 },
    { description: 'Loose item', quantity: 1, unit_price: 50 },
  ],
})

let uiKeyCounter = 0
function deterministicItem() {
  uiKeyCounter += 1
  return {
    _uiKey: `test_${uiKeyCounter}`,
    description: '',
    quantity: 1,
    unit_price: 0,
    custom_data: {},
  }
}

function runPipeline() {
  uiKeyCounter = 0
  const parsed = parseImportText(GROUPED_JSON, 'Add')
  assert.equal(parsed.ok, true)
  const normalized = normalizeImportData(parsed.data, 'Add')
  assert.equal(normalized.ok, true)
  const validated = validateImportData('Add', normalized.data, [])
  assert.equal(validated.ok, true)
  const resolved = resolveImportColumns({ validated: validated.data, existingColumns: [], decisions: {} })
  assert.equal(resolved.ok, true)
  return buildApplyResult({
    mode: 'Add',
    existingItems: [],
    existingColumns: [],
    resolved: resolved.data,
    skippedRows: validated.data.skippedRows,
    createItem: deterministicItem,
  })
}

function summarize(result) {
  return {
    groups: result.groups,
    items: result.items.map((item) => ({
      description: item.description,
      group_id: item.group_id,
      row_type: item.row_type,
      sort_order: item.sort_order,
      temp_ref: item.temp_ref,
    })),
  }
}

test('json-group-import: same valid JSON produces same groups on every import', () => {
  const first = summarize(runPipeline())
  const second = summarize(runPipeline())
  assert.deepEqual(second, first)
  assert.equal(first.groups.length, 2)
  assert.deepEqual(first.groups.map((g) => g.id), ['grp_1', 'grp_2'])
})

test('json-group-import: grouped items stay in groups and order is preserved', () => {
  const result = summarize(runPipeline())
  const standards = result.items.filter((i) => i.row_type === 'standard')
  assert.deepEqual(standards.map((i) => i.description), ['Excavation', 'Concrete', 'Wiring', 'Loose item'])
  assert.deepEqual(standards.map((i) => i.group_id), ['grp_1', 'grp_1', 'grp_2', null])
  assert.equal(result.items.filter((i) => i.row_type === 'group_header').length, 2)
})

test('json-group-import: temp_ref does not leak into applied items', () => {
  const result = runPipeline()
  for (const item of result.items) {
    assert.equal(item.temp_ref, undefined)
  }
})

test('json-group-import: dangling group_id produces explicit error, never silent ungroup', () => {
  const bad = JSON.stringify({
    groups: [{ id: 'grp_1', name: 'Civil', itemIds: ['item_1'] }],
    items: [{ temp_ref: 'item_1', group_id: 'grp_missing', description: 'Bad row' }],
  })
  const parsed = parseImportText(bad, 'Add')
  assert.equal(parsed.ok, true)
  const normalized = normalizeImportData(parsed.data, 'Add')
  assert.equal(normalized.ok, true)
  const validated = validateImportData('Add', normalized.data, [])
  assert.equal(validated.ok, false)
  assert.match(validated.message, /unknown group|not listed|no matching/i)
})

test('json-group-import: temp_ref listed without group_id produces explicit error', () => {
  const bad = JSON.stringify({
    groups: [{ id: 'grp_1', name: 'Civil', itemIds: ['item_1'] }],
    items: [{ temp_ref: 'item_1', description: 'Missing group_id' }],
  })
  const parsed = parseImportText(bad, 'Add')
  assert.equal(parsed.ok, true)
  const normalized = normalizeImportData(parsed.data, 'Add')
  assert.equal(normalized.ok, true)
  const validated = validateImportData('Add', normalized.data, [])
  assert.equal(validated.ok, false)
})

test('json-group-import: ungrouped JSON still imports', () => {
  const plain = JSON.stringify({ items: [{ description: 'Solo', quantity: 1 }] })
  const parsed = parseImportText(plain, 'Add')
  assert.equal(parsed.ok, true)
  const normalized = normalizeImportData(parsed.data, 'Add')
  assert.equal(normalized.ok, true)
  const validated = validateImportData('Add', normalized.data, [])
  assert.equal(validated.ok, true)
  const resolved = resolveImportColumns({ validated: validated.data, existingColumns: [], decisions: {} })
  assert.equal(resolved.ok, true)
  const result = buildApplyResult({
    mode: 'Add',
    existingItems: [],
    existingColumns: [],
    resolved: resolved.data,
    skippedRows: [],
    createItem: deterministicItem,
  })
  assert.equal(result.groups.length, 0)
  assert.equal(result.items.filter((i) => i.row_type === 'standard').length, 1)
})

function runCustomPipeline(payload, existingItems = [], existingGroups = []) {
  uiKeyCounter = 0
  const parsed = parseImportText(JSON.stringify(payload), 'Add')
  assert.equal(parsed.ok, true)
  const normalized = normalizeImportData(parsed.data, 'Add')
  assert.equal(normalized.ok, true)
  const validated = validateImportData('Add', normalized.data, existingItems)
  return { normalized, validated, existingItems, existingGroups }
}

function assertPayloadAccepted(payload) {
  const { validated } = runCustomPipeline(payload)
  assert.equal(validated.ok, true, validated.message)
}

function assertPayloadRejected(payload, pattern) {
  const { validated } = runCustomPipeline(payload)
  assert.equal(validated.ok, false)
  assert.match(validated.message, pattern)
}

function groupedItem(ref, groupId, description = ref) {
  return { temp_ref: ref, group_id: groupId, description }
}

function standaloneItem(ref, description = ref) {
  return { temp_ref: ref, description }
}

test('json-group-import: duplicate temp_ref is rejected', () => {
  const { validated } = runCustomPipeline({
    groups: [{ id: 'grp_1', name: 'Civil', itemIds: ['item_1'] }],
    items: [
      { temp_ref: 'item_1', group_id: 'grp_1', description: 'A' },
      { temp_ref: 'item_1', group_id: 'grp_1', description: 'B' },
    ],
  })
  assert.equal(validated.ok, false)
  assert.match(validated.message, /duplicate.*temp_ref/i)
})

test('json-group-import: empty group is rejected, never silently dropped', () => {
  const { validated } = runCustomPipeline({
    groups: [{ id: 'grp_1', name: 'Empty', itemIds: [] }],
    items: [{ description: 'Solo' }],
  })
  assert.equal(validated.ok, false)
  assert.match(validated.message, /no items/i)
})

test('json-group-import: append preserves existing groups and emits no duplicate headers', () => {
  const first = runPipeline()
  const secondPayload = {
    groups: [{ id: 'grp_1', name: 'Civil Works', itemIds: ['item_9'] }],
    items: [{ temp_ref: 'item_9', group_id: 'grp_1', description: 'Appended' }],
  }
  uiKeyCounter = 0
  const parsed = parseImportText(JSON.stringify(secondPayload), 'Add')
  assert.equal(parsed.ok, true)
  const normalized = normalizeImportData(parsed.data, 'Add')
  assert.equal(normalized.ok, true)
  const validated = validateImportData('Add', normalized.data, first.items)
  assert.equal(validated.ok, true)
  const resolved = resolveImportColumns({ validated: validated.data, existingColumns: [], decisions: {} })
  assert.equal(resolved.ok, true)
  const appended = buildApplyResult({
    mode: 'Add',
    existingItems: first.items,
    existingColumns: [],
    resolved: resolved.data,
    skippedRows: validated.data.skippedRows,
    createItem: deterministicItem,
    existingGroups: first.groups,
  })
  const groupIds = appended.groups.map((g) => g.id)
  assert.ok(groupIds.includes('grp_1'))
  assert.ok(groupIds.includes('grp_2'))
  assert.equal(new Set(groupIds).size, groupIds.length)
  assert.equal(appended.groups.length, 2)
  const headersForGrp1 = appended.items.filter((i) => i.row_type === 'group_header' && i.group_id === 'grp_1')
  assert.equal(headersForGrp1.length, 1)
  const appendedRow = appended.items.find((i) => i.description === 'Appended')
  assert.equal(appendedRow?.group_id, 'grp_1')
})

test('json-group-import: colliding group id with different name is remapped, never merged silently', () => {
  const existingItems = [
    { ...deterministicItem(), row_type: 'group_header', group_id: 'grp_1', group_name: 'Old Works', description: 'Old Works', sort_order: 0 },
    { ...deterministicItem(), row_type: 'standard', group_id: 'grp_1', group_name: 'Old Works', description: 'Old item', sort_order: 1 },
  ]
  const { validated } = runCustomPipeline(
    {
      groups: [{ id: 'grp_1', name: 'New Works', itemIds: ['item_9'] }],
      items: [{ temp_ref: 'item_9', group_id: 'grp_1', description: 'New item' }],
    },
    existingItems,
  )
  assert.equal(validated.ok, true)
  const resolved = resolveImportColumns({ validated: validated.data, existingColumns: [], decisions: {} })
  assert.equal(resolved.ok, true)
  const result = buildApplyResult({
    mode: 'Add',
    existingItems,
    existingColumns: [],
    resolved: resolved.data,
    skippedRows: [],
    createItem: deterministicItem,
  })
  const ids = result.groups.map((g) => g.id)
  assert.ok(ids.includes('grp_1'))
  assert.equal(ids.length, 2)
  const newRow = result.items.find((i) => i.description === 'New item')
  assert.notEqual(newRow?.group_id, 'grp_1')
  assert.ok(String(newRow?.group_id).startsWith('grp_1_imported'))
  const oldRow = result.items.find((i) => i.description === 'Old item')
  assert.equal(oldRow?.group_id, 'grp_1')
})

test('json-group-import: contiguous group blocks are accepted', () => {
  assertPayloadAccepted({
    groups: [
      { id: 'grp_1', name: 'Group A', itemIds: ['item_2', 'item_3'] },
      { id: 'grp_2', name: 'Group B', itemIds: ['item_5', 'item_6', 'item_7'] },
      { id: 'grp_3', name: 'Group C', itemIds: ['item_9', 'item_10'] },
    ],
    items: [
      standaloneItem('item_1'),
      groupedItem('item_2', 'grp_1'),
      groupedItem('item_3', 'grp_1'),
      standaloneItem('item_4'),
      groupedItem('item_5', 'grp_2'),
      groupedItem('item_6', 'grp_2'),
      groupedItem('item_7', 'grp_2'),
      standaloneItem('item_8'),
      groupedItem('item_9', 'grp_3'),
      groupedItem('item_10', 'grp_3'),
      standaloneItem('item_11'),
    ],
  })
})

test('json-group-import: standalone rows between different groups are accepted', () => {
  assertPayloadAccepted({
    groups: [
      { id: 'grp_a', name: 'A', itemIds: ['a1', 'a2'] },
      { id: 'grp_b', name: 'B', itemIds: ['b1', 'b2'] },
    ],
    items: [
      groupedItem('a1', 'grp_a'),
      groupedItem('a2', 'grp_a'),
      standaloneItem('loose_1'),
      standaloneItem('loose_2'),
      groupedItem('b1', 'grp_b'),
      groupedItem('b2', 'grp_b'),
    ],
  })
})

test('json-group-import: grouped-only document is accepted', () => {
  assertPayloadAccepted({
    groups: [{ id: 'grp_a', name: 'A', itemIds: ['a1', 'a2', 'a3'] }],
    items: [
      groupedItem('a1', 'grp_a'),
      groupedItem('a2', 'grp_a'),
      groupedItem('a3', 'grp_a'),
    ],
  })
})

test('json-group-import: same group reopened after standalone row is rejected', () => {
  assertPayloadRejected(
    {
      groups: [{ id: 'grp_a', name: 'Electrical Materials', itemIds: ['a1', 'a2'] }],
      items: [
        groupedItem('a1', 'grp_a'),
        standaloneItem('loose_1'),
        groupedItem('a2', 'grp_a'),
      ],
    },
    /Electrical Materials|grp_a|contiguous|reopened|split/i,
  )
})

test('json-group-import: same group reopened after another group is rejected', () => {
  assertPayloadRejected(
    {
      groups: [
        { id: 'grp_a', name: 'Group A', itemIds: ['a1', 'a2'] },
        { id: 'grp_b', name: 'Group B', itemIds: ['b1'] },
      ],
      items: [
        groupedItem('a1', 'grp_a'),
        groupedItem('b1', 'grp_b'),
        groupedItem('a2', 'grp_a'),
      ],
    },
    /Group A|grp_a|contiguous|reopened|split/i,
  )
})

test('json-group-import: repeatedly interleaved groups are rejected', () => {
  assertPayloadRejected(
    {
      groups: [
        { id: 'grp_a', name: 'Group A', itemIds: ['a1', 'a2'] },
        { id: 'grp_b', name: 'Group B', itemIds: ['b1', 'b2'] },
      ],
      items: [
        groupedItem('a1', 'grp_a'),
        groupedItem('b1', 'grp_b'),
        groupedItem('a2', 'grp_a'),
        groupedItem('b2', 'grp_b'),
      ],
    },
    /contiguous|reopened|split/i,
  )
})

test('json-group-import: item assigned to multiple groups is rejected', () => {
  assertPayloadRejected(
    {
      groups: [
        { id: 'grp_a', name: 'Group A', itemIds: ['item_1'] },
        { id: 'grp_b', name: 'Group B', itemIds: ['item_1'] },
      ],
      items: [groupedItem('item_1', 'grp_a')],
    },
    /multiple groups/i,
  )
})

test('json-group-import: group_id versus itemIds disagreement is rejected', () => {
  assertPayloadRejected(
    {
      groups: [
        { id: 'grp_a', name: 'Group A', itemIds: ['item_1'] },
        { id: 'grp_b', name: 'Group B', itemIds: ['item_2'] },
      ],
      items: [
        groupedItem('item_1', 'grp_b'),
        groupedItem('item_2', 'grp_b'),
      ],
    },
    /item_1|grp_a|grp_b|multiple groups|does not match/i,
  )
})

test('json-group-import: group itemIds order must match source item order', () => {
  assertPayloadRejected(
    {
      groups: [{ id: 'grp_a', name: 'Group A', itemIds: ['item_3', 'item_1', 'item_2'] }],
      items: [
        groupedItem('item_1', 'grp_a'),
        groupedItem('item_2', 'grp_a'),
        groupedItem('item_3', 'grp_a'),
      ],
    },
    /order|itemIds|source/i,
  )
})

test('json-group-import: supplied scattered CPS group pattern is rejected before apply', () => {
  assertPayloadRejected(
    {
      groups: [
        { id: 'grp_1', name: 'Electrical Materials', itemIds: ['item_2', 'item_6'] },
        { id: 'grp_2', name: 'Generator Parts', itemIds: ['item_4', 'item_9', 'item_13'] },
        { id: 'grp_3', name: 'Tools and Accessories', itemIds: ['item_8', 'item_12', 'item_15'] },
      ],
      items: [
        standaloneItem('item_1'),
        groupedItem('item_2', 'grp_1'),
        standaloneItem('item_3'),
        groupedItem('item_4', 'grp_2'),
        standaloneItem('item_5'),
        groupedItem('item_6', 'grp_1'),
        standaloneItem('item_7'),
        groupedItem('item_8', 'grp_3'),
        groupedItem('item_9', 'grp_2'),
        standaloneItem('item_10'),
        standaloneItem('item_11'),
        groupedItem('item_12', 'grp_3'),
        groupedItem('item_13', 'grp_2'),
        standaloneItem('item_14'),
        groupedItem('item_15', 'grp_3'),
      ],
    },
    /Electrical Materials|grp_1|contiguous|reopened|split/i,
  )
})
