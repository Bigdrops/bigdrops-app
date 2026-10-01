import { createEmptyTableRow } from '@/domain/table-document/rows'
import type { TableDocumentRow, TableRowType } from '@/domain/table-document/types'

export function getCpsSectionGroupId(row: TableDocumentRow): string | null {
  return row.group_id || row.id || row._uiKey || null
}

export function createCpsRow(
  rowType: TableRowType,
  sortOrder: number,
  options: { groupId?: string | null } = {},
): TableDocumentRow {
  const row = createEmptyTableRow(sortOrder, rowType)

  if (rowType === 'section') {
    row.section_title = 'New Group'
    row.group_id = getCpsSectionGroupId(row)
    return row
  }

  row.quantity = 1
  row.group_id = options.groupId ?? null
  return row
}

export function normalizeCpsRowOrder(rows: TableDocumentRow[]): TableDocumentRow[] {
  return rows.map((row, index) => ({ ...row, sort_order: index }))
}

export function appendCpsRow(rows: TableDocumentRow[], rowType: TableRowType): TableDocumentRow[] {
  return normalizeCpsRowOrder([...rows, createCpsRow(rowType, rows.length, { groupId: null })])
}

export function insertCpsRow(
  rows: TableDocumentRow[],
  index: number,
  rowType: TableRowType,
  options: { groupId?: string | null } = {},
): TableDocumentRow[] {
  const next = [...rows]
  const insertAt = Math.max(0, Math.min(index, next.length))
  next.splice(insertAt, 0, createCpsRow(rowType, insertAt, options))
  return normalizeCpsRowOrder(next)
}

export function removeCpsRow(rows: TableDocumentRow[], index: number): TableDocumentRow[] {
  return normalizeCpsRowOrder(rows.filter((_, rowIndex) => rowIndex !== index))
}

export function findCpsGroupInsertIndex(rows: TableDocumentRow[], groupId: string | null, groupIndex: number): number {
  if (!groupId) return groupIndex + 1

  let insertAt = groupIndex + 1
  rows.forEach((row, index) => {
    if (row.row_type === 'item' && row.group_id === groupId) insertAt = index + 1
  })

  return insertAt
}
