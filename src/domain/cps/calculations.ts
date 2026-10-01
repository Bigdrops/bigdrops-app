import { computeDocument, type DocumentResult } from '@/lib/Calculations'
import { computeCpsTotals, type CpsTotals } from './calculateCpsTotals'
import type { Cps } from './types'
import type { TableDocumentRow } from '@/domain/table-document/types'

export interface CpsCommercialView {
  commercial: DocumentResult
  costing: CpsTotals
}

function toCommercialItems(rows: TableDocumentRow[]) {
  return rows.map((row) => {
    if (row.row_type === 'section') {
      return {
        id: row.id ?? row._uiKey,
        row_type: 'group_header' as const,
        group_id: row.id ?? row._uiKey ?? null,
        group_name: row.section_title || row.description || '',
        quantity: 0,
        unit_price: 0,
      }
    }

    return {
      id: row.id ?? row._uiKey,
      row_type: 'standard' as const,
      description: row.description,
      quantity: row.quantity || 0,
      unit_price: row.sp || 0,
      group_id: null,
      group_name: null,
    }
  })
}

export function computeCpsCommercialView(cps: Pick<Cps, 'table_rows' | 'custom_fields' | 'table_columns'>): CpsCommercialView {
  const cf = cps.custom_fields || {}
  const commercial = computeDocument({
    items: toCommercialItems(cps.table_rows || []),
    document: {},
    cf,
    columns: cps.table_columns || [],
  })

  return {
    commercial,
    costing: computeCpsTotals(cps.table_rows || []),
  }
}
