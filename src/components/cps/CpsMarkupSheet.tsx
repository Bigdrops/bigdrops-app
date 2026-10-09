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
import { CpsMarkupMetric, CpsMarkupPriceFlow } from '@/components/cps/CpsMarkupPriceFlow'
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

function rowLabel(row: TableDocumentRow, index: number): string {
  return row.description?.trim() || `(row ${index + 1})`
}

function SetupRow({
  row,
  index,
  itemNumber,
  included,
  nextSp,
  onIncludedChange,
}: {
  row: TableDocumentRow
  index: number
  itemNumber: number
  included: boolean
  nextSp: string | null
  onIncludedChange: (rowKey: string, included: boolean) => void
}) {
  const rowKey = getCpsRowKey(row, index)
  const eligible = isInstantMarkupEligible(row)
  const excluded = eligible && !included
  // The destination price only exists for an included eligible row, so an
  // excluded row can never imply that markup will be applied to it.
  const destination = eligible && included ? nextSp : null
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 border-b border-bd-border/50 px-3 py-1.5 transition-colors last:border-b-0',
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
      <div className="min-w-0 flex-1 space-y-0.5">
        <div
          className={cn(
            'truncate text-[13px] font-semibold',
            excluded ? 'text-bd-text-muted' : 'text-bd-text',
          )}
        >
          {rowLabel(row, index)}
        </div>
        {eligible ? (
          <CpsMarkupPriceFlow cp={row.cp} sp={row.sp} nextSp={destination} excluded={excluded} />
        ) : (
          <div className="truncate text-[11px] font-bold text-bd-status-danger-text">
            Excluded — not an item row
          </div>
        )}
      </div>
      {eligible ? (
        <button
          type="button"
          onClick={() => onIncludedChange(rowKey, !included)}
          aria-pressed={included}
          className={cn(
            'shrink-0 rounded-lg border px-2 py-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.08em] transition-colors',
            included
              ? 'border-bd-status-success-text text-bd-status-success-text'
              : 'border-bd-border bg-bd-surface-muted text-bd-text-muted',
          )}
        >
          {included ? 'Included' : 'Excluded'}
        </button>
      ) : (
        <span className="shrink-0 rounded-lg border border-bd-border px-2 py-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-bd-text-muted opacity-60">
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
  // The reset confirmation is portaled into this sheet, so it renders inside
  // the sheet's own layer instead of below it.
  const [confirmHost, setConfirmHost] = useState<HTMLDivElement | null>(null)
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
          className="border-b border-bd-border/50 bg-bd-surface-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted"
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
          className="border-b border-bd-border/50 bg-bd-surface-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted"
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
        nextSp={included[key] ? proposedByKey.get(key) ?? null : null}
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
        <div className="flex shrink-0 justify-center pt-1.5 pb-0.5">
          <div className="h-1 w-8 rounded-full bg-bd-surface-muted" />
        </div>

        {/* Compact header: title, subtitle and the close control on one row.
            No dedicated close row, so the control block starts higher. */}
        <div
          data-markup-header
          className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2"
        >
          <div className="min-w-0">
            <h2 className="text-[15px] font-black uppercase tracking-[0.06em] text-bd-text">
              Instant Markup
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-bd-text-muted">
              Mark up from current SP, or CP when SP is empty.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close Instant Markup"
            className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center active:scale-95"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-bd-border bg-bd-surface text-bd-text transition-colors hover:bg-bd-surface-muted">
              <X className="h-4 w-4" />
            </span>
          </button>
        </div>

        <div className="shrink-0 space-y-2 px-4 pb-1.5">
          <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Markup mode">
            <button
              type="button"
              onClick={() => onModeChange('percentage')}
              aria-pressed={mode === 'percentage'}
              className={cn(
                'flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-[11.5px] font-extrabold uppercase tracking-[0.08em] transition-colors',
                mode === 'percentage'
                  ? 'border-bd-button-primary-bg bg-bd-button-primary-bg/10 text-bd-text'
                  : 'border-bd-border bg-bd-surface text-bd-text-muted',
              )}
            >
              <Percent className="h-3.5 w-3.5" />
              Percentage
            </button>
            <button
              type="button"
              onClick={() => onModeChange('value')}
              aria-pressed={mode === 'value'}
              className={cn(
                'flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-[11.5px] font-extrabold uppercase tracking-[0.08em] transition-colors',
                mode === 'value'
                  ? 'border-bd-button-primary-bg bg-bd-button-primary-bg/10 text-bd-text'
                  : 'border-bd-border bg-bd-surface text-bd-text-muted',
              )}
            >
              <DollarSign className="h-3.5 w-3.5" />
              Fixed Value
            </button>
          </div>

          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="cps-markup-value"
                className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-bd-text-muted"
              >
                {mode === 'percentage' ? 'Markup percentage (%)' : 'Markup value per unit (₦)'}
              </label>
              <Input
                id="cps-markup-value"
                inputMode="decimal"
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                aria-invalid={Boolean(error)}
                className="h-10 rounded-xl bg-bd-surface font-mono text-base font-bold text-bd-text"
              />
            </div>
            <p className="max-w-[46%] pb-1 text-[10px] leading-snug text-bd-text-muted">
              {mode === 'percentage'
                ? 'SP base, or CP when SP is empty. Next SP = base × (1 + %).'
                : 'SP base, or CP when SP is empty. Next SP = base + value per unit.'}
            </p>
          </div>

          {error ? (
            <p role="alert" className="rounded-lg border border-bd-status-danger-border bg-bd-status-danger-bg px-3 py-1.5 text-[11px] font-bold text-bd-status-danger-text">
              {error}
            </p>
          ) : null}

          <div aria-live="polite" className="space-y-2">
            {preview ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl border border-bd-border bg-bd-surface px-2.5 py-2">
                <CpsMarkupMetric
                  label="Selling total"
                  before={preview.sellingBefore}
                  after={preview.sellingAfter}
                />
                <CpsMarkupMetric
                  label="Gross profit"
                  before={preview.grossProfitBefore}
                  after={preview.grossProfitAfter}
                />
                <CpsMarkupMetric
                  layout="row"
                  className="col-span-2 border-t border-bd-border/60 pt-1.5"
                  label="Aggregate change"
                  amount={preview.aggregateChange}
                  tone="gain"
                />
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-bd-border bg-bd-surface px-3 py-2 text-[11px] leading-relaxed text-bd-text-muted">
                Enter a markup value to see live results for every included item.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onIncludeAll(true)}
                  className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-bd-text-muted transition-colors hover:text-bd-text"
                >
                  Include All
                </button>
                <button
                  type="button"
                  onClick={() => onIncludeAll(false)}
                  className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-bd-text-muted transition-colors hover:text-bd-text"
                >
                  Exclude All
                </button>
              </div>
              <span className="font-mono text-[10.5px] text-bd-text-muted">
                {includedCount} / {eligibleCount} included
                {preview ? ` · ${preview.affectedCount} affected` : ''}
              </span>
            </div>
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

        <div className="shrink-0 space-y-2 border-t border-bd-border bg-bd-card-bg px-4 py-2.5" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          <Button
            type="button"
            onClick={onApply}
            disabled={!canApply}
            className="h-11 w-full rounded-xl text-[14px] font-black uppercase tracking-[0.06em]"
          >
            Apply Markup
          </Button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-bd-status-danger-border bg-bd-status-danger-bg px-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-bd-status-danger-text"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            {/* Undo Reset exists only while a reset left an undoable state. */}
            {canUndoReset ? (
              <button
                type="button"
                onClick={onUndoReset}
                className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-bd-border bg-bd-surface px-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-bd-text"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo Reset
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="min-h-9 shrink-0 px-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-bd-text-muted transition-colors hover:text-bd-text"
            >
              Cancel
            </button>
          </div>
        </div>

        <div ref={setConfirmHost} className="contents" />
      </SheetContent>
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent container={confirmHost}>
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
