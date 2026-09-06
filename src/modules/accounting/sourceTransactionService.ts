import { supabase } from '@/supabase'
import type { SourceTransactionLifecycle, IngestResult, ConfirmResult } from '@/domain/accounting/sourceTransactions'

/**
 * Persistence types for source_transactions (snake_case, DB-mapped).
 */
export interface SourceTransactionRow {
  id: string
  source_type: string
  source_id: string
  transaction_date: string
  amount: string
  currency_code: string
  counterparty_type: string | null
  counterparty_name: string | null
  source_document_ref: string | null
  evidence_refs: unknown[]
  lifecycle_status: SourceTransactionLifecycle
  idempotency_key: string
  rejection_reason: string | null
  memo: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

/**
 * Input for ingesting a source transaction.
 * Amount must be a positive decimal string with at most 2 fraction digits.
 */
export interface IngestSourceTransactionInput {
  sourceType: string
  sourceId: string
  transactionDate: string
  amount: string
  currencyCode?: string
  counterpartyType?: string | null
  counterpartyName?: string | null
  sourceDocumentRef?: string | null
  evidenceRefs?: unknown[]
  idempotencyKey?: string
  memo?: string | null
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

function fail(message: string): never {
  throw new Error(message)
}

function throwIfError(error: { message: string } | null, fallback: string) {
  if (error) fail(error.message || fallback)
}

/** Client-side pre-validation. The RPC re-enforces every rule. */
export function validateSourceTransactionInput(input: IngestSourceTransactionInput): void {
  if (!input.sourceType.trim()) fail('Enter a source type.')
  if (!input.sourceId.trim()) fail('Enter a source ID.')
  if (!input.transactionDate) fail('Enter a transaction date.')
  const raw = (input.amount ?? '').trim()
  if (!raw) fail('Enter an amount.')
  if (!AMOUNT_PATTERN.test(raw)) fail('Amount must be a non-negative number with at most 2 decimals.')
  const num = Number(raw)
  if (num <= 0) fail('Amount must be positive.')
}

/**
 * Ingest a source transaction via the boundary RPC.
 * Idempotent: re-delivery returns the existing record.
 */
export async function ingestSourceTransaction(
  entityId: string,
  input: IngestSourceTransactionInput,
): Promise<IngestResult> {
  validateSourceTransactionInput(input)

  const { data, error } = await supabase.rpc('ingest_source_transaction', {
    p_entity_id: entityId,
    p_source_type: input.sourceType.trim(),
    p_source_id: input.sourceId.trim(),
    p_transaction_date: input.transactionDate,
    p_amount: input.amount.trim(),
    p_currency_code: input.currencyCode?.trim() || 'NGN',
    p_counterparty_type: input.counterpartyType ?? null,
    p_counterparty_name: input.counterpartyName ?? null,
    p_source_document_ref: input.sourceDocumentRef ?? null,
    p_evidence_refs: input.evidenceRefs ?? [],
    p_idempotency_key: input.idempotencyKey?.trim() || null,
    p_memo: input.memo?.trim() || null,
  })
  if (error) fail(error.message)
  return data as IngestResult
}

/**
 * Confirm a captured source transaction (captured -> confirmed).
 */
export async function confirmSourceTransaction(
  entityId: string,
  sourceTransactionId: string,
): Promise<ConfirmResult> {
  if (!sourceTransactionId.trim()) fail('Missing source transaction ID.')

  const { data, error } = await supabase.rpc('confirm_source_transaction', {
    p_entity_id: entityId,
    p_source_transaction_id: sourceTransactionId,
  })
  if (error) fail(error.message)
  return data as ConfirmResult
}

/**
 * List source transactions for an entity.
 * Uses the tenant client to query within the entity schema.
 */
export async function listSourceTransactions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tenantClient: any,
): Promise<SourceTransactionRow[]> {
  const { data, error } = await tenantClient
    .from('source_transactions')
    .select('id, source_type, source_id, transaction_date, amount, currency_code, counterparty_type, counterparty_name, source_document_ref, evidence_refs, lifecycle_status, idempotency_key, rejection_reason, memo, created_at, updated_at, created_by')
    .order('created_at', { ascending: false })
    .limit(100)
  throwIfError(error as { message: string } | null, 'Could not load source transactions.')
  return (data ?? []) as SourceTransactionRow[]
}

/**
 * Get a single source transaction by ID.
 */
export async function getSourceTransaction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tenantClient: any,
  id: string,
): Promise<SourceTransactionRow | null> {
  const { data, error } = await tenantClient
    .from('source_transactions')
    .select('id, source_type, source_id, transaction_date, amount, currency_code, counterparty_type, counterparty_name, source_document_ref, evidence_refs, lifecycle_status, idempotency_key, rejection_reason, memo, created_at, updated_at, created_by')
    .eq('id', id)
    .single()
  throwIfError(error as { message: string } | null, 'Could not load source transaction.')
  return (data ?? null) as SourceTransactionRow | null
}
