import { supabase } from '@/supabase'
import {
  classifyPolicyFetch,
  type ClassifiedPolicyFetch,
} from '@/domain/appUpdate/policyFetchResult'

/**
 * Release-policy client: BIGDROPS-controlled metadata from Supabase.
 *
 * One RPC returns the active policy row plus the database server's
 * current time. Server time is the trusted anchor for the 3-day grace
 * deadline; the device clock is only a fallback when the policy source
 * itself is reachable (otherwise nothing mandatory can be established).
 *
 * Transport failures resolve to available:false with diagnosis
 * 'transport-error'. A reachable-but-empty source resolves to
 * available:true with a null policy (genuinely no update configured).
 * Malformed rows resolve to available:true with a null policy and
 * diagnosis 'malformed'. The caller fails safe in all three cases
 * (never block on missing metadata).
 */
/** Fetch result: validated policy plus safe fetch diagnostics. */
export type ReleasePolicyResult = ClassifiedPolicyFetch

export async function fetchReleasePolicy(): Promise<ReleasePolicyResult> {
  try {
    const { data, error } = await supabase.rpc('get_active_android_release_policy')
    return classifyPolicyFetch(data, error)
  } catch {
    return {
      available: false,
      policy: null,
      serverNowMs: null,
      diagnosis: 'transport-error',
      errorCode: null,
    }
  }
}
