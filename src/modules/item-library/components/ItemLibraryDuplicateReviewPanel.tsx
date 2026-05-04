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
    <div className="flex h-full items-center justify-center bg-bd-app-bg p-6">
      <div className="max-w-sm rounded-2xl border border-bd-border bg-bd-surface px-6 py-7 text-center shadow-lg">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-bd-text-muted">Possible duplicates</div>
        <div className="mt-2 text-[18px] font-extrabold text-bd-text">Nothing to review right now</div>
        <p className="mt-2 text-[12px] leading-relaxed text-bd-text-muted">
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
    <div className="flex h-full flex-col overflow-hidden bg-bd-app-bg">
      <div className="border-b border-bd-border px-5 py-4">
        <div className="rounded-xl border border-bd-border bg-bd-surface p-4 shadow-lg">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-bd-text-muted">Possible duplicates</div>
          <h2 className="mt-1 text-[18px] font-extrabold text-bd-text">{group.label}</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-bd-text-muted">
            {group.reason} These items may represent the same product or service and are shown here for review only.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-bd-text-muted">
            <span className="rounded-full border border-bd-border bg-bd-surface-muted px-2.5 py-1 font-semibold text-bd-text">
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
