import { ChevronDown, History } from 'lucide-react'
import { useState } from 'react'

import AuditTrailItem from '@/components/audit/AuditTrailItem'
import { SkeletonCard } from '@/components/loading/AppLoadingStates'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { AuditEntityType } from '@/domain/audit/auditTypes'
import { cn } from '@/lib/utils'
import useAuditTrail from '@/hooks/useAuditTrail'

interface AuditTrailPanelProps {
  entityType: AuditEntityType
  entityId?: string | null
  defaultOpen?: boolean
  className?: string
}

export default function AuditTrailPanel({
  entityType,
  entityId,
  defaultOpen = false,
  className,
}: AuditTrailPanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const { entries, loading, error } = useAuditTrail({
    entityType,
    entityId,
    enabled: open,
  })

  return (
    <section className={cn('rounded-[24px] border border-border bg-card shadow-sm', className)}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/20 sm:px-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <History className="h-4 w-4" aria-hidden="true" />
              <span>Activity &amp; History</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Track who changed this document and when.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span>{open ? 'Hide' : 'Show'}</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', open ? 'rotate-180' : '')} aria-hidden="true" />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="border-t border-border/70 px-4 py-4 sm:px-5">
          {loading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
              {error}
            </div>
          ) : null}

          {!loading && !error && entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-5 text-sm text-muted-foreground">
              No history recorded yet.
            </div>
          ) : null}

          {!loading && !error && entries.length > 0 ? (
            <div className="space-y-3 pl-2">
              {entries.map((entry) => (
                <AuditTrailItem key={entry.id} entry={entry} />
              ))}
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
