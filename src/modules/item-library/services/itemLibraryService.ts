import { buildFlaggedCleanupExportPayload } from '../domain/itemCleanupExchange'
import { detectDuplicateGroups } from '../domain/duplicateDetection'
import { findExactItemSuggestionMatch } from '../domain/invoiceSuggestionSelection'
import { normalizeSuggestionQuery, rankItemSuggestions } from '../domain/suggestionRanking'
import { getItemAliases, getItemHistoryDetail, getItemPriceContext, getItemSuggestions, getItemSummaryList, mergeItems } from '../repositories'
import type {
  FlaggedCleanupExportPayload,
  ItemAlias,
  ItemCatalogItem,
  ItemHistoryRow,
  ItemPriceContext,
  ItemLibraryMergeRequest,
  ItemLibraryMergeResult,
  ItemSuggestion,
} from '../types'

export async function loadSuggestions(
  searchText: string,
  resultLimit = 10,
  clientId?: string | null,
): Promise<ItemSuggestion[]> {
  const normalizedSearch = normalizeSuggestionQuery(searchText)
  if (!normalizedSearch) return []
  return rankItemSuggestions(await getItemSuggestions(normalizedSearch, resultLimit, clientId))
}

export async function resolveExactItemMatch(
  description: string,
  clientId?: string | null,
): Promise<ItemSuggestion | null> {
  const normalizedDescription = normalizeSuggestionQuery(description)
  if (normalizedDescription.length < 2) return null

  const suggestions = await loadSuggestions(normalizedDescription, 10, clientId)
  return findExactItemSuggestionMatch(normalizedDescription, suggestions)
}

export async function loadItemPriceContext(itemId: string, clientId?: string | null): Promise<ItemPriceContext | null> {
  if (!String(itemId || '').trim()) return null
  return getItemPriceContext(itemId, clientId)
}

export async function loadSummaryList(limit = 100, options: { includeHeavyFallbacks?: boolean } = {}): Promise<ItemCatalogItem[]> {
  return getItemSummaryList(limit, options)
}

export async function loadItemHistoryDetail(itemId: string, limit = 50, options: { includeHeavyFallbacks?: boolean } = {}): Promise<ItemHistoryRow[]> {
  if (!itemId) return []
  return getItemHistoryDetail(itemId, limit, options)
}

export async function loadItemAliases(itemIds: string[]): Promise<ItemAlias[]> {
  return getItemAliases(itemIds)
}

export async function mergeCatalogItems(request: ItemLibraryMergeRequest): Promise<ItemLibraryMergeResult> {
  return mergeItems(request)
}

export async function loadFlaggedCleanupExport(limit = 200): Promise<FlaggedCleanupExportPayload> {
  const summaryItems = await getItemSummaryList(limit)
  const duplicateGroups = detectDuplicateGroups(summaryItems)
  const duplicateItemIds = duplicateGroups.flatMap((group) => group.members.map((member) => member.item_id))
  const aliases = duplicateItemIds.length ? await getItemAliases(duplicateItemIds) : []
  return buildFlaggedCleanupExportPayload({ duplicateGroups, aliases })
}
