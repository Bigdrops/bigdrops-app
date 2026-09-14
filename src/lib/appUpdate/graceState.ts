import type { PersistedGraceState } from '@/domain/appUpdate/updateStateMachine'

/**
 * Local persistence for the mandatory-update grace anchor.
 *
 * localStorage matches the existing native preference pattern in this
 * project (see biometric.ts). Values are non-sensitive update bookkeeping.
 * The anchor survives app restarts, so a restart never resets the
 * 3-day countdown. Clearing app storage also clears the anchor; the
 * trade-off is documented in the release contract documentation.
 */
const GRACE_STATE_KEY = 'bigdrops.app_update.grace_anchor'

interface StoredGraceState {
  versionCode: number
  anchoredAtMs: number
  deviceClockSkewMs: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function loadPersistedGraceState(): PersistedGraceState | null {
  try {
    const raw = window.localStorage.getItem(GRACE_STATE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<StoredGraceState>
    if (
      !isFiniteNumber(parsed.versionCode) ||
      parsed.versionCode <= 0 ||
      !isFiniteNumber(parsed.anchoredAtMs) ||
      !isFiniteNumber(parsed.deviceClockSkewMs)
    ) {
      return null
    }

    return {
      versionCode: parsed.versionCode,
      anchoredAtMs: parsed.anchoredAtMs,
      deviceClockSkewMs: parsed.deviceClockSkewMs,
    }
  } catch {
    return null
  }
}

export function savePersistedGraceState(state: PersistedGraceState): void {
  try {
    const stored: StoredGraceState = {
      versionCode: state.versionCode,
      anchoredAtMs: state.anchoredAtMs,
      deviceClockSkewMs: state.deviceClockSkewMs,
    }
    window.localStorage.setItem(GRACE_STATE_KEY, JSON.stringify(stored))
  } catch {
    // Persistence is best-effort. Failure here means a user who cleared
    // app data may regain a fresh grace window; it never blocks anything.
  }
}

export function clearPersistedGraceState(): void {
  try {
    window.localStorage.removeItem(GRACE_STATE_KEY)
  } catch {
    // no-op
  }
}
