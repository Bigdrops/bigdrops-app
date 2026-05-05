import type {
  CatalogCleanupAliasSuggestion,
  CatalogCleanupBatch,
  CatalogCleanupBatchExportPayload,
  CatalogCleanupBatchImportPayload,
  CatalogCleanupExportItem,
  CatalogCleanupImportValidationResult,
  CatalogCleanupMergeSuggestion,
  CatalogCleanupPreviewAliasSuggestion,
  CatalogCleanupPreviewMergeSuggestion,
  CatalogCleanupPreviewRenameSuggestion,
  CatalogCleanupRenameSuggestion,
  CatalogCleanupSession,
  DuplicateCandidateGroup,
  CleanupApplyProposal,
  CleanupApplyResult,
  FlaggedCleanupExportGroup,
  FlaggedCleanupExportItem,
  FlaggedCleanupExportPayload,
  FlaggedCleanupImportPayload,
  CleanupImportValidationResult,
  CleanupPreviewGroup,
  CleanupPreviewRejectedGroup,
  ItemAlias,
  FlaggedCleanupBatch,
  FlaggedCleanupBatchExportPayload,
} from '../types'

export const FLAGGED_CLEANUP_SCHEMA_VERSION = 1 as const

const CATEGORIES = [
  {
    title: 'Breakers, Contactors & Transformers',
    keywords: ['breaker', 'mcb', 'mccb', 'contactor', 'transformer', 'isolator', 'relay', 'vigi'],
  },
  {
    title: 'Cables, Lugs & Containment',
    keywords: ['cable', 'wire', 'flex', 'lug', 'gland', 'tray', 'trunking', 'conduit', 'pvc'],
  },
  {
    title: 'Sockets, Switches & Fittings',
    keywords: ['socket', 'switch', 'plate', 'fitting', 'lamp', 'bulb', 'led', 'box', 'dimmer'],
  },
  {
    title: 'Pumps, Panels & Power',
    keywords: ['pump', 'panel', 'starter', 'inverter', 'generator', 'ups', 'stabilizer', 'battery'],
  },
]

export const BIGDROPS_CATALOG_POLICY = [
  'Catalog Policy:',
  '- Normalize casing and obvious spelling errors.',
  '- Preserve useful search wording as aliases.',
  '- Do not over-split items based on wording that does not affect pricing in this business.',
  '- Cable color usually does not affect price unless explicitly stated otherwise.',
  '- Nigerian socket descriptions often include "with switch"; do not treat "with switch" alone as a separate item.',
  '- Size, capacity, amp rating, HP, VA, model number, and product type usually affect price and should not be merged unless clearly equivalent or user confirms.',
].join('\n')

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

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return safeArray(value)
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return null
  const collected = value.map((entry) => readString(entry))
  if (collected.some((entry) => !entry)) return null
  return uniqueSorted(collected)
}

function readPositiveInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

