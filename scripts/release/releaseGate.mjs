#!/usr/bin/env node
/**
 * BOUXRE release gate (Phase 2.2).
 *
 * Approved model, as corrected after the Phase 2.1 audit:
 *   - release notes are computed from CHANGELOG.md at the exact BUILD_SHA;
 *   - consumed entry IDs live in a versioned consumed-ids.json ledger whose
 *     durable home is a GitHub Release asset (the Actions artifact is only a
 *     convenience copy);
 *   - tags and GitHub Releases are publication artifacts, never proof of
 *     consumption on their own;
 *   - archive requires BOTH a verified downloadable asset AND verified policy
 *     state;
 *   - missing, malformed or conflicting ledger data fails closed;
 *   - a restored entry is re-issued under a NEW id linked by `reissueOf`, so
 *     historical consumption records are never rewritten.
 *
 * All functions are pure. The CLI is a thin host wrapper: the workflow performs
 * curl/gh/git and passes observed values in. `loadChangelogAtSha` is the one
 * read-only git helper and accepts an injected reader for fixtures.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'

import {
  parseChangelog,
  archiveEntries,
  loadChangelogAtSha,
  createReissueId,
  ID_PATTERN,
} from './changelog.mjs'

/** v2 adds consumedEntryIds/buildSha aliases, reissue links and release identity. */
export const RECORD_SCHEMA = 2
export const SUPPORTED_SCHEMAS = [1, 2]
export const MIN_ASSET_BYTES = 1
export const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i
const SHA_PATTERN = /^[0-9a-f]{7,40}$/i
const HTML_COMMENT_LINE = /^\s*<!--[\s\S]*?-->\s*$/
const blank = (value) => value === null || value === undefined || String(value).trim() === ''

// ---------------------------------------------------------------------------
// Comment stripping / notes
// ---------------------------------------------------------------------------

/** Remove whole-line HTML comments (including ID comments) from note text. */
export function stripIdComments(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .filter((line) => !HTML_COMMENT_LINE.test(line))
    .join('\n')
}

export function hashNotes(text) {
  return createHash('sha256').update(String(text ?? '')).digest('hex')
}

/**
 * Build notes from already-loaded changelog text minus consumed IDs.
 * Text comes from the snapshot by ID; ID comments are stripped so they cannot
 * leak into parseReleaseNotes() on empty-bullet inputs.
 */
export function buildReleaseNotes(snapshotText, consumedIds = []) {
  const model = parseChangelog(snapshotText)
  const consumed = new Set(consumedIds)
  const included = []
  for (const entry of model.unreleased) {
    if (!entry.id || entry.text == null) {
      throw new Error(`entry without ID or text in Unreleased: ${JSON.stringify(entry)}`)
    }
    if (consumed.has(entry.id)) continue
    included.push(entry)
  }
  const notes = stripIdComments(included.map((e) => `- ${e.text}`).join('\n'))
  return { notes, ids: included.map((e) => e.id), notesHash: hashNotes(notes) }
}

/**
 * True SHA snapshot: load CHANGELOG.md at <BUILD_SHA> with `git show`, then
 * build notes. A missing file at a real commit is an empty snapshot; a bad ref
 * is an error. `readSnapshot(sha, opts)` may be injected for fixtures.
 */
export function buildReleaseNotesForSha({ buildSha, consumedIds = [], readSnapshot, cwd }) {
  if (!FULL_SHA_PATTERN.test(String(buildSha ?? ''))) throw new Error('invalid build sha')
  const reader = readSnapshot || loadChangelogAtSha
  const snapshot = reader(buildSha, { cwd })
  const result = buildReleaseNotes(snapshot, consumedIds)
  return { ...result, buildSha, snapshot }
}

/**
 * Gather every consumed ID from a ledger, a single record, or legacy `ids`.
 * `beforeVersionCode` excludes the current release's own record, so a retry
 * recomputes the SAME notes it originally published instead of empty notes.
 */
export function collectConsumedIds(recordText, { beforeVersionCode = null } = {}) {
  if (!recordText || !String(recordText).trim()) return []
  const parsed = JSON.parse(String(recordText))
  const ids = []
  const take = (record) => {
    if (beforeVersionCode !== null && Number(record?.versionCode) >= Number(beforeVersionCode)) return
    if (Array.isArray(record?.consumedEntryIds)) ids.push(...record.consumedEntryIds)
    else if (Array.isArray(record?.ids)) ids.push(...record.ids)
  }
  if (Array.isArray(parsed.releases)) parsed.releases.forEach(take)
  else take(parsed)
  return [...new Set(ids)]
}

// ---------------------------------------------------------------------------
// Explicit consumed-ID record / ledger
// ---------------------------------------------------------------------------

/**
 * Create a validated record keyed to the verified build SHA and metadata.
 * Accepts legacy `sha`/`ids` inputs and emits both canonical v2 names and the
 * legacy aliases so older ledgers remain readable.
 */
