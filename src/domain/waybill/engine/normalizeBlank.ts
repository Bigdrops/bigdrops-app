export function normalizeBlank(value: unknown): string {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    Number.isNaN(value)
  ) return ""

  return String(value)
}
