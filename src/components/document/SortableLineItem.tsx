import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import MobileItemCard from '@/components/invoice/MobileItemCard'
import type { InvoiceItem } from '@/domain/invoice/types'
import type { ItemContext } from '@/components/shared/itemFieldPolicy'
import type { ColumnConfig } from '@/domain/invoice/types'

interface SortableLineItemProps {
  item: InvoiceItem
  index: number
  number: number | string
  invoice?: any
  context?: ItemContext
  enableItemSuggestions?: boolean
  customColumns?: ColumnConfig[]
  computedAmount: number | string
  isFirst: boolean
  isLast: boolean
  onUpdate: (index: number, field: string, value: any) => void
  onRemove: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onInsertBelow: (index: number) => void
  isVisible: (field: string) => boolean
  getColumn: (field: string) => any
}

export default function SortableLineItem({
  item,
  index,
  number,
  invoice,
  context,
  enableItemSuggestions,
  customColumns,
  computedAmount,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onInsertBelow,
  isVisible,
  getColumn,
}: SortableLineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._uiKey || item.id || `item-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  }

  return (
    <div ref={setNodeRef} style={style} data-row-index={index}>
      <MobileItemCard
        item={item}
        index={index}
        number={number}
        invoice={invoice}
        context={context}
        enableItemSuggestions={enableItemSuggestions}
        customColumns={customColumns}
        computedAmount={computedAmount}
        isFirst={isFirst}
        isLast={isLast}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onInsertBelow={onInsertBelow}
        isVisible={isVisible}
        getColumn={getColumn}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
