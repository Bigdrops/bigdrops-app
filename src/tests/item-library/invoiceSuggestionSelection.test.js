import test from 'node:test'
import assert from 'node:assert/strict'

import { getInvoiceSuggestionSelection } from '../../modules/item-library/domain/invoiceSuggestionSelection.js'

test('master item suggestions use the catalog display name and standard price', () => {
  assert.deepEqual(
    getInvoiceSuggestionSelection({
      item_id: 'item-1',
      name: 'Cement Bag',
      matched_text: 'cem',
      match_source: 'catalog',
      standard_price: 9500,
      last_sold_price: 9200,
    }),
    {
      description: 'Cement Bag',
      item_id: 'item-1',
      unit_price: 9500,
    },
  )
})

test('alias suggestions use the matched alias text but still link to the master item', () => {
  assert.deepEqual(
    getInvoiceSuggestionSelection({
      item_id: 'item-2',
      name: '3/4 Marine Board',
      matched_text: 'Marine Ply',
      match_source: 'alias',
      standard_price: 18000,
      last_sold_price: 17500,
    }),
    {
      description: 'Marine Ply',
      item_id: 'item-2',
      unit_price: 18000,
    },
  )
})
