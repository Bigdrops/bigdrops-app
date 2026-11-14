import test from 'node:test'
import assert from 'node:assert/strict'

import { canAnimateThemeTransition } from '../../lib/themeTransition.ts'

// The theme transition is a progressive enhancement: it must never be the
// reason a theme change fails. These assertions pin the three states the
// browser can be in — unsupported, reduced motion, supported.

function withBrowser({ hasStartViewTransition, reducedMotion }) {
  const originalDocument = globalThis.document
  const originalWindow = globalThis.window

  globalThis.document = { startViewTransition: hasStartViewTransition ? () => {} : undefined }
  globalThis.window = {
    matchMedia: (query) => ({
      matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
    }),
  }

  try {
    return canAnimateThemeTransition()
  } finally {
    globalThis.document = originalDocument
    globalThis.window = originalWindow
  }
}

test('browsers without the View Transitions API get a plain theme change', () => {
  assert.equal(withBrowser({ hasStartViewTransition: false, reducedMotion: false }), false)
})

test('reduced motion skips the animation even where it is supported', () => {
  assert.equal(withBrowser({ hasStartViewTransition: true, reducedMotion: true }), false)
})

test('a capable browser animates the theme change', () => {
  assert.equal(withBrowser({ hasStartViewTransition: true, reducedMotion: false }), true)
})
