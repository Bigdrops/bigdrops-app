import { useEffect, useRef } from 'react'
import { uiSound } from '@/lib/uiSoundEvent'

/** Plays overlay.open / overlay.close whenever the controlled `open` flips. */
export function useUiSoundOpenClose(open: boolean | undefined): void {
  const previous = useRef(open)
  useEffect(() => {
    if (previous.current === open) return
    previous.current = open
    uiSound(open ? 'overlay.open' : 'overlay.close')
  }, [open])
}
