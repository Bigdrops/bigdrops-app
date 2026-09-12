import test from 'node:test'
import assert from 'node:assert/strict'

import {
  GuidanceEngine,
  resolveEffectiveConnectivity,
  resolveLaunchStatus,
  OFFLINE_TIP_ID,
} from '../../domain/guidance/guidanceEngine.ts'
import { TIP_LIBRARY } from '../../lib/tipContent.ts'

test('selection is deterministic: same context selects the same first tip', () => {
  const first = new GuidanceEngine().selectTip('invoices')
  const second = new GuidanceEngine().selectTip('invoices')
  assert.equal(first?.id, second?.id)
})

test('rotation avoids immediate repetition while alternatives exist', () => {
  const engine = new GuidanceEngine()
  const seen = []
  for (let i = 0; i < 4; i += 1) {
    const tip = engine.selectTip(null)
    assert.ok(tip, 'expected a tip while the library is non-empty')
    assert.ok(!seen.includes(tip.id), `tip ${tip.id} repeated too soon`)
    seen.push(tip.id)
    engine.recordExposure(tip.id)
  }
})

test('history survives loader passes: second pass continues, not restarts', () => {
  const engine = new GuidanceEngine()
  const firstPass = []
  for (let i = 0; i < 3; i += 1) {
    const tip = engine.selectTip('invoices')
    firstPass.push(tip.id)
    engine.recordExposure(tip.id)
  }
  // A loader remount must not clear history — the next selection must
  // continue the rotation rather than restart at the first tip.
  const next = engine.selectTip('invoices')
  assert.ok(!firstPass.includes(next.id))
})

test('dismissed tips stay hidden for the session', () => {
  const engine = new GuidanceEngine()
  const tip = engine.selectTip(null)
  engine.dismiss(tip.id)
  for (let i = 0; i < TIP_LIBRARY.length + 2; i += 1) {
    const next = engine.selectTip(null)
    if (!next) break
    assert.notEqual(next.id, tip.id)
    engine.recordExposure(next.id)
  }
})

test('inactivity prompts are capped per session with cooldown', () => {
  const engine = new GuidanceEngine()
  assert.equal(engine.canPromptInactivity(), true)
  engine.recordInactivityPrompt()
  // Cooldown blocks an immediate second prompt.
  assert.equal(engine.canPromptInactivity(), false)
  engine.recordInactivityPrompt(Date.now() + 11 * 60_000)
  assert.equal(engine.canPromptInactivity(), false, 'session cap is 2')
})

test('launch status is honest per connectivity state', () => {
  assert.equal(
    resolveLaunchStatus({ stage: 'profile', connectivity: 'online' }),
    'Loading your account. This takes only a moment.',
  )
  assert.equal(
    resolveLaunchStatus({ stage: 'workspace', connectivity: 'offline' }),
    'Connect to the internet to continue.',
  )
  assert.equal(
    resolveLaunchStatus({ stage: 'workspace', connectivity: 'reconnecting' }),
    'Connection restored. Finishing your workspace setup.',
  )
  assert.match(
    resolveLaunchStatus({ stage: 'splash', connectivity: 'slow' }),
    /longer than expected/,
  )
})

test('offline tip resolves to the sync-on-reconnect workflow tip', () => {
  const offline = TIP_LIBRARY.find((tip) => tip.id === OFFLINE_TIP_ID)
  assert.ok(offline, 'offline tip must exist in the library')
  assert.match(offline.message, /sync/i)
})

test('effective connectivity separates offline, reconnecting, slow, online', () => {
  const base = { active: true, activeSinceMs: 1_000, reconnectedAtMs: null, nowMs: 2_000 }
  assert.equal(resolveEffectiveConnectivity({ ...base, online: false }), 'offline')
  assert.equal(
    resolveEffectiveConnectivity({ ...base, online: true, reconnectedAtMs: 1_500, nowMs: 2_000 }),
    'reconnecting',
  )
  assert.equal(
    resolveEffectiveConnectivity({ ...base, online: true, reconnectedAtMs: 1_000, nowMs: 9_000 }),
    'online',
    'reconnecting window expires',
  )
  assert.equal(
    resolveEffectiveConnectivity({ ...base, online: true, activeSinceMs: 1_000, nowMs: 20_000 }),
    'slow',
    'elapsed wait transitions without claiming network cause',
  )
  assert.equal(
    resolveEffectiveConnectivity({ ...base, online: true, active: false, nowMs: 99_000 }),
    'online',
    'idle hooks never go slow',
  )
})
