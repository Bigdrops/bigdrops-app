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

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export {
  DocumentDesignPanel,
  DocumentDesignStyleEditor,
  DocumentFillableWritingEditor,
  DocumentTemplatePicker,
} from './DocumentDesignControls'

export {
  DocumentActionSheet,
  DocumentPdfSheet,
} from './DocumentActionSheets'

type IconComponent = ComponentType<{ className?: string }>

type HeroStat = {
  label: string
  value: ReactNode
  className?: string
}

type DocumentMetaEntry = {
  label: string
  value?: ReactNode
}

type DocumentDetailRow = {
  label: string
  value?: ReactNode
}

type DocumentTotalRow = {
  label: string
  value: ReactNode
  emphasis?: boolean
  divider?: boolean
  labelClassName?: string
  valueClassName?: string
}

type DocumentNoteSection = {
  title?: string | null
  content?: ReactNode
}

type DocumentBankDetails = {
  accountName?: ReactNode
  accountNumber?: ReactNode
  bankName?: ReactNode
  sortCode?: ReactNode
}

type DocumentSignatory = {
  name: string
  role?: ReactNode
  signatureUrl?: string
}

type PreviewNormalItem = {
  type?: string
  label: string
  detail?: ReactNode
  imageUrl?: string
  value?: ReactNode
  facts?: string[]
  showSubtotal?: boolean
}

type PreviewGroupItem = {
  type: 'group'
  label: string
}

type PreviewGroupFooterItem = {
  type: 'group_footer'
  label: string
  showSubtotal?: boolean
  value?: ReactNode
}

type PreviewItem = PreviewNormalItem | PreviewGroupItem | PreviewGroupFooterItem

type ActionItem = {
  key: string
  label: string
  icon?: IconComponent
  onClick?: () => void
  disabled?: boolean
  variant?: 'dark' | 'emerald' | 'blue' | 'outline'
}

type StatusItem = {
  label: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
}

type BottomBarAction = {
  label: string
  variant?: React.ComponentProps<typeof Button>['variant']
  disabled?: boolean
  className?: string
  onClick?: () => void
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
    <div className="sticky top-0 z-30 -mx-4 border-b border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))]/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
      <div className="flex items-center gap-3 pl-12 md:pl-0">
        <button
          type="button"
          onClick={onBack}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border bg-card text-slate-600 shadow-sm transition hover:bg-muted/60"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-extrabold text-[hsl(var(--bd-text))]">{title}</div>
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
    <div className="overflow-hidden rounded-[26px] bg-[hsl(var(--bd-accent))] p-5 text-[hsl(var(--bd-accent-foreground))] shadow-[var(--bd-shadow-lg)]">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--bd-accent-foreground))]/60">{eyebrow}</div>
      <div className="mt-2 text-[2.2rem] font-black leading-none tracking-[-0.04em]">{value}</div>
      {helper ? <div className="mt-3 text-sm leading-6 text-[hsl(var(--bd-accent-foreground))]/80">{helper}</div> : null}
      {stats.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-[hsl(var(--bd-accent-foreground))]/10 bg-[hsl(var(--bd-accent-foreground))]/5 px-3 py-3">
               <div className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-accent-foreground))]/50">{stat.label}</div>
               <div className={cn('mt-1 text-base font-extrabold', stat.className || 'text-[hsl(var(--bd-accent-foreground))]')}>{stat.value}</div>
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
  const [open, setOpen] = React.useState(defaultOpen)
  const compactStats = stats.slice(0, 2)

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full rounded-[24px] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-4 text-left shadow-sm transition hover:bg-[hsl(var(--bd-surface-muted))]/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">{compactLabel}</div>
            <div className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--bd-text-muted))]">{eyebrow}</div>
            <div className="mt-1 text-[1.6rem] font-black leading-none tracking-[-0.04em] text-[hsl(var(--bd-text))]">{value}</div>
            {helper ? <div className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{helper}</div> : null}
            {compactStats.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {compactStats.map((stat) => (
                  <div key={stat.label} className="rounded-full border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--bd-text-muted))]">
                    <span className="font-extrabold text-[hsl(var(--bd-text))]">{stat.value}</span> · {stat.label}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[hsl(var(--bd-text-muted))]">
            <span>{open ? closeLabel : openLabel}</span>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {open ? <DocumentHeroCard eyebrow={eyebrow} value={value} helper={helper} stats={stats} /> : null}
    </div>
  )
}

export type DocumentTextSummaryDisclosureProps = {
  summary: ReactNode
  helper?: ReactNode
  children?: ReactNode
  defaultOpen?: boolean
  openLabel?: string
  closeLabel?: string
}

export function DocumentTextSummaryDisclosure({
  summary,
  helper,
  children,
  defaultOpen = false,
  openLabel = 'Show full summary',
  closeLabel = 'Hide full summary',
}: DocumentTextSummaryDisclosureProps) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <div className="space-y-3 border-b border-[hsl(var(--bd-border))]/80 pb-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-6 text-[hsl(var(--bd-text))]">{summary}</div>
          {helper ? <div className="mt-1 text-sm leading-6 text-muted-foreground">{helper}</div> : null}
        </div>
        <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-600">
          <span>{open ? closeLabel : openLabel}</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open ? children : null}
    </div>
  )
}

