import type {
  DuplicateCandidateGroup,
  FlaggedCleanupExportGroup,
  FlaggedCleanupExportPayload,
  ItemAlias,
  ItemReviewedSeparatePair,
} from '../types'
import { BIGDROPS_LOCAL_AI_POC_MODEL_ID } from '@/lib/local-ai/modelManifest'
export { BIGDROPS_LOCAL_AI_POC_MODEL_ID }

export const CLEANUP_LOCAL_AI_SCHEMA_VERSION = 1 as const

export type CleanupLocalAIDecision = 'SAME_ITEM' | 'DIFFERENT_ITEM' | 'UNSURE'

export type CleanupLocalAITaskCandidate = {
  item_id: string
  name: string
  aliases: string[]
  usage_count: number
  last_price: number | null
  evidence_ids: string[]
}

export type CleanupLocalAITaskGroup = {
  group_id: string
  label: string
  flag_reason: string
  candidates: CleanupLocalAITaskCandidate[]
  evidence_ids: string[]
}

export type CleanupLocalAITask = {
  task_type: 'item_cleanup_review'
  schema_version: typeof CLEANUP_LOCAL_AI_SCHEMA_VERSION
  task_id: string
  cleanup_snapshot_id: string
  source_export_type: 'flagged_cleanup'
  rules: string[]
  groups: CleanupLocalAITaskGroup[]
  reviewed_separate_pairs: Array<{
    item_a_id: string
    item_b_id: string
    reason: 'human_keep_separate'
  }>
}

export type CleanupLocalAIProposal = {
  group_id: string
  decision: CleanupLocalAIDecision
  winner_item_id?: string
  merged_item_ids?: string[]
  reason_codes: string[]
  reason: string
  referenced_evidence_ids: string[]
  warnings?: string[]
}

export type CleanupLocalAIResult = {
  response_type: 'cleanup_ai_review_result'
  schema_version: typeof CLEANUP_LOCAL_AI_SCHEMA_VERSION
  task_id: string
  cleanup_snapshot_id: string
  provider_id: 'local_android'
  model_id: string
  proposals: CleanupLocalAIProposal[]
}

export type CleanupLocalAIValidationResult =
  | {
      ok: true
      errors: []
      result: CleanupLocalAIResult
    }
  | {
      ok: false
      errors: string[]
      result: null
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return null
  const values = value.map((entry) => readString(entry))
  if (values.some((entry) => !entry)) return null
  return [...new Set(values)]
}

function pairKey(leftItemId: string, rightItemId: string) {
  return [leftItemId, rightItemId]
    .map((value) => String(value || '').trim())
    .sort((left, right) => left.localeCompare(right))
    .join('::')
}

function groupTaskId(snapshotId: string, groupId: string) {
  return `cleanup-local-ai-v1:${snapshotId}:${groupId}`
}

function toExportGroup(
  group: DuplicateCandidateGroup,
  exportPayload: FlaggedCleanupExportPayload,
): FlaggedCleanupExportGroup | null {
  return exportPayload.groups.find((entry) => entry.group_id === group.group_id) || null
}

function buildAliasMap(aliases: ItemAlias[]) {
  const aliasMap = new Map<string, string[]>()
  aliases.forEach((alias) => {
    if (!alias.item_id || alias.is_retired === true || alias.is_active === false) return
    const current = aliasMap.get(alias.item_id) || []
    current.push(alias.alias_text)
    aliasMap.set(alias.item_id, current)
  })
  return aliasMap
}

export function buildCleanupLocalAITask(params: {
  group: DuplicateCandidateGroup
  exportPayload: FlaggedCleanupExportPayload
  aliases: ItemAlias[]
  reviewedSeparatePairs?: ItemReviewedSeparatePair[]
}): CleanupLocalAITask {
  const exportGroup = toExportGroup(params.group, params.exportPayload)
  if (!exportGroup) {
    throw new Error('Cleanup AI task cannot be built because the group is not present in the locked cleanup export.')
  }

  const aliasMap = buildAliasMap(params.aliases)
  const groupEvidenceId = `${exportGroup.group_id}:flag_reason`
  const candidates = exportGroup.items.map((item) => {
    const aliases = aliasMap.get(item.item_id) || item.aliases || []
    const aliasEvidenceIds = aliases.map((_, index) => `${exportGroup.group_id}:alias:${item.item_id}:${index + 1}`)
    const evidenceIds = [
      `${exportGroup.group_id}:item:${item.item_id}:name`,
      `${exportGroup.group_id}:item:${item.item_id}:history`,
      ...aliasEvidenceIds,
    ]

    return {
      item_id: item.item_id,
      name: item.name,
      aliases,
      usage_count: Number(item.usage_count || 0),
      last_price: item.last_price ?? null,
      evidence_ids: evidenceIds,
    }
  })

  const itemIds = new Set(candidates.map((candidate) => candidate.item_id))
  const reviewedSeparatePairs = (params.reviewedSeparatePairs || [])
    .filter((pair) => pair.status === 'active')
    .filter((pair) => itemIds.has(pair.item_a_id) && itemIds.has(pair.item_b_id))
    .map((pair) => ({
      item_a_id: pair.item_a_id,
      item_b_id: pair.item_b_id,
      reason: 'human_keep_separate' as const,
    }))

  return {
    task_type: 'item_cleanup_review',
    schema_version: CLEANUP_LOCAL_AI_SCHEMA_VERSION,
    task_id: groupTaskId(params.exportPayload.snapshot_id, exportGroup.group_id),
    cleanup_snapshot_id: params.exportPayload.snapshot_id,
    source_export_type: 'flagged_cleanup',
    rules: [
      'Similarity is review evidence, not identity proof.',
      'Return UNSURE when the evidence is insufficient.',
      'Preserve voltage, wattage, amperage, gauge, dimensions, capacity, model, part number, material, rating, and application differences.',
      'Never invent item ids, group ids, aliases, prices, or evidence ids.',
      'Never recommend SAME_ITEM for a human reviewed-separate pair.',
    ],
    groups: [
      {
        group_id: exportGroup.group_id,
        label: exportGroup.label,
        flag_reason: params.group.reason,
        candidates,
        evidence_ids: [
          groupEvidenceId,
          ...candidates.flatMap((candidate) => candidate.evidence_ids),
        ],
      },
    ],
    reviewed_separate_pairs: reviewedSeparatePairs,
  }
}

