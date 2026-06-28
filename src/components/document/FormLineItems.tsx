import { FileInput, FolderPlus, Plus, Settings2, Trash2 } from 'lucide-react'
import {
  SectionLabel,
  ToolbarButton,
} from '@/components/invoice/mobile/mobileFormPrimitives'
import MobileItemCard from '@/components/invoice/MobileItemCard'
import MobileGroupCard from '@/components/invoice/MobileGroupCard'
import SortableLineItem from '@/components/document/SortableLineItem'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizeQuantity } from '@/domain/invoice'
import type { ItemContext } from '@/components/shared/itemFieldPolicy'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

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
  onClearAll?: () => void
  invalidRowIndex?: number | null
  onClearInvalidRow?: () => void
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
  onClearAll,
  invalidRowIndex,
  onClearInvalidRow,
}: FormLineItemsProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const lineItemsCount = useMemo(() => items.filter((item) => item.row_type === 'standard').length, [items])
  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

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

  useEffect(() => {
    if (invalidRowIndex == null || invalidRowIndex < 0) return
    const el = document.querySelector(`[data-row-index="${invalidRowIndex}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('bd-row-invalid')
      const timer = setTimeout(() => {
        el.classList.remove('bd-row-invalid')
        onClearInvalidRow?.()
      }, 2000)
      return () => clearTimeout(timer)
    } else {
      onClearInvalidRow?.()
    }
  }, [invalidRowIndex, onClearInvalidRow])

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
              computedAmount: getComputedAmount(nextItem),
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

  const groupedItemIndices = useMemo(() => {
    const indices = new Set<number>()
    items.forEach((item: any, idx: number) => {
      if (item.group_id && groupIdSet.has(item.group_id)) {
        indices.add(idx)
      }
    })
    return indices
  }, [items, groupIdSet])

  const ungroupedItems = useMemo(
    () => lineItemRows.filter((row: any) => row.type !== 'group' && !groupedItemIndices.has(row.index)),
    [lineItemRows, groupedItemIndices],
  )

  const ungroupedItemIds = useMemo(
    () => ungroupedItems.map((row: any) => row.item._uiKey || row.item.id || `item-${row.index}`),
    [ungroupedItems],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeRow = ungroupedItems.find((r: any) => (r.item._uiKey || r.item.id) === active.id)
      const overRow = ungroupedItems.find((r: any) => (r.item._uiKey || r.item.id) === over.id)
      if (!activeRow || !overRow) return

      const fromIndex = activeRow.index
      const toIndex = overRow.index
      if (fromIndex === toIndex) return

      const direction = toIndex > fromIndex ? 1 : -1
      const steps = Math.abs(toIndex - fromIndex)
      for (let i = 0; i < steps; i++) {
        onMoveItem(fromIndex + i * direction, direction)
      }
    },
    [ungroupedItems, onMoveItem],
  )

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
            <span className="text-[12px]">Import</span>
          </ToolbarButton>
          <ToolbarButton onClick={onOpenTableSettings} className="border-[var(--bd-border)] hover:bg-[var(--bd-bg)]">
            <Settings2 className="h-3.5 w-3.5" />
            <span className="text-[12px]">Settings</span>
          </ToolbarButton>
          {onClearAll && lineItemsCount > 0 && (
            <ToolbarButton onClick={() => setShowClearConfirm(true)} className="ml-auto border-[var(--bd-border)] hover:bg-[var(--bd-rose-bg)] hover:text-[var(--bd-rose)]">
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-[12px]">Clear</span>
            </ToolbarButton>
          )}
      </div>

      <div className="space-y-0">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ungroupedItemIds} strategy={verticalListSortingStrategy}>
            {lineItemRows.map((row: any) => {
              if (row.type === 'group') {
                return (
                  <MobileGroupCard
                    key={row.group.id}
                    group={row.group}
                    items={row.items}
                    invoice={invoice}
                    context={ctx}
                    enableItemSuggestions={ctx !== 'waybill'}
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
                  />
                )
              }
              return (
                <SortableLineItem
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
              )
            })}
          </SortableContext>
        </DndContext>
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

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {lineItemsCount} line items and {groups.length} {groups.length === 1 ? 'group' : 'groups'} from this document. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onClearAll?.()
                setShowClearConfirm(false)
              }}
              className="bg-[var(--bd-rose)] text-white hover:bg-[var(--bd-rose)]/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})
