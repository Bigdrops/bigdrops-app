import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
    <div className="mt-3 overflow-hidden rounded-[14px] border border-[#e2e8f0] bg-[#fcfcfd]">
      <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-2">
        <Input value={group.name || ''} onChange={(event) => onUpdateGroupName(group.id, event.target.value)} placeholder="Group name" className={inputCls} />
        <div className="inline-flex items-center gap-1 rounded border border-[#e2e8f0] px-2 py-1 text-xs text-[#475569]">
          Subtotal <Switch checked={!!group.showSubtotal} onCheckedChange={() => onToggleGroupSubtotal(group.id)} />
        </div>
        <button type="button" onClick={() => onDeleteGroup(group.id)} className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#fecaca] text-[#ef4444]">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {group.showSubtotal ? <div className="px-3 py-2 text-sm text-[#334155]">Subtotal: <strong>NGN {Number(groupSubtotal || 0).toLocaleString()}</strong></div> : null}

      <div className="space-y-0 px-2 pb-2">
        {items.length === 0 ? (
          <div className="rounded border border-dashed border-[#fcd34d] px-3 py-2 text-xs text-[#a16207]">No items in this group.</div>
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
      </div>

      <button type="button" onClick={() => onAddItemToGroup(group.id)} className="flex w-full items-center justify-center gap-2 border-t border-[#e2e8f0] py-2.5 text-xs font-semibold text-[#b45309]">
        <Plus className="h-3.5 w-3.5" />
        Add item to group
      </button>
    </div>
  )
}
