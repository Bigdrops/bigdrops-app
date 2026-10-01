import Decimal from 'decimal.js'
import type { TableDocumentRow } from '@/domain/table-document/types'

export interface CpsTotals {
  total_cost: number
  total_selling_price: number
  gross_profit: number
  margin_percent: number
}

export interface CpsRowEconomics {
  quantity: number
  cp: number
  sp: number
  total_cost_price: number
  total_selling_price: number
  profit: number
  margin_percent: number
  unit_profit: number
}

/**
 * Compute Cost & Pricing Sheet totals using the locked CPS commercial model.
 * The CPS is a costing/pricing schedule — no VAT, discount, or WHT.
 *
 * Total Cost = Σ(cp × quantity)
 * Total Selling Price = Σ(sp × quantity)
 * Gross Profit = Total Selling Price - Total Cost
 */
export function computeCpsTotals(rows: TableDocumentRow[]): CpsTotals {
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
 * Compute per-row Cost & Pricing Sheet economics.
 *
 * TCP = CP × quantity
 * TSP = SP × quantity
 * Profit = TSP - TCP (delegated to computeRowProfit so one row-profit formula exists)
 * Margin = Profit / TSP
 *
 * This is the row-level companion to computeCpsTotals(). It uses the same locked
 * formulas and the Decimal path. It does not introduce new financial semantics.
 */
export function computeCpsRowEconomics(row: TableDocumentRow): CpsRowEconomics {
  if (row.row_type !== 'item') {
    return {
      quantity: 0,
      cp: 0,
      sp: 0,
      total_cost_price: 0,
      total_selling_price: 0,
      profit: 0,
      margin_percent: 0,
      unit_profit: 0,
    }
  }

  const quantity = new Decimal(row.quantity || 0)
  const cp = new Decimal(row.cp || 0)
  const sp = new Decimal(row.sp || 0)
  const totalCostPrice = cp.times(quantity)
  const totalSellingPrice = sp.times(quantity)
  const profit = new Decimal(computeRowProfit(row))
  const marginPercent = totalSellingPrice.greaterThan(0)
    ? profit.dividedBy(totalSellingPrice).times(100)
    : new Decimal(0)

  return {
    quantity: quantity.toNumber(),
    cp: cp.toNumber(),
    sp: sp.toNumber(),
    total_cost_price: totalCostPrice.toNumber(),
    total_selling_price: totalSellingPrice.toNumber(),
    profit: profit.toNumber(),
    margin_percent: marginPercent.toNumber(),
    unit_profit: sp.minus(cp).toNumber(),
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
