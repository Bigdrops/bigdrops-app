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
  flaggedItemIds?: Set<string>
}

function SkeletonRow({ wide }: { wide?: boolean }) {
  return (
    <div className="border-b border-[#d9cbb9] px-4 py-[10px]">
      <div className="mb-2 h-[13px] animate-pulse rounded bg-[#e5d8c7]" style={{ width: wide ? '72%' : '58%' }} />
      <div className="h-[10px] w-[48%] animate-pulse rounded bg-[#efe4d5]" />
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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8c6a45]',
        active
          ? 'border-[#c7ab85] bg-[#e8d5bc] text-[#5f4730] shadow-[inset_0_1px_0_rgba(255,255,255,0.48)]'
          : 'border-[#d7c7b3] bg-[#fbf6ee] text-[#8b7863] hover:bg-[#efe4d4] hover:text-[#574633]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

export function ItemLibraryListPanel({
  items,
  duplicateGroups,
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
  flaggedItemIds,
}: ItemLibraryListPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-[#d5c4af] bg-[linear-gradient(180deg,_#f6ede1_0%,_#f0e5d6_100%)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.35)]">
      <div className="flex-shrink-0 border-b border-[#ddd0bf] px-4 pb-3 pt-4">
        <div className="mb-[10px] flex items-center justify-between">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a745f]">Catalog</span>
          <span className="font-['JetBrains_Mono'] text-[11px] text-[#aa9984]">
            {loading ? '-' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        <ItemSearchBar value={searchText} onChange={onSearchTextChange} placeholder="Search items..." />
      </div>

      <div className="flex flex-shrink-0 gap-2 overflow-x-auto border-b border-[#e3d5c5]/80 px-4 py-[10px]">
        <FilterChip label="Items" active={viewMode === 'catalog'} onClick={() => onViewModeChange('catalog')} />
        <FilterChip
          label={`Possible Duplicates${duplicateGroups.length ? ` (${duplicateGroups.length})` : ''}`}
          active={viewMode === 'duplicates'}
          onClick={() => onViewModeChange('duplicates')}
        />
        <FilterChip
          label="Advanced Cleanup"
          active={viewMode === 'advanced_cleanup'}
          onClick={() => onViewModeChange('advanced_cleanup')}
        />
        <FilterChip
          label="Merge History"
          active={viewMode === 'merge_history'}
          onClick={() => onViewModeChange('merge_history')}
        />
      </div>

      <div className="flex flex-shrink-0 gap-[6px] overflow-x-auto border-b border-[#e3d5c5]/80 px-4 pb-[10px] pt-[10px]">
        <FilterChip label="All" active={activeFilter === 'all'} onClick={() => onFilterChange('all')} />
        <FilterChip
          label="Needs cleanup"
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
        ) : viewMode === 'duplicates' || viewMode === 'advanced_cleanup' ? (
          duplicateGroups.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] font-semibold text-[#75624f]">No duplicate candidates found</p>
              <p className="mt-1 text-[11px] text-[#a79580]">
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
            <p className="text-[13px] font-semibold text-[#75624f]">
              {searchText ? 'No matching items' : 'No items yet'}
            </p>
            {!searchText ? (
              <p className="mt-1 text-[11px] text-[#a79580]">
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
            />
          ))
        )}
      </div>
    </div>
  )
}
