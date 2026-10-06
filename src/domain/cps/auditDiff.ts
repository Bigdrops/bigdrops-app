import type {
  AuditChangeKind,
  AuditRelatedDocument,
  AuditActorType,
  CpsAuditEventType,
  CpsAuditFieldChange,
  CpsAuditMeta,
} from '@/domain/audit/auditTypes'
import { CPS_AUDIT_META_KEY } from '@/domain/audit/auditTypes'
import type { TableDocumentRow } from '@/domain/table-document/types'
import type { Cps } from './types'

/**
 * Pure CPS audit logic: readable field diff, row identity, and event
 * metadata. This module has no persistence and no network import, so it is
 * safe to unit test and to reuse in a future automatic-feedback writer.
 *
 * The structured payload key and the payload types live in the shared audit
 * types module.
 */
export { CPS_AUDIT_META_KEY }
export type { CpsAuditFieldChange, CpsAuditMeta }

export const CPS_AUDIT_SOURCE = {
  form: 'cps_form',
  view: 'cps_view',
  /** Phase 3 events written by the downstream-feedback transaction. */
  downstreamFeedback: 'downstream_feedback',
} as const

export type CpsAuditSource = (typeof CPS_AUDIT_SOURCE)[keyof typeof CPS_AUDIT_SOURCE]

const ACTION_FOR_EVENT: Record<CpsAuditEventType, string> = {
  CREATED: 'CREATE',
  UPDATED: 'UPDATE',
  STATUS_CHANGED: 'STATUS_CHANGE',
  CONVERTED_TO_QUOTATION: 'CONVERT',
  // Phase 2: the downstream Quotation became an Invoice. The transition is a
  // conversion of the descendant document, recorded on the CPS chain root.
  CONVERTED_TO_INVOICE: 'CONVERT',
  CONVERSION_RETRY: 'CONVERT',
  REVERTED_TO_QUOTATION: 'CONVERT',
  // Phase 3: a downstream item edit, the automatic CPS update it causes, and a
  // skipped-feedback diagnostic are all audit-log UPDATE actions on the chain.
  DOWNSTREAM_ITEM_UPDATED: 'UPDATE',
  CPS_FEEDBACK_APPLIED: 'UPDATE',
  FEEDBACK_SKIPPED: 'UPDATE',
  LINEAGE_WARNING: 'UPDATE',
  DUPLICATED: 'DUPLICATE',
  ARCHIVED: 'ARCHIVE',
  DELETED: 'DELETE',
}

export function cpsAuditActionForEvent(event: CpsAuditEventType): string {
  return ACTION_FOR_EVENT[event]
}

interface DocumentFieldSpec {
  key: keyof Cps
  label: string
  kind: AuditChangeKind
}

interface RowFieldSpec {
  key: keyof TableDocumentRow
  label: string
  kind: AuditChangeKind
}

// Approved CPS document fields. Derived totals are never audited here. Client
// is audited as the stored display value only.
const DOCUMENT_FIELDS: DocumentFieldSpec[] = [
  { key: 'title', label: 'Title', kind: 'default' },
  { key: 'client_name', label: 'Client', kind: 'default' },
  { key: 'project_name', label: 'Site / Project', kind: 'default' },
  { key: 'issue_date', label: 'Issue Date', kind: 'date' },
  { key: 'notes', label: 'Notes', kind: 'default' },
]

const ITEM_FIELDS: RowFieldSpec[] = [
  { key: 'description', label: 'Description', kind: 'default' },
  { key: 'specification', label: 'Specification', kind: 'default' },
  { key: 'quantity', label: 'Quantity', kind: 'number' },
  { key: 'unit', label: 'Unit', kind: 'default' },
  { key: 'make_brand', label: 'Make / Brand', kind: 'default' },
  { key: 'cp', label: 'CP', kind: 'money' },
  { key: 'sp', label: 'SP', kind: 'money' },
  { key: 'image_url', label: 'Image', kind: 'image' },
]

/** Stable row identity: the persisted row id, else the stable UI key. */
export function cpsRowIdentity(row: TableDocumentRow): string {
  return String(row.id || row._uiKey || '')
}

function rowKind(row: TableDocumentRow): 'item' | 'section' {
  return row.row_type === 'section' ? 'section' : 'item'
}

export function cpsRowLabel(row: TableDocumentRow): string {
  if (row.row_type === 'section') {
    return String(row.section_title || row.description || '').trim() || 'Group'
  }
  return (
    String(row.description || '').trim() ||
    String(row.specification || '').trim() ||
    'Untitled item'
  )
}

function isBlank(value: unknown): boolean {
  return value == null || String(value).trim() === ''
}

function sameFieldValue(oldValue: unknown, newValue: unknown, kind: AuditChangeKind): boolean {
  if (kind === 'money' || kind === 'number') {
    const oldNumber = isBlank(oldValue) ? 0 : Number(oldValue)
    const newNumber = isBlank(newValue) ? 0 : Number(newValue)
    return (Number.isFinite(oldNumber) ? oldNumber : 0) === (Number.isFinite(newNumber) ? newNumber : 0)
  }
  return String(oldValue ?? '').trim() === String(newValue ?? '').trim()
}

function groupTitleMap(rows: TableDocumentRow[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of rows) {
    if (row.row_type !== 'section') continue
    const key = String(row.group_id || row.id || row._uiKey || '')
    if (key) map.set(key, cpsRowLabel(row))
  }
  return map
}

function membershipLabel(row: TableDocumentRow, titles: Map<string, string>): string {
  if (!row.group_id) return 'Ungrouped'
  return titles.get(String(row.group_id)) || 'Group'
}

