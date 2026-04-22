import test from 'node:test'
import assert from 'node:assert/strict'

import { getInvoiceSuggestionPriceContextText } from '../../modules/item-library/domain/invoiceSuggestionPriceContext.ts'

test('Case A: Client-specific price exists AND differs from global', () => {
  const suggestion = {
    item_id: 'item-1',
    last_price_for_client: 45000,
    last_price_global: 40000,
    last_used_at: '2026-04-18T10:00:00.000Z',
    last_source_document_number: 'INV-101',
  }
  const result = getInvoiceSuggestionPriceContextText(suggestion)
  assert.equal(
    result,
    'This client: ₦45,000\nLast sold: ₦40,000 · INV-101 · Apr 18',
  )
})

test('Case B: Client-specific price exists AND is same as latest global record', () => {
  const suggestion = {
    item_id: 'item-1',
    last_price_for_client: 40000,
    last_price_global: 40000,
    last_used_at: '2026-04-18T10:00:00.000Z',
    last_source_document_number: 'INV-101',
  }
  const result = getInvoiceSuggestionPriceContextText(suggestion)
  assert.equal(
    result,
    'Last sold to this client: ₦40,000 · INV-101 · Apr 18',
  )
})

test('Case C: Only global history exists', () => {
  const suggestion = {
    item_id: 'item-1',
    last_price_for_client: null,
    last_price_global: 38000,
    last_used_at: '2026-04-10T10:00:00.000Z',
    last_source_document_number: 'QUO-050',
  }
  const result = getInvoiceSuggestionPriceContextText(suggestion)
  assert.equal(
    result,
    'Last sold: ₦38,000 · QUO-050 · Apr 10',
  )
})

test('Case D: No history', () => {
  const suggestion = {
    item_id: 'item-1',
    last_price_for_client: null,
    last_price_global: null,
    last_used_at: null,
  }
  const result = getInvoiceSuggestionPriceContextText(suggestion)
  assert.equal(result, null)
})

test('Removes standard_price completely from context strip', () => {
  const suggestion = {
    item_id: 'item-1',
    standard_price: 50000,
    last_price_global: 40000,
    last_used_at: '2026-04-18T10:00:00.000Z',
  }
  const result = getInvoiceSuggestionPriceContextText(suggestion)
  assert.ok(!result?.includes('Standard'), 'Should not contain Standard label')
  assert.ok(!result?.includes('50,000'), 'Should not contain standard price value')
})
