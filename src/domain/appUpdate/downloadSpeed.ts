/**
 * Honest transfer-speed sampling for the in-app APK download.
 *
 * A speed is only reported once two cumulative byte counts at least 300ms
 * apart are available. No first-frame guess, no non-advancing reading.
 */

export interface ByteSample {
  bytes: number
  atMs: number
}

/** Two samples closer than this cannot produce an honest speed readout. */
export const SPEED_SAMPLE_MIN_MS = 300

/**
 * Bytes-per-second from two cumulative byte counts. Returns null until a
 * valid pair exists. Pure so it can be verified without mounting React.
 */
export function sampleDownloadSpeed(
  previous: ByteSample | null,
  current: ByteSample,
): number | null {
  if (!previous) return null
  const elapsedMs = current.atMs - previous.atMs
  const deltaBytes = current.bytes - previous.bytes
  if (!Number.isFinite(elapsedMs) || elapsedMs < SPEED_SAMPLE_MIN_MS) return null
  if (!Number.isFinite(deltaBytes) || deltaBytes <= 0) return null
  return deltaBytes / (elapsedMs / 1000)
}
