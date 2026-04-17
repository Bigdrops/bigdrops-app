import test from 'node:test'
import assert from 'node:assert/strict'

import {
  dismissActiveKeyboard,
  getKeyboardViewportState,
  isEditableElement,
  shouldIgnoreGlobalHotkeys,
} from '../../lib/appKeyboard.js'

test('isEditableElement treats text inputs, textareas, and contenteditable regions as editable', () => {
  assert.equal(isEditableElement({ tagName: 'INPUT', type: 'text' }), true)
  assert.equal(isEditableElement({ tagName: 'TEXTAREA' }), true)
  assert.equal(isEditableElement({ isContentEditable: true }), true)
  assert.equal(isEditableElement({ tagName: 'INPUT', type: 'checkbox' }), false)
  assert.equal(isEditableElement({ tagName: 'BUTTON' }), false)
})

test('shouldIgnoreGlobalHotkeys skips shortcuts while typing or composing', () => {
  assert.equal(shouldIgnoreGlobalHotkeys({ target: { tagName: 'INPUT', type: 'text' } }), true)
  assert.equal(shouldIgnoreGlobalHotkeys({ isComposing: true, target: null }), true)
  assert.equal(shouldIgnoreGlobalHotkeys({ defaultPrevented: true, target: null }), true)
  assert.equal(shouldIgnoreGlobalHotkeys({ target: { tagName: 'BUTTON' } }), false)
})

test('dismissActiveKeyboard blurs the active editable element and reports whether it acted', () => {
  let blurred = false
  const documentObject = {
    activeElement: {
      tagName: 'INPUT',
      type: 'text',
      blur() {
        blurred = true
      },
    },
  }

  assert.equal(dismissActiveKeyboard(documentObject), true)
  assert.equal(blurred, true)
  assert.equal(dismissActiveKeyboard({ activeElement: { tagName: 'BUTTON' } }), false)
})

test('getKeyboardViewportState marks the software keyboard open only when an editable field is active and the viewport shrinks', () => {
  const keyboardOpen = getKeyboardViewportState({
    windowObject: { innerHeight: 900 },
    documentObject: { activeElement: { tagName: 'INPUT', type: 'text' }, documentElement: { clientHeight: 900 } },
    visualViewport: { height: 620, offsetTop: 0 },
  })

  assert.equal(keyboardOpen.isOpen, true)
  assert.equal(keyboardOpen.keyboardInset, 280)
  assert.equal(keyboardOpen.viewportHeight, 620)

  const keyboardClosed = getKeyboardViewportState({
    windowObject: { innerHeight: 900 },
    documentObject: { activeElement: { tagName: 'INPUT', type: 'text' }, documentElement: { clientHeight: 900 } },
    visualViewport: { height: 860, offsetTop: 0 },
  })

  assert.equal(keyboardClosed.isOpen, false)
  assert.equal(keyboardClosed.keyboardInset, 40)
})
