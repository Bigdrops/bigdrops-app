/**
 * Android mandatory-update state machine.
 *
 * Pure domain logic: no Capacitor, no Supabase, no storage access.
 * The lib layer feeds it inputs; the lib layer persists its outputs.
 *
 * Policy source: BIGDROPS-controlled Supabase table (app_release_policy).
 * APK distribution: GitHub Releases (asset names only, per contract).
 * The two are deliberately separated. A GitHub asset is never trusted on
 * its own; the policy row decides what is mandatory and when.
 *
 * Grace rule: 3 days from when a mandatory target was first established
 * on this device. The anchor is trusted server time when available. The
 * state machine itself is clock-agnostic: it receives one `nowMs` and the
 * caller decides whether it came from the server or the device clock.
 *
 * Fail-safe rule: an unavailable policy source never blocks a valid
 * install. Only locally persisted, already-expired grace state can block.
 */

// ── Constants ──────────────────────────────────────────────────────────

/** Grace period after a mandatory update becomes effective. */
export const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000

/** Minimum interval between release-policy fetches (resumes loop guard). */
export const MIN_POLICY_FETCH_INTERVAL_MS = 6 * 60 * 60 * 1000

// ── Types ──────────────────────────────────────────────────────────────

/** Validated, BIGDROPS-controlled policy row (from Supabase). */
export interface ReleasePolicyInput {
  /** Required Android versionCode of the target release. */
  versionCode: number
  /** Human-readable versionName. Display only. */
  versionName: string | null
  /** true = 3-day grace period applies; false = optional update. */
  mandatory: boolean
  /** Server timestamp (ms) when the mandatory countdown starts. */
  effectiveAtMs: number | null
  /** Required APK asset name prefix, e.g. "BIGDROPS-test-release-". */
  apkAssetPrefix: string
  /** Approved external release/download destination (https only). */
  webReleaseUrl: string | null
  /** Optional display text. */
  releaseNotes: string | null
}

/** Locally persisted grace anchor for one mandatory target release. */
export interface PersistedGraceState {
  /** Target release this anchor belongs to. */
  versionCode: number
  /** Trusted server time (ms) when the mandatory state was first established. */
  anchoredAtMs: number
  /** serverNow - deviceNow measured at anchor time. Best-effort fallback only. */
  deviceClockSkewMs: number
}

export type AppUpdateStatus =
  | 'up_to_date'
  | 'available'
  | 'grace'
  | 'blocked'
  | 'unavailable'

export interface UpdateState {
  status: AppUpdateStatus
  /** Validated policy when one was available and parseable. */
  policy: ReleasePolicyInput | null
  /** Absolute grace deadline in ms, for grace/blocked states. */
  graceDeadlineMs: number | null
  /** Anchor that must be persisted (new or changed anchor only). */
  graceAnchorToPersist: PersistedGraceState | null
  /** Persisted state is obsolete (installed >= target) and must be cleared. */
  clearPersistedState: boolean
}

export interface UpdateStateInput {
  /** False when the policy fetch failed or was skipped (metadata unavailable). */
  policyAvailable: boolean
  /** Installed Android versionCode. null = unknown (fail-safe: never block). */
  installedVersionCode: number | null
  /** Raw policy row (pre-validation) or null. */
  rawPolicy: unknown
  /** Locally persisted grace state, if any. */
  persisted: PersistedGraceState | null
  /** Decision time in ms. Server time when available, device time otherwise. */
  nowMs: number
}

// ── Validation ─────────────────────────────────────────────────────────

/** Parses a versionCode. Accepts numbers and numeric strings. Rejects 0/negative/non-integers. */
export function parseVersionCode(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null
  return n
}

/**
 * Extracts the build number from an Android versionName like "1.0.23"
 * (workflow convention: versionName = 1.0.<run_number>, the run number
 * maps 1:1 to the versionCode offset). Fallback when the plugin does not
 * expose versionCode directly. Returns null when the shape does not match.
 */