function sortCatalogItems(items: DuplicateCandidateGroup['members'] | Array<{ item_id: string; name: string }>) {
  return [...items].sort((left, right) => {
    const nameOrder = left.name.localeCompare(right.name)
    if (nameOrder !== 0) return nameOrder
    return left.item_id.localeCompare(right.item_id)
  })
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

function toCatalogCleanupExportItem(params: {
  item: {
    item_id: string
    name: string
    standard_price?: number | null
    last_sold_price?: number | null
    usage_count?: number | null
    appears_in_invoice?: boolean
    appears_in_quotation?: boolean
  }
  aliases: string[]
  duplicateGroupId: string | null
}): CatalogCleanupExportItem {
  return {
    item_id: params.item.item_id,
    name: params.item.name,
    standard_price: params.item.standard_price ?? null,
    last_sold_price: params.item.last_sold_price ?? null,
    usage_count: Number(params.item.usage_count || 0),
    aliases: uniqueSorted(
      params.aliases.filter((alias) => normalizeText(alias) && normalizeText(alias) !== normalizeText(params.item.name)),
    ),
    appears_in_invoice: params.item.appears_in_invoice === true,
    appears_in_quotation: params.item.appears_in_quotation === true,
    cleanup_flags: params.duplicateGroupId ? ['duplicate_candidate'] : [],
    duplicate_group_id: params.duplicateGroupId,
  }
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

type CatalogCleanupUnit = {
  key: string
  items: CatalogCleanupExportItem[]
  isAtomicGroup: boolean
}

function createCatalogCleanupUnits(params: {
  items: Array<{
    item_id: string
    name: string
    standard_price?: number | null
    last_sold_price?: number | null
    usage_count?: number | null
    appears_in_invoice?: boolean
    appears_in_quotation?: boolean
    is_active?: boolean
  }>
  aliases: ItemAlias[]
  duplicateGroups?: DuplicateCandidateGroup[]
}) {
  const aliasMap = buildAliasMap(params.aliases)
  const activeItems = sortCatalogItems(params.items.filter((item) => item.is_active !== false))
  const duplicateGroups = params.duplicateGroups || []
  const itemToGroup = new Map<string, DuplicateCandidateGroup>()

  duplicateGroups.forEach((group) => {
    group.members.forEach((member) => itemToGroup.set(member.item_id, group))
  })

  const seenUnits = new Set<string>()
  const units: CatalogCleanupUnit[] = []

  activeItems.forEach((item) => {
    const group = itemToGroup.get(item.item_id)
    if (!group) {
      units.push({
        key: item.item_id,
        items: [
          toCatalogCleanupExportItem({
            item,
            aliases: aliasMap.get(item.item_id) || [],
            duplicateGroupId: null,
          }),
        ],
        isAtomicGroup: false,
      })
      return
    }

    if (seenUnits.has(group.group_id)) return
    seenUnits.add(group.group_id)

    const groupedItems = sortCatalogItems(
      group.members
        .map((member) => activeItems.find((entry) => entry.item_id === member.item_id))
        .filter(
          (
            entry,
          ): entry is {
            item_id: string
            name: string
            standard_price?: number | null
            last_sold_price?: number | null
            usage_count?: number | null
            appears_in_invoice?: boolean
            appears_in_quotation?: boolean
            is_active?: boolean
          } => Boolean(entry),
        ),
    )

    units.push({
      key: group.group_id,
      items: groupedItems.map((groupedItem) =>
        toCatalogCleanupExportItem({
          item: groupedItem,
          aliases: aliasMap.get(groupedItem.item_id) || [],
          duplicateGroupId: group.group_id,
        }),
      ),
      isAtomicGroup: true,
    })
  })

  return units
}

export function createCatalogCleanupSession(params: {
  items: Array<{
    item_id: string
    name: string
    standard_price?: number | null
    last_sold_price?: number | null
    usage_count?: number | null
    appears_in_invoice?: boolean
    appears_in_quotation?: boolean
    is_active?: boolean
  }>
  aliases: ItemAlias[]
  batchSize: number
  duplicateGroups?: DuplicateCandidateGroup[]
  sessionId?: string
  generatedAt?: string
}): CatalogCleanupSession {
  const batchSize = Math.max(1, Math.floor(params.batchSize))
  const units = createCatalogCleanupUnits({
    items: params.items,
    aliases: params.aliases,
    duplicateGroups: params.duplicateGroups,
  })
  const consumed = new Set<number>()
  const batches: CatalogCleanupBatch[] = []

  for (let index = 0; index < units.length; index += 1) {
    if (consumed.has(index)) continue

    const batchUnits: CatalogCleanupUnit[] = []
    let itemCount = 0

    const consumeUnit = (unitIndex: number) => {
      consumed.add(unitIndex)
      batchUnits.push(units[unitIndex])
      itemCount += units[unitIndex].items.length
    }

    consumeUnit(index)

    for (let nextIndex = index + 1; nextIndex < units.length; nextIndex += 1) {
      if (consumed.has(nextIndex)) continue
      const nextUnit = units[nextIndex]
      const nextSize = nextUnit.items.length
      if (itemCount + nextSize <= batchSize) {
        consumeUnit(nextIndex)
        continue
      }

      if (!nextUnit.isAtomicGroup) continue

      let filledGap = false
      for (let scanIndex = nextIndex + 1; scanIndex < units.length; scanIndex += 1) {
        if (consumed.has(scanIndex)) continue
        const candidate = units[scanIndex]
        if (candidate.isAtomicGroup) continue
        if (itemCount + candidate.items.length > batchSize) continue
        consumeUnit(scanIndex)
        filledGap = true
      }

      if (!filledGap || itemCount >= batchSize) break
    }

    const batchItems = batchUnits.flatMap((unit) => unit.items)
    batches.push({
      batch_id: `batch-${batches.length + 1}`,
      title: `Batch ${batches.length + 1}`,
      item_count: batchItems.length,
      items: batchItems,
      status: 'not_started',
    })
  }

  return {
    session_id: params.sessionId || `catalog-cleanup-${params.generatedAt || new Date().toISOString()}`,
    batch_size: batchSize,
    batch_count: batches.length,
    batches,
  }
}

export function buildCatalogCleanupBatchExportPayload(params: {
  session: CatalogCleanupSession
  batch: CatalogCleanupBatch
  batchIndex: number
  generatedAt?: string
}): CatalogCleanupBatchExportPayload {
  return {
    export_type: 'catalog_cleanup_batch',
    schema_version: FLAGGED_CLEANUP_SCHEMA_VERSION,
    session: {
      session_id: params.session.session_id,
      batch_size: params.session.batch_size,
      batch_index: params.batchIndex + 1,
      batch_count: params.session.batch_count,
    },
    batch_id: params.batch.batch_id,
    generated_at: params.generatedAt || new Date().toISOString(),
    scope: {
      mode: 'full_catalog_batch',
      item_count: params.batch.item_count,
    },
    items: params.batch.items,
  }
}

export function buildCatalogCleanupPrompt(payload?: CatalogCleanupBatchExportPayload | null) {
  const metadata = payload
    ? `Session: ${payload.session.session_id}. Batch ${payload.session.batch_index} of ${payload.session.batch_count}. Batch ID: ${payload.batch_id}. Items: ${payload.scope.item_count}.`
    : 'No export data was provided yet.'

  return [
    '# Small Drops Assistant Identity',
    'Review identity and execution rules: https://github.com/Bigdrops/small-drops-assistant/blob/main/skills/bigdrops-identity/SKILL.md',
    '',
    '# Catalog Cleanup Task',
    '## Identity',
    'You are **Small Drops Assistant**.',
    '',
    'You are a highly experienced business and bookkeeping assistant with deep expertise in:',
    '- invoices and quotations',
    '- item catalog management',
    '- price history analysis',
    '- document structuring and cleanup',
    '- financial clarity and correctness',
    '',
    'You operate with the discipline of a master-level accountant and system auditor. You have the accumulated discipline of decades of bookkeeping and audit experience.',
    '',
    'You are:',
    '- precise',
    '- structured',
    '- cautious',
    '- consistent',
    '',
    'You prioritise correctness over creativity.',
    'You do not behave like a casual chatbot.',
    'You behave like a trusted business operator.',
    '',
    '## Review Mode Instructions',
    'You are reviewing a batch of catalog items for standardization and cleanup.',
    '- If no export data is provided, ask the user to paste the export JSON. NEVER return empty JSON.',
    '- Provide a concise summary of proposed changes for review FIRST.',
    '- Explain safe merges, ambiguous items, or items you suggest ignoring.',
    '- Only produce the final JSON when the user explicitly asks for "Final JSON" or confirms your plan.',
    '- When asked for Final JSON, return ONLY the strict JSON object. No markdown, no commentary, no prose.',
    '- Highlight any ambiguity in item names or price history.',
    '- Do NOT make irreversible decisions (merges) unless the similarity is clear and defensible.',
    '- Focus on fixing spelling, casing, and normalization.',
    '',
    '## Core Rules',
    '1. Never invent data that is not present in the input.',
    '2. Never guess missing values such as: prices, quantities, identifiers.',
    '3. Prefer leaving fields empty over fabricating information.',
    '4. If ambiguity exists, surface it instead of silently resolving it.',
    '5. Only merge when similarity is clear and defensible.',
    '',
    BIGDROPS_CATALOG_POLICY,
    '',
    '## Metadata',
    metadata,
    '',
    '## Output Format',
    'When returning final JSON, use exactly this shape:',
    JSON.stringify(
      {
        response_type: 'catalog_cleanup_batch_result',
        schema_version: 1,
        source_export_type: 'catalog_cleanup_batch',
        session_id: payload?.session.session_id || 'same-as-export',
        batch_id: payload?.batch_id || 'same-as-export',
        merge_suggestions: [
          {
            canonical_name: 'Canonical item name',
            winner_item_id: 'existing-item-id',
            merged_item_ids: ['existing-item-id'],
          },
        ],
        rename_suggestions: [
          {
            item_id: 'existing-item-id',
            suggested_name: 'Improved canonical spelling',
          },
        ],
        alias_suggestions: [
          {
            item_id: 'existing-item-id',
            suggested_aliases: ['Useful search alias'],
          },
        ],
        ignored_item_ids: ['existing-item-id'],
        review_required_item_ids: ['existing-item-id'],
      },
      null,
      2,
    ),
  ].join('\n')
}

function parseCatalogCleanupMergeSuggestions(
  value: unknown,
  itemMap: Map<string, CatalogCleanupExportItem>,
): { errors: string[]; preview: CatalogCleanupPreviewMergeSuggestion[]; parsed: CatalogCleanupMergeSuggestion[] } {
  if (!Array.isArray(value)) {
    return { errors: ['merge_suggestions must be an array.'], preview: [], parsed: [] }
  }

  const errors: string[] = []
  const preview: CatalogCleanupPreviewMergeSuggestion[] = []
  const parsed: CatalogCleanupMergeSuggestion[] = []

  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      errors.push(`merge_suggestions[${index}] must be an object.`)
      return
    }

    const canonicalName = readString(entry.canonical_name)
    const winnerItemId = readString(entry.winner_item_id)
    const mergedItemIds = readStringArray(entry.merged_item_ids)

    if (!canonicalName) errors.push(`merge_suggestions[${index}].canonical_name is required.`)
    if (!winnerItemId) errors.push(`merge_suggestions[${index}].winner_item_id is required.`)
    if (!mergedItemIds || mergedItemIds.length === 0) {
      errors.push(`merge_suggestions[${index}].merged_item_ids must contain at least one item id.`)
      return
    }

    const winner = itemMap.get(winnerItemId)
    if (!winner) {
      errors.push(`merge_suggestions[${index}] references item ids outside the current batch.`)
      return
    }

    const mergedItems = mergedItemIds.map((itemId) => itemMap.get(itemId))
    if (mergedItems.some((item) => !item)) {
      errors.push(`merge_suggestions[${index}] references item ids outside the current batch.`)
      return
    }
    if (mergedItemIds.includes(winnerItemId)) {
      errors.push(`merge_suggestions[${index}] must not merge the winner into itself.`)
      return
    }

    preview.push({
      canonical_name: canonicalName,
      winner,
      merged_items: mergedItems.filter((item): item is CatalogCleanupExportItem => Boolean(item)),
    })
    parsed.push({
      canonical_name: canonicalName,
      winner_item_id: winnerItemId,
      merged_item_ids: mergedItemIds,
    })
  })

  return { errors, preview, parsed }
}

