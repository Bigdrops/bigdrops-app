import { useEffect, useMemo, useState } from 'react'

import Layout from '@/components/Layout'
import { ItemLibraryDetailPanel } from '../components/ItemLibraryDetailPanel'
import { ItemLibraryListPanel } from '../components/ItemLibraryListPanel'
import { useItemHistoryDetail, useItemHistoryList } from '../hooks'
import type { ItemCatalogItem, ItemLibraryFilterType } from '../types'

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
  const [activeFilter, setActiveFilter] = useState<ItemLibraryFilterType>('all')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const { data: summaryItems, loading: summaryLoading, error: summaryError } = useItemHistoryList(200)

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()

    return summaryItems.filter((item) => {
      const matchesSearch = normalizedSearch ? item.name.toLowerCase().includes(normalizedSearch) : true
      const matchesFilter = activeFilter === 'all' ? true : item.last_source_type === activeFilter
      return matchesSearch && matchesFilter
    })
  }, [activeFilter, searchText, summaryItems])

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

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.item_id === selectedItemId) || null,
    [filteredItems, selectedItemId],
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
      <div className="overflow-hidden bg-[#f5f3ef] md:rounded-[28px] md:border md:border-[#e8e4dc] md:shadow-[0_1px_3px_rgba(0,0,0,.05)]">
        <header className="flex h-[54px] items-center gap-0 border-b border-[#e8e4dc] bg-[#faf9f7] px-5">
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Go back"
            className="mr-0 hidden items-center gap-[6px] rounded-[8px] border-none bg-transparent px-[10px] py-[6px] text-[13px] font-semibold text-[#8a8277] transition-all duration-150 hover:bg-[#edeae4] hover:text-[#1a1814] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] md:flex"
          >
            <BackArrow />
            Back
          </button>

          <div className="pointer-events-none flex flex-1 items-center justify-center gap-2">
            <h1 className="text-[14px] font-extrabold tracking-[-0.01em] text-[#1a1814]">Item Library</h1>
            {!summaryLoading ? (
              <span className="rounded-full border border-[#dedad2] bg-[#edeae4] px-[9px] py-[2px] font-['JetBrains_Mono'] text-[10px] font-bold text-[#8a8277]">
                {totalCount} {totalCount === 1 ? 'item' : 'items'}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => exportItems(filteredItems)}
            disabled={summaryLoading || filteredItems.length === 0}
            aria-label="Export catalog as JSON"
            className="flex items-center gap-[6px] rounded-[8px] border border-[#dedad2] bg-white px-3 py-[7px] text-[12px] font-bold text-[#57534a] shadow-[0_1px_3px_rgba(0,0,0,.05)] transition-all duration-150 hover:bg-[#edeae4] hover:text-[#1a1814] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">Export</span>
          </button>
        </header>

        {summaryError ? (
          <div className="border-b border-[#f5c2c7] bg-[#fff5f5] px-5 py-3 text-[12px] text-[#b42318]">
            {summaryError.message || 'Failed to load item library.'}
          </div>
        ) : null}

        <main className="flex min-h-[calc(100dvh-14rem)] overflow-hidden">
          <div
            className={[
              'flex-col overflow-hidden md:flex md:w-[38%] md:flex-shrink-0',
              mobileDetailOpen ? 'hidden' : 'flex w-full',
            ].join(' ')}
          >
            <ItemLibraryListPanel
              items={filteredItems}
              selectedItemId={selectedItemId}
              loading={summaryLoading}
              searchText={searchText}
              activeFilter={activeFilter}
              onSearchTextChange={setSearchText}
              onFilterChange={setActiveFilter}
              onSelectItem={(itemId) => {
                setSelectedItemId(itemId)
                if (window.innerWidth < 768) setMobileDetailOpen(true)
              }}
            />
          </div>

          <div
            className={[
              'hidden md:flex md:flex-1 md:flex-col md:overflow-hidden',
              mobileDetailOpen ? 'flex w-full flex-col overflow-hidden' : '',
            ].join(' ')}
          >
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
              <ItemLibraryDetailPanel
                item={selectedItem}
                historyRows={historyRows}
                loading={historyLoading}
                error={historyError}
              />
            </div>
          </div>
        </main>
      </div>
    </Layout>
  )
}