export function parseVersionNameBuild(versionName: string | null | undefined): number | null {
  if (!versionName || typeof versionName !== 'string') return null
  const segments = versionName.trim().split('.')
  const last = segments[segments.length - 1]
  return parseVersionCode(last)
}

/**
 * Validates a raw policy row. Returns null for malformed or incomplete
 * data. The caller must treat null as "no valid policy" — never as a
 * valid update. This is the rejection point for malformed metadata.
 */
export function validateReleasePolicy(raw: unknown): ReleasePolicyInput | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null

  const row = raw as Record<string, unknown>

  const versionCode = parseVersionCode(row.version_code)
  if (versionCode === null) return null

  const mandatory = row.mandatory
  if (typeof mandatory !== 'boolean') return null

  const apkAssetPrefix = row.apk_asset_prefix
  if (typeof apkAssetPrefix !== 'string' || apkAssetPrefix.trim().length === 0) return null

  const versionName =
    typeof row.version_name === 'string' && row.version_name.trim().length > 0
      ? row.version_name.trim()
      : null

  let effectiveAtMs: number | null = null
  if (row.effective_at !== null && row.effective_at !== undefined) {
    const parsed = new Date(String(row.effective_at)).getTime()
    if (!Number.isFinite(parsed)) return null
    effectiveAtMs = parsed
  }

  let webReleaseUrl: string | null = null
  if (row.web_release_url !== null && row.web_release_url !== undefined) {
    const rawUrl = String(row.web_release_url).trim()
    if (rawUrl.length > 0) {
      try {
        const parsedUrl = new URL(rawUrl)
        if (parsedUrl.protocol !== 'https:') return null
        webReleaseUrl = rawUrl
      } catch {
        return null
      }
    }
  }

  const releaseNotes =
    typeof row.release_notes === 'string' && row.release_notes.trim().length > 0
      ? row.release_notes.trim()
      : null

  return { versionCode, versionName, mandatory, effectiveAtMs, apkAssetPrefix, webReleaseUrl, releaseNotes }
}

// ── Version comparison ─────────────────────────────────────────────────

/**
 * Deterministic Android-compatible comparison of versionCodes. Android
 * treats a higher versionCode as a newer build, so numeric comparison is
 * the platform-native rule. Never compare version strings lexicographically.
 */
export function compareVersionCodes(a: number, b: number): -1 | 0 | 1 {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

// ── Grace helpers ──────────────────────────────────────────────────────

export function isGraceExpired(graceDeadlineMs: number, nowMs: number): boolean {
  return nowMs >= graceDeadlineMs
}

export interface GraceRemaining {
  expired: boolean
  days: number
  hours: number
  minutes: number
}

/** Remaining grace time, floored, for display. */
export function describeGraceRemaining(graceDeadlineMs: number, nowMs: number): GraceRemaining {
  const remainingMs = graceDeadlineMs - nowMs
  if (remainingMs <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0 }
  }
  const totalMinutes = Math.floor(remainingMs / (60 * 1000))
  return {
    expired: false,
    days: Math.floor(totalMinutes / (60 * 24)),
    hours: Math.floor((totalMinutes % (60 * 24)) / 60),
    minutes: totalMinutes % 60,
  }
}

// ── State machine ──────────────────────────────────────────────────────

/**
 * Resolves the update state from all known inputs.
 *
 * Persistence rules:
 * - A genuinely newer mandatory target supersedes the stored anchor.
 * - The countdown is never reset on repeated checks for the same target.
 * - A stored anchor is cleared only when the installed version reaches
 *   the target (after restart on the new version) or the policy revokes it.
 */
