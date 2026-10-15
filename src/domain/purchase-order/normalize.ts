// ============================================================================
// SUPPLIER PURCHASE ORDER — payload normalisation
// ============================================================================
// Shapes the domain object into the exact payload
// `save_purchase_order_with_items_transaction` accepts.
//
// The database stores PREPARED totals. Nothing here recomputes money: the
// totals written are the ones `computeDocument()` produced in
// `src/domain/purchase-order/calculations.ts`.
//
// `supplier_name` is deliberately absent from this payload. The save RPC
// resolves the snapshot from the supplier row inside the same tenant schema,
// so a caller can never claim a supplier name that does not belong to the
// supplier id it sent.
//
// `po_number` and `supplier_id` travel on the create payload only. Both are
// identity: the update branch of the save RPC does not list them in its SET
// clause, so a later edit can never rewrite either one.
// ============================================================================

import {
  PURCHASE_ORDER_DEFAULT_CURRENCY,
  type PurchaseOrder,
  type PurchaseOrderItem,
} from './types'

/** A PO header payload for the save RPC. */
export interface PurchaseOrderRpcPayload {
  id?: string
  po_number: string
  po_date: string | null
  supplier_id: string
  status: string
  currency: string
  subtotal: number
  discount: number
  vat: number
  extra_charges: unknown[]
  total: number
  calculation_inputs: Record<string, unknown>
  notes: string | null
  terms: string | null
}

/** A PO item payload for the save RPC. */
export interface PurchaseOrderItemRpcPayload {
  description: string
  quantity: number
  unit: string | null
  unit_cost: number
  line_total: number
  sort_order: number
}

function trimmedOrNull(value: unknown): string | null {
  const text = String(value ?? '').trim()
  return text.length ? text : null
}

function finiteNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : fallback
}

/**
 * Build the header payload.
 *
 * Prepared totals are passed through unchanged: the amounts written are the
 * ones the calculation adapter produced, never a value recomputed here.
 */
export function toPurchaseOrderRpcPayload(
  purchaseOrder: PurchaseOrder,
): PurchaseOrderRpcPayload {
  const payload: PurchaseOrderRpcPayload = {
    po_number: String(purchaseOrder.po_number ?? '').trim(),
    po_date: trimmedOrNull(purchaseOrder.po_date),
    supplier_id: String(purchaseOrder.supplier_id ?? '').trim(),
    status: purchaseOrder.status,
    currency: String(purchaseOrder.currency || PURCHASE_ORDER_DEFAULT_CURRENCY).trim(),
    subtotal: finiteNumber(purchaseOrder.subtotal),
    discount: finiteNumber(purchaseOrder.discount),
    vat: finiteNumber(purchaseOrder.vat),
    extra_charges: (purchaseOrder.extra_charges ?? []).map((charge) => ({
      label: String(charge.label ?? '').trim(),
      value: finiteNumber(charge.value),
      withTax: charge.withTax === true,
    })),
    total: finiteNumber(purchaseOrder.total),
    calculation_inputs: {
      vatPercent: finiteNumber(purchaseOrder.calculation_inputs?.vatPercent),
      discountType: purchaseOrder.calculation_inputs?.discountType ?? 'percent',
      discountTiming: purchaseOrder.calculation_inputs?.discountTiming ?? 'before_tax',
      discountValue: finiteNumber(purchaseOrder.calculation_inputs?.discountValue),
    },
    notes: trimmedOrNull(purchaseOrder.notes),
    terms: trimmedOrNull(purchaseOrder.terms),
  }

  if (purchaseOrder.id) payload.id = purchaseOrder.id

  return payload
}

/**
 * Build the item payload list.
 *
 * `sort_order` is taken from the array position so the persisted order always
 * matches the order the caller presented, and `line_total` is the prepared
 * line amount (quantity × unit_cost) supplied by the calculation adapter.
 */
export function toPurchaseOrderItemRpcPayloads(
  items: PurchaseOrderItem[],
): PurchaseOrderItemRpcPayload[] {
  return (items ?? []).map((item, index) => ({
    description: String(item.description ?? '').trim(),
    quantity: finiteNumber(item.quantity),
    unit: trimmedOrNull(item.unit),
    unit_cost: finiteNumber(item.unit_cost),
    line_total: finiteNumber(item.line_total),
    sort_order: index,
  }))
}
