import { Layers3, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import MobileItemCard from './MobileItemCard'

const inputCls =
  'h-11 rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 text-[14px] font-bold text-[#0f172a] shadow-none transition focus:border-[#94a3b8] focus:bg-white focus:ring-0 focus-visible:ring-0'

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
    <div className="relative mt-4 overflow-hidden rounded-[18px] border-[1.5px] border-[#e2e8f0] border-l-[3px] border-l-[#f59e0b] bg-white pt-[10px] shadow-[0_1px_3px_rgba(15,23,42,0.04),0_6px_18px_rgba(15,23,42,0.05)]">
      <div className="absolute left-1/2 top-[-14px] z-[3] flex h-[30px] min-w-[30px] -translate-x-1/2 items-center justify-center rounded-full bg-[#f59e0b] px-[10px] text-[11px] font-extrabold text-white shadow-[0_4px_12px_rgba(15,23,42,0.2)]">
        G
      </div>

      <button
        type="button"
        onClick={() => onDeleteGroup(group.id)}
        className="absolute right-[10px] top-[10px] z-[2] flex h-[26px] w-[26px] items-center justify-center rounded-full border border-[#fecaca] bg-[#fff5f5] text-[#ef4444]"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div className="space-y-3 p-4 pr-[38px]">
        <Input
          value={group.name || ''}
          onChange={(event) => onUpdateGroupName(group.id, event.target.value)}
          placeholder="Group name"
          className={inputCls}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex h-[34px] items-center gap-2 rounded-[10px] border-[1.5px] px-3 text-[11px] font-extrabold uppercase tracking-[0.04em] transition ${
              group.showSubtotal
                ? 'border-[#0f172a] bg-[#0f172a] text-white'
                : 'border-[#e2e8f0] bg-white text-[#475569]'
            }`}
          >
            <Layers3 className="h-3.5 w-3.5" />
            Subtotal
            <Switch checked={!!group.showSubtotal} onCheckedChange={() => onToggleGroupSubtotal(group.id)} />
          </div>
        </div>

        {group.showSubtotal ? (
          <div className="rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">
              Group Subtotal
            </div>
            <div className="mt-1 text-[24px] font-black leading-none tracking-[-0.03em] text-[#0f172a]">
              NGN {Number(groupSubtotal || 0).toLocaleString()}
            </div>
          </div>
        ) : null}

        <div className="space-y-0">
          {items.length === 0 ? (
            <div className="rounded-[16px] border-[1.5px] border-dashed border-[#fcd34d] bg-[#fffbeb] px-4 py-6 text-center text-[13px] text-[#a16207]">
              No items in this group yet.
            </div>
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
      </div>

      <button
        type="button"
        onClick={() => onAddItemToGroup(group.id)}
        className="flex w-full items-center justify-center gap-2 border-t border-dashed border-[#fcd34d] bg-[#fffbeb] py-3 text-[12px] font-bold text-[#b45309]"
      >
        <Plus className="h-4 w-4" />
        Add item to group
      </button>
    </div>
  )
}
