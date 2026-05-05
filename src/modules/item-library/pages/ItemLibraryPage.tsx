import { useEffect, useMemo, useState } from 'react'

import Layout from '@/components/Layout'
import { feedback } from '@/lib/feedback'
import { ItemLibraryAdvancedCleanupPanel } from '../components/ItemLibraryAdvancedCleanupPanel'
import { ItemLibraryDetailPanel } from '../components/ItemLibraryDetailPanel'
import { ItemLibraryDuplicateReviewPanel } from '../components/ItemLibraryDuplicateReviewPanel'
import { ItemLibraryListPanel } from '../components/ItemLibraryListPanel'
import { ItemLibraryMergeHistoryPanel } from '../components/ItemLibraryMergeHistoryPanel'
import { ItemLibraryStatusStrip } from '../components/ItemLibraryStatusStrip'
import { detectDuplicateGroups } from '../domain/duplicateDetection'
import { getCleanupExportItemIds } from '../domain/cleanupExportPayload'
import { buildFlaggedCleanupExportPayload } from '../domain/itemCleanupExchange'
import {
  useItemAliases,
  useItemHistoryDetail,
  useItemHistoryList,
  useItemMerge,
  useItemMergeHistory,
} from '../hooks'
import type {
  CatalogCleanupBatchExportPayload,
  CleanupApplyProposal,
  CleanupApplyResult,
  FlaggedCleanupBatchExportPayload,
  ItemLibraryMergeRequest,
} from '../types'
import type { ItemLibraryFilterType, ItemLibraryViewMode } from '../types'

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function BackArrow() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

