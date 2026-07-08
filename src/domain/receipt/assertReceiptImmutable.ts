import type { ReceiptRow } from './types'

type ReceiptPatch = Partial<Pick<ReceiptRow,
  | 'payment_amount' | 'payment_date' | 'payment_method' | 'payment_reference' | 'payment_notes'
  | 'cash_amount' | 'wht_amount' | 'currency_code' | 'wht_rate' | 'wht_type'
  | 'invoice_number' | 'invoice_total' | 'invoice_subtotal' | 'invoice_vat' | 'invoice_wht'
  | 'invoice_discount' | 'invoice_notes' | 'invoice_terms' | 'invoice_po_number'
  | 'client_id' | 'client_name' | 'client_address' | 'client_city' | 'client_state'
  | 'client_phone' | 'client_email'
  | 'project_name' | 'project_code'
  | 'company_name' | 'company_address' | 'company_email' | 'company_phone' | 'company_logo_url'
  | 'bank_name' | 'bank_account_number' | 'bank_account_name'
  | 'signatory_name' | 'signatory_role' | 'signatory_signature_url'
  | 'payment_id' | 'invoice_id'
>>

const FROZEN_FIELDS: Array<keyof ReceiptPatch> = [
  'payment_amount', 'payment_date', 'payment_method', 'payment_reference', 'payment_notes',
  'cash_amount', 'wht_amount', 'currency_code', 'wht_rate', 'wht_type',
  'invoice_number', 'invoice_total', 'invoice_subtotal', 'invoice_vat', 'invoice_wht',
  'invoice_discount', 'invoice_notes', 'invoice_terms', 'invoice_po_number',
  'client_id', 'client_name', 'client_address', 'client_city', 'client_state',
  'client_phone', 'client_email',
  'project_name', 'project_code',
  'company_name', 'company_address', 'company_email', 'company_phone', 'company_logo_url',
  'bank_name', 'bank_account_number', 'bank_account_name',
  'signatory_name', 'signatory_role', 'signatory_signature_url',
  'payment_id', 'invoice_id',
]

/**
 * Throws if a receipt mutation attempts to change an immutable snapshot field.
 * Only status, voided_at, void_reason may be modified after creation.
 */
export function assertReceiptImmutable(original: ReceiptRow, patch: ReceiptPatch): void {
  for (const field of FROZEN_FIELDS) {
    if (patch[field] !== undefined && patch[field] !== original[field]) {
      throw new Error(`Receipt field "${field}" is immutable after creation`)
    }
  }
}
