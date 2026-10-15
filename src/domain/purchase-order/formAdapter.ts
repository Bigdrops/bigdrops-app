// ============================================================================
// SUPPLIER PURCHASE ORDER — shared-form adapter
// ============================================================================
// Pure mapping between the PO domain and the shared document form's
// invoice-shaped contract. No JSX, no database access, no arithmetic.
//
// The shared form edits `unit_price`, `invoice_number`, `issue_date`,
// `discount` and `vat`. A PO persists `unit_cost`, `po_number`,
// `po_date`, and rate inputs inside `calculation_inputs`. This module is
// the only place that translates between the two vocabularies, so a
// procurement cost can never be mistaken for a sales price and the form
// can never write a column the backend does not have.
//
// Pendings that stay hidden by the PO descriptor (title, client PO
// reference, due date, payment terms, WHT, additional fields, header
// custom fields, signatory, reference links) have no mapping here by
// design: there is nowhere to persist them.
// ============================================================================

import type { PurchaseOrder, PurchaseOrderItem } from './types'
import { createEmptyPurchaseOrderItem } from './types'

/** Minimal column set for the PO line editor. `unit_price` keeps the
 * shared editor's field name but carries the procurement label. */
export const PURCHASE_ORDER_FORM_COLUMNS: Array<{
  key: string
  label: string
  visible: boolean
  visibilityMode: 'show'
  removable: boolean
}> = [
  { key: 'description', label: 'Description', visible: true, visibilityMode: 'show', removable: false },
  { key: 'quantity', label: 'Quantity', visible: true, visibilityMode: 'show', removable: false },
  { key: 'unit', label: 'Unit', visible: true, visibilityMode: 'show', removable: false },
  { key: 'unit_price', label: 'Unit Cost', visible: true, visibilityMode: 'show', removable: false },
  { key: 'amount', label: 'Amount', visible: true, visibilityMode: 'show', removable: false },
]

/** A form row: the PO line plus the editor's working fields. */
export type PurchaseOrderFormItem = PurchaseOrderItem & {
  row_type: 'standard'
  /** Working mirror of `unit_cost` for the shared item editor. */
  unit_price: number
  _uiKey: string
}

function finiteNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : fallback
}

/** Present PO lines to the shared line editor. The domain rows stay the
 * source of truth; `unit_price` is a read-through mirror. */
export function toPurchaseOrderFormItems(purchaseOrder: PurchaseOrder): PurchaseOrderFormItem[] {
  return (purchaseOrder.items ?? []).map((item, index) => ({
    ...item,
    row_type: 'standard' as const,
    unit_price: finiteNumber(item.unit_cost),
    sort_order: index,
    _uiKey:
      item._uiKey ||
      (typeof item.id === 'string' && item.id ? item.id : `po-new-${index}-${Date.now()}`),
  }))
}

/** A blank PO line for the editor. */
export function createPurchaseOrderFormItem(sortOrder = 0): PurchaseOrderFormItem {
  return {
    ...createEmptyPurchaseOrderItem(sortOrder),
    row_type: 'standard' as const,
    unit_price: 0,
    _uiKey:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `po-new-${sortOrder}-${Date.now()}`,
  }
}

/**
 * Route a shared-editor item edit back into PO state.
 * `unit_price` writes `unit_cost`; every other field passes through.
 * The mirror is refreshed on the next `toPurchaseOrderFormItems` call.
 */
export function applyPurchaseOrderItemUpdate(
  items: PurchaseOrderItem[],
  index: number,
  field: string,
  value: unknown,
): PurchaseOrderItem[] {
  return (items ?? []).map((item, position) => {
    if (position !== index) return item
    if (field === 'unit_price') {
      return { ...item, unit_cost: finiteNumber(value) }
    }
    if (field === 'quantity') {
      return { ...item, quantity: finiteNumber(value) }
    }
    if (field === 'line_total') {
      return item
    }
    return { ...item, [field]: value } as PurchaseOrderItem
  })
}

