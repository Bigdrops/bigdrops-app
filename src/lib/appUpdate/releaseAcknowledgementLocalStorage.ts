/**
 * Anonymous release acknowledgements and installed-version transition state.
 * Authenticated acknowledgements stay in Supabase and are never copied here.
 */

import type { AcknowledgedRelease } from '@/domain/appUpdate/releaseAcknowledgement'

const ANONYMOUS_ACKNOWLEDGEMENTS_KEY = 'bigdrops.app_release_acknowledgements.anonymous'
const LEGACY_ACKNOWLEDGEMENTS_KEY = 'bigdrops.app_release_acknowledgements'
const INSTALLED_VERSION_TRANSITION_KEY = 'bigdrops.app_release_acknowledgements.install_transition'
const DISMISSED_RELEASES_KEY = 'bigdrops.app_release_notifications.dismissed'

interface StoredAcknowledgment {
  id: string
  versionCode: number
  platform: 'web' | 'android'
  acknowledgedAt: number
}

export interface InstalledVersionTransition {
  lastInstalledVersionCode: number
  pendingUpgradeFromVersionCode: number | null
  pendingUpgradeVersionCode: number | null
}

export type InstalledVersionObservation =
  | { kind: 'first-install'; transition: InstalledVersionTransition }
  | { kind: 'upgrade-pending'; transition: InstalledVersionTransition }
  | { kind: 'unchanged'; transition: InstalledVersionTransition }

function getDismissalKey(versionCode: number, platform: 'web' | 'android', userId: string | null) {
  return `${versionCode}:${platform}:${userId ?? 'anonymous'}`
}

function loadDismissedReleases(): string[] {
  const storage = getStorage()
  if (!storage) return []
  try {
    const value: unknown = JSON.parse(storage.getItem(DISMISSED_RELEASES_KEY) || '[]')
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
  } catch {
    return []
  }
}

/** Release-notice dismissal is separate from acknowledgement and persists across sessions. */
export function isReleaseNotificationDismissed(
  versionCode: number,
  platform: 'web' | 'android',
  userId: string | null,
): boolean {
  const dismissed = loadDismissedReleases()
  const key = getDismissalKey(versionCode, platform, userId)
  const anonKey = getDismissalKey(versionCode, platform, null)
  return dismissed.includes(key) || dismissed.includes(anonKey)
}

export function dismissReleaseNotification(
  versionCode: number,
  platform: 'web' | 'android',
  userId: string | null,
): boolean {
  const storage = getStorage()
  if (!storage) return false
  const key = getDismissalKey(versionCode, platform, userId)
  const anonKey = getDismissalKey(versionCode, platform, null)
  try {
    const dismissed = loadDismissedReleases()
    if (!dismissed.includes(key)) dismissed.push(key)
    if (!dismissed.includes(anonKey)) dismissed.push(anonKey)
    storage.setItem(DISMISSED_RELEASES_KEY, JSON.stringify(dismissed))
    return true
  } catch {
    return false
  }
}

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function isStoredAcknowledgment(value: unknown): value is StoredAcknowledgment {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Partial<StoredAcknowledgment>
  return (
    typeof record.id === 'string' &&
    Number.isInteger(record.versionCode) &&
    (record.versionCode ?? 0) > 0 &&
    (record.platform === 'web' || record.platform === 'android') &&
    typeof record.acknowledgedAt === 'number' &&
    Number.isFinite(record.acknowledgedAt)
  )
}

/** Load acknowledgements for anonymous use only. */
export function loadStoredAcknowledgements(): AcknowledgedRelease[] {
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(ANONYMOUS_ACKNOWLEDGEMENTS_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter(isStoredAcknowledgment).map((record) => ({ ...record }))
    }

    // Preserve old anonymous records only. Older implementations also stored
    // authenticated records here, so never import a row with a userId.
    const legacyRaw = storage.getItem(LEGACY_ACKNOWLEDGEMENTS_KEY)
    if (!legacyRaw) return []
    const legacy: unknown = JSON.parse(legacyRaw)
    if (!Array.isArray(legacy)) return []
    return legacy
      .filter((record) => typeof record === 'object' && record !== null && !(record as { userId?: unknown }).userId)
      .filter(isStoredAcknowledgment)
      .map((record) => ({ ...record }))
  } catch {
    return []
  }
}

