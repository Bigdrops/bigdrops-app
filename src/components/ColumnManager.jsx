import { useState } from 'react'
import { GripVertical, Eye, EyeOff, Plus, RotateCcw, Settings2, X, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { COLUMN_TYPES } from './useInvoiceColumns.jsx'

function ColumnRow({ col, isCustom, onToggle, onUpdate, onRemoveCustom, onDragStart, onDragOver, onDrop, typeLabel }) {
  return (
    <div className={`flex items-start gap-2 border-b border-zinc-200 py-2.5 ${!col.visible ? 'opacity-60' : ''}`}>
      <button
        type="button"
        draggable
        onDragStart={(e) => onDragStart(e, col.key)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, col.key)}
        className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onToggle(col.key)}
        className="h-8 w-8 rounded-lg border-zinc-300"
        title={col.visible ? 'Hide column' : 'Show column'}
      >
        {col.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </Button>

      <div className="min-w-0 flex-1 space-y-2">
        <Input
          value={col.label || ''}
          onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
          placeholder="Column name"
          className="h-8"
        />

        {col.key === 'install_rate' ? (
          <Input
            type="number"
            step="0.01"
            min="0"
            value={col.formula || ''}
            onChange={(e) => onUpdate(col.key, 'formula', e.target.value)}
            placeholder="Install formula"
            className="h-8"
          />
        ) : null}

        {isCustom ? (
          <div className="flex items-center gap-2">
            <select
              value={col.type}
              onChange={(e) => onUpdate(col.key, 'type', e.target.value)}
              className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm"
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
          className="h-8 w-8 rounded-lg text-red-600"
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
    if (!window.confirm('Reset table to default? This restores columns, labels, and layout. Items are not removed.')) return
    onReset()
  }

  const typeLabel = (t) => ({ install_rate: 'Rate', vat_rate: 'VAT%', discount_rate: 'Disc%' }[t] || t)

  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Table Settings</h3>
            <p className="text-xs text-zinc-500">Manage columns and row behavior</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Columns</div>
            <div>
              {builtinCols.map((col) => (
                <ColumnRow key={col.key} col={col} isCustom={false} onToggle={onToggle} onUpdate={onUpdate} onRemoveCustom={onRemoveCustom} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} typeLabel={typeLabel} />
              ))}
            </div>
          </section>

          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Custom Columns</div>
              <Button type="button" variant="outline" size="sm" onClick={onAddCustom} className="h-8 gap-1.5 rounded-lg">
                <Plus className="h-3.5 w-3.5" />
                Add column
              </Button>
            </div>
            {customCols.length === 0 ? <div className="text-sm text-zinc-500">No custom columns</div> : null}
            <div>
              {customCols.map((col) => (
                <ColumnRow key={col.key} col={col} isCustom={true} onToggle={onToggle} onUpdate={onUpdate} onRemoveCustom={onRemoveCustom} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} typeLabel={typeLabel} />
              ))}
            </div>
          </section>

          {onResetItemOverrides ? (
            <section className="mt-4">
              <div className="text-sm font-semibold text-zinc-900">Row Overrides</div>
              <p className="mb-2 text-xs text-zinc-500">Clear per-row VAT, discount, and install overrides</p>
              {[
                { label: 'VAT overrides', count: vatOverrideCount, fields: { vat: true } },
                { label: 'Discount overrides', count: discountOverrideCount, fields: { discount: true } },
                { label: 'Install rate', count: installOverrideCount, fields: { install: true } },
              ].map(({ label, count, fields }) => (
                <div key={label} className="mb-1.5 flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-2.5 py-2">
                  <div className="text-sm text-zinc-700">{label} <span className="text-zinc-500">({count})</span></div>
                  <Button type="button" variant="outline" size="sm" disabled={count === 0} onClick={() => onResetItemOverrides(fields)} className="h-7 rounded-md px-2 text-xs">Reset</Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={vatOverrideCount + discountOverrideCount + installOverrideCount === 0}
                onClick={() => onResetItemOverrides({ vat: true, discount: true, install: true })}
                className="mt-1 h-8 w-full rounded-md text-xs"
              >
                Reset all row overrides
              </Button>
            </section>
          ) : null}

          <section className="mt-5 border-t border-zinc-200 pt-3">
            <div className="text-sm font-semibold text-zinc-900">Table</div>
            <p className="mt-0.5 text-xs text-zinc-500">Restores columns, labels, and layout. Does not remove items.</p>
            <Button type="button" variant="outline" onClick={handleResetTable} className="mt-2 h-8 gap-1.5 rounded-md text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset table to default
            </Button>
          </section>
        </div>
      </div>
    </div>
  )
}
