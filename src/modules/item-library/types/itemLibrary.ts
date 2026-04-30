export type ItemSourceType = 'invoice' | 'quotation'

export type ItemLibraryFilterType = 'all' | 'needs_cleanup' | ItemSourceType
export type ItemLibraryViewMode = 'catalog' | 'duplicates' | 'advanced_cleanup' | 'merge_history'

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
  last_price_for_client_used_at?: string | null
  last_price_for_client_document_number?: string | null
  last_price_global?: number | null
  last_price_global_used_at?: string | null
  last_price_global_document_number?: string | null
  last_source_document_number?: string | null
}

export interface ItemPriceContext {
  item_id: string
  last_price_for_client?: number | null
  last_price_for_client_used_at?: string | null
  last_price_for_client_document_number?: string | null
  last_price_global?: number | null
  last_price_global_used_at?: string | null
  last_price_global_document_number?: string | null
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

export interface FlaggedCleanupExportItem {
  item_id: string
  name: string
  usage_count: number
  last_price: number | null
  is_active: boolean
  aliases: string[]
}

export interface FlaggedCleanupExportGroup {
  group_id: string
  label: string
  items: FlaggedCleanupExportItem[]
}

export interface FlaggedCleanupExportPayload {
  export_type: 'flagged_cleanup'
  schema_version: 1
  generated_at: string
  scope: {
    mode: 'flagged'
    group_count: number
    item_count: number
  }
  groups: FlaggedCleanupExportGroup[]
}

export interface FlaggedCleanupResultGroup {
  group_id: string
  canonical_name: string
  winner_item_id: string
  merged_item_ids: string[]
  aliases_to_keep: string[]
  aliases_to_retire: string[]
}

export interface FlaggedCleanupImportPayload {
  response_type: 'flagged_cleanup_result'
  schema_version: 1
  source_export_type: 'flagged_cleanup'
  merge_groups: FlaggedCleanupResultGroup[]
  ignored_group_ids: string[]
}

export interface CleanupPreviewGroup {
  group_id: string
  export_label: string
  canonical_name: string
  winner: FlaggedCleanupExportItem
  merged_items: FlaggedCleanupExportItem[]
  aliases_to_keep: string[]
  aliases_to_retire: string[]
}

export interface CleanupPreviewRejectedGroup {
  group_id: string
  reason: string
}

export interface CleanupImportPreview {
  merge_groups: CleanupPreviewGroup[]
  ignored_groups: FlaggedCleanupExportGroup[]
  rejected_groups: CleanupPreviewRejectedGroup[]
}

export interface CleanupImportValidationResult {
  ok: boolean
  errors: string[]
  preview: CleanupImportPreview | null
  parsed: FlaggedCleanupImportPayload | null
}

export interface CleanupApplyProposal {
  group_id: string
  canonical_name: string
  winner_item_id: string
  merged_item_ids: string[]
  aliases_to_keep: string[]
  aliases_to_retire: string[]
}

export interface CleanupApplyResult {
  group_id: string
  canonical_name: string
  status: 'applied' | 'stale' | 'failed'
  message: string
}
export interface ItemMergeLogRow {
  id: string
  from_item_id: string | null
  to_item_id: string | null
  from_item_name?: string | null
  to_item_name?: string | null
  action: 'merge' | 'alias_added' | 'alias_retired' | 'standard_price_updated' | 'relinked_rows'
  details: any
  created_at: string
}
