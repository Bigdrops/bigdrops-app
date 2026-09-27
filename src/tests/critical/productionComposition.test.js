import test from 'node:test'
import assert from 'node:assert/strict'

import { classifyPolicyFetch } from '../../domain/appUpdate/policyFetchResult.ts'
import { resolveUpdateState } from '../../domain/appUpdate/updateStateMachine.ts'

// Raw snake_case row exactly as the RPC returns it for the verified target.
const LIVE_1014_ROW = {
  version_code: 1014,
  version_name: '1.0.14',
  mandatory: true,
  effective_at: '2026-09-27T17:36:39.821Z',
  apk_asset_prefix: 'BIGDROPS-test-release-',
  web_release_url: 'https://github.com/Bigdrops/bigdrops-app/releases/tag/test-release-run14',
  release_notes: null,
  server_now: '2026-09-28T12:00:00.000Z',
}

const DAY_MS = 24 * 60 * 60 * 1000
const GRACE_NOW = new Date('2026-09-28T12:00:00.000Z').getTime()

// Mirrors the production hook composition: the classified result's rawRow
// feeds the state machine, and discovery eligibility follows the
// production gating rule (a non-null resolved policy).
function productionCheck(rawRow, installedVersionCode, nowMs, persisted = null) {
  const fetched = classifyPolicyFetch([rawRow], null)
  const state = resolveUpdateState({
    policyAvailable: fetched.available,
    installedVersionCode,
    rawPolicy: fetched.rawRow,
    persisted,
    nowMs,
  })
  return { fetched, state, discoveryEligible: state.policy !== null }
}

test('production composition: 1013 vs approved 1014 resolves grace with discovery eligible', () => {
  const { fetched, state, discoveryEligible } = productionCheck(LIVE_1014_ROW, 1013, GRACE_NOW)
  assert.equal(fetched.diagnosis, 'valid')
  assert.equal(state.status, 'grace')
  assert.ok(state.policy, 'resolved policy must be non-null')
  assert.equal(state.policy.versionCode, 1014)
  assert.equal(discoveryEligible, true)
})

test('old broken composition (validated object as rawPolicy) resolves unavailable', () => {
  // Locks the former production bug shape: feeding the validated
  // camelCase policy where the raw snake_case row belongs rejects.
  const fetched = classifyPolicyFetch([LIVE_1014_ROW], null)
  const state = resolveUpdateState({
    policyAvailable: fetched.available,
    installedVersionCode: 1013,
    rawPolicy: fetched.policy,
    persisted: null,
    nowMs: GRACE_NOW,
  })
  assert.equal(state.status, 'unavailable')
  assert.equal(state.policy, null)
})

test('production composition: 1014 installed vs 1014 target stays up_to_date', () => {
  const { state, discoveryEligible } = productionCheck(LIVE_1014_ROW, 1014, GRACE_NOW)
  assert.equal(state.status, 'up_to_date')
  assert.equal(state.clearPersistedState, true)
  assert.equal(discoveryEligible, true)
})

test('production composition: newer installed stays up_to_date', () => {
  const { state } = productionCheck(LIVE_1014_ROW, 1015, GRACE_NOW)
  assert.equal(state.status, 'up_to_date')
})

test('production composition: malformed raw row stays rejected', () => {
  const fetched = classifyPolicyFetch([{ ...LIVE_1014_ROW, version_code: 'oops' }], null)
  assert.equal(fetched.diagnosis, 'malformed')
  const state = resolveUpdateState({
    policyAvailable: fetched.available,
    installedVersionCode: 1013,
    rawPolicy: fetched.rawRow,
    persisted: null,
    nowMs: GRACE_NOW,
  })
  assert.equal(state.status, 'unavailable')
  assert.equal(state.policy, null)
})

test('production composition: expired mandatory grace resolves blocked', () => {
  const oldRow = { ...LIVE_1014_ROW, effective_at: '2026-09-20T12:00:00.000Z' }
  const anchoredAt = new Date('2026-09-20T12:00:00.000Z').getTime()
  const { state } = productionCheck(
    oldRow,
    1013,
    GRACE_NOW,
    { versionCode: 1014, anchoredAtMs: anchoredAt, deviceClockSkewMs: 0 },
  )
  assert.equal(state.status, 'blocked')
})
