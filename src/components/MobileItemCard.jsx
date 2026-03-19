/**
 * MobileItemCard.jsx
 *
 * Renders a single invoice line item as a vertical card on mobile.
 * Drop-in replacement for the table <tr> on small screens.
 *
 * Props match exactly what NewInvoice/EditInvoice already have per row.
 */
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import UnitInput from './UnitInput'
import ItemImageUpload from './ItemImageUpload'

export default function MobileItemCard({
  item, index, number,
  isVisible, getColumn, customColumns, showItemImages,
  invoice,
  onUpdate, onRemove, onMoveUp, onMoveDown, onInsertBelow,
  isFirst, isLast,
  computedAmount,
  showInsertBelow = true,
  variant = 'default',
  groupName = '',
}) {
  const autoInstall = (() => {
    const col = getColumn('install_rate')
    return col?.formula
      ? parseFloat(col.formula) * Number(item.quantity || 1) * Number(item.unit_price || 0)
      : null
  })()

  if (item.row_type === 'group_header') {
    return (
      <div className={variant === 'quotation'
        ? 'mb-4 rounded-2xl border border-slate-200 bg-slate-900 p-4 shadow-sm'
        : 'mb-3 flex items-center gap-3 rounded-lg bg-gray-800 px-4 py-3'}
      >
        {variant === 'quotation' ? (
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
            Group Header
          </div>
        ) : null}

        <div className={variant === 'quotation' ? 'flex items-start gap-3' : 'flex items-center gap-3'}>
          <Input
            className={variant === 'quotation'
              ? 'flex-1 border-slate-600 bg-slate-800 text-base font-semibold text-white placeholder:text-slate-400'
              : 'flex-1 rounded-none border-0 border-b border-gray-600 bg-transparent font-bold text-white'}
            value={item.group_name || ''}
            onChange={e => onUpdate(index, 'group_name', e.target.value)}
            placeholder="Group name"
          />

          <div className="flex items-start gap-2">
            {showItemImages ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Picture
                </div>
                <ItemImageUpload value={item.image_url || null} onChange={url => onUpdate(index, 'image_url', url)} />
              </div>
            ) : null}
            {showInsertBelow ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInsertBelow(index)}
                className="border-green-600 text-xs text-green-600 hover:bg-green-50"
              >
                + Below
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(index)}
              className={variant === 'quotation'
                ? 'h-9 w-9 text-red-300 hover:bg-slate-800 hover:text-red-200'
                : 'h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-600'}
            >
              ×
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'quotation') {
    const amount = Number(
      computedAmount ?? Number(item.quantity || 0) * Number(item.unit_price || 0)
    )
    const drVal = item.discount_rate
    const isDiscountExcluded = drVal === 0
    const hasDiscountOverride = drVal !== null && drVal !== undefined

    return (
      <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
              Line Item
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {number}
              </span>
              <span className="truncate text-sm font-semibold text-slate-900">
                {item.description?.trim() || 'New item'}
              </span>
            </div>
            {groupName ? (
              <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {groupName}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMoveUp(index)}
              disabled={isFirst}
              className="h-7 w-7 rounded-full border-slate-200 text-slate-600"
              aria-label="Move item up"
            >
              ▲
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMoveDown(index)}
              disabled={isLast}
              className="h-7 w-7 rounded-full border-slate-200 text-slate-600"
              aria-label="Move item down"
            >
              ▼
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(index)}
              className="h-7 w-7 rounded-full text-red-600 hover:bg-red-50 hover:text-red-600"
              aria-label="Remove item"
            >
              ×
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Description
            </Label>
            <Input
              value={item.description || ''}
              onChange={e => onUpdate(index, 'description', e.target.value)}
              placeholder="Item description"
              className="h-10 rounded-xl border-slate-200"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Sub-description
            </Label>
            <Input
              value={item.sub_description || ''}
              onChange={e => onUpdate(index, 'sub_description', e.target.value)}
              placeholder="Add more context if needed"
              className="h-10 rounded-xl border-slate-200 text-sm"
            />
          </div>

          {isVisible('make') ? (
            <div>
              <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Make / Brand
              </Label>
              <Input
                value={item.make || ''}
                onChange={e => onUpdate(index, 'make', e.target.value)}
                placeholder="Brand or manufacturer"
                className="h-10 rounded-xl border-slate-200"
              />
            </div>
          ) : null}

          <div>
            <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Quantity
            </Label>
            <Input
              type="number"
              min="0"
              value={item.quantity}
              onChange={e => onUpdate(index, 'quantity', Number(e.target.value))}
              className="h-10 rounded-xl border-slate-200"
            />
          </div>

          {isVisible('unit') ? (
            <div>
              <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Unit
              </Label>
              <UnitInput value={item.unit || ''} onChange={val => onUpdate(index, 'unit', val)} />
            </div>
          ) : null}

          <div>
            <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Unit Rate (₦)
            </Label>
            <Input
              type="number"
              min="0"
              value={item.unit_price}
              onChange={e => onUpdate(index, 'unit_price', Number(e.target.value))}
              className="h-10 rounded-xl border-slate-200"
            />
          </div>

          {isVisible('install_rate') ? (
            <div>
              <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Install Rate
              </Label>
              <Input
                type="number"
                min="0"
                value={item.install_rate_override ? (item.install_rate ?? '') : ''}
                placeholder={autoInstall !== null ? String(Number(autoInstall.toFixed(2))) : '0'}
                onChange={e => {
                  const val = e.target.value
                  onUpdate(index, '__install_rate_override', val === ''
                    ? { install_rate_override: false, install_rate: null }
                    : { install_rate_override: true, install_rate: Number(val) }
                  )
                }}
                className="h-10 rounded-xl border-slate-200"
              />
            </div>
          ) : null}

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
              Computed Amount
            </div>
            <div className="mt-1 text-lg font-bold text-slate-900">
              ₦{amount.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Updates automatically from quantity and unit rate.
            </div>
          </div>

          {isVisible('vat_rate') ? (
            <div>
              <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                VAT %
              </Label>
              <Input
                className={`${item.vat_rate !== null && item.vat_rate !== undefined ? 'bg-white' : 'bg-slate-50'} ${item.vat_rate === 0 ? 'text-red-600' : ''} h-10 rounded-xl border-slate-200`}
                type="number"
                min="0"
                max="100"
                value={item.vat_rate !== null && item.vat_rate !== undefined ? item.vat_rate : ''}
                placeholder={String(invoice.vat || 0)}
                onChange={e => {
                  const val = e.target.value
                  onUpdate(index, 'vat_rate', val === '' ? null : Number(val))
                }}
              />
              <div className="mt-1 text-xs text-slate-500">
                Leave blank to use global VAT ({invoice.vat || 0}%).
              </div>
              {item.vat_rate === 0 ? (
                <div className="mt-1 text-[11px] text-red-600">VAT excluded for this item</div>
              ) : null}
            </div>
          ) : null}

          {isVisible('discount_rate') ? (
            <div>
              <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Discount %
              </Label>
              <Input
                className={`${isDiscountExcluded ? 'bg-red-50 text-red-600' : hasDiscountOverride ? 'bg-amber-50' : 'bg-slate-50'} h-10 rounded-xl border-slate-200`}
                type="number"
                min="0"
                max="100"
                value={hasDiscountOverride ? drVal : ''}
                placeholder="global"
                onChange={e => {
                  const val = e.target.value
                  onUpdate(index, 'discount_rate', val === '' ? null : Number(val))
                }}
              />
              <div className="mt-1 text-xs text-slate-500">
                Leave blank to use the global discount.
              </div>
              {isDiscountExcluded ? (
                <div className="mt-1 text-[11px] text-red-600">No discount on this item</div>
              ) : drVal > 0 ? (
                <div className="mt-1 text-[11px] text-amber-700">{drVal}% discount on this row</div>
              ) : null}
            </div>
          ) : null}

          {customColumns.filter(c => c.visible).map(col => (
            <div key={col.key}>
              <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {col.label}
              </Label>
              <Input
                type={col.type === 'number' ? 'number' : 'text'}
                value={(item.custom_data || {})[col.key] || ''}
                onChange={e => onUpdate(index, 'custom_data', {
                  ...(item.custom_data || {}),
                  [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value,
                })}
                className="h-10 rounded-xl border-slate-200"
              />
            </div>
          ))}

        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#1a1a1a', color: 'white', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{number}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMoveUp(index)}
              disabled={isFirst}
              className="h-7 w-7"
            >
              ▲
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMoveDown(index)}
              disabled={isLast}
              className="h-7 w-7"
            >
              ▼
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-600 hover:bg-red-50 h-8 w-8"
        >
          ×
        </Button>
      </div>

      <div className="mb-3">
        <Label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Description</Label>
        <Input value={item.description || ''} onChange={e => onUpdate(index, 'description', e.target.value)} placeholder="Item description" />
        <Input className="mt-1.5 text-[13px] text-gray-500" value={item.sub_description || ''} onChange={e => onUpdate(index, 'sub_description', e.target.value)} placeholder="Sub-description (optional)" />
      </div>

      {isVisible('make') && (
        <div className="mb-3">
          <Label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Make / Brand</Label>
          <Input value={item.make || ''} onChange={e => onUpdate(index, 'make', e.target.value)} placeholder="Brand" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div>
          <Label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Quantity</Label>
          <Input type="number" min="0" value={item.quantity} onChange={e => onUpdate(index, 'quantity', Number(e.target.value))} />
        </div>
        {isVisible('unit') && (
          <div>
            <Label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Unit</Label>
            <UnitInput value={item.unit || ''} onChange={val => onUpdate(index, 'unit', val)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div>
          <Label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Unit Rate (₦)</Label>
          <Input type="number" min="0" value={item.unit_price} onChange={e => onUpdate(index, 'unit_price', Number(e.target.value))} />
        </div>
        <div>
          <Label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Amount</Label>
          <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-bold text-gray-900 border border-gray-200">
            ₦{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toLocaleString()}
          </div>
        </div>
      </div>

      {isVisible('install_rate') && (
        <div className="mb-3">
          <Label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Install Rate</Label>
          <Input
            type="number"
            min="0"
            value={item.install_rate_override ? (item.install_rate ?? '') : ''}
            placeholder={autoInstall !== null ? String(Number(autoInstall.toFixed(2))) : '0'}
            onChange={e => {
              const val = e.target.value
              onUpdate(index, '__install_rate_override', val === ''
                ? { install_rate_override: false, install_rate: null }
                : { install_rate_override: true, install_rate: Number(val) }
              )
            }}
          />
        </div>
      )}

      {isVisible('vat_rate') && (
        <div className="mb-3">
          <Label className="text-xs font-bold text-gray-400 uppercase tracking-wide">VAT % (blank = global {invoice.vat || 0}%)</Label>
          <Input
            className={`${item.vat_rate !== null && item.vat_rate !== undefined ? '' : 'bg-gray-50'} ${item.vat_rate === 0 ? 'text-red-600' : ''}`}
            type="number"
            min="0"
            max="100"
            value={item.vat_rate !== null && item.vat_rate !== undefined ? item.vat_rate : ''}
            placeholder={String(invoice.vat || 0)}
            onChange={e => { const val = e.target.value; onUpdate(index, 'vat_rate', val === '' ? null : Number(val)) }}
          />
          {item.vat_rate === 0 && <div style={{ fontSize: '11px', color: '#CC0000', marginTop: '3px' }}>VAT excluded for this item</div>}
        </div>
      )}

      {isVisible('discount_rate') && (() => {
        const drVal = item.discount_rate
        const isExcluded = drVal === 0
        const hasOverride = drVal !== null && drVal !== undefined
        return (
          <div className="mb-3">
            <Label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Discount % (blank = global)</Label>
            <Input
              className={`${isExcluded ? 'bg-red-50 text-red-600' : hasOverride ? 'bg-yellow-50' : 'bg-gray-50'}`}
              type="number"
              min="0"
              max="100"
              value={hasOverride ? drVal : ''}
              placeholder="global"
              onChange={e => { const val = e.target.value; onUpdate(index, 'discount_rate', val === '' ? null : Number(val)) }}
            />
            {isExcluded
              ? <div style={{ fontSize: '11px', color: '#CC0000', marginTop: '3px' }}>No discount on this item</div>
              : drVal > 0
                ? <div style={{ fontSize: '11px', color: '#B45309', marginTop: '3px' }}>{drVal}% discount on this row</div>
                : null
            }
          </div>
        )
      })()}

      {customColumns.filter(c => c.visible).map(col => (
        <div key={col.key} className="mb-3">
          <Label className="text-xs font-bold text-gray-400 uppercase tracking-wide">{col.label}</Label>
          <Input
            type={col.type === 'number' ? 'number' : 'text'}
            value={(item.custom_data || {})[col.key] || ''}
            onChange={e => onUpdate(index, 'custom_data', { ...(item.custom_data || {}), [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value })}
          />
        </div>
      ))}

      {showItemImages && (
        <div className="mb-3">
          <Label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Item Image</Label>
          <ItemImageUpload value={item.image_url || null} onChange={url => onUpdate(index, 'image_url', url)} />
        </div>
      )}

      {showInsertBelow ? (
        <Button
          variant="outline"
          onClick={() => onInsertBelow(index)}
          className="w-full mt-2 border-dashed text-gray-400 hover:border-green-500 hover:text-green-600"
        >
          ＋ Insert item below
        </Button>
      ) : null}
    </div>
  )
}
