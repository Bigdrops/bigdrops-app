import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Copy, Download, FileJson, LockKeyhole, Sparkles } from 'lucide-react'

import {
  buildCatalogCleanupBatchExportPayload,
  buildCatalogCleanupPrompt,
  createCatalogCleanupSession,
  validateCatalogCleanupBatchImport,
} from '../domain/itemCleanupExchange'
import type {
  CatalogCleanupBatchExportPayload,
  CatalogCleanupBatchStatus,
  CatalogCleanupImportPreview,
  CleanupApplyProposal,
  CleanupApplyResult,
  DuplicateCandidateGroup,
  ItemAlias,
  ItemCatalogItem,
} from '../types'

type ItemLibraryAdvancedCleanupPanelProps = {
  applyLoading: boolean
  items: ItemCatalogItem[]
  aliases: ItemAlias[]
  duplicateGroups: DuplicateCandidateGroup[]
  onApplyProposals: (
    exportPayload: CatalogCleanupBatchExportPayload,
    proposals: CleanupApplyProposal[],
  ) => Promise<CleanupApplyResult[]>
}

type BatchState = {
  status: CatalogCleanupBatchStatus
  importText: string
  applyResults: CleanupApplyResult[]
  preview: CatalogCleanupImportPreview | null
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
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#947d63]">{eyebrow}</div>
      <h2 className="mt-1 text-[18px] font-extrabold text-[#2f2419]">{title}</h2>
      <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-[#8b7863]">{description}</p>
    </div>
  )
}

function StatCard({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="rounded-[14px] border border-[#dbc8ae] bg-[#fff9f1] p-4 shadow-[0_16px_28px_rgba(95,72,46,0.06)]">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98836c]">{label}</div>
      <div className="mt-2 font-['JetBrains_Mono'] text-[18px] font-bold text-[#2f2419]">{value}</div>
      <p className="mt-1 text-[11px] text-[#8d7963]">{meta}</p>
    </div>
  )
}

