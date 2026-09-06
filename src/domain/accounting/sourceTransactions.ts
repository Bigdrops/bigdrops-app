/**
 * Source transaction domain types (blueprint section 6).
 * Schema-free. The persistence boundary is not here.
 *
 * Source transactions are recorded business facts that sit between
 * Record Engagement and the Posting Kernel. They carry provenance
 * and lifecycle state but are not journal entries.
 */

export type SourceTransactionLifecycle = 'captured' | 'confirmed' | 'posted' | 'rejected'

/**
 * A recorded business fact ready for accounting attribution.
 * Amounts are exact decimal strings (Decimal.js boundary).
 */
export interface SourceTransaction {
  id?: string
  sourceType: string
  sourceId: string
  transactionDate: string
  /** Exact decimal string. Positive. NUMERIC(18,2) at persistence. */
  amount: string
  currencyCode: string
  counterpartyType?: string | null
  counterpartyName?: string | null
  sourceDocumentRef?: string | null
  evidenceRefs?: unknown[]
  lifecycleStatus: SourceTransactionLifecycle
  idempotencyKey: string
  rejectionReason?: string | null
  memo?: string | null
  entityRef?: string | null
  createdAt?: string
  updatedAt?: string
  createdBy?: string | null
}

/** Ingestion result from the boundary RPC. */
export interface IngestResult {
  id: string
  status: SourceTransactionLifecycle
  idempotent: boolean
  message: string
}

/** Confirmation result. */
export interface ConfirmResult {
  id: string
  status: SourceTransactionLifecycle
  message: string
}
