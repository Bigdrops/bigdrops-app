import type { TenantClient } from '@/lib/tenantClient'
import { isImportedDescriptionItemId } from '../domain/cleanupApply'
import type {
  ItemAlias,
  ItemCatalogItem,
  ItemHistoryRow,
  ItemPriceContext,
  ItemLibraryMergeRequest,
  ItemLibraryMergeResult,
  ItemMergeLogRow,
  ItemSuggestion,
} from '../types'
import {
  buildFallbackHistoryRows,
  buildFallbackSummaryItems,
} from './importedItemFallback'

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeSuggestionRow(row: Record<string, unknown>): ItemSuggestion {
  const isAlias = row.is_alias === true || row.match_source === 'alias'
  return {
    item_id: String(row.item_id || row.id || ''),
    name: String(
      row.display_name ||
        row.name ||
        row.item_name ||
        row.master_name ||
        row.description ||
        row.item_description ||
        row.alias_text ||
        ''
    ),
    matched_text: String(
      row.matched_text ||
        row.alias_text ||
        row.name ||
        row.item_name ||
        row.description ||
        row.item_description ||
        ''
    ),
    match_source: isAlias ? 'alias' : (row.match_source as any) || 'catalog',
    standard_price: toNumber(row.standard_price),
    last_sold_price: toNumber(row.last_sold_price),
    usage_count: toNumber(row.usage_count),
    last_used_at: row.last_used_at ? String(row.last_used_at) : null,
    last_source_type: row.last_source_type ? String(row.last_source_type) : null,
    last_price_for_client: toNumber(row.last_price_for_client),
    last_price_for_client_used_at: row.last_price_for_client_used_at ? String(row.last_price_for_client_used_at) : null,
    last_price_for_client_document_number: row.last_price_for_client_document_number
      ? String(row.last_price_for_client_document_number)
      : null,
    last_price_global: toNumber(row.last_price_global ?? row.last_sold_price),
    last_price_global_used_at: row.last_price_global_used_at ? String(row.last_price_global_used_at) : null,
    last_price_global_document_number: row.last_price_global_document_number
      ? String(row.last_price_global_document_number)
      : null,
    last_source_document_number: row.last_source_document_number ? String(row.last_source_document_number) : null,
    is_active: typeof row.is_active === 'boolean' ? row.is_active : true,
  }
}

type SuggestionHistoryRow = {
  item_id: string
  unit_price: number | null
  used_at: string | null
  doc_number: string | null
  client_id: string | null
}

async function loadSuggestionHistoryRows(itemIds: string[], client: TenantClient): Promise<SuggestionHistoryRow[]> {
  const stableItemIds = [...new Set(itemIds.filter(Boolean))]
  if (stableItemIds.length === 0) return []

  const [invoiceHistory, quotationHistory] = await Promise.all([
    client
      .from('invoice_items')
      .select('item_id, unit_price, updated_at, invoices(invoice_number, client_id, issue_date)')
      .in('item_id', stableItemIds)
      .order('updated_at', { ascending: false }),
    client
      .from('quotation_items')
      .select('item_id, unit_price, updated_at, quotations(quotation_number, client_id, issue_date)')
      .in('item_id', stableItemIds)
      .order('updated_at', { ascending: false }),
  ])

  const historyRows: SuggestionHistoryRow[] = []

  if (invoiceHistory.data) {
    invoiceHistory.data.forEach((row: any) => {
      historyRows.push({
        item_id: String(row.item_id || ''),
        unit_price: toNumber(row.unit_price),
        used_at: row.invoices?.issue_date || row.updated_at || null,
        doc_number: row.invoices?.invoice_number ? String(row.invoices.invoice_number) : null,
        client_id: row.invoices?.client_id ? String(row.invoices.client_id) : null,
      })
    })
  }

  if (quotationHistory.data) {
    quotationHistory.data.forEach((row: any) => {
      historyRows.push({
        item_id: String(row.item_id || ''),
        unit_price: toNumber(row.unit_price),
        used_at: row.quotations?.issue_date || row.updated_at || null,
        doc_number: row.quotations?.quotation_number ? String(row.quotations.quotation_number) : null,
        client_id: row.quotations?.client_id ? String(row.quotations.client_id) : null,
      })
    })
  }

  historyRows.sort((left, right) => (new Date(right.used_at || 0).getTime() || 0) - (new Date(left.used_at || 0).getTime() || 0))
  return historyRows
}

