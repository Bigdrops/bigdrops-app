export type AuditEntityType = 'invoice' | 'quotation' | 'project'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'LINK'
  | 'UNLINK'
  | 'PAYMENT_RECORDED'
  | string

export interface AuditLogRecord {
  id: string
  entity_type: AuditEntityType | string
  entity_id: string
  entity_label?: string | null
  action: AuditAction
  actor_id?: string | null
  actor_label?: string | null
  source?: string | null
  scope_type?: string | null
  created_at?: string | null
  changes?: Array<{ field: string; old: unknown; new: unknown }> | null
  metadata?: Record<string, unknown> | null
  reason?: string | null
}

export interface AuditTrailChange {
  field: string
  label: string
  oldValue: string
  newValue: string
  oldValueFull?: string
  newValueFull?: string
}

export interface AuditTrailEntry {
  id: string
  action: AuditAction
  actionLabel: string
  actorLabel: string
  timestamp: string
  rawTimestamp?: string | null
  changes: AuditTrailChange[]
}
