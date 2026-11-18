import test from 'node:test'
import assert from 'node:assert/strict'

import {
  dismissReleaseNotification,
  isReleaseNotificationDismissed,
  isReleaseAcknowledgedLocally,
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
    assert.equal(isReleaseNotificationDismissed(1042, 'web', 'user-b'), false)
    assert.equal(isReleaseNotificationDismissed(1042, 'android', 'user-a'), false)
    assert.equal(isReleaseNotificationDismissed(1043, 'web', 'user-a'), false)
    assert.equal(isReleaseAcknowledgedLocally(1042, 'web'), false)
  })
})