function buildItemPriceContext(
  itemId: string,
  historyRows: SuggestionHistoryRow[],
  clientId?: string | null,
  fallback?: Partial<ItemSuggestion>,
): ItemPriceContext {
  const itemHistory = historyRows.filter((row) => row.item_id === itemId)
  const latestGlobal = itemHistory[0] || null
  const latestClient = clientId ? itemHistory.find((row) => row.client_id === clientId) || null : null

  return {
    item_id: itemId,
    last_price_for_client: latestClient?.unit_price ?? null,
    last_price_for_client_used_at: latestClient?.used_at ?? null,
    last_price_for_client_document_number: latestClient?.doc_number ?? null,
    last_price_global: latestGlobal?.unit_price ?? fallback?.last_sold_price ?? null,
    last_price_global_used_at: latestGlobal?.used_at ?? fallback?.last_used_at ?? null,
    last_price_global_document_number: latestGlobal?.doc_number ?? fallback?.last_source_document_number ?? null,
  }
}

function normalizeSummaryRow(row: Record<string, unknown>): ItemCatalogItem {
  return {
    item_id: String(row.item_id || row.id || ''),
    name: String(row.name || ''),
    standard_price: toNumber(row.standard_price),
    is_active: row.is_active !== false,
    appears_in_invoice: row.appears_in_invoice === true,
    appears_in_quotation: row.appears_in_quotation === true,
    usage_count: toNumber(row.usage_count),
    min_price: toNumber(row.min_price),
    max_price: toNumber(row.max_price),
    avg_price: toNumber(row.avg_price),
    last_sold_price: toNumber(row.last_sold_price),
    last_used_at: row.last_used_at ? String(row.last_used_at) : null,
    last_source_type: row.last_source_type ? String(row.last_source_type) : null,
    last_source_document_id: row.last_source_document_id ? String(row.last_source_document_id) : null,
  }
}

function normalizeAliasRow(row: Record<string, unknown>): ItemAlias {
  return {
    id: String(row.id || ''),
    item_id: String(row.item_id || ''),
    alias_text: String(row.alias_text || ''),
    normalized_alias_text: row.normalized_alias_text ? String(row.normalized_alias_text) : null,
    is_active: typeof row.is_active === 'boolean' ? row.is_active : true,
    is_retired: typeof row.is_retired === 'boolean' ? row.is_retired : false,
    source: row.source ? String(row.source) : null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  }
}

function normalizeMergeResult(payload: unknown, request: ItemLibraryMergeRequest): ItemLibraryMergeResult {
  const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}

  return {
    winner_item_id: String(row.winner_item_id || request.winnerItemId),
    merged_item_ids: Array.isArray(row.merged_item_ids)
      ? row.merged_item_ids.map((value) => String(value))
      : request.mergedItemIds,
    aliases_added: Array.isArray(row.aliases_added)
      ? row.aliases_added.map((value) => String(value))
      : [],
    retired_item_ids: Array.isArray(row.retired_item_ids)
      ? row.retired_item_ids.map((value) => String(value))
      : request.mergedItemIds,
    relinked_invoice_rows: toNumber(row.relinked_invoice_rows) || 0,
    relinked_quotation_rows: toNumber(row.relinked_quotation_rows) || 0,
  }
}

export async function getItemSuggestions(
  searchText: string,
  resultLimit = 10,
  clientId: string | null | undefined,
  client: TenantClient,
): Promise<ItemSuggestion[]> {
  const trimmed = String(searchText || '').trim()
  if (!trimmed) return []

  const normalizeRows = (rows: unknown) =>
    (Array.isArray(rows) ? rows : []).map((row) => normalizeSuggestionRow(row as Record<string, unknown>))

  let suggestions: ItemSuggestion[] = []

  // 1. Fetch base suggestions
  try {
    const { data, error } = await client.rpc('get_item_suggestions', {
      search_text: trimmed,
      result_limit: resultLimit,
    })
    if (!error && data) suggestions = normalizeRows(data)
  } catch (e) {
    // ignore
  }

  if (suggestions.length === 0) {
    try {
      const { data, error } = await client.rpc('get_item_suggestions', {
        p_search_text: trimmed,
        p_result_limit: resultLimit,
      })
      if (!error && data) suggestions = normalizeRows(data)
    } catch (e) {
      // ignore
    }
  }

  if (suggestions.length === 0) {
    const { data, error } = await client
      .from('item_price_summary_v')
      .select('item_id, name, standard_price, last_sold_price, usage_count, last_used_at, last_source_type, is_active')
      .eq('is_active', true)
      .ilike('name', `%${trimmed}%`)
      .order('usage_count', { ascending: false })
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .limit(resultLimit)

    if (!error && data) {
      suggestions = (Array.isArray(data) ? data : []).map((row) =>
        normalizeSuggestionRow({
          ...row,
          matched_text: row.name,
          match_source: 'catalog',
        } as Record<string, unknown>),
      )
    }
  }

  if (suggestions.length === 0) return []

  const itemIds = suggestions.map((s) => s.item_id).filter(Boolean)
  const historyRows = await loadSuggestionHistoryRows(itemIds, client)

  return suggestions.map((s) => {
    const priceContext = buildItemPriceContext(s.item_id, historyRows, clientId, s)
    return {
      ...s,
      ...priceContext,
      last_used_at: priceContext.last_price_global_used_at ?? s.last_used_at,
      last_source_document_number:
        priceContext.last_price_global_document_number ?? s.last_source_document_number ?? null,
    }
  })
}

