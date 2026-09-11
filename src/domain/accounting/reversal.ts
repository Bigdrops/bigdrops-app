/**
 * Gap 2 — Posted-Entry Reversal Boundary domain types.
 *
 * The reversal creates a new, equal-and-opposite posted entry linked
 * to the original via reversal_of_entry_id. The original is never
 * mutated. Double-reversal is rejected at the RPC boundary.
 */

export interface ReverseEntryRequest {
  /** UUID of the posted journal entry to reverse. */
  entryId: string
  /** Period code the reversal entry posts into. Must be open. */
  reversalPeriodCode: string
  /** Idempotency key for the reversal entry. Unique constraint is the backstop. */
  idempotencyKey: string
  /** Optional memo for the reversal entry. */
  memo?: string | null
}

export interface ReverseEntryResult {
  /** UUID of the newly created reversal entry. */
  reversal_entry_id: string
  /** Status of the reversal entry (always 'posted'). */
  reversal_entry_status: string
  /** UUID of the original entry that was reversed. */
  original_entry_id: string
  /** Status of the original entry (still 'posted'; reversal is derived). */
  original_entry_status: string
  /** Total debits on the reversal entry. */
  total_debits: string
  /** Total credits on the reversal entry. */
  total_credits: string
  /** Number of lines on the reversal entry. */
  line_count: number
}
