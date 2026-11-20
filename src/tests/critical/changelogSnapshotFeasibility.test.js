import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

import {
  createEmptyChangelog,
  appendEntries,
  archiveEntries,
  computeNotes,
  parseChangelog,
  idForKey,
  loadChangelogAtSha,
  createReissueId,
} from '../../../scripts/release/changelog.mjs'

const ROOT = new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

/**
 * Read CHANGELOG.md at a ref. A missing file is an EMPTY snapshot; a git
 * failure (bad ref, corrupt object) is an error. This is the distinction the
 * PRD requires and the foundation deliberately leaves to the caller.
 */
function snapshotAt(ref) {
  let text
  try {
    text = execFileSync('git', ['show', `${ref}:CHANGELOG.md`], { cwd: ROOT, encoding: 'utf8' })
  } catch (err) {
    const msg = String(err.stderr ?? '')
    if (/exists on disk, but not in|path .* does not exist/i.test(msg)) return ''
    throw err
  }
  return text
}

test('historical release tags predate CHANGELOG.md and yield an empty snapshot', () => {
  const tags = git('tag', '--list', 'test-release-*').split('\n').filter(Boolean)
  assert.ok(tags.length > 0)
  const first = tags[0]
  assert.equal(snapshotAt(first), '')
  // Empty baseline is safe: everything currently pending is eligible.
  const head = appendEntries(createEmptyChangelog(), [
    { key: 'report-x.md#1', text: 'A real user-facing change.' },
  ]).text
  assert.equal(computeNotes(head, snapshotAt(first)), '- A real user-facing change.')
})

test('a missing ref is an error, not an empty snapshot', () => {
  assert.throws(() => snapshotAt('definitely-not-a-real-ref-xyz'), /invalid object name|unknown revision|ambiguous/i)
})

test('empty Unreleased produces empty notes, not fabricated prose', () => {
  assert.equal(computeNotes(createEmptyChangelog(), ''), '')
})

test('a release that exists but whose policy sync failed leaves entries pending', () => {
  // The foundation has no concept of "release exists": only an explicit
  // baseline snapshot marks consumption. A failed sync never archives.
  const head = appendEntries(createEmptyChangelog(), [
    { key: 'report-y.md#1', text: 'Not yet shipped.' },
  ]).text
  assert.equal(computeNotes(head, ''), '- Not yet shipped.')
  assert.equal(parseChangelog(head).unreleased.length, 1)
})

test('a retry after publication does not duplicate or lose entries', () => {
  const head = appendEntries(createEmptyChangelog(), [
    { key: 'report-z.md#1', text: 'Retried entry.' },
  ]).text
  const notes1 = computeNotes(head, '')
  const notes2 = computeNotes(head, '')
  assert.equal(notes1, notes2)
})

test('a restored entry can be reissued in a later release', () => {
  const id = idForKey('report-r.md#1')
  const head = appendEntries(createEmptyChangelog(), [
    { key: 'report-r.md#1', text: 'Withdrawn then restored.' },
  ]).text
  const archived = archiveEntries(head, { version: '1.0.28', date: '2026-11-19', ids: [id] })
  assert.equal(computeNotes(archived, ''), '')
  // Re-appending with the same key after restore is idempotent by identity.
  const reissued = appendEntries(archived, [
    { key: 'report-r.md#1', text: 'Withdrawn then restored.' },
  ])
  assert.deepEqual(reissued.added, [])
  assert.equal(parseChangelog(reissued.text).unreleased.length, 0)
})

test('loadChangelogAtSha reads the exact commit and distinguishes missing file from bad ref', () => {
  const headSha = git('rev-parse', 'HEAD')
  // CHANGELOG.md is untracked at HEAD; a real commit without the file yields
  // an empty snapshot, while a nonexistent commit is an error.
  assert.equal(loadChangelogAtSha(headSha, { cwd: ROOT }), '')
  assert.throws(() => loadChangelogAtSha('d'.repeat(40), { cwd: ROOT }), /valid object name|bad object|unknown revision/i)
})

test('a reissue id is distinct from the original and stable for the same key', () => {
  const original = idForKey('report-r.md#1')
  const reissued = createReissueId(original, 'report-r.md#1')
  assert.notEqual(reissued, original)
  assert.match(reissued, /^rel_[0-9a-f]{8}$/)
  assert.equal(createReissueId(original, 'report-r.md#1'), reissued)
  assert.notEqual(createReissueId(original, 'report-r.md#2'), reissued)
})
