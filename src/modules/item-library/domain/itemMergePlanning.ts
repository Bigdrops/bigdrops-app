import type {
  DuplicateCandidateGroup,
  ItemAlias,
  ItemLibraryMergeRequest,
} from '../types'

function normalizeAliasText(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*]|\{[^}]*}/g, ' ')
    .replace(/mm²/g, 'sqmm')
    .replace(/mm2/g, 'sqmm')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function suggestPrimaryItemId(group: DuplicateCandidateGroup | null) {
  return group?.members[0]?.item_id || null
}

export function createMergeRequest(
  winnerItemId: string | null,
  mergedItemIds: string[],
): ItemLibraryMergeRequest | null {
  if (!winnerItemId) return null

  const stableMergedIds = [...new Set(mergedItemIds.filter((itemId) => itemId && itemId !== winnerItemId))]
  if (!stableMergedIds.length) return null

  return {
    winnerItemId,
    mergedItemIds: stableMergedIds,
  }
}

export function buildMergePreview(params: {
  aliases: ItemAlias[]
  group: DuplicateCandidateGroup | null
  request: ItemLibraryMergeRequest | null
}) {
  const { aliases, group, request } = params
  if (!group || !request) return null

  const winner = group.members.find((member) => member.item_id === request.winnerItemId) || null
  const mergedMembers = group.members.filter((member) => request.mergedItemIds.includes(member.item_id))
  if (!winner || !mergedMembers.length) return null

  const aliasMap = new Map<string, string>()
  const maybeKeepAlias = (value: string | null | undefined) => {
    const text = String(value || '').trim()
    if (!text) return

    const normalized = normalizeAliasText(text)
    if (!normalized) return
    if (normalized === normalizeAliasText(winner.name)) return
    if (!aliasMap.has(normalized)) aliasMap.set(normalized, text)
  }

  mergedMembers.forEach((member) => maybeKeepAlias(member.name))
  aliases
    .filter((alias) => alias.is_retired !== true && request.mergedItemIds.includes(alias.item_id))
    .forEach((alias) => maybeKeepAlias(alias.alias_text))

  const relinkedHistoryRows = mergedMembers.reduce((sum, member) => sum + Number(member.usage_count || 0), 0)

  return {
    winner,
    mergedMembers,
    aliasesToKeep: [...aliasMap.values()].sort((left, right) => left.localeCompare(right)),
    retiredItems: mergedMembers,
    relinkedHistoryRows,
  }
}
