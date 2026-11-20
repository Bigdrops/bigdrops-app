/**
 * Convert a completed implementation report into curated changelog proposals.
 *
 * The Git worker (a prompt, not executable code) hands reports to this helper.
 * It is deliberately read-only and offline: it reads report text and returns
 * proposal objects for `changelog append`. It never edits CHANGELOG.md, stages
 * files, or calls git.
 *
 * Entry keys are `<report-path>#<n>` so one report can yield several distinct
 * stable IDs. No text hashing or fuzzy matching is used for identity.
 */

import { curateProposals } from './changelog.mjs'

/** Extract user-facing bullets from a report's changelog section, if present. */
export function proposalsFromReport(reportPath, reportText) {
  const lines = String(reportText ?? '').replace(/\r\n?/g, '\n').split('\n')
  const proposals = []
  let inSection = false
  let n = 0
  let pendingType = null

  for (const raw of lines) {
    const line = raw.trim()

    // Support an explicit "## Changelog entries" section; outside it, only
    // bullets carrying an explicit conventional-commit type are considered.
    if (/^##\s+Changelog entries\b/i.test(line)) {
      inSection = true
      continue
    }
    if (/^##\s+/.test(line) && inSection) {
      inSection = false
    }

    const typeMatch = line.match(/^[-*•]\s+\*\*(feat|fix|perf|revert)\*\*\s*:\s*(.+)$/i)
      || line.match(/^[-*•]\s+\[(feat|fix|perf|revert)\]\s*:\s*(.+)$/i)
    if (typeMatch) {
      n += 1
      proposals.push({
        key: `${reportPath}#${n}`,
        type: typeMatch[1].toLowerCase(),
        text: typeMatch[2].trim(),
      })
      continue
    }

    if (inSection) {
      const bullet = line.match(/^[-*•]\s+(.+)$/)
      if (bullet) {
        n += 1
        proposals.push({ key: `${reportPath}#${n}`, text: bullet[1].trim() })
      }
    } else {
      const standaloneType = line.match(/^\*\*(feat|fix|perf|revert|docs|chore|ci|test|build|style|refactor|remove|deps|wip|merge)\*\*\s*:/i)
      if (standaloneType) pendingType = standaloneType[1].toLowerCase()
    }
  }

  // Apply a pending type to the next proposal that has none.
  for (const proposal of proposals) {
    if (!proposal.type && pendingType) {
      proposal.type = pendingType
      pendingType = null
    }
  }
  return proposals
}

/** Curate and de-duplicate proposals across several reports. */
export function proposalsFromReports(reports) {
  const all = reports.flatMap(({ path, text }) => proposalsFromReport(path, text))
  return curateProposals(all)
}
