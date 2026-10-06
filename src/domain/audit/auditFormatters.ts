import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'

import type {
  AuditEntityType,
  AuditLogRecord,
  AuditTrailChange,
  AuditTrailChangeGroup,
  AuditTrailEntry,
  CpsAuditMeta,
} from './auditTypes'
import { CPS_AUDIT_META_KEY } from './auditTypes'

const EMPTY_VALUE = '—'

const FIELD_LABELS: Record<string, string> = {
  invoice_number: 'Invoice Number',
  client_name: 'Client',
  project_id: 'Project',
  po_number: 'PO Number',
  issue_date: 'Issue Date',
  due_date: 'Due Date',
  vat: 'VAT',
  wht: 'WHT',
  total: 'Total',
  status: 'Status',
  payment_mode: 'Method',
  account_paid_to: 'Paid To',
  running_balance_after: 'Balance After',
  wht_amount: 'WHT Deducted',
  letter_number: 'Letter Number',
  subject: 'Subject',
  recipient_name: 'Recipient',
  recipient_address: 'Address',
  cps_number: 'CPS Number',
  title: 'Title',
  project_name: 'Site / Project',
  description: 'Description',
  specification: 'Specification',
  quantity: 'Quantity',
  unit: 'Unit',
  make_brand: 'Make / Brand',
  cp: 'CP',
  sp: 'SP',
  image_url: 'Image',
  section_title: 'Group name',
  group_id: 'Group',
  notes: 'Notes',
}

const PAYMENT_FIELDS = new Set(['amount'])

const CURRENCY_FIELDS = new Set(['subtotal', 'discount', 'vat', 'wht', 'total', 'amount', 'cp', 'sp'])
const DATE_FIELDS = new Set(['issue_date', 'due_date', 'valid_until', 'start_date', 'created_at', 'updated_at'])

const ACTION_LABELS: Record<string, Record<string, string>> = {
  invoice: {
    CREATE: 'created this invoice',
    UPDATE: 'updated this invoice',
    DELETE: 'deleted this invoice',
    STATUS_CHANGE: 'updated this invoice',
    LINK: 'linked this invoice',
    UNLINK: 'unlinked this invoice',
    PAYMENT_RECORDED: 'recorded a payment on this invoice',
    PAYMENT_VOIDED: 'voided a payment on this invoice',
  },
  quotation: {
    CREATE: 'created this quotation',
    UPDATE: 'updated this quotation',
    DELETE: 'deleted this quotation',
    STATUS_CHANGE: 'updated this quotation',
    LINK: 'linked this quotation',
    UNLINK: 'unlinked this quotation',
  },
  project: {
    CREATE: 'created this project',
    UPDATE: 'updated this project',
    DELETE: 'deleted this project',
    STATUS_CHANGE: 'updated this project',
    LINK: 'linked this project',
    UNLINK: 'unlinked this project',
  },
  csr: {
    CREATE: 'created this service report',
    UPDATE: 'updated this service report',
    DELETE: 'deleted this service report',
    STATUS_CHANGE: 'updated this service report',
    LINK: 'linked this service report',
    UNLINK: 'unlinked this service report',
  },
  waybill: {
    CREATE: 'created this waybill',
    UPDATE: 'updated this waybill',
    DELETE: 'deleted this waybill',
    STATUS_CHANGE: 'updated this waybill',
    LINK: 'linked this waybill',
    UNLINK: 'unlinked this waybill',
  },
  letter: {
    CREATE: 'created this letter',
    UPDATE: 'updated this letter',
    DELETE: 'deleted this letter',
    STATUS_CHANGE: 'updated this letter',
    LINK: 'linked this letter',
    UNLINK: 'unlinked this letter',
  },
  cps_sheets: {
    CREATE: 'Created CPS',
    UPDATE: 'Updated CPS',
    DELETE: 'Deleted CPS',
    ARCHIVE: 'Archived CPS',
    UNARCHIVE: 'Restored CPS',
    STATUS_CHANGE: 'Status changed',
    CONVERT: 'Converted to Quotation',
    DUPLICATE: 'Duplicated CPS',
    LINK: 'Linked CPS',
    UNLINK: 'Unlinked CPS',
  },
}

