import { ChevronDown, ChevronRight, Clock3 } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import type { AuditTrailEntry } from '@/domain/audit/auditTypes'
import { cn } from '@/lib/utils'

interface AuditTrailItemProps {
  entry: AuditTrailEntry
}

export default function AuditTrailItem({ entry }: AuditTrailItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showFullFields, setShowFullFields] = useState<Record<string, boolean>>({})

  const toggleFullField = (fieldKey: string) => {
    setShowFullFields((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }))
  }

  const changedFieldsLabel = entry.changes.length > 0
    ? `Changed ${entry.changes.length} field${entry.changes.length === 1 ? '' : 's'}: ${entry.changes.map((c) => c.label).join(', ')}`
    : 'No fields changed'

  return (
    <article
      data-audit-action={String(entry.action || '').toLowerCase()}
      className="relative rounded-2xl border border-border/70 bg-background/70 p-4 transition-colors hover:bg-muted/20"
    >
      <div className="absolute left-0 top-0 h-full w-px bg-border/70" aria-hidden="true" />
      <div className="absolute -left-[5px] top-5 h-2.5 w-2.5 rounded-full border border-border bg-background" aria-hidden="true" />

      <div className="flex flex-col gap-3 pl-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <span className="min-w-0 break-words text-sm font-semibold text-foreground">{entry.actorLabel}</span>
            <Badge variant="outline" className="shrink-0 border-border/70 bg-muted/40 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {String(entry.action || 'update').replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{entry.actionLabel}</p>
          
          <div className="mt-2 text-xs font-medium text-muted-foreground/80">
            {changedFieldsLabel}
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start sm:gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">{entry.timestamp}</span>
          </div>

          {entry.changes.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              {isExpanded ? 'Hide changes' : 'View changes'}
              {isExpanded ? (
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {isExpanded && entry.changes.length > 0 ? (
        <div className="mt-4 space-y-2.5 pl-4">
          {entry.changes.map((change) => {
            const fieldKey = `${entry.id}-${change.field}`
            const isTruncated = !!(change.oldValueFull || change.newValueFull)
            const showingFull = showFullFields[fieldKey]

            return (
              <div key={fieldKey} className="rounded-xl border border-border/60 bg-card/60 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {change.label}
                  </div>
                  {isTruncated && (
                    <button
                      onClick={() => toggleFullField(fieldKey)}
                      className="text-[10px] font-medium text-primary hover:underline"
                    >
                      {showingFull ? 'Show preview' : 'Show full text'}
                    </button>
                  )}
                </div>
                <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-[1fr,auto,1fr] sm:items-center">
                  <div className={cn('text-sm text-muted-foreground/70', !showingFull && 'line-clamp-3')}>
                    {showingFull && change.oldValueFull ? change.oldValueFull : change.oldValue}
                  </div>
                  <div className="hidden sm:block">
                    <span className="px-2 text-muted-foreground/50">→</span>
                  </div>
                  <div className={cn('text-sm font-medium text-foreground', !showingFull && 'line-clamp-3')}>
                    {showingFull && change.newValueFull ? change.newValueFull : change.newValue}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </article>
  )
}
