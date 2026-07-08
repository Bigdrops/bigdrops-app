import type { ReceiptRow } from './types'

/**
 * Throws if a receipt mutation attempts to change an immutable field.
 * Only notes, archived_at, updated_by may be modified after creation.
 */
export function assertReceiptImmutable(
  original: ReceiptRow,
  patch: Partial<Pick<ReceiptRow, 'amount' | 'currency_code' | 'payment_date' | 'payment_method' | 'payment_ref' | 'client_id' | 'client_name' | 'invoice_id' | 'payment_id'>>,
): void {
  const frozen: Array<keyof typeof patch> = [
    'amount',
    'currency_code',
    'payment_date',
    'payment_method',
    'payment_ref',
    'client_id',
    'client_name',
    'invoice_id',
    'payment_id',
  ]

  for (const field of frozen) {
    if (patch[field] !== undefined && patch[field] !== original[field]) {
      throw new Error(`Receipt field "${field}" is immutable after creation`)
    }
  }
}
