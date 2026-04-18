import { normalizeSuggestionQuery, rankItemSuggestions } from '../domain/suggestionRanking'
import { getItemHistoryDetail, getItemSuggestions, getItemSummaryList } from '../repositories'
import type { ItemCatalogItem, ItemHistoryRow, ItemSuggestion } from '../types'

export async function loadSuggestions(searchText: string, resultLimit = 10): Promise<ItemSuggestion[]> {
  const normalizedSearch = normalizeSuggestionQuery(searchText)
  if (!normalizedSearch) return []
  return rankItemSuggestions(await getItemSuggestions(normalizedSearch, resultLimit))
}

export async function loadSummaryList(limit = 100): Promise<ItemCatalogItem[]> {
  return getItemSummaryList(limit)
}

export async function loadItemHistoryDetail(itemId: string, limit = 50): Promise<ItemHistoryRow[]> {
  if (!itemId) return []
  return getItemHistoryDetail(itemId, limit)
}
