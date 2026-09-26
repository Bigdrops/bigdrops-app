import test from 'node:test'
import assert from 'node:assert/strict'

import {
  GRACE_PERIOD_MS,
  MIN_POLICY_FETCH_INTERVAL_MS,
  compareVersionCodes,
  parseVersionCode,
  parseVersionNameBuild,
  validateReleasePolicy,
  describeGraceRemaining,
  resolveUpdateState,
} from '../../domain/appUpdate/updateStateMachine.ts'

const VALID_POLICY = {
  version_code: 1042,
  version_name: '1.0.42',
  mandatory: true,
  effective_at: '2026-09-14T10:00:00.000Z',
  apk_asset_prefix: 'BIGDROPS-test-release-',
  web_release_url: 'https://github.com/Bigdrops/bigdrops-app/releases',
  release_notes: null,
}

const DAY_MS = 24 * 60 * 60 * 1000

function mandatoryPolicy(overrides = {}) {
  return { ...VALID_POLICY, ...overrides }
}

test('versionCode comparison is numeric and deterministic, not lexicographic', () => {
  assert.equal(compareVersionCodes(2, 10), -1, '2 must be older than 10')
  assert.equal(compareVersionCodes(1042, 1042), 0)
  assert.equal(compareVersionCodes(1000, 1), 1)
  assert.equal(compareVersionCodes(0, 1), -1)
})

test('parseVersionCode rejects malformed values', () => {
  assert.equal(parseVersionCode('42'), 42)
  assert.equal(parseVersionCode(42.0), 42)
  assert.equal(parseVersionCode(0), null)
  assert.equal(parseVersionCode(-3), null)
  assert.equal(parseVersionCode('abc'), null)
  assert.equal(parseVersionCode('12.5'), null)
  assert.equal(parseVersionCode(null), null)
})

test('parseVersionNameBuild extracts the workflow run-number build segment', () => {
  assert.equal(parseVersionNameBuild('1.0.42'), 42)
  assert.equal(parseVersionNameBuild('1.0'), null)
  assert.equal(parseVersionNameBuild('beta'), null)
  assert.equal(parseVersionNameBuild(null), null)
})

test('validateReleasePolicy rejects malformed or incomplete mandatory metadata', () => {
  assert.equal(validateReleasePolicy(null), null)
  assert.equal(validateReleasePolicy('nonsense'), null)
  assert.equal(validateReleasePolicy([]), null)
  assert.equal(validateReleasePolicy({ ...VALID_POLICY, version_code: null }), null)
  assert.equal(validateReleasePolicy({ ...VALID_POLICY, version_code: 'abc' }), null)
  assert.equal(validateReleasePolicy({ ...VALID_POLICY, mandatory: 'yes' }), null)
  assert.equal(validateReleasePolicy({ ...VALID_POLICY, apk_asset_prefix: '' }), null)
  assert.equal(
    validateReleasePolicy({ ...VALID_POLICY, web_release_url: 'http://insecure.example' }),
    null,
    'non-https web URL must be rejected',
  )
  assert.equal(
    validateReleasePolicy({ ...VALID_POLICY, effective_at: 'not-a-date' }),
    null,
    'unparseable effective_at must be rejected',
  )
  assert.ok(validateReleasePolicy(mandatoryPolicy()), 'valid policy passes')
})

test('optional newer release is available and clears stale persisted state', () => {
  const result = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1040,
    rawPolicy: { ...VALID_POLICY, mandatory: false },
    persisted: { versionCode: 1039, anchoredAtMs: 0, deviceClockSkewMs: 0 },
    nowMs: 1_000,
  })
  assert.equal(result.status, 'available')
  assert.equal(result.clearPersistedState, true)
})

test('mandatory update within grace keeps the app usable', () => {
  const effectiveAt = Date.parse('2026-09-14T10:00:00.000Z')
  const result = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1040,
    rawPolicy: mandatoryPolicy(),
    persisted: null,
    nowMs: effectiveAt + 2 * DAY_MS,
  })
  assert.equal(result.status, 'grace')
  assert.equal(result.graceDeadlineMs, effectiveAt + GRACE_PERIOD_MS)
  assert.equal(result.clearPersistedState, false)
})

