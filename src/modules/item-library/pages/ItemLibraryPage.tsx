import { useEffect, useMemo, useState } from 'react'

import Layout from '@/components/Layout'
import { toast } from '@/hooks/use-toast'
import { ItemLibraryAdvancedCleanupPanel } from '../components/ItemLibraryAdvancedCleanupPanel'
import { ItemLibraryDetailPanel } from '../components/ItemLibraryDetailPanel'
import { ItemLibraryDuplicateReviewPanel } from '../components/ItemLibraryDuplicateReviewPanel'
import { ItemLibraryListPanel } from '../components/ItemLibraryListPanel'
import { detectDuplicateGroups } from '../domain/duplicateDetection'
import { buildFlaggedCleanupExportPayload } from '../domain/itemCleanupExchange'
import { useItemAliases, useItemHistoryDetail, useItemHistoryList, useItemMerge } from '../hooks'
import type { ItemLibraryMergeRequest } from '../types'
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

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()

    return summaryItems.filter((item) => {
      const matchesSearch = normalizedSearch ? item.name.toLowerCase().includes(normalizedSearch) : true
      const matchesFilter =
        activeFilter === 'all'
          ? true
          : activeFilter === 'invoice'
            ? item.appears_in_invoice === true
            : item.appears_in_quotation === true
      return matchesSearch && matchesFilter
    })
  }, [activeFilter, searchText, summaryItems])

  const duplicateGroups = useMemo(() => detectDuplicateGroups(filteredItems), [filteredItems])

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
    if (viewMode !== 'duplicates' && viewMode !== 'advanced_cleanup') return
    if (!duplicateGroups.length) {
      setSelectedDuplicateGroupId(null)
      return
    }

    setSelectedDuplicateGroupId((current) => {
      if (current && duplicateGroups.some((group) => group.group_id === current)) return current
      return duplicateGroups[0].group_id
    })
  }, [duplicateGroups, viewMode])

  useEffect(() => {
    if ((viewMode !== 'duplicates' && viewMode !== 'advanced_cleanup') || !selectedDuplicateGroupId) return

    const activeGroup = duplicateGroups.find((group) => group.group_id === selectedDuplicateGroupId)
    if (!activeGroup || !activeGroup.members.length) return

    setSelectedItemId((current) => {
      if (current && activeGroup.members.some((member) => member.item_id === current)) return current
      return activeGroup.members[0].item_id
    })
  }, [duplicateGroups, selectedDuplicateGroupId, viewMode])

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.item_id === selectedItemId) || null,
    [filteredItems, selectedItemId],
  )

  const selectedDuplicateGroup = useMemo(
    () => duplicateGroups.find((group) => group.group_id === selectedDuplicateGroupId) || null,
    [duplicateGroups, selectedDuplicateGroupId],
  )
  const allDuplicateItemIds = useMemo(
    () => duplicateGroups.flatMap((group) => group.members.map((member) => member.item_id)),
    [duplicateGroups],
  )
  const {
    data: duplicateAliases,
    loading: aliasesLoading,
    error: aliasesError,
  } = useItemAliases(allDuplicateItemIds)
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
    () => buildFlaggedCleanupExportPayload({ duplicateGroups, aliases: duplicateAliases }),
    [duplicateAliases, duplicateGroups],
  )
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

    setViewMode('catalog')
    setSelectedDuplicateGroupId(null)
    setSelectedItemId(result.winner_item_id)
    setPendingHistoryRefreshItemId(result.winner_item_id)
    if (window.innerWidth < 768) setMobileDetailOpen(true)

    reloadSummaryItems()

    toast({
      title: 'Merge complete',
      description: `${result.merged_item_ids.length} duplicate item${result.merged_item_ids.length === 1 ? '' : 's'} merged into the selected primary item. ${relinkedTotal.toLocaleString()} linked ${relinkedTotal === 1 ? 'row was' : 'rows were'} updated.`,
    })
  }

  const totalCount = filteredItems.length

  return (
    <Layout
      title="Item Library"
      session={null}
      hidePageHeader
      contentClassName="mx-auto w-full max-w-6xl px-0 py-0 md:px-6 md:py-6"
    >
      <div className="overflow-hidden bg-[radial-gradient(circle_at_top,_#f8f1e6_0%,_#eee4d6_36%,_#e5dac9_100%)] md:rounded-[28px] md:border md:border-[#d6c6b0] md:shadow-[0_24px_60px_rgba(88,67,41,0.12)]">
        <header className="flex h-[54px] items-center gap-0 border-b border-[#d7c7b3] bg-[#f3eadf]/95 px-5 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Go back"
            className="mr-0 hidden items-center gap-[6px] rounded-[8px] border-none bg-transparent px-[10px] py-[6px] text-[13px] font-semibold text-[#7c6954] transition-all duration-150 hover:bg-[#e6dacb] hover:text-[#2a2118] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8c6a45] md:flex"
          >
            <BackArrow />
            Back
          </button>

          <div className="pointer-events-none flex flex-1 items-center justify-center gap-2">
            <h1 className="text-[14px] font-extrabold tracking-[-0.01em] text-[#2c2218]">Item Library</h1>
            {!summaryLoading ? (
              <span className="rounded-full border border-[#d3c0a8] bg-[#e9dccb] px-[9px] py-[2px] font-['JetBrains_Mono'] text-[10px] font-bold text-[#78644e] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                {totalCount} {totalCount === 1 ? 'item' : 'items'}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-[6px] rounded-[10px] border border-[#ccb79b] bg-[#fffaf1] px-3 py-[7px] text-[11px] font-bold text-[#7b644c] shadow-[0_10px_18px_rgba(94,72,46,0.09),inset_0_1px_0_rgba(255,255,255,0.65)]">
            <DownloadIcon />
            <span className="hidden sm:inline">Advanced export in panel</span>
          </div>
        </header>

        {summaryError ? (
          <div className="border-b border-[#e0b7b1] bg-[#fff4f1] px-5 py-3 text-[12px] text-[#a0362b]">
            {summaryError.message || 'Failed to load item library.'}
          </div>
        ) : null}

        <main className="flex min-h-[calc(100dvh-14rem)] overflow-hidden">
          <div className={mobileDetailOpen ? 'hidden md:flex md:w-[38%] md:flex-shrink-0 md:flex-col md:overflow-hidden' : 'flex w-full flex-col overflow-hidden md:w-[38%] md:flex-shrink-0'}>
            <ItemLibraryListPanel
              items={filteredItems}
              duplicateGroups={duplicateGroups}
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
                const nextGroup = duplicateGroups.find((group) => group.group_id === groupId)
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
            />
          </div>

          <div className={mobileDetailOpen ? 'flex w-full flex-col overflow-hidden md:flex-1' : 'hidden md:flex md:flex-1 md:flex-col md:overflow-hidden'}>
            <div className="flex-shrink-0 border-b border-[#e8e4dc] bg-[#faf9f7] md:hidden">
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="flex items-center gap-[6px] border-none bg-transparent px-4 py-3 text-[13px] font-semibold text-[#8a8277] transition-colors hover:text-[#1a1814]"
              >
                <BackArrow />
                All Items
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {viewMode === 'duplicates' ? (
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
              ) : viewMode === 'advanced_cleanup' ? (
                <ItemLibraryAdvancedCleanupPanel exportPayload={flaggedCleanupExport} />
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
