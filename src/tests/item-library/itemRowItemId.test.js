import test from 'node:test'
import assert from 'node:assert/strict'

import { toDbItem } from '../../domain/invoice/factories.ts'
import { mapDbInvoiceItem } from '../../domain/invoice/normalize.ts'

test('invoice row mappers preserve item_id through db normalization', () => {
  const input = {
    id: 'row-1',
    invoice_id: 'inv-1',
    item_id: 'item-123',
    description: 'Cable tray',
    quantity: 2,
    unit_price: 1500,
    custom_data: '{}',
    row_type: 'standard',
  }

  const mapped = mapDbInvoiceItem(input)
  const dbRow = toDbItem(mapped, 'inv-1', 0)

  assert.equal(mapped.item_id, 'item-123')
  assert.equal(dbRow.item_id, 'item-123')
})
