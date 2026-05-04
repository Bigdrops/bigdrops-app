import type {
  DuplicateCandidateGroup,
  ItemCatalogItem,
  ItemLibraryFilterType,
  ItemLibraryViewMode,
} from '../types'
import { ItemLibraryDuplicateGroupCard } from './ItemLibraryDuplicateGroupCard'
import { ItemLibraryRow } from './ItemLibraryRow'
import { ItemSearchBar } from './ItemSearchBar'

type ItemLibraryListPanelProps = {
  items: ItemCatalogItem[]
  duplicateGroups: DuplicateCandidateGroup[]
  workflowMode: 'library' | 'cleanup'
  viewMode: ItemLibraryViewMode
  selectedItemId: string | null
  selectedDuplicateGroupId: string | null
  loading: boolean
  searchText: string
  activeFilter: ItemLibraryFilterType
  onViewModeChange: (value: ItemLibraryViewMode) => void
  onSearchTextChange: (value: string) => void
  onFilterChange: (value: ItemLibraryFilterType) => void
  onSelectItem: (itemId: string) => void
  onSelectDuplicateGroup: (groupId: string) => void
  onInspectDuplicateItem: (groupId: string, itemId: string) => void
  onNeedsCleanup?: (itemId: string) => void
  flaggedItemIds?: Set<string>
  totalUnresolvedIssues?: number
}

function SkeletonRow({ wide }: { wide?: boolean }) {
  return (
    <div className="border-b border-[hsl(var(--bd-border))] px-4 py-[10px]">
      <div className="mb-2 h-[13px] animate-pulse rounded bg-[hsl(var(--bd-border))]/50" style={{ width: wide ? '72%' : '58%' }} />
      <div className="h-[10px] w-[48%] animate-pulse rounded bg-[hsl(var(--bd-border))]/30" />
    </div>
  )
}

type FilterChipProps = {
  label: string
  active: boolean
  onClick: () => void
}

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-[10px] py-1 text-[11px] font-semibold transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--bd-button-primary-bg))]',
        active
          ? 'border-[hsl(var(--bd-button-primary-bg))] bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] shadow-sm'
          : 'border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))] hover:text-[hsl(var(--bd-text))]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

export function ItemLibraryListPanel({
  items,
  duplicateGroups,
  workflowMode,
  viewMode,
  selectedItemId,
  selectedDuplicateGroupId,
  loading,
  searchText,
  activeFilter,
  onViewModeChange,
  onSearchTextChange,
  onFilterChange,
  onSelectItem,
  onSelectDuplicateGroup,
  onInspectDuplicateItem,
  onNeedsCleanup,
  flaggedItemIds,
  totalUnresolvedIssues = 0,
}: ItemLibraryListPanelProps) {
  const isLibrary = workflowMode === 'library'

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] shadow-none">
      <div className="flex-shrink-0 border-b border-[hsl(var(--bd-border))] px-4 pb-3 pt-4">
        <div className="mb-[10px] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[hsl(var(--bd-text-muted))]">
              {isLibrary ? 'Library' : 'Cleanup Hub'}
            </span>
            <span className="text-[10px] font-medium text-[hsl(var(--bd-text-muted))]/70">
              {loading ? '...' : (
                <>
                  {items.length} items
                  {totalUnresolvedIssues > 0 && (
                    <>
                      <span className="mx-1">·</span>
                      <span className="text-[hsl(var(--bd-status-warning-text))]">{totalUnresolvedIssues} issues</span>
                    </>
                  )}
                </>
              )}
            </span>
          </div>
        </div>

        {isLibrary && (
          <ItemSearchBar value={searchText} onChange={onSearchTextChange} placeholder="Search items..." />
        )}
      </div>

      {isLibrary ? (
        <div className="flex flex-shrink-0 gap-[6px] overflow-x-auto border-b border-[hsl(var(--bd-border))] px-4 pb-[10px] pt-[10px]">
          <FilterChip label="All" active={activeFilter === 'all'} onClick={() => onFilterChange('all')} />
          <FilterChip
            label="Flagged"
            active={activeFilter === 'needs_cleanup'}
            onClick={() => onFilterChange('needs_cleanup')}
          />
          <FilterChip label="Invoice" active={activeFilter === 'invoice'} onClick={() => onFilterChange('invoice')} />
          <FilterChip
            label="Quotation"
            active={activeFilter === 'quotation'}
            onClick={() => onFilterChange('quotation')}
          />
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Item catalog">
        {loading ? (
          <>
            <SkeletonRow wide />
            <SkeletonRow />
            <SkeletonRow wide />
            <SkeletonRow />
            <SkeletonRow wide />
            <SkeletonRow />
          </>
        ) : !isLibrary && viewMode === 'duplicates' ? (
          duplicateGroups.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] font-semibold text-[hsl(var(--bd-text))]">No duplicate candidates found</p>
              <p className="mt-1 text-[11px] text-[hsl(var(--bd-text-muted))]">
                Review similar item names will appear here when the current list has close matches.
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-3">
              {duplicateGroups.map((group) => (
                <ItemLibraryDuplicateGroupCard
                  key={group.group_id}
                  group={group}
                  selectedGroupId={selectedDuplicateGroupId}
                  selectedItemId={selectedItemId}
                  onSelectGroup={onSelectDuplicateGroup}
                  onInspectItem={onInspectDuplicateItem}
                />
              ))}
            </div>
          )
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[13px] font-semibold text-[hsl(var(--bd-text))]">
              {searchText ? 'No matching items' : 'No items yet'}
            </p>
            {!searchText ? (
              <p className="mt-1 text-[11px] text-[hsl(var(--bd-text-muted))]">
                Items appear here as invoices and quotations are created.
              </p>
            ) : null}
          </div>
        ) : (
          items.map((item) => (
            <ItemLibraryRow
              key={item.item_id}
              item={item}
              isSelected={item.item_id === selectedItemId}
              isFlagged={flaggedItemIds?.has(item.item_id)}
              onSelect={onSelectItem}
              onNeedsCleanup={onNeedsCleanup}
            />
          ))
        )}
      </div>
    </div>
  )
}