export function createConsumedRecord({
  sha, buildSha, versionCode, versionName, tag, ids, consumedEntryIds, notesHash,
  webReleaseUrl = null, assetVerified = false, policyVerified = false,
  publishedAt = null, reissueOf = [], reissuedFrom = [],
  releaseTitle = null, releaseNotes = null, apkAssetName = null, apkSha256 = null,
  apkAssetPrefix = null,
}) {
  const resolvedSha = buildSha ?? sha
  const resolvedIds = consumedEntryIds ?? ids
  if (!SHA_PATTERN.test(String(resolvedSha ?? ''))) throw new Error('invalid build sha')
  if (!Number.isInteger(versionCode) || versionCode <= 0) throw new Error('invalid versionCode')
  if (!versionName || typeof versionName !== 'string') throw new Error('invalid versionName')
  if (!tag || typeof tag !== 'string') throw new Error('invalid tag')
  if (!Array.isArray(resolvedIds) || resolvedIds.some((id) => !ID_PATTERN.test(id))) {
    throw new Error('invalid entry ids')
  }
  if (new Set(resolvedIds).size !== resolvedIds.length) throw new Error('duplicate entry ids')
  if (!/^[0-9a-f]{64}$/i.test(String(notesHash ?? ''))) throw new Error('invalid notesHash')
  for (const [name, value] of [['reissueOf', reissueOf], ['reissuedFrom', reissuedFrom]]) {
    if (value != null && (!Array.isArray(value) || value.some((id) => !ID_PATTERN.test(id)))) {
      throw new Error(`invalid ${name}`)
    }
  }
  // A digest may be absent on legacy records, but if present it must be a
  // valid SHA-256. New records always carry it (workflow computes it).
  if (apkSha256 != null && !/^[0-9a-f]{64}$/i.test(String(apkSha256).trim())) {
    throw new Error('invalid apkSha256')
  }
  if (apkAssetPrefix != null && (typeof apkAssetPrefix !== 'string' || apkAssetPrefix.trim() === '')) {
    throw new Error('invalid apkAssetPrefix')
  }
  return {
    schema: RECORD_SCHEMA,
    buildSha: resolvedSha,
    sha: resolvedSha,
    versionCode,
    versionName,
    tag,
    consumedEntryIds: [...resolvedIds],
    ids: [...resolvedIds],
    notesHash,
    webReleaseUrl,
    assetVerified: Boolean(assetVerified),
    policyVerified: Boolean(policyVerified),
    publishedAt,
    reissueOf: [...(reissueOf || [])],
    reissuedFrom: [...(reissuedFrom || [])],
    releaseTitle,
    releaseNotes,
    apkAssetName,
    apkSha256,
    apkAssetPrefix: apkAssetPrefix ? String(apkAssetPrefix).trim() : null,
  }
}

export function serializeConsumedRecord(record) {
  return `${JSON.stringify(record, null, 2)}\n`
}

export function serializeLedger(records) {
  return `${JSON.stringify({ schema: RECORD_SCHEMA, releases: records }, null, 2)}\n`
}

function normalizeRecord(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('invalid consumed record')
  return createConsumedRecord({
    ...raw,
    buildSha: raw.buildSha ?? raw.sha,
    consumedEntryIds: raw.consumedEntryIds ?? raw.ids,
    apkAssetPrefix: raw.apkAssetPrefix ?? raw.apk_asset_prefix ?? null,
  })
}

export function parseConsumedRecord(text) {
  const parsed = JSON.parse(String(text ?? ''))
  if (!SUPPORTED_SCHEMAS.includes(parsed?.schema)) throw new Error('unsupported consumed record schema')
  return normalizeRecord(parsed)
}

/** Read either a single record or a ledger ({schema, releases[]}) as records. */
export function readConsumedRecords(text) {
  if (!text || !String(text).trim()) return []
  const parsed = JSON.parse(String(text))
  if (!SUPPORTED_SCHEMAS.includes(parsed?.schema)) throw new Error('unsupported consumed record schema')
  if (Array.isArray(parsed.releases)) return parsed.releases.map(normalizeRecord)
  return [normalizeRecord(parsed)]
}

/**
 * Fail-closed ledger loader. Missing ledger is allowed ONLY when the caller
 * explicitly marks a first-release bootstrap. Malformed JSON, unsupported
 * schema, or two different builds claiming the same versionCode are errors.
 */
export function loadLedger(text, { allowMissing = false } = {}) {
  if (blank(text)) {
    if (allowMissing) return { schema: RECORD_SCHEMA, releases: [] }
    throw new Error('consumed ledger is missing')
  }
  const records = readConsumedRecords(text)
  const byVersion = new Map()
  for (const record of records) {
    const prior = byVersion.get(record.versionCode)
    if (prior) {
      if (prior.buildSha.toLowerCase() !== record.buildSha.toLowerCase() || prior.tag !== record.tag) {
        throw new Error(`conflicting consumed records for version ${record.versionCode}`)
      }
      // Same version/build: keep the more complete (verified) record.
      if (record.assetVerified && record.policyVerified) byVersion.set(record.versionCode, record)
    } else {
      byVersion.set(record.versionCode, record)
    }
  }
  return { schema: RECORD_SCHEMA, releases: records }
}

