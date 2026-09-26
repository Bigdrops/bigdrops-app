import test from 'node:test'
import assert from 'node:assert/strict'

import { mapUpdateStatusToSettingsDisplay } from '../../domain/appUpdate/settingsUpdateDisplay.ts'

test('only a resolved up_to_date maps to the current display', () => {
  assert.equal(mapUpdateStatusToSettingsDisplay('up_to_date'), 'up_to_date')
})

test('update states map to their own displays, never to up_to_date', () => {
  assert.equal(mapUpdateStatusToSettingsDisplay('available'), 'available')
  assert.equal(mapUpdateStatusToSettingsDisplay('grace'), 'grace')
  assert.equal(mapUpdateStatusToSettingsDisplay('blocked'), 'blocked')
})

test('unavailable never masquerades as up to date', () => {
  assert.equal(mapUpdateStatusToSettingsDisplay('unavailable'), 'unavailable')
  assert.notEqual(
    mapUpdateStatusToSettingsDisplay('unavailable'),
    'up_to_date',
    'fetch failure must render failure feedback, not green current state',
  )
})
