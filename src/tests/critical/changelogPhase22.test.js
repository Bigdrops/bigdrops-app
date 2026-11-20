import test from 'node:test'
import assert from 'node:assert/strict'

import {
  RECORD_SCHEMA,
  stripIdComments,
  hashNotes,
  buildReleaseNotes,
  buildReleaseNotesForSha,
  collectConsumedIds,
  createConsumedRecord,
  parseConsumedRecord,
  serializeConsumedRecord,
  serializeLedger,
  readConsumedRecords,
  loadLedger,
  mergeLedger,
  planReconciliation,
  createReissue,
  verifyAssetDownload,
  evaluatePolicyState,
  isSeededPolicyRow,
  verifyExistingRelease,
  selectArchivableIds,
} from '../../../scripts/release/releaseGate.mjs'
import {
  createEmptyChangelog,
  appendEntries,
  archiveEntries,
  loadChangelogAtSha,
  createReissueId,
  idForKey,
  parseChangelog,
} from '../../../scripts/release/changelog.mjs'

const A = idForKey('report-a.md#1')
const B = idForKey('report-a.md#2')
const SHA = 'a'.repeat(40)
const SHA2 = 'b'.repeat(40)
const doc = (...entries) => `# BOUXRE Changelog\n\n## Unreleased\n\n${entries.join('\n\n')}\n\n<!-- archive-boundary -->\n`
const entry = (id, text) => `<!-- id: ${id} -->\n- ${text}`

const record = (overrides = {}) => createConsumedRecord({
  buildSha: SHA,
  versionCode: 1007,
  versionName: '1.0.7',
  tag: 'test-release-run7',
  consumedEntryIds: [A],
  notesHash: hashNotes('- Feature one'),
  webReleaseUrl: 'https://example.test/app.apk',
  assetVerified: true,
  policyVerified: true,
  publishedAt: '2026-11-19T00:00:00Z',
  releaseTitle: 'BIGDROPS test release 1.0.7 (test-release-run7)',
  apkAssetName: 'BIGDROPS-test-release-1.0.7-run7-aaaaaaa.apk',
  ...overrides,
})

// ---------------------------------------------------------------------------
// True SHA snapshot
// ---------------------------------------------------------------------------

test('buildReleaseNotesForSha reads the changelog at the exact build SHA', () => {
  const snapshot = doc(entry(A, 'Feature one'), entry(B, 'Fix two'))
  const reader = (sha, opts) => {
    assert.equal(sha, SHA)
    assert.equal(opts.cwd, '/repo')
    return snapshot
  }
  const result = buildReleaseNotesForSha({ buildSha: SHA, consumedIds: [A], readSnapshot: reader, cwd: '/repo' })
  assert.deepEqual(result.ids, [B])
  assert.equal(result.notes, '- Fix two')
  assert.equal(result.buildSha, SHA)
  assert.equal(result.snapshot, snapshot)
})

test('buildReleaseNotesForSha rejects an invalid or non-full SHA', () => {
  assert.throws(() => buildReleaseNotesForSha({ buildSha: 'short', readSnapshot: () => '' }), /invalid build sha/)
})

test('loadChangelogAtSha treats a missing file at a real commit as empty, bad ref as error', () => {
  const empty = loadChangelogAtSha(SHA, { reader: () => '' })
  assert.equal(parseChangelog(empty).unreleased.length, 0)
  assert.throws(
    () => loadChangelogAtSha(SHA, { reader: () => { throw new Error('fatal: bad object') } }),
    /bad object/,
  )
  assert.throws(() => loadChangelogAtSha('not-a-sha', { reader: () => '' }), /invalid build sha/)
})

// ---------------------------------------------------------------------------
// Ledger durability / fail-closed
// ---------------------------------------------------------------------------

test('consumed record schema v2 includes buildSha, consumedEntryIds and reissue links', () => {
  const r = record({ reissueOf: [A], reissuedFrom: [A] })
  assert.equal(r.schema, RECORD_SCHEMA)
  assert.equal(r.buildSha, SHA)
  assert.equal(r.sha, SHA)
  assert.deepEqual(r.consumedEntryIds, [A])
  assert.deepEqual(r.reissueOf, [A])
  assert.deepEqual(r.reissuedFrom, [A])
  assert.deepEqual(parseConsumedRecord(serializeConsumedRecord(r)), r)
})

