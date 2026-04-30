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
  isFlagged?: boolean
  onSelect: (itemId: string) => void
  onNeedsCleanup?: (itemId: string) => void
}

function FlagDot({ active }: { active?: boolean }) {
  return (
    <span
      className={[
        'inline-block h-[6px] w-[6px] flex-shrink-0 rounded-full',
        active ? 'bg-[#a06d2b] shadow-[0_0_8px_rgba(160,109,43,0.4)]' : 'bg-[#8c6a45]',
      ].join(' ')}
      aria-hidden="true"
    />
  )
}

export function ItemLibraryRow({ item, isSelected, isFlagged, onSelect, onNeedsCleanup }: ItemLibraryRowProps) {
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
      <div className="flex items-start justify-between gap-3 leading-snug">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-[6px]">
            <FlagDot active={isFlagged} />
            <span className="truncate text-[13px] font-bold leading-tight text-[#2c2218]">{item.name}</span>
          </div>
          
          <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11px] text-[#8a8277]">
            <span className="font-['JetBrains_Mono'] text-[#6f6458]">
              {formatItemPrice(item.last_sold_price, 'No sales')}
            </span>

            {diff && diff.direction !== 'flat' && (
              <span className="font-['JetBrains_Mono'] text-[10px]">
                {diff.direction === 'up' ? '↑' : '↓'}{Math.abs(diff.pct)}%
              </span>
            )}

            <span className="text-[#c8b59f]">·</span>
            
            <span className="flex-shrink-0">
              {formatCompactUsageCount(item.usage_count)}
            </span>
            
            <span className="text-[#c8b59f]">·</span>

            <span className="flex-shrink-0">
              {formatLastUsedDate(item.last_used_at)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="font-['JetBrains_Mono'] text-[13px] font-bold text-[#2c2218]">
            {formatItemPrice(item.standard_price)}
          </span>
          {isFlagged && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNeedsCleanup?.(item.item_id);
              }}
              className="flex-shrink-0 rounded-[4px] bg-[#fdf2e2] px-[5px] py-[1.5px] text-[9px] font-bold uppercase tracking-wider text-[#a06d2b] border border-[#f5e4cd] transition-colors hover:bg-[#f5e4cd]"
            >
              Review
            </button>
          )}
        </div>
      </div>
    </button>
  )
}
