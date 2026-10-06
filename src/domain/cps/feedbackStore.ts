import { resolveAuditActor } from '@/lib/audit'
import type { TenantClient } from '@/lib/tenantClient'
import { normalizeChainId, normalizeLineageId } from './lineage'
import { readChainAuthority } from './lineageStore'
import {
  planCpsFeedback,
  type CpsFeedbackAuthority,
  type CpsFeedbackDocumentType,
  type CpsFeedbackMutation,
  type CpsFeedbackPlan,
} from './feedback'

/**
 * Phase 3 — persistence layer for controlled downstream CPS feedback.
 *
 * The pure planner (`./feedback`) decides WHAT may change. This module reads
 * the persisted inputs the planner needs, then applies the resulting plan
 * through one tenant transaction RPC
 * (`apply_cps_item_feedback_transaction`).
 *
 * Transaction architecture:
 *  - AUTHORITATIVE PATH — the Invoice save. The composite invoice RPC receives
 *    the plan as `p_cps_feedback` and applies the CPS mutation plus both causal
 *    audit events inside the invoice save transaction. A feedback failure
 *    therefore rolls the invoice save back.
 *  - COMPATIBILITY PATH — the Quotation save. Quotation items are written by
 *    the client (delete + insert), so the plan is applied by a separate
 *    transactional RPC call after the rows persist. The RPC itself is atomic
 *    (CPS mutation + causal audit commit together), but the downstream save and
 *    the feedback are two transactions. The unavoidable risk is a process
 *    death between them. That window is narrow and never silent: an RPC failure
 *    is surfaced and recorded, and it is documented in the Phase 3 report.
 *
 * Tenant safety: every read and write uses the caller's tenant client, and the
 * tenant RPC resolves every table through the caller's own schema. There is no
 * global join across entity schemas, and no cross-tenant id is accepted.
 */

/** Item table that carries the lineage contract for a document type. */
function itemTableFor(documentType: CpsFeedbackDocumentType): string {
  return documentType === 'invoice' ? 'invoice_items' : 'quotation_items'
}

function documentColumnFor(documentType: CpsFeedbackDocumentType): string {
  return documentType === 'invoice' ? 'invoice_id' : 'quotation_id'
}

/**
 * Read the persisted downstream item rows. This is the before-state for change
 * detection and it is read from the database, not from mutable editor state.
 */
export async function loadCpsFeedbackRows(
  tenantClient: TenantClient,
  documentType: CpsFeedbackDocumentType,
  documentId: string,
): Promise<Record<string, unknown>[]> {
  const id = normalizeLineageId(documentId)
  if (!id) return []

  const { data, error } = await tenantClient
    .from(itemTableFor(documentType))
    .select(
      'id, row_type, description, unit_price, image_url, source_cps_id, source_cps_row_id, sort_order',
    )
    .eq(documentColumnFor(documentType), id)
    .order('sort_order')

  if (error) return []
  return (data as Record<string, unknown>[] | null) ?? []
}

export interface CpsFeedbackContext {
  chainId: string | null
  sourceCpsId: string | null
  authority: CpsFeedbackAuthority | null
}

/**
 * Resolve the persisted feedback context for a document: its conversion chain,
 * its CPS root, and the chain's active authority.
 *
 * Authority is read from persisted state only. A document with no chain has no
 * authority and therefore no feedback.
 */
export async function resolveCpsFeedbackContext(
  tenantClient: TenantClient,
  input: {
    documentType: CpsFeedbackDocumentType
    documentId: string | null | undefined
    /**
     * The document's persisted chain root. The planner uses it as the EXPECTED
     * CPS document. The RPC re-derives the authoritative root from the chain
     * and refuses a mismatch, so a stale client value cannot retarget rows.
     */
    sourceCpsId?: string | null
    chainId: string | null | undefined
    documentNumber?: string | null
  },
): Promise<CpsFeedbackContext> {
  const chainId = normalizeChainId(input.chainId)
  const sourceCpsId = normalizeLineageId(input.sourceCpsId)
  if (!chainId && !sourceCpsId) {
    return { chainId: null, sourceCpsId: null, authority: null }
  }

  const authority = await readChainAuthority(tenantClient, {
    chainId,
    quotationId: input.documentType === 'quotation' ? normalizeLineageId(input.documentId) : null,
  })

  return {
    chainId,
    sourceCpsId,
    authority: {
      stage: authority.stage,
      documentId: authority.documentId,
      chainId,
    },
  }
}

export interface CpsFeedbackActor {
  id: string | null
  label: string
}

export interface CpsFeedbackPayload {
  chainId: string
  sourceDocumentType: CpsFeedbackDocumentType
  sourceDocumentId: string
  sourceDocumentNumber: string | null
  sourceCpsId: string
  actorId: string | null
  actorLabel: string | null
  mutations: Array<{
    sourceRowId: string | null
    sourceCpsRowId: string
    rowLabel: string
    changes: Array<{
      field: string
      label: string
      kind: string
      old: unknown
      new: unknown
    }>
  }>
}

