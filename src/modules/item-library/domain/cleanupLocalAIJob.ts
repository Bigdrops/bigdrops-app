import {
  buildCleanupLocalAIPrompt,
  buildCleanupLocalAITask,
  validateCleanupLocalAIResult,
  type CleanupLocalAIProposal,
  type CleanupLocalAITask,
} from './cleanupLocalAI'
import type {
  DuplicateCandidateGroup,
  FlaggedCleanupExportPayload,
  ItemAlias,
  ItemReviewedSeparatePair,
} from '../types'

export const CLEANUP_LOCAL_AI_JOB_CHUNK_GROUPS = 5
export const CLEANUP_LOCAL_AI_JOB_MAX_CONSECUTIVE_FAILURES = 3

export type CleanupLocalAIJobGroupStatus = 'ready' | 'unsure' | 'conflict' | 'failed' | 'skipped'

export type CleanupLocalAIJobTask = {
  group: DuplicateCandidateGroup
  task: CleanupLocalAITask
  prompt: string
}

export type CleanupLocalAIJobSkippedGroup = {
  group_id: string
  label: string
  reason: string
}

export type CleanupLocalAIJobPlan = {
  jobId: string
  snapshotId: string
  tasks: CleanupLocalAIJobTask[]
  skipped: CleanupLocalAIJobSkippedGroup[]
}

export type CleanupLocalAIJobGroupResult = {
  group_id: string
  label: string
  task_id: string
  status: CleanupLocalAIJobGroupStatus
  modelId: string
  proposals: CleanupLocalAIProposal[]
  errors: string[]
  elapsedMs?: number
}

export type CleanupLocalAIJobPhase = 'preparing' | 'loading' | 'reviewing' | 'validating' | 'done'

export type CleanupLocalAIJobCallbacks = {
  onPhase?: (phase: Exclude<CleanupLocalAIJobPhase, 'done'>, doneGroups: number, totalGroups: number) => void
  onGroupComplete?: (result: CleanupLocalAIJobGroupResult, doneGroups: number, totalGroups: number) => void
  isCancelled?: () => boolean
}

export type CleanupLocalAIJobRunnerDeps = {
  loadModel: (modelId: string) => Promise<unknown>
  analyze: (task: CleanupLocalAITask, prompt: string) => Promise<{ rawText: string; elapsedMs: number }>
  unloadModel?: () => Promise<unknown>
}

export type CleanupLocalAICommand =
  | { action: 'start-job'; limit: number | null }
  | { action: 'show-filter'; filter: 'ready' | 'unsure' | 'conflict' | 'failed' | 'all' }
  | { action: 'help' }

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Local AI review failed.'
}

export function buildCleanupLocalAIJobPlan(params: {
  groups: DuplicateCandidateGroup[]
  exportPayload: FlaggedCleanupExportPayload
  aliases: ItemAlias[]
  reviewedSeparatePairs?: ItemReviewedSeparatePair[]
  limit?: number | null
  modelId: string
  now?: number
}): CleanupLocalAIJobPlan {
  const snapshotId = params.exportPayload.snapshot_id
  const limited = typeof params.limit === 'number' ? params.groups.slice(0, Math.max(0, params.limit)) : params.groups
  const tasks: CleanupLocalAIJobTask[] = []
  const skipped: CleanupLocalAIJobSkippedGroup[] = []

  limited.forEach((group) => {
    try {
      const task = buildCleanupLocalAITask({
        group,
        exportPayload: params.exportPayload,
        aliases: params.aliases,
        reviewedSeparatePairs: params.reviewedSeparatePairs,
      })
      tasks.push({ group, task, prompt: buildCleanupLocalAIPrompt(task, params.modelId) })
    } catch (error) {
      skipped.push({ group_id: group.group_id, label: group.label, reason: readErrorMessage(error) })
    }
  })

  return {
    jobId: `cleanup-local-ai-job-v1:${snapshotId}:${params.now ?? Date.now()}`,
    snapshotId,
    tasks,
    skipped,
  }
}

function classifyValidatedResult(
  entry: CleanupLocalAIJobTask,
  modelId: string,
  proposals: CleanupLocalAIProposal[],
  elapsedMs: number,
): CleanupLocalAIJobGroupResult {
  const base = {
    group_id: entry.group.group_id,
    label: entry.group.label,
    task_id: entry.task.task_id,
    modelId,
    elapsedMs,
  }
  if (proposals.some((proposal) => proposal.decision === 'UNSURE')) {
    return { ...base, status: 'unsure', proposals, errors: [] }
  }
  return { ...base, status: 'ready', proposals, errors: [] }
}

function classifyValidationErrors(
  entry: CleanupLocalAIJobTask,
  modelId: string,
  errors: string[],
  elapsedMs: number,
): CleanupLocalAIJobGroupResult {
  const conflict = errors.some((message) => /reviewed-separate/i.test(message))
  return {
    group_id: entry.group.group_id,
    label: entry.group.label,
    task_id: entry.task.task_id,
    modelId,
    status: conflict ? 'conflict' : 'failed',
    proposals: [],
    errors,
    elapsedMs,
  }
}

