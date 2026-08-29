import * as React from 'react'
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
    <div className="flex gap-[8px] border-t border-[hsl(var(--line))] py-[9px] first:border-t-0 md:py-3">
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
      <div className="overflow-hidden rounded-[18px] border border-[hsl(var(--line))] bg-[hsl(var(--surface))] shadow-md">
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

  // Fallback V6 entries if no events found in the database
  const fallbackEntries = [
    { id: 'welcome-1', text: 'INV-0045 created by Milad', meta: 'Today, 10:32 AM', variant: 'primary' as const },
    { id: 'welcome-2', text: 'INV-0042 overdue reminder sent', meta: 'Today, 09:15 AM', variant: 'primary' as const },
    { id: 'welcome-3', text: 'QTN-0108 accepted by client', meta: 'Yesterday, 4:20 PM', variant: 'copper' as const },
  ]

  const entries = auditEntries.length > 0 ? auditEntries : fallbackEntries

  return (
    <div className="overflow-hidden rounded-[18px] border border-[hsl(var(--line))] bg-[hsl(var(--surface))] shadow-md"
      style={{
        boxShadow: '0 12px 28px color-mix(in srgb, var(--primary) 8%, transparent), 0 2px 6px rgba(15,23,42,.04)',
      }}
    >
      <div className="px-[11px] md:px-4">
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
