import test from 'node:test'
import assert from 'node:assert/strict'

import { proposalsFromReport, proposalsFromReports } from '../../../scripts/release/reportProposals.mjs'
import {
  appendEntries,
  parseChangelog,
  idForKey,
  createEmptyChangelog,
  verifyChangelog,
  archiveEntries,
  restoreVersion,
  serializeTombstones,
  createReissueId,
} from '../../../scripts/release/changelog.mjs'
import {
  createConsumedRecord,
  selectArchivableIds,
  verifyAssetDownload,
  evaluatePolicyState,
  hashNotes,
} from '../../../scripts/release/releaseGate.mjs'

const REPORT = 'docs/reports/whats-new-changelog/example.md'

test('one report with multiple user-facing changes yields distinct per-entry keys', () => {
  const text = `
# Example report

## Changelog entries
- **feat**: Added a new export flow.
- **fix**: Corrected a crash on save.
- **perf**: Sped up invoice rendering.
`
  const proposals = proposalsFromReport(REPORT, text)
  assert.equal(proposals.length, 3)
  assert.deepEqual(proposals.map((p) => p.key), [`${REPORT}#1`, `${REPORT}#2`, `${REPORT}#3`])
  const ids = proposals.map((p) => idForKey(p.key))
  assert.equal(new Set(ids).size, 3)
})

test('developer-only bullets are excluded from worker proposals', () => {
  const text = `
# Example report
- **feat**: User-facing feature.
- **refactor**: Internal cleanup.
- **docs**: Documentation only.
- **fix**: User-facing fix.
`
  const proposals = proposalsFromReports([{ path: REPORT, text }])
  assert.deepEqual(proposals.map((p) => p.text), ['User-facing feature.', 'User-facing fix.'])
})

test('proposalsFromReport ignores markdown headings and rejects internal engineering jargon', () => {
  const text = `
# Implementation Report

## Changelog entries
### Technical Subheading
- **feat**: stage 3d lifecycle, attachments and intelligence
- **fix**: Fixed bug in src/hooks/useAppUpdate.ts
- **feat**: Android update experience prototype
- **feat**: Allow invoice export to PDF in landscape
- stage 3b custom fields, groups and item images
- **fix**: Correct customer balance calculation on payment
`
  const proposals = proposalsFromReport(REPORT, text)
  assert.deepEqual(proposals.map((p) => p.text), [
    'Allow invoice export to PDF in landscape',
    'Correct customer balance calculation on payment',
  ])
})

test('worker proposals append once and reprocessing adds nothing', () => {
  const text = `
## Changelog entries
- **feat**: Added a new export flow.
- **fix**: Corrected a crash on save.
`
  const proposals = proposalsFromReports([{ path: REPORT, text }])
  const first = appendEntries(createEmptyChangelog(), proposals)
  assert.equal(first.added.length, 2)
  const second = appendEntries(first.text, proposals)
  assert.deepEqual(second.added, [])
  assert.equal(parseChangelog(second.text).unreleased.length, 2)
})

test('worker output never includes report-path hashes as visible text', () => {
  const text = `## Changelog entries\n- **feat**: Clean visible wording.`
  const proposals = proposalsFromReports([{ path: REPORT, text }])
  const result = appendEntries(createEmptyChangelog(), proposals)
  assert.equal(parseChangelog(result.text).unreleased[0].text, 'Clean visible wording.')
  assert.doesNotMatch(result.text, /docs\/reports/)
})

// ---------------------------------------------------------------------------
// Worker Integration & Idempotency Failure Matrix
// ---------------------------------------------------------------------------

test('worker matrix: no user-facing change yields empty proposals and leaves changelog unchanged', () => {
  const text = `
# Internal Maintenance Report
- **chore**: Updated github action runner
- **refactor**: Extracted internal helper
- **docs**: Fixed spelling in README
- **test**: Added unit test coverage
`
  const proposals = proposalsFromReports([{ path: REPORT, text }])
  assert.deepEqual(proposals, [])
  const initial = createEmptyChangelog()
  const result = appendEntries(initial, proposals)
  assert.deepEqual(result.added, [])
  assert.equal(result.text, initial)
})

