import { ItemLibraryDetailPanel } from './ItemLibraryDetailPanel'
import { ItemLibraryDuplicateMergeCard } from './ItemLibraryDuplicateMergeCard'
import type {
  DuplicateCandidateGroup,
  ItemAlias,
  ItemCatalogItem,
  ItemHistoryRow,
  ItemLibraryMergeRequest,
} from '../types'
import type { CleanupLocalAIJobGroupResult } from '../domain/cleanupLocalAIJob'

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
  aiResult?: CleanupLocalAIJobGroupResult | null
  onInspectItem: (itemId: string) => void
  onKeepSeparate: (request: ItemLibraryMergeRequest) => Promise<void>
  isPairReviewedSeparate?: (leftItemId: string, rightItemId: string) => boolean
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
  aiResult = null,
  onInspectItem,
  onKeepSeparate,
  isPairReviewedSeparate,
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
            {group.reason} This is review evidence, not identity proof. Keep the records separate when the names
            describe different models, ratings, sizes, materials, or applications.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-bd-text-muted">
            <span className="rounded-full border border-bd-border bg-bd-surface-muted px-2.5 py-1 font-semibold text-bd-text">
              {group.members.length} similar names
            </span>
            <span>Inspect the differences, choose one primary item only when they are true duplicates, or leave them separate.</span>
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
          onKeepSeparate={onKeepSeparate}
          isPairReviewedSeparate={isPairReviewedSeparate}
          onMerge={onMerge}
        />

        {aiResult ? (
          <section className="mt-4 rounded-xl border border-bd-border bg-bd-surface p-4 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">AI suggestion</div>
                <h3 className="mt-1 text-[15px] font-extrabold text-bd-text">
                  {aiResult.status === 'ready'
                    ? 'Ready for human approval'
                    : aiResult.status === 'unsure'
                      ? 'Needs human attention'
                      : aiResult.status === 'failed'
                        ? 'AI review failed'
                        : 'Review before action'}
                </h3>
              </div>
              <span className="rounded-full border border-bd-border bg-bd-surface-muted px-2.5 py-1 text-[10px] font-bold capitalize text-bd-text-muted">
                {aiResult.status}
              </span>
            </div>
            {aiResult.proposals.map((proposal) => (
              <div key={`${aiResult.group_id}-${proposal.decision}`} className="mt-3 rounded-lg border border-bd-border bg-bd-surface-muted p-3">
                <div className="text-[12px] font-bold text-bd-text">{proposal.decision.replace('_', ' ')}</div>
                <p className="mt-1 text-[12px] leading-relaxed text-bd-text-muted">{proposal.reason}</p>
              </div>
            ))}
            {aiResult.errors.length ? (
              <details className="mt-3 rounded-md border border-bd-status-warning-border bg-bd-status-warning-bg px-3 py-2 text-[11px] font-semibold text-bd-status-warning-text">
                <summary className="cursor-pointer">Details</summary>
                <div className="mt-1 font-mono">{aiResult.errors.join(' ')}</div>
              </details>
            ) : null}
          </section>
        ) : null}

      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ItemLibraryDetailPanel item={item} historyRows={historyRows} loading={loading} error={error} />
      </div>
    </div>
  )
}
