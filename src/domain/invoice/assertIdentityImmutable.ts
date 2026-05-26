export function assertIdentityImmutable(
  original: any,
  rendered: any
): void {
  if (!original || !rendered) return;

  const fields = [
    "invoice_title",
    "invoice_number",
    "client_name",
    "client_email",
  ] as const;

  for (const key of fields) {
    if (original[key] !== rendered.identity?.[key]) {
      throw new Error(
        `IDENTITY_MUTATION_DETECTED: ${key}`
      );
    }
  }
}