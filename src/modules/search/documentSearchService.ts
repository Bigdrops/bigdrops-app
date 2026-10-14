// ============================================================================
// DOCUMENT SEARCH SERVICE
// Thin RPC wrapper that calls the tenant-schema search_documents function.
// All ranking, deduplication, and field coverage is handled server-side.
// ============================================================================

import type { TenantClient } from '@/lib/tenantClient'
import type {
  DocumentSearchParams,
  DocumentSearchResponse,
  DocumentSearchResult,
} from '@/domain/search/types'

/**
 * Call the tenant-schema search_documents RPC and map results to the shared contract.
 *
 * Returns an empty response immediately when the term is shorter than 2 characters —
 * short terms produce expensive full-table scans and are not useful to the user.
 *
 * Follows the tenantClient.rpc() pattern from src/lib/audit.ts:
 *   const { data, error } = await tenantClient.rpc(...)
 */
export async function searchDocuments(
  tenantClient: TenantClient,
  params: DocumentSearchParams,
): Promise<DocumentSearchResponse> {
  const term = params.term?.trim() ?? ''

  if (term.length < 2) {
    return { results: [], has_more: false }
  }

  const limit = params.limit ?? 50

  const { data, error } = await tenantClient.rpc('search_documents', {
    p_term: term,
    p_document_types: params.document_types ?? null,
    p_client_id: params.client_id ?? null,
    p_limit: limit,
  })

  if (error) {
    throw new Error(`Search failed: ${error.message}`)
  }

  const results = (data as DocumentSearchResult[]) ?? []

  return {
    results,
    has_more: results.length >= limit,
  }
}
