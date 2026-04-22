import React from 'react';
import type { CatalogItem } from '../../types/itemLibrary';
import { ItemHistoryRow } from './ItemHistoryRow';

interface ItemLibraryDetailPanelProps {
  item: CatalogItem | null;
  isLoading: boolean;
  onNavigateToDocument?: (docNumber: string) => void;
}

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 });

const priceDiff = (standard: number, last: number) => {
  if (standard === 0) return { amount: 0, pct: 0, dir: 'flat' as const };
  const amount = last - standard;
  const pct = Math.round((amount / standard) * 100);
  const dir = pct > 0 ? 'up' : pct < 0 ? 'down' : ('flat' as const);
  return { amount, pct, dir };
};

// ── Sub-components ────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="mb-2 pl-[2px] text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#b8b2a8]">
    {children}
  </h3>
);

const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-center gap-[5px]">
    <span className="text-[#b8b2a8]">{icon}</span>
    <span className="text-[11px] text-[#8a8277]">{label}</span>
    <span className="font-['JetBrains_Mono'] text-[11px] font-bold text-[#57534a]">
      {value}
    </span>
  </div>
);

const PriceInsightRow: React.FC<{
  label: string;
  value: string;
  meta?: string;
}> = ({ label, value, meta }) => (
  <div className="flex items-center justify-between border-b border-[#e8e4dc] px-[14px] py-[10px] last:border-b-0">
    <span className="text-[12px] font-medium text-[#8a8277]">{label}</span>
    <div className="text-right">
      <div className="font-['JetBrains_Mono'] text-[13px] font-semibold text-[#1a1814]">
        {value}
      </div>
      {meta && (
        <div className="mt-[2px] font-['JetBrains_Mono'] text-[10px] text-[#b8b2a8]">
          {meta}
        </div>
      )}
    </div>
  </div>
);

// ── Loading skeleton ──────────────────────────────────────────────────────────
const DetailSkeleton = () => (
  <div className="space-y-4 p-5">
    {/* Identity card skeleton */}
    <div className="rounded-[14px] border border-[#dedad2] bg-white p-4">
      <div className="mb-3 h-4 w-[55%] animate-pulse rounded bg-[#edeae4]" />
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="mb-[6px] h-2 w-[50%] animate-pulse rounded bg-[#f0ede8]" />
            <div className="h-4 w-[80%] animate-pulse rounded bg-[#edeae4]" />
          </div>
        ))}
      </div>
      <div className="h-3 w-[40%] animate-pulse rounded bg-[#f0ede8]" />
    </div>
    {/* History rows skeleton */}
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="rounded-[10px] border border-[#dedad2] bg-white p-3"
      >
        <div className="mb-2 h-3 w-[60%] animate-pulse rounded bg-[#edeae4]" />
        <div className="mb-2 h-[11px] w-[80%] animate-pulse rounded bg-[#f0ede8]" />
        <div className="h-3 w-[45%] animate-pulse rounded bg-[#edeae4]" />
      </div>
    ))}
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#edeae4] text-[#b8b2a8]">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </div>
    <div>
      <p className="text-[15px] font-bold text-[#57534a]">Select an item</p>
      <p className="mt-1 max-w-[200px] text-[12px] leading-relaxed text-[#b8b2a8]">
        Choose an item from the list to inspect its pricing history and usage.
      </p>
    </div>
  </div>
);

