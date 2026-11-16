/**
 * bolu-haptics.ts — Restrained Bolu haptic feedback.
 *
 * Native audit (2026-11-16):
 * - `@capacitor/haptics` is NOT installed in this project.
 * - The Android shell exists, but the app has no native haptics bridge.
 * - The repository already standardises on the guarded browser Vibration API
 *   for its only two haptic interactions (`useLongPress`, `SelectableRowCard`).
 * - `android.permission.VIBRATE` was not declared, so the WebView Vibration API
 *   could not fire on Android at all. It is declared now, because this
 *   implementation requires it. No other permission was added.
 *
 * The adapter is a deliberate no-op where vibration is unavailable (desktop
 * browsers, iOS, rejected calls). It never throws and never blocks chat.
 */

import {
  readBoluInteractionPreferences,
  type BoluInteractionPreferences,
} from './bolu-preferences'

export type BoluHapticKind = 'impact-light' | 'success'

/**
 * Short, restrained patterns. Never a long vibration: the start pulse is 12ms,
 * and the completion pattern is two short taps under 100ms in total.
 *
 * Only two events pulse: the first visible output of a response, and the
 * optional completion. Copy, edit, regenerate, send and narration stay silent.
 */
export const BOLU_HAPTIC_PATTERNS: Record<BoluHapticKind, number | number[]> = {
  'impact-light': 12,
  success: [0, 14, 60, 16],
}

export function isHapticFeedbackSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof (navigator as Navigator).vibrate === 'function'
}

/**
 * Fires one haptic pulse when the preference allows it.
 * Returns true only when the vibration API accepted the pattern.
 */
export function triggerBoluHaptic(
  kind: BoluHapticKind,
  preferences: BoluInteractionPreferences = readBoluInteractionPreferences(),
): boolean {
  if (!preferences.hapticsEnabled) return false
  if (kind === 'success' && !preferences.completionHapticsEnabled) return false
  if (!isHapticFeedbackSupported()) return false

  try {
    return (navigator as Navigator).vibrate(BOLU_HAPTIC_PATTERNS[kind]) === true
  } catch {
    return false
  }
}

/**
 * The response start pulse must fire once per response. This pure guard decides
 * whether a pulse is due for the given response message id, so a token update,
 * a re-render or a repeated state write cannot pulse again.
 */
export function shouldPulseResponseStart(
  responseId: string | null,
  lastPulsedResponseId: string | null,
  hasVisibleOutput: boolean,
): boolean {
  if (!responseId) return false
  if (!hasVisibleOutput) return false
  return responseId !== lastPulsedResponseId
}

/** Completion pulse is also once per response, and only after visible output. */
export function shouldPulseResponseComplete(
  responseId: string | null,
  lastPulsedResponseId: string | null,
  hasVisibleOutput: boolean,
): boolean {
  if (!responseId) return false
  if (!hasVisibleOutput) return false
  return responseId !== lastPulsedResponseId
}
