/**
 * Release acknowledgement client: Supabase-backed persistence for authenticated users.
 *
 * Anonymous users are handled exclusively via device-local localStorage
 * (see releaseAcknowledgementLocalStorage.ts). This module only deals with
 * the authenticated user path, where acknowledgement records synchronize
 * across devices through the user's Supabase profile.
 *
 * Acknowledgement records must never alter mandatory-update grace anchors.
 */

import { supabase } from '@/supabase'
import type { AcknowledgedRelease } from '@/domain/appUpdate/releaseAcknowledgement'
import type { ReleasePolicyInput } from '@/domain/appUpdate/updateStateMachine'

/** Fetch all acknowledgement records for the current user and platform. */
export async function fetchAcknowledgedReleases(
  platform: 'web' | 'android',
): Promise<AcknowledgedRelease[]> {
  const { data, error } = await supabase
    .from('release_acknowledgements')
    .select('*')
    .eq('platform', platform)
    .order('acknowledged_at', { ascending: false })

  if (error) {
    // Best-effort: if the table doesn't exist or RLS blocks, return empty array.
    // The caller should fall back to localStorage or treat as unacknowledged.
    // tslint:disable-next-line:no-console
    // console.warn('Failed to fetch acknowledged releases:', error)
    return []
  }

  return (data as any[]) || []
}

/**
 * Persist an acknowledgement record for the current authenticated user.
 * If a record for the same versionCode+platform already exists, it is updated.
 * Otherwise, a new record is inserted.
 */
export async function persistAcknowledgedRelease(
  versionCode: number,
  platform: 'web' | 'android',
): Promise<AcknowledgedRelease> {
  // Try to insert; on conflict (same user + versionCode + platform), update instead.
  const { data, error } = await supabase
    .from('release_acknowledgements')
    .upsert(
      {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        version_code: versionCode,
        platform,
        acknowledged_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,version_code,platform' },
    )
    .select()
    .single()

  if (error) {
    // If upsert fails (e.g. RLS, table missing), fall back to returning a local record.
    // The caller should handle the fallback appropriately.
    // tslint:disable-next-line:no-console
    // console.warn('Failed to persist acknowledged release:', error)
    return {
      id: crypto.randomUUID(),
      versionCode,
      platform,
      acknowledgedAt: Date.now(),
      userId: (await supabase.auth.getUser()).data.user?.id,
    }
  }

  return {
    id: (data as any).id,
    versionCode: (data as any).version_code,
    platform: (data as any).platform,
    acknowledgedAt: new Date((data as any).acknowledged_at).getTime(),
    userId: (data as any).user_id,
  }
}

/**
 * Remove an acknowledgement record for the given versionCode and platform.
 * Used when a user explicitly resets their acknowledgement state.
 */
export async function removeAcknowledgedRelease(
  versionCode: number,
  platform: 'web' | 'android',
): Promise<boolean> {
  const { error } = await supabase
    .from('release_acknowledgements')
    .delete()
    .match({ user_id: (await supabase.auth.getUser()).data.user?.id, version_code: versionCode, platform })

  if (error) {
    // tslint:disable-next-line:no-console
    // console.warn('Failed to remove acknowledged release:', error)
    return false
  }
  return true
}

/**
 * Checks whether a release is already acknowledged for the current user/platform,
 * by fetching from Supabase and evaluating with the domain logic. */
export async function isReleaseAcknowledgedByUser(
  versionCode: number,
  platform: 'web' | 'android',
): Promise<{ acknowledged: boolean; record?: AcknowledgedRelease }> {
  const records = await fetchAcknowledgedReleases(platform)
  const result = isReleaseAcknowledged({ versionCode, platform, existingRecords: records })
  return result
}