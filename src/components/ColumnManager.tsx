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

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { COLUMN_TYPES } from '@/domain/invoice'
import type { ColumnConfig, ColumnDataType, ColumnTypeOption, InvoiceItem } from '@/domain/invoice'

const FIXED_PDF_COLUMNS = [
  { key: 'description', label: 'Description' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unit_price', label: 'Unit Price' },
  { key: 'amount', label: 'Amount' },
]

interface SectionTitleProps {
  children: React.ReactNode
  action?: React.ReactNode
}

function SectionTitle({ children, action }: SectionTitleProps) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--bd-text3)]">
        {children}
      </div>
      {action}
    </div>
  )
}

interface BuiltInColumnRowProps {
  col: ColumnConfig
  onToggle: (key: string) => void
  onUpdate: (key: string, field: keyof ColumnConfig, value: unknown) => void
  onDragStart: (e: React.DragEvent<HTMLButtonElement>, key: string) => void
  onDragOver: (e: React.DragEvent<HTMLElement>) => void
  onDrop: (e: React.DragEvent<HTMLElement>, key: string) => void
  onMoveUp?: (key: string) => void
  onMoveDown?: (key: string) => void
  disableMoveUp: boolean
  disableMoveDown: boolean
  typeLabel: (t: ColumnDataType | string) => string
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
}: BuiltInColumnRowProps) {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 transition',
        col.visible
          ? 'border-[var(--bd-border)] bg-[var(--bd-surface)] shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          : 'border-[var(--bd-border-soft)] bg-[var(--bd-bg)] opacity-80',
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
            className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] text-[var(--bd-text4)]"
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
                ? 'border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text)]'
                : 'border-[var(--bd-border-soft)] bg-[var(--bd-bg2)] text-[var(--bd-text3)]',
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
            className="h-11 rounded-[14px] border-[var(--bd-border)] bg-[var(--bd-bg)] px-4 text-[14px] font-semibold text-[var(--bd-text)]"
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
                className="h-10 rounded-[12px] border-[var(--bd-border)] bg-[var(--bd-bg)] text-sm"
              />
              <span className="shrink-0 text-xs font-semibold text-[var(--bd-text3)]">Multiplier</span>
            </div>
          ) : null}

          <div className="mt-2 flex items-center gap-2">
            <div className="inline-flex rounded-full border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--bd-text3)]">
              {typeLabel(col.type || 'text')}
            </div>
            <div
              className={cn(
                'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]',
                col.visible
                  ? 'border-[var(--bd-emerald-border)] bg-[var(--bd-emerald-bg)] text-[var(--bd-emerald)]'
                  : 'border-[var(--bd-border-soft)] bg-[var(--bd-bg)] text-[var(--bd-text3)]',
              )}
            >
              {col.visible ? 'Visible' : 'Hidden'}
            </div>
          </div>

        </div>

        <div className="flex shrink-0 flex-col gap-1 pt-1">
          <button
            type="button"
            onClick={() => onMoveUp?.(col.key)}
            disabled={disableMoveUp}
            className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] text-[var(--bd-text2)] disabled:opacity-30"
            aria-label={`Move ${col.label} up`}
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown?.(col.key)}
            disabled={disableMoveDown}
            className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] text-[var(--bd-text2)] disabled:opacity-30"
            aria-label={`Move ${col.label} down`}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface CustomColumnCardProps {
  col: ColumnConfig
  onToggle: (key: string) => void
  onUpdate: (key: string, field: keyof ColumnConfig, value: unknown) => void
  onRemoveCustom: (key: string) => void
}

