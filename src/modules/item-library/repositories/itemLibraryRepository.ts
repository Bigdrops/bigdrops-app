import { supabase } from '@/supabase'
import type { ItemCatalogItem, ItemHistoryRow, ItemSuggestion } from '../types'
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
    is_active: typeof row.is_active === 'boolean' ? row.is_active : true,
  }
}

function normalizeSummaryRow(row: Record<string, unknown>): ItemCatalogItem {
  return {
    item_id: String(row.item_id || row.id || ''),
    name: String(row.name || ''),
    standard_price: toNumber(row.standard_price),
    is_active: row.is_active !== false,
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

export async function getItemSuggestions(searchText: string, resultLimit = 10): Promise<ItemSuggestion[]> {
  const trimmed = String(searchText || '').trim()
  if (!trimmed) return []

  const normalizeRows = (rows: unknown) =>
    (Array.isArray(rows) ? rows : []).map((row) => normalizeSuggestionRow(row as Record<string, unknown>))

  // Try the current RPC signature first
  {
    const { data, error } = await supabase.rpc('get_item_suggestions', {
      search_text: trimmed,
      result_limit: resultLimit,
    })

    if (!error) {
      const normalized = normalizeRows(data)
      if (normalized.length > 0) return normalized
    }
  }

  // Retry with prefixed parameter names in case the deployed function uses that convention
  {
    const { data, error } = await supabase.rpc('get_item_suggestions', {
      p_search_text: trimmed,
      p_result_limit: resultLimit,
    })

    if (!error) {
      const normalized = normalizeRows(data)
      if (normalized.length > 0) return normalized
    }
  }

  // Final fallback: direct summary view lookup so the UI still works
  const { data, error } = await supabase
    .from('item_price_summary_v')
    .select('item_id, name, standard_price, last_sold_price, usage_count, last_used_at, last_source_type, is_active')
    .ilike('name', `%${trimmed}%`)
    .order('usage_count', { ascending: false })
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .limit(resultLimit)

  if (error) throw error

  return (Array.isArray(data) ? data : []).map((row) =>
    normalizeSuggestionRow({
      ...row,
      matched_text: row.name,
      match_source: 'catalog',
    } as Record<string, unknown>),
  )
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

  const summaryRows = (Array.isArray(summaryResult.data) ? summaryResult.data : []).map((row) =>
    normalizeSummaryRow(row as Record<string, unknown>),
  )
  const fallbackRows = buildFallbackSummaryItems(
    Array.isArray(invoiceItemsResult.data) ? invoiceItemsResult.data : [],
    Array.isArray(quotationItemsResult.data) ? quotationItemsResult.data : [],
    new Set(summaryRows.map((row) => row.item_id)),
  )

  return [...summaryRows, ...fallbackRows]
    .sort((left, right) => {
      const rightTime = new Date(right.last_used_at || 0).getTime() || 0
      const leftTime = new Date(left.last_used_at || 0).getTime() || 0
      if (rightTime !== leftTime) return rightTime - leftTime
      return left.name.localeCompare(right.name)
    })
    .slice(0, limit)
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
