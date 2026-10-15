// ============================================================================
// DOCUMENT SEARCH PLATFORM — Shared TypeScript contract
// Consumed by: documentSearchService, useDocumentSearch, DocumentSearchResults
// Extended by: future document types (waybill, csr, rfq, cps) without changes here
// ============================================================================

/**
 * Supported document types.  Add new types here when new search coverage is implemented;
 * the union propagates through DocumentSearchResult automatically.
 */
export type DocumentType =
  | 'quotation'
  | 'invoice'
  | 'rfq'
  | 'cps'
  | 'csr'
  | 'waybill'
  | 'receipt'

/**
 * Which field inside the document produced the match.
 * Mirrors the match_source values returned by the search_documents RPC.
 */
export type MatchSource =
  // Document identity
  | 'number'
  /** A number belonging to a different document, e.g. a receipt's linked invoice. */
  | 'reference_number'
  | 'title'
  | 'client'
  | 'vendor'
  // Header free text
  | 'notes'
  | 'location'
  | 'equipment_type'
  /** CSR make, model, serial number or engine number. */
  | 'equipment'
  // Item / content
  | 'item_description'
  | 'item_make'
  | 'item_sub_description'
  | 'item_notes'
  | 'specification'
  | 'section_title'
  // CSR content
  | 'problem_reported'
  | 'service_rendered'
  /** Material names extracted from the CSR materials envelope. */
  | 'materials_used'
  | 'defects_found'
  | 'engineer_remarks'

/**
 * One search result row, directly mapped from the RETURNS TABLE of search_documents.
 * document_date is a date string (ISO-8601 date part) or null.
 * client_id and title are nullable — not all document types carry them.
 */
export interface DocumentSearchResult {
  document_type: DocumentType
  document_id: string
  document_number: string
  title: string | null
  client_id: string | null
  client_name: string | null
  document_date: string | null
  match_source: MatchSource
  matched_text: string | null
  match_rank: number
  /** Pre-built front-end route, e.g. /quotations/<uuid> */
  route: string
}

/**
 * Input parameters for the search authority.
 * All optional fields default to "no filter" / project defaults.
 */
export interface DocumentSearchParams {
  /** The user-supplied search term.  Min 2 chars — shorter terms are rejected early. */
  term: string
  /** Restrict results to specific document types.  null = all supported types. */
  document_types?: DocumentType[] | null
  /** Restrict results to a single client.  null = all clients. */
  client_id?: string | null
  /** Maximum rows to return.  Defaults to 50. */
  limit?: number
}

/**
 * Shape returned by searchDocuments() and stored in useDocumentSearch state.
 */
export interface DocumentSearchResponse {
  /** At most `limit` rows, best match first. */
  results: DocumentSearchResult[]
  /** True when at least one further matching document exists beyond `results`. */
  has_more: boolean
}
