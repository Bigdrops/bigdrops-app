import type { CommercialDocumentData } from '../industryAdapter'

type TableRow = CommercialDocumentData['table']['rows'][number]

export function isGroupHeader(row: TableRow): boolean {
  return Boolean(row.isGroupHeader)
}

export function isGroupFooter(row: TableRow): boolean {
  return Boolean(row.isGroupFooter)
}

export function getGroupLabel(row: TableRow): string {
  // groupLabel carries the full supplied label (for example "GROUP A — Cables").
  // groupName is only a fallback when no full label was supplied.
  return row.groupLabel || row.groupName || ''
}

export function getGroupSubtotal(row: TableRow): string | null {
  return row.groupSubtotalValue ?? null
}

export function shouldShowGroupSubtotal(row: TableRow): boolean {
  return Boolean(row.showSubtotal)
}
