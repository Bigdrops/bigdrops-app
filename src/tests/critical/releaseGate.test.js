import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import {
  stripIdComments,
  hashNotes,
  buildReleaseNotes,
  collectConsumedIds,
  readConsumedRecords,
  createConsumedRecord,
  parseConsumedRecord,
  serializeConsumedRecord,
  verifyAssetDownload,
  evaluatePolicyState,
  selectArchivableIds,
  selectLedgerRecord,
  filterStaleApkObjects,
  planStorageRetention,
  verifyStorageRetentionInvariant,
  MAX_RETAINED_APKS,
  PREVIOUS_APK_MAX_AGE_MS,
  isLegacyPreLedgerRelease,
  isLegacyPlaceholder,
  validateReleaseNotes,
  loadLedger,
  mergeLedger,
  RECORD_SCHEMA,
} from '../../../scripts/release/releaseGate.mjs'
import { createEmptyChangelog, appendEntries, archiveEntries, parseChangelog, idForKey } from '../../../scripts/release/changelog.mjs'

const A = idForKey('report-a.md#1')
const B = idForKey('report-a.md#2')
const SHA = 'a'.repeat(40)
const doc = (...entries) => `# BOUXRE Changelog\n\n## Unreleased\n\n${entries.join('\n\n')}\n\n<!-- archive-boundary -->\n`
const entry = (id, text) => `<!-- id: ${id} -->\n- ${text}`

const record = (overrides = {}) => createConsumedRecord({
  sha: SHA,
  versionCode: 1007,
  versionName: '1.0.7',
  tag: 'test-release-run7',
  ids: [A],
  notesHash: hashNotes('- Feature one'),
  webReleaseUrl: 'https://example.test/app.apk',
  assetVerified: true,
  policyVerified: true,
  publishedAt: '2026-11-19T00:00:00Z',
  ...overrides,
})

// ---------------------------------------------------------------------------
// Comment stripping / notes
// ---------------------------------------------------------------------------

test('stripIdComments removes whole-line HTML comments including ID comments', () => {
  const raw = `<!-- id: ${A} -->\n- Feature one\n<!-- other comment -->\n- Fix two`
  assert.equal(stripIdComments(raw), '- Feature one\n- Fix two')
})

test('stripIdComments protects non-bullet input from the parseReleaseNotes leak', () => {
  // With no bullets, parseReleaseNotes joins every line into one entry; an
  // ID comment would leak verbatim. Stripping first removes that risk.
  const raw = `<!-- id: ${A} -->\nPlain release summary without bullets`
  assert.equal(stripIdComments(raw), 'Plain release summary without bullets')
  assert.doesNotMatch(stripIdComments(raw), /<!--|rel_/)
})

test('buildReleaseNotes excludes consumed IDs and never emits ID comments', () => {
  const head = doc(entry(A, 'Feature one'), entry(B, 'Fix two'))
  const result = buildReleaseNotes(head, [A])
  assert.deepEqual(result.ids, [B])
  assert.equal(result.notes, '- Fix two')
  assert.doesNotMatch(result.notes, /<!--/)
  assert.equal(result.notesHash, hashNotes('- Fix two'))
})

test('buildReleaseNotes on empty Unreleased produces empty notes, not fabricated prose', () => {
  const result = buildReleaseNotes(createEmptyChangelog(), [])
  assert.equal(result.notes, '')
  assert.deepEqual(result.ids, [])
})

test('buildReleaseNotes throws on untagged bullets rather than guessing identity', () => {
  assert.throws(() => buildReleaseNotes(doc('- untagged'), []), /without ID or text/)
})

test('collectConsumedIds reads both a ledger and a single record without duplicates', () => {
  const ledger = serializeConsumedRecord({ schema: 1, releases: [record(), record({ ids: [B] })] })
  assert.deepEqual(collectConsumedIds(ledger), [A, B])
  assert.deepEqual(collectConsumedIds(serializeConsumedRecord(record())), [A])
  assert.deepEqual(collectConsumedIds(''), [])
})

test('readConsumedRecords accepts a ledger and validates each record', () => {
  const ledger = serializeConsumedRecord({ schema: 1, releases: [record(), record({ ids: [B] })] })
  const records = readConsumedRecords(ledger)
  assert.equal(records.length, 2)
  assert.deepEqual(records[1].ids, [B])
  assert.deepEqual(readConsumedRecords(serializeConsumedRecord(record())).length, 1)
})

// ---------------------------------------------------------------------------
// Consumed record
// ---------------------------------------------------------------------------

test('consumed record round-trips and rejects malformed identity', () => {
  const r = record()
  assert.deepEqual(parseConsumedRecord(serializeConsumedRecord(r)), r)
  assert.throws(() => record({ sha: 'not-a-sha' }), /invalid build sha/)
  assert.throws(() => record({ ids: [A, A] }), /duplicate entry ids/)
  assert.throws(() => record({ ids: ['bad-id'] }), /invalid entry ids/)
  assert.throws(() => parseConsumedRecord('{"schema":99}'), /unsupported consumed record schema/)
})

// ---------------------------------------------------------------------------
// Asset verification
// ---------------------------------------------------------------------------

test('asset verification requires 200, non-HTML, non-empty body and a matching digest', () => {
  const digest = 'a'.repeat(64)
  const base = { expectedSha256: digest, actualSha256: digest }
  assert.deepEqual(verifyAssetDownload({ httpCode: 200, contentType: 'application/vnd.android.package-archive', byteLength: 1024, ...base }), { ok: true, reasons: [] })
  assert.equal(verifyAssetDownload({ httpCode: 404, contentType: 'application/octet-stream', byteLength: 10, ...base }).ok, false)
  assert.equal(verifyAssetDownload({ httpCode: 200, contentType: 'text/html; charset=utf-8', byteLength: 500, ...base }).ok, false)
  assert.equal(verifyAssetDownload({ httpCode: 200, contentType: 'application/octet-stream', byteLength: 0, ...base }).ok, false)
  assert.equal(verifyAssetDownload({ httpCode: 200, contentType: 'application/octet-stream', byteLength: 10 }).ok, false)
})

// ---------------------------------------------------------------------------
// Policy state
// ---------------------------------------------------------------------------

const current = (versionCode, overrides = {}) => ({
  versionCode, versionName: '1.0.6', webReleaseUrl: 'https://example.test/old.apk', releaseNotes: 'old notes', ...overrides,
})

test('policy state rejects lower versions and advances higher versions', () => {
  assert.equal(evaluatePolicyState(current(1008), record()).action, 'reject')
  assert.equal(evaluatePolicyState(current(1006), record()).action, 'advance')
})

test('policy evaluation accepts a normalized PostgREST snake_case row', () => {
  // The CLI normalizes these columns before calling evaluatePolicyState.
  const row = { version_code: 1006, version_name: '1.0.6', web_release_url: 'old', release_notes: 'old' }
  const normalized = {
    versionCode: row.version_code, versionName: row.version_name,
    webReleaseUrl: row.web_release_url, releaseNotes: row.release_notes,
  }
  assert.equal(evaluatePolicyState(normalized, record()).action, 'advance')
})

test('equal version with same build identity is an idempotent noop even if notes changed', () => {
  const prior = record()
  const proposed = record({ notesHash: hashNotes('- different recomputed notes') })
  assert.equal(evaluatePolicyState(current(1007), proposed, prior).action, 'noop')
})

test('equal version with a different build SHA or tag is a conflict', () => {
  const prior = record()
  assert.equal(evaluatePolicyState(current(1007), record({ sha: 'b'.repeat(40) }), prior).action, 'conflict')
  assert.equal(evaluatePolicyState(current(1007), record({ tag: 'other-tag' }), prior).action, 'conflict')
})

test('a retry after the record is committed is a noop even though recomputed IDs shrank', () => {
  const prior = record({ ids: [A, B] })
  const retry = record({ ids: [] }) // B was consumed; notes now exclude it
  assert.equal(evaluatePolicyState(current(1007), retry, prior).action, 'noop')
})

test('equal version without a ledger record falls back to policy metadata', () => {
  const matching = record()
  const matchingCurrent = current(1007, { versionName: matching.versionName, webReleaseUrl: matching.webReleaseUrl })
  assert.equal(evaluatePolicyState(matchingCurrent, matching).action, 'noop')
  assert.equal(evaluatePolicyState(current(1007), matching).action, 'conflict')
})

// ---------------------------------------------------------------------------
// Archive gating
// ---------------------------------------------------------------------------

test('archive selection requires both verifications and excludes tombstones', () => {
  const input = { unreleasedIds: [A, B], record: record(), tombstones: [] }
  assert.deepEqual(selectArchivableIds(input), [A])
  assert.deepEqual(selectArchivableIds({ ...input, tombstones: [A] }), [])
  assert.deepEqual(selectArchivableIds({ ...input, record: record({ assetVerified: false }) }), [])
  assert.deepEqual(selectArchivableIds({ ...input, record: record({ policyVerified: false }) }), [])
})

