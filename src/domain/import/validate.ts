import type { InvoiceItem } from '@/domain/invoice'

import type { ImportMode, NormalizedImportData, NormalizedImportGroup, NormalizedImportItem, ValidatedImportData } from './types'
import { hasMeaningfulStandardRows } from './tableState'
import { MAX_IMPORTED_ROWS, getStandardRowEntries } from './utils'

function validateGroupRelationships(
  items: NormalizedImportItem[],
  groups: NormalizedImportGroup[],
): string | null {
  if (groups.length === 0) return null
  const groupById = new Map<string, NormalizedImportGroup>()
  for (const group of groups) {
    const id = String(group.id || '').trim()
    if (!id) return 'Import failed: group is missing an id.'
    if (groupById.has(id)) return `Import failed: duplicate group id "${id}".`
    groupById.set(id, group)
  }
  const tempRefToGroupId = new Map<string, string>()
  for (const group of groups) {
    const gid = String(group.id || '')
    if (!group.itemIds || group.itemIds.length === 0) {
      return `Import failed: group "${gid}" has no items. Each group must list at least one item temp_ref.`
    }
    for (const ref of group.itemIds || []) {
      const existing = tempRefToGroupId.get(ref)
      if (existing && existing !== gid) {
        return `Import failed: item "${ref}" is listed in multiple groups ("${existing}" and "${gid}").`
      }
      tempRefToGroupId.set(ref, gid)
    }
  }
  const knownTempRefs = new Set<string>()
  for (const item of items) {
    const ref = String(item.baseFields.temp_ref || '').trim()
    if (!ref) continue
    if (knownTempRefs.has(ref)) {
      return `Import failed: duplicate item temp_ref "${ref}". Each temp_ref must be unique.`
    }
    knownTempRefs.add(ref)
  }
  for (const group of groups) {
    const gid = String(group.id || '')
    for (const ref of group.itemIds || []) {
      if (!knownTempRefs.has(ref)) {
        return `Import failed: group "${gid}" lists unknown item "${ref}".`
      }
    }
  }
  for (const item of items) {
    const groupId = String(item.baseFields.group_id || '').trim()
    const tempRef = String(item.baseFields.temp_ref || '').trim()
    if (!groupId) {
      if (tempRef && tempRefToGroupId.has(tempRef)) {
        return `Import failed: item "${tempRef}" is listed in group "${tempRefToGroupId.get(tempRef)}" but has no matching group_id.`
      }
      continue
    }
    const group = groupById.get(groupId)
    if (!group) return `Import failed: item "${tempRef || item.sourceIndex + 1}" references unknown group "${groupId}".`
    if (!tempRef) return `Import failed: grouped item in group "${groupId}" is missing temp_ref.`
    if (!(group.itemIds || []).includes(tempRef)) {
      return `Import failed: item "${tempRef}" references group "${groupId}" but is not listed in its itemIds.`
    }
  }
  return null
}

export function validateImportData(
  mode: ImportMode,
  normalized: NormalizedImportData,
  existingItems: InvoiceItem[],
): { ok: true; data: ValidatedImportData } | { ok: false; message: string } {
  if (normalized.items.length > MAX_IMPORTED_ROWS) {
    return {
      ok: false,
      message: `You can import up to ${MAX_IMPORTED_ROWS} rows at a time.`,
    }
  }

  if (mode === 'Add') {
    const validItems = []
    const skippedRows = []

    for (const item of normalized.items) {
      const description = String(item.baseFields.description || '').trim()
      if (!description) {
        skippedRows.push({
          sourceIndex: item.sourceIndex,
          message: 'Description is required.',
        })
        continue
      }
      validItems.push(item)
    }

    if (validItems.length === 0) {
      return {
        ok: false,
        message: 'All imported rows are invalid. Description is required for each row.',
      }
    }

    // ponytail: single canonical relationship is items[].group_id; groups[].itemIds is validated against it.
    const groupError = validateGroupRelationships(validItems, normalized.groups || [])
    if (groupError) return { ok: false, message: groupError }

    return {
      ok: true,
      data: {
        topLevel: normalized.topLevel,
        items: validItems,
        unknownCandidates: normalized.unknownCandidates,
        skippedRows,
        groups: normalized.groups || [],
      },
    }
  }

  const standardRows = getStandardRowEntries(existingItems)
  if (standardRows.length === 0 || !hasMeaningfulStandardRows(existingItems)) {
    return {
      ok: false,
      message: 'Update is only available after the table has at least one real item row.',
    }
  }

  const usedRowNumbers = new Set<number>()

  for (const item of normalized.items) {
    const rowNumber = item.row_number

    if (rowNumber > standardRows.length) {
      return {
        ok: false,
        message: `row_number ${rowNumber} does not match an existing row.`,
      }
    }

    usedRowNumbers.add(rowNumber)
  }

  return {
    ok: true,
    data: {
      topLevel: normalized.topLevel,
      items: normalized.items,
      unknownCandidates: normalized.unknownCandidates,
      skippedRows: [],
      groups: normalized.groups || [],
    },
  }
}
