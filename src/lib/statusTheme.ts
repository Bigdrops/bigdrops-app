/**
 * BigDrops Status Theme System
 * Centralizes mapping of business statuses to semantic tones and CSS variables.
 */

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/**
 * Maps a raw status string to a semantic tone.
 */
export function getStatusTone(status: string | null | undefined): StatusTone {
  const normalized = (status || '').toLowerCase().trim().replace(/\s+/g, '_')
  
  if (!normalized) return 'neutral'

  // Success
  if ([
    'paid', 
    'delivered', 
    'converted', 
    'filed', 
    'completed', 
    'success', 
    'approved'
  ].includes(normalized)) return 'success'

  // Warning
  if ([
    'partial', 
    'partially_paid', 
    'dispatched', 
    'in_progress', 
    'pending_action', 
    'warning',
    'on_hold'
  ].includes(normalized)) return 'warning'

  // Danger
  if ([
    'overdue', 
    'past_due',
    'rejected', 
    'cancelled', 
    'canceled',
    'failed', 
    'error', 
    'voided',
    'void',
    'deleted'
  ].includes(normalized)) return 'danger'

  // Info
  if ([
    'open', 
    'pending', 
    'in_transit', 
    'active', 
    'info', 
    'unpaid'
  ].includes(normalized)) return 'info'

  // Neutral
  return 'neutral'
}

/**
 * Returns Tailwind arbitrary value classes referencing status tokens.
 */
export function getStatusClasses(tone: StatusTone): string {
  return `bg-[hsl(var(--bd-status-${tone}-bg))] text-[hsl(var(--bd-status-${tone}-text))] border-[hsl(var(--bd-status-${tone}-border))] border`
}