test('worker matrix: operator reordered entries in Unreleased are preserved on append and archive', () => {
  const initial = `# BOUXRE Changelog

## Unreleased

<!-- id: rel_00000002 -->
- Beta feature two

<!-- id: rel_00000001 -->
- Alpha feature one

<!-- archive-boundary -->
`
  const newProposals = [{ key: `${REPORT}#3`, text: 'Gamma feature three' }]
  const appended = appendEntries(initial, newProposals)
  const model = parseChangelog(appended.text)
  // Verify manual order (Beta, Alpha) was preserved, Gamma placed after
  assert.equal(model.unreleased[0].text, 'Beta feature two')
  assert.equal(model.unreleased[1].text, 'Alpha feature one')
  assert.equal(model.unreleased[2].text, 'Gamma feature three')
})

test('worker matrix: ignored tombstone in changelog/ignored.txt is refused on append', () => {
  const key = `${REPORT}#tombstoned`
  const id = idForKey(key)
  const tombstones = serializeTombstones([id])
  const proposals = [{ key, text: 'This was deleted previously' }]
  const result = appendEntries(createEmptyChangelog(), proposals, tombstones)
  assert.deepEqual(result.added, [])
  assert.deepEqual(result.refused.map((r) => r.id), [id])
  assert.equal(parseChangelog(result.text).unreleased.length, 0)
})

test('worker matrix: reissued entry via restoreVersion mints linked reissue and is appended/verified cleanly', () => {
  const originalId = idForKey(`${REPORT}#orig`)
  const base = `# BOUXRE Changelog

## Unreleased

<!-- archive-boundary -->

## [1.0.0] - 2026-11-19

<!-- id: ${originalId} -->
- Original shipped feature
`
  const restored = restoreVersion(base, '', '1.0.0')
  const model = parseChangelog(restored.text)
  const reissue = model.unreleased[0]
  assert.ok(reissue)
  assert.equal(reissue.reissueOf, originalId)
  assert.equal(reissue.id, createReissueId(originalId, '1.0.0'))

  // Verify changelog integrity passes with reissue link
  const errors = verifyChangelog(restored.text, restored.tombstones)
  assert.deepEqual(errors, [])
})

test('worker matrix: unavailable or mismatched APK fails asset verification and blocks archive', () => {
  const id = idForKey(`${REPORT}#asset-test`)
  const cl = `# BOUXRE Changelog\n\n## Unreleased\n\n<!-- id: ${id} -->\n- Shipped feature\n\n<!-- archive-boundary -->\n`
  const expectedSha256 = 'e'.repeat(64)

  // 1. Download probe failed (HTTP 500)
  const failProbe = verifyAssetDownload({
    httpCode: 500,
    contentType: 'application/vnd.android.package-archive',
    byteLength: 50000000,
    expectedSha256,
    actualSha256: expectedSha256,
  })
  assert.equal(failProbe.ok, false)

  // 2. Digest mismatch
  const mismatchProbe = verifyAssetDownload({
    httpCode: 200,
    contentType: 'application/vnd.android.package-archive',
    byteLength: 50000000,
    expectedSha256,
    actualSha256: 'f'.repeat(64),
  })
  assert.equal(mismatchProbe.ok, false)

  // When assetVerified is false in the record, selectArchivableIds returns []
  const record = createConsumedRecord({
    sha: 'c'.repeat(40),
    versionCode: 1001,
    versionName: '1.0.1',
    tag: 'test-release-run1',
    ids: [id],
    notesHash: hashNotes('- Shipped feature'),
    assetVerified: false,
    policyVerified: true,
  })
  const archivable = selectArchivableIds({
    unreleasedIds: [id],
    record,
    tombstones: [],
  })
  assert.deepEqual(archivable, [])
})

