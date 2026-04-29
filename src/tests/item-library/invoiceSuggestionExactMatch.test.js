import test from 'node:test'
import assert from 'node:assert/strict'

import { findExactItemSuggestionMatch } from '../../modules/item-library/domain/invoiceSuggestionSelection.ts'

test('returns a deterministic exact catalog match for paused typed descriptions', () => {
  const match = findExactItemSuggestionMatch('  Bread  ', [
    {
      item_id: 'item-1',
      name: 'Bread',
      matched_text: 'Bread',
      match_source: 'catalog',
      standard_price: 800,
    },
    {
      item_id: 'item-2',
      name: 'Bread Knife',
      matched_text: 'Bread Knife',
      match_source: 'catalog',
      standard_price: 1200,
    },
  ])

  assert.equal(match?.item_id, 'item-1')
})

test('returns a deterministic exact alias match when only one item matches exactly', () => {
  const match = findExactItemSuggestionMatch('marine ply', [
    {
      item_id: 'item-1',
      name: '3/4 Marine Board',
      matched_text: 'Marine Ply',
      match_source: 'alias',
      standard_price: 18000,
    },
  ])

  assert.equal(match?.item_id, 'item-1')
})

test('refuses ambiguous exact matches across different item ids', () => {
  const match = findExactItemSuggestionMatch('Bread', [
    {
      item_id: 'item-1',
      name: 'Bread',
      matched_text: 'Bread',
      match_source: 'catalog',
      standard_price: 800,
    },
    {
      item_id: 'item-2',
      name: 'Bread',
      matched_text: 'Bread',
      match_source: 'catalog',
      standard_price: 900,
    },
  ])

  assert.equal(match, null)
})

test('refuses fuzzy and too-short matches', () => {
  assert.equal(
    findExactItemSuggestionMatch('bre', [
      {
        item_id: 'item-1',
        name: 'Bread',
        matched_text: 'Bread',
        match_source: 'catalog',
        standard_price: 800,
      },
    ]),
    null,
  )

  assert.equal(
    findExactItemSuggestionMatch('b', [
      {
        item_id: 'item-1',
        name: 'Bread',
        matched_text: 'Bread',
        match_source: 'catalog',
        standard_price: 800,
      },
    ]),
    null,
  )
})
