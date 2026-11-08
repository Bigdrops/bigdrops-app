import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createEmptyPurchaseOrderItem,
} from '../../domain/purchase-order/types.ts'
import {
  applyPurchaseOrderImport,
  isPurchaseOrderItemEmpty,
  isPurchaseOrderItemPopulated,
  purchaseOrderItemFromImport,
} from '../../domain/purchase-order/formAdapter.ts'

test('po import: isPurchaseOrderItemPopulated and isPurchaseOrderItemEmpty correctly classify items', () => {
  const emptyPlaceholder = createEmptyPurchaseOrderItem(0)
  assert.equal(isPurchaseOrderItemPopulated(emptyPlaceholder), false)
  assert.equal(isPurchaseOrderItemEmpty(emptyPlaceholder), true)

  const populatedStandard = {
    ...createEmptyPurchaseOrderItem(0),
    description: 'Cement 50kg bag',
    quantity: 10,
    unit_cost: 4500,
  }
  assert.equal(isPurchaseOrderItemPopulated(populatedStandard), true)
  assert.equal(isPurchaseOrderItemEmpty(populatedStandard), false)

  // Zero quantity and zero unit_cost with non-empty description is POPULATED (commercial item)
  const zeroValuedItem = {
    ...createEmptyPurchaseOrderItem(0),
    description: 'Warranty / Complimentary Sample',
    quantity: 0,
    unit_cost: 0,
  }
  assert.equal(isPurchaseOrderItemPopulated(zeroValuedItem), true)
  assert.equal(isPurchaseOrderItemEmpty(zeroValuedItem), false)

  // Sub-description or image or item_id alone marks populated
  const subDescOnly = {
    ...createEmptyPurchaseOrderItem(0),
    description: '',
    sub_description: 'Serial #123456',
  }
  assert.equal(isPurchaseOrderItemPopulated(subDescOnly), true)

  const imageOnly = {
    ...createEmptyPurchaseOrderItem(0),
    description: '',
    image_url: 'https://example.com/item.png',
  }
  assert.equal(isPurchaseOrderItemPopulated(imageOnly), true)

  // Persisted row (with id) is always populated even if description is empty
  const persistedRow = {
    ...createEmptyPurchaseOrderItem(0),
    id: 'poi-existing-123',
    description: '',
  }
  assert.equal(isPurchaseOrderItemPopulated(persistedRow), true)
})

test('po import: reuses empty trailing draft placeholder row when importing items', () => {
  const initialPlaceholder = {
    ...createEmptyPurchaseOrderItem(0),
    _uiKey: 'ui-placeholder-key-001',
  }
  const existing = [initialPlaceholder]

  const importedRows = [
    { description: 'First Imported Item', quantity: 5, unit: 'pcs', unit_cost: 1200 },
    { description: 'Second Imported Item', quantity: 2, unit: 'box', unit_cost: 3000 },
  ]

  const result = applyPurchaseOrderImport(existing, importedRows)

  assert.equal(result.length, 2)
  assert.equal(result[0].description, 'First Imported Item')
  assert.equal(result[0].quantity, 5)
  assert.equal(result[0].unit, 'pcs')
  assert.equal(result[0].unit_cost, 1200)
  assert.equal(result[0].line_total, 6000)
  assert.equal(result[0].sort_order, 0)
  assert.equal(result[0]._uiKey, 'ui-placeholder-key-001', 'Reuses UI key of trailing placeholder')

  assert.equal(result[1].description, 'Second Imported Item')
  assert.equal(result[1].quantity, 2)
  assert.equal(result[1].unit, 'box')
  assert.equal(result[1].unit_cost, 3000)
  assert.equal(result[1].line_total, 6000)
  assert.equal(result[1].sort_order, 1)
})

test('po import: appends imported items after populated items when final row is populated', () => {
  const existingItem1 = {
    ...createEmptyPurchaseOrderItem(0),
    id: 'poi-1',
    description: 'Pre-existing Item 1',
    quantity: 10,
    unit: 'bags',
    unit_cost: 5000,
    line_total: 50000,
    _uiKey: 'key-1',
  }
  const existing = [existingItem1]

  const importedRows = [
    { description: 'Imported A', quantity: 3, unit: 'pcs', unit_price: 2500 },
    { description: 'Imported B', quantity: 7, unit: 'kg', unit_cost: 800 },
  ]

  const result = applyPurchaseOrderImport(existing, importedRows)

  assert.equal(result.length, 3)
  assert.equal(result[0].id, 'poi-1')
  assert.equal(result[0].description, 'Pre-existing Item 1')
  assert.equal(result[0].sort_order, 0)

  assert.equal(result[1].description, 'Imported A')
  assert.equal(result[1].unit_cost, 2500)
  assert.equal(result[1].sort_order, 1)

  assert.equal(result[2].description, 'Imported B')
  assert.equal(result[2].unit_cost, 800)
  assert.equal(result[2].sort_order, 2)
})

