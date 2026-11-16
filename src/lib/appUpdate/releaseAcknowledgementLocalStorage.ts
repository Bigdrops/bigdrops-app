/**
 * Device-local release acknowledgement persistence for anonymous users.
 *
 * Anonymous users do not have a Supabase profile, so acknowledgement state is
 * stored in localStorage under a per-device key. This state does not survive
 * a factory reset or app uninstall, and is reconciled with Supabase when the
 * user authenticates (see releaseAcknowledgementClient.ts for the authenticated
 * path).
 *
 * Acknowledgement records must never alter mandatory-update grace anchors.
 */

const LOCAL_STORAGE_KEY = 'bigdrops.app_release_acknowledgements'

interface StoredAcknowledgment {
  id: string
  versionCode: number
  platform: 'web' | 'android'
  acknowledgedAt: number // ms since epoch
  userId?: string | null
}

function isValidAcknowledgment(obj: unknown): obj is StoredAcknowledgment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).versionCode === 'number' &&
    typeof (obj as any).platform === 'string' &&
    (obj as any).platform === 'web' || (obj as any).platform === 'android' &&
    typeof (obj as any).acknowledgedAt === 'number' &&
    Number.isFinite((obj as any).acknowledgedAt) &&
    (obj as any).versionCode > 0
  )
}

/** Load all stored acknowledgement records from localStorage. */
export function loadStoredAcknowledgements(): AcknowledgedRelease[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as StoredAcknowledgment[] | string
    if (typeof parsed === 'string') {
      // Backward compatibility: old format was a JSON string of just records
      try {
        const records = JSON.parse(parsed) as StoredAcknowledgment[] | null
        if (records && Array.isArray(records)) {
          return records.map((r) => ({
            id: r.id || crypto.randomUUID(),
            versionCode: r.versionCode,
            platform: r.platform,
            acknowledgedAt: r.acknowledgedAt,
            userId: r.userId,
          }))
        }
      } catch {
        // Not a valid record format; fall through
      }
      return []
    }

    if (Array.isArray(parsed)) {
      return parsed.map((r) => ({
        id: r.id || crypto.randomUUID(),
        versionCode: r.versionCode,
        platform: r.platform,
        acknowledgedAt: r.acknowledgedAt,
        userId: r.userId,
      }))
    }
    return []
  } catch {
    // localStorage unavailable or corrupted — best-effort only
    return []
  }
}

/** Save acknowledgement records to localStorage. */
export function saveStoredAcknowledgements(records: AcknowledgedRelease[]): void {
  try {
    const stored = records.map((r) => ({
      id: r.id,
      versionCode: r.versionCode,
      platform: r.platform,
      acknowledgedAt: r.acknowledgedAt,
      userId: r.userId,
    }))
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // localStorage full or unavailable — best-effort only; never break the update flow.
  }
}

/** Check whether a release version has already been acknowledged (anonymous/device-local). */
export function isReleaseAcknowledgedLocally(versionCode: number, platform: 'web' | 'android'): boolean {
  const records = loadStoredAcknowledgements()
  return records.some(
    (record) => record.versionCode === versionCode && record.platform === platform,
  )
}

/** Mark a release as acknowledged (anonymous/device-local). */
export function markReleaseAcknowledgedLocally(versionCode: number, platform: 'web' | 'android'): AcknowledgedRelease {
  const record: AcknowledgedRelease = {
    id: crypto.randomUUID(),
    versionCode,
    platform,
    acknowledgedAt: Date.now(),
  }

  // Load existing, replace this version's record if present, then save
  const existing = loadStoredAcknowledgements()
  const filtered = existing.filter(
    (r) => !(r.versionCode === versionCode && r.platform === platform),
  )
  const updated = [...filtered, record]
  saveStoredAcknowledgements(updated)

  return record
}

/** Remove a release acknowledgement (anonymous/device-local). */
export function removeAcknowledgedReleaseLocally(versionCode: number, platform: 'web' | 'android'): void {
  const existing = loadStoredAcknowledgements()
  const filtered = existing.filter(
    !(r => r.versionCode === versionCode && r.platform === platform),
  )
  saveStoredAcknowledgements(filtered)
}