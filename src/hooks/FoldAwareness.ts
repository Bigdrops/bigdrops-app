import { useEffect, useState } from 'react'
import {
  getFoldInfo,
  onFoldInfoChanged,
  startFoldAwareness,
  stopFoldAwareness,
  type FoldInfo,
} from '@/lib/native/foldAwareness'

const defaultState: FoldInfo = {
  available: false,
  widthDp: 0,
  heightDp: 0,
  widthClass: 'compact',
  heightClass: 'compact',
  layoutMode: 'mobile',
  isFoldable: false,
  hasSeparatingFold: false,
  isFlat: false,
  isHalfOpened: false,
  isTabletop: false,
  isBookPosture: false,
  orientation: null,
  state: null,
  occlusionType: null,
  foldBounds: null,
}

export function useFoldAwareness() {
  const [info, setInfo] = useState<FoldInfo>(defaultState)

  useEffect(() => {
    let isActive = true
    let removeListener: (() => void) | null = null

    const setup = async () => {
      const initial = await getFoldInfo()
      if (isActive) {
        setInfo(initial)
      }

      await startFoldAwareness()

      const handle = await onFoldInfoChanged((next) => {
        if (!isActive) return
        setInfo(next)
      })

      removeListener = () => {
        void handle?.remove()
      }
    }

    void setup()

    let lastWidth = 0

    const onResize = async () => {
      const currentWidth = window.innerWidth
      if (currentWidth === lastWidth) return
      lastWidth = currentWidth
      const next = await getFoldInfo()
      if (isActive) {
        setInfo(next)
      }
    }

    window.addEventListener('resize', onResize)

    return () => {
      isActive = false
      window.removeEventListener('resize', onResize)
      removeListener?.()
      void stopFoldAwareness()
    }
  }, [])

  return info
}