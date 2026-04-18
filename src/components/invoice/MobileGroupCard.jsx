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
    <div className="mt-4 overflow-hidden rounded-[20px] border border-[#dce4f5] bg-[#f1f5fb] p-1.5 shadow-sm">
      {/* Group Header */}
      <div className="flex flex-col gap-2 rounded-[16px] bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <Input
              value={group.name || ''}
              onChange={(event) => onUpdateGroupName(group.id, event.target.value)}
              placeholder="Group name (e.g. Electrical Materials)"
              className="h-10 border-none bg-transparent p-0 text-[16px] font-black tracking-tight text-[#0f172a] focus-visible:ring-0"
            />
          </div>

          <div className="flex items-center gap-2">
            {subtotalOn && (
              <div className="hidden items-center gap-1.5 px-2 text-[12px] font-bold text-[#2563eb] sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
                <span>NGN {Number(groupSubtotal || 0).toLocaleString()}</span>
              </div>
            )}
            
            <button
              type="button"
              onClick={() => onToggleGroupSubtotal(group.id)}
              className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-all ${
                subtotalOn
                  ? 'border-[#2563eb] bg-[#2563eb] text-white'
                  : 'border-[#cbd5e1] bg-white text-[#64748b]'
              }`}
            >
              <span>Subtotal</span>
            </button>

            <button
              type="button"
              onClick={() => onDeleteGroup(group.id)}
              className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[#fecaca] bg-[#fff5f5] text-[#ef4444] transition-colors hover:bg-[#fee2e2]"
              aria-label="Delete group"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Small subtotal summary for mobile/compact */}
        {subtotalOn && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#2563eb] sm:hidden">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
            <span>Subtotal: NGN {Number(groupSubtotal || 0).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Group Body */}
      <div className="mt-1.5 space-y-1.5 px-1 py-1">
        {items.length === 0 ? (
          <div className="flex h-16 items-center justify-center rounded-[14px] border border-dashed border-[#cbd8ee] bg-white/50 text-[11px] font-medium text-[#94a3b8]">
            No items in this group.
          </div>
        ) : (
          <div className="relative space-y-2 pl-3">
            {/* Left rule for family connection */}
            <div className="absolute left-1 top-2 bottom-2 w-[2px] rounded-full bg-[#cbd8ee]" />
            
            {items.map(({ item, index, number, isFirst, isLast }) => (
              <div
                key={item._uiKey || item.id || index}
                className="overflow-hidden rounded-[14px] border border-[#e2e8f0] bg-white shadow-sm"
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
      </div>

      {/* Group Footer Actions */}
      <div className="p-1 px-1">
        <button
          type="button"
          onClick={() => onAddItemToGroup(group.id)}
          className="flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-[#cbd8ee] bg-white/60 py-2.5 text-[13px] font-bold text-[#475569] transition-colors hover:bg-white hover:text-[#0f172a]"
        >
          <Plus className="h-4 w-4" />
          <span>Add item to group</span>
        </button>
      </div>
    </div>
  )
}
