import type { ItemMergeLogRow } from '../types'
import { formatLastUsedDate } from './itemLibraryFormatters'

type ItemLibraryMergeHistoryPanelProps = {
  data: ItemMergeLogRow[]
  loading: boolean
  error: Error | null
}

function MergeLogIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20v-6a2 2 0 0 0-2-2H4" />
      <path d="m7 17-3-3 3-3" />
      <path d="M12 4v6a2 2 0 0 0 2 2h8" />
      <path d="m19 9 3 3-3 3" />
    </svg>
  )
}

export function ItemLibraryMergeHistoryPanel({ data, loading, error }: ItemLibraryMergeHistoryPanelProps) {
  if (loading && data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-bd-app-bg p-6">
        <div className="animate-pulse text-bd-text-muted">Loading history...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-bd-app-bg p-6">
        <div className="max-w-md rounded-xl border border-bd-status-danger-border bg-bd-status-danger-bg px-6 py-7 text-center">
          <div className="text-[12px] font-bold text-bd-status-danger-text">Failed to load merge history</div>
          <p className="mt-2 text-[11px] text-bd-status-danger-text opacity-90">{error.message}</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-bd-app-bg p-6">
        <div className="max-w-sm rounded-2xl border border-bd-border bg-bd-surface px-8 py-10 text-center shadow-lg">
          <div className="flex justify-center text-bd-text-muted opacity-40">
            <MergeLogIcon />
          </div>
          <h2 className="mt-4 text-[18px] font-extrabold text-bd-text">No merge history yet</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-bd-text-muted">
            When you merge duplicate items, the audit trail will appear here. This helps you track which items were consolidated and when.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-bd-app-bg">
      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-bd-border bg-bd-surface p-5 shadow-lg">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">Audit Trail</div>
          <h2 className="mt-1 text-[18px] font-extrabold text-bd-text">Merge History</h2>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-bd-text-muted">
            A permanent record of all item consolidations and catalog cleanups.
          </p>
        </div>

        <div className="space-y-3">
          {data.map((row) => (
            <article key={row.id} className="rounded-lg border border-bd-border bg-bd-surface p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={[
                    "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm border",
                    row.action === 'merge' 
                      ? "bg-bd-status-success-bg text-bd-status-success-text border-bd-status-success-border" 
                      : "bg-bd-status-neutral-bg text-bd-status-neutral-text border-bd-status-neutral-border"
                  ].join(' ')}>
                    {row.action}
                  </span>
                  <span className="text-[11px] font-medium text-bd-text-muted">{formatLastUsedDate(row.created_at)}</span>
                </div>
                <div className="font-mono text-[10px] text-bd-text-muted opacity-60">{row.id.slice(0, 8)}</div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-tight text-bd-text-muted">From Duplicate</div>
                  <div className="truncate text-[13px] font-bold text-bd-status-danger-text">{row.from_item_name || 'Unknown Item'}</div>
                  <div className="font-mono text-[10px] text-bd-text-muted opacity-60">{row.from_item_id}</div>
                </div>

                <div className="text-bd-text-muted opacity-40">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-tight text-bd-text-muted">Into Primary</div>
                  <div className="truncate text-[13px] font-bold text-bd-status-success-text">{row.to_item_name || 'Unknown Item'}</div>
                  <div className="font-mono text-[10px] text-bd-text-muted opacity-60">{row.to_item_id}</div>
                </div>
              </div>

              {row.details && (
                <div className="mt-3 rounded-md border border-bd-border bg-bd-surface-muted p-2">
                   <div className="text-[9px] font-bold uppercase tracking-widest text-bd-text-muted mb-1">Details</div>
                   <div className="flex flex-wrap gap-2">
                     {row.details.relinked_rows && (
                       <span className="text-[11px] text-bd-text">
                         Relinked <strong>{row.details.relinked_rows}</strong> source rows
                       </span>
                     )}
                     {row.details.aliases_added && row.details.aliases_added.length > 0 && (
                       <span className="text-[11px] text-bd-text">
                         Added <strong>{row.details.aliases_added.length}</strong> aliases
                       </span>
                     )}
                   </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
