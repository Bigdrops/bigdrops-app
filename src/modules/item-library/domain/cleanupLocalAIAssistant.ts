import type { CleanupLocalAIJobGroupResult } from './cleanupLocalAIJob'
import type { CleanupLocalAIDecision } from './cleanupLocalAI'
import type { DuplicateCandidateGroup } from '../types'

export type CleanupAssistantResultFilter = 'all' | 'ready' | 'unsure' | 'conflict' | 'failed'

export type CleanupAssistantIntent =
  | { type: 'review_all' }
  | { type: 'review_next'; limit: number }
  | { type: 'show_filter'; filter: CleanupAssistantResultFilter }
  | { type: 'show_groups' }
  | { type: 'explain'; groupId?: string | null }
  | { type: 'choose_model'; tier: 'lite' | 'standard' }
  | { type: 'retry_failed' }
  | { type: 'status' }
  | { type: 'unsupported' }

export type CleanupAssistantSpecDifference = {
  kind: string
  label: string
  values: string[]
  itemNames: string[]
}

const UNIT_KINDS: Record<string, { kind: string; label: string; suffix: string }> = {
  w: { kind: 'wattage', label: 'wattage', suffix: 'W' },
  watt: { kind: 'wattage', label: 'wattage', suffix: 'W' },
  watts: { kind: 'wattage', label: 'wattage', suffix: 'W' },
  v: { kind: 'voltage', label: 'voltage', suffix: 'V' },
  volt: { kind: 'voltage', label: 'voltage', suffix: 'V' },
  volts: { kind: 'voltage', label: 'voltage', suffix: 'V' },
  a: { kind: 'amperage', label: 'amperage', suffix: 'A' },
  amp: { kind: 'amperage', label: 'amperage', suffix: 'A' },
  amps: { kind: 'amperage', label: 'amperage', suffix: 'A' },
  mm: { kind: 'dimension', label: 'dimension', suffix: 'mm' },
  cm: { kind: 'dimension', label: 'dimension', suffix: 'cm' },
  m: { kind: 'dimension', label: 'dimension', suffix: 'm' },
  in: { kind: 'dimension', label: 'dimension', suffix: 'in' },
  inch: { kind: 'dimension', label: 'dimension', suffix: 'in' },
  inches: { kind: 'dimension', label: 'dimension', suffix: 'in' },
  awg: { kind: 'gauge', label: 'gauge', suffix: 'AWG' },
  gauge: { kind: 'gauge', label: 'gauge', suffix: 'gauge' },
  ah: { kind: 'capacity', label: 'capacity', suffix: 'Ah' },
  mah: { kind: 'capacity', label: 'capacity', suffix: 'mAh' },
  kw: { kind: 'power', label: 'power rating', suffix: 'kW' },
  hp: { kind: 'power', label: 'power rating', suffix: 'HP' },
  kva: { kind: 'capacity', label: 'capacity', suffix: 'kVA' },
  va: { kind: 'capacity', label: 'capacity', suffix: 'VA' },
}

const UNIT_PATTERN =
  /\b(\d+(?:\.\d+)?)\s*(watts?|w|volts?|v|amps?|a|inches|inch|in|mm|cm|awg|gauge|mah|ah|kva|kw|hp|va|m)\b/gi

function normalizedNumber(value: string) {
  const numeric = Number.parseFloat(value)
  if (!Number.isFinite(numeric)) return value
  return Number.isInteger(numeric) ? String(numeric) : String(numeric)
}

export function detectCleanupAssistantSpecDifferences(
  group: DuplicateCandidateGroup,
): CleanupAssistantSpecDifference[] {
  const byKind = new Map<string, Map<string, { label: string; value: string; names: Set<string> }>>()

  group.members.forEach((member) => {
    const name = String(member.name || '')
    for (const match of name.matchAll(UNIT_PATTERN)) {
      const unit = UNIT_KINDS[String(match[2] || '').toLowerCase()]
      if (!unit) continue
      const value = `${normalizedNumber(match[1])}${unit.suffix}`
      const values = byKind.get(unit.kind) || new Map()
      const current = values.get(value) || { label: unit.label, value, names: new Set<string>() }
      current.names.add(name)
      values.set(value, current)
      byKind.set(unit.kind, values)
    }
  })

  return [...byKind.entries()]
    .filter(([, values]) => values.size > 1)
    .map(([kind, values]) => {
      const entries = [...values.values()]
      return {
        kind,
        label: entries[0]?.label || kind,
        values: entries.map((entry) => entry.value),
        itemNames: [...new Set(entries.flatMap((entry) => [...entry.names]))],
      }
    })
}

