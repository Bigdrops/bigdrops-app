export function assertIdentityImmutable(
  original: any,
  rendered: any
) {
  if (!original || !rendered) return;

  const fields = [
    "invoice_title",
    "invoice_number",
    "client_name",
    "client_email",
  ];

  for (const key of fields) {
    if (original[key] !== rendered.identity?.[key]) {
      throw new Error(
        `❌ IDENTITY MUTATION DETECTED in PDF pipeline: ${key}`
      );
    }
  }
}