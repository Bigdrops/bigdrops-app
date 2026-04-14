import { useEffect } from 'react'
import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { isAndroidNative } from '@/lib/native/capacitor'

function getPreferredSystemBarStyle() {
  if (typeof document === 'undefined') return SystemBarsStyle.Default

  const isDark =
    document.documentElement.classList.contains('dark') ||
    window.matchMedia?.('(prefers-color-scheme: dark)').matches

  return isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light
}

export default function AndroidSystemBars() {
  useEffect(() => {
    if (!isAndroidNative()) return undefined

    let active = true

    const apply = async () => {
      try {
        await SystemBars.setStyle({
          style: getPreferredSystemBarStyle(),
        })
      } catch (error) {
        console.warn('Failed to apply Android system bar style', error)
      }
    }

    void apply()

    const observer = new MutationObserver(() => {
      if (!active) return
      void apply()
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (!active) return
      void apply()
    }

    media?.addEventListener?.('change', handleChange)

    return () => {
      active = false
      observer.disconnect()
      media?.removeEventListener?.('change', handleChange)
    }
  }, [])

  return null
}