import { useState } from 'react'
import { DollarSign, Percent, RotateCcw, Undo2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getCpsRowKey,
  isInstantMarkupEligible,
  type InstantMarkupMode,
  type InstantMarkupPreview,
  type InstantMarkupSelection,
} from '@/domain/cps/instant-markup'
import type { TableDocumentRow } from '@/domain/table-document/types'
import { cn } from '@/lib/utils'

export interface CpsMarkupSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: TableDocumentRow[]
  included: InstantMarkupSelection
  mode: InstantMarkupMode
  value: string
  preview: InstantMarkupPreview | null
  error: string
  onModeChange: (mode: InstantMarkupMode) => void
  onValueChange: (value: string) => void
  onIncludedChange: (rowKey: string, included: boolean) => void
  onIncludeAll: (included: boolean) => void
  onReset: () => void
  onUndoReset: () => void
  onApply: () => void
  canUndoReset: boolean
}

function naira0(value: unknown): string {
  return '₦' + Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })
}

function rowLabel(row: TableDocumentRow, index: number): string {
  return row.description?.trim() || `(row ${index + 1})`
}

function SetupRow({
  row,
  index,
  itemNumber,
  included,
  proposedSp,
  onIncludedChange,
}: {
  row: TableDocumentRow
  index: number
  itemNumber: number
  included: boolean
  proposedSp: string | null
  onIncludedChange: (rowKey: string, included: boolean) => void
}) {
  const rowKey = getCpsRowKey(row, index)
  const eligible = isInstantMarkupEligible(row)
  const excluded = eligible && !included
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 border-b border-bd-border/50 px-3 py-2 transition-colors last:border-b-0',
        excluded && 'bg-bd-surface-muted/70 text-bd-text-muted',
      )}
      data-markup-excluded={excluded ? 'true' : undefined}
    >
      <span
        aria-label={`Item ${String(itemNumber).padStart(2, '0')}`}
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-bd-card-bg font-mono text-[12px] font-black',
          excluded ? 'border-bd-border text-bd-text-muted' : 'border-bd-border text-bd-text',
          !eligible && 'border-bd-status-danger-border text-bd-status-danger-text',
        )}
      >
        {String(itemNumber).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-[13px] font-semibold', excluded ? 'text-bd-text-muted' : 'text-bd-text')}>
          {rowLabel(row, index)}
        </div>
        {eligible ? (
          <div className="truncate font-mono text-[11px] text-bd-text-muted">
            CP {naira0(row.cp)} · Current {naira0(row.sp)}
            {included ? '' : ' · excluded, untouched'}
          </div>
        ) : (
          <div className="truncate text-[11px] font-bold text-bd-status-danger-text">
            Excluded — not an item row
          </div>
        )}
        {eligible && included && proposedSp ? (
          <div className="truncate font-mono text-[12px] font-black">
            <span className="font-bold text-bd-text-muted">Proposed </span>
            <span className="text-bd-status-success-text">→ {naira0(proposedSp)}</span>
          </div>
        ) : null}
      </div>
      {eligible ? (
        <button
          type="button"
          onClick={() => onIncludedChange(rowKey, !included)}
          aria-pressed={included}
          className={cn(
            'shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] transition-colors',
            included
              ? 'border-bd-status-success-text text-bd-status-success-text'
            : 'border-bd-border bg-bd-surface-muted text-bd-text-muted',
          )}
        >
          {included ? 'Included' : 'Excluded'}
        </button>
      ) : (
        <span className="shrink-0 rounded-lg border border-bd-border px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-bd-text-muted opacity-60">
          Not item
        </span>
      )}
    </div>
  )
}

