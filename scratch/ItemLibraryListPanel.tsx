import React, { useMemo, useState } from 'react';
import type { CatalogItem, FilterType } from '../../types/itemLibrary';
import { ItemSearchBar } from './ItemSearchBar';
import { ItemLibraryRow } from './ItemLibraryRow';

interface ItemLibraryListPanelProps {
  items: CatalogItem[];
  selectedId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
}

// ── Skeleton rows for loading state ──────────────────────────────────────────
const SkeletonRow = ({ wide }: { wide?: boolean }) => (
  <div className="border-b border-[#e8e4dc] px-4 py-[10px]">
    <div
      className="mb-2 h-[13px] animate-pulse rounded bg-[#edeae4]"
      style={{ width: wide ? '72%' : '58%' }}
    />
    <div className="h-[10px] w-[48%] animate-pulse rounded bg-[#f0ede8]" />
  </div>
);

// ── Filter chip ───────────────────────────────────────────────────────────────
interface FilterChipProps {
  label: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'inline-flex items-center gap-1 rounded-full border px-[10px] py-1',
      'flex-shrink-0 text-[11px] font-semibold',
      'transition-all duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]',
      active
        ? 'border-[#c7d2fe] bg-[#eef2ff] text-[#4338ca]'
        : 'border-[#dedad2] bg-white text-[#8a8277] hover:bg-[#edeae4] hover:text-[#57534a]',
    ].join(' ')}
  >
    {label}
  </button>
);

// ── Flag icon ─────────────────────────────────────────────────────────────────
const FlagIcon = () => (
  <svg
    width="9"
    height="9"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// ── Main component ────────────────────────────────────────────────────────────
export const ItemLibraryListPanel: React.FC<ItemLibraryListPanelProps> = ({
  items,
  selectedId,
  isLoading,
  onSelect,
}) => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredItems = useMemo(() => {
    let result = items;

    // text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        item.name.toLowerCase().includes(q)
      );
    }

    // source filter
    if (activeFilter === 'invoice') {
      result = result.filter((item) => item.lastSourceType === 'invoice');
    } else if (activeFilter === 'quotation') {
      result = result.filter((item) => item.lastSourceType === 'quotation');
    } else if (activeFilter === 'flagged') {
      result = result.filter((item) => item.isPossibleDuplicate);
    }

    return result;
  }, [items, search, activeFilter]);

  const flaggedCount = items.filter((i) => i.isPossibleDuplicate).length;

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-[#dedad2] bg-[#faf9f7]">

      {/* ── Header ── */}
      <div className="flex-shrink-0 border-b border-[#e8e4dc] px-4 pb-3 pt-4">
        <div className="mb-[10px] flex items-center justify-between">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8a8277]">
            Catalog
          </span>
          <span className="font-['JetBrains_Mono'] text-[11px] text-[#b8b2a8]">
            {isLoading ? '—' : `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        <ItemSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search items…"
        />
      </div>

      {/* ── Filter chips ── */}
      <div className="flex flex-shrink-0 gap-[6px] overflow-x-auto px-4 pb-[10px] pt-[10px]">
        <FilterChip
          label="All"
          active={activeFilter === 'all'}
          onClick={() => setActiveFilter('all')}
        />
        <FilterChip
          label="Invoice"
          active={activeFilter === 'invoice'}
          onClick={() => setActiveFilter('invoice')}
        />
        <FilterChip
          label="Quotation"
          active={activeFilter === 'quotation'}
          onClick={() => setActiveFilter('quotation')}
        />
        {flaggedCount > 0 && (
          <FilterChip
            label={
              <>
                <FlagIcon />
                Flagged
                <span className="ml-1 font-['JetBrains_Mono'] text-[10px]">
                  {flaggedCount}
                </span>
              </>
            }
            active={activeFilter === 'flagged'}
            onClick={() => setActiveFilter('flagged')}
          />
        )}
      </div>

      {/* ── Scrollable item list ── */}
      <div
        className="flex-1 overflow-y-auto"
        role="listbox"
        aria-label="Item catalog"
      >
        {isLoading ? (
          // Loading skeletons
          <>
            <SkeletonRow wide />
            <SkeletonRow />
            <SkeletonRow wide />
            <SkeletonRow />
            <SkeletonRow wide />
            <SkeletonRow />
          </>
        ) : filteredItems.length === 0 ? (
          // No results
          <div className="px-4 py-10 text-center">
            <p className="text-[13px] font-semibold text-[#8a8277]">
              {search ? 'No matching items' : 'No items yet'}
            </p>
            {!search && (
              <p className="mt-1 text-[11px] text-[#b8b2a8]">
                Items appear as you create invoices and quotations.
              </p>
            )}
          </div>
        ) : (
          // Item rows
          filteredItems.map((item) => (
            <ItemLibraryRow
              key={item.id}
              item={item}
              isSelected={item.id === selectedId}
              onClick={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ItemLibraryListPanel;
