"use client"

import { ChevronUp, ChevronDown, Trash2, Plus, ImagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import type { InvoiceItem, ColumnConfig, Invoice } from "@/lib/invoice-types"

// Placeholder for external components
function UnitInputSlot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Unit"
      className="h-9 rounded-xl border-zinc-200 bg-white text-sm"
    />
  )
}

function ItemImageUploadSlot({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(value ? null : "/placeholder.jpg")}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
    >
      <ImagePlus className="h-4 w-4" />
    </button>
  )
}

interface MobileItemCardProps {
  item: InvoiceItem
  index: number
  number: number
  invoice: Invoice
  columns: ColumnConfig[]
  customColumns: ColumnConfig[]
  computedAmount: number
  isFirst: boolean
  isLast: boolean
  groupName?: string
  onUpdate: (index: number, field: string, value: unknown) => void
  onRemove: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onInsertBelow: (index: number) => void
  isVisible: (key: string) => boolean
  getColumn: (key: string) => ColumnConfig | undefined
}

export default function MobileItemCard({
  item,
  index,
  number,
  invoice,
  columns,
  customColumns,
  computedAmount,
  isFirst,
  isLast,
  groupName,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onInsertBelow,
  isVisible,
  getColumn,
}: MobileItemCardProps) {
  const autoInstall = (() => {
    const col = getColumn("install_rate")
    return col?.formula
      ? parseFloat(col.formula) * Number(item.quantity || 1) * Number(item.unit_price || 0)
      : null
  })()

  const drVal = item.discount_rate
  const isDiscountExcluded = drVal === 0
  const hasDiscountOverride = drVal !== null && drVal !== undefined

  const labelCls = "text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
  const inputCls = "h-9 rounded-xl border-zinc-200 bg-white text-sm"

  return (
    <Card className="mb-3 overflow-hidden rounded-xl border-zinc-200 bg-white">
      {/* Header row */}
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white">
          {number}
        </span>

        <div className="flex flex-1 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onMoveUp(index)}
            disabled={isFirst}
            className="h-7 w-7 rounded-lg text-zinc-500"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onMoveDown(index)}
            disabled={isLast}
            className="h-7 w-7 rounded-lg text-zinc-500"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <ItemImageUploadSlot
          value={item.image_url || null}
          onChange={(url) => onUpdate(index, "image_url", url)}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="h-7 w-7 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-3 p-3">
        {/* Description */}
        <div>
          <Input
            value={item.description || ""}
            onChange={(e) => onUpdate(index, "description", e.target.value)}
            placeholder="Item description"
            className="h-10 rounded-xl border-zinc-200 bg-white text-sm font-medium"
          />
          <Input
            value={item.sub_description || ""}
            onChange={(e) => onUpdate(index, "sub_description", e.target.value)}
            placeholder="Additional details (optional)"
            className="mt-1.5 h-8 rounded-xl border-zinc-200 bg-zinc-50 text-xs text-zinc-600"
          />
        </div>

        {/* Make / Brand */}
        {isVisible("make") && (
          <div>
            <label className={labelCls}>Make / Brand</label>
            <Input
              value={item.make || ""}
              onChange={(e) => onUpdate(index, "make", e.target.value)}
              placeholder="Brand or manufacturer"
              className={`mt-1 ${inputCls}`}
            />
          </div>
        )}

        {/* Qty | Unit | Rate row */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelCls}>Qty</label>
            <Input
              type="number"
              min={0}
              value={item.quantity ?? 1}
              onChange={(e) => onUpdate(index, "quantity", Number(e.target.value))}
              className={`mt-1 ${inputCls}`}
            />
          </div>

          {isVisible("unit") && (
            <div>
              <label className={labelCls}>Unit</label>
              <div className="mt-1">
                <UnitInputSlot
                  value={item.unit || ""}
                  onChange={(val) => onUpdate(index, "unit", val)}
                />
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Rate (₦)</label>
            <Input
              type="number"
              min={0}
              value={item.unit_price ?? 0}
              onChange={(e) => onUpdate(index, "unit_price", Number(e.target.value))}
              className={`mt-1 ${inputCls}`}
            />
          </div>
        </div>

        {/* Install Rate */}
        {isVisible("install_rate") && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Install (₦)</label>
              <Input
                type="number"
                min={0}
                value={item.install_rate_override ? (item.install_rate ?? "") : ""}
                placeholder={autoInstall !== null ? autoInstall.toFixed(0) : "0"}
                onChange={(e) => {
                  const val = e.target.value
                  onUpdate(
                    index,
                    "__install_rate_override",
                    val === ""
                      ? { install_rate_override: false, install_rate: null }
                      : { install_rate_override: true, install_rate: Number(val) }
                  )
                }}
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <div className="flex flex-col justify-end">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-right text-sm font-semibold text-zinc-900">
                ₦{computedAmount.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* VAT & Discount overrides */}
        {(isVisible("vat_rate") || isVisible("discount_rate")) && (
          <div className="grid grid-cols-2 gap-2">
            {isVisible("vat_rate") && (
              <div>
                <label className={labelCls}>VAT % (blank = {invoice.vat ?? 7.5}%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={item.vat_rate !== null && item.vat_rate !== undefined ? item.vat_rate : ""}
                  placeholder={String(invoice.vat ?? 7.5)}
                  onChange={(e) => {
                    const val = e.target.value
                    onUpdate(index, "vat_rate", val === "" ? null : Number(val))
                  }}
                  className={`mt-1 ${inputCls} ${item.vat_rate === 0 ? "border-red-300 bg-red-50 text-red-600" : ""}`}
                />
              </div>
            )}

            {isVisible("discount_rate") && (
              <div>
                <label className={labelCls}>Discount %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={hasDiscountOverride ? drVal : ""}
                  placeholder="global"
                  onChange={(e) => {
                    const val = e.target.value
                    onUpdate(index, "discount_rate", val === "" ? null : Number(val))
                  }}
                  className={`mt-1 ${inputCls} ${
                    isDiscountExcluded
                      ? "border-red-300 bg-red-50 text-red-600"
                      : hasDiscountOverride
                        ? "border-amber-300 bg-amber-50"
                        : ""
                  }`}
                />
              </div>
            )}
          </div>
        )}

        {/* Custom columns */}
        {customColumns.filter((c) => c.visible).length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {customColumns
              .filter((c) => c.visible)
              .map((col) => (
                <div key={col.key}>
                  <label className={labelCls}>{col.label}</label>
                  <Input
                    type={col.type === "number" ? "number" : "text"}
                    value={(item.custom_data || {})[col.key] ?? ""}
                    onChange={(e) =>
                      onUpdate(index, "custom_data", {
                        ...(item.custom_data || {}),
                        [col.key]: col.type === "number" ? Number(e.target.value) : e.target.value,
                      })
                    }
                    className={`mt-1 ${inputCls}`}
                  />
                </div>
              ))}
          </div>
        )}

        {/* Amount row (if no install_rate visible) */}
        {!isVisible("install_rate") && (
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <span className="text-xs font-medium uppercase text-zinc-500">Amount</span>
            <span className="text-sm font-bold text-zinc-900">₦{computedAmount.toLocaleString()}</span>
          </div>
        )}

        {/* Status hints */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {groupName && (
            <span className="rounded bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">{groupName}</span>
          )}
          {item.image_url && (
            <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
              Image attached
            </span>
          )}
          {item.vat_rate === 0 && <span className="text-red-600">VAT excluded</span>}
          {isDiscountExcluded && <span className="text-red-600">No discount</span>}
          {drVal !== null && drVal !== undefined && drVal > 0 && (
            <span className="text-amber-700">{drVal}% discount</span>
          )}
        </div>
      </div>

      {/* Insert below */}
      <button
        type="button"
        onClick={() => onInsertBelow(index)}
        className="flex w-full items-center justify-center gap-1.5 border-t border-dashed border-zinc-200 bg-zinc-50 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
      >
        <Plus className="h-3 w-3" />
        Add item below
      </button>
    </Card>
  )
}