test('po import: reuses empty trailing placeholder when preceded by populated items', () => {
  const existingItem1 = {
    ...createEmptyPurchaseOrderItem(0),
    id: 'poi-1',
    description: 'Pre-existing Item 1',
    quantity: 10,
    unit: 'bags',
    unit_cost: 5000,
    line_total: 50000,
    _uiKey: 'key-1',
  }
  const emptyTrailing = {
    ...createEmptyPurchaseOrderItem(1),
    _uiKey: 'trailing-draft-key',
  }
  const existing = [existingItem1, emptyTrailing]

  const importedRows = [
    { description: 'Imported First', quantity: 4, unit: 'pcs', unit_cost: 1500 },
    { description: 'Imported Second', quantity: 1, unit: 'set', unit_cost: 9000 },
  ]

  const result = applyPurchaseOrderImport(existing, importedRows)

  assert.equal(result.length, 3, 'Does not create extra blank row')
  assert.equal(result[0].description, 'Pre-existing Item 1')
  assert.equal(result[0].sort_order, 0)

  assert.equal(result[1].description, 'Imported First')
  assert.equal(result[1]._uiKey, 'trailing-draft-key', 'Reuses trailing placeholder key')
  assert.equal(result[1].sort_order, 1)

  assert.equal(result[2].description, 'Imported Second')
  assert.equal(result[2].sort_order, 2)
})

test('po import: filters intermediate empty rows without creating empty rows in output', () => {
  const existingItem1 = {
    ...createEmptyPurchaseOrderItem(0),
    description: 'Pre-existing Item 1',
    quantity: 1,
    unit_cost: 100,
  }
  const intermediateEmpty = {
    ...createEmptyPurchaseOrderItem(1),
  }
  const existingItem2 = {
    ...createEmptyPurchaseOrderItem(2),
    description: 'Pre-existing Item 2',
    quantity: 2,
    unit_cost: 200,
  }
  const trailingEmpty = {
    ...createEmptyPurchaseOrderItem(3),
  }
  const existing = [existingItem1, intermediateEmpty, existingItem2, trailingEmpty]

  const importedRows = [
    { description: 'Imported Item' },
  ]

  const result = applyPurchaseOrderImport(existing, importedRows)

  assert.equal(result.length, 3)
  assert.equal(result[0].description, 'Pre-existing Item 1')
  assert.equal(result[0].sort_order, 0)
  assert.equal(result[1].description, 'Pre-existing Item 2')
  assert.equal(result[1].sort_order, 1)
  assert.equal(result[2].description, 'Imported Item')
  assert.equal(result[2].sort_order, 2)
})

test('po import: does not mutate existing item objects (immutability)', () => {
  const originalItem = Object.freeze({
    ...createEmptyPurchaseOrderItem(0),
    description: 'Frozen Existing Item',
    quantity: 5,
    unit_cost: 1000,
  })
  const existing = [originalItem]

  const importedRows = [{ description: 'New Item', quantity: 1, unit_cost: 500 }]

  // If applyPurchaseOrderImport attempted to mutate originalItem, Object.freeze would throw
  assert.doesNotThrow(() => {
    const result = applyPurchaseOrderImport(existing, importedRows)
    assert.equal(result.length, 2)
  })
})

test('po import: preserves item metadata (sub_description, image_url, item_id, custom_data)', () => {
  const existing = [createEmptyPurchaseOrderItem(0)]
  const importedRows = [
    {
      description: 'Deluxe Widget',
      sub_description: 'Grade A steel',
      quantity: 10,
      unit: 'pieces',
      unit_cost: 2500,
      image_url: 'https://cdn.bourxe.com/items/widget.png',
      item_id: 'inv-item-778',
      custom_data: { serialPrefix: 'DX' },
    },
  ]

  const result = applyPurchaseOrderImport(existing, importedRows)
  assert.equal(result.length, 1)
  const item = result[0]
  assert.equal(item.description, 'Deluxe Widget')
  assert.equal(item.sub_description, 'Grade A steel')
  assert.equal(item.quantity, 10)
  assert.equal(item.unit, 'pieces')
  assert.equal(item.unit_cost, 2500)
  assert.equal(item.image_url, 'https://cdn.bourxe.com/items/widget.png')
  assert.equal(item.item_id, 'inv-item-778')
  assert.deepEqual(item.custom_data, { serialPrefix: 'DX' })
})

test('po import: empty or invalid imported items list returns existing items unchanged', () => {
  const existing = [
    { ...createEmptyPurchaseOrderItem(0), description: 'Existing Item' },
  ]
  const emptyImportResult = applyPurchaseOrderImport(existing, [])
  assert.deepEqual(emptyImportResult, existing)

  const whitespaceOnlyImport = applyPurchaseOrderImport(existing, [{ description: '   ' }])
  assert.deepEqual(whitespaceOnlyImport, existing)
})
