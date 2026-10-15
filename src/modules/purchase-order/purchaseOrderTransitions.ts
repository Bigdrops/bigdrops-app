// ============================================================================
// SUPPLIER PURCHASE ORDER — status-only transitions
// ============================================================================
// The single path for status movement on a non-draft PO. Content (items,
// amounts, notes, terms, supplier, number) is never part of this
// operation: `transition_purchase_order_status` updates the status column
// only, atomically. Split from `purchaseOrderService.ts` so neither file
// exceeds the load-audit size limit; shared persistence helpers are
// imported from there.
// ============================================================================

import { assertPurchaseOrderTransition } from '@/domain/purchase-order/status'
import type { PurchaseOrderStatus } from '@/domain/purchase-order/types'
import {
  TRANSITION_RPC,
  auditPurchaseOrder,
  describeSaveError,
  readPurchaseOrderVersion,
  unwrapRpcPayload,
  type PurchaseOrderResult,
} from './purchaseOrderService'

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface TransitionPurchaseOrderStatusParams {
  purchaseOrderId: string
  toStatus: PurchaseOrderStatus
  /**
   * Optimistic-concurrency stamp. Defaults to the version read inside this
   * call, so a caller that just loaded the PO still gets stale-write
   * protection. Pass an older stamp to prove a conflict is rejected.
   */
  expectedUpdatedAt?: string | null
}

/**
 * Move a PO to a new status without touching its content.
 *
 * An archived PO is read-only until restored. A same-status call is a
 * proven no-op: the RPC changes nothing and reports the current status.
 */
export async function transitionPurchaseOrderStatus(
  tenantClient: any,
  entityId: string | null,
  params: TransitionPurchaseOrderStatusParams,
): Promise<PurchaseOrderResult<{ id: string; po_number: string; status: PurchaseOrderStatus }>> {
  const { purchaseOrderId, toStatus } = params

  if (!entityId) {
    return { data: null, error: 'Missing business context for this status change.' }
  }
  if (!purchaseOrderId) {
    return { data: null, error: 'Missing purchase order id for a status change.' }
  }

  const current = await readPurchaseOrderVersion(tenantClient, purchaseOrderId)
  if (current.error) return { data: null, error: current.error }
  if (!current.data) return { data: null, error: 'That purchase order no longer exists.' }
  if (current.data.archived_at) {
    return { data: null, error: 'This purchase order is archived. Restore it before making changes.' }
  }

  const transition = assertPurchaseOrderTransition(current.data.status, toStatus)
  if (!transition.valid) {
    return { data: null, error: transition.errorDescription ?? 'Illegal status change.' }
  }

  const { data, error } = await tenantClient.rpc(TRANSITION_RPC, {
    p_entity_id: entityId,
    p_purchase_order_id: purchaseOrderId,
    p_to_status: toStatus,
    p_expected_updated_at: params.expectedUpdatedAt ?? current.data.updated_at,
  })
  if (error) {
    return { data: null, error: describeSaveError(error, 'Could not change this purchase order status.') }
  }

  const rpcResult = unwrapRpcPayload(data) as Record<string, any> | null
  const result = {
    id: String(rpcResult?.id ?? purchaseOrderId),
    po_number: String(rpcResult?.po_number ?? current.data.header.po_number ?? ''),
    status: (rpcResult?.new_status ?? toStatus) as PurchaseOrderStatus,
  }

  await auditPurchaseOrder(tenantClient, async () => {
    const audit = await import('@/lib/audit')
    await audit.recordPurchaseOrderStatusChanged(
      tenantClient,
      result.id,
      result.po_number,
      current.data.status,
      result.status,
      current.data.header as unknown as Record<string, any>,
      { ...(current.data.header as unknown as Record<string, any>), status: result.status },
    )
  })

  return { data: result, error: null }
}
