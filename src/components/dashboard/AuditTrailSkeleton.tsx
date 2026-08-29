import * as React from 'react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatDisplayDate } from '@/lib/formatters/date'
import { cn } from '@/lib/utils'

// V6 audit trail: timeline dots with descriptions
// Shows recent document activity in a compact timeline format

function AuditRow({
  text,
  meta,
  variant = 'primary',
}: {
  text: string
  meta: string
  variant?: 'primary' | 'copper'
}) {
  return (
    <div className="flex gap-[8px] border-t border-[hsl(var(--line))] py-[9px] first:border-t-0">
      {/* V6 timeline dot */}
      <div
        className={cn(
          'mt-[3px] h-[6px] w-[6px] shrink-0 rounded-full',
          variant === 'primary'
            ? 'bg-[hsl(var(--primary))] shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]'
            : 'bg-[hsl(var(--secondary))] shadow-[0_0_0_3px_hsl(var(--secondary)/0.13)]',
        )}
      />
      <div>
        <div className="text-[9px] font-[700] leading-[1.25] text-[hsl(var(--ink))]">
          {text}
        </div>
        <div className="mt-[2px] text-[7px] text-[hsl(var(--ink-3))]">
          {meta}
        </div>
      </div>
    </div>
  )
}

function AuditTrailLoadingSkeleton() {
  return (
    <div className="px-[11px]">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex gap-[8px] border-t border-[hsl(var(--line))] py-[9px] first:border-t-0"
        >
          <div className="mt-[3px] h-[6px] w-[6px] shrink-0 rounded-full bg-[hsl(var(--surface-muted))]" />
          <div className="flex-1">
            <div className="h-2.5 w-48 rounded bg-[hsl(var(--surface-muted))]/80" />
            <div className="mt-1.5 h-2 w-24 rounded bg-[hsl(var(--surface-muted))]/60" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AuditTrailSkeleton() {
  const { loading, recentDocs } = useDashboardData()

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[18px] border border-[hsl(var(--line))] bg-[hsl(var(--surface))] shadow-md">
        <AuditTrailLoadingSkeleton />
      </div>
    )
  }

  // Build audit trail from recent document activity
  const auditEntries = recentDocs.slice(0, 5).map((doc) => {
    const dateText = formatDisplayDate(doc.date, {
      fallback: '',
      locale: 'en-GB',
      dateOptions: { weekday: 'long', hour: 'numeric', minute: '2-digit' },
    })

    return {
      id: `${doc.type}-${doc.id}`,
      text: `${doc.number} — ${doc.client || 'Unknown client'}`,
      meta: dateText || 'Recent activity',
      variant: (doc.type === 'Quotation' ? 'copper' : 'primary') as 'primary' | 'copper',
    }
  })

  // Fallback entries if no recent docs
  const fallbackEntries = [
    { id: 'welcome-1', text: 'Dashboard initialized', meta: 'System startup', variant: 'primary' as const },
    { id: 'welcome-2', text: 'Workspace synced', meta: 'Data refresh complete', variant: 'copper' as const },
  ]

  const entries = auditEntries.length > 0 ? auditEntries : fallbackEntries

  return (
    <div className="overflow-hidden rounded-[18px] border border-[hsl(var(--line))] bg-[hsl(var(--surface))] shadow-md"
      style={{
        boxShadow: '0 12px 28px color-mix(in srgb, var(--primary) 8%, transparent), 0 2px 6px rgba(15,23,42,.04)',
      }}
    >
      <div className="px-[11px]">
        {entries.map((entry) => (
          <AuditRow
            key={entry.id}
            text={entry.text}
            meta={entry.meta}
            variant={entry.variant}
          />
        ))}
      </div>
    </div>
  )
}
