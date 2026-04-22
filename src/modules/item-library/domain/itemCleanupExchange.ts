import type {
  DuplicateCandidateGroup,
  FlaggedCleanupExportGroup,
  FlaggedCleanupExportItem,
  FlaggedCleanupExportPayload,
  FlaggedCleanupImportPayload,
  CleanupImportValidationResult,
  CleanupPreviewGroup,
  CleanupPreviewRejectedGroup,
  ItemAlias,
} from '../types'

export const FLAGGED_CLEANUP_SCHEMA_VERSION = 1 as const

function normalizeText(value: string) {
  return String(value || '').trim().toLowerCase()
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return null
  const collected = value.map((entry) => readString(entry))
  if (collected.some((entry) => !entry)) return null
  return uniqueSorted(collected)
}

function buildAliasMap(aliases: ItemAlias[]) {
  const aliasMap = new Map<string, string[]>()

  aliases.forEach((alias) => {
    if (!alias.item_id || alias.is_retired === true) return
    const current = aliasMap.get(alias.item_id) || []
    current.push(alias.alias_text)
    aliasMap.set(alias.item_id, current)
  })

  return aliasMap
}

function toExportItem(member: DuplicateCandidateGroup['members'][number], aliases: string[]): FlaggedCleanupExportItem {
  return {
    item_id: member.item_id,
    name: member.name,
    usage_count: Number(member.usage_count || 0),
    last_price: member.last_sold_price ?? null,
    is_active: true,
    aliases: uniqueSorted(
      aliases.filter((alias) => normalizeText(alias) && normalizeText(alias) !== normalizeText(member.name)),
    ),
  }
}

export function buildFlaggedCleanupExportPayload(params: {
  duplicateGroups: DuplicateCandidateGroup[]
  aliases: ItemAlias[]
  generatedAt?: string
}): FlaggedCleanupExportPayload {
  const aliasMap = buildAliasMap(params.aliases)

  const groups: FlaggedCleanupExportGroup[] = params.duplicateGroups.map((group) => ({
    group_id: group.group_id,
    label: group.label,
    items: group.members.map((member) => toExportItem(member, aliasMap.get(member.item_id) || [])),
  }))

  const itemCount = groups.reduce((sum, group) => sum + group.items.length, 0)

  return {
    export_type: 'flagged_cleanup',
    schema_version: FLAGGED_CLEANUP_SCHEMA_VERSION,
    generated_at: params.generatedAt || new Date().toISOString(),
    scope: {
      mode: 'flagged',
      group_count: groups.length,
      item_count: itemCount,
    },
    groups,
  }
}

export function buildFlaggedCleanupPrompt(payload: FlaggedCleanupExportPayload) {
  return [
    'You are reviewing flagged duplicate item groups from an internal item library.',
    'Return strict JSON only. Do not include markdown, commentary, prose, or code fences.',
    '',
    'Rules:',
    '- Never invent items, item ids, group ids, aliases, or groups.',
    '- Only propose merges when the similarity is clear and defensible.',
    '- If a group is ambiguous, leave it out of merge_groups and include its group_id in ignored_group_ids.',
    '- Keep useful alternate wording in aliases_to_keep when it helps future search or recognition.',
    '- Use aliases_to_retire only for wording that should stay documented but not actively preserved.',
    '- winner_item_id must be one of the items already present in that exported group.',
    '- merged_item_ids must come only from the same exported group and must not include the winner.',
    '',
    `Input export metadata: export_type=${payload.export_type}, schema_version=${payload.schema_version}, groups=${payload.scope.group_count}, items=${payload.scope.item_count}.`,
    '',
    'Return exactly this JSON shape:',
    JSON.stringify(
      {
        response_type: 'flagged_cleanup_result',
        schema_version: 1,
        source_export_type: 'flagged_cleanup',
        merge_groups: [
          {
            group_id: 'same-as-export-group-id',
            canonical_name: 'Clear canonical item name',
            winner_item_id: 'existing-item-id-from-group',
            merged_item_ids: ['existing-item-id-from-group'],
            aliases_to_keep: ['Useful alternate wording'],
            aliases_to_retire: ['Optional retired wording'],
          },
        ],
        ignored_group_ids: ['group-id-to-skip'],
      },
      null,
      2,
    ),
  ].join('\n')
}

