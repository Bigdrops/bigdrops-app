import test from 'node:test'
import assert from 'node:assert/strict'

import {
  settingsCacheKey,
  readSettingsEntry,
  writeSettingsEntry,
  subscribeSettingsEntries,
  isEntryForKey,
  clearSettingsEntries,
} from '../../lib/tenant/settingsCache.ts'

test('cache key is the schema name; null means no context', () => {
  assert.equal(settingsCacheKey('entity_ws_a'), 'entity_ws_a')
  assert.equal(settingsCacheKey(null), null)
  assert.equal(settingsCacheKey(undefined), null)
  assert.equal(settingsCacheKey(''), null)
})

test('entries never cross entity boundaries', () => {
  clearSettingsEntries()
  writeSettingsEntry('entity_ws_a', { company_name: 'A' })
  writeSettingsEntry('entity_ws_b', { company_name: 'B' })
  assert.deepEqual(readSettingsEntry('entity_ws_a'), { company_name: 'A' })
  assert.deepEqual(readSettingsEntry('entity_ws_b'), { company_name: 'B' })
  // Overwriting B must not touch A.
  writeSettingsEntry('entity_ws_b', { company_name: 'B2' })
  assert.deepEqual(readSettingsEntry('entity_ws_a'), { company_name: 'A' })
})

test('null key never reads or writes', () => {
  clearSettingsEntries()
  writeSettingsEntry('entity_ws_a', { company_name: 'A' })
  writeSettingsEntry(null, { company_name: 'X' })
  assert.equal(readSettingsEntry(null), undefined)
  assert.deepEqual(readSettingsEntry('entity_ws_a'), { company_name: 'A' })
})

test('unknown key starts empty (fail-closed, no fallback)', () => {
  clearSettingsEntries()
  writeSettingsEntry('entity_ws_a', { company_name: 'A' })
  assert.equal(readSettingsEntry('entity_ws_b'), undefined)
})

test('broadcasts carry their key and match only the active tenant', () => {
  clearSettingsEntries()
  const seen = []
  const unsubscribe = subscribeSettingsEntries((entry) => seen.push(entry))
  writeSettingsEntry('entity_ws_a', { company_name: 'A' })
  assert.equal(seen.length, 1)
  assert.equal(isEntryForKey(seen[0], 'entity_ws_a'), true)
  assert.equal(isEntryForKey(seen[0], 'entity_ws_b'), false)
  assert.equal(isEntryForKey(seen[0], null), false)
  unsubscribe()
  writeSettingsEntry('entity_ws_b', { company_name: 'B' })
  assert.equal(seen.length, 1)
})
