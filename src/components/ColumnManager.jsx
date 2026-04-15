import { useState } from 'react'
import { GripVertical, Eye, EyeOff, Plus, RotateCcw, X, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { COLUMN_TYPES } from './useInvoiceColumns.jsx'

function ColumnRow({ col, isCustom, onToggle, onUpdate, onRemoveCustom, onDragStart, onDragOver, onDrop, typeLabel }) {
  return (
    <div className={`flex items-start gap-2 rounded-[14px] border border-[#e2e8f0] bg-white px-3 py-2.5 ${!col.visible ? 'opacity-60' : ''}`}>
      <button
        type="button"
        draggable
        onDragStart={(e) => onDragStart(e, col.key)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, col.key)}
        className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-[10px] border border-[#e2e8f0] text-zinc-500"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onToggle(col.key)}
        className={`h-8 w-8 rounded-[10px] border ${col.visible ? 'border-[#dbe3ee] bg-white text-[#334155]' : 'border-[#fecaca] bg-[#fff5f5] text-[#ef4444]'}`}
        title={col.visible ? 'Hide column' : 'Show column'}
      >
        {col.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </Button>

      <div className="min-w-0 flex-1 space-y-2">
        <Input
          value={col.label || ''}
          onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
          placeholder="Column name"
          className="h-9 rounded-[10px] border-[#e2e8f0]"
        />

        {col.key === 'install_rate' ? (
          <Input
            type="number"
            step="0.01"
            min="0"
            value={col.formula || ''}
            onChange={(e) => onUpdate(col.key, 'formula', e.target.value)}
            placeholder="Install formula"
            className="h-9 rounded-[10px] border-[#e2e8f0]"
          />
        ) : null}

        {isCustom ? (
          <div className="flex items-center gap-2">
            <select
              value={col.type}
              onChange={(e) => onUpdate(col.key, 'type', e.target.value)}
              className="h-9 rounded-[10px] border border-[#e2e8f0] bg-white px-2 text-sm"
            >
              {COLUMN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {col.type === 'number' ? (
              <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={!!col.includeInTotal}
                  onChange={(e) => onUpdate(col.key, 'includeInTotal', e.target.checked)}
                />
                Add to total
              </label>
            ) : null}
          </div>
        ) : (
          <div className="text-[11px] text-zinc-500">{typeLabel(col.type || 'text')}</div>
        )}
      </div>

      {isCustom ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemoveCustom(col.key)}
          className="h-8 w-8 rounded-[10px] text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  )
}

export default function ColumnManager({
  columns,
  onUpdate,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  onReset,
  onMove,
  onClose,
  items = [],
  onResetItemOverrides,
}) {
  const builtinCols = columns.filter((c) => !c.key.startsWith('custom_'))
  const customCols = columns.filter((c) => c.key.startsWith('custom_'))
  const [confirmReset, setConfirmReset] = useState(false)

  const standardItems = items.filter((i) => i.row_type === 'standard')
  const vatOverrideCount = standardItems.filter((i) => i.vat_rate != null).length
  const discountOverrideCount = standardItems.filter((i) => i.discount_rate != null).length
  const installOverrideCount = standardItems.filter((i) => i.install_rate_override === true).length

  const handleDragStart = (e, key) => e.dataTransfer.setData('text/plain', key)
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = (e, targetKey) => {
    e.preventDefault()
    const draggedKey = e.dataTransfer.getData('text/plain')
    if (!draggedKey || draggedKey === targetKey || !onMove) return
    const toIdx = columns.findIndex((c) => c.key === targetKey)
    if (toIdx < 0) return
    onMove(draggedKey, toIdx)
  }

  const handleResetTable = () => {
    onReset()
    setConfirmReset(false)
  }

  const typeLabel = (t) => ({ install_rate: 'Rate', vat_rate: 'VAT%', discount_rate: 'Disc%' }[t] || t)

  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[24px] border border-[#e2e8f0] bg-[#f8fafc] sm:rounded-[24px]">
        <div className="flex items-start justify-between border-b border-[#e2e8f0] bg-white px-4 py-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Table Settings</h3>
            <p className="text-xs text-zinc-500">Manage columns and row behavior</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-[10px]">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Columns</div>
            <div className="space-y-2">
              {builtinCols.map((col) => (
                <ColumnRow key={col.key} col={col} isCustom={false} onToggle={onToggle} onUpdate={onUpdate} onRemoveCustom={onRemoveCustom} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} typeLabel={typeLabel} />
              ))}
            </div>
          </section>

          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Custom Columns</div>
              <Button type="button" variant="outline" size="sm" onClick={onAddCustom} className="h-8 gap-1.5 rounded-[10px] border-[#dbe3ee] bg-white">
                <Plus className="h-3.5 w-3.5" />
                Add column
              </Button>
            </div>
            {customCols.length === 0 ? <div className="rounded-[14px] border border-dashed border-[#dbe3ee] bg-white px-3 py-4 text-sm text-zinc-500">No custom columns</div> : null}
            <div className="space-y-2">
              {customCols.map((col) => (
                <ColumnRow key={col.key} col={col} isCustom={true} onToggle={onToggle} onUpdate={onUpdate} onRemoveCustom={onRemoveCustom} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} typeLabel={typeLabel} />
              ))}
            </div>
          </section>

          {onResetItemOverrides ? (
            <section className="mt-5 rounded-[18px] border border-[#e2e8f0] bg-white p-3">
              <div className="text-sm font-semibold text-zinc-900">Row Overrides</div>
              <p className="mb-3 text-xs text-zinc-500">Clear per-row VAT, discount, and install overrides</p>
              {[
                { label: 'VAT overrides', count: vatOverrideCount, fields: { vat: true } },
                { label: 'Discount overrides', count: discountOverrideCount, fields: { discount: true } },
                { label: 'Install rate', count: installOverrideCount, fields: { install: true } },
              ].map(({ label, count, fields }) => (
                <div key={label} className="mb-2 flex items-center justify-between gap-2 rounded-[12px] border border-[#e2e8f0] px-2.5 py-2">
                  <div className="text-sm text-zinc-700">{label} <span className="text-zinc-500">({count})</span></div>
                  <Button type="button" variant="outline" size="sm" disabled={count === 0} onClick={() => onResetItemOverrides(fields)} className="h-7 rounded-[10px] px-2 text-xs">Reset</Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={vatOverrideCount + discountOverrideCount + installOverrideCount === 0}
                onClick={() => onResetItemOverrides({ vat: true, discount: true, install: true })}
                className="mt-1 h-8 w-full rounded-[10px] text-xs"
              >
                Reset all row overrides
              </Button>
            </section>
          ) : null}

          <section className="mt-5 rounded-[18px] border border-[#fecaca] bg-[#fff5f5] p-3">
            <div className="text-sm font-semibold text-[#7f1d1d]">Table Reset</div>
            <p className="mt-0.5 text-xs text-[#b91c1c]">Restores columns, labels, and layout. Does not remove items.</p>
            {confirmReset ? (
              <div className="mt-3 rounded-[12px] border border-[#f5c2c7] bg-white px-3 py-3">
                <div className="text-sm text-[#7f1d1d]">Reset table to default?</div>
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setConfirmReset(false)} className="h-9 flex-1 rounded-[10px]">Cancel</Button>
                  <Button type="button" onClick={handleResetTable} className="h-9 flex-1 rounded-[10px] bg-[#dc2626] text-white hover:bg-[#b91c1c]">
                    Confirm reset
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setConfirmReset(true)} className="mt-3 h-9 gap-1.5 rounded-[10px] border-[#f5c2c7] bg-white text-[#b91c1c]">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset table to default
              </Button>
            )}
          </section>
        </div>

        <div className="border-t border-[#e2e8f0] bg-white px-4 py-3">
          <Button type="button" onClick={onClose} className="h-10 w-full rounded-[12px] bg-[#0f172a] text-white hover:bg-[#111827]">
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