test('mandatory update blocks after the 3-day deadline', () => {
  const effectiveAt = Date.parse('2026-09-14T10:00:00.000Z')
  const result = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1040,
    rawPolicy: mandatoryPolicy(),
    persisted: null,
    nowMs: effectiveAt + GRACE_PERIOD_MS + 1,
  })
  assert.equal(result.status, 'blocked')
})

test('repeated checks for the same target never reset the countdown', () => {
  const effectiveAt = Date.parse('2026-09-14T10:00:00.000Z')
  const firstSeen = effectiveAt + DAY_MS

  const first = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1040,
    rawPolicy: mandatoryPolicy(),
    persisted: null,
    nowMs: firstSeen,
  })
  // The anchor is recorded locally even when effective_at is present, so
  // enforcement survives later policy edits or outages.
  assert.ok(first.graceAnchorToPersist, 'first establishment must persist the anchor')
  assert.equal(first.graceAnchorToPersist.anchoredAtMs, effectiveAt)

  const later = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1040,
    rawPolicy: mandatoryPolicy(),
    persisted: { versionCode: 1042, anchoredAtMs: effectiveAt, deviceClockSkewMs: 0 },
    nowMs: effectiveAt + 2 * DAY_MS,
  })
  assert.equal(later.status, 'grace')
  assert.equal(later.graceDeadlineMs, effectiveAt + GRACE_PERIOD_MS)
})

test('first-seen anchor is persisted when effective_at is absent', () => {
  const nowMs = 1_768_000_000_000
  const result = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1040,
    rawPolicy: mandatoryPolicy({ effective_at: null }),
    persisted: null,
    nowMs,
  })
  assert.equal(result.status, 'grace')
  assert.deepEqual(result.graceAnchorToPersist, {
    versionCode: 1042,
    anchoredAtMs: nowMs,
    deviceClockSkewMs: 0,
  })
  assert.equal(result.graceDeadlineMs, nowMs + GRACE_PERIOD_MS)
})

test('a newer mandatory target supersedes the stored anchor', () => {
  const result = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1040,
    rawPolicy: mandatoryPolicy({ version_code: 1050 }),
    persisted: { versionCode: 1042, anchoredAtMs: 100, deviceClockSkewMs: 0 },
    nowMs: 5_000,
  })
  assert.ok(result.graceAnchorToPersist, 'new target must re-anchor')
  assert.equal(result.graceAnchorToPersist.versionCode, 1050)
  assert.equal(result.status, 'grace')
})

test('a re-anchored effective_at extends but never shortens the deadline', () => {
  const laterEffective = Date.parse('2026-09-20T10:00:00.000Z')
  const earlierEffective = Date.parse('2026-09-10T10:00:00.000Z')

  const extended = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1040,
    rawPolicy: mandatoryPolicy({ effective_at: new Date(laterEffective).toISOString() }),
    persisted: { versionCode: 1042, anchoredAtMs: earlierEffective, deviceClockSkewMs: 0 },
    nowMs: laterEffective,
  })
  assert.equal(extended.graceDeadlineMs, laterEffective + GRACE_PERIOD_MS, 'extension applies')

  const notShortened = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1040,
    rawPolicy: mandatoryPolicy({ effective_at: new Date(earlierEffective).toISOString() }),
    persisted: { versionCode: 1042, anchoredAtMs: laterEffective, deviceClockSkewMs: 0 },
    nowMs: laterEffective,
  })
  assert.equal(
    notShortened.graceDeadlineMs,
    laterEffective + GRACE_PERIOD_MS,
    'existing anchor is preserved',
  )
})

test('installing the target version clears the persisted gate state', () => {
  const result = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1042,
    rawPolicy: mandatoryPolicy(),
    persisted: { versionCode: 1042, anchoredAtMs: Date.now(), deviceClockSkewMs: 0 },
    nowMs: Date.now(),
  })
  assert.equal(result.status, 'up_to_date')
  assert.equal(result.clearPersistedState, true)
})

test('policy outage cannot brick a valid install', () => {
  const result = resolveUpdateState({
    policyAvailable: false,
    installedVersionCode: 1040,
    rawPolicy: null,
    persisted: null,
    nowMs: Date.now(),
  })
  assert.equal(result.status, 'unavailable')
  assert.equal(result.graceDeadlineMs, null)
})

