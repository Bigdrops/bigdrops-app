import test from 'node:test'
import assert from 'node:assert/strict'

import {
  STANDARD_ITEM_COLUMNS,
  WAYBILL_ITEM_KEYS,
  isWaybillItemShaped,
  assertCustomDataExists,
  assertCustomDataPreserved,
  assertNoExtensionFieldsOutsideCustomData,
  assertVisibilityDoesNotMutateData,
  assertUnknownFieldsPreserved,
} from '../../domain/waybill/contracts/waybillContract.ts'

// ── Scenario 1: Import → normalize preserves all custom_data keys ────

test('assertCustomDataPreserved passes when all source keys are in target', () => {
  const source = {
    description: 'Panel LCD',
    quantity: 3,
    unit: 'pcs',
    condition: 'good',
    custom_data: {
      make: 'Samsung',
      partNo: 'SAM-LCD-2024',
      color: 'black',
      voltage: 220,
      warehouse_location: null,
    },
    row_type: 'standard',
  }

  // Simulate a successful normalize: all custom_data keys preserved
  const target = { ...source, custom_data: { ...source.custom_data } }
  assertCustomDataPreserved(source, target, 'import-preserve')
})

test('assertCustomDataPreserved throws when a custom_data key is dropped', () => {
  const source = {
    description: 'X',
    quantity: 1,
    unit: '',
    custom_data: { make: 'Toyota', partNo: 'T-100' },
    row_type: 'standard',
  }
  const target = {
    ...source,
    custom_data: { make: 'Toyota' }, // partNo dropped
  }

  assert.throws(() => assertCustomDataPreserved(source, target, 'import-drop'), {
    message: /custom_data key "partNo" was dropped/,
  })
})

test('assertCustomDataPreserved throws when a value is changed to undefined', () => {
  const source = {
    description: 'X',
    quantity: 1,
    unit: '',
    custom_data: { color: 'red' },
    row_type: 'standard',
  }
  const target = {
    ...source,
    custom_data: { color: undefined },
  }

  assert.throws(() => assertCustomDataPreserved(source, target, 'import-undef'), {
    message: /custom_data key "color" value was changed/,
  })
})

test('assertCustomDataPreserved passes with boolean values in custom_data', () => {
  const source = {
    description: 'X',
    quantity: 1,
    unit: '',
    custom_data: { isFragile: true, requiresCooling: false },
    row_type: 'standard',
  }
  const target = { ...source, custom_data: { ...source.custom_data } }
  assertCustomDataPreserved(source, target, 'boolean-test')
})

// ── Scenario 2: Visibility isolation — toggling column visibility does not mutate data ──

test('assertVisibilityDoesNotMutateData passes when custom_data is identical', () => {
  const itemA = {
    description: 'Widget',
    quantity: 5,
    unit: 'pcs',
    condition: 'good',
    custom_data: { make: 'LG', partNo: 'LG-100' },
    row_type: 'standard',
  }

  const itemB = { ...itemA, custom_data: { ...itemA.custom_data } }
  assertVisibilityDoesNotMutateData(itemA, itemB, 'visibility-test')
})

test('assertVisibilityDoesNotMutateData throws when description is mutated', () => {
  const itemA = {
    description: 'Original',
    quantity: 5,
    unit: 'pcs',
    custom_data: {},
    row_type: 'standard',
  }
  const itemB = { ...itemA, description: 'Mutated' }

  assert.throws(() => assertVisibilityDoesNotMutateData(itemA, itemB, 'mutate-test'), {
    message: /description mutated/,
  })
})

test('assertVisibilityDoesNotMutateData throws when quantity is mutated', () => {
  const itemA = {
    description: 'X',
    quantity: 5,
    unit: 'pcs',
    custom_data: {},
    row_type: 'standard',
  }
  const itemB = { ...itemA, quantity: 10 }

  assert.throws(() => assertVisibilityDoesNotMutateData(itemA, itemB, 'qty-mutate'), {
    message: /quantity mutated/,
  })
})

test('assertVisibilityDoesNotMutateData throws when custom_data key is dropped', () => {
  const itemA = {
    description: 'X',
    quantity: 1,
    unit: '',
    custom_data: { color: 'red', size: 'XL' },
    row_type: 'standard',
  }
  const itemB = { ...itemA, custom_data: { color: 'red' } }

  assert.throws(() => assertVisibilityDoesNotMutateData(itemA, itemB, 'drop-test'), {
    message: /custom_data key "size" was dropped/,
  })
})

// ── Scenario 3: PDF / Form consistency — STANDARD_ITEM_COLUMNS defines shared columns ──

test('STANDARD_ITEM_COLUMNS includes make and partNo as standard columns', () => {
  const keys = STANDARD_ITEM_COLUMNS.map(c => c.key)
  assert.ok(keys.includes('make'), 'make must be a standard column')
  assert.ok(keys.includes('partNo'), 'partNo must be a standard column')
  assert.ok(keys.includes('description'), 'description must be a standard column')
  assert.ok(keys.includes('quantity'), 'quantity must be a standard column')
  assert.ok(keys.includes('unit'), 'unit must be a standard column')
})

