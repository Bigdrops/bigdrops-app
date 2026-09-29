import { App } from '@capacitor/app'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ThinkingOrb } from 'thinking-orbs'
import { Check, ChevronDown, Send, SlidersHorizontal } from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { LOCAL_AI_MODEL_CATALOG } from '@/lib/local-ai/modelManifest'
import { type LocalAIModelStatus } from '@/lib/local-ai/modelStatus'
import { formatLocalAIModelBytes, localAIModelStatusLabel } from '@/lib/local-ai/modelStatus'
import {
  getSelectedLocalAIModelId,
  listLocalAIModelChoices,
  recommendLocalAIModel,
  refreshLocalAIModelSelectionSnapshot,
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
  cleanupAssistantDecisionLabel,
  detectCleanupAssistantSpecDifferences,
  parseCleanupAssistantIntent,
  summarizeCleanupAssistantResults,
  type CleanupAssistantResultFilter,
} from '../domain/cleanupLocalAIAssistant'
import {
  buildCleanupLocalAIJobPlan,
  runCleanupLocalAIJobPlan,
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

type ItemLibraryLocalAIJobPanelProps = {
  aliases: ItemAlias[]
  exportPayload: FlaggedCleanupExportPayload
  groups: DuplicateCandidateGroup[]
  reviewedSeparatePairs: ItemReviewedSeparatePair[]
  selectedGroup?: DuplicateCandidateGroup | null
  onOpenGroup?: (groupId: string) => void
  onResultsChange?: (results: CleanupLocalAIJobGroupResult[]) => void
}

type JobStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'failed'
type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
  suggestions?: string[]
  results?: CleanupLocalAIJobGroupResult[]
}

function phaseLabel(phase: CleanupLocalAIJobPhase) {
  if (phase === 'preparing') return 'Preparing review'
  if (phase === 'loading') return 'Loading Local AI'
  if (phase === 'reviewing') return 'Reviewing duplicates'
  return 'Validating answers'
}

function orbStateForPhase(phase: CleanupLocalAIJobPhase) {
  if (phase === 'preparing') return 'weaving'
  if (phase === 'loading') return 'connecting'
  if (phase === 'reviewing') return 'breathing'
  return 'solving'
}

