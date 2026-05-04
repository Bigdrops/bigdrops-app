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
      className="group flex w-full flex-col gap-3 rounded-xl border border-bd-border bg-bd-surface p-5 text-left transition-all hover:border-bd-border-strong hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex w-full items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">
              {batch.batch_id}
            </span>
            {isApplied && (
              <span className="flex items-center gap-1 rounded-full bg-bd-status-success-bg px-2 py-0.5 text-[9px] font-bold text-bd-status-success-text border border-bd-status-success-border">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Applied
              </span>
            )}
            {isReady && (
              <span className="rounded-full bg-bd-status-warning-bg px-2 py-0.5 text-[9px] font-bold text-bd-status-warning-text border border-bd-status-warning-border">
                Ready to apply
              </span>
            )}
            {isImported && (
              <span className="rounded-full bg-bd-status-info-bg px-2 py-0.5 text-[9px] font-bold text-bd-status-info-text border border-bd-status-info-border">
                Review imported
              </span>
            )}
          </div>
          <h3 className="text-[16px] font-extrabold text-bd-text group-hover:text-bd-button-primary-bg transition-colors">
            {batch.title}
          </h3>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bd-surface-muted text-bd-text-muted transition-colors group-hover:bg-bd-button-primary-bg group-hover:text-bd-button-primary-text">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-bd-text-muted">
          <FileJson className="h-3.5 w-3.5 opacity-60" />
          {batch.group_count} groups
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-bd-text-muted">
          <Sparkles className="h-3.5 w-3.5 opacity-60" />
          {batch.item_count} items
        </div>
      </div>
    </button>
  )
}
