import { CheckCircle2, ChevronRight, FileJson, Sparkles } from 'lucide-react'
import type { FlaggedCleanupBatch } from '../types'

interface ItemLibraryCleanupBatchCardProps {
  batch: FlaggedCleanupBatch
  onClick: () => void
}

export function ItemLibraryCleanupBatchCard({ batch, onClick }: ItemLibraryCleanupBatchCardProps) {
  const isApplied = batch.status === 'applied'
  const isReady = batch.status === 'ready_to_apply'
  const isImported = batch.status === 'review_imported'

  return (
    <button
      onClick={onClick}
      className="group flex w-full flex-col gap-3 rounded-[18px] border border-[#d6c2a8] bg-[#fffaf5] p-5 text-left transition-all hover:border-[#8c6a45] hover:shadow-[0_12px_24px_rgba(88,67,41,0.08)] active:scale-[0.99]"
    >
      <div className="flex w-full items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#a06d2b]">
              {batch.batch_id}
            </span>
            {isApplied && (
              <span className="flex items-center gap-1 rounded-full bg-[#eef6ec] px-2 py-0.5 text-[9px] font-bold text-[#3e7d34]">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Applied
              </span>
            )}
            {isReady && (
              <span className="rounded-full bg-[#fff4e5] px-2 py-0.5 text-[9px] font-bold text-[#b45309]">
                Ready to apply
              </span>
            )}
            {isImported && (
              <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[9px] font-bold text-[#4338ca]">
                Review imported
              </span>
            )}
          </div>
          <h3 className="text-[16px] font-extrabold text-[#2c2218] group-hover:text-[#8c6a45] transition-colors">
            {batch.title}
          </h3>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f8f1e6] text-[#8c6a45] transition-colors group-hover:bg-[#8c6a45] group-hover:text-white">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8b7761]">
          <FileJson className="h-3.5 w-3.5 opacity-60" />
          {batch.group_count} groups
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8b7761]">
          <Sparkles className="h-3.5 w-3.5 opacity-60" />
          {batch.item_count} items
        </div>
      </div>
    </button>
  )
}
