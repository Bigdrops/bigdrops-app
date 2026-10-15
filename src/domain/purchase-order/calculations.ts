// ============================================================================
// SUPPLIER PURCHASE ORDER — financial adapter
// ============================================================================
// FINANCIAL AUTHORITY
//
// `computeDocument()` in `src/lib/Calculations.ts` is the ONLY permitted
// financial entry point (`.claude/agent-instructions/core-guardrails.md`).
// This module is an ADAPTER. It defines no arithmetic, no VAT rule, no
// discount rule, no rounding rule and no currency rule of its own. It maps
// procurement data into the engine's prepared input shape and maps the engine's
// result back onto the PO contract.
//
// This is the same posture the Cost & Pricing Sheet already uses
// (`src/domain/cps/calculations.ts` -> `computeCpsCommercialView`): a non-sales
// document driving the canonical engine through `{ items, document: {},
// cf, columns }`.
//
// CONTRACT MAPPED (all supplied by the engine, none inferred here)
//
//   line amount   = quantity x unit_cost        <- engine line_subtotal
//   subtotal      = sum of line amounts         <- engine subtotal
//   discount      = engine discount, applied before VAT for a fixed
//                   before_tax discount, and distributed proportionally across
//                   the eligible taxable rows by the engine
//   vat           = engine vat (per-row effective rate on each reduced base,
//                   plus the VAT portion of every extra charge that sets its
//                   own explicit `withTax` flag)
//   total         = engine grandTotal
//
// WHT is OUT OF SCOPE for the PO MVP. The engine receives an explicit
// `whtValue: 0`, so `wht` is 0 and `grandTotal` equals `totalPayable`. The
// committed amount is therefore `grandTotal`; the two coincide by construction
// rather than by assumption.
//
// `unit_cost` is a PROCUREMENT COST. It occupies the engine's `unit_price`
// slot because that slot is the engine's "amount per unit" input. It is never
// a sales price and is never written to a sales document.
//
// No rounding is applied to engine output: the engine returns full Decimal
// precision, and the PO persists exactly what it returns. No rounding rule is
// invented here.
// ============================================================================

import { computeDocument, type DocumentResult } from '@/lib/Calculations'
import type { PurchaseOrder, PurchaseOrderItem } from './types'

/**
 * Column visibility for a PO.
 *
 * `install_rate` -> `hide_full`. A procurement line has no workmanship or
 * installation component, so the engine nulls the field outright instead of
 * merely hiding it. This is what makes `installRateTotal` zero on a PO.
 *
 * `vat_rate` and `discount_rate` -> `show`. VAT and discount are available on
 * a PO and are read from the persisted calculation inputs.
 */
export const PURCHASE_ORDER_COLUMNS = [
  { key: 'install_rate', visibilityMode: 'hide_full' as const },
  { key: 'vat_rate', visibilityMode: 'show' as const },
  { key: 'discount_rate', visibilityMode: 'show' as const },
]

/** The engine input items for a PO. `unit_cost` fills the engine's price slot. */
function toCommercialItems(items: PurchaseOrderItem[]) {
  return (items ?? []).map((item, index) => ({
    // A stable engine-side identity so computed rows line up with source rows.
    id: `po-line-${index}`,
    row_type: 'standard' as const,
    description: String(item.description ?? ''),
    quantity: item.quantity ?? 0,
    unit_price: item.unit_cost ?? 0,
    group_id: null,
    group_name: null,
  }))
}

/**
 * Build the prepared engine input for a PO.
 *
 * `document` is empty on purpose: the engine must never read a stored total as
 * a rate input. Every rate travels through `cf.calculationInputs`.
 */
export function buildPurchaseOrderRawInput(purchaseOrder: PurchaseOrder) {
  const inputs = purchaseOrder.calculation_inputs

  return {
    items: toCommercialItems(purchaseOrder.items ?? []),
    document: {} as Record<string, unknown>,
    cf: {
      calculationInputs: {
        vatPercent: inputs?.vatPercent ?? 0,
        discountType: inputs?.discountType ?? 'percent',
        discountTiming: inputs?.discountTiming ?? 'before_tax',
        discountValue: inputs?.discountValue ?? 0,
        // WHT is out of scope for the PO MVP. Stated explicitly so the engine's
        // WHT leg is deterministic rather than inherited from a fallback.
        whtType: 'percent' as const,
        whtValue: 0,
      },
      extraCharges: (purchaseOrder.extra_charges ?? []).map((charge) => ({
        label: String(charge.label ?? '').trim(),
        value: charge.value ?? 0,
        withTax: charge.withTax === true,
      })),
    },
    columns: PURCHASE_ORDER_COLUMNS,
  }
}

/** The persisted PO totals, as produced by the canonical engine. */
export interface PurchaseOrderTotals {
  subtotal: number
  discount: number
  vat: number
  extraChargesTotal: number
  taxableBase: number
  /** Committed procurement value. Equal to `totalPayable` while WHT is zero. */
  total: number
}

export interface PurchaseOrderComputation {
  result: DocumentResult
  totals: PurchaseOrderTotals
  /** Per-line amount (quantity x unit_cost), aligned with the source items. */
  lineTotals: number[]
}

/**
 * Compute the totals for a PO.
 *
 * Pure. No database access, no side effects, and no mutation of the input.
 */
export function computePurchaseOrderTotals(
  purchaseOrder: PurchaseOrder,
): PurchaseOrderComputation {
  const sourceItems = purchaseOrder.items ?? []
  const result = computeDocument(buildPurchaseOrderRawInput(purchaseOrder))

  // The engine returns one computed row per input row, in input order. Line
  // amounts are read positionally for that reason; a duplicated id could not
  // be used as a key.
  const lineTotals = sourceItems.map((_, index) => result.items[index]?.line_subtotal ?? 0)

  return {
    result,
    totals: {
      subtotal: result.subtotal,
      discount: result.discount,
      vat: result.vat,
      extraChargesTotal: result.extraChargesTotal,
      taxableBase: result.taxableBase,
      total: result.grandTotal,
    },
    lineTotals,
  }
}

/**
 * Return a copy of the PO with computed totals and per-line amounts applied.
 *
 * The engine remains the only calculator: this helper only writes its output
 * onto the domain object, in the same prepared-totals shape the database
 * stores. Input line ordering is preserved.
 */
export function withPurchaseOrderTotals(purchaseOrder: PurchaseOrder): PurchaseOrder {
  const { totals, lineTotals } = computePurchaseOrderTotals(purchaseOrder)

  return {
    ...purchaseOrder,
    subtotal: totals.subtotal,
    discount: totals.discount,
    vat: totals.vat,
    total: totals.total,
    items: (purchaseOrder.items ?? []).map((item, index) => ({
      ...item,
      line_total: lineTotals[index] ?? 0,
      sort_order: index,
    })),
  }
}