function CustomColumnCard({
  col,
  onToggle,
  onUpdate,
  onRemoveCustom,
}: CustomColumnCardProps) {
  return (
    <div
      className={cn(
        'rounded-[20px] border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition',
        col.visible
          ? 'border-[var(--bd-border)] bg-[var(--bd-surface)]'
          : 'border-[var(--bd-border-soft)] bg-[var(--bd-bg)] opacity-80',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(col.key)}
          className={cn(
              'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border transition',
              col.visible
                ? 'border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text)]'
                : 'border-[var(--bd-border-soft)] bg-[var(--bd-bg2)] text-[var(--bd-text3)]',
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
            className="h-11 rounded-[14px] border-[var(--bd-border)] bg-[var(--bd-bg)] px-4 text-[14px] font-semibold text-[var(--bd-text)]"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-[var(--bd-border)] bg-[var(--bd-bg)] p-1">
              {COLUMN_TYPES.map((t: ColumnTypeOption) => {
                const value = t.value
                const active = col.type === value

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onUpdate(col.key, 'type', value)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-[12px] font-medium transition',
                      active
                        ? 'bg-[var(--bd-surface)] text-[var(--bd-text)] shadow-[0_1px_4px_rgba(15,23,42,0.05)]'
                        : 'text-[var(--bd-text3)]',
                    )}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>

            {col.type === 'number' ? (
              <label className="ml-auto flex items-center gap-2 text-[13px] text-[var(--bd-text2)]">
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
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-[var(--bd-rose-border)] bg-[var(--bd-rose-bg)] text-[var(--bd-rose)] transition hover:brightness-95"
          aria-label={`Delete ${col.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

interface FixedColumnRowProps {
  col: { key: string; label: string }
}

function FixedColumnRow({ col }: FixedColumnRowProps) {
  return (
    <div className="rounded-[18px] border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] px-3 py-3">
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-[var(--bd-border-soft)] bg-[var(--bd-surface)] text-[var(--bd-text4)]">
          <Eye className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <Input
            value={col.label}
            readOnly
            className="h-11 rounded-[14px] border-[var(--bd-border-soft)] bg-[var(--bd-surface)] px-4 text-[14px] font-semibold text-[var(--bd-text)]"
          />

          <div className="mt-2 inline-flex rounded-full border border-[var(--bd-border-soft)] bg-[var(--bd-surface)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--bd-text3)]">
            Fixed PDF
          </div>
        </div>
      </div>
    </div>
  )
}

interface OverrideRowProps {
  label: string
  count: number
  onReset: () => void
}

function OverrideRow({ label, count, onReset }: OverrideRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[var(--bd-border-soft)] bg-[var(--bd-surface)] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-medium text-[var(--bd-text)]">{label}</span>
        <span className="rounded-full bg-[var(--bd-bg)] px-2 py-0.5 text-[12px] font-semibold text-[var(--bd-text3)]">
          {count}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        disabled={count === 0}
        className="h-8 rounded-full border-[var(--bd-border)] px-3 text-xs font-semibold text-[var(--bd-text2)] disabled:opacity-40"
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Reset
      </Button>
    </div>
  )
}

interface ResetConfirmDialogProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

function ResetConfirmDialog({ open, onCancel, onConfirm }: ResetConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="max-w-sm rounded-[20px] bg-[var(--bd-surface)] p-0">
        <div className="p-5">
          <DialogHeader className="mb-3">
            <DialogTitle>Reset table to default?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--bd-text2)]">
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
              className="h-10 flex-1 rounded-[12px] bg-[var(--bd-rose)] text-white hover:brightness-95"
            >
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export interface ColumnManagerProps {
  columns: ColumnConfig[]
  onUpdate: (key: string, field: keyof ColumnConfig, value: unknown) => void
  onToggle: (key: string) => void
  onAddCustom: () => void
  onRemoveCustom: (key: string) => void
  onReset: () => void
  onMove?: (key: string, newIndex: number) => void
  onClose: () => void
  items?: InvoiceItem[]
  onResetItemOverrides?: (overrides: { vat?: boolean; discount?: boolean; install?: boolean }) => void
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
}: ColumnManagerProps) {
  const [confirmReset, setConfirmReset] = useState(false)

  const builtinCols = columns.filter((c) => !c.key.startsWith('custom_'))
  const customCols = columns.filter((c) => c.key.startsWith('custom_'))

  const standardItems = items.filter((i) => i.row_type === 'standard')
  const vatOverrideCount = standardItems.filter((i) => i.vat_rate != null).length
  const discountOverrideCount = standardItems.filter((i) => i.discount_rate != null).length
  const installOverrideCount = standardItems.filter((i) => i.install_rate_override === true).length
  const totalOverrideCount = vatOverrideCount + discountOverrideCount + installOverrideCount

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, key: string) => {
    e.dataTransfer.setData('text/plain', key)
  }

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLElement>, targetKey: string) => {
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

  const typeLabel = (t: ColumnDataType | string): string =>
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
          className="max-h-[90dvh] rounded-t-[30px] border border-[var(--bd-border)] bg-[linear-gradient(180deg,var(--bd-surface)_0%,var(--bd-bg)_100%)] p-0 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] sm:mx-auto sm:max-w-[620px] [&>[data-slot=sheet-close]]:hidden"
        >
          <div className="mx-auto mt-3 h-[5px] w-12 rounded-full bg-[var(--bd-border)]" />

          <div className="flex max-h-[90dvh] flex-col overflow-hidden">
            <div className="flex items-start justify-between border-b border-[var(--bd-border-soft)] px-6 pb-4 pt-3">
              <div>
                <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--bd-text)]">
                  Table Settings
                </h2>
                <p className="mt-0.5 text-[14px] text-[var(--bd-text3)]">
                  Configure row data and column visibility
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--bd-border-soft)] bg-[var(--bd-surface)] text-[var(--bd-text3)] transition hover:bg-[var(--bd-bg)] hover:text-[var(--bd-text)]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-5 sm:px-5">
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
                      className="h-10 rounded-full border-dashed border-[var(--bd-border)] bg-[var(--bd-surface)] px-4 text-sm font-semibold text-[var(--bd-text2)] hover:border-[var(--bd-indigo-border)] hover:bg-[var(--bd-indigo-bg)] hover:text-[var(--bd-indigo)]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add column
                    </Button>
                  }
                >
                  C. Custom Columns
                </SectionTitle>

                {customCols.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[var(--bd-border)] bg-[var(--bd-bg)] px-6 py-8 text-center text-sm text-[var(--bd-text3)]">
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
                <div className="mt-7 rounded-[24px] border border-[var(--bd-border)] bg-[var(--bd-surface)] px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                  <div className="text-[16px] font-bold text-[var(--bd-text)]">D. Row Overrides Status</div>
                  <div className="mt-1 text-[13px] text-[var(--bd-text3)]">Reset row-level VAT, discount, and install overrides.</div>

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
                      className="h-10 rounded-full border-[var(--bd-rose-border)] bg-[var(--bd-rose-bg)] px-4 text-sm font-semibold text-[var(--bd-rose)] disabled:opacity-40"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset all overrides
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="mt-7 rounded-[24px] border border-[var(--bd-border)] bg-[var(--bd-surface)] px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[15px] font-semibold text-[var(--bd-text)]">Reset Table Settings</div>
                    <div className="text-[13px] text-[var(--bd-text3)]">
                      Restores columns, labels, and layout. Does not remove items.
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmReset(true)}
                    className="h-10 rounded-full border-[var(--bd-rose-border)] bg-[var(--bd-rose-bg)] px-4 text-sm font-semibold text-[var(--bd-rose)] hover:brightness-95"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--bd-border-soft)] px-6 py-4">
              <Button
                type="button"
                onClick={onClose}
                className="h-[54px] w-full rounded-[18px] bg-[var(--bd-text)] text-[18px] font-bold text-white hover:brightness-95"
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