function parseCatalogCleanupRenameSuggestions(
  value: unknown,
  itemMap: Map<string, CatalogCleanupExportItem>,
): { errors: string[]; preview: CatalogCleanupPreviewRenameSuggestion[]; parsed: CatalogCleanupRenameSuggestion[] } {
  if (!Array.isArray(value)) {
    return { errors: ['rename_suggestions must be an array.'], preview: [], parsed: [] }
  }

  const errors: string[] = []
  const preview: CatalogCleanupPreviewRenameSuggestion[] = []
  const parsed: CatalogCleanupRenameSuggestion[] = []

  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      errors.push(`rename_suggestions[${index}] must be an object.`)
      return
    }

    const itemId = readString(entry.item_id)
    const suggestedName = readString(entry.suggested_name)
    const item = itemMap.get(itemId)

    if (!item || !suggestedName) {
      errors.push(`rename_suggestions[${index}] must reference an item inside the current batch and include suggested_name.`)
      return
    }

    preview.push({ item, suggested_name: suggestedName })
    parsed.push({ item_id: itemId, suggested_name: suggestedName })
  })

  return { errors, preview, parsed }
}

function parseCatalogCleanupAliasSuggestions(
  value: unknown,
  itemMap: Map<string, CatalogCleanupExportItem>,
): { errors: string[]; preview: CatalogCleanupPreviewAliasSuggestion[]; parsed: CatalogCleanupAliasSuggestion[] } {
  if (!Array.isArray(value)) {
    return { errors: ['alias_suggestions must be an array.'], preview: [], parsed: [] }
  }

  const errors: string[] = []
  const preview: CatalogCleanupPreviewAliasSuggestion[] = []
  const parsed: CatalogCleanupAliasSuggestion[] = []

  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      errors.push(`alias_suggestions[${index}] must be an object.`)
      return
    }

    const itemId = readString(entry.item_id)
    const suggestedAliases = readStringArray(entry.suggested_aliases)
    const item = itemMap.get(itemId)

    if (!item || !suggestedAliases) {
      errors.push(`alias_suggestions[${index}] must reference an item inside the current batch and include suggested_aliases.`)
      return
    }

    preview.push({ item, suggested_aliases: suggestedAliases })
    parsed.push({ item_id: itemId, suggested_aliases: suggestedAliases })
  })

  return { errors, preview, parsed }
}

