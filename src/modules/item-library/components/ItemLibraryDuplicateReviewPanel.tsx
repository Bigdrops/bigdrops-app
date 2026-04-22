import { ItemLibraryDetailPanel } from './ItemLibraryDetailPanel'
import { formatCompactUsageCount, formatItemPrice, formatLastUsedDate } from './itemLibraryFormatters'
import type {
  DuplicateCandidateGroup,
  ItemCatalogItem,
  ItemHistoryRow,
} from '../types'

type ItemLibraryDuplicateReviewPanelProps = {
  group: DuplicateCandidateGroup | null
  item: ItemCatalogItem | null
  historyRows: ItemHistoryRow[]
  loading: boolean
  error: Error | null
  onInspectItem: (itemId: string) => void
}

function EmptyDuplicateState() {
  return (
    <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,_#efe5d7_0%,_#e8dccb_100%)] p-6">
      <div className="max-w-sm rounded-[18px] border border-[#d8c7b2] bg-[#fff8ef] px-6 py-7 text-center shadow-[0_16px_28px_rgba(95,72,46,0.08)]">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98836b]">Possible duplicates</div>
        <div className="mt-2 text-[18px] font-extrabold text-[#2e241a]">Nothing to review right now</div>
        <p className="mt-2 text-[12px] leading-relaxed text-[#8f7d68]">
          We could not find any strong first-pass duplicate candidates in the current item list.
        </p>
      </div>
    </div>
  )
}

export function ItemLibraryDuplicateReviewPanel({
  group,
  item,
  historyRows,
  loading,
  error,
  onInspectItem,
}: ItemLibraryDuplicateReviewPanelProps) {
  if (!group) {
    return <EmptyDuplicateState />
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,_#efe5d7_0%,_#e8dccb_100%)]">
      <div className="border-b border-[#d8c6af] px-5 py-4">
        <div className="rounded-[16px] border border-[#d2bea3] bg-[linear-gradient(180deg,_#fff9f1_0%,_#f6ebdc_100%)] p-4 shadow-[0_18px_30px_rgba(92,68,41,0.08)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#967f65]">Possible duplicates</div>
          <h2 className="mt-1 text-[18px] font-extrabold text-[#2f2419]">{group.label}</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-[#8c7963]">
            {group.reason} These items may represent the same product or service and are shown here for review only.
          </p>

          <div className="mt-4 grid gap-2">
            {group.members.map((member) => {
              const isActive = item?.item_id === member.item_id
              return (
                <button
                  key={member.item_id}
                  type="button"
                  onClick={() => onInspectItem(member.item_id)}
                  className={[
                    'rounded-[12px] border px-3 py-2 text-left transition-all duration-150',
                    isActive
                      ? 'border-[#b48a60] bg-[#ead6bc] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]'
                      : 'border-[#ddd0bf] bg-[#fffaf3] hover:bg-[#f8eee0]',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-semibold text-[#31261b]">{member.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[#8b7761]">
                        <span>{formatCompactUsageCount(member.usage_count)}</span>
                        <span>•</span>
                        <span>{formatLastUsedDate(member.last_used_at)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-['JetBrains_Mono'] text-[11px] font-semibold text-[#5f4a36]">
                        {formatItemPrice(member.last_sold_price, 'No sales yet')}
                      </div>
                      <div className="mt-1 text-[10px] text-[#9b8872]">{member.item_id}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ItemLibraryDetailPanel item={item} historyRows={historyRows} loading={loading} error={error} />
      </div>
    </div>
  )
}
