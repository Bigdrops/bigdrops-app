import { useEffect, useState } from 'react'

import {
  isNarrationSupported,
  selectNarrationEngine,
  type BoluNarrationEngine,
} from '@/lib/ai-assistant/bolu-narration'
import {
  getBoluSpeechCapability,
  hasBoluSpeechPlugin,
} from '@/lib/native/boluSpeech'

/**
 * useBoluNarrationSupport — resolves the narration engine for UI that is not
 * the thread itself (the settings card and disabled-state hints).
 *
 * It starts from the browser capability so desktop behaves immediately, then
 * upgrades to `native` when the Android bridge reports a working engine.
 */
export function useBoluNarrationSupport(): {
  supported: boolean
  engine: BoluNarrationEngine
  resolving: boolean
} {
  const webSpeechAvailable = isNarrationSupported()
  const bridgeAvailable = hasBoluSpeechPlugin()
  const [nativeCapable, setNativeCapable] = useState(false)
  const [resolving, setResolving] = useState(bridgeAvailable)

  useEffect(() => {
    if (!bridgeAvailable) {
      setResolving(false)
      return
    }

    let cancelled = false
    void getBoluSpeechCapability().then((capability) => {
      if (cancelled) return
      setNativeCapable(capability.available)
      setResolving(false)
    })

    return () => {
      cancelled = true
    }
  }, [bridgeAvailable])

  const engine = selectNarrationEngine({
    nativeBridgeAvailable: bridgeAvailable,
    nativeCapable,
    webSpeechAvailable,
  })

  return { supported: engine !== 'none', engine, resolving }
}