/** Merge a new record without deleting or mutating historical records. */
export function mergeLedger(ledgerText, record, { allowMissing = false } = {}) {
  const ledger = loadLedger(ledgerText, { allowMissing })
  const same = ledger.releases.filter(
    (r) => r.versionCode === record.versionCode && r.buildSha.toLowerCase() === record.buildSha.toLowerCase(),
  )
  if (same.length > 0) {
    // Idempotent retry: replace only the identical-build record, keep the rest.
    const kept = ledger.releases.filter(
      (r) => !(r.versionCode === record.versionCode && r.buildSha.toLowerCase() === record.buildSha.toLowerCase()),
    )
    return serializeLedger([...kept, record])
  }
  return serializeLedger([...ledger.releases, record])
}

/**
 * Detect a previously published but unsynchronized release before starting a
 * newer one. Confirmed records with versionCode above the policy are candidates.
 * More than one candidate is ambiguous and fails closed.
 */
export function planReconciliation({ policyVersionCode, ledgerText }) {
  const ledger = loadLedger(ledgerText, { allowMissing: true })
  const code = blank(policyVersionCode) ? 0 : Number(policyVersionCode)
  if (!Number.isInteger(code) || code < 0) throw new Error('invalid policy version code')
  const ahead = ledger.releases
    .filter((r) => r.assetVerified && r.policyVerified && r.versionCode > code)
    .sort((a, b) => a.versionCode - b.versionCode)
  if (ahead.length === 0) return { action: 'none', release: null }
  if (ahead.length > 1) {
    return { action: 'conflict', release: null, reason: 'multiple confirmed releases ahead of policy' }
  }
  return { action: 'resume', release: ahead[0] }
}

/** Mint a new issuance ID for a restored entry; the original record stays intact. */
export function createReissue({ originalId, key, text = null }) {
  if (!ID_PATTERN.test(String(originalId ?? ''))) throw new Error('invalid original entry id')
  if (blank(key)) throw new Error('reissue key is required')
  const id = createReissueId(originalId, key)
  if (id === originalId) throw new Error('reissue id collided with original id')
  return { id, reissueOf: originalId, text }
}

// ---------------------------------------------------------------------------
// Asset verification (validates curl observations; curl itself stays in CI)
// ---------------------------------------------------------------------------

/** Normalize a SHA-256 digest for comparison; null means missing/malformed. */
function normalizeSha256(value) {
  const text = String(value ?? '').trim().toLowerCase()
  return /^[0-9a-f]{64}$/.test(text) ? text : null
}

/**
 * Verify a downloaded APK against the expected build digest.
 *
 * Fail closed: a missing or malformed expected digest, a missing or malformed
 * observed digest, or a mismatch is always a failure. The digest is computed
 * by the workflow from the actual signed APK bytes, never from a filename or
 * a Git commit SHA.
 */
export function verifyAssetDownload({
  httpCode, contentType = '', byteLength = 0, expectedSha256 = null, actualSha256 = null,
}) {
  const reasons = []
  const code = Number(httpCode)
  if (code !== 200) reasons.push(`HTTP ${code} (expected 200)`)
  const ct = String(contentType ?? '').toLowerCase()
  if (ct.includes('html')) reasons.push(`HTML content-type: ${contentType}`)
  const bytes = Number(byteLength)
  if (!Number.isFinite(bytes) || bytes < MIN_ASSET_BYTES) {
    reasons.push(`empty or invalid body: ${byteLength} bytes`)
  }
  const expected = normalizeSha256(expectedSha256)
  const actual = normalizeSha256(actualSha256)
  if (!expected) reasons.push('expected APK SHA-256 digest is missing or invalid')
  if (!actual) reasons.push('downloaded APK SHA-256 digest is missing or invalid')
  if (expected && actual && expected !== actual) reasons.push('APK SHA-256 digest mismatch')
  return { ok: reasons.length === 0, reasons }
}

// ---------------------------------------------------------------------------
// Policy version state
// ---------------------------------------------------------------------------

/** True when the row is the seeded initial state (all release metadata empty). */
export function isSeededPolicyRow(current) {
  return blank(current?.versionCode)
    && blank(current?.versionName)
    && blank(current?.webReleaseUrl)
    && blank(current?.releaseNotes)
    && blank(current?.effectiveAt)
}

/**
 * Evaluate the policy row against the proposed release.
 *   - seeded NULL version_code -> advance (explicit first-release bootstrap)
 *   - NULL with unexpected metadata -> conflict
 *   - lower proposed version -> reject (policy never moves backwards)
 *   - higher -> advance
 *   - equal + same build SHA/tag -> noop; different -> conflict
 */
