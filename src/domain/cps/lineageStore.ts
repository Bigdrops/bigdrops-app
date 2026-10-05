import type { TenantClient } from '@/lib/tenantClient'
import {
  LINEAGE_COLUMNS,
  normalizeLineageId,
  type FeedbackAuthorityStage,
} from './lineage'

/**
 * Phase 2 lineage persistence.
 *
 * The composite tenant RPC (`save_invoice_with_items_transaction`) writes a
 * fixed `invoice_items` column list, so it does not carry lineage columns.
 * Lineage is therefore written in a follow-up step keyed by the row's stable
 * `(invoice_id, sort_order)` pair — never by position in a mutable UI array,
 * and never by description.
 *
 * Failure behaviour is explicit: a row that could not be stamped is reported
 * back to the caller instead of being silently dropped, so the caller can
 * record a diagnostic audit event.
 */

export interface LineageApplyFailure {
  sortOrder: number
  reason: string
}

export interface LineageApplyResult {
  applied: number
  skipped: number
  failures: LineageApplyFailure[]
}

/** Read the sort_order a serialized item row was written with. */
function readSortOrder(row: Record<string, unknown> | null | undefined): number | null {
  const value = Number(row?.sort_order)
  return Number.isFinite(value) ? value : null
}

function buildLineagePayload(row: Record<string, unknown>): Record<string, string | null> {
  const payload: Record<string, string | null> = {}
  for (const column of LINEAGE_COLUMNS) {
    payload[column] = normalizeLineageId(row[column])
  }
  return payload
}

/**
 * Stamp CPS/Quotation lineage onto already-persisted invoice items.
 *
 * `rows` must be the exact serialized rows handed to the write that created
 * the items (each carries the `sort_order` it was written with). Rows with no
 * lineage are skipped: a row added directly in the Invoice stays
 * lineage-null.
 */
export async function applyInvoiceItemLineage(
  tenantClient: TenantClient,
  invoiceId: string,
  rows: Array<Record<string, unknown>>,
): Promise<LineageApplyResult> {
  const result: LineageApplyResult = { applied: 0, skipped: 0, failures: [] }
  if (!invoiceId) return result

  const targets: Array<{ sortOrder: number; payload: Record<string, string | null> }> = []
  const seenSortOrders = new Set<number>()

  for (const row of rows || []) {
    const payload = buildLineagePayload(row)
    const hasLineage = LINEAGE_COLUMNS.some((column) => payload[column] !== null)
    if (!hasLineage) {
      result.skipped += 1
      continue
    }

    const sortOrder = readSortOrder(row)
    if (sortOrder === null) {
      result.failures.push({ sortOrder: -1, reason: 'Row has lineage but no stable sort order.' })
      continue
    }
    // Ambiguous ordering must never decide ancestry.
    if (seenSortOrders.has(sortOrder)) {
      result.failures.push({ sortOrder, reason: 'Duplicate sort order in the converted row set.' })
      continue
    }

    seenSortOrders.add(sortOrder)
    targets.push({ sortOrder, payload })
  }

  await Promise.all(
    targets.map(async ({ sortOrder, payload }) => {
      const { data, error } = await tenantClient
        .from('invoice_items')
        .update(payload)
        .eq('invoice_id', invoiceId)
        .eq('sort_order', sortOrder)
        .select('id')

      if (error) {
        result.failures.push({ sortOrder, reason: error.message || 'Lineage update failed.' })
        return
      }
      if (!Array.isArray(data) || data.length === 0) {
        result.failures.push({ sortOrder, reason: 'No matching invoice item row for that sort order.' })
        return
      }
      result.applied += 1
    }),
  )

  return result
}

/**
 * Persist the active downstream feedback authority for a CPS conversion
 * chain. Idempotent: writing the same stage/document pair again is a no-op
 * in effect, so a retried conversion cannot produce contradictory state.
 */
export async function persistFeedbackAuthority(
  tenantClient: TenantClient,
  quotationId: string,
  stage: FeedbackAuthorityStage,
  documentId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!quotationId) return { ok: false, error: 'Missing quotation id.' }

  const { error } = await tenantClient
    .from('quotations')
    .update({
      feedback_authority: stage,
      feedback_authority_document_id: normalizeLineageId(documentId),
      feedback_authority_updated_at: new Date().toISOString(),
    })
    .eq('id', quotationId)

  if (error) return { ok: false, error: error.message || 'Authority update failed.' }
  return { ok: true }
}
