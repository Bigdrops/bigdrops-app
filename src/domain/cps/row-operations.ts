import { createEmptyTableRow } from '@/domain/table-document/rows'
import type { TableDocumentRow, TableRowType } from '@/domain/table-document/types'
import { isCpsGroupStructureContiguous } from './group-structure'

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

function getRowGroupId(row: TableDocumentRow): string | null {
  return row.row_type === 'section' ? getCpsSectionGroupId(row) : row.group_id || null
}

function findCpsGroupBlock(
  rows: TableDocumentRow[],
  groupId: string | null,
): { start: number; end: number } | null {
  if (!groupId) return null

  const start = rows.findIndex((row) => getRowGroupId(row) === groupId)
  if (start < 0) return null

  let end = start
  for (let index = start + 1; index < rows.length; index += 1) {
    if (getRowGroupId(rows[index]) !== groupId) break
    end = index
  }

  return { start, end }
}

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, length))
}

function normalizeIfContiguous(rows: TableDocumentRow[], fallback: TableDocumentRow[]): TableDocumentRow[] {
  return isCpsGroupStructureContiguous(rows) ? normalizeCpsRowOrder(rows) : normalizeCpsRowOrder(fallback)
}

function adjustUngroupedInsertIndex(rows: TableDocumentRow[], index: number): number {
  const insertAt = clampIndex(index, rows.length)
  const previous = rows[insertAt - 1]
  const next = rows[insertAt]
  const previousGroupId = previous ? getRowGroupId(previous) : null
  const nextGroupId = next ? getRowGroupId(next) : null

  if (!previousGroupId || previousGroupId !== nextGroupId) return insertAt

  const block = findCpsGroupBlock(rows, previousGroupId)
  return block ? block.end + 1 : insertAt
}

export function appendCpsRow(rows: TableDocumentRow[], rowType: TableRowType): TableDocumentRow[] {
  return insertCpsRow(rows, rows.length, rowType, { groupId: null })
}

export function insertCpsRow(
  rows: TableDocumentRow[],
  index: number,
  rowType: TableRowType,
  options: { groupId?: string | null } = {},
): TableDocumentRow[] {
  const next = [...rows]
  const groupId = options.groupId ?? null
  const block = findCpsGroupBlock(next, groupId)
  const insertAt = rowType === 'item' && block
    ? block.end + 1
    : adjustUngroupedInsertIndex(next, index)

  next.splice(insertAt, 0, createCpsRow(rowType, insertAt, { groupId: block ? groupId : null }))
  return normalizeIfContiguous(next, rows)
}

export function removeCpsRow(rows: TableDocumentRow[], index: number): TableDocumentRow[] {
  const row = rows[index]
  if (!row) return normalizeCpsRowOrder(rows)

  const groupId = row.row_type === 'section' ? getCpsSectionGroupId(row) : null
  const next = rows
    .filter((_, rowIndex) => rowIndex !== index)
    .map((candidate) => (
      groupId && candidate.row_type === 'item' && candidate.group_id === groupId
        ? { ...candidate, group_id: null }
        : candidate
    ))

  return normalizeIfContiguous(next, rows)
}

export function findCpsGroupInsertIndex(rows: TableDocumentRow[], groupId: string | null, groupIndex: number): number {
  const block = findCpsGroupBlock(rows, groupId)
  if (!block) return groupIndex + 1

  return block.end + 1
}

export function assignCpsRowToGroup(rows: TableDocumentRow[], index: number, groupId: string | null): TableDocumentRow[] {
  const row = rows[index]
  if (!row || row.row_type !== 'item') return normalizeCpsRowOrder(rows)
  if (!groupId) return removeCpsRowFromGroup(rows, index)

  const withoutRow = rows.filter((_, rowIndex) => rowIndex !== index)
  const block = findCpsGroupBlock(withoutRow, groupId)
  if (!block) return normalizeCpsRowOrder(rows)

  const next = [...withoutRow]
  next.splice(block.end + 1, 0, { ...row, group_id: groupId })
  return normalizeIfContiguous(next, rows)
}

export function removeCpsRowFromGroup(rows: TableDocumentRow[], index: number): TableDocumentRow[] {
  const row = rows[index]
  if (!row || row.row_type !== 'item' || !row.group_id) return normalizeCpsRowOrder(rows)

  const ungrouped = { ...row, group_id: null }
  const next = [...rows]
  next[index] = ungrouped
  if (isCpsGroupStructureContiguous(next)) return normalizeCpsRowOrder(next)

  const withoutRow = rows.filter((_, rowIndex) => rowIndex !== index)
  const block = findCpsGroupBlock(withoutRow, row.group_id)
  const insertAt = block ? block.end + 1 : adjustUngroupedInsertIndex(withoutRow, index)
  const moved = [...withoutRow]
  moved.splice(insertAt, 0, ungrouped)
  return normalizeIfContiguous(moved, rows)
}

export function moveCpsRow(rows: TableDocumentRow[], fromIndex: number, toIndex: number): TableDocumentRow[] {
  const row = rows[fromIndex]
  if (!row) return normalizeCpsRowOrder(rows)
  if (row.row_type === 'section') return moveCpsGroupBlock(rows, getCpsSectionGroupId(row), toIndex)

  const next = [...rows]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(clampIndex(toIndex, next.length), 0, moved)
  return normalizeIfContiguous(next, rows)
}

export function moveCpsGroupBlock(rows: TableDocumentRow[], groupId: string | null, toIndex: number): TableDocumentRow[] {
  const block = findCpsGroupBlock(rows, groupId)
  if (!block) return normalizeCpsRowOrder(rows)
  if (toIndex >= block.start && toIndex <= block.end + 1) return normalizeCpsRowOrder(rows)

  const next = [...rows]
  const moved = next.splice(block.start, block.end - block.start + 1)
  const adjustedTarget = toIndex > block.end ? toIndex - moved.length : toIndex
  next.splice(clampIndex(adjustedTarget, next.length), 0, ...moved)
  return normalizeIfContiguous(next, rows)
}
