import * as React from 'react'
import { memo, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import MobileItemCard from './MobileItemCard'
import { formatNaira } from '@/lib/formatters/money'
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

  const handleMoveUp = useCallback((itemIdx: number) => onMoveItem(itemIdx, -1), [onMoveItem])
  const handleMoveDown = useCallback((itemIdx: number) => onMoveItem(itemIdx, 1), [onMoveItem])
  const handleUngroupItem = useCallback((itemIdx: number) => {
    onUpdateItem(itemIdx, 'group_id', null)
    onUpdateItem(itemIdx, 'group_name', '')
  }, [onUpdateItem])

  return (
    <section className="cps-gwrap">
      <div className="cps-ghdr">
        <button
          type="button"
          className="cps-gbtn danger"
          title="Remove group (items are kept)"
          aria-label="Remove group"
          onClick={() => onDeleteGroup(groupId)}
        >
          <X />
        </button>
        <input
          className="cps-gtitle"
          value={group.name || ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onUpdateGroupName(groupId, event.target.value)}
          placeholder="Group title"
          aria-label="Group title"
        />
        <span className="cps-gcount">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
      </div>

      <div className="cps-gbody">
        {items.length === 0 ? (
          <div className="cps-gempty">
            No items in this group yet.
            <br />
            Use the button below to add the first one.
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

      <div className="cps-gfoot">
        <div className="bd-gsub">
          <button
            type="button"
            onClick={() => onToggleGroupSubtotal(groupId)}
            className={`bd-gsub-toggle${subtotalOn ? ' on' : ''}`}
            aria-pressed={subtotalOn}
          >
            Subtotal
          </button>
          {subtotalOn && (
            <span className="bd-gsub-total">{formatNaira(groupSubtotal)}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAddItemToGroup(groupId)}
          className="cps-gadd"
        >
          <Plus />
          <span>Add item to this group</span>
        </button>
      </div>
    </section>
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
