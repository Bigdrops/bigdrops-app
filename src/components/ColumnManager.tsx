import { useState, type DragEvent, type ReactNode } from 'react'
import {
  ChevronDown,
  GripVertical,
  Minus,
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
      className="flex items-center justify-center w-7 shrink-0 cursor-grab active:cursor-grabbing opacity-30 hover:opacity-60 transition-opacity select-none touch-manipulation"
      aria-label="Drag to reorder"
    >
      <GripVertical className="w-4 h-4 text-bd-text-muted" />
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
    <div className="flex flex-col shrink-0">
      <button
        type="button"
        onClick={onUp}
        disabled={disableUp}
        className="flex items-center justify-center w-7 h-5 text-bd-text-muted hover:text-bd-text disabled:opacity-20 disabled:cursor-default transition-colors"
        aria-label="Move up"
      >
        <ChevronDown className="w-3.5 h-3.5 rotate-180" />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={disableDown}
        className="flex items-center justify-center w-7 h-5 text-bd-text-muted hover:text-bd-text disabled:opacity-20 disabled:cursor-default transition-colors"
        aria-label="Move down"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

type SectionTitleProps = {
  children: ReactNode
}

function SectionTitle({ children }: SectionTitleProps) {
  return (
    <div className="mb-2 px-0.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">
        {children}
      </div>
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
    <div className="flex items-center min-h-[44px] px-3 py-2 gap-2 border-b border-bd-border/50 last:border-b-0">
      <Input
        value={col.label || ''}
        onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
        placeholder="Column label"
        className="h-8 rounded-lg border border-transparent bg-transparent px-2 text-[13px] font-medium text-bd-text hover:border-bd-border focus:bg-bd-surface-muted focus:border-bd-border flex-1 transition-colors"
      />
      <span className="shrink-0 inline-flex rounded-md border border-bd-border bg-bd-surface-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-bd-text-muted">
        Fixed
      </span>
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
        'flex items-center min-h-[44px] px-2 py-1.5 gap-0.5 border-b border-bd-border/50 last:border-b-0 transition-opacity',
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
        <div className="flex items-center gap-1.5">
          <Input
            value={col.label || ''}
            onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
            placeholder="Column label"
            className={cn(
              'h-8 rounded-lg px-2 text-[13px] font-medium transition-colors flex-1',
              isFullHidden
                ? 'border-transparent bg-transparent text-bd-text-muted line-through'
                : 'border-transparent bg-transparent text-bd-text hover:border-bd-border focus:bg-bd-surface-muted focus:border-bd-border',
            )}
          />
          <span className="shrink-0 inline-flex rounded-md border border-bd-border bg-bd-surface-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-bd-text-muted">
            {affectsTotals ? 'Num' : 'Text'}
          </span>
        </div>

        {col.key === 'install_rate' ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <NumericInput
              step={0.01}
              min={0}
              value={col.formula || 0}
              onChange={(val) => onUpdate(col.key, 'formula', String(val))}
              placeholder="0"
              className="h-7 w-[64px] rounded-md border-bd-border bg-bd-surface-muted text-[11px] px-1.5"
            />
            <span className="text-[11px] text-bd-text-muted">multiplier</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 pl-1 pr-0.5">
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
              'flex items-center justify-center w-7 h-7 rounded-md transition-colors',
              isFullHidden
                ? 'text-bd-status-success-text hover:bg-bd-status-success-bg'
                : 'text-bd-status-danger-text hover:bg-bd-status-danger-bg',
            )}
            title={isFullHidden ? 'Restore to totals' : 'Remove from totals'}
          >
            {isFullHidden ? (
              <RotateCcw className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
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
        'flex items-center min-h-[44px] px-2 py-1.5 gap-0.5 border-b border-bd-border/50 last:border-b-0 transition-all duration-200',
        deleting && 'opacity-0 -translate-x-2',
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

      <div className="min-w-0 flex-1 px-1 flex items-center gap-1.5">
        <Input
          value={col.label || ''}
          onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
          placeholder="Column label"
          className="h-8 rounded-lg border-transparent bg-transparent px-2 text-[13px] font-medium text-bd-text hover:border-bd-border focus:bg-bd-surface-muted focus:border-bd-border flex-1 transition-colors"
        />
        <span className="shrink-0 inline-flex rounded-md border border-bd-border bg-bd-surface-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-bd-text-muted">
          Custom
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 pl-1 pr-0.5">
        <Switch
          size="sm"
          checked={isShown}
          onCheckedChange={() => onToggle(col.key)}
          aria-label={isShown ? 'Hide column' : 'Show column'}
        />

        <button
          type="button"
          onClick={() => onRemoveCustom(col.key)}
          className="flex items-center justify-center w-7 h-7 rounded-md text-bd-text-muted hover:text-bd-status-danger-text hover:bg-bd-status-danger-bg transition-colors"
          title="Delete custom column"
        >
          <Trash2 className="w-3.5 h-3.5" />
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
          <p className="text-sm text-bd-text-muted">
            This restores columns, labels, and layout. Items are not removed.
          </p>
          <div className="mt-5 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-10 flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              className="h-10 flex-1 rounded-xl bg-bd-status-danger-text text-white hover:brightness-95"
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
          className="h-auto max-h-[75vh] rounded-t-2xl border-t border-bd-border bg-bd-card-bg p-0 shadow-lg sm:mx-auto sm:max-w-md [&>[data-slot=sheet-close]]:hidden"
        >
          {/* ── Drag indicator ── */}
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="h-1 w-8 rounded-full bg-bd-surface-muted" />
          </div>

          <div className="flex max-h-[calc(75vh-40px)] flex-col overflow-hidden">
            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b border-bd-border px-4 pb-3 pt-0.5">
              <h2 className="text-[16px] font-bold tracking-[-0.01em] text-bd-text">
                Column Settings
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-bd-text-muted hover:bg-bd-surface-muted hover:text-bd-text transition-colors active:scale-95"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-3 sm:px-4">
              {/* ── Description column ── */}
              {descriptionCol ? (
                <section>
                  <SectionTitle>Description</SectionTitle>
                  <div className="rounded-xl border border-bd-border bg-bd-surface overflow-hidden">
                    <FixedColumnRow
                      col={descriptionCol}
                      onUpdate={(key, field, val) => onUpdate(key, field, val as string)}
                    />
                  </div>
                </section>
              ) : null}

              {/* ── Form fields ── */}
              <section className="mt-3">
                <SectionTitle>Columns</SectionTitle>

                {orderedCols.length > 0 ? (
                  <div className="rounded-xl border border-bd-border bg-bd-surface overflow-hidden">
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
                  <div className="rounded-xl border border-dashed border-bd-border bg-bd-surface-muted px-4 py-8 text-center">
                    <p className="text-[13px] text-bd-text-muted">
                      No form fields configured
                    </p>
                  </div>
                )}

                {/* ── Add custom column ── */}
                <button
                  type="button"
                  onClick={onAddCustom}
                  className="mt-2 flex w-full items-center gap-2 px-2 py-2 text-[13px] font-semibold text-bd-button-primary-bg rounded-lg hover:bg-bd-surface-muted transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Column
                </button>

                {/* ── Reset to defaults ── */}
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="px-2 py-1 text-[12px] text-bd-text-muted hover:text-bd-text transition-colors"
                >
                  Reset to defaults
                </button>
              </section>

              {/* ── Row overrides ── */}
              {onResetItemOverrides ? (
                <section className="mt-3 rounded-xl border border-bd-border bg-bd-surface overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOverridesOpen(!overridesOpen)}
                    className="flex items-center justify-between w-full min-h-[40px] px-3 py-2 hover:bg-bd-surface-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-bd-text">
                      Row Overrides
                      {overrideEntries.length > 0 ? (
                        <span className="inline-flex rounded-md bg-bd-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-bd-text-muted">
                          {overrideEntries.length}
                        </span>
                      ) : null}
                    </div>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-bd-text-muted transition-transform duration-200',
                        overridesOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {overridesOpen && (
                    <div className="border-t border-bd-border/50">
                      {overrideEntries.length > 0 ? (
                        <>
                          {overrideEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between px-3 py-2.5 border-b border-bd-border/50 last:border-b-0 gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-[12px] font-semibold text-bd-text truncate">
                                  {entry.name}
                                </div>
                                <div className="text-[11px] text-bd-text-muted">
                                  {entry.detail}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={entry.onReset}
                                className="shrink-0 text-[11px] font-semibold text-bd-text-muted border border-bd-border rounded-md px-2 py-1 hover:bg-bd-surface-muted hover:text-bd-text transition-colors"
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
                            className="w-full py-2.5 text-[12px] font-semibold text-bd-button-primary-bg hover:bg-bd-surface-muted/50 transition-colors"
                          >
                            <RotateCcw className="inline w-3 h-3 mr-1 -mt-0.5" />
                            Reset All
                          </button>
                        </>
                      ) : (
                        <div className="px-3 py-3 text-[12px] text-bd-text-muted text-center">
                          No overrides applied
                        </div>
                      )}
                    </div>
                  )}
                </section>
              ) : null}
            </div>

            {/* ── Footer ── */}
            <div className="border-t border-bd-border bg-bd-card-bg px-4 py-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
              <Button
                type="button"
                onClick={onClose}
                className="h-11 w-full rounded-xl text-[15px] font-bold"
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
