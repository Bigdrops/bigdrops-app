import { validateReleasePolicy, type ReleasePolicyInput } from './updateStateMachine'

/**
 * Pure classification of one policy-fetch outcome.
 *
 * Dependency-free (domain layer) so the transport/no-row/malformed/valid
 * contracts are unit-testable without Supabase mocking. The lib client
 * performs the fetch and delegates to `classifyPolicyFetch`.
 */
export type PolicyFetchDiagnosis = 'valid' | 'transport-error' | 'no-row' | 'malformed'

export interface ClassifiedPolicyFetch {
  available: boolean
  policy: ReleasePolicyInput | null
  serverNowMs: number | null
  diagnosis: PolicyFetchDiagnosis
  /** Safe RPC error code only. Never a message, URL, or secret. */
  errorCode: string | null
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

/** Extracts only a safe error code from an unknown RPC error value. */
export function sanitizeErrorCode(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const code = (value as Record<string, unknown>).code
  return typeof code === 'string' && code.trim().length > 0 ? code.trim() : null
}

export function classifyPolicyFetch(data: unknown, error: unknown): ClassifiedPolicyFetch {
  if (error) {
    return {
      available: false,
      policy: null,
      serverNowMs: null,
      diagnosis: 'transport-error',
      errorCode: sanitizeErrorCode(error),
    }
  }

  // RPC returns one row (id = 1) or nothing.
  const rows = Array.isArray(data) ? (data as PolicyRpcRow[]) : data ? [data as PolicyRpcRow] : []
  const row = rows[0] ?? null

  if (!row) {
    // No policy row: genuinely no update configured.
    return { available: true, policy: null, serverNowMs: null, diagnosis: 'no-row', errorCode: null }
  }

  const serverNowMs = toEpochMs(row.server_now)
  const policy = validateReleasePolicy(row)

  if (!policy) {
    return { available: true, policy: null, serverNowMs, diagnosis: 'malformed', errorCode: null }
  }

  return { available: true, policy, serverNowMs, diagnosis: 'valid', errorCode: null }
}
