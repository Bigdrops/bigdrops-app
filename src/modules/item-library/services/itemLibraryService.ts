import { normalizeSuggestionQuery, rankItemSuggestions } from '../domain/suggestionRanking'
import { getItemAliases, getItemHistoryDetail, getItemSuggestions, getItemSummaryList, mergeItems } from '../repositories'
import type { ItemAlias, ItemCatalogItem, ItemHistoryRow, ItemLibraryMergeRequest, ItemLibraryMergeResult, ItemSuggestion } from '../types'

export async function loadSuggestions(
  searchText: string,
  resultLimit = 10,
  clientId?: string | null,
): Promise<ItemSuggestion[]> {
  const normalizedSearch = normalizeSuggestionQuery(searchText)
  if (!normalizedSearch) return []
  return rankItemSuggestions(await getItemSuggestions(normalizedSearch, resultLimit, clientId))
}

export async function loadSummaryList(limit = 100): Promise<ItemCatalogItem[]> {
  return getItemSummaryList(limit)
}

export async function loadItemHistoryDetail(itemId: string, limit = 50): Promise<ItemHistoryRow[]> {
  if (!itemId) return []
  return getItemHistoryDetail(itemId, limit)
}

export async function loadItemAliases(itemIds: string[]): Promise<ItemAlias[]> {
  return getItemAliases(itemIds)
}

export async function mergeCatalogItems(request: ItemLibraryMergeRequest): Promise<ItemLibraryMergeResult> {
  return mergeItems(request)
}
