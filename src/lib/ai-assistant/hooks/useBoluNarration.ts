import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  isNarrationCancelCode,
  isNarrationSupported,
  prepareNarrationText,
  selectNarrationEngine,
  splitNarrationChunks,
  type BoluNarrationEngine,
  type BoluNarrationStatus,
} from '@/lib/ai-assistant/bolu-narration'
import {
  getBoluSpeechCapability,
  hasBoluSpeechPlugin,
  onBoluSpeechState,
  speakBoluSpeech,
  stopBoluSpeech,
} from '@/lib/native/boluSpeech'

interface NarrationState {
  messageId: string | null
  status: BoluNarrationStatus
  error: string | null
}

interface NativeSession {
  messageId: string
  chunks: string[]
  index: number
}

const IDLE_STATE: NarrationState = { messageId: null, status: 'idle', error: null }
const COMPLETED_RESET_MS = 1400

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  return window.speechSynthesis ?? null
}

/**
 * useBoluNarration — one device TTS session for the assistant thread.
 *
 * Engine selection:
 * - `native` on Android when the `BoluSpeech` bridge reports a working engine.
 *   Android System WebView does not reliably expose `speechSynthesis`.
 * - `browser` everywhere else that supports the Web Speech synthesis API.
 * - `none` when neither works; the action reports unavailable and chat continues.
 *
 * Guarantees:
 * - Only one response narrates at a time; starting another cancels the first.
 * - Rapid repeated taps do not create duplicate sessions.
 * - Unmounting, closing the workspace or changing conversation stops speech.
 * - Native chunking gives pause and resume: a pause stops the engine and a
 *   resume re-sends the current chunk, so at most one sentence repeats.
 * - Bridge failures and missing voices are reported as states, never thrown.
 */
