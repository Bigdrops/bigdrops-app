import { useEffect, useMemo, useState } from 'react'
import { Check, ClipboardCheck, Copy, Download, FileJson, LockKeyhole, Sparkles } from 'lucide-react'

import {
  buildCatalogCleanupBatchExportPayload,
  buildCatalogCleanupPrompt,
  createCatalogCleanupSession,
  validateCatalogCleanupBatchImport,
  createCleanupBatches,
  buildFlaggedCleanupBatchExportPayload,
  buildFlaggedCleanupExportPayload,
  buildFlaggedCleanupPrompt,
  validateFlaggedCleanupImport,
  createCleanupApplyProposal,
} from '../domain/itemCleanupExchange'
import { isValidCatalogItemId } from '../repositories/itemLibraryRepository'
import type {
  CatalogCleanupBatchExportPayload,
  CatalogCleanupBatchStatus,
  CatalogCleanupImportPreview,
  CleanupApplyProposal,
  CleanupApplyResult,
  CleanupPreviewGroup,
  DuplicateCandidateGroup,
  ItemAlias,
  ItemCatalogItem,
  FlaggedCleanupBatch,
  FlaggedCleanupBatchExportPayload,
  FlaggedCleanupExportPayload,
  CleanupImportPreview,
} from '../types'

type ItemLibraryAdvancedCleanupPanelProps = {
  workflow: 'duplicates' | 'full_catalog'
  applyLoading: boolean
  items: ItemCatalogItem[]
  aliases: ItemAlias[]
  duplicateGroups: DuplicateCandidateGroup[]
  onApplyProposals: (
    exportPayload: CatalogCleanupBatchExportPayload | FlaggedCleanupBatchExportPayload,
    proposals: CleanupApplyProposal[],
  ) => Promise<CleanupApplyResult[]>
}

type BatchState = {
  status: CatalogCleanupBatchStatus
  importText: string
  applyResults: CleanupApplyResult[]
  preview: CatalogCleanupImportPreview | CleanupImportPreview | null
}

function copyText(value: string) {
  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(value)
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  return Promise.resolve()
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return safeArray(value)
}

