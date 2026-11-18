/** Supabase-backed release acknowledgements for authenticated users only. */

import { supabase } from '@/supabase'
import { isReleaseAcknowledged, type AcknowledgedRelease } from '@/domain/appUpdate/releaseAcknowledgement'

async function getAuthenticatedUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user?.id ?? null
}

/** Fetch acknowledgements for the active user. Null means unavailable/anonymous. */
export async function fetchAcknowledgedReleases(
  platform: 'web' | 'android',
): Promise<AcknowledgedRelease[] | null> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return null

  const { data, error } = await supabase
    .from('release_acknowledgements')
    .select('id,user_id,version_code,platform,acknowledged_at')
    .eq('user_id', userId)
    .eq('platform', platform)
    .order('acknowledged_at', { ascending: false })

  if (error || !data) return null
  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    versionCode: row.version_code,
    platform: row.platform as 'web' | 'android',
    acknowledgedAt: new Date(row.acknowledged_at).getTime(),
  }))
}

/** Check an acknowledgement only in the current authenticated user's records. */
export async function isReleaseAcknowledgedByUser(
  versionCode: number,
  platform: 'web' | 'android',
): Promise<{ acknowledged: boolean; record?: AcknowledgedRelease } | null> {
  const records = await fetchAcknowledgedReleases(platform)
  if (!records) return null
  return isReleaseAcknowledged({ versionCode, platform, existingRecords: records })
}

/**
 * Persist for the currently authenticated user. Reject if the user is absent,
 * changes during the request, or the database does not confirm the write.
 */
export async function persistAcknowledgedRelease(
  versionCode: number,
  platform: 'web' | 'android',
  expectedUserId?: string,
): Promise<AcknowledgedRelease> {
  const userId = await getAuthenticatedUserId()
  if (!userId || (expectedUserId && userId !== expectedUserId)) {
    throw new Error('Cannot persist a release acknowledgement for a missing or changed authenticated user.')
  }

  const { data, error } = await supabase
    .from('release_acknowledgements')
    .upsert(
      {
        user_id: userId,
        version_code: versionCode,
        platform,
        acknowledged_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,version_code,platform' },
    )
    .select('id,user_id,version_code,platform,acknowledged_at')
    .single()

  if (error || !data) {
    throw new Error('The release acknowledgement could not be saved.')
  }

  const currentUserId = await getAuthenticatedUserId()
  if (currentUserId !== userId || data.user_id !== userId) {
    throw new Error('The authenticated account changed before the acknowledgement was confirmed.')
  }

  return {
    id: data.id,
    userId: data.user_id,
    versionCode: data.version_code,
    platform: data.platform as 'web' | 'android',
    acknowledgedAt: new Date(data.acknowledged_at).getTime(),
  }
}

/** Remove only the active user's matching acknowledgement. */
export async function removeAcknowledgedRelease(
  versionCode: number,
  platform: 'web' | 'android',
): Promise<boolean> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return false

  const { error } = await supabase
    .from('release_acknowledgements')
    .delete()
    .match({ user_id: userId, version_code: versionCode, platform })
  return !error
}

/** Backward-compatible wrapper used by existing feature callers. */
export async function markReleaseAcknowledgedByUser(
  versionCode: number,
  platform: 'web' | 'android',
  expectedUserId?: string,
): Promise<{ acknowledged: boolean; persisted: boolean; record?: AcknowledgedRelease }> {
  const record = await persistAcknowledgedRelease(versionCode, platform, expectedUserId)
  return { acknowledged: true, persisted: true, record }
}
