/**
 * Android Update Experience — preview domain.
 *
 * Pure helpers behind the Design Lab prototype. Nothing here reads or writes
 * production update state: no release policy, no native downloader, no
 * acknowledgement or dismissal storage. Every value is derived from the
 * arguments, so the prototype's behaviour is testable without a renderer.
 *
 * The prototype deliberately reuses the production *display* contract where it
 * is safe to do so — `describeGraceRemaining` for the countdown shape and
 * `parseReleaseNotes` for the release-note entries — so the preview shows the
 * real presentation rather than an imitation of it.
 */

import { describeGraceRemaining, type GraceRemaining } from '@/domain/appUpdate/updateStateMachine'

/** Sample release identity. Preview data only — never written to a policy row. */
export const PREVIEW_RELEASE = {
  versionName: '1.0.29',
  versionCode: 29,
  versionLabel: 'v1.0.29',
  /** Fixed, clearly-labelled preview deadline: 2d 23h 59m from first mount. */
  graceWindowMs: ((2 * 24 + 23) * 60 + 59) * 60 * 1000,
  /** Sample asset size, matching the reference composition. */
  totalBytes: Math.round(30.2 * 1024 * 1024),
} as const

/**
 * Sample release notes, shaped like a real `release_notes` field so the
 * production parser produces the production entry structure.
 */
export const PREVIEW_RELEASE_NOTES = [
  '- Faster invoice list loading on low-bandwidth connections',
  '- Waybill PDF — corrected the consignee address block on the commercial template',
  '- Quotations: duplicate action added to the quote detail screen',
  '- Purchase orders: supplier search now matches on partial names',
  '- Cost and pricing sheets: the margin column keeps its width when reopened',
].join('\n')

/** One-line preview summary shown while the notes are collapsed. */
export const PREVIEW_RELEASE_SUMMARY = 'Maintenance and performance update.'

export type PreviewPhase = 'idle' | 'downloading' | 'downloaded' | 'installing'

/** Reviewer-selectable states, in control order. */
export const PREVIEW_PHASES: ReadonlyArray<{ id: PreviewPhase; label: string }> = [
  { id: 'idle', label: 'Available' },
  { id: 'downloading', label: 'Downloading' },
  { id: 'downloaded', label: 'Complete' },
  { id: 'installing', label: 'Installing' },
]

/**
 * Countdown readout including seconds.
 *
 * `describeGraceRemaining` floors to whole minutes, which is right for the
 * production dialog but cannot tick every second. This wrapper keeps that
 * function as the source of truth for days/hours/minutes and adds only the
 * second component, so the two never disagree.
 */
export interface CountdownReadout extends GraceRemaining {
  seconds: number
  /** `2d 23h 59m 47s`, or `Expired` once the deadline passes. */
  label: string
}

export function describeCountdown(graceDeadlineMs: number, nowMs: number): CountdownReadout {
  const remainingMs = graceDeadlineMs - nowMs
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, label: 'Expired' }
  }

  const whole = describeGraceRemaining(graceDeadlineMs, nowMs)
  const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000)
  const label = `${whole.days}d ${whole.hours}h ${whole.minutes}m ${seconds}s`

  return { ...whole, seconds, label }
}

/**
 * Transfer speed from two byte samples.
 *
 * Returns `null` until a valid sample pair exists, which is what lets the
 * prototype show "Calculating…" instead of inventing a number on the first
 * frame. A non-advancing or backwards sample also yields `null`.
 */
export function computeTransferBytesPerSecond(
  previous: { bytes: number; atMs: number } | null,
  current: { bytes: number; atMs: number },
): number | null {
  if (!previous) return null
  const elapsedMs = current.atMs - previous.atMs
  const deltaBytes = current.bytes - previous.bytes
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return null
  if (!Number.isFinite(deltaBytes) || deltaBytes <= 0) return null
  return deltaBytes / (elapsedMs / 1000)
}

/** `≈ 1.2 MB/s`, or `Calculating…` while no valid sample exists. */
export function formatTransferSpeed(bytesPerSecond: number | null): string {
  if (bytesPerSecond === null || !Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) {
    return 'Calculating…'
  }
  const megabytes = bytesPerSecond / (1024 * 1024)
  if (megabytes >= 1) return `≈ ${megabytes.toFixed(1)} MB/s`
  return `≈ ${Math.round(bytesPerSecond / 1024)} KB/s`
}

/** `11.6 MB of 30.2 MB` */
export function formatTransferProgress(downloadedBytes: number, totalBytes: number): string {
  const toMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1)
  return `${toMb(downloadedBytes)} MB of ${toMb(totalBytes)} MB`
}

/** `30.2 MB` — a single asset size, with no "of" comparison. */
export function formatAssetSize(totalBytes: number): string {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) return '—'
  return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Whole-percent progress, clamped. */
export function computePercentage(downloadedBytes: number, totalBytes: number): number {
  if (!Number.isFinite(downloadedBytes) || !Number.isFinite(totalBytes) || totalBytes <= 0) return 0
  return Math.min(100, Math.max(0, (downloadedBytes / totalBytes) * 100))
}

/**
 * Dismissal is permitted only while the grace period is still running. Once
 * the deadline passes the update is enforced, so the dialog offers no dismiss
 * control — matching the production rule that a blocked update cannot be
 * waved away.
 */
export function canDismiss(graceDeadlineMs: number, nowMs: number): boolean {
  return graceDeadlineMs - nowMs > 0
}

/** Primary action label for each phase. */
export function primaryActionLabel(phase: PreviewPhase, versionLabel: string): string {
  switch (phase) {
    case 'downloading':
      return 'Cancel download'
    case 'downloaded':
      return 'Open & Install Update'
    case 'installing':
      return 'Installing…'
    case 'idle':
    default:
      return `Download & install ${versionLabel}`
  }
}
