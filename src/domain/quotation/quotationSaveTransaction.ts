import type { TenantClient } from '@/lib/tenantClient'
import type { InvoiceItem } from '@/domain/invoice/types'
import { toDbItem } from '@/domain/invoice/factories'
import { normalizeChainId } from '@/domain/cps/lineage'
import {
  loadCpsFeedbackRows,
  prepareCpsFeedbackPayload,
  type CpsFeedbackPayload,
} from '@/domain/cps/feedbackStore'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import { parseTrailingSequence, resolvePrefix } from '@/domain/prefixConstants'
import { getNextQuotationNumber } from '@/domain/quotation/normalize'
import { advanceAutoCursor, fetchAutoCursor } from '@/domain/documentNumbering'

/**
 * Phase 3.5 — the AUTHORITATIVE Quotation save transaction.
 *
 * One tenant transaction persists the Quotation parent row, replaces the exact
 * item set, applies the approved downstream CPS feedback plan and writes the
 * causal feedback audit. If any authoritative step fails, the whole save rolls
 * back, so the Quotation and the Cost & Pricing Sheet can never diverge on the
 * normal path.
 *
 * Before Phase 3.5 the Quotation save and the CPS feedback were two
 * transactions: a process death between them left the Quotation saved and the
 * CPS stale.
 *
 * The feedback plan is still produced by the PURE domain planner
 * (`@/domain/cps/feedback`) from the persisted before-state and the rows being
 * written. No diff logic lives in SQL, and no diff logic lives in a React hook.
 *
 * There is deliberately NO fallback here after an error. Failing visibly is
 * better than silently switching to a weaker consistency model.
 */

export interface QuotationTransactionInput {
  tenantClient: TenantClient
  entityId: string
  /** The serialized Quotation parent payload built by the form. */
  payload: Record<string, any>
  /** The normalized editor items; serialization happens here. */
  items: InvoiceItem[]
  isCreate: boolean
  /** The quotation being edited, when this is an update. */
  id?: string
  /** True when the number field holds an explicitly typed value. */
  numberIsManual: boolean
  documentPrefixes: any
  /** The persisted Quotation row from before this save. */
  initialQuotationSnapshot: Record<string, unknown> | null
}

export interface QuotationTransactionResult {
  data: any
  error: any
}

/**
 * Serialize the exact item set the save persists.
 *
 * The composite RPC supplies quotation_id itself, so the id column is not part
 * of the payload contract.
 */
export function serializeQuotationItems(
  items: InvoiceItem[],
): Array<Record<string, unknown>> {
  return items.map((item, index) => toDbItem(item, null, index) as Record<string, unknown>)
}

/**
 * Plan the approved downstream CPS feedback for this save.
 *
 * A Quotation only carries feedback authority when it descends from a Cost &
 * Pricing Sheet through a conversion chain. A Quotation with no chain returns
 * null, so an ordinary Quotation reads nothing extra and sends no plan.
 *
 * A baseline read failure THROWS, and the caller fails the save. It is never
 * flattened into an empty baseline: an empty baseline would classify every
 * linked row as newly added and would silently suppress the feedback the user
 * performed.
 */
async function planQuotationFeedback(
  input: QuotationTransactionInput,
  afterRows: Array<Record<string, unknown>>,
): Promise<CpsFeedbackPayload | null> {
  const chainId = normalizeChainId(input.initialQuotationSnapshot?.conversion_chain_id)
  if (!chainId) return null

  let beforeRows: Record<string, unknown>[]
  try {
    beforeRows = await loadCpsFeedbackRows(
      input.tenantClient,
      'quotation',
      String(input.id ?? ''),
    )
  } catch (baselineErr) {
    console.error('CPS downstream feedback baseline read failed:', baselineErr)
    throw new Error(
      'The pricing sheet could not be checked against the saved quotation items, so nothing was saved. Please try again.',
    )
  }

  const prepared = await prepareCpsFeedbackPayload(input.tenantClient, {
    documentType: 'quotation',
    documentId: input.id,
    documentNumber: String(input.initialQuotationSnapshot?.quotation_number || '') || null,
    sourceCpsId: (input.initialQuotationSnapshot?.source_cps_id as string | null) ?? null,
    chainId,
    beforeRows,
    afterRows,
  })

  return prepared.payload
}

/** Map a composite-save RPC error to a user-facing message. */
function quotationSaveError(error: any): any {
  if (!error) return error
  const code = String(error.code ?? '')
  const message = String(error.message ?? '')
  if (code === '42501' || /insufficient permissions/i.test(message)) {
    return { ...error, message: "You don't have permission to save this quotation." }
  }
  return error
}

/** Unwrap a PostgREST jsonb function return. */
function unwrapQuotationRpcResult(data: unknown): any {
  // PostgREST wraps a jsonb function return in an array.
  const rpcResult = Array.isArray(data) ? data[0] : data
  return rpcResult?.quotation ?? rpcResult
}

/**
 * Save a Quotation through the composite tenant transaction.
 *
 * A create has no conversion chain, so it sends no feedback plan. An update
 * plans the approved feedback from the persisted baseline before the
 * transaction opens and passes it inside the same transaction.
 */
export async function persistQuotationTransaction(
  input: QuotationTransactionInput,
): Promise<QuotationTransactionResult> {
  const { tenantClient, entityId, documentPrefixes } = input
  const items = serializeQuotationItems(input.items)

  if (input.isCreate) {
    // Manual numbers go first and stay authoritative; untouched pre-fills and
    // empty fields take the automatic path with collision retry.
    const manualNumber = input.numberIsManual
      ? String(input.payload.quotation_number || '').trim() || undefined
      : undefined
    const quotationPrefix = resolvePrefix(documentPrefixes, 'quotation')
    const quotationFamily = `${quotationPrefix}-`

    const created = await withUniqueRetry(
      async (candidateNumber: string) => {
        input.payload.quotation_number = candidateNumber
        const { data, error } = await tenantClient.rpc('save_quotation_with_items_transaction', {
          p_entity_id: entityId,
          p_quotation_payload: input.payload,
          p_items: items,
          p_mode: 'create',
          p_cps_feedback: null,
        })
        if (error) return { data: null, error: quotationSaveError(error) }
        return { data: unwrapQuotationRpcResult(data), error: null }
      },
      async () => {
        const [{ data: rows }, cursor] = await Promise.all([
          tenantClient.from('quotations').select('quotation_number'),
          fetchAutoCursor(tenantClient, quotationFamily),
        ])
        return getNextQuotationNumber(rows || [], quotationPrefix, cursor)
      },
      manualNumber,
    )

    // Advance the automatic cursor only for system-generated numbers.
    // Manual numbers never move it.
    if (!created.error && !manualNumber) {
      const seq = parseTrailingSequence(
        (created.data as { quotation_number?: string | null } | null)?.quotation_number ??
          input.payload.quotation_number,
      )
      if (seq !== null) await advanceAutoCursor(tenantClient, quotationFamily, seq)
    }
    return created
  }

  input.payload.id = input.id
  // Plan BEFORE the transaction, from the persisted baseline.
  const p_cps_feedback = await planQuotationFeedback(input, items)

  const { data, error } = await tenantClient.rpc('save_quotation_with_items_transaction', {
    p_entity_id: entityId,
    p_quotation_payload: input.payload,
    p_items: items,
    p_mode: 'update',
    ...(p_cps_feedback ? { p_cps_feedback } : {}),
  })
  if (error) return { data: null, error: quotationSaveError(error) }

  return { data: unwrapQuotationRpcResult(data), error: null }
}
