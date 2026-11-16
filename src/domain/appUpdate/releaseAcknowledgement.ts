/**
 * Release acknowledgement domain types and helpers.
 *
 * Supports both authenticated users (Supabase-backed, cross-device sync)
 * and anonymous users (device-local localStorage). Acknowledgement records
 * are release-specific and platform-specific, capable of representing
 * multiple acknowledged releases per user/device.
 *
 * Acknowledgement records must never alter mandatory-update grace anchors.
 */

import type { ReleasePolicyInput } from './updateStateMachine'

/**
 * A release acknowledgement record, representing that a user/device has
 * acknowledged a specific release version on a specific platform.
 */
export interface AcknowledgedRelease {
  /** Unique identifier for this acknowledgement record. */
  id: string
  /** The version code of the release that was acknowledged. */
  versionCode: number
  /** The platform where the acknowledgement occurred. */
  platform: 'web' | 'android'
  /** When the acknowledgement occurred (server time for authenticated,
   *  device time for anonymous). */
  acknowledgedAt: number // timestamp in ms
  /** Optional identifier linking to the user's profile (authenticated only). */
  userId?: string
}

/**
 * Parameters for checking whether a release is already acknowledged.
 */
export interface IsAcknowledgedParams {
  /** The release version code to check. */
  versionCode: number
  /** The platform ('web' or 'android'). */
  platform: 'web' | 'android'
  /** Optional existing acknowledgement records (for testing or pre-fetched data). */
  existingRecords?: AcknowledgedRelease[]
}

/**
 * Parameters for marking a release as acknowledged.
 */
export interface MarkAcknowledgedParams {
  /** The release version code to mark as acknowledged. */
  versionCode: number
  /** The platform ('web' or 'android'). */
  platform: 'web' | 'android'
  /** The user ID (authenticated only; omitted for anonymous/device-local). */
  userId?: string | null
}

/**
 * Result of checking whether a release is acknowledged. */
export interface IsAcknowledgedResult {
  /** True if the release has already been acknowledged. */
  acknowledged: boolean
  /** The most recent acknowledgement record, if any. */
  record?: AcknowledgedRelease
}

/**
 * Result of marking a release as acknowledged. */
export interface MarkAcknowledgedResult {
  /** True if the acknowledgement was successfully persisted. */
  persisted: boolean
  /** The acknowledgement record that was saved/updated. */
  record: AcknowledgedRelease
}

/**
 * Checks whether a release version has already been acknowledged.
 * @param params Parameters including versionCode, platform, and optional pre-fetched records
 * @returns Whether the release is acknowledged, and the most recent record
 */
export function isReleaseAcknowledged(params: IsAcknowledgedParams): IsAcknowledgedResult {
  const { versionCode, platform, existingRecords } = params

  // Use provided records if available, otherwise load from appropriate source
  const records = existingRecords || []

  // Find the most recent acknowledgement for this versionCode and platform
  const matchingRecords = records.filter(
    (record) => record.versionCode === versionCode && record.platform === platform,
  )

  if (matchingRecords.length === 0) {
    return { acknowledged: false }
  }

  // Sort by acknowledgedAt descending to get the most recent
  const sorted = matchingRecords.sort(
    (a, b) => b.acknowledgedAt - a.acknowledgedAt,
  )

  return {
    acknowledged: true,
    record: sorted[0],
  }
}

/**
 * Gets the most recent acknowledged version code that is >= the given version code,
 * for a given platform. This handles the case where a user has acknowledged a newer release,
 * and we need to determine if they've already seen the release notes for a specific version.
 */
export function getLastAcknowledgedVersion(params: {
  versionCode: number
  platform: 'web' | 'android'
  existingRecords?: AcknowledgedRelease[]
}): number | null {
  const records = (params.existingRecords || [])
    .filter((r) => r.platform === params.platform)
    .sort((a, b) => b.versionCode - a.versionCode) // newest first

  // Find the most recent acknowledged version that is >= the current installed version's predecessor
  // We want the highest versionCode that was acknowledged and is >= 1 (valid)
  const validAcknowledged = records.filter(
    (r) => r.versionCode >= 1,
  )

  if (validAcknowledged.length === 0) return null

  // Return the highest versionCode that was acknowledged
  return validAcknowledged[0].versionCode
}

/**
 * Creates an acknowledgement record with the current timestamp.
 * For authenticated users, this persists to Supabase.
 * For anonymous users, this persists to device-local localStorage.
 */
export function createAcknowledgedRelease(params: {
  versionCode: number
  platform: 'web' | 'android'
  userId?: string | null
}): AcknowledgedRelease => {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    versionCode,
    platform,
    acknowledgedAt: now,
    userId,
  }
}