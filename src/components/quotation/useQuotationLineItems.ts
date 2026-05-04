import { useCallback, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { normalizeQuantity } from '@/domain/invoice'
import type { InvoiceItem } from '@/domain/invoice'
import { makeEmptyGroup, makeEmptyItem } from '@/components/useInvoiceColumns.jsx'
import { normalizeQuotationGrouping, toGroupMetaMap, makeQuotationGroupId } from './quotationFormUtils'
import type { QuotationGroupState } from './quotationFormTypes'

export interface UseQuotationLineItemsOptions {
  items: InvoiceItem[]
  setItems: Dispatch<SetStateAction<InvoiceItem[]>>
  groups: QuotationGroupState[]
  setGroups: Dispatch<SetStateAction<QuotationGroupState[]>>
}

export interface UseQuotationLineItemsReturn {
  addQuotationItem: () => void
  insertItemAfter: (index: number) => void
  updateItem: (index: number, field: string, value: unknown) => void
  applyRowPatch: (itemIndex: number, patch: Partial<InvoiceItem>) => void
  resetItemOverrides: (fields: { vat?: boolean; discount?: boolean; install?: boolean }) => void
  removeItemAt: (itemIndex: number) => void
  moveItemBy: (itemIndex: number, direction: number) => void
  addQuotationGroup: () => void
  updateGroupName: (groupId: string, newName: string) => void
  toggleGroupSubtotal: (groupId: string) => void
  deleteGroup: (groupId: string) => void
  addItemToGroup: (groupId: string) => void
  commitGrouping: (
    nextItemsInput: InvoiceItem[] | ((current: InvoiceItem[]) => InvoiceItem[]),
    nextGroupsInput?: QuotationGroupState[] | ((current: QuotationGroupState[]) => QuotationGroupState[]),
  ) => void
}

export function useQuotationLineItems({
  items,
  setItems,
  groups,
  setGroups,
}: UseQuotationLineItemsOptions): UseQuotationLineItemsReturn {
  const itemsRef = useRef(items)
  const groupsRef = useRef(groups)

  const updateRefs = useCallback(() => {
    itemsRef.current = items
    groupsRef.current = groups
  }, [items, groups])

  const commitGrouping = useCallback(
    (
      nextItemsInput: InvoiceItem[] | ((current: InvoiceItem[]) => InvoiceItem[]),
      nextGroupsInput?: QuotationGroupState[] | ((current: QuotationGroupState[]) => QuotationGroupState[]),
    ) => {
      const baseItems = itemsRef.current
      const baseGroups = groupsRef.current
      const nextItems = typeof nextItemsInput === 'function' ? nextItemsInput(baseItems) : nextItemsInput
      const nextGroups = typeof nextGroupsInput === 'function' ? nextGroupsInput(baseGroups) : nextGroupsInput ?? baseGroups

      const normalized = normalizeQuotationGrouping(nextItems, toGroupMetaMap(nextGroups))
      itemsRef.current = normalized.items
      groupsRef.current = normalized.groups
      setItems(normalized.items)
      setGroups(normalized.groups)
    },
    [setItems, setGroups],
  )

  const updateItem = useCallback(
    (index: number, field: string, value: unknown) => {
      commitGrouping((current) =>
        current.map((item, itemIndex) => {
          if (itemIndex !== index) return item
          if (field === 'custom_data') return { ...item, custom_data: value as InvoiceItem['custom_data'] }
          return { ...item, [field]: field === 'quantity' ? normalizeQuantity(value, 1) : value }
        }),
      )
    },
    [commitGrouping],
  )

  const applyRowPatch = useCallback(
    (itemIndex: number, patch: Partial<InvoiceItem>) =>
      commitGrouping((current) => current.map((item, index) => (index === itemIndex ? { ...item, ...patch } : item))),
    [commitGrouping],
  )

  const resetItemOverrides = useCallback(
    (fields: { vat?: boolean; discount?: boolean; install?: boolean }) =>
      commitGrouping((current) =>
        current.map((item) => {
          if (item.row_type !== 'standard') return item
          const patch: Partial<InvoiceItem> = {}
          if (fields.vat) patch.vat_rate = null
          if (fields.discount) patch.discount_rate = null
          if (fields.install) {
            patch.install_rate = null
            patch.install_rate_override = false
          }
          return { ...item, ...patch }
        }),
      ),
    [commitGrouping],
  )

  const addUngroupedItem = useCallback(
    (insertAt: number | null = null, groupId: string | null = null, groupName = '') => {
      commitGrouping((current) => {
        const newItem: InvoiceItem = { ...makeEmptyItem(), row_type: 'standard', group_id: groupId, group_name: groupName }
        if (insertAt === null || insertAt >= current.length) return [...current, { ...newItem, sort_order: current.length }]
        const next = [...current]
        next.splice(insertAt, 0, { ...newItem, sort_order: insertAt })
        return next.map((item, index) => ({ ...item, sort_order: index }))
      })
    },
    [commitGrouping],
  )

  const addQuotationItem = useCallback(() => addUngroupedItem(), [addUngroupedItem])

  const insertItemAfter = useCallback(
    (index: number) => {
      const item = itemsRef.current[index]
      addUngroupedItem(index + 1, item?.group_id || null, item?.group_name || '')
    },
    [addUngroupedItem],
  )

  const addQuotationGroup = useCallback(() => {
    const base = makeEmptyGroup()
    const groupId = base.id || makeQuotationGroupId()
    const group = { ...base, id: groupId, name: base.name || `Group ${groupsRef.current.length + 1}`, showSubtotal: !!base.showSubtotal }

    commitGrouping(
      (current) => {
        const groupHeader: InvoiceItem = {
          ...makeEmptyItem(),
          row_type: 'group_header',
          group_id: group.id,
          group_name: group.name,
          description: '',
          sort_order: current.length,
        }

        return [
          ...current.map((item, index) => ({ ...item, sort_order: index })),
          groupHeader,
        ]
      },
      (current) => [...current, group],
    )
  }, [commitGrouping])

  const updateGroupName = useCallback(
    (groupId: string, newName: string) =>
      commitGrouping(
        (current) => current.map((item) => (item.row_type === 'group_header' && item.group_id === groupId ? { ...item, group_name: newName } : item)),
        (current) => current.map((group) => (group.id === groupId ? { ...group, name: newName } : group)),
      ),
    [commitGrouping],
  )

  const toggleGroupSubtotal = useCallback(
    (groupId: string) =>
      commitGrouping(
        (current) => current,
        (current) => current.map((group) => (group.id === groupId ? { ...group, showSubtotal: !group.showSubtotal } : group)),
      ),
    [commitGrouping],
  )

  const deleteGroup = useCallback(
    (groupId: string) =>
      commitGrouping(
        (current) =>
          current
            .filter((item) => !(item.row_type === 'group_header' && item.group_id === groupId))
            .map((item, index) => (item.group_id === groupId ? { ...item, group_id: null, group_name: '', sort_order: index } : { ...item, sort_order: index })),
        (current) => current.filter((group) => group.id !== groupId),
      ),
    [commitGrouping],
  )

  const addItemToGroup = useCallback(
    (groupId: string) => {
      const normalizedGrouping = normalizeQuotationGrouping(itemsRef.current, toGroupMetaMap(groupsRef.current))
      const group = normalizedGrouping.groups.find((entry) => entry.id === groupId)
      if (!group) return

      commitGrouping((current) => {
        let insertAt = current.findIndex((item) => item.row_type === 'group_header' && item.group_id === groupId)
        if (insertAt === -1) insertAt = current.length - 1

        for (let index = insertAt + 1; index < current.length; index += 1) {
          if (current[index].row_type === 'group_header') break
          if (current[index].group_id === groupId) insertAt = index
        }

        const next = [...current]
        next.splice(insertAt + 1, 0, { ...makeEmptyItem(), row_type: 'standard', group_id: groupId, group_name: '' })
        return next.map((item, index) => ({ ...item, sort_order: index }))
      })
    },
    [commitGrouping],
  )

  const removeItemAt = useCallback(
    (itemIndex: number) =>
      commitGrouping((current) => current.filter((_, entryIndex) => entryIndex !== itemIndex).map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex }))),
    [commitGrouping],
  )

  const moveItemBy = useCallback(
    (itemIndex: number, direction: number) => {
      commitGrouping((current) => {
        const snapshot = normalizeQuotationGrouping(current, toGroupMetaMap(groupsRef.current))
        const rows = [...snapshot.items]
        const row = rows[itemIndex]
        if (!row) return rows

        const getGroupBlockEnd = (startIndex: number) => {
          let endIndex = startIndex
          for (let cursor = startIndex + 1; cursor < rows.length; cursor += 1) {
            if (rows[cursor].row_type === 'group_header') break
            if (rows[cursor].group_id === rows[startIndex].group_id) endIndex = cursor
          }
          return endIndex
        }

        const getBlockRange = (startIndex: number) => {
          const target = rows[startIndex]
          if (!target) return { start: startIndex, end: startIndex }
          if (target.row_type === 'group_header') return { start: startIndex, end: getGroupBlockEnd(startIndex) }
          return { start: startIndex, end: startIndex }
        }

        if (row.row_type === 'group_header') {
          const block = rows.slice(itemIndex, getGroupBlockEnd(itemIndex) + 1)
          const remainder = [...rows.slice(0, itemIndex), ...rows.slice(itemIndex + block.length)]
          let insertAt = itemIndex

          if (direction < 0) {
            if (itemIndex === 0) return rows
            const previousBlockStart = (() => {
              if (remainder[itemIndex - 1]?.row_type !== 'group_header') return itemIndex - 1
              for (let cursor = itemIndex - 1; cursor >= 0; cursor -= 1) {
                if (remainder[cursor].row_type === 'group_header') return cursor
              }
              return 0
            })()
            insertAt = previousBlockStart
          } else {
            const nextBlockStart = itemIndex
            insertAt = nextBlockStart >= remainder.length ? remainder.length : getBlockRange(nextBlockStart).end + 1
          }

          remainder.splice(insertAt, 0, ...block)
          return remainder.map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex }))
        }

        const nextIndex = itemIndex + direction
        if (nextIndex < 0 || nextIndex >= rows.length) return rows

        const moving = { ...row }
        const anchor = rows[nextIndex]
        if (!anchor) return rows
        const remainder = rows.filter((_, index) => index !== itemIndex)

        if (direction < 0) {
          moving.group_id = anchor.row_type === 'group_header' ? anchor.group_id || null : anchor.group_id || null
          moving.group_name = ''
          remainder.splice(anchor.row_type === 'group_header' ? nextIndex + 1 : nextIndex, 0, moving)
        } else {
          moving.group_id = anchor.row_type === 'group_header' ? null : anchor.group_id || null
          moving.group_name = ''
          remainder.splice(nextIndex, 0, moving)
        }

        return remainder.map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex }))
      })
    },
    [commitGrouping],
  )

  return {
    addQuotationItem,
    insertItemAfter,
    updateItem,
    applyRowPatch,
    resetItemOverrides,
    removeItemAt,
    moveItemBy,
    addQuotationGroup,
    updateGroupName,
    toggleGroupSubtotal,
    deleteGroup,
    addItemToGroup,
    commitGrouping,
  }
}