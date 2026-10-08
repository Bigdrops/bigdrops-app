import type { InvoiceItem } from '@/domain/invoice'

import type { BuildApplyResultOptions } from './types'
import { detectOverwriteTargets } from './overwrite'
import { isMeaningfulStandardRow } from './tableState'
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

    // ponytail: an existing row whose description is empty is a reusable placeholder.
    // The import fills those rows in source order before allocating new ones, while
    // every occupied row and every group boundary stays exactly where it was.
    type ImportedRowPlan = {
      source: (typeof resolved.items)[number]
      groupId: string | null
      groupName: string
    }

    // Plan every imported row first so group references are validated once and the
    // canonical (post-remap) group id is known before any row is reused.
    const plans: ImportedRowPlan[] = resolved.items.map((item) => {
      const tempRef = String(item.baseFields.temp_ref || '').trim() || undefined
      const rawGroupId = String(item.baseFields.group_id || '').trim() || undefined
      const itemGroupId = rawGroupId ? finalIdByImportedId.get(rawGroupId) || rawGroupId : undefined
      const referencesGroup =
        !!tempRef && [...resolvedById.values()].some((g) => g.itemIds.includes(tempRef))

      if (!itemGroupId && !referencesGroup) {
        return { source: item, groupId: null, groupName: '' }
      }

      // ponytail: canonical relationship is items[].group_id; itemIds only corroborates. Never silently ungroup.
      if (!itemGroupId || !resolvedById.has(itemGroupId)) {
        throw new Error(
          `Import failed: item "${tempRef || 'unknown'}" references unknown group "${itemGroupId || 'missing'}".`,
        )
      }
      const matchedGroup = resolvedById.get(itemGroupId) as (typeof resolvedGroups)[number]
      if (!tempRef || !matchedGroup.itemIds.includes(tempRef)) {
        throw new Error(
          `Import failed: item "${tempRef || 'unknown'}" is not listed in group "${rawGroupId}" itemIds.`,
        )
      }
      return { source: item, groupId: String(matchedGroup.id), groupName: matchedGroup.name }
    })

    // ponytail: build from a fresh item so a reused placeholder never leaks stale
    // quantity/rate (or old group membership) into the imported row.
    const buildImportedItem = (plan: ImportedRowPlan, sortOrder: number) =>
      assignResolvedFields(
        {
          ...createItem(),
          row_type: 'standard',
          group_id: plan.groupId,
          group_name: plan.groupName,
          sort_order: sortOrder,
        },
        plan.source,
        exemptSet,
      )

    // Reuse eligible rows: a plan may occupy an empty-description row only when both
    // sit in the same group context. A grouped plan additionally needs the group's
    // existing header, so a reused row can never be detached from its block. Rows
    // that do not match keep their data; their plan is appended instead.
    const reusedByIndex = new Map<number, ImportedRowPlan>()
    let nextPlanIndex = 0
    for (let index = 0; index < existingItems.length && nextPlanIndex < plans.length; index += 1) {
      const existing = existingItems[index]
      if (existing.row_type === 'group_header') continue
      if (String(existing.description ?? '').trim() !== '') continue

      const plan = plans[nextPlanIndex]
      const existingGroupId = String(existing.group_id || '').trim() || null
      const sameGroupContext = (plan.groupId || null) === existingGroupId
      const groupIsAttached = !plan.groupId || existingHeaderIds.has(plan.groupId)
      if (!sameGroupContext || !groupIsAttached) continue

      reusedByIndex.set(index, plan)
      nextPlanIndex += 1
    }

    let currentSortOrder = existingItems.length
    const reusedItems: InvoiceItem[] = existingItems.map((existing, index) => {
      const plan = reusedByIndex.get(index)
      if (!plan) return existing
      const nextItem = buildImportedItem(plan, currentSortOrder++)
      // Keep the placeholder's identity so React keys and row identity stay stable
      // and no duplicate identity is introduced.
      return {
        ...nextItem,
        row_type: 'standard' as const,
        group_id: plan.groupId,
        group_name: plan.groupName,
        _uiKey: existing._uiKey ?? nextItem._uiKey,
        id: existing.id ?? nextItem.id,
      }
    })

    const appendedItems: InvoiceItem[] = []
    const emittedGroupHeaders = new Set<string>(existingHeaderIds)
    for (let index = nextPlanIndex; index < plans.length; index += 1) {
      const plan = plans[index]
      if (plan.groupId && !emittedGroupHeaders.has(plan.groupId)) {
        emittedGroupHeaders.add(plan.groupId)
        appendedItems.push({
          ...createItem(),
          row_type: 'group_header',
          group_id: plan.groupId,
          group_name: plan.groupName,
          sort_order: currentSortOrder++,
          description: plan.groupName,
          quantity: 0,
          unit_price: 0,
        })
      }
      appendedItems.push({
        ...buildImportedItem(plan, currentSortOrder++),
        row_type: 'standard' as const,
        group_id: plan.groupId,
        group_name: plan.groupName,
      })
    }

    // ponytail: the only disposable placeholder is the marked, pristine, ungrouped
    // starter row a New form seeds. Once a successful import has established real
    // rows and did not reuse it, retire it so no blank starter row is left behind.
    // User-authored rows are never marked, so they are never removed here.
    const discardedStarterIndexes = new Set<number>()
    if (plans.length > 0) {
      existingItems.forEach((existing, index) => {
        if (!existing._isStarter) return
        if (reusedByIndex.has(index)) return
        if (String(existing.group_id || '').trim() !== '') return
        if (isMeaningfulStandardRow(existing)) return
        discardedStarterIndexes.add(index)
      })
    }

    return {
      mode,
      items: [...reusedItems, ...appendedItems]
        .filter((_, index) => !discardedStarterIndexes.has(index))
        .map((item, index) => {
          const { _isStarter: _starter, ...rest } = item
          return { ...rest, sort_order: index }
        }),
      columns: resolved.columns.length ? resolved.columns : existingColumns,
      topLevel: resolved.topLevel,
      createdColumns: resolved.createdColumns,
      createdRowCount: appendedItems.length,
      updatedRowNumbers: [],
      overwriteTargets: [],
      skippedRows,
      groups: mergedGroups,
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
