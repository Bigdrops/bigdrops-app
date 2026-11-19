import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveReleaseDiscovery } from '../../domain/appUpdate/releaseDiscovery.ts'
import { parseReleaseNotes } from '../../domain/appUpdate/changelog.ts'

const settled = { pending: false, failed: false, applicable: true, entryCount: 2 }

test('unresolved discovery is never reported as an absent release', () => {
  // Pending outranks every settled fact, including a failure.
  assert.equal(resolveReleaseDiscovery({ ...settled, pending: true }), 'loading')
  assert.equal(
    resolveReleaseDiscovery({ pending: true, failed: true, applicable: false, entryCount: 0 }),
    'loading',
  )
})

test('a failed fetch is an error, not an absent release', () => {
  assert.equal(
    resolveReleaseDiscovery({ pending: false, failed: true, applicable: false, entryCount: 0 }),
    'error',
  )
})

test('a settled fetch with no applicable release is none', () => {
  assert.equal(
    resolveReleaseDiscovery({ pending: false, failed: false, applicable: false, entryCount: 0 }),
    'none',
  )
})

test('an applicable release without notes is distinct from no release', () => {
  assert.equal(resolveReleaseDiscovery({ ...settled, entryCount: 0 }), 'no-notes')
  assert.equal(resolveReleaseDiscovery(settled), 'available')
})

test('the empty-notes fallback still yields one honest entry', () => {
  // The release workflow publishes this exact line when no user-facing
  // commit was recorded. It must parse as one entry, never as zero.
  const parsed = parseReleaseNotes('- No user-facing changes were recorded for this build.')
  assert.equal(parsed.entries.length, 1)
  assert.equal(parsed.entries[0].title, 'No user-facing changes were recorded for this build.')
  assert.equal(parsed.entries[0].detail, null)
})

test('multi-entry notes keep title and detail separated for the editorial layout', () => {
  const parsed = parseReleaseNotes(
    ['BOUXRE v1.0.29 (build 29)', '- Faster invoice list', '- Fix: resolve timeout - retry twice', ''].join('\n'),
  )
  assert.equal(parsed.entries.length, 2)
  assert.deepEqual(parsed.entries[0], { title: 'Faster invoice list', detail: null })
  // The dash separator is checked before the colon, so the title keeps the
  // label and the detail is the trailing clause.
  assert.equal(parsed.entries[1].title, 'Fix: resolve timeout')
  assert.equal(parsed.entries[1].detail, 'retry twice')
})

test('a colon-only entry splits into label and detail', () => {
  const parsed = parseReleaseNotes('- Invoices: faster list loading')
  assert.equal(parsed.entries.length, 1)
  assert.equal(parsed.entries[0].title, 'Invoices')
  assert.equal(parsed.entries[0].detail, 'faster list loading')
})

test('long titles and details survive parsing without truncation', () => {
  const longTitle = 'A'.repeat(400)
  const longDetail = 'B'.repeat(1200)
  const parsed = parseReleaseNotes(`- ${longTitle} — ${longDetail}`)
  assert.equal(parsed.entries.length, 1)
  assert.equal(parsed.entries[0].title, longTitle)
  assert.equal(parsed.entries[0].detail, longDetail)
})

test('a release with no notes at all parses to zero entries', () => {
  assert.equal(parseReleaseNotes(null).entries.length, 0)
  assert.equal(parseReleaseNotes('   ').entries.length, 0)
})
