import * as React from 'react'

function AuditRowSkeleton() {
  return (
    <div className="flex items-start gap-3 border-t border-border px-4 py-3 first:border-t-0">
      <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/30" />
      <div className="min-w-0 flex-1">
        <div className="h-3.5 w-40 rounded bg-muted/80" />
        <div className="mt-2 h-3 w-56 rounded bg-muted/60" />
      </div>
      <div className="h-3 w-16 rounded bg-muted/60" />
    </div>
  )
}

export function AuditTrailSkeleton() {
  return (
    <section className="rounded-[var(--bd-radius-xl)] border border-border bg-card px-4 py-4 shadow-sm md:px-5">
      <div className="mb-3">
        <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
          Audit Trail
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          Placeholder only. No live audit aggregation is wired here yet.
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--bd-radius-lg)] border border-border bg-background/60">
        <AuditRowSkeleton />
        <AuditRowSkeleton />
        <AuditRowSkeleton />
      </div>
    </section>
  )
}
