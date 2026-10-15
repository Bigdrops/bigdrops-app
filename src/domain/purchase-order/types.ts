// ============================================================================
// SUPPLIER PURCHASE ORDER DOMAIN — types, statuses and factories
// ============================================================================
// A Supplier Purchase Order is an OUTGOING procurement commitment: BOURXE
// issues it TO a supplier to request goods or services at agreed costs.
//
// It is NOT a sales invoice, a quotation, a customer order, an expense
// posting, a goods receipt, or a supplier payment.
//
//   * The PO hangs off `suppliers`, never off `clients`. There is no
//     `client_id` anywhere in this domain.
//   * `client_supplier_links` is never read. A dual-role business remains a
//     supplier in the PO context.
//   * `supplier_name` is a FROZEN document snapshot written once at create
//     time. A later supplier rename never rewrites a historical PO.
//   * `unit_cost` is a procurement cost, never a sales price. It is a
//     distinct concept from `invoice_items.unit_price` and the two are never
//     interchanged.
//   * Creating, editing, issuing, cancelling or closing a PO has NO
//     accounting and NO inventory side effect.
//
// Business rules live here (docs/standard/lifecycle-ownership-standard.md).
// Financial rules are owned exclusively by `src/lib/Calculations.ts`
// (`.claude/agent-instructions/core-guardrails.md`); see `./calculations.ts`.
// Database access lives in `src/modules/purchase-order/purchaseOrderService.ts`.
// ============================================================================

import type { DiscountTiming, DiscountType } from '@/lib/Calculations'

/**
 * The four independent procurement states.
 *
 * Deliberately ABSENT, because a PO is a commitment and not a fulfilment:
 * `partially_received`, `received`, `partially_paid`, `paid`. A PO status is
 * never derived from invoice payment rules and never from goods received.
 */
export type PurchaseOrderStatus = 'draft' | 'issued' | 'cancelled' | 'closed'

export const PURCHASE_ORDER_STATUSES: readonly PurchaseOrderStatus[] = [
  'draft',
  'issued',
  'cancelled',
  'closed',
] as const

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  cancelled: 'Cancelled',
  closed: 'Closed',
}

export const PURCHASE_ORDER_DEFAULT_STATUS: PurchaseOrderStatus = 'draft'

export const PURCHASE_ORDER_DEFAULT_CURRENCY = 'NGN'

/**
 * A PO-level additional charge, as prepared for the calculation engine.
 *
 * `withTax` is the EXPLICIT per-charge VAT flag. The engine reads it as
 * `vatApplicable` and taxes exactly the charges that set it. The VAT base of
 * an extra charge is therefore never inferred by this domain.
 */
export interface PurchaseOrderExtraCharge {
  label: string
  value: number
  withTax: boolean
}

/**
 * The RATE inputs behind the persisted PO totals.
 *
 * These are inputs, never computed totals. They are stored alongside the
 * totals because `computeDocument()` reads rates: reopening a PO from stored
 * totals alone would be lossy.
 *
 * WHT is absent by design — withholding is out of scope for the PO MVP.
 */
export interface PurchaseOrderCalculationInputs {
  vatPercent: number
  discountType: DiscountType
  discountTiming: DiscountTiming
  discountValue: number
}

/** A procurement line. */
export interface PurchaseOrderItem {
  id?: string
  purchase_order_id?: string
  description: string
  quantity: number
  unit: string
  /** Procurement cost per unit. Never a sales price. */
  unit_cost: number
  /** Line amount = quantity × unit_cost. Not a VAT- or discount-adjusted total. */
  line_total: number
  /** Preserves line ordering. */
  sort_order: number
  created_at?: string | null
  updated_at?: string | null
  /** Stable React key for list rendering. */
  _uiKey?: string
}

export interface PurchaseOrder {
  id?: string
  po_number: string
  po_date: string
  /** The procurement party. The PO never references a client. */
  supplier_id: string
  /** Frozen identity snapshot, written at create time and never refreshed. */
  supplier_name: string
  status: PurchaseOrderStatus
  currency: string
  subtotal: number
  discount: number
  vat: number
  extra_charges: PurchaseOrderExtraCharge[]
  total: number
  calculation_inputs: PurchaseOrderCalculationInputs
  notes: string
  terms: string
  created_at?: string | null
  updated_at?: string | null
  created_by?: string | null
  updated_by?: string | null
  archived_at?: string | null
  items?: PurchaseOrderItem[]
}

/**
 * A `purchase_orders` row as it arrives from the tenant schema.
 *
 * `extra_charges` and `calculation_inputs` are jsonb columns, and PostgREST
 * may hand them back either as parsed JSON or as a raw string depending on the
 * transport. Both shapes are accepted here; `parsePurchaseOrderExtraCharges`
 * and `parsePurchaseOrderCalculationInputs` normalise them.
 */
