/**
 * Applies the filter to exclude advance invoices (which are child records).
 * Also excludes archived rows.
 * Currently custom_fields is TEXT, so we use ilike.
 * In the future, when migrated to JSONB, this will be updated to:
 * query.not('custom_fields', 'cs', '{"advance_invoice":{}}') or similar.
 */
export function applyParentInvoiceFilter<
  T extends {
    is: (column: string, value: null) => T
    or: (query: string) => T
  },
>(query: T): T {
  return query
    .is("archived_at", null)
    .or('custom_fields.is.null,custom_fields.not.ilike.%"role":"advance"%')
}
