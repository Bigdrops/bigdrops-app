import { useEffect, useMemo, useState } from 'react'

import Layout from '@/components/Layout'
import { toast } from '@/hooks/use-toast'
import { ItemLibraryAdvancedCleanupPanel } from '../components/ItemLibraryAdvancedCleanupPanel'
import { ItemLibraryDetailPanel } from '../components/ItemLibraryDetailPanel'
import { ItemLibraryDuplicateReviewPanel } from '../components/ItemLibraryDuplicateReviewPanel'
import { ItemLibraryListPanel } from '../components/ItemLibraryListPanel'
import { ItemLibraryMergeHistoryPanel } from '../components/ItemLibraryMergeHistoryPanel'
import { ItemLibraryStatusStrip } from '../components/ItemLibraryStatusStrip'
import { detectDuplicateGroups } from '../domain/duplicateDetection'
import { buildFlaggedCleanupExportPayload } from '../domain/itemCleanupExchange'
import {
  useItemAliases,
  useItemHistoryDetail,
  useItemHistoryList,
  useItemMerge,
  useItemMergeHistory,
} from '../hooks'
import type { CatalogCleanupBatchExportPayload, CleanupApplyProposal, CleanupApplyResult, ItemLibraryMergeRequest } from '../types'
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
    reload: reloadSummaryItems,
  } = useItemHistoryList(200)

  const {
    data: mergeHistory,
    count: mergeHistoryCount,
    loading: mergeHistoryLoading,
    reload: reloadMergeHistory,
  } = useItemMergeHistory()

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
  } = useItemAliases(duplicateItemIdsArray)
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
  const { data: allItemAliases } = useItemAliases(summaryItemIds)
  const { mergeItems, loading: mergeLoading } = useItemMerge()

  const {
    data: historyRows,
    loading: historyLoading,
    error: historyError,
    reload: reloadHistoryRows,
  } = useItemHistoryDetail(selectedItem?.item_id, 50)

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

    reloadSummaryItems()
    reloadMergeHistory()

    toast({
      title: 'Merge complete',
      description: `${result.merged_item_ids.length} duplicate item${result.merged_item_ids.length === 1 ? '' : 's'} merged into the selected primary item. ${relinkedTotal.toLocaleString()} linked ${relinkedTotal === 1 ? 'row was' : 'rows were'} updated.`,
    })
  }

  const handleApplyCleanupProposals = async (
    exportPayload: CatalogCleanupBatchExportPayload,
    proposals: CleanupApplyProposal[],
  ): Promise<CleanupApplyResult[]> => {
    const results: CleanupApplyResult[] = []
    const validItemIds = new Set(exportPayload.items.map((item) => item.item_id))

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

    reloadSummaryItems()
    reloadMergeHistory()
    reloadHistoryRows()

    const appliedCount = results.filter((result) => result.status === 'applied').length
    const staleCount = results.filter((result) => result.status === 'stale').length
    const failedCount = results.filter((result) => result.status === 'failed').length

    toast({
      title: 'Cleanup apply finished',
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
      toast({
        title: 'Cleanup group not found',
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
      <div className="overflow-hidden bg-[radial-gradient(circle_at_top,_#f8f1e6_0%,_#eee4d6_36%,_#e5dac9_100%)] md:rounded-[28px] md:border md:border-[#d6c6b0] md:shadow-[0_24px_60px_rgba(88,67,41,0.12)]">
        <header className="flex h-[54px] items-center gap-4 border-b border-[#d7c7b3] bg-[#f3eadf]/95 px-5 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Go back"
            className="hidden items-center gap-[6px] rounded-[8px] border-none bg-transparent px-[10px] py-[6px] text-[13px] font-semibold text-[#7c6954] transition-all duration-150 hover:bg-[#e6dacb] hover:text-[#2a2118] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8c6a45] md:flex"
          >
            <BackArrow />
          </button>

          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-1 rounded-[12px] border border-[#ccb79b] bg-[#fffaf1]/50 p-[3px] shadow-[inset_0_1px_2px_rgba(94,72,46,0.05)]">
              <button
                type="button"
                onClick={() => {
                  setWorkflowMode('library')
                  setViewMode('catalog')
                }}
                className={[
                  "rounded-[9px] px-4 py-1.5 text-[12px] font-bold transition-all duration-200",
                  workflowMode === 'library'
                    ? "bg-[#8c6a45] text-white shadow-[0_2px_4px_rgba(88,67,41,0.2)]"
                    : "text-[#7b644c] hover:bg-[#efe4d4]"
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
                  "relative rounded-[9px] px-4 py-1.5 text-[12px] font-bold transition-all duration-200",
                  workflowMode === 'cleanup'
                    ? "bg-[#8c6a45] text-white shadow-[0_2px_4px_rgba(88,67,41,0.2)]"
                    : "text-[#7b644c] hover:bg-[#efe4d4]"
                ].join(' ')}
              >
                Cleanup Hub
                {totalUnresolvedIssues > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#a06d2b] px-1 text-[9px] font-bold text-white ring-2 ring-[#f3eadf]">
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
          <div className="border-b border-[#e0b7b1] bg-[#fff4f1] px-5 py-3 text-[12px] text-[#a0362b]">
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
            <div className="flex-shrink-0 border-b border-[#e8e4dc] bg-[#faf9f7] md:hidden">
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="flex items-center gap-[6px] border-none bg-transparent px-4 py-3 text-[13px] font-semibold text-[#8a8277] transition-colors hover:text-[#1a1814]"
              >
                <BackArrow />
                {workflowMode === 'library' ? 'Library' : 'Cleanup'}
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {workflowMode === 'cleanup' && viewMode !== 'catalog' ? (
                <div className="flex items-center justify-between border-b border-[#ddd0bf] bg-[#f8f1e6]/80 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setViewMode('catalog')}
                    className="text-[12px] font-bold text-[#8c6a45] transition-colors hover:text-[#5d432b]"
                  >
                    Back to Cleanup Hub
                  </button>
                  <div className="text-[11px] font-semibold text-[#8a745f]">
                    {viewMode === 'duplicates'
                      ? 'Fix Duplicate Items'
                      : viewMode === 'advanced_cleanup'
                        ? 'Clean & Standardize Catalog'
                        : 'Review Past Changes'}
                  </div>
                </div>
              ) : null}

              {workflowMode === 'cleanup' && viewMode === 'duplicates' ? (
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
              ) : workflowMode === 'cleanup' && viewMode === 'advanced_cleanup' ? (
                <ItemLibraryAdvancedCleanupPanel
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
                <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-[#faf9f7]">
                   <div className="max-w-3xl space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold tracking-tight text-[#2c2218]">Cleanup Hub</h2>
                        <p className="text-[#7c6954] text-[13px] leading-relaxed">Choose the cleanup job you want to run. No lists are opened until you choose a workflow.</p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <button 
                          onClick={() => setViewMode('duplicates')}
                          className="flex flex-col items-start gap-1 rounded-[var(--bd-radius-xl)] border border-[#d6c6b0] bg-[#fffaf1] p-5 text-left transition-all hover:border-[#8c6a45] hover:shadow-[0_12px_24px_rgba(88,67,41,0.08)] group"
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="text-sm font-bold text-[#2c2218]">Fix Duplicate Items</span>
                            <span className="rounded-full bg-[#e8d5bc] px-2.5 py-0.5 text-[10px] font-bold text-[#634a31] group-hover:bg-[#8c6a45] group-hover:text-white transition-colors">{totalUnresolvedIssues} groups</span>
                          </div>
                          <span className="text-[11px] text-[#8a8277]">Review detected duplicate groups, inspect history, and merge manually with the existing duplicate review flow.</span>
                        </button>

                        <button 
                          onClick={() => setViewMode('advanced_cleanup')}
                          className="flex flex-col items-start gap-1 rounded-[var(--bd-radius-xl)] border border-[#d6c6b0] bg-[#fffaf1] p-5 text-left transition-all hover:border-[#8c6a45] hover:shadow-[0_12px_24px_rgba(88,67,41,0.08)] group"
                        >
                          <span className="text-sm font-bold text-[#2c2218]">Clean &amp; Standardize Catalog</span>
                          <span className="text-[11px] text-[#8a8277]">Run a locked full-catalog cleanup session with numeric batches, AI review, and safe merge apply support.</span>
                        </button>

                        {mergeHistoryCount > 0 ? (
                          <button 
                            onClick={() => setViewMode('merge_history')}
                            className="flex flex-col items-start gap-1 rounded-[var(--bd-radius-xl)] border border-[#d6c6b0] bg-[#fffaf1] p-5 text-left transition-all hover:border-[#8c6a45] hover:shadow-[0_12px_24px_rgba(88,67,41,0.08)] group"
                          >
                            <span className="text-sm font-bold text-[#2c2218]">Review Past Changes</span>
                            <span className="text-[11px] text-[#8a8277]">Open merge history and audit the catalog cleanup trail.</span>
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
