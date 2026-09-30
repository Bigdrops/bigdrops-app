import { computeBoqCommercialView } from './calculations'
import type { Boq } from './types'
import type { TableDocumentRow } from '@/domain/table-document/types'

export type BoqViewRow =
  | {
      type: 'group'
      key: string
      title: string
    }
  | {
      type: 'item'
      key: string
      number: string
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

export type BoqViewData = {
  document: Boq
  rows: BoqViewRow[]
  totals: ReturnType<typeof computeBoqCommercialView>['costing']
}

function rowKey(row: TableDocumentRow, index: number) {
  return row.id || row._uiKey || `${row.row_type}-${index}`
}

function asNumber(value: unknown) {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric : 0
}

export function buildBoqViewData(boq: Boq): BoqViewData {
  const totals = computeBoqCommercialView(boq).costing
  let itemNumber = 0

  const rows = (boq.table_rows || []).map<BoqViewRow>((row, index) => {
    if (row.row_type === 'section') {
      return {
        type: 'group',
        key: rowKey(row, index),
        title: row.section_title || row.description || 'Group',
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

  return { document: boq, rows, totals }
}
