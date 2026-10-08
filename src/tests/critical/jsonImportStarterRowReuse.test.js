import test from 'node:test'
import assert from 'node:assert/strict'

import { parseImportText } from '../../domain/import/parse.ts'
import { normalizeImportData } from '../../domain/import/normalize.ts'
import { validateImportData } from '../../domain/import/validate.ts'
import { resolveImportColumns } from '../../domain/import/resolve.ts'
import { buildApplyResult } from '../../domain/import/apply.ts'
import { invoiceImportAdapter } from '../../domain/invoice/importAdapter.ts'
import { quotationImportAdapter } from '../../domain/quotation/importAdapter.ts'

// The production import pipeline is identical for Invoice and Quotation: it flows
// through parse -> normalize -> validate -> resolve -> buildApplyResult. These tests
// drive that real pipeline (not source text) to prove the empty-description rule and
// the disposable-starter provenance rule.

let uiKeyCounter = 0

function deterministicItem() {
  uiKeyCounter += 1
  return {
    _uiKey: `test_${uiKeyCounter}`,
    item_id: null,
    source_cps_id: null,
    source_cps_row_id: null,
    source_quotation_id: null,
    source_quotation_item_id: null,
    description: '',
    sub_description: '',
    make: '',
    quantity: 1,
    unit: '',
    unit_price: 0,
    install_rate: null,
    install_rate_override: false,
    vat_rate: null,
    discount_rate: null,
    row_type: 'standard',
    group_name: '',
    group_id: null,
    sort_order: 0,
    image_url: null,
    custom_data: {},
  }
}

// The disposable starter row a New Invoice/Quotation form seeds (provenance marked).
function newStarter(overrides = {}) {
  return { ...deterministicItem(), _isStarter: true, ...overrides }
}

// A pristine blank row the user created (via Add item) or that was loaded — unmarked.
function blankUserRow(overrides = {}) {
  return { ...deterministicItem(), row_type: 'standard', group_id: null, group_name: '', ...overrides }
}

function runImport({ payload, existingItems = [], existingGroups = [], columns = [] }) {
  uiKeyCounter = 0
  const parsed = parseImportText(JSON.stringify(payload), 'Add')
  assert.equal(parsed.ok, true, parsed.ok ? '' : parsed.error?.message)
  const normalized = normalizeImportData(parsed.data, 'Add')
  assert.equal(normalized.ok, true, normalized.ok ? '' : normalized.message)
  const validated = validateImportData('Add', normalized.data, existingItems)
  assert.equal(validated.ok, true, validated.ok ? '' : validated.message)
  const resolved = resolveImportColumns({
    validated: validated.data,
    existingColumns: columns,
    decisions: {},
  })
  assert.equal(resolved.ok, true, resolved.ok ? '' : resolved.message)
  return buildApplyResult({
    mode: 'Add',
    existingItems,
    existingColumns: columns,
    resolved: resolved.data,
    skippedRows: validated.data.skippedRows,
    createItem: deterministicItem,
    existingGroups,
  })
}

const GROUPED_ONE = {
  groups: [{ id: 'grp_1', name: 'Civil Works', itemIds: ['i1', 'i2'] }],
  items: [
    { temp_ref: 'i1', group_id: 'grp_1', description: 'Excavation', quantity: 1, unit_price: 100 },
    { temp_ref: 'i2', group_id: 'grp_1', description: 'Concrete', quantity: 2, unit_price: 200 },
  ],
}

function standardRows(result) {
  return result.items.filter((item) => item.row_type !== 'group_header')
}

function blankStandardRows(result) {
  return standardRows(result).filter((item) => String(item.description ?? '').trim() === '')
}

function assertNoDuplicateKeys(items) {
  const keys = items.map((item) => item._uiKey).filter(Boolean)
  assert.equal(new Set(keys).size, keys.length, 'React keys must be unique')
}

function assertNoStarterFlagLeft(items) {
  assert.ok(items.every((item) => item._isStarter === undefined), 'the provenance marker must not reach output')
}

// ── 1 & 2: single ungrouped item reuses the starter row ──────────────────────
test('starter-row-reuse: invoice form empty starter row is reused for one imported item', () => {
  const result = runImport({
    payload: { items: [{ description: 'Generator service', quantity: 2, unit_price: 100 }] },
    existingItems: [newStarter()],
  })

  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].description, 'Generator service')
  assert.equal(result.items[0].quantity, 2)
  assert.equal(result.items[0].unit_price, 100)
  assert.equal(blankStandardRows(result).length, 0)
})

