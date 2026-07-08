/**
 * Domain invariant: identity fields are immutable after creation.
 *
 * Identity fields per the Document Transformation Standard (§2.1):
 *   - client_id  → maps to standard's clientId
 *   - invoice_number → maps to standard's documentNumber
 *   - document_type → document kind discriminator (INVOICE / QUOTATION)
 *   - lineage → stored in custom_fields.conversionTrail, not editable in form
 *
 * This function compares the original (hydrated) snapshot against the current
 * form state and throws if any identity field has been mutated.
 */
export function assertIdentityImmutable(
  original: { client_id?: string | null; invoice_number?: string | null; document_type?: string | null; custom_fields?: string | null } | null | undefined,
  current: { client_id?: string | null; invoice_number?: string | null; document_type?: string | null; custom_fields?: string | null } | null | undefined,
): void {
  if (!original || !current) return;

  const scalarFields = ["client_id", "invoice_number", "document_type"] as const;

  for (const key of scalarFields) {
    if (original[key] !== current[key]) {
      throw new Error(`IDENTITY_MUTATION_DETECTED: ${key}`);
    }
  }

  // lineage check: conversionTrail inside custom_fields must not change
  try {
    const origCf = original.custom_fields ? JSON.parse(original.custom_fields) : null
    const currCf = current.custom_fields ? JSON.parse(current.custom_fields) : null
    const origTrail = origCf?.conversionTrail ?? null
    const currTrail = currCf?.conversionTrail ?? null
    if (JSON.stringify(origTrail) !== JSON.stringify(currTrail)) {
      throw new Error('IDENTITY_MUTATION_DETECTED: conversionTrail');
    }
  } catch (err: any) {
    if (err.message?.startsWith('IDENTITY_MUTATION_DETECTED:')) throw err;
    // Non-JSON custom_fields → skip lineage check (defence-in-depth: save-time only)
  }
}