import React, { useCallback, useEffect, useState } from 'react';
import type { CatalogItem } from '../../types/itemLibrary';
import { ItemLibraryListPanel } from './ItemLibraryListPanel';
import { ItemLibraryDetailPanel } from './ItemLibraryDetailPanel';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ItemLibraryPageProps {
  /**
   * Async function that resolves to the full catalog.
   * The component handles loading state internally.
   */
  fetchItems: () => Promise<CatalogItem[]>;
  /**
   * Called when the user clicks a history row's document reference.
   * The parent is responsible for navigation.
   */
  onNavigateToDocument?: (docNumber: string) => void;
  /**
   * Called when the user clicks the Export button.
   * Receives the current catalog for the parent to handle download.
   */
  onExport?: (items: CatalogItem[]) => void;
  /**
   * Optional callback when the page mounts — for breadcrumb/title sync.
   */
  onMount?: () => void;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const BackArrow = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

const DownloadIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// ── Default export handler ────────────────────────────────────────────────────

const defaultExport = (items: CatalogItem[]) => {
  const json = JSON.stringify(items, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `item-library-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Component ─────────────────────────────────────────────────────────────────

export const ItemLibraryPage: React.FC<ItemLibraryPageProps> = ({
  fetchItems,
  onNavigateToDocument,
  onExport,
  onMount,
}) => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mobile: show detail sheet when item selected
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // ── Load data ──
  useEffect(() => {
    onMount?.();
    let cancelled = false;

    setIsLoadingList(true);
    setError(null);

    fetchItems()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        // Auto-select first item on desktop
        if (data.length > 0 && window.innerWidth >= 768) {
          setSelectedId(data[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load items. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingList(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchItems, onMount]);

  // ── Select item ──
  const handleSelect = useCallback(
    (id: string) => {
      if (id === selectedId) return;

      setSelectedId(id);
      setIsLoadingDetail(true);
      setMobileDetailOpen(true);

      // Simulate async detail fetch (replace with real fetch if needed)
      setTimeout(() => setIsLoadingDetail(false), 250);
    },
    [selectedId]
  );

  // ── Navigate to document ──
  const handleNavigate = useCallback(
    (docNumber: string) => {
      onNavigateToDocument?.(docNumber);
    },
    [onNavigateToDocument]
  );

  // ── Export ──
  const handleExport = useCallback(() => {
    (onExport ?? defaultExport)(items);
  }, [items, onExport]);

  // ── Derived: selected item ──
  const selectedItem = items.find((i) => i.id === selectedId) ?? null;
  const totalCount = items.length;

  // ── Error state ──
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f3ef] p-8">
        <div className="text-center">
          <p className="mb-2 text-[14px] font-bold text-[#57534a]">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-[13px] font-semibold text-[#4338ca] underline"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f5f3ef] font-['Plus_Jakarta_Sans']">

      {/* ── Top navigation bar ── */}
      <header className="flex h-[54px] flex-shrink-0 items-center gap-0 border-b border-[#e8e4dc] bg-[#faf9f7] px-5">
        {/* Back button — parent provides navigation, this is structural */}
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Go back"
          className={[
            'mr-0 flex items-center gap-[6px] rounded-[8px] border-none',
            'bg-transparent px-[10px] py-[6px]',
            'text-[13px] font-semibold text-[#8a8277]',
            'cursor-pointer transition-all duration-150',
            'hover:bg-[#edeae4] hover:text-[#1a1814]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]',
          ].join(' ')}
        >
          <BackArrow />
          Back
        </button>

        {/* Title + count */}
        <div className="flex flex-1 items-center justify-center gap-2 pointer-events-none">
          <h1 className="text-[14px] font-extrabold tracking-[-0.01em] text-[#1a1814]">
            Item Library
          </h1>
          {!isLoadingList && (
            <span
              className={[
                'rounded-full border border-[#dedad2] bg-[#edeae4]',
                'px-[9px] py-[2px]',
                'font-["JetBrains_Mono"] text-[10px] font-bold text-[#8a8277]',
              ].join(' ')}
            >
              {totalCount} {totalCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {/* Export button */}
        <button
          type="button"
          onClick={handleExport}
          disabled={isLoadingList || items.length === 0}
          aria-label="Export catalog as JSON"
          className={[
            'flex items-center gap-[6px] rounded-[8px] border border-[#dedad2]',
            'bg-white px-3 py-[7px]',
            'text-[12px] font-bold text-[#57534a]',
            'shadow-[0_1px_3px_rgba(0,0,0,.05)]',
            'cursor-pointer transition-all duration-150',
            'hover:bg-[#edeae4] hover:text-[#1a1814]',
            'disabled:cursor-not-allowed disabled:opacity-40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]',
          ].join(' ')}
        >
          <DownloadIcon />
          <span className="hidden sm:inline">Export</span>
        </button>
      </header>

      {/* ── Main workspace ── */}
      {/*
        Desktop: two-column side-by-side (38% list / 62% detail)
        Mobile: stacked, detail opens as an overlay sheet
      */}
      <main className="flex min-h-0 flex-1 overflow-hidden">

        {/* Left: list panel */}
        <div
          className={[
            // Desktop: fixed proportion, always visible
            'md:w-[38%] md:flex-shrink-0',
            // Mobile: full width when detail closed, hidden when detail open
            mobileDetailOpen ? 'hidden md:flex' : 'flex w-full',
            'flex-col overflow-hidden',
          ].join(' ')}
        >
          <ItemLibraryListPanel
            items={items}
            selectedId={selectedId}
            isLoading={isLoadingList}
            onSelect={handleSelect}
          />
        </div>

        {/* Right: detail panel — desktop always visible, mobile slide-in */}
        <div
          className={[
            // Desktop: always visible, fills remainder
            'md:flex md:flex-1 md:flex-col md:overflow-hidden',
            // Mobile: conditionally shown
            mobileDetailOpen ? 'flex w-full flex-col overflow-hidden' : 'hidden',
          ].join(' ')}
        >
          {/* Mobile back-to-list button */}
          <div className="flex-shrink-0 border-b border-[#e8e4dc] bg-[#faf9f7] md:hidden">
            <button
              type="button"
              onClick={() => {
                setMobileDetailOpen(false);
                setSelectedId(null);
              }}
              className={[
                'flex items-center gap-[6px] px-4 py-3',
                'text-[13px] font-semibold text-[#8a8277]',
                'cursor-pointer transition-colors hover:text-[#1a1814]',
                'border-none bg-transparent',
              ].join(' ')}
            >
              <BackArrow />
              All Items
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <ItemLibraryDetailPanel
              item={selectedItem}
              isLoading={isLoadingDetail}
              onNavigateToDocument={handleNavigate}
            />
          </div>
        </div>

      </main>
    </div>
  );
};

export default ItemLibraryPage;
