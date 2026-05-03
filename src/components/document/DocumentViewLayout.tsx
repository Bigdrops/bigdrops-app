import * as React from 'react'
import type { ComponentType, ReactNode } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Download,
  Ellipsis,
  FileText,
  Pencil,
} from 'lucide-react'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type ActionIconProps = {
  className?: string
}

type ActionIcon = ComponentType<ActionIconProps>

type HeroStat = {
  label: string
  value: ReactNode
  className?: string
}

type DetailRow = {
  label: string
  value: ReactNode
}

type SummaryRow = {
  label: string
  value: ReactNode
  emphasis?: boolean
  divider?: boolean
  labelClassName?: string
  valueClassName?: string
}

type LivePreviewMetaEntry = {
  label: string
  value?: ReactNode
}

type LivePreviewLineItem =
  | {
      type: 'group'
      label: string
    }
  | {
      type?: Exclude<string, 'group'>
      label: string
      detail?: ReactNode
      value?: ReactNode
      facts?: string[]
    }

function isGroupPreviewItem(item: LivePreviewLineItem): item is Extract<LivePreviewLineItem, { type: 'group' }> {
  return item.type === 'group'
}

type LivePreviewNoteSection = {
  title?: string
  content?: ReactNode
}

type LivePreviewBankDetails = {
  accountName?: ReactNode
  accountNumber?: ReactNode
  bankName?: ReactNode
  sortCode?: ReactNode
}

type LivePreviewSignatory = {
  name: string
  role?: ReactNode
  signatureUrl?: string
}

type BottomBarAction = {
  label: string
  onClick?: () => void
  disabled?: boolean
  className?: string
  variant?: VariantProps<typeof Button>['variant']
}

type GridAction = {
  key: string
  label: string
  icon?: ActionIcon
  onClick?: () => void
  disabled?: boolean
  variant?: 'dark' | 'emerald' | 'blue' | 'outline'
}

type StatusStripItem = {
  label: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
}

export type DocumentTopBarProps = {
  title: ReactNode
  subtitle: ReactNode
  statusLabel?: ReactNode
  statusClassName?: string
  onBack?: () => void
  onMore?: () => void
}

