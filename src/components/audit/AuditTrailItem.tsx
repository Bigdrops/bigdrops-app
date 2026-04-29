import { Clock3 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

import type { AuditTrailEntry } from '@/domain/audit/auditTypes'

interface AuditTrailItemProps {
  entry: AuditTrailEntry
}

export default function AuditTrailItem({ entry }: AuditTrailItemProps) {
  return (
    <article
      data-audit-action={String(entry.action || '').toLowerCase()}
      className="relative rounded-2xl border border-border/70 bg-background/70 p-4 transition-colors hover:bg-muted/20"
    >
      <div className="absolute left-0 top-0 h-full w-px bg-border/70" aria-hidden="true" />
      <div className="absolute -left-[5px] top-5 h-2.5 w-2.5 rounded-full border border-border bg-background" aria-hidden="true" />

      <div className="flex flex-wrap items-start justify-between gap-3 pl-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{entry.actorLabel}</span>
            <Badge variant="outline" className="border-border/70 bg-muted/40 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {String(entry.action || 'update').replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{entry.actionLabel}</p>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{entry.timestamp}</span>
        </div>
      </div>

      {entry.changes.length ? (
        <div className="mt-3 space-y-2 pl-4">
          {entry.changes.map((change) => (
            <div key={`${entry.id}-${change.field}`} className="rounded-xl border border-border/60 bg-card/60 px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {change.label}
              </div>
              <div className="mt-1 text-sm text-foreground">
                <span>{change.oldValue}</span>
                <span className="px-2 text-muted-foreground">→</span>
                <span>{change.newValue}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  )
}