export type DocumentActionGridProps = {
  actions: ActionItem[]
}

export function DocumentActionGrid({ actions }: DocumentActionGridProps) {
  const iconByKey: Record<string, IconComponent> = {
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
              action.variant === 'dark' && 'border-[hsl(var(--bd-accent))] bg-[hsl(var(--bd-accent))] text-[hsl(var(--bd-accent-foreground))]',
              action.variant === 'emerald' && 'border-emerald-600 bg-emerald-600 text-white',
              action.variant === 'blue' && 'border-blue-600 bg-blue-600 text-white',
              (!action.variant || action.variant === 'outline') && 'border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]/50',
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
  items: StatusItem[]
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
              item.active ? 'border-[hsl(var(--bd-accent))] bg-[hsl(var(--bd-accent))] text-[hsl(var(--bd-accent-foreground))]' : 'border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-[hsl(var(--bd-text-muted))]',
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
  children?: ReactNode
  className?: string
  defaultOpen?: boolean
  summary?: ReactNode
}

export function DocumentSection({ title, children, className = '', defaultOpen = false, summary = '' }: DocumentSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <section className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-4 py-3 text-left shadow-sm transition hover:bg-[hsl(var(--bd-surface-muted))]/30"
      >
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
          {summary ? <div className="mt-1 text-sm text-muted-foreground">{summary}</div> : null}
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-[hsl(var(--bd-text-muted))]">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {open ? children : null}
    </section>
  )
}

function isGroupPreviewItem(item: PreviewItem): item is PreviewGroupItem {
  return item.type === 'group'
}

