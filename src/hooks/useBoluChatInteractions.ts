import { useCallback, type RefObject } from 'react'

import { useBoluNarration } from '@/lib/ai-assistant/hooks/useBoluNarration'
import { buildNarrationText } from '@/lib/ai-assistant/bolu-narration'
import type { BoluInteractionPreferences } from '@/lib/ai-assistant/bolu-preferences'
import type { ProductionBoluMessage } from '@/lib/ai-assistant/hooks/types'

/**
 * useBoluChatInteractions — the message-level handlers for the Bolu workspace.
 *
 * Kept out of `BoluChatWorkspace` so the component stays inside the project
 * line limit. Each handler stops narration before it changes the conversation.
 *
 * Haptics are intentionally absent here: the only intended vibration is the
 * response-start pulse and the optional completion pulse, both owned by
 * `useBoluResponseHaptics`. Ordinary actions stay silent.
 */
export function useBoluChatInteractions({
  isStreaming,
  preferences,
  narration,
  editUserMessage,
  regenerateResponse,
  setEditingMessageId,
  setInputDraft,
  inputRef,
  stopNarration,
}: {
  isStreaming: boolean
  preferences: BoluInteractionPreferences
  narration: Pick<
    ReturnType<typeof useBoluNarration>,
    'supported' | 'messageId' | 'status' | 'error' | 'pause' | 'resume' | 'toggle'
  >
  editUserMessage: (messageId: string, text: string) => Promise<boolean>
  regenerateResponse: (assistantMessageId: string) => Promise<boolean>
  setEditingMessageId: (messageId: string | null) => void
  setInputDraft: (value: string) => void
  inputRef: RefObject<HTMLTextAreaElement | null>
  stopNarration: () => void
}) {
  const handleBeginEdit = useCallback(
    (message: ProductionBoluMessage) => {
      if (isStreaming || message.role !== 'user') return
      stopNarration()
      setEditingMessageId(message.id)
      setInputDraft(message.content)
      inputRef.current?.focus()
    },
    [isStreaming, stopNarration, setEditingMessageId, setInputDraft, inputRef],
  )

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setInputDraft('')
    inputRef.current?.focus()
  }, [setEditingMessageId, setInputDraft, inputRef])

  const handleRegenerate = useCallback(
    (message: ProductionBoluMessage) => {
      if (isStreaming) return
      stopNarration()
      void regenerateResponse(message.id)
    },
    [isStreaming, stopNarration, regenerateResponse],
  )

  const handleSpeakResponse = useCallback(
    (message: ProductionBoluMessage, prose: string) => {
      narration.toggle(
        message.id,
        buildNarrationText({ prose, hasProposal: Boolean(message.proposal) }),
      )
    },
    [narration],
  )

  const handleSaveEdit = useCallback(
    async (editingMessageId: string, text: string) => {
      const success = await editUserMessage(editingMessageId, text)
      if (success) {
        setEditingMessageId(null)
        setInputDraft('')
      }
      return success
    },
    [editUserMessage, setEditingMessageId, setInputDraft],
  )

  // The thread's narration contract, so the workspace does not restate it.
  const narrationControls = {
    supported: narration.supported,
    enabled: preferences.narrationEnabled,
    messageId: narration.messageId,
    status: narration.status,
    error: narration.error,
    onSpeak: handleSpeakResponse,
    onPause: narration.pause,
    onResume: narration.resume,
    onStop: stopNarration,
  }

  return {
    handleBeginEdit,
    handleCancelEdit,
    handleRegenerate,
    handleSpeakResponse,
    handleSaveEdit,
    narrationControls,
  }
}
