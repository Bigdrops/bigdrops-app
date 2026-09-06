import { supabase } from '@/supabase'
import { toKoboString } from '@/domain/accounting/money'
import { listPeriods } from '@/modules/accounting/accountingService'
import type { TenantClient } from '@/lib/tenantClient'

/**
 * Increment 4A — Invoice → Source Transaction → Accounting adapter.
 *
 * The ONLY integration between the Invoice lifecycle and the accounting
 * foundation. It runs once per invoice, on first creation, and drives the
 * controlled Increment 3 boundary:
 *
 *   invoice created → ingest_source_transaction()
 *                   → confirm_source_transaction()
 *                   → post_from_source_transaction()
 *                   → post_accounting_entry() (Increment 2 kernel)
 *
 * Invoice code must never write journal_entries or journal_lines directly.
 *
 * Account treatment (documented, not invented):
 *   debit 1200 Accounts Receivable = credit 4000 Revenue = invoice total.
 *   Invoice-as-claim per Accounting-foundation-blueprint-v1.md section 12
 *   (v1 recognition default: supply complete and amount collectible).
 *   The invoice total is the claim amount the user already confirmed.
 *   WHT (estimate, not settled) and VAT (statutory inference) are
 *   deliberately excluded — no statutory treatment exists yet.
 */

export const INVOICE_SOURCE_TYPE = 'invoice'

const RECEIVABLE_ACCOUNT = '1200'
const REVENUE_ACCOUNT = '4000'

/** Narrow snapshot of the fields the adapter needs from a saved invoice. */
export interface InvoiceAccountingSnapshot {
  id: string
  invoice_number?: string | null
  client_name?: string | null
  issue_date?: string | null
  total?: number | string | null
}

export interface InvoiceAccountingEventInput {
  entityId: string
  invoice: InvoiceAccountingSnapshot
  tenantClient: TenantClient
}

