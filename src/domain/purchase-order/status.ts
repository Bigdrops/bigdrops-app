// ============================================================================
// SUPPLIER PURCHASE ORDER LIFECYCLE
// ============================================================================
// The PO life cycle is INDEPENDENT of every other document life cycle. It is
// never derived from invoice payment rules, never derived from goods received,
// and never derived from a supplier balance.
//
// Proposed and enforced transition table:
//
//   draft      -> draft | issued | cancelled
//   issued     -> issued | cancelled | closed
//   cancelled  -> cancelled                      (terminal)
//   closed     -> closed                         (terminal)
//
// Reading of the two terminal rules:
//   * "A cancelled PO must not be silently reactivated" — `cancelled` has no
//     outgoing edge to `draft` or `issued`.
//   * "A closed PO must not be edited as an active draft" — `closed` has no
//     outgoing edge to `draft`.
//
// A self-transition is legal. Re-saving a PO without changing its status is a
// normal content edit.
//
// The same table is enforced server-side inside
// `save_purchase_order_with_items_transaction`, so a caller that bypasses this
// module still cannot make an illegal transition.
// ============================================================================

import {
  PURCHASE_ORDER_STATUSES,
  type PurchaseOrderStatus,
} from './types'

/**
 * Every legal transition, including the identity transition.
 * A status absent from its own list is unreachable, which is how both terminal
 * states are expressed.
 */
export const PURCHASE_ORDER_TRANSITIONS: Record<
  PurchaseOrderStatus,
  readonly PurchaseOrderStatus[]
> = {
  draft: ['draft', 'issued', 'cancelled'],
  issued: ['issued', 'cancelled', 'closed'],
  cancelled: ['cancelled'],
  closed: ['closed'],
} as const

export interface PurchaseOrderTransitionResult {
  valid: boolean
  error?: string
  errorDescription?: string
}

/** A terminal PO has no outgoing edge away from its own status. */
export function isTerminalPurchaseOrderStatus(status: PurchaseOrderStatus): boolean {
  return PURCHASE_ORDER_TRANSITIONS[status].every((next) => next === status)
}

/**
 * A PO is "active" while it can still move forward: a draft can be issued, an
 * issued order can be closed. Cancelled and closed orders are not active.
 */
export function isActivePurchaseOrderStatus(status: PurchaseOrderStatus): boolean {
  return !isTerminalPurchaseOrderStatus(status)
}

export function allowedPurchaseOrderTransitions(
  status: PurchaseOrderStatus,
): readonly PurchaseOrderStatus[] {
  return PURCHASE_ORDER_TRANSITIONS[status]
}

export function canTransitionPurchaseOrder(
  from: PurchaseOrderStatus,
  to: PurchaseOrderStatus,
): boolean {
  if (!PURCHASE_ORDER_STATUSES.includes(from)) return false
  if (!PURCHASE_ORDER_STATUSES.includes(to)) return false
  return PURCHASE_ORDER_TRANSITIONS[from].includes(to)
}

/**
 * Guard for a status change. Returns a user-facing refusal instead of throwing,
 * matching the document-save convention.
 */
export function assertPurchaseOrderTransition(
  from: PurchaseOrderStatus,
  to: PurchaseOrderStatus,
): PurchaseOrderTransitionResult {
  if (canTransitionPurchaseOrder(from, to)) return { valid: true }

  if (isTerminalPurchaseOrderStatus(from)) {
    return {
      valid: false,
      error: 'Status locked',
      errorDescription: `A ${from} purchase order is final and cannot be changed.`,
    }
  }

  return {
    valid: false,
    error: 'Illegal status change',
    errorDescription: `A purchase order cannot move from ${from} to ${to}.`,
  }
}

/** The statuses offered as next steps from the current status. */
export function nextPurchaseOrderStatuses(
  status: PurchaseOrderStatus,
): PurchaseOrderStatus[] {
  return PURCHASE_ORDER_TRANSITIONS[status].filter((next) => next !== status)
}

/**
 * Content (items, quantities, unit costs, tax inputs, discounts, extra
 * charges, notes, terms, supplier, number) is editable on a draft only.
 * Once a PO leaves draft, the save authority rejects content updates and
 * only the dedicated status-transition operation may change the status.
 */
export function isPurchaseOrderContentEditable(status: PurchaseOrderStatus): boolean {
  return status === 'draft'
}
