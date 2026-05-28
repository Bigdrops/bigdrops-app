// ============================================================================
// QUERY LIST CONTAINER — Memoized, layout-isolated, CSS-contained
// NEVER owns query state. NEVER changes dimensions during input.
// ============================================================================

import { memo, type ReactNode } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryListContainerProps<T> {
  results: T[];
  renderRow: (item: T) => ReactNode;
  emptyState?: ReactNode;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  loadMoreLabel?: string;
  className?: string;
}

function QueryListContainerInner<T>({
  results,
  renderRow,
  emptyState,
  hasMore,
  loadingMore,
  onLoadMore,
  loadMoreLabel = "Load more",
  className,
}: QueryListContainerProps<T>) {
  return (
    <div
      className={className}
      style={{
        flex: "1 1 0",
        minHeight: 0,
        overflowY: "auto",
        contain: "layout paint size",
        contentVisibility: "auto",
      }}
    >
      <div className="space-y-[var(--bd-row-gap)] md:space-y-1">
        {results.length > 0 ? (
          results.map(renderRow)
        ) : (
          emptyState || (
            <div className="rounded-[var(--bd-overlay-radius)] border border-dashed border-bd-border bg-bd-surface/50 py-10 text-center shadow-inner">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-[var(--bd-radius-lg)] bg-bd-surface-muted text-bd-text-muted">
                <Search className="h-4 w-4" />
              </div>
              <div className="mt-3 text-sm font-bold text-bd-text">No results found</div>
              <div className="mt-1 text-[11px] text-bd-text-muted">
                Try adjusting your search or filters.
              </div>
            </div>
          )
        )}
      </div>

      {hasMore && (
        <div className="mt-[var(--bd-space-lg)] flex justify-center pb-[var(--bd-space-xl)]">
          <Button
            variant="outline"
            disabled={loadingMore}
            onClick={onLoadMore}
            className="h-11 rounded-[var(--bd-radius-lg)] px-8 font-bold border-bd-border text-bd-text-muted hover:bg-bd-surface-muted"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              loadMoreLabel
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Memoize with referential equality on results array
export default memo(QueryListContainerInner, (prev, next) => {
  // Only re-render if results reference changes or pagination state changes
  return (
    prev.results === next.results &&
    prev.hasMore === next.hasMore &&
    prev.loadingMore === next.loadingMore
  );
}) as typeof QueryListContainerInner;
