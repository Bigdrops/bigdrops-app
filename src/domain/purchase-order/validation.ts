// ============================================================================
// SUPPLIER PURCHASE ORDER — domain validation
// ============================================================================
// Pure checks over a PO draft. No database access, no calculation.
//
// These are the same guarantees `save_purchase_order_with_items_transaction`
// enforces server-side. The domain refuses early with a user-facing message;
// the database refuses again so a caller that bypasses this module still
// cannot persist an invalid PO.
//
// Every rule below is either structural (a column is NOT NULL, or a foreign key
// must resolve) or an existing document-form convention (at least one described
// line). No financial rule is defined here: amounts are only range-checked,
// never derived.
// ============================================================================

import {
  PURCHASE_ORDER_STATUSES,
  isPurchaseOrderStatus,
  type PurchaseOrder,
} from './types'

export interface PurchaseOrderValidationResult {
  valid: boolean
  error?: string
  errorDescription?: string
  /** Domain field that caused the refusal, for focus management. */
  field?: string
  /** Item index that caused the refusal, when the fault is on a line. */
  rowIndex?: number
}

function invalid(
  error: string,
  errorDescription: string,
  extra: { field?: string; rowIndex?: number } = {},
): PurchaseOrderValidationResult {
  return { valid: false, error, errorDescription, ...extra }
}

function isFiniteNumber(value: unknown): boolean {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num)
}

/** A real calendar day in `YYYY-MM-DD`, rejecting overflowed dates like 2026-02-31. */
export function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

const AMOUNT_FIELDS = ['subtotal', 'discount', 'vat', 'total'] as const

/**
 * Validate a PO draft.
 *
 * `requireNumber` is true on create: a PO is always issued with a number, and
 * the create path allocates one before this check runs. It is false on update,
 * where the number is immutable identity and is not part of the payload.
 */
export function validatePurchaseOrder(
  purchaseOrder: PurchaseOrder,
  options: { requireNumber?: boolean } = {},
): PurchaseOrderValidationResult {
  const { requireNumber = true } = options

  if (requireNumber && !String(purchaseOrder.po_number ?? '').trim()) {
    return invalid(
      'Purchase order number required',
      'Enter a purchase order number or let BOURXE generate one.',
      { field: 'po_number' },
    )
  }

  if (!String(purchaseOrder.supplier_id ?? '').trim()) {
    return invalid(
      'Supplier required',
      'Choose the supplier this purchase order is issued to.',
      { field: 'supplier_id' },
    )
  }

  if (!isPurchaseOrderStatus(purchaseOrder.status)) {
    return invalid(
      'Unknown status',
      `A purchase order status must be one of: ${PURCHASE_ORDER_STATUSES.join(', ')}.`,
      { field: 'status' },
    )
  }

  const poDate = String(purchaseOrder.po_date ?? '').trim()
  if (poDate && !isIsoCalendarDate(poDate)) {
    return invalid('Invalid date', 'Enter the purchase order date as a valid day.', {
      field: 'po_date',
    })
  }

  if (!String(purchaseOrder.currency ?? '').trim()) {
    return invalid('Currency required', 'Enter the currency for this purchase order.', {
      field: 'currency',
    })
  }

  for (const field of AMOUNT_FIELDS) {
    const value = purchaseOrder[field]
    if (!isFiniteNumber(value)) {
      return invalid('Invalid amount', `The ${field} amount is not a number.`, { field })
    }
    if (Number(value) < 0) {
      return invalid('Invalid amount', `The ${field} amount cannot be negative.`, { field })
    }
  }

  const items = purchaseOrder.items ?? []
  const described = items.filter((item) => String(item.description ?? '').trim())
  if (described.length === 0) {
    return invalid(
      'Validation Error',
      'Add at least one item before saving this purchase order.',
      { field: 'items' },
    )
  }

  // Every line needs a description, matching the invoice and quotation save
  // convention. A blank row is never silently dropped from a procurement
  // document.
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    const hasDescription = Boolean(String(item.description ?? '').trim())

    if (!hasDescription) {
      return invalid(
        'Validation Error',
        `Item ${index + 1} needs a description before saving.`,
        { field: 'items', rowIndex: index },
      )
    }

    if (!isFiniteNumber(item.quantity) || Number(item.quantity) < 0) {
      return invalid(
        'Invalid quantity',
        `Item ${index + 1} quantity must be a number of zero or more.`,
        { field: 'items', rowIndex: index },
      )
    }

    if (!isFiniteNumber(item.unit_cost) || Number(item.unit_cost) < 0) {
      return invalid(
        'Invalid unit cost',
        `Item ${index + 1} unit cost must be a number of zero or more.`,
        { field: 'items', rowIndex: index },
      )
    }
  }

  return { valid: true }
}
