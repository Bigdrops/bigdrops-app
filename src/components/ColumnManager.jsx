import { useState } from 'react'
import {
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'

import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Sheet, SheetContent } from '../components/ui/sheet'
import { cn } from '@/lib/utils'
import { COLUMN_TYPES } from './useInvoiceColumns.jsx'

const FIXED_PDF_COLUMNS = [
  { key: 'description', label: 'Description' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unit_price', label: 'Unit Price' },
  { key: 'amount', label: 'Amount' },
]

function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
        {children}
      </div>
      {action}
    </div>
  )
}

function BuiltInColumnRow({
  col,
  onToggle,
  onUpdate,
  onDragStart,
  onDragOver,
  onDrop,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
  typeLabel,
}) {
  return (
    <div
      className={cn(
        'rounded-[18px] border bg-white px-3 py-3 transition',
        col.visible
          ? 'border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          : 'border-slate-200 bg-slate-50/70 opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 flex-col gap-1 pt-1">
          <button
            type="button"
            draggable
            onDragStart={(e) => onDragStart(e, col.key)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, col.key)}
            className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-slate-200 bg-slate-50 text-slate-400"
            aria-label={`Drag ${col.label}`}
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onToggle(col.key)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-[9px] border transition',
              col.visible
                ? 'border-slate-200 bg-slate-50 text-slate-700'
                : 'border-slate-300 bg-slate-100 text-slate-500',
            )}
            aria-label={col.visible ? `Hide ${col.label}` : `Show ${col.label}`}
            title={col.visible ? 'Hide column' : 'Show column'}
          >
            {col.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <Input
            value={col.label || ''}
            onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
            placeholder="Column label"
            className="h-11 rounded-[14px] border-slate-200 bg-slate-50 px-4 text-[15px] font-medium text-slate-900"
          />

          {col.key === 'install_rate' ? (
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={col.formula || ''}
                onChange={(e) => onUpdate(col.key, 'formula', e.target.value)}
                placeholder="e.g. 0.15"
                className="h-10 rounded-[12px] border-slate-200 bg-slate-50 text-sm"
              />
              <span className="shrink-0 text-xs font-semibold text-slate-500">Multiplier</span>
            </div>
          ) : null}

          <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-500">
            {typeLabel(col.type || 'text')}
          </div>

        </div>

        <div className="flex shrink-0 flex-col gap-1 pt-1">
          <button
            type="button"
            onClick={() => onMoveUp?.(col.key)}
            disabled={disableMoveUp}
            className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-slate-200 bg-slate-50 text-slate-500 disabled:opacity-30"
            aria-label={`Move ${col.label} up`}
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown?.(col.key)}
            disabled={disableMoveDown}
            className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-slate-200 bg-slate-50 text-slate-500 disabled:opacity-30"
            aria-label={`Move ${col.label} down`}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomColumnCard({
  col,
  onToggle,
  onUpdate,
  onRemoveCustom,
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition',
        col.visible ? 'border-slate-200' : 'border-slate-200 bg-slate-50/70 opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(col.key)}
          className={cn(
            'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border transition',
            col.visible
              ? 'border-slate-200 bg-slate-50 text-slate-700'
              : 'border-slate-300 bg-slate-100 text-slate-500',
          )}
          aria-label={col.visible ? `Hide ${col.label}` : `Show ${col.label}`}
          title={col.visible ? 'Hide column' : 'Show column'}
        >
          {col.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <Input
            value={col.label || ''}
            onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
            placeholder="Column label"
            className="h-11 rounded-[14px] border-slate-200 bg-slate-50 px-4 text-[15px] font-medium text-slate-900"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
              {COLUMN_TYPES.map((t) => {
                const value = t.value ?? t
                const label = t.label ?? t
                const active = col.type === value

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onUpdate(col.key, 'type', value)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-[12px] font-medium transition',
                      active
                        ? 'bg-white text-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05)]'
                        : 'text-slate-500',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {col.type === 'number' ? (
              <label className="ml-auto flex items-center gap-2 text-[13px] text-slate-700">
                <input
                  type="checkbox"
                  checked={!!col.includeInTotal}
                  onChange={(e) => onUpdate(col.key, 'includeInTotal', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Add to total
              </label>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemoveCustom(col.key)}
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
          aria-label={`Delete ${col.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function FixedColumnRow({ col }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-slate-200 bg-white text-slate-400">
          <Eye className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <Input
            value={col.label}
            readOnly
            className="h-11 rounded-[14px] border-slate-200 bg-white px-4 text-[15px] font-medium text-slate-900"
          />

          <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-500">
            Always shown in PDF
          </div>
        </div>
      </div>
    </div>
  )
}

function OverrideRow({ label, count, onReset }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-medium text-slate-800">{label}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-semibold text-slate-500">
          {count}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        disabled={count === 0}
        className="h-8 rounded-full border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-40"
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Reset
      </Button>
    </div>
  )
}

function ResetConfirmDialog({ open, onCancel, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="max-w-sm rounded-[20px] bg-white p-0">
        <div className="p-5">
          <DialogHeader className="mb-3">
            <DialogTitle>Reset table to default?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            This restores columns, labels, and layout. Items are not removed.
          </p>
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-10 flex-1 rounded-[12px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              className="h-10 flex-1 rounded-[12px] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const [confirmReset, setConfirmReset] = useState(false)

  const builtinCols = columns.filter((c) => !c.key.startsWith('custom_'))
  const customCols = columns.filter((c) => c.key.startsWith('custom_'))

  const standardItems = items.filter((i) => i.row_type === 'standard')
  const vatOverrideCount = standardItems.filter((i) => i.vat_rate != null).length
  const discountOverrideCount = standardItems.filter((i) => i.discount_rate != null).length
  const installOverrideCount = standardItems.filter((i) => i.install_rate_override === true).length
  const totalOverrideCount = vatOverrideCount + discountOverrideCount + installOverrideCount

  const handleDragStart = (e, key) => {
    e.dataTransfer.setData('text/plain', key)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

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

  const typeLabel = (t) =>
    ({ 
      install_rate: 'Install Rate', 
      vat_rate: 'VAT %', 
      discount_rate: 'Discount %',
      make: 'Make',
      unit: 'Unit'
    }[t] || t)

  return (
    <>
      <Sheet open onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] rounded-t-[32px] border-none bg-white p-0 sm:mx-auto sm:max-w-[600px] [&>[data-slot=sheet-close]]:hidden"
        >
          <div className="mx-auto mt-3 h-[5px] w-12 rounded-full bg-slate-300" />

          <div className="flex max-h-[90dvh] flex-col overflow-hidden">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 pb-4 pt-3">
              <div>
                <h2 className="text-[22px] font-bold tracking-[-0.02em] text-slate-900">
                  Table Settings
                </h2>
                <p className="mt-0.5 text-[14px] text-slate-500">
                  Configure row data and column visibility
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4 pt-5">
              <SectionTitle>A. Standard PDF (Fixed)</SectionTitle>
              <div className="space-y-3">
                {FIXED_PDF_COLUMNS.map((col) => (
                  <FixedColumnRow key={col.key} col={col} />
                ))}
              </div>

              <div className="mt-7">
                <SectionTitle>B. Form Fields (Built-ins)</SectionTitle>
                <div className="space-y-3">
                {builtinCols.map((col, index) => (
                  <BuiltInColumnRow
                    key={col.key}
                    col={col}
                    onToggle={onToggle}
                    onUpdate={onUpdate}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onMoveUp={(key) => {
                      if (!onMove || index === 0) return
                      onMove(key, index - 1)
                    }}
                    onMoveDown={(key) => {
                      if (!onMove || index === builtinCols.length - 1) return
                      onMove(key, index + 1)
                    }}
                    disableMoveUp={index === 0}
                    disableMoveDown={index === builtinCols.length - 1}
                    typeLabel={typeLabel}
                  />
                ))}
                </div>
              </div>

              <div className="mt-7">
                <SectionTitle
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onAddCustom}
                      className="h-10 rounded-full border-dashed border-slate-400 px-4 text-sm font-semibold text-slate-800"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add column
                    </Button>
                  }
                >
                  C. Custom Columns
                </SectionTitle>

                {customCols.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 px-6 py-8 text-center text-sm text-slate-500">
                    No custom columns yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customCols.map((col) => (
                      <CustomColumnCard
                        key={col.key}
                        col={col}
                        onToggle={onToggle}
                        onUpdate={onUpdate}
                        onRemoveCustom={onRemoveCustom}
                      />
                    ))}
                  </div>
                )}
              </div>

              {onResetItemOverrides ? (
                <div className="mt-7 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[16px] font-bold text-slate-900">D. Row Overrides Status</div>
                  <div className="mt-1 text-[13px] text-slate-500">Reset row-level VAT, discount, and install overrides.</div>

                  <div className="mt-4 space-y-2.5">
                    <OverrideRow
                      label="VAT"
                      count={vatOverrideCount}
                      onReset={() => onResetItemOverrides({ vat: true })}
                    />
                    <OverrideRow
                      label="Discount"
                      count={discountOverrideCount}
                      onReset={() => onResetItemOverrides({ discount: true })}
                    />
                    <OverrideRow
                      label="Install"
                      count={installOverrideCount}
                      onReset={() => onResetItemOverrides({ install: true })}
                    />
                  </div>

                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={totalOverrideCount === 0}
                      onClick={() =>
                        onResetItemOverrides({ vat: true, discount: true, install: true })
                      }
                      className="h-10 rounded-full border-slate-200 bg-white px-4 text-sm font-semibold text-blue-600 disabled:opacity-40"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset all overrides
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="mt-7 rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[15px] font-semibold text-slate-900">Reset Table Settings</div>
                    <div className="text-[13px] text-slate-500">
                      Restores columns, labels, and layout. Does not remove items.
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmReset(true)}
                    className="h-10 rounded-full border-slate-200 px-4 text-sm font-semibold text-red-700"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <Button
                type="button"
                onClick={onClose}
                className="h-[54px] w-full rounded-[18px] bg-slate-950 text-[18px] font-bold text-white hover:bg-slate-900"
              >
                Done
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ResetConfirmDialog
        open={confirmReset}
        onCancel={() => setConfirmReset(false)}
        onConfirm={handleResetTable}
      />
    </>
  )
}
