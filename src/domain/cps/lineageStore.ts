import type { TenantClient } from '@/lib/tenantClient'
import {
  LINEAGE_COLUMNS,
  normalizeChainId,
  normalizeLineageId,
  type FeedbackAuthorityStage,
} from './lineage'

/**
 * CPS conversion-chain authority + lineage repair.
 *
 * Phase 2.5 moved lineage INTO the invoice save transaction: tenant RPC
 * `save_invoice_with_items_transaction` now writes source_cps_id,
 * source_cps_row_id, source_quotation_id and source_quotation_item_id in the
 * same INSERT as the invoice item rows. The authoritative save path therefore
 * writes no lineage after the fact and this module exports no post-write stamp
 * for it.
 *
 * Two responsibilities remain here:
 *  - `persistChainAuthority` / `readChainAuthority` own the single quotation
 *    row that carries downstream feedback authority for a conversion chain.
 *  - `repairInvoiceItemLineage` is retained as a COMPATIBILITY/REPAIR-only
 *    helper for rows a pre-2.5 tenant RPC already wrote without lineage. It
 *    keys on the row's stable `(invoice_id, sort_order)` pair — never on
 *    position in a mutable UI array and never on description — and it must
 *    not be called on the success path.
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
 * COMPATIBILITY / REPAIR ONLY — not part of the normal save path.
 *
 * Phase 2.5 moved lineage into the invoice save transaction itself
 * (`save_invoice_with_items_transaction` writes all four lineage columns in the
 * same INSERT as the item rows), so a successful save never needs a
 * post-write stamp. This helper is retained, isolated, and documented only for
 * repairing rows that a pre-2.5 tenant RPC already wrote without lineage (or
 * stamping items in a tenant whose RPC has not been upgraded yet).
 *
 * Do not call it on the success path: that would reintroduce the
 * two-write window the transactional path exists to remove.
 *
 * `rows` must be the exact serialized rows handed to the write that created
 * the items (each carries the `sort_order` it was written with). Rows with no
 * lineage are skipped: a row added directly in the Invoice stays lineage-null.
 */
export async function repairInvoiceItemLineage(
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

export interface PersistChainAuthorityInput {
  /** Conversion chain whose authority is moving. */
  chainId?: string | null
  /** The conversion target. Used as the authority row when no chain row owns it. */
  quotationId: string
  /**
   * Explicit authority row, when the caller already knows it (for example the
   * Invoice's `source_quotation_id` during a revert). Deterministic; never
   * guessed from timestamps.
   */
  authorityRowId?: string | null
  stage: FeedbackAuthorityStage
  documentId: string | null
}

export interface ChainAuthorityResult {
  ok: boolean
  error?: string
  /** Quotation row that carries the authority columns for this chain. */
  authorityRowId: string | null
  /** Authority state before this write, for the audit event. */
  previous: { stage: FeedbackAuthorityStage | null; documentId: string | null }
}

interface AuthorityProbe {
  id?: string | null
  feedback_authority?: string | null
  feedback_authority_document_id?: string | null
}

function readProbe(row: AuthorityProbe | null | undefined): ChainAuthorityResult['previous'] {
  const stage = String(row?.feedback_authority ?? '').trim().toLowerCase()
  const documentId = normalizeLineageId(row?.feedback_authority_document_id)
  if (stage !== 'quotation' && stage !== 'invoice') return { stage: null, documentId }
  return { stage, documentId }
}

/**
 * Persist the active downstream feedback authority for one CPS conversion
 * chain.
 *
 * At most ONE quotation row owns authority per chain: the CPS conversion
 * target. That row is resolved from persisted state only — explicitly when the
 * caller knows it, otherwise by chain id. Never from edit recency, document
 * status, or document existence.
 *
 * Idempotent: writing the same stage/document pair again converges on the same
 * state, so a retried conversion or revert cannot produce contradictory
 * authority. A failed write is reported instead of being reported as success.
 */
export async function persistChainAuthority(
  tenantClient: TenantClient,
  input: PersistChainAuthorityInput,
): Promise<ChainAuthorityResult> {
  const authorityRowId = await resolveAuthorityRowId(tenantClient, input)
  if (!authorityRowId) {
    return {
      ok: false,
      error: 'No quotation row owns downstream feedback authority for this chain.',
      authorityRowId: null,
      previous: { stage: null, documentId: null },
    }
  }

  // Read the state the chain is leaving, so callers can audit the transition.
  const previous = await readAuthorityRow(tenantClient, authorityRowId)

  const chainId = normalizeChainId(input.chainId)
  const { error } = await tenantClient
    .from('quotations')
    .update({
      feedback_authority: input.stage,
      feedback_authority_document_id: normalizeLineageId(input.documentId),
      feedback_authority_updated_at: new Date().toISOString(),
      ...(chainId ? { conversion_chain_id: chainId } : {}),
    })
    .eq('id', authorityRowId)

  if (error) {
    return {
      ok: false,
      error: error.message || 'Authority update failed.',
      authorityRowId,
      previous,
    }
  }

  return { ok: true, authorityRowId, previous }
}

async function readAuthorityRow(
  tenantClient: TenantClient,
  quotationId: string,
): Promise<ChainAuthorityResult['previous']> {
  const { data } = await tenantClient
    .from('quotations')
    .select('feedback_authority, feedback_authority_document_id')
    .eq('id', quotationId)
    .limit(1)
  return readProbe((data as AuthorityProbe[] | null)?.[0] ?? null)
}

async function resolveAuthorityRowId(
  tenantClient: TenantClient,
  input: PersistChainAuthorityInput,
): Promise<string | null> {
  const explicit = normalizeLineageId(input.authorityRowId)
  if (explicit) return explicit

  const chainId = normalizeChainId(input.chainId)
  if (chainId) {
    const { data } = await tenantClient
      .from('quotations')
      .select('id')
      .eq('conversion_chain_id', chainId)
      .not('feedback_authority', 'is', null)
      .limit(1)
    const found = (data as Array<{ id?: string | null }> | null)?.[0]?.id
    if (normalizeLineageId(found)) return normalizeLineageId(found)
  }

  return normalizeLineageId(input.quotationId)
}

/**
 * Read the current authority state for a chain without changing it. Used for
 * audit before/after values.
 */
export async function readChainAuthority(
  tenantClient: TenantClient,
  input: { chainId?: string | null; quotationId?: string | null },
): Promise<ChainAuthorityResult['previous']> {
  const chainId = normalizeChainId(input.chainId)
  if (chainId) {
    const { data } = await tenantClient
      .from('quotations')
      .select('feedback_authority, feedback_authority_document_id')
      .eq('conversion_chain_id', chainId)
      .not('feedback_authority', 'is', null)
      .limit(1)
    const row = (data as AuthorityProbe[] | null)?.[0]
    if (row) return readProbe(row)
  }

  const quotationId = normalizeLineageId(input.quotationId)
  if (!quotationId) return { stage: null, documentId: null }

  const { data } = await tenantClient
    .from('quotations')
    .select('feedback_authority, feedback_authority_document_id')
    .eq('id', quotationId)
    .limit(1)
  return readProbe((data as AuthorityProbe[] | null)?.[0] ?? null)
}
