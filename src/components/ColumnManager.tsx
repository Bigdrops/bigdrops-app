import { useState, type DragEvent, type ReactNode } from 'react'
import {
  ChevronDown,
  GripVertical,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'

import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Sheet, SheetContent } from '../components/ui/sheet'
import { Switch } from '../components/ui/switch'
import { cn } from '@/lib/utils'
import type { ColumnConfig, InvoiceItem } from '@/domain/invoice/types'

/* ──────────────────────────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────────────────────────── */

const TOTAL_AFFECTING_COLUMNS = new Set([
  'quantity',
  'unit_price',
  'amount',
  'install_rate',
  'vat_rate',
  'discount_rate',
])

type ColumnUpdateValue = string | boolean

type OverrideResetFields = {
  vat?: boolean
  discount?: boolean
  install?: boolean
}

export interface ColumnManagerProps {
  columns: ColumnConfig[]
  onUpdate: (key: string, field: string, value: ColumnUpdateValue) => void
  onToggle: (key: string) => void
  onToggleFull: (key: string) => void
  onAddCustom: () => void
  onRemoveCustom: (key: string) => void
  onReset: () => void
  onMove?: (key: string, dir: number) => void
  onClose: () => void
  items?: InvoiceItem[]
  onResetItemOverrides?: (fields: OverrideResetFields) => void
}

type ColumnDragHandlers = {
  onDragStart: (e: DragEvent<HTMLElement>, key: string) => void
  onDragOver: (e: DragEvent<HTMLElement>) => void
  onDrop: (e: DragEvent<HTMLElement>, targetKey: string) => void
}

/* ──────────────────────────────────────────────────────────────────
   Shared primitives
   ────────────────────────────────────────────────────────────────── */

function GripHandle({
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  draggable: boolean
  onDragStart: (e: DragEvent<HTMLElement>) => void
  onDragOver: (e: DragEvent<HTMLElement>) => void
  onDrop: (e: DragEvent<HTMLElement>) => void
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex flex-col items-center justify-center w-8 h-12 shrink-0 cursor-grab active:cursor-grabbing opacity-30 hover:opacity-70 transition-opacity select-none touch-manipulation"
      aria-label="Drag to reorder"
    >
      <GripVertical className="w-5 h-5 text-[var(--bd-text3)]" />
    </div>
  )
}

function ReorderButtons({
  onUp,
  onDown,
  disableUp,
  disableDown,
}: {
  onUp: () => void
  onDown: () => void
  disableUp: boolean
  disableDown: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      <button
        type="button"
        onClick={onUp}
        disabled={disableUp}
        className="flex items-center justify-center w-8 h-6 rounded-lg border border-transparent text-[var(--bd-text3)] hover:text-[var(--bd-text)] hover:border-[var(--bd-border-soft)] hover:bg-[var(--bd-bg)] active:scale-95 disabled:opacity-20 disabled:cursor-default disabled:hover:border-transparent disabled:hover:bg-transparent transition-all"
        aria-label="Move up"
      >
        <ChevronDown className="w-4 h-4 rotate-180" />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={disableDown}
        className="flex items-center justify-center w-8 h-6 rounded-lg border border-transparent text-[var(--bd-text3)] hover:text-[var(--bd-text)] hover:border-[var(--bd-border-soft)] hover:bg-[var(--bd-bg)] active:scale-95 disabled:opacity-20 disabled:cursor-default disabled:hover:border-transparent disabled:hover:bg-transparent transition-all"
        aria-label="Move down"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  )
}

type SectionTitleProps = {
  children: ReactNode
  action?: ReactNode
}

function SectionTitle({ children, action }: SectionTitleProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 px-1">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--bd-text3)]">
        {children}
      </div>
      {action}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Column row variants
   ────────────────────────────────────────────────────────────────── */

function FixedColumnRow({
  col,
  onUpdate,
}: {
  col: ColumnConfig
  onUpdate: (key: string, field: string, value: ColumnUpdateValue) => void
}) {
  return (
    <div className="flex items-center min-h-[56px] px-4 py-3 gap-3 border-b border-[var(--bd-border-soft)] last:border-b-0">
      <div className="min-w-0 flex-1 flex items-center gap-3">
        <Input
          value={col.label || ''}
          onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
          placeholder="Column label"
          className="h-10 rounded-xl border border-transparent hover:border-[var(--bd-border)] bg-transparent px-3 text-[15px] font-medium text-[var(--bd-text)] focus:bg-[var(--bd-surface)] focus:border-[var(--bd-border)] flex-1 transition-colors"
        />
        <span className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-[var(--bd-border-soft)] bg-[var(--bd-surface)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--bd-text3)]">
          <Pencil className="w-3 h-3" />
          Fixed
        </span>
      </div>
    </div>
  )
}