test('policy outage keeps enforcing an expired persisted deadline', () => {
  const anchoredAt = Date.now() - 5 * DAY_MS
  const result = resolveUpdateState({
    policyAvailable: false,
    installedVersionCode: 1040,
    rawPolicy: null,
    persisted: { versionCode: 1042, anchoredAtMs: anchoredAt, deviceClockSkewMs: 0 },
    nowMs: Date.now(),
  })
  assert.equal(result.status, 'blocked', 'expired local state keeps blocking')
})

test('policy outage during grace keeps the app usable on local state', () => {
  const anchoredAt = Date.now() - DAY_MS
  const result = resolveUpdateState({
    policyAvailable: false,
    installedVersionCode: 1040,
    rawPolicy: null,
    persisted: { versionCode: 1042, anchoredAtMs: anchoredAt, deviceClockSkewMs: 0 },
    nowMs: Date.now(),
  })
  assert.equal(result.status, 'grace')
})

test('malformed policy is reported unavailable, never as a valid update', () => {
  const result = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1040,
    rawPolicy: { version_code: 'oops' },
    persisted: null,
    nowMs: Date.now(),
  })
  assert.equal(result.status, 'unavailable')
  assert.equal(result.policy, null)
})

test('empty policy row means genuinely no update', () => {
  const result = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1040,
    rawPolicy: null,
    persisted: null,
    nowMs: Date.now(),
  })
  assert.equal(result.status, 'up_to_date')
})

test('unknown installed version never blocks (fail-safe)', () => {
  const result = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: null,
    rawPolicy: mandatoryPolicy(),
    persisted: null,
    nowMs: Date.now(),
  })
  assert.equal(result.status, 'unavailable')
})

test('grace remaining description floors and reports expiry', () => {
  const deadline = 1_000_000
  const twoDaysLeft = describeGraceRemaining(deadline, deadline - 2 * DAY_MS - 90 * 60 * 1000)
  assert.equal(twoDaysLeft.expired, false)
  assert.equal(twoDaysLeft.days, 2)
  assert.equal(twoDaysLeft.hours, 1, '90 minutes floors to 1 hour, not 2')
  assert.equal(twoDaysLeft.minutes, 30)

  const expired = describeGraceRemaining(deadline, deadline + 1)
  assert.equal(expired.expired, true)
})

test('check throttle constant avoids resume fetch loops', () => {
  assert.ok(MIN_POLICY_FETCH_INTERVAL_MS >= 60 * 60 * 1000)
})

test('installed 1009 against approved 1007 resolves up_to_date (controlled promotion)', () => {
  const result = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1009,
    rawPolicy: {
      version_code: 1007,
      version_name: '1.0.7',
      mandatory: true,
      effective_at: '2026-09-17T12:50:04.310Z',
      apk_asset_prefix: 'BIGDROPS-test-release-',
      web_release_url: 'https://github.com/Bigdrops/bigdrops-app/releases/tag/test-release-20260917-02',
      release_notes: null,
    },
    persisted: null,
    nowMs: Date.now(),
  })
  assert.equal(result.status, 'up_to_date', 'a newer GitHub build never overrides the approved target')
  assert.equal(result.clearPersistedState, true)
})

test('future promotion to 1010 offers the update to installed 1009 without code change', () => {
  const now = Date.now()
  const result = resolveUpdateState({
    policyAvailable: true,
    installedVersionCode: 1009,
    rawPolicy: {
      version_code: 1010,
      version_name: '1.0.10',
      mandatory: true,
      effective_at: new Date(now).toISOString(),
      apk_asset_prefix: 'BIGDROPS-test-release-',
      web_release_url: 'https://github.com/Bigdrops/bigdrops-app/releases/tag/test-release-run10',
      release_notes: null,
    },
    persisted: null,
    nowMs: now,
  })
  assert.equal(result.status, 'grace', 'approved newer mandatory target enters grace')
  assert.equal(result.policy?.versionCode, 1010)
  assert.ok(result.graceAnchorToPersist, 'first sighting records a grace anchor')
})
