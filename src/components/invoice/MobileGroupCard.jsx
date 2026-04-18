import { Plus, Trash2 } from 'lucide-react'
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
    <div className="mt-3 rounded-[18px] border border-[#CBD8EE] bg-[#EEF3FB] p-2 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      <div className="rounded-[14px] border border-[#D7E3F5] bg-white px-3 py-3">
        <div className="flex items-center gap-2">
          <Input
            value={group.name || ''}
            onChange={(event) => onUpdateGroupName(group.id, event.target.value)}
            placeholder="Group name"
            className="h-10 min-w-0 flex-1 rounded-[12px] border border-[#DCE4F5] bg-white px-3 text-[14px] font-bold text-[#0f172a]"
          />

          <button
            type="button"
            onClick={() => onToggleGroupSubtotal(group.id)}
            aria-pressed={subtotalOn}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors ${
              subtotalOn
                ? 'border-[#2563EB] bg-[#2563EB] text-white'
                : 'border-[#CBD5E1] bg-white text-[#334155]'
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                subtotalOn ? 'bg-white' : 'bg-[#94A3B8]'
              }`}
            />
            <span>{subtotalOn ? 'Subtotal on' : 'Subtotal off'}</span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteGroup(group.id)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-[#fecaca] bg-[#fff5f5] text-[#ef4444] transition-colors hover:bg-[#fee2e2]"
            aria-label="Delete group"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-1 pb-2 pt-2">
        {items.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#C9D7EC] bg-white px-3 py-3 text-xs text-[#64748b]">
            No items in this group.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(({ item, index, number, isFirst, isLast }) => (
              <div
                key={item._uiKey || item.id || index}
                className="rounded-[14px] border border-[#E7EEF7] bg-white"
              >
                <MobileItemCard
                  item={item}
                  index={index}
                  number={number}
                  invoice={invoice}
                  enableItemSuggestions={enableItemSuggestions}
                  customColumns={customColumns}
                  computedAmount={getComputedAmount(item)}
                  groupName={group.name || ''}
                  isFirst={isFirst}
                  isLast={isLast}
                  onUpdate={onUpdateItem}
                  onRemove={onRemoveItem}
                  onMoveUp={(itemIndex) => onMoveItem(itemIndex, -1)}
                  onMoveDown={(itemIndex) => onMoveItem(itemIndex, 1)}
                  onInsertBelow={onInsertItemAfter}
                  isVisible={isVisible}
                  getColumn={getColumn}
                />
              </div>
            ))}
          </div>
        )}

        {subtotalOn ? (
          <div className="mt-2 flex items-center justify-between rounded-[14px] border border-[#C9D7EC] bg-white px-3 py-2.5">
            <span className="text-[13px] font-semibold text-[#475569]">Group subtotal</span>
            <span className="text-[15px] font-bold text-[#0f172a]">
              NGN {Number(groupSubtotal || 0).toLocaleString()}
            </span>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onAddItemToGroup(group.id)}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#B9C8DE] bg-white py-3 text-sm font-bold text-[#0f172a] transition-colors hover:bg-[#f8fafc]"
      >
        <Plus className="h-4 w-4" />
        Add item to group
      </button>
    </div>
  )
}
