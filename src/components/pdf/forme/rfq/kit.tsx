import type { Rfq } from '@/domain/rfq/types'
import type { TableDocumentColumn, TableDocumentRow } from '@/domain/table-document/types'
import { computeRowProfit } from '@/domain/cps/calculateCpsTotals'

/**
 * Shared RFQ document kit — visible columns, row filtering, width allocation
 * and identity resolvers used by both RFQ Forme templates.
 */
const S_NO_WIDTH = 8
const PROFIT_WIDTH = 12
const COLUMN_WIDTHS: Record<string, number> = {
  description: 30,
  specification: 16,
  quantity: 8,
  unit: 8,
  make_brand: 10,
  cp: 8,
  sp: 8,
}

export interface RfqFormeDocumentProps {
  rfq: Rfq
  rows?: TableDocumentRow[]
  columns?: TableDocumentColumn[]
  settings?: Record<string, unknown> | null
}

export const RIGHT_ALIGNED_KEYS = new Set(['cp', 'sp', 'profit'])

export interface PreparedRfqTable {
  visibleColumns: TableDocumentColumn[]
  hasProfitColumn: boolean
  displayRows: TableDocumentRow[]
  sNoWidthPct: number
  columnWidths: Map<string, number>
  profitWidthPct: number
}

export function prepareRfqTable(rows: TableDocumentRow[] | undefined, columns: TableDocumentColumn[] | undefined): PreparedRfqTable {
  const safeRows = Array.isArray(rows) ? rows : []
  const safeColumns = Array.isArray(columns) ? columns : []
  const visibleColumns = safeColumns.filter((column) => column.visible)
  const hasProfitColumn = visibleColumns.some((c) => c.key === 'cp' || c.key === 'sp')

  const displayRows = safeRows.filter((row) =>
    row.row_type === 'section'
      ? row.section_title.trim()
      : row.description.trim() || row.specification.trim() || row.notes.trim(),
  )

  const profitWidthPct = hasProfitColumn ? PROFIT_WIDTH : 0
  const dataWidth = 100 - S_NO_WIDTH - profitWidthPct
  const weights = visibleColumns.map((c) => COLUMN_WIDTHS[c.key] ?? 12)
  const weightTotal = weights.reduce((sum, w) => sum + w, 0)

  const columnWidths = new Map<string, number>()
  let assigned = 0
  visibleColumns.forEach((column, index) => {
    const isLast = index === visibleColumns.length - 1
    if (isLast) {
      columnWidths.set(column.key, Math.round((dataWidth - assigned) * 100) / 100)
      return
    }
    const width = Math.round((weights[index] / weightTotal) * dataWidth * 100) / 100
    columnWidths.set(column.key, width)
    assigned += width
  })

  return { visibleColumns, hasProfitColumn, displayRows, sNoWidthPct: S_NO_WIDTH, columnWidths, profitWidthPct }
}

export function mapItemsToRows(items: Rfq['items'] = []): TableDocumentRow[] {
  return items.map((item, index) => ({
    id: item.id,
    _uiKey: item._uiKey,
    row_type: 'item',
    sort_order: item.sort_order ?? index,
    section_title: '',
    description: item.description || '',
    specification: item.specification || '',
    quantity: Number(item.quantity || 0),
    unit: item.unit || '',
    notes: item.notes || '',
    make_brand: '',
    cp: '',
    sp: '',
  }))
}

export function displayRowProfit(row: TableDocumentRow): string {
  return String(computeRowProfit(row))
}

export function resolveBrandName(rfq: Rfq): string | null {
  if (!rfq.show_brand_name) return null
  return String(rfq.brand_name_override || 'BOUXRE').trim() || 'BOUXRE'
}

export function resolveVendorName(rfq: Rfq): string | null {
  if (!rfq.show_vendor_identity) return null
  return String(rfq.vendor_name || '').trim() || null
}

export function resolveVendorContact(rfq: Rfq): string | null {
  if (!rfq.show_vendor_identity) return null
  return String(rfq.vendor_contact || '').trim() || null
}

export function resolveCompanyName(settings: Record<string, unknown> | null | undefined): string {
  return String(settings?.company_name || '').trim()
}

export function resolveCompanyLogo(settings: Record<string, unknown> | null | undefined): string {
  return String(settings?.company_logo_url || '').trim()
}

export function resolveCompanyPhone(settings: Record<string, unknown> | null | undefined): string {
  return String(settings?.phone || '').trim()
}

export function resolveCompanyAddress(settings: Record<string, unknown> | null | undefined): string {
  return String(settings?.address || '').trim()
}
