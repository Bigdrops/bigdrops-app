import { useState, type DragEvent, type ReactNode } from 'react'
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'

import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Sheet, SheetContent } from '../components/ui/sheet'
import { cn } from '@/lib/utils'
import type { ColumnConfig, InvoiceItem } from '@/domain/invoice/types'

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
      className="grid grid-cols-2 gap-[2.5px] w-[14px] h-5 shrink-0 cursor-grab active:cursor-grabbing opacity-35 hover:opacity-100 transition-opacity select-none"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="w-[3px] h-[3px] bg-[var(--bd-text3)] rounded-full" />
      ))}
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
    <div className="flex flex-col gap-0 shrink-0">
      <button
        type="button"
        onClick={onUp}
        disabled={disableUp}
        className="w-[18px] h-[14px] border-0 bg-transparent cursor-pointer flex items-center justify-center text-[var(--bd-text3)] hover:text-[var(--bd-text)] disabled:opacity-25 disabled:cursor-default p-0 transition-colors"
      >
        <ChevronDown className="w-[10px] h-[10px] rotate-180" />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={disableDown}
        className="w-[18px] h-[14px] border-0 bg-transparent cursor-pointer flex items-center justify-center text-[var(--bd-text3)] hover:text-[var(--bd-text)] disabled:opacity-25 disabled:cursor-default p-0 transition-colors"
      >
        <ChevronDown className="w-[10px] h-[10px]" />
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
    <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--bd-text3)]">
        {children}
      </div>
      {action}
    </div>
  )
}