test('gated archive preserves unverified entries and identity', () => {
  const head = doc(entry(A, 'Shipped.'), entry(B, 'Still pending.'))
  const ids = selectArchivableIds({ unreleasedIds: [A, B], record: record(), tombstones: [] })
  const archived = archiveEntries(head, { version: '1.0.7', date: '2026-11-19', ids })
  const model = parseChangelog(archived)
  assert.equal(model.unreleased.length, 1)
  assert.equal(model.unreleased[0].id, B)
  assert.equal(model.archives[0].entries[0].id, A)
  assert.equal(model.archives[0].entries[0].text, 'Shipped.')
})

// ---------------------------------------------------------------------------
// SHA-pinned consumption
// ---------------------------------------------------------------------------

test('consumption is keyed to a build SHA, not a tag name', () => {
  const r1 = record({ sha: SHA, tag: 'test-release-run7' })
  const r2 = record({ sha: SHA, tag: 'renamed-tag' })
  assert.equal(r1.sha, r2.sha)
  assert.notEqual(r1.tag, r2.tag)
  // Same SHA with a different tag is still the same build identity for notes.
  const head = doc(entry(A, 'Feature one'))
  assert.equal(buildReleaseNotes(head, collectConsumedIds(serializeConsumedRecord(r2))).notes, '')
})

test('an entry added after the recorded snapshot remains pending', () => {
  const head = appendEntries(createEmptyChangelog(), [
    { key: 'report-a.md#1', text: 'Feature one' },
    { key: 'report-a.md#2', text: 'Fix two' },
  ]).text
  const result = buildReleaseNotes(head, [A])
  assert.equal(result.notes, '- Fix two')
})

test('apk_asset_prefix policy evaluation/comparison and consumed record validation', () => {
  const r = record({ apkAssetPrefix: 'BOUXRE-release-' })
  assert.equal(r.apkAssetPrefix, 'BOUXRE-release-')

  // Rejects invalid apkAssetPrefix
  assert.throws(() => record({ apkAssetPrefix: '   ' }), /invalid apkAssetPrefix/)

  // Policy fallback without ledger: identical prefix matches noop, mismatched prefix conflicts
  const curPolicy = {
    versionCode: 1007,
    versionName: '1.0.7',
    webReleaseUrl: 'https://example.test/app.apk',
    apkAssetPrefix: 'BOUXRE-release-',
  }
  assert.equal(evaluatePolicyState(curPolicy, r).action, 'noop')

  const mismatchedPrefixPolicy = {
    ...curPolicy,
    apkAssetPrefix: 'BIGDROPS-test-release-',
  }
  assert.equal(evaluatePolicyState(mismatchedPrefixPolicy, r).action, 'conflict')
})

test('filterStaleApkObjects prunes stale APKs only after verification succeeds', () => {
  const objects = [
    { name: 'bigdrops-latest.apk' },
    { name: 'BOUXRE-release-latest.apk' },
    { name: 'old-release-1005.apk' },
    { name: 'consumed-ids.json' }, // non-apk should be ignored
    { name: 'metadata.txt' },
  ]

  // When verified is false (pre-verification or verification failure): returns []
  const unverified = filterStaleApkObjects({
    objects,
    keepName: 'BOUXRE-release-latest.apk',
    verified: false,
  })
  assert.deepEqual(unverified, [], 'must never prune stale objects before verification succeeds')

  // When verified is true: returns only stale APK objects, keeping BOUXRE-release-latest.apk
  const verified = filterStaleApkObjects({
    objects,
    keepName: 'BOUXRE-release-latest.apk',
    verified: true,
  })
  assert.deepEqual(verified, ['bigdrops-latest.apk', 'old-release-1005.apk'])

  // Also handles raw string arrays
  const rawStringObjects = ['bigdrops-latest.apk', 'BOUXRE-release-latest.apk', 'stale.apk']
  const verifiedStrings = filterStaleApkObjects({
    objects: rawStringObjects,
    keepName: 'BOUXRE-release-latest.apk',
    verified: true,
  })
  assert.deepEqual(verifiedStrings, ['bigdrops-latest.apk', 'stale.apk'])

  // Missing or invalid keepName returns []
  assert.deepEqual(filterStaleApkObjects({ objects, keepName: null, verified: true }), [])
})

// ---------------------------------------------------------------------------
// Two-APK Supabase Storage Retention Contract & Invariant
// ---------------------------------------------------------------------------

test('planStorageRetention for 1st APK: retains 1 APK and prunes older/unrelated APKs', () => {
  const ledger = {
    schema: 2,
    releases: [
      record({
        versionCode: 1001,
        versionName: '1.0.1',
        apkAssetName: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk',
        publishedAt: '2026-11-01T00:00:00Z',
      }),
    ],
  }
  const objects = [
    { name: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk' },
    { name: 'legacy-app-old.apk' },
    { name: 'consumed-ids.json' },
  ]
  const plan = planStorageRetention({
    objects,
    ledgerText: JSON.stringify(ledger),
    currentVersionCode: 1001,
    verified: true,
  })
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.keepNames, ['BOUXRE-release-1.0.1-run1-aaaaaaa.apk'])
  assert.deepEqual(plan.deleteNames, ['legacy-app-old.apk'])
  assert.equal(plan.previousName, null)
  assert.equal(plan.prevExpired, false)
})

