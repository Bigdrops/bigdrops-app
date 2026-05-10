import type { DocumentConversionTrail, DocumentTrailLink } from '@/domain/invoice'

export function buildInvoiceTrailLink(params: {
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

export function withInvoiceSourceTrail(
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

export function appendInvoiceDerivedTrail(
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
