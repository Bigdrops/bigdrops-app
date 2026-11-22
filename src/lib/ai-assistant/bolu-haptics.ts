/**
 * bolu-haptics.ts — Restrained Bolu haptic feedback through Capacitor Haptics.
 *
 * The native plugin uses Android Vibrator and VibrationEffect. It respects
 * system vibration settings. Web support is optional: when the plugin is not
 * available, this adapter is a no-op and never blocks chat.
 *
 * Only two events pulse: the first visible output of a response, and the
 * optional completion. Copy, edit, regenerate, send and narration stay silent.
 */

import { Capacitor } from '@capacitor/core'
import { Haptics, NotificationType } from '@capacitor/haptics'

import {
  readBoluInteractionPreferences,
  type BoluInteractionPreferences,
} from './bolu-preferences'

export type BoluHapticKind = 'impact-light' | 'success'

/**
 * Native haptic calls. The start is one continuous 90 ms vibration. The
 * completion uses the platform notification waveform, which is short and
 * restrained on Android.
 */
export const BOLU_HAPTIC_PATTERNS: Record<BoluHapticKind, number | number[]> = {
  'impact-light': 90,
  success: [0, 35, 65, 21],
}

export function isHapticFeedbackSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics')
}

/**
 * Fires one haptic pulse when the preference allows it.
 * Returns true only when the native call was accepted.
 */
export function triggerBoluHaptic(
  kind: BoluHapticKind,
  preferences: BoluInteractionPreferences = readBoluInteractionPreferences(),
): boolean {
  if (!preferences.hapticsEnabled) return false
  if (kind === 'success' && !preferences.completionHapticsEnabled) return false
  if (!isHapticFeedbackSupported()) return false

  try {
    if (kind === 'impact-light') {
      void Haptics.vibrate({ duration: BOLU_HAPTIC_PATTERNS['impact-light'] as number })
    } else {
      void Haptics.notification({ type: NotificationType.Success })
    }
    return true
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
