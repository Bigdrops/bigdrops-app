import { supabase } from '@/supabase'
import { validateReleasePolicy, type ReleasePolicyInput } from '@/domain/appUpdate/updateStateMachine'

/**
 * Release-policy client: BIGDROPS-controlled metadata from Supabase.
 *
 * One RPC returns the active policy row plus the database server's
 * current time. Server time is the trusted anchor for the 3-day grace
 * deadline; the device clock is only a fallback when the policy source
 * itself is reachable (otherwise nothing mandatory can be established).
 *
 * Errors and malformed rows both resolve to { available: false } so the
 * caller's fail-safe path applies (never block on missing metadata).
 */
export interface ReleasePolicyResult {
  available: boolean
  /** Validated policy, or null when unavailable/malformed/empty. */
  policy: ReleasePolicyInput | null
  /** Database server time in ms at fetch time. null when unavailable. */
  serverNowMs: number | null
}

interface PolicyRpcRow {
  version_code: unknown
  version_name: unknown
  mandatory: unknown
  effective_at: unknown
  apk_asset_prefix: unknown
  web_release_url: unknown
  release_notes: unknown
  server_now: unknown
}

function toEpochMs(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = new Date(String(value)).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

export async function fetchReleasePolicy(): Promise<ReleasePolicyResult> {
  try {
    const { data, error } = await supabase.rpc('get_active_android_release_policy')

    if (error) {
      return { available: false, policy: null, serverNowMs: null }
    }

    // RPC returns one row (id = 1) or nothing.
    const rows = Array.isArray(data) ? (data as PolicyRpcRow[]) : data ? [data as PolicyRpcRow] : []
    const row = rows[0]

    if (!row) {
      // No policy row: genuinely no update configured.
      return { available: true, policy: null, serverNowMs: null }
    }

    const serverNowMs = toEpochMs(row.server_now)
    const policy = validateReleasePolicy(row)

    return { available: true, policy, serverNowMs }
  } catch {
    return { available: false, policy: null, serverNowMs: null }
  }
}