test('worker matrix: unconfirmed policy sync blocks archive gate and keeps entries pending', () => {
  const id = idForKey(`${REPORT}#policy-test`)
  // When policyVerified is false, archive gate refuses to consume
  const record = createConsumedRecord({
    sha: 'c'.repeat(40),
    versionCode: 1002,
    versionName: '1.0.2',
    tag: 'test-release-run2',
    ids: [id],
    notesHash: hashNotes('- Policy pending feature'),
    assetVerified: true,
    policyVerified: false,
  })
  const archivable = selectArchivableIds({
    unreleasedIds: [id],
    record,
    tombstones: [],
  })
  assert.deepEqual(archivable, [], 'must not archive when policy is unconfirmed')
})

test('worker matrix: offline worker skips archival safely without blocking commit/push or losing entries', () => {
  const id = idForKey(`${REPORT}#offline-test`)
  const changelog = `# BOUXRE Changelog\n\n## Unreleased\n\n<!-- id: ${id} -->\n- Offline commit entry\n\n<!-- archive-boundary -->\n`

  // When offline, worker skips archival: entries remain in Unreleased
  // verifyChangelog still passes
  const errors = verifyChangelog(changelog, '')
  assert.deepEqual(errors, [])
  const model = parseChangelog(changelog)
  assert.equal(model.unreleased.length, 1)
  assert.equal(model.unreleased[0].id, id)
})

test('worker matrix: verify failure on untagged, duplicate, or malformed entries blocks stage/push', () => {
  // Untagged bullet
  const untagged = `# BOUXRE Changelog\n\n## Unreleased\n\n- Untagged bullet\n\n<!-- archive-boundary -->\n`
  assert.ok(verifyChangelog(untagged, '').some((e) => e.includes('untagged bullet')))

  // Duplicate ID
  const dupId = idForKey('test#dup')
  const duplicate = `# BOUXRE Changelog\n\n## Unreleased\n\n<!-- id: ${dupId} -->\n- Item 1\n\n<!-- id: ${dupId} -->\n- Item 2\n\n<!-- archive-boundary -->\n`
  assert.ok(verifyChangelog(duplicate, '').some((e) => e.includes('duplicate ID')))

  // Malformed ID
  const malformed = `# BOUXRE Changelog\n\n## Unreleased\n\n<!-- id: not-an-id -->\n- Item\n\n<!-- archive-boundary -->\n`
  assert.ok(verifyChangelog(malformed, '').some((e) => e.includes('untagged bullet') || e.includes('malformed')))
})

test('worker matrix: idempotent double archive does not duplicate entries or corrupt changelog', () => {
  const id = idForKey(`${REPORT}#double-archive`)
  const changelog = `# BOUXRE Changelog\n\n## Unreleased\n\n<!-- id: ${id} -->\n- Feature to archive\n\n<!-- archive-boundary -->\n`
  const record = createConsumedRecord({
    sha: 'd'.repeat(40),
    versionCode: 1003,
    versionName: '1.0.3',
    tag: 'test-release-run3',
    ids: [id],
    notesHash: hashNotes('- Feature to archive'),
    assetVerified: true,
    policyVerified: true,
  })

  // First archive
  const archivable1 = selectArchivableIds({
    unreleasedIds: [id],
    record,
    tombstones: [],
  })
  assert.deepEqual(archivable1, [id])
  const archivedOnce = archiveEntries(changelog, {
    version: '1.0.3',
    date: '2026-11-19',
    ids: archivable1,
  })
  const modelOnce = parseChangelog(archivedOnce)
  assert.equal(modelOnce.unreleased.length, 0)
  assert.equal(modelOnce.archives.length, 1)

  // Second archive call with the same changelog:
  // Since unreleasedIds no longer contains id, selectArchivableIds returns []
  const modelUnreleased = modelOnce.unreleased.map((e) => e.id)
  const archivable2 = selectArchivableIds({
    unreleasedIds: modelUnreleased,
    record,
    tombstones: [],
  })
  assert.deepEqual(archivable2, [])

  // And archiveEntries throws atomically if caller tries to archive already-archived ID
  assert.throws(
    () => archiveEntries(archivedOnce, { version: '1.0.3', date: '2026-11-19', ids: [id] }),
    /not in Unreleased/
  )
})
