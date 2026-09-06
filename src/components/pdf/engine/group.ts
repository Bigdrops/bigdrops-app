import type { CommercialDocumentData } from '../industryAdapter'

type TableRow = CommercialDocumentData['table']['rows'][number]

export function isGroupHeader(row: TableRow): boolean {
  return Boolean(row.isGroupHeader)
}

export function isGroupFooter(row: TableRow): boolean {
  return Boolean(row.isGroupFooter)
}

export function getGroupLabel(row: TableRow): string {
  return row.groupName || row.groupLabel || ''
}

export function getGroupSubtotal(row: TableRow): string | null {
  return row.groupSubtotalValue ?? null
}

export function shouldShowGroupSubtotal(row: TableRow): boolean {
  return Boolean(row.showSubtotal)
}
