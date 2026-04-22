import React from 'react';
import type { CatalogItem } from '../../types/itemLibrary';

interface ItemLibraryRowProps {
  item: CatalogItem;
  isSelected: boolean;
  onClick: (id: string) => void;
}

const fmt = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 });

const priceDiff = (standard: number, last: number) => {
  if (standard === 0) return null;
  const pct = Math.round(((last - standard) / standard) * 100);
  if (pct === 0) return null;
  return { pct, dir: pct > 0 ? 'up' : 'down' };
};

const FlagDot = () => (
  <span
    className="inline-block h-[6px] w-[6px] flex-shrink-0 rounded-full bg-[#d97706]"
    aria-label="Possible duplicate"
  />
);

export const ItemLibraryRow: React.FC<ItemLibraryRowProps> = ({
  item,
  isSelected,
  onClick,
}) => {
  const diff = priceDiff(item.standardPrice, item.lastPrice);

  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      aria-selected={isSelected}
      className={[
        'w-full text-left',
        'border-b border-[#e8e4dc] px-4 py-[10px]',
        'transition-colors duration-[120ms]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4338ca]',
        // Selected state — left border + indigo tint + right caret
        isSelected
          ? 'border-l-[3px] border-l-[#4338ca] bg-[#eef2ff] pl-[13px]'
          : 'border-l-[3px] border-l-transparent hover:bg-[#f5f3ef]',
        // Flagged (not selected) gets amber left rule
        !isSelected && item.isPossibleDuplicate
          ? 'border-l-[#d97706]'
          : '',
      ].join(' ')}
    >
      {/* Item name row */}
      <div className="mb-[5px] flex items-center gap-[6px] leading-snug">
        {item.isPossibleDuplicate && <FlagDot />}
        <span
          className={[
            'text-[13px] font-bold leading-tight',
            isSelected ? 'text-[#1a1814]' : 'text-[#1a1814]',
          ].join(' ')}
        >
          {item.name}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Standard price */}
        <span className="font-['JetBrains_Mono'] text-[11px] font-semibold text-[#57534a]">
          {fmt(item.standardPrice)}
        </span>

        <span className="px-[2px] text-[10px] text-[#c4bfb5]">·</span>

        {/* Last label + price */}
        <span className="text-[11px] text-[#8a8277]">Last</span>
        <span className="font-['JetBrains_Mono'] text-[11px] font-semibold text-[#57534a]">
          {fmt(item.lastPrice)}
        </span>

        {/* Price movement indicator */}
        {diff && (
          <span
            className={[
              'rounded-[3px] px-[5px] py-[1px]',
              'font-["JetBrains_Mono"] text-[10px] font-bold',
              diff.dir === 'up'
                ? 'bg-[#d1fae5] text-[#059669]'
                : 'bg-[#fce7f3] text-[#be185d]',
            ].join(' ')}
          >
            {diff.dir === 'up' ? '▲' : '▼'}
            {Math.abs(diff.pct)}%
          </span>
        )}

        <span className="px-[2px] text-[10px] text-[#c4bfb5]">·</span>

        {/* Usage count badge */}
        <span
          className={[
            'rounded-[4px] border px-[7px] py-[1px]',
            'font-["JetBrains_Mono"] text-[10px] font-bold',
            isSelected
              ? 'border-[#c7d2fe] bg-[#eef2ff] text-[#4338ca]'
              : 'border-[#e8e4dc] bg-[#edeae4] text-[#8a8277]',
          ].join(' ')}
        >
          {item.usageCount}×
        </span>

        {/* Last used date */}
        <span className="text-[11px] text-[#b8b2a8]">{item.lastUsedDate}</span>
      </div>
    </button>
  );
};

export default ItemLibraryRow;
