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
            className="h-7 border-none bg-transparent p-0 text-[14px] font-black tracking-tight text-[var(--bd-indigo)] focus-visible:ring-0 placeholder:text-[var(--bd-indigo)] placeholder:opacity-30"
          />
        </div>

        <div className="flex items-center gap-2">
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
      <div className="relative bg-[var(--bd-surface)]">
        {/* Left Indigo Rule for family connection */}
        <div className="absolute bottom-0 left-0 top-0 w-1 bg-[var(--bd-indigo-border)]" />
        
        <div className="space-y-0">
          {items.length === 0 ? (
            <div className="flex h-20 items-center justify-center px-4 py-6 text-center text-[12px] font-medium text-[var(--bd-text3)] italic">
              No items in this group. Tap "Add to Group" below to begin.
            </div>
          ) : (
            items.map(({ item, index, number, isFirst, isLast }) => (
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
            ))
          )}
        </div>
      </div>

      {/* Group Footer - Visual Closing Treatment */}
      <div className="flex items-center justify-between border-t border-[var(--bd-indigo-border)] bg-gradient-to-tr from-[#f8faff] to-[var(--bd-indigo-bg)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleGroupSubtotal(group.id)}
            className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[9px] font-extrabold uppercase tracking-wider transition-all ${
              subtotalOn
                ? 'border-[var(--bd-indigo)] bg-[var(--bd-indigo)] text-white shadow-sm'
                : 'border-[var(--bd-indigo-border)] bg-white text-[var(--bd-indigo)]'
            }`}
          >
            Subtotal
          </button>
          
          {subtotalOn && (
            <div className="flex items-center gap-2 transition-all animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-[10px] font-bold text-[var(--bd-indigo)] opacity-50 uppercase tracking-tighter">Group Total:</span>
              <span className="text-[14px] font-black text-[var(--bd-indigo)] tracking-tight">
                {Number(groupSubtotal || 0).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onAddItemToGroup(group.id)}
          className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--bd-indigo-border)] bg-white px-3 text-[11px] font-bold text-[var(--bd-indigo)] shadow-sm transition-all hover:bg-[var(--bd-indigo-bg)] active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add item to group</span>
        </button>
      </div>
    </div>
  )
}
