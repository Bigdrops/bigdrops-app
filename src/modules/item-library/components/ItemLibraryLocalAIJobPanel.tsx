import { useEffect, useMemo, useRef, useState } from 'react'
import { ThinkingOrb } from 'thinking-orbs'

import { BIGDROPS_LOCAL_AI_POC_MODEL, LOCAL_AI_MODEL_CATALOG } from '@/lib/local-ai/modelManifest'
import { type LocalAIModelStatus } from '@/lib/local-ai/modelStatus'
import {
  getSelectedLocalAIModelId,
  listLocalAIModelChoices,
  recommendLocalAIModel,
  resolveLocalAIModelForJob,
  setSelectedLocalAIModelId,
} from '@/lib/local-ai/modelSelection'
import {
  analyzeCleanupTaskWithLocalAI,
  cancelLocalAIGeneration,
  getLocalAIModelStatus,
  getLocalAIRuntimeInfo,
  loadLocalAIModel,
  unloadLocalAIModel,
  type LocalAIRuntimeInfo,
} from '@/lib/native/localAI'
import {
  buildCleanupLocalAIJobPlan,
  CLEANUP_LOCAL_AI_JOB_CHUNK_GROUPS,
  parseCleanupLocalAICommand,
  runCleanupLocalAIJobPlan,
  summarizeCleanupLocalAIJobResults,
  type CleanupLocalAIJobGroupResult,
  type CleanupLocalAIJobPhase,
  type CleanupLocalAIJobPlan,
} from '../domain/cleanupLocalAIJob'
import type {
  DuplicateCandidateGroup,
  FlaggedCleanupExportPayload,
  ItemAlias,
  ItemReviewedSeparatePair,
} from '../types'
import { ItemLibraryLocalAIReviewPanel } from './ItemLibraryLocalAIReviewPanel'

type ItemLibraryLocalAIJobPanelProps = {
  aliases: ItemAlias[]
  exportPayload: FlaggedCleanupExportPayload
  groups: DuplicateCandidateGroup[]
  reviewedSeparatePairs: ItemReviewedSeparatePair[]
  selectedGroup?: DuplicateCandidateGroup | null
}

type JobStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'failed'
type ResultFilter = 'all' | 'ready' | 'unsure' | 'conflict' | 'failed'

const BATCH_CHOICES = [25, 50, 100] as const

function phaseLabel(phase: CleanupLocalAIJobPhase) {
  if (phase === 'preparing') return 'Preparing review'
  if (phase === 'loading') return 'Loading Local AI'
  if (phase === 'reviewing') return 'Reviewing items'
  return 'Validating decisions'
}

function orbStateForPhase(phase: CleanupLocalAIJobPhase) {
  if (phase === 'preparing') return 'weaving'
  if (phase === 'loading') return 'connecting'
  if (phase === 'reviewing') return 'breathing'
  return 'solving'
}

function decisionLabel(decision: string) {
  if (decision === 'SAME_ITEM') return 'Possible same item'
  if (decision === 'DIFFERENT_ITEM') return 'Likely different items'
  return 'Unsure'
}

