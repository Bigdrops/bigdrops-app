/**
 * Safe structured diagnostics for the Android update pipeline.
 *
 * Secrets-free by construction: only reason codes, booleans, and a
 * sanitized error code leave this module. RPC messages, URLs, headers,
 * tokens, and raw error objects are never captured or logged.
 */
import type { PolicyFetchDiagnosis } from '@/domain/appUpdate/policyFetchResult'

export type CheckReason =
  | 'ok'
  | 'policy-fetch-error'
  | 'policy-malformed'
  | 'version-unknown'
  | 'unexpected-error'
  | 'throttled-local'

export type DiscoveryOutcome = 'not-attempted' | 'success' | 'failed'

export interface CheckDiagnostics {
  reason: CheckReason
  forced: boolean
  joinedInFlight: boolean
  policy: PolicyFetchDiagnosis
  discovery: DiscoveryOutcome
  /** Safe PostgREST/RPC error code only. Never a message, URL, or secret. */
  errorCode: string | null
}

/** Single-line sanitized log payload. Contains no secrets by construction. */
export function buildDiagnosticLogLine(diag: CheckDiagnostics): string {
  return (
    `[AppUpdate] check reason=${diag.reason} forced=${diag.forced ? 'yes' : 'no'}` +
    ` joined=${diag.joinedInFlight ? 'yes' : 'no'} policy=${diag.policy}` +
    ` discovery=${diag.discovery} code=${diag.errorCode ?? 'none'}`
  )
}

/**
 * Emits the diagnostic line to the WebView console (capturable via adb
 * logcat / chrome://inspect). Always sanitized. Low volume: only fresh
 * full checks log, never throttled local re-evaluations.
 */
export function logAppUpdateDiagnostic(diag: CheckDiagnostics): void {
  try {
    console.info(buildDiagnosticLogLine(diag))
  } catch {
    // Logging must never break the update flow.
  }
}
