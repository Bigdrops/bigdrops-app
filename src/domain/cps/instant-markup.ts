import Decimal from 'decimal.js'
import type { TableDocumentRow } from '@/domain/table-document/types'
import { computeCpsRowEconomics } from './calculateCpsTotals'
import { computeCpsCommercialView } from './calculations'

export type InstantMarkupMode = 'percentage' | 'value'

export interface InstantMarkupSelection {
  [rowKey: string]: boolean
}

export interface InstantMarkupInput {
  mode: InstantMarkupMode
  value: string | number
  included: InstantMarkupSelection
}

export interface InstantMarkupRowPreview {
  rowKey: string
  index: number
  description: string
  currentSp: string
  baseSp: string
  proposedSp: string
  cp: string
  quantity: number
  profit: number
  marginPercent: number
}

export interface InstantMarkupPreview {
  ok: true
  affectedCount: number
  sellingBefore: number
  sellingAfter: number
  grossProfitBefore: number
  grossProfitAfter: number
  aggregateChange: number
  rows: InstantMarkupRowPreview[]
  nextRows: TableDocumentRow[]
}

export type InstantMarkupResult =
  | InstantMarkupPreview
  | { ok: false; error: string }

const MONEY_DP = 2

export function getCpsRowKey(row: TableDocumentRow, index: number): string {
  return row.id || row._uiKey || `row-${index}`
}

export function isInstantMarkupEligible(row: TableDocumentRow): boolean {
  return row.row_type === 'item'
}

export function parseInstantMarkupValue(value: string | number): Decimal | null {
  if (value === '') return null
  try {
    const parsed = new Decimal(value)
    if (!parsed.isFinite() || parsed.isNegative()) return null
    return parsed
  } catch {
    return null
  }
}

function parseMoneyDecimal(value: unknown): Decimal {
  try {
    const normalized = value === null || value === undefined || value === '' ? 0 : String(value)
    const parsed = new Decimal(normalized)
    return parsed.isFinite() ? parsed : new Decimal(0)
  } catch {
    return new Decimal(0)
  }
}

export function resolveInstantMarkupBase(row: TableDocumentRow): Decimal {
  const currentSp = parseMoneyDecimal(row.sp)
  if (currentSp.greaterThan(0)) return currentSp
  return parseMoneyDecimal(row.cp)
}

function deriveSp(row: TableDocumentRow, input: InstantMarkupInput): Decimal | null {
  const value = parseInstantMarkupValue(input.value)
  if (!value) return null
  const base = resolveInstantMarkupBase(row)
  if (input.mode === 'percentage') {
    return base.times(new Decimal(1).plus(value.dividedBy(100))).toDecimalPlaces(MONEY_DP)
  }
  return base.plus(value).toDecimalPlaces(MONEY_DP)
}

export function previewInstantMarkup(
  rows: TableDocumentRow[],
  input: InstantMarkupInput,
): InstantMarkupResult {
  const parsed = parseInstantMarkupValue(input.value)
  if (!parsed) return { ok: false, error: 'Enter a valid non-negative markup.' }

  const before = computeCpsCommercialView({ table_rows: rows, table_columns: [], custom_fields: {} }).costing
  const nextRows = rows.map((row, index) => {
    const rowKey = getCpsRowKey(row, index)
    if (!input.included[rowKey] || !isInstantMarkupEligible(row)) return row
    const proposedSp = deriveSp(row, input)
    return proposedSp ? { ...row, sp: proposedSp.toFixed(MONEY_DP) } : row
  })
  const after = computeCpsCommercialView({ table_rows: nextRows, table_columns: [], custom_fields: {} }).costing

  const previewRows: InstantMarkupRowPreview[] = []
  rows.forEach((row, index) => {
    const rowKey = getCpsRowKey(row, index)
    if (!input.included[rowKey] || !isInstantMarkupEligible(row)) return
    const proposedSp = deriveSp(row, input)
    if (!proposedSp) return
    const proposedRow = { ...row, sp: proposedSp.toFixed(MONEY_DP) }
    const economics = computeCpsRowEconomics(proposedRow)
    previewRows.push({
      rowKey,
      index,
      description: row.description || `Row ${index + 1}`,
      currentSp: String(row.sp ?? ''),
      baseSp: resolveInstantMarkupBase(row).toFixed(MONEY_DP),
      proposedSp: proposedSp.toFixed(MONEY_DP),
      cp: String(row.cp ?? ''),
      quantity: Number(row.quantity || 0),
      profit: economics.profit,
      marginPercent: economics.margin_percent,
    })
  })

  return {
    ok: true,
    affectedCount: previewRows.length,
    sellingBefore: before.total_selling_price,
    sellingAfter: after.total_selling_price,
    grossProfitBefore: before.gross_profit,
    grossProfitAfter: after.gross_profit,
    aggregateChange: after.total_selling_price - before.total_selling_price,
    rows: previewRows,
    nextRows,
  }
}

export function applyInstantMarkup(
  rows: TableDocumentRow[],
  input: InstantMarkupInput,
): InstantMarkupResult {
  return previewInstantMarkup(rows, input)
}

export function cloneInstantMarkupRows(rows: TableDocumentRow[]): TableDocumentRow[] {
  return rows.map((row) => ({
    ...row,
    custom_data: row.custom_data ? { ...row.custom_data } : row.custom_data,
  }))
}

export function resetInstantMarkupWorkingRows(openingRows: TableDocumentRow[]): TableDocumentRow[] {
  return cloneInstantMarkupRows(openingRows)
}
