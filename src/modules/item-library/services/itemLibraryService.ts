import { buildFlaggedCleanupExportPayload } from '../domain/itemCleanupExchange'
import { detectDuplicateGroups } from '../domain/duplicateDetection'
import { findExactItemSuggestionMatch } from '../domain/invoiceSuggestionSelection'
import { normalizeSuggestionQuery, rankItemSuggestions } from '../domain/suggestionRanking'
import {
  createItemFromHistoricalReviewCase,
  getActiveReviewedSeparatePairs,
  getExactItemSuggestionMatch,
  getHistoricalReviewCases,
  getItemAliases,
  getItemHistoryDetail,
  getItemPriceContext,
  getItemSuggestions,
  getItemSummaryList,
  keepCatalogItemsSeparate,
  keepHistoricalReviewCandidateSeparate,
  linkHistoricalReviewCaseToItem,
  mergeItems,
} from '../repositories'
import type { TenantClient } from '@/lib/tenantClient'
import type {
  FlaggedCleanupExportPayload,
  CreateHistoricalReviewItemRequest,
  HistoricalReviewResult,
  HistoricalReviewMutationResult,
  ItemAlias,
  ItemCatalogItem,
  ItemHistoryRow,
  ItemPriceContext,
  ItemLibraryMergeRequest,
  ItemLibraryMergeResult,
  ItemReviewedSeparatePair,
  ItemSuggestion,
  KeepCatalogItemsSeparateRequest,
  KeepHistoricalReviewCandidateSeparateRequest,
  LinkHistoricalReviewCaseRequest,
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

  const exactMatch = await getExactItemSuggestionMatch(normalizedDescription, tenantClient)
  if (exactMatch) return exactMatch

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

export async function loadHistoricalReviewCases(tenantClient: TenantClient): Promise<HistoricalReviewResult> {
  return getHistoricalReviewCases(tenantClient)
}

export async function loadActiveReviewedSeparatePairs(
  itemIds: string[],
  tenantClient: TenantClient,
): Promise<ItemReviewedSeparatePair[]> {
  return getActiveReviewedSeparatePairs(itemIds, tenantClient)
}

export async function linkHistoricalReviewCase(
  request: LinkHistoricalReviewCaseRequest,
  tenantClient: TenantClient,
): Promise<HistoricalReviewMutationResult> {
  return linkHistoricalReviewCaseToItem(request, tenantClient)
}

export async function createHistoricalReviewItem(
  request: CreateHistoricalReviewItemRequest,
  tenantClient: TenantClient,
): Promise<HistoricalReviewMutationResult> {
  return createItemFromHistoricalReviewCase(request, tenantClient)
}

export async function keepHistoricalReviewCandidateSeparateDecision(
  request: KeepHistoricalReviewCandidateSeparateRequest,
  tenantClient: TenantClient,
): Promise<HistoricalReviewMutationResult> {
  return keepHistoricalReviewCandidateSeparate(request, tenantClient)
}

export async function keepCatalogItemsSeparateDecision(
  request: KeepCatalogItemsSeparateRequest,
  tenantClient: TenantClient,
): Promise<HistoricalReviewMutationResult> {
  return keepCatalogItemsSeparate(request, tenantClient)
}

export async function mergeCatalogItems(request: ItemLibraryMergeRequest, tenantClient: TenantClient): Promise<ItemLibraryMergeResult> {
  return mergeItems(request, tenantClient)
}

function itemPairKey(leftItemId: string, rightItemId: string) {
  return [leftItemId, rightItemId]
    .map((value) => String(value || '').trim())
    .sort((left, right) => left.localeCompare(right))
    .join('::')
}

function hasReviewedSeparatePair(
  itemIds: string[],
  reviewedSeparatePairs: ItemReviewedSeparatePair[],
) {
  const pairSet = new Set(
    reviewedSeparatePairs
      .filter((pair) => pair.status === 'active')
      .map((pair) => itemPairKey(pair.item_a_id, pair.item_b_id)),
  )

  for (let leftIndex = 0; leftIndex < itemIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < itemIds.length; rightIndex += 1) {
      if (pairSet.has(itemPairKey(itemIds[leftIndex], itemIds[rightIndex]))) return true
    }
  }

  return false
}

export async function loadFlaggedCleanupExport(
  limit = 200,
  tenantClient: TenantClient,
  reviewedSeparatePairs: ItemReviewedSeparatePair[] = [],
): Promise<FlaggedCleanupExportPayload> {
  const summaryItems = await getItemSummaryList(limit, {}, tenantClient)
  const duplicateGroups = detectDuplicateGroups(summaryItems).filter(
    (group) => !hasReviewedSeparatePair(group.members.map((member) => member.item_id), reviewedSeparatePairs),
  )
  const duplicateItemIds = duplicateGroups.flatMap((group) => group.members.map((member) => member.item_id))
  const aliases = duplicateItemIds.length ? await getItemAliases(duplicateItemIds, tenantClient) : []
  return buildFlaggedCleanupExportPayload({ duplicateGroups, aliases })
}