export function useBoluNarration({ rate }: { rate: number }) {
  const [state, setState] = useState<NarrationState>(IDLE_STATE)
  const [nativeCapable, setNativeCapable] = useState(false)

  const bridgeAvailable = useMemo(() => hasBoluSpeechPlugin(), [])
  const webSpeechAvailable = useMemo(() => isNarrationSupported(), [])

  useEffect(() => {
    if (!bridgeAvailable) return

    let cancelled = false
    void getBoluSpeechCapability().then((capability) => {
      if (!cancelled) setNativeCapable(capability.available)
    })

    return () => {
      cancelled = true
    }
  }, [bridgeAvailable])

  const engine: BoluNarrationEngine = selectNarrationEngine({
    nativeBridgeAvailable: bridgeAvailable,
    nativeCapable,
    webSpeechAvailable,
  })

  const engineRef = useRef(engine)
  engineRef.current = engine

  const stateRef = useRef(state)
  stateRef.current = state

  const rateRef = useRef(rate)
  rateRef.current = rate

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const nativeSessionRef = useRef<NativeSession | null>(null)
  const sessionTokenRef = useRef(0)
  const startingRef = useRef(false)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [])

  const cancelBrowserSpeech = useCallback(() => {
    const synth = getSynth()
    if (!synth) return
    try {
      synth.cancel()
    } catch {
      // A rejected cancel must not break the chat.
    }
  }, [])

  const scheduleIdleReset = useCallback(
    (messageId: string) => {
      clearResetTimer()
      resetTimerRef.current = setTimeout(() => {
        setState((prev) => (prev.messageId === messageId ? IDLE_STATE : prev))
      }, COMPLETED_RESET_MS)
    },
    [clearResetTimer],
  )

  /** Speaks the chunk at the session cursor. Safe to call again on resume. */
  const speakNativeChunk = useCallback(async (token: number) => {
    const session = nativeSessionRef.current
    if (!session) return

    const chunk = session.chunks[session.index]
    if (!chunk) return

    const started = await speakBoluSpeech({
      text: chunk,
      messageId: session.messageId,
      rate: rateRef.current,
    })

    if (token !== sessionTokenRef.current) return
    if (started) return

    nativeSessionRef.current = null
    startingRef.current = false
    setState({
      messageId: session.messageId,
      status: 'error',
      error: 'This device could not read the response aloud.',
    })
  }, [])

  // Native progress drives chunk advance and the final state.
  useEffect(() => {
    let cancelled = false
    let handle: Awaited<ReturnType<typeof onBoluSpeechState>> = null

    if (!bridgeAvailable) return

    void onBoluSpeechState((event) => {
      if (cancelled) return

      const session = nativeSessionRef.current
      if (!session || !event.messageId || event.messageId !== session.messageId) return

      if (event.status === 'completed') {
        if (session.index + 1 < session.chunks.length) {
          session.index += 1
          void speakNativeChunk(sessionTokenRef.current)
          return
        }
        nativeSessionRef.current = null
        startingRef.current = false
        setState({ messageId: session.messageId, status: 'completed', error: null })
        scheduleIdleReset(session.messageId)
        return
      }

      if (event.status === 'error') {
        nativeSessionRef.current = null
        startingRef.current = false
        setState({
          messageId: session.messageId,
          status: 'error',
          error: event.error ?? 'This device could not read the response aloud.',
        })
        return
      }

      if (event.status === 'speaking') {
        setState((prev) =>
          prev.messageId === session.messageId
            ? { ...prev, status: 'speaking', error: null }
            : prev,
        )
      }

      // 'stopped' is ignored here: the hook sets that state itself on stop and
      // the engine also emits it when a pause stops the current chunk.
    }).then((registered) => {
      if (cancelled) {
        void registered?.remove()
        return
      }
      handle = registered
    })

    return () => {
      cancelled = true
      void handle?.remove()
    }
  }, [bridgeAvailable, scheduleIdleReset, speakNativeChunk])

  // Leaving the chat must not leave a voice speaking.
  useEffect(
    () => () => {
      sessionTokenRef.current += 1
      nativeSessionRef.current = null
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      void stopBoluSpeech()
      const synth = getSynth()
      if (!synth) return
      try {
        synth.cancel()
      } catch {
        // ignore
      }
    },
    [],
  )

  const stop = useCallback(() => {
    clearResetTimer()
    sessionTokenRef.current += 1
    nativeSessionRef.current = null
    startingRef.current = false
    utteranceRef.current = null
    void stopBoluSpeech()
    cancelBrowserSpeech()
    setState((prev) =>
      prev.status === 'idle' ? prev : { messageId: prev.messageId, status: 'stopped', error: null },
    )
  }, [cancelBrowserSpeech, clearResetTimer])

  const speak = useCallback(
    (messageId: string, text: string) => {
      const prepared = prepareNarrationText(text)
      if (!prepared) return false

      const currentEngine = engineRef.current
      if (currentEngine === 'none') {
        setState({
          messageId,
          status: 'unavailable',
          error: 'Narration is not available on this device.',
        })
        return false
      }

      clearResetTimer()
      sessionTokenRef.current += 1
      nativeSessionRef.current = null
      utteranceRef.current = null
      cancelBrowserSpeech()
      void stopBoluSpeech()

      if (currentEngine === 'native') {
        const chunks = splitNarrationChunks(prepared)
        if (chunks.length === 0) return false

        nativeSessionRef.current = { messageId, chunks, index: 0 }
        startingRef.current = true
        setState({ messageId, status: 'speaking', error: null })
        const token = sessionTokenRef.current
        void speakNativeChunk(token).finally(() => {
          if (token === sessionTokenRef.current) startingRef.current = false
        })
        return true
      }

      const synth = getSynth()
      if (!synth) {
        setState({
          messageId,
          status: 'unavailable',
          error: 'Narration is not available on this device.',
        })
        return false
      }

      try {
        const utterance = new window.SpeechSynthesisUtterance(prepared)
        utterance.rate = rateRef.current
        utterance.pitch = 1
        utterance.lang =
          (typeof document !== 'undefined' && document.documentElement.lang) ||
          (typeof navigator !== 'undefined' && navigator.language) ||
          'en-US'

        try {
          const voices = synth.getVoices?.() ?? []
          const preferred =
            voices.find((voice) => voice.default) ??
            voices.find((voice) => voice.lang?.startsWith('en')) ??
            voices[0] ??
            null
          if (preferred) utterance.voice = preferred
        } catch {
          // Voice listing is optional; the engine picks a default voice.
        }

        utterance.onend = () => {
          setState((prev) =>
            prev.messageId === messageId ? { messageId, status: 'completed', error: null } : prev,
          )
          scheduleIdleReset(messageId)
        }

        utterance.onerror = (event) => {
          const code = (event as SpeechSynthesisErrorEvent)?.error
          if (isNarrationCancelCode(code)) {
            setState((prev) =>
              prev.messageId === messageId ? { messageId, status: 'stopped', error: null } : prev,
            )
            return
          }
          setState({
            messageId,
            status: 'error',
            error: 'This device could not read the response aloud.',
          })
        }

        utteranceRef.current = utterance
        synth.speak(utterance)
        setState({ messageId, status: 'speaking', error: null })
        return true
      } catch {
        setState({
          messageId,
          status: 'error',
          error: 'This device could not read the response aloud.',
        })
        return false
      }
    },
    [cancelBrowserSpeech, clearResetTimer, scheduleIdleReset, speakNativeChunk],
  )

  const pause = useCallback(() => {
    const current = stateRef.current
    if (current.status !== 'speaking') return

    // The native engine has no in-utterance pause: stop the chunk and keep the
    // cursor. Resume re-sends that chunk.
    if (engineRef.current === 'native') {
      void stopBoluSpeech()
      setState({ ...current, status: 'paused' })
      return
    }

    const synth = getSynth()
    if (!synth) return
    try {
      synth.pause()
    } catch {
      return
    }
    setState({ ...current, status: 'paused' })
  }, [])

  const resume = useCallback(() => {
    const current = stateRef.current
    if (current.status !== 'paused') return

    if (engineRef.current === 'native') {
      if (!nativeSessionRef.current) {
        setState({ ...current, status: 'stopped', error: null })
        return
      }
      setState({ ...current, status: 'speaking', error: null })
      void speakNativeChunk(sessionTokenRef.current)
      return
    }

    const synth = getSynth()
    if (!synth) return
    try {
      synth.resume()
    } catch {
      return
    }
    setState({ ...current, status: 'speaking', error: null })
  }, [speakNativeChunk])

  const toggle = useCallback(
    (messageId: string, text: string) => {
      const current = stateRef.current
      if (startingRef.current) return false
      if (current.messageId === messageId && current.status === 'speaking') {
        pause()
        return false
      }
      if (current.messageId === messageId && current.status === 'paused') {
        resume()
        return false
      }
      return speak(messageId, text)
    },
    [pause, resume, speak],
  )

  return {
    ...state,
    supported: engine !== 'none',
    engine,
    speak,
    pause,
    resume,
    stop,
    toggle,
  }
}