/**
 * Build the readable CPS field diff between two document states.
 *
 * Returns one entry per meaningful change. Rows match by stable row id only.
 * No heuristic matching is used. A row with no stable identity is skipped.
 * Derived totals are never compared.
 */
export function diffCpsDocuments(prev: Cps | null, next: Cps): CpsAuditFieldChange[] {
  if (!prev) return []

  const changes: CpsAuditFieldChange[] = []

  for (const spec of DOCUMENT_FIELDS) {
    const oldValue = (prev as unknown as Record<string, unknown>)[spec.key as string]
    const newValue = (next as unknown as Record<string, unknown>)[spec.key as string]
    if (!sameFieldValue(oldValue, newValue, spec.kind)) {
      changes.push({
        rowId: null,
        rowLabel: null,
        scope: 'document',
        field: spec.key as string,
        label: spec.label,
        old: oldValue ?? '',
        new: newValue ?? '',
        kind: spec.kind,
      })
    }
  }

  const prevRows = prev.table_rows || []
  const nextRows = next.table_rows || []
  const prevTitles = groupTitleMap(prevRows)
  const nextTitles = groupTitleMap(nextRows)

  const prevById = new Map<string, TableDocumentRow>()
  for (const row of prevRows) {
    const id = cpsRowIdentity(row)
    if (id) prevById.set(id, row)
  }
  const nextById = new Map<string, TableDocumentRow>()
  for (const row of nextRows) {
    const id = cpsRowIdentity(row)
    if (id) nextById.set(id, row)
  }

  for (const row of nextRows) {
    const id = cpsRowIdentity(row)
    if (!id) continue
    const previous = prevById.get(id)

    if (!previous) {
      const kind = rowKind(row)
      changes.push({
        rowId: id,
        rowLabel: cpsRowLabel(row),
        scope: 'row',
        field: kind === 'section' ? 'group_added' : 'item_added',
        label: kind === 'section' ? 'Group added' : 'Item added',
        old: null,
        new: cpsRowLabel(row),
        kind: 'default',
      })
      continue
    }

    if (rowKind(row) === 'item') {
      for (const spec of ITEM_FIELDS) {
        const oldValue = (previous as unknown as Record<string, unknown>)[spec.key as string]
        const newValue = (row as unknown as Record<string, unknown>)[spec.key as string]
        if (!sameFieldValue(oldValue, newValue, spec.kind)) {
          changes.push({
            rowId: id,
            rowLabel: cpsRowLabel(row),
            scope: 'row',
            field: spec.key as string,
            label: spec.label,
            old: oldValue ?? '',
            new: newValue ?? '',
            kind: spec.kind,
          })
        }
      }

      const oldMembership = membershipLabel(previous, prevTitles)
      const newMembership = membershipLabel(row, nextTitles)
      if (oldMembership !== newMembership) {
        changes.push({
          rowId: id,
          rowLabel: cpsRowLabel(row),
          scope: 'row',
          field: 'group_id',
          label: 'Group',
          old: oldMembership,
          new: newMembership,
          kind: 'default',
        })
      }
    } else {
      const oldTitle = String(previous.section_title || previous.description || '').trim()
      const newTitle = String(row.section_title || row.description || '').trim()
      if (oldTitle !== newTitle) {
        changes.push({
          rowId: id,
          rowLabel: cpsRowLabel(row),
          scope: 'row',
          field: 'section_title',
          label: 'Group name',
          old: oldTitle,
          new: newTitle,
          kind: 'default',
        })
      }
    }
  }

  for (const row of prevRows) {
    const id = cpsRowIdentity(row)
    if (!id || nextById.has(id)) continue
    const kind = rowKind(row)
    changes.push({
      rowId: id,
      rowLabel: cpsRowLabel(row),
      scope: 'row',
      field: kind === 'section' ? 'group_removed' : 'item_removed',
      label: kind === 'section' ? 'Group removed' : 'Item removed',
      old: cpsRowLabel(row),
      new: null,
      kind: 'default',
    })
  }

  return changes
}

export function summarizeCpsChanges(changes: CpsAuditFieldChange[]): string {
  if (changes.length === 0) return 'No field changes'
  return `Updated ${changes.length} field${changes.length === 1 ? '' : 's'}`
}

export interface BuildCpsMetaInput {
  event: CpsAuditEventType
  rootId: string
  sourceContext: string
  changes?: CpsAuditFieldChange[]
  related?: AuditRelatedDocument | null
  /** Phase 2.5 conversion chain this event belongs to. */
  chainId?: string | null
  /** Causal parent event. Operational from Phase 2.5 on. */
  parentEventId?: string | null
  summary?: string
  detail?: string | null
  actorType?: AuditActorType
}

export function buildCpsAuditMeta(input: BuildCpsMetaInput): CpsAuditMeta {
  const changes = input.changes || []
  return {
    event: input.event,
    actorType: input.actorType || 'user',
    rootId: input.rootId,
    chainId: input.chainId ?? null,
    parentEventId: input.parentEventId ?? null,
    sourceContext: input.sourceContext,
    related: input.related ?? null,
    summary: input.summary || summarizeCpsChanges(changes),
    detail: input.detail ?? null,
    changes,
  }
}

/** Document edit meta. Returns null when no meaningful change exists. */
export function buildCpsEditMeta(
  prev: Cps,
  next: Cps,
  sourceContext: string,
): CpsAuditMeta | null {
  const changes = diffCpsDocuments(prev, next)
  if (changes.length === 0) return null
  return buildCpsAuditMeta({
    event: 'UPDATED',
    rootId: next.id,
    sourceContext,
    changes,
    summary: summarizeCpsChanges(changes),
  })
}