export function evaluatePolicyState(current, proposed, prior = null) {
  if (blank(current?.versionCode)) {
    if (isSeededPolicyRow(current)) return { action: 'advance', reason: 'bootstrap from seeded NULL policy row' }
    return { action: 'conflict', reason: 'NULL version_code with unexpected release metadata' }
  }
  const curCode = Number(current?.versionCode)
  const nextCode = Number(proposed?.versionCode)
  if (!Number.isInteger(curCode) || curCode <= 0) {
    return { action: 'conflict', reason: 'invalid current version_code' }
  }
  if (!Number.isInteger(nextCode) || nextCode <= 0) {
    return { action: 'conflict', reason: 'invalid proposed version_code' }
  }
  if (nextCode < curCode) {
    return { action: 'reject', reason: `policy ${curCode} is ahead of proposed ${nextCode}` }
  }
  if (nextCode > curCode) {
    return { action: 'advance', reason: `policy ${curCode} -> ${nextCode}` }
  }

  const sameSha = String(prior?.buildSha ?? prior?.sha ?? '').toLowerCase()
    === String(proposed.buildSha ?? proposed.sha ?? '').toLowerCase()
  const sameTag = String(prior?.tag ?? '') === String(proposed.tag ?? '')

  if (prior) {
    // Build identity is SHA + tag. Recomputed IDs legitimately shrink after
    // the consumed record is committed, so they are NOT part of this check.
    if (sameSha && sameTag) return { action: 'noop', reason: 'same version, build SHA and tag' }
    return { action: 'conflict', reason: 'same version but build SHA or tag differs' }
  }

  const nameMatch = String(current.versionName ?? '') === String(proposed.versionName ?? '')
  const urlMatch = String(current.webReleaseUrl ?? '') === String(proposed.webReleaseUrl ?? '')
  const prefixMatch = proposed.apkAssetPrefix == null
    || String(current.apkAssetPrefix ?? '') === String(proposed.apkAssetPrefix ?? '')
  if (nameMatch && urlMatch && prefixMatch) {
    return { action: 'noop', reason: 'same version and identical policy metadata (no ledger record)' }
  }
  return { action: 'conflict', reason: 'same version but policy metadata differs' }
}

// ---------------------------------------------------------------------------
// Retry verification
// ---------------------------------------------------------------------------

/**
 * Verify an existing release against the expected build. Every mismatch is a
 * hard stop; a missing release is never treated as success.
 */
export function verifyExistingRelease({ expected = {}, observed = {} }) {
  const mismatches = []
  if (observed.exists !== true) return { ok: false, mismatches: ['release does not exist'] }
  const expSha = String(expected.buildSha ?? expected.sha ?? '').toLowerCase()
  if (String(observed.tagSha ?? '').toLowerCase() !== expSha) mismatches.push('tag SHA mismatch')
  if (String(observed.title ?? '') !== String(expected.releaseTitle ?? '')) mismatches.push('release title mismatch')
  if (String(observed.notesHash ?? '').toLowerCase() !== String(expected.notesHash ?? '').toLowerCase()) {
    mismatches.push('release notes mismatch')
  }
  if (observed.assetPresent === false) mismatches.push('APK asset missing from release')
  if (observed.assetName != null && String(observed.assetName) !== String(expected.apkAssetName ?? '')) {
    mismatches.push('APK asset name/build identity mismatch')
  }
  if (observed.assetVerified === false) mismatches.push('APK asset not downloadable')
  // APK build identity: both the GitHub Release asset and the Supabase-hosted
  // APK must carry the exact digest of the signed bytes built for this SHA.
  const expDigest = normalizeSha256(expected.apkSha256)
  if (expDigest) {
    for (const [field, label] of [
      ['apkSha256', 'GitHub APK'],
      ['hostedApkSha256', 'Supabase-hosted APK'],
    ]) {
      const got = normalizeSha256(observed[field])
      if (!got || got !== expDigest) mismatches.push(`${label} SHA-256 digest missing or mismatch`)
    }
  }
  if (expected.apkAssetPrefix != null && observed.apkAssetPrefix != null) {
    if (String(observed.apkAssetPrefix) !== String(expected.apkAssetPrefix)) {
      mismatches.push('APK asset prefix mismatch')
    }
  }
  if (observed.ledgerPresent === false) mismatches.push('consumed-ids.json asset missing')
  if (String(observed.ledgerSha ?? '').toLowerCase() !== expSha) mismatches.push('consumed-ids.json build SHA mismatch')
  if (observed.ledgerVersionCode != null && Number(observed.ledgerVersionCode) !== Number(expected.versionCode)) {
    mismatches.push('consumed-ids.json version mismatch')
  }
  if (observed.ledgerTag != null && String(observed.ledgerTag) !== String(expected.tag ?? '')) mismatches.push('consumed-ids.json tag mismatch')
  if (observed.policyAction && !['noop', 'advance'].includes(observed.policyAction)) {
    mismatches.push(`policy inconsistent: ${observed.policyAction}`)
  }
  return { ok: mismatches.length === 0, mismatches }
}

// ---------------------------------------------------------------------------
// Archive gating
// ---------------------------------------------------------------------------

/** Only IDs backed by BOTH verifications may be archived; tombstones excluded. */
export function selectArchivableIds({ unreleasedIds = [], record, tombstones = [] }) {
  if (!record || record.assetVerified !== true || record.policyVerified !== true) return []
  const allowed = new Set(record.consumedEntryIds ?? record.ids ?? [])
  const tomb = new Set(tombstones)
  return unreleasedIds.filter((id) => allowed.has(id) && !tomb.has(id))
}

// ---------------------------------------------------------------------------
// Storage retention (Supabase Storage: max 2 APKs, 14-day previous retention)
// ---------------------------------------------------------------------------

