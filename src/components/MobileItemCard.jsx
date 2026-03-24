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
    if (variant === 'quotation') {
      return (
        <div className="mb-3 border border-border bg-[#f4f4f4] shadow-sm">
          <div className="border-l-[3px] border-l-blue-600 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Group
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
                className="h-7 w-7 rounded-none text-red-500 hover:bg-white hover:text-red-600"
              >
                x
              </Button>
            </div>

            <Input
              className="h-10 rounded-none border-0 border-b border-input bg-background px-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground"
              value={item.group_name || ''}
              onChange={e => onUpdate(index, 'group_name', e.target.value)}
              placeholder="Group name"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {showInsertBelow ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onInsertBelow(index)}
                  className="h-8 rounded-none px-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
                >
                  + Add line item
                </Button>
              ) : null}

              {showItemImages ? (
                <div className="ml-auto flex items-center gap-2 border border-border bg-card px-2 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Image
                  </span>
                  <ItemImageUpload value={item.image_url || null} onChange={url => onUpdate(index, 'image_url', url)} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="mb-3 flex items-center gap-3 rounded-lg bg-gray-800 px-4 py-3">
        <Input
          className="flex-1 rounded-none border-0 border-b border-gray-600 bg-transparent font-bold text-white"
          value={item.group_name || ''}
          onChange={e => onUpdate(index, 'group_name', e.target.value)}
          placeholder="Group name"
        />

        <div className="flex items-start gap-2">
          {showItemImages ? (
            <div className="rounded-xl border border-border bg-muted/50 px-2 py-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
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
            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-600"
          >
            x
          </Button>
        </div>
      </div>
    )
  }

  if (variant === 'quotation') {
    const amount = Number(
      computedAmount ?? Number(item.quantity || 0) * Number(item.unit_price || 0),
    )
    const drVal = item.discount_rate
    const isDiscountExcluded = drVal === 0
    const hasDiscountOverride = drVal !== null && drVal !== undefined
    const compactLabel = 'mb-1 block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500'
    const compactInput = 'h-9 rounded-none border-0 border-b border-slate-300 bg-white px-2 text-sm shadow-none focus-visible:ring-0'

    return (
      <div className="mb-3 border border-border bg-[#f4f4f4] shadow-sm">
        <div className="border-l-[3px] border-l-blue-600 px-3 py-3">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Item {number}
              </div>
              <Input
                value={item.description || ''}
                onChange={e => onUpdate(index, 'description', e.target.value)}
                placeholder="Item description"
                className="h-10 rounded-none border-0 bg-transparent px-0 text-sm font-semibold text-foreground shadow-none focus-visible:ring-0"
              />
              <Input
                value={item.sub_description || ''}
                onChange={e => onUpdate(index, 'sub_description', e.target.value)}
                placeholder="Add more context if needed"
                className="mt-1 h-7 rounded-none border-0 bg-transparent px-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMoveUp(index)}
                disabled={isFirst}
                className="h-7 w-7 rounded-none border border-border bg-card px-0 text-[10px] text-muted-foreground hover:bg-muted/50"
                aria-label="Move item up"
              >
                Up
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMoveDown(index)}
                disabled={isLast}
                className="h-7 w-7 rounded-none border border-border bg-card px-0 text-[10px] text-muted-foreground hover:bg-muted/50"
                aria-label="Move item down"
              >
                Dn
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
                className="h-7 w-7 rounded-none text-red-600 hover:bg-white hover:text-red-700"
                aria-label="Remove item"
              >
                x
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className={compactLabel}>Qty</Label>
              <Input
                type="number"
                min="0"
                value={item.quantity}
                onChange={e => onUpdate(index, 'quantity', Number(e.target.value))}
                className={compactInput}
              />
            </div>

            <div>
              <Label className={compactLabel}>Unit Rate (N)</Label>
              <Input
                type="number"
                min="0"
                value={item.unit_price}
                onChange={e => onUpdate(index, 'unit_price', Number(e.target.value))}
                className={compactInput}
              />
            </div>

            {isVisible('unit') ? (
              <div>
                <Label className={compactLabel}>Unit</Label>
                <UnitInput value={item.unit || ''} onChange={val => onUpdate(index, 'unit', val)} />
              </div>
            ) : null}

            {isVisible('install_rate') ? (
              <div>
                <Label className={compactLabel}>Install (N)</Label>
                <Input
                  type="number"
                  min="0"
                  value={item.install_rate_override ? (item.install_rate ?? '') : ''}
                  placeholder={autoInstall !== null ? String(Number(autoInstall.toFixed(2))) : '0'}
                  onChange={e => {
                    const val = e.target.value
                    onUpdate(
                      index,
                      '__install_rate_override',
                      val === ''
                        ? { install_rate_override: false, install_rate: null }
                        : { install_rate_override: true, install_rate: Number(val) },
                    )
                  }}
                  className={compactInput}
                />
              </div>
            ) : null}

            {isVisible('make') ? (
              <div className="col-span-2">
                <Label className={compactLabel}>Make / Brand</Label>
                <Input
                  value={item.make || ''}
                  onChange={e => onUpdate(index, 'make', e.target.value)}
                  placeholder="Brand or manufacturer"
                  className={compactInput}
                />
              </div>
            ) : null}

            {isVisible('vat_rate') ? (
              <div>
                <Label className={compactLabel}>VAT %</Label>
                <Input
                  className={`${item.vat_rate !== null && item.vat_rate !== undefined ? 'bg-white' : 'bg-slate-50'} ${item.vat_rate === 0 ? 'text-red-600' : ''} ${compactInput}`}
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
              </div>
            ) : null}

            {isVisible('discount_rate') ? (
              <div>
                <Label className={compactLabel}>Discount %</Label>
                <Input
                  className={`${isDiscountExcluded ? 'bg-red-50 text-red-600' : hasDiscountOverride ? 'bg-amber-50' : 'bg-slate-50'} ${compactInput}`}
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
              </div>
            ) : null}

            {customColumns.filter(c => c.visible).map(col => (
              <div key={col.key} className="col-span-2">
                <Label className={compactLabel}>{col.label}</Label>
                <Input
                  type={col.type === 'number' ? 'number' : 'text'}
                  value={(item.custom_data || {})[col.key] || ''}
                  onChange={e => onUpdate(index, 'custom_data', {
                    ...(item.custom_data || {}),
                    [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value,
                  })}
                  className={compactInput}
                />
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="space-y-1">
              {groupName ? (
                <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {groupName}
                </div>
              ) : null}
              {item.vat_rate === 0 ? (
                <div className="text-[11px] text-red-600">VAT excluded for this item</div>
              ) : null}
              {isDiscountExcluded ? (
                <div className="text-[11px] text-red-600">No discount on this item</div>
              ) : drVal > 0 ? (
                <div className="text-[11px] text-amber-700">{drVal}% discount on this row</div>
              ) : null}
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Amount</div>
              <div className="text-sm font-bold text-foreground">N{amount.toLocaleString()}</div>
            </div>
          </div>

          {showItemImages ? (
            <div className="mt-3 border border-border bg-card px-2 py-2">
              <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Item image
              </div>
              <ItemImageUpload value={item.image_url || null} onChange={url => onUpdate(index, 'image_url', url)} />
            </div>
          ) : null}

          {showInsertBelow ? (
            <Button
              variant="ghost"
              onClick={() => onInsertBelow(index)}
              className="mt-3 h-8 w-full rounded-none border border-dashed border-border bg-card text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
            >
              + Add line item below
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-3 rounded-xl border border-gray-200 bg-card p-4 shadow-sm">
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
              ^
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMoveDown(index)}
              disabled={isLast}
              className="h-7 w-7"
            >
              v
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-600"
        >
          x
        </Button>
      </div>

      <div className="mb-3">
        <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">Description</Label>
        <Input value={item.description || ''} onChange={e => onUpdate(index, 'description', e.target.value)} placeholder="Item description" />
        <Input className="mt-1.5 text-[13px] text-gray-500" value={item.sub_description || ''} onChange={e => onUpdate(index, 'sub_description', e.target.value)} placeholder="Sub-description (optional)" />
      </div>

      {isVisible('make') ? (
        <div className="mb-3">
          <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">Make / Brand</Label>
          <Input value={item.make || ''} onChange={e => onUpdate(index, 'make', e.target.value)} placeholder="Brand" />
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <div>
          <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">Quantity</Label>
          <Input type="number" min="0" value={item.quantity} onChange={e => onUpdate(index, 'quantity', Number(e.target.value))} />
        </div>
        {isVisible('unit') ? (
          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">Unit</Label>
            <UnitInput value={item.unit || ''} onChange={val => onUpdate(index, 'unit', val)} />
          </div>
        ) : null}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <div>
          <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">Unit Rate (N)</Label>
          <Input type="number" min="0" value={item.unit_price} onChange={e => onUpdate(index, 'unit_price', Number(e.target.value))} />
        </div>
        <div>
          <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">Amount</Label>
          <div className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-bold text-gray-900">
            N{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toLocaleString()}
          </div>
        </div>
      </div>

      {isVisible('install_rate') ? (
        <div className="mb-3">
          <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">Install Rate</Label>
          <Input
            type="number"
            min="0"
            value={item.install_rate_override ? (item.install_rate ?? '') : ''}
            placeholder={autoInstall !== null ? String(Number(autoInstall.toFixed(2))) : '0'}
            onChange={e => {
              const val = e.target.value
              onUpdate(
                index,
                '__install_rate_override',
                val === ''
                  ? { install_rate_override: false, install_rate: null }
                  : { install_rate_override: true, install_rate: Number(val) },
              )
            }}
          />
        </div>
      ) : null}

      {isVisible('vat_rate') ? (
        <div className="mb-3">
          <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">VAT % (blank = global {invoice.vat || 0}%)</Label>
          <Input
            className={`${item.vat_rate !== null && item.vat_rate !== undefined ? '' : 'bg-gray-50'} ${item.vat_rate === 0 ? 'text-red-600' : ''}`}
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
          {item.vat_rate === 0 ? <div style={{ fontSize: '11px', color: '#CC0000', marginTop: '3px' }}>VAT excluded for this item</div> : null}
        </div>
      ) : null}

      {isVisible('discount_rate') ? (() => {
        const dr = item.discount_rate
        const isExcluded = dr === 0
        const hasOverride = dr !== null && dr !== undefined

        return (
          <div className="mb-3">
            <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">Discount % (blank = global)</Label>
            <Input
              className={`${isExcluded ? 'bg-red-50 text-red-600' : hasOverride ? 'bg-yellow-50' : 'bg-gray-50'}`}
              type="number"
              min="0"
              max="100"
              value={hasOverride ? dr : ''}
              placeholder="global"
              onChange={e => {
                const val = e.target.value
                onUpdate(index, 'discount_rate', val === '' ? null : Number(val))
              }}
            />
            {isExcluded
              ? <div style={{ fontSize: '11px', color: '#CC0000', marginTop: '3px' }}>No discount on this item</div>
              : dr > 0
                ? <div style={{ fontSize: '11px', color: '#B45309', marginTop: '3px' }}>{dr}% discount on this row</div>
                : null}
          </div>
        )
      })() : null}

      {customColumns.filter(c => c.visible).map(col => (
        <div key={col.key} className="mb-3">
          <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">{col.label}</Label>
          <Input
            type={col.type === 'number' ? 'number' : 'text'}
            value={(item.custom_data || {})[col.key] || ''}
            onChange={e => onUpdate(index, 'custom_data', { ...(item.custom_data || {}), [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value })}
          />
        </div>
      ))}

      {showItemImages ? (
        <div className="mb-3">
          <Label className="text-xs font-bold uppercase tracking-wide text-gray-400">Item Image</Label>
          <ItemImageUpload value={item.image_url || null} onChange={url => onUpdate(index, 'image_url', url)} />
        </div>
      ) : null}

      {showInsertBelow ? (
        <Button
          variant="outline"
          onClick={() => onInsertBelow(index)}
          className="mt-2 w-full border-dashed text-gray-400 hover:border-green-500 hover:text-green-600"
        >
          + Insert item below
        </Button>
      ) : null}
    </div>
  )
}
