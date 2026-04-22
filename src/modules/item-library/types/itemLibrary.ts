export type ItemSourceType = 'invoice' | 'quotation'

export type ItemLibraryFilterType = 'all' | ItemSourceType

export interface ItemCatalogItem {
  item_id: string
  name: string
  standard_price: number | null
  is_active: boolean
  appears_in_invoice?: boolean
  appears_in_quotation?: boolean
  usage_count?: number | null
  min_price?: number | null
  max_price?: number | null
  avg_price?: number | null
  last_sold_price?: number | null
  last_used_at?: string | null
  last_source_type?: ItemSourceType | string | null
  last_source_document_id?: string | null
}

export interface ItemAlias {
  id: string
  item_id: string
  alias_text: string
  normalized_alias_text?: string | null
  is_active?: boolean
  is_retired?: boolean
  source?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ItemSuggestion {
  item_id: string
  name: string
  matched_text: string
  match_source: 'catalog' | 'alias' | 'history' | 'unknown'
  standard_price: number | null
  last_sold_price?: number | null
  usage_count?: number | null
  last_used_at?: string | null
  last_source_type?: ItemSourceType | string | null
  is_active?: boolean
  last_price_for_client?: number | null
  last_price_global?: number | null
  last_source_document_number?: string | null
}

export interface ItemHistoryRow {
  row_id: string
  item_id: string
  source_type: ItemSourceType
  source_document_id: string
  source_document_number?: string | null
  description: string
  quantity?: number | null
  unit?: string | null
  unit_price?: number | null
  amount?: number | null
  used_at?: string | null
}