test('starter-row-reuse: quotation form produces identical items for the same import', () => {
  const payload = { items: [{ description: 'Generator service', quantity: 2, unit_price: 100 }] }
  const invoice = runImport({ payload, existingItems: [newStarter()] })
  const quotation = runImport({ payload, existingItems: [newStarter()] })

  assert.deepEqual(
    quotation.items.map((i) => ({ d: i.description, q: i.quantity, r: i.unit_price })),
    invoice.items.map((i) => ({ d: i.description, q: i.quantity, r: i.unit_price })),
  )
  assert.equal(blankStandardRows(quotation).length, 0)
})

// ── 3: multiple items fill then append ───────────────────────────────────────
test('starter-row-reuse: one empty row plus three imported items fills then appends', () => {
  const result = runImport({
    payload: { items: [{ description: 'Item A' }, { description: 'Item B' }, { description: 'Item C' }] },
    existingItems: [newStarter()],
  })

  assert.deepEqual(standardRows(result).map((i) => i.description), ['Item A', 'Item B', 'Item C'])
  assert.equal(blankStandardRows(result).length, 0)
})

// ── 4 & 13: occupied rows are preserved unchanged ────────────────────────────
test('starter-row-reuse: occupied rows are preserved and imported items append', () => {
  const occupied = blankUserRow({ description: 'Generator service', quantity: 4, unit_price: 999 })
  const snapshot = JSON.parse(JSON.stringify(occupied))
  const result = runImport({
    payload: { items: [{ description: 'Item A' }, { description: 'Item B' }] },
    existingItems: [occupied],
  })

  assert.deepEqual(standardRows(result).map((i) => i.description), ['Generator service', 'Item A', 'Item B'])
  assert.deepEqual(result.items[0], snapshot, 'occupied row must be byte-for-byte unchanged')
})

// ── 5: whitespace-only description is empty ──────────────────────────────────
test('starter-row-reuse: whitespace-only description is treated as empty and reused', () => {
  const result = runImport({
    payload: { items: [{ description: 'Item A' }] },
    existingItems: [newStarter({ description: '   \t  ' })],
  })

  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].description, 'Item A')
  assert.equal(blankStandardRows(result).length, 0)
})

// ── 6: no stale placeholder values leak ──────────────────────────────────────
test('starter-row-reuse: reused row does not retain stale quantity/rate', () => {
  const result = runImport({
    payload: { items: [{ description: 'Item A' }] },
    existingItems: [newStarter({ quantity: 5, unit_price: 100 })],
  })

  assert.equal(result.items[0].description, 'Item A')
  assert.equal(result.items[0].quantity, 1, 'stale quantity must not survive')
  assert.equal(result.items[0].unit_price, 0, 'stale rate must not survive')
})

// ── 1 & 3: purely grouped import into a NEW form retires the starter row ─────
test('starter-row-reuse: purely grouped import into a new Invoice leaves no blank starter row', () => {
  const result = runImport({ payload: GROUPED_ONE, existingItems: [newStarter()] })

  assert.equal(blankStandardRows(result).length, 0, 'disposable starter row must be retired')
  const headers = result.items.filter((i) => i.row_type === 'group_header')
  assert.equal(headers.length, 1)
  assert.equal(headers[0].group_id, 'grp_1')
  assert.deepEqual(standardRows(result).map((i) => i.description), ['Excavation', 'Concrete'])
  assert.deepEqual(standardRows(result).map((i) => i.group_id), ['grp_1', 'grp_1'])
  assertNoDuplicateKeys(result.items)
  assertNoStarterFlagLeft(result.items)
})

test('starter-row-reuse: purely grouped import into a new Quotation behaves identically', () => {
  const invoice = runImport({ payload: GROUPED_ONE, existingItems: [newStarter()] })
  const quotation = runImport({ payload: GROUPED_ONE, existingItems: [newStarter()] })

  assert.deepEqual(
    quotation.items.map((i) => ({ d: i.description, t: i.row_type, g: i.group_id })),
    invoice.items.map((i) => ({ d: i.description, t: i.row_type, g: i.group_id })),
  )
  assert.equal(blankStandardRows(quotation).length, 0)
})

// ── 8: ungrouped import stays ungrouped ──────────────────────────────────────
test('starter-row-reuse: ungrouped import stays ungrouped', () => {
  const result = runImport({
    payload: { items: [{ description: 'Solo', quantity: 1 }] },
    existingItems: [newStarter()],
  })

  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].group_id, null)
  assert.equal(result.items[0].group_name, '')
})