function buildMutationPayload(mutation: CpsFeedbackMutation) {
  return {
    sourceRowId: mutation.sourceRowId,
    sourceCpsRowId: mutation.sourceCpsRowId,
    rowLabel: mutation.rowLabel,
    changes: mutation.changes.map((change) => ({
      field: change.cpsField,
      label: change.label,
      kind: change.kind,
      old: change.downstreamOldValue,
      new: change.downstreamNewValue,
    })),
  }
}

/**
 * Serialize a plan for the tenant RPC. Pure. Returns null when the plan
 * carries nothing to apply, so the caller never opens a transaction for an
 * ordinary save.
 */
export function buildCpsFeedbackPayload(
  plan: CpsFeedbackPlan,
  actor: CpsFeedbackActor,
): CpsFeedbackPayload | null {
  if (!plan.ok) return null
  if (plan.mutations.length === 0) return null
  if (!plan.chainId || !plan.sourceDocumentId || !plan.sourceCpsId) return null

  return {
    chainId: plan.chainId,
    sourceDocumentType: plan.sourceDocumentType,
    sourceDocumentId: plan.sourceDocumentId,
    sourceDocumentNumber: plan.sourceDocumentNumber,
    sourceCpsId: plan.sourceCpsId,
    actorId: actor.id,
    actorLabel: actor.label,
    mutations: plan.mutations.map(buildMutationPayload),
  }
}

export type CpsFeedbackStatus =
  | 'not-applicable'
  | 'no-change'
  | 'applied'
  | 'authority-mismatch'
  | 'no-op'
  | 'failed'

export interface CpsFeedbackOutcome {
  status: CpsFeedbackStatus
  /** Application mutations the RPC actually wrote. */
  applied: number
  /** Mutations the RPC refused (broken lineage, missing CPS row). */
  skipped: number
  error?: string
  detail?: string | null
}

const NOT_APPLICABLE: CpsFeedbackOutcome = { status: 'not-applicable', applied: 0, skipped: 0 }

/**
 * Plan and apply controlled downstream feedback for one document save.
 *
 * Never throws: the caller decides how to surface a failure. A failure is
 * always reported through `status` and `error`, so it can never be mistaken
 * for a successful synchronization.
 */
export async function runCpsDownstreamFeedback(
  tenantClient: TenantClient,
  input: {
    entityId: string | null
    documentType: CpsFeedbackDocumentType
    documentId: string | null | undefined
    documentNumber?: string | null
    sourceCpsId?: string | null
    chainId: string | null | undefined
    beforeRows: readonly Record<string, unknown>[] | null | undefined
    afterRows: readonly Record<string, unknown>[] | null | undefined
    actor?: CpsFeedbackActor
  },
): Promise<CpsFeedbackOutcome> {
  const chainId = normalizeChainId(input.chainId)
  const sourceCpsId = normalizeLineageId(input.sourceCpsId)
  if (!chainId && !sourceCpsId) return NOT_APPLICABLE

  const context = await resolveCpsFeedbackContext(tenantClient, {
    documentType: input.documentType,
    documentId: input.documentId,
    sourceCpsId,
    chainId: input.chainId,
    documentNumber: input.documentNumber,
  })

  const plan = planCpsFeedback({
    sourceDocumentType: input.documentType,
    sourceDocumentId: input.documentId,
    sourceDocumentNumber: input.documentNumber ?? null,
    chainId: context.chainId,
    authority: context.authority,
    beforeRows: input.beforeRows,
    afterRows: input.afterRows,
  })

  if (!plan.ok) return NOT_APPLICABLE

  const actor = input.actor ?? (await resolveAuditActor())
  const payload = buildCpsFeedbackPayload(plan, actor)
  if (!payload) return { status: 'no-change', applied: 0, skipped: plan.skipped.length }

  return applyCpsFeedbackPayload(tenantClient, input.entityId, payload, plan)
}

async function applyCpsFeedbackPayload(
  tenantClient: TenantClient,
  entityId: string | null,
  payload: CpsFeedbackPayload,
  plan: CpsFeedbackPlan,
): Promise<CpsFeedbackOutcome> {
  const { data, error } = await tenantClient.rpc('apply_cps_item_feedback_transaction', {
    p_entity_id: entityId,
    p_feedback: payload,
  })

  if (error) {
    return {
      status: 'failed',
      applied: 0,
      skipped: plan.skipped.length,
      error: error.message || 'CPS feedback transaction failed.',
    }
  }

  // PostgREST wraps a jsonb function return in an array.
  const result = (Array.isArray(data) ? data[0] : data) as
    | { status?: string; applied?: number; skipped?: number; diagnostics?: string | null }
    | null

  const status = String(result?.status ?? '')
  if (status === 'authority-mismatch') {
    return { status: 'authority-mismatch', applied: 0, skipped: plan.skipped.length }
  }
  if (status === 'no-op') {
    return { status: 'no-op', applied: 0, skipped: Number(result?.skipped ?? 0) }
  }

  return {
    status: 'applied',
    applied: Number(result?.applied ?? 0),
    skipped: Number(result?.skipped ?? 0),
    detail: result?.diagnostics ?? null,
  }
}
