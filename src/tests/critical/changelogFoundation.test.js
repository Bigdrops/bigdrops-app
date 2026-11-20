import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createEmptyChangelog,
  parseChangelog,
  serializeChangelog,
  idForKey,
  newId,
  verifyChangelog,
  curateProposals,
  syncTombstones,
  appendEntries,
  addTombstones,
  archiveEntries,
  restoreVersion,
  computeNotes,
  parseTombstones,
  ID_PATTERN,
} from '../../../scripts/release/changelog.mjs'

const entry = (id, text) => `<!-- id: ${id} -->\n- ${text}`
const doc = (...entries) => `# BOUXRE Changelog\n\n## Unreleased\n\n${entries.join('\n\n')}\n\n<!-- archive-boundary -->\n`
const A = idForKey('report-a.md#1')
const B = idForKey('report-a.md#2')
const C = idForKey('report-b.md#1')

// ---------------------------------------------------------------------------
// Bootstrap / identity
// ---------------------------------------------------------------------------

test('empty changelog has a usable Unreleased section and no invented history', () => {
  const text = createEmptyChangelog()
  assert.match(text, /^# BOUXRE Changelog/)
  assert.match(text, /## Unreleased/)
  assert.doesNotMatch(text, /## \[/)
  assert.deepEqual(parseChangelog(text).unreleased, [])
  assert.deepEqual(verifyChangelog(text), [])
})

test('IDs are deterministic per entry key, distinct within one report, and text-independent', () => {
  assert.equal(idForKey('report-a.md#1'), idForKey('report-a.md#1'))
  assert.notEqual(idForKey('report-a.md#1'), idForKey('report-a.md#2'))
  assert.equal(idForKey('  report-a.md#1  '), A)
  assert.match(A, ID_PATTERN)
  assert.match(newId(), ID_PATTERN)
  // Text is not an input: editing wording cannot change identity.
  assert.equal(idForKey('report-a.md#1'), A)
})

// ---------------------------------------------------------------------------
// Parsing / compatibility
// ---------------------------------------------------------------------------

test('parser preserves wording, ignores inert comments, and never leaks IDs into text', () => {
  const text = doc(
    `${entry(A, 'Feature one: does a useful thing.')}`,
    `${entry(B, 'Fix two — stops a crash.')}`,
  ) + '<!-- rel-id: rel_deadbeef -->\n'
  const model = parseChangelog(text)
  assert.equal(model.unreleased.length, 2)
  assert.equal(model.unreleased[0].text, 'Feature one: does a useful thing.')
  assert.equal(model.unreleased[1].text, 'Fix two — stops a crash.')
  assert.ok(model.unreleased.every((e) => !e.text.includes('id:')))
})

test('parser handles CRLF input without corrupting entries', () => {
  const text = doc(entry(A, 'CRLF entry')).replace(/\n/g, '\r\n')
  assert.equal(parseChangelog(text).unreleased[0].text, 'CRLF entry')
})

test('compute-notes strips ID comments and preserves visible wording', () => {
  const head = doc(entry(A, 'Feature one: does a useful thing.'), entry(B, 'Fix two — stops a crash.'))
  const notes = computeNotes(head, createEmptyChangelog())
  assert.equal(notes, '- Feature one: does a useful thing.\n- Fix two — stops a crash.')
  assert.doesNotMatch(notes, /<!--/)
})

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

test('verify rejects untagged, duplicate, malformed and tombstoned entries', () => {
  const untagged = doc('- no id here')
  assert.ok(verifyChangelog(untagged).some((e) => e.includes('untagged')))

  const duplicate = doc(entry(A, 'one'), entry(A, 'two'))
  assert.ok(verifyChangelog(duplicate).some((e) => e.includes('duplicate')))

  const orphan = doc('<!-- id: rel_12345678 -->')
  assert.ok(verifyChangelog(orphan).some((e) => e.includes('no bullet')))

  const tombstoned = doc(entry(A, 'one'))
  assert.ok(verifyChangelog(tombstoned, `rel_12345678\n${A}\n`).some((e) => e.includes('tombstoned')))
})

// ---------------------------------------------------------------------------
// Curation / append / idempotency
// ---------------------------------------------------------------------------

test('curateProposals excludes developer-only work and keeps user-facing work', () => {
  const proposals = [
    { key: 'r#1', text: 'New export flow', type: 'feat' },
    { key: 'r#2', text: 'Refactor parser internals', type: 'refactor' },
    { key: 'r#3', text: 'Bump dependency', type: 'deps' },
    { key: 'r#4', text: 'Fix crash on save', type: 'fix' },
    { key: 'r#5', text: 'Curated prose without type' },
  ]
  const kept = curateProposals(proposals)
  assert.deepEqual(kept.map((p) => p.text), [
    'New export flow', 'Fix crash on save', 'Curated prose without type',
  ])
})

test('reprocessing the same report produces no duplicate entries', () => {
  const proposals = [
    { key: 'report-a.md#1', text: 'Feature one: does a useful thing.' },
    { key: 'report-a.md#2', text: 'Fix two: stops a crash.' },
  ]
  const first = appendEntries(createEmptyChangelog(), proposals)
  assert.deepEqual(first.added, [A, B])
  const second = appendEntries(first.text, proposals)
  assert.deepEqual(second.added, [])
  assert.equal(second.text, first.text)
  assert.equal(parseChangelog(second.text).unreleased.length, 2)
})

test('append never rewords a manually edited entry and keeps its ID', () => {
  const base = doc(entry(A, 'Operator-reworded title: better wording.'))
  const result = appendEntries(base, [{ key: 'report-a.md#1', text: 'Original worker wording.' }])
  assert.deepEqual(result.added, [])
  assert.equal(parseChangelog(result.text).unreleased[0].text, 'Operator-reworded title: better wording.')
})

test('append refuses tombstoned IDs', () => {
  const tombstones = `${A}\n`
  const result = appendEntries(createEmptyChangelog(), [
    { key: 'report-a.md#1', text: 'Should be refused.' },
  ], tombstones)
  assert.equal(result.added.length, 0)
  assert.equal(result.refused[0].reason, 'tombstoned')
})

// ---------------------------------------------------------------------------
// Deletion / tombstones / restore
// ---------------------------------------------------------------------------

test('deleting an unshipped entry from HEAD creates a tombstone on sync', () => {
  const committed = doc(entry(A, 'Deleted before shipment.'), entry(B, 'Kept.'))
  const working = doc(entry(B, 'Kept.'))
  const result = syncTombstones(committed, working, '')
  assert.deepEqual(result.added, [A])
  assert.ok(parseTombstones(result.text).has(A))
})

test('an entry moved to an archive is not tombstoned on sync', () => {
  const committed = doc(entry(A, 'Shipped.'))
  const working = `${doc()}\n## [1.0.28] - 2026-11-19\n\n${entry(A, 'Shipped.')}\n`
  const result = syncTombstones(committed, working, '')
  assert.deepEqual(result.added, [])
})

test('explicit ignore is idempotent and restore clears the tombstone', () => {
  const first = addTombstones('', [A])
  assert.deepEqual(first.added, [A])
  const second = addTombstones(first.text, [A])
  assert.deepEqual(second.added, [])

  const archived = `${doc()}\n## [1.0.28] - 2026-11-19\n\n${entry(A, 'Withdrawn entry.')}\n`
  const restored = restoreVersion(archived, first.text, '1.0.28')
  const restoredEntry = parseChangelog(restored.text).unreleased[0]
  assert.notEqual(restoredEntry.id, A)
  assert.equal(restoredEntry.reissueOf, A)
  // Original ID stays in the archive; only the reissue is in Unreleased.
  assert.equal(parseChangelog(restored.text).archives[0].entries[0].id, A)
  assert.equal(parseTombstones(restored.tombstones).has(A), false)
})

// ---------------------------------------------------------------------------
// Archiving
// ---------------------------------------------------------------------------

test('archive preserves wording and identity, and is idempotent-safe on missing IDs', () => {
  const base = doc(entry(A, 'Shipped entry.'), entry(B, 'Still pending.'))
  const archived = archiveEntries(base, { version: '1.0.28', date: '2026-11-19', ids: [A] })
  const model = parseChangelog(archived)
  assert.equal(model.unreleased.length, 1)
  assert.equal(model.unreleased[0].id, B)
  assert.equal(model.archives[0].entries[0].text, 'Shipped entry.')
  assert.equal(model.archives[0].entries[0].id, A)
  assert.throws(
    () => archiveEntries(archived, { version: '1.0.29', date: '2026-11-20', ids: [A] }),
    /not in Unreleased/,
  )
})

test('multiple releases between archive operations accumulate without loss', () => {
  let text = doc(entry(A, 'First.'), entry(B, 'Second.'), entry(C, 'Third.'))
  text = archiveEntries(text, { version: '1.0.28', date: '2026-11-18', ids: [A] })
  text = archiveEntries(text, { version: '1.0.29', date: '2026-11-19', ids: [B] })
  const model = parseChangelog(text)
  assert.deepEqual(model.archives.map((a) => a.version), ['1.0.28', '1.0.29'])
  assert.equal(model.unreleased.length, 1)
  assert.equal(model.unreleased[0].id, C)
})

test('archive failure leaves the input byte-identical (pure function throws before write)', () => {
  const base = doc(entry(A, 'Do not lose me.'))
  const snapshot = base
  assert.throws(() => archiveEntries(base, { version: '1.0.28', date: '2026-11-19', ids: [B] }))
  assert.equal(base, snapshot)
})

// ---------------------------------------------------------------------------
// Release consumption boundary
// ---------------------------------------------------------------------------

test('historical tag without CHANGELOG.md is treated as an empty baseline', () => {
  const head = doc(entry(A, 'New this release.'))
  assert.equal(computeNotes(head, ''), '- New this release.')
})

test('entries added after a release snapshot remain pending for the next release', () => {
  const snapshot = doc(entry(A, 'In snapshot.'))
  const head = doc(entry(A, 'In snapshot.'), entry(B, 'Added after snapshot.'))
  assert.equal(computeNotes(head, snapshot), '- Added after snapshot.')
})

test('compute-notes fails on untagged bullets rather than guessing identity', () => {
  const head = doc('- untagged bullet')
  assert.throws(() => computeNotes(head, ''), /without ID or text/)
})

test('compute-notes excludes tombstoned-by-absence entries from a later release', () => {
  const snapshot = doc(entry(A, 'Deleted.'), entry(B, 'Kept.'))
  const head = doc(entry(B, 'Kept.'))
  const notes = computeNotes(head, snapshot)
  assert.equal(notes, '')
  assert.doesNotMatch(notes, /Deleted/)
})
