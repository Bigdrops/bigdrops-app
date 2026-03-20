import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import MobileItemCard from './MobileItemCard'

export default function MobileGroupCard({
  group,
  items,
  allItems,
  invoice,
  customColumns,
  groupSubtotal,
  getItemIndex,
  getItemNumber,
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
    <div className="overflow-hidden rounded-[24px] border-2 border-zinc-300 bg-zinc-100">
      <div className="bg-zinc-900 px-3.5 py-3">
        <div className="flex items-center gap-3">
          <Input
            value={group.name || ''}
            onChange={(e) => onUpdateGroupName(group.id, e.target.value)}
            placeholder="Group name"
            className="h-10 flex-1 rounded-2xl border-zinc-700 bg-zinc-800 text-sm font-semibold text-white placeholder:text-zinc-400"
          />

          <div className="flex items-center gap-2 text-white">
            <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-2">
              <Switch checked={!!group.showSubtotal} onCheckedChange={() => onToggleGroupSubtotal(group.id)} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-300">Subtotal</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-red-300 hover:bg-red-950/40 hover:text-red-200"
              onClick={() => onDeleteGroup(group.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {group.showSubtotal ? (
        <div className="flex items-center justify-between bg-zinc-800 px-3.5 py-2 text-sm">
          <span className="text-zinc-300">Group subtotal</span>
          <span className="font-bold text-emerald-400">NGN {Number(groupSubtotal || 0).toLocaleString()}</span>
        </div>
      ) : null}

      <div className="space-y-3 p-2.5">
        {items.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-sm text-zinc-500">
            No items in this group yet.
          </div>
        ) : (
          items.map((item) => {
            const index = getItemIndex(item._uiKey || item.id)
            const number = getItemNumber(index)
            const isFirst = index === 0 || allItems[index - 1]?.group_id !== group.id
            const isLast = index === allItems.length - 1 || allItems[index + 1]?.group_id !== group.id

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
        className="flex w-full items-center justify-center gap-1.5 border-t border-zinc-300 bg-zinc-200 py-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-300"
      >
        <Plus className="h-3.5 w-3.5" />
        Add item to group
      </button>
    </div>
  )
}
