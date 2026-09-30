import {
  ArrowLeft,
  ClipboardList,
  FileInput,
  Percent,
  Plus,
  RotateCcw,
  Settings2,
} from 'lucide-react'

import { Field, Metric, RailLine, RowEditor } from '@/components/boq/BoqEditorParts'
import { Button } from '@/components/ui/button'
import { DateField } from '@/components/ui/date-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Boq } from '@/domain/boq/types'
import type { TableDocumentRow } from '@/domain/table-document/types'
import type { InvoiceColumn } from '@/components/useInvoiceColumns'
import { cn } from '@/lib/utils'

type Formatters = {
  money: (value: number) => string
  percent: (value: number) => string
}

export type BoqFormPresentationProps = {
  boq: Boq
  mode: 'create' | 'edit'
  rows: TableDocumentRow[]
  itemNumbers: string[]
  totals: {
    total_cost: number
    total_selling_price: number
    gross_profit: number
    margin_percent: number
  }
  eligibleCount: number
  uploadingRow: number | null
  onCancel?: () => void
  onPatchBoq: (patch: Partial<Boq>) => void
  onUpdateRow: (index: number, patch: Partial<TableDocumentRow>) => void
  onAddRow: (rowType: 'item' | 'section') => void
  onRemoveRow: (index: number) => void
  onMoveRow: (index: number, direction: -1 | 1) => void
  onOpenImport: () => void
  onOpenColumns: () => void
  onOpenMarkup: () => void
  onUndoMarkup: () => void
  hasUndo: boolean
  isColumnVisible: (key: string) => boolean
  onPhotoUpload: (index: number, file: File) => void
  formatters: Formatters
  customColumns: InvoiceColumn[]
  isFold?: boolean
}

function HeaderActions({
  hasUndo,
  onUndoMarkup,
  onOpenImport,
  onOpenColumns,
  onOpenMarkup,
  compact = false,
}: Pick<BoqFormPresentationProps, 'hasUndo' | 'onUndoMarkup' | 'onOpenImport' | 'onOpenColumns' | 'onOpenMarkup'> & {
  compact?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-2', compact && 'w-full overflow-x-auto pb-1')}>
      {hasUndo ? (
        <Button type="button" variant="outline" onClick={onUndoMarkup} className={cn(compact && 'shrink-0')}>
          <RotateCcw />
          Undo
        </Button>
      ) : null}
      <Button type="button" variant="outline" onClick={onOpenImport} className={cn(compact && 'shrink-0')}>
        <FileInput />
        Import
      </Button>
      <Button type="button" variant="outline" onClick={onOpenColumns} className={cn(compact && 'shrink-0')}>
        <Settings2 />
        Columns
      </Button>
      <Button type="button" variant="outline" onClick={onOpenMarkup} className={cn(compact && 'shrink-0')}>
        <Percent />
        Markup
      </Button>
    </div>
  )
}

function MetadataFields({ boq, onPatchBoq }: Pick<BoqFormPresentationProps, 'boq' | 'onPatchBoq'>) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Field label="Title" className="md:col-span-2">
        <Input value={boq.title || ''} onChange={(event) => onPatchBoq({ title: event.target.value })} />
      </Field>
      <Field label="Number">
        <Input value={boq.boq_number || ''} onChange={(event) => onPatchBoq({ boq_number: event.target.value.toUpperCase() })} />
      </Field>
      <Field label="Issue date">
        <DateField label="Issue date" value={boq.issue_date || ''} onChange={(issue_date) => onPatchBoq({ issue_date })} />
      </Field>
      <Field label="Client / project" className="md:col-span-2">
        <Input value={boq.vendor_name || ''} onChange={(event) => onPatchBoq({ vendor_name: event.target.value })} />
      </Field>
      <Field label="Site / reference" className="md:col-span-2">
        <Input value={boq.vendor_contact || ''} onChange={(event) => onPatchBoq({ vendor_contact: event.target.value })} />
      </Field>
    </div>
  )
}

function RowList(props: BoqFormPresentationProps) {
  return (
    <div className="divide-y divide-bd-border">
      {props.rows.map((row, index) => (
        <RowEditor
          key={row.id || row._uiKey || index}
          row={row}
          index={index}
          itemNumber={props.itemNumbers[index]}
          onChange={(patch) => props.onUpdateRow(index, patch)}
          onMoveUp={() => props.onMoveRow(index, -1)}
          onMoveDown={() => props.onMoveRow(index, 1)}
          onRemove={() => props.onRemoveRow(index)}
          canMoveUp={index > 0}
          canMoveDown={index < props.rows.length - 1}
          isColumnVisible={props.isColumnVisible}
          onPhotoUpload={(file) => props.onPhotoUpload(index, file)}
          uploadingPhoto={props.uploadingRow === index}
          formatters={props.formatters}
          customColumns={props.customColumns}
        />
      ))}
    </div>
  )
}

