import { useEffect, useRef } from 'react'

import {
  shouldPulseResponseComplete,
  shouldPulseResponseStart,
  triggerBoluHaptic,
} from '@/lib/ai-assistant/bolu-haptics'
import type { BoluInteractionPreferences } from '@/lib/ai-assistant/bolu-preferences'
import type { ProductionBoluMessage } from '@/lib/ai-assistant/hooks/types'

/**
 * useBoluResponseHaptics — exactly one start pulse and one optional completion
 * pulse per response id.
 *
 * The guards compare message ids, so streaming tokens, chunk flushes and
 * re-renders cannot pulse again. An empty or immediately failed response never
 * pulses because visible output is required.
 */
export function useBoluResponseHaptics({
  messages,
  isStreaming,
  preferences,
}: {
  messages: ProductionBoluMessage[]
  isStreaming: boolean
  preferences: BoluInteractionPreferences
}) {
  const startPulseResponseIdRef = useRef<string | null>(null)
  const completionPulseResponseIdRef = useRef<string | null>(null)

  const latestAssistantMessage =
    [...messages].reverse().find((message) => message.role === 'assistant') ?? null

  useEffect(() => {
    if (!latestAssistantMessage) return
    const responseId = latestAssistantMessage.id
    const hasVisibleOutput = latestAssistantMessage.content.trim().length > 0

    if (isStreaming) {
      if (shouldPulseResponseStart(responseId, startPulseResponseIdRef.current, hasVisibleOutput)) {
        startPulseResponseIdRef.current = responseId
        triggerBoluHaptic('impact-light', preferences)
      }
      return
    }

    if (
      latestAssistantMessage.status === 'completed' &&
      shouldPulseResponseComplete(responseId, completionPulseResponseIdRef.current, hasVisibleOutput)
    ) {
      completionPulseResponseIdRef.current = responseId
      triggerBoluHaptic('success', preferences)
    }
  }, [latestAssistantMessage, isStreaming, preferences])
}
