// ============================================================================
// USE DOCUMENT SEARCH HOOK
// Debounced, cancellation-safe hook that calls the search_documents RPC.
// Minimum term length: 2 characters (enforced here and in the service layer).
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEntity } from '@/lib/tenant/contexts'
import { searchDocuments } from '@/modules/search/documentSearchService'
import type {
  DocumentSearchResult,
  DocumentType,
} from '@/domain/search/types'

const DEBOUNCE_MS = 350
const MIN_TERM_LENGTH = 2

interface UseDocumentSearchOptions {
  /** Restrict search to specific document types.  Omit for all types. */
  document_types?: DocumentType[]
  /** Restrict search to a single client.  Omit for all clients. */
  client_id?: string | null
}

interface UseDocumentSearchResult {
  search: string
  setSearch: (term: string) => void
  results: DocumentSearchResult[]
  loading: boolean
  error: string | null
  reset: () => void
}

export function useDocumentSearch(
  options: UseDocumentSearchOptions = {},
): UseDocumentSearchResult {
  const { tenantClient } = useEntity()

  const [search, setSearchState] = useState('')
  const [results, setResults] = useState<DocumentSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce timer ref — same pattern as QuerySearchBar.tsx
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable ref for options to avoid stale-closure issues in the effect
  const optionsRef = useRef(options)
  optionsRef.current = options

  const setSearch = useCallback((term: string) => {
    setSearchState(term)
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSearchState('')
    setResults([])
    setLoading(false)
    setError(null)
  }, [])

  useEffect(() => {
    // Clear any pending debounce when search changes
    if (timerRef.current) clearTimeout(timerRef.current)

    const term = search.trim()

    if (term.length < MIN_TERM_LENGTH) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    // Cancellation flag — prevents stale results from landing after cleanup
    let cancelled = false

    timerRef.current = setTimeout(async () => {
      try {
        const response = await searchDocuments(tenantClient, {
          term,
          document_types: optionsRef.current.document_types ?? null,
          client_id: optionsRef.current.client_id ?? null,
          limit: 50,
        })

        if (!cancelled) {
          setResults(response.results)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Search failed')
          setLoading(false)
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [search, tenantClient])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { search, setSearch, results, loading, error, reset }
}
