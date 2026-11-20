import test from 'node:test'
import assert from 'node:assert/strict'

import {
  dismissReleaseNotification,
  isReleaseNotificationDismissed,
  isReleaseAcknowledgedLocally,
  markReleaseAcknowledgedLocally,
  observeWebRelease,
  observeInstalledVersion,
  MAX_WEB_NOTIFICATION_AGE_MS,
} from '../../lib/appUpdate/releaseAcknowledgementLocalStorage.ts'

function withLocalStorage(run) {
  const values = new Map()
  const previousWindow = globalThis.window
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  }
  try {
    run()
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
}

test('release-notice dismissal persists by release, platform, and account without acknowledgement', () => {
  withLocalStorage(() => {
    assert.equal(dismissReleaseNotification(1042, 'web', 'user-a'), true)
    assert.equal(isReleaseNotificationDismissed(1042, 'web', 'user-a'), true)
    // Anonymous check on the same device also sees dismissal
    assert.equal(isReleaseNotificationDismissed(1042, 'web', null), true)
    // Other platform or release not dismissed
    assert.equal(isReleaseNotificationDismissed(1042, 'android', 'user-a'), false)
    assert.equal(isReleaseNotificationDismissed(1043, 'web', 'user-a'), false)
    assert.equal(isReleaseAcknowledgedLocally(1042, 'web'), false)
  })
})

test('dismissal as anonymous persists when later checked as authenticated user on same device', () => {
  withLocalStorage(() => {
    assert.equal(dismissReleaseNotification(1029, 'web', null), true)
    assert.equal(isReleaseNotificationDismissed(1029, 'web', null), true)
    assert.equal(isReleaseNotificationDismissed(1029, 'web', 'user-logged-in'), true)
  })
})

test('local acknowledgement persists and does not leak across platforms', () => {
  withLocalStorage(() => {
    assert.equal(isReleaseAcknowledgedLocally(1029, 'web'), false)
    const res = markReleaseAcknowledgedLocally(1029, 'web')
    assert.equal(res.persisted, true)
    assert.equal(isReleaseAcknowledgedLocally(1029, 'web'), true)
    assert.equal(isReleaseAcknowledgedLocally(1029, 'android'), false)
  })
})

test('observeWebRelease establishes quiet baseline on first visit with stale release (> 7 days)', () => {
  withLocalStorage(() => {
    const now = 1732000000000 // reference timestamp
    const eightDaysAgo = now - (8 * 24 * 60 * 60 * 1000)

    // First visit: release is 8 days old -> quiet baseline
    const obs = observeWebRelease({
      versionCode: 1029,
      publicationMs: eightDaysAgo,
      nowMs: now,
    })
    assert.equal(obs.eligible, false)
    assert.equal(obs.kind, 'quiet-baseline')

    // Same version on subsequent visit or reload: stays quiet
    const obs2 = observeWebRelease({
      versionCode: 1029,
      publicationMs: eightDaysAgo,
      nowMs: now + 1000,
    })
    assert.equal(obs2.eligible, false)
    assert.equal(obs2.kind, 'unchanged')
  })
})

test('observeWebRelease announces fresh release on first visit (<= 7 days)', () => {
  withLocalStorage(() => {
    const now = 1732000000000
    const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000)

    const obs = observeWebRelease({
      versionCode: 1030,
      publicationMs: twoDaysAgo,
      nowMs: now,
    })
    assert.equal(obs.eligible, true)
    assert.equal(obs.kind, 'fresh-release')
  })
})

test('observeWebRelease announces newer version when published within 7 days', () => {
  withLocalStorage(() => {
    const now = 1732000000000
    const eightDaysAgo = now - (8 * 24 * 60 * 60 * 1000)
    const oneDayAgo = now - (1 * 24 * 60 * 60 * 1000)

    // Establish quiet baseline on 1029
    observeWebRelease({
      versionCode: 1029,
      publicationMs: eightDaysAgo,
      nowMs: now,
    })

    // Newer version 1030 arrives, published 1 day ago -> eligible!
    const obs = observeWebRelease({
      versionCode: 1030,
      publicationMs: oneDayAgo,
      nowMs: now,
    })
    assert.equal(obs.eligible, true)
    assert.equal(obs.kind, 'new-version')
  })
})

test('observeInstalledVersion on Android remains intact and tracks upgrades', () => {
  withLocalStorage(() => {
    // First install baseline
    const first = observeInstalledVersion(1028)
    assert.equal(first?.kind, 'first-install')
    assert.equal(first?.transition.lastInstalledVersionCode, 1028)

    // Same version -> unchanged
    const same = observeInstalledVersion(1028)
    assert.equal(same?.kind, 'unchanged')

    // Upgrade to 1029 -> upgrade-pending
    const upgrade = observeInstalledVersion(1029)
    assert.equal(upgrade?.kind, 'upgrade-pending')
    assert.equal(upgrade?.transition.pendingUpgradeFromVersionCode, 1028)
    assert.equal(upgrade?.transition.pendingUpgradeVersionCode, 1029)
  })
})
