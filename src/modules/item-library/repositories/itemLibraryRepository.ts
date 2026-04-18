import { supabase } from '@/supabase'
import type { ItemCatalogItem, ItemHistoryRow, ItemSuggestion } from '../types'

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
      row.display_name || row.name || row.item_name || row.master_name || row.alias_text || ''
    ),
    matched_text: String(row.matched_text || row.alias_text || row.name || row.item_name || ''),
    match_source: isAlias ? 'alias' : (row.match_source as any) || 'catalog',
    standard_price: toNumber(row.standard_price),
    last_sold_price: toNumber(row.last_sold_price),
    usage_count: toNumber(row.usage_count),
    last_used_at: row.last_used_at ? String(row.last_used_at) : null,
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
  const { data, error } = await supabase.rpc('get_item_suggestions', {
    search_text: searchText,
    result_limit: resultLimit,
  })

  if (error) throw error
  return (Array.isArray(data) ? data : []).map((row) => normalizeSuggestionRow(row as Record<string, unknown>))
}

export async function getItemSummaryList(limit = 100): Promise<ItemCatalogItem[]> {
  const query = supabase
    .from('item_price_summary_v')
    .select('*')
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })

  const { data, error } = await query.limit(limit)
  if (error) throw error

  return (Array.isArray(data) ? data : []).map((row) => normalizeSummaryRow(row as Record<string, unknown>))
}

export async function getItemHistoryDetail(itemId: string, limit = 50): Promise<ItemHistoryRow[]> {
  const [invoiceRowsResult, quotationRowsResult] = await Promise.all([
    supabase
      .from('invoice_items')
      .select('id, item_id, invoice_id, description, quantity, unit, unit_price, amount, updated_at')
      .eq('item_id', itemId)
      .order('updated_at', { ascending: false })
      .limit(limit),
    supabase
      .from('quotation_items')
      .select('id, item_id, quotation_id, description, quantity, unit, unit_price, amount, updated_at')
      .eq('item_id', itemId)
      .order('updated_at', { ascending: false })
      .limit(limit),
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

  const historyRows: ItemHistoryRow[] = [
    ...invoiceRows.map((row) => ({
      row_id: String(row.id || ''),
      item_id: String(row.item_id || itemId),
      source_type: 'invoice' as const,
      source_document_id: String(row.invoice_id || ''),
      source_document_number: invoiceNumbers.get(String(row.invoice_id || '')) ?? null,
      description: String(row.description || ''),
      quantity: toNumber(row.quantity),
      unit: row.unit ? String(row.unit) : null,
      unit_price: toNumber(row.unit_price),
      amount: toNumber(row.amount),
      used_at: row.updated_at ? String(row.updated_at) : null,
    })),
    ...quotationRows.map((row) => ({
      row_id: String(row.id || ''),
      item_id: String(row.item_id || itemId),
      source_type: 'quotation' as const,
      source_document_id: String(row.quotation_id || ''),
      source_document_number: quotationNumbers.get(String(row.quotation_id || '')) ?? null,
      description: String(row.description || ''),
      quantity: toNumber(row.quantity),
      unit: row.unit ? String(row.unit) : null,
      unit_price: toNumber(row.unit_price),
      amount: toNumber(row.amount),
      used_at: row.updated_at ? String(row.updated_at) : null,
    })),
  ]

  return historyRows
    .sort((left, right) => (new Date(right.used_at || 0).getTime() || 0) - (new Date(left.used_at || 0).getTime() || 0))
    .slice(0, limit)
}
