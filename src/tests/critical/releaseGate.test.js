import test from 'node:test'
import assert from 'node:assert/strict'

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
  filterStaleApkObjects,
  planStorageRetention,
  verifyStorageRetentionInvariant,
  MAX_RETAINED_APKS,
  PREVIOUS_APK_MAX_AGE_MS,
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
