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
        active ? 'bg-[hsl(var(--bd-status-warning-bg))] shadow-sm' : 'bg-[hsl(var(--bd-text-muted))]',
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
        'w-full border-b border-[hsl(var(--bd-border))] px-4 py-[12px] text-left transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--bd-button-primary-bg))]',
        isSelected
          ? 'border-l-[3px] border-l-[hsl(var(--bd-button-primary-bg))] bg-[hsl(var(--bd-status-info-bg))] pl-[13px] shadow-sm'
          : 'border-l-[3px] border-l-transparent bg-[hsl(var(--bd-card-bg))] hover:bg-[hsl(var(--bd-surface-muted))]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3 leading-snug">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-[6px]">
            <FlagDot active={isFlagged} />
            <span className="truncate text-[13px] font-bold leading-tight text-[hsl(var(--bd-text))]">{item.name}</span>
          </div>
          
          <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11px] text-[hsl(var(--bd-text-muted))]">
            <span className="font-['JetBrains_Mono'] text-[hsl(var(--bd-text-muted))]/80">
              {formatItemPrice(item.last_sold_price, 'No sales')}
            </span>

            {diff && diff.direction !== 'flat' && (
              <span className="font-['JetBrains_Mono'] text-[10px]">
                {diff.direction === 'up' ? '↑' : '↓'}{Math.abs(diff.pct)}%
              </span>
            )}

            <span className="text-[hsl(var(--bd-border))]">·</span>
            
            <span className="flex-shrink-0">
              {formatCompactUsageCount(item.usage_count)}
            </span>
            
            <span className="text-[hsl(var(--bd-border))]">·</span>

            <span className="flex-shrink-0">
              {formatLastUsedDate(item.last_used_at)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="font-['JetBrains_Mono'] text-[13px] font-bold text-[hsl(var(--bd-text))]">
            {formatItemPrice(item.standard_price)}
          </span>
          {isFlagged && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNeedsCleanup?.(item.item_id);
              }}
              className="flex-shrink-0 rounded-[var(--bd-radius-sm)] bg-[hsl(var(--bd-status-warning-bg))] px-[5px] py-[1.5px] text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--bd-status-warning-text))] border border-[hsl(var(--bd-status-warning-border))] transition-colors hover:opacity-80"
            >
              Review
            </button>
          )}
        </div>
      </div>
    </button>
  )
}
