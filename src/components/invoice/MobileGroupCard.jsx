import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import MobileItemCard from './MobileItemCard'

const inputCls = 'h-9 rounded-[10px] border border-[#e2e8f0] bg-white px-3 text-[14px] font-semibold text-[#0f172a]'

export default function MobileGroupCard({
  group,
  items,
  invoice,
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
  return (
    <div className="mt-3 overflow-hidden rounded-[16px] border border-[#f5d7a1] bg-[#fffaf0]">
      <div className="border-l-4 border-[#f59e0b] px-3 py-3">
        <div className="flex items-center gap-2">
          <Input value={group.name || ''} onChange={(event) => onUpdateGroupName(group.id, event.target.value)} placeholder="Group name" className="h-9 min-w-0 flex-1 rounded-[10px] border border-[#f3dfb1] bg-[#fffdf8] px-3 text-[14px] font-extrabold text-[#0f172a]" />
          <label className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#f3dfb1] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#92400e]">
            <input type="checkbox" checked={!!group.showSubtotal} onChange={() => onToggleGroupSubtotal(group.id)} className="h-3.5 w-3.5 rounded border-[#d6b372] text-[#b45309] focus:ring-0" />
            <span>Show subtotal</span>
          </label>
          <div className="shrink-0">
            <button type="button" onClick={() => onDeleteGroup(group.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#f5c7c7] bg-[#fff5f5] text-[#ef4444]">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-0 px-2 pb-2">
        {items.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[#f3dfb1] bg-white px-3 py-2 text-xs text-[#a16207]">No items in this group.</div>
        ) : (
          items.map(({ item, index, number, isFirst, isLast }) => (
            <MobileItemCard
              key={item._uiKey || item.id || index}
              item={item}
              index={index}
              number={number}
              invoice={invoice}
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
          ))
        )}

        {group.showSubtotal ? (
          <div className="mt-2 rounded-[12px] border border-[#f3dfb1] bg-white px-3 py-2 text-sm font-bold text-[#b45309]">
            Group subtotal: NGN {Number(groupSubtotal || 0).toLocaleString()}
          </div>
        ) : null}
      </div>

      <button type="button" onClick={() => onAddItemToGroup(group.id)} className="mx-2 mb-2 flex w-[calc(100%-1rem)] items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#f3c35a] bg-[#fff4d6] py-2.5 text-sm font-bold text-[#b45309]">
        <Plus className="h-3.5 w-3.5" />
        Add item to group
      </button>
    </div>
  )
}
