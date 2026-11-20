import test from 'node:test'
import assert from 'node:assert/strict'

import {
  RECORD_SCHEMA,
  buildReleaseNotesForSha,
  createConsumedRecord,
  createReissue,
  hashNotes,
  verifyAssetDownload,
  verifyExistingRelease,
  selectArchivableIds,
} from '../../../scripts/release/releaseGate.mjs'
import {
  createReissueId,
  parseChangelog,
  serializeChangelog,
  archiveEntries,
  restoreVersion,
  verifyChangelog,
  computeNotes,
  idForKey,
} from '../../../scripts/release/changelog.mjs'

const A = idForKey('report-a.md#1')
const B = idForKey('report-a.md#2')
const SHA = 'a'.repeat(40)
const SHA2 = 'b'.repeat(40)
const DIGEST = 'c'.repeat(64)
const doc = (...entries) => `# BOUXRE Changelog\n\n## Unreleased\n\n${entries.join('\n\n')}\n\n<!-- archive-boundary -->\n`
const entry = (id, text) => `<!-- id: ${id} -->\n- ${text}`
const archivedDoc = (version, ...entries) =>
  `${doc()}\n## [${version}] - 2026-11-19\n\n${entries.join('\n\n')}\n`

// ---------------------------------------------------------------------------
// Fix 1: idempotent restoration / reissue identity
// ---------------------------------------------------------------------------

test('first restore mints a deterministic reissue id linked to the original', () => {
  const archived = archivedDoc('1.0.28', entry(A, 'Shipped feature.'))
  const restored = restoreVersion(archived, '', '1.0.28')
  const model = parseChangelog(restored.text)

  const expected = createReissueId(A, '1.0.28')
  assert.equal(model.unreleased.length, 1)
  assert.equal(model.unreleased[0].id, expected)
  assert.equal(model.unreleased[0].reissueOf, A)
  assert.notEqual(model.unreleased[0].id, A)
  // Original ID remains in the archive; history is not rewritten.
  assert.equal(model.archives[0].entries[0].id, A)
  assert.equal(model.archives[0].entries[0].text, 'Shipped feature.')
  assert.deepEqual(verifyChangelog(restored.text, restored.tombstones), [])
})

test('repeated restore is idempotent: same reissue id, no duplicate entry', () => {
  const archived = archivedDoc('1.0.28', entry(A, 'Shipped feature.'))
  const first = restoreVersion(archived, '', '1.0.28')
  const second = restoreVersion(first.text, first.tombstones, '1.0.28')

  const firstModel = parseChangelog(first.text)
  const secondModel = parseChangelog(second.text)
  assert.equal(second.text, first.text)
  assert.equal(secondModel.unreleased.length, 1)
  assert.equal(secondModel.unreleased[0].id, firstModel.unreleased[0].id)
  assert.equal(secondModel.unreleased[0].reissueOf, A)
})

test('reissue link survives serialize/parse and produces clean notes', () => {
  const archived = archivedDoc('1.0.28', entry(A, 'Shipped feature.'))
  const restored = restoreVersion(archived, '', '1.0.28')
  const roundTripped = serializeChangelog(parseChangelog(restored.text))
  assert.match(roundTripped, /reissueOf:/)

  const reissued = createReissueId(A, '1.0.28')
  const snapshot = doc(entry(reissued, 'Shipped feature.'), entry(B, 'Pending fix.'))
  const notes = buildReleaseNotesForSha({
    buildSha: SHA,
    consumedIds: [A], // original consumed ID; reissue is NOT consumed
    readSnapshot: () => snapshot,
  })
  assert.equal(notes.notes, '- Shipped feature.\n- Pending fix.')
  assert.doesNotMatch(notes.notes, /<!--|reissueOf|rel_/)
  // compute-notes (core path) is clean too.
  assert.equal(computeNotes(snapshot, doc(entry(A, 'old'))), '- Shipped feature.\n- Pending fix.')
})

test('restored reissue is eligible for a future release, original stays consumed', () => {
  const archived = archivedDoc('1.0.28', entry(A, 'Shipped feature.'))
  const restored = restoreVersion(archived, '', '1.0.28')
  const reissued = parseChangelog(restored.text).unreleased[0].id

  const consumedRecord = createConsumedRecord({
    buildSha: SHA, versionCode: 1007, versionName: '1.0.7', tag: 'test-release-run7',
    consumedEntryIds: [A], notesHash: hashNotes('- Shipped feature.'),
    assetVerified: true, policyVerified: true, apkSha256: DIGEST,
  })
  const ids = selectArchivableIds({
    unreleasedIds: [reissued], record: consumedRecord, tombstones: [],
  })
  assert.deepEqual(ids, [], 'original consumed ID must not re-archive the reissue')
})

test('verifyChangelog rejects self-referential reissue links; malformed links are not accepted as IDs', () => {
  const self = doc(`<!-- id: ${A}; reissueOf: ${A} -->\n- Self link`)
  assert.match(verifyChangelog(self, '').join('\n'), /self-referential/)
  // A malformed reissueOf cannot be parsed as a valid ID comment, so the
  // bullet is reported as untagged rather than silently accepted.
  const bad = doc(`<!-- id: ${B}; reissueOf: nope -->\n- Bad link`)
  assert.match(verifyChangelog(bad, '').join('\n'), /untagged bullet/)
})

