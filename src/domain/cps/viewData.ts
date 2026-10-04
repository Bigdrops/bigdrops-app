import { computeCpsCommercialView } from './calculations'
import { computeCpsRowEconomics } from './calculateCpsTotals'
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

export type CpsViewItemRow = Extract<CpsViewRow, { type: 'item' }>
export type CpsViewGroupRow = Extract<CpsViewRow, { type: 'group' }>

export type CpsViewSegment =
  | { type: 'item'; row: CpsViewItemRow; membership: string | null | undefined }
  | {
      type: 'group'
      row: CpsViewGroupRow
      membership: string
      items: CpsViewItemRow[]
      total: number
      count: number
    }

function rowKey(row: TableDocumentRow, index: number) {
  return row.id || row._uiKey || `${row.row_type}-${index}`
}

function resolveGroupMembership(rows: CpsViewRow[]) {
  const groups = new Map<string, string>()
  rows.forEach((row) => {
    if (row.type !== 'group') return
    const membership = row.groupId || row.key
    groups.set(row.key, membership)
    if (row.groupId) groups.set(row.groupId, membership)
  })
  return groups
}

function membershipOf(row: CpsViewItemRow, groups: Map<string, string>): string | null | undefined {
  if (!row.groupId) return undefined
  const membership = groups.get(row.groupId)
  return membership === undefined ? null : membership
}

export function buildCpsViewSegments(rows: CpsViewRow[]): CpsViewSegment[] {
  const groups = resolveGroupMembership(rows)
  const memberships = new Map<string, { items: CpsViewItemRow[]; total: number; count: number }>()

  rows.forEach((row) => {
    if (row.type !== 'item') return
    const membership = membershipOf(row, groups)
    if (typeof membership !== 'string') return
    const entry = memberships.get(membership) || { items: [], total: 0, count: 0 }
    entry.items.push(row)
    entry.total += row.selling
    entry.count += 1
    memberships.set(membership, entry)
  })

  const segments: CpsViewSegment[] = []
  rows.forEach((row) => {
    if (row.type === 'group') {
      const membership = groups.get(row.key) || row.groupId || row.key
      const entry = memberships.get(membership) || { items: [], total: 0, count: 0 }
      segments.push({
        type: 'group',
        row,
        membership,
        items: entry.items,
        total: entry.total,
        count: entry.count,
      })
      return
    }

    const membership = membershipOf(row, groups)
    if (typeof membership === 'string') return
    segments.push({ type: 'item', row, membership })
  })

  return segments
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
    const econ = computeCpsRowEconomics(row)

    return {
      type: 'item',
      key: rowKey(row, index),
      number: String(itemNumber).padStart(2, '0'),
      groupId: row.group_id || null,
      description: row.description || '',
      specification: row.specification || '',
      makeBrand: row.make_brand || '',
      quantity: econ.quantity,
      unit: row.unit || '',
      cp: econ.cp,
      sp: econ.sp,
      cost: econ.total_cost_price,
      selling: econ.total_selling_price,
      profit: econ.profit,
      marginPercent: econ.margin_percent,
      notes: row.notes || '',
      imageUrl: row.image_url || null,
    }
  })

  return { document: cps, rows, totals }
}
