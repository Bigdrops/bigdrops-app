/**
 * Safely converts an unknown value to a string for PDF display.
 * Prevents "[object Object]" from appearing in the UI.
 */
export function safeText(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    
    // Try common display fields
    const candidates = ['label', 'name', 'text', 'main', 'value']
    for (const key of candidates) {
      if (typeof obj[key] === 'string' && obj[key]) {
        return obj[key] as string
      }
      if (typeof obj[key] === 'number') {
        return String(obj[key])
      }
    }
  }

  return ''
}
