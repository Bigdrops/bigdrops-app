import { useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

import { MoreHorizontal, Search, SlidersHorizontal, X } from "lucide-react"

import { MobileChromeContext } from "@/components/Layout"
import MobilePageHeader from "@/components/layout/MobilePageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type ListRecord = {
  id: string
  invoice_number?: string | null
  quotation_number?: string | null
  client_name?: string | null
  issue_date?: string | null
  due_date?: string | null
  total?: number | null
  status?: string | null
}

type FilterOption = {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}

type InvoiceListPageSectionProps<T extends ListRecord> = {
  eyebrow: string
  title: string
  summary: string
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  filters: FilterOption[]
  hasActiveFilters?: boolean
  onResetFilters: () => void
  records: T[]
  onRowClick: (record: T) => void
  onRowActionClick: (record: T) => void
  renderAmount: (value?: number | null) => string
  renderStatusLabel: (status?: string | null) => string
  renderIssueMeta: (record: T) => string
  renderStatusClassName: (status?: string | null) => string
  loadMoreLabel?: string
  beforeListContent?: ReactNode
  emptyState: ReactNode
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}

export default function InvoiceListPageSection<T extends ListRecord>({
  eyebrow,
  title,
  summary,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  hasActiveFilters = false,
  onResetFilters,
  records,
  onRowClick,
  onRowActionClick,
  renderAmount,
  renderStatusLabel,
  renderIssueMeta,
  renderStatusClassName,
  loadMoreLabel = "Load more",
  beforeListContent,
  emptyState,
  hasMore,
  loadingMore,
  onLoadMore,
}: InvoiceListPageSectionProps<T>) {
  const mobileChrome = useContext(MobileChromeContext)
  const [searchOpen, setSearchOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    if (searchValue.trim()) {
      setSearchOpen(true)
    }
  }, [searchValue])

  useEffect(() => {
    if (hasActiveFilters) {
      setFiltersOpen(true)
    }
  }, [hasActiveFilters])

  const controlsVisible = useMemo(
    () => searchOpen || filtersOpen,
    [filtersOpen, searchOpen],
  )

  return (
    <div className="min-h-screen bg-transparent px-[14px] pb-32 pt-2 font-['DM_Sans',sans-serif]">
      <MobilePageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={summary}
        accentClassName="tone-info-accent"
        onMenuClick={mobileChrome.openSidebar}
        hideGlobalSearch
      />

      <div className="mt-3 rounded-[24px] border border-border bg-background/95 p-3.5 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </div>
        <div className="mt-1 text-[22px] font-extrabold leading-[1.05] tracking-[-0.04em] text-foreground">
          {title}
        </div>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0 text-[13px] text-muted-foreground">{summary}</div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant={searchOpen ? "outline" : "ghost"}
              size="icon"
              onClick={() => setSearchOpen((open) => !open)}
              className="h-9 w-9 rounded-[13px] border-border bg-background text-foreground shadow-sm"
              aria-label={searchOpen ? "Hide search" : "Show search"}
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant={filtersOpen ? "outline" : "ghost"}
              size="icon"
              onClick={() => setFiltersOpen((open) => !open)}
              className="h-9 w-9 rounded-[13px] border-border bg-background text-foreground shadow-sm"
              aria-label={filtersOpen ? "Hide filters" : "Show filters"}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {controlsVisible ? (
          <div className="mt-3 space-y-3 rounded-[18px] border border-border/80 bg-background/80 p-3 shadow-sm">
            {searchOpen ? (
              <div className="flex h-12 items-center gap-3 rounded-[16px] border border-border bg-background px-3.5">
                <Search className="h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-full border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
                />
              </div>
            ) : null}

            {filtersOpen ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {filters.map((filter) => (
                    <div key={filter.label} className="space-y-1">
                      <div className="px-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        {filter.label}
                      </div>
                      <Select value={filter.value} onValueChange={filter.onChange}>
                        <SelectTrigger className="h-10 rounded-[12px] border-border bg-background px-3 text-[13px] font-semibold shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {filter.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={onResetFilters}
                  className="h-9 w-full rounded-[12px] border border-dashed border-border bg-transparent text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground hover:bg-muted/30"
                >
                  Clear filters
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {beforeListContent}

        {records.length === 0 ? (
          emptyState
        ) : (
          <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-sm">
            {records.map((record, index) => (
              <div
                key={record.id}
                onClick={() => onRowClick(record)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onRowClick(record)
                  }
                }}
                role="button"
                tabIndex={0}
                className={cn(
                  "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3.5 py-3.5 text-left transition hover:bg-muted/25",
                  index > 0 && "border-t border-border",
                )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-bold tracking-[-0.02em] text-foreground">
                      {record.client_name || "No client"}
                    </div>
                    <div className="mt-1 text-[12px] leading-[1.35] text-muted-foreground">
                      {renderIssueMeta(record)}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-[15px] font-extrabold tracking-[-0.03em] text-foreground">
                      {renderAmount(record.total)}
                    </div>
                    <div className="mt-1.5">
                      <span
                        className={cn(
                          "inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-extrabold uppercase tracking-[0.06em]",
                          renderStatusClassName(record.status),
                        )}
                      >
                        {renderStatusLabel(record.status)}
                      </span>
                    </div>
                  </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRowActionClick(record)
                  }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-muted text-muted-foreground"
                  aria-label={`Open actions for ${record.invoice_number || record.quotation_number || "record"}`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      event.stopPropagation()
                      onRowActionClick(record)
                    }
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {hasMore ? (
          <div className="mt-3 flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="h-9 rounded-full border-border bg-background px-4 text-[12px] font-bold shadow-sm"
            >
              {loadingMore ? "Loading..." : loadMoreLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