function toTitleCase(value: string): string {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function isEmptyAuditValue(value: unknown): boolean {
  return value == null || String(value).trim() === ''
}

export function hasMeaningfulAuditValue(value: unknown): boolean {
  return !isEmptyAuditValue(value)
}

function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

export function isMeaningfulAuditChange(oldValue: unknown, newValue: unknown): boolean {
  if (!hasMeaningfulAuditValue(oldValue) && !hasMeaningfulAuditValue(newValue)) {
    return false
  }

  if (oldValue == null && newValue == null) {
    return false
  }

  const oldNormalized = safeStringify(oldValue)
  const newNormalized = safeStringify(newValue)

  if (oldNormalized === '' && newNormalized === '') {
    return false
  }

  return oldNormalized !== newNormalized
}

export function getAuditFieldLabel(field: string): string {
  return FIELD_LABELS[field] || toTitleCase(field)
}

function stripHtml(html: string): string {
  if (!html) return ''

  if (typeof document !== 'undefined') {
    try {
      return new DOMParser().parseFromString(html, 'text/html').body.textContent || ''
    } catch {
      // DOMParser unavailable or parse failed — fall through to regex
    }
  }

  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(text: string, length: number = 180): string {
  if (!text) return ''
  if (text.length <= length) return text
  return text.substring(0, length).trim() + '...'
}

export function formatAuditValue(field: string, value: unknown): { preview: string | null; full?: string } {
  if (!hasMeaningfulAuditValue(value)) {
    return { preview: null }
  }

  if (CURRENCY_FIELDS.has(field)) {
    return { preview: formatNaira(value as string | number, { preserveFraction: true }) }
  }

  if (DATE_FIELDS.has(field)) {
    return { preview: formatDisplayDate(value as string, { fallback: EMPTY_VALUE }) }
  }

  if (field === 'status') {
    return { preview: toTitleCase(String(value)) }
  }

  if (typeof value === 'boolean') {
    return { preview: value ? 'Yes' : 'No' }
  }

  if (Array.isArray(value)) {
    return { preview: value.length ? `${value.length} item${value.length === 1 ? '' : 's'}` : null }
  }

  if (typeof value === 'object') {
    return { preview: 'Updated' }
  }

  const stringValue = String(value)
  const isHtml = /<[a-z][\s\S]*>/i.test(stringValue)
  
  const processedValue = isHtml ? stripHtml(stringValue) : stringValue
  const preview = truncate(processedValue)

  return {
    preview,
    full: processedValue.length > preview.length ? processedValue : undefined,
  }
}

export function getAuditActionLabel(entityType: AuditEntityType | string, action: string): string {
  const entityLabels = ACTION_LABELS[String(entityType).toLowerCase()] || {}
  return entityLabels[action] || 'updated this record'
}

export function buildAuditTrailChanges(row: AuditLogRecord): AuditTrailChange[] {
  const changes = row.changes || []

  return changes
    .filter((c) => isMeaningfulAuditChange(c.old, c.new))
    .map((c) => {
      const oldFormatted = formatAuditValue(c.field, c.old)
      const newFormatted = formatAuditValue(c.field, c.new)
      
      return {
        field: c.field,
        label: getAuditFieldLabel(c.field),
        oldValue: oldFormatted.preview,
        newValue: newFormatted.preview,
        oldValueFull: oldFormatted.full,
        newValueFull: newFormatted.full,
      }
    })
}

function buildPaymentChanges(row: AuditLogRecord): AuditTrailChange[] {
  const meta = row.metadata
  if (!meta) return []

  if (row.action === 'PAYMENT_RECORDED') {
    const changes: AuditTrailChange[] = []
    if (meta.amount != null) {
      changes.push({ field: 'amount', label: 'Amount', oldValue: null, newValue: formatNaira(meta.amount as string | number, { preserveFraction: true }) })
    }
    if (meta.payment_date != null) {
      changes.push({ field: 'payment_date', label: 'Date', oldValue: null, newValue: formatDisplayDate(meta.payment_date as string) })
    }
    if (meta.payment_mode != null) {
      changes.push({ field: 'payment_mode', label: getAuditFieldLabel('payment_mode'), oldValue: null, newValue: String(meta.payment_mode) })
    }
    if (meta.account_paid_to != null) {
      changes.push({ field: 'account_paid_to', label: getAuditFieldLabel('account_paid_to'), oldValue: null, newValue: String(meta.account_paid_to) })
    }
    if (meta.running_balance_after != null) {
      changes.push({ field: 'running_balance_after', label: getAuditFieldLabel('running_balance_after'), oldValue: null, newValue: formatNaira(meta.running_balance_after as string | number, { preserveFraction: true }) })
    }
    if (meta.wht_amount != null && Number(meta.wht_amount) > 0) {
      changes.push({ field: 'wht_amount', label: getAuditFieldLabel('wht_amount'), oldValue: null, newValue: formatNaira(meta.wht_amount as string | number, { preserveFraction: true }) })
    }
    if (meta.reason != null) {
      changes.push({ field: 'reason', label: 'Reason', oldValue: null, newValue: String(meta.reason) })
    }
    return changes
  }

  if (row.action === 'PAYMENT_VOIDED') {
    const changes: AuditTrailChange[] = []
    if (meta.amount != null) {
      changes.push({ field: 'amount', label: 'Amount', oldValue: null, newValue: formatNaira(meta.amount as string | number, { preserveFraction: true }) })
    }
    if (meta.reason != null) {
      changes.push({ field: 'reason', label: 'Reason', oldValue: null, newValue: String(meta.reason) })
    }
    return changes
  }

  return []
}

function formatAuditTimestamp(value: string | null | undefined): string {
  return formatDisplayDate(value, {
    fallback: EMPTY_VALUE,
    dateOptions: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    },
  })
}

/**
 * Read the structured CPS payload from a CPS audit record. Returns null for
 * any record that is not a CPS record with a readable payload, so callers can
 * fall back to the generic mapping. Never throws on malformed data.
 */
function normalizeCpsAuditMeta(
  candidate: Partial<CpsAuditMeta>,
  row: AuditLogRecord,
): CpsAuditMeta {
  return {
    event: candidate.event as CpsAuditMeta['event'],
    actorType: candidate.actorType || 'user',
    rootId: candidate.rootId || row.entity_id,
    chainId: typeof candidate.chainId === 'string' && candidate.chainId.trim() ? candidate.chainId : null,
    parentEventId: candidate.parentEventId ?? null,
    sourceContext: candidate.sourceContext || 'cps',
    related: candidate.related ?? null,
    summary: typeof candidate.summary === 'string' ? candidate.summary : '',
    detail: typeof candidate.detail === 'string' && candidate.detail.trim() ? candidate.detail : null,
    changes: Array.isArray(candidate.changes) ? candidate.changes : [],
  }
}

/**
 * Read the structured CPS payload from a CPS audit record.
 *
 * Phase 2.5 reads `audit_logs.metadata` first. Records written before the
 * promotion kept the same payload inside `audit_logs.changes` under the
 * reserved key `_cps`, so that location stays supported as a read-only legacy
 * fallback. Returns null for any record that is not a readable CPS record, so
 * callers fall back to the generic mapping. Never throws on malformed data.
 */
export function extractCpsAuditMeta(row: AuditLogRecord): CpsAuditMeta | null {
  if (String(row.entity_type) !== 'cps_sheets') return null

  const fromMetadata = row.metadata
  if (fromMetadata && typeof fromMetadata === 'object' && !Array.isArray(fromMetadata)) {
    const candidate = fromMetadata as Partial<CpsAuditMeta>
    if (typeof candidate.event === 'string') return normalizeCpsAuditMeta(candidate, row)
  }

  const entries = row.changes || []
  const entry = entries.find((change) => change.field === CPS_AUDIT_META_KEY)
  if (!entry) return null

  const raw = hasMeaningfulAuditValue(entry.new) ? entry.new : entry.old
  if (!raw || typeof raw !== 'object') return null

  const candidate = raw as Partial<CpsAuditMeta>
  if (typeof candidate.event !== 'string') return null

  return normalizeCpsAuditMeta(candidate, row)
}

function formatCpsChange(change: CpsAuditMeta['changes'][number]): AuditTrailChange {
  const label = change.label || getAuditFieldLabel(change.field)

  if (change.kind === 'image') {
    const oldUrl = hasMeaningfulAuditValue(change.old) ? String(change.old) : null
    const newUrl = hasMeaningfulAuditValue(change.new) ? String(change.new) : null
    return {
      field: change.field,
      label,
      kind: 'image',
      oldValue: oldUrl ? 'Previous image' : null,
      newValue: newUrl ? 'New image' : null,
      oldImageUrl: oldUrl,
      newImageUrl: newUrl,
    }
  }

  if (change.kind === 'money') {
    return {
      field: change.field,
      label,
      kind: 'money',
      oldValue: hasMeaningfulAuditValue(change.old) ? formatNaira(change.old as string | number, { preserveFraction: true }) : null,
      newValue: hasMeaningfulAuditValue(change.new) ? formatNaira(change.new as string | number, { preserveFraction: true }) : null,
    }
  }

  if (change.kind === 'date') {
    return {
      field: change.field,
      label,
      kind: 'date',
      oldValue: hasMeaningfulAuditValue(change.old) ? formatDisplayDate(change.old as string, { fallback: EMPTY_VALUE }) : null,
      newValue: hasMeaningfulAuditValue(change.new) ? formatDisplayDate(change.new as string, { fallback: EMPTY_VALUE }) : null,
    }
  }

  if (change.kind === 'number') {
    return {
      field: change.field,
      label,
      kind: 'number',
      oldValue: hasMeaningfulAuditValue(change.old) ? String(change.old) : null,
      newValue: hasMeaningfulAuditValue(change.new) ? String(change.new) : null,
    }
  }

  const oldFormatted = formatAuditValue(change.field, change.old)
  const newFormatted = formatAuditValue(change.field, change.new)
  return {
    field: change.field,
    label,
    kind: 'default',
    oldValue: oldFormatted.preview,
    newValue: newFormatted.preview,
    oldValueFull: oldFormatted.full,
    newValueFull: newFormatted.full,
  }
}

/**
 * Group one event's field changes by row (or by document). One user save that
 * changes several fields on one row becomes one block.
 */
export function buildCpsChangeGroups(changes: CpsAuditMeta['changes']): AuditTrailChangeGroup[] {
  const order: string[] = []
  const groups = new Map<string, AuditTrailChangeGroup>()

  changes.forEach((change) => {
    const key = change.scope === 'document' ? 'document' : `row:${change.rowId ?? 'unknown'}`
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        label: change.scope === 'document' ? 'Document' : change.rowLabel || 'Item',
        scope: change.scope,
        changes: [],
      }
      groups.set(key, group)
      order.push(key)
    }
    group.changes.push(formatCpsChange(change))
  })

  return order.map((key) => groups.get(key) as AuditTrailChangeGroup)
}

