import type { RawWaybillItem, ResolvedColumn, PrintColumn, PrintRow } from '../types'
import { normalizeBlank } from '../normalizeBlank'

const BASE_KEYS = new Set(['description', 'quantity', 'unit', 'condition'])

const FORBIDDEN_DB_KEYS = new Set([
  'item_id', 'id', 'created_at', 'updated_at',
  'unit_price', 'rate', 'vat', 'discount', 'subtotal', 'grand_total', 'custom_data',
])

export function resolveColumns(columns: ResolvedColumn[]): PrintColumn[] {
  return columns
    .filter((col) => {
      if (FORBIDDEN_DB_KEYS.has(col.key)) return false
      return true
    })
    .map((col) => ({ key: col.key, label: col.label }))
}

export function buildRows(items: RawWaybillItem[], columns: ResolvedColumn[]): PrintRow[] {
  return items.map((item) => {
    const cells: Record<string, string> = {}

    cells.description = normalizeBlank(item.description)
    cells.quantity = normalizeBlank(item.qty)
    cells.unit = normalizeBlank(item.unit)
    cells.condition = normalizeBlank(item.condition)

    for (const col of columns) {
      if (BASE_KEYS.has(col.key)) continue
      const val = item.custom_data?.[col.key]
      cells[col.key] = val != null ? String(val) : ''
    }

    if (item.qty != null && !Number.isNaN(item.qty) && item.unit) {
      cells.qtyLabel = `${item.qty} ${normalizeBlank(item.unit)}`
    } else if (item.qty != null && !Number.isNaN(item.qty)) {
      cells.qtyLabel = String(item.qty)
    } else {
      cells.qtyLabel = ''
    }

    return { cells }
  })
}
