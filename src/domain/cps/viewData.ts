import { computeCpsCommercialView } from './calculations'
import type { Cps } from './types'
import type { TableDocumentRow } from '@/domain/table-document/types'

export type CpsViewRow =
  | {
      type: 'group'
      key: string
      title: string
      groupId: string | null
    }
  | {
      type: 'item'
      key: string
      number: string
      groupId: string | null
      description: string
      specification: string
      makeBrand: string
      quantity: number
      unit: string
      cp: number
      sp: number
      cost: number
      selling: number
      profit: number
      marginPercent: number
      notes: string
      imageUrl: string | null
    }

export type CpsViewData = {
  document: Cps
  rows: CpsViewRow[]
  totals: ReturnType<typeof computeCpsCommercialView>['costing']
}

function rowKey(row: TableDocumentRow, index: number) {
  return row.id || row._uiKey || `${row.row_type}-${index}`
}

function asNumber(value: unknown) {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric : 0
}

export function buildCpsViewData(cps: Cps): CpsViewData {
  const totals = computeCpsCommercialView(cps).costing
  let itemNumber = 0

  const rows = (cps.table_rows || []).map<CpsViewRow>((row, index) => {
    if (row.row_type === 'section') {
      return {
        type: 'group',
        key: rowKey(row, index),
        title: row.section_title || row.description || 'Group',
        // Group identity mirrors the form layer: a section owns the
        // group_id that member items reference. View only; no math change.
        groupId: row.group_id || row.id || row._uiKey || null,
      }
    }

    itemNumber += 1
    const quantity = asNumber(row.quantity)
    const cp = asNumber(row.cp)
    const sp = asNumber(row.sp)
    const cost = cp * quantity
    const selling = sp * quantity
    const profit = selling - cost
    const marginPercent = selling > 0 ? (profit / selling) * 100 : 0

    return {
      type: 'item',
      key: rowKey(row, index),
      number: String(itemNumber).padStart(2, '0'),
      groupId: row.group_id || null,
      description: row.description || '',
      specification: row.specification || '',
      makeBrand: row.make_brand || '',
      quantity,
      unit: row.unit || '',
      cp,
      sp,
      cost,
      selling,
      profit,
      marginPercent,
      notes: row.notes || '',
      imageUrl: row.image_url || null,
    }
  })

  return { document: cps, rows, totals }
}
