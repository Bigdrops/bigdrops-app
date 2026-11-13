/**
 * BoluThinkingOrb — maps the Design Lab's ClerkState lifecycle to
 * ThinkingOrb animation states. This is the only integration point for the
 * thinking-orbs library in the Design Lab AI Chat.
 *
 * Rules:
 * - Renders nothing while Bolu is idle or in the success state.
 * - theme is always pinned to the current appearance via the `tone` prop so
 *   the canvas reads correctly on both light and dark panels.
 * - paused is true whenever the orb is not the latest assistant turn to avoid
 *   unnecessary canvas work.
 */
import { ThinkingOrb, type OrbState } from 'thinking-orbs'

import type { ClerkState } from './assistant-chat-clerk'

/** Map clerk lifecycle → orb animation state. */
const CLERK_TO_ORB: Partial<Record<ClerkState, OrbState>> = {
  listening: 'listening',
  thinking: 'solving',
  responding: 'composing',
}

/** Inline activity indicator — size 20, used inside status rows and
 *  thinking placeholders. The parent container must be `position: relative`
 *  and have fixed dimensions to avoid layout shift. */
export function BoluOrbInline({
  state,
  tone,
  paused = false,
}: {
  state: ClerkState
  tone: 'light' | 'dark'
  paused?: boolean
}) {
  const orbState = CLERK_TO_ORB[state]
  if (!orbState) return null

  return (
    <ThinkingOrb
      state={orbState}
      size={20}
      theme={tone}
      paused={paused}
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    />
  )
}

/** Primary identity indicator — size 64, used in Bolu's empty-state slot.
 *  Returns null when idle or success so the ClerkAvatar can render instead. */
export function BoluOrbIdentity({
  state,
  tone,
  paused = false,
}: {
  state: ClerkState
  tone: 'light' | 'dark'
  paused?: boolean
}) {
  const orbState = CLERK_TO_ORB[state]
  if (!orbState) return null

  const LABEL: Record<string, string> = {
    listening: 'Bolu is listening',
    solving: 'Bolu is thinking',
    composing: 'Bolu is composing a reply',
  }

  return (
    <ThinkingOrb
      state={orbState}
      size={64}
      theme={tone}
      paused={paused}
      aria-label={LABEL[orbState] ?? 'Bolu is working'}
      style={{ display: 'block', flexShrink: 0 }}
    />
  )
}