export async function getItemPriceContext(itemId: string, clientId: string | null | undefined, client: TenantClient): Promise<ItemPriceContext | null> {
  const stableItemId = String(itemId || '').trim()
  if (!stableItemId) return null

  const historyRows = await loadSuggestionHistoryRows([stableItemId], client)
  return buildItemPriceContext(stableItemId, historyRows, clientId)
}

export async function getItemSummaryList(limit = 100, options: { includeHeavyFallbacks?: boolean } = {}, client: TenantClient): Promise<ItemCatalogItem[]> {
  const { includeHeavyFallbacks = false } = options
  const summaryResult = await client
    .from('item_price_summary_v')
    .select('*')
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(limit)

  if (summaryResult.error) throw summaryResult.error

  const rawSummaryRows = Array.isArray(summaryResult.data) ? summaryResult.data : []
  const summaryItemIds = rawSummaryRows
    .map((row) => String((row as Record<string, unknown>).item_id || (row as Record<string, unknown>).id || ''))
    .filter(Boolean)

  const [invoiceUsageResult, quotationUsageResult] = await Promise.all([
    summaryItemIds.length > 0
      ? client.from('invoice_items').select('item_id').in('item_id', summaryItemIds)
      : Promise.resolve({ data: [], error: null }),
    summaryItemIds.length > 0
      ? client.from('quotation_items').select('item_id').in('item_id', summaryItemIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (invoiceUsageResult.error) throw invoiceUsageResult.error
  if (quotationUsageResult.error) throw quotationUsageResult.error

  const invoiceItemIds = new Set((invoiceUsageResult.data || []).map((row: any) => String(row.item_id || '')).filter(Boolean))
  const quotationItemIds = new Set((quotationUsageResult.data || []).map((row: any) => String(row.item_id || '')).filter(Boolean))

  const summaryRows = rawSummaryRows.map((row) =>
    normalizeSummaryRow({
      ...(row as Record<string, unknown>),
      appears_in_invoice:
        (row as Record<string, unknown>).appears_in_invoice === true ||
        invoiceItemIds.has(String((row as Record<string, unknown>).item_id || (row as Record<string, unknown>).id || '')),
      appears_in_quotation:
        (row as Record<string, unknown>).appears_in_quotation === true ||
        quotationItemIds.has(String((row as Record<string, unknown>).item_id || (row as Record<string, unknown>).id || '')),
    }),
  )

  if (!includeHeavyFallbacks || summaryRows.length >= limit) {
    return summaryRows
      .filter((row) => row.is_active !== false)
      .sort((left, right) => {
        const rightTime = new Date(right.last_used_at || 0).getTime() || 0
        const leftTime = new Date(left.last_used_at || 0).getTime() || 0
        if (rightTime !== leftTime) return rightTime - leftTime
        return left.name.localeCompare(right.name)
      })
      .slice(0, limit)
  }

  const [invoiceItemsResult, quotationItemsResult] = await Promise.all([
    client
      .from('invoice_items')
      .select('id, invoice_id, item_id, description, quantity, unit, unit_price, amount, updated_at')
      .limit(5000),
    client
      .from('quotation_items')
      .select('id, quotation_id, item_id, description, quantity, unit, unit_price, amount, updated_at, quotations(issue_date)')
      .limit(5000),
  ])

  if (invoiceItemsResult.error) throw invoiceItemsResult.error
  if (quotationItemsResult.error) throw quotationItemsResult.error

  const rawInvoiceRows = Array.isArray(invoiceItemsResult.data) ? invoiceItemsResult.data : []
  const invoiceIds = [...new Set(rawInvoiceRows.map((row: any) => String(row.invoice_id || '')).filter(Boolean))]
  const invoiceDocsResult = invoiceIds.length > 0
    ? await client.from('invoices').select('id, issue_date').in('id', invoiceIds)
    : { data: [], error: null }

  if (invoiceDocsResult.error) throw invoiceDocsResult.error

  const invoiceDates = new Map(
    (invoiceDocsResult.data || []).map((row: any) => [String(row.id), row.issue_date || null]),
  )

  const invoiceRows = rawInvoiceRows.map((row: any) => ({
    ...row,
    issue_date: invoiceDates.get(String(row.invoice_id || '')) || null,
  }))
  const quotationRows = (Array.isArray(quotationItemsResult.data) ? quotationItemsResult.data : []).map((row: any) => ({
    ...row,
    issue_date: row.quotations?.issue_date,
  }))
  const fallbackRows = buildFallbackSummaryItems(
    invoiceRows,
    quotationRows,
    new Set(summaryRows.map((row) => row.item_id)),
  )

  return [...summaryRows, ...fallbackRows]
    .filter((row) => row.is_active !== false)
    .sort((left, right) => {
      const rightTime = new Date(right.last_used_at || 0).getTime() || 0
      const leftTime = new Date(left.last_used_at || 0).getTime() || 0
      if (rightTime !== leftTime) return rightTime - leftTime
      return left.name.localeCompare(right.name)
    })
    .slice(0, limit)
}

export async function getItemAliases(itemIds: string[], client: TenantClient): Promise<ItemAlias[]> {
  const stableItemIds = [...new Set(itemIds.filter(Boolean))]
  if (!stableItemIds.length) return []

  const { data, error } = await client
    .from('item_aliases')
    .select('id, item_id, alias_text, normalized_alias_text, is_active, is_retired, source, created_at, updated_at')
    .in('item_id', stableItemIds)
    .order('alias_text', { ascending: true })

  if (error) throw error
  return (Array.isArray(data) ? data : []).map((row) => normalizeAliasRow(row as Record<string, unknown>))
}

export interface ItemFilterCounts {
  all: number
  invoice: number
  quotation: number
}

/**
 * Server-side aggregation of item counts per filter type.
 * Queries the actual database tables to return true global totals
 * instead of relying on a truncated client-side array snapshot.
 */
export async function getItemFilterCounts(client: TenantClient): Promise<ItemFilterCounts> {
  const [allResult, invoiceResult, quotationResult] = await Promise.all([
    client.from('item_price_summary_v').select('item_id', { count: 'exact', head: true }).eq('is_active', true),
    client.from('invoice_items').select('item_id', { count: 'exact', head: true }),
    client.from('quotation_items').select('item_id', { count: 'exact', head: true }),
  ])

  return {
    all: allResult.count ?? 0,
    invoice: invoiceResult.count ?? 0,
    quotation: quotationResult.count ?? 0,
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validates that a given item ID is a proper database UUID.
 * Rejects synthetic fallback IDs (e.g. `imported-desc:*`) that would crash the RPC layer.
 */
export function isValidCatalogItemId(itemId: string): boolean {
  return UUID_REGEX.test(itemId)
}

export async function mergeItems(request: ItemLibraryMergeRequest, client: TenantClient): Promise<ItemLibraryMergeResult> {
  const { winnerItemId, mergedItemIds } = request
  const stableMergedIds = [...new Set(mergedItemIds.filter((itemId) => itemId && itemId !== winnerItemId))]

  if (!winnerItemId || stableMergedIds.length === 0) {
    throw new Error('Choose a primary item and at least one duplicate to merge.')
  }

  // Ironclad UUID guard: block synthetic/fallback IDs from reaching the Postgres RPC layer
  if (!isValidCatalogItemId(winnerItemId)) {
    throw new Error(`Cannot merge: winner item ID "${winnerItemId}" is not a valid catalog UUID. Imported fallback items must be backfilled before merging.`)
  }

  const invalidMergedIds = stableMergedIds.filter((itemId) => !isValidCatalogItemId(itemId))
  if (invalidMergedIds.length > 0) {
    throw new Error(`Cannot merge: ${invalidMergedIds.length} merged item ID(s) are not valid catalog UUIDs. Imported fallback items must be backfilled before merging.`)
  }

  const { data, error } = await client.rpc('merge_item_catalog_entries', {
    p_winner_item_id: winnerItemId,
    p_merged_item_ids: stableMergedIds,
  })

  if (error) throw error
  return normalizeMergeResult(data, { winnerItemId, mergedItemIds: stableMergedIds })
}

export async function getItemHistoryDetail(itemId: string, limit = 50, options: { includeHeavyFallbacks?: boolean } = {}, client: TenantClient): Promise<ItemHistoryRow[]> {
  const { includeHeavyFallbacks = false } = options
  const isImportedDescription = isImportedDescriptionItemId(itemId)
  
  if (isImportedDescription && !includeHeavyFallbacks) {
    return []
  }

  const [invoiceRowsResult, quotationRowsResult] = await Promise.all([
    (() => {
      const query = client
        .from('invoice_items')
        .select('id, item_id, invoice_id, description, quantity, unit, unit_price, amount, updated_at')
        .order('updated_at', { ascending: false })

      return isImportedDescription ? query.is('item_id', null).limit(5000) : query.eq('item_id', itemId).limit(limit)
    })(),
    (() => {
      const query = client
        .from('quotation_items')
        .select('id, item_id, quotation_id, description, quantity, unit, unit_price, amount, updated_at')
        .order('updated_at', { ascending: false })

      return isImportedDescription ? query.is('item_id', null).limit(5000) : query.eq('item_id', itemId).limit(limit)
    })(),
  ])

  if (invoiceRowsResult.error) throw invoiceRowsResult.error
  if (quotationRowsResult.error) throw quotationRowsResult.error

  const invoiceRows = Array.isArray(invoiceRowsResult.data) ? invoiceRowsResult.data : []
  const quotationRows = Array.isArray(quotationRowsResult.data) ? quotationRowsResult.data : []
  const invoiceIds = [...new Set(invoiceRows.map((row) => String(row.invoice_id || '')).filter(Boolean))]
  const quotationIds = [...new Set(quotationRows.map((row) => String(row.quotation_id || '')).filter(Boolean))]

  const [invoiceDocsResult, quotationDocsResult] = await Promise.all([
    invoiceIds.length > 0
      ? client.from('invoices').select('id, invoice_number, issue_date').in('id', invoiceIds)
      : Promise.resolve({ data: [], error: null }),
    quotationIds.length > 0
      ? client.from('quotations').select('id, quotation_number, issue_date').in('id', quotationIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (invoiceDocsResult.error) throw invoiceDocsResult.error
  if (quotationDocsResult.error) throw quotationDocsResult.error

  const invoiceNumbers = new Map((invoiceDocsResult.data || []).map((row) => [String(row.id), { number: row.invoice_number ? String(row.invoice_number) : null, date: row.issue_date || null }]))
  const quotationNumbers = new Map((quotationDocsResult.data || []).map((row) => [String(row.id), { number: row.quotation_number ? String(row.quotation_number) : null, date: row.issue_date || null }]))

  return buildFallbackHistoryRows({
    itemId,
    invoiceRows,
    quotationRows,
    invoiceNumbers,
    quotationNumbers,
    limit,
  })
}
export async function getItemMergeHistory(limit = 50, client: TenantClient): Promise<ItemMergeLogRow[]> {
  const { data, error } = await client
    .from('item_merge_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  const rows = (Array.isArray(data) ? data : []) as ItemMergeLogRow[]
  const itemIds = [
    ...new Set(
      rows.flatMap((r) => [r.from_item_id, r.to_item_id]).filter((id): id is string => Boolean(id))
    ),
  ]

  if (itemIds.length === 0) return rows

  const { data: itemData, error: itemError } = await client
    .from('item_catalog')
    .select('id, name')
    .in('id', itemIds)

  if (itemError) throw itemError

  const nameMap = new Map((itemData || []).map((row: any) => [String(row.id), String(row.name)]))

  return rows.map((row) => ({
    ...row,
    from_item_name: row.from_item_id ? nameMap.get(row.from_item_id) : null,
    to_item_name: row.to_item_id ? nameMap.get(row.to_item_id) : null,
  }))
}

export async function getItemMergeHistoryCount(client: TenantClient): Promise<number> {
  const { count, error } = await client
    .from('item_merge_log')
    .select('*', { count: 'exact', head: true })

  if (error) throw error
  return count || 0
}
