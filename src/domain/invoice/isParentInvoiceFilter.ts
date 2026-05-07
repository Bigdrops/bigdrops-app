/**
 * Applies the filter to exclude advance invoices (which are child records).
 * Also excludes archived rows to support quarantine behavior.
 * Currently custom_fields is TEXT, so we use ilike.
 * In the future, when migrated to JSONB, this will be updated to:
 * query.not('custom_fields', 'cs', '{"advance_invoice":{}}') or similar.
 */
export function applyParentInvoiceFilter<T extends { or: (query: string) => any }>(query: T): T {
  return query.or('custom_fields.is.null,custom_fields.not.ilike.%"role":"advance"%,archived_at.is.not.null') as unknown as T;
}
