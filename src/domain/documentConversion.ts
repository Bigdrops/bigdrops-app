import { parseCustomFields, toDbItem } from '@/domain/invoice'
import type {
  DocumentConversionTrail,
  DocumentTrailLink,
  InvoiceItem,
} from '@/domain/invoice'
import { nextAutomaticNumber, parseTrailingSequence } from '@/domain/prefixConstants'

export function getNextInvoiceNumber(
  rows: Array<{ invoice_number?: string | null }>,
  prefix = 'INV',
  cursor?: number,
): string {
  const family = `${prefix}-`
  const upper = rows.map((row) => String(row.invoice_number || '').trim().toUpperCase())
  const occupied = upper.filter((value) => value.startsWith(prefix.toUpperCase()))
  const maxNumber = occupied
    .map((value) => parseTrailingSequence(value))
    .filter((value): value is number => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0)

  return nextAutomaticNumber(family, cursor, occupied, maxNumber).candidate
}

export function parseDocumentCustomFields(raw: unknown): Record<string, unknown> {
  const parsed = parseCustomFields(raw) as Record<string, unknown>
  return parsed && typeof parsed === 'object' ? parsed : {}
}

export function buildTrailLink(params: {
  id?: string | null
  type: 'invoice' | 'quotation'
  number?: string | null
  project_id?: string | null
  po_number?: string | null
  created_at?: string | null
}): DocumentTrailLink {
  return {
    id: params.id ?? null,
    type: params.type,
    number: String(params.number || ''),
    project_id: params.project_id ?? null,
    po_number: params.po_number ? String(params.po_number).trim() : null,
    created_at: params.created_at ?? new Date().toISOString(),
  }
}

export function withSourceTrail(
  customFields: Record<string, unknown>,
  source: DocumentTrailLink,
): Record<string, unknown> {
  const existing = (customFields.conversionTrail || {}) as DocumentConversionTrail
  return {
    ...customFields,
    conversionTrail: {
      ...existing,
      source,
      derived: Array.isArray(existing.derived) ? existing.derived : [],
    },
  }
}

export function appendDerivedTrail(
  customFields: Record<string, unknown>,
  derived: DocumentTrailLink,
): Record<string, unknown> {
  const existing = (customFields.conversionTrail || {}) as DocumentConversionTrail
  const existingDerived = Array.isArray(existing.derived) ? existing.derived : []
  const nextDerived = [
    ...existingDerived.filter((entry) => !(entry?.id && entry.id === derived.id)),
    derived,
  ]

  return {
    ...customFields,
    conversionTrail: {
      ...existing,
      derived: nextDerived,
    },
  }
}

export function toQuotationItemRow(item: InvoiceItem, quotationId: string, sortOrder: number) {
  const row = toDbItem(item, quotationId, sortOrder) as Record<string, unknown>
  delete row.invoice_id
  return { ...row, quotation_id: quotationId }
}