export function buildCleanupLocalAIPrompt(task: CleanupLocalAITask, modelId: string) {
  const body = [
    'You are reviewing one BIGDROPS Item Library Cleanup candidate.',
    'Return only strict JSON. Do not return markdown or prose outside JSON.',
    'Your result is read-only. It must not apply, approve, or mutate data.',
    '',
    'Rules:',
    ...task.rules.map((rule) => `- ${rule}`),
    '',
    'Allowed decisions:',
    '- SAME_ITEM: only when the group items are truly the same reusable item.',
    '- DIFFERENT_ITEM: when the visible evidence shows identity-significant differences.',
    '- UNSURE: when evidence is insufficient.',
    '',
    'Return this exact top-level shape:',
    JSON.stringify(
      {
        response_type: 'cleanup_ai_review_result',
        schema_version: CLEANUP_LOCAL_AI_SCHEMA_VERSION,
        task_id: task.task_id,
        cleanup_snapshot_id: task.cleanup_snapshot_id,
        provider_id: 'local_android',
        model_id: modelId,
        proposals: [
          {
            group_id: task.groups[0]?.group_id || 'same-as-input',
            decision: 'UNSURE',
            winner_item_id: null,
            merged_item_ids: [],
            reason_codes: ['insufficient_evidence'],
            reason: 'Concise reason.',
            referenced_evidence_ids: [],
            warnings: [],
          },
        ],
      },
      null,
      2,
    ),
    '',
    'Task JSON:',
    JSON.stringify(task),
    '',
    // Qwen3 reasoning models think before answering. The grammar already
    // forces JSON output, and /no_think skips the hidden reasoning pass so
    // small on-device models spend their budget on the decision itself.
    '/no_think',
  ].join('\n')

  // Single Qwen3 ChatML user turn. The native runtime tokenizes raw text, so
  // the prompt carries its own chat framing instead of relying on a template.
  return `<|im_start|>user\n${body}\n<|im_end|>\n<|im_start|>assistant\n`
}

