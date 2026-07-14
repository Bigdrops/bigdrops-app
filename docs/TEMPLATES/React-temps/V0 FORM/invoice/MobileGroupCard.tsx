"use client"

import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import type { InvoiceItem, InvoiceGroup, ColumnConfig, Invoice } from "@/lib/invoice-types"
import MobileItemCard from "./MobileItemCard"

interface MobileGroupCardProps {
  group: InvoiceGroup
  items: InvoiceItem[]
  allItems: InvoiceItem[]
  invoice: Invoice
  columns: ColumnConfig[]
  customColumns: ColumnConfig[]
  groupSubtotal: number
  getItemIndex: (uiKey: string) => number
  getItemNumber: (index: number) => number
  onUpdateGroupName: (groupId: string, name: string) => void
  onToggleGroupSubtotal: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
  onAddItemToGroup: (groupId: string) => void
  onUpdateItem: (index: number, field: string, value: unknown) => void
  onRemoveItem: (index: number) => void
  onMoveItem: (index: number, dir: number) => void
  onInsertItemAfter: (index: number) => void
  isVisible: (key: string) => boolean
  getColumn: (key: string) => ColumnConfig | undefined
  computeItemAmount: (item: InvoiceItem) => number
}

export default function MobileGroupCard({
  group,
  items,
  allItems,
  invoice,
  columns,
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
  computeItemAmount,
}: MobileGroupCardProps) {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border-2 border-zinc-300 bg-zinc-100">
      {/* Group Header */}
      <div className="flex items-center gap-2 bg-zinc-800 px-3 py-3">
        <Input
          value={group.name}
          onChange={(e) => onUpdateGroupName(group.id, e.target.value)}
          placeholder="Group name"
          className="h-9 flex-1 rounded-lg border-0 border-b border-zinc-600 bg-transparent text-sm font-semibold text-white placeholder:text-zinc-400 focus-visible:ring-0"
        />

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Switch
              checked={group.showSubtotal}
              onCheckedChange={() => onToggleGroupSubtotal(group.id)}
              className="scale-75"
            />
            <span className="text-[10px] text-zinc-400">Subtotal</span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDeleteGroup(group.id)}
            className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-900/30 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Subtotal display */}
      {group.showSubtotal && (
        <div className="flex items-center justify-between bg-zinc-700 px-3 py-2">
          <span className="text-xs font-medium text-zinc-300">Group Subtotal</span>
          <span className="text-sm font-bold text-emerald-400">₦{groupSubtotal.toLocaleString()}</span>
        </div>
      )}

      {/* Group Items */}
      <div className="space-y-0 p-2">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-4 text-center text-xs text-zinc-500">
            No items in this group yet
          </div>
        ) : (
          items.map((item) => {
            const idx = getItemIndex(item._uiKey || "")
            const num = getItemNumber(idx)
            const isFirst = idx === 0 || allItems[idx - 1]?.group_id !== group.id
            const isLast = idx === allItems.length - 1 || allItems[idx + 1]?.group_id !== group.id

            return (
              <MobileItemCard
                key={item._uiKey}
                item={item}
                index={idx}
                number={num}
                invoice={invoice}
                columns={columns}
                customColumns={customColumns}
                computedAmount={computeItemAmount(item)}
                isFirst={isFirst}
                isLast={isLast}
                groupName=""
                onUpdate={onUpdateItem}
                onRemove={onRemoveItem}
                onMoveUp={(i) => onMoveItem(i, -1)}
                onMoveDown={(i) => onMoveItem(i, 1)}
                onInsertBelow={onInsertItemAfter}
                isVisible={isVisible}
                getColumn={getColumn}
              />
            )
          })
        )}
      </div>

      {/* Add item to group */}
      <button
        type="button"
        onClick={() => onAddItemToGroup(group.id)}
        className="flex w-full items-center justify-center gap-1.5 border-t border-zinc-300 bg-zinc-200 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-300"
      >
        <Plus className="h-3.5 w-3.5" />
        Add item to group
      </button>
    </div>
  )
}
