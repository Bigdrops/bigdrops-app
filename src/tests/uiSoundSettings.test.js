import test from 'node:test'
import assert from 'node:assert/strict'

import { getUiSoundSettings, setUiSoundSettings, useUiSoundSettings } from '../lib/uiSoundSettings.ts'

test('uiSoundSettings defaults to enabled at 35% volume', () => {
  const current = getUiSoundSettings()
  assert.equal(current.enabled, true)
  assert.equal(current.volume, 0.35)
})

test('uiSoundSettings clamps volume into 0..1', () => {
  setUiSoundSettings({ enabled: true, volume: 5 })
  assert.equal(getUiSoundSettings().volume, 1)
  setUiSoundSettings({ enabled: true, volume: -3 })
  assert.equal(getUiSoundSettings().volume, 0)
  setUiSoundSettings({ enabled: true, volume: NaN })
  assert.equal(getUiSoundSettings().volume, 0.35)
})

test('uiSoundSettings round-trips enabled flag and persists in-memory value', () => {
  setUiSoundSettings({ enabled: false, volume: 0.6 })
  assert.equal(getUiSoundSettings().enabled, false)
  assert.equal(getUiSoundSettings().volume, 0.6)
  setUiSoundSettings({ enabled: true, volume: 0.35 })
})

test('useUiSoundSettings is exported as a hook function', () => {
  assert.equal(typeof useUiSoundSettings, 'function')
})
