import { FileInput, FolderPlus, Plus, Settings2 } from 'lucide-react'
import {
  pageCardCls,
  SectionLabel,
  ToolbarButton,
} from '@/components/invoice/mobile/mobileFormPrimitives'
import MobileItemCard from '@/components/invoice/MobileItemCard'
import MobileGroupCard from '@/components/invoice/MobileGroupCard'
import { useMemo } from 'react'

interface FormLineItemsProps {
  items: any[]
  groups: any[]
  invoice: any
  isQuotation: boolean
  customColumns: any[]
  computedItems: any[]
  computedGroups: any[]
  isVisible: (key: string) => boolean
  getColumn: (key: string) => any
  onAddItem: () => void
  onAddGroup: () => void
  onAddItemToGroup: (groupId: string) => void
  onUpdateItem: (index: number, field: string, value: any) => void
  onRemoveItem: (index: number) => void
  onMoveItem: (index: number, direction: number) => void
  onInsertItemAfter: (index: number) => void
  onUpdateGroupName: (groupId: string, name: string) => void
  onToggleGroupSubtotal: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
  onOpenImport: () => void
  onOpenTableSettings: () => void
}

export function FormLineItems({
  items,
  groups,
  invoice,
  isQuotation,
  customColumns,
  computedItems,
  computedGroups,
  isVisible,
  getColumn,
  onAddItem,
  onAddGroup,
  onAddItemToGroup,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
  onInsertItemAfter,
  onUpdateGroupName,
  onToggleGroupSubtotal,
  onDeleteGroup,
  onOpenImport,
  onOpenTableSettings,
}: FormLineItemsProps) {
  
  const lineItemsCount = useMemo(() => items.filter((item) => item.row_type === 'standard').length, [items])
  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups])

  const computedAmountMap = useMemo(() => {
    const map = new Map()
    computedItems.forEach((item, index) => {
      const originalItem = items[index]
      const key = originalItem?._uiKey || originalItem?.id
      if (key) map.set(key, item.visible_line_total ?? item.line_subtotal)
    })
    return map
  }, [computedItems, items])

  const computedGroupMap = useMemo(
    () => new Map(computedGroups.map((group) => [group.group_id, group])),
    [computedGroups],
  )

  const getItemNumber = (index: number) =>
    items.slice(0, index + 1).filter((item) => item.row_type === 'standard').length

  const getComputedAmount = (item: any) =>
    computedAmountMap.get(item._uiKey || item.id) ?? Number(item.quantity || 0) * Number(item.unit_price || 0)

  const lineItemRows = useMemo(() => {
    const rows = []
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      if (item.row_type === 'group_header') {
        const groupId = item.group_id || `group_${index}`
        const group = groupMap.get(groupId) || { id: groupId, name: item.group_name || `Group`, showSubtotal: false }
        const groupItems = []
        let cursor = index + 1
        while (cursor < items.length) {
          const nextItem = items[cursor]
          if (nextItem.row_type === 'group_header') break
          if (nextItem.row_type === 'standard' && nextItem.group_id === groupId) {
            groupItems.push({
              item: nextItem,
              index: cursor,
              number: getItemNumber(cursor),
              isFirst: groupItems.length === 0,
              isLast: false,
            })
            index = cursor
            cursor += 1
            continue
          }
          break
        }
        if (groupItems.length > 0) groupItems[groupItems.length - 1].isLast = true
        rows.push({ type: 'group', key: item._uiKey || item.id || groupId, group, items: groupItems })
        continue
      }
      if (item.row_type === 'standard') {
        rows.push({
          type: 'item',
          key: item._uiKey || item.id || index,
          item,
          index,
          number: getItemNumber(index),
          isFirst: index === 0 || items[index - 1]?.row_type === 'group_header',
          isLast: index === items.length - 1 || items[index + 1]?.row_type === 'group_header',
        })
      }
    }
    return rows
  }, [groupMap, items])

  return (
    <div>
      <SectionLabel
        color="#059669"
        trailing={
          <span className="inline-flex h-7 items-center rounded-full border border-[var(--bd-emerald-border)] bg-[var(--bd-emerald-bg)] px-3 text-[11px] font-extrabold text-[var(--bd-emerald)]">
            {lineItemsCount} {lineItemsCount === 1 ? 'item' : 'items'}
          </span>
        }
      >
        Line Items
      </SectionLabel>

      <div className={`${pageCardCls} mb-6 p-4`}>
        <div className="grid grid-cols-2 gap-3">
          <ToolbarButton onClick={onOpenImport} className="h-11 border-dashed bg-[var(--bd-bg)] hover:bg-[var(--bd-surface)]">
            <FileInput className="h-4 w-4" />
            <span>Import Items</span>
          </ToolbarButton>
          <ToolbarButton onClick={onOpenTableSettings} className="h-11 border-dashed bg-[var(--bd-bg)] hover:bg-[var(--bd-surface)]">
            <Settings2 className="h-4 w-4" />
            <span>Table Settings</span>
          </ToolbarButton>
        </div>
      </div>

      <div className="space-y-0">
        {lineItemRows.map((row: any) =>
          row.type === 'group' ? (
            <MobileGroupCard
              key={row.key}
              group={row.group}
              items={row.items}
              invoice={invoice}
              enableItemSuggestions={!isQuotation}
              customColumns={customColumns}
              groupSubtotal={computedGroupMap.get(row.group.id)?.subtotal || 0}
              onUpdateGroupName={onUpdateGroupName}
              onToggleGroupSubtotal={onToggleGroupSubtotal}
              onDeleteGroup={onDeleteGroup}
              onAddItemToGroup={onAddItemToGroup}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
              onMoveItem={onMoveItem}
              onInsertItemAfter={onInsertItemAfter}
              isVisible={isVisible}
              getColumn={getColumn}
              getComputedAmount={getComputedAmount}
            />
          ) : (
            <MobileItemCard
              key={row.key}
              item={row.item}
              index={row.index}
              number={row.number}
              invoice={invoice}
              enableItemSuggestions={!isQuotation}
              customColumns={customColumns}
              computedAmount={getComputedAmount(row.item)}
              isFirst={row.isFirst}
              isLast={row.isLast}
              onUpdate={onUpdateItem}
              onRemove={onRemoveItem}
              onMoveUp={(idx) => onMoveItem(idx, -1)}
              onMoveDown={(idx) => onMoveItem(idx, 1)}
              onInsertBelow={onInsertItemAfter}
              isVisible={isVisible}
              getColumn={getColumn}
            />
          ),
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onAddItem}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--bd-radius-lg)] border border-dashed border-[var(--bd-emerald-border)] bg-[var(--bd-emerald-bg)] text-[14px] font-black text-[var(--bd-emerald)] transition hover:bg-[var(--bd-emerald-border)] hover:text-white"
        >
          <Plus className="h-5 w-5" />
          Add item
        </button>
        <button
          type="button"
          onClick={onAddGroup}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--bd-radius-lg)] border border-dashed border-[var(--bd-indigo-border)] bg-[var(--bd-indigo-bg)] text-[14px] font-black text-[var(--bd-indigo)] transition hover:bg-[var(--bd-indigo-border)] hover:text-white"
        >
          <FolderPlus className="h-5 w-5" />
          Add group
        </button>
      </div>
    </div>
  )
}
