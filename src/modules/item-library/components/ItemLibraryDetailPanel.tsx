import type { ReactNode } from 'react'

import type { ItemCatalogItem, ItemHistoryRow as ItemHistoryRecord } from '../types'
import { ItemHistoryRow } from './ItemHistoryRow'
import {
  formatItemPrice,
  formatLastUsedDate,
  formatUsageCount,
  getItemPriceRangeLabel,
  getPriceDelta,
} from './itemLibraryFormatters'

type ItemLibraryDetailPanelProps = {
  item: ItemCatalogItem | null
  historyRows: ItemHistoryRecord[]
  loading: boolean
  error: Error | null
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 pl-[2px] text-[9px] font-extrabold uppercase tracking-[0.12em] text-bd-text-muted">
      {children}
    </h3>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-[5px]">
      <span className="text-[11px] text-bd-text-muted">{label}</span>
      <span className="font-mono text-[11px] font-bold text-bd-text">{value}</span>
    </div>
  )
}

function PriceInsightRow({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-bd-border px-[14px] py-[10px] last:border-b-0">
      <span className="text-[12px] font-medium text-bd-text-muted">{label}</span>
      <div className="text-right">
        <div className="font-mono text-[13px] font-semibold text-bd-text">{value}</div>
        {meta ? (
          <div className="mt-[2px] font-mono text-[10px] text-bd-text-muted opacity-80">{meta}</div>
        ) : null}
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-5">
      <div className="rounded-xl border border-bd-border bg-bd-surface p-4 shadow-sm">
        <div className="mb-3 h-4 w-[55%] animate-pulse rounded bg-bd-border/50" />
        <div className="mb-3 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <div className="mb-[6px] h-2 w-[50%] animate-pulse rounded bg-bd-border/30" />
              <div className="h-4 w-[80%] animate-pulse rounded bg-bd-border/50" />
            </div>
          ))}
        </div>
        <div className="h-3 w-[40%] animate-pulse rounded bg-bd-border/30" />
      </div>

      {[0, 1, 2].map((index) => (
        <div key={index} className="rounded-lg border border-bd-border bg-bd-surface p-3 shadow-sm">
          <div className="mb-2 h-3 w-[60%] animate-pulse rounded bg-bd-border/50" />
          <div className="mb-2 h-[11px] w-[80%] animate-pulse rounded bg-bd-border/30" />
          <div className="h-3 w-[45%] animate-pulse rounded bg-bd-border/50" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-bd-border bg-bd-surface-muted text-bd-text-muted shadow-sm">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <div>
        <p className="text-[15px] font-bold text-bd-text">Select an item</p>
        <p className="mt-1 max-w-[220px] text-[12px] leading-relaxed text-bd-text-muted">
          Choose an item from the list to inspect its pricing history and usage.
        </p>
      </div>
    </div>
  )
}

export function ItemLibraryDetailPanel({
  item,
  historyRows,
  loading,
  error,
}: ItemLibraryDetailPanelProps) {
  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-bd-app-bg">
        <DetailSkeleton />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="h-full bg-bd-app-bg">
        <EmptyState />
      </div>
    )
  }

  const delta = getPriceDelta(item.standard_price, item.last_sold_price)
  const latestHistory = historyRows[0] || null
  const priceRangeLabel = getItemPriceRangeLabel(item)

  return (
    <div className="h-full overflow-y-auto bg-bd-app-bg">
      <div className="space-y-4 p-5">
        <section aria-label="Item identity">
          <div className="rounded-xl border border-bd-border bg-bd-surface p-4 shadow-lg">
            <h2 className="mb-3 text-[16px] font-extrabold leading-tight tracking-tight text-bd-text">
              {item.name}
            </h2>

            <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-lg border border-bd-border bg-bd-surface-muted">
              <div className="border-r border-bd-border px-3 py-[10px]">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-bd-text-muted">Standard</p>
                <p className="font-mono text-[14px] font-semibold text-bd-text">
                  {formatItemPrice(item.standard_price)}
                </p>
              </div>

              <div className="border-r border-bd-border bg-bd-surface px-3 py-[10px]">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-bd-text-muted">Last Sold</p>
                <p className="font-mono text-[14px] font-semibold text-bd-status-success-text">
                  {formatItemPrice(item.last_sold_price, 'No sales yet')}
                </p>
              </div>

              <div className="px-3 py-[10px]">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-bd-text-muted">Movement</p>
                {!delta || delta.direction === 'flat' ? (
                  <p className="font-mono text-[14px] text-bd-text-muted">-</p>
                ) : (
                  <p className="font-mono text-[14px] font-semibold text-bd-text">
                    {delta.direction === 'up' ? '▲' : '▼'} {formatItemPrice(Math.abs(delta.amount))}
                    <span className="ml-1 text-[11px] text-bd-text-muted opacity-80">({Math.abs(delta.pct)}%)</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <StatItem label="Appears in" value={formatUsageCount(item.usage_count)} />
              <StatItem label="Last used" value={formatLastUsedDate(item.last_used_at)} />
            </div>
          </div>
        </section>

        <section aria-label="Price intelligence">
          <SectionLabel>Price Intelligence</SectionLabel>
          <div className="overflow-hidden rounded-lg border border-bd-border bg-bd-surface shadow-md">
            {latestHistory ? (
              <PriceInsightRow
                label="Latest document price"
                value={formatItemPrice(latestHistory.unit_price, 'No price')}
                meta={`${latestHistory.source_document_number || latestHistory.source_document_id || 'Document'} · ${formatLastUsedDate(latestHistory.used_at)}`}
              />
            ) : null}
            {item.avg_price !== null && item.avg_price !== undefined ? (
              <PriceInsightRow
                label="Average recorded price"
                value={formatItemPrice(item.avg_price)}
                meta={`${formatUsageCount(item.usage_count)} across history`}
              />
            ) : null}
            {priceRangeLabel ? (
              <PriceInsightRow
                label="Price range (all time)"
                value={priceRangeLabel}
                meta={`${formatUsageCount(item.usage_count)} across history`}
              />
            ) : null}
            {!latestHistory && item.avg_price === null && !priceRangeLabel ? (
              <PriceInsightRow
                label="History status"
                value="No recorded history"
                meta="This item has not been used yet."
              />
            ) : null}
          </div>
        </section>

        <section aria-label="Usage history">
          <SectionLabel>
            Usage History · {historyRows.length} {historyRows.length === 1 ? 'occurrence' : 'occurrences'}
          </SectionLabel>

          {error ? (
            <div className="rounded-lg border border-bd-status-danger-border bg-bd-status-danger-bg px-4 py-3 text-[12px] text-bd-status-danger-text">
              {error.message || 'Could not load item history.'}
            </div>
          ) : null}

          {!error && historyRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-bd-border bg-bd-surface-muted px-4 py-6 text-center">
              <div className="text-[13px] font-semibold text-bd-text-muted">No history yet</div>
              <div className="mt-1 text-[11px] text-bd-text-muted opacity-70">
                This item has no linked invoice or quotation rows yet.
              </div>
            </div>
          ) : null}

          {!error && historyRows.length > 0 ? (
            <div>
              {historyRows.map((row) => (
                <ItemHistoryRow key={`${row.source_type}-${row.row_id}`} row={row} />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
