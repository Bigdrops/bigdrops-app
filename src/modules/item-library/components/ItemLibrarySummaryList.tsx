import { Search, Package, Clock3 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ItemCatalogItem } from '../types'
import {
  formatItemPrice,
  formatLastUsedDate,
  formatUsageCount,
} from './itemLibraryFormatters'

type ItemLibrarySummaryListProps = {
  items: ItemCatalogItem[]
  loading: boolean
  error: Error | null
  searchText: string
  onSearchTextChange: (value: string) => void
  selectedItemId: string | null
  onSelectItem: (item: ItemCatalogItem) => void
}

export function ItemLibrarySummaryList({
  items,
  loading,
  error,
  searchText,
  onSearchTextChange,
  selectedItemId,
  onSelectItem,
}: ItemLibrarySummaryListProps) {
  return (
    <Card className="rounded-3xl border-none shadow-sm ring-1 ring-border/70">
      <CardHeader className="border-b border-border/70">
        <CardTitle className="text-lg font-bold tracking-tight">Summary</CardTitle>
        <CardDescription>
          Review standard pricing, recent selling history, and usage frequency.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder="Search item name"
            className="h-11 rounded-2xl pl-9"
          />
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            Loading item library…
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-6 text-sm text-destructive">
            {error.message || 'Could not load the item library.'}
          </div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-muted">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-sm font-semibold text-foreground">No items found</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {searchText.trim() ? 'Try a different name.' : 'The summary list is empty right now.'}
            </div>
          </div>
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => {
              const isSelected = selectedItemId === item.item_id
              return (
                <button
                  key={item.item_id}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className={cn(
                    'w-full rounded-2xl border px-4 py-4 text-left transition hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                    isSelected
                      ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-background'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">{item.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatUsageCount(item.usage_count)}</span>
                        <span aria-hidden="true">•</span>
                        <span>{formatLastUsedDate(item.last_used_at)}</span>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {item.last_source_type || 'history'}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Standard
                      </div>
                      <div className="mt-1 font-semibold text-foreground">
                        {formatItemPrice(item.standard_price)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Last sold
                      </div>
                      <div className="mt-1 font-semibold text-foreground">
                        {formatItemPrice(item.last_sold_price, 'No sales yet')}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
