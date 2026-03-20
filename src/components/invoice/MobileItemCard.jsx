import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, ImagePlus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import UnitInput from '@/components/UnitInput'
import ItemImageUpload from '@/components/ItemImageUpload'

const labelCls = 'text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500'
const inputCls = 'mt-1 h-10 rounded-2xl border-zinc-200 bg-white text-sm text-zinc-900'

export default function MobileItemCard({
  item,
  index,
  number,
  invoice,
  customColumns,
  computedAmount,
  groupName = '',
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onInsertBelow,
  isVisible,
  getColumn,
}) {
  const [showImageSlot, setShowImageSlot] = useState(Boolean(item.image_url))

  useEffect(() => {
    if (item.image_url) setShowImageSlot(true)
  }, [item.image_url])

  const autoInstall = (() => {
    const col = getColumn('install_rate')
    return col?.formula
      ? parseFloat(col.formula) * Number(item.quantity || 1) * Number(item.unit_price || 0)
      : null
  })()

  const discountValue = item.discount_rate
  const hasDiscountOverride = discountValue !== null && discountValue !== undefined
  const discountExcluded = discountValue === 0

  return (
    <Card className="overflow-hidden rounded-[22px] border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white">
          {number}
        </span>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-zinc-500"
            disabled={isFirst}
            onClick={() => onMoveUp(index)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-zinc-500"
            disabled={isLast}
            onClick={() => onMoveDown(index)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-xl ${item.image_url ? 'text-emerald-600' : 'text-zinc-500'}`}
            onClick={() => setShowImageSlot((current) => !current)}
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-3.5">
        <div>
          <Input
            value={item.description || ''}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
            placeholder="Item description"
            className="h-11 rounded-2xl border-zinc-200 bg-white text-sm font-semibold"
          />
          <Input
            value={item.sub_description || ''}
            onChange={(e) => onUpdate(index, 'sub_description', e.target.value)}
            placeholder="Additional details"
            className="mt-2 h-9 rounded-2xl border-zinc-200 bg-zinc-50 text-xs text-zinc-600"
          />
        </div>

        {isVisible('make') ? (
          <div>
            <label className={labelCls}>Make / Brand</label>
            <Input
              value={item.make || ''}
              onChange={(e) => onUpdate(index, 'make', e.target.value)}
              placeholder="Brand or manufacturer"
              className={inputCls}
            />
          </div>
        ) : null}

        <div className={`grid gap-2 ${isVisible('unit') ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div>
            <label className={labelCls}>Qty</label>
            <Input
              type="number"
              min="0"
              value={item.quantity ?? 1}
              onChange={(e) => onUpdate(index, 'quantity', Number(e.target.value))}
              className={inputCls}
            />
          </div>

          {isVisible('unit') ? (
            <div>
              <label className={labelCls}>Unit</label>
              <div className="mt-1">
                <UnitInput value={item.unit || ''} onChange={(value) => onUpdate(index, 'unit', value)} />
              </div>
            </div>
          ) : null}

          <div>
            <label className={labelCls}>Rate (NGN)</label>
            <Input
              type="number"
              min="0"
              value={item.unit_price ?? 0}
              onChange={(e) => onUpdate(index, 'unit_price', Number(e.target.value))}
              className={inputCls}
            />
          </div>
        </div>

        {isVisible('install_rate') ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Install (NGN)</label>
              <Input
                type="number"
                min="0"
                value={item.install_rate_override ? item.install_rate ?? '' : ''}
                placeholder={autoInstall !== null ? String(Number(autoInstall.toFixed(2))) : '0'}
                onChange={(e) => {
                  const value = e.target.value
                  onUpdate(
                    index,
                    '__install_rate_override',
                    value === ''
                      ? { install_rate_override: false, install_rate: null }
                      : { install_rate_override: true, install_rate: Number(value) },
                  )
                }}
                className={inputCls}
              />
            </div>

            <div className="flex flex-col justify-end">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-right">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Amount</div>
                <div className="mt-1 text-sm font-bold text-zinc-900">NGN {Number(computedAmount || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Amount</span>
            <span className="text-sm font-bold text-zinc-900">NGN {Number(computedAmount || 0).toLocaleString()}</span>
          </div>
        )}

        {(isVisible('vat_rate') || isVisible('discount_rate')) ? (
          <div className="grid grid-cols-2 gap-2">
            {isVisible('vat_rate') ? (
              <div>
                <label className={labelCls}>VAT %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={item.vat_rate !== null && item.vat_rate !== undefined ? item.vat_rate : ''}
                  placeholder={String(invoice.vat || 0)}
                  onChange={(e) => {
                    const value = e.target.value
                    onUpdate(index, 'vat_rate', value === '' ? null : Number(value))
                  }}
                  className={`${inputCls} ${item.vat_rate === 0 ? 'border-red-300 bg-red-50 text-red-600' : ''}`}
                />
              </div>
            ) : null}

            {isVisible('discount_rate') ? (
              <div>
                <label className={labelCls}>Discount %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={hasDiscountOverride ? discountValue : ''}
                  placeholder="global"
                  onChange={(e) => {
                    const value = e.target.value
                    onUpdate(index, 'discount_rate', value === '' ? null : Number(value))
                  }}
                  className={`${inputCls} ${discountExcluded ? 'border-red-300 bg-red-50 text-red-600' : hasDiscountOverride ? 'border-amber-300 bg-amber-50' : ''}`}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {customColumns.filter((column) => column.visible).length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {customColumns
              .filter((column) => column.visible)
              .map((column) => (
                <div key={column.key}>
                  <label className={labelCls}>{column.label}</label>
                  <Input
                    type={column.type === 'number' ? 'number' : 'text'}
                    value={(item.custom_data || {})[column.key] ?? ''}
                    onChange={(e) =>
                      onUpdate(index, 'custom_data', {
                        ...(item.custom_data || {}),
                        [column.key]: column.type === 'number' ? Number(e.target.value) : e.target.value,
                      })
                    }
                    className={inputCls}
                  />
                </div>
              ))}
          </div>
        ) : null}

        {showImageSlot || item.image_url ? (
          <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Item Image</div>
            <ItemImageUpload value={item.image_url || null} onChange={(url) => onUpdate(index, 'image_url', url)} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {groupName ? <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">{groupName}</span> : null}
          {item.image_url ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Image attached</span> : null}
          {item.vat_rate === 0 ? <span className="text-red-600">VAT excluded</span> : null}
          {discountExcluded ? <span className="text-red-600">No discount</span> : null}
          {hasDiscountOverride && !discountExcluded && Number(discountValue) > 0 ? (
            <span className="text-amber-700">{discountValue}% row discount</span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onInsertBelow(index)}
        className="flex w-full items-center justify-center gap-1.5 border-t border-dashed border-zinc-200 bg-zinc-50 py-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
      >
        <Plus className="h-3.5 w-3.5" />
        Add item below
      </button>
    </Card>
  )
}
