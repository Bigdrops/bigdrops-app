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
  old_data?: Record<string, unknown> | null
  new_data?: Record<string, unknown> | null
  reason?: string | null
  created_at?: string | null
}

export interface AuditTrailChange {
  field: string
  label: string
  oldValue: string
  newValue: string
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