function formatElapsed(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

function formatModelLabel(displayName: string, tier: string) {
  const conciseName = displayName
    .replace(/\s+Instruct/i, '')
    .replace(/\s+Q4_K_M\s+GGUF/i, '')
    .replace(/\s+GGUF/i, '')
    .trim()
  return `${conciseName} · ${tier === 'standard' ? 'Standard' : 'Lite'}`
}

function createMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function plural(value: number, one: string, many = `${one}s`) {
  return `${value} ${value === 1 ? one : many}`
}

function openingMessage(groups: DuplicateCandidateGroup[], selectedModelLabel: string, modelReady: boolean) {
  const specDifferences = groups.flatMap((group) => detectCleanupAssistantSpecDifferences(group))
  const notable = specDifferences[0]
  const lines = [
    `I found ${plural(groups.length, 'duplicate group')} that ${groups.length === 1 ? 'needs' : 'need'} review.`,
    modelReady
      ? `I can use ${selectedModelLabel} for read-only cleanup analysis.`
      : 'I need an installed Local AI model before I can run analysis.',
  ]

  if (notable) {
    lines.push(
      `One group has different ${notable.label}: ${notable.values.join(' and ')}. That can mean the items should stay separate.`,
    )
  }

  lines.push('Tell me what to review. I will not change library data.')
  return lines.join('\n\n')
}

function resultCardTitle(result: CleanupLocalAIJobGroupResult) {
  if (result.status === 'failed') return 'AI review failed'
  if (result.status === 'conflict') return 'Conflict needs review'
  const proposal = result.proposals[0]
  if (!proposal) return 'Needs your decision'
  return cleanupAssistantDecisionLabel(proposal.decision)
}

function assistantSummaryText(results: CleanupLocalAIJobGroupResult[]) {
  const summary = summarizeCleanupAssistantResults(results)
  return [
    `I reviewed ${plural(summary.total, 'duplicate group')}.`,
    summary.keepSeparate ? `${plural(summary.keepSeparate, 'group')} should stay separate.` : null,
    summary.merge ? `${plural(summary.merge, 'group')} has a merge recommendation.` : null,
    summary.unsure ? `${plural(summary.unsure, 'group')} needs your decision.` : null,
    summary.conflict ? `${plural(summary.conflict, 'group')} has a safety conflict.` : null,
    summary.failed ? `${plural(summary.failed, 'group')} failed and can be retried or reviewed manually.` : null,
    'Nothing was changed.',
  ].filter(Boolean).join('\n')
}

export function ItemLibraryLocalAIJobPanel({
  aliases,
  exportPayload,
  groups,
  reviewedSeparatePairs,
  selectedGroup = null,
  onOpenGroup,
  onResultsChange,
}: ItemLibraryLocalAIJobPanelProps) {
  const [modelSheetOpen, setModelSheetOpen] = useState(false)
  const [runtimeInfo, setRuntimeInfo] = useState<LocalAIRuntimeInfo | null>(null)
  const [modelStatuses, setModelStatuses] = useState<Record<string, LocalAIModelStatus | null>>({})
  const [selectedModelId, setSelectedModelId] = useState<string | null>(() => getSelectedLocalAIModelId())
  const [jobStatus, setJobStatus] = useState<JobStatus>('idle')
  const [phase, setPhase] = useState<CleanupLocalAIJobPhase>('preparing')
  const [plan, setPlan] = useState<CleanupLocalAIJobPlan | null>(null)
  const [results, setResults] = useState<CleanupLocalAIJobGroupResult[]>([])
  const [doneGroups, setDoneGroups] = useState(0)
  const [filter, setFilter] = useState<CleanupAssistantResultFilter>('all')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [composerText, setComposerText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const cancelRequested = useRef(false)
  const jobRunId = useRef(0)
  const openingKey = useRef('')
  const messageListRef = useRef<HTMLDivElement | null>(null)

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
  const selectedModelLabel = jobModelName
    ? formatModelLabel(jobModelName, resolvedModel.kind === 'ready' ? resolvedModel.manifest.tier : '')
    : selectedModelId
      ? 'Selected model'
      : formatModelLabel(recommendedModel.displayName, recommendedModel.tier)
  const totalPlanned = plan?.tasks.length || 0
  const progressPercent = totalPlanned ? Math.round((doneGroups / totalPlanned) * 100) : 0

  useEffect(() => {
    onResultsChange?.(results)
  }, [onResultsChange, results])

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, jobStatus, doneGroups])

  const refreshModelState = useCallback(async () => {
    const info = await getLocalAIRuntimeInfo()
    const recommended = recommendLocalAIModel(info.totalMemoryBytes)
    const snapshot = await refreshLocalAIModelSelectionSnapshot({
      readStatus: getLocalAIModelStatus,
      readSelectedId: getSelectedLocalAIModelId,
      recommendedId: recommended.modelId,
    })
    setRuntimeInfo(info)
    setSelectedModelId(snapshot.selectedId)
    setModelStatuses(snapshot.statusesById)
    return { info, snapshot }
  }, [])

  useEffect(() => {
    let cancelled = false
    void refreshModelState().catch((error: unknown) => {
      if (cancelled) return
      const text = error instanceof Error ? error.message : 'Local AI status could not be checked.'
      setMessages((current) => [
        ...current,
        { id: createMessageId('assistant'), role: 'assistant', text: `I could not refresh Local AI status. ${text}` },
      ])
    })

    const refreshIfVisible = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return
      void refreshModelState()
    }

    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)
    let removeResumeListener: (() => void) | null = null
    void App.addListener('resume', refreshIfVisible)
      .then((handle) => {
        if (cancelled) {
          void handle.remove()
          return
        }
        removeResumeListener = () => void handle.remove()
      })
      .catch(() => {
        removeResumeListener = null
      })

    return () => {
      cancelled = true
      window.removeEventListener('focus', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
      removeResumeListener?.()
    }
  }, [refreshModelState])

  useEffect(() => {
    const key = `${groups.map((group) => group.group_id).join('|')}::${selectedModelId || ''}::${modelReady}`
    if (openingKey.current === key) return
    openingKey.current = key
    setMessages([
      {
        id: createMessageId('assistant'),
        role: 'assistant',
        text: openingMessage(groups, selectedModelLabel, modelReady),
        suggestions: modelReady
          ? [
              eligibleCount <= 2 ? 'Review both' : `Review all ${eligibleCount}`,
              'Show groups',
              'What needs attention?',
            ]
          : ['Choose AI model', 'Show groups'],
      },
    ])
  }, [eligibleCount, groups, modelReady, selectedModelId, selectedModelLabel])

  useEffect(() => {
    if (jobStatus !== 'running') return
    const startedAt = Date.now() - elapsedMs
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 1000)
    return () => window.clearInterval(timer)
  }, [jobStatus, elapsedMs])

  const appendAssistant = (text: string, extra?: Pick<ChatMessage, 'suggestions' | 'results'>) => {
    setMessages((current) => [
      ...current,
      { id: createMessageId('assistant'), role: 'assistant', text, ...extra },
    ])
  }

  const handleSelectModel = (modelId: string) => {
    if (jobStatus === 'running') return
    const manifest = LOCAL_AI_MODEL_CATALOG.find((entry) => entry.modelId === modelId)
    setSelectedModelId(modelId)
    setSelectedLocalAIModelId(modelId)
    setModelSheetOpen(false)
    appendAssistant(`I will use ${manifest ? formatModelLabel(manifest.displayName, manifest.tier) : 'that model'} for cleanup review.`)
    void refreshModelState()
  }

  const startJob = async (limit: number | null) => {
    if (jobStatus === 'running') return
    const runId = jobRunId.current + 1
    jobRunId.current = runId
    cancelRequested.current = false
    setResults([])
    setDoneGroups(0)
    setFilter('all')
    setElapsedMs(0)
    setPlan(null)

    const snapshot = await refreshModelState()
    const resolved = snapshot.snapshot.resolved
    if (resolved.kind !== 'ready') {
      setJobStatus('failed')
      appendAssistant(
        resolved.kind === 'selected-missing'
          ? `"${formatModelLabel(resolved.manifest.displayName, resolved.manifest.tier)}" is selected but is not installed on this device. Open Settings > Local AI to download it, or choose an installed model here.`
          : 'No installed Local AI model is available. Download a model in Settings > Local AI before I can review duplicates.',
        { suggestions: ['Choose AI model', 'Show groups'] },
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
      appendAssistant(
        jobPlan.skipped.length
          ? 'I could not prepare any eligible duplicate groups from the locked cleanup export.'
          : 'There are no eligible duplicate groups for Local AI review.',
        { suggestions: ['Show groups'] },
      )
      return
    }

    setPlan(jobPlan)
    setJobStatus('running')
    setPhase('preparing')
    appendAssistant(`Okay. I will review ${plural(jobPlan.tasks.length, 'duplicate group')} with ${formatModelLabel(resolved.manifest.displayName, resolved.manifest.tier)}. I will not change anything.`)

    try {
      if (!snapshot.info.available || !snapshot.info.runtimeLinked) {
        setJobStatus('failed')
        appendAssistant(snapshot.info.message || 'Local llama.cpp runtime is not available in this app build.')
        return
      }

      if (snapshot.info.loadedModelId && snapshot.info.loadedModelId !== resolved.manifest.modelId) {
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
      const stoppedByFailures = !cancelRequested.current && jobResults.length < jobPlan.tasks.length
      setJobStatus(cancelRequested.current ? 'cancelled' : stoppedByFailures ? 'failed' : 'completed')
      if (cancelRequested.current) {
        appendAssistant(`I stopped after ${jobResults.length} of ${jobPlan.tasks.length} groups. Completed analysis is kept. Nothing was changed.`, { results: jobResults })
      } else if (stoppedByFailures) {
        appendAssistant(`I stopped after repeated inference failures. ${jobResults.length} of ${jobPlan.tasks.length} groups have saved analysis. Nothing was changed.`, { results: jobResults, suggestions: ['Retry failed review', 'Show failed'] })
      } else {
        appendAssistant(assistantSummaryText(jobResults), { results: jobResults, suggestions: ['Show unsure', 'Show failed', 'Show ready'] })
      }
    } catch (error) {
      if (jobRunId.current !== runId) return
      setJobStatus('failed')
      appendAssistant(
        `I could not finish this review. Your items were not changed. ${error instanceof Error ? error.message : 'Local AI review failed.'}`,
        { suggestions: ['Retry failed review', 'Review manually'] },
      )
    }
  }

  const handleCancel = async () => {
    cancelRequested.current = true
    await cancelLocalAIGeneration()
    appendAssistant('Cancelling. I will keep completed analysis and leave library data unchanged.')
  }

  const handleExplain = () => {
    const group = selectedGroup || groups[0]
    if (!group) {
      appendAssistant('There is no duplicate group to explain right now.')
      return
    }
    const differences = detectCleanupAssistantSpecDifferences(group)
    if (!differences.length) {
      appendAssistant(`"${group.label}" is flagged because the names are similar. Similar names are review evidence, not proof that the items are the same. Check ratings, model numbers, sizes, material, and use before merging.`)
      return
    }
    appendAssistant(
      `"${group.label}" has identity-significant differences: ${differences
        .map((entry) => `${entry.label} ${entry.values.join(' and ')}`)
        .join(', ')}. These differences can justify a Keep Separate decision.`,
    )
  }

  const handleInstruction = (text: string, addUserMessage = true) => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (addUserMessage) {
      setMessages((current) => [...current, { id: createMessageId('user'), role: 'user', text: trimmed }])
    }

    const intent = parseCleanupAssistantIntent(trimmed)
    if (intent.type === 'review_all') {
      void startJob(null)
      return
    }
    if (intent.type === 'review_next') {
      void startJob(intent.limit)
      return
    }
    if (intent.type === 'show_filter') {
      const nextResults = intent.filter === 'all' ? results : results.filter((result) => result.status === intent.filter)
      setFilter(intent.filter)
      appendAssistant(intent.filter === 'all' ? 'Showing all AI results.' : `Showing ${intent.filter} results.`, { results: nextResults })
      return
    }
    if (intent.type === 'show_groups') {
      appendAssistant(`There ${groups.length === 1 ? 'is' : 'are'} ${plural(groups.length, 'duplicate group')} in this cleanup view. Open a group card to resolve it manually, or tell me to review all duplicates.`)
      return
    }
    if (intent.type === 'explain') {
      handleExplain()
      return
    }
    if (intent.type === 'choose_model') {
      const choice = modelChoices.find((entry) => entry.manifest.tier === intent.tier && entry.installed)
      if (choice) {
        handleSelectModel(choice.manifest.modelId)
      } else {
        appendAssistant(`The ${intent.tier === 'standard' ? 'Standard' : 'Lite'} model is not installed yet. Download it in Settings > Local AI, or choose an installed model here.`, { suggestions: ['Choose AI model'] })
        setModelSheetOpen(true)
      }
      return
    }
    if (intent.type === 'retry_failed') {
      const failedCount = results.filter((result) => result.status === 'failed').length
      if (!failedCount) {
        appendAssistant('There are no failed AI results to retry.')
        return
      }
      void startJob(failedCount)
      return
    }
    if (intent.type === 'status') {
      const summary = summarizeCleanupAssistantResults(results)
      appendAssistant(
        results.length
          ? `${plural(summary.total, 'group')} analyzed. ${plural(summary.keepSeparate, 'keep-separate recommendation')}, ${plural(summary.merge, 'merge recommendation')}, ${plural(summary.unsure, 'uncertain result')}, ${plural(summary.failed, 'failure')}. Nothing was changed.`
          : `${plural(groups.length, 'duplicate group')} waiting. No AI analysis has started.`,
      )
      return
    }

    appendAssistant('I can review duplicates, explain a group, show unsure or failed results, retry failed review, or switch between installed Lite and Standard models.')
  }

  const submitComposer = () => {
    const text = composerText
    setComposerText('')
    handleInstruction(text)
  }

  return (
    <section aria-label="Cleanup AI Assistant" className="rounded-xl border border-bd-border bg-bd-card-bg shadow-sm">
      <div className="border-b border-bd-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-bd-border bg-bd-surface-muted">
              <ThinkingOrb state={jobStatus === 'running' ? orbStateForPhase(phase) : 'breathing'} size={32} aria-label={jobStatus === 'running' ? 'AI is reviewing duplicates' : 'AI assistant ready'} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">AI Assistant</div>
              <h3 className="mt-0.5 text-[16px] font-extrabold text-bd-text">Talk to AI</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-bd-text-muted">
                Ask for read-only duplicate analysis. Manual approval remains required.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModelSheetOpen(true)}
            disabled={jobStatus === 'running'}
            className="flex min-h-[38px] max-w-[170px] items-center gap-2 rounded-md border border-bd-border bg-bd-surface-muted px-2.5 text-left text-[11px] font-bold text-bd-text transition hover:bg-bd-surface disabled:opacity-60"
          >
            <span className="truncate">{modelReady ? selectedModelLabel : 'Choose model'}</span>
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-bd-text-muted" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div ref={messageListRef} className="max-h-[58dvh] space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} className={message.role === 'user' ? 'ml-8 rounded-xl bg-bd-button-primary-bg p-3 text-bd-button-primary-text' : 'mr-3 rounded-xl border border-bd-border bg-bd-surface p-3 text-bd-text'}>
            <p className="whitespace-pre-line text-[12px] font-semibold leading-relaxed">{message.text}</p>
            {message.results?.length ? (
              <div className="mt-3 space-y-2">
                {message.results.map((result) => (
                  <div key={`${message.id}-${result.group_id}`} className="rounded-lg border border-bd-border bg-bd-card-bg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-extrabold text-bd-text">{result.label}</div>
                        <div className="mt-0.5 text-[11px] font-bold text-bd-text-muted">{resultCardTitle(result)}</div>
                      </div>
                      <span className="rounded-full border border-bd-border bg-bd-surface-muted px-2 py-0.5 text-[10px] font-bold capitalize text-bd-text-muted">
                        {result.status}
                      </span>
                    </div>
                    {result.proposals.map((proposal) => (
                      <p key={`${result.group_id}-${proposal.decision}`} className="mt-2 text-[11px] leading-relaxed text-bd-text-muted">
                        {proposal.reason}
                      </p>
                    ))}
                    {result.errors.length ? (
                      <details className="mt-2 rounded-md border border-bd-status-warning-border bg-bd-status-warning-bg px-3 py-2 text-[10px] font-semibold text-bd-status-warning-text">
                        <summary className="cursor-pointer">Technical details</summary>
                        <div className="mt-1 font-mono">{result.errors.join(' ')}</div>
                        {typeof result.elapsedMs === 'number' ? <div className="mt-1">Elapsed {formatElapsed(result.elapsedMs)}</div> : null}
                      </details>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenGroup?.(result.group_id)}
                        className="min-h-[34px] rounded-md border border-bd-border bg-bd-surface-muted px-3 text-[11px] font-bold text-bd-text hover:bg-bd-surface"
                      >
                        Review decision
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInstruction(`Explain ${result.label}`)}
                        className="min-h-[34px] rounded-md border border-bd-border bg-bd-surface-muted px-3 text-[11px] font-bold text-bd-text hover:bg-bd-surface"
                      >
                        Ask why
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {message.suggestions?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      if (suggestion === 'Choose AI model') {
                        setModelSheetOpen(true)
                        return
                      }
                      if (suggestion === 'Review manually') {
                        appendAssistant('Manual cleanup is available in the duplicate group cards. Open a group and choose the identity decision first.')
                        return
                      }
                      handleInstruction(suggestion)
                    }}
                    className="min-h-[34px] rounded-full border border-bd-border bg-bd-surface-muted px-3 text-[11px] font-bold text-bd-text-muted transition hover:bg-bd-surface hover:text-bd-text"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        ))}

        {jobStatus === 'running' ? (
          <div className="rounded-xl border border-bd-border bg-bd-surface p-3">
            <div className="flex items-center gap-3">
              <ThinkingOrb state={orbStateForPhase(phase)} size={32} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-extrabold text-bd-text" role="status">
                  {phaseLabel(phase)} · {doneGroups} of {totalPlanned}
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-bd-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={totalPlanned} aria-valuenow={doneGroups} aria-label="AI review progress">
                  <div className="h-full rounded-full bg-bd-button-primary-bg transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-1 text-[10px] font-semibold text-bd-text-muted">Elapsed {formatElapsed(elapsedMs)}</div>
              </div>
              <button
                type="button"
                onClick={() => void handleCancel()}
                className="min-h-[36px] rounded-md border border-bd-border bg-bd-card-bg px-3 text-[11px] font-bold text-bd-text-muted hover:bg-bd-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {results.length ? (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="AI result filters">
            {(['all', 'ready', 'unsure', 'conflict', 'failed'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={filter === option}
                onClick={() => {
                  const nextResults = option === 'all' ? results : results.filter((result) => result.status === option)
                  setFilter(option)
                  appendAssistant(option === 'all' ? 'Showing all AI results.' : `Showing ${option} results.`, {
                    results: nextResults,
                  })
                }}
                className={[
                  'min-h-[34px] rounded-md border px-3 text-[11px] font-bold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bd-button-primary-bg',
                  filter === option
                    ? 'border-bd-button-primary-bg bg-bd-button-primary-bg text-bd-button-primary-text'
                    : 'border-bd-border bg-bd-card-bg text-bd-text-muted hover:text-bd-text',
                ].join(' ')}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="border-t border-bd-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className={['rounded-xl border bg-bd-surface p-2 transition', jobStatus === 'running' ? 'border-bd-button-primary-bg shadow-[0_0_0_1px_var(--bd-button-primary-bg)]' : 'border-bd-border'].join(' ')}>
          <label className="sr-only" htmlFor="cleanup-ai-composer">Message Cleanup AI</label>
          <div className="flex items-end gap-2">
            <textarea
              id="cleanup-ai-composer"
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submitComposer()
                }
              }}
              rows={1}
              placeholder="Ask AI to review duplicates..."
              className="max-h-28 min-h-[42px] flex-1 resize-none rounded-lg border border-transparent bg-transparent px-2 py-2 text-[13px] font-semibold text-bd-text outline-none placeholder:text-bd-text-muted"
            />
            <button
              type="button"
              onClick={submitComposer}
              disabled={!composerText.trim() || jobStatus === 'running'}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-bd-button-primary-bg text-bd-button-primary-text transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <Sheet open={modelSheetOpen} onOpenChange={setModelSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-[24px] border-bd-border bg-bd-card-bg px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <SheetHeader className="text-left">
            <SheetTitle className="text-[17px] font-black text-bd-text">Choose AI model</SheetTitle>
            <SheetDescription className="text-[12px] text-bd-text-muted">
              Installed models can run duplicate review on this device.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {modelChoices.map((choice) => (
              <button
                key={choice.manifest.modelId}
                type="button"
                onClick={() => choice.installed && handleSelectModel(choice.manifest.modelId)}
                disabled={!choice.installed || jobStatus === 'running'}
                className={[
                  'w-full rounded-lg border p-4 text-left transition focus-visible:ring-2 focus-visible:ring-bd-button-primary-bg',
                  choice.selected
                    ? 'border-bd-button-primary-bg bg-bd-surface-muted'
                    : 'border-bd-border bg-bd-surface hover:bg-bd-surface-muted',
                  !choice.installed ? 'opacity-70' : '',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-extrabold text-bd-text">
                      {formatModelLabel(choice.manifest.displayName, choice.manifest.tier)}
                    </div>
                    <div className="mt-1 text-[12px] font-semibold text-bd-text-muted">
                      {choice.manifest.tier === 'standard' ? 'Better reasoning candidate' : 'Lower memory / faster candidate'}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-bd-text-muted">
                      <span className="rounded-full border border-bd-border bg-bd-surface-muted px-2 py-0.5">
                        {formatLocalAIModelBytes(choice.manifest.expectedBytes)}
                      </span>
                      <span className="rounded-full border border-bd-border bg-bd-surface-muted px-2 py-0.5">
                        {choice.installed ? localAIModelStatusLabel(choice.status) : 'Not installed'}
                      </span>
                      {choice.recommended ? (
                        <span className="rounded-full border border-bd-border bg-bd-surface-muted px-2 py-0.5">
                          Recommended
                        </span>
                      ) : null}
                    </div>
                    <details className="mt-3 text-[10px] font-semibold text-bd-text-muted">
                      <summary className="cursor-pointer">Advanced details</summary>
                      <div className="mt-1 break-all font-mono">{choice.manifest.modelId}</div>
                      <div className="mt-1">{choice.manifest.quantization} · {choice.manifest.sourceRevision}</div>
                    </details>
                  </div>
                  <div className="flex min-w-[72px] justify-end">
                    {choice.selected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-bd-button-primary-bg px-2.5 py-1 text-[10px] font-bold text-bd-button-primary-text">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        Selected
                      </span>
                    ) : choice.installed ? (
                      <span className="rounded-full border border-bd-border bg-bd-surface-muted px-2.5 py-1 text-[10px] font-bold text-bd-text">
                        Use model
                      </span>
                    ) : (
                      <SlidersHorizontal className="h-4 w-4 text-bd-text-muted" aria-hidden="true" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}
