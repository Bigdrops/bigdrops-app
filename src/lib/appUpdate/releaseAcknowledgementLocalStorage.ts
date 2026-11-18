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

/** Release-notice dismissal is separate from acknowledgement and scoped per account. */
export function isReleaseNotificationDismissed(
  versionCode: number,
  platform: 'web' | 'android',
  userId: string | null,
): boolean {
  return loadDismissedReleases().includes(getDismissalKey(versionCode, platform, userId))
}

export function dismissReleaseNotification(
  versionCode: number,
  platform: 'web' | 'android',
  userId: string | null,
): boolean {
  const storage = getStorage()
  if (!storage) return false
  const key = getDismissalKey(versionCode, platform, userId)
  try {
    const dismissed = loadDismissedReleases()
    if (!dismissed.includes(key)) dismissed.push(key)
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