function isGroupFooterPreviewItem(item: PreviewItem): item is PreviewGroupFooterItem {
  return item.type === 'group_footer'
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
  meta?: DocumentMetaEntry[]
  detailRows?: DocumentDetailRow[]
  items?: PreviewItem[]
  totals?: DocumentTotalRow[]
  amountInWords?: ReactNode
  bankDetails?: DocumentBankDetails
  notesSections?: DocumentNoteSection[]
  signatory?: DocumentSignatory
  companyLogoUrl?: string
  accentColor?: string
  headerFontFamily?: string
  bodyFontFamily?: string
  previewNote?: ReactNode
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
  companyLogoUrl,
  accentColor = '#0f172a',
  headerFontFamily,
  bodyFontFamily,
  previewNote = '',
}: DocumentLivePreviewCardProps) {
  const previewItems = items
  const previewNotes = notesSections.filter((section) => section?.title && section?.content)

  return (
    <Card className="overflow-hidden rounded-[26px] border-[hsl(var(--bd-border))] bg-[linear-gradient(180deg,var(--dv-bg-2),var(--dv-bg))] shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Preview</div>
            {previewNote ? <div className="mt-1 text-xs text-muted-foreground">{previewNote}</div> : null}
          </div>
          <div className="rounded-full border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-3 py-1.5 text-[11px] font-bold text-[hsl(var(--bd-text-muted))]">
            {templateLabel}
          </div>
        </div>

        <div className="overflow-hidden border-t border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] sm:mx-2 sm:mb-2 sm:rounded-[24px] sm:border sm:shadow-[var(--bd-shadow-lg)]">
          <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
          <div className="space-y-5 px-3 py-4 sm:px-5 sm:py-6" style={{ fontFamily: bodyFontFamily }}>
            <div className="space-y-4 border-b border-slate-200 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--bd-text-muted))]">{documentLabel}</div>
                  <div
                    className="break-words text-[2rem] font-black leading-none tracking-[-0.05em] text-[hsl(var(--bd-text))]"
                    style={{ fontFamily: headerFontFamily }}
                  >
                    {documentNumber || documentLabel}
                  </div>
                </div>

                {companyLogoUrl ? (
                  <div className="shrink-0">
                    <img src={companyLogoUrl} alt="Logo" className="h-12 w-auto max-w-[120px] object-contain" />
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)] sm:gap-4 sm:space-y-0">
                <div className="min-w-0 space-y-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">From</div>
                  <div className="break-words text-base font-bold text-[hsl(var(--bd-text))]" style={{ fontFamily: headerFontFamily }}>{companyName || documentLabel}</div>
                  {companyTagline ? <div className="text-sm text-[hsl(var(--bd-text-muted))]">{companyTagline}</div> : null}
                  {companyLines.length > 0 ? (
                    <div className="space-y-1 text-sm leading-6 text-[hsl(var(--bd-text-muted))]">
                      {companyLines.map((line) => <div key={line}>{line}</div>)}
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0 rounded-[20px] bg-[hsl(var(--bd-surface-muted))] px-4 py-4">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">{recipientLabel}</div>
                  <div className="mt-2 break-words text-base font-bold text-[hsl(var(--bd-text))]" style={{ fontFamily: headerFontFamily }}>{recipientName || 'Unassigned'}</div>
                  {recipientLines.length > 0 ? (
                    <div className="mt-2 space-y-1 text-sm leading-6 text-[hsl(var(--bd-text-muted))]">
                      {recipientLines.map((line) => <div key={line}>{line}</div>)}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {meta.length > 0 ? (
              <div className="grid gap-3 border-b border-[hsl(var(--bd-border))] pb-5 sm:grid-cols-2">
                {meta.map((entry) => (
                  <div key={entry.label} className="min-w-0 rounded-[18px] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-4 py-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">{entry.label}</div>
                    <div className="mt-1 break-words text-sm font-semibold text-[hsl(var(--bd-text))]">{entry.value || '—'}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {detailRows.length > 0 ? (
              <div className="space-y-3 border-b border-[hsl(var(--bd-border))] pb-5">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">Document Snapshot</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {detailRows.map((row) => (
                    <div key={row.label} className="min-w-0">
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">{row.label}</div>
                      <div className="mt-1 break-words text-sm leading-6 text-[hsl(var(--bd-text))]">{row.value || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-3 border-b border-[hsl(var(--bd-border))] pb-5">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">Line Items</div>
              {previewItems.length > 0 ? (
                <div className="space-y-3">
                  {previewItems.map((item, index) =>
                    isGroupPreviewItem(item) ? (
                      <div key={`${item.label}-${index}`} className="rounded-[18px] bg-[hsl(var(--bd-accent))] px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-accent-foreground))]">
                        {item.label}
                      </div>
                    ) : isGroupFooterPreviewItem(item) ? (
                      <div key={`group-footer-${index}`} className="rounded-[18px] border-t border-b border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))]/40 px-4 py-2.5">
                        {item.showSubtotal && item.value ? (
                          <div className="text-right text-sm font-bold text-[hsl(var(--bd-text))]">{item.value}</div>
                        ) : null}
                      </div>
                    ) : (
                      <div key={`${item.label}-${index}`} className="rounded-[20px] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))]/70 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="break-words text-sm font-bold text-[hsl(var(--bd-text))]">{item.label}</div>
                            {item.detail ? <div className="mt-1 break-words text-sm leading-6 text-[hsl(var(--bd-text-muted))]">{item.detail}</div> : null}
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.label || 'Item image'}
                                className="mt-3 h-20 w-20 rounded-xl border border-[hsl(var(--bd-border))] object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">Amount</div>
                            <div className="mt-1 text-sm font-extrabold text-[hsl(var(--bd-text))]">{item.value || '-'}</div>
                          </div>
                        </div>

                        {item.facts?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.facts.map((fact) => (
                              <div key={fact} className="rounded-full border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--bd-text-muted))]">
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
                <div className="rounded-[18px] border border-dashed border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-4 py-4 text-sm text-muted-foreground">
                  No line items.
                </div>
              )}
            </div>

            {totals.length > 0 ? (
              <div className="space-y-2 border-b border-[hsl(var(--bd-border))] pb-5">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">Totals</div>
                {totals.map((row) => (
                  <div
                    key={row.label}
                    className={cn(
                      'flex items-start justify-between gap-4 rounded-[16px] px-3 py-2.5 text-sm',
                      row.emphasis ? 'bg-[hsl(var(--bd-accent))] text-[hsl(var(--bd-accent-foreground))]' : 'bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text))]',
                    )}
                  >
                    <span
                      className={cn(
                        row.emphasis ? 'font-bold text-[hsl(var(--bd-accent-foreground))]' : 'font-medium text-[hsl(var(--bd-text-muted))]',
                        row.labelClassName,
                      )}
                    >
                      {row.label}
                    </span>
                    <span
                      className={cn(
                        'text-right',
                        row.emphasis ? 'font-extrabold text-[hsl(var(--bd-accent-foreground))]' : 'font-bold text-[hsl(var(--bd-text))]',
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
              <div className="space-y-2 border-b border-[hsl(var(--bd-border))] pb-5">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">Amount in Words</div>
                <div className="rounded-[18px] bg-[hsl(var(--bd-surface-muted))] px-4 py-4 text-sm font-semibold leading-6 text-[hsl(var(--bd-text))]">{amountInWords}</div>
              </div>
            ) : null}

            {previewNotes.length > 0 ? (
              <div className="space-y-4 border-b border-[hsl(var(--bd-border))] pb-5">
                {previewNotes.map((section) => (
                  <div key={String(section.title)} className="space-y-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">{section.title}</div>
                    <div className="rounded-[18px] bg-[hsl(var(--bd-surface-muted))] px-4 py-4 text-sm leading-6 text-[hsl(var(--bd-text))]">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {bankDetails ? (
              <div className="space-y-3 border-b border-slate-200 pb-5">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">Bank Details</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">Account Name</div>
                    <div className="mt-1 break-words text-sm leading-6 text-[hsl(var(--bd-text))]">{bankDetails.accountName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">Account Number</div>
                    <div className="mt-1 break-words text-sm leading-6 text-[hsl(var(--bd-text))]">{bankDetails.accountNumber}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">Bank</div>
                    <div className="mt-1 break-words text-sm leading-6 text-[hsl(var(--bd-text))]">{bankDetails.bankName}</div>
                  </div>
                  {bankDetails.sortCode ? (
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">Sort Code</div>
                      <div className="mt-1 break-words text-sm leading-6 text-[hsl(var(--bd-text))]">{bankDetails.sortCode}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {signatory ? (
              <div className="flex items-center gap-3 rounded-[18px] bg-[hsl(var(--bd-surface-muted))] px-4 py-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))]">
                  {signatory.signatureUrl ? (
                    <img src={signatory.signatureUrl} alt={`${signatory.name} signature`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-[hsl(var(--bd-text-muted))]">SIG</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">Authorized Signatory</div>
                  <div className="mt-1 break-words text-sm font-bold text-[hsl(var(--bd-text))]">{signatory.name}</div>
                  {signatory.role ? <div className="text-sm text-[hsl(var(--bd-text-muted))]">{signatory.role}</div> : null}
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
  rows: DocumentDetailRow[]
}

export function DocumentDetailRows({ rows }: DocumentDetailRowsProps) {
  return (
    <Card className="rounded-[22px] border-border shadow-sm">
      <CardContent className="px-4 py-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 border-b border-[hsl(var(--bd-surface-muted))] py-3 last:border-b-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">{row.label}</div>
            <div className="min-w-0 text-right text-sm font-semibold text-[hsl(var(--bd-text))]">{row.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export type DocumentSummaryListProps = {
  rows: DocumentTotalRow[]
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
                row.divider && 'border-t border-[hsl(var(--bd-surface-muted))] pt-3',
              )}
            >
              <span className={cn(row.labelClassName || 'text-[hsl(var(--bd-text-muted))]')}>{row.label}</span>
              <span className={cn(row.valueClassName || 'text-[hsl(var(--bd-text))]')}>{row.value}</span>
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
    <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[hsl(var(--bd-surface-muted))] via-[hsl(var(--bd-surface-muted))]/95 to-transparent px-4 pb-5 pt-4 md:px-6">
      <div className="mx-auto max-w-3xl rounded-[24px] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))]/98 p-2 shadow-[var(--bd-shadow-lg)] backdrop-blur">
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
      className="fixed bottom-28 right-4 z-20 grid h-14 w-14 place-items-center rounded-[18px] bg-[hsl(var(--bd-accent))] text-[hsl(var(--bd-accent-foreground))] shadow-[var(--bd-shadow-lg)] transition hover:opacity-90 md:right-6"
    >
      <Download className="h-5 w-5" />
    </button>
  )
}