export interface InvoiceAccountingSyncResult {
  attempted: boolean
  reason?: string
  sourceTransactionId?: string
  journalEntryId?: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function fail(message: string): never {
  throw new Error(message)
}

/**
 * Normalize the invoice total into the exact kobo string the source
 * transaction boundary requires (Decimal.js, ROUND_HALF_UP, 2 decimals).
 * Missing, malformed, zero, or negative totals never produce an event.
 */
export function buildInvoiceAmount(total: number | string | null | undefined): string {
  const raw = String(total ?? '').trim()
  if (!raw) fail('Invoice total is missing; no accounting event is created.')
  let amount: string
  try {
    amount = toKoboString(raw)
  } catch {
    fail('Invoice total is not a valid amount; no accounting event is created.')
  }
  if (!/^\d+\.\d{2}$/.test(amount) || Number(amount) <= 0) {
    fail('Invoice total must be a positive amount to create an accounting event.')
  }
  return amount
}

/**
 * Build the source-transaction ingest payload for a created invoice.
 * Provenance: source_type 'invoice', source_id = invoice id.
 * Idempotency key mirrors the database derivation so re-delivery is safe.
 */
export function buildInvoiceSourceTransactionInput(
  invoice: InvoiceAccountingSnapshot,
): {
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
  if (!invoice?.id) fail('Invoice id is required for the accounting event.')
  const amount = buildInvoiceAmount(invoice.total)
  return {
    sourceType: INVOICE_SOURCE_TYPE,
    sourceId: invoice.id,
    transactionDate: invoice.issue_date || todayIso(),
    amount,
    currencyCode: 'NGN',
    counterpartyType: 'customer',
    counterpartyName: invoice.client_name || null,
    sourceDocumentRef: invoice.invoice_number || null,
    idempotencyKey: `${INVOICE_SOURCE_TYPE}:${invoice.id}:ingest`,
    memo: invoice.invoice_number
      ? `Invoice ${invoice.invoice_number}${invoice.client_name ? ` for ${invoice.client_name}` : ''}`
      : null,
  }
}

/**
 * Build the balanced claim posting for a confirmed invoice source
 * transaction: debit receivable, credit revenue, same exact amount.
 */
export function buildInvoiceClaimPosting(
  invoice: InvoiceAccountingSnapshot,
): {
  entry: {
    source_type: string
    source_id: string
    idempotency_key: string
    transaction_date: string
    memo: string | null
  }
  lines: {
    account_code: string
    side: 'debit' | 'credit'
    amount: string
    memo: string | null
  }[]
} {
  if (!invoice?.id) fail('Invoice id is required for the claim posting.')
  const amount = buildInvoiceAmount(invoice.total)
  const transactionDate = invoice.issue_date || todayIso()
  return {
    entry: {
      source_type: INVOICE_SOURCE_TYPE,
      source_id: invoice.id,
      transaction_date: transactionDate,
      memo: invoice.invoice_number ? `Invoice claim ${invoice.invoice_number}` : 'Invoice claim posting',
      idempotency_key: `${INVOICE_SOURCE_TYPE}:${invoice.id}:post`,
    },
    lines: [
      {
        account_code: RECEIVABLE_ACCOUNT,
        side: 'debit',
        amount,
        memo: 'Invoice claim receivable',
      },
      {
        account_code: REVENUE_ACCOUNT,
        side: 'credit',
        amount,
        memo: 'Invoice claim revenue',
      },
    ],
  }
}

/**
 * Resolve the open accounting period that contains the invoice date.
 * Returns null when the entity has no open period covering the date —
 * the posting boundary requires an open period, and the adapter never
 * creates periods or posts outside one.
 */
export async function resolveOpenPeriod(
  tenantClient: TenantClient,
  transactionDate: string,
): Promise<{ code: string; startDate: string; endDate: string } | null> {
  const periods = await listPeriods(tenantClient)
  const open = periods.filter((period) => period.state === 'open')
  const covering = open.find(
    (period) => period.start_date <= transactionDate && transactionDate <= period.end_date,
  )
  return covering
    ? { code: covering.code, startDate: covering.start_date, endDate: covering.end_date }
    : null
}

/**
 * Run the full invoice accounting event through the controlled boundary.
 * Best-effort by design: an accounting failure must never break invoice
 * creation. Every failure is logged for the audit trail.
 *
 * Only the first creation of an invoice calls this. Edits, payment-driven
 * status changes, and operational overrides never post here.
 */
export async function syncInvoiceAccountingEvent(
  input: InvoiceAccountingEventInput,
): Promise<InvoiceAccountingSyncResult> {
  const { entityId, invoice, tenantClient } = input
  try {
    const ingestInput = buildInvoiceSourceTransactionInput(invoice)
    const transactionDate = ingestInput.transactionDate

    const { data: ingestData, error: ingestError } = await supabase.rpc(
      'ingest_source_transaction',
      {
        p_entity_id: entityId,
        p_source_type: ingestInput.sourceType,
        p_source_id: ingestInput.sourceId,
        p_transaction_date: ingestInput.transactionDate,
        p_amount: ingestInput.amount,
        p_currency_code: ingestInput.currencyCode,
        p_counterparty_type: ingestInput.counterpartyType,
        p_counterparty_name: ingestInput.counterpartyName,
        p_source_document_ref: ingestInput.sourceDocumentRef,
        p_evidence_refs: [],
        p_idempotency_key: ingestInput.idempotencyKey,
        p_memo: ingestInput.memo,
      },
    )
    if (ingestError) fail(`ingest_source_transaction failed: ${ingestError.message}`)
    const ingest = ingestData as { id?: string } | null
    if (!ingest?.id) fail('ingest_source_transaction returned no id')

    const { data: confirmData, error: confirmError } = await supabase.rpc(
      'confirm_source_transaction',
      {
        p_entity_id: entityId,
        p_source_transaction_id: ingest.id,
      },
    )
    if (confirmError) fail(`confirm_source_transaction failed: ${confirmError.message}`)

    const period = await resolveOpenPeriod(tenantClient, transactionDate)
    if (!period) {
      return {
        attempted: false,
        reason: 'no open accounting period covers the invoice date; posting skipped',
        sourceTransactionId: ingest.id,
      }
    }

    const posting = buildInvoiceClaimPosting(invoice)
    const { data: postData, error: postError } = await supabase.rpc(
      'post_from_source_transaction',
      {
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
      },
    )
    if (postError) fail(`post_from_source_transaction failed: ${postError.message}`)
    const posted = postData as { journal_entry_id?: string } | null

    return {
      attempted: true,
      sourceTransactionId: ingest.id,
      journalEntryId: posted?.journal_entry_id ?? null,
    }
  } catch (error) {
    console.error('[invoice-accounting] Invoice accounting event failed:', error)
    return {
      attempted: false,
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}
