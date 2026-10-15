// ============================================================================
// DOCUMENT SEARCH — header summary wording
// ============================================================================

/**
 * Short label describing the *active search*, for a list screen header.
 *
 * While enriched search results are on screen the header must describe those
 * results. Showing the normal list total instead is actively misleading: a
 * client-scoped or module search can display several matches while the header
 * still reads "0 quotations total".
 *
 * "Searching..." covers the debounce and in-flight window, so the header never
 * flashes "No results" before the search has run.
 */
export function searchResultSummary(count: number, hasMore: boolean, loading: boolean): string {
  if (loading) return 'Searching...'
  if (count === 0) return 'No results'
  return `${count}${hasMore ? '+' : ''} result${count === 1 ? '' : 's'}`
}
