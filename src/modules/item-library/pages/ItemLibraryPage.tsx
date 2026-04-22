import { useEffect, useMemo, useState } from 'react'

import Layout from '@/components/Layout'
import { ItemLibraryDetailPanel } from '../components/ItemLibraryDetailPanel'
import { ItemLibraryDuplicateReviewPanel } from '../components/ItemLibraryDuplicateReviewPanel'
import { ItemLibraryListPanel } from '../components/ItemLibraryListPanel'
import { detectDuplicateGroups } from '../domain/duplicateDetection'
import { useItemHistoryDetail, useItemHistoryList } from '../hooks'
import type { ItemCatalogItem, ItemLibraryFilterType, ItemLibraryViewMode } from '../types'

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

function exportItems(items: ItemCatalogItem[]) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `item-library-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function ItemLibraryPage() {
  const [searchText, setSearchText] = useState('')
  const [viewMode, setViewMode] = useState<ItemLibraryViewMode>('catalog')
  const [activeFilter, setActiveFilter] = useState<ItemLibraryFilterType>('all')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedDuplicateGroupId, setSelectedDuplicateGroupId] = useState<string | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const { data: summaryItems, loading: summaryLoading, error: summaryError } = useItemHistoryList(200)

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
    if (viewMode !== 'duplicates') return
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
    if (viewMode !== 'duplicates' || !selectedDuplicateGroupId) return

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

  const {
    data: historyRows,
    loading: historyLoading,
    error: historyError,
  } = useItemHistoryDetail(selectedItem?.item_id, 50)

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

          <button
            type="button"
            onClick={() => exportItems(filteredItems)}
            disabled={summaryLoading || filteredItems.length === 0}
            aria-label="Export catalog as JSON"
            className="flex items-center gap-[6px] rounded-[10px] border border-[#ccb79b] bg-[#fffaf1] px-3 py-[7px] text-[12px] font-bold text-[#5d4b38] shadow-[0_10px_18px_rgba(94,72,46,0.09),inset_0_1px_0_rgba(255,255,255,0.65)] transition-all duration-150 hover:bg-[#f5e8d5] hover:text-[#2a2118] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8c6a45]"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">Export</span>
          </button>
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
                  group={selectedDuplicateGroup}
                  item={selectedItem}
                  historyRows={historyRows}
                  loading={historyLoading}
                  error={historyError}
                  onInspectItem={(itemId) => setSelectedItemId(itemId)}
                />
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
