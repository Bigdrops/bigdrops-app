export type AuditEntityType =
  | 'invoice'
  | 'quotation'
  | 'project'
  | 'csr'
  | 'waybill'
  | 'letter'
  | 'cps_sheets'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ARCHIVE'
  | 'UNARCHIVE'
  | 'STATUS_CHANGE'
  | 'LINK'
  | 'UNLINK'
  | 'CONVERT'
  | 'DUPLICATE'
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

/**
 * Actor class for an audit event. Distinguishes a direct user action from a
 * system or automatic consequence. Phase 1 records user and system actors.
 * `automated-feedback` and `admin` are reserved for the Phase 3 feedback
 * contract and for migrations.
 */
export type AuditActorType = 'user' | 'system' | 'automated-feedback' | 'admin'

/**
 * A CPS event kind. Direct edits use UPDATED. Lifecycle events use the other
 * values. The event kind is not derived from the generic action alone because
 * one action can cover different business meanings.
 */
export type CpsAuditEventType =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGED'
  | 'CONVERTED_TO_QUOTATION'
  /**
   * Phase 2: the Quotation downstream of this CPS became an Invoice, so the
   * active downstream feedback authority moved from the Quotation to the
   * Invoice.
   */
  | 'CONVERTED_TO_INVOICE'
  /** Phase 2 diagnostic: a converted row could not carry its CPS origin. */
  | 'LINEAGE_WARNING'
  | 'DUPLICATED'
  | 'ARCHIVED'
  | 'DELETED'

export type AuditChangeKind = 'default' | 'money' | 'number' | 'date' | 'image'

export interface AuditTrailChange {
  field: string
  label: string
  oldValue: string | null
  newValue: string | null
  oldValueFull?: string | null
  newValueFull?: string | null
  /** Presentation hint for the value pair. */
  kind?: AuditChangeKind
  /** Compact image references for image changes. Never a primary value. */
  oldImageUrl?: string | null
  newImageUrl?: string | null
}

/**
 * Field changes for one row (or for the document) collapsed into one block.
 * One user save that changes four fields on one row becomes one group.
 */
export interface AuditTrailChangeGroup {
  key: string
  /** Row description snapshot, or the document-level label. */
  label: string
  /** 'document' for document-level fields, 'row' for an item or group row. */
  scope: 'document' | 'row'
  changes: AuditTrailChange[]
}

/** A related document on a lifecycle event, for example the created Quotation. */
export interface AuditRelatedDocument {
  type: 'quotation' | 'invoice' | 'cps'
  id: string
  number: string
}

/**
 * Reserved key for the structured CPS audit payload.
 *
 * The shared audit infrastructure stores a field-level diff in
 * audit_logs.changes as an array of { field, old, new }. CPS needs a richer,
 * readable payload: row identity, a row label snapshot, a human field label,
 * and causal metadata (event kind, root id, parent id, related document).
 * The payload travels as one change entry under this reserved key. The CPS
 * formatter reads it and hides the reserved entry from the rendered field diff.
 */
export const CPS_AUDIT_META_KEY = '_cps'

export interface CpsAuditFieldChange {
  /** Stable CPS row id (row.id or row._uiKey), or null for document fields. */
  rowId: string | null
  /** Row description snapshot at change time. Used as the group label. */
  rowLabel: string | null
  scope: 'document' | 'row'
  field: string
  label: string
  old: unknown
  new: unknown
  kind: AuditChangeKind
}

export interface CpsAuditMeta {
  event: CpsAuditEventType
  actorType: AuditActorType
  /** Correlation root. Always the CPS document id for direct CPS events. */
  rootId: string
  /** Causal parent event id. Reserved for Phase 3 feedback chains. */
  parentEventId: string | null
  sourceContext: string
  related: AuditRelatedDocument | null
  summary: string
  /**
   * Optional second line, for example the Phase 2 lineage consequence of a
   * conversion ("Row ancestry established for 12 CPS items."). Kept separate
   * from `summary` so the timeline stays readable.
   */
  detail: string | null
  changes: CpsAuditFieldChange[]
}

export interface AuditTrailEntry {
  id: string
  action: AuditAction
  actionLabel: string
  actorLabel: string
  timestamp: string
  rawTimestamp?: string | null
  changes: AuditTrailChange[]
  // CPS-specific lifecycle context. Optional so Invoice and Quotation
  // entries keep their existing shape.
  eventType?: CpsAuditEventType | string
  actorType?: AuditActorType
  rootId?: string
  parentEventId?: string | null
  relatedDocument?: AuditRelatedDocument | null
  summary?: string
  /** Optional second line for a lifecycle event. */
  detail?: string | null
  /** Grouped field changes for the CPS timeline. */
  changeGroups?: AuditTrailChangeGroup[]
}
