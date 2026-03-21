import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import MobileItemCard from './MobileItemCard'

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
    <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-none">
      <div className="border-b border-zinc-200 bg-zinc-100/70 px-3.5 py-3">
        <div className="flex items-center gap-3">
          <Input
            value={group.name || ''}
            onChange={(e) => onUpdateGroupName(group.id, e.target.value)}
            placeholder="Group name"
            className="h-10 flex-1 rounded-2xl border-zinc-200 bg-white text-sm font-semibold text-zinc-900 placeholder:text-zinc-400"
          />

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2">
              <Switch checked={!!group.showSubtotal} onCheckedChange={() => onToggleGroupSubtotal(group.id)} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Subtotal</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => onDeleteGroup(group.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {group.showSubtotal ? (
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm">
          <span className="text-zinc-600">Group subtotal</span>
          <span className="font-bold text-zinc-900">NGN {Number(groupSubtotal || 0).toLocaleString()}</span>
        </div>
      ) : null}

      <div className="space-y-3 bg-zinc-50/60 p-3">
        {items.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-sm text-zinc-500">
            No items in this group yet.
          </div>
        ) : (
          items.map(({ item, index, number, isFirst, isLast }) => {
            return (
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
            )
          })
        )}
      </div>

      <button
        type="button"
        onClick={() => onAddItemToGroup(group.id)}
        className="flex w-full items-center justify-center gap-1.5 border-t border-zinc-200 bg-zinc-100/70 py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-200/70 active:bg-zinc-200"
      >
        <Plus className="h-3.5 w-3.5" />
        Add item to group
      </button>
    </div>
  )
}