test('planStorageRetention for 2nd APK: retains 2 APKs (latest and preceding)', () => {
  const ledger = {
    schema: 2,
    releases: [
      record({
        versionCode: 1001,
        versionName: '1.0.1',
        apkAssetName: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk',
        publishedAt: '2026-11-10T00:00:00Z',
      }),
      record({
        versionCode: 1002,
        versionName: '1.0.2',
        apkAssetName: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk',
        publishedAt: '2026-11-15T00:00:00Z',
      }),
    ],
  }
  const objects = [
    { name: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk' },
    { name: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk' },
    { name: 'stale-pre-release.apk' },
  ]
  const plan = planStorageRetention({
    objects,
    ledgerText: JSON.stringify(ledger),
    currentVersionCode: 1002,
    now: new Date('2026-11-15T12:00:00Z'),
    verified: true,
  })
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.keepNames, [
    'BOUXRE-release-1.0.2-run2-bbbbbbb.apk',
    'BOUXRE-release-1.0.1-run1-aaaaaaa.apk',
  ])
  assert.deepEqual(plan.deleteNames, ['stale-pre-release.apk'])
})

test('planStorageRetention for 3rd APK: retains newest 2 and deletes oldest (v1)', () => {
  const ledger = {
    schema: 2,
    releases: [
      record({
        versionCode: 1001,
        versionName: '1.0.1',
        apkAssetName: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk',
        publishedAt: '2026-11-10T00:00:00Z',
      }),
      record({
        versionCode: 1002,
        versionName: '1.0.2',
        apkAssetName: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk',
        publishedAt: '2026-11-14T00:00:00Z',
      }),
      record({
        versionCode: 1003,
        versionName: '1.0.3',
        apkAssetName: 'BOUXRE-release-1.0.3-run3-ccccccc.apk',
        publishedAt: '2026-11-18T00:00:00Z',
      }),
    ],
  }
  const objects = [
    { name: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk' },
    { name: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk' },
    { name: 'BOUXRE-release-1.0.3-run3-ccccccc.apk' },
  ]
  const plan = planStorageRetention({
    objects,
    ledgerText: JSON.stringify(ledger),
    currentVersionCode: 1003,
    now: new Date('2026-11-18T12:00:00Z'),
    verified: true,
  })
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.keepNames, [
    'BOUXRE-release-1.0.3-run3-ccccccc.apk',
    'BOUXRE-release-1.0.2-run2-bbbbbbb.apk',
  ])
  assert.deepEqual(plan.deleteNames, ['BOUXRE-release-1.0.1-run1-aaaaaaa.apk'])
})

test('planStorageRetention for 4th APK: retains newest 2 (v4 & v3) and deletes v1 and v2', () => {
  const ledger = {
    schema: 2,
    releases: [
      record({
        versionCode: 1001,
        versionName: '1.0.1',
        apkAssetName: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk',
        publishedAt: '2026-11-01T00:00:00Z',
      }),
      record({
        versionCode: 1002,
        versionName: '1.0.2',
        apkAssetName: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk',
        publishedAt: '2026-11-05T00:00:00Z',
      }),
      record({
        versionCode: 1003,
        versionName: '1.0.3',
        apkAssetName: 'BOUXRE-release-1.0.3-run3-ccccccc.apk',
        publishedAt: '2026-11-15T00:00:00Z',
      }),
      record({
        versionCode: 1004,
        versionName: '1.0.4',
        apkAssetName: 'BOUXRE-release-1.0.4-run4-ddddddd.apk',
        publishedAt: '2026-11-19T00:00:00Z',
      }),
    ],
  }
  const objects = [
    { name: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk' },
    { name: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk' },
    { name: 'BOUXRE-release-1.0.3-run3-ccccccc.apk' },
    { name: 'BOUXRE-release-1.0.4-run4-ddddddd.apk' },
  ]
  const plan = planStorageRetention({
    objects,
    ledgerText: JSON.stringify(ledger),
    currentVersionCode: 1004,
    now: new Date('2026-11-19T12:00:00Z'),
    verified: true,
  })
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.keepNames, [
    'BOUXRE-release-1.0.4-run4-ddddddd.apk',
    'BOUXRE-release-1.0.3-run3-ccccccc.apk',
  ])
  assert.deepEqual(plan.deleteNames, [
    'BOUXRE-release-1.0.1-run1-aaaaaaa.apk',
    'BOUXRE-release-1.0.2-run2-bbbbbbb.apk',
  ])
})

test('previous APK expires after 14 days even without a 3rd release displacing it', () => {
  const ledger = {
    schema: 2,
    releases: [
      record({
        versionCode: 1001,
        versionName: '1.0.1',
        apkAssetName: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk',
        publishedAt: '2026-10-01T00:00:00Z', // 49 days old
      }),
      record({
        versionCode: 1002,
        versionName: '1.0.2',
        apkAssetName: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk',
        publishedAt: '2026-11-19T00:00:00Z',
      }),
    ],
  }
  const objects = [
    { name: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk' },
    { name: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk' },
  ]
  const plan = planStorageRetention({
    objects,
    ledgerText: JSON.stringify(ledger),
    currentVersionCode: 1002,
    now: new Date('2026-11-19T12:00:00Z'),
    verified: true,
  })
  assert.equal(plan.ok, true)
  assert.equal(plan.prevExpired, true)
  assert.deepEqual(plan.keepNames, ['BOUXRE-release-1.0.2-run2-bbbbbbb.apk'])
  assert.deepEqual(plan.deleteNames, ['BOUXRE-release-1.0.1-run1-aaaaaaa.apk'])
})

test('previous APK displaced before 14 days retains both APKs', () => {
  const ledger = {
    schema: 2,
    releases: [
      record({
        versionCode: 1001,
        versionName: '1.0.1',
        apkAssetName: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk',
        publishedAt: '2026-11-15T00:00:00Z', // 4 days old
      }),
      record({
        versionCode: 1002,
        versionName: '1.0.2',
        apkAssetName: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk',
        publishedAt: '2026-11-19T00:00:00Z',
      }),
    ],
  }
  const objects = [
    { name: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk' },
    { name: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk' },
  ]
  const plan = planStorageRetention({
    objects,
    ledgerText: JSON.stringify(ledger),
    currentVersionCode: 1002,
    now: new Date('2026-11-19T12:00:00Z'),
    verified: true,
  })
  assert.equal(plan.ok, true)
  assert.equal(plan.prevExpired, false)
  assert.equal(plan.keepNames.length, 2)
  assert.deepEqual(plan.deleteNames, [])
})

test('latest APK is never deleted under any circumstance', () => {
  const ledger = {
    schema: 2,
    releases: [
      record({
        versionCode: 1001,
        versionName: '1.0.1',
        apkAssetName: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk',
        publishedAt: '2026-01-01T00:00:00Z', // months old, but is current version!
      }),
    ],
  }
  const objects = [{ name: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk' }]
  const plan = planStorageRetention({
    objects,
    ledgerText: JSON.stringify(ledger),
    currentVersionCode: 1001,
    now: new Date('2026-11-19T12:00:00Z'),
    verified: true,
  })
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.keepNames, ['BOUXRE-release-1.0.1-run1-aaaaaaa.apk'])
  assert.deepEqual(plan.deleteNames, [])
})

test('non-APK objects are never included in deleteNames', () => {
  const ledger = {
    schema: 2,
    releases: [
      record({
        versionCode: 1001,
        versionName: '1.0.1',
        apkAssetName: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk',
      }),
      record({
        versionCode: 1002,
        versionName: '1.0.2',
        apkAssetName: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk',
      }),
    ],
  }
  const objects = [
    { name: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk' },
    { name: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk' },
    { name: 'old-stale.apk' },
    { name: 'consumed-ids.json' },
    { name: 'release-policy.json' },
    { name: 'logs.txt' },
  ]
  const plan = planStorageRetention({
    objects,
    ledgerText: JSON.stringify(ledger),
    currentVersionCode: 1002,
    now: new Date('2026-11-19T12:00:00Z'),
    verified: true,
  })
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.deleteNames, ['old-stale.apk'])
})

test('unverified release fails closed and plans zero deletions', () => {
  const ledger = {
    schema: 2,
    releases: [
      record({
        versionCode: 1001,
        versionName: '1.0.1',
        apkAssetName: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk',
      }),
    ],
  }
  const objects = [
    { name: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk' },
    { name: 'stale.apk' },
  ]
  const plan = planStorageRetention({
    objects,
    ledgerText: JSON.stringify(ledger),
    currentVersionCode: 1001,
    verified: false,
  })
  assert.equal(plan.ok, false)
  assert.match(plan.reason, /unverified release/)
  assert.deepEqual(plan.deleteNames, [])
})

test('unresolved recovery protects previous known-good APK regardless of age', () => {
  const ledger = {
    schema: 2,
    releases: [
      record({
        versionCode: 1001,
        versionName: '1.0.1',
        apkAssetName: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk',
        publishedAt: '2026-09-01T00:00:00Z', // > 14 days old
      }),
      record({
        versionCode: 1002,
        versionName: '1.0.2',
        apkAssetName: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk',
        publishedAt: '2026-11-19T00:00:00Z',
      }),
    ],
  }
  const objects = [
    { name: 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk' },
    { name: 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk' },
  ]
  const plan = planStorageRetention({
    objects,
    ledgerText: JSON.stringify(ledger),
    currentVersionCode: 1002,
    now: new Date('2026-11-19T12:00:00Z'),
    verified: true,
    unresolvedRecovery: true,
  })
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.keepNames, [
    'BOUXRE-release-1.0.2-run2-bbbbbbb.apk',
    'BOUXRE-release-1.0.1-run1-aaaaaaa.apk',
  ])
  assert.deepEqual(plan.deleteNames, [])
})

test('verifyStorageRetentionInvariant enforces invariant rules', () => {
  const latest = 'BOUXRE-release-1.0.2-run2-bbbbbbb.apk'
  const prev = 'BOUXRE-release-1.0.1-run1-aaaaaaa.apk'

  // Valid 2-APK state
  const valid2 = verifyStorageRetentionInvariant({
    objects: [{ name: latest }, { name: prev }, { name: 'consumed-ids.json' }],
    expectedKeepNames: [latest, prev],
    latestApkName: latest,
  })
  assert.equal(valid2.ok, true)
  assert.equal(valid2.retainedCount, 2)

  // Valid 1-APK state (e.g. first release or expired prev)
  const valid1 = verifyStorageRetentionInvariant({
    objects: [{ name: latest }],
    expectedKeepNames: [latest],
    latestApkName: latest,
  })
  assert.equal(valid1.ok, true)
  assert.equal(valid1.retainedCount, 1)

  // Exceeds 2 APKs: fails
  const excess = verifyStorageRetentionInvariant({
    objects: [{ name: latest }, { name: prev }, { name: 'extra.apk' }],
    expectedKeepNames: [latest, prev, 'extra.apk'],
    latestApkName: latest,
  })
  assert.equal(excess.ok, false)
  assert.match(excess.mismatches.join('; '), /exceeds maximum of 2/)

  // Unexpected APK retained: fails
  const unexpected = verifyStorageRetentionInvariant({
    objects: [{ name: latest }, { name: 'stale.apk' }],
    expectedKeepNames: [latest, prev],
    latestApkName: latest,
  })
  assert.equal(unexpected.ok, false)
  assert.match(unexpected.mismatches.join('; '), /unexpected APK object retained/)

  // Missing latest APK: fails
  const missingLatest = verifyStorageRetentionInvariant({
    objects: [{ name: prev }],
    expectedKeepNames: [prev],
    latestApkName: latest,
  })
  assert.equal(missingLatest.ok, false)
  assert.match(missingLatest.mismatches.join('; '), /latest active APK .* is missing/)
})

test('isLegacyPreLedgerRelease identifies pre-ledger runs, legacy tags, and timestamps', () => {
  // Historical runs 1-29 are legacy
  assert.equal(isLegacyPreLedgerRelease({ tag: 'test-release-run29' }), true)
  assert.equal(isLegacyPreLedgerRelease({ tag: 'test-release-run1' }), true)
  assert.equal(isLegacyPreLedgerRelease({ tag: 'test-release-run15' }), true)

  // Run 30+ is ledger era (not legacy)
  assert.equal(isLegacyPreLedgerRelease({ tag: 'test-release-run30' }), false)
  assert.equal(isLegacyPreLedgerRelease({ tag: 'test-release-run31' }), false)

  // Non-run historical tag formats
  assert.equal(isLegacyPreLedgerRelease({ tag: 'test-release-20260913-1900' }), true)
  assert.equal(isLegacyPreLedgerRelease({ tag: 'v1.0.0-debug' }), true)
  assert.equal(isLegacyPreLedgerRelease({ tag: 'checkpoint/pre-forms-standardization' }), true)
  assert.equal(isLegacyPreLedgerRelease({ tag: 'debug-20260910-081049' }), true)

  // Timestamp before 2026-11-19T00:00:00Z
  assert.equal(isLegacyPreLedgerRelease({ tag: 'custom-tag', publishedAt: '2026-11-18T17:16:16Z' }), true)
  assert.equal(isLegacyPreLedgerRelease({ tag: 'custom-tag', createdAt: '2026-11-02T10:00:00Z' }), true)

  // Timestamp after 2026-11-19T00:00:00Z without legacy tag
  assert.equal(isLegacyPreLedgerRelease({ tag: 'custom-tag', publishedAt: '2026-11-20T00:00:00Z' }), false)
  assert.equal(isLegacyPreLedgerRelease({ tag: '' }), false)
  assert.equal(isLegacyPreLedgerRelease({}), false)
})

test('isLegacyPlaceholder and validateReleaseNotes detect historical generic boilerplate', () => {
  // Exact historical run 29 placeholder (both BOURXE and BOUXRE spellings)
  assert.equal(isLegacyPlaceholder('BOURXE v1.0.29 (build 1029) maintenance and performance update.'), true)
  assert.equal(isLegacyPlaceholder('BOUXRE v1.0.29 (build 1029) maintenance and performance update.'), true)
  assert.equal(isLegacyPlaceholder('BOUXRE v1.0.30 (build 1030) maintenance and performance update'), true)
  assert.equal(isLegacyPlaceholder('maintenance and performance update.'), true)
  assert.equal(isLegacyPlaceholder('performance and maintenance update'), true)
  assert.equal(isLegacyPlaceholder('   BOURXE v1.0.29 \n maintenance and performance update.  '), true)

  // Legitimate bullets and release notes are not placeholders
  assert.equal(isLegacyPlaceholder('- Performance: optimize image rendering'), false)
  assert.equal(isLegacyPlaceholder('- Maintenance: clean up temporary storage'), false)
  assert.equal(isLegacyPlaceholder('- Maintenance and performance update: faster reports'), false)
  assert.equal(isLegacyPlaceholder('Fixed customer tax calculation bug'), false)

  // validateReleaseNotes rejects placeholders and empty notes
  assert.deepEqual(validateReleaseNotes(''), { ok: false, reason: 'release notes are empty' })
  assert.deepEqual(validateReleaseNotes('BOURXE v1.0.29 (build 1029) maintenance and performance update.'), {
    ok: false,
    reason: 'release notes contain only generic placeholder',
  })
  assert.deepEqual(validateReleaseNotes('- Performance: optimize image rendering'), {
    ok: true,
    reason: null,
  })
})

test('validateReleaseNotes rejects null, undefined, empty, and whitespace strings', () => {
  assert.deepEqual(validateReleaseNotes(''), { ok: false, reason: 'release notes are empty' })
  assert.deepEqual(validateReleaseNotes('   \n\t  '), { ok: false, reason: 'release notes are empty' })
  assert.deepEqual(validateReleaseNotes(null), { ok: false, reason: 'release notes are empty' })
  assert.deepEqual(validateReleaseNotes(undefined), { ok: false, reason: 'release notes are empty' })
})

test('validateReleaseNotes rejects historical generic placeholders across variants', () => {
  const placeholders = [
    'BOURXE v1.0.29 (build 1029) maintenance and performance update.',
    'BOUXRE v1.0.29 (build 1029) maintenance and performance update.',
    'BOUXRE v1.0.30 (build 1030) maintenance and performance update',
    'BOURXE v1.0.30 (build 1030): maintenance and performance update',
    'maintenance and performance update.',
    'performance and maintenance update',
    '  BOUXRE v1.0.29 \n maintenance and performance update.  ',
  ]
  for (const ph of placeholders) {
    const res = validateReleaseNotes(ph)
    assert.equal(res.ok, false, `Expected placeholder rejection for: ${ph}`)
    assert.equal(res.reason, 'release notes contain only generic placeholder')
  }
})

test('validateReleaseNotes accepts legitimate user-facing and maintenance/performance bullets', () => {
  const legitimate = [
    '- Fix: Resolve tax calculation rounding in receipt generation',
    '- Feature: Offline sync retry with exponential backoff',
    '- Maintenance: Clean up stale SQLite cache databases',
    '- Performance: Optimize startup query roundtrips',
    '- Maintenance and performance update: faster report generation and smaller memory footprint',
    '### Fixes\n- Correct currency formatting on POS thermal printer output',
  ]
  for (const text of legitimate) {
    const res = validateReleaseNotes(text)
    assert.equal(res.ok, true, `Expected acceptance for legitimate notes: ${text}`)
    assert.equal(res.reason, null)
  }
})

test('validateReleaseNotes rejects internal engineering tasks, stage markers, commit syntax and code paths', () => {
  const internalEntries = [
    '- stage 3d lifecycle, attachments and intelligence',
    '- stage 3c pdf presentation and signatory controls',
    '- stage 3b custom fields, groups and item images',
    '- Android update experience prototype',
    '- stage 3a2 modify remediation',
    '- stage 3a2 existing-doc field and charges',
    '- stage 3a1 core contract, stage 3 blueprint',
    '- feat(assistant): stage 3d lifecycle',
    '- fix(invoice): correct calculation in src/lib/Calculations.ts',
    '- Update capacitor.config.ts settings',
  ]
  for (const note of internalEntries) {
    const res = validateReleaseNotes(note)
    assert.equal(res.ok, false, `Expected rejection for internal note: ${note}`)
    assert.match(res.reason, /release notes entry rejected:/)
  }
})

test('CLI validate-notes --file enforces validation gate and exit codes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-gate-test-'))
  try {
    const validFile = join(dir, 'valid.txt')
    writeFileSync(validFile, '- Fix: POS invoice tax calculation\n- Perf: faster sync', 'utf8')
    const validOut = execFileSync(process.execPath, ['scripts/release/releaseGate.mjs', 'validate-notes', '--file', validFile], { encoding: 'utf8' })
    const parsedValid = JSON.parse(validOut.trim())
    assert.equal(parsedValid.ok, true)
    assert.equal(parsedValid.reason, null)

    const emptyFile = join(dir, 'empty.txt')
    writeFileSync(emptyFile, '', 'utf8')
    assert.throws(
      () => execFileSync(process.execPath, ['scripts/release/releaseGate.mjs', 'validate-notes', '--file', emptyFile], { encoding: 'utf8' }),
      (err) => {
        assert.equal(err.status, 1)
        const parsed = JSON.parse(err.stdout.trim())
        assert.equal(parsed.ok, false)
        assert.equal(parsed.reason, 'release notes are empty')
        return true
      }
    )

    const whitespaceFile = join(dir, 'whitespace.txt')
    writeFileSync(whitespaceFile, '   \n\t \n  ', 'utf8')
    assert.throws(
      () => execFileSync(process.execPath, ['scripts/release/releaseGate.mjs', 'validate-notes', '--file', whitespaceFile], { encoding: 'utf8' }),
      (err) => {
        assert.equal(err.status, 1)
        const parsed = JSON.parse(err.stdout.trim())
        assert.equal(parsed.ok, false)
        assert.equal(parsed.reason, 'release notes are empty')
        return true
      }
    )

    const placeholderFile = join(dir, 'placeholder.txt')
    writeFileSync(placeholderFile, 'BOURXE v1.0.29 (build 1029) maintenance and performance update.', 'utf8')
    assert.throws(
      () => execFileSync(process.execPath, ['scripts/release/releaseGate.mjs', 'validate-notes', '--file', placeholderFile], { encoding: 'utf8' }),
      (err) => {
        assert.equal(err.status, 1)
        const parsed = JSON.parse(err.stdout.trim())
        assert.equal(parsed.ok, false)
        assert.equal(parsed.reason, 'release notes contain only generic placeholder')
        return true
      }
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('validateReleaseNotes validates consistency between notes and eligible IDs', () => {
  assert.deepEqual(validateReleaseNotes('- Fix: user invoice bug', { ids: ['id-1'] }), { ok: true, reason: null })
  assert.deepEqual(validateReleaseNotes('- Fix: user invoice bug', { ids: [] }), { ok: false, reason: 'consumed entry ids is empty' })
  assert.deepEqual(validateReleaseNotes('- Fix: user invoice bug', { ids: 'not-an-array' }), { ok: false, reason: 'consumed entry ids is not an array' })
  assert.deepEqual(validateReleaseNotes('', { ids: ['id-1'] }), { ok: false, reason: 'release notes are empty' })
  assert.deepEqual(validateReleaseNotes('BOURXE v1.0.29 (build 1029) maintenance and performance update.', { ids: ['id-1'] }), {
    ok: false,
    reason: 'release notes contain only generic placeholder',
  })
})

test('CLI validate-notes --file and --ids enforces fail-closed exit behavior', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-gate-test-'))
  try {
    const validNotes = join(dir, 'notes.txt')
    writeFileSync(validNotes, '- Fix: invoice calculation bug\n- Perf: faster startup', 'utf8')
    const validIds = join(dir, 'ids.json')
    writeFileSync(validIds, JSON.stringify(['id-1', 'id-2']), 'utf8')

    // Valid notes + valid IDs -> exit 0
    const out = execFileSync(process.execPath, ['scripts/release/releaseGate.mjs', 'validate-notes', '--file', validNotes, '--ids', validIds], { encoding: 'utf8' })
    const parsed = JSON.parse(out.trim())
    assert.equal(parsed.ok, true)
    assert.equal(parsed.reason, null)

    // Valid notes + empty IDs -> exit 1
    const emptyIds = join(dir, 'empty-ids.json')
    writeFileSync(emptyIds, JSON.stringify([]), 'utf8')
    assert.throws(
      () => execFileSync(process.execPath, ['scripts/release/releaseGate.mjs', 'validate-notes', '--file', validNotes, '--ids', emptyIds], { encoding: 'utf8' }),
      (err) => {
        assert.equal(err.status, 1)
        const res = JSON.parse(err.stdout.trim())
        assert.equal(res.ok, false)
        assert.equal(res.reason, 'consumed entry ids is empty')
        return true
      }
    )

    // Valid notes + malformed IDs -> exit 1
    const malformedIds = join(dir, 'malformed-ids.json')
    writeFileSync(malformedIds, '{not json', 'utf8')
    assert.throws(
      () => execFileSync(process.execPath, ['scripts/release/releaseGate.mjs', 'validate-notes', '--file', validNotes, '--ids', malformedIds], { encoding: 'utf8' }),
      (err) => {
        assert.equal(err.status, 1)
        const res = JSON.parse(err.stdout.trim())
        assert.equal(res.ok, false)
        assert.equal(res.reason, 'malformed ids json')
        return true
      }
    )

    // Missing notes file -> exit 1
    assert.throws(
      () => execFileSync(process.execPath, ['scripts/release/releaseGate.mjs', 'validate-notes', '--file', join(dir, 'missing-notes.txt')], { encoding: 'utf8' }),
      (err) => {
        assert.equal(err.status, 1)
        const res = JSON.parse(err.stdout.trim())
        assert.equal(res.ok, false)
        assert.match(res.reason, /notes file not found/)
        return true
      }
    )

    // Missing ids file -> exit 1
    assert.throws(
      () => execFileSync(process.execPath, ['scripts/release/releaseGate.mjs', 'validate-notes', '--file', validNotes, '--ids', join(dir, 'missing-ids.json')], { encoding: 'utf8' }),
      (err) => {
        assert.equal(err.status, 1)
        const res = JSON.parse(err.stdout.trim())
        assert.equal(res.ok, false)
        assert.match(res.reason, /ids file not found/)
        return true
      }
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('loadLedger and validate-ledger enforce ledger integrity and fail closed on corruption', () => {
  // Corrupt JSON text throws
  assert.throws(() => loadLedger('{not json'), /Unexpected token|in JSON|JSON Parse error/)

  // Missing ledger throws unless allowMissing is set
  assert.throws(() => loadLedger('', { allowMissing: false }), /consumed ledger is missing/)
  assert.deepEqual(loadLedger('', { allowMissing: true }), { schema: RECORD_SCHEMA, releases: [] })

  // Corrupted record structure (missing sha or invalid versionCode)
  assert.throws(() => loadLedger(JSON.stringify({ schema: 2, releases: [{ versionCode: 'bad' }] })), /invalid build sha|malformed consumed record/)

  // Conflicting builds for the same versionCode
  const recordA = record({ versionCode: 1030, sha: '1'.repeat(40), tag: 'test-release-run30' })
  const recordB = record({ versionCode: 1030, sha: '2'.repeat(40), tag: 'test-release-run30-conflict' })
  assert.throws(
    () => loadLedger(JSON.stringify({ schema: 2, releases: [recordA, recordB] })),
    /conflicting consumed records for version 1030/
  )
})

test('Step 3d shell validation logic handles zero entries, malformed counts, and shell arithmetic safely', () => {
  // Find a bash binary if available (Git bash or system bash)
  const bashPaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'bash',
  ]
  const bashExe = bashPaths.find((p) => {
    try {
      execFileSync(p, ['-c', 'echo ok'], { encoding: 'utf8', stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  })

  if (!bashExe) return // Skip executable shell test if bash is unavailable in this environment

  const dir = mkdtempSync(join(tmpdir(), 'shell-gate-test-'))
  try {
    const testCases = [
      {
        name: 'zero entries',
        idsContent: '[]',
        notesContent: '- Some note',
        expectedError: 'zero eligible changelog entries found (ENTRY_COUNT=0)',
      },
      {
        name: 'malformed non-numeric ENTRY_COUNT',
        idsContent: 'not-json',
        notesContent: '- Some note',
        expectedError: 'ENTRY_COUNT is non-numeric or malformed',
      },
      {
        name: 'empty notes file',
        idsContent: '["id-1"]',
        notesContent: '   \n  ',
        expectedError: 'generated release notes file is empty or whitespace-only',
      },
      {
        name: 'placeholder notes file',
        idsContent: '["id-1"]',
        notesContent: 'BOURXE v1.0.29 (build 1029) maintenance and performance update.',
        expectedError: 'notes contain generic placeholder content or failed validation against eligible IDs',
      },
    ]

    for (const tc of testCases) {
      const idsFile = join(dir, `ids-${tc.name.replace(/\\s+/g, '-')}.json`)
      const notesFile = join(dir, `notes-${tc.name.replace(/\\s+/g, '-')}.txt`)
      writeFileSync(idsFile, tc.idsContent, 'utf8')
      writeFileSync(notesFile, tc.notesContent, 'utf8')

      // Exact shell logic from Step 3d
      const script = `
set -euo pipefail
IDS_FILE="${idsFile.replace(/\\\\/g, '/')}"
NOTES_FILE="${notesFile.replace(/\\\\/g, '/')}"

ENTRY_COUNT=$(bun -e "
  try {
    const data = JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));
    if (!Array.isArray(data)) { process.stdout.write('INVALID'); process.exit(0); }
    process.stdout.write(String(data.length));
  } catch (err) {
    process.stdout.write('INVALID');
  }
" "$IDS_FILE" 2>/dev/null || echo "INVALID")

case "$ENTRY_COUNT" in
  ''|*[!0-9]*)
    echo "::error::Release notes validation failed: ENTRY_COUNT is non-numeric or malformed ('$ENTRY_COUNT')."
    exit 1
    ;;
esac

if [ "$ENTRY_COUNT" -eq 0 ]; then
  echo "::error::Release notes validation failed: zero eligible changelog entries found (ENTRY_COUNT=0). Refusing to publish release without user-facing notes."
  exit 1
fi

if [ ! -s "$NOTES_FILE" ] || [ -z "$(tr -d '[:space:]' < "$NOTES_FILE")" ]; then
  echo "::error::Release notes validation failed: generated release notes file is empty or whitespace-only."
  exit 1
fi

if ! bun scripts/release/releaseGate.mjs validate-notes --file "$NOTES_FILE" --ids "$IDS_FILE"; then
  echo "::error::Release notes validation failed: notes contain generic placeholder content or failed validation against eligible IDs."
  exit 1
fi
`
      assert.throws(
        () => execFileSync(bashExe, ['-c', script], { encoding: 'utf8', stdio: 'pipe' }),
        (err) => {
          assert.equal(err.status, 1, `Expected exit 1 for ${tc.name}`)
          const output = `${err.stdout || ''}\n${err.stderr || ''}`
          assert.ok(
            output.includes(tc.expectedError),
            `Expected '${tc.expectedError}' in output for ${tc.name}, got:\n${output}`
          )
          return true
        }
      )
    }

    // Valid notes + valid IDs -> should exit 0
    const validIdsFile = join(dir, 'valid_ids.json')
    const validNotesFile = join(dir, 'valid_notes.txt')
    writeFileSync(validIdsFile, JSON.stringify(['id-100']), 'utf8')
    writeFileSync(validNotesFile, '- Fix: POS receipt tax rounding issue\n- Perf: faster local cache loading', 'utf8')

    const successScript = `
set -euo pipefail
IDS_FILE="${validIdsFile.replace(/\\\\/g, '/')}"
NOTES_FILE="${validNotesFile.replace(/\\\\/g, '/')}"

ENTRY_COUNT=$(bun -e "
  try {
    const data = JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));
    if (!Array.isArray(data)) { process.stdout.write('INVALID'); process.exit(0); }
    process.stdout.write(String(data.length));
  } catch (err) {
    process.stdout.write('INVALID');
  }
" "$IDS_FILE" 2>/dev/null || echo "INVALID")

case "$ENTRY_COUNT" in
  ''|*[!0-9]*)
    echo "::error::Release notes validation failed: ENTRY_COUNT is non-numeric or malformed ('$ENTRY_COUNT')."
    exit 1
    ;;
esac

if [ "$ENTRY_COUNT" -eq 0 ]; then
  echo "::error::Release notes validation failed: zero eligible changelog entries found (ENTRY_COUNT=0). Refusing to publish release without user-facing notes."
  exit 1
fi

if [ ! -s "$NOTES_FILE" ] || [ -z "$(tr -d '[:space:]' < "$NOTES_FILE")" ]; then
  echo "::error::Release notes validation failed: generated release notes file is empty or whitespace-only."
  exit 1
fi

if ! bun scripts/release/releaseGate.mjs validate-notes --file "$NOTES_FILE" --ids "$IDS_FILE"; then
  echo "::error::Release notes validation failed: notes contain generic placeholder content or failed validation against eligible IDs."
  exit 1
fi
echo "GATE_PASSED"
`
    const successOut = execFileSync(bashExe, ['-c', successScript], { encoding: 'utf8', stdio: 'pipe' })
    assert.ok(successOut.includes('GATE_PASSED'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('build-android-test-release.yml enforces fail-closed release-notes validation before JDK/build steps', () => {
  const workflowPath = resolve(process.cwd(), '.github/workflows/build-android-test-release.yml')
  const content = readFileSync(workflowPath, 'utf8')

  const notesStepIdx = content.indexOf('id: notes')
  const jdkStepIdx = content.indexOf('name: Set up JDK 21')
  const assembleIdx = content.indexOf('assembleRelease')

  assert.ok(notesStepIdx > 0, 'id: notes step must exist')
  assert.ok(jdkStepIdx > 0, 'Set up JDK 21 step must exist')
  assert.ok(assembleIdx > 0, 'assembleRelease step must exist')
  assert.ok(notesStepIdx < jdkStepIdx, 'Release notes generation must strictly precede JDK setup')
  assert.ok(jdkStepIdx < assembleIdx, 'JDK setup must precede assembleRelease')

  const notesBlock = content.slice(notesStepIdx, jdkStepIdx)
  assert.match(notesBlock, /\[ "\$ENTRY_COUNT" -eq 0 \]/, 'Must reject zero eligible entries')
  assert.match(notesBlock, /ENTRY_COUNT is non-numeric or malformed/, 'Must validate ENTRY_COUNT format')
  assert.match(notesBlock, /\[ ! -s "\$NOTES_FILE" \] \|\| \[ -z "\$\(tr -d '\[:space:\]' < "\$NOTES_FILE"\)" \]/, 'Must reject empty or whitespace notes')
  assert.match(notesBlock, /bun scripts\/release\/releaseGate\.mjs validate-notes --file "\$NOTES_FILE" --ids "\$IDS_FILE"/, 'Must invoke validate-notes on exact NOTES_FILE with IDS_FILE')
  assert.match(notesBlock, /::error::Release notes validation failed: zero eligible changelog entries found/, 'Must emit GitHub Actions error on zero entries')
  assert.match(notesBlock, /::error::Release notes validation failed: generated release notes file is empty or whitespace-only/, 'Must emit GitHub Actions error on empty notes')
  assert.match(notesBlock, /::error::Release notes validation failed: notes contain generic placeholder content/, 'Must emit GitHub Actions error on placeholder notes')
})

test('build-android-test-release.yml Step 3b ledger fetch handles download without redundant same-path mv and validates fail-closed branches', () => {
  const workflowPath = resolve(process.cwd(), '.github/workflows/build-android-test-release.yml')
  const content = readFileSync(workflowPath, 'utf8')

  const ledgerStepIdx = content.indexOf('id: ledger')
  const reconcileStepIdx = content.indexOf('name: Reconcile prior release')

  assert.ok(ledgerStepIdx > 0, 'id: ledger step must exist')
  assert.ok(reconcileStepIdx > 0, 'Reconcile prior release step must exist')
  assert.ok(ledgerStepIdx < reconcileStepIdx, 'Fetch consumed-ID ledger must strictly precede reconciliation')

  const ledgerBlock = content.slice(ledgerStepIdx, reconcileStepIdx)

  // Verify LEDGER_FILE definition
  assert.match(ledgerBlock, /LEDGER_FILE="\$RUNNER_TEMP\/consumed-ids\.json"/, 'LEDGER_FILE must be defined in $RUNNER_TEMP')

  // Verify download command downloads to $RUNNER_TEMP
  assert.match(
    ledgerBlock,
    /gh release download "\$LATEST_TAG" --pattern 'consumed-ids\.json'[\s\\]+--dir "\$RUNNER_TEMP" --clobber/,
    'Must download consumed-ids.json directly to $RUNNER_TEMP'
  )

  // Verify NO redundant same-path mv command exists
  assert.doesNotMatch(
    ledgerBlock,
    /mv "\$RUNNER_TEMP\/consumed-ids\.json" "\$LEDGER_FILE"/,
    'Must not execute redundant same-path mv that fails under set -e'
  )

  // Verify ledger validation invocation
  assert.match(
    ledgerBlock,
    /bun scripts\/release\/releaseGate\.mjs validate-ledger --ledger "\$LEDGER_FILE"/,
    'Must validate ledger file directly using releaseGate.mjs validate-ledger'
  )

  // Verify error and fail-closed branches
  assert.match(ledgerBlock, /::error::Release \$LATEST_TAG lists consumed-ids\.json but download failed\./, 'Must fail on download failure')
  assert.match(ledgerBlock, /::error::Release \$LATEST_TAG has a malformed or corrupted consumed-ids\.json ledger\./, 'Must fail on malformed ledger')
  assert.match(ledgerBlock, /::error::Release \$LATEST_TAG has no consumed-ids\.json asset\. Refusing to guess consumed state\./, 'Must fail closed on missing ledger for modern release')
  assert.match(ledgerBlock, /isLegacyPreLedgerRelease/, 'Must check legacy release predicate')
  assert.match(ledgerBlock, /legacy_ledger_bootstrap=true/, 'Must emit legacy_ledger_bootstrap for historical releases')
  assert.match(ledgerBlock, /first_release=true/, 'Must handle first release')
})

test('Step 3b shell download simulation verifies direct file validation and reproduces same-path mv failure', () => {
  const bashPaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'bash',
  ]
  const bashExe = bashPaths.find((p) => {
    try {
      execFileSync(p, ['-c', 'echo ok'], { encoding: 'utf8', stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  })

  if (!bashExe) return

  const dir = mkdtempSync(join(tmpdir(), 'step3b-shell-test-'))
  try {
    const validLedger = JSON.stringify({
      schema: 2,
      releases: [record()],
    })

    const runnerTemp = dir.replace(/\\/g, '/')
    writeFileSync(join(dir, 'consumed-ids.json'), validLedger, 'utf8')

    // 1. Reproduce: running mv on identical paths fails under GNU coreutils / set -euo pipefail
    const failScript = `
set -euo pipefail
cd "${runnerTemp}"
touch samefile.json
mv samefile.json samefile.json
`
    assert.throws(
      () => execFileSync(bashExe, ['-c', failScript], { encoding: 'utf8', stdio: 'pipe' }),
      (err) => {
        assert.equal(err.status, 1)
        const combined = `${err.stdout || ''}\n${err.stderr || ''}`
        assert.match(combined, /are the same file/i)
        return true
      }
    )

    // 2. Corrected behavior: directly validating $LEDGER_FILE after download succeeds with exit 0
    const successScript = `
set -euo pipefail
RUNNER_TEMP="${runnerTemp}"
LEDGER_FILE="$RUNNER_TEMP/consumed-ids.json"
bun scripts/release/releaseGate.mjs validate-ledger --ledger "$LEDGER_FILE"
echo "VALIDATION_PASSED"
`
    const out = execFileSync(bashExe, ['-c', successScript], { encoding: 'utf8', stdio: 'pipe' })
    assert.ok(out.includes('VALIDATION_PASSED'))

    // 3. Corrupt ledger fails validation
    writeFileSync(join(dir, 'consumed-ids.json'), '{"schema": 2, "releases": [{ "bad": true }]}', 'utf8')
    const corruptScript = `
set -euo pipefail
RUNNER_TEMP="${runnerTemp}"
LEDGER_FILE="$RUNNER_TEMP/consumed-ids.json"
if ! bun scripts/release/releaseGate.mjs validate-ledger --ledger "$LEDGER_FILE"; then
  echo "MALFORMED_CAUGHT"
  exit 1
fi
`
    assert.throws(
      () => execFileSync(bashExe, ['-c', corruptScript], { encoding: 'utf8', stdio: 'pipe' }),
      (err) => {
        assert.equal(err.status, 1)
        const combined = `${err.stdout || ''}\n${err.stderr || ''}`
        assert.match(combined, /MALFORMED_CAUGHT/)
        return true
      }
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('selectLedgerRecord enforces exact versioning, ambiguity rejection, and verification gates', () => {
  const recordA = {
    versionCode: 1031,
    versionName: '1.0.31',
    assetVerified: true,
    policyVerified: true,
  }
  const recordB = {
    versionCode: 1034,
    versionName: '1.0.34',
    assetVerified: true,
    policyVerified: true,
  }
  const recordCUnverified = {
    versionCode: 1035,
    versionName: '1.0.35',
    assetVerified: false,
    policyVerified: true,
  }
  const multiLedger = {
    schema: 2,
    releases: [recordA, recordB, recordCUnverified],
  }

  // 1. Exact version selection when multiple verified releases exist
  assert.equal(selectLedgerRecord(multiLedger, '1.0.31'), recordA)
  assert.equal(selectLedgerRecord(multiLedger, '1.0.34'), recordB)
  assert.equal(selectLedgerRecord(multiLedger, 'v1.0.34'), recordB, 'Leading v normalized')

  // 2. Explicit version not found (returns null, never silently falls back)
  assert.equal(selectLedgerRecord(multiLedger, '1.0.99'), null)
  assert.equal(selectLedgerRecord(multiLedger, '2.0.0'), null)

  // 3. Ambiguous version matches (fails closed)
  const ambiguousLedger = {
    schema: 2,
    releases: [
      recordA,
      { ...recordB, buildSha: '1'.repeat(40) },
      { ...recordB, buildSha: '2'.repeat(40) },
    ],
  }
  assert.throws(
    () => selectLedgerRecord(ambiguousLedger, '1.0.34'),
    (err) => {
      assert.match(err.message, /ambiguous release selection/)
      return true
    }
  )

  // 4. Unverified matching record
  assert.equal(selectLedgerRecord(multiLedger, '1.0.35'), null, 'Unverified matching record must not be selected')

  // 5. No explicit version: newest verified record selected
  assert.equal(selectLedgerRecord(multiLedger, null), recordB, 'Must select newest verified record (recordB, not unverified recordC or older recordA)')
  assert.equal(selectLedgerRecord(multiLedger, ''), recordB)
  assert.equal(selectLedgerRecord(multiLedger, '   '), recordB)

  // Empty or unverified-only ledger returns null when no version passed
  assert.equal(selectLedgerRecord({ schema: 2, releases: [recordCUnverified] }, null), null)
  assert.equal(selectLedgerRecord({ schema: 2, releases: [] }, null), null)
  assert.equal(selectLedgerRecord(null, null), null)

  // 6. Legacy ledger compatibility (loaded via loadLedger)
  const legacyLedger = loadLedger(JSON.stringify({
    schema: 2,
    sha: 'a'.repeat(40),
    versionCode: 1028,
    versionName: '1.0.28',
    tag: 'test-release-run28',
    ids: ['rel_11111111'],
    notesHash: '0'.repeat(64),
    assetVerified: true,
    policyVerified: true,
  }))
  assert.equal(selectLedgerRecord(legacyLedger, '1.0.28')?.versionName, '1.0.28')
  assert.equal(selectLedgerRecord(legacyLedger, null)?.versionName, '1.0.28')
})

test('release workflow non-blocking changelog archival and lifecycle behavior', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-archive-test-'))
  const runnerTemp = join(dir, 'runner_temp')
  mkdtempSync(runnerTemp)

  const bashPaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'bash',
  ]
  const bashExe = bashPaths.find((p) => {
    try {
      execFileSync(p, ['-c', 'echo ok'], { encoding: 'utf8', stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  })

  if (!bashExe) return

  try {
    const changelogPath = join(dir, 'CHANGELOG.md')
    const tombstonesPath = join(dir, 'ignored.txt')
    const ledgerPath = join(dir, 'consumed-ids.json')
    writeFileSync(tombstonesPath, '', 'utf8')

    const initialChangelog = `# BOUXRE Changelog\n\n## Unreleased\n\n<!-- id: rel_11111111 -->\n- Alpha feature\n\n<!-- id: rel_22222222 -->\n- Beta feature\n\n<!-- archive-boundary -->\n`
    writeFileSync(changelogPath, initialChangelog, 'utf8')

    // Initial ledger with prior release (1.0.31)
    const ledgerData = {
      schema: 2,
      releases: [
        {
          schema: 2,
          buildSha: 'a'.repeat(40),
          versionCode: 1031,
          versionName: '1.0.31',
          tag: 'test-release-run31',
          consumedEntryIds: ['rel_99999999'],
          ids: ['rel_99999999'],
          notesHash: '0'.repeat(64),
          webReleaseUrl: 'https://example.com/31.apk',
          assetVerified: true,
          policyVerified: true,
          publishedAt: '2026-11-20T00:00:00Z',
          apkAssetName: 'BOUXRE-release-1.0.31.apk',
          apkSha256: 'f'.repeat(64),
          apkAssetPrefix: 'BOUXRE-release-',
        },
      ],
    }
    writeFileSync(ledgerPath, JSON.stringify(ledgerData, null, 2), 'utf8')

    // 1. Gate not satisfied: archival skipped, changelog unchanged, workflow continues
    const unverifiedLedger = {
      schema: 2,
      releases: [
        ...ledgerData.releases,
        {
          schema: 2,
          buildSha: 'b'.repeat(40),
          versionCode: 1035,
          versionName: '1.0.35',
          tag: 'test-release-run35',
          consumedEntryIds: ['rel_11111111'],
          ids: ['rel_11111111'],
          notesHash: '1'.repeat(64),
          webReleaseUrl: 'https://example.com/35.apk',
          assetVerified: false, // NOT VERIFIED
          policyVerified: true,
          publishedAt: '2026-11-21T00:00:00Z',
          apkAssetName: 'BOUXRE-release-1.0.35.apk',
          apkSha256: 'e'.repeat(64),
          apkAssetPrefix: 'BOUXRE-release-',
        },
      ],
    }
    writeFileSync(ledgerPath, JSON.stringify(unverifiedLedger, null, 2), 'utf8')

    const skipScript = `
set -euo pipefail
RUNNER_TEMP="${runnerTemp.replace(/\\/g, '/')}"
CHANGELOG_FILE="${changelogPath.replace(/\\/g, '/')}"
LEDGER_FILE="${ledgerPath.replace(/\\/g, '/')}"
TOMBSTONES_FILE="${tombstonesPath.replace(/\\/g, '/')}"
VERSION_NAME="1.0.35"

ARCHIVE_OUT="$RUNNER_TEMP/CHANGELOG.archived.md"
rm -f "$ARCHIVE_OUT"
bun scripts/release/releaseGate.mjs archive-gated \\
  --changelog "$CHANGELOG_FILE" \\
  --tombstones "$TOMBSTONES_FILE" \\
  --record "$LEDGER_FILE" \\
  --version "$VERSION_NAME" \\
  --date "2026-11-21" \\
  --out "$ARCHIVE_OUT"
if [ -s "$ARCHIVE_OUT" ]; then
  cp "$ARCHIVE_OUT" "$CHANGELOG_FILE"
  echo "APPLIED"
else
  echo "SKIPPED"
fi
`
    const skipOut = execFileSync(bashExe, ['-c', skipScript], { encoding: 'utf8', stdio: 'pipe' })
    assert.ok(skipOut.includes('SKIPPED'), 'Expected SKIPPED in output')
    assert.equal(readFileSync(changelogPath, 'utf8'), initialChangelog, 'Changelog must remain unchanged')

    // 2. Gate satisfied: archive output produced and applied correctly
    const verifiedLedger = {
      schema: 2,
      releases: [
        ...ledgerData.releases,
        {
          schema: 2,
          buildSha: 'c'.repeat(40),
          versionCode: 1035,
          versionName: '1.0.35',
          tag: 'test-release-run35',
          consumedEntryIds: ['rel_11111111'],
          ids: ['rel_11111111'],
          notesHash: '2'.repeat(64),
          webReleaseUrl: 'https://example.com/35.apk',
          assetVerified: true,
          policyVerified: true,
          publishedAt: '2026-11-21T00:00:00Z',
          apkAssetName: 'BOUXRE-release-1.0.35.apk',
          apkSha256: 'd'.repeat(64),
          apkAssetPrefix: 'BOUXRE-release-',
        },
      ],
    }
    writeFileSync(ledgerPath, JSON.stringify(verifiedLedger, null, 2), 'utf8')

    const applyScript = `
set -euo pipefail
RUNNER_TEMP="${runnerTemp.replace(/\\/g, '/')}"
CHANGELOG_FILE="${changelogPath.replace(/\\/g, '/')}"
LEDGER_FILE="${ledgerPath.replace(/\\/g, '/')}"
TOMBSTONES_FILE="${tombstonesPath.replace(/\\/g, '/')}"
VERSION_NAME="1.0.35"

ARCHIVE_OUT="$RUNNER_TEMP/CHANGELOG.archived.md"
rm -f "$ARCHIVE_OUT"
bun scripts/release/releaseGate.mjs archive-gated \\
  --changelog "$CHANGELOG_FILE" \\
  --tombstones "$TOMBSTONES_FILE" \\
  --record "$LEDGER_FILE" \\
  --version "$VERSION_NAME" \\
  --date "2026-11-21" \\
  --out "$ARCHIVE_OUT"
if [ -s "$ARCHIVE_OUT" ]; then
  cp "$ARCHIVE_OUT" "$CHANGELOG_FILE"
  echo "APPLIED"
else
  echo "SKIPPED"
fi
`
    const applyOut = execFileSync(bashExe, ['-c', applyScript], { encoding: 'utf8', stdio: 'pipe' })
    assert.ok(applyOut.includes('APPLIED'), 'Expected APPLIED in output')
    const updatedChangelog = readFileSync(changelogPath, 'utf8')
    assert.ok(updatedChangelog.includes('## [1.0.35] - 2026-11-21'), 'Must include 1.0.35 archive header')
    assert.ok(updatedChangelog.includes('<!-- id: rel_22222222 -->'), 'Beta must remain unreleased')

    // 3. Actual archival error: workflow fails clearly (e.g. malformed ledger)
    writeFileSync(ledgerPath, '{ malformed json ', 'utf8')
    const errorScript = `
set -euo pipefail
RUNNER_TEMP="${runnerTemp.replace(/\\/g, '/')}"
CHANGELOG_FILE="${changelogPath.replace(/\\/g, '/')}"
LEDGER_FILE="${ledgerPath.replace(/\\/g, '/')}"
TOMBSTONES_FILE="${tombstonesPath.replace(/\\/g, '/')}"
VERSION_NAME="1.0.35"

ARCHIVE_OUT="$RUNNER_TEMP/CHANGELOG.archived.md"
rm -f "$ARCHIVE_OUT"
bun scripts/release/releaseGate.mjs archive-gated \\
  --changelog "$CHANGELOG_FILE" \\
  --tombstones "$TOMBSTONES_FILE" \\
  --record "$LEDGER_FILE" \\
  --version "$VERSION_NAME" \\
  --date "2026-11-21" \\
  --out "$ARCHIVE_OUT"
if [ -s "$ARCHIVE_OUT" ]; then
  cp "$ARCHIVE_OUT" "$CHANGELOG_FILE"
  echo "APPLIED"
fi
`
    assert.throws(
      () => execFileSync(bashExe, ['-c', errorScript], { encoding: 'utf8', stdio: 'pipe' }),
      (err) => {
        assert.equal(err.status, 1, 'Script must fail closed on malformed ledger')
        return true
      }
    )

    // 3b. Ambiguous release records: fails closed with exit 1
    const ambiguousLedger = {
      schema: 2,
      releases: [
        ...verifiedLedger.releases,
        { ...verifiedLedger.releases[1], versionCode: 1036, buildSha: '3'.repeat(40) },
      ],
    }
    writeFileSync(ledgerPath, JSON.stringify(ambiguousLedger, null, 2), 'utf8')
    const ambiguousScript = `
set -euo pipefail
RUNNER_TEMP="${runnerTemp.replace(/\\/g, '/')}"
CHANGELOG_FILE="${changelogPath.replace(/\\/g, '/')}"
LEDGER_FILE="${ledgerPath.replace(/\\/g, '/')}"
TOMBSTONES_FILE="${tombstonesPath.replace(/\\/g, '/')}"
VERSION_NAME="1.0.35"

ARCHIVE_OUT="$RUNNER_TEMP/CHANGELOG.archived.md"
rm -f "$ARCHIVE_OUT"
bun scripts/release/releaseGate.mjs archive-gated \\
  --changelog "$CHANGELOG_FILE" \\
  --tombstones "$TOMBSTONES_FILE" \\
  --record "$LEDGER_FILE" \\
  --version "$VERSION_NAME" \\
  --date "2026-11-21" \\
  --out "$ARCHIVE_OUT"
if [ -s "$ARCHIVE_OUT" ]; then
  cp "$ARCHIVE_OUT" "$CHANGELOG_FILE"
  echo "APPLIED"
fi
`
    assert.throws(
      () => execFileSync(bashExe, ['-c', ambiguousScript], { encoding: 'utf8', stdio: 'pipe' }),
      (err) => {
        assert.equal(err.status, 1, 'Script must fail closed on ambiguous records')
        const combined = `${err.stdout || ''}\n${err.stderr || ''}`
        assert.match(combined, /ambiguous release selection/)
        return true
      }
    )

    // 4. Failed release: IDs remain unconsumed
    writeFileSync(changelogPath, initialChangelog, 'utf8')
    writeFileSync(ledgerPath, JSON.stringify(ledgerData, null, 2), 'utf8')

    const initialConsumed = collectConsumedIds(JSON.stringify(ledgerData))
    const notesRes1 = buildReleaseNotes(initialChangelog, initialConsumed)
    assert.deepEqual(notesRes1.ids, ['rel_11111111', 'rel_22222222'])

    const reloadedLedgerTextAfterFail = readFileSync(ledgerPath, 'utf8')
    const reloadedLedgerAfterFail = loadLedger(reloadedLedgerTextAfterFail)
    assert.equal(reloadedLedgerAfterFail.releases.length, 1)
    const consumedAfterFail = collectConsumedIds(reloadedLedgerTextAfterFail)
    assert.ok(!consumedAfterFail.includes('rel_11111111'))
    assert.ok(!consumedAfterFail.includes('rel_22222222'))

    // 5. Successful release: IDs are consumed and subsequently archived according to established process
    const successRecord = createConsumedRecord({
      sha: 'f'.repeat(40),
      versionCode: 1035,
      versionName: '1.0.35',
      tag: 'test-release-run35',
      ids: notesRes1.ids,
      notesHash: notesRes1.notesHash,
      webReleaseUrl: 'https://example.com/app.apk',
      apkAssetName: 'BOUXRE-release-1.0.35.apk',
      apkSha256: 'a'.repeat(64),
      assetVerified: true,
      policyVerified: true,
    })
    const mergedLedgerText = mergeLedger(readFileSync(ledgerPath, 'utf8'), successRecord)
    writeFileSync(ledgerPath, mergedLedgerText, 'utf8')

    const mergedLedger = loadLedger(mergedLedgerText)
    const consumedAfterSuccess = collectConsumedIds(mergedLedgerText)
    assert.ok(consumedAfterSuccess.includes('rel_11111111'))
    assert.ok(consumedAfterSuccess.includes('rel_22222222'))

    const postSuccessArchiveScript = `
set -euo pipefail
RUNNER_TEMP="${runnerTemp.replace(/\\/g, '/')}"
CHANGELOG_FILE="${changelogPath.replace(/\\/g, '/')}"
LEDGER_FILE="${ledgerPath.replace(/\\/g, '/')}"
TOMBSTONES_FILE="${tombstonesPath.replace(/\\/g, '/')}"
VERSION_NAME="1.0.35"

ARCHIVE_OUT="$RUNNER_TEMP/CHANGELOG.archived.md"
rm -f "$ARCHIVE_OUT"
bun scripts/release/releaseGate.mjs archive-gated \\
  --changelog "$CHANGELOG_FILE" \\
  --tombstones "$TOMBSTONES_FILE" \\
  --record "$LEDGER_FILE" \\
  --version "$VERSION_NAME" \\
  --date "2026-11-21" \\
  --out "$ARCHIVE_OUT"
if [ -s "$ARCHIVE_OUT" ]; then
  cp "$ARCHIVE_OUT" "$CHANGELOG_FILE"
  echo "APPLIED"
fi
`
    const postSuccessOut = execFileSync(bashExe, ['-c', postSuccessArchiveScript], { encoding: 'utf8', stdio: 'pipe' })
    assert.ok(postSuccessOut.includes('APPLIED'))
    const archivedModel = parseChangelog(readFileSync(changelogPath, 'utf8'))
    assert.equal(archivedModel.unreleased.length, 0)
    assert.equal(archivedModel.archives[0].version, '1.0.35')

    // 6. Rebuild after failure: eligible notes can be regenerated without duplicate consumption
    const changelogWithNew = `# BOUXRE Changelog\n\n## Unreleased\n\n<!-- id: rel_33333333 -->\n- Gamma\n\n<!-- id: rel_44444444 -->\n- Delta\n\n<!-- archive-boundary -->\n`
    writeFileSync(changelogPath, changelogWithNew, 'utf8')
    writeFileSync(ledgerPath, JSON.stringify(ledgerData, null, 2), 'utf8')

    const attempt1Notes = buildReleaseNotes(changelogWithNew, collectConsumedIds(JSON.stringify(ledgerData)))
    assert.deepEqual(attempt1Notes.ids, ['rel_33333333', 'rel_44444444'])

    const reloadedLedgerTextForRebuild = readFileSync(ledgerPath, 'utf8')
    const attempt2Notes = buildReleaseNotes(changelogWithNew, collectConsumedIds(reloadedLedgerTextForRebuild))
    assert.deepEqual(attempt2Notes.ids, ['rel_33333333', 'rel_44444444'])
    assert.equal(attempt2Notes.notesHash, attempt1Notes.notesHash)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})