function mapScopedItems(
  itemIds: string[],
  itemMap: Map<string, CatalogCleanupExportItem>,
  fieldName: 'ignored_item_ids' | 'review_required_item_ids',
) {
  const scopedItems: CatalogCleanupExportItem[] = []
  const errors: string[] = []

  itemIds.forEach((itemId) => {
    const item = itemMap.get(itemId)
    if (!item) {
      errors.push(`${fieldName} must reference only items inside the current batch.`)
      return
    }
    scopedItems.push(item)
  })

  return { scopedItems, errors }
}

export function validateCatalogCleanupBatchImport(
  input: string,
  exportPayload: CatalogCleanupBatchExportPayload,
): CatalogCleanupImportValidationResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: false, errors: [], preview: null, parsed: null }
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

  const topLevelErrors: string[] = []
  const responseType = readString(parsedJson.response_type)
  const sourceExportType = readString(parsedJson.source_export_type)
  const schemaVersion = parsedJson.schema_version
  const sessionId = readString(parsedJson.session_id)
  const batchId = readString(parsedJson.batch_id)

  if (responseType !== 'catalog_cleanup_batch_result') {
    topLevelErrors.push('response_type must be "catalog_cleanup_batch_result".')
  }
  if (sourceExportType !== 'catalog_cleanup_batch') {
    topLevelErrors.push('source_export_type must be "catalog_cleanup_batch".')
  }
  if (schemaVersion !== FLAGGED_CLEANUP_SCHEMA_VERSION) {
    topLevelErrors.push(`schema_version must be ${FLAGGED_CLEANUP_SCHEMA_VERSION}.`)
  }
  if (sessionId !== exportPayload.session.session_id) {
    topLevelErrors.push(
      `The AI result belongs to session "${sessionId || 'unknown'}", but the locked current session is "${exportPayload.session.session_id}".`,
    )
  }
  if (batchId !== exportPayload.batch_id) {
    topLevelErrors.push(
      `The AI result belongs to batch "${batchId || 'unknown'}", but you are currently reviewing batch "${exportPayload.batch_id}".`,
    )
  }

  if (topLevelErrors.length) {
    return { ok: false, errors: topLevelErrors, preview: null, parsed: null }
  }

  const itemMap = new Map(safeArray(exportPayload.items).map((item) => [item.item_id, item]))
  const mergeResult = parseCatalogCleanupMergeSuggestions(parsedJson.merge_suggestions, itemMap)
  const renameResult = parseCatalogCleanupRenameSuggestions(parsedJson.rename_suggestions, itemMap)
  const aliasResult = parseCatalogCleanupAliasSuggestions(parsedJson.alias_suggestions, itemMap)
  const ignoredItemIds = readStringArray(parsedJson.ignored_item_ids)
  const reviewRequiredItemIds = readStringArray(parsedJson.review_required_item_ids)
  const errors = [...mergeResult.errors, ...renameResult.errors, ...aliasResult.errors]

  if (!ignoredItemIds) errors.push('ignored_item_ids must be an array of strings.')
  if (!reviewRequiredItemIds) errors.push('review_required_item_ids must be an array of strings.')

  if (errors.length || !ignoredItemIds || !reviewRequiredItemIds) {
    return { ok: false, errors, preview: null, parsed: null }
  }

  const ignoredItems = mapScopedItems(ignoredItemIds, itemMap, 'ignored_item_ids')
  const reviewRequiredItems = mapScopedItems(reviewRequiredItemIds, itemMap, 'review_required_item_ids')
  const allErrors = [...errors, ...ignoredItems.errors, ...reviewRequiredItems.errors]

  if (allErrors.length) {
    return { ok: false, errors: allErrors, preview: null, parsed: null }
  }

  const parsed: CatalogCleanupBatchImportPayload = {
    response_type: 'catalog_cleanup_batch_result',
    schema_version: FLAGGED_CLEANUP_SCHEMA_VERSION,
    source_export_type: 'catalog_cleanup_batch',
    session_id: sessionId,
    batch_id: batchId,
    merge_suggestions: mergeResult.parsed,
    rename_suggestions: renameResult.parsed,
    alias_suggestions: aliasResult.parsed,
    ignored_item_ids: ignoredItemIds,
    review_required_item_ids: reviewRequiredItemIds,
  }

  return {
    ok: true,
    errors: [],
    preview: {
      merge_suggestions: mergeResult.preview,
      rename_suggestions: renameResult.preview,
      alias_suggestions: aliasResult.preview,
      ignored_items: ignoredItems.scopedItems,
      review_required_items: reviewRequiredItems.scopedItems,
    },
    parsed,
  }
}

