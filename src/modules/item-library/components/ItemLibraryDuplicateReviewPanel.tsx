import { ItemLibraryDetailPanel } from './ItemLibraryDetailPanel'
import { ItemLibraryDuplicateMergeCard } from './ItemLibraryDuplicateMergeCard'
import type {
  DuplicateCandidateGroup,
  ItemAlias,
  ItemCatalogItem,
  ItemHistoryRow,
  ItemLibraryMergeRequest,
} from '../types'

type ItemLibraryDuplicateReviewPanelProps = {
  aliases: ItemAlias[]
  aliasesError: Error | null
  aliasesLoading: boolean
  group: DuplicateCandidateGroup | null
  item: ItemCatalogItem | null
  historyRows: ItemHistoryRow[]
  loading: boolean
  error: Error | null
  mergeLoading: boolean
  onInspectItem: (itemId: string) => void
  onMerge: (request: ItemLibraryMergeRequest) => Promise<void>
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
  aliases,
  aliasesError,
  aliasesLoading,
  group,
  item,
  historyRows,
  loading,
  error,
  mergeLoading,
  onInspectItem,
  onMerge,
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
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-[#8d7a65]">
            <span className="rounded-full border border-[#d5c0a4] bg-[#f0e0ca] px-2.5 py-1 font-semibold text-[#694f36]">
              {group.members.length} similar names
            </span>
            <span>Choose one primary item, then review the merge preview before applying.</span>
          </div>
        </div>

        <ItemLibraryDuplicateMergeCard
          aliases={aliases}
          aliasesError={aliasesError}
          aliasesLoading={aliasesLoading}
          group={group}
          inspectedItemId={item?.item_id || null}
          mergeLoading={mergeLoading}
          onInspectItem={onInspectItem}
          onMerge={onMerge}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ItemLibraryDetailPanel item={item} historyRows={historyRows} loading={loading} error={error} />
      </div>
    </div>
  )
}