export const MAX_RETAINED_APKS = 2
export const PREVIOUS_APK_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

/**
 * Calculate the strict two-APK retention plan for Supabase Storage.
 *
 * Retention contract:
 * - Supabase Storage retains at most 2 APK objects in the release prefix.
 * - Retained APKs are:
 *   1. The latest successfully published and policy-synchronized release.
 *   2. Its immediately preceding successfully published and policy-synchronized release.
 * - First release: retain 1 APK.
 * - Second release: retain 2 APKs.
 * - Third release: delete the oldest APK immediately after the 3rd release is verified.
 * - Subsequent releases: retain the newest 2 and delete anything older.
 * - The previous APK expires after 14 days maximum age from its publishedAt timestamp.
 * - The latest APK NEVER expires under this policy.
 * - An unresolved recovery or withdrawal protects the last known-good APK.
 * - Fail closed: if verified is false, or inputs are invalid, returns deleteNames: []
 *   (never delete before full verification).
 * - Non-APK objects are never deleted.
 */
export function planStorageRetention({
  objects = [],
  ledgerText = '',
  currentVersionCode = null,
  now = new Date(),
  verified = false,
  unresolvedRecovery = false,
}) {
  if (!verified) {
    return { ok: false, keepNames: [], deleteNames: [], reason: 'unverified release' }
  }
  const curCode = Number(currentVersionCode)
  if (!Number.isInteger(curCode) || curCode <= 0) {
    return { ok: false, keepNames: [], deleteNames: [], reason: 'invalid currentVersionCode' }
  }
  if (!ledgerText || !String(ledgerText).trim()) {
    return { ok: false, keepNames: [], deleteNames: [], reason: 'missing or empty ledger' }
  }

  let ledger
  try {
    ledger = loadLedger(ledgerText, { allowMissing: false })
  } catch (err) {
    return { ok: false, keepNames: [], deleteNames: [], reason: `invalid ledger: ${err.message}` }
  }

  // Filter confirmed releases with valid APK asset names
  const confirmed = (ledger.releases || [])
    .filter((r) => r.assetVerified && r.policyVerified && Number.isInteger(r.versionCode) && r.versionCode > 0 && r.apkAssetName)
    .sort((a, b) => a.versionCode - b.versionCode)

  if (confirmed.length === 0) {
    return { ok: false, keepNames: [], deleteNames: [], reason: 'no confirmed releases found in ledger' }
  }

  // Find the latest confirmed release matching currentVersionCode
  const latestIndex = confirmed.findIndex((r) => r.versionCode === curCode)
  if (latestIndex === -1) {
    return { ok: false, keepNames: [], deleteNames: [], reason: `current version ${curCode} not confirmed in ledger` }
  }
  const latest = confirmed[latestIndex]

  // Immediately preceding confirmed release
  const prev = latestIndex > 0 ? confirmed[latestIndex - 1] : null

  const keepNames = [latest.apkAssetName]
  let prevExpired = false

  if (prev && prev.apkAssetName) {
    if (unresolvedRecovery) {
      // Unresolved recovery/withdrawal protects the previous known-good APK
      keepNames.push(prev.apkAssetName)
    } else {
      const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
      const publishedMs = prev.publishedAt ? new Date(prev.publishedAt).getTime() : NaN
      if (Number.isFinite(publishedMs) && Number.isFinite(nowMs)) {
        const ageMs = nowMs - publishedMs
        if (ageMs > PREVIOUS_APK_MAX_AGE_MS) {
          prevExpired = true
        } else {
          keepNames.push(prev.apkAssetName)
        }
      } else {
        // If timestamp is unparseable or missing, fail closed: keep it rather than risk premature deletion
        keepNames.push(prev.apkAssetName)
      }
    }
  }

  const keepSet = new Set(keepNames.map((n) => n.trim().toLowerCase()))
  const deleteNames = []

  for (const item of objects) {
    const rawName = typeof item === 'string' ? item : item?.name
    if (!rawName || typeof rawName !== 'string') continue
    const name = rawName.trim()
    if (!name.toLowerCase().endsWith('.apk')) continue
    if (!keepSet.has(name.toLowerCase())) {
      deleteNames.push(name)
    }
  }

  return {
    ok: true,
    keepNames,
    deleteNames,
    latestName: latest.apkAssetName,
    previousName: prev?.apkAssetName ?? null,
    prevExpired,
    totalApkCountBefore: objects.filter((o) => (typeof o === 'string' ? o : o?.name)?.toLowerCase?.()?.endsWith('.apk')).length,
    expectedCountAfter: keepNames.length,
  }
}

/**
 * Verify post-cleanup storage objects against the 2-APK retention invariant.
 *
 * Invariant:
 * - Number of APK objects in release prefix must be <= MAX_RETAINED_APKS (2).
 * - Every retained APK object MUST be in expectedKeepNames.
 * - The latest active release APK MUST be present.
 */