test('STANDARD_ITEM_COLUMNS make and partNo are not defaultVisible', () => {
  const make = STANDARD_ITEM_COLUMNS.find(c => c.key === 'make')
  const partNo = STANDARD_ITEM_COLUMNS.find(c => c.key === 'partNo')
  assert.equal(make.defaultVisible, false, 'make should not be visible by default')
  assert.equal(partNo.defaultVisible, false, 'partNo should not be visible by default')
})

test('STANDARD_ITEM_COLUMNS description, quantity, unit are defaultVisible', () => {
  const desc = STANDARD_ITEM_COLUMNS.find(c => c.key === 'description')
  const qty = STANDARD_ITEM_COLUMNS.find(c => c.key === 'quantity')
  const unit = STANDARD_ITEM_COLUMNS.find(c => c.key === 'unit')
  assert.equal(desc.defaultVisible, true, 'description should be visible by default')
  assert.equal(qty.defaultVisible, true, 'quantity should be visible by default')
  assert.equal(unit.defaultVisible, true, 'unit should be visible by default')
})

// ── Scenario 4: Unknown fields from source must land in custom_data ──

test('assertUnknownFieldsPreserved passes when all source fields land in custom_data', () => {
  const source = {
    description: 'Item',
    qty: 2,
    unit: 'pcs',
    make: 'Sony',
    partNo: 'SN-42',
    color: 'blue',
  }

  const result = {
    description: 'Item',
    quantity: 2,
    unit: 'pcs',
    custom_data: { make: 'Sony', partNo: 'SN-42', color: 'blue' },
    row_type: 'standard',
  }

  assertUnknownFieldsPreserved(source, result, 'unknown-test')
})

test('assertUnknownFieldsPreserved throws when source top-level field is lost', () => {
  // Source has a top-level 'make' field (non-standard) that normalizeWaybillItem
  // should place into custom_data. If it's missing from result.custom_data, throw.
  const source = {
    description: 'Item',
    qty: 1,
    make: 'Sony',
  }

  const result = {
    description: 'Item',
    quantity: 1,
    unit: '',
    custom_data: {}, // 'make' was lost — not in custom_data
    row_type: 'standard',
  }

  assert.throws(() => assertUnknownFieldsPreserved(source, result, 'lost-test'), {
    message: /Source field "make" was lost/,
  })
})

test('assertUnknownFieldsPreserved ignores standard fields (qty, description, etc.)', () => {
  const source = {
    description: 'Item',
    qty: 1,
    unit: 'pcs',
    condition: 'damaged',
  }

  const result = {
    description: 'Item',
    quantity: 1,
    unit: 'pcs',
    condition: 'damaged',
    custom_data: {},
    row_type: 'standard',
  }

  // Should not throw — standard fields are not checked
  assertUnknownFieldsPreserved(source, result, 'standard-ok')
})

// ── assertNoExtensionFieldsOutsideCustomData ──

test('assertNoExtensionFieldsOutsideCustomData passes for valid item', () => {
  const item = {
    description: 'X',
    quantity: 1,
    unit: '',
    custom_data: { make: 'Toyota' },
    row_type: 'standard',
  }
  assertNoExtensionFieldsOutsideCustomData(item, 'valid-test')
})

test('assertNoExtensionFieldsOutsideCustomData passes with all standard keys', () => {
  const item = {
    description: 'X',
    quantity: 1,
    unit: '',
    condition: 'good',
    custom_data: {},
    row_type: 'standard',
  }
  assertNoExtensionFieldsOutsideCustomData(item, 'all-standard')
})

test('assertNoExtensionFieldsOutsideCustomData throws for extension field on item root', () => {
  const item = {
    description: 'X',
    quantity: 1,
    unit: '',
    custom_data: {},
    row_type: 'standard',
    make: 'Honda',  // VIOLATION: should be in custom_data
  }
  assert.throws(() => assertNoExtensionFieldsOutsideCustomData(item, 'violation-test'), {
    message: /Extension field "make" found outside custom_data/,
  })
})

// ── isWaybillItemShaped ──

test('isWaybillItemShaped accepts valid item shape', () => {
  assert.ok(isWaybillItemShaped({
    description: 'X',
    quantity: 1,
    unit: '',
    custom_data: {},
  }))
})

test('isWaybillItemShaped rejects missing custom_data', () => {
  assert.ok(!isWaybillItemShaped({
    description: 'X',
    quantity: 1,
  }))
})

test('isWaybillItemShaped rejects zero quantity', () => {
  assert.ok(!isWaybillItemShaped({
    description: 'X',
    quantity: 0,
    unit: '',
    custom_data: {},
  }))
})

test('isWaybillItemShaped rejects array', () => {
  assert.ok(!isWaybillItemShaped([]))
})

test('isWaybillItemShaped rejects null', () => {
  assert.ok(!isWaybillItemShaped(null))
})
