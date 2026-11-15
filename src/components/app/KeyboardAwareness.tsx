import { useEffect } from 'react'
import { getKeyboardViewportState } from '@/lib/appKeyboard'

function syncKeyboardState() {
  const root = document.documentElement
  const { isOpen, keyboardInset } = getKeyboardViewportState()

  root.dataset.keyboardOpen = String(isOpen)
  root.style.setProperty('--app-keyboard-inset', `${keyboardInset}px`)
}

export default function KeyboardAwareness() {
  useEffect(() => {
    syncKeyboardState()

    const visualViewport = window.visualViewport
    let debounceTimer: ReturnType<typeof setTimeout> | undefined

    function onViewportChange() {
      if (debounceTimer !== undefined) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(syncKeyboardState, 30)
    }

    visualViewport?.addEventListener('resize', onViewportChange)
    window.addEventListener('focusin', onViewportChange)
    window.addEventListener('focusout', onViewportChange)

    return () => {
      if (debounceTimer !== undefined) clearTimeout(debounceTimer)
      visualViewport?.removeEventListener('resize', onViewportChange)
      window.removeEventListener('focusin', onViewportChange)
      window.removeEventListener('focusout', onViewportChange)
    }
  }, [])

  return null
}
