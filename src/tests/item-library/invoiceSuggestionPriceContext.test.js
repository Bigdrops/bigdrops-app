import test from 'node:test'
import assert from 'node:assert/strict'

import { getInvoiceSuggestionPriceContextText } from '../../modules/item-library/domain/invoiceSuggestionPriceContext.ts'

test('builds a compact invoice price context line from suggestion pricing history', () => {
  assert.equal(
    getInvoiceSuggestionPriceContextText({
      item_id: 'item-1',
      name: 'Marine Board',
      matched_text: 'Marine Board',
      match_source: 'catalog',
      standard_price: 42000,
      last_sold_price: 40000,
      last_used_at: '2026-04-18T10:00:00.000Z',
      last_source_type: 'quotation',
    }),
    'Standard ₦42,000 · Last sold ₦40,000 · Last used in quotation on Apr 18',
  )
})

test('omits missing history fragments cleanly', () => {
  assert.equal(
    getInvoiceSuggestionPriceContextText({
      item_id: 'item-2',
      name: 'Cement',
      matched_text: 'Cement',
      match_source: 'catalog',
      standard_price: 9500,
      last_sold_price: null,
      last_used_at: null,
      last_source_type: 'invoice',
    }),
    'Standard ₦9,500',
  )
})