function formatElapsed(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

export function ItemLibraryLocalAIJobPanel({
  aliases,
  exportPayload,
  groups,
  reviewedSeparatePairs,
  selectedGroup = null,
}: ItemLibraryLocalAIJobPanelProps) {
  const [batchSize, setBatchSize] = useState<number | null>(25)
  const [commandText, setCommandText] = useState('')
  const [commandNote, setCommandNote] = useState<string | null>(null)
  const [runtimeInfo, setRuntimeInfo] = useState<LocalAIRuntimeInfo | null>(null)
  const [modelStatuses, setModelStatuses] = useState<Record<string, LocalAIModelStatus | null>>({})
  const [selectedModelId, setSelectedModelId] = useState<string | null>(() => getSelectedLocalAIModelId())
  const [jobStatus, setJobStatus] = useState<JobStatus>('idle')
  const [phase, setPhase] = useState<CleanupLocalAIJobPhase>('preparing')
  const [plan, setPlan] = useState<CleanupLocalAIJobPlan | null>(null)
  const [results, setResults] = useState<CleanupLocalAIJobGroupResult[]>([])
  const [doneGroups, setDoneGroups] = useState(0)
  const [filter, setFilter] = useState<ResultFilter>('all')
  const [message, setMessage] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const cancelRequested = useRef(false)
  const jobRunId = useRef(0)

  const eligibleCount = groups.length
  const recommendedModel = useMemo(
    () => recommendLocalAIModel(runtimeInfo?.totalMemoryBytes),
    [runtimeInfo?.totalMemoryBytes],
  )
  const modelChoices = useMemo(
    () => listLocalAIModelChoices(modelStatuses, selectedModelId, recommendedModel.modelId),
    [modelStatuses, selectedModelId, recommendedModel],
  )
  const resolvedModel = useMemo(
    () =>
      resolveLocalAIModelForJob({
        selectedId: selectedModelId,
        statusesById: modelStatuses,
        recommendedId: recommendedModel.modelId,
      }),
    [selectedModelId, modelStatuses, recommendedModel],
  )
  const jobModelId = resolvedModel.kind === 'ready' ? resolvedModel.manifest.modelId : null
  const jobModelName = resolvedModel.kind === 'ready' ? resolvedModel.manifest.displayName : null
  const modelReady = jobModelId !== null
  const summary = useMemo(() => summarizeCleanupLocalAIJobResults(results), [results])
  const totalPlanned = plan?.tasks.length || 0
  const stoppedEarly = (jobStatus === 'completed' || jobStatus === 'cancelled') && results.length < totalPlanned

  const groupNames = useMemo(() => {
    const names = new Map<string, string[]>()
    plan?.tasks.forEach((entry) => {
      names.set(entry.group.group_id, entry.group.members.map((member) => member.name))
    })
    return names
  }, [plan])

  const filteredResults = useMemo(
    () => (filter === 'all' ? results : results.filter((result) => result.status === filter)),
    [filter, results],
  )

  const refreshModelStatuses = async () => {
    const entries = await Promise.all(
      LOCAL_AI_MODEL_CATALOG.filter((manifest) => manifest.enabled).map(async (manifest) => {
        try {
          return [manifest.modelId, await getLocalAIModelStatus(manifest.modelId)] as const
        } catch {
          return [manifest.modelId, null] as const
        }
      }),
    )
    const next: Record<string, LocalAIModelStatus | null> = {}
    entries.forEach(([modelId, status]) => {
      next[modelId] = status
    })
    return next
  }

  useEffect(() => {
    let cancelled = false
    void Promise.all([getLocalAIRuntimeInfo(), refreshModelStatuses()])
      .then(([info, statuses]) => {
        if (cancelled) return
        setRuntimeInfo(info)
        setModelStatuses(statuses)
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Local AI status could not be checked.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (jobStatus !== 'running') return
    const startedAt = Date.now() - elapsedMs
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 1000)
    return () => window.clearInterval(timer)
  }, [jobStatus, elapsedMs])

  const handleSelectModel = (modelId: string) => {
    if (jobStatus === 'running') return
    setSelectedModelId(modelId)
    setSelectedLocalAIModelId(modelId)
    setMessage(null)
  }

  const startJob = async (limit: number | null) => {
    if (jobStatus === 'running') return
    const runId = jobRunId.current + 1
    jobRunId.current = runId
    cancelRequested.current = false
    setMessage(null)
    setResults([])
    setDoneGroups(0)
    setFilter('all')
    setElapsedMs(0)
    setPlan(null)

    const resolved = resolveLocalAIModelForJob({
      selectedId: selectedModelId,
      statusesById: modelStatuses,
      recommendedId: recommendedModel.modelId,
    })
    if (resolved.kind !== 'ready') {
      setJobStatus('failed')
      setMessage(
        resolved.kind === 'selected-missing'
          ? `"${resolved.manifest.displayName}" is selected but not installed. Download it in Settings › Local AI, or choose an installed model.`
          : 'No installed Local AI model is available. Download a model in Settings › Local AI first.',
      )
      return
    }

    const jobPlan = buildCleanupLocalAIJobPlan({
      groups,
      exportPayload,
      aliases,
      reviewedSeparatePairs,
      limit,
      modelId: resolved.manifest.modelId,
      now: Date.now(),
    })

    if (!jobPlan.tasks.length) {
      setJobStatus('failed')
      setMessage(
        jobPlan.skipped.length
          ? 'No eligible groups could be prepared. The skipped groups are not in the locked cleanup export.'
          : 'There are no eligible duplicate groups for Local AI review.',
      )
      return
    }

    setPlan(jobPlan)
    setJobStatus('running')
    setPhase('preparing')

    try {
      const info = await getLocalAIRuntimeInfo()
      if (jobRunId.current !== runId) return
      setRuntimeInfo(info)
      if (!info.available || !info.runtimeLinked) {
        setJobStatus('failed')
        setMessage(info.message || 'Local llama.cpp runtime is not available in this app build.')
        return
      }

      if (info.loadedModelId && info.loadedModelId !== resolved.manifest.modelId) {
        await unloadLocalAIModel()
        if (jobRunId.current !== runId) return
      }

      const jobResults = await runCleanupLocalAIJobPlan(
        jobPlan,
        resolved.manifest.modelId,
        {
          loadModel: (modelId) => loadLocalAIModel(modelId),
          analyze: (task, prompt) => analyzeCleanupTaskWithLocalAI({ task, prompt }),
          unloadModel: () => unloadLocalAIModel(),
        },
        {
          onPhase: (nextPhase, done) => {
            if (jobRunId.current !== runId) return
            setPhase(nextPhase)
            setDoneGroups(done)
          },
          onGroupComplete: (completed, done) => {
            if (jobRunId.current !== runId) return
            setDoneGroups(done)
            setResults((current) => [...current, completed])
          },
          isCancelled: () => cancelRequested.current || jobRunId.current !== runId,
        },
      )

      if (jobRunId.current !== runId) return
      setResults(jobResults)
      setDoneGroups(jobResults.length)
      setJobStatus(cancelRequested.current ? 'cancelled' : 'completed')
      if (cancelRequested.current && jobResults.length) {
        setMessage(`Cancelled after ${jobResults.length} of ${jobPlan.tasks.length} groups. Completed reviews are kept below.`)
      } else if (jobResults.length < jobPlan.tasks.length) {
        setMessage(`Stopped early after ${jobResults.length} of ${jobPlan.tasks.length} groups because repeated inference failed. Completed reviews are kept below.`)
      } else {
        setMessage(`Reviewed ${jobResults.length} groups. Results are read-only. Nothing was changed.`)
      }
    } catch (error) {
      if (jobRunId.current !== runId) return
      setJobStatus('failed')
      setMessage(error instanceof Error ? error.message : 'Local AI review failed.')
    }
  }

  const handleCancel = async () => {
    cancelRequested.current = true
    await cancelLocalAIGeneration()
    setMessage('Cancelling. The current inference stops and completed reviews are kept.')
  }

  const handleCommand = () => {
    const command = parseCleanupLocalAICommand(commandText)
    if (command.action === 'start-job') {
      setCommandNote(null)
      setCommandText('')
      void startJob(command.limit)
      return
    }
    if (command.action === 'show-filter') {
      setFilter(command.filter)
      setCommandNote(command.filter === 'all' ? 'Showing all reviewed groups.' : `Showing ${command.filter} groups.`)
      setCommandText('')
      return
    }
    setCommandNote('Try "Review 25 items", "Review all duplicates", or "Show unsure".')
  }

  const progressPercent = totalPlanned ? Math.round((doneGroups / totalPlanned) * 100) : 0

  return (
    <section aria-label="Local AI Cleanup workspace" className="flex h-full flex-col overflow-hidden bg-bd-app-bg">
      <div className="overflow-y-auto p-5 pb-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">Local AI Cleanup</div>
            <h3 className="mt-1 text-[18px] font-extrabold text-bd-text">AI review job</h3>
            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-bd-text-muted">
              Start one review job. BIGDROPS checks each duplicate group on this device, validates every answer, and
              keeps the proposals read-only. Analysis never leaves this device.
            </p>
          </div>
          {jobStatus === 'running' ? (
            <div className="flex items-center gap-3 rounded-xl border border-bd-border bg-bd-card-bg px-4 py-3 shadow-sm">
              <ThinkingOrb state={orbStateForPhase(phase)} size={64} aria-hidden="true" />
              <div>
                <div className="text-[13px] font-extrabold text-bd-text" role="status">
                  {phaseLabel(phase)} · {doneGroups} of {totalPlanned}
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-bd-text-muted">Elapsed {formatElapsed(elapsedMs)}</div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl border border-bd-border bg-bd-card-bg p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="local-ai-model" className="text-[11px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">
                Model
              </label>
              <select
                id="local-ai-model"
                value={selectedModelId || ''}
                onChange={(event) => handleSelectModel(event.target.value)}
                disabled={jobStatus === 'running'}
                className="mt-1 block min-h-[42px] max-w-[220px] rounded-md border border-bd-border bg-bd-surface-muted px-3 text-[13px] font-bold text-bd-text outline-none focus:border-bd-button-primary-bg disabled:opacity-60"
              >
                <option value="" disabled>
                  Choose a model
                </option>
                {modelChoices.map((choice) => (
                  <option key={choice.manifest.modelId} value={choice.manifest.modelId} disabled={!choice.installed}>
                    {choice.manifest.displayName} · {choice.manifest.tier}
                    {choice.installed ? '' : ' (not installed)'}
                    {choice.selected ? ' · Selected' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="local-ai-job-size" className="text-[11px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">
                Job size
              </label>
              <select
                id="local-ai-job-size"
                value={batchSize === null ? 'all' : String(batchSize)}
                onChange={(event) => setBatchSize(event.target.value === 'all' ? null : Number(event.target.value))}
                disabled={jobStatus === 'running'}
                className="mt-1 block min-h-[42px] rounded-md border border-bd-border bg-bd-surface-muted px-3 text-[13px] font-bold text-bd-text outline-none focus:border-bd-button-primary-bg disabled:opacity-60"
              >
                {BATCH_CHOICES.map((choice) => (
                  <option key={choice} value={choice}>
                    {choice} groups
                  </option>
                ))}
                <option value="all">All ({eligibleCount})</option>
              </select>
            </div>
            <div className="min-w-0 flex-1 text-[11px] font-semibold text-bd-text-muted">
              <div>
                Eligible groups: <span className="font-extrabold text-bd-text">{eligibleCount}</span>
              </div>
              <div className="mt-0.5">
                {jobModelName ? (
                  <span>
                    Using <span className="font-extrabold text-bd-text">{jobModelName}</span>
                    {resolvedModel.kind === 'ready' && !resolvedModel.selected ? ' (recommended)' : null}
                  </span>
                ) : resolvedModel.kind === 'selected-missing' ? (
                  <span>
                    Selected model is not installed. <span className="font-extrabold text-bd-text">Install it in Settings › Local AI</span> or choose an installed model.
                  </span>
                ) : (
                  <span>No installed model. Download one in Settings › Local AI{recommendedModel ? ` (suggested: ${recommendedModel.displayName})` : ''}.</span>
                )}
                {runtimeInfo && !runtimeInfo.runtimeLinked ? ' · Native runtime unavailable' : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void startJob(batchSize)}
                disabled={jobStatus === 'running' || !modelReady || !eligibleCount}
                className="min-h-[42px] rounded-md border border-transparent bg-bd-button-primary-bg px-4 text-[12px] font-bold text-bd-button-primary-text shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {jobStatus === 'running' ? 'Reviewing…' : 'Start AI Review'}
              </button>
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={jobStatus !== 'running'}
                className="min-h-[42px] rounded-md border border-bd-border bg-bd-surface-muted px-3 text-[12px] font-bold text-bd-text transition hover:bg-bd-surface disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <label htmlFor="local-ai-command" className="sr-only">
              Local AI command
            </label>
            <input
              id="local-ai-command"
              value={commandText}
              onChange={(event) => setCommandText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCommand()
              }}
              placeholder='Try "Review 25 items" or "Show unsure"'
              disabled={jobStatus === 'running'}
              className="min-h-[42px] min-w-0 flex-1 rounded-md border border-bd-border bg-bd-card-bg px-3 text-[13px] text-bd-text outline-none focus:border-bd-button-primary-bg disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleCommand}
              disabled={jobStatus === 'running'}
              className="min-h-[42px] rounded-md border border-bd-border bg-bd-surface-muted px-4 text-[12px] font-bold text-bd-text transition hover:bg-bd-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              Run
            </button>
          </div>
          {commandNote ? <p className="mt-2 text-[11px] font-semibold text-bd-text-muted">{commandNote}</p> : null}

          {jobStatus === 'running' ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-bd-text">
                <span>
                  {phaseLabel(phase)} · chunk {Math.floor(doneGroups / CLEANUP_LOCAL_AI_JOB_CHUNK_GROUPS) + 1}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-bd-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={totalPlanned} aria-valuenow={doneGroups} aria-label="AI review progress">
                <div className="h-full rounded-full bg-bd-button-primary-bg transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          ) : null}

          {message ? (
            <p className="mt-3 rounded-md border border-bd-border bg-bd-surface-muted px-3 py-2 text-[11px] font-semibold text-bd-text-muted">
              {message}
            </p>
          ) : null}
        </div>

        {results.length ? (
          <div className="mt-4 rounded-xl border border-bd-border bg-bd-card-bg p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-[13px] font-extrabold text-bd-text">
                Results · {summary.ready} ready · {summary.unsure} unsure · {summary.conflict} conflicts · {summary.failed} failed
              </h4>
              {stoppedEarly ? (
                <span className="rounded-full border border-bd-status-warning-border bg-bd-status-warning-bg px-2.5 py-1 text-[10px] font-bold text-bd-status-warning-text">
                  Stopped early · {results.length} of {totalPlanned} kept
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Result filters">
              {(['all', 'ready', 'unsure', 'conflict', 'failed'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={filter === option}
                  onClick={() => setFilter(option)}
                  className={[
                    'min-h-[36px] rounded-md border px-3 text-[11px] font-bold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bd-button-primary-bg',
                    filter === option
                      ? 'border-bd-button-primary-bg bg-bd-button-primary-bg text-bd-button-primary-text'
                      : 'border-bd-border bg-bd-card-bg text-bd-text-muted hover:text-bd-text',
                  ].join(' ')}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              {filteredResults.length ? (
                filteredResults.map((result) => (
                  <article key={result.group_id} className="rounded-lg border border-bd-border bg-bd-surface-muted p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-extrabold text-bd-text">{result.label}</div>
                        <div className="mt-0.5 text-[10px] font-semibold text-bd-text-muted">
                          {(groupNames.get(result.group_id) || []).slice(0, 3).join(' · ')}
                        </div>
                      </div>
                      <span className="rounded-full border border-bd-border bg-bd-surface px-2.5 py-1 text-[10px] font-bold capitalize text-bd-text-muted">
                        {result.status}
                      </span>
                    </div>
                    {result.proposals.map((proposal) => (
                      <div key={`${result.group_id}-${proposal.decision}`} className="mt-2">
                        <div className="text-[12px] font-bold text-bd-text">{decisionLabel(proposal.decision)}</div>
                        <p className="mt-1 text-[12px] leading-relaxed text-bd-text-muted">{proposal.reason}</p>
                      </div>
                    ))}
                    {result.errors.length ? (
                      <p className="mt-2 text-[11px] font-semibold text-bd-status-danger-text">{result.errors.join(' ')}</p>
                    ) : null}
                    <details className="mt-2 text-[10px] font-semibold text-bd-text-muted">
                      <summary className="cursor-pointer">Details</summary>
                      <div className="mt-1 font-mono">Task {result.task_id}</div>
                      <div className="mt-0.5">Model {result.modelId}</div>
                      {typeof result.elapsedMs === 'number' ? <div className="mt-0.5">Elapsed {formatElapsed(result.elapsedMs)}</div> : null}
                    </details>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-bd-border p-4 text-[12px] text-bd-text-muted">
                  No groups in this category.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {selectedGroup ? (
          <details className="mt-4 rounded-xl border border-dashed border-bd-border bg-bd-card-bg p-4">
            <summary className="cursor-pointer text-[12px] font-bold text-bd-text-muted">
              Single-group diagnostics (advanced)
            </summary>
            <div className="mt-2">
              <ItemLibraryLocalAIReviewPanel
                aliases={aliases}
                exportPayload={exportPayload}
                group={selectedGroup}
                reviewedSeparatePairs={reviewedSeparatePairs}
                modelId={jobModelId || selectedModelId || BIGDROPS_LOCAL_AI_POC_MODEL.modelId}
              />
            </div>
          </details>
        ) : null}
      </div>
    </section>
  )
}
