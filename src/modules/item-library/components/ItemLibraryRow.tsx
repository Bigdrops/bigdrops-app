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
  return <span className="inline-block h-[6px] w-[6px] flex-shrink-0 rounded-full bg-[#8c6a45]" aria-hidden="true" />
}

export function ItemLibraryRow({ item, isSelected, onSelect }: ItemLibraryRowProps) {
  const diff = getPriceDelta(item.standard_price, item.last_sold_price)

  return (
    <button
      type="button"
      onClick={() => onSelect(item.item_id)}
      aria-pressed={isSelected}
      className={[
        'w-full border-b border-[#dfd1c0] px-4 py-[12px] text-left transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8c6a45]',
        isSelected
          ? 'border-l-[3px] border-l-[#7e6246] bg-[linear-gradient(180deg,_#f9efdf_0%,_#efdfca_100%)] pl-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_12px_24px_rgba(109,85,56,0.10)]'
          : 'border-l-[3px] border-l-transparent bg-[rgba(255,250,243,0.48)] hover:bg-[#f8efe3]',
      ].join(' ')}
    >
      <div className="mb-[5px] flex items-center gap-[6px] leading-snug">
        <FlagDot />
        <span className="truncate text-[13px] font-bold leading-tight text-[#2c2218]">{item.name}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="font-['JetBrains_Mono'] text-[11px] font-semibold text-[#5e4a36]">
          {formatItemPrice(item.standard_price)}
        </span>

        <span className="px-[2px] text-[10px] text-[#c8b59f]">.</span>

        <span className="text-[11px] text-[#87735d]">Last</span>
        <span className="font-['JetBrains_Mono'] text-[11px] font-semibold text-[#4f3d2d]">
          {formatItemPrice(item.last_sold_price, 'No sales yet')}
        </span>

        {diff && diff.direction !== 'flat' ? (
          <span
            className={[
              'rounded-[5px] border px-[5px] py-[1px] font-["JetBrains_Mono"] text-[10px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
              diff.direction === 'up'
                ? 'border-[#b8cfb1] bg-[#dde9d7] text-[#47624a]'
                : 'border-[#e1c3bf] bg-[#f0dbd6] text-[#8b4d47]',
            ].join(' ')}
          >
            {diff.direction === 'up' ? '▲' : '▼'}
            {Math.abs(diff.pct)}%
          </span>
        ) : null}

        <span className="px-[2px] text-[10px] text-[#c8b59f]">.</span>

        <span
          className={[
            'rounded-[999px] border px-[7px] py-[1px] font-["JetBrains_Mono"] text-[10px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]',
            isSelected
              ? 'border-[#b99874] bg-[#e7d4bb] text-[#654b34]'
              : 'border-[#d9c8b4] bg-[#efe4d6] text-[#89745f]',
          ].join(' ')}
        >
          {formatCompactUsageCount(item.usage_count)}
        </span>

        <span className="text-[11px] text-[#aa9882]">{formatLastUsedDate(item.last_used_at)}</span>
      </div>
    </button>
  )
}
