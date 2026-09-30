import type { ReactNode } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Camera,
  ImageIcon,
  Loader2,
  Trash2,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TableDocumentRow } from '@/domain/table-document/types'
import { IMAGE_ACCEPT_ATTRIBUTE } from '@/lib/documentImageUploadPolicy'
import { cn } from '@/lib/utils'

type Formatters = {
  money: (value: number) => string
  percent: (value: number) => string
}

type CustomColumn = {
  key: string
  label: string
  type?: string
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-bd-text-muted">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

export function Metric({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg border border-bd-border bg-bd-surface p-3 shadow-sm">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-bd-text-muted">{label}</p>
      <p className={cn('mt-1 font-mono text-lg font-semibold', tone === 'good' && 'text-bd-status-success-text', tone === 'bad' && 'text-destructive')}>
        {value}
      </p>
    </div>
  )
}

export function RailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-bd-border/60 py-2 last:border-0">
      <span className="text-bd-text-muted">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  )
}

export function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-bd-surface-muted p-2">
      <div className="text-bd-text-muted">{label}</div>
      <div className="font-mono font-semibold">{value}</div>
    </div>
  )
}

export function RowEditor({
  row,
  index,
  itemNumber,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
  isColumnVisible,
  onPhotoUpload,
  uploadingPhoto,
  formatters,
  customColumns = [],
}: {
  row: TableDocumentRow
  index: number
  itemNumber: string
  onChange: (patch: Partial<TableDocumentRow>) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  isColumnVisible: (key: string) => boolean
  onPhotoUpload: (file: File) => void
  uploadingPhoto: boolean
  formatters: Formatters
  customColumns?: CustomColumn[]
}) {
  const qty = Number(row.quantity || 0)
  const cp = Number(row.cp || 0)
  const sp = Number(row.sp || 0)
  const cost = cp * qty
  const selling = sp * qty
  const profit = selling - cost
  const margin = selling > 0 ? (profit / selling) * 100 : 0

  if (row.row_type === 'section') {
    return (
      <div className="bg-bd-surface-muted/60 p-3">
        <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-bd-text-muted">Group {index + 1}</div>
          <Input value={row.section_title || ''} onChange={(event) => onChange({ section_title: event.target.value })} placeholder="Group title" />
          <RowActions onMoveUp={onMoveUp} onMoveDown={onMoveDown} onRemove={onRemove} canMoveUp={canMoveUp} canMoveDown={canMoveDown} />
        </div>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="grid gap-3 xl:grid-cols-[48px_minmax(240px,1.6fr)_repeat(4,minmax(84px,0.6fr))_112px] xl:items-start">
        <div className="rounded-md bg-bd-surface-muted px-2 py-1 text-center font-mono text-xs font-semibold text-bd-text-muted">{itemNumber}</div>
        <div className="grid gap-2">
          <Input value={row.description || ''} onChange={(event) => onChange({ description: event.target.value })} placeholder="Description" />
          <Input value={row.specification || ''} onChange={(event) => onChange({ specification: event.target.value })} placeholder="Sub description / specification" />
          {isColumnVisible('make_brand') ? (
            <Input value={row.make_brand || ''} onChange={(event) => onChange({ make_brand: event.target.value })} placeholder="Make / brand" />
          ) : null}
        </div>
        {isColumnVisible('quantity') ? (
          <Input inputMode="decimal" value={String(row.quantity ?? '')} onChange={(event) => onChange({ quantity: Number(event.target.value || 0) })} aria-label="Quantity" />
        ) : null}
        {isColumnVisible('unit') ? (
          <Input value={row.unit || ''} onChange={(event) => onChange({ unit: event.target.value })} aria-label="Unit" />
        ) : null}
        {isColumnVisible('cp') ? (
          <Input inputMode="decimal" value={String(row.cp ?? '')} onChange={(event) => onChange({ cp: event.target.value })} aria-label="Cost price" />
        ) : null}
        {isColumnVisible('sp') ? (
          <Input inputMode="decimal" value={String(row.sp ?? '')} onChange={(event) => onChange({ sp: event.target.value })} aria-label="Selling price" />
        ) : null}
        <RowActions onMoveUp={onMoveUp} onMoveDown={onMoveDown} onRemove={onRemove} canMoveUp={canMoveUp} canMoveDown={canMoveDown} />
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
        <PreviewMetric label="Cost" value={formatters.money(cost)} />
        <PreviewMetric label="Selling" value={formatters.money(selling)} />
        <PreviewMetric label="Profit" value={formatters.money(profit)} />
        <PreviewMetric label="Margin" value={formatters.percent(margin)} />
      </div>
      <div className="mt-3">
        <Input value={row.notes || ''} onChange={(event) => onChange({ notes: event.target.value })} placeholder="Optional row note" />
      </div>
      {customColumns.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {customColumns.map((column) => (
            <Field key={column.key} label={column.label || 'Custom field'}>
              <Input
                inputMode={column.type === 'number' ? 'decimal' : undefined}
                value={String(row.custom_data?.[column.key] ?? '')}
                onChange={(event) => onChange({
                  custom_data: {
                    ...(row.custom_data || {}),
                    [column.key]: event.target.value,
                  },
                })}
              />
            </Field>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {row.image_url ? (
          <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-bd-border bg-bd-surface-muted">
            <img src={row.image_url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-bd-status-danger-bg text-bd-status-danger-text"
              onClick={() => onChange({ image_url: null })}
              aria-label="Remove row photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-bd-border bg-bd-surface px-3 text-xs font-semibold uppercase tracking-[0.08em] text-bd-text-muted hover:bg-bd-surface-muted">
          {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : row.image_url ? <ImageIcon className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {row.image_url ? 'Replace Photo' : 'Add Photo'}
          <input
            type="file"
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onPhotoUpload(file)
              event.currentTarget.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}

function RowActions({
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: {
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div className="flex gap-1">
      <Button type="button" variant="ghost" size="icon" onClick={onMoveUp} disabled={!canMoveUp} aria-label="Move row up">
        <ArrowUp />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={onMoveDown} disabled={!canMoveDown} aria-label="Move row down">
        <ArrowDown />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Remove row" className="text-destructive">
        <Trash2 />
      </Button>
    </div>
  )
}
