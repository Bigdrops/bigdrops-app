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
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[#ddd0bf] bg-[#f8f1e6]/50 px-5 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a866f]">Active Items</span>
        <span className="font-['JetBrains_Mono'] text-[12px] font-bold text-[#2f2419]">
          {loading ? '-' : totalItems.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a866f]">Duplicate Groups</span>
        <span className={[
          "font-['JetBrains_Mono'] text-[12px] font-bold",
          duplicateCount > 0 ? "text-[#a06d2b]" : "text-[#2f2419]"
        ].join(' ')}>
          {loading ? '-' : duplicateCount.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a866f]">Cleanup Proposals</span>
        <span className={[
          "font-['JetBrains_Mono'] text-[12px] font-bold",
          proposalCount > 0 ? "text-[#a06d2b]" : "text-[#2f2419]"
        ].join(' ')}>
          {loading ? '-' : proposalCount.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9a866f]">Merge History</span>
        <span className="font-['JetBrains_Mono'] text-[12px] font-bold text-[#2f2419]">
          {loading ? '-' : mergeHistoryCount.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