export async function runCleanupLocalAIJobPlan(
  plan: CleanupLocalAIJobPlan,
  modelId: string,
  deps: CleanupLocalAIJobRunnerDeps,
  callbacks: CleanupLocalAIJobCallbacks = {},
): Promise<CleanupLocalAIJobGroupResult[]> {
  const results: CleanupLocalAIJobGroupResult[] = []
  const totalGroups = plan.tasks.length
  const cancelled = () => callbacks.isCancelled?.() === true

  callbacks.onPhase?.('preparing', 0, totalGroups)

  try {
    callbacks.onPhase?.('loading', 0, totalGroups)
    await deps.loadModel(modelId)
  } catch (error) {
    const message = readErrorMessage(error)
    return plan.tasks.map((entry) => ({
      group_id: entry.group.group_id,
      label: entry.group.label,
      task_id: entry.task.task_id,
      modelId,
      status: 'failed',
      proposals: [],
      errors: [message],
    }))
  }

  let consecutiveFailures = 0

  for (const entry of plan.tasks) {
    if (cancelled()) break
    if (consecutiveFailures >= CLEANUP_LOCAL_AI_JOB_MAX_CONSECUTIVE_FAILURES) break

    callbacks.onPhase?.('reviewing', results.length, totalGroups)

    let rawText = ''
    let elapsedMs = 0
    let analyzeError: string | null = null

    try {
      const nativeResult = await deps.analyze(entry.task, entry.prompt)
      rawText = nativeResult.rawText
      elapsedMs = nativeResult.elapsedMs
    } catch (error) {
      analyzeError = readErrorMessage(error)
    }

    if (cancelled()) break

    callbacks.onPhase?.('validating', results.length, totalGroups)

    let result: CleanupLocalAIJobGroupResult
    if (analyzeError !== null) {
      result = {
        group_id: entry.group.group_id,
        label: entry.group.label,
        task_id: entry.task.task_id,
        modelId,
        status: 'failed',
        proposals: [],
        errors: [analyzeError],
        elapsedMs,
      }
    } else {
      const validation = validateCleanupLocalAIResult(rawText, entry.task)
      result = validation.ok
        ? classifyValidatedResult(entry, modelId, validation.result.proposals, elapsedMs)
        : classifyValidationErrors(entry, modelId, validation.errors, elapsedMs)
    }

    if (result.status === 'failed') {
      consecutiveFailures += 1
    } else {
      consecutiveFailures = 0
    }

    results.push(result)
    callbacks.onGroupComplete?.(result, results.length, totalGroups)
  }

  try {
    await deps.unloadModel?.()
  } catch {
    // Unload is best-effort memory hygiene. Job results already stand.
  }

  return results
}

export function summarizeCleanupLocalAIJobResults(results: CleanupLocalAIJobGroupResult[]) {
  const summary = { total: results.length, ready: 0, unsure: 0, conflict: 0, failed: 0 }
  results.forEach((result) => {
    if (result.status === 'ready') summary.ready += 1
    else if (result.status === 'unsure') summary.unsure += 1
    else if (result.status === 'conflict') summary.conflict += 1
    else if (result.status === 'failed') summary.failed += 1
  })
  return summary
}

export function parseCleanupLocalAICommand(text: string): CleanupLocalAICommand {
  const normalized = String(text || '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!normalized) return { action: 'help' }

  const reviewAll = /^(please\s+)?(review|check|scan)\s+(all|everything|every group|every duplicate)/.test(normalized)
  if (reviewAll) return { action: 'start-job', limit: null }

  const reviewCount = /^(please\s+)?(review|check|scan)\s+(\d+)(\s+(items?|groups?|duplicates?))?/.exec(normalized)
  if (reviewCount) {
    const limit = Number.parseInt(reviewCount[3] || '', 10)
    if (Number.isFinite(limit) && limit > 0) return { action: 'start-job', limit }
    return { action: 'help' }
  }

  if (/^(show|list|filter)(\s+me)?\s+(only\s+)?(the\s+)?unsure(\s+(ones?|cases?|groups?))?$/.test(normalized) || normalized === 'unsure') {
    return { action: 'show-filter', filter: 'unsure' }
  }
  if (/conflicts?/.test(normalized) && /^(show|list|filter)/.test(normalized)) {
    return { action: 'show-filter', filter: 'conflict' }
  }
  if (/failed|failures|errors/.test(normalized) && /^(show|list|filter|retry)/.test(normalized)) {
    return { action: 'show-filter', filter: 'failed' }
  }
  if (/^show\s+(all|everything|results?)$/.test(normalized)) {
    return { action: 'show-filter', filter: 'all' }
  }
  if (/^show\s+ready$/.test(normalized)) {
    return { action: 'show-filter', filter: 'ready' }
  }

  return { action: 'help' }
}
