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
      <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,_#efe5d7_0%,_#e8dccb_100%)] p-6">
        <div className="animate-pulse text-[#8b7863]">Loading history...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,_#efe5d7_0%,_#e8dccb_100%)] p-6">
        <div className="max-w-md rounded-[18px] border border-[#e4c3ba] bg-[#fff2ee] px-6 py-7 text-center">
          <div className="text-[12px] font-bold text-[#8f3f35]">Failed to load merge history</div>
          <p className="mt-2 text-[11px] text-[#9a4a3f]">{error.message}</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,_#efe5d7_0%,_#e8dccb_100%)] p-6">
        <div className="max-w-sm rounded-[24px] border border-[#d6c2a8] bg-[#fffaf1] px-8 py-10 text-center shadow-[0_20px_40px_rgba(95,72,46,0.06)]">
          <div className="flex justify-center text-[#c8b59f]">
            <MergeLogIcon />
          </div>
          <h2 className="mt-4 text-[18px] font-extrabold text-[#2f2419]">No merge history yet</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-[#8b7863]">
            When you merge duplicate items, the audit trail will appear here. This helps you track which items were consolidated and when.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[linear-gradient(180deg,_#efe5d7_0%,_#e8dccb_100%)]">
      <div className="space-y-4 p-5">
        <div className="rounded-[18px] border border-[#d6c2a8] bg-[linear-gradient(180deg,_#fff9f1_0%,_#f7ecde_100%)] p-5 shadow-[0_20px_36px_rgba(93,68,42,0.10)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#947d63]">Audit Trail</div>
          <h2 className="mt-1 text-[18px] font-extrabold text-[#2f2419]">Merge History</h2>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#8b7863]">
            A permanent record of all item consolidations and catalog cleanups.
          </p>
        </div>

        <div className="space-y-3">
          {data.map((row) => (
            <article key={row.id} className="rounded-[14px] border border-[#d7c3aa] bg-[#fffaf3] p-4 shadow-[0_12px_24px_rgba(96,72,45,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={[
                    "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm border",
                    row.action === 'merge' ? "bg-[#e8f1e0] text-[#4a6b35] border-[#c9d9bd]" : "bg-[#f3eadf] text-[#7c6954] border-[#d7c7b3]"
                  ].join(' ')}>
                    {row.action}
                  </span>
                  <span className="text-[11px] font-medium text-[#aa9882]">{formatLastUsedDate(row.created_at)}</span>
                </div>
                <div className="font-['JetBrains_Mono'] text-[10px] text-[#c8b59f]">{row.id.slice(0, 8)}</div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-tight text-[#98826a]">From Duplicate</div>
                  <div className="truncate text-[13px] font-bold text-[#8b4d47]">{row.from_item_name || 'Unknown Item'}</div>
                  <div className="font-['JetBrains_Mono'] text-[10px] text-[#c8b59f]">{row.from_item_id}</div>
                </div>

                <div className="text-[#c8b59f]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-tight text-[#98826a]">Into Primary</div>
                  <div className="truncate text-[13px] font-bold text-[#47624a]">{row.to_item_name || 'Unknown Item'}</div>
                  <div className="font-['JetBrains_Mono'] text-[10px] text-[#c8b59f]">{row.to_item_id}</div>
                </div>
              </div>

              {row.details && (
                <div className="mt-3 rounded-[10px] border border-[#dfd1c0] bg-[#fbf6ee] p-2">
                   <div className="text-[9px] font-bold uppercase tracking-widest text-[#aa9882] mb-1">Details</div>
                   <div className="flex flex-wrap gap-2">
                     {row.details.relinked_rows && (
                       <span className="text-[11px] text-[#6b5038]">
                         Relinked <strong>{row.details.relinked_rows}</strong> source rows
                       </span>
                     )}
                     {row.details.aliases_added && row.details.aliases_added.length > 0 && (
                       <span className="text-[11px] text-[#6b5038]">
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