export function DocumentTopBar({
  title,
  subtitle,
  statusLabel,
  statusClassName,
  onBack,
  onMore,
}: DocumentTopBarProps) {
  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-muted/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
      <div className="flex items-center gap-3 pl-12 md:pl-0">
        <button
          type="button"
          onClick={onBack}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border bg-card text-slate-600 shadow-sm transition hover:bg-muted/60"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-extrabold text-foreground">{title}</div>
          <div className="text-[11px] font-semibold text-muted-foreground">{subtitle}</div>
        </div>
        {statusLabel ? (
          <span className={cn('inline-flex h-7 items-center rounded-full px-3 text-[10px] font-extrabold uppercase tracking-[0.14em]', statusClassName)}>
            {statusLabel}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onMore}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border bg-card text-slate-600 shadow-sm transition hover:bg-muted/60"
        >
          <Ellipsis className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export type DocumentHeroCardProps = {
  eyebrow: ReactNode
  value: ReactNode
  helper?: ReactNode
  stats?: HeroStat[]
}

export function DocumentHeroCard({ eyebrow, value, helper, stats = [] }: DocumentHeroCardProps) {
  return (
    <div className="overflow-hidden rounded-[26px] bg-slate-950 p-5 text-white shadow-[0_18px_40px_-18px_rgba(15,23,42,0.65)]">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</div>
      <div className="mt-2 text-[2.2rem] font-black leading-none tracking-[-0.04em]">{value}</div>
      {helper ? <div className="mt-3 text-sm leading-6 text-slate-300">{helper}</div> : null}
      {stats.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{stat.label}</div>
              <div className={cn('mt-1 text-base font-extrabold', stat.className || 'text-white')}>{stat.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export type DocumentSummaryDisclosureProps = {
  eyebrow: ReactNode
  value: ReactNode
  helper?: ReactNode
  stats?: HeroStat[]
  defaultOpen?: boolean
  compactLabel?: string
  openLabel?: string
  closeLabel?: string
}

export function DocumentSummaryDisclosure({
  eyebrow,
  value,
  helper,
  stats = [],
  defaultOpen = false,
  compactLabel = 'Quick Summary',
  openLabel = 'Show full summary',
  closeLabel = 'Hide full summary',
}: DocumentSummaryDisclosureProps) {
  const [open, setOpen] = React.useState<boolean>(defaultOpen)
  const compactStats = stats.slice(0, 2)

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full rounded-[24px] border border-border bg-card p-4 text-left shadow-sm transition hover:bg-muted/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">{compactLabel}</div>
            <div className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</div>
            <div className="mt-1 text-[1.6rem] font-black leading-none tracking-[-0.04em] text-foreground">{value}</div>
            {helper ? <div className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{helper}</div> : null}
            {compactStats.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {compactStats.map((stat) => (
                  <div key={stat.label} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    <span className="font-extrabold text-slate-900">{stat.value}</span> · {stat.label}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-600">
            <span>{open ? closeLabel : openLabel}</span>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {open ? <DocumentHeroCard eyebrow={eyebrow} value={value} helper={helper} stats={stats} /> : null}
    </div>
  )
}

export type DocumentActionGridProps = {
  actions: GridAction[]
}

export function DocumentActionGrid({ actions }: DocumentActionGridProps) {
  const iconByKey: Record<string, ActionIcon> = {
    pdf: FileText,
    payment: CircleDollarSign,
    edit: Pencil,
    more: Ellipsis,
    download: Download,
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((action) => {
        const Icon = action.icon || iconByKey[action.key] || FileText
        return (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              'flex h-[64px] flex-col items-center justify-center gap-1 rounded-[18px] border text-[10px] font-extrabold uppercase tracking-[0.08em] shadow-sm transition',
              action.variant === 'dark' && 'border-slate-950 bg-slate-950 text-white',
              action.variant === 'emerald' && 'border-emerald-600 bg-emerald-600 text-white',
              action.variant === 'blue' && 'border-blue-600 bg-blue-600 text-white',
              (!action.variant || action.variant === 'outline') && 'border-border bg-card text-slate-600 hover:bg-muted/50',
              action.disabled && 'cursor-default opacity-60',
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export type DocumentStatusStripProps = {
  items: StatusStripItem[]
}

export function DocumentStatusStrip({ items }: DocumentStatusStripProps) {
  return (
    <div className="space-y-2">
      <div className="px-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Status</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            disabled={item.disabled}
            className={cn(
              'h-9 shrink-0 rounded-full border px-4 text-xs font-bold transition',
              item.active ? 'border-slate-950 bg-slate-950 text-white' : 'border-border bg-card text-slate-600',
              item.disabled && 'cursor-default opacity-70',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export type DocumentSectionProps = {
  title: ReactNode
  children: ReactNode
  className?: string
  defaultOpen?: boolean
  summary?: ReactNode
}

export function DocumentSection({ title, children, className = '', defaultOpen = false, summary = '' }: DocumentSectionProps) {
  const [open, setOpen] = React.useState<boolean>(defaultOpen)

  return (
    <section className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-border bg-card px-4 py-3 text-left shadow-sm transition hover:bg-muted/30"
      >
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
          {summary ? <div className="mt-1 text-sm text-muted-foreground">{summary}</div> : null}
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {open ? children : null}
    </section>
  )
}

export type DocumentLivePreviewCardProps = {
  templateLabel: ReactNode
  documentLabel: ReactNode
  documentNumber?: ReactNode
  companyName?: ReactNode
  companyTagline?: ReactNode
  companyLines?: string[]
  recipientLabel?: ReactNode
  recipientName?: ReactNode
  recipientLines?: string[]
  meta?: LivePreviewMetaEntry[]
  detailRows?: DetailRow[]
  items?: LivePreviewLineItem[]
  totals?: SummaryRow[]
  amountInWords?: ReactNode
  bankDetails?: LivePreviewBankDetails
  notesSections?: LivePreviewNoteSection[]
  signatory?: LivePreviewSignatory
  accentColor?: string
}

export function DocumentLivePreviewCard({
  templateLabel,
  documentLabel,
  documentNumber,
  companyName,
  companyTagline,
  companyLines = [],
  recipientLabel = 'Client',
  recipientName,
  recipientLines = [],
  meta = [],
  detailRows = [],
  items = [],
  totals = [],
  amountInWords,
  bankDetails,
  notesSections = [],
  signatory,
  accentColor = '#0f172a',
}: DocumentLivePreviewCardProps) {
  const previewItems = items.slice(0, 16)
  const previewNotes = notesSections.filter((section) => section?.title && section?.content)

  return (
    <Card className="overflow-hidden rounded-[26px] border-border bg-[linear-gradient(180deg,#f8fafc,rgba(255,255,255,0.98))] shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Preview</div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600">
            {templateLabel}
          </div>
        </div>

        <div className="overflow-hidden border-t border-slate-200 bg-white sm:mx-2 sm:mb-2 sm:rounded-[24px] sm:border sm:shadow-[0_18px_34px_rgba(15,23,42,0.08)]">
          <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
          <div className="space-y-5 px-3 py-4 sm:px-5 sm:py-6">
            <div className="space-y-4 border-b border-slate-200 pb-5">
              <div className="space-y-2">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">{documentLabel}</div>
                <div className="break-words text-[2rem] font-black leading-none tracking-[-0.05em] text-foreground">{documentNumber || documentLabel}</div>
              </div>

              <div className="space-y-4 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)] sm:gap-4 sm:space-y-0">
                <div className="min-w-0 space-y-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">From</div>
                  <div className="break-words text-base font-bold text-foreground">{companyName || documentLabel}</div>
                  {companyTagline ? <div className="text-sm text-slate-500">{companyTagline}</div> : null}
                  {companyLines.length > 0 ? (
                    <div className="space-y-1 text-sm leading-6 text-slate-600">
                      {companyLines.map((line) => <div key={line}>{line}</div>)}
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0 rounded-[20px] bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{recipientLabel}</div>
                  <div className="mt-2 break-words text-base font-bold text-foreground">{recipientName || 'Unassigned'}</div>
                  {recipientLines.length > 0 ? (
                    <div className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                      {recipientLines.map((line) => <div key={line}>{line}</div>)}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {meta.length > 0 ? (
              <div className="grid gap-3 border-b border-slate-200 pb-5 sm:grid-cols-2">
                {meta.map((entry) => (
                  <div key={entry.label} className="min-w-0 rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{entry.label}</div>
                    <div className="mt-1 break-words text-sm font-semibold text-foreground">{entry.value || '—'}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {detailRows.length > 0 ? (
              <div className="space-y-3 border-b border-slate-200 pb-5">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Document Snapshot</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {detailRows.map((row) => (
                    <div key={row.label} className="min-w-0">
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{row.label}</div>
                      <div className="mt-1 break-words text-sm leading-6 text-foreground">{row.value || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-3 border-b border-slate-200 pb-5">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Line Items</div>
              {previewItems.length > 0 ? (
                <div className="space-y-3">
                  {previewItems.map((item, index) =>
                    isGroupPreviewItem(item) ? (
                      <div key={`${item.label}-${index}`} className="rounded-[18px] bg-slate-950 px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-300">
                        {item.label}
                      </div>
                    ) : (
                      <div key={`${item.label}-${index}`} className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="break-words text-sm font-bold text-foreground">{item.label}</div>
                            {item.detail ? <div className="mt-1 break-words text-sm leading-6 text-slate-500">{item.detail}</div> : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Amount</div>
                            <div className="mt-1 text-sm font-extrabold text-foreground">{item.value || '-'}</div>
                          </div>
                        </div>

                        {item.facts?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.facts.map((fact) => (
                              <div key={fact} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                {fact}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
                  No line items.
                </div>
              )}
            </div>

            {totals.length > 0 ? (
              <div className="space-y-2 border-b border-slate-200 pb-5">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Totals</div>
                {totals.map((row) => (
                  <div
                    key={row.label}
                    className={cn(
                      'flex items-start justify-between gap-4 rounded-[16px] px-3 py-2.5 text-sm',
                      row.emphasis ? 'bg-slate-950 text-white' : 'bg-slate-50 text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        row.emphasis ? 'font-bold text-white' : 'font-medium text-slate-500',
                        row.labelClassName,
                      )}
                    >
                      {row.label}
                    </span>
                    <span
                      className={cn(
                        'text-right',
                        row.emphasis ? 'font-extrabold text-white' : 'font-bold text-foreground',
                        row.valueClassName,
                      )}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {amountInWords ? (
              <div className="space-y-2 border-b border-slate-200 pb-5">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Amount in Words</div>
                <div className="rounded-[18px] bg-slate-50 px-4 py-4 text-sm font-semibold leading-6 text-foreground">{amountInWords}</div>
              </div>
            ) : null}

            {previewNotes.length > 0 ? (
              <div className="space-y-4 border-b border-slate-200 pb-5">
                {previewNotes.map((section) => (
                  <div key={String(section.title)} className="space-y-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{section.title}</div>
                    <div className="rounded-[18px] bg-slate-50 px-4 py-4 text-sm leading-6 text-foreground">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {bankDetails ? (
              <div className="space-y-3 border-b border-slate-200 pb-5">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Bank Details</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Account Name</div>
                    <div className="mt-1 break-words text-sm leading-6 text-foreground">{bankDetails.accountName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Account Number</div>
                    <div className="mt-1 break-words text-sm leading-6 text-foreground">{bankDetails.accountNumber}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Bank</div>
                    <div className="mt-1 break-words text-sm leading-6 text-foreground">{bankDetails.bankName}</div>
                  </div>
                  {bankDetails.sortCode ? (
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Sort Code</div>
                      <div className="mt-1 break-words text-sm leading-6 text-foreground">{bankDetails.sortCode}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {signatory ? (
              <div className="flex items-center gap-3 rounded-[18px] bg-slate-50 px-4 py-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {signatory.signatureUrl ? (
                    <img src={signatory.signatureUrl} alt={`${signatory.name} signature`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">SIG</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Authorized Signatory</div>
                  <div className="mt-1 break-words text-sm font-bold text-foreground">{signatory.name}</div>
                  {signatory.role ? <div className="text-sm text-slate-500">{signatory.role}</div> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export type DocumentDetailRowsProps = {
  rows: DetailRow[]
}

export function DocumentDetailRows({ rows }: DocumentDetailRowsProps) {
  return (
    <Card className="rounded-[22px] border-border shadow-sm">
      <CardContent className="px-4 py-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">{row.label}</div>
            <div className="min-w-0 text-right text-sm font-semibold text-foreground">{row.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export type DocumentSummaryListProps = {
  rows: SummaryRow[]
}

export function DocumentSummaryList({ rows }: DocumentSummaryListProps) {
  return (
    <Card className="rounded-[22px] border-border shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className={cn(
                'flex items-center justify-between text-sm',
                row.emphasis ? 'pt-2 text-base font-extrabold' : 'font-medium',
                row.divider && 'border-t border-slate-100 pt-3',
              )}
            >
              <span className={cn(row.labelClassName || 'text-slate-600')}>{row.label}</span>
              <span className={cn(row.valueClassName || 'text-foreground')}>{row.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export type DocumentBottomBarProps = {
  actions: BottomBarAction[]
}

export function DocumentBottomBar({ actions }: DocumentBottomBarProps) {
  const columnsClassName = actions.length === 3 ? 'grid-cols-[1fr_1fr_1.4fr]' : actions.length === 2 ? 'grid-cols-2' : ''

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-muted via-muted/95 to-transparent px-4 pb-5 pt-4 md:px-6">
      <div className="mx-auto max-w-3xl rounded-[24px] border border-border bg-card/98 p-2 shadow-[0_-16px_34px_-26px_rgba(15,23,42,0.52)] backdrop-blur">
        <div className={cn('grid gap-2', columnsClassName)} style={actions.length > 3 ? { gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` } : undefined}>
          {actions.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant={action.variant || 'outline'}
              disabled={action.disabled}
              className={cn('h-12 rounded-2xl', action.className)}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

export type DocumentFloatingFabProps = {
  onClick?: () => void
  label?: string
}

export function DocumentFloatingFab({ onClick, label = 'Download PDF' }: DocumentFloatingFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-28 right-4 z-20 grid h-14 w-14 place-items-center rounded-[18px] bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] shadow-[0_16px_36px_-18px_rgba(15,23,42,0.7)] transition hover:bg-[hsl(var(--bd-button-primary-bg))]/90 md:right-6"
    >
      <Download className="h-5 w-5" />
    </button>
  )
}
