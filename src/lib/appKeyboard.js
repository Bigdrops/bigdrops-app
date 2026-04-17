const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

export function isEditableElement(element) {
  if (!element || typeof element !== 'object') return false
  if (element.isContentEditable) return true
  if (element.disabled || element.readOnly) return false

  const tagName = String(element.tagName || '').toLowerCase()
  if (tagName === 'textarea') return true
  if (tagName !== 'input') return false

  const inputType = String(element.type || 'text').toLowerCase()
  return !NON_TEXT_INPUT_TYPES.has(inputType)
}

export function shouldIgnoreGlobalHotkeys(event) {
  return Boolean(event?.defaultPrevented || event?.isComposing || isEditableElement(event?.target))
}

export function dismissActiveKeyboard(documentObject = document) {
  const activeElement = documentObject?.activeElement

  if (!isEditableElement(activeElement) || typeof activeElement.blur !== 'function') {
    return false
  }

  activeElement.blur()
  return true
}

export function getKeyboardViewportState({
  windowObject = window,
  documentObject = document,
  visualViewport = windowObject?.visualViewport,
} = {}) {
  const layoutViewportHeight = Math.max(
    Number(windowObject?.innerHeight || 0),
    Number(documentObject?.documentElement?.clientHeight || 0),
  )
  const viewportHeight = Number(visualViewport?.height || layoutViewportHeight)
  const viewportOffsetTop = Number(visualViewport?.offsetTop || 0)
  const keyboardInset = Math.max(0, Math.round(layoutViewportHeight - viewportHeight - viewportOffsetTop))
  const isOpen = isEditableElement(documentObject?.activeElement) && keyboardInset > 120

  return {
    isOpen,
    keyboardInset,
    viewportHeight: Math.round(viewportHeight),
  }
}
