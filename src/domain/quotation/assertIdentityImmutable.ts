/**
 * Domain invariant: quotation identity fields are immutable after creation.
 *
 * Identity fields per the Document Transformation Standard (§2.1):
 *   - client_id
 *   - quotation_number (maps to document_number)
 *   - conversionTrail (lineage, stored in custom_fields)
 *
 * This function compares the original (hydrated) snapshot against the current
 * form state and throws if any identity field has been mutated.
 */
export function assertQuotationIdentityImmutable(
  original: { client_id?: string | null; quotation_number?: string | null; custom_fields?: string | Record<string, unknown> | null } | null | undefined,
  current: { client_id?: string | null; quotation_number?: string | null; custom_fields?: string | Record<string, unknown> | null } | null | undefined,
): void {
  if (!original || !current) return;

  const scalarFields = ["client_id", "quotation_number"] as const;

  for (const key of scalarFields) {
    if (original[key] !== current[key]) {
      throw new Error(`IDENTITY_MUTATION_DETECTED: ${key}`);
    }
  }

  // lineage check: conversionTrail inside custom_fields must not change
  try {
    const parseCf = (cf: typeof original.custom_fields) => {
      if (!cf) return null;
      if (typeof cf === 'string') return JSON.parse(cf);
      return cf;
    };
    const origCf = parseCf(original.custom_fields);
    const currCf = parseCf(current.custom_fields);
    const origTrail = origCf?.conversionTrail ?? null;
    const currTrail = currCf?.conversionTrail ?? null;
    if (JSON.stringify(origTrail) !== JSON.stringify(currTrail)) {
      throw new Error('IDENTITY_MUTATION_DETECTED: conversionTrail');
    }
  } catch (err: any) {
    if (err.message?.startsWith('IDENTITY_MUTATION_DETECTED:')) throw err;
    // Non-JSON custom_fields → skip lineage check (defence-in-depth: save-time only)
  }
}
