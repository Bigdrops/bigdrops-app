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
 * has_more is derived by requesting one row more than the caller asked for, returning
 * only `limit` rows, and reporting has_more only when that extra row arrived.  Asking
 * for exactly `limit` rows cannot distinguish "exactly limit matches" from "more than
 * limit matches".
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
    // One extra row is requested so has_more is a fact, not an assumption.
    p_limit: limit + 1,
  })

  if (error) {
    throw new Error(`Search failed: ${error.message}`)
  }

  const rawRows = (data as DocumentSearchResult[]) ?? []

  return {
    results: rawRows.slice(0, limit),
    has_more: rawRows.length > limit,
  }
}
