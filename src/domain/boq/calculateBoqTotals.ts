import Decimal from 'decimal.js'
import type { TableDocumentRow } from '@/domain/table-document/types'

export interface BoqTotals {
  total_cost: number
  total_selling_price: number
  gross_profit: number
  margin_percent: number
}

/**
 * Compute BOQ totals using the locked BOQ commercial model.
 * BOQ is a costing/pricing schedule — no VAT, discount, or WHT.
 *
 * Total Cost = Σ(cp × quantity)
 * Total Selling Price = Σ(sp × quantity)
 * Gross Profit = Total Selling Price - Total Cost
 */
export function computeBoqTotals(rows: TableDocumentRow[]): BoqTotals {
  let totalCost = new Decimal(0)
  let totalSellingPrice = new Decimal(0)

  for (const row of rows) {
    if (row.row_type !== 'item') continue
    const qty = new Decimal(row.quantity || 0)
    const cp = new Decimal(row.cp || 0)
    const sp = new Decimal(row.sp || 0)
    totalCost = totalCost.plus(cp.times(qty))
    totalSellingPrice = totalSellingPrice.plus(sp.times(qty))
  }

  const grossProfit = totalSellingPrice.minus(totalCost)
  const marginPercent = totalSellingPrice.greaterThan(0)
    ? grossProfit.dividedBy(totalSellingPrice).times(100)
    : new Decimal(0)

  return {
    total_cost: totalCost.toNumber(),
    total_selling_price: totalSellingPrice.toNumber(),
    gross_profit: grossProfit.toNumber(),
    margin_percent: marginPercent.toNumber(),
  }
}

/**
 * Compute per-row profit: (sp - cp) × quantity.
 * Returns 0 for section rows.
 */
export function computeRowProfit(row: TableDocumentRow): number {
  if (row.row_type !== 'item') return 0
  return new Decimal(row.sp || 0)
    .minus(new Decimal(row.cp || 0))
    .times(new Decimal(row.quantity || 0))
    .toNumber()
}