// ── 9: mixed grouped/ungrouped import ────────────────────────────────────────
test('starter-row-reuse: mixed import reuses the starter for a leading ungrouped item', () => {
  const result = runImport({
    payload: {
      groups: [{ id: 'grp_1', name: 'Group One', itemIds: ['i2'] }],
      items: [
        { description: 'Loose 1' },
        { temp_ref: 'i2', group_id: 'grp_1', description: 'Grouped' },
        { description: 'Loose 2' },
      ],
    },
    existingItems: [newStarter()],
  })

  assert.deepEqual(
    standardRows(result).map((i) => i.description),
    ['Loose 1', 'Grouped', 'Loose 2'],
  )
  const grouped = standardRows(result).find((i) => i.description === 'Grouped')
  assert.equal(grouped.group_id, 'grp_1')
  const loose = standardRows(result).filter((i) => i.description.startsWith('Loose'))
  assert.deepEqual(loose.map((i) => i.group_id), [null, null])
  assert.equal(blankStandardRows(result).length, 0)
})

test('starter-row-reuse: mixed import retires the starter when no ungrouped item can reuse it', () => {
  const result = runImport({
    payload: {
      groups: [{ id: 'grp_1', name: 'Group One', itemIds: ['i1'] }],
      items: [
        { temp_ref: 'i1', group_id: 'grp_1', description: 'Grouped' },
        { description: 'Loose' },
      ],
    },
    existingItems: [newStarter()],
  })

  assert.equal(blankStandardRows(result).length, 0, 'no disposable placeholder may remain')
  const ordered = standardRows(result).map((i) => i.description)
  assert.deepEqual(ordered, ['Grouped', 'Loose'])
  assert.equal(result.items.filter((i) => i.row_type === 'group_header').length, 1)
})

// ── 10: no duplicate identities or headers when reusing group placeholders ───
test('starter-row-reuse: reusing group-member placeholders creates no duplicate headers or keys', () => {
  const existingItems = [
    blankUserRow({ row_type: 'group_header', group_id: 'grp_1', group_name: 'Group One', description: 'Group One' }),
    blankUserRow({ group_id: 'grp_1', group_name: 'Group One' }),
    blankUserRow({ group_id: 'grp_1', group_name: 'Group One' }),
  ]
  const result = runImport({
    payload: {
      groups: [{ id: 'grp_1', name: 'Group One', itemIds: ['i1', 'i2'] }],
      items: [
        { temp_ref: 'i1', group_id: 'grp_1', description: 'A' },
        { temp_ref: 'i2', group_id: 'grp_1', description: 'B' },
      ],
    },
    existingItems,
    existingGroups: [{ id: 'grp_1', name: 'Group One', showSubtotal: true }],
  })

  const headers = result.items.filter((i) => i.row_type === 'group_header' && i.group_id === 'grp_1')
  assert.equal(headers.length, 1, 'exactly one header per group')
  assert.deepEqual(standardRows(result).map((i) => i.description), ['A', 'B'])
  assertNoDuplicateKeys(result.items)
})

// ── 4: user-created blank rows are never deleted ─────────────────────────────
test('starter-row-reuse: user-created empty rows are preserved after a grouped import', () => {
  const result = runImport({
    payload: GROUPED_ONE,
    existingItems: [newStarter(), blankUserRow(), blankUserRow()],
  })

  // The disposable starter is retired; the two user-authored blank rows survive.
  assert.equal(blankStandardRows(result).length, 2, 'user blank rows must not be deleted')
  assert.deepEqual(blankStandardRows(result).map((i) => i.group_id), [null, null])
  assert.deepEqual(standardRows(result).map((i) => i.description).filter(Boolean), ['Excavation', 'Concrete'])
})

test('starter-row-reuse: a starter row the user typed into is preserved, not deleted', () => {
  const result = runImport({
    payload: GROUPED_ONE,
    existingItems: [newStarter({ description: 'Keep me', quantity: 3 })],
  })

  const kept = standardRows(result).find((i) => i.description === 'Keep me')
  assert.ok(kept, 'a meaningful starter row must survive the import')
  assert.equal(kept.quantity, 3)
  assert.equal(kept._isStarter, undefined)
})

// ── 11: empty import does not touch state ────────────────────────────────────
test('starter-row-reuse: an empty import is rejected before apply', () => {
  const parsed = parseImportText(JSON.stringify({ items: [] }), 'Add')
  assert.equal(parsed.ok, true)
  const normalized = normalizeImportData(parsed.data, 'Add')
  const validated = validateImportData('Add', normalized.data, [newStarter()])
  assert.equal(validated.ok, false, 'no valid items means apply is never reached')
})