export default function ItemLibraryPage() {
  const [searchText, setSearchText] = useState('')
  const [workflowMode, setWorkflowMode] = useState<'library' | 'cleanup'>('library')
  const [viewMode, setViewMode] = useState<ItemLibraryViewMode>('catalog')
  const [activeFilter, setActiveFilter] = useState<ItemLibraryFilterType>('all')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedDuplicateGroupId, setSelectedDuplicateGroupId] = useState<string | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [pendingHistoryRefreshItemId, setPendingHistoryRefreshItemId] = useState<string | null>(null)
  const {
    data: summaryItems,
    loading: summaryLoading,
    error: summaryError,
    setData: setSummaryItems,
    reload: reloadSummaryItems,
  } = useItemHistoryList(200, { includeHeavyFallbacks: workflowMode === 'cleanup' })

  const {
    data: mergeHistory,
    count: mergeHistoryCount,
    loading: mergeHistoryLoading,
    reload: reloadMergeHistory,
  } = useItemMergeHistory({ enabled: workflowMode === 'cleanup' })

  const allDuplicateGroups = useMemo(() => detectDuplicateGroups(summaryItems), [summaryItems])
  const allDuplicateItemIdsSet = useMemo(
    () => new Set(allDuplicateGroups.flatMap((group) => group.members.map((member) => member.item_id))),
    [allDuplicateGroups],
  )

  const totalUnresolvedIssues = allDuplicateGroups.length

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()

    return summaryItems.filter((item) => {
      const matchesSearch = normalizedSearch ? item.name.toLowerCase().includes(normalizedSearch) : true
      let matchesFilter = true
      if (activeFilter === 'invoice') {
        matchesFilter = item.appears_in_invoice === true
      } else if (activeFilter === 'quotation') {
        matchesFilter = item.appears_in_quotation === true
      } else if (activeFilter === 'needs_cleanup') {
        matchesFilter = allDuplicateItemIdsSet.has(item.item_id)
      }
      return matchesSearch && matchesFilter
    })
  }, [activeFilter, searchText, summaryItems, allDuplicateItemIdsSet])

  const duplicateGroups = useMemo(() => detectDuplicateGroups(filteredItems), [filteredItems])
  const cleanupDuplicateGroups = workflowMode === 'cleanup' ? allDuplicateGroups : duplicateGroups

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedItemId(null)
      setMobileDetailOpen(false)
      return
    }

    setSelectedItemId((current) => {
      if (!current) return filteredItems[0].item_id
      return filteredItems.some((item) => item.item_id === current) ? current : filteredItems[0].item_id
    })
  }, [filteredItems])

  useEffect(() => {
    if (workflowMode !== 'cleanup') return
    if (viewMode !== 'duplicates' && viewMode !== 'advanced_cleanup') return
    if (!cleanupDuplicateGroups.length) {
      setSelectedDuplicateGroupId(null)
      return
    }

    setSelectedDuplicateGroupId((current) => {
      if (current && cleanupDuplicateGroups.some((group) => group.group_id === current)) return current
      return cleanupDuplicateGroups[0].group_id
    })
  }, [cleanupDuplicateGroups, viewMode, workflowMode])

  useEffect(() => {
    if (workflowMode !== 'cleanup') return
    if ((viewMode !== 'duplicates' && viewMode !== 'advanced_cleanup') || !selectedDuplicateGroupId) return

    const activeGroup = cleanupDuplicateGroups.find((group) => group.group_id === selectedDuplicateGroupId)
    if (!activeGroup || !activeGroup.members.length) return

    setSelectedItemId((current) => {
      if (current && activeGroup.members.some((member) => member.item_id === current)) return current
      return activeGroup.members[0].item_id
    })
  }, [cleanupDuplicateGroups, selectedDuplicateGroupId, viewMode, workflowMode])

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.item_id === selectedItemId) || null,
    [filteredItems, selectedItemId],
  )

  const selectedDuplicateGroup = useMemo(
    () => cleanupDuplicateGroups.find((group) => group.group_id === selectedDuplicateGroupId) || null,
    [cleanupDuplicateGroups, selectedDuplicateGroupId],
  )
  const duplicateItemIdsArray = useMemo(
    () => cleanupDuplicateGroups.flatMap((group) => group.members.map((member) => member.item_id)),
    [cleanupDuplicateGroups],
  )
  const {
    data: duplicateAliases,
    loading: aliasesLoading,
    error: aliasesError,
  } = useItemAliases(duplicateItemIdsArray, { enabled: workflowMode === 'cleanup' })
  const selectedGroupAliases = useMemo(
    () =>
      selectedDuplicateGroup
        ? duplicateAliases.filter((alias) =>
            selectedDuplicateGroup.members.some((member) => member.item_id === alias.item_id),
          )
        : [],
    [duplicateAliases, selectedDuplicateGroup],
  )
  const flaggedCleanupExport = useMemo(
    () => buildFlaggedCleanupExportPayload({ duplicateGroups: allDuplicateGroups, aliases: duplicateAliases }),
    [allDuplicateGroups, duplicateAliases],
  )
  const summaryItemIds = useMemo(() => summaryItems.map((item) => item.item_id), [summaryItems])
  const { data: allItemAliases } = useItemAliases(summaryItemIds, { enabled: workflowMode === 'cleanup' && viewMode === 'advanced_cleanup' })
  const { mergeItems, loading: mergeLoading } = useItemMerge()

  const {
    data: historyRows,
    loading: historyLoading,
    error: historyError,
    reload: reloadHistoryRows,
  } = useItemHistoryDetail(selectedItem?.item_id, 50, { 
    enabled: !!selectedItem && (workflowMode === 'cleanup' || mobileDetailOpen || (workflowMode === 'library' && !!selectedItemId)),
    includeHeavyFallbacks: workflowMode === 'cleanup'
  })

  useEffect(() => {
    if (!pendingHistoryRefreshItemId || selectedItemId !== pendingHistoryRefreshItemId) return
    reloadHistoryRows()
    setPendingHistoryRefreshItemId(null)
  }, [pendingHistoryRefreshItemId, reloadHistoryRows, selectedItemId])

  const handleMerge = async (request: ItemLibraryMergeRequest) => {
    const result = await mergeItems(request)
    const relinkedTotal = result.relinked_invoice_rows + result.relinked_quotation_rows

    setWorkflowMode('library')
    setViewMode('catalog')
    setSelectedDuplicateGroupId(null)
    setSelectedItemId(result.winner_item_id)
    setPendingHistoryRefreshItemId(result.winner_item_id)
    if (window.innerWidth < 768) setMobileDetailOpen(true)
    
    // Optimistic Patch
    const nextItems = summaryItems.filter(item => !result.retired_item_ids.includes(item.item_id))
    setSummaryItems(nextItems)
    const { writeListCache } = await import('@/lib/cache/listCache')
    writeListCache("bd:item-library:summary:v1", nextItems)

    reloadMergeHistory()

    feedback.success('Merge complete', {
      description: `${result.merged_item_ids.length} duplicate item${result.merged_item_ids.length === 1 ? '' : 's'} merged into the selected primary item. ${relinkedTotal.toLocaleString()} linked ${relinkedTotal === 1 ? 'row was' : 'rows were'} updated.`,
    })
  }

  const handleApplyCleanupProposals = async (
    exportPayload: CatalogCleanupBatchExportPayload | FlaggedCleanupBatchExportPayload,
    proposals: CleanupApplyProposal[],
  ): Promise<CleanupApplyResult[]> => {
    const results: CleanupApplyResult[] = []
    const validItemIds = getCleanupExportItemIds(exportPayload)

    for (const proposal of proposals) {
      const winnerInBatch = validItemIds.has(proposal.winner_item_id)
      const mergedIdsInBatch = proposal.merged_item_ids.every((itemId) => validItemIds.has(itemId))
      if (!winnerInBatch || !mergedIdsInBatch) {
        results.push({
          group_id: proposal.group_id,
          canonical_name: proposal.canonical_name,
          status: 'stale',
          message: 'This merge proposal no longer matches the locked current batch.',
        })
        continue
      }

      try {
        const mergeResult = await mergeItems({
          winnerItemId: proposal.winner_item_id,
          mergedItemIds: proposal.merged_item_ids,
        })

        results.push({
          group_id: proposal.group_id,
          canonical_name: proposal.canonical_name,
          status: 'applied',
          message: `${mergeResult.merged_item_ids.length} item${mergeResult.merged_item_ids.length === 1 ? '' : 's'} merged into the selected primary item.`,
        })
      } catch (error) {
        results.push({
          group_id: proposal.group_id,
          canonical_name: proposal.canonical_name,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Could not apply this cleanup proposal.',
        })
      }
    }

    const appliedItemIds = new Set(results.filter(r => r.status === 'applied').flatMap(r => {
      const proposal = proposals.find(p => p.group_id === r.group_id)
      return proposal ? proposal.merged_item_ids : []
    }))

    if (appliedItemIds.size > 0) {
      const nextItems = summaryItems.filter(item => !appliedItemIds.has(item.item_id))
      setSummaryItems(nextItems)
      const { writeListCache } = await import('@/lib/cache/listCache')
      writeListCache("bd:item-library:summary:v1", nextItems)
    }

    reloadMergeHistory()
    reloadHistoryRows()

    const appliedCount = results.filter((result) => result.status === 'applied').length
    const staleCount = results.filter((result) => result.status === 'stale').length
    const failedCount = results.filter((result) => result.status === 'failed').length

    feedback.info('Cleanup apply finished', {
      description: `${appliedCount} applied, ${staleCount} stale, ${failedCount} failed.`,
    })

    return results
  }

  const handleNeedsCleanupDeepLink = (itemId: string) => {
    const group = allDuplicateGroups.find(g => g.members.some(m => m.item_id === itemId))
    
    if (group) {
      setWorkflowMode('cleanup')
      setViewMode('duplicates')
      setSelectedDuplicateGroupId(group.group_id)
      setSelectedItemId(itemId)
      if (window.innerWidth < 768) setMobileDetailOpen(true)
    } else {
      setWorkflowMode('cleanup')
      setViewMode('duplicates')
      feedback.warning('Cleanup group not found', {
        description: 'The item might have already been resolved or the group is no longer valid.',
      })
    }
  }

  const totalCount = filteredItems.length
  const showCleanupLauncher = workflowMode === 'cleanup' && viewMode === 'catalog'
  const showCleanupSideList = workflowMode === 'cleanup' && viewMode === 'duplicates'
  const showLeftPanel = workflowMode === 'library' || showCleanupSideList

  useEffect(() => {
    if (viewMode === 'merge_history' && mergeHistoryCount === 0) {
      setViewMode('catalog')
    }
  }, [mergeHistoryCount, viewMode])

  return (
    <Layout
      title="Item Library"
      session={null}
      hidePageHeader
      contentClassName="mx-auto w-full max-w-6xl px-0 py-0 md:px-6 md:py-6"
    >
      <div className="overflow-hidden bg-[hsl(var(--bd-app-bg))] md:rounded-[var(--bd-radius-xl)] md:border md:border-[hsl(var(--bd-border))] md:shadow-lg">
        <header className="flex h-[54px] items-center gap-4 border-b border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))]/95 px-5 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Go back"
            className="hidden items-center gap-[6px] rounded-[var(--bd-radius-sm)] border-none bg-transparent px-[10px] py-[6px] text-[13px] font-semibold text-[hsl(var(--bd-text-muted))] transition-all duration-150 hover:bg-[hsl(var(--bd-surface-muted))] hover:text-[hsl(var(--bd-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--bd-button-primary-bg))] md:flex"
          >
            <BackArrow />
          </button>

          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-1 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))]/50 p-[3px] shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setWorkflowMode('library')
                  setViewMode('catalog')
                }}
                className={[
                  "rounded-[9px] px-4 py-1.5 text-[12px] font-bold transition-all duration-200",
                  workflowMode === 'library'
                    ? "bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] shadow-sm"
                    : "text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
                ].join(' ')}
              >
                Library
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkflowMode('cleanup')
                  setViewMode('catalog')
                }}
                className={[
                  "relative rounded-[var(--bd-radius-md)] px-4 py-1.5 text-[12px] font-bold transition-all duration-200",
                  workflowMode === 'cleanup'
                    ? "bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] shadow-sm"
                    : "text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
                ].join(' ')}
              >
                Cleanup Hub
                {totalUnresolvedIssues > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[hsl(var(--bd-status-warning-bg))] px-1 text-[9px] font-bold text-[hsl(var(--bd-status-warning-text))] ring-2 ring-[hsl(var(--bd-card-bg))]">
                    {totalUnresolvedIssues}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="w-[44px] hidden md:block" />
        </header>

        {workflowMode === 'cleanup' && viewMode === 'catalog' && (
          <ItemLibraryStatusStrip
            totalItems={summaryItems.length}
            duplicateGroups={allDuplicateGroups}
            flaggedCleanupExport={flaggedCleanupExport}
            mergeHistoryCount={mergeHistoryCount}
            loading={summaryLoading}
          />
        )}

        {summaryError ? (
          <div className="border-b border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] px-5 py-3 text-[12px] text-[hsl(var(--bd-status-danger-text))]">
            {summaryError.message || 'Failed to load item library.'}
          </div>
        ) : null}

        <main className="flex min-h-[calc(100dvh-14rem)] overflow-hidden">
          {showLeftPanel ? (
            <div className={mobileDetailOpen ? 'hidden md:flex md:w-[38%] md:flex-shrink-0 md:flex-col md:overflow-hidden' : 'flex w-full flex-col overflow-hidden md:w-[38%] md:flex-shrink-0'}>
              <ItemLibraryListPanel
                items={filteredItems}
                duplicateGroups={cleanupDuplicateGroups}
                workflowMode={workflowMode}
                viewMode={viewMode}
                selectedItemId={selectedItemId}
                selectedDuplicateGroupId={selectedDuplicateGroupId}
                loading={summaryLoading}
                searchText={searchText}
                activeFilter={activeFilter}
                onViewModeChange={setViewMode}
                onSearchTextChange={setSearchText}
                onFilterChange={setActiveFilter}
                onSelectItem={(itemId) => {
                  setSelectedItemId(itemId)
                  if (window.innerWidth < 768) setMobileDetailOpen(true)
                }}
                onSelectDuplicateGroup={(groupId) => {
                  const nextGroup = cleanupDuplicateGroups.find((group) => group.group_id === groupId)
                  setSelectedDuplicateGroupId(groupId)
                  if (nextGroup?.members[0]) {
                    setSelectedItemId(nextGroup.members[0].item_id)
                  }
                  if (window.innerWidth < 768) setMobileDetailOpen(true)
                }}
                onInspectDuplicateItem={(groupId, itemId) => {
                  setSelectedDuplicateGroupId(groupId)
                  setSelectedItemId(itemId)
                  if (window.innerWidth < 768) setMobileDetailOpen(true)
                }}
                onNeedsCleanup={handleNeedsCleanupDeepLink}
                flaggedItemIds={allDuplicateItemIdsSet}
                totalUnresolvedIssues={totalUnresolvedIssues}
              />
            </div>
          ) : null}

          <div className={showLeftPanel ? (mobileDetailOpen ? 'flex w-full flex-col overflow-hidden md:flex-1' : 'hidden md:flex md:flex-1 md:flex-col md:overflow-hidden') : 'flex w-full flex-col overflow-hidden'}>
            <div className="flex-shrink-0 border-b border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] md:hidden">
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="flex items-center gap-[6px] border-none bg-transparent px-4 py-3 text-[13px] font-semibold text-[hsl(var(--bd-text-muted))] transition-colors hover:text-[hsl(var(--bd-text))]"
              >
                <BackArrow />
                {workflowMode === 'library' ? 'Library' : 'Cleanup'}
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {workflowMode === 'cleanup' && viewMode !== 'catalog' ? (
                <div className="flex items-center justify-between border-b border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))]/80 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setViewMode('catalog')}
                    className="text-[12px] font-bold text-[hsl(var(--bd-button-primary-bg))] transition-colors hover:opacity-80"
                  >
                    Back to Cleanup Hub
                  </button>
                  <div className="text-[11px] font-semibold text-[hsl(var(--bd-text-muted))]">
                    {viewMode === 'duplicates'
                      ? 'Fix Duplicate Items (Manual)'
                      : viewMode === 'duplicates_outsourced'
                        ? 'Fix Duplicate Items (AI Outsource)'
                        : viewMode === 'duplicates_choice'
                        ? 'Choose Review Method'
                        : viewMode === 'advanced_cleanup'
                          ? 'Clean & Standardize Catalog'
                          : 'Review Past Changes'}
                  </div>
                </div>
              ) : null}

              {workflowMode === 'cleanup' && viewMode === 'duplicates_choice' ? (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-[hsl(var(--bd-surface-muted))]">
                   <div className="max-w-2xl space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--bd-text))]">How do you want to handle duplicates?</h2>
                        <p className="text-[hsl(var(--bd-text-muted))] text-[13px] leading-relaxed">Choose a review method for the {totalUnresolvedIssues} duplicate groups detected in your catalog.</p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <button 
                          onClick={() => setViewMode('duplicates')}
                          className="flex flex-col items-center gap-2 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-6 text-center transition-all hover:border-[hsl(var(--bd-button-primary-bg))] hover:shadow-md group"
                        >
                          <div className="text-sm font-bold text-[hsl(var(--bd-text))]">Review Manually in App</div>
                          <div className="text-[11px] text-[hsl(var(--bd-text-muted))]">Side-by-side comparison with full price and history audit.</div>
                        </button>

                        <button 
                          onClick={() => setViewMode('duplicates_outsourced')}
                          className="flex flex-col items-center gap-2 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-6 text-center transition-all hover:border-[hsl(var(--bd-button-primary-bg))] hover:shadow-md group"
                        >
                          <div className="text-sm font-bold text-[hsl(var(--bd-text))]">Use AI for Duplicate Review</div>
                          <div className="text-[11px] text-[hsl(var(--bd-text-muted))]">Export all groups for AI review. Faster for large lists.</div>
                        </button>
                      </div>

                      <button 
                        onClick={() => setViewMode('catalog')}
                        className="text-[12px] font-bold text-[hsl(var(--bd-button-primary-bg))] hover:underline"
                      >
                        Cancel and return to Hub
                      </button>
                   </div>
                </div>
              ) : workflowMode === 'cleanup' && (viewMode === 'duplicates' || viewMode === 'duplicates_outsourced') ? (
                viewMode === 'duplicates' ? (
                  <ItemLibraryDuplicateReviewPanel
                    aliases={selectedGroupAliases}
                    aliasesError={aliasesError}
                    aliasesLoading={aliasesLoading}
                    group={selectedDuplicateGroup}
                    item={selectedItem}
                    historyRows={historyRows}
                    loading={historyLoading}
                    error={historyError}
                    mergeLoading={mergeLoading}
                    onInspectItem={(itemId) => setSelectedItemId(itemId)}
                    onMerge={handleMerge}
                  />
                ) : (
                  <ItemLibraryAdvancedCleanupPanel
                    workflow="duplicates"
                    applyLoading={mergeLoading}
                    items={summaryItems}
                    aliases={allItemAliases}
                    duplicateGroups={allDuplicateGroups}
                    onApplyProposals={handleApplyCleanupProposals}
                  />
                )
              ) : workflowMode === 'cleanup' && viewMode === 'advanced_cleanup' ? (
                <ItemLibraryAdvancedCleanupPanel
                  workflow="full_catalog"
                  applyLoading={mergeLoading}
                  items={summaryItems}
                  aliases={allItemAliases}
                  duplicateGroups={allDuplicateGroups}
                  onApplyProposals={handleApplyCleanupProposals}
                />
              ) : workflowMode === 'cleanup' && viewMode === 'merge_history' ? (
                <ItemLibraryMergeHistoryPanel
                  data={mergeHistory}
                  loading={mergeHistoryLoading}
                  error={null}
                />
              ) : showCleanupLauncher ? (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-[hsl(var(--bd-surface-muted))]">
                   <div className="max-w-3xl space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--bd-text))]">Cleanup Hub</h2>
                        <p className="text-[hsl(var(--bd-text-muted))] text-[13px] leading-relaxed">Choose the cleanup job you want to run. No lists are opened until you choose a workflow.</p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <button 
                          onClick={() => setViewMode('duplicates_choice')}
                          className="flex flex-col items-start gap-1 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-5 text-left transition-all hover:border-[hsl(var(--bd-button-primary-bg))] hover:shadow-md group"
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="text-sm font-bold text-[hsl(var(--bd-text))]">Fix Duplicate Items</span>
                            <span className="rounded-full bg-[hsl(var(--bd-surface-muted))] px-2.5 py-0.5 text-[10px] font-bold text-[hsl(var(--bd-text-muted))] group-hover:bg-[hsl(var(--bd-button-primary-bg))] group-hover:text-[hsl(var(--bd-button-primary-text))] transition-colors">{totalUnresolvedIssues} groups</span>
                          </div>
                          <span className="text-[11px] text-[hsl(var(--bd-text-muted))]">Review detected duplicate groups, inspect history, and merge manually or via AI outsource.</span>
                        </button>

                        <button 
                          onClick={() => setViewMode('advanced_cleanup')}
                          className="flex flex-col items-start gap-1 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-5 text-left transition-all hover:border-[hsl(var(--bd-button-primary-bg))] hover:shadow-md group"
                        >
                          <span className="text-sm font-bold text-[hsl(var(--bd-text))]">Clean &amp; Standardize Catalog</span>
                          <span className="text-[11px] text-[hsl(var(--bd-text-muted))]">Run a locked full-catalog cleanup session with numeric batches, AI review, and safe merge apply support.</span>
                        </button>

                        {mergeHistoryCount > 0 ? (
                          <button 
                            onClick={() => setViewMode('merge_history')}
                            className="flex flex-col items-start gap-1 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-5 text-left transition-all hover:border-[hsl(var(--bd-button-primary-bg))] hover:shadow-md group"
                          >
                            <span className="text-sm font-bold text-[hsl(var(--bd-text))]">Review Past Changes</span>
                            <span className="text-[11px] text-[hsl(var(--bd-text-muted))]">Open merge history and audit the catalog cleanup trail.</span>
                          </button>
                        ) : null}
                      </div>
                   </div>
                </div>
              ) : (
                <ItemLibraryDetailPanel
                  item={selectedItem}
                  historyRows={historyRows}
                  loading={historyLoading}
                  error={historyError}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  )
}