export function createCleanupBatches(groups: FlaggedCleanupExportGroup[]): FlaggedCleanupBatch[] {
  const batches: FlaggedCleanupBatch[] = []
  const groupByCategory: Record<string, FlaggedCleanupExportGroup[]> = {
    'Miscellaneous / Low-confidence': [],
  }

  CATEGORIES.forEach((cat) => {
    groupByCategory[cat.title] = []
  })

  groups.forEach((group) => {
    const label = normalizeText(group.label)
    const category = CATEGORIES.find((cat) => cat.keywords.some((kw) => label.includes(kw)))
    if (category) {
      groupByCategory[category.title].push(group)
    } else {
      groupByCategory['Miscellaneous / Low-confidence'].push(group)
    }
  })

  let batchIndex = 1
  Object.entries(groupByCategory).forEach(([title, catGroups]) => {
    if (catGroups.length === 0) return

    // Chunk into 5-7
    for (let i = 0; i < catGroups.length; i += 7) {
      const chunk = catGroups.slice(i, i + 7)
      const itemCount = chunk.reduce((sum, g) => sum + g.items.length, 0)
      batches.push({
        batch_id: `batch-${batchIndex++}`,
        title: chunk.length < catGroups.length ? `${title} (Part ${Math.floor(i / 7) + 1})` : title,
        group_count: chunk.length,
        item_count: itemCount,
        groups: chunk,
        status: 'not_reviewed',
      })
    }
  })

  return batches
}

