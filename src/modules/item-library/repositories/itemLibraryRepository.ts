import { supabase } from '@/supabase'
import type {
  ItemAlias,
  ItemCatalogItem,
  ItemHistoryRow,
  ItemLibraryMergeRequest,
  ItemLibraryMergeResult,
  ItemSuggestion,
} from '../types'
import {
  buildFallbackHistoryRows,
  buildFallbackSummaryItems,
  isImportedDescriptionItemId,
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
    last_price_global: toNumber(row.last_price_global ?? row.last_sold_price),
    last_source_document_number: row.last_source_document_number ? String(row.last_source_document_number) : null,
    is_active: typeof row.is_active === 'boolean' ? row.is_active : true,
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
  clientId?: string | null,
): Promise<ItemSuggestion[]> {
  const trimmed = String(searchText || '').trim()
  if (!trimmed) return []

  const normalizeRows = (rows: unknown) =>
    (Array.isArray(rows) ? rows : []).map((row) => normalizeSuggestionRow(row as Record<string, unknown>))

  let suggestions: ItemSuggestion[] = []

  // 1. Fetch base suggestions
  try {
    const { data, error } = await supabase.rpc('get_item_suggestions', {
      search_text: trimmed,
      result_limit: resultLimit,
    })
    if (!error && data) suggestions = normalizeRows(data)
  } catch (e) {
    // ignore
  }

  if (suggestions.length === 0) {
    try {
      const { data, error } = await supabase.rpc('get_item_suggestions', {
        p_search_text: trimmed,
        p_result_limit: resultLimit,
      })
      if (!error && data) suggestions = normalizeRows(data)
    } catch (e) {
      // ignore
    }
  }

  if (suggestions.length === 0) {
    const { data, error } = await supabase
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

  // 2. Enrich with document numbers and client prices
  const itemIds = suggestions.map((s) => s.item_id).filter(Boolean)
  
  const [invoiceHistory, quotationHistory] = await Promise.all([
    supabase
      .from('invoice_items')
      .select('item_id, unit_price, updated_at, invoices(invoice_number, client_id)')
      .in('item_id', itemIds)
      .order('updated_at', { ascending: false }),
    supabase
      .from('quotation_items')
      .select('item_id, unit_price, updated_at, quotations(quotation_number, client_id)')
      .in('item_id', itemIds)
      .order('updated_at', { ascending: false }),
  ])

  const historyRows: any[] = []
  if (invoiceHistory.data) {
    invoiceHistory.data.forEach((row: any) => {
      historyRows.push({
        item_id: row.item_id,
        unit_price: row.unit_price,
        updated_at: row.updated_at,
        doc_number: row.invoices?.invoice_number,
        client_id: row.invoices?.client_id,
      })
    })
  }
  if (quotationHistory.data) {
    quotationHistory.data.forEach((row: any) => {
      historyRows.push({
        item_id: row.item_id,
        unit_price: row.unit_price,
        updated_at: row.updated_at,
        doc_number: row.quotations?.quotation_number,
        client_id: row.quotations?.client_id,
      })
    })
  }

  // Sort history rows by date desc
  historyRows.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  return suggestions.map((s) => {
    const itemHistory = historyRows.filter((h) => h.item_id === s.item_id)
    const latestGlobal = itemHistory[0]
    const latestClient = clientId ? itemHistory.find((h) => h.client_id === clientId) : null

    return {
      ...s,
      last_price_global: latestGlobal ? latestGlobal.unit_price : s.last_sold_price,
      last_used_at: latestGlobal ? latestGlobal.updated_at : s.last_used_at,
      last_source_document_number: latestGlobal ? latestGlobal.doc_number : null,
      last_price_for_client: latestClient ? latestClient.unit_price : null,
    }
  })
}

export async function getItemSummaryList(limit = 100): Promise<ItemCatalogItem[]> {
  const [summaryResult, invoiceItemsResult, quotationItemsResult] = await Promise.all([
    supabase
      .from('item_price_summary_v')
      .select('*')
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('name', { ascending: true })
      .limit(limit),
    supabase
      .from('invoice_items')
      .select('id, invoice_id, item_id, description, quantity, unit, unit_price, amount, updated_at')
      .limit(5000),
    supabase
      .from('quotation_items')
      .select('id, quotation_id, item_id, description, quantity, unit, unit_price, amount, updated_at')
      .limit(5000),
  ])

  if (summaryResult.error) throw summaryResult.error
  if (invoiceItemsResult.error) throw invoiceItemsResult.error
  if (quotationItemsResult.error) throw quotationItemsResult.error

  const invoiceRows = Array.isArray(invoiceItemsResult.data) ? invoiceItemsResult.data : []
  const quotationRows = Array.isArray(quotationItemsResult.data) ? quotationItemsResult.data : []
  const invoiceItemIds = new Set(invoiceRows.map((row) => String(row.item_id || '')).filter(Boolean))
  const quotationItemIds = new Set(quotationRows.map((row) => String(row.item_id || '')).filter(Boolean))

  const summaryRows = (Array.isArray(summaryResult.data) ? summaryResult.data : []).map((row) =>
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

export async function getItemAliases(itemIds: string[]): Promise<ItemAlias[]> {
  const stableItemIds = [...new Set(itemIds.filter(Boolean))]
  if (!stableItemIds.length) return []

  const { data, error } = await supabase
    .from('item_aliases')
    .select('id, item_id, alias_text, normalized_alias_text, is_active, is_retired, source, created_at, updated_at')
    .in('item_id', stableItemIds)
    .order('alias_text', { ascending: true })

  if (error) throw error
  return (Array.isArray(data) ? data : []).map((row) => normalizeAliasRow(row as Record<string, unknown>))
}

export async function mergeItems(request: ItemLibraryMergeRequest): Promise<ItemLibraryMergeResult> {
  const { winnerItemId, mergedItemIds } = request
  const stableMergedIds = [...new Set(mergedItemIds.filter((itemId) => itemId && itemId !== winnerItemId))]

  if (!winnerItemId || stableMergedIds.length === 0) {
    throw new Error('Choose a primary item and at least one duplicate to merge.')
  }

  const { data, error } = await supabase.rpc('merge_item_catalog_entries', {
    p_winner_item_id: winnerItemId,
    p_merged_item_ids: stableMergedIds,
  })

  if (error) throw error
  return normalizeMergeResult(data, { winnerItemId, mergedItemIds: stableMergedIds })
}

export async function getItemHistoryDetail(itemId: string, limit = 50): Promise<ItemHistoryRow[]> {
  const isImportedDescription = isImportedDescriptionItemId(itemId)
  const [invoiceRowsResult, quotationRowsResult] = await Promise.all([
    (() => {
      const query = supabase
        .from('invoice_items')
        .select('id, item_id, invoice_id, description, quantity, unit, unit_price, amount, updated_at')
        .order('updated_at', { ascending: false })

      return isImportedDescription ? query.is('item_id', null).limit(5000) : query.eq('item_id', itemId).limit(limit)
    })(),
    (() => {
      const query = supabase
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
      ? supabase.from('invoices').select('id, invoice_number').in('id', invoiceIds)
      : Promise.resolve({ data: [], error: null }),
    quotationIds.length > 0
      ? supabase.from('quotations').select('id, quotation_number').in('id', quotationIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (invoiceDocsResult.error) throw invoiceDocsResult.error
  if (quotationDocsResult.error) throw quotationDocsResult.error

  const invoiceNumbers = new Map((invoiceDocsResult.data || []).map((row) => [String(row.id), row.invoice_number ? String(row.invoice_number) : null]))
  const quotationNumbers = new Map((quotationDocsResult.data || []).map((row) => [String(row.id), row.quotation_number ? String(row.quotation_number) : null]))

  return buildFallbackHistoryRows({
    itemId,
    invoiceRows,
    quotationRows,
    invoiceNumbers,
    quotationNumbers,
    limit,
  })
}