test('loadLedger fails closed on missing, malformed and unsupported-schema input', () => {
  assert.throws(() => loadLedger(''), /missing/)
  assert.deepEqual(loadLedger('', { allowMissing: true }).releases, [])
  assert.throws(() => loadLedger('{not json'), /JSON/)
  assert.throws(() => loadLedger('{"schema":99,"releases":[]}'), /unsupported consumed record schema/)
})

test('loadLedger rejects two different builds claiming the same version', () => {
  const ledger = serializeLedger([record(), record({ buildSha: SHA2, tag: 'other' })])
  assert.throws(() => loadLedger(ledger), /conflicting consumed records/)
})

test('mergeLedger keeps historical records and is idempotent for the same build', () => {
  const prior = record({ versionCode: 1006, versionName: '1.0.6', tag: 'test-release-run6' })
  const ledger = serializeLedger([prior])
  const merged = mergeLedger(ledger, record())
  assert.equal(readConsumedRecords(merged).length, 2)
  const again = mergeLedger(merged, record())
  assert.equal(readConsumedRecords(again).length, 2)
  assert.deepEqual(readConsumedRecords(again).map((r) => r.versionCode), [1006, 1007])
})

test('collectConsumedIds excludes the current version so retries recompute the same notes', () => {
  const ledger = serializeLedger([
    record({ versionCode: 1006, consumedEntryIds: [A] }),
    record({ versionCode: 1007, consumedEntryIds: [B] }),
  ])
  assert.deepEqual(collectConsumedIds(ledger, { beforeVersionCode: 1007 }), [A])
  assert.deepEqual(collectConsumedIds(ledger, { beforeVersionCode: 1008 }), [A, B])
})

test('planReconciliation detects a confirmed release ahead of policy and refuses ambiguity', () => {
  const ahead = record({ versionCode: 1008, versionName: '1.0.8', tag: 'test-release-run8' })
  const ledger = serializeLedger([record(), ahead])
  const plan = planReconciliation({ policyVersionCode: 1007, ledgerText: ledger })
  assert.equal(plan.action, 'resume')
  assert.equal(plan.release.versionCode, 1008)
  const ambiguous = serializeLedger([
    ahead,
    record({ versionCode: 1009, versionName: '1.0.9', tag: 'test-release-run9' }),
  ])
  assert.equal(planReconciliation({ policyVersionCode: 1007, ledgerText: ambiguous }).action, 'conflict')
  assert.equal(planReconciliation({ policyVersionCode: 1007, ledgerText: serializeLedger([record()]) }).action, 'none')
})

// ---------------------------------------------------------------------------
// Reissue identity
// ---------------------------------------------------------------------------

test('reissue mints a distinct id linked to the original without mutating history', () => {
  const reissued = createReissue({ originalId: A, key: 'report-r.md#1' })
  assert.notEqual(reissued.id, A)
  assert.equal(reissued.reissueOf, A)
  assert.match(reissued.id, /^rel_[0-9a-f]{8}$/)
  assert.equal(createReissueId(A, 'report-r.md#1'), reissued.id)
  // Original consumption record remains untouched.
  const original = record({ consumedEntryIds: [A] })
  assert.deepEqual(original.consumedEntryIds, [A])
})

test('createReissue rejects invalid original ids and empty keys', () => {
  assert.throws(() => createReissue({ originalId: 'bad', key: 'k' }), /invalid original/)
  assert.throws(() => createReissue({ originalId: A, key: '' }), /key is required/)
})

// ---------------------------------------------------------------------------
// NULL policy bootstrap
// ---------------------------------------------------------------------------

test('seeded NULL policy row advances; NULL with unexpected metadata conflicts', () => {
  const seeded = { versionCode: null, versionName: null, webReleaseUrl: null, releaseNotes: null, effectiveAt: null }
  assert.equal(isSeededPolicyRow(seeded), true)
  assert.equal(evaluatePolicyState(seeded, record()).action, 'advance')
  const dirty = { ...seeded, versionName: '1.0.6', webReleaseUrl: 'https://example.test/old.apk' }
  assert.equal(isSeededPolicyRow(dirty), false)
  assert.equal(evaluatePolicyState(dirty, record()).action, 'conflict')
})

