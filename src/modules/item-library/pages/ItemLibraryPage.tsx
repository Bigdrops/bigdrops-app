import { useEffect, useMemo, useState } from 'react'

import Layout from '@/components/Layout'
import type { ItemCatalogItem } from '../types'
import { useItemHistoryDetail, useItemHistoryList } from '../hooks'
import { ItemLibrarySummaryList } from '../components/ItemLibrarySummaryList'
import { ItemLibraryDetailPanel } from '../components/ItemLibraryDetailPanel'

export default function ItemLibraryPage() {
  const [searchText, setSearchText] = useState('')
  const [selectedItem, setSelectedItem] = useState<ItemCatalogItem | null>(null)
  const { data: summaryItems, loading: summaryLoading, error: summaryError } = useItemHistoryList(200)

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()
    if (!normalizedSearch) return summaryItems

    return summaryItems.filter((item) => item.name.toLowerCase().includes(normalizedSearch))
  }, [searchText, summaryItems])

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedItem(null)
      return
    }

    setSelectedItem((current) => {
      if (!current) return filteredItems[0]

      const nextSelected = filteredItems.find((item) => item.item_id === current.item_id)
      return nextSelected || filteredItems[0]
    })
  }, [filteredItems])

  const {
    data: historyRows,
    loading: historyLoading,
    error: historyError,
  } = useItemHistoryDetail(selectedItem?.item_id, 50)

  return (
    <Layout title="Item Library" session={null} hidePageHeader={false}>
      <div className="space-y-6">
        <section className="rounded-3xl border border-border bg-card px-6 py-6 shadow-sm">
          <div className="max-w-3xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Price history
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground">
              Item Library
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Browse the current master item list, review standard pricing, and inspect where each
              item was used in invoices or quotations.
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <ItemLibrarySummaryList
            items={filteredItems}
            loading={summaryLoading}
            error={summaryError}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            selectedItemId={selectedItem?.item_id || null}
            onSelectItem={setSelectedItem}
          />

          <ItemLibraryDetailPanel
            item={selectedItem}
            historyRows={historyRows}
            loading={historyLoading}
            error={historyError}
          />
        </section>
      </div>
    </Layout>
  )
}
