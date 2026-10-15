// ============================================================================
// CLIENT DOCUMENT SEARCH
// Client-scoped search over the shared document search authority.
//
// The scope is handed to the server-side search authority as client_id, so
// only this client's documents can come back.  The client's history is never
// loaded into React and filtered here.
//
// rfq and cps declare no client_id column, so the server excludes them from a
// scoped search rather than inferring a relationship from a name.
// ============================================================================

import type { ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDocumentSearch } from '@/hooks/useDocumentSearch'
import { DocumentSearchResults } from '@/components/search/DocumentSearchResults'
import { searchResultSummary } from '@/domain/search/summary'

interface ClientDocumentSearchProps {
  clientId: string | null
  onNavigate: (route: string) => void
  /** The normal workspace content, hidden while a search is active. */
  children: ReactNode
}

export function ClientDocumentSearch({ clientId, onNavigate, children }: ClientDocumentSearchProps) {
  const search = useDocumentSearch({ client_id: clientId })
  const active = search.search.trim().length >= 2

  return (
    <>
      <div className="relative flex h-11 items-center rounded-xl border border-bd-border bg-bd-surface-muted px-3">
        <Search className="h-4 w-4 text-bd-text-muted" />
        <Input
          value={search.search}
          onChange={(e) => search.setSearch(e.target.value)}
          placeholder="Search this client's documents..."
          aria-label="Search this client's documents"
          className="h-full border-0 bg-transparent px-2 text-sm text-bd-text shadow-none focus-visible:ring-0"
        />
        {search.search && (
          <button
            type="button"
            onClick={() => search.setSearch('')}
            className="p-1"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-bd-text-muted" />
          </button>
        )}
      </div>

      {active ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.12em] text-bd-text-muted">
              Matching documents
            </h2>
            <span className="text-[11px] text-bd-text-muted">
              {searchResultSummary(search.results.length, search.has_more, search.loading)}
            </span>
          </div>
          <DocumentSearchResults
            results={search.results}
            loading={search.loading}
            error={search.error}
            hasMore={search.has_more}
            onNavigate={(result) => onNavigate(result.route)}
          />
        </section>
      ) : (
        children
      )}
    </>
  )
}