export function verifyStorageRetentionInvariant({
  objects = [],
  expectedKeepNames = [],
  latestApkName,
}) {
  const mismatches = []
  const apkObjects = []
  for (const item of objects) {
    const rawName = typeof item === 'string' ? item : item?.name
    if (!rawName || typeof rawName !== 'string') continue
    const name = rawName.trim()
    if (name.toLowerCase().endsWith('.apk')) {
      apkObjects.push(name)
    }
  }

  if (apkObjects.length > MAX_RETAINED_APKS) {
    mismatches.push(`retained ${apkObjects.length} APK objects, exceeds maximum of ${MAX_RETAINED_APKS}`)
  }

  const keepSet = new Set(expectedKeepNames.map((n) => n.trim().toLowerCase()))
  for (const name of apkObjects) {
    if (!keepSet.has(name.toLowerCase())) {
      mismatches.push(`unexpected APK object retained in storage: ${name}`)
    }
  }

  if (latestApkName) {
    const hasLatest = apkObjects.some((n) => n.toLowerCase() === latestApkName.trim().toLowerCase())
    if (!hasLatest) {
      mismatches.push(`latest active APK ${latestApkName} is missing from storage`)
    }
  }

  return {
    ok: mismatches.length === 0,
    retainedCount: apkObjects.length,
    mismatches,
  }
}

/**
 * Identify stale APK objects in Supabase Storage to prune.
 *
 * Supabase Storage holds ONLY 1 APK (the latest release APK). Historical APKs
 * are preserved indefinitely on their respective GitHub Releases.
 *
 * Safety guards:
 * - If verified is false (upload or SHA-256 verification not confirmed), returns []
 *   (never prune before verification succeeds).
 * - Only objects ending in '.apk' (case-insensitive) are candidates.
 * - The object matching keepName is retained.
 * - Normalizes object names whether passed as strings or { name: string } objects.
 */
export function filterStaleApkObjects({ objects = [], keepName, verified = false }) {
  if (!verified) return []
  if (!keepName || typeof keepName !== 'string') return []
  const target = keepName.trim().toLowerCase()
  const stale = []
  for (const item of objects) {
    const rawName = typeof item === 'string' ? item : item?.name
    if (!rawName || typeof rawName !== 'string') continue
    const name = rawName.trim()
    if (!name.toLowerCase().endsWith('.apk')) continue
    if (name.toLowerCase() === target) continue
    stale.push(name)
  }
  return stale
}

// ---------------------------------------------------------------------------
// CLI (thin host wrapper)
// ---------------------------------------------------------------------------

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function write(path, content) {
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(path, content, 'utf8')
}

function parseJsonFile(path) {
  return JSON.parse(read(path))
}