export function validateCleanupLocalAIResult(input: unknown, task: CleanupLocalAITask): CleanupLocalAIValidationResult {
  const parsed = typeof input === 'string' ? parseJson(input) : input
  if (parsed instanceof Error) {
    return { ok: false, errors: [parsed.message], result: null }
  }
  if (!isRecord(parsed)) {
    return { ok: false, errors: ['Local AI result must be a JSON object.'], result: null }
  }

  const errors: string[] = []
  const responseType = readString(parsed.response_type)
  const schemaVersion = parsed.schema_version
  const taskId = readString(parsed.task_id)
  const snapshotId = readString(parsed.cleanup_snapshot_id)
  const providerId = readString(parsed.provider_id)
  const modelId = readString(parsed.model_id)
  const proposalsRaw = parsed.proposals

  if (responseType !== 'cleanup_ai_review_result') errors.push('response_type must be "cleanup_ai_review_result".')
  if (schemaVersion !== CLEANUP_LOCAL_AI_SCHEMA_VERSION) errors.push(`schema_version must be ${CLEANUP_LOCAL_AI_SCHEMA_VERSION}.`)
  if (taskId !== task.task_id) errors.push('Local AI result does not match the requested task.')
  if (snapshotId !== task.cleanup_snapshot_id) errors.push('Local AI result does not match the locked cleanup snapshot.')
  if (providerId !== 'local_android') errors.push('provider_id must be "local_android".')
  if (!modelId) errors.push('model_id is required.')
  if (!Array.isArray(proposalsRaw)) errors.push('proposals must be an array.')
  if (errors.length) return { ok: false, errors, result: null }

  const groupMap = new Map(task.groups.map((group) => [group.group_id, group]))
  const seenGroups = new Set<string>()
  const reviewedSeparatePairs = new Set(task.reviewed_separate_pairs.map((pair) => pairKey(pair.item_a_id, pair.item_b_id)))
  const parsedProposals: CleanupLocalAIProposal[] = []

  ;(proposalsRaw as unknown[]).forEach((proposalRaw, index) => {
    if (!isRecord(proposalRaw)) {
      errors.push(`Proposal ${index + 1} must be a JSON object.`)
      return
    }

    const groupId = readString(proposalRaw.group_id)
    const decision = readString(proposalRaw.decision) as CleanupLocalAIDecision
    const winnerItemId = readString(proposalRaw.winner_item_id)
    const mergedItemIds = readStringArray(proposalRaw.merged_item_ids) || []
    const reasonCodes = readStringArray(proposalRaw.reason_codes)
    const reason = readString(proposalRaw.reason)
    const referencedEvidenceIds = readStringArray(proposalRaw.referenced_evidence_ids)
    const warnings = proposalRaw.warnings === undefined ? [] : readStringArray(proposalRaw.warnings)
    const group = groupMap.get(groupId)

    if (!groupId) errors.push(`Proposal ${index + 1} is missing group_id.`)
    if (groupId && seenGroups.has(groupId)) errors.push(`Proposal for group ${groupId} appears more than once.`)
    seenGroups.add(groupId)
    if (!group) errors.push(`Proposal ${index + 1} references an unknown group_id.`)
    if (!['SAME_ITEM', 'DIFFERENT_ITEM', 'UNSURE'].includes(decision)) {
      errors.push(`Proposal ${index + 1} has an invalid decision.`)
    }
    if (!reasonCodes || reasonCodes.length === 0) errors.push(`Proposal ${index + 1} must include reason_codes.`)
    if (!reason) errors.push(`Proposal ${index + 1} must include a reason.`)
    if (!referencedEvidenceIds) errors.push(`Proposal ${index + 1} must include referenced_evidence_ids.`)
    if (warnings === null) errors.push(`Proposal ${index + 1} warnings must be an array when present.`)
    if (!group) return

    const groupItemIds = new Set(group.candidates.map((candidate) => candidate.item_id))
    const groupEvidenceIds = new Set(group.evidence_ids)
    const unknownReferencedEvidence = (referencedEvidenceIds || []).filter((evidenceId) => !groupEvidenceIds.has(evidenceId))
    if (unknownReferencedEvidence.length) errors.push(`Proposal ${index + 1} references evidence outside the task.`)

    if (decision === 'SAME_ITEM') {
      if (!winnerItemId) errors.push(`Proposal ${index + 1} must include winner_item_id for SAME_ITEM.`)
      if (!mergedItemIds.length) errors.push(`Proposal ${index + 1} must include merged_item_ids for SAME_ITEM.`)
      if (winnerItemId && !groupItemIds.has(winnerItemId)) {
        errors.push(`Proposal ${index + 1} winner_item_id is outside the group.`)
      }
      const outsideMergedIds = mergedItemIds.filter((itemId) => !groupItemIds.has(itemId))
      if (outsideMergedIds.length) errors.push(`Proposal ${index + 1} merged_item_ids must stay inside the group.`)
      if (winnerItemId && mergedItemIds.includes(winnerItemId)) {
        errors.push(`Proposal ${index + 1} merged_item_ids must not include the winner_item_id.`)
      }
      if (winnerItemId) {
        const hasKeepSeparateConflict = mergedItemIds.some((itemId) => reviewedSeparatePairs.has(pairKey(winnerItemId, itemId)))
        if (hasKeepSeparateConflict) {
          errors.push(`Proposal ${index + 1} conflicts with a human reviewed-separate decision.`)
        }
      }
    } else {
      if (winnerItemId || mergedItemIds.length) {
        errors.push(`Proposal ${index + 1} cannot include merge item ids for ${decision}.`)
      }
    }

    parsedProposals.push({
      group_id: groupId,
      decision,
      ...(winnerItemId ? { winner_item_id: winnerItemId } : {}),
      merged_item_ids: mergedItemIds,
      reason_codes: reasonCodes || [],
      reason,
      referenced_evidence_ids: referencedEvidenceIds || [],
      warnings: warnings || [],
    })
  })

  if (errors.length) return { ok: false, errors, result: null }

  return {
    ok: true,
    errors: [],
    result: {
      response_type: 'cleanup_ai_review_result',
      schema_version: CLEANUP_LOCAL_AI_SCHEMA_VERSION,
      task_id: task.task_id,
      cleanup_snapshot_id: task.cleanup_snapshot_id,
      provider_id: 'local_android',
      model_id: modelId,
      proposals: parsedProposals,
    },
  }
}

function parseJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return new Error('Local AI result is not valid JSON.')
  }
}