function ValidationBanner({ errors }: { errors: string[] }) {
  if (!errors.length) return null

  return (
    <div className="rounded-[14px] border border-[#e4c3ba] bg-[#fff2ee] px-4 py-3">
      <div className="text-[12px] font-bold text-[#8f3f35]">Import result needs correction</div>
      <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-[#9a4a3f]">
        {errors.map((error) => (
          <li key={error}>• {error}</li>
        ))}
      </ul>
    </div>
  )
}

function getBatchSize(option: string, customValue: string) {
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
  const itemMap = new Map(exportPayload.items.map((item) => [item.item_id, item]))
  const winner = itemMap.get(winnerItemId)

  return {
    group_id: winner?.duplicate_group_id || winnerItemId,
    canonical_name: canonicalName,
    winner_item_id: winnerItemId,
    merged_item_ids: mergedItemIds,
    aliases_to_keep: [],
    aliases_to_retire: [],
  }
}

export function ItemLibraryAdvancedCleanupPanel({
  applyLoading,
  items,
  aliases,
  duplicateGroups,
  onApplyProposals,
}: ItemLibraryAdvancedCleanupPanelProps) {
  const [batchSizeOption, setBatchSizeOption] = useState<'25' | '50' | '100' | 'custom'>('50')
  const [customBatchSize, setCustomBatchSize] = useState('')
  const [lockedSession, setLockedSession] = useState<ReturnType<typeof createCatalogCleanupSession> | null>(null)
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0)
  const [batchStates, setBatchStates] = useState<Record<string, BatchState>>({})
  const [copyState, setCopyState] = useState<'idle' | 'json' | 'prompt'>('idle')
  const [applyError, setApplyError] = useState<string | null>(null)

  const resolvedBatchSize = getBatchSize(batchSizeOption, customBatchSize)
  const currentBatch = lockedSession?.batches[currentBatchIndex] || null
  const currentBatchState = currentBatch ? batchStates[currentBatch.batch_id] : null
  const currentExportPayload = useMemo(() => {
    if (!lockedSession || !currentBatch) return null
    return buildCatalogCleanupBatchExportPayload({
      session: lockedSession,
      batch: currentBatch,
      batchIndex: currentBatchIndex,
    })
  }, [currentBatch, currentBatchIndex, lockedSession])

  const importText = currentBatchState?.importText || ''
  const validation = useMemo(() => {
    if (!currentExportPayload) return null
    return validateCatalogCleanupBatchImport(importText, currentExportPayload)
  }, [currentExportPayload, importText])

  useEffect(() => {
    if (!currentBatch || !validation) return
    setBatchStates((previous) => ({
      ...previous,
      [currentBatch.batch_id]: {
        status: validation.preview
          ? previous[currentBatch.batch_id]?.status === 'applied'
            ? 'applied'
            : 'review_imported'
          : previous[currentBatch.batch_id]?.status || 'not_started',
        importText,
        applyResults: previous[currentBatch.batch_id]?.applyResults || [],
        preview: validation.preview,
      },
    }))
  }, [currentBatch, importText, validation])

  const exportJson = useMemo(
    () => (currentExportPayload ? JSON.stringify(currentExportPayload, null, 2) : ''),
    [currentExportPayload],
  )
  const aiPrompt = useMemo(() => buildCatalogCleanupPrompt(currentExportPayload), [currentExportPayload])
  const applyableMerges = validation?.preview?.merge_suggestions || []
  const renameSuggestions = validation?.preview?.rename_suggestions || []
  const aliasSuggestions = validation?.preview?.alias_suggestions || []
  const ignoredItems = validation?.preview?.ignored_items || []
  const reviewRequiredItems = validation?.preview?.review_required_items || []

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
      items,
      aliases,
      duplicateGroups,
      batchSize: resolvedBatchSize,
      sessionId: `catalog-cleanup-${Date.now()}`,
      generatedAt: new Date().toISOString(),
    })

    setLockedSession(nextSession)
    setCurrentBatchIndex(0)
    setBatchStates(
      Object.fromEntries(
        nextSession.batches.map((batch) => [
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
      const results = await onApplyProposals(
        currentExportPayload,
        applyableMerges.map((merge) =>
          createMergeProposal(
            currentExportPayload,
            merge.winner.item_id,
            merge.merged_items.map((item) => item.item_id),
            merge.canonical_name,
          ),
        ),
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

  if (!lockedSession) {
    return (
      <div className="h-full overflow-y-auto bg-[linear-gradient(180deg,_#efe5d7_0%,_#e8dccb_100%)]">
        <div className="mx-auto max-w-4xl space-y-6 p-6">
          <section className="rounded-[18px] border border-[#d6c2a8] bg-[linear-gradient(180deg,_#fff9f1_0%,_#f7ecde_100%)] p-6 shadow-[0_20px_36px_rgba(93,68,42,0.10)]">
            <SectionTitle
              eyebrow="Clean & Standardize Catalog"
              title="Lock a full-catalog cleanup session"
              description="Choose how many active items you want to review at once. Once locked, the session keeps deterministic numeric batches and you work through one batch at a time."
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {['25', '50', '100', 'custom'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBatchSizeOption(option as '25' | '50' | '100' | 'custom')}
                  className={[
                    'rounded-[16px] border p-4 text-left transition-all',
                    batchSizeOption === option
                      ? 'border-[#8c6a45] bg-[#fff7ec] shadow-[0_12px_24px_rgba(88,67,41,0.08)]'
                      : 'border-[#d6c2a8] bg-[#fffaf5] hover:border-[#b89267]',
                  ].join(' ')}
                >
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a7c5e]">
                    {option === 'custom' ? 'Custom' : 'Batch size'}
                  </div>
                  <div className="mt-2 text-[18px] font-extrabold text-[#2f2419]">
                    {option === 'custom' ? 'Set your own' : option}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#8d7963]">
                    {option === 'custom'
                      ? 'Use a specific number for this cleanup session.'
                      : `Review about ${option} items per numeric batch.`}
                  </p>
                </button>
              ))}
            </div>

            {batchSizeOption === 'custom' ? (
              <div className="mt-4">
                <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a7c5e]">
                  Custom batch size
                </label>
                <input
                  value={customBatchSize}
                  onChange={(event) => setCustomBatchSize(event.target.value)}
                  inputMode="numeric"
                  placeholder="Enter batch size"
                  className="mt-2 w-full rounded-[12px] border border-[#d4c2ad] bg-[#fbf5ec] px-4 py-3 text-[13px] text-[#2c2218] outline-none focus:border-[#a07a52]"
                />
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#decdb7] bg-[#fffaf1] px-4 py-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Session preview</div>
                <div className="mt-1 text-[12px] text-[#6f5b46]">
                  {items.length.toLocaleString()} active items will be arranged into numeric batches without splitting duplicate groups.
                </div>
              </div>
              <button
                type="button"
                onClick={handleLockSession}
                disabled={!resolvedBatchSize}
                className="inline-flex items-center gap-2 rounded-[12px] border border-[#c6a175] bg-[#e7d2b4] px-4 py-2.5 text-[12px] font-bold text-[#523b25] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LockKeyhole className="h-4 w-4" />
                Lock cleanup session
              </button>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (!currentBatch || !currentExportPayload || !validation) {
    return null
  }

  const currentStatus = currentBatchState?.status || 'not_started'
  const canAdvance = currentStatus === 'review_imported' || currentStatus === 'applied'
  const hasNextBatch = currentBatchIndex < lockedSession.batch_count - 1

  return (
    <div className="h-full overflow-y-auto bg-[linear-gradient(180deg,_#efe5d7_0%,_#e8dccb_100%)]">
      <div className="space-y-4 p-5 pb-20">
        <section className="rounded-[18px] border border-[#d6c2a8] bg-[linear-gradient(180deg,_#fff9f1_0%,_#f7ecde_100%)] p-5 shadow-[0_20px_36px_rgba(93,68,42,0.10)]">
          <SectionTitle
            eyebrow="Locked Session"
            title={`Batch ${currentBatchIndex + 1} of ${lockedSession.batch_count}`}
            description="This session is locked to a fixed batch size. Export only the current batch, review the AI output, and apply supported merge decisions before moving forward."
          />

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <StatCard label="Batch Size" value={lockedSession.batch_size.toLocaleString()} meta="Locked for this session." />
            <StatCard label="Current Batch" value={currentBatch.item_count.toLocaleString()} meta={currentBatch.batch_id} />
            <StatCard label="Status" value={currentStatus.replace('_', ' ')} meta="Tracked in component state." />
            <StatCard
              label="Progress"
              value={`${currentBatchIndex + 1}/${lockedSession.batch_count}`}
              meta="One numeric batch at a time."
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {lockedSession.batches.map((batch, index) => {
              const status = batchStates[batch.batch_id]?.status || 'not_started'
              return (
                <span
                  key={batch.batch_id}
                  className={[
                    'rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em]',
                    index === currentBatchIndex
                      ? 'border-[#8c6a45] bg-[#f5e7d3] text-[#6e4f2d]'
                      : 'border-[#d7c3aa] bg-[#fffaf5] text-[#947d63]',
                  ].join(' ')}
                >
                  {batch.title}: {status.replace('_', ' ')}
                </span>
              )
            })}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[16px] border border-[#d8c5ad] bg-[#fff8ef] p-4 shadow-[0_16px_28px_rgba(95,72,46,0.08)]">
            <SectionTitle
              eyebrow="1. Export"
              title="Release only this batch"
              description="The export contains the current batch only, with session and batch identifiers for strict import validation."
            />

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="flex w-full items-center justify-between rounded-[10px] border border-[#c6a175] bg-[#e7d2b4] px-4 py-2.5 text-[12px] font-bold text-[#523b25]"
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
                className="flex w-full items-center justify-between rounded-[10px] border border-[#d5c2aa] bg-[#fbf4ea] px-4 py-2.5 text-[12px] font-semibold text-[#6d543a]"
              >
                <div className="flex items-center gap-2">
                  {copyState === 'prompt' ? <ClipboardCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copyState === 'prompt' ? 'AI prompt copied' : 'Copy AI prompt'}
                </div>
                <Sparkles className="h-4 w-4 opacity-40" />
              </button>
              <button
                type="button"
                onClick={() => void handleCopy(exportJson, 'json')}
                className="flex w-full items-center justify-between rounded-[10px] border border-[#d5c2aa] bg-[#fbf4ea] px-4 py-2.5 text-[12px] font-semibold text-[#6d543a]"
              >
                <div className="flex items-center gap-2">
                  {copyState === 'json' ? <ClipboardCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copyState === 'json' ? 'Batch JSON copied' : 'Copy batch JSON'}
                </div>
                <FileJson className="h-4 w-4 opacity-40" />
              </button>
            </div>
          </section>

          <section className="rounded-[16px] border border-[#d8c5ad] bg-[#fff8ef] p-4 shadow-[0_16px_28px_rgba(95,72,46,0.08)]">
            <SectionTitle
              eyebrow="2. Import Review"
              title="Paste AI result"
              description="The result is validated against the locked current batch. Wrong session ids, batch ids, or out-of-batch item ids are rejected."
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
              className="mt-4 min-h-[150px] w-full rounded-[14px] border border-[#d4c2ad] bg-[#fbf5ec] px-4 py-3 font-['JetBrains_Mono'] text-[11px] text-[#2c2218] outline-none placeholder:text-[#ad9984] focus:border-[#a07a52]"
            />
          </section>
        </div>

        <section className="rounded-[16px] border border-[#d8c5ad] bg-[#fff8ef] p-4 shadow-[0_16px_28px_rgba(95,72,46,0.08)]">
          <SectionTitle
            eyebrow="3. Preview Decisions"
            title="Review what is safe to apply now"
            description="Merge suggestions still go through the existing safe merge engine. Rename and alias suggestions remain preview-only."
          />

          <div className="mt-4 space-y-4">
            <ValidationBanner errors={validation.errors} />

            {!importText.trim() ? (
              <div className="rounded-[14px] border border-dashed border-[#d9c8b2] bg-[#fcf7ef] px-4 py-8 text-center">
                <div className="text-[13px] font-semibold text-[#715d49]">No AI result pasted yet</div>
                <p className="mt-1 text-[11px] text-[#9a8873]">Paste the AI output to preview decisions for this batch.</p>
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
                  <div className="rounded-[14px] border border-[#d7c3aa] bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Applyable merges</div>
                        <div className="mt-1 text-[13px] font-black text-[#2c2218]">
                          {applyableMerges.length} merge suggestion{applyableMerges.length === 1 ? '' : 's'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleApplySupportedDecisions()}
                        disabled={applyLoading}
                        className="rounded-[10px] border border-[#c6a175] bg-[#e7d2b4] px-4 py-2 text-[11px] font-bold text-[#523b25] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {applyLoading ? 'Applying...' : 'Apply supported merges'}
                      </button>
                    </div>

                    <div className="mt-3 space-y-3">
                      {applyableMerges.map((merge) => (
                        <article key={`${merge.winner.item_id}-${merge.canonical_name}`} className="rounded-[12px] bg-[#f9f2e7] p-3">
                          <h3 className="text-[13px] font-bold text-[#2c2218]">{merge.canonical_name}</h3>
                          <p className="mt-1 text-[11px] text-[#6f5b46]">
                            Winner: {merge.winner.name} • Merge: {merge.merged_items.map((item) => item.name).join(', ')}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                {renameSuggestions.length ? (
                  <div className="rounded-[14px] border border-[#d7c3aa] bg-white p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Rename suggestions</div>
                    <div className="mt-3 space-y-2">
                      {renameSuggestions.map((suggestion) => (
                        <div key={`${suggestion.item.item_id}-${suggestion.suggested_name}`} className="rounded-[12px] bg-[#f9f2e7] p-3 text-[11px] text-[#2c2218]">
                          {suggestion.item.name} → {suggestion.suggested_name}
                          <span className="ml-2 font-bold text-[#9a7c5e]">Preview only</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {aliasSuggestions.length ? (
                  <div className="rounded-[14px] border border-[#d7c3aa] bg-white p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Alias suggestions</div>
                    <div className="mt-3 space-y-2">
                      {aliasSuggestions.map((suggestion) => (
                        <div key={`${suggestion.item.item_id}-${suggestion.suggested_aliases.join('|')}`} className="rounded-[12px] bg-[#f9f2e7] p-3 text-[11px] text-[#2c2218]">
                          {suggestion.item.name}: {suggestion.suggested_aliases.join(', ')}
                          <span className="ml-2 font-bold text-[#9a7c5e]">Preview only</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {ignoredItems.length ? (
                  <div className="rounded-[14px] border border-[#d7c3aa] bg-white p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Ignored / no action</div>
                    <p className="mt-2 text-[11px] text-[#6f5b46]">{ignoredItems.map((item) => item.name).join(', ')}</p>
                  </div>
                ) : null}

                {reviewRequiredItems.length ? (
                  <div className="rounded-[14px] border border-[#d7c3aa] bg-white p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Review required</div>
                    <p className="mt-2 text-[11px] text-[#6f5b46]">{reviewRequiredItems.map((item) => item.name).join(', ')}</p>
                  </div>
                ) : null}

                {currentBatchState?.applyResults.length ? (
                  <div className="rounded-[14px] border border-[#d7c3aa] bg-white p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Apply results</div>
                    <div className="mt-2 space-y-1 text-[11px] text-[#2c2218]">
                      {currentBatchState.applyResults.map((result) => (
                        <div key={`${result.group_id}-${result.status}`}>
                          {result.canonical_name}: {result.status}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {applyError ? (
                  <div className="rounded-[14px] border border-[#e4c3ba] bg-[#fff2ee] px-4 py-3 text-[11px] text-[#9a4a3f]">
                    {applyError}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#dac8b1] bg-[#fcf7ef] px-4 py-3">
                  <div className="text-[11px] text-[#6f5b46]">
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
                      className="rounded-[10px] border border-[#d5c2aa] bg-[#fbf4ea] px-3 py-2 text-[11px] font-semibold text-[#6d543a]"
                    >
                      Start new session
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentBatchIndex((value) => value + 1)}
                      disabled={!hasNextBatch || !canAdvance}
                      className="rounded-[10px] border border-[#c6a175] bg-[#e7d2b4] px-4 py-2 text-[11px] font-bold text-[#523b25] disabled:cursor-not-allowed disabled:opacity-60"
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
