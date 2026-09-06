import { supabase } from '@/supabase'
import { toKoboString } from '@/domain/accounting/money'
import { resolveOpenPeriod } from './invoiceAccountingService'
import type { TenantClient } from '@/lib/tenantClient'

/**
 * Increment 4B — Payment → Source Transaction → Accounting adapter.
 *
 * The ONLY integration between the invoice Payment lifecycle and the
 * accounting foundation. It runs once per payment, inside the entity-aware
 * recordInvoicePayment path, and drives the controlled Increment 3 boundary:
 *
 *   payment recorded → ingest_source_transaction()
 *                    → confirm_source_transaction()
 *                    → post_from_source_transaction()
 *                    → post_accounting_entry() (Increment 2 kernel)
 *
 * Accounting rule (Increment 4A-established):
 *   Payment settles the receivable created by invoice creation.
 *   debit <money account> = credit 1200 Accounts Receivable = cash_amount.
 *   Payment NEVER credits 4000 Revenue — the claim was already recognized
 *   at invoice creation (Increment 4A claim-recognition policy).
 *
 * Scope decisions (documented, not invented):
 *   - Settlement amount = payment.cash_amount only. wht_amount is a settled
 *     fact at payment time but has no authoritative journal treatment
 *     (WHT rate table lives in an unsourced subsidiary regulation), so WHT
 *     is excluded from the journal and surfaced in the report.
 *   - amount (cash + WHT) never settles more receivable than the cash the
 *     business actually received.
 *   - Bank/Cash account: the payment's bank_account_id is an operational
 *     bank_accounts row with NO accounting-chart link. No authoritative
 *     mapping exists, so the v1 default debit account is 1100 Bank for
 *     every method. Reuse the existing chart; never invent a new model.
 *   - Partial payments settle only the actual cash_amount received.
 *   - Multiple payments against one invoice stay distinct: provenance and
 *     idempotency derive from the payment id, never the invoice id.
 *   - Voided payments are excluded at the source (best-effort event).
 *     Ledger reversal semantics are out of scope for this increment.
 */

export const PAYMENT_SOURCE_TYPE = 'payment'

const RECEIVABLE_ACCOUNT = '1200'
/** v1 default money account. The 4A chart seeds 1000 Cash / 1100 Bank. */
const DEFAULT_MONEY_ACCOUNT = '1100'

/** Narrow snapshot of the fields the adapter needs from a recorded payment. */
export interface PaymentAccountingSnapshot {
  id: string
  invoice_id: string
  cash_amount: number
  wht_amount: number
  amount: number
  date: string
  method: string
  reference?: string | null
  bank_account_id?: string | null
  voided_at?: string | null
}

export interface PaymentAccountingEventInput {
  entityId: string
  payment: PaymentAccountingSnapshot
  invoiceNumber?: string | null
  clientName?: string | null
  tenantClient: TenantClient
}

export interface PaymentAccountingSyncResult {
  attempted: boolean
  reason?: string
  sourceTransactionId?: string
  journalEntryId?: string
}

function fail(message: string): never {
  throw new Error(message)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Normalize a payment amount into the exact kobo string the source
 * transaction boundary requires (Decimal.js, ROUND_HALF_UP, 2 decimals).
 * Missing, malformed, zero, or negative amounts never produce an event.
 */
export function buildPaymentAmount(value: number | string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw || raw === '0') fail('Payment amount is missing; no accounting event is created.')
  let amount: string
  try {
    amount = toKoboString(raw)
  } catch {
    fail('Payment amount is not a valid amount; no accounting event is created.')
  }
  if (!/^\d+\.\d{2}$/.test(amount) || Number(amount) <= 0) {
    fail('Payment amount must be a positive amount to create an accounting event.')
  }
  return amount
}

/**
 * Build the source-transaction ingest payload for a recorded payment.
 * Provenance: source_type 'payment', source_id = payment id. Idempotency
 * key mirrors the database derivation so re-delivery is safe. Multiple
 * payments against one invoice naturally get distinct keys.
 */
export function buildPaymentSourceTransactionInput(payment: PaymentAccountingSnapshot): {
  sourceType: string
  sourceId: string
  transactionDate: string
  amount: string
  currencyCode: string
  counterpartyType: string
  counterpartyName: string | null
  sourceDocumentRef: string | null
  idempotencyKey: string
  memo: string | null
} {
  if (!payment?.id) fail('Payment id is required for the accounting event.')
  const amount = buildPaymentAmount(payment.cash_amount)
  return {
    sourceType: PAYMENT_SOURCE_TYPE,
    sourceId: payment.id,
    transactionDate: payment.date || todayIso(),
    amount,
    currencyCode: 'NGN',
    counterpartyType: 'customer',
    counterpartyName: null,
    sourceDocumentRef: null,
    idempotencyKey: `${PAYMENT_SOURCE_TYPE}:${payment.id}:ingest`,
    memo: `Payment settlement ${payment.method}`.trim(),
  }
}

