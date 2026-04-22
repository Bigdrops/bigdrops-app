export type ItemSourceType = 'invoice' | 'quotation'

export type ItemLibraryFilterType = 'all' | ItemSourceType
export type ItemLibraryViewMode = 'catalog' | 'duplicates'

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

export interface DuplicateCandidateMember {
  item_id: string
  name: string
  usage_count: number
  last_sold_price: number | null
  last_used_at?: string | null
}

export interface DuplicateCandidateGroup {
  group_id: string
  label: string
  reason: string
  normalized_label: string
  members: DuplicateCandidateMember[]
}

export interface ItemLibraryMergeRequest {
  winnerItemId: string
  mergedItemIds: string[]
}

export interface ItemLibraryMergeResult {
  winner_item_id: string
  merged_item_ids: string[]
  aliases_added: string[]
  retired_item_ids: string[]
  relinked_invoice_rows: number
  relinked_quotation_rows: number
}