/** Save anonymous acknowledgements. Returns false if storage is unavailable. */
export function saveStoredAcknowledgements(records: AcknowledgedRelease[]): boolean {
  const storage = getStorage()
  if (!storage) return false

  try {
    const stored: StoredAcknowledgment[] = records.map(({ id, versionCode, platform, acknowledgedAt }) => ({
      id,
      versionCode,
      platform,
      acknowledgedAt,
    }))
    storage.setItem(ANONYMOUS_ACKNOWLEDGEMENTS_KEY, JSON.stringify(stored))
    return true
  } catch {
    return false
  }
}

/** Check an anonymous acknowledgement. Authenticated callers must not use this. */
export function isReleaseAcknowledgedLocally(versionCode: number, platform: 'web' | 'android'): boolean {
  return loadStoredAcknowledgements().some(
    (record) => record.versionCode === versionCode && record.platform === platform,
  )
}

/** Mark an anonymous release as acknowledged. */
export function markReleaseAcknowledgedLocally(
  versionCode: number,
  platform: 'web' | 'android',
): { record: AcknowledgedRelease; persisted: boolean } {
  const record: AcknowledgedRelease = {
    id: crypto.randomUUID(),
    versionCode,
    platform,
    acknowledgedAt: Date.now(),
  }
  const existing = loadStoredAcknowledgements().filter(
    (item) => item.versionCode !== versionCode || item.platform !== platform,
  )
  return { record, persisted: saveStoredAcknowledgements([...existing, record]) }
}

/** Remove an anonymous acknowledgement. */
export function removeAcknowledgedReleaseLocally(versionCode: number, platform: 'web' | 'android'): boolean {
  const existing = loadStoredAcknowledgements()
  const updated = existing.filter(
    (record) => record.versionCode !== versionCode || record.platform !== platform,
  )
  return updated.length === existing.length || saveStoredAcknowledgements(updated)
}

function loadTransition(): InstalledVersionTransition | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(INSTALLED_VERSION_TRANSITION_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const transition = value as Partial<InstalledVersionTransition>
    if (!Number.isInteger(transition.lastInstalledVersionCode) || (transition.lastInstalledVersionCode ?? 0) < 1) {
      return null
    }
    const isNullableVersion = (version: unknown) => version === null || (Number.isInteger(version) && (version as number) > 0)
    if (
      !isNullableVersion(transition.pendingUpgradeFromVersionCode) ||
      !isNullableVersion(transition.pendingUpgradeVersionCode)
    ) {
      return null
    }
    return transition as InstalledVersionTransition
  } catch {
    return null
  }
}

function saveTransition(transition: InstalledVersionTransition): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(INSTALLED_VERSION_TRANSITION_KEY, JSON.stringify(transition))
    return true
  } catch {
    return false
  }
}

/**
 * Record the installed Android version. The first observation establishes a
 * baseline; only a later increase creates a pending post-upgrade transition.
 */
export function observeInstalledVersion(versionCode: number): InstalledVersionObservation | null {
  if (!Number.isInteger(versionCode) || versionCode <= 0) return null

  const existing = loadTransition()
  if (!existing) {
    const transition: InstalledVersionTransition = {
      lastInstalledVersionCode: versionCode,
      pendingUpgradeFromVersionCode: null,
      pendingUpgradeVersionCode: null,
    }
    if (!saveTransition(transition)) return null
    return { kind: 'first-install', transition }
  }

  if (versionCode > existing.lastInstalledVersionCode) {
    const transition: InstalledVersionTransition = {
      lastInstalledVersionCode: versionCode,
      pendingUpgradeFromVersionCode: existing.lastInstalledVersionCode,
      pendingUpgradeVersionCode: versionCode,
    }
    if (!saveTransition(transition)) return null
    return { kind: 'upgrade-pending', transition }
  }

  if (versionCode < existing.lastInstalledVersionCode) {
    const transition: InstalledVersionTransition = {
      lastInstalledVersionCode: versionCode,
      pendingUpgradeFromVersionCode: null,
      pendingUpgradeVersionCode: null,
    }
    if (!saveTransition(transition)) return null
    return { kind: 'unchanged', transition }
  }

  if (existing.pendingUpgradeVersionCode === versionCode) {
    return { kind: 'upgrade-pending', transition: existing }
  }
  return { kind: 'unchanged', transition: existing }
}

export const MAX_WEB_NOTIFICATION_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
export const WEB_VERSION_TRANSITION_KEY = 'bigdrops.app_release_acknowledgements.web_transition'