export function validateFlaggedCleanupImport(
  input: string,
  exportPayload: FlaggedCleanupExportPayload,
): CleanupImportValidationResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return {
      ok: false,
      errors: [],
      preview: null,
      parsed: null,
    }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(trimmed)
  } catch {
    return {
      ok: false,
      errors: ['AI result is not valid JSON. Paste the raw JSON response only.'],
      preview: null,
      parsed: null,
    }
  }

  if (!isRecord(parsedJson)) {
    return {
      ok: false,
      errors: ['AI result must be a JSON object at the top level.'],
      preview: null,
      parsed: null,
    }
  }

  const responseType = readString(parsedJson.response_type)
  const sourceExportType = readString(parsedJson.source_export_type)
  const schemaVersion = parsedJson.schema_version
  const mergeGroupsRaw = parsedJson.merge_groups
  const ignoredGroupIds = readStringArray(parsedJson.ignored_group_ids)

  const topLevelErrors: string[] = []
  if (responseType !== 'flagged_cleanup_result') {
    topLevelErrors.push('response_type must be "flagged_cleanup_result".')
  }
  if (schemaVersion !== FLAGGED_CLEANUP_SCHEMA_VERSION) {
    topLevelErrors.push(`schema_version must be ${FLAGGED_CLEANUP_SCHEMA_VERSION}.`)
  }
  if (sourceExportType !== 'flagged_cleanup') {
    topLevelErrors.push('source_export_type must be "flagged_cleanup".')
  }
  if (!Array.isArray(mergeGroupsRaw)) {
    topLevelErrors.push('merge_groups must be an array.')
  }
  if (!ignoredGroupIds) {
    topLevelErrors.push('ignored_group_ids must be an array of strings.')
  }

  if (topLevelErrors.length) {
    return {
      ok: false,
      errors: topLevelErrors,
      preview: null,
      parsed: null,
    }
  }

  const exportGroups = new Map(exportPayload.groups.map((group) => [group.group_id, group]))
  const ignoredGroups = ignoredGroupIds
    .map((groupId) => exportGroups.get(groupId))
    .filter((group): group is FlaggedCleanupExportGroup => Boolean(group))
  const unknownIgnoredGroupIds = ignoredGroupIds.filter((groupId) => !exportGroups.has(groupId))

  const validPreviewGroups: CleanupPreviewGroup[] = []
  const rejectedGroups: CleanupPreviewRejectedGroup[] = []

  mergeGroupsRaw.forEach((entry, index) => {
    if (!isRecord(entry)) {
      rejectedGroups.push({
        group_id: `row-${index + 1}`,
        reason: 'Each merge_groups entry must be a JSON object.',
      })
      return
    }

    const groupId = readString(entry.group_id) || `row-${index + 1}`
    const canonicalName = readString(entry.canonical_name)
    const winnerItemId = readString(entry.winner_item_id)
    const mergedItemIds = readStringArray(entry.merged_item_ids)
    const aliasesToKeep = readStringArray(entry.aliases_to_keep)
    const aliasesToRetire = readStringArray(entry.aliases_to_retire)

    const groupErrors: string[] = []
    const exportGroup = exportGroups.get(groupId)

    if (!exportGroup) groupErrors.push('group_id does not match any currently exported flagged group.')
    if (!canonicalName) groupErrors.push('canonical_name is required.')
    if (!winnerItemId) groupErrors.push('winner_item_id is required.')
    if (!mergedItemIds || mergedItemIds.length === 0) groupErrors.push('merged_item_ids must contain at least one item id.')
    if (!aliasesToKeep) groupErrors.push('aliases_to_keep must be an array of strings.')
    if (!aliasesToRetire) groupErrors.push('aliases_to_retire must be an array of strings.')

    if (exportGroup) {
      const groupItems = new Map(exportGroup.items.map((item) => [item.item_id, item]))
      const winner = winnerItemId ? groupItems.get(winnerItemId) : null

      if (!winner) {
        groupErrors.push('winner_item_id must reference an item inside the same exported group.')
      }

      if (mergedItemIds) {
        const outsideGroupIds = mergedItemIds.filter((itemId) => !groupItems.has(itemId))
        if (outsideGroupIds.length) {
          groupErrors.push('merged_item_ids must all reference items inside the same exported group.')
        }
        if (winnerItemId && mergedItemIds.includes(winnerItemId)) {
          groupErrors.push('merged_item_ids must not include the winner_item_id.')
        }
      }

      if (!groupErrors.length && winner && mergedItemIds && aliasesToKeep && aliasesToRetire) {
        validPreviewGroups.push({
          group_id: groupId,
          export_label: exportGroup.label,
          canonical_name: canonicalName,
          winner,
          merged_items: mergedItemIds
            .map((itemId) => groupItems.get(itemId))
            .filter((item): item is FlaggedCleanupExportItem => Boolean(item)),
          aliases_to_keep: aliasesToKeep,
          aliases_to_retire: aliasesToRetire,
        })
        return
      }
    }

    rejectedGroups.push({
      group_id: groupId,
      reason: groupErrors.join(' '),
    })
  })

  const parsed: FlaggedCleanupImportPayload = {
    response_type: 'flagged_cleanup_result',
    schema_version: FLAGGED_CLEANUP_SCHEMA_VERSION,
    source_export_type: 'flagged_cleanup',
    merge_groups: validPreviewGroups.map((group) => ({
      group_id: group.group_id,
      canonical_name: group.canonical_name,
      winner_item_id: group.winner.item_id,
      merged_item_ids: group.merged_items.map((item) => item.item_id),
      aliases_to_keep: group.aliases_to_keep,
      aliases_to_retire: group.aliases_to_retire,
    })),
    ignored_group_ids: ignoredGroupIds || [],
  }

  return {
    ok: topLevelErrors.length === 0 && rejectedGroups.length === 0 && unknownIgnoredGroupIds.length === 0,
    errors: [],
    preview: {
      merge_groups: validPreviewGroups,
      ignored_groups: ignoredGroups,
      rejected_groups: [
        ...rejectedGroups,
        ...unknownIgnoredGroupIds.map((groupId) => ({
          group_id: groupId,
          reason: 'ignored_group_ids must reference groups inside the current flagged export scope.',
        })),
      ],
    },
    parsed,
  }
}
