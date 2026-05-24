import type { InvoiceItem } from '@/domain/invoice'

import type { BuildApplyResultOptions } from './types'
import { detectOverwriteTargets } from './overwrite'
import { getStandardRowEntries } from './utils'

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
    const itemTempRefMap = new Map<string, number>()

    resolved.items.forEach((item, index) => {
      const tempRef = item.baseFields.temp_ref as string | undefined
      if (tempRef) {
        itemTempRefMap.set(tempRef, index)
      }
    })

    const groupedItemIndices = new Set<number>()

    groups.forEach((group) => {
      group.itemIds.forEach((tempRef) => {
        const idx = itemTempRefMap.get(tempRef)
        if (idx !== undefined) groupedItemIndices.add(idx)
      })
    })

    resolved.items.forEach((item, idx) => {
      const itemGroupId = item.baseFields.group_id as string | undefined
      if (itemGroupId) {
        const groupIdx = groups.findIndex((g) => g.id === itemGroupId)
        if (groupIdx !== -1) groupedItemIndices.add(idx)
      }
    })

    const importedItems: InvoiceItem[] = []
    let currentSortOrder = existingItems.length

    groups.forEach((group) => {
      importedItems.push({
        ...createItem(),
        row_type: 'group_header',
        group_id: group.id,
        group_name: group.name,
        sort_order: currentSortOrder++,
        description: group.name,
        quantity: 0,
        unit_price: 0,
      })

      resolved.items.forEach((item, itemIndex) => {
        const itemTempRef = item.baseFields.temp_ref as string | undefined
        const itemGroupId = item.baseFields.group_id as string | undefined
        const matchedViaItemIds = group.itemIds.includes(itemTempRef || '')
        const matchedViaGroupId = itemGroupId === group.id

        if (matchedViaItemIds || matchedViaGroupId) {
          const nextItem = assignResolvedFields(
            {
              ...createItem(),
              row_type: 'standard',
              group_id: group.id,
              group_name: group.name,
              sort_order: currentSortOrder++,
            },
            item,
            exemptSet,
          )

          importedItems.push({
            ...nextItem,
            row_type: 'standard' as const,
            group_id: group.id,
            group_name: group.name,
          })
        }
      })
    })

    resolved.items.forEach((item, index) => {
      if (!groupedItemIndices.has(index)) {
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
      showSubtotal: g.showSubtotal,
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