export function buildFlaggedCleanupBatchExportPayload(
  batch: FlaggedCleanupBatch,
  generatedAt?: string,
): FlaggedCleanupBatchExportPayload {
  return {
    export_type: 'flagged_cleanup_batch',
    schema_version: FLAGGED_CLEANUP_SCHEMA_VERSION,
    batch_id: batch.batch_id,
    batch_title: batch.title,
    generated_at: generatedAt || new Date().toISOString(),
    scope: {
      mode: 'flagged_batch',
      group_count: batch.group_count,
      item_count: batch.item_count,
    },
    groups: batch.groups,
  }
}

export function buildFlaggedCleanupPrompt(payload: FlaggedCleanupExportPayload | FlaggedCleanupBatchExportPayload) {
  const isBatch = payload.export_type === 'flagged_cleanup_batch'
  const title = isBatch ? (payload as FlaggedCleanupBatchExportPayload).batch_title : 'all flagged groups'

  return [
    '# Small Drops Assistant Identity',
    'Review identity and execution rules: https://github.com/Bigdrops/small-drops-assistant/blob/main/skills/bigdrops-identity/SKILL.md',
    '',
    '# Flagged Duplicate Review Task',
    'You are **Small Drops Assistant**.',
    '',
    'You are a highly experienced business and bookkeeping assistant with deep expertise in:',
    '- invoices and quotations',
    '- item catalog management',
    '- price history analysis',
    '- document structuring and cleanup',
    '- financial clarity and correctness',
    '',
    'You operate with the discipline of a master-level accountant and system auditor.',
    '',
    '## Review Mode Instructions',
    `You are reviewing a batch of duplicate item groups titled: "${title}".`,
    '- If no export data is provided, ask the user to paste the export JSON. NEVER return empty JSON.',
    '- Provide a concise summary of the proposed merges for review FIRST.',
    '- Explain safe merges, ambiguous items, or groups you suggest ignoring.',
    '- Only produce the final JSON when the user explicitly asks for "Final JSON" or confirms your plan.',
    '- When asked for Final JSON, return ONLY the strict JSON object. No markdown, no commentary, no prose.',
    '- Highlight any ambiguity in item names or pricing differences within the group.',
    '- Only propose merges when the similarity is clear and defensible.',
    '',
    '## Core Rules',
    '1. Never invent items, item ids, group ids, aliases, or groups.',
    '2. Only propose merges when the similarity is clear and defensible.',
    '3. If a group is ambiguous, leave it out of merge_groups and include its group_id in ignored_group_ids.',
    '4. Keep useful alternate wording in aliases_to_keep.',
    '5. winner_item_id must be one of the items already present in that exported group.',
    '6. merged_item_ids must come only from the same exported group and must not include the winner.',
    '',
    BIGDROPS_CATALOG_POLICY,
    '',
    '## Metadata',
    `Input export metadata: export_type=${payload.export_type}, schema_version=${payload.schema_version}, groups=${payload.scope.group_count}, items=${payload.scope.item_count}.`,
    isBatch ? `Batch ID: ${(payload as FlaggedCleanupBatchExportPayload).batch_id}` : '',
    '',
    '## Output Format',
    'When asked for JSON, return exactly this shape:',
    JSON.stringify(
      {
        response_type: 'flagged_cleanup_result',
        schema_version: 1,
        source_export_type: payload.export_type,
        batch_id: isBatch ? (payload as FlaggedCleanupBatchExportPayload).batch_id : undefined,
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
  ]
    .filter(Boolean)
    .join('\n')
}

export function validateFlaggedCleanupImport(
  input: string,
  exportPayload: FlaggedCleanupExportPayload | FlaggedCleanupBatchExportPayload,
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
    // Check if it looks like the AI review summary instead of JSON
    if (trimmed.includes('#') || trimmed.includes('Summary') || trimmed.includes('Propose')) {
      return {
        ok: false,
        errors: ['Paste the final JSON result, not the review text.'],
        preview: null,
        parsed: null,
      }
    }
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
  const importBatchId = readString(parsedJson.batch_id)

  const isBatchExport = exportPayload.export_type === 'flagged_cleanup_batch'
  const expectedBatchId = isBatchExport ? (exportPayload as FlaggedCleanupBatchExportPayload).batch_id : ''

  const topLevelErrors: string[] = []
  if (responseType !== 'flagged_cleanup_result') {
    topLevelErrors.push('response_type must be "flagged_cleanup_result".')
  }
  if (schemaVersion !== FLAGGED_CLEANUP_SCHEMA_VERSION) {
    topLevelErrors.push(`schema_version must be ${FLAGGED_CLEANUP_SCHEMA_VERSION}.`)
  }
  if (sourceExportType !== exportPayload.export_type) {
    topLevelErrors.push(`The result identifies as "${sourceExportType || 'unknown'}", but you are reviewing "${exportPayload.export_type}".`)
  }
  if (isBatchExport && importBatchId !== expectedBatchId) {
    topLevelErrors.push(`The AI result belongs to batch "${importBatchId || 'unknown'}", but you are currently reviewing batch "${expectedBatchId}".`)
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

  const exportGroups = new Map(safeArray(exportPayload.groups).map((group) => [group.group_id, group]))
  const ignoredGroups = ignoredGroupIds
    .map((groupId) => exportGroups.get(groupId))
    .filter((group): group is FlaggedCleanupExportGroup => Boolean(group))
  const unknownIgnoredGroupIds = ignoredGroupIds.filter((groupId) => !exportGroups.has(groupId))

  const validPreviewGroups: CleanupPreviewGroup[] = []
  const rejectedGroups: CleanupPreviewRejectedGroup[] = []

  ;(mergeGroupsRaw as any[]).forEach((entry, index) => {
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

    if (!groupId || groupId.startsWith('row-')) groupErrors.push('group_id is missing or invalid.')
    if (!canonicalName) groupErrors.push('canonical_name is required.')
    if (!winnerItemId) groupErrors.push('winner_item_id is required.')
    if (!mergedItemIds || mergedItemIds.length === 0) groupErrors.push('merged_item_ids must contain at least one item id.')
    if (!aliasesToKeep) groupErrors.push('aliases_to_keep must be an array of strings.')
    if (!aliasesToRetire) groupErrors.push('aliases_to_retire must be an array of strings.')

    if (!groupId || groupErrors.length) {
      // Skip deep validation if basics are missing
    } else if (exportGroup) {
      const groupItems = new Map(exportGroup.items.map((item) => [item.item_id, item]))
      const winner = groupItems.get(winnerItemId)

      if (!winner) {
        groupErrors.push('winner_item_id must reference an item inside the same exported group.')
      }

      const outsideGroupIds = mergedItemIds?.filter((itemId) => !groupItems.has(itemId)) || []
      if (outsideGroupIds.length) {
        groupErrors.push('merged_item_ids must all reference items inside the same exported group.')
      }
      if (winnerItemId && mergedItemIds?.includes(winnerItemId)) {
        groupErrors.push('merged_item_ids must not include the winner_item_id.')
      }

      if (!groupErrors.length && winner) {
        validPreviewGroups.push({
          group_id: groupId,
          export_label: exportGroup.label,
          canonical_name: canonicalName,
          winner_item_id: winnerItemId,
          merged_item_ids: asArray(mergedItemIds),
          winner,
          merged_items: asArray(mergedItemIds)
            .map((itemId) => groupItems.get(itemId))
            .filter((item): item is FlaggedCleanupExportItem => Boolean(item)),
          aliases_to_keep: asArray(aliasesToKeep),
          aliases_to_retire: asArray(aliasesToRetire),
        })
        return
      }
    } else if (!groupId.startsWith('row-')) {
      groupErrors.push('group_id does not match any currently exported flagged group.')
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
      merged_item_ids: asArray(group.merged_items).map((item) => item.item_id),
      aliases_to_keep: asArray(group.aliases_to_keep),
      aliases_to_retire: asArray(group.aliases_to_retire),
    })),
    ignored_group_ids: ignoredGroupIds || [],
  }

  const rejectedCount = rejectedGroups.length + unknownIgnoredGroupIds.length
  const ok = topLevelErrors.length === 0 && rejectedCount === 0
  const errors = ok ? [] : [`The result contains ${rejectedCount} invalid or unknown proposal(s). Review the "Rejected proposals" section below.`]

  return {
    ok,
    errors,
    preview: {
      merge_groups: validPreviewGroups,
      ignored_groups: ignoredGroups,
      rejected_groups: [
        ...rejectedGroups,
        ...unknownIgnoredGroupIds.map((groupId) => ({
          group_id: groupId,
          reason: 'This group_id is not present in the current duplicate review scope.',
        })),
      ],
    },
    parsed,
  }
}

export function isCleanupProposalStale(
  proposal: CleanupApplyProposal,
  exportPayload: FlaggedCleanupExportPayload | FlaggedCleanupBatchExportPayload,
) {
  const exportGroup = exportPayload.groups.find((group) => group.group_id === proposal.group_id)
  if (!exportGroup) {
    return {
      stale: true,
      reason: 'This flagged group is no longer present in the current duplicate review scope.',
    }
  }

  const groupItemIds = new Set(safeArray(exportGroup.items).map((item) => item.item_id))
  if (!groupItemIds.has(proposal.winner_item_id)) {
    return {
      stale: true,
      reason: 'The proposed primary item is no longer available in this flagged group.',
    }
  }

  const outsideIds = proposal.merged_item_ids.filter((itemId) => !groupItemIds.has(itemId))
  if (outsideIds.length > 0) {
    return {
      stale: true,
      reason: 'One or more proposed merge items are no longer available in this flagged group.',
    }
  }

  return { stale: false, reason: '' }
}

export function createCleanupApplyProposal(group: CleanupPreviewGroup): CleanupApplyProposal {
  const mergedItemIds = asArray(group.merged_item_ids).length > 0 
    ? asArray(group.merged_item_ids)
    : safeArray(group.merged_items).map(item => item.item_id)

  if (!group.group_id || !group.winner_item_id || mergedItemIds.length === 0) {
    throw new Error(`Invalid cleanup proposal for group ${group.group_id || 'unknown'}: missing required IDs or merge items.`)
  }

  return {
    group_id: group.group_id,
    export_label: group.export_label,
    canonical_name: group.canonical_name,
    winner_item_id: group.winner_item_id,
    merged_item_ids: mergedItemIds,
    aliases_to_keep: asArray(group.aliases_to_keep),
    aliases_to_retire: asArray(group.aliases_to_retire),
  }
}

export function summarizeCleanupApplyResults(results: CleanupApplyResult[]) {
  return {
    applied: results.filter((result) => result.status === 'applied'),
    stale: results.filter((result) => result.status === 'stale'),
    failed: results.filter((result) => result.status === 'failed'),
  }
}