// ---------------------------------------------------------------------------
// Fix 2: APK SHA-256 digest chain
// ---------------------------------------------------------------------------

test('correct APK digest passes; modified bytes and wrong digest fail closed', () => {
  assert.equal(verifyAssetDownload({
    httpCode: 200, contentType: 'application/vnd.android.package-archive',
    byteLength: 2048, expectedSha256: DIGEST, actualSha256: DIGEST,
  }).ok, true)

  const modified = verifyAssetDownload({
    httpCode: 200, contentType: 'application/vnd.android.package-archive',
    byteLength: 2048, expectedSha256: DIGEST, actualSha256: 'd'.repeat(64),
  })
  assert.equal(modified.ok, false)
  assert.match(modified.reasons.join('\n'), /digest mismatch/i)
})

test('missing or malformed expected/actual digest fails closed', () => {
  for (const args of [
    { expectedSha256: null, actualSha256: DIGEST },
    { expectedSha256: DIGEST, actualSha256: null },
    { expectedSha256: 'short', actualSha256: DIGEST },
    { expectedSha256: DIGEST, actualSha256: 'zzz' },
  ]) {
    const result = verifyAssetDownload({
      httpCode: 200, contentType: 'application/octet-stream', byteLength: 100, ...args,
    })
    assert.equal(result.ok, false, `expected fail-closed for ${JSON.stringify(args)}`)
    assert.match(result.reasons.join('\n'), /digest/i)
  }
})

test('createConsumedRecord validates apkSha256 and keeps it in the ledger record', () => {
  const record = createConsumedRecord({
    buildSha: SHA, versionCode: 1007, versionName: '1.0.7', tag: 'test-release-run7',
    consumedEntryIds: [A], notesHash: hashNotes('- notes'), apkSha256: DIGEST,
    assetVerified: true, policyVerified: true,
  })
  assert.equal(record.apkSha256, DIGEST)
  assert.equal(record.schema, RECORD_SCHEMA)
  assert.throws(() => createConsumedRecord({
    buildSha: SHA, versionCode: 1007, versionName: '1.0.7', tag: 't',
    consumedEntryIds: [A], notesHash: hashNotes('- notes'), apkSha256: 'not-a-digest',
  }), /invalid apkSha256/)
})

test('retry verification rejects mismatched digests on both GitHub and Supabase APKs', () => {
  const expected = {
    buildSha: SHA, releaseTitle: 'title', notesHash: hashNotes('- notes'),
    apkAssetName: 'Bouxre-release-1.0.7.apk', versionCode: 1007, tag: 'test-release-run7',
    apkSha256: DIGEST,
  }
  const observed = {
    exists: true, tagSha: SHA, title: 'title', notesHash: hashNotes('- notes'),
    assetPresent: true, assetName: 'Bouxre-release-1.0.7.apk', assetVerified: true,
    apkSha256: DIGEST, hostedApkSha256: DIGEST,
    ledgerPresent: true, ledgerSha: SHA, ledgerVersionCode: 1007, ledgerTag: 'test-release-run7',
  }
  assert.equal(verifyExistingRelease({ expected, observed }).ok, true)

  const ghBad = verifyExistingRelease({ expected, observed: { ...observed, apkSha256: 'd'.repeat(64) } })
  assert.equal(ghBad.ok, false)
  assert.match(ghBad.mismatches.join('\n'), /GitHub APK/)

  const hostedBad = verifyExistingRelease({ expected, observed: { ...observed, hostedApkSha256: 'e'.repeat(64) } })
  assert.equal(hostedBad.ok, false)
  assert.match(hostedBad.mismatches.join('\n'), /Supabase-hosted APK/)

  const missing = verifyExistingRelease({ expected, observed: { ...observed, apkSha256: null } })
  assert.equal(missing.ok, false)
  assert.match(missing.mismatches.join('\n'), /GitHub APK/)
})

test('BOUXRE-release- standardized naming and apkAssetPrefix in retry verification', () => {
  const expected = {
    buildSha: SHA, releaseTitle: 'title', notesHash: hashNotes('- notes'),
    apkAssetName: 'BOUXRE-release-1.0.7-run7-a1b2c3d.apk', versionCode: 1007, tag: 'test-release-run7',
    apkSha256: DIGEST, apkAssetPrefix: 'BOUXRE-release-',
  }
  const observed = {
    exists: true, tagSha: SHA, title: 'title', notesHash: hashNotes('- notes'),
    assetPresent: true, assetName: 'BOUXRE-release-1.0.7-run7-a1b2c3d.apk', assetVerified: true,
    apkSha256: DIGEST, hostedApkSha256: DIGEST,
    ledgerPresent: true, ledgerSha: SHA, ledgerVersionCode: 1007, ledgerTag: 'test-release-run7',
    apkAssetPrefix: 'BOUXRE-release-',
  }
  assert.equal(verifyExistingRelease({ expected, observed }).ok, true)

  const prefixMismatch = verifyExistingRelease({
    expected,
    observed: { ...observed, apkAssetPrefix: 'BIGDROPS-test-release-' },
  })
  assert.equal(prefixMismatch.ok, false)
  assert.match(prefixMismatch.mismatches.join('\n'), /APK asset prefix mismatch/)
})
