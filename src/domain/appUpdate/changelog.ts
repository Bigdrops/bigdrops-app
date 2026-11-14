/**
 * Release-note parsing for the update changelog.
 *
 * The policy row carries one plain text field (`release_notes`). This
 * module is the single place that turns it into timeline entries, so the
 * timeline component never parses strings and no schema change is needed.
 *
 * Entry rule: lines that start with `-`, `*` or `•`. When a release has no
 * such lines, the whole note renders as one entry instead of an empty
 * timeline — the text is real either way.
 */
export interface ChangelogEntry {
  title: string
  detail: string | null
}

export interface Changelog {
  entries: ChangelogEntry[]
}

const BULLET_PATTERN = /^\s*[-*•]\s+/
const DETAIL_SEPARATORS = ['—', ' - ']

function splitEntry(rawLine: string): ChangelogEntry {
  const line = rawLine.trim()

  for (const separator of DETAIL_SEPARATORS) {
    const index = line.indexOf(separator)
    if (index > 0) {
      const title = line.slice(0, index).trim()
      const detail = line.slice(index + separator.length).trim()
      if (title) return { title, detail: detail || null }
    }
  }

  // A colon only separates when the left side is a short label. This keeps
  // URLs and clock times inside one sentence.
  const colonIndex = line.indexOf(':')
  if (colonIndex > 0 && colonIndex <= 60) {
    const title = line.slice(0, colonIndex).trim()
    const detail = line.slice(colonIndex + 1).trim()
    if (title) return { title, detail: detail || null }
  }

  return { title: line, detail: null }
}

export function parseReleaseNotes(notes: string | null | undefined): Changelog {
  if (typeof notes !== 'string') return { entries: [] }

  const lines = notes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) return { entries: [] }

  const bulletLines = lines.filter((line) => BULLET_PATTERN.test(line))
  const sourceLines = bulletLines.length > 0 ? bulletLines : [lines.join(' ')]

  return {
    entries: sourceLines.map((line) => splitEntry(line.replace(BULLET_PATTERN, ''))),
  }
}
