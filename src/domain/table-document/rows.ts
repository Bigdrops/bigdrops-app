import type { TableDocumentRow, TableRowType } from './types'

function createRowId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function createEmptyTableRow(sort_order: number, rowType: TableRowType = 'item'): TableDocumentRow {
  return {
    id: undefined,
    _uiKey: createRowId(rowType === 'section' ? 'section' : 'row'),
    row_type: rowType,
    sort_order,
    section_title: '',
    description: '',
    specification: '',
    quantity: 0,
    unit: '',
    notes: '',
    make_brand: '',
    cp: '',
    sp: '',
  }
}

export function ensureTableRowKeys(rows: TableDocumentRow[]): TableDocumentRow[] {
  return rows.map((row, index) => ({
    ...row,
    _uiKey: row._uiKey || row.id || createRowId(row.row_type === 'section' ? 'section' : 'row'),
    sort_order: row.sort_order ?? index,
  }))
}
