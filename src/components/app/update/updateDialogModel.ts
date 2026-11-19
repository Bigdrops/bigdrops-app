/**
 * Pure presentation helpers for the production Android update dialog.
 *
 * Every value here is derived from the real `useAppUpdate` result or from the
 * validated release policy. Nothing in this module invents a deadline, a
 * transfer size, a speed, or release copy. The Design Lab prototype keeps its
 * own isolated domain; production deliberately does not import from it.
 */

import type { ChangelogEntry } from '@/domain/appUpdate/changelog'
import {
  describeGraceRemaining,
  type GraceRemaining,
} from '@/domain/appUpdate/updateStateMachine'
import type { DownloadPhase } from '@/hooks/useAppUpdate'

/** Countdown readout with the live second component the domain helper omits. */
export interface CountdownReadout extends GraceRemaining {
  seconds: number
  /** `2d 23h 59m 47s`, or the enforced label once the deadline passes. */
  label: string
}

/**
 * Keeps `describeGraceRemaining` as the source of truth for days/hours/minutes
 * and adds only the second component, so the two can never disagree.
 */
export function describeCountdown(deadlineMs: number, nowMs: number): CountdownReadout {
  const remainingMs = deadlineMs - nowMs
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return {
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: 'Grace period ended',
    }
  }

  const whole = describeGraceRemaining(deadlineMs, nowMs)
  const seconds = Math.floor((remainingMs % 60_000) / 1000)
  return {
    ...whole,
    seconds,
    label: `${whole.days}d ${whole.hours}h ${whole.minutes}m ${seconds}s`,
  }
}

export interface ByteSample {
  bytes: number
  atMs: number
}

/** Two samples closer than this cannot produce an honest speed readout. */
export const SPEED_SAMPLE_MIN_MS = 300

/**
 * Bytes-per-second from two JS-sampled cumulative byte counts. Returns null
 * until a valid pair exists: no first-frame guess, no non-advancing reading.
 */
export function sampleTransferSpeed(
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

/** `≈ 1.2 MB/s`, or `Calculating…` while no valid sample pair exists. */
export function formatTransferSpeed(bytesPerSecond: number | null): string {
  if (bytesPerSecond === null || !Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) {
    return 'Calculating…'
  }
  const megabytes = bytesPerSecond / (1024 * 1024)
  const digits = megabytes < 0.1 ? 2 : 1
  return `≈ ${megabytes.toFixed(digits)} MB/s`
}

/**
 * Whole-percent progress, clamped. Returns null when the total is unknown or
 * non-positive so callers can hide the percentage instead of printing a fake.
 */
export function computePercentage(
  downloadedBytes: number,
  totalBytes: number | null,
): number | null {
  if (totalBytes === null || !Number.isFinite(totalBytes) || totalBytes <= 0) return null
  if (!Number.isFinite(downloadedBytes) || downloadedBytes < 0) return 0
  return Math.min(100, (downloadedBytes / totalBytes) * 100)
}

/** Primary action label derived from the real download phase. */
export function primaryActionLabel(phase: DownloadPhase, versionLabel: string): string {
  switch (phase.kind) {
    case 'downloading':
      return 'Cancel download'
    case 'downloaded':
      return 'Open & Install Update'
    case 'installing':
      return 'Installing…'
    case 'failed':
    case 'idle':
    default:
      return `Download & install ${versionLabel}`
  }
}

/** Collapsed release-note summary: the first real entry title, or an honest empty state. */
export function releaseNotesSummary(entries: ChangelogEntry[]): string {
  if (entries.length === 0) return 'No release notes published for this build.'
  return entries[0].title
}
