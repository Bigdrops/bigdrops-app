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
    let rafId = 0
    const visualViewport = window.visualViewport

    const scheduleSync = () => {
      window.cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(syncKeyboardState)
    }

    scheduleSync()

    window.addEventListener('resize', scheduleSync)
    document.addEventListener('focusin', scheduleSync)
    document.addEventListener('focusout', scheduleSync)
    visualViewport?.addEventListener('resize', scheduleSync)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', scheduleSync)
      document.removeEventListener('focusin', scheduleSync)
      document.removeEventListener('focusout', scheduleSync)
      visualViewport?.removeEventListener('resize', scheduleSync)
    }
  }, [])

  return null
}