function buildCpsAuditEntry(row: AuditLogRecord, meta: CpsAuditMeta): AuditTrailEntry {
  const changeGroups = buildCpsChangeGroups(meta.changes)
  const changes = changeGroups.flatMap((group) => group.changes)

  return {
    id: String(row.id),
    action: row.action,
    actionLabel: meta.summary || getAuditActionLabel('cps_sheets', row.action),
    actorLabel: String(row.actor_label || 'Unknown user'),
    timestamp: formatAuditTimestamp(row.created_at),
    rawTimestamp: row.created_at || null,
    changes,
    changeGroups,
    eventType: meta.event,
    actorType: meta.actorType,
    rootId: meta.rootId,
    chainId: meta.chainId,
    parentEventId: meta.parentEventId,
    relatedDocument: meta.related,
    summary: meta.summary,
    detail: meta.detail,
  }
}

export function buildAuditTrailItems(rows: AuditLogRecord[]): AuditTrailEntry[] {
  return rows.map((row) => {
    const cpsMeta = extractCpsAuditMeta(row)
    if (cpsMeta) return buildCpsAuditEntry(row, cpsMeta)

    const isAdvanceCreate = row.action === 'CREATE'
      && typeof row.reason === 'string'
      && row.reason.includes('Advance invoice metadata created')

    const genericChanges = buildAuditTrailChanges(row)

    return {
      id: String(row.id),
      action: row.action,
      actionLabel: isAdvanceCreate
        ? 'created an advance invoice'
        : getAuditActionLabel(row.entity_type, row.action),
      actorLabel: String(row.actor_label || 'Unknown user'),
      timestamp: formatAuditTimestamp(row.created_at),
      rawTimestamp: row.created_at || null,
      changes: genericChanges.length > 0 ? genericChanges : buildPaymentChanges(row),
    }
  })
}
