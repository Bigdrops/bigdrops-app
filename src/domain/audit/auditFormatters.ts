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
  payment_mode: 'Method',
  account_paid_to: 'Paid To',
  running_balance_after: 'Balance After',
  wht_amount: 'WHT Deducted',
  letter_number: 'Letter Number',
  subject: 'Subject',
  recipient_name: 'Recipient',
  recipient_address: 'Address',
}

const PAYMENT_FIELDS = new Set(['amount'])

const CURRENCY_FIELDS = new Set(['subtotal', 'discount', 'vat', 'wht', 'total', 'amount'])
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

export function buildAuditTrailItems(rows: AuditLogRecord[]): AuditTrailEntry[] {
  return rows.map((row) => {
    const isAdvanceCreate = row.action === 'CREATE'
      && typeof row.reason === 'string'
      && row.reason.includes('Advance invoice metadata created')

    return {
      id: String(row.id),
      action: row.action,
      actionLabel: isAdvanceCreate
        ? 'created an advance invoice'
        : getAuditActionLabel(row.entity_type, row.action),
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
      changes: buildAuditTrailChanges(row).length > 0 ? buildAuditTrailChanges(row) : buildPaymentChanges(row),
    }
  })
}
