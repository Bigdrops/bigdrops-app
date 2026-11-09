/**
 * User-facing copy for native APK download failures.
 *
 * Raw plugin errors can carry Java exception text (for example
 * "Invalid value for visibility: 2" from legacy native builds). That text
 * must never reach the user. Classification is pattern-based so both
 * legacy and sanitized native messages map to the same safe copy.
 */
export type DownloadFailureKind = 'start' | 'transfer' | 'unknown'

export function classifyDownloadFailure(rawMessage: string | null): DownloadFailureKind {
  if (!rawMessage) return 'unknown'
  const lower = rawMessage.toLowerCase()
  if (
    lower.includes('enqueue') ||
    lower.includes('could not start') ||
    lower.includes('visibility') ||
    lower.includes('could not prepare') ||
    lower.includes('download service unavailable')
  ) {
    return 'start'
  }
  if (lower.includes('status') || lower.includes('did not finish')) return 'transfer'
  return 'unknown'
}

/**
 * Safe failure copy. When a web release URL exists the caller opens it as
 * an automatic fallback, so the copy announces that instead of a retry.
 */
export function describeDownloadFailure(
  rawMessage: string | null,
  options: { webFallbackAvailable: boolean },
): string {
  const kind = classifyDownloadFailure(rawMessage)
  const lead =
    kind === 'start'
      ? 'The in-app download could not start.'
      : kind === 'transfer'
        ? 'The download did not finish.'
        : 'The download failed.'
  const tail = options.webFallbackAvailable
    ? ' The web download page is opening instead.'
    : ' Check your connection and try again.'
  return lead + tail
}