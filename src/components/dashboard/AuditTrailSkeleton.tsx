import * as React from 'react'
import { History } from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { cn } from '@/lib/utils'

// V6 audit trail: timeline dots with descriptions
// Shows recent activity events in a compact timeline format

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
    <div className="flex gap-[8px] border-t border-[hsl(var(--bd-border))/60] py-[9px] first:border-t-0 md:py-3">
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
        <div className="text-[9px] font-[700] leading-[1.25] text-[hsl(var(--ink))] md:text-[11px]">
          {text}
        </div>
        <div className="mt-[2px] text-[7px] text-[hsl(var(--ink-3))] md:text-[9px]">
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
          className="flex gap-[8px] border-t border-[hsl(var(--bd-border))/60] py-[9px] first:border-t-0"
        >
          <div className="mt-[3px] h-[6px] w-[6px] shrink-0 rounded-full bg-[hsl(var(--bd-ink-muted))]" />
          <div className="flex-1">
            <div className="h-2.5 w-48 rounded bg-[hsl(var(--bd-ink-muted))]/80" />
            <div className="mt-1.5 h-2 w-24 rounded bg-[hsl(var(--bd-ink-muted))]/60" />
          </div>
        </div>
      ))}
    </div>
  )
}

function formatEventTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Recent activity'
  try {
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return 'Recent activity'
    const now = new Date()
    
    // Check if today
    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
      
    // Check if yesterday
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday = date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    if (isToday) {
      return `Today, ${timeStr}`
    }
    if (isYesterday) {
      return `Yesterday, ${timeStr}`
    }
    
    return date.toLocaleDateString('en-GB', { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return 'Recent activity'
  }
}

function formatEventText(entry: any): string {
  const label = entry.entity_label || 'Document'
  const actor = entry.actor_label ? entry.actor_label.split('@')[0] : 'Operator'
  const event = String(entry.event_type || '').toUpperCase()

  if (event === 'CREATED') {
    if (entry.entity_type === 'Quotation') return `${label} created by ${actor}`
    if (entry.entity_type === 'Invoice') return `${label} created by ${actor}`
    if (entry.entity_type === 'CSR') return `${label} logged by ${actor}`
    if (entry.entity_type === 'Waybill') return `${label} created by ${actor}`
    if (entry.entity_type === 'Project') return `Project "${label}" created by ${actor}`
    return `${label} created by ${actor}`
  }

  if (event === 'STATUS_CHANGED') {
    const nextStatus = entry.metadata?.status || 'new status'
    return `${label} status changed to ${nextStatus} by ${actor}`
  }

  if (event === 'PAYMENT_RECORDED') {
    return `Payment recorded for ${label} by ${actor}`
  }

  if (event === 'PAYMENT_VOIDED') {
    return `Payment voided for ${label} by ${actor}`
  }

  if (event === 'LINKED') {
    return `${label} linked to project by ${actor}`
  }

  if (event === 'UNLINKED') {
    return `${label} unlinked from project by ${actor}`
  }

  // Fallback readable action description
  return `${label} — ${event.toLowerCase().replace(/_/g, ' ')} by ${actor}`
}

export function AuditTrailSkeleton() {
  const { loading, activityEvents } = useDashboardData()

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[18px] bg-[hsl(var(--surface))] px-[11px] shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_8%,transparent),inset_0_1px_rgba(255,255,255,0.18)]">
        <AuditTrailLoadingSkeleton />
      </div>
    )
  }

  // Build audit trail from real activity events
  const auditEntries = (activityEvents || []).slice(0, 5).map((entry) => {
    const text = formatEventText(entry)
    const meta = formatEventTime(entry.created_at)
    
    // Choose dot color: Quotation/CSR/Waybill vs Invoice/Project
    const isSecondary = ['Quotation', 'CSR', 'Waybill'].includes(entry.entity_type)

    return {
      id: entry.id,
      text,
      meta,
      variant: (isSecondary ? 'copper' : 'primary') as 'primary' | 'copper',
    }
  })

  if (auditEntries.length === 0) {
    return (
      <div className="overflow-hidden rounded-[18px] bg-[hsl(var(--surface))] shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_8%,transparent),inset_0_1px_rgba(255,255,255,0.18)]">
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <div className="grid h-[58px] w-[58px] place-items-center rounded-[20px] bg-[hsl(var(--primary)/0.1)]">
            <History className="size-[26px] text-[hsl(var(--primary))]" strokeWidth={1.5} />
          </div>
          <div className="mt-4 text-[16px] font-[800] tracking-[-0.05em] text-[hsl(var(--bd-ink))]">
            No audit trail yet
          </div>
          <div className="mt-1 max-w-[200px] text-[10px] leading-[1.45] text-[hsl(var(--bd-ink-muted))]">
            Activity on your documents will appear here
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[18px] bg-[hsl(var(--surface))] px-[11px] shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_8%,transparent),inset_0_1px_rgba(255,255,255,0.18)]"
    >
      <div className="px-[11px] md:px-4">
        {auditEntries.map((entry) => (
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
