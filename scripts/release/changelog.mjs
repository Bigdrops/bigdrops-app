#!/usr/bin/env node
/**
 * BOUXRE changelog foundation.
 *
 * This module is deliberately architecture-neutral. It owns:
 *   - a human-editable CHANGELOG.md format with stable entry IDs,
 *   - tombstones for entries deleted before shipment,
 *   - idempotent append, verification, sync, archive, restore and notes export.
 *
 * It does NOT decide how a release is identified, how a policy version maps to
 * a tag, or how "shipped" is proven. Callers pass the baseline snapshot and the
 * set of IDs to archive explicitly. That keeps the snapshot-derived and
 * release-asset candidates both viable until a decision is made.
 *
 * Core functions are pure (strings in, strings out) so they can be tested
 * without git, network, Supabase or GitHub. Only `main()` touches the host.
 */

import { createHash, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'

// ---------------------------------------------------------------------------
// Format constants
// ---------------------------------------------------------------------------

export const ID_PATTERN = /^rel_[0-9a-f]{8}$/
/** ID comment with an optional reissue link: `<!-- id: rel_x; reissueOf: rel_y -->`. */
export const ID_COMMENT_PATTERN = /^<!--\s*id:\s*(rel_[0-9a-f]{8})(?:\s*;\s*reissueOf:\s*(rel_[0-9a-f]{8}))?\s*-->$/
export const UNRELEASED_HEADING = '## Unreleased'
export const ARCHIVE_HEADING_PATTERN = /^##\s+\[([^\]]+)\]\s+-\s+(\d{4}-\d{2}-\d{2})\s*$/
export const BULLET_PATTERN = /^\s*[-*•]\s+(.+)$/
export const ARCHIVE_BOUNDARY = '<!-- archive-boundary -->'

/** Commit types that never produce a user-facing changelog entry. */
export const DEVELOPER_ONLY_TYPES = new Set([
  'docs', 'chore', 'ci', 'test', 'build', 'style', 'refactor', 'remove', 'deps', 'wip', 'merge',
])
/** Commit types that do produce a user-facing changelog entry. */
export const USER_FACING_TYPES = new Set(['feat', 'fix', 'perf', 'revert'])

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/**
 * Derive a stable ID from a caller-supplied per-entry key.
 *
 * The key MUST identify one entry, not one report: a report with three entries
 * supplies three distinct keys (e.g. `report.md#1`, `report.md#2`, ...). This
 * satisfies "no report-path-only hashes" and "no fuzzy text matching" while
 * keeping IDs stable across manual edits, because text is not an input.
 */
export function idForKey(key) {
  if (typeof key !== 'string' || key.trim().length === 0) {
    throw new Error('entry key must be a non-empty string')
  }
  return `rel_${createHash('sha256').update(key.trim()).digest('hex').slice(0, 8)}`
}

/** Mint a fresh ID for an operator-written bullet that has no key yet. */
export function newId() {
  return `rel_${randomBytes(4).toString('hex')}`
}

/**
 * Mint a NEW issuance ID for a previously shipped entry that is being
 * re-queued after restoration. The original ID is an input, so the reissue is
 * deterministically linked to it while remaining a distinct identity; the
 * historical consumption record for the original ID is never rewritten.
 */
export function createReissueId(originalId, key) {
  if (!ID_PATTERN.test(String(originalId ?? ''))) throw new Error('invalid original entry id')
  if (typeof key !== 'string' || key.trim().length === 0) throw new Error('reissue key is required')
  return `rel_${createHash('sha256').update(`reissue:${originalId}:${key.trim()}`).digest('hex').slice(0, 8)}`
}

/**
 * Read CHANGELOG.md at an exact commit SHA with `git show`.
 * A missing file at a real commit is an EMPTY snapshot (historical releases
 * predate CHANGELOG.md); a bad ref / corrupt object is an error, never empty.
 * `opts.reader` may be injected for fixtures.
 */
export function loadChangelogAtSha(sha, { cwd, reader } = {}) {
  if (!/^[0-9a-f]{40}$/i.test(String(sha ?? ''))) throw new Error('invalid build sha')
  if (reader) return String(reader(sha, { cwd }) ?? '')
  // A nonexistent commit and a real commit without CHANGELOG.md produce the
  // SAME `git show <ref>:CHANGELOG.md` error text. Verify the object first so
  // a bad SHA can never be silently treated as an empty snapshot.
  execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  })
  let text
  try {
    text = execFileSync('git', ['show', `${sha}:CHANGELOG.md`], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (err) {
    const msg = String(err?.stderr ?? err?.message ?? '')
    if (/exists on disk, but not in|path .* does not exist|does not exist in/i.test(msg)) return ''
    throw err
  }
  return String(text ?? '')
}

// ---------------------------------------------------------------------------
// Parsing / serialization
// ---------------------------------------------------------------------------

function normalize(text) {
  return String(text ?? '').replace(/\r\n?/g, '\n')
}

function emptyModel() {
  return { preamble: ['# BOUXRE Changelog', ''], unreleased: [], archives: [], boundaryIndex: -1 }
}

/**
 * Parse a changelog into a model.
 * An entry is an optional `<!-- id: ... -->` line immediately followed by a
 * bullet. A bullet without an ID is reported as untagged (never silently
 * accepted). Text is preserved verbatim, minus the bullet marker.
 */
export function parseChangelog(text) {
  const lines = normalize(text).split('\n')
  const model = emptyModel()
  model.preamble = []
  let section = 'preamble'
  let currentArchive = null
  let pendingId = null
  let pendingReissueOf = null
  let pendingIdLine = -1

  const flushPendingId = () => {
    if (pendingId !== null) {
      model.unreleased.push({
        id: pendingId, reissueOf: pendingReissueOf, text: null, line: pendingIdLine, orphaned: true,
      })
      pendingId = null
      pendingReissueOf = null
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === ARCHIVE_BOUNDARY) {
      flushPendingId()
      model.boundaryIndex = i
      continue
    }

    if (trimmed === UNRELEASED_HEADING) {
      flushPendingId()
      section = 'unreleased'
      currentArchive = null
      continue
    }

    const archiveMatch = trimmed.match(ARCHIVE_HEADING_PATTERN)
    if (archiveMatch) {
      flushPendingId()
      section = 'archive'
      currentArchive = { version: archiveMatch[1], date: archiveMatch[2], entries: [], line: i }
      model.archives.push(currentArchive)
      continue
    }

    if (/^##\s+/.test(trimmed)) {
      flushPendingId()
      section = 'other'
      currentArchive = null
      continue
    }

    const idMatch = trimmed.match(ID_COMMENT_PATTERN)
    if (idMatch) {
      flushPendingId()
      pendingId = idMatch[1]
      pendingReissueOf = idMatch[2] || null
      pendingIdLine = i
      continue
    }

    // Any other HTML comment is preserved as inert text, never as an entry.
    if (/^<!--[\s\S]*-->$/.test(trimmed)) {
      flushPendingId()
      continue
    }

    const bulletMatch = line.match(BULLET_PATTERN)
    if (bulletMatch) {
      const entry = {
        id: pendingId, reissueOf: pendingReissueOf, text: bulletMatch[1].trim(), line: i, orphaned: false,
      }
      pendingId = null
      pendingReissueOf = null
      if (section === 'unreleased') model.unreleased.push(entry)
      else if (section === 'archive' && currentArchive) currentArchive.entries.push(entry)
      continue
    }

    if (trimmed.length === 0) continue

    if (section === 'preamble') {
      flushPendingId()
      model.preamble.push(line)
      continue
    }

    // Non-bullet prose inside a section is ignored for entry purposes but is
    // not treated as an error: operators may keep notes outside entries.
    flushPendingId()
  }
  flushPendingId()
  return model
}

function renderIdComment(entry) {
  const link = entry.reissueOf ? `; reissueOf: ${entry.reissueOf}` : ''
  return `<!-- id: ${entry.id}${link} -->`
}

function renderEntry(entry) {
  const out = []
  if (entry.id) out.push(renderIdComment(entry))
  out.push(`- ${entry.text}`)
  return out
}

/** Serialize a model canonically. Entry text is copied verbatim, never reworded. */
export function serializeChangelog(model) {
  const out = [...model.preamble]
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop()
  out.push('', UNRELEASED_HEADING, '')
  for (const entry of model.unreleased) {
    if (entry.orphaned || entry.text === null) {
      // An ID with no bullet is invalid state; preserve it so `verify` can
      // report it and no wording is lost.
      out.push(renderIdComment(entry), '')
    } else {
      out.push(...renderEntry(entry), '')
    }
  }
  out.push(ARCHIVE_BOUNDARY, '')
  for (const archive of model.archives) {
    out.push(`## [${archive.version}] - ${archive.date}`, '')
    for (const entry of archive.entries) {
      out.push(...renderEntry(entry), '')
    }
  }
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop()
  out.push('')
  return out.join('\n')
}

/** Create a brand-new, empty changelog. No historical entries are invented. */
export function createEmptyChangelog() {
  return serializeChangelog(emptyModel())
}

// ---------------------------------------------------------------------------
// Tombstones
// ---------------------------------------------------------------------------

export function parseTombstones(text) {
  return new Set(
    normalize(text)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#')),
  )
}

export function serializeTombstones(ids) {
  const sorted = [...ids].filter((id) => ID_PATTERN.test(id)).sort()
  return ['# Deleted before shipment. Never re-add without explicit restore.', ...sorted, ''].join('\n')
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/** Return a list of human-readable errors. Empty array means valid. */
export function verifyChangelog(text, tombstonesText = '') {
  const model = parseChangelog(text)
  const tombstones = parseTombstones(tombstonesText)
  const errors = []
  const seen = new Map()

  const register = (entry, where) => {
    if (entry.orphaned || entry.text === null) {
      errors.push(`${where}: ID ${entry.id} has no bullet line`)
      return
    }
    if (!entry.id) {
      errors.push(`${where}: untagged bullet "${entry.text}"`)
      return
    }
    if (!ID_PATTERN.test(entry.id)) {
      errors.push(`${where}: malformed ID ${entry.id}`)
      return
    }
    if (entry.reissueOf != null) {
      if (!ID_PATTERN.test(entry.reissueOf)) {
        errors.push(`${where}: malformed reissueOf ${entry.reissueOf} on ${entry.id}`)
      } else if (entry.reissueOf === entry.id) {
        errors.push(`${where}: self-referential reissueOf on ${entry.id}`)
      }
    }
    if (seen.has(entry.id)) errors.push(`${where}: duplicate ID ${entry.id} (also in ${seen.get(entry.id)})`)
    else seen.set(entry.id, where)
    if (tombstones.has(entry.id)) errors.push(`${where}: tombstoned ID ${entry.id} is still present`)
  }

  model.unreleased.forEach((entry) => register(entry, 'Unreleased'))
  for (const archive of model.archives) {
    archive.entries.forEach((entry) => register(entry, `[${archive.version}]`))
  }
  return errors
}

// ---------------------------------------------------------------------------
// Curating worker proposals
// ---------------------------------------------------------------------------

/**
 * Filter worker-supplied proposals to user-facing types only.
 * A proposal is `{ key, text, type? }`. `type` follows conventional commits.
 * Proposals without a type are kept (the worker may supply already-curated
 * prose); explicit developer-only types are dropped.
 */
export function curateProposals(proposals) {
  return proposals.filter((p) => {
    if (!p || typeof p.text !== 'string' || p.text.trim().length === 0) return false
    const type = typeof p.type === 'string' ? p.type.trim().toLowerCase() : null
    if (type && DEVELOPER_ONLY_TYPES.has(type)) return false
    if (type && !USER_FACING_TYPES.has(type) && !DEVELOPER_ONLY_TYPES.has(type)) return false
    return true
  })
}

// ---------------------------------------------------------------------------
// Mutations (all pure)
// ---------------------------------------------------------------------------

/**
 * Detect deletions from the committed snapshot and add their IDs to tombstones.
 * An ID that moved into an archive is NOT a deletion.
 */
export function syncTombstones(committedText, workingText, tombstonesText = '') {
  const committed = parseChangelog(committedText)
  const working = parseChangelog(workingText)
  const archivedIds = new Set(working.archives.flatMap((a) => a.entries.map((e) => e.id).filter(Boolean)))
  const workingIds = new Set(working.unreleased.map((e) => e.id).filter(Boolean))
  const tombstones = parseTombstones(tombstonesText)
  const added = []

  for (const entry of committed.unreleased) {
    if (!entry.id) continue
    if (workingIds.has(entry.id) || archivedIds.has(entry.id) || tombstones.has(entry.id)) continue
    tombstones.add(entry.id)
    added.push(entry.id)
  }
  return { text: serializeTombstones(tombstones), added }
}

/**
 * Idempotently append curated proposals.
 * - never rewords or reorders an existing ID,
 * - refuses tombstoned IDs,
 * - assigns a deterministic ID from `key`, or a fresh random ID if no key,
 * - leaves already-archived IDs alone.
 */
export function appendEntries(text, proposals, tombstonesText = '') {
  const model = parseChangelog(text)
  const tombstones = parseTombstones(tombstonesText)
  const existing = new Set([
    ...model.unreleased.map((e) => e.id).filter(Boolean),
    ...model.archives.flatMap((a) => a.entries.map((e) => e.id).filter(Boolean)),
  ])
  const added = []
  const refused = []

  for (const proposal of curateProposals(proposals)) {
    let id
    try {
      id = proposal.id || (proposal.key ? idForKey(proposal.key) : newId())
    } catch (err) {
      refused.push({ text: proposal.text, reason: err.message })
      continue
    }
    if (tombstones.has(id)) {
      refused.push({ id, text: proposal.text, reason: 'tombstoned' })
      continue
    }
    if (existing.has(id)) continue // idempotent: no duplicate, no reword
    model.unreleased.push({ id, text: proposal.text.trim(), orphaned: false })
    existing.add(id)
    added.push(id)
  }
  return { text: serializeChangelog(model), added, refused }
}

/** Explicitly tombstone IDs. Returns only IDs actually added. */
export function addTombstones(tombstonesText, ids) {
  const tombstones = parseTombstones(tombstonesText)
  const added = []
  for (const id of ids) {
    if (!ID_PATTERN.test(id)) throw new Error(`invalid ID ${id}`)
    if (!tombstones.has(id)) {
      tombstones.add(id)
      added.push(id)
    }
  }
  return { text: serializeTombstones(tombstones), added }
}

/**
 * Move named Unreleased IDs into a versioned archive section.
 * Atomic: if any ID is missing, nothing changes. Wording and IDs are preserved.
 * Multiple calls accumulate archives, so several releases between archive runs
 * are handled without loss.
 */
export function archiveEntries(text, { version, date, ids }) {
  if (!version || typeof version !== 'string') throw new Error('version is required')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('date must be YYYY-MM-DD')
  if (!Array.isArray(ids) || ids.length === 0) throw new Error('at least one ID is required')

  const model = parseChangelog(text)
  const wanted = new Set(ids)
  const moving = model.unreleased.filter((e) => wanted.has(e.id))
  if (moving.length !== wanted.size) {
    const found = new Set(moving.map((e) => e.id))
    const missing = ids.filter((id) => !found.has(id))
    throw new Error(`cannot archive: ID(s) not in Unreleased: ${missing.join(', ')}`)
  }

  model.unreleased = model.unreleased.filter((e) => !wanted.has(e.id))
  let target = model.archives.find((a) => a.version === version && a.date === date)
  if (!target) {
    target = { version, date, entries: [], line: -1 }
    model.archives.push(target)
  }
  target.entries.push(...moving)
  return serializeChangelog(model)
}

/**
 * Restore a version's archived entries to Unreleased under NEW issuance IDs.
 *
 * Non-destructive: the archive section and the original (consumed) IDs stay
 * intact in CHANGELOG.md and in the durable ledger. The restored bullet is
 * re-issued with a deterministic ID from `createReissueId(originalId, version)`
 * and an explicit `reissueOf` link back to the original. Repeating
 * `restore --version <v>` is idempotent: the deterministic ID already present
 * in Unreleased is kept, so no duplicate entry is appended. Tombstones are
 * cleared for the original IDs only; no ledger is rewritten.
 */
export function restoreVersion(text, tombstonesText, version) {
  if (!version || typeof version !== 'string') throw new Error('version is required')
  const model = parseChangelog(text)
  const target = model.archives.find((a) => a.version === version)
  if (!target) throw new Error(`no archive section for version ${version}`)
  const existingById = new Map(model.unreleased.map((e) => [e.id, e]).filter(([id]) => id))

  for (const entry of target.entries) {
    if (!entry.id) {
      if (!existingById.has(null)) model.unreleased.push(entry)
      continue
    }
    // Idempotency: a prior restore of this same version already produced the
    // deterministic reissue ID; do not mint a second one.
    const expectedId = createReissueId(entry.id, version)
    if (existingById.has(expectedId)) continue
    const restored = {
      ...entry,
      id: expectedId,
      reissueOf: entry.id,
      line: -1,
    }
    model.unreleased.push(restored)
    existingById.set(expectedId, restored)
  }

  const tombstones = parseTombstones(tombstonesText)
  for (const entry of target.entries) if (entry.id) tombstones.delete(entry.id)
  return { text: serializeChangelog(model), tombstones: serializeTombstones(tombstones) }
}

/**
 * Produce release notes: entries in `headText` whose IDs are absent from
 * `baselineText`, with text taken from HEAD and all ID comments stripped.
 * A baseline with no CHANGELOG.md is simply parsed as an empty model, which is
 * how a historical tag predating CHANGELOG.md is handled safely.
 */
export function computeNotes(headText, baselineText = '') {
  const head = parseChangelog(headText)
  const baseline = parseChangelog(baselineText)
  const baselineIds = new Set(baseline.unreleased.map((e) => e.id).filter(Boolean))
  const lines = []
  for (const entry of head.unreleased) {
    if (!entry.id || entry.text === null) {
      throw new Error(`entry without ID or text in Unreleased: ${JSON.stringify(entry)}`)
    }
    if (baselineIds.has(entry.id)) continue
    lines.push(`- ${entry.text}`)
  }
  return lines.join('\n')
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

function committedChangelog() {
  // Only used by `sync`. Read-only git inspection; never mutates state.
  try {
    return execFileSync('git', ['show', 'HEAD:CHANGELOG.md'], { encoding: 'utf8' })
  } catch {
    return ''
  }
}

export function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv
  const root = resolvePath(process.cwd())
  const changelogPath = resolvePath(root, 'CHANGELOG.md')
  const tombstonePath = resolvePath(root, 'changelog', 'ignored.txt')

  const flag = (name) => {
    const i = rest.indexOf(`--${name}`)
    return i === -1 ? null : rest[i + 1] ?? null
  }

  switch (command) {
    case 'init': {
      if (existsSync(changelogPath)) throw new Error('CHANGELOG.md already exists')
      write(changelogPath, createEmptyChangelog())
      if (!existsSync(tombstonePath)) write(tombstonePath, serializeTombstones([]))
      process.stdout.write('Created CHANGELOG.md and changelog/ignored.txt\n')
      return
    }
    case 'verify': {
      const errors = verifyChangelog(read(changelogPath), read(tombstonePath))
      if (errors.length > 0) {
        process.stderr.write(`${errors.join('\n')}\n`)
        process.exitCode = 1
      } else {
        process.stdout.write('changelog OK\n')
      }
      return
    }
    case 'append': {
      const proposalsPath = flag('proposals')
      if (!proposalsPath) throw new Error('--proposals <file.json> is required')
      const proposals = JSON.parse(read(resolvePath(root, proposalsPath)))
      const result = appendEntries(read(changelogPath), proposals, read(tombstonePath))
      write(changelogPath, result.text)
      process.stdout.write(`appended ${result.added.length}; refused ${result.refused.length}\n`)
      return
    }
    case 'sync': {
      const result = syncTombstones(committedChangelog(), read(changelogPath), read(tombstonePath))
      write(tombstonePath, result.text)
      process.stdout.write(`tombstoned ${result.added.length}\n`)
      return
    }
    case 'ignore': {
      const result = addTombstones(read(tombstonePath), rest.filter((a) => !a.startsWith('--')))
      write(tombstonePath, result.text)
      process.stdout.write(`tombstoned ${result.added.length}\n`)
      return
    }
    case 'archive': {
      const ids = (flag('ids') || '').split(',').filter(Boolean)
      const text = archiveEntries(read(changelogPath), {
        version: flag('version'),
        date: flag('date'),
        ids,
      })
      write(changelogPath, text)
      process.stdout.write(`archived ${ids.length}\n`)
      return
    }
    case 'restore': {
      const result = restoreVersion(read(changelogPath), read(tombstonePath), flag('version'))
      write(changelogPath, result.text)
      write(tombstonePath, result.tombstones)
      process.stdout.write(`restored ${flag('version')}\n`)
      return
    }
    case 'compute-notes': {
      const baselinePath = flag('baseline')
      const notes = computeNotes(read(changelogPath), baselinePath ? read(resolvePath(root, baselinePath)) : '')
      process.stdout.write(`${notes}\n`)
      return
    }
    default:
      throw new Error(`unknown command: ${command ?? '(none)'}`)
  }
}

if (process.argv[1] && decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1").toLowerCase() === resolvePath(process.argv[1]).replace(/\\/g, "/").toLowerCase()) {
  try {
    main()
  } catch (err) {
    process.stderr.write(`${err.message}\n`)
    process.exitCode = 1
  }
}
