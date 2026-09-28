import { useMemo, useState } from 'react'

import {
  BIGDROPS_LOCAL_AI_POC_MODEL_ID,
  buildCleanupLocalAIPrompt,
  buildCleanupLocalAITask,
  validateCleanupLocalAIResult,
  type CleanupLocalAIResult,
} from '../domain/cleanupLocalAI'
import {
  analyzeCleanupTaskWithLocalAI,
  cancelLocalAIGeneration,
  getLocalAIRuntimeInfo,
  loadLocalAIModel,
  unloadLocalAIModel,
  type LocalAIRuntimeInfo,
} from '@/lib/native/localAI'
import type {
  DuplicateCandidateGroup,
  FlaggedCleanupExportPayload,
  ItemAlias,
  ItemReviewedSeparatePair,
} from '../types'

type ItemLibraryLocalAIReviewPanelProps = {
  aliases: ItemAlias[]
  exportPayload: FlaggedCleanupExportPayload
  group: DuplicateCandidateGroup
  reviewedSeparatePairs: ItemReviewedSeparatePair[]
}

function decisionLabel(decision: string) {
  if (decision === 'SAME_ITEM') return 'Possible same item'
  if (decision === 'DIFFERENT_ITEM') return 'Likely different items'
  return 'Unsure'
}

export function ItemLibraryLocalAIReviewPanel({
  aliases,
  exportPayload,
  group,
  reviewedSeparatePairs,
}: ItemLibraryLocalAIReviewPanelProps) {
  const [runtimeInfo, setRuntimeInfo] = useState<LocalAIRuntimeInfo | null>(null)
  const [result, setResult] = useState<CleanupLocalAIResult | null>(null)
  const [status, setStatus] = useState<'idle' | 'checking' | 'running' | 'cancelled' | 'failed'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const task = useMemo(
    () => buildCleanupLocalAITask({ group, exportPayload, aliases, reviewedSeparatePairs }),
    [aliases, exportPayload, group, reviewedSeparatePairs],
  )
  const prompt = useMemo(() => buildCleanupLocalAIPrompt(task), [task])

  const handleAnalyze = async () => {
    setStatus('checking')
    setMessage(null)
    setResult(null)

    try {
      const info = await getLocalAIRuntimeInfo()
      setRuntimeInfo(info)

      if (!info.available || !info.runtimeLinked) {
        setStatus('failed')
        setMessage(info.message || 'Local llama.cpp runtime is not available in this app build.')
        return
      }

      setStatus('running')
      await loadLocalAIModel(BIGDROPS_LOCAL_AI_POC_MODEL_ID)
      const nativeResult = await analyzeCleanupTaskWithLocalAI({ task, prompt })
      const validation = validateCleanupLocalAIResult(nativeResult.rawText, task)

      if (!validation.ok) {
        setStatus('failed')
        setMessage(validation.errors.join(' '))
        return
      }

      setResult(validation.result)
      setStatus('idle')
      setMessage(`Local AI completed in ${nativeResult.elapsedMs.toLocaleString()} ms. Review only. No changes were made.`)
    } catch (error) {
      setStatus('failed')
      setMessage(error instanceof Error ? error.message : 'Local AI review failed.')
    }
  }

  const handleCancel = async () => {
    await cancelLocalAIGeneration()
    setStatus('cancelled')
    setMessage('Local AI generation was cancelled. Partial output was discarded.')
  }

  const handleUnload = async () => {
    await unloadLocalAIModel()
    const info = await getLocalAIRuntimeInfo()
    setRuntimeInfo(info)
    setMessage('Local AI model memory was released.')
  }

  return (
    <section className="mt-4 rounded-xl border border-bd-border bg-bd-surface p-4 shadow-lg">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">Local AI proof of concept</div>
          <h3 className="mt-1 text-[16px] font-extrabold text-bd-text">Read-only Cleanup proposal</h3>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-bd-text-muted">
            This sends only the selected cleanup group to the Android LocalAI bridge. It can suggest Same, Different,
            or Unsure, but it cannot merge, create, link, or save Item Library data.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleAnalyze()}
            disabled={status === 'checking' || status === 'running'}
            className="rounded-md border border-transparent bg-bd-button-primary-bg px-4 py-2 text-[12px] font-bold text-bd-button-primary-text shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'checking' || status === 'running' ? 'Analyzing…' : 'Analyze locally'}
          </button>
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={status !== 'running'}
            className="rounded-md border border-bd-border bg-bd-surface-muted px-3 py-2 text-[12px] font-bold text-bd-text transition hover:bg-bd-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleUnload()}
            className="rounded-md border border-bd-border bg-bd-surface-muted px-3 py-2 text-[12px] font-bold text-bd-text transition hover:bg-bd-surface"
          >
            Unload
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-bd-border bg-bd-surface-muted p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Snapshot</div>
          <div className="mt-1 break-all font-mono text-[10px] text-bd-text">{task.cleanup_snapshot_id}</div>
        </div>
        <div className="rounded-lg border border-bd-border bg-bd-surface-muted p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Model</div>
          <div className="mt-1 break-all font-mono text-[10px] text-bd-text">{BIGDROPS_LOCAL_AI_POC_MODEL_ID}</div>
        </div>
        <div className="rounded-lg border border-bd-border bg-bd-surface-muted p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Runtime</div>
          <div className="mt-1 text-[11px] font-semibold text-bd-text">
            {runtimeInfo
              ? runtimeInfo.runtimeLinked
                ? 'llama.cpp linked'
                : 'Bridge only'
              : 'Not checked'}
          </div>
        </div>
      </div>

      {message ? (
        <p className="mt-3 rounded-md border border-bd-border bg-bd-surface-muted px-3 py-2 text-[11px] font-semibold text-bd-text-muted">
          {message}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-3">
          {result.proposals.map((proposal) => (
            <div key={proposal.group_id} className="rounded-lg border border-bd-border bg-bd-surface-muted p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px] font-extrabold text-bd-text">{decisionLabel(proposal.decision)}</div>
                <span className="rounded-full border border-bd-border bg-bd-surface px-2.5 py-1 text-[10px] font-bold text-bd-text-muted">
                  Read-only
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-bd-text-muted">{proposal.reason}</p>
              {proposal.winner_item_id ? (
                <div className="mt-2 font-mono text-[10px] text-bd-text-muted">Winner: {proposal.winner_item_id}</div>
              ) : null}
              {proposal.merged_item_ids?.length ? (
                <div className="mt-1 font-mono text-[10px] text-bd-text-muted">
                  Merge candidates: {proposal.merged_item_ids.join(', ')}
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {proposal.reason_codes.map((reasonCode) => (
                  <span key={reasonCode} className="rounded-full border border-bd-border bg-bd-surface px-2 py-0.5 text-[10px] font-semibold text-bd-text-muted">
                    {reasonCode}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
