// ============================================================================
// DOCUMENT SEARCH RESULTS
// Renders the result list produced by useDocumentSearch / documentSearchService.
// No financial amounts are shown. Navigation is caller-controlled via onNavigate.
// ============================================================================

import { SkeletonCard } from '@/components/loading/AppLoadingStates'
import { formatDisplayDate } from '@/lib/formatters/date'
import type { DocumentSearchResult, DocumentType, MatchSource } from '@/domain/search/types'


// ── Match source labels ────────────────────────────────────────────────────

const MATCH_SOURCE_LABELS: Record<MatchSource, string> = {
  number:               'document number',
  reference_number:     'linked number',
  client:               'client name',
  vendor:               'vendor',
  title:                'title',
  notes:                'notes',
  location:             'location',
  equipment_type:       'equipment',
  equipment:            'equipment identity',
  item_description:     'item description',
  item_make:            'item make',
  item_sub_description: 'item detail',
  item_notes:           'item notes',
  specification:        'specification',
  section_title:        'section',
  problem_reported:     'reported problem',
  service_rendered:     'service rendered',
  materials_used:       'materials used',
  defects_found:        'defects found',
  engineer_remarks:     'engineer remarks',
}


function matchSourceLabel(source: MatchSource | string): string {
  return MATCH_SOURCE_LABELS[source as MatchSource] ?? source
}

// ── Document type badge ────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  quotation: 'Quotation',
  invoice:   'Invoice',
  rfq:       'RFQ',
  cps:       'CPS',
  csr:       'CSR',
  waybill:   'Waybill',
  receipt:   'Receipt',
}

function DocTypeBadge({ type }: { type: DocumentType }) {
  return (
    <span className="shrink-0 inline-flex rounded-md border border-bd-border bg-bd-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">
      {DOC_TYPE_LABELS[type] ?? type}
    </span>
  )
}

// ── Single result card ─────────────────────────────────────────────────────

interface ResultCardProps {
  result: DocumentSearchResult
  onNavigate: (result: DocumentSearchResult) => void
}

function ResultCard({ result, onNavigate }: ResultCardProps) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(result)}
      className="w-full text-left rounded-[22px] border border-bd-border bg-bd-surface p-4 transition-colors hover:bg-bd-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bd-border"
    >
      <div className="flex items-start gap-3">
        {/* Left column: badge + number */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <DocTypeBadge type={result.document_type} />
            <span className="text-[13px] font-bold text-bd-text truncate">
              {result.document_number}
            </span>
          </div>

          {result.title ? (
            <p className="text-[12px] text-bd-text-muted truncate">{result.title}</p>
          ) : null}

          {result.client_name ? (
            <p className="text-[12px] text-bd-text-muted truncate">{result.client_name}</p>
          ) : null}

          {result.matched_text ? (
            <p className="mt-1 text-[11px] text-bd-text-muted/80 truncate">
              <span className="font-medium capitalize">{matchSourceLabel(result.match_source)}</span>
              {': '}
              <span>{result.matched_text}</span>
            </p>
          ) : null}
        </div>

        {/* Right column: date */}
        {result.document_date ? (
          <div className="shrink-0 text-[11px] text-bd-text-muted">
            {formatDisplayDate(result.document_date)}
          </div>
        ) : null}
      </div>
    </button>
  )
}

// ── Public component ───────────────────────────────────────────────────────

interface DocumentSearchResultsProps {
  results: DocumentSearchResult[]
  loading: boolean
  error: string | null
  /** True when further matches exist beyond the rendered results. */
  hasMore?: boolean
  onNavigate: (result: DocumentSearchResult) => void
}

export function DocumentSearchResults({
  results,
  loading,
  error,
  hasMore = false,
  onNavigate,
}: DocumentSearchResultsProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-3" aria-busy="true" aria-label="Loading search results">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-[12px] text-bd-status-danger-text" role="alert">
          {error}
        </p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="p-4">
        <p className="text-[12px] text-bd-text-muted">No results.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2 p-3 list-none" role="list" aria-label="Search results">
      {results.map((result) => (
        <li key={`${result.document_type}-${result.document_id}`}>
          <ResultCard result={result} onNavigate={onNavigate} />
        </li>
      ))}
      {hasMore ? (
        <li className="px-1 pt-1 text-[11px] text-bd-text-muted">
          More matching documents exist. Refine the search to narrow the list.
        </li>
      ) : null}
    </ul>
  )
}