function firstRow(value) {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/** Map the live policy row's snake_case columns to the gate's field names. */
function normalizePolicyRow(row) {
  if (!row || typeof row !== 'object') return row
  return {
    versionCode: row.version_code ?? row.versionCode,
    versionName: row.version_name ?? row.versionName,
    webReleaseUrl: row.web_release_url ?? row.webReleaseUrl,
    releaseNotes: row.release_notes ?? row.releaseNotes,
    effectiveAt: row.effective_at ?? row.effectiveAt,
    mandatory: row.mandatory,
    apkAssetPrefix: row.apk_asset_prefix ?? row.apkAssetPrefix ?? null,
  }
}

export function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv
  const root = resolvePath(process.cwd())
  const abs = (p) => resolvePath(root, p)
  const flag = (name) => {
    const i = rest.indexOf(`--${name}`)
    return i === -1 ? null : rest[i + 1] ?? null
  }
  const boolFlag = (name) => {
    const value = flag(name)
    if (value === null) return false
    if (value === 'true') return true
    if (value === 'false') return false
    throw new Error(`--${name} must be true or false`)
  }

  switch (command) {
    case 'snapshot': {
      const sha = flag('sha')
      if (!sha) throw new Error('--sha <build-sha> is required')
      const text = loadChangelogAtSha(sha, { cwd: root })
      const out = flag('out')
      if (out) write(abs(out), text)
      else process.stdout.write(text)
      return
    }
    case 'build-notes': {
      const headPath = flag('head')
      const sha = flag('sha')
      if (!headPath && !sha) throw new Error('--sha <build-sha> or --head <CHANGELOG.md> is required')
      const ledgerPath = flag('ledger') || flag('consumed')
      const allowMissing = boolFlag('allow-missing-ledger')
      const rawBefore = flag('before-version-code')
      const beforeVersionCode = rawBefore === null || rawBefore === 'null' ? null : Number(rawBefore)
      const ledgerText = ledgerPath && existsSync(abs(ledgerPath)) ? read(abs(ledgerPath)) : ''
      const consumed = collectConsumedIds(ledgerText, { beforeVersionCode })
      if (!headPath && !allowMissing && blank(ledgerText)) {
        throw new Error('consumed ledger is missing; pass --allow-missing-ledger only for a first release')
      }
      const result = sha
        ? buildReleaseNotesForSha({ buildSha: sha, consumedIds: consumed, cwd: root })
        : buildReleaseNotes(read(abs(headPath)), consumed)
      const outPath = flag('out')
      if (outPath) write(abs(outPath), result.notes)
      const idsPath = flag('ids-out')
      if (idsPath) write(abs(idsPath), `${JSON.stringify(result.ids)}\n`)
      process.stdout.write(`${JSON.stringify({ ids: result.ids, notesHash: result.notesHash, buildSha: result.buildSha ?? null })}\n`)
      return
    }
    case 'strip-comments': {
      const inPath = flag('file')
      if (!inPath) throw new Error('--file <path> is required')
      const stripped = stripIdComments(read(abs(inPath)))
      const outPath = flag('out')
      if (outPath) write(abs(outPath), stripped)
      else process.stdout.write(stripped)
      return
    }
    case 'hash-notes': {
      const inPath = flag('file')
      if (!inPath) throw new Error('--file <path> is required')
      process.stdout.write(`${hashNotes(read(abs(inPath)))}\n`)
      return
    }
    case 'verify-asset': {
      const result = verifyAssetDownload({
        httpCode: flag('http-code'),
        contentType: flag('content-type') ?? '',
        byteLength: flag('bytes') ?? 0,
        expectedSha256: flag('expected-sha256'),
        actualSha256: flag('actual-sha256'),
      })
      if (!result.ok) {
        process.stderr.write(`${result.reasons.join('\n')}\n`)
        process.exitCode = 1
      } else {
        process.stdout.write('asset OK\n')
      }
      return
    }
    case 'record': {
      const idsPath = flag('ids-file')
      const notesPath = flag('notes-file')
      if (!idsPath || !notesPath) throw new Error('--ids-file and --notes-file are required')
      const record = createConsumedRecord({
        buildSha: flag('sha'),
        versionCode: Number(flag('version-code')),
        versionName: flag('version-name'),
        tag: flag('tag'),
        consumedEntryIds: parseJsonFile(abs(idsPath)),
        notesHash: hashNotes(read(abs(notesPath))),
        webReleaseUrl: flag('web-release-url'),
        assetVerified: boolFlag('asset-verified'),
        policyVerified: boolFlag('policy-verified'),
        publishedAt: flag('published-at'),
        releaseTitle: flag('release-title'),
        releaseNotes: flag('release-notes-file') ? read(abs(flag('release-notes-file'))) : null,
        apkAssetName: flag('apk-asset-name'),
        apkSha256: flag('apk-sha256'),
        apkAssetPrefix: flag('apk-asset-prefix'),
      })
      const outPath = flag('out')
      if (outPath) write(abs(outPath), serializeConsumedRecord(record))
      process.stdout.write(`${JSON.stringify(record)}\n`)
      return
    }
    case 'filter-stale-apks': {
      const objectsPath = flag('objects')
      if (!objectsPath) throw new Error('--objects <json-file> is required')
      const keep = flag('keep')
      if (!keep) throw new Error('--keep <object-name> is required')
      const verified = boolFlag('verified')
      const raw = JSON.parse(read(abs(objectsPath)))
      const list = Array.isArray(raw) ? raw : (raw?.objects ?? [])
      const stale = filterStaleApkObjects({ objects: list, keepName: keep, verified })
      const outPath = flag('out')
      if (outPath) write(abs(outPath), `${JSON.stringify(stale)}\n`)
      process.stdout.write(`${JSON.stringify(stale)}\n`)
      return
    }
    case 'plan-storage-retention': {
      const objectsPath = flag('objects')
      if (!objectsPath) throw new Error('--objects <json-file> is required')
      const ledgerPath = flag('ledger')
      if (!ledgerPath) throw new Error('--ledger <ledger-file> is required')
      const versionCode = Number(flag('version-code'))
      const verified = boolFlag('verified')
      const unresolvedRecovery = flag('unresolved-recovery') === 'true'
      const rawNow = flag('now')
      const now = rawNow ? new Date(rawNow) : new Date()

      const raw = JSON.parse(read(abs(objectsPath)))
      const list = Array.isArray(raw) ? raw : (raw?.objects ?? [])
      const ledgerText = read(abs(ledgerPath))

      const plan = planStorageRetention({
        objects: list,
        ledgerText,
        currentVersionCode: versionCode,
        now,
        verified,
        unresolvedRecovery,
      })

      const outPath = flag('out')
      if (outPath) write(abs(outPath), `${JSON.stringify(plan)}\n`)
      process.stdout.write(`${JSON.stringify(plan)}\n`)
      if (!plan.ok) {
        process.stderr.write(`retention plan error: ${plan.reason}\n`)
        process.exitCode = 1
      }
      return
    }
    case 'verify-storage-retention': {
      const objectsPath = flag('objects')
      if (!objectsPath) throw new Error('--objects <json-file> is required')
      const rawExpected = flag('expected-keep')
      let expectedKeepNames = []
      if (rawExpected) {
        try {
          const parsed = JSON.parse(rawExpected)
          expectedKeepNames = Array.isArray(parsed) ? parsed : [String(parsed)]
        } catch {
          expectedKeepNames = rawExpected.split(',').map((s) => s.trim()).filter(Boolean)
        }
      }
      const latest = flag('latest')

      const raw = JSON.parse(read(abs(objectsPath)))
      const list = Array.isArray(raw) ? raw : (raw?.objects ?? [])
      const result = verifyStorageRetentionInvariant({
        objects: list,
        expectedKeepNames,
        latestApkName: latest,
      })

      process.stdout.write(`${JSON.stringify(result)}\n`)
      if (!result.ok) {
        process.stderr.write(`${result.mismatches.join('\n')}\n`)
        process.exitCode = 1
      }
      return
    }
    case 'validate-ledger': {
      const ledgerPath = flag('ledger')
      if (!ledgerPath) throw new Error('--ledger <path> is required')
      const ledger = loadLedger(existsSync(abs(ledgerPath)) ? read(abs(ledgerPath)) : '', {
        allowMissing: boolFlag('allow-missing'),
      })
      process.stdout.write(`ledger OK (${ledger.releases.length} records)\n`)
      return
    }
    case 'merge-ledger': {
      const ledgerPath = flag('ledger')
      const recordPath = flag('record')
      if (!ledgerPath || !recordPath) throw new Error('--ledger and --record are required')
      const record = parseConsumedRecord(read(abs(recordPath)))
      const merged = mergeLedger(existsSync(abs(ledgerPath)) ? read(abs(ledgerPath)) : '', record, {
        allowMissing: boolFlag('allow-missing'),
      })
      const outPath = flag('out') || ledgerPath
      write(abs(outPath), merged)
      process.stdout.write(`ledger merged (${readConsumedRecords(merged).length} records)\n`)
      return
    }
    case 'reconcile': {
      const ledgerPath = flag('ledger')
      if (!ledgerPath) throw new Error('--ledger <path> is required')
      const rawCode = flag('policy-code')
      const plan = planReconciliation({
        policyVersionCode: rawCode === 'null' || rawCode === null ? null : Number(rawCode),
        ledgerText: existsSync(abs(ledgerPath)) ? read(abs(ledgerPath)) : '',
      })
      process.stdout.write(`${JSON.stringify(plan)}\n`)
      if (plan.action === 'conflict') process.exitCode = 1
      return
    }
    case 'reissue': {
      const original = flag('original')
      const key = flag('key')
      const proposal = createReissue({ originalId: original, key, text: flag('text') })
      process.stdout.write(`${JSON.stringify(proposal)}\n`)
      return
    }
    case 'verify-release': {
      const expectedPath = flag('expected')
      const observedPath = flag('observed')
      if (!expectedPath || !observedPath) throw new Error('--expected and --observed are required')
      const result = verifyExistingRelease({
        expected: parseJsonFile(abs(expectedPath)),
        observed: parseJsonFile(abs(observedPath)),
      })
      process.stdout.write(`${JSON.stringify(result)}\n`)
      if (!result.ok) process.exitCode = 1
      return
    }
    case 'evaluate-policy': {
      const currentPath = flag('current')
      const proposedPath = flag('proposed')
      if (!currentPath || !proposedPath) throw new Error('--current and --proposed are required')
      const ledgerPath = flag('ledger')
      let prior = null
      if (ledgerPath && existsSync(abs(ledgerPath))) {
        const ledger = JSON.parse(read(abs(ledgerPath)))
        const proposed = parseConsumedRecord(read(abs(proposedPath)))
        prior = (Array.isArray(ledger.releases) ? ledger.releases : [])
          .find((r) => Number(r.versionCode) === proposed.versionCode) ?? null
      }
      const decision = evaluatePolicyState(
        normalizePolicyRow(firstRow(parseJsonFile(abs(currentPath)))),
        parseConsumedRecord(read(abs(proposedPath))),
        prior,
      )
      process.stdout.write(`${decision.action}\n`)
      if (decision.action === 'reject' || decision.action === 'conflict') {
        process.stderr.write(`${decision.reason}\n`)
        process.exitCode = 1
      }
      return
    }
    case 'archive-gated': {
      const changelogPath = flag('changelog')
      const recordPath = flag('record')
      if (!changelogPath || !recordPath) throw new Error('--changelog and --record are required')
      const changelog = read(abs(changelogPath))
      const model = parseChangelog(changelog)
      const unreleasedIds = model.unreleased.map((e) => e.id).filter(Boolean)
      const tombstonesText = flag('tombstones') ? read(abs(flag('tombstones'))) : ''
      const tombstoneIds = tombstonesText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))
      const ledger = loadLedger(read(abs(recordPath)), { allowMissing: false })
      const record = ledger.releases.find((r) => r.assetVerified === true && r.policyVerified === true) ?? null
      const ids = selectArchivableIds({ unreleasedIds, record, tombstones: tombstoneIds })
      if (ids.length === 0) {
        process.stdout.write('archived 0 (gate not satisfied)\n')
        return
      }
      const next = archiveEntries(changelog, { version: flag('version'), date: flag('date'), ids })
      const outPath = flag('out') || changelogPath
      write(abs(outPath), next)
      process.stdout.write(`archived ${ids.length}\n`)
      return
    }
    default:
      throw new Error(`unknown command: ${command ?? '(none)'}`)
  }
}

if (process.argv[1] && decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1').toLowerCase() === resolvePath(process.argv[1]).replace(/\\/g, '/').toLowerCase()) {
  try {
    main()
  } catch (err) {
    process.stderr.write(`${err.message}\n`)
    process.exitCode = 1
  }
}