/**
 * Build the balanced receivable-settlement posting for a confirmed payment
 * source transaction: debit Bank (v1 default), credit receivable, same
 * exact cash amount. Never touches revenue.
 */
export function buildPaymentSettlementPosting(payment: PaymentAccountingSnapshot): {
  entry: {
    source_type: string
    source_id: string
    transaction_date: string
    idempotency_key: string
    memo: string | null
  }
  lines: {
    account_code: string
    side: 'debit' | 'credit'
    amount: string
    memo: string | null
  }[]
} {
  if (!payment?.id) fail('Payment id is required for the settlement posting.')
  const amount = buildPaymentAmount(payment.cash_amount)
  const transactionDate = payment.date || todayIso()
  return {
    entry: {
      source_type: PAYMENT_SOURCE_TYPE,
      source_id: payment.id,
      transaction_date: transactionDate,
      idempotency_key: `${PAYMENT_SOURCE_TYPE}:${payment.id}:post`,
      memo: 'Payment settlement of invoice receivable',
    },
    lines: [
      {
        account_code: DEFAULT_MONEY_ACCOUNT,
        side: 'debit',
        amount,
        memo: 'Payment received',
      },
      {
        account_code: RECEIVABLE_ACCOUNT,
        side: 'credit',
        amount,
        memo: 'Receivable settled',
      },
    ],
  }
}

/**
 * True when the payment model already excludes the payment from money
 * facts. The adapter never processes voided payments.
 */
export function isPaymentVoided(payment: { voided_at?: string | null }): boolean {
  return !!payment.voided_at
}

/**
 * Run the full payment accounting event through the controlled boundary.
 * Period resolution is shared with the Increment 4A invoice adapter.
 * Best-effort by design: an accounting failure must never break payment
 * recording. Every failure is logged for the audit trail.
 */
export async function syncPaymentAccountingEvent(
  input: PaymentAccountingEventInput,
): Promise<PaymentAccountingSyncResult> {
  const { entityId, payment, invoiceNumber, clientName, tenantClient } = input
  try {
    if (isPaymentVoided(payment)) {
      return { attempted: false, reason: 'payment is voided; no accounting event' }
    }

    const ingestInput = buildPaymentSourceTransactionInput(payment)
    const transactionDate = ingestInput.transactionDate

    const { data: ingestData, error: ingestError } = await supabase.rpc('ingest_source_transaction', {
      p_entity_id: entityId,
      p_source_type: ingestInput.sourceType,
      p_source_id: ingestInput.sourceId,
      p_transaction_date: ingestInput.transactionDate,
      p_amount: ingestInput.amount,
      p_currency_code: ingestInput.currencyCode,
      p_counterparty_type: ingestInput.counterpartyType,
      p_counterparty_name: clientName ?? ingestInput.counterpartyName,
      p_source_document_ref: invoiceNumber ?? ingestInput.sourceDocumentRef,
      p_evidence_refs: [],
      p_idempotency_key: ingestInput.idempotencyKey,
      p_memo: ingestInput.memo,
    })
    if (ingestError) fail(`ingest_source_transaction failed: ${ingestError.message}`)
    const ingest = ingestData as { id?: string } | null
    if (!ingest?.id) fail('ingest_source_transaction returned no id')

    const { data: confirmData, error: confirmError } = await supabase.rpc('confirm_source_transaction', {
      p_entity_id: entityId,
      p_source_transaction_id: ingest.id,
    })
    if (confirmError) fail(`confirm_source_transaction failed: ${confirmError.message}`)

    const period = await resolveOpenPeriod(tenantClient, transactionDate)
    if (!period) {
      return {
        attempted: false,
        reason: 'no open accounting period covers the payment date; posting skipped',
        sourceTransactionId: ingest.id,
      }
    }

    const posting = buildPaymentSettlementPosting(payment)
    const { data: postData, error: postError } = await supabase.rpc('post_from_source_transaction', {
      p_entity_id: entityId,
      p_source_transaction_id: ingest.id,
      p_entry: {
        period_code: period.code,
        transaction_date: posting.entry.transaction_date,
        source_type: posting.entry.source_type,
        source_id: posting.entry.source_id,
        idempotency_key: posting.entry.idempotency_key,
        memo: posting.entry.memo,
      },
      p_lines: posting.lines.map((line) => ({
        account_code: line.account_code,
        side: line.side,
        amount: line.amount,
        memo: line.memo,
      })),
    })
    if (postError) fail(`post_from_source_transaction failed: ${postError.message}`)
    const posted = postData as { journal_entry_id?: string } | null

    return {
      attempted: true,
      sourceTransactionId: ingest.id,
      journalEntryId: posted?.journal_entry_id ?? null,
    }
  } catch (error) {
    console.error('[payment-accounting] Payment accounting event failed:', error)
    return {
      attempted: false,
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}