export function resolveUpdateState(input: UpdateStateInput): UpdateState {
  const { policyAvailable, installedVersionCode, persisted, nowMs } = input

  const policy = policyAvailable ? validateReleasePolicy(input.rawPolicy) : null
  const base: UpdateState = {
    status: 'unavailable',
    policy,
    graceDeadlineMs: null,
    graceAnchorToPersist: null,
    clearPersistedState: false,
  }

  // No comparable policy: metadata unavailable, or fetched but empty.
  // Fail-safe: never block on missing metadata. A locally persisted
  // mandatory state still enforces its own deadline below.
  if (policy === null || installedVersionCode === null) {
    if (persisted !== null) {
      return resolveFromPersistedOnly(persisted, nowMs, policy)
    }
    // Metadata fetched but empty means genuinely no update; metadata
    // fetched but malformed is rejected and reported as unavailable.
    if (policyAvailable && input.rawPolicy == null) {
      return { ...base, status: 'up_to_date' }
    }
    return { ...base, status: 'unavailable' }
  }

  const comparison = compareVersionCodes(installedVersionCode, policy.versionCode)

  // Installed version has reached or passed the policy target: the gate
  // is obsolete. This is the path that clears state after the user
  // installs the update and the app restarts on the new version.
  if (comparison >= 0) {
    return { ...base, status: 'up_to_date', clearPersistedState: true }
  }

  // Newer release exists but is optional.
  if (!policy.mandatory) {
    return { ...base, status: 'available', clearPersistedState: true }
  }

  // Mandatory target: resolve the grace anchor.
  return resolveMandatoryTarget(policy, installedVersionCode, persisted, nowMs, base)
}

/** Mandatory update with an established anchor: resolve grace vs blocked. */
function resolveMandatoryTarget(
  policy: ReleasePolicyInput,
  installedVersionCode: number,
  persisted: PersistedGraceState | null,
  nowMs: number,
  base: UpdateState,
): UpdateState {
  const sameTargetPersisted = persisted !== null && persisted.versionCode === policy.versionCode

  // Never reset the countdown for the same target on repeated checks.
  let anchorMs: number
  if (sameTargetPersisted && persisted) {
    // A later re-anchored effective_at can only extend, never shorten,
    // an already-recorded countdown (BIGDROPS granting more time).
    const effectiveMs = policy.effectiveAtMs ?? 0
    anchorMs = Math.max(persisted.anchoredAtMs, effectiveMs)
  } else if (policy.effectiveAtMs !== null) {
    anchorMs = policy.effectiveAtMs
  } else {
    // No server effective_at: anchor at first seen. The caller persists
    // this anchor so restarts keep the original deadline.
    anchorMs = nowMs
  }

  const anchorChanged =
    !sameTargetPersisted ||
    (persisted !== null && persisted.anchoredAtMs !== anchorMs)

  const graceDeadlineMs = anchorMs + GRACE_PERIOD_MS
  const graceAnchorToPersist = anchorChanged
    ? {
        versionCode: policy.versionCode,
        anchoredAtMs: anchorMs,
        // Caller supplies the measured skew; the machine carries 0 when
        // the anchor came from trusted server time at call time.
        deviceClockSkewMs: sameTargetPersisted && persisted ? persisted.deviceClockSkewMs : 0,
      }
    : null

  const status: AppUpdateStatus = isGraceExpired(graceDeadlineMs, nowMs) ? 'blocked' : 'grace'

  return { ...base, status, graceDeadlineMs, graceAnchorToPersist }
}

/**
 * Policy source unreachable: fall back to locally persisted state only.
 * This is the deliberate fail-safe: a network outage cannot brick a
 * valid install, but an already-expired persisted deadline keeps
 * blocking until the update is installed or metadata says otherwise.
 */
function resolveFromPersistedOnly(
  persisted: PersistedGraceState,
  nowMs: number,
  policy: ReleasePolicyInput | null,
): UpdateState {
  const base: UpdateState = {
    status: 'unavailable',
    policy,
    graceDeadlineMs: null,
    graceAnchorToPersist: null,
    clearPersistedState: false,
  }

  // Installed version is unknown, so the gate cannot be proven obsolete.
  // The locally persisted deadline keeps enforcing (fail-safe rule).
  const graceDeadlineMs = persisted.anchoredAtMs + GRACE_PERIOD_MS
  const status: AppUpdateStatus = isGraceExpired(graceDeadlineMs, nowMs) ? 'blocked' : 'grace'
  return { ...base, status, graceDeadlineMs }
}