function FixedColumnRow({
  col,
  onUpdate,
}: {
  col: ColumnConfig
  onUpdate: (key: string, field: string, value: ColumnUpdateValue) => void
}) {
  return (
    <div className="flex items-center min-h-[46px] px-[14px] py-[7px] gap-2 border-b border-[var(--bd-border-soft)] last:border-b-0 bg-[var(--bd-bg)]">
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <Input
          value={col.label || ''}
          onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
          placeholder="Column label"
          className="h-9 rounded-[6px] border border-transparent hover:border-[var(--bd-border)] bg-transparent px-2 text-[14px] font-medium text-[var(--bd-text)] focus:bg-[var(--bd-surface)] focus:border-[var(--bd-border)] flex-1"
        />
        <span className="shrink-0 inline-flex rounded-full border border-[var(--bd-border-soft)] bg-[var(--bd-surface)] px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--bd-text3)]">
          Fixed
        </span>
        <span className="shrink-0 inline-flex rounded-full border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--bd-text3)]">
          Text
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
        'flex items-center min-h-[46px] px-[10px] py-[7px] gap-2 border-b border-[var(--bd-border-soft)] last:border-b-0 transition hover:bg-[var(--bd-bg)]',
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

      <div className={cn('min-w-0 flex-1', isFullHidden && 'opacity-60')}>
        <div className="flex items-center gap-2">
          <Input
            value={col.label || ''}
            onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
            placeholder="Column label"
            className={cn(
              'h-9 rounded-[6px] px-2 text-[14px] font-medium transition flex-1',
              isFullHidden
                ? 'border-transparent bg-transparent text-[var(--bd-text3)] line-through hover:border-[var(--bd-border-soft)]'
                : 'border-transparent bg-transparent text-[var(--bd-text)] hover:border-[var(--bd-border)] focus:bg-[var(--bd-surface)] focus:border-[var(--bd-border)]',
            )}
          />
          <span className="shrink-0 inline-flex rounded-full border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--bd-text3)]">
            {affectsTotals ? 'Num' : 'Text'}
          </span>
        </div>

        {col.key === 'install_rate' ? (
          <div className="mt-1 flex items-center gap-1.5">
            <NumericInput
              step={0.01}
              min={0}
              value={col.formula || 0}
              onChange={(val) => onUpdate(col.key, 'formula', String(val))}
              placeholder="0"
              className="h-7 w-[64px] rounded-[5px] border-[var(--bd-border)] bg-[var(--bd-bg)] text-xs"
            />
            <span className="text-[11px] font-semibold text-[var(--bd-text3)]">multiplier</span>
          </div>
        ) : null}
      </div>

      <div className="flex gap-1 shrink-0 self-start mt-[2px]">
        <button
          type="button"
          onClick={() => onToggle(col.key)}
          className={cn(
            'w-[30px] h-7 rounded-[6px] border flex items-center justify-center transition',
            isShown
              ? 'border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text)]'
              : 'border-[var(--bd-border-soft)] bg-[var(--bd-bg2)] text-[var(--bd-text3)]',
            isFullHidden && 'opacity-30',
          )}
          title={isShown ? 'Hide from display' : 'Show on display'}
        >
          {isShown ? <Eye className="w-[13px] h-[13px]" /> : <EyeOff className="w-[13px] h-[13px]" />}
        </button>

        {affectsTotals ? (
          <button
            type="button"
            onClick={() => onToggleFull(col.key)}
            className={cn(
              'w-[30px] h-7 rounded-[6px] border flex items-center justify-center transition',
              isFullHidden
                ? 'border-green-500/25 bg-green-50 text-green-700'
                : 'border-red-500/25 bg-red-50 text-red-600',
            )}
            title={isFullHidden ? 'Restore to totals' : 'Remove from totals'}
          >
            {isFullHidden ? <Check className="w-[13px] h-[13px]" /> : <X className="w-[13px] h-[13px]" />}
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
        'flex items-center min-h-[46px] px-[10px] py-[7px] gap-2 border-b border-[var(--bd-border-soft)] last:border-b-0 transition-all duration-200 hover:bg-[var(--bd-bg)]',
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

      <div className="min-w-0 flex-1 flex items-center gap-2">
        <Input
          value={col.label || ''}
          onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
          placeholder="Column label"
          className="h-9 rounded-[6px] border-transparent bg-transparent px-2 text-[14px] font-medium text-[var(--bd-text)] hover:border-[var(--bd-border)] focus:bg-[var(--bd-surface)] focus:border-[var(--bd-border)] flex-1"
        />
        <span className="shrink-0 inline-flex rounded-full border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--bd-text3)]">
          Text
        </span>
      </div>

      <div className="flex gap-1 shrink-0 self-start mt-[2px]">
        <button
          type="button"
          onClick={() => onToggle(col.key)}
          className={cn(
            'w-[30px] h-7 rounded-[6px] border flex items-center justify-center transition',
            isShown
              ? 'border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text)]'
              : 'border-[var(--bd-border-soft)] bg-[var(--bd-bg2)] text-[var(--bd-text3)]',
          )}
          title={isShown ? 'Hide column' : 'Show column'}
        >
          {isShown ? <Eye className="w-[13px] h-[13px]" /> : <EyeOff className="w-[13px] h-[13px]" />}
        </button>

        <button
          type="button"
          onClick={() => onRemoveCustom(col.key)}
          className="w-[30px] h-7 rounded-[6px] border border-[var(--bd-rose-border)] bg-[var(--bd-rose-bg)] text-[var(--bd-rose)] flex items-center justify-center transition hover:brightness-95"
          title="Delete custom column"
        >
          <X className="w-[13px] h-[13px]" />
        </button>
      </div>
    </div>
  )
}

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
          <p className="text-sm text-bd-overlay-muted">
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
  // ponytail: render in columns[] order so custom columns can sit between built-ins
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
          className="max-h-[var(--bd-overlay-sheet-max-height)] rounded-t-[30px] border border-[var(--bd-border)] bg-[linear-gradient(180deg,var(--bd-surface)_0%,var(--bd-bg)_100%)] p-0 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] sm:mx-auto sm:max-w-[620px] [&>[data-slot=sheet-close]]:hidden"
        >
          <div className="mx-auto mt-3 h-[5px] w-12 rounded-full bg-[var(--bd-border)]" />

          <div className="flex max-h-[var(--bd-overlay-sheet-max-height)] flex-col overflow-hidden">
            {/* ── Header ── */}
            <div className="flex items-start justify-between border-b border-[var(--bd-border-soft)] px-6 pb-4 pt-3">
              <div>
                <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--bd-text)]">
                  Table Settings
                </h2>
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

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-5 sm:px-5">
              {/* ── Standard PDF ── */}
              {descriptionCol ? (
                <>
                  <SectionTitle>Standard PDF</SectionTitle>
                  <div className="rounded-[12px] border border-[var(--bd-border-soft)] overflow-hidden">
                    <FixedColumnRow
                      col={descriptionCol}
                      onUpdate={(key, field, val) => onUpdate(key, field, val as string)}
                    />
                  </div>
                </>
              ) : null}

              {/* ── Form Fields ── */}
              <div className="mt-7">
                <SectionTitle>Form Fields</SectionTitle>

                {orderedCols.length > 0 ? (
                  <div className="rounded-[12px] border border-[var(--bd-border-soft)] overflow-hidden">
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
                  <div className="rounded-[12px] border border-dashed border-[var(--bd-border)] bg-[var(--bd-bg)] px-6 py-8 text-center text-sm text-[var(--bd-text3)]">
                    No form fields configured
                  </div>
                )}

                {/* ── Add Custom Column ── */}
                <button
                  type="button"
                  onClick={onAddCustom}
                  className="mt-3 flex w-full items-center gap-2 px-[14px] py-[10px] text-[14px] font-semibold text-[var(--bd-text3)] hover:text-[var(--bd-text)] transition-colors"
                >
                  <Plus className="w-[14px] h-[14px]" />
                  Add Custom Column
                </button>

                {/* ── Reset to defaults ── */}
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="mt-1 px-[14px] py-2 text-[12px] font-medium text-[var(--bd-text3)] hover:text-[var(--bd-text)] transition-colors underline underline-offset-2 decoration-dotted decoration-[var(--bd-border-soft)]"
                >
                  Reset to defaults
                </button>
              </div>

              {/* ── Row Overrides ── */}
              {onResetItemOverrides ? (
                <div className="mt-6 rounded-[12px] border border-[var(--bd-border-soft)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOverridesOpen(!overridesOpen)}
                    className="flex items-center justify-between w-full h-11 px-[18px] hover:bg-[var(--bd-bg)] transition-colors"
                  >
                    <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--bd-text)]">
                      <span className="w-[6px] h-[6px] rounded-full bg-[var(--bd-text3)] shrink-0" />
                      Row Overrides
                      {overrideEntries.length > 0 ? (
                        <span className="inline-flex rounded-full border border-[var(--bd-border-soft)] bg-[var(--bd-bg)] px-2 py-[1px] text-[10px] font-bold text-[var(--bd-text3)]">
                          {overrideEntries.length} item
                          {overrideEntries.length !== 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </div>
                    <ChevronDown
                      className={cn(
                        'w-[14px] h-[14px] text-[var(--bd-text3)] transition-transform duration-200',
                        overridesOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {overridesOpen && (
                    <div className="border-t border-[var(--bd-border-soft)]">
                      {overrideEntries.length > 0 ? (
                        <>
                          {overrideEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between px-[18px] py-[10px] border-b border-[var(--bd-border-soft)] last:border-b-0 gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-[var(--bd-text)] truncate">
                                  {entry.name}
                                </div>
                                <div className="text-[11px] text-[var(--bd-text3)] mt-[1px]">
                                  {entry.detail}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={entry.onReset}
                                className="shrink-0 text-[11px] font-semibold text-[var(--bd-text3)] border border-[var(--bd-border-soft)] rounded-[6px] px-[10px] py-[4px] hover:bg-[var(--bd-bg)] transition-colors"
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
                            className="w-full py-[10px] text-[13px] font-semibold text-[var(--bd-text3)] hover:bg-[var(--bd-bg)] transition-colors"
                          >
                            <RotateCcw className="inline w-[12px] h-[12px] mr-1.5 -mt-0.5" />
                            Reset All Overrides
                          </button>
                        </>
                      ) : (
                        <div className="px-[18px] py-[14px] text-[13px] text-[var(--bd-text3)] text-center">
                          No overrides applied
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* ── Footer ── */}
            <div className="border-t border-[var(--bd-border-soft)] px-6 py-4">
              <Button
                type="button"
                onClick={onClose}
                className="h-[54px] w-full rounded-[18px] text-[18px] font-bold"
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