type BuiltInColumnRowProps = {
  col: ColumnConfig
  onToggle: (key: string) => void
  onToggleFull: (key: string) => void
  onUpdate: (key: string, field: string, value: ColumnUpdateValue) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  disableMoveUp: boolean
  disableMoveDown: boolean
  affectsTotals: boolean
} & ColumnDragHandlers

function BuiltInColumnRow({
  col,
  onToggle,
  onToggleFull,
  onUpdate,
  onDragStart,
  onDragOver,
  onDrop,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
  affectsTotals,
}: BuiltInColumnRowProps) {
  const mode = col.visibilityMode || 'show'
  const isShown = mode === 'show'
  const isFullHidden = mode === 'hide_full'

  return (
    <div
      className={cn(
        'flex items-center min-h-[56px] px-3 py-2.5 gap-1 border-b border-[var(--bd-border-soft)] last:border-b-0 transition-all duration-200',
        isFullHidden && 'opacity-40',
      )}
    >
      <GripHandle
        draggable={!isFullHidden}
        onDragStart={(e) => onDragStart(e, col.key)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, col.key)}
      />

      <ReorderButtons
        onUp={() => onMoveUp?.()}
        onDown={() => onMoveDown?.()}
        disableUp={disableMoveUp}
        disableDown={disableMoveDown}
      />

      <div className={cn('min-w-0 flex-1 px-1', isFullHidden && 'opacity-60')}>
        <div className="flex items-center gap-2">
          <Input
            value={col.label || ''}
            onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
            placeholder="Column label"
            className={cn(
              'h-9 rounded-lg px-2.5 text-[14px] font-medium transition-colors flex-1',
              isFullHidden
                ? 'border-transparent bg-transparent text-[var(--bd-text3)] line-through hover:border-[var(--bd-border-soft)]'
                : 'border-transparent bg-transparent text-[var(--bd-text)] hover:border-[var(--bd-border)] focus:bg-[var(--bd-surface)] focus:border-[var(--bd-border)]',
            )}
          />
          <span className="shrink-0 inline-flex rounded-lg border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--bd-text3)]">
            {affectsTotals ? 'Num' : 'Text'}
          </span>
        </div>

        {col.key === 'install_rate' ? (
          <div className="mt-2 flex items-center gap-2">
            <NumericInput
              step={0.01}
              min={0}
              value={col.formula || 0}
              onChange={(val) => onUpdate(col.key, 'formula', String(val))}
              placeholder="0"
              className="h-8 w-[72px] rounded-lg border-[var(--bd-border)] bg-[var(--bd-bg)] text-xs px-2"
            />
            <span className="text-[12px] font-medium text-[var(--bd-text3)]">multiplier</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2.5 shrink-0 pl-2 pr-1">
        <Switch
          size="sm"
          checked={isShown}
          onCheckedChange={() => onToggle(col.key)}
          disabled={isFullHidden}
          aria-label={isShown ? 'Hide column' : 'Show column'}
        />

        {affectsTotals ? (
          <button
            type="button"
            onClick={() => onToggleFull(col.key)}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 active:scale-90',
              isFullHidden
                ? 'text-[var(--bd-feedback-success)] hover:bg-[var(--bd-feedback-success-bg)]'
                : 'text-[var(--bd-feedback-error)] hover:bg-[var(--bd-feedback-error-bg)]',
            )}
            title={isFullHidden ? 'Restore to totals' : 'Remove from totals'}
          >
            {isFullHidden ? (
              <RotateCcw className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  )
}

type CustomColumnRowProps = {
  col: ColumnConfig
  onToggle: (key: string) => void
  onUpdate: (key: string, field: string, value: ColumnUpdateValue) => void
  onRemoveCustom: (key: string) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  disableMoveUp: boolean
  disableMoveDown: boolean
  deleting?: boolean
} & ColumnDragHandlers

function CustomColumnRow({
  col,
  onToggle,
  onUpdate,
  onRemoveCustom,
  onDragStart,
  onDragOver,
  onDrop,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
  deleting,
}: CustomColumnRowProps) {
  const isShown = (col.visibilityMode || 'show') === 'show'

  return (
    <div
      className={cn(
        'flex items-center min-h-[56px] px-3 py-2.5 gap-1 border-b border-[var(--bd-border-soft)] last:border-b-0 transition-all duration-200',
        deleting && 'opacity-0 -translate-x-3',
      )}
    >
      <GripHandle
        draggable
        onDragStart={(e) => onDragStart(e, col.key)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, col.key)}
      />

      <ReorderButtons
        onUp={() => onMoveUp?.()}
        onDown={() => onMoveDown?.()}
        disableUp={disableMoveUp}
        disableDown={disableMoveDown}
      />

      <div className="min-w-0 flex-1 px-1 flex items-center gap-2">
        <Input
          value={col.label || ''}
          onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
          placeholder="Column label"
          className="h-9 rounded-lg border-transparent bg-transparent px-2.5 text-[14px] font-medium text-[var(--bd-text)] hover:border-[var(--bd-border)] focus:bg-[var(--bd-surface)] focus:border-[var(--bd-border)] flex-1 transition-colors"
        />
        <span className="shrink-0 inline-flex rounded-lg border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--bd-text3)]">
          Custom
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 pl-2 pr-1">
        <Switch
          size="sm"
          checked={isShown}
          onCheckedChange={() => onToggle(col.key)}
          aria-label={isShown ? 'Hide column' : 'Show column'}
        />

        <button
          type="button"
          onClick={() => onRemoveCustom(col.key)}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--bd-text3)] hover:text-[var(--bd-feedback-error)] hover:bg-[var(--bd-feedback-error-bg)] active:scale-90 transition-all duration-200"
          title="Delete custom column"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Reset confirmation dialog
   ────────────────────────────────────────────────────────────────── */

type ResetConfirmDialogProps = {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

function ResetConfirmDialog({ open, onCancel, onConfirm }: ResetConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="max-w-sm p-0">
        <div className="p-5">
          <DialogHeader className="mb-3">
            <DialogTitle>Reset table to default?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--bd-overlay-muted)]">
            This restores columns, labels, and layout. Items are not removed.
          </p>
          <div className="mt-5 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-11 flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              className="h-11 flex-1 rounded-xl bg-[var(--bd-feedback-error)] text-white hover:brightness-95"
            >
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Main ColumnManager component
   ────────────────────────────────────────────────────────────────── */

export default function ColumnManager({
  columns,
  onUpdate,
  onToggle,
  onToggleFull,
  onAddCustom,
  onRemoveCustom,
  onReset,
  onMove,
  onClose,
  items = [],
  onResetItemOverrides,
}: ColumnManagerProps) {
  const [confirmReset, setConfirmReset] = useState(false)
  const [overridesOpen, setOverridesOpen] = useState(false)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  const descriptionCol = columns.find((c) => c.key === 'description')
  const orderedCols = columns.filter((c) => c.key !== 'description')

  const standardItems = items.filter((i) => i.row_type === 'standard')

  const overrideEntries: Array<{
    id: string
    name: string
    detail: string
    onReset: () => void
  }> = []
  if (onResetItemOverrides) {
    standardItems.forEach((item) => {
      if (item.vat_rate != null) {
        overrideEntries.push({
          id: `${item.id || item._uiKey || ''}_vat`,
          name: item.description?.trim() || 'Row item',
          detail: `VAT Rate → ${item.vat_rate}%`,
          onReset: () => onResetItemOverrides({ vat: true }),
        })
      }
      if (item.discount_rate != null) {
        overrideEntries.push({
          id: `${item.id || item._uiKey || ''}_discount`,
          name: item.description?.trim() || 'Row item',
          detail: `Discount Rate → ${item.discount_rate}%`,
          onReset: () => onResetItemOverrides({ discount: true }),
        })
      }
      if (item.install_rate_override) {
        overrideEntries.push({
          id: `${item.id || item._uiKey || ''}_install`,
          name: item.description?.trim() || 'Row item',
          detail: `Install Rate → ${item.install_rate ?? 0}×`,
          onReset: () => onResetItemOverrides({ install: true }),
        })
      }
    })
  }

  const handleDeleteCustom = (key: string) => {
    setDeletingKey(key)
    setTimeout(() => {
      onRemoveCustom(key)
      setDeletingKey(null)
    }, 200)
  }

  const handleDragStart = (e: DragEvent<HTMLElement>, key: string) => {
    e.dataTransfer.setData('text/plain', key)
  }

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: DragEvent<HTMLElement>, targetKey: string) => {
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

  const dragHandlers: ColumnDragHandlers = {
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  }

  return (
    <>
      <Sheet open onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <SheetContent
          side="bottom"
          className="max-h-[var(--bd-overlay-sheet-max-height)] rounded-t-[24px] border border-[var(--bd-border)] bg-[var(--bd-overlay-bg)] p-0 shadow-[0_-8px_40px_rgba(15,23,42,0.12)] sm:mx-auto sm:max-w-[560px] [&>[data-slot=sheet-close]]:hidden"
        >
          {/* ── Drag indicator ── */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-[5px] w-10 rounded-full bg-[var(--bd-overlay-handle-bg)]" />
          </div>

          <div className="flex max-h-[var(--bd-overlay-sheet-max-height)] flex-col overflow-hidden">
            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b border-[var(--bd-overlay-border)] px-6 pb-4 pt-1">
              <div>
                <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[var(--bd-overlay-text)]">
                  Table Settings
                </h2>
                <p className="text-[13px] text-[var(--bd-overlay-muted)] mt-0.5">
                  Show, hide, and reorder columns
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--bd-overlay-border)] bg-[var(--bd-overlay-section-bg)] text-[var(--bd-overlay-muted)] transition-colors hover:bg-[var(--bd-overlay-close-bg)] hover:text-[var(--bd-overlay-close-text)] active:scale-95"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-5 sm:px-6">
              {/* ── Description column ── */}
              {descriptionCol ? (
                <section>
                  <SectionTitle>Standard PDF</SectionTitle>
                  <div className="rounded-xl border border-[var(--bd-overlay-border)] bg-[var(--bd-overlay-section-bg)] overflow-hidden">
                    <FixedColumnRow
                      col={descriptionCol}
                      onUpdate={(key, field, val) => onUpdate(key, field, val as string)}
                    />
                  </div>
                </section>
              ) : null}

              {/* ── Form fields ── */}
              <section className="mt-6">
                <SectionTitle>Form Fields</SectionTitle>

                {orderedCols.length > 0 ? (
                  <div className="rounded-xl border border-[var(--bd-overlay-border)] bg-[var(--bd-overlay-section-bg)] overflow-hidden">
                    {orderedCols.map((col) => {
                      const absIdx = columns.findIndex((c) => c.key === col.key)
                      if (col.key.startsWith('custom_')) {
                        return (
                          <CustomColumnRow
                            key={col.key}
                            col={col}
                            onToggle={onToggle}
                            onUpdate={(key, field, val) => onUpdate(key, field, val)}
                            onRemoveCustom={handleDeleteCustom}
                            onMoveUp={() => {
                              if (!onMove || absIdx <= 1) return
                              onMove(col.key, absIdx - 1)
                            }}
                            onMoveDown={() => {
                              if (!onMove || absIdx >= columns.length - 1) return
                              onMove(col.key, absIdx + 1)
                            }}
                            disableMoveUp={absIdx <= 1}
                            disableMoveDown={absIdx >= columns.length - 1}
                            deleting={deletingKey === col.key}
                            {...dragHandlers}
                          />
                        )
                      }
                      return (
                        <BuiltInColumnRow
                          key={col.key}
                          col={col}
                          onToggle={onToggle}
                          onToggleFull={onToggleFull}
                          onUpdate={(key, field, val) => onUpdate(key, field, val)}
                          onMoveUp={() => {
                            if (!onMove || absIdx <= 1) return
                            onMove(col.key, absIdx - 1)
                          }}
                          onMoveDown={() => {
                            if (!onMove || absIdx >= columns.length - 1) return
                            onMove(col.key, absIdx + 1)
                          }}
                          disableMoveUp={absIdx <= 1}
                          disableMoveDown={absIdx >= columns.length - 1}
                          affectsTotals={TOTAL_AFFECTING_COLUMNS.has(col.key)}
                          {...dragHandlers}
                        />
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--bd-overlay-border)] bg-[var(--bd-overlay-section-bg)] px-6 py-10 text-center">
                    <p className="text-[14px] text-[var(--bd-overlay-muted)]">
                      No form fields configured
                    </p>
                  </div>
                )}

                {/* ── Add custom column ── */}
                <button
                  type="button"
                  onClick={onAddCustom}
                  className="mt-3 flex w-full items-center gap-2.5 px-3 py-3 text-[14px] font-semibold text-[var(--bd-brand)] rounded-xl hover:bg-[var(--bd-overlay-section-bg)] transition-colors active:scale-[0.98]"
                >
                  <Plus className="w-[18px] h-[18px]" />
                  Add Custom Column
                </button>

                {/* ── Reset to defaults ── */}
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="mt-1 px-3 py-2 text-[13px] font-medium text-[var(--bd-overlay-muted)] hover:text-[var(--bd-overlay-text)] transition-colors"
                >
                  Reset to defaults
                </button>
              </section>

              {/* ── Row overrides ── */}
              {onResetItemOverrides ? (
                <section className="mt-6 rounded-xl border border-[var(--bd-overlay-border)] bg-[var(--bd-overlay-section-bg)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOverridesOpen(!overridesOpen)}
                    className="flex items-center justify-between w-full min-h-[48px] px-4 py-3 hover:bg-[var(--bd-overlay-section-bg)] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 text-[14px] font-semibold text-[var(--bd-overlay-text)]">
                      <span className="w-2 h-2 rounded-full bg-[var(--bd-brand)] shrink-0" />
                      Row Overrides
                      {overrideEntries.length > 0 ? (
                        <span className="inline-flex rounded-lg px-2 py-0.5 text-[11px] font-bold text-bd-brand" style={{ backgroundColor: 'color-mix(in srgb, var(--bd-brand) 12%, transparent)' }}>
                          {overrideEntries.length}
                        </span>
                      ) : null}
                    </div>
                    <ChevronDown
                      className={cn(
                        'w-[18px] h-[18px] text-[var(--bd-overlay-muted)] transition-transform duration-200',
                        overridesOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {overridesOpen && (
                    <div className="border-t border-[var(--bd-overlay-border)]">
                      {overrideEntries.length > 0 ? (
                        <>
                          {overrideEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between px-4 py-3 border-b border-[var(--bd-overlay-border)] last:border-b-0 gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-[var(--bd-overlay-text)] truncate">
                                  {entry.name}
                                </div>
                                <div className="text-[12px] text-[var(--bd-overlay-muted)] mt-0.5">
                                  {entry.detail}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={entry.onReset}
                                className="shrink-0 text-[12px] font-semibold text-[var(--bd-overlay-muted)] border border-[var(--bd-overlay-border)] rounded-lg px-3 py-1.5 hover:bg-[var(--bd-overlay-section-bg)] hover:text-[var(--bd-overlay-text)] transition-colors active:scale-95"
                              >
                                Reset
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() =>
                              onResetItemOverrides({ vat: true, discount: true, install: true })
                            }
                            className="w-full py-3 text-[13px] font-semibold text-[var(--bd-brand)] hover:bg-[var(--bd-overlay-section-bg)] transition-colors"
                          >
                            <RotateCcw className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />
                            Reset All Overrides
                          </button>
                        </>
                      ) : (
                        <div className="px-4 py-4 text-[13px] text-[var(--bd-overlay-muted)] text-center">
                          No overrides applied
                        </div>
                      )}
                    </div>
                  )}
                </section>
              ) : null}
            </div>

            {/* ── Footer ── */}
            <div className="border-t border-[var(--bd-overlay-border)] bg-[var(--bd-overlay-bg)] px-5 sm:px-6" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
              <Button
                type="button"
                onClick={onClose}
                className="h-[52px] w-full rounded-2xl text-[17px] font-bold"
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
