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
}) {
  const autoInstall = (() => {
    const col = getColumn('install_rate')
    return col?.formula ? parseFloat(col.formula) * Number(item.quantity || 1) * Number(item.unit_price || 0) : null
  })()

  if (item.row_type === 'group_header') {
    return (
      <div className="bg-gray-800 rounded-lg px-4 py-3 mb-3 flex items-center gap-3">
        <Input
          className="bg-transparent text-white font-bold border-0 border-b border-gray-600 rounded-none flex-1"
          value={item.group_name || ''}
          onChange={e => onUpdate(index, 'group_name', e.target.value)}
          placeholder="Group name"
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onInsertBelow(index)}
            className="text-green-600 border-green-600 hover:bg-green-50 text-xs"
          >
            + Below
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            className="text-red-600 hover:text-red-600 hover:bg-red-50 h-8 w-8"
          >
            ×
          </Button>
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

      <Button
        variant="outline"
        onClick={() => onInsertBelow(index)}
        className="w-full mt-2 border-dashed text-gray-400 hover:border-green-500 hover:text-green-600"
      >
        ＋ Insert item below
      </Button>
    </div>
  )
}
