import type { TableDocumentRow } from '@/domain/table-document/types'

export type GroupSequenceEntry = {
  groupId: string | null
  label?: string
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim()
}

function formatGroupLabel(id: string, label?: string): string {
  const cleanLabel = text(label)
  return cleanLabel && cleanLabel !== id ? `${cleanLabel} (${id})` : id
}

export function validateContiguousGroupSequence(entries: readonly GroupSequenceEntry[]): string | null {
  let activeGroup: string | null = null
  const closedGroups = new Set<string>()
  const labels = new Map<string, string>()

  for (const entry of entries) {
    const groupId = text(entry.groupId) || null
    if (groupId && entry.label) labels.set(groupId, entry.label)

    if (!groupId) {
      if (activeGroup) closedGroups.add(activeGroup)
      activeGroup = null
      continue
    }

    if (groupId === activeGroup) continue
    if (closedGroups.has(groupId)) {
      return `Invalid CPS group structure: "${formatGroupLabel(groupId, labels.get(groupId))}" is split into multiple sections. Group items must be contiguous.`
    }
    if (activeGroup) closedGroups.add(activeGroup)
    activeGroup = groupId
  }

  return null
}

function rowGroupId(row: TableDocumentRow): string | null {
  if (row.row_type === 'section') return text(row.group_id || row.id || row._uiKey) || null
  return text(row.group_id) || null
}

export function validateCpsGroupStructure(rows: readonly TableDocumentRow[]): string | null {
  return validateContiguousGroupSequence(
    rows.map((row) => ({
      groupId: rowGroupId(row),
      label: row.row_type === 'section' ? row.section_title || row.description || undefined : undefined,
    })),
  )
}

export function isCpsGroupStructureContiguous(rows: readonly TableDocumentRow[]): boolean {
  return validateCpsGroupStructure(rows) === null
}
