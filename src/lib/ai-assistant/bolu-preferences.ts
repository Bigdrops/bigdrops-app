/**
 * bolu-preferences.ts — Bolu interaction preferences (haptics & narration).
 *
 * Storage decision: device-scoped `localStorage`, matching the existing Bolu
 * convention (`bolu_active_model_target`). These are device capabilities, not
 * account data: a phone that cannot vibrate should not change the setting for
 * the same user on desktop. The theme uses `user_preferences` because it is a
 * visual account preference; haptics and TTS voices are per device.
 *
 * No new settings architecture: one small store, one subscription event, and
 * the existing Bolu settings surface renders the toggles.
 */

export interface BoluInteractionPreferences {
  /** Master switch for all Bolu haptic feedback. */
  hapticsEnabled: boolean
  /** Independent switch for the response-completion pulse. */
  completionHapticsEnabled: boolean
  /** Whether the "Read aloud" action is offered. */
  narrationEnabled: boolean
  /** Speech rate passed to the device TTS engine. */
  narrationRate: number
}

export const BOLU_PREFERENCES_STORAGE_KEY = 'bolu_interaction_preferences'
export const BOLU_PREFERENCES_EVENT = 'bolu:interaction-preferences-changed'

export const DEFAULT_BOLU_INTERACTION_PREFERENCES: BoluInteractionPreferences = Object.freeze({
  hapticsEnabled: true,
  completionHapticsEnabled: true,
  narrationEnabled: true,
  narrationRate: 1,
})

export const BOLU_NARRATION_RATE_MIN = 0.6
export const BOLU_NARRATION_RATE_MAX = 1.6

export function clampNarrationRate(value: unknown): number {
  const rate = typeof value === 'number' && Number.isFinite(value) ? value : 1
  return Math.min(BOLU_NARRATION_RATE_MAX, Math.max(BOLU_NARRATION_RATE_MIN, Math.round(rate * 10) / 10))
}

function normalizePreferences(raw: unknown): BoluInteractionPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_BOLU_INTERACTION_PREFERENCES }
  const record = raw as Record<string, unknown>
  const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)
  return {
    hapticsEnabled: bool(record.hapticsEnabled, DEFAULT_BOLU_INTERACTION_PREFERENCES.hapticsEnabled),
    completionHapticsEnabled: bool(
      record.completionHapticsEnabled,
      DEFAULT_BOLU_INTERACTION_PREFERENCES.completionHapticsEnabled,
    ),
    narrationEnabled: bool(record.narrationEnabled, DEFAULT_BOLU_INTERACTION_PREFERENCES.narrationEnabled),
    narrationRate: clampNarrationRate(record.narrationRate),
  }
}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

// Stable snapshot for useSyncExternalStore: the reference only changes on write.
let cachedPreferences: BoluInteractionPreferences = { ...DEFAULT_BOLU_INTERACTION_PREFERENCES }
let cachedRaw: string | null = null
let cacheInitialised = false

export function readBoluInteractionPreferences(): BoluInteractionPreferences {
  if (!hasStorage()) return { ...DEFAULT_BOLU_INTERACTION_PREFERENCES }
  try {
    const raw = window.localStorage.getItem(BOLU_PREFERENCES_STORAGE_KEY)
    if (!cacheInitialised || raw !== cachedRaw) {
      cachedRaw = raw
      cacheInitialised = true
      cachedPreferences = raw ? normalizePreferences(JSON.parse(raw)) : { ...DEFAULT_BOLU_INTERACTION_PREFERENCES }
    }
    return cachedPreferences
  } catch {
    return { ...DEFAULT_BOLU_INTERACTION_PREFERENCES }
  }
}

export function writeBoluInteractionPreferences(
  patch: Partial<BoluInteractionPreferences>,
): BoluInteractionPreferences {
  const next = normalizePreferences({ ...readBoluInteractionPreferences(), ...patch })
  cachedPreferences = next
  cacheInitialised = true
  cachedRaw = JSON.stringify(next)

  if (hasStorage()) {
    try {
      window.localStorage.setItem(BOLU_PREFERENCES_STORAGE_KEY, cachedRaw)
    } catch {
      // Storage full or blocked: keep the in-memory value for this session.
    }
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(BOLU_PREFERENCES_EVENT, { detail: next }))
  }

  return next
}

export function subscribeBoluInteractionPreferences(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onLocal = () => listener()
  const onStorage = (event: Event) => {
    if ((event as StorageEvent).key === BOLU_PREFERENCES_STORAGE_KEY) {
      cacheInitialised = false
      listener()
    }
  }
  window.addEventListener(BOLU_PREFERENCES_EVENT, onLocal)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(BOLU_PREFERENCES_EVENT, onLocal)
    window.removeEventListener('storage', onStorage)
  }
}
