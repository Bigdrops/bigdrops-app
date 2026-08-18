import { buildFlaggedCleanupExportPayload } from '../domain/itemCleanupExchange'
import { detectDuplicateGroups } from '../domain/duplicateDetection'
import { findExactItemSuggestionMatch } from '../domain/invoiceSuggestionSelection'
import { normalizeSuggestionQuery, rankItemSuggestions } from '../domain/suggestionRanking'
import { getItemAliases, getItemHistoryDetail, getItemPriceContext, getItemSuggestions, getItemSummaryList, mergeItems } from '../repositories'
import type { TenantClient } from '@/lib/tenantClient'
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
  clientId: string | null | undefined,
  tenantClient: TenantClient,
): Promise<ItemSuggestion[]> {
  const normalizedSearch = normalizeSuggestionQuery(searchText)
  if (!normalizedSearch) return []
  return rankItemSuggestions(await getItemSuggestions(normalizedSearch, resultLimit, clientId, tenantClient))
}

export async function resolveExactItemMatch(
  description: string,
  clientId: string | null | undefined,
  tenantClient: TenantClient,
): Promise<ItemSuggestion | null> {
  const normalizedDescription = normalizeSuggestionQuery(description)
  if (normalizedDescription.length < 2) return null

  const suggestions = await loadSuggestions(normalizedDescription, 10, clientId, tenantClient)
  return findExactItemSuggestionMatch(normalizedDescription, suggestions)
}

export async function loadItemPriceContext(itemId: string, clientId: string | null | undefined, tenantClient: TenantClient): Promise<ItemPriceContext | null> {
  if (!String(itemId || '').trim()) return null
  return getItemPriceContext(itemId, clientId, tenantClient)
}

export async function loadSummaryList(limit = 100, options: { includeHeavyFallbacks?: boolean } = {}, tenantClient: TenantClient): Promise<ItemCatalogItem[]> {
  return getItemSummaryList(limit, options, tenantClient)
}

export async function loadItemHistoryDetail(itemId: string, limit = 50, options: { includeHeavyFallbacks?: boolean } = {}, tenantClient: TenantClient): Promise<ItemHistoryRow[]> {
  if (!itemId) return []
  return getItemHistoryDetail(itemId, limit, options, tenantClient)
}

export async function loadItemAliases(itemIds: string[], tenantClient: TenantClient): Promise<ItemAlias[]> {
  return getItemAliases(itemIds, tenantClient)
}

export async function mergeCatalogItems(request: ItemLibraryMergeRequest, tenantClient: TenantClient): Promise<ItemLibraryMergeResult> {
  return mergeItems(request, tenantClient)
}

export async function loadFlaggedCleanupExport(limit = 200, tenantClient: TenantClient): Promise<FlaggedCleanupExportPayload> {
  const summaryItems = await getItemSummaryList(limit, {}, tenantClient)
  const duplicateGroups = detectDuplicateGroups(summaryItems)
  const duplicateItemIds = duplicateGroups.flatMap((group) => group.members.map((member) => member.item_id))
  const aliases = duplicateItemIds.length ? await getItemAliases(duplicateItemIds, tenantClient) : []
  return buildFlaggedCleanupExportPayload({ duplicateGroups, aliases })
}
