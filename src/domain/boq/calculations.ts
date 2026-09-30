import { computeDocument, type DocumentResult } from '@/lib/Calculations'
import { computeBoqTotals, type BoqTotals } from './calculateBoqTotals'
import type { Boq } from './types'
import type { TableDocumentRow } from '@/domain/table-document/types'

export interface BoqCommercialView {
  commercial: DocumentResult
  costing: BoqTotals
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

export function computeBoqCommercialView(boq: Pick<Boq, 'table_rows' | 'custom_fields' | 'table_columns'>): BoqCommercialView {
  const cf = boq.custom_fields || {}
  const commercial = computeDocument({
    items: toCommercialItems(boq.table_rows || []),
    document: {},
    cf,
    columns: boq.table_columns || [],
  })

  return {
    commercial,
    costing: computeBoqTotals(boq.table_rows || []),
  }
}