export interface WebVersionTransition {
  lastSeenVersionCode: number
  publicationMs: number | null
  quietBaseline: boolean
  notifiedVersionCode: number | null
}

export type WebReleaseObservation =
  | { kind: 'quiet-baseline'; eligible: false; reason: string }
  | { kind: 'fresh-release'; eligible: true; reason: string }
  | { kind: 'new-version'; eligible: true; reason: string }
  | { kind: 'unchanged'; eligible: boolean; reason: string }
  | { kind: 'older-version'; eligible: false; reason: string }

function loadWebTransition(): WebVersionTransition | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(WEB_VERSION_TRANSITION_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Partial<WebVersionTransition>
    if (!Number.isInteger(record.lastSeenVersionCode) || (record.lastSeenVersionCode ?? 0) <= 0) {
      return null
    }
    return {
      lastSeenVersionCode: record.lastSeenVersionCode!,
      publicationMs:
        typeof record.publicationMs === 'number' && Number.isFinite(record.publicationMs)
          ? record.publicationMs
          : null,
      quietBaseline: Boolean(record.quietBaseline),
      notifiedVersionCode: Number.isInteger(record.notifiedVersionCode)
        ? record.notifiedVersionCode!
        : null,
    }
  } catch {
    return null
  }
}

function saveWebTransition(transition: WebVersionTransition): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(WEB_VERSION_TRANSITION_KEY, JSON.stringify(transition))
    return true
  } catch {
    return false
  }
}

/**
 * Observe a release on the Web platform.
 *
 * Rules:
 * 1. First encounter on a device with a release published > 7 days ago establishes
 *    a quiet baseline without opening the banner (eligible: false).
 * 2. First encounter with a fresh release (<= 7 days old) is eligible to notify (eligible: true).
 * 3. When policy advances to a newer versionCode (> lastSeenVersionCode):
 *    - If fresh (<= 7 days old): eligible to notify (eligible: true).
 *    - If stale (> 7 days old): quiet baseline (eligible: false).
 * 4. Same version: retains prior eligibility status (quiet baseline stays quiet).
 */
export function observeWebRelease({
  versionCode,
  publicationMs = null,
  nowMs = Date.now(),
}: {
  versionCode: number
  publicationMs?: number | null
  nowMs?: number
}): WebReleaseObservation {
  if (!Number.isInteger(versionCode) || versionCode <= 0) {
    return { kind: 'older-version', eligible: false, reason: 'invalid version code' }
  }

  const isStale =
    publicationMs === null ||
    !Number.isFinite(publicationMs) ||
    nowMs - publicationMs > MAX_WEB_NOTIFICATION_AGE_MS
  const existing = loadWebTransition()

  if (!existing) {
    if (isStale) {
      saveWebTransition({
        lastSeenVersionCode: versionCode,
        publicationMs,
        quietBaseline: true,
        notifiedVersionCode: null,
      })
      return { kind: 'quiet-baseline', eligible: false, reason: 'first visit with stale release (> 7 days)' }
    }

    saveWebTransition({
      lastSeenVersionCode: versionCode,
      publicationMs,
      quietBaseline: false,
      notifiedVersionCode: versionCode,
    })
    return { kind: 'fresh-release', eligible: true, reason: 'first visit with fresh release (<= 7 days)' }
  }

  if (versionCode > existing.lastSeenVersionCode) {
    if (isStale) {
      saveWebTransition({
        lastSeenVersionCode: versionCode,
        publicationMs,
        quietBaseline: true,
        notifiedVersionCode: null,
      })
      return { kind: 'quiet-baseline', eligible: false, reason: 'newer version but already stale (> 7 days)' }
    }

    saveWebTransition({
      lastSeenVersionCode: versionCode,
      publicationMs,
      quietBaseline: false,
      notifiedVersionCode: versionCode,
    })
    return { kind: 'new-version', eligible: true, reason: 'newer release within 7-day window' }
  }

  if (versionCode < existing.lastSeenVersionCode) {
    return { kind: 'older-version', eligible: false, reason: 'version is behind last seen' }
  }

  // Same version
  if (existing.quietBaseline) {
    return { kind: 'unchanged', eligible: false, reason: 'quiet baseline already established' }
  }

  return { kind: 'unchanged', eligible: true, reason: 'version unchanged, eligible for notice if unacknowledged' }
}
