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
    <h3 className="mb-2 pl-[2px] text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#9d8a74]">
      {children}
    </h3>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-[5px]">
      <span className="text-[11px] text-[#87705a]">{label}</span>
      <span className="font-['JetBrains_Mono'] text-[11px] font-bold text-[#584532]">{value}</span>
    </div>
  )
}

function PriceInsightRow({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#e4d5c4] px-[14px] py-[10px] last:border-b-0">
      <span className="text-[12px] font-medium text-[#77624d]">{label}</span>
      <div className="text-right">
        <div className="font-['JetBrains_Mono'] text-[13px] font-semibold text-[#2f2419]">{value}</div>
        {meta ? (
          <div className="mt-[2px] font-['JetBrains_Mono'] text-[10px] text-[#a3927d]">{meta}</div>
        ) : null}
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-5">
      <div className="rounded-[14px] border border-[#d9c8b3] bg-[#fff8ef] p-4 shadow-[0_16px_30px_rgba(96,72,45,0.08)]">
        <div className="mb-3 h-4 w-[55%] animate-pulse rounded bg-[#e6d7c3]" />
        <div className="mb-3 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <div className="mb-[6px] h-2 w-[50%] animate-pulse rounded bg-[#eee1d0]" />
              <div className="h-4 w-[80%] animate-pulse rounded bg-[#e6d7c3]" />
            </div>
          ))}
        </div>
        <div className="h-3 w-[40%] animate-pulse rounded bg-[#eee1d0]" />
      </div>

      {[0, 1, 2].map((index) => (
        <div key={index} className="rounded-[10px] border border-[#d9c8b3] bg-[#fff8ef] p-3 shadow-[0_10px_20px_rgba(96,72,45,0.06)]">
          <div className="mb-2 h-3 w-[60%] animate-pulse rounded bg-[#e6d7c3]" />
          <div className="mb-2 h-[11px] w-[80%] animate-pulse rounded bg-[#eee1d0]" />
          <div className="h-3 w-[45%] animate-pulse rounded bg-[#e6d7c3]" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#d8c7b2] bg-[#f2e5d4] text-[#9e8c78] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
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
        <p className="text-[15px] font-bold text-[#5e4a36]">Select an item</p>
        <p className="mt-1 max-w-[220px] text-[12px] leading-relaxed text-[#9f8f7a]">
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
      <div className="h-full overflow-y-auto bg-[linear-gradient(180deg,_#efe5d7_0%,_#e8dccb_100%)]">
        <DetailSkeleton />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="h-full bg-[linear-gradient(180deg,_#efe5d7_0%,_#e8dccb_100%)]">
        <EmptyState />
      </div>
    )
  }

  const delta = getPriceDelta(item.standard_price, item.last_sold_price)
  const latestHistory = historyRows[0] || null
  const priceRangeLabel = getItemPriceRangeLabel(item)

  return (
    <div className="h-full overflow-y-auto bg-[linear-gradient(180deg,_#efe5d7_0%,_#e8dccb_100%)]">
      <div className="space-y-4 p-5">
        <section aria-label="Item identity">
          <div className="rounded-[16px] border border-[#d4c1a8] bg-[linear-gradient(180deg,_#fffaf2_0%,_#f8efe2_100%)] p-4 shadow-[0_20px_36px_rgba(93,68,42,0.10),inset_0_1px_0_rgba(255,255,255,0.55)]">
            <h2 className="mb-3 text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-[#2d2319]">
              {item.name}
            </h2>

            <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-[10px] border border-[#dfcebb] bg-[#f5ebde]">
              <div className="border-r border-[#dfcebb] px-3 py-[10px]">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#9d8a74]">Standard</p>
                <p className="font-['JetBrains_Mono'] text-[14px] font-semibold text-[#2d2319]">
                  {formatItemPrice(item.standard_price)}
                </p>
              </div>

              <div className="border-r border-[#dfcebb] bg-[#f1e3d0] px-3 py-[10px]">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#9d8a74]">Last Sold</p>
                <p className="font-['JetBrains_Mono'] text-[14px] font-semibold text-[#7a5a3f]">
                  {formatItemPrice(item.last_sold_price, 'No sales yet')}
                </p>
              </div>

              <div className="px-3 py-[10px]">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#9d8a74]">Movement</p>
                {!delta || delta.direction === 'flat' ? (
                  <p className="font-['JetBrains_Mono'] text-[14px] text-[#83715e]">-</p>
                ) : (
                  <p className="font-['JetBrains_Mono'] text-[14px] font-semibold text-[#3b2d20]">
                    {delta.direction === 'up' ? '▲' : '▼'} {formatItemPrice(Math.abs(delta.amount))}
                    <span className="ml-1 text-[11px] text-[#86715a]">({Math.abs(delta.pct)}%)</span>
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
          <div className="overflow-hidden rounded-[12px] border border-[#d8c7b1] bg-[#fff8ef] shadow-[0_16px_28px_rgba(95,72,46,0.08),inset_0_1px_0_rgba(255,255,255,0.45)]">
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
            <div className="rounded-[10px] border border-[#e2b8b2] bg-[#fff3ef] px-4 py-3 text-[12px] text-[#a0372d]">
              {error.message || 'Could not load item history.'}
            </div>
          ) : null}

          {!error && historyRows.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-[#d8c6af] bg-[#fff8ef] px-4 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
              <div className="text-[13px] font-semibold text-[#79634f]">No history yet</div>
              <div className="mt-1 text-[11px] text-[#a19079]">
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
