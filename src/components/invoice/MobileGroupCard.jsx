import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import MobileItemCard from './MobileItemCard'

export default function MobileGroupCard({
  group,
  items,
  invoice,
  enableItemSuggestions = false,
  customColumns,
  groupSubtotal,
  onUpdateGroupName,
  onToggleGroupSubtotal,
  onDeleteGroup,
  onAddItemToGroup,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
  onInsertItemAfter,
  isVisible,
  getColumn,
  getComputedAmount,
}) {
  const subtotalOn = !!group.showSubtotal

  return (
    <div className="border-b border-[var(--bd-border-soft)] bg-[var(--bd-bg)]">
      {/* Group Header */}
      <div className="flex items-center gap-3 border-b border-[var(--bd-indigo-border)] bg-gradient-to-br from-[var(--bd-indigo-bg)] to-[#f0f4ff] px-4 py-3">
        <div className="h-7 w-1 rounded-full bg-[var(--bd-indigo)]" />
        <div className="min-w-0 flex-1">
          <Input
            value={group.name || ''}
            onChange={(event) => onUpdateGroupName(group.id, event.target.value)}
            placeholder="e.g. Electrical Materials"
            className="h-7 border-none bg-transparent p-0 text-[14px] font-black tracking-tight text-[var(--bd-indigo)] focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleGroupSubtotal(group.id)}
            className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[10px] font-extrabold uppercase tracking-wider transition-all ${
              subtotalOn
                ? 'border-[var(--bd-indigo)] bg-[var(--bd-indigo)] text-white'
                : 'border-[var(--bd-indigo-border)] bg-[var(--bd-surface)] text-[var(--bd-indigo)]'
            }`}
          >
            Subtotal
          </button>

          <button
            type="button"
            onClick={() => onDeleteGroup(group.id)}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent bg-transparent text-[var(--bd-text4)] transition-colors hover:bg-[var(--bd-rose-bg)] hover:text-[var(--bd-rose)]"
            aria-label="Delete group"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Group Body */}
      <div className="space-y-0 bg-[var(--bd-surface)]">
        {items.length === 0 ? (
          <div className="flex h-20 items-center justify-center px-4 py-6 text-center text-[12px] font-medium text-[var(--bd-text3)] italic">
            No items in this group. Tap "Add item to group" below to begin.
          </div>
        ) : (
          <div className="relative">
            {/* Left Indigo Rule for family connection */}
            <div className="absolute bottom-0 left-0 top-0 w-1 bg-[var(--bd-indigo-border)]" />
            
            <div className="space-y-0">
              {items.map(({ item, index, number, isFirst, isLast }) => (
                <MobileItemCard
                  key={item._uiKey || item.id || index}
                  item={item}
                  index={index}
                  number={number}
                  invoice={invoice}
                  enableItemSuggestions={enableItemSuggestions}
                  customColumns={customColumns}
                  computedAmount={getComputedAmount(item)}
                  isFirst={isFirst}
                  isLast={isLast}
                  onUpdate={onUpdateItem}
                  onRemove={onRemoveItem}
                  onMoveUp={(itemIdx) => onMoveItem(itemIdx, -1)}
                  onMoveDown={(itemIdx) => onMoveItem(itemIdx, 1)}
                  onInsertBelow={onInsertItemAfter}
                  isVisible={isVisible}
                  getColumn={getColumn}
                />
              ))}
            </div>
            
            {subtotalOn && (
              <div className="flex items-center justify-between border-t border-[var(--bd-indigo-border)] bg-[var(--bd-indigo-bg)] px-4 py-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--bd-indigo)]">Subtotal</span>
                <span className="text-[13px] font-bold text-[var(--bd-indigo)]">
                  {Number(groupSubtotal || 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Group Footer Actions */}
      <div className="border-t border-[var(--bd-border-soft)] bg-[var(--bd-bg)] p-3">
        <button
          type="button"
          onClick={() => onAddItemToGroup(group.id)}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--bd-radius)] border border-dashed border-[var(--bd-indigo-border)] bg-[var(--bd-surface)] py-2 text-[12px] font-bold text-[var(--bd-indigo)] transition-all hover:bg-[var(--bd-indigo-bg)]"
        >
          <Plus className="h-4 w-4" />
          <span>Add item to group</span>
        </button>
      </div>
    </div>
  )
}
