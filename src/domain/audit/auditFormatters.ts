import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'

import type { AuditEntityType, AuditLogRecord, AuditTrailChange, AuditTrailEntry } from './auditTypes'

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
}

const CURRENCY_FIELDS = new Set(['subtotal', 'discount', 'vat', 'wht', 'total'])
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

export function isMeaningfulAuditChange(oldValue: unknown, newValue: unknown): boolean {
  if (!hasMeaningfulAuditValue(oldValue) && !hasMeaningfulAuditValue(newValue)) {
    return false
  }

  if (oldValue == null && newValue == null) {
    return false
  }

  return String(oldValue ?? '') !== String(newValue ?? '')
}

export function getAuditFieldLabel(field: string): string {
  return FIELD_LABELS[field] || toTitleCase(field)
}

export function formatAuditValue(field: string, value: unknown): string {
  if (!hasMeaningfulAuditValue(value)) {
    return EMPTY_VALUE
  }

  if (CURRENCY_FIELDS.has(field)) {
    return formatNaira(value as string | number, { preserveFraction: true })
  }

  if (DATE_FIELDS.has(field)) {
    return formatDisplayDate(value as string, { fallback: EMPTY_VALUE })
  }

  if (field === 'status') {
    return toTitleCase(String(value))
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (Array.isArray(value)) {
    return value.length ? `${value.length} item${value.length === 1 ? '' : 's'}` : EMPTY_VALUE
  }

  if (typeof value === 'object') {
    return 'Updated'
  }

  return String(value)
}

export function getAuditActionLabel(entityType: AuditEntityType | string, action: string): string {
  const entityLabels = ACTION_LABELS[String(entityType).toLowerCase()] || {}
  return entityLabels[action] || 'updated this record'
}

export function buildAuditTrailChanges(row: AuditLogRecord): AuditTrailChange[] {
  const oldData = row.old_data || {}
  const newData = row.new_data || {}
  const fieldNames = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]))

  return fieldNames
    .filter((field) => isMeaningfulAuditChange(oldData[field], newData[field]))
    .map((field) => ({
      field,
      label: getAuditFieldLabel(field),
      oldValue: formatAuditValue(field, oldData[field]),
      newValue: formatAuditValue(field, newData[field]),
    }))
}

export function buildAuditTrailItems(rows: AuditLogRecord[]): AuditTrailEntry[] {
  return rows.map((row) => ({
    id: String(row.id),
    action: row.action,
    actionLabel: getAuditActionLabel(row.entity_type, row.action),
    actorLabel: String(row.actor_label || 'Unknown user'),
    timestamp: formatDisplayDate(row.created_at, {
      fallback: EMPTY_VALUE,
      dateOptions: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      },
    }),
    rawTimestamp: row.created_at || null,
    changes: buildAuditTrailChanges(row),
  }))
}