export function CpsMarkupSheet({
  open,
  onOpenChange,
  rows,
  included,
  mode,
  value,
  preview,
  error,
  onModeChange,
  onValueChange,
  onIncludedChange,
  onIncludeAll,
  onReset,
  onUndoReset,
  onApply,
  canUndoReset,
}: CpsMarkupSheetProps) {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const eligibleCount = rows.filter(isInstantMarkupEligible).length
  const includedCount = rows.filter(
    (row, index) => isInstantMarkupEligible(row) && included[getCpsRowKey(row, index)],
  ).length
  const proposedByKey = new Map((preview?.rows || []).map((item) => [item.rowKey, item.proposedSp]))
  const canApply = Boolean(preview) && (preview?.affectedCount || 0) > 0

  const list: React.ReactNode[] = []
  let seenGroup = false
  let ungroupedBandEmitted = false
  let itemNumber = 0
  rows.forEach((row, index) => {
    const key = getCpsRowKey(row, index)
    if (row.row_type === 'section') {
      seenGroup = true
      list.push(
        <div
          key={key}
          className="border-b border-bd-border/50 bg-bd-surface-muted px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted"
        >
          {row.section_title || row.description || 'Group'} — headers never participate
        </div>,
      )
      return
    }
    if (row.row_type !== 'item') return
    if (!row.group_id && seenGroup && !ungroupedBandEmitted) {
      ungroupedBandEmitted = true
      list.push(
        <div
          key={`ungrouped-${index}`}
          className="border-b border-bd-border/50 bg-bd-surface-muted px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted"
        >
          Ungrouped rows
        </div>,
      )
    }
    itemNumber += 1
    list.push(
      <SetupRow
        key={key}
        row={row}
        index={index}
        itemNumber={itemNumber}
        included={Boolean(included[key])}
        proposedSp={included[key] ? proposedByKey.get(key) ?? null : null}
        onIncludedChange={onIncludedChange}
      />,
    )
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-auto max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border-t border-bd-border bg-bd-card-bg p-0 shadow-lg sm:mx-auto sm:max-w-md [&>[data-slot=sheet-close]]:hidden"
      >
        <div className="flex shrink-0 justify-center pb-1 pt-2.5">
          <div className="h-1 w-8 rounded-full bg-bd-surface-muted" />
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-black uppercase tracking-[0.08em] text-bd-text">
              Instant Markup
            </h2>
            <p className="mt-0.5 text-xs text-bd-text-muted">
              Mark up from current SP, or CP when SP is empty.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close Instant Markup"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-bd-border text-bd-text transition-colors hover:bg-bd-surface-muted active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 space-y-2.5 px-4 pb-2">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Markup mode">
            <button
              type="button"
              onClick={() => onModeChange('percentage')}
              aria-pressed={mode === 'percentage'}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.08em] transition-colors',
                mode === 'percentage'
                  ? 'border-bd-button-primary-bg bg-bd-button-primary-bg/10 text-bd-text'
                  : 'border-bd-border bg-bd-surface text-bd-text-muted',
              )}
            >
              <Percent className="h-4 w-4" />
              Percentage
            </button>
            <button
              type="button"
              onClick={() => onModeChange('value')}
              aria-pressed={mode === 'value'}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.08em] transition-colors',
                mode === 'value'
                  ? 'border-bd-button-primary-bg bg-bd-button-primary-bg/10 text-bd-text'
                  : 'border-bd-border bg-bd-surface text-bd-text-muted',
              )}
            >
              <DollarSign className="h-4 w-4" />
              Fixed Value
            </button>
          </div>

          <div>
            <label
              htmlFor="cps-markup-value"
              className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted"
            >
              {mode === 'percentage' ? 'Markup percentage (%)' : 'Markup value per unit (₦)'}
            </label>
            <Input
              id="cps-markup-value"
              inputMode="decimal"
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              aria-invalid={Boolean(error)}
              className="h-11 rounded-xl bg-bd-surface font-mono text-base font-bold text-bd-text"
            />
          </div>

          <p className="rounded-xl border border-dashed border-bd-border bg-bd-surface px-3 py-2 text-[11px] leading-relaxed text-bd-text-muted">
            {mode === 'percentage'
              ? 'Uses current SP as the base, or CP when SP is empty. Next SP = base × (1 + %). CP stays unchanged.'
              : 'Uses current SP as the base, or CP when SP is empty. Next SP = base + value, applied per item unit. CP stays unchanged.'}
          </p>

          {error ? (
            <p role="alert" className="rounded-lg border border-bd-status-danger-border bg-bd-status-danger-bg px-3 py-2 text-[11px] font-bold text-bd-status-danger-text">
              {error}
            </p>
          ) : null}

          {preview ? (
            <div aria-live="polite" className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-bd-border bg-bd-surface px-3 py-2">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Affected items</div>
                <div className="text-[15px] font-black text-bd-text">{preview.affectedCount}</div>
              </div>
              <div className="rounded-xl border border-bd-border bg-bd-surface px-3 py-2">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Aggregate change</div>
                <div className="font-mono text-[13px] font-bold text-bd-status-success-text">
                  +{naira0(preview.aggregateChange)} sell
                </div>
              </div>
              <div className="rounded-xl border border-bd-border bg-bd-surface px-3 py-2">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Selling total</div>
                <div className="font-mono text-[12px] font-bold text-bd-text">
                  {naira0(preview.sellingBefore)} → {naira0(preview.sellingAfter)}
                </div>
              </div>
              <div className="rounded-xl border border-bd-border bg-bd-surface px-3 py-2">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Gross profit</div>
                <div className="font-mono text-[12px] font-bold text-bd-text">
                  {naira0(preview.grossProfitBefore)} → {naira0(preview.grossProfitAfter)}
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-bd-border bg-bd-surface px-3 py-2 text-[11px] leading-relaxed text-bd-text-muted">
              Enter a markup value to see live results for every included item.
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onIncludeAll(true)}
                className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-bd-text-muted transition-colors hover:text-bd-text"
              >
                Include All
              </button>
              <button
                type="button"
                onClick={() => onIncludeAll(false)}
                className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-bd-text-muted transition-colors hover:text-bd-text"
              >
                Exclude All
              </button>
            </div>
            <span className="font-mono text-[11px] text-bd-text-muted">
              {includedCount} / {eligibleCount} included
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2">
          <div className="overflow-hidden rounded-xl border border-bd-border bg-bd-surface">
            {list.length > 0 ? (
              list
            ) : (
              <div className="px-3 py-4 text-center text-xs text-bd-text-muted">
                No rows yet.
              </div>
            )}
          </div>
          {eligibleCount === 0 ? (
            <p className="mt-2 text-center text-[11px] text-bd-text-muted">
              No item rows are available for markup yet.
            </p>
          ) : null}
        </div>

        <div className="shrink-0 space-y-2 border-t border-bd-border bg-bd-card-bg px-4 py-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          <Button
            type="button"
            onClick={onApply}
            disabled={!canApply}
            className="h-11 w-full rounded-xl text-[14px] font-black uppercase tracking-[0.06em]"
          >
            Apply Markup
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-bd-status-danger-border bg-bd-status-danger-bg px-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-bd-status-danger-text"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={onUndoReset}
              disabled={!canUndoReset}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-bd-border bg-bd-surface px-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-bd-text disabled:bg-bd-surface-muted disabled:text-bd-text-muted disabled:opacity-70"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo Reset
            </button>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full py-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-bd-text-muted transition-colors hover:text-bd-text"
          >
            Cancel
          </button>
        </div>
      </SheetContent>
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset markup?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores the item selling prices to how they were when you opened Instant Markup. You can undo this reset immediately afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReset()
                setResetConfirmOpen(false)
              }}
              variant="destructive"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