function downloadJson(filename: string, value: string) {
  const blob = new Blob([value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">{eyebrow}</div>
      <h2 className="mt-1 text-[18px] font-extrabold text-bd-text">{title}</h2>
      <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-bd-text-muted">{description}</p>
    </div>
  )
}

function StatCard({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="rounded-lg border border-bd-border bg-bd-surface-muted p-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">{label}</div>
      <div className="mt-2 font-mono text-[18px] font-bold text-bd-text">{value}</div>
      <p className="mt-1 text-[11px] text-bd-text-muted">{meta}</p>
    </div>
  )
}

function ValidationBanner({ errors }: { errors: string[] }) {
  if (!errors.length) return null

  return (
    <div className="rounded-md border border-bd-status-danger-border bg-bd-status-danger-bg px-4 py-3">
      <div className="text-[12px] font-bold text-bd-status-danger-text">Import result needs correction</div>
      <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-bd-status-danger-text">
        {asArray(errors).map((error) => (
          <li key={error}>• {error}</li>
        ))}
      </ul>
    </div>
  )
}

function getBatchSize(option: string, customValue: string, totalCount: number) {
  if (option === 'all') return totalCount
  if (option === 'custom') {
    const parsed = Number.parseInt(customValue, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  const parsed = Number.parseInt(option, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function createMergeProposal(
  exportPayload: CatalogCleanupBatchExportPayload,
  winnerItemId: string,
  mergedItemIds: string[],
  canonicalName: string,
): CleanupApplyProposal {
  const itemMap = new Map(safeArray(exportPayload.items).map((item) => [item.item_id, item]))
  const winner = itemMap.get(winnerItemId)

  return {
    group_id: winner?.duplicate_group_id || winnerItemId,
    export_label: winner?.name || canonicalName,
    canonical_name: canonicalName,
    winner_item_id: winnerItemId,
    merged_item_ids: mergedItemIds,
    aliases_to_keep: [],
    aliases_to_retire: [],
  }
}

export function ItemLibraryAdvancedCleanupPanel({
  workflow,
  applyLoading,
  items,
  aliases,
  duplicateGroups,
  onApplyProposals,
}: ItemLibraryAdvancedCleanupPanelProps) {
  const [batchSizeOption, setBatchSizeOption] = useState<'25' | '50' | '100' | 'all' | 'custom'>('50')
  const [customBatchSize, setCustomBatchSize] = useState('')
  const [lockedSession, setLockedSession] = useState<ReturnType<typeof createCatalogCleanupSession> | null>(null)
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0)
  const [batchStates, setBatchStates] = useState<Record<string, BatchState>>({})
  const [copyState, setCopyState] = useState<'idle' | 'json' | 'prompt'>('idle')
  const [applyError, setApplyError] = useState<string | null>(null)

  const isDuplicates = workflow === 'duplicates'

  // Flagged cleanup payload for 'duplicates' mode (entire set, no batching)
  const flaggedExportPayload = useMemo(() => {
    if (!isDuplicates) return null
    return buildFlaggedCleanupExportPayload({ 
      duplicateGroups: (duplicateGroups ?? []) as any, 
      aliases: (aliases ?? []) as any 
    })
  }, [isDuplicates, duplicateGroups, aliases])

  const resolvedBatchSize = getBatchSize(batchSizeOption, customBatchSize, (items ?? []).length)
  
  const currentBatch = isDuplicates 
    ? (flaggedExportPayload ? { batch_id: 'flagged-outsource', title: 'Flagged Duplicates', item_count: flaggedExportPayload.scope.item_count } : null)
    : (lockedSession?.batches?.[currentBatchIndex] || null)

  const currentBatchState = currentBatch ? batchStates[currentBatch.batch_id] : null

  const currentExportPayload = useMemo(() => {
    if (isDuplicates) return flaggedExportPayload
    if (!lockedSession || !currentBatch) return null
    return buildCatalogCleanupBatchExportPayload({
      session: lockedSession,
      batch: currentBatch as any,
      batchIndex: currentBatchIndex,
    })
  }, [isDuplicates, flaggedExportPayload, currentBatch, currentBatchIndex, lockedSession])

  const importText = currentBatchState?.importText || ''
  const validation = useMemo(() => {
    if (!currentExportPayload) return null
    if (isDuplicates) {
      return validateFlaggedCleanupImport(importText, currentExportPayload as FlaggedCleanupExportPayload | FlaggedCleanupBatchExportPayload)
    }
    return validateCatalogCleanupBatchImport(importText, currentExportPayload as CatalogCleanupBatchExportPayload)
  }, [isDuplicates, currentExportPayload, importText])

  useEffect(() => {
    if (!currentBatch || !validation) return
    setBatchStates((previous) => {
      const existing = previous[currentBatch.batch_id]
      if (existing?.importText === importText && existing?.status === (validation.preview ? (existing.status === 'applied' ? 'applied' : 'review_imported') : existing.status)) {
        return previous
      }

      return {
        ...previous,
        [currentBatch.batch_id]: {
          status: validation.preview
            ? existing?.status === 'applied'
              ? 'applied'
              : 'review_imported'
            : existing?.status || 'not_started',
          importText,
          applyResults: existing?.applyResults || [],
          preview: validation.preview,
        },
      }
    })
  }, [currentBatch, importText, validation])

  const exportJson = useMemo(
    () => (currentExportPayload ? JSON.stringify(currentExportPayload, null, 2) : ''),
    [currentExportPayload],
  )
  const aiPrompt = useMemo(() => {
    if (!currentExportPayload) return ''
    if (isDuplicates) return buildFlaggedCleanupPrompt(currentExportPayload as FlaggedCleanupExportPayload | FlaggedCleanupBatchExportPayload)
    return buildCatalogCleanupPrompt(currentExportPayload as CatalogCleanupBatchExportPayload)
  }, [isDuplicates, currentExportPayload])
  const preview = validation?.preview as (CatalogCleanupImportPreview | CleanupImportPreview | null)
  const applyableMerges = isDuplicates ? (preview as CleanupImportPreview)?.merge_groups || [] : (preview as CatalogCleanupImportPreview)?.merge_suggestions || []
  const renameSuggestions = !isDuplicates ? (preview as CatalogCleanupImportPreview)?.rename_suggestions || [] : []
  const aliasSuggestions = !isDuplicates ? (preview as CatalogCleanupImportPreview)?.alias_suggestions || [] : []
  const ignoredItems = !isDuplicates ? (preview as CatalogCleanupImportPreview)?.ignored_items || [] : []
  const reviewRequiredItems = !isDuplicates ? (preview as CatalogCleanupImportPreview)?.review_required_items || [] : []
  const rawIgnoredGroups = isDuplicates ? (preview as CleanupImportPreview)?.ignored_groups || [] : []

  // Merge Guard: count how many proposals contain only valid catalog UUIDs
  const syntheticMergeCount = useMemo(() => {
    return safeArray(applyableMerges as any[]).filter((merge: any) => {
      const winnerId = merge?.winner_item_id || merge?.winner?.item_id || ''
      const mergedIds: string[] = safeArray(merge?.merged_item_ids || merge?.merged_items || []).map((item: any) =>
        typeof item === 'string' ? item : item?.item_id || '',
      )
      const allIds = [winnerId, ...mergedIds].filter(Boolean)
      return allIds.some((id: string) => !isValidCatalogItemId(id))
    }).length
  }, [applyableMerges])

  const hasOnlyInvalidMerges = applyableMerges.length > 0 && syntheticMergeCount === applyableMerges.length
  const ignoredGroups = useMemo(() => {
    return safeArray(rawIgnoredGroups).map((g: any) => ({
      group_id: g?.group_id || 'unknown',
      export_label: g?.label || g?.export_label || 'Unnamed Group',
    }))
  }, [rawIgnoredGroups])

  const markBatchStatus = (status: CatalogCleanupBatchStatus) => {
    if (!currentBatch) return
    setBatchStates((previous) => ({
      ...previous,
      [currentBatch.batch_id]: {
        status,
        importText: previous[currentBatch.batch_id]?.importText || '',
        applyResults: previous[currentBatch.batch_id]?.applyResults || [],
        preview: previous[currentBatch.batch_id]?.preview || null,
      },
    }))
  }

  const handleCopy = async (value: string, nextState: 'json' | 'prompt') => {
    await copyText(value)
    if (currentBatchState?.status === 'not_started') {
      markBatchStatus('exported')
    }
    setCopyState(nextState)
    window.setTimeout(() => setCopyState('idle'), 1800)
  }

  const handleDownload = () => {
    if (!currentBatch || !currentExportPayload) return
    downloadJson(
      `bigdrops-catalog-cleanup-${currentBatch.batch_id}-${new Date().toISOString().slice(0, 10)}.json`,
      exportJson,
    )
    if ((currentBatchState?.status || 'not_started') === 'not_started') {
      markBatchStatus('exported')
    }
  }

  const handleLockSession = () => {
    if (!resolvedBatchSize) return

    const nextSession = createCatalogCleanupSession({
      items: items ?? [],
      aliases: aliases ?? [],
      duplicateGroups: duplicateGroups ?? [],
      batchSize: resolvedBatchSize,
      sessionId: `catalog-cleanup-${Date.now()}`,
      generatedAt: new Date().toISOString(),
    })

    setLockedSession(nextSession)
    setCurrentBatchIndex(0)
    setBatchStates(
      Object.fromEntries(
        (nextSession.batches ?? []).map((batch) => [
          batch.batch_id,
          {
            status: 'not_started',
            importText: '',
            applyResults: [],
            preview: null,
          },
        ]),
      ),
    )
    setApplyError(null)
  }

  const handleApplySupportedDecisions = async () => {
    if (!currentExportPayload || !currentBatch || !applyableMerges.length) return

    try {
      setApplyError(null)

      const proposals: CleanupApplyProposal[] = isDuplicates
        ? safeArray(applyableMerges as CleanupPreviewGroup[])
            .filter((merge) => merge && merge.group_id && (merge.winner_item_id || merge.winner?.item_id))
            .map((merge) => createCleanupApplyProposal(merge))
        : safeArray(applyableMerges as any[])
            .filter((merge) => merge && merge.winner?.item_id && safeArray(merge.merged_items).length > 0)
            .map((merge) =>
              createMergeProposal(
                currentExportPayload as CatalogCleanupBatchExportPayload,
                merge.winner.item_id,
                safeArray(merge.merged_items).map((item: any) => item.item_id),
                merge.canonical_name,
              ),
            )

      // Ironclad Merge Guard: strip proposals containing non-UUID synthetic IDs
      const validProposals = proposals.filter((proposal) => {
        const allIds = [proposal.winner_item_id, ...proposal.merged_item_ids]
        return allIds.every((id) => isValidCatalogItemId(id))
      })

      const blockedCount = proposals.length - validProposals.length

      if (validProposals.length === 0) {
        setApplyError(
          blockedCount > 0
            ? `All ${blockedCount} merge proposal(s) contain imported fallback items (non-UUID IDs). These items must be backfilled to the catalog before merging.`
            : 'No valid or supported merges to apply.',
        )
        return
      }

      if (blockedCount > 0) {
        setApplyError(`${blockedCount} proposal(s) skipped: contain imported fallback items that are not saved catalog records yet.`)
      }

      const results = await onApplyProposals(
        currentExportPayload as CatalogCleanupBatchExportPayload | FlaggedCleanupBatchExportPayload,
        validProposals,
      )

      setBatchStates((previous) => ({
        ...previous,
        [currentBatch.batch_id]: {
          status: 'applied',
          importText: previous[currentBatch.batch_id]?.importText || '',
          applyResults: results,
          preview: previous[currentBatch.batch_id]?.preview || null,
        },
      }))
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : 'Could not apply the supported merge suggestions.')
    }
  }

  if (!lockedSession && !isDuplicates) {
    const customBatchTouched = batchSizeOption === 'custom' && customBatchSize.trim().length > 0
    const customBatchInvalid = batchSizeOption === 'custom' && customBatchTouched && !resolvedBatchSize
    const sessionEstimate = useMemo(() => {
      if (!resolvedBatchSize) return null
      return createCatalogCleanupSession({
        items,
        aliases,
        duplicateGroups,
        batchSize: resolvedBatchSize,
        sessionId: 'preview-session',
        generatedAt: 'preview',
      })
    }, [aliases, duplicateGroups, items, resolvedBatchSize])

    return (
      <div className="h-full overflow-y-auto bg-bd-app-bg">
        <div className="mx-auto max-w-3xl space-y-5 p-5 pb-28 md:p-6">
          <section className="rounded-xl border border-bd-border bg-bd-surface p-5 shadow-lg md:p-6">
            <SectionTitle
              eyebrow="Cleanup Setup"
              title="Clean & Standardize Catalog"
              description="Pick how many items you want to clean at once."
            />

            <div className="mt-5">
              <div className="inline-flex w-full flex-wrap gap-2 rounded-lg border border-bd-border bg-bd-surface-muted p-2">
                {['25', '50', '100', 'all', 'custom'].map((option) => {
                  const isSelected = batchSizeOption === option

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setBatchSizeOption(option as '25' | '50' | '100' | 'all' | 'custom')}
                      className={[
                        'flex min-w-[72px] flex-1 items-center justify-center gap-2 rounded-md border px-4 py-3 text-[13px] font-bold transition-all duration-150',
                        isSelected
                          ? 'border-bd-border-strong bg-bd-surface text-bd-text shadow-sm'
                          : 'border-transparent bg-transparent text-bd-text-muted hover:border-bd-border hover:bg-bd-surface-muted/50',
                      ].join(' ')}
                    >
                      {isSelected ? <Check className="h-4 w-4" /> : null}
                      <span className="capitalize">{option === 'custom' ? 'Custom' : option}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {batchSizeOption === 'custom' ? (
              <div className="mt-4 rounded-lg border border-bd-border bg-bd-surface-muted p-4">
                <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">
                  Custom batch size
                </label>
                <input
                  value={customBatchSize}
                  onChange={(event) => setCustomBatchSize(event.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  placeholder="Enter a positive number"
                  aria-invalid={customBatchInvalid}
                  className={[
                    'mt-2 w-full rounded-md border bg-bd-surface px-4 py-3 text-[14px] font-semibold text-bd-text outline-none transition-colors',
                    customBatchInvalid
                      ? 'border-bd-status-danger-border focus:border-bd-status-danger-text'
                      : 'border-bd-input-border focus:border-bd-input-focus',
                  ].join(' ')}
                />
                {customBatchInvalid ? (
                  <p className="mt-2 text-[11px] font-medium text-bd-status-danger-text">Enter a valid positive whole number.</p>
                ) : null}
              </div>
            ) : null}

            {resolvedBatchSize && sessionEstimate ? (
              <div className="mt-4 space-y-4">
                {batchSizeOption === 'all' && items.length > 300 ? (
                  <div className="rounded-lg border border-bd-status-danger-border bg-bd-status-danger-bg px-4 py-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-bd-status-danger-text text-white">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[15px] font-extrabold text-bd-status-danger-text">Large catalog detected</div>
                        <p className="mt-1 text-[12px] leading-relaxed text-bd-status-danger-text opacity-90">
                          This may be too large for one AI review. Consider 50 or 100 items per batch for better results.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-lg border border-bd-border bg-bd-surface-muted px-4 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-bd-button-primary-bg text-bd-button-primary-text">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[15px] font-extrabold text-bd-text">
                        {resolvedBatchSize.toLocaleString()} items per batch selected
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-bd-text-muted">
                        You&apos;ll review about {sessionEstimate.batch_count.toLocaleString()} batch{sessionEstimate.batch_count === 1 ? '' : 'es'}. Duplicate groups will stay together.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <div className="sticky bottom-3 z-10">
            <div className="rounded-2xl border border-bd-border bg-bd-surface/95 p-3 shadow-xl backdrop-blur-md">
              <button
                type="button"
                onClick={handleLockSession}
                disabled={!resolvedBatchSize}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-bd-button-primary-bg px-4 py-3.5 text-[13px] font-bold text-bd-button-primary-text shadow-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:bg-bd-surface-muted disabled:text-bd-text-muted"
              >
                <LockKeyhole className="h-4 w-4" />
                Start Cleanup Session
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }  const batchCount = isDuplicates ? 1 : (lockedSession?.batch_count ?? 0)
  const hasNextBatch = !isDuplicates && currentBatchIndex < batchCount - 1
  const currentStatus = currentBatchState?.status || 'not_started'
  const canAdvance = currentStatus === 'review_imported' || currentStatus === 'applied'

  if (isDuplicates) {
    return (
      <div className="h-full overflow-y-auto bg-bd-app-bg">
        <div className="space-y-4 p-5 pb-20">
          <section className="rounded-xl border border-bd-border bg-bd-surface p-5 shadow-lg">
            <SectionTitle
              eyebrow="Cleanup Hub"
              title="Outsource Duplicate Review"
              description="Reviewing all flagged duplicate groups together. Export the JSON, review the AI output, and apply suggested merges."
            />

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <StatCard 
                label="Groups" 
                value={(duplicateGroups ?? []).length.toLocaleString()} 
                meta="Total flagged." 
              />
              <StatCard label="Current Count" value={(currentBatch?.item_count ?? 0).toLocaleString()} meta="Full Set" />
              <StatCard label="Status" value={currentStatus.replace('_', ' ')} meta="Tracked in state." />
              <StatCard
                label="Progress"
                value="1/1"
                meta="Single payload."
              />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-bd-border bg-bd-surface-muted p-4 shadow-sm">
              <SectionTitle
                eyebrow="1. Export"
                title="Export All Duplicates"
                description="The export contains all detected duplicate groups for this business."
              />

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex w-full items-center justify-between rounded-md border border-bd-border bg-bd-surface px-4 py-2.5 text-[12px] font-bold text-bd-text transition-colors hover:bg-bd-surface-muted"
                >
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export batch JSON
                  </div>
                  <FileJson className="h-4 w-4 opacity-40" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy(aiPrompt, 'prompt')}
                  className="flex w-full items-center justify-between rounded-md border border-bd-border bg-bd-surface-muted/50 px-4 py-2.5 text-[12px] font-semibold text-bd-text-muted transition-colors hover:bg-bd-surface-muted"
                >
                  <div className="flex items-center gap-2">
                    {copyState === 'prompt' ? <ClipboardCheck className="h-4 w-4 text-bd-status-success-text" /> : <Copy className="h-4 w-4" />}
                    {copyState === 'prompt' ? 'AI prompt copied' : 'Copy AI prompt'}
                  </div>
                  <Sparkles className="h-4 w-4 opacity-40" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy(exportJson, 'json')}
                  className="flex w-full items-center justify-between rounded-md border border-bd-border bg-bd-surface-muted/50 px-4 py-2.5 text-[12px] font-semibold text-bd-text-muted transition-colors hover:bg-bd-surface-muted"
                >
                  <div className="flex items-center gap-2">
                    {copyState === 'json' ? <ClipboardCheck className="h-4 w-4 text-bd-status-success-text" /> : <Copy className="h-4 w-4" />}
                    {copyState === 'json' ? 'Batch JSON copied' : 'Copy batch JSON'}
                  </div>
                  <FileJson className="h-4 w-4 opacity-40" />
                </button>
              </div>
            </section>

            <section className="rounded-lg border border-bd-border bg-bd-surface-muted p-4 shadow-sm">
              <SectionTitle
                eyebrow="2. Import Review"
                title="Paste AI result"
                description="The result is validated against the full duplicate group scope. Use 'Final JSON' from the AI."
              />

              <textarea
                value={importText}
                onChange={(event) => {
                  const nextText = event.target.value
                  setBatchStates((previous) => ({
                    ...previous,
                    [currentBatch.batch_id]: {
                      status: previous[currentBatch.batch_id]?.status === 'applied' ? 'applied' : previous[currentBatch.batch_id]?.status || 'not_started',
                      importText: nextText,
                      applyResults: previous[currentBatch.batch_id]?.applyResults || [],
                      preview: previous[currentBatch.batch_id]?.preview || null,
                    },
                  }))
                }}
                placeholder="Paste AI result JSON here..."
                spellCheck={false}
                className="mt-4 min-h-[150px] w-full rounded-md border border-bd-input-border bg-bd-input-bg px-4 py-3 font-mono text-[11px] text-bd-text outline-none placeholder:text-bd-text-muted focus:border-bd-input-focus"
              />
            </section>
          </div>

          <section className="rounded-lg border border-bd-border bg-bd-surface-muted p-4 shadow-sm">
            <SectionTitle
              eyebrow="3. Preview Decisions"
              title="Review what is safe to apply now"
              description="Merge suggestions apply through the safe merge engine. Ignored groups are tracked for reference."
            />

            <div className="mt-4 space-y-4">
              <ValidationBanner errors={validation.errors} />

              {!importText.trim() ? (
                <div className="rounded-md border border-dashed border-bd-border bg-bd-surface-muted px-4 py-8 text-center">
                  <div className="text-[13px] font-semibold text-bd-text-muted">No AI result pasted yet</div>
                  <p className="mt-1 text-[11px] text-bd-text-muted opacity-80">Paste the AI output to preview decisions.</p>
                </div>
              ) : validation.preview ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <StatCard label="Merges" value={applyableMerges.length.toLocaleString()} meta="Detected groups." />
                    <StatCard label="Ignored" value={ignoredGroups.length.toLocaleString()} meta="Ambiguous groups." />
                  </div>

                  {applyableMerges.length ? (
                    <div className="rounded-md border border-bd-border bg-bd-surface p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Applyable merges</div>
                          <div className="mt-1 text-[13px] font-black text-bd-text">
                            {applyableMerges.length} merge suggestion{applyableMerges.length === 1 ? '' : 's'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleApplySupportedDecisions()}
                          disabled={applyLoading || hasOnlyInvalidMerges}
                          className="rounded-md border border-transparent bg-bd-button-primary-bg px-4 py-2 text-[11px] font-bold text-bd-button-primary-text transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {applyLoading ? 'Applying...' : hasOnlyInvalidMerges ? 'Blocked: non-catalog IDs' : 'Apply supported merges'}
                        </button>
                      </div>

                      {syntheticMergeCount > 0 && (
                        <div className="mt-2 rounded-md border border-bd-status-warning-border bg-bd-status-warning-bg px-3 py-2 text-[11px] text-bd-status-warning-text">
                          {syntheticMergeCount} merge proposal{syntheticMergeCount === 1 ? '' : 's'} contain imported fallback items (non-UUID IDs) and will be skipped. Backfill these items to the catalog before merging.
                        </div>
                      )}

                      <div className="mt-3 space-y-3">
                        {safeArray(applyableMerges as CleanupPreviewGroup[]).map((merge) => (
                          <article key={merge.group_id} className="rounded-md bg-bd-surface-muted p-3">
                            <h3 className="text-[13px] font-bold text-bd-text">{merge.canonical_name}</h3>
                            <p className="mt-1 text-[11px] text-bd-text-muted">
                              Group: {merge.export_label} • Winner: {merge.winner?.name} • Merge: {safeArray(merge.merged_items).map((item) => item.name).join(', ')}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {(preview as CleanupImportPreview).rejected_groups?.length ? (
                    <div className="rounded-md border border-bd-status-danger-border bg-bd-status-danger-bg p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-status-danger-text">Rejected proposals</div>
                      <div className="mt-3 space-y-2">
                        {safeArray((preview as CleanupImportPreview).rejected_groups).map((rejected) => (
                          <div key={rejected.group_id} className="rounded-md bg-bd-status-danger-bg p-3 border border-bd-status-danger-border/30">
                            <div className="text-[12px] font-bold text-bd-status-danger-text">{rejected.group_id}</div>
                            <div className="mt-0.5 text-[11px] text-bd-status-danger-text opacity-90">{rejected.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {ignoredGroups.length ? (
                    <div className="rounded-md border border-bd-border bg-bd-surface p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Ignored groups</div>
                      <p className="mt-2 text-[11px] text-bd-text-muted">{safeArray(ignoredGroups).map((g: any) => g.export_label).join(', ')}</p>
                    </div>
                  ) : null}

                  {currentBatchState?.applyResults && currentBatchState.applyResults.length ? (
                    <div className="rounded-md border border-bd-border bg-bd-surface p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Apply results</div>
                      <div className="mt-2 space-y-1 text-[11px] text-bd-text">
                        {safeArray(currentBatchState.applyResults).map((result) => (
                          <div key={`${result.group_id}-${result.status}`} className="rounded-md bg-bd-surface-muted px-3 py-2">
                            <div>
                              {result.canonical_name}: {result.status}
                            </div>
                            <div className="mt-1 text-bd-text-muted">
                              {result.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {applyError ? (
                    <div className="rounded-md border border-bd-status-danger-border bg-bd-status-danger-bg px-4 py-3 text-[11px] text-bd-status-danger-text">
                      {applyError}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-bd-border bg-bd-surface-muted px-4 py-3">
                    <div className="text-[11px] text-bd-text-muted">
                      Finalize review and apply merges. All proposals must come from the exported groups.
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBatchStates({})
                          setCurrentBatchIndex(0)
                          setApplyError(null)
                        }}
                        className="rounded-md border border-bd-border bg-bd-surface px-3 py-2 text-[11px] font-semibold text-bd-text transition-colors hover:bg-bd-surface-muted"
                      >
                        Reset Flow
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-bd-app-bg">
      <div className="space-y-4 p-5 pb-20">
        <section className="rounded-xl border border-bd-border bg-bd-surface p-5 shadow-lg">
          <SectionTitle
            eyebrow="Cleanup Hub"
            title={`Batch ${currentBatchIndex + 1} of ${batchCount}`}
            description="This session is locked to a fixed batch size. Export only the current batch, review the AI output, and apply supported merge decisions before moving forward."
          />

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <StatCard 
              label="Batch Size" 
              value={(lockedSession?.batch_size ?? 0).toLocaleString()} 
              meta="Locked for this session." 
            />
            <StatCard label="Current Count" value={(currentBatch?.item_count ?? 0).toLocaleString()} meta={currentBatch?.batch_id ?? '...'} />
            <StatCard label="Status" value={currentStatus.replace('_', ' ')} meta="Tracked in state." />
            <StatCard
              label="Progress"
              value={`${currentBatchIndex + 1}/${batchCount}`}
              meta="One numeric batch at a time."
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {asArray(lockedSession?.batches).map((batch, index) => {
              const status = batchStates[batch.batch_id]?.status || 'not_started'
              return (
                <span
                  key={batch.batch_id}
                  className={[
                    'rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em]',
                    index === currentBatchIndex
                      ? 'border-bd-border-strong bg-bd-surface-muted text-bd-text'
                      : 'border-bd-border bg-bd-surface text-bd-text-muted',
                  ].join(' ')}
                >
                  {batch.title}: {status.replace('_', ' ')}
                </span>
              )
            })}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-bd-border bg-bd-surface-muted p-4 shadow-sm">
            <SectionTitle
              eyebrow="1. Export"
              title="Release only this batch"
              description="The export contains the current batch only, with session and batch identifiers for strict import validation."
            />

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="flex w-full items-center justify-between rounded-md border border-bd-border bg-bd-surface px-4 py-2.5 text-[12px] font-bold text-bd-text transition-colors hover:bg-bd-surface-muted"
              >
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export batch JSON
                </div>
                <FileJson className="h-4 w-4 opacity-40" />
              </button>
              <button
                type="button"
                onClick={() => void handleCopy(aiPrompt, 'prompt')}
                className="flex w-full items-center justify-between rounded-md border border-bd-border bg-bd-surface-muted/50 px-4 py-2.5 text-[12px] font-semibold text-bd-text-muted transition-colors hover:bg-bd-surface-muted"
              >
                <div className="flex items-center gap-2">
                  {copyState === 'prompt' ? <ClipboardCheck className="h-4 w-4 text-bd-status-success-text" /> : <Copy className="h-4 w-4" />}
                  {copyState === 'prompt' ? 'AI prompt copied' : 'Copy AI prompt'}
                </div>
                <Sparkles className="h-4 w-4 opacity-40" />
              </button>
              <button
                type="button"
                onClick={() => void handleCopy(exportJson, 'json')}
                className="flex w-full items-center justify-between rounded-md border border-bd-border bg-bd-surface-muted/50 px-4 py-2.5 text-[12px] font-semibold text-bd-text-muted transition-colors hover:bg-bd-surface-muted"
              >
                <div className="flex items-center gap-2">
                  {copyState === 'json' ? <ClipboardCheck className="h-4 w-4 text-bd-status-success-text" /> : <Copy className="h-4 w-4" />}
                  {copyState === 'json' ? 'Batch JSON copied' : 'Copy batch JSON'}
                </div>
                <FileJson className="h-4 w-4 opacity-40" />
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-bd-border bg-bd-surface-muted p-4 shadow-sm">
            <SectionTitle
              eyebrow="2. Import Review"
              title="Paste AI result"
              description="The result is validated against the locked current batch. Wrong identifiers are rejected."
            />

            <textarea
              value={importText}
              onChange={(event) => {
                const nextText = event.target.value
                setBatchStates((previous) => ({
                  ...previous,
                  [currentBatch.batch_id]: {
                    status: previous[currentBatch.batch_id]?.status === 'applied' ? 'applied' : previous[currentBatch.batch_id]?.status || 'not_started',
                    importText: nextText,
                    applyResults: previous[currentBatch.batch_id]?.applyResults || [],
                    preview: previous[currentBatch.batch_id]?.preview || null,
                  },
                }))
              }}
              placeholder="Paste AI result JSON here..."
              spellCheck={false}
              className="mt-4 min-h-[150px] w-full rounded-md border border-bd-input-border bg-bd-input-bg px-4 py-3 font-mono text-[11px] text-bd-text outline-none placeholder:text-bd-text-muted focus:border-bd-input-focus"
            />
          </section>
        </div>

        <section className="rounded-lg border border-bd-border bg-bd-surface-muted p-4 shadow-sm">
          <SectionTitle
            eyebrow="3. Preview Decisions"
            title="Review what is safe to apply now"
            description="Merge suggestions apply through the safe merge engine. Rename and alias suggestions remain preview-only."
          />

          <div className="mt-4 space-y-4">
            <ValidationBanner errors={validation.errors} />

            {!importText.trim() ? (
              <div className="rounded-md border border-dashed border-bd-border bg-bd-surface-muted px-4 py-8 text-center">
                <div className="text-[13px] font-semibold text-bd-text-muted">No AI result pasted yet</div>
                <p className="mt-1 text-[11px] text-bd-text-muted opacity-80">Paste the AI output to preview decisions for this batch.</p>
              </div>
            ) : validation.preview ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <StatCard label="Merges" value={applyableMerges.length.toLocaleString()} meta="Applyable now." />
                  <StatCard label="Renames" value={renameSuggestions.length.toLocaleString()} meta="Preview only." />
                  <StatCard label="Aliases" value={aliasSuggestions.length.toLocaleString()} meta="Preview only." />
                  <StatCard label="Review" value={reviewRequiredItems.length.toLocaleString()} meta="Needs human check." />
                </div>

                {applyableMerges.length ? (
                  <div className="rounded-md border border-bd-border bg-bd-surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Applyable merges</div>
                        <div className="mt-1 text-[13px] font-black text-bd-text">
                          {applyableMerges.length} merge suggestion{applyableMerges.length === 1 ? '' : 's'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleApplySupportedDecisions()}
                        disabled={applyLoading || hasOnlyInvalidMerges}
                        className="rounded-md border border-transparent bg-bd-button-primary-bg px-4 py-2 text-[11px] font-bold text-bd-button-primary-text transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {applyLoading ? 'Applying...' : hasOnlyInvalidMerges ? 'Blocked: non-catalog IDs' : 'Apply supported merges'}
                      </button>
                    </div>

                    {syntheticMergeCount > 0 && (
                      <div className="mt-2 rounded-md border border-bd-status-warning-border bg-bd-status-warning-bg px-3 py-2 text-[11px] text-bd-status-warning-text">
                        {syntheticMergeCount} merge proposal{syntheticMergeCount === 1 ? '' : 's'} contain imported fallback items (non-UUID IDs) and will be skipped. Backfill these items to the catalog before merging.
                      </div>
                    )}

                    <div className="mt-3 space-y-3">
                      {asArray(applyableMerges as any[]).map((merge) => (
                        <article key={`${merge.winner?.item_id}-${merge.canonical_name}`} className="rounded-md bg-bd-surface-muted p-3">
                          <h3 className="text-[13px] font-bold text-bd-text">{merge.canonical_name}</h3>
                          <p className="mt-1 text-[11px] text-bd-text-muted">
                            Winner: {merge.winner?.name} • Merge: {asArray(merge.merged_items).map((item: any) => item.name).join(', ')}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                {renameSuggestions.length ? (
                  <div className="rounded-md border border-bd-border bg-bd-surface p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Rename suggestions</div>
                    <div className="mt-3 space-y-2">
                      {asArray(renameSuggestions).map((suggestion) => (
                        <div key={`${suggestion.item?.item_id}-${suggestion.suggested_name}`} className="rounded-md bg-bd-surface-muted p-3 text-[11px] text-bd-text">
                          {suggestion.item?.name} → {suggestion.suggested_name}
                          <span className="ml-2 font-bold text-bd-text-muted">Preview only</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {aliasSuggestions.length ? (
                  <div className="rounded-md border border-bd-border bg-bd-surface p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Alias suggestions</div>
                    <div className="mt-3 space-y-2">
                      {asArray(aliasSuggestions).map((suggestion) => (
                        <div key={`${suggestion.item?.item_id}-${asArray(suggestion.suggested_aliases).join('|')}`} className="rounded-md bg-bd-surface-muted p-3 text-[11px] text-bd-text">
                          {suggestion.item?.name}: {asArray(suggestion.suggested_aliases).join(', ')}
                          <span className="ml-2 font-bold text-bd-text-muted">Preview only</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {reviewRequiredItems.length ? (
                  <div className="rounded-md border border-bd-border bg-bd-surface p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Review required</div>
                    <p className="mt-2 text-[11px] text-bd-text-muted">{asArray(reviewRequiredItems).map((item) => item.name).join(', ')}</p>
                  </div>
                ) : null}

                {currentBatchState?.applyResults.length ? (
                  <div className="rounded-md border border-bd-border bg-bd-surface p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Apply results</div>
                    <div className="mt-2 space-y-1 text-[11px] text-bd-text">
                      {asArray(currentBatchState.applyResults).map((result) => (
                        <div key={`${result.group_id}-${result.status}`} className="rounded-md bg-bd-surface-muted px-3 py-2">
                          <div>
                            {result.canonical_name}: {result.status}
                          </div>
                          <div className="mt-1 text-bd-text-muted">
                            {result.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {applyError ? (
                  <div className="rounded-md border border-bd-status-danger-border bg-bd-status-danger-bg px-4 py-3 text-[11px] text-bd-status-danger-text">
                    {applyError}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-bd-border bg-bd-surface-muted px-4 py-3">
                  <div className="text-[11px] text-bd-text-muted">
                    Move on after reviewing this batch. Supported merge applies refresh the library data first.
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLockedSession(null)
                        setBatchStates({})
                        setCurrentBatchIndex(0)
                        setApplyError(null)
                      }}
                      className="rounded-md border border-bd-border bg-bd-surface px-3 py-2 text-[11px] font-semibold text-bd-text transition-colors hover:bg-bd-surface-muted"
                    >
                      Start new session
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentBatchIndex((value) => value + 1)}
                      disabled={!hasNextBatch || !canAdvance}
                      className="rounded-md border border-bd-border bg-bd-surface px-4 py-2.5 text-[11px] font-bold text-bd-text transition-colors hover:bg-bd-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {hasNextBatch ? 'Next batch' : 'Last batch'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
