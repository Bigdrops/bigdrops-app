export type ImportGroupMembershipGroup = {
  id?: unknown
  name?: unknown
  itemIds?: readonly unknown[]
}

export type ImportGroupMembershipItem = {
  tempRef?: unknown
  groupId?: unknown
  sourceIndex?: number
}

export type ImportGroupMembershipInput = {
  groups: readonly ImportGroupMembershipGroup[]
  items: readonly ImportGroupMembershipItem[]
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim()
}

function groupLabel(group: ImportGroupMembershipGroup | undefined, id: string): string {
  const name = text(group?.name)
  return name ? `${name} (${id})` : id
}

function sameMembers(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every((value) => rightSet.has(value))
}

export function validateImportGroupMembership(input: ImportGroupMembershipInput): string | null {
  const groups = input.groups || []
  const items = input.items || []
  const groupById = new Map<string, ImportGroupMembershipGroup>()

  for (const group of groups) {
    const id = text(group.id)
    if (!id) return 'Import failed: group is missing an id.'
    if (groupById.has(id)) return `Import failed: duplicate group id "${id}".`
    groupById.set(id, group)
  }

  const tempRefToGroupId = new Map<string, string>()
  for (const group of groups) {
    const gid = text(group.id)
    const itemIds = (group.itemIds || []).map(text).filter(Boolean)
    if (itemIds.length === 0) {
      return `Import failed: group "${gid}" has no items. Each group must list at least one item temp_ref.`
    }
    for (const ref of itemIds) {
      const existing = tempRefToGroupId.get(ref)
      if (existing && existing !== gid) {
        return `Import failed: item "${ref}" is listed in multiple groups ("${existing}" and "${gid}").`
      }
      tempRefToGroupId.set(ref, gid)
    }
  }

  const knownTempRefs = new Set<string>()
  for (const item of items) {
    const ref = text(item.tempRef)
    if (!ref) continue
    if (knownTempRefs.has(ref)) {
      return `Import failed: duplicate item temp_ref "${ref}". Each temp_ref must be unique.`
    }
    knownTempRefs.add(ref)
  }

  for (const group of groups) {
    const gid = text(group.id)
    for (const ref of (group.itemIds || []).map(text).filter(Boolean)) {
      if (!knownTempRefs.has(ref)) {
        return `Import failed: group "${gid}" lists unknown item "${ref}".`
      }
    }
  }

  for (const item of items) {
    const groupId = text(item.groupId)
    const tempRef = text(item.tempRef)
    if (!groupId) {
      if (tempRef && tempRefToGroupId.has(tempRef)) {
        return `Import failed: item "${tempRef}" is listed in group "${tempRefToGroupId.get(tempRef)}" but has no matching group_id.`
      }
      continue
    }
    const group = groupById.get(groupId)
    if (!group) return `Import failed: item "${tempRef || Number(item.sourceIndex || 0) + 1}" references unknown group "${groupId}".`
    if (!tempRef) return `Import failed: grouped item in group "${groupId}" is missing temp_ref.`
    const listedGroupId = tempRefToGroupId.get(tempRef)
    if (!listedGroupId) {
      return `Import failed: item "${tempRef}" references group "${groupId}" but is not listed in its itemIds.`
    }
    if (listedGroupId !== groupId) {
      return `Import failed: item "${tempRef}" group_id "${groupId}" does not match itemIds group "${listedGroupId}".`
    }
  }

  for (const [groupId, group] of groupById) {
    const declaredRefs = (group.itemIds || []).map(text).filter(Boolean)
    const sourceRefs = items
      .filter((item) => text(item.groupId) === groupId)
      .map((item) => text(item.tempRef))
      .filter(Boolean)

    if (declaredRefs.length !== sourceRefs.length || !sameMembers(declaredRefs, sourceRefs)) {
      return `Import failed: group "${groupLabel(group, groupId)}" itemIds must exactly match the items whose group_id references that group.`
    }

    const orderMismatch = declaredRefs.some((ref, index) => ref !== sourceRefs[index])
    if (orderMismatch) {
      return `Import failed: group "${groupLabel(group, groupId)}" itemIds order must match the source item order.`
    }
  }

  let activeGroup: string | null = null
  const closedGroups = new Set<string>()
  for (const item of items) {
    const groupId = text(item.groupId)
    if (!groupId) {
      if (activeGroup) closedGroups.add(activeGroup)
      activeGroup = null
      continue
    }

    if (groupId === activeGroup) continue
    if (closedGroups.has(groupId)) {
      return `Invalid CPS group structure: "${groupLabel(groupById.get(groupId), groupId)}" is split into multiple sections. Group items must be contiguous.`
    }
    if (activeGroup) closedGroups.add(activeGroup)
    activeGroup = groupId
  }

  return null
}
