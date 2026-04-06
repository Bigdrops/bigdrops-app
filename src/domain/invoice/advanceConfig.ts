import { AdvanceConfig, Invoice } from './types'
import { parseCustomFields } from './normalize'

/**
 * Reads advance configuration from invoice custom_fields.
 */
export function getAdvanceConfig(customFields: unknown): AdvanceConfig | null {
  const parsed = parseCustomFields(customFields)
  return parsed.advance_invoice || null
}

/**
 * Computes the advance invoice number from parent number and suffix.
 * Product rule: parent-suffix. If blank suffix, return parent number.
 */
export function getAdvanceNumber(parentNumber: string, suffix?: string): string {
  if (!parentNumber) return ''
  if (!suffix || !suffix.trim()) return parentNumber
  return `${parentNumber}-${suffix.trim()}`
}

/**
 * Maps parent invoice and advance config to a "virtual" invoice object 
 * that the existing UI expects.
 */
export function mapAdvanceConfigToInvoice(parentInvoice: Invoice, config: AdvanceConfig): Partial<Invoice> {
  if (!config) return null
  
  const parentTotal = Number(parentInvoice.total || 0)
  const isPercent = config.mode === 'percent'
  const advanceAmount = isPercent 
    ? parentTotal * (config.value / 100)
    : config.value

  return {
    ...parentInvoice,
    // Use a deterministic virtual ID if needed, or null to signal it's virtual
    id: parentInvoice.id ? `virtual-advance-${parentInvoice.id}` : null,
    invoice_number: getAdvanceNumber(parentInvoice.invoice_number || '', config.suffix),
    total: advanceAmount,
    is_advance: true,
    advance_mode: config.mode,
    advance_value: config.value,
    total_contract_value: parentTotal,
    thread_role: 'advance',
    // thread_id is used by some logic to find the father
    thread_id: parentInvoice.id,
    advance_primary_label: config.primaryLabel,
    advance_secondary_label: config.secondaryLabel,
  }
}
