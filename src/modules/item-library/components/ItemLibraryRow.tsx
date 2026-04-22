import type { ItemCatalogItem } from '../types'
import {
  formatCompactUsageCount,
  formatItemPrice,
  formatLastUsedDate,
  getPriceDelta,
} from './itemLibraryFormatters'

type ItemLibraryRowProps = {
  item: ItemCatalogItem
  isSelected: boolean
  onSelect: (itemId: string) => void
}

function FlagDot() {
  return <span className="inline-block h-[6px] w-[6px] flex-shrink-0 rounded-full bg-[#4338ca]" aria-hidden="true" />
}

export function ItemLibraryRow({ item, isSelected, onSelect }: ItemLibraryRowProps) {
  const diff = getPriceDelta(item.standard_price, item.last_sold_price)

  return (
    <button
      type="button"
      onClick={() => onSelect(item.item_id)}
      aria-pressed={isSelected}
      className={[
        'w-full border-b border-[#e8e4dc] px-4 py-[10px] text-left transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4338ca]',
        isSelected
          ? 'border-l-[3px] border-l-[#4338ca] bg-[#eef2ff] pl-[13px]'
          : 'border-l-[3px] border-l-transparent hover:bg-[#f5f3ef]',
      ].join(' ')}
    >
      <div className="mb-[5px] flex items-center gap-[6px] leading-snug">
        <FlagDot />
        <span className="truncate text-[13px] font-bold leading-tight text-[#1a1814]">{item.name}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="font-['JetBrains_Mono'] text-[11px] font-semibold text-[#57534a]">
          {formatItemPrice(item.standard_price)}
        </span>

        <span className="px-[2px] text-[10px] text-[#c4bfb5]">.</span>

        <span className="text-[11px] text-[#8a8277]">Last</span>
        <span className="font-['JetBrains_Mono'] text-[11px] font-semibold text-[#57534a]">
          {formatItemPrice(item.last_sold_price, 'No sales yet')}
        </span>

        {diff && diff.direction !== 'flat' ? (
          <span
            className={[
              'rounded-[3px] px-[5px] py-[1px] font-["JetBrains_Mono"] text-[10px] font-bold',
              diff.direction === 'up'
                ? 'bg-[#d1fae5] text-[#059669]'
                : 'bg-[#fce7f3] text-[#be185d]',
            ].join(' ')}
          >
            {diff.direction === 'up' ? '▲' : '▼'}
            {Math.abs(diff.pct)}%
          </span>
        ) : null}

        <span className="px-[2px] text-[10px] text-[#c4bfb5]">.</span>

        <span
          className={[
            'rounded-[4px] border px-[7px] py-[1px] font-["JetBrains_Mono"] text-[10px] font-bold',
            isSelected
              ? 'border-[#c7d2fe] bg-[#eef2ff] text-[#4338ca]'
              : 'border-[#e8e4dc] bg-[#edeae4] text-[#8a8277]',
          ].join(' ')}
        >
          {formatCompactUsageCount(item.usage_count)}
        </span>

        <span className="text-[11px] text-[#b8b2a8]">{formatLastUsedDate(item.last_used_at)}</span>
      </div>
    </button>
  )
}