test('higher-policy rejection and equal-version idempotency still hold', () => {
  const current = (code) => ({ versionCode: code, versionName: '1.0.6', webReleaseUrl: 'old', releaseNotes: 'old' })
  assert.equal(evaluatePolicyState(current(1008), record()).action, 'reject')
  assert.equal(evaluatePolicyState(current(1006), record()).action, 'advance')
  assert.equal(evaluatePolicyState(current(1007), record(), record()).action, 'noop')
  assert.equal(evaluatePolicyState(current(1007), record(), record({ buildSha: SHA2 })).action, 'conflict')
})

// ---------------------------------------------------------------------------
// Retry verification / asset
// ---------------------------------------------------------------------------

test('verifyExistingRelease accepts a fully matching release and rejects each mismatch', () => {
  const expected = {
    buildSha: SHA, releaseTitle: 'title', notesHash: hashNotes('- notes'),
    apkAssetName: 'app.apk', versionCode: 1007, tag: 'test-release-run7',
  }
  const observed = {
    exists: true, tagSha: SHA, title: 'title', notesHash: hashNotes('- notes'),
    assetPresent: true, assetName: 'app.apk', assetVerified: true,
    ledgerPresent: true, ledgerSha: SHA, ledgerVersionCode: 1007, ledgerTag: 'test-release-run7',
  }
  assert.equal(verifyExistingRelease({ expected, observed }).ok, true)
  assert.match(verifyExistingRelease({ expected, observed: { ...observed, exists: false } }).mismatches[0], /does not exist/)
  assert.match(verifyExistingRelease({ expected, observed: { ...observed, tagSha: SHA2 } }).mismatches[0], /tag SHA/)
  assert.match(verifyExistingRelease({ expected, observed: { ...observed, title: 'other' } }).mismatches[0], /title/)
  assert.match(verifyExistingRelease({ expected, observed: { ...observed, notesHash: 'x' } }).mismatches[0], /notes/)
  assert.match(verifyExistingRelease({ expected, observed: { ...observed, assetPresent: false } }).mismatches[0], /missing/)
  assert.match(verifyExistingRelease({ expected, observed: { ...observed, ledgerSha: SHA2 } }).mismatches[0], /SHA/i)
  assert.match(verifyExistingRelease({ expected, observed: { ...observed, policyAction: 'reject' } }).mismatches[0], /policy/)
})

test('asset verification still rejects non-200, HTML and empty bodies', () => {
  const digest = 'a'.repeat(64)
  const base = { expectedSha256: digest, actualSha256: digest }
  assert.equal(verifyAssetDownload({ httpCode: 200, contentType: 'application/vnd.android.package-archive', byteLength: 2048, ...base }).ok, true)
  assert.equal(verifyAssetDownload({ httpCode: 404, contentType: 'application/octet-stream', byteLength: 10, ...base }).ok, false)
  assert.equal(verifyAssetDownload({ httpCode: 200, contentType: 'text/html', byteLength: 500, ...base }).ok, false)
  assert.equal(verifyAssetDownload({ httpCode: 200, contentType: 'application/octet-stream', byteLength: 0, ...base }).ok, false)
})

// ---------------------------------------------------------------------------
// Archive gating with reissued entries
// ---------------------------------------------------------------------------

test('archive gate uses consumedEntryIds and leaves reissued/unverified entries pending', () => {
  const reissued = createReissue({ originalId: A, key: 'report-r.md#1' })
  const head = doc(entry(A, 'Shipped.'), entry(B, 'Pending.'), entry(reissued.id, 'Reissued.'))
  const ids = selectArchivableIds({
    unreleasedIds: [A, B, reissued.id],
    record: record(),
    tombstones: [],
  })
  assert.deepEqual(ids, [A])
  const archived = archiveEntries(head, { version: '1.0.7', date: '2026-11-19', ids })
  const model = parseChangelog(archived)
  assert.deepEqual(model.unreleased.map((e) => e.id), [B, reissued.id])
  assert.equal(model.archives[0].entries[0].id, A)
})

test('stripIdComments protects non-bullet notes from comment leakage', () => {
  const raw = `<!-- id: ${A} -->\nPlain summary`
  assert.equal(stripIdComments(raw), 'Plain summary')
  assert.doesNotMatch(stripIdComments(raw), /<!--|rel_/)
})
