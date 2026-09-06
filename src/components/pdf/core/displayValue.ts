/**
 * Checks if a value is meaningful for display in a PDF.
 */
export function hasDisplayValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false
  }

  if (typeof value === 'string' && value.trim() === '') {
    return false
  }

  return true
}
