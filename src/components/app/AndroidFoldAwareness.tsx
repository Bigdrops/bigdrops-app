import { useEffect } from 'react'
import { isAndroidNative } from '@/lib/native/capacitor'
import { useFoldAwareness } from '@/hooks/useFoldAwareness'

export default function AndroidFoldAwareness() {
  const info = useFoldAwareness()

  useEffect(() => {
    if (!isAndroidNative()) return

    const root = document.documentElement

    root.dataset.layoutMode = info.layoutMode
    root.dataset.widthClass = info.widthClass
    root.dataset.heightClass = info.heightClass
    root.dataset.foldable = String(info.isFoldable)
    root.dataset.separatingFold = String(info.hasSeparatingFold)
    root.dataset.tabletop = String(info.isTabletop)
    root.dataset.bookPosture = String(info.isBookPosture)
    root.dataset.foldOrientation = info.orientation ?? ''
    root.dataset.foldState = info.state ?? ''

    if (info.foldBounds) {
      root.style.setProperty('--fold-left', `${info.foldBounds.left}px`)
      root.style.setProperty('--fold-top', `${info.foldBounds.top}px`)
      root.style.setProperty('--fold-right', `${info.foldBounds.right}px`)
      root.style.setProperty('--fold-bottom', `${info.foldBounds.bottom}px`)
      root.style.setProperty('--fold-width', `${info.foldBounds.width}px`)
      root.style.setProperty('--fold-height', `${info.foldBounds.height}px`)
    } else {
      root.style.removeProperty('--fold-left')
      root.style.removeProperty('--fold-top')
      root.style.removeProperty('--fold-right')
      root.style.removeProperty('--fold-bottom')
      root.style.removeProperty('--fold-width')
      root.style.removeProperty('--fold-height')
    }
  }, [info])

  return null
}