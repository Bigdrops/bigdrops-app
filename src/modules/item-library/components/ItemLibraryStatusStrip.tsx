import type { DuplicateCandidateGroup, FlaggedCleanupExportPayload } from '../types'

type ItemLibraryStatusStripProps = {
  totalItems: number
  duplicateGroups: DuplicateCandidateGroup[]
  flaggedCleanupExport: FlaggedCleanupExportPayload
  mergeHistoryCount?: number
  loading?: boolean
}

export function ItemLibraryStatusStrip({
  totalItems,
  duplicateGroups,
  flaggedCleanupExport,
  mergeHistoryCount = 0,
  loading = false,
}: ItemLibraryStatusStripProps) {
  const duplicateCount = duplicateGroups.length
  const proposalCount = flaggedCleanupExport.scope.group_count

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))]/50 px-5 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--bd-text-muted))]">Active Items</span>
        <span className="font-['JetBrains_Mono'] text-[12px] font-bold text-[hsl(var(--bd-text))]">
          {loading ? '-' : totalItems.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--bd-text-muted))]">Duplicate Groups</span>
        <span className={[
          "font-['JetBrains_Mono'] text-[12px] font-bold",
          duplicateCount > 0 ? "text-[hsl(var(--bd-status-warning-text))]" : "text-[hsl(var(--bd-text))]"
        ].join(' ')}>
          {loading ? '-' : duplicateCount.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--bd-text-muted))]">Cleanup Proposals</span>
        <span className={[
          "font-['JetBrains_Mono'] text-[12px] font-bold",
          proposalCount > 0 ? "text-[hsl(var(--bd-status-warning-text))]" : "text-[hsl(var(--bd-text))]"
        ].join(' ')}>
          {loading ? '-' : proposalCount.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--bd-text-muted))]">Merge History</span>
        <span className="font-['JetBrains_Mono'] text-[12px] font-bold text-[hsl(var(--bd-text))]">
          {loading ? '-' : mergeHistoryCount.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
