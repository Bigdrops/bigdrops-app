import { FileInput, FolderPlus, Plus, Settings2 } from 'lucide-react'
import {
  SectionLabel,
  ToolbarButton,
} from '@/components/invoice/mobile/mobileFormPrimitives'
import MobileItemCard from '@/components/invoice/MobileItemCard'
import MobileGroupCard from '@/components/invoice/MobileGroupCard'
import React, { useCallback, useMemo } from 'react'
import { normalizeQuantity } from '@/domain/invoice'
import type { ItemContext } from '@/components/shared/itemFieldPolicy'

interface FormLineItemsProps {
  items: any[]
  groups: any[]
  invoice: any
  context?: ItemContext
  isQuotation: boolean
  customColumns: any[]
  computedItems: any[]
  computedGroups: any[]
  isVisible: (key: string) => boolean
  getColumn: (key: string) => any
  onAddItem: () => void
  onAddGroup?: () => void
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

export const FormLineItems = React.memo(function FormLineItems({
  items,
  groups,
  invoice,
  context: ctx,
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

  const getItemNumber = useCallback(
    (index: number) => items.slice(0, index + 1).filter((item) => item.row_type === 'standard').length,
    [items],
  )

  const getComputedAmount = useCallback(
    (item: any) => computedAmountMap.get(item._uiKey || item.id) ?? normalizeQuantity(item.quantity, 1) * Number(item.unit_price || 0),
    [computedAmountMap],
  )

  const handleMoveUp = useCallback((idx: number) => onMoveItem(idx, -1), [onMoveItem])
  const handleMoveDown = useCallback((idx: number) => onMoveItem(idx, 1), [onMoveItem])

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

  const groupIdSet = useMemo(() => new Set(groups.map((g: any) => g.id)), [groups])

  const groupEntries = useMemo(() => {
    return groups.map((group: any) => {
      const groupItems = items
        .map((item: any, idx: number) => ({ item, idx }))
        .filter(({ item }) => item.group_id === group.id && item.row_type === 'standard')
        .map(({ item, idx }, i, arr) => ({
          item,
          index: idx,
          number: getItemNumber(idx),
          isFirst: i === 0,
          isLast: i === arr.length - 1,
          computedAmount: getComputedAmount(item),
        }))
      return { group, items: groupItems }
    })
  }, [groups, items, getComputedAmount])

  const groupedItemIndices = useMemo(() => {
    const indices = new Set<number>()
    items.forEach((item: any, idx: number) => {
      if (item.group_id && groupIdSet.has(item.group_id)) {
        indices.add(idx)
      }
    })
    return indices
  }, [items, groupIdSet])

  return (
    <div className="border-b border-[var(--bd-border-soft)] pb-4">
      <SectionLabel
        color="#059669"
        trailing={
          <span className="inline-flex h-6 items-center font-mono text-[11px] font-bold text-[var(--bd-text3)]">
            {lineItemsCount} {lineItemsCount === 1 ? 'item' : 'items'}
          </span>
        }
      >
        Line Items
      </SectionLabel>

      <div className="mb-3 flex items-center gap-2 border-b border-[var(--bd-border-soft)] py-2">
          <ToolbarButton onClick={onOpenImport} className="border-[var(--bd-border)] hover:bg-[var(--bd-bg)]">
            <FileInput className="h-3.5 w-3.5" />
            <span className="text-[12px]">Import Items</span>
          </ToolbarButton>
          <ToolbarButton onClick={onOpenTableSettings} className="border-[var(--bd-border)] hover:bg-[var(--bd-bg)]">
            <Settings2 className="h-3.5 w-3.5" />
            <span className="text-[12px]">Table Settings</span>
          </ToolbarButton>
          <div className="ml-auto text-[11px] font-mono text-[var(--bd-text3)]">Rows</div>
      </div>

      <div className="space-y-0">
        {groupEntries.map(({ group, items: groupItems }) => (
          <MobileGroupCard
            key={group.id}
            group={group}
            items={groupItems}
            invoice={invoice}
            context={ctx}
            enableItemSuggestions={ctx !== 'waybill'}
            customColumns={customColumns}
            groupSubtotal={computedGroupMap.get(group.id)?.subtotal || 0}
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
          />
        ))}
        {lineItemRows
          .filter((row: any) => row.type !== 'group' && !groupedItemIndices.has(row.index))
          .map((row: any) => (
            <MobileItemCard
              key={row.key}
              item={row.item}
              index={row.index}
              number={row.number}
              invoice={invoice}
              context={ctx}
              enableItemSuggestions={ctx !== 'waybill'}
              customColumns={customColumns}
              computedAmount={getComputedAmount(row.item)}
              isFirst={row.isFirst}
              isLast={row.isLast}
              onUpdate={onUpdateItem}
              onRemove={onRemoveItem}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onInsertBelow={onInsertItemAfter}
              isVisible={isVisible}
              getColumn={getColumn}
            />
          ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onAddItem}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--bd-radius)] border border-dashed border-[var(--bd-border)] bg-[var(--bd-surface)] text-[13px] font-bold text-[var(--bd-text2)] transition hover:border-[var(--bd-amber-border)] hover:bg-[var(--bd-amber-bg)] hover:text-[var(--bd-amber-dark)]"
        >
          <Plus className="h-4.5 w-4.5" />
          Add item
        </button>
        {onAddGroup && (
          <button
            type="button"
            onClick={onAddGroup}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--bd-radius)] border border-dashed border-[var(--bd-border)] bg-[var(--bd-surface)] text-[13px] font-bold text-[var(--bd-text2)] transition hover:border-[var(--bd-indigo-border)] hover:bg-[var(--bd-indigo-bg)] hover:text-[var(--bd-indigo)]"
          >
            <FolderPlus className="h-4.5 w-4.5" />
            Add group
          </button>
        )}
      </div>
    </div>
  )
})