/** Header model for the shared form. Rate inputs travel as the form's
 * `discount` / `vat` fields; computed amounts never travel upward. */
export function toSharedHeaderModel(purchaseOrder: PurchaseOrder): Record<string, unknown> {
  const inputs = purchaseOrder.calculation_inputs
  return {
    document_type: 'purchase_order',
    invoice_number: purchaseOrder.po_number || '',
    issue_date: purchaseOrder.po_date || '',
    due_date: '',
    supplier_id: purchaseOrder.supplier_id || '',
    supplier_name: purchaseOrder.supplier_name || '',
    discount: inputs?.discountValue ?? 0,
    vat: inputs?.vatPercent ?? 0,
    wht: 0,
    workmanship: 0,
    transportation: 0,
    shipping: 0,
    payment_terms: 'Custom',
    custom_payment_terms: '',
    notes: purchaseOrder.notes || '',
    terms: purchaseOrder.terms || '',
  }
}

/** The form's discount-timing vocabulary is `before` / `after`. */
export function toFormDiscountTiming(
  timing: PurchaseOrder['calculation_inputs']['discountTiming'],
): 'before' | 'after' {
  return timing === 'after_tax' ? 'after' : 'before'
}

export function toDomainDiscountTiming(
  timing: 'before' | 'after',
): PurchaseOrder['calculation_inputs']['discountTiming'] {
  return timing === 'after' ? 'after_tax' : 'before_tax'
}

/**
 * Route a shared-form header edit back into PO state.
 * Returns null when the field has no PO column (defensive: hidden
 * sections never emit these, but a silent drop beats a wrong write).
 */
export function applySharedHeaderUpdate(
  purchaseOrder: PurchaseOrder,
  field: string,
  value: unknown,
): PurchaseOrder | null {
  switch (field) {
    case 'invoice_number':
      return { ...purchaseOrder, po_number: String(value ?? '').trim() }
    case 'issue_date':
      return { ...purchaseOrder, po_date: String(value ?? '') }
    case 'supplier_id':
      return { ...purchaseOrder, supplier_id: String(value ?? '') }
    case 'supplier_name':
      return { ...purchaseOrder, supplier_name: String(value ?? '') }
    case 'discount':
      return {
        ...purchaseOrder,
        calculation_inputs: {
          ...purchaseOrder.calculation_inputs,
          discountValue: finiteNumber(value),
        },
      }
    case 'vat':
      return {
        ...purchaseOrder,
        calculation_inputs: {
          ...purchaseOrder.calculation_inputs,
          vatPercent: finiteNumber(value),
        },
      }
    case 'notes':
      return { ...purchaseOrder, notes: String(value ?? '') }
    case 'terms':
      return { ...purchaseOrder, terms: String(value ?? '') }
    default:
      return null
  }
}

/** Client-side list search across PO number and supplier snapshot. */
export function matchesPurchaseOrderQuery(purchaseOrder: PurchaseOrder, query: string): boolean {
  const needle = String(query ?? '').trim().toLowerCase()
  if (!needle) return true
  return [purchaseOrder.po_number, purchaseOrder.supplier_name]
    .some((value) => String(value ?? '').toLowerCase().includes(needle))
}

/** Map an imported invoice-shaped row onto a PO line. The editor's
 * `unit_price` mirror is dropped: only the procurement cost persists. */
export function purchaseOrderItemFromImport(row: Record<string, unknown>, index: number): PurchaseOrderItem {
  const item = createPurchaseOrderFormItem(index)
  const { row_type: _rowType, unit_price: _unitPrice, _uiKey, ...domainItem } = item
  return {
    ...domainItem,
    description: String(row.description ?? ''),
    quantity: finiteNumber(row.quantity, 1),
    unit: String(row.unit ?? ''),
    unit_cost: finiteNumber((row.unit_cost ?? row.unit_price) as unknown),
    _uiKey,
  }
}