export interface DbPurchaseOrder
  extends Omit<PurchaseOrder, 'items' | 'extra_charges' | 'calculation_inputs'> {
  extra_charges: unknown
  calculation_inputs: unknown
}

export interface DbPurchaseOrderItem extends PurchaseOrderItem {}

/* ------------------------------------------------------------------ */
/* Factories                                                          */
/* ------------------------------------------------------------------ */

export function emptyPurchaseOrderCalculationInputs(): PurchaseOrderCalculationInputs {
  return {
    vatPercent: 0,
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 0,
  }
}

export function createEmptyPurchaseOrderItem(sortOrder = 0): PurchaseOrderItem {
  return {
    description: '',
    quantity: 1,
    unit: '',
    unit_cost: 0,
    line_total: 0,
    sort_order: sortOrder,
  }
}

/** Today as the local calendar day, matching the other document forms. */
export function todayPurchaseOrderDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/**
 * A new, unsaved PO draft. The number is left blank so the save path can
 * allocate one under the numbering authority; nothing here guesses a number.
 */
export function createEmptyPurchaseOrder(
  overrides: Partial<PurchaseOrder> = {},
): PurchaseOrder {
  const items = overrides.items ?? [createEmptyPurchaseOrderItem(0)]

  return {
    po_number: '',
    po_date: todayPurchaseOrderDate(),
    supplier_id: '',
    supplier_name: '',
    status: PURCHASE_ORDER_DEFAULT_STATUS,
    currency: PURCHASE_ORDER_DEFAULT_CURRENCY,
    subtotal: 0,
    discount: 0,
    vat: 0,
    extra_charges: [],
    total: 0,
    calculation_inputs: emptyPurchaseOrderCalculationInputs(),
    notes: '',
    terms: '',
    ...overrides,
    items,
  }
}

/* ------------------------------------------------------------------ */
/* Parsing                                                            */
/* ------------------------------------------------------------------ */

function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  return typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
}

function parseJsonArray(raw: unknown): unknown[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function finiteNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : fallback
}

/**
 * Normalise the persisted extra-charge list. Entries without a label are
 * dropped: an unlabelled charge cannot be shown on the document, and the
 * engine ignores it too.
 */
export function parsePurchaseOrderExtraCharges(raw: unknown): PurchaseOrderExtraCharge[] {
  return parseJsonArray(raw)
    .map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>
      return {
        label: String(record.label ?? '').trim(),
        value: finiteNumber(record.value, 0),
        withTax: record.withTax === true,
      }
    })
    .filter((charge) => charge.label.length > 0)
}

export function parsePurchaseOrderCalculationInputs(
  raw: unknown,
): PurchaseOrderCalculationInputs {
  const record = parseJsonObject(raw)
  const discountType = record.discountType === 'fixed' ? 'fixed' : 'percent'
  const discountTiming = record.discountTiming === 'after_tax' ? 'after_tax' : 'before_tax'

  return {
    vatPercent: finiteNumber(record.vatPercent ?? record.vatRate, 0),
    discountType,
    discountTiming,
    discountValue: finiteNumber(record.discountValue, 0),
  }
}

/** Convert a tenant row into the domain shape. */
export function toPurchaseOrder(row: DbPurchaseOrder): PurchaseOrder {
  return {
    ...row,
    currency: row.currency || PURCHASE_ORDER_DEFAULT_CURRENCY,
    status: isPurchaseOrderStatus(row.status) ? row.status : PURCHASE_ORDER_DEFAULT_STATUS,
    extra_charges: parsePurchaseOrderExtraCharges(row.extra_charges),
    calculation_inputs: parsePurchaseOrderCalculationInputs(row.calculation_inputs),
  }
}

export function isPurchaseOrderStatus(value: unknown): value is PurchaseOrderStatus {
  return PURCHASE_ORDER_STATUSES.includes(value as PurchaseOrderStatus)
}

/** Normalise a stored item row into the domain shape. */
export function toPurchaseOrderItem(row: Record<string, unknown>): PurchaseOrderItem {
  return {
    id: (row.id as string) ?? undefined,
    purchase_order_id: (row.purchase_order_id as string) ?? undefined,
    description: String(row.description ?? ''),
    quantity: finiteNumber(row.quantity, 0),
    unit: String(row.unit ?? ''),
    unit_cost: finiteNumber(row.unit_cost, 0),
    line_total: finiteNumber(row.line_total, 0),
    sort_order: finiteNumber(row.sort_order, 0),
    created_at: (row.created_at as string | null) ?? null,
    updated_at: (row.updated_at as string | null) ?? null,
  }
}