export function parseCleanupAssistantIntent(text: string): CleanupAssistantIntent {
  const normalized = String(text || '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!normalized) return { type: 'unsupported' }

  if (/\b(use|switch|select|choose)\b/.test(normalized) && /\bstandard\b/.test(normalized)) {
    return { type: 'choose_model', tier: 'standard' }
  }
  if (/\b(use|switch|select|choose)\b/.test(normalized) && /\b(lite|light|fast|small)\b/.test(normalized)) {
    return { type: 'choose_model', tier: 'lite' }
  }

  if (/\b(retry|try again)\b/.test(normalized) && /\b(failed|failures|errors|review)\b/.test(normalized)) {
    return { type: 'retry_failed' }
  }

  if (/\b(what'?s left|what is left|status|progress|remaining)\b/.test(normalized)) {
    return { type: 'status' }
  }

  if (/\b(show|list|filter)\b/.test(normalized) && /\b(unsure|uncertain|needs me|attention)\b/.test(normalized)) {
    return { type: 'show_filter', filter: 'unsure' }
  }
  if (/\b(show|list|filter)\b/.test(normalized) && /\b(failed|failures|errors)\b/.test(normalized)) {
    return { type: 'show_filter', filter: 'failed' }
  }
  if (/\b(show|list|filter)\b/.test(normalized) && /\b(conflict|conflicts)\b/.test(normalized)) {
    return { type: 'show_filter', filter: 'conflict' }
  }
  if (/\b(show|list|filter)\b/.test(normalized) && /\b(ready|recommendations|decisions)\b/.test(normalized)) {
    return { type: 'show_filter', filter: 'ready' }
  }
  if (/\b(show|list|filter)\b/.test(normalized) && /\b(all|everything|results)\b/.test(normalized)) {
    return { type: 'show_filter', filter: 'all' }
  }

  if (/\b(show|list|open)\b/.test(normalized) && /\b(groups?|duplicates?|items?)\b/.test(normalized)) {
    return { type: 'show_groups' }
  }

  if (/\b(why|explain|wattage|voltage|difference|flagged|proposal)\b/.test(normalized)) {
    return { type: 'explain', groupId: null }
  }

  const reviewNext = /\b(review|check|scan)\s+(?:the\s+)?(?:next\s+)?(\d+)\b/.exec(normalized)
  if (reviewNext) {
    const limit = Number.parseInt(reviewNext[2], 10)
    if (Number.isFinite(limit) && limit > 0) return { type: 'review_next', limit }
  }

  if (/\b(review|check|scan)\b/.test(normalized) && /\b(all|both|everything|duplicates?|groups?)\b/.test(normalized)) {
    return { type: 'review_all' }
  }

  return { type: 'unsupported' }
}

export function cleanupAssistantDecisionLabel(decision: CleanupLocalAIDecision) {
  if (decision === 'SAME_ITEM') return 'Merge recommendation'
  if (decision === 'DIFFERENT_ITEM') return 'Keep separate recommendation'
  return 'Needs your decision'
}

export function summarizeCleanupAssistantResults(results: CleanupLocalAIJobGroupResult[]) {
  const summary = {
    total: results.length,
    merge: 0,
    keepSeparate: 0,
    unsure: 0,
    failed: 0,
    conflict: 0,
  }

  results.forEach((result) => {
    if (result.status === 'failed') {
      summary.failed += 1
      return
    }
    if (result.status === 'conflict') {
      summary.conflict += 1
      return
    }
    if (result.proposals.some((proposal) => proposal.decision === 'UNSURE') || result.status === 'unsure') {
      summary.unsure += 1
      return
    }
    if (result.proposals.some((proposal) => proposal.decision === 'DIFFERENT_ITEM')) {
      summary.keepSeparate += 1
      return
    }
    if (result.proposals.some((proposal) => proposal.decision === 'SAME_ITEM')) {
      summary.merge += 1
    }
  })

  return summary
}
