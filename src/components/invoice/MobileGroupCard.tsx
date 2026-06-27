import * as React from 'react'
import { memo, useCallback, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import MobileItemCard from './MobileItemCard'
import type { Invoice, InvoiceItem, InvoiceGroup, ColumnConfig } from '../../domain/invoice/types'
import type { ItemContext } from '@/components/shared/itemFieldPolicy'

interface GroupItemEntry {
  item: InvoiceItem
  index: number
  number: number
  isFirst: boolean
  isLast: boolean
  computedAmount: number | string
}

interface MobileGroupCardProps {
  group: InvoiceGroup
  items: GroupItemEntry[]
  invoice: Invoice
  context?: ItemContext
  enableItemSuggestions?: boolean
  customColumns: ColumnConfig[]
  groupSubtotal: number | string
  onUpdateGroupName: (groupId: string, name: string) => void
  onToggleGroupSubtotal: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
  onAddItemToGroup: (groupId: string) => void
  onUpdateItem: (index: number, field: string, value: any) => void
  onRemoveItem: (index: number) => void
  onMoveItem: (index: number, dir: number) => void
  onInsertItemAfter: (index: number) => void
  isVisible: (key: string) => boolean
  getColumn: (key: string) => ColumnConfig | undefined
}

function MobileGroupCard({
  group,
  items,
  invoice,
  context: ctx,
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
}: MobileGroupCardProps) {
  const subtotalOn = !!group.showSubtotal
  const groupId = group.id || ''
  const [collapsed, setCollapsed] = useState(false)

  const handleMoveUp = useCallback((itemIdx: number) => onMoveItem(itemIdx, -1), [onMoveItem])
  const handleMoveDown = useCallback((itemIdx: number) => onMoveItem(itemIdx, 1), [onMoveItem])
  const handleUngroupItem = useCallback((itemIdx: number) => {
    onUpdateItem(itemIdx, 'group_id', null)
    onUpdateItem(itemIdx, 'group_name', '')
  }, [onUpdateItem])

  return (
    <div className="border-b border-[var(--bd-border-soft)] bg-[var(--bd-bg)]">
      {/* Group Header */}
      <div className="flex items-center gap-3 border-b border-[var(--bd-indigo-border)] bg-gradient-to-br from-[var(--bd-indigo-bg)] to-[#f0f4ff] px-4 py-3">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--bd-indigo)]"
          aria-label={collapsed ? 'Expand group' : 'Collapse group'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <div className="h-7 w-1 rounded-full bg-[var(--bd-indigo)]" />
        <div className="min-w-0 flex-1">
          <Input
            value={group.name || ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => onUpdateGroupName(groupId, event.target.value)}
            placeholder="e.g. Electrical Materials"
            className="h-7 border-none bg-transparent p-0 text-[14px] font-black tracking-tight text-[var(--bd-indigo)] focus-visible:ring-0 placeholder:text-[var(--bd-indigo)] placeholder:opacity-30"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[var(--bd-indigo)] opacity-50">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
          <button
            type="button"
            onClick={() => onDeleteGroup(groupId)}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent bg-transparent text-[var(--bd-text4)] transition-colors hover:bg-[var(--bd-rose-bg)] hover:text-[var(--bd-rose)]"
            aria-label="Delete group"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Group Body */}
      {!collapsed && (
      <div className="relative bg-[var(--bd-surface)]">
        {/* Left Indigo Rule for family connection */}
        <div className="absolute bottom-0 left-0 top-0 w-1 bg-[var(--bd-indigo-border)]" />
        
        <div className="space-y-0">
          {items.length === 0 ? (
            <div className="flex h-20 items-center justify-center px-4 py-6 text-center text-[12px] font-medium text-[var(--bd-text3)] italic">
              No items in this group
            </div>
          ) : (
            items.map(({ item, index, number, isFirst, isLast, computedAmount }) => (
              <MobileItemCard
                key={item._uiKey || item.id || index}
                item={item}
                index={index}
                number={number}
                invoice={invoice}
                context={ctx}
                enableItemSuggestions={enableItemSuggestions}
                customColumns={customColumns}
                computedAmount={computedAmount}
                isFirst={isFirst}
                isLast={isLast}
                onUpdate={onUpdateItem}
                onRemove={onRemoveItem}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onInsertBelow={onInsertItemAfter}
                onUngroup={handleUngroupItem}
                isVisible={isVisible}
                getColumn={getColumn}
              />
            ))
          )}
        </div>
      </div>
      )}

      {/* Group Footer - Visual Closing Treatment */}
      <div className="flex items-center justify-between border-t border-[var(--bd-indigo-border)] bg-gradient-to-tr from-[#f8faff] to-[var(--bd-indigo-bg)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleGroupSubtotal(groupId)}
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
          onClick={() => onAddItemToGroup(groupId)}
          className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--bd-indigo-border)] bg-white px-3 text-[11px] font-bold text-[var(--bd-indigo)] shadow-sm transition-all hover:bg-[var(--bd-indigo-bg)] active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add item to group</span>
        </button>
      </div>
    </div>
  )
}

function groupCardAreEqual(prevProps: MobileGroupCardProps, nextProps: MobileGroupCardProps) {
  const pg = prevProps.group
  const ng = nextProps.group
  if (pg.id !== ng.id || pg.name !== ng.name || pg.showSubtotal !== ng.showSubtotal) return false

  if (prevProps.items.length !== nextProps.items.length) return false
  if (prevProps.items.some((entry, i) => {
    const nextEntry = nextProps.items[i]
    return !nextEntry || entry.item !== nextEntry.item || entry.index !== nextEntry.index ||
      entry.number !== nextEntry.number || entry.isFirst !== nextEntry.isFirst ||
      entry.isLast !== nextEntry.isLast || entry.computedAmount !== nextEntry.computedAmount
  })) return false

  if (prevProps.groupSubtotal !== nextProps.groupSubtotal) return false
  if (prevProps.invoice !== nextProps.invoice) return false
  if (prevProps.context !== nextProps.context) return false
  if (prevProps.enableItemSuggestions !== nextProps.enableItemSuggestions) return false
  if (prevProps.customColumns !== nextProps.customColumns) return false

  if (prevProps.onUpdateGroupName !== nextProps.onUpdateGroupName) return false
  if (prevProps.onToggleGroupSubtotal !== nextProps.onToggleGroupSubtotal) return false
  if (prevProps.onDeleteGroup !== nextProps.onDeleteGroup) return false
  if (prevProps.onAddItemToGroup !== nextProps.onAddItemToGroup) return false
  if (prevProps.onUpdateItem !== nextProps.onUpdateItem) return false
  if (prevProps.onRemoveItem !== nextProps.onRemoveItem) return false
  if (prevProps.onMoveItem !== nextProps.onMoveItem) return false
  if (prevProps.onInsertItemAfter !== nextProps.onInsertItemAfter) return false
  if (prevProps.isVisible !== nextProps.isVisible) return false
  if (prevProps.getColumn !== nextProps.getColumn) return false

  return true
}

export default memo(MobileGroupCard, groupCardAreEqual)
