/**
 * bolu-thinking-orb.tsx — Maps ClerkState lifecycle to ThinkingOrb animation states.
 *
 * Rules:
 * - Renders nothing while Bolu is idle or in the success state.
 * - Theme is pinned to the current appearance via the `tone` prop ('light' | 'dark').
 * - Paused is true whenever the orb is not the latest assistant turn.
 */

import { ThinkingOrb, type OrbState } from 'thinking-orbs'
import type { ClerkState } from './types'

/** Map clerk lifecycle → orb animation state */
const CLERK_TO_ORB: Partial<Record<ClerkState, OrbState>> = {
  listening: 'listening',
  thinking: 'solving',
  responding: 'composing',
}

/** Inline activity indicator — size 20, used inside status rows */
export function BoluOrbInline({
  state,
  tone = 'light',
  paused = false,
}: {
  state: ClerkState
  tone?: 'light' | 'dark'
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

/** Primary identity indicator — size 64, used in Bolu's empty-state slot */
export function BoluOrbIdentity({
  state,
  tone = 'light',
  paused = false,
}: {
  state: ClerkState
  tone?: 'light' | 'dark'
  paused?: boolean
}) {
  const orbState: OrbState = CLERK_TO_ORB[state] ?? 'breathing'

  return (
    <div
      className="grid place-items-center"
      style={{ width: 96, height: 96 }}
      aria-label={`Bolu assistant, ${state}`}
    >
      <ThinkingOrb
        state={orbState}
        size={64}
        theme={tone}
        paused={paused}
        style={{ display: 'block' }}
      />
    </div>
  )
}
