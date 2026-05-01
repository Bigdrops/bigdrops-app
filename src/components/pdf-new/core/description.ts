import { safeText } from './safeText'

/**
 * Extracts the main description from a cell value or the whole cells object.
 * Standardizes handling of strings vs { main, sub } objects.
 */
export function getDescriptionMain(value: unknown): string {
  if (!value) return ''

  // If passed the whole cells object, drill down to .description
  if (typeof value === 'object' && value !== null && 'description' in value) {
    return getDescriptionMain((value as Record<string, unknown>).description)
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    // Try .main first (standard for nested descriptions), then fall back to safeText fields
    return safeText(obj.main ?? obj.label ?? obj.name ?? obj.text ?? obj.value ?? '')
  }

  return safeText(value)
}

/**
 * Extracts the sub description from a cell value or the whole cells object.
 */
export function getDescriptionSub(value: unknown): string {
  if (!value) return ''

  // If passed the whole cells object, drill down to .description
  if (typeof value === 'object' && value !== null && 'description' in value) {
    return getDescriptionSub((value as Record<string, unknown>).description)
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    return safeText(obj.sub ?? obj.subDescription ?? '')
  }

  return ''
}
