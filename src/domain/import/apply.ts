import type { InvoiceItem } from '@/domain/invoice'

import type { BuildApplyResultOptions } from './types'
import { detectOverwriteTargets } from './overwrite'
import { getStandardRowEntries } from './utils'

/**
 * Detects whether group assignments are scattered (interleaved with ungrouped items)
 * or clustered (all grouped items at start or end).
 *
 * Returns `true` if scattered — groups should be preserved.
 * Returns `false` if clustered — groups should be silently stripped.
 */
function hasScatteredGroups(
  items: { baseFields: Record<string, unknown> }[],
  groups: { id?: string; itemIds: string[] }[],
): boolean {
  if (groups.length === 0) return false

  const itemTempRefSet = new Set<string>()
  groups.forEach((g) => g.itemIds.forEach((ref) => itemTempRefSet.add(ref)))

  const hasGroup = items.map((item) => {
    const tempRef = item.baseFields.temp_ref as string | undefined
    const groupId = item.baseFields.group_id as string | undefined
    if (groupId) return true
    if (tempRef && itemTempRefSet.has(tempRef)) return true
    return false
  })

  const firstTrue = hasGroup.indexOf(true)
  const lastTrue = hasGroup.lastIndexOf(true)
  const firstFalse = hasGroup.indexOf(false)
  const lastFalse = hasGroup.lastIndexOf(false)

  if (firstTrue === -1 || firstFalse === -1) return false

  const clusteredStart = lastTrue < firstFalse
  const clusteredEnd = lastFalse < firstTrue

  return !clusteredStart && !clusteredEnd
}

function assignResolvedFields(
  item: InvoiceItem,
  source: {
    baseFields: Record<string, string | number | undefined>
    customFields: Record<string, unknown>
    row_number?: number
  },
  exemptOverwriteIds: Set<string>,
) {
  const nextItem: InvoiceItem = {
    ...item,
    custom_data: { ...(item.custom_data || {}) },
  }

  Object.entries(source.baseFields).forEach(([key, value]) => {
    if (value === undefined) return
    const overwriteId = source.row_number ? `${source.row_number}:${key}` : null
    if (overwriteId && exemptOverwriteIds.has(overwriteId)) return
    ;(nextItem as Record<string, unknown>)[key] = value
  })

  Object.entries(source.customFields).forEach(([key, value]) => {
    const overwriteId = source.row_number ? `${source.row_number}:${key}` : null
    if (overwriteId && exemptOverwriteIds.has(overwriteId)) return
    nextItem.custom_data = {
      ...(nextItem.custom_data || {}),
      [key]: value as string | number | null | undefined,
    }
  })

  return nextItem
}

export function buildApplyResult({
  mode,
  existingItems,
  existingColumns,
  resolved,
  skippedRows = [],
  exemptOverwriteIds = [],
  createItem,
  existingGroups = [],
}: BuildApplyResultOptions) {
  const exemptSet = new Set(exemptOverwriteIds)
  const overwriteTargets = mode === 'Update' ? detectOverwriteTargets(resolved, existingItems) : []

  if (mode === 'Add') {
    const groups = resolved.groups || []

    // Cluster check: if groups are clustered (not scattered), strip them silently
    const scattered = hasScatteredGroups(resolved.items, groups)
    if (!scattered && groups.length > 0) {
      const importedItems: InvoiceItem[] = []
      let currentSortOrder = existingItems.length

      resolved.items.forEach((item) => {
        const nextItem = assignResolvedFields(
          {
            ...createItem(),
            row_type: 'standard',
            group_id: null,
            group_name: '',
            sort_order: currentSortOrder++,
          },
          item,
          exemptSet,
        )

        importedItems.push({
          ...nextItem,
          row_type: 'standard' as const,
          group_id: null,
          group_name: '',
        })
      })

      return {
        mode,
        items: [...existingItems, ...importedItems].map((item, index) => ({ ...item, sort_order: index })),
        columns: resolved.columns.length ? resolved.columns : existingColumns,
        topLevel: resolved.topLevel,
        createdColumns: resolved.createdColumns,
        createdRowCount: importedItems.length,
        updatedRowNumbers: [],
        overwriteTargets: [],
        skippedRows,
        groups: [],
      }
    }

    const importedItems: InvoiceItem[] = []
    let currentSortOrder = existingItems.length
    const emittedGroupHeaders = new Set<string>()

    resolved.items.forEach((item) => {
      const tempRef = item.baseFields.temp_ref as string | undefined
      const itemGroupId = item.baseFields.group_id as string | undefined

      let matchedGroup: (typeof groups)[number] | undefined

      if (itemGroupId) {
        matchedGroup = groups.find((g) => g.id === itemGroupId)
      }

      if (!matchedGroup && tempRef) {
        matchedGroup = groups.find((g) => g.itemIds.includes(tempRef))
      }

      if (matchedGroup) {
        if (!emittedGroupHeaders.has(matchedGroup.id)) {
          emittedGroupHeaders.add(matchedGroup.id)
          importedItems.push({
            ...createItem(),
            row_type: 'group_header',
            group_id: matchedGroup.id,
            group_name: matchedGroup.name,
            sort_order: currentSortOrder++,
            description: matchedGroup.name,
            quantity: 0,
            unit_price: 0,
          })
        }

        const nextItem = assignResolvedFields(
          {
            ...createItem(),
            row_type: 'standard',
            group_id: matchedGroup.id,
            group_name: matchedGroup.name,
            sort_order: currentSortOrder++,
          },
          item,
          exemptSet,
        )

        importedItems.push({
          ...nextItem,
          row_type: 'standard' as const,
          group_id: matchedGroup.id,
          group_name: matchedGroup.name,
        })
      } else {
        const nextItem = assignResolvedFields(
          {
            ...createItem(),
            row_type: 'standard',
            group_id: null,
            group_name: '',
            sort_order: currentSortOrder++,
          },
          item,
          exemptSet,
        )

        importedItems.push({
          ...nextItem,
          row_type: 'standard' as const,
          group_id: null,
          group_name: '',
        })
      }
    })

    const resultGroups = groups.map((g) => ({
      id: g.id,
      name: g.name,
      showSubtotal: true,
    }))

    return {
      mode,
      items: [...existingItems, ...importedItems].map((item, index) => ({ ...item, sort_order: index })),
      columns: resolved.columns.length ? resolved.columns : existingColumns,
      topLevel: resolved.topLevel,
      createdColumns: resolved.createdColumns,
      createdRowCount: importedItems.length,
      updatedRowNumbers: [],
      overwriteTargets: [],
      skippedRows,
      groups: resultGroups,
    }
  }

  const nextItems: InvoiceItem[] = existingItems.map((item) => ({
    ...item,
    custom_data: { ...(item.custom_data || {}) },
  }))
  const rowEntries = getStandardRowEntries(nextItems)

  resolved.items.forEach((item) => {
    if (!item.row_number) return
    const target = rowEntries.find((entry) => entry.rowNumber === item.row_number)
    if (!target) return
    nextItems[target.index] = assignResolvedFields(target.item, item, exemptSet)
  })

  return {
    mode,
    items: nextItems.map((item, index) => ({ ...item, sort_order: index })),
    columns: resolved.columns.length ? resolved.columns : existingColumns,
    topLevel: resolved.topLevel,
    createdColumns: resolved.createdColumns,
    createdRowCount: 0,
    updatedRowNumbers: resolved.items.map((item) => item.row_number).filter((value): value is number => typeof value === 'number'),
    overwriteTargets,
    skippedRows,
    groups: existingGroups,
  }
}