export function BoqDesktopFormPresentation(props: BoqFormPresentationProps) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-bd-border bg-bd-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            {props.onCancel ? (
              <Button variant="ghost" size="icon" onClick={props.onCancel} aria-label="Go back to Cost & Pricing Sheets">
                <ArrowLeft />
              </Button>
            ) : null}
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-bd-text-muted">Cost & Pricing Sheet</p>
              <h1 className="truncate text-lg font-semibold">{props.mode === 'edit' ? 'Edit Sheet' : 'New Sheet'}</h1>
            </div>
          </div>
          <HeaderActions {...props} />
        </div>
      </header>

      {props.hasUndo ? (
        <div className="border-b border-bd-status-success-border bg-bd-status-success-bg px-4 py-2 text-sm text-bd-status-success-text">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
            <span>SP values were updated by Instant Markup.</span>
            <Button type="button" variant="ghost" size="sm" onClick={props.onUndoMarkup}>
              <RotateCcw />
              Undo
            </Button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 pb-32 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="rounded-lg border border-bd-border bg-bd-surface p-3 shadow-sm">
            <MetadataFields boq={props.boq} onPatchBoq={props.onPatchBoq} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Total Cost" value={props.formatters.money(props.totals.total_cost)} />
            <Metric label="Total Selling" value={props.formatters.money(props.totals.total_selling_price)} />
            <Metric label="Gross Profit" value={props.formatters.money(props.totals.gross_profit)} tone={props.totals.gross_profit >= 0 ? 'good' : 'bad'} />
            <Metric label="Margin" value={props.formatters.percent(props.totals.margin_percent)} tone={props.totals.margin_percent >= 0 ? 'good' : 'bad'} />
          </div>

          <div className="rounded-lg border border-bd-border bg-bd-surface shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-bd-border p-3">
              <div>
                <h2 className="text-sm font-semibold">Pricing workspace</h2>
                <p className="text-xs text-bd-text-muted">Groups organize the schedule. Item rows carry CP, SP, cost, selling, profit, and margin.</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => props.onAddRow('section')}>
                  <Plus />
                  Group
                </Button>
                <Button type="button" onClick={() => props.onAddRow('item')}>
                  <Plus />
                  Item
                </Button>
              </div>
            </div>
            <RowList {...props} />
          </div>

          <div className="rounded-lg border border-bd-border bg-bd-surface p-3 shadow-sm">
            <Field label="Notes">
              <Textarea value={props.boq.notes || ''} onChange={(event) => props.onPatchBoq({ notes: event.target.value })} className="min-h-24" />
            </Field>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <CommercialRail {...props} />
        </aside>
      </main>
    </>
  )
}

function CommercialRail(props: BoqFormPresentationProps) {
  return (
    <div className="rounded-lg border border-bd-border bg-bd-surface p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-bd-text-muted" />
        <h2 className="text-sm font-semibold">Commercial rail</h2>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <RailLine label="Rows" value={`${props.rows.filter((row) => row.row_type === 'item').length} items`} />
        <RailLine label="Markup eligible" value={`${props.eligibleCount} items`} />
        <RailLine label="Selling" value={props.formatters.money(props.totals.total_selling_price)} />
        <RailLine label="Profit" value={props.formatters.money(props.totals.gross_profit)} />
        <RailLine label="Margin" value={props.formatters.percent(props.totals.margin_percent)} />
      </div>
      <Button type="button" className="mt-4 w-full" onClick={props.onOpenMarkup}>
        <Percent />
        Open Markup
      </Button>
    </div>
  )
}

export function BoqMobileFoldFormPresentation(props: BoqFormPresentationProps) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-bd-border bg-bd-surface/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          {props.onCancel ? (
            <Button variant="ghost" size="icon" onClick={props.onCancel} aria-label="Go back to Cost & Pricing Sheets">
              <ArrowLeft />
            </Button>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-bd-text-muted">Cost & Pricing Sheet</p>
            <h1 className="truncate text-base font-semibold">{props.mode === 'edit' ? 'Edit Sheet' : 'New Sheet'}</h1>
          </div>
        </div>
        <div className="mt-2">
          <HeaderActions {...props} compact />
        </div>
      </header>

      {props.hasUndo ? (
        <div className="border-b border-bd-status-success-border bg-bd-status-success-bg px-3 py-2 text-sm text-bd-status-success-text">
          <div className="flex items-center justify-between gap-3">
            <span>SP values were updated.</span>
            <Button type="button" variant="ghost" size="sm" onClick={props.onUndoMarkup}>
              <RotateCcw />
              Undo
            </Button>
          </div>
        </div>
      ) : null}

      <main className={cn('mx-auto max-w-3xl space-y-4 px-3 py-4 pb-32', props.isFold && 'md:max-w-5xl')}>
        <section className="rounded-lg border border-bd-border bg-bd-surface p-3 shadow-sm">
          <MetadataFields boq={props.boq} onPatchBoq={props.onPatchBoq} />
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Metric label="Cost" value={props.formatters.money(props.totals.total_cost)} />
          <Metric label="Selling" value={props.formatters.money(props.totals.total_selling_price)} />
          <Metric label="Profit" value={props.formatters.money(props.totals.gross_profit)} tone={props.totals.gross_profit >= 0 ? 'good' : 'bad'} />
          <Metric label="Margin" value={props.formatters.percent(props.totals.margin_percent)} tone={props.totals.margin_percent >= 0 ? 'good' : 'bad'} />
        </section>

        <section className={cn('grid gap-4', props.isFold && 'md:grid-cols-[minmax(0,1fr)_280px]')}>
          <div className="rounded-lg border border-bd-border bg-bd-surface shadow-sm">
            <div className="space-y-3 border-b border-bd-border p-3">
              <div>
                <h2 className="text-sm font-semibold">Items</h2>
                <p className="text-xs text-bd-text-muted">Edit groups, rows, CP, SP, notes, and photos.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => props.onAddRow('section')}>
                  <Plus />
                  Group
                </Button>
                <Button type="button" onClick={() => props.onAddRow('item')}>
                  <Plus />
                  Item
                </Button>
              </div>
            </div>
            <RowList {...props} />
          </div>

          <div className="space-y-4">
            <CommercialRail {...props} />
            <div className="rounded-lg border border-bd-border bg-bd-surface p-3 shadow-sm">
              <Field label="Notes">
                <Textarea value={props.boq.notes || ''} onChange={(event) => props.onPatchBoq({ notes: event.target.value })} className="min-h-24 text-base" />
              </Field>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
