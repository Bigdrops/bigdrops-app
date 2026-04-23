import { AdvanceConfig } from './types'
import { parseCustomFields } from './normalize'

/**
 * Reads advance configuration from invoice custom_fields.
 */
export function getAdvanceConfig(customFields: unknown): AdvanceConfig | null {
  const parsed = parseCustomFields(customFields)
  return parsed.advance_invoice || null
}
