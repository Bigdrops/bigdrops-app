/**
 * Domain invariant: client_id and invoice_number are immutable after creation.
 *
 * Identity fields per the Document Transformation Standard (§2.1):
 *   - client_id  → maps to standard's clientId
 *   - invoice_number → maps to standard's documentNumber
 *   - type → implicit ("invoice"), not stored as a mutable field
 *   - lineage → stored in custom_fields.conversionTrail, not editable in form
 *
 * This function compares the original (hydrated) snapshot against the current
 * form state and throws if any identity field has been mutated.
 */
export function assertIdentityImmutable(
  original: { client_id?: string | null; invoice_number?: string | null } | null | undefined,
  current: { client_id?: string | null; invoice_number?: string | null } | null | undefined,
): void {
  if (!original || !current) return;

  const fields = ["client_id", "invoice_number"] as const;

  for (const key of fields) {
    if (original[key] !== current[key]) {
      throw new Error(`IDENTITY_MUTATION_DETECTED: ${key}`);
    }
  }
}