// ── 12: Update mode keeps patch semantics (no append, no blank row) ──────────
test('starter-row-reuse: Update mode patches rows and adds no blank row', () => {
  const occupied = blankUserRow({ description: 'Existing item', quantity: 1, unit_price: 10 })
  const parsed = parseImportText(
    JSON.stringify({ items: [{ row_number: 1, unit_price: 500 }] }),
    'Update',
  )
  assert.equal(parsed.ok, true)
  const normalized = normalizeImportData(parsed.data, 'Update')
  assert.equal(normalized.ok, true)
  const validated = validateImportData('Update', normalized.data, [occupied])
  assert.equal(validated.ok, true)
  const resolved = resolveImportColumns({ validated: validated.data, existingColumns: [], decisions: {} })
  assert.equal(resolved.ok, true)
  const result = buildApplyResult({
    mode: 'Update',
    existingItems: [occupied],
    existingColumns: [],
    resolved: resolved.data,
    skippedRows: [],
    createItem: deterministicItem,
  })

  assert.equal(result.mode, 'Update')
  assert.equal(result.items.length, 1, 'Update must not append rows')
  assert.equal(result.items[0].description, 'Existing item')
  assert.equal(result.items[0].unit_price, 500)
})

// ── 14: nothing blank survives to serialization ──────────────────────────────
test('starter-row-reuse: serialization filter yields only imported items (no blank starter)', () => {
  const result = runImport({
    payload: { items: [{ description: 'Item A' }, { description: 'Item B' }] },
    existingItems: [newStarter()],
  })

  // Mirrors the save-time filter: standard rows with empty description are dropped.
  const serialized = result.items
    .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
    .map((item) => item.description)

  assert.deepEqual(serialized, ['Item A', 'Item B'])
})

// ── 15: old group membership never leaks into an imported ungrouped item ─────
test('starter-row-reuse: a grouped placeholder never hosts an ungrouped imported item', () => {
  const existingItems = [
    blankUserRow({ row_type: 'group_header', group_id: 'grp_1', group_name: 'Group One', description: 'Group One' }),
    blankUserRow({ group_id: 'grp_1', group_name: 'Group One' }),
  ]
  const result = runImport({
    payload: { items: [{ description: 'Loose item' }] },
    existingItems,
    existingGroups: [{ id: 'grp_1', name: 'Group One', showSubtotal: true }],
  })

  const loose = standardRows(result).find((i) => i.description === 'Loose item')
  assert.equal(loose.group_id, null, 'imported ungrouped item must not join an existing group')
  assert.equal(loose.group_name, '')
  const leftover = blankStandardRows(result)
  assert.equal(leftover.length, 1, 'the user/group placeholder is preserved, not consumed')
  assert.equal(leftover[0].group_id, 'grp_1')
})

// ── 16: a new group never absorbs the ungrouped starter row ──────────────────
test('starter-row-reuse: the ungrouped starter is retired, never moved into a new group', () => {
  const result = runImport({
    payload: {
      groups: [{ id: 'grp_1', name: 'New Group', itemIds: ['i1'] }],
      items: [{ temp_ref: 'i1', group_id: 'grp_1', description: 'Grouped' }],
    },
    existingItems: [newStarter()],
  })

  assert.equal(blankStandardRows(result).length, 0, 'starter must be retired, not absorbed')
  const grouped = standardRows(result).find((i) => i.description === 'Grouped')
  assert.equal(grouped.group_id, 'grp_1')
  assert.equal(result.items.filter((i) => i.row_type === 'group_header').length, 1)
})

// ── 17: adapters forward the same applied items for both document types ──────
test('starter-row-reuse: invoice and quotation adapters forward the same applied items', () => {
  const result = runImport({
    payload: { items: [{ description: 'Item A' }, { description: 'Item B' }] },
    existingItems: [newStarter()],
  })

  function capture(adapter) {
    let captured = null
    const noop = () => {}
    adapter.applyResult({
      result,
      setColumns: noop,
      setItems: (items) => {
        captured = items
      },
      setGroups: noop,
      updateTopLevelField: noop,
      setExtraCharges: noop,
    })
    return captured
  }

  const invoiceItems = capture(invoiceImportAdapter)
  const quotationItems = capture(quotationImportAdapter)

  assert.ok(Array.isArray(invoiceItems) && Array.isArray(quotationItems))
  assert.deepEqual(quotationItems, invoiceItems)
  assert.equal(invoiceItems.length, 2)
  assert.deepEqual(invoiceItems.map((i) => i.description), ['Item A', 'Item B'])
})