// ── Duplicate flag card ───────────────────────────────────────────────────────
const DuplicateFlagCard: React.FC<{
  itemName: string;
  candidateName: string;
  candidateUses?: number;
}> = ({ itemName, candidateName, candidateUses = 0 }) => (
  <div className="rounded-[10px] border border-[#fcd34d] bg-[#fffdf5] p-3">
    <div className="mb-2 flex items-center gap-[6px] text-[11px] font-bold text-[#b45309]">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      Possible duplicate detected
    </div>
    <div className="space-y-[4px]">
      {[
        { name: itemName, uses: null },
        { name: candidateName, uses: candidateUses },
      ].map(({ name, uses }, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-[7px] border border-[#e8e4dc] bg-white px-[9px] py-[6px]"
        >
          <span className="flex-1 text-[12px] font-semibold text-[#1a1814]">
            {name}
          </span>
          {uses !== null && (
            <span className="font-['JetBrains_Mono'] text-[10px] text-[#b8b2a8]">
              {uses} uses
            </span>
          )}
          {uses !== null && (
            <button
              type="button"
              className="rounded px-[6px] py-[2px] text-[11px] font-bold text-[#b45309] transition-colors hover:bg-[#fef3c7]"
            >
              Merge →
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ── Doccount icon ─────────────────────────────────────────────────────────────
const DocIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const ClockIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// ── Main component ────────────────────────────────────────────────────────────
export const ItemLibraryDetailPanel: React.FC<ItemLibraryDetailPanelProps> = ({
  item,
  isLoading,
  onNavigateToDocument,
}) => {
  if (isLoading) return <div className="h-full overflow-y-auto bg-[#f5f3ef]"><DetailSkeleton /></div>;
  if (!item) return <div className="h-full bg-[#f5f3ef]"><EmptyState /></div>;

  const diff = priceDiff(item.standardPrice, item.lastPrice);

  // Find the most-recent occurrence per client for price insight
  const lastGlobal = item.history[0];
  const clientGroups = item.history.reduce<Record<string, typeof item.history[0]>>(
    (acc, h) => {
      if (!acc[h.clientName]) acc[h.clientName] = h;
      return acc;
    },
    {}
  );
  const lastClientSale = lastGlobal ? clientGroups[lastGlobal.clientName] : null;

  // Price range
  const prices = item.history.map((h) => h.unitPrice);
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);

  return (
    <div className="h-full overflow-y-auto bg-[#f5f3ef]">
      <div className="space-y-4 p-5">

        {/* ── Identity card ── */}
        <section aria-label="Item identity">
          <div className="rounded-[14px] border border-[#dedad2] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.05)]">
            <h2 className="mb-3 text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-[#1a1814]">
              {item.name}
            </h2>

            {/* Price grid */}
            <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-[8px] border border-[#e8e4dc]">
              <div className="border-r border-[#e8e4dc] px-3 py-[10px]">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#b8b2a8]">
                  Standard
                </p>
                <p className="font-['JetBrains_Mono'] text-[14px] font-semibold text-[#1a1814]">
                  {fmt(item.standardPrice)}
                </p>
              </div>

              <div className="border-r border-[#e8e4dc] px-3 py-[10px]">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#b8b2a8]">
                  Last Sold
                </p>
                <p className="font-['JetBrains_Mono'] text-[14px] font-semibold text-[#4338ca]">
                  {fmt(item.lastPrice)}
                </p>
              </div>

              <div className="px-3 py-[10px]">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#b8b2a8]">
                  Movement
                </p>
                {diff.dir === 'flat' ? (
                  <p className="font-['JetBrains_Mono'] text-[14px] text-[#8a8277]">—</p>
                ) : (
                  <p className="font-['JetBrains_Mono'] text-[14px] font-semibold text-[#1a1814]">
                    {diff.dir === 'up' ? '▲' : '▼'}{' '}
                    {Math.abs(diff.amount).toLocaleString('en-NG')}
                    <span className="ml-1 text-[11px] text-[#8a8277]">
                      ({Math.abs(diff.pct)}%)
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-4">
              <StatItem
                icon={<DocIcon />}
                label="Appears in"
                value={`${item.usageCount} documents`}
              />
              <StatItem
                icon={<ClockIcon />}
                label="Last used"
                value={item.lastUsedDate}
              />
            </div>
          </div>
        </section>

        {/* ── Duplicate flag ── */}
        {item.isPossibleDuplicate && item.duplicateCandidateName && (
          <DuplicateFlagCard
            itemName={item.name}
            candidateName={item.duplicateCandidateName}
            candidateUses={3}
          />
        )}

        {/* ── Price intelligence ── */}
        <section aria-label="Price intelligence">
          <SectionLabel>Price Intelligence</SectionLabel>
          <div className="overflow-hidden rounded-[10px] border border-[#dedad2] bg-white shadow-[0_1px_3px_rgba(0,0,0,.05)]">
            {lastClientSale && lastClientSale !== item.history[0] && (
              <PriceInsightRow
                label={`Last sold to ${lastClientSale.clientName.split(' ')[0]}…`}
                value={fmt(lastClientSale.unitPrice)}
                meta={`${lastClientSale.docNumber} · ${lastClientSale.date}`}
              />
            )}
            {lastGlobal && (
              <PriceInsightRow
                label="Last sold globally"
                value={fmt(lastGlobal.unitPrice)}
                meta={`${lastGlobal.docNumber} · ${lastGlobal.date}`}
              />
            )}
            {prices.length > 1 && (
              <PriceInsightRow
                label="Price range (all time)"
                value={`${fmt(priceMin)} – ${fmt(priceMax)}`}
                meta={`across ${item.history.length} occurrences`}
              />
            )}
          </div>
        </section>

        {/* ── Usage history ── */}
        <section aria-label="Usage history">
          <SectionLabel>
            Usage History · {item.history.length}{' '}
            {item.history.length === 1 ? 'occurrence' : 'occurrences'}
          </SectionLabel>
          <div>
            {item.history.map((entry) => (
              <ItemHistoryRow
                key={entry.id}
                entry={entry}
                onNavigate={onNavigateToDocument}
              />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default ItemLibraryDetailPanel;
