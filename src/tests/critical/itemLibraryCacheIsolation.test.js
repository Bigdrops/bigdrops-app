import test from 'node:test'
import assert from 'node:assert/strict'

import { itemLibraryCacheKey, clientListCacheKey } from '../../lib/cache/listCache.ts'

test('item library cache key is namespaced per tenant schema', () => {
  assert.equal(
    itemLibraryCacheKey('entity_bigdrops-main_main'),
    'bd:list:item-library:v1:entity_bigdrops-main_main',
  )
  assert.equal(
    itemLibraryCacheKey('entity_bigdrops-main_anthropology'),
    'bd:list:item-library:v1:entity_bigdrops-main_anthropology',
  )
})

test('different entities never share an item library cache entry', () => {
  assert.notEqual(
    itemLibraryCacheKey('entity_bigdrops-main_main'),
    itemLibraryCacheKey('entity_bigdrops-main_anthropology'),
  )
})

test('missing tenant context yields no key (fail-closed, no global fallback)', () => {
  assert.equal(itemLibraryCacheKey(null), null)
  assert.equal(itemLibraryCacheKey(undefined), null)
  assert.equal(itemLibraryCacheKey(''), null)
})

test('legacy global key is gone: no unscoped item library key exists', () => {
  // The retired "bd:item-library:summary:v1" key served one entity's rows
  // under every other entity. Keys must always carry the schema.
  const key = itemLibraryCacheKey('entity_bigdrops-main_main')
  assert.ok(key && key.includes('entity_bigdrops-main_main'))
  assert.notEqual(key, 'bd:item-library:summary:v1')
})

test('client list key pattern unchanged (precedent for entity scoping)', () => {
  assert.equal(clientListCacheKey('entity_ws_a'), 'bd:list:clients:v1:entity_ws_a')
})
