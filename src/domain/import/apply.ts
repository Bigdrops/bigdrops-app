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
    // ponytail: temp_ref is import-only; group_id is set canonically by the caller, never copied raw.
    if (key === 'temp_ref' || key === 'group_id' || key === 'row_number') return
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

    // ponytail: rebuild existing group state from items + param so appends never drop groups.
    const existingGroupMeta = new Map<string, { id: string; name: string; showSubtotal: boolean }>()
    for (const g of existingGroups || []) {
      const gid = String((g as { id?: unknown }).id || '').trim()
      if (gid && !existingGroupMeta.has(gid)) {
        existingGroupMeta.set(gid, { id: gid, name: String((g as { name?: unknown }).name || 'Group'), showSubtotal: true })
      }
    }
    const existingHeaderIds = new Set<string>()
    for (const item of existingItems) {
      const gid = String(item.group_id || '').trim()
      if (item.row_type === 'group_header' && gid) {
        existingHeaderIds.add(gid)
        if (!existingGroupMeta.has(gid)) {
          existingGroupMeta.set(gid, { id: gid, name: String(item.group_name || 'Group'), showSubtotal: true })
        }
      }
    }

    // ponytail: remap imported ids only on true collision (same id, different name). Same id + same name merges.
    const usedIds = new Set(existingGroupMeta.keys())
    const finalIdByImportedId = new Map<string, string>()
    const mergedGroups: { id: string; name: string; showSubtotal: boolean }[] = [...existingGroupMeta.values()]
    for (const g of groups) {
      const importedId = String(g.id)
      const importedName = String(g.name || '').trim() || 'Group'
      const existing = existingGroupMeta.get(importedId)
      if (!existing) {
        usedIds.add(importedId)
        finalIdByImportedId.set(importedId, importedId)
        mergedGroups.push({ id: importedId, name: importedName, showSubtotal: true })
      } else if (existing.name.trim() === importedName) {
        finalIdByImportedId.set(importedId, importedId)
      } else {
        let candidate = `${importedId}_imported`
        let suffix = 2
        while (usedIds.has(candidate)) {
          candidate = `${importedId}_imported_${suffix}`
          suffix += 1
        }
        usedIds.add(candidate)
        finalIdByImportedId.set(importedId, candidate)
        mergedGroups.push({ id: candidate, name: importedName, showSubtotal: true })
      }
    }
    // Rewrite itemIds to final ids for corroboration checks below.
    const resolvedGroups = groups.map((g) => {
      const importedId = String(g.id)
      const finalId = finalIdByImportedId.get(importedId) || importedId
      return { ...g, id: finalId }
    })
    const resolvedById = new Map(resolvedGroups.map((g) => [String(g.id), g]))

    const importedItems: InvoiceItem[] = []
    let currentSortOrder = existingItems.length
    const emittedGroupHeaders = new Set<string>(existingHeaderIds)

    resolved.items.forEach((item) => {
      const tempRef = String(item.baseFields.temp_ref || '').trim() || undefined
      const rawGroupId = String(item.baseFields.group_id || '').trim() || undefined
      const itemGroupId = rawGroupId ? finalIdByImportedId.get(rawGroupId) || rawGroupId : undefined

      // ponytail: canonical relationship is items[].group_id; itemIds only corroborates. Never silently ungroup.
      if (itemGroupId || (tempRef && [...resolvedById.values()].some((g) => g.itemIds.includes(tempRef as string)))) {
        if (!itemGroupId || !resolvedById.has(itemGroupId)) {
          throw new Error(
            `Import failed: item "${tempRef || 'unknown'}" references unknown group "${itemGroupId || 'missing'}".`,
          )
        }
        const matchedGroup = resolvedById.get(itemGroupId) as (typeof resolvedGroups)[number]
        const matchedGroupId = String(matchedGroup.id)
        if (!tempRef || !matchedGroup.itemIds.includes(tempRef)) {
          throw new Error(
            `Import failed: item "${tempRef || 'unknown'}" is not listed in group "${rawGroupId}" itemIds.`,
          )
        }
        if (!emittedGroupHeaders.has(matchedGroupId)) {
          emittedGroupHeaders.add(matchedGroupId)
          importedItems.push({
            ...createItem(),
            row_type: 'group_header',
            group_id: matchedGroupId,
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
            group_id: matchedGroupId,
            group_name: matchedGroup.name,
            sort_order: currentSortOrder++,
          },
          item,
          exemptSet,
        )

        importedItems.push({
          ...nextItem,
          row_type: 'standard' as const,
          group_id: matchedGroupId,
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

    const resultGroups = mergedGroups

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
