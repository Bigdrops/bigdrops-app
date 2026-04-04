import * as React from 'react'
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Download as DownloadIcon,
  Download,
  Ellipsis,
  FileText,
  FolderPlus,
  FolderOpen,
  GitBranchPlus,
  Pencil,
  Palette,
  Trash2,
  Workflow,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  getEffectiveFillableFont,
  PDF_ACCENT_SWATCHES,
  PDF_FONT_OPTIONS,
} from '@/lib/pdfDesignPreset'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const templatePreviewById = {
  proforma: {
    shell: 'bg-emerald-50',
    nodes: ['mx-auto h-1.5 w-16 rounded-full bg-emerald-600', 'mx-auto h-1 w-12 rounded-full bg-emerald-200', 'mx-auto h-1 w-10 rounded-full bg-emerald-200'],
  },
  bold: {
    shell: 'bg-slate-50',
    nodes: ['-mx-1 h-2 rounded-t-sm bg-slate-950', 'h-1 w-14 rounded-full bg-slate-300', 'h-1 w-10 rounded-full bg-slate-200'],
  },
  compact: {
    shell: 'bg-slate-50',
    nodes: ['h-1 w-full rounded-full bg-slate-300', 'h-0.5 w-full rounded-full bg-slate-200', 'h-0.5 w-full rounded-full bg-slate-200', 'h-0.5 w-4/5 rounded-full bg-slate-200'],
  },
  professional: {
    shell: 'bg-slate-100',
    nodes: ['h-1.5 w-16 rounded-full bg-slate-700', 'h-1 w-14 rounded-full bg-slate-300', 'mt-1 h-3 w-full rounded-sm bg-slate-200', 'h-1 w-3/5 rounded-full bg-slate-300'],
  },
  quotation: {
    shell: 'bg-slate-50',
    nodes: ['h-1.5 w-12 rounded-full bg-slate-950', 'h-1 w-full rounded-full bg-slate-300', 'h-1 w-3/5 rounded-full bg-slate-200'],
  },
}

export function DocumentTemplatePicker({ value, onChange, templates }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {templates.map((template) => {
        const active = value === template.id
        const preview = templatePreviewById[template.id] || templatePreviewById.proforma

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onChange(template.id)}
            className={cn(
              'w-28 shrink-0 rounded-2xl border-2 px-3 py-3 text-left transition',
              active ? 'border-slate-950 bg-slate-950 text-white' : 'border-border bg-card text-foreground',
            )}
          >
            <div className={cn('mb-3 flex h-10 flex-col gap-1 rounded-lg p-2', preview.shell)}>
              {preview.nodes.map((nodeClass, index) => (
                <div key={`${template.id}-${index}`} className={nodeClass} />
              ))}
            </div>
            <div className="text-xs font-bold">{template.label}</div>
            <div className={cn('mt-1 text-[10px]', active ? 'text-slate-300' : 'text-muted-foreground')}>{template.description}</div>
            {active ? <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-blue-400">Active</div> : null}
          </button>
        )
      })}
    </div>
  )
}

export function DocumentDesignPanel({ title, subtitle, badge = 'Persistent preset', sections }) {
  const [openSections, setOpenSections] = React.useState(() =>
    Object.fromEntries(sections.map((section, index) => [section.key || String(index), section.defaultOpen !== false])),
  )

  return (
    <Card className="overflow-hidden rounded-[26px] border-border bg-[linear-gradient(180deg,#ffffff,rgba(248,250,252,0.96))] shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
              <Palette className="h-4 w-4 text-slate-500" />
              {title}
            </div>
            {subtitle ? <div className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</div> : null}
          </div>
          {badge ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{badge}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-5 space-y-3">
          {sections.map((section, index) => {
            const sectionKey = section.key || String(index)
            const open = openSections[sectionKey] !== false

            return (
              <div key={sectionKey} className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <button
                  type="button"
                  onClick={() => setOpenSections((current) => ({ ...current, [sectionKey]: !open }))}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <div className="min-w-0">
                    <div className="text-base font-extrabold tracking-[-0.03em] text-foreground">{section.title}</div>
                    {section.description ? <div className="mt-1 text-sm text-muted-foreground">{section.description}</div> : null}
                  </div>
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500">
                    {open ? <ChevronDown className="h-4 w-4 rotate-180" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                {open ? <div className="border-t border-slate-100 px-4 py-4">{section.content}</div> : null}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function DocumentDesignStyleEditor({ value, onChange, accentLabel = 'Accent Color' }) {
  const effectiveFillableFont = getEffectiveFillableFont(value)

  const update = (patch) => {
    onChange({
      ...value,
      ...patch,
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{accentLabel}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PDF_ACCENT_SWATCHES.map((swatch) => {
            const active = value.accentColor.toLowerCase() === swatch.toLowerCase()
            return (
              <button
                key={swatch}
                type="button"
                onClick={() => update({ accentColor: swatch })}
                className={cn(
                  'h-9 w-9 rounded-xl border-2 shadow-sm transition',
                  active ? 'border-slate-950 scale-[1.03]' : 'border-white/80',
                )}
                style={{ backgroundColor: swatch }}
                aria-label={`Use accent color ${swatch}`}
              />
            )
          })}
        </div>
        <div className="mt-3">
          <Input
            value={value.accentColor}
            onChange={(event) => update({ accentColor: event.target.value })}
            className="h-11 rounded-[14px] bg-white font-mono"
            placeholder="#14b8a6"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Header Font</div>
          <Select value={value.headerFont} onValueChange={(next) => update({ headerFont: next })}>
            <SelectTrigger className="h-11 rounded-[14px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PDF_FONT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            {PDF_FONT_OPTIONS.find((option) => option.value === value.headerFont)?.description}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Body Font</div>
          <Select value={value.bodyFont} onValueChange={(next) => update({ bodyFont: next })}>
            <SelectTrigger className="h-11 rounded-[14px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PDF_FONT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            {PDF_FONT_OPTIONS.find((option) => option.value === value.bodyFont)?.description}
          </div>
        </div>
      </div>

      <div className="rounded-[18px] border border-border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Fillable Font</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Auto uses the current body font until you switch to a manual fillable font.
            </div>
          </div>
          <div className="inline-flex rounded-full border border-border bg-white p-1">
            <button
              type="button"
              onClick={() => update({ fillableFontMode: 'auto' })}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold transition',
                value.fillableFontMode === 'auto' ? 'bg-slate-950 text-white' : 'text-slate-600',
              )}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => update({ fillableFontMode: 'custom' })}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold transition',
                value.fillableFontMode === 'custom' ? 'bg-slate-950 text-white' : 'text-slate-600',
              )}
            >
              Custom
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Fillable Font Choice</div>
            <Select
              value={value.fillableFontMode === 'custom' ? value.fillableFont : effectiveFillableFont}
              onValueChange={(next) => update({ fillableFont: next, fillableFontMode: 'custom' })}
              disabled={value.fillableFontMode !== 'custom'}
            >
              <SelectTrigger className="h-11 rounded-[14px] bg-white disabled:opacity-70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PDF_FONT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              Effective fillable font: {PDF_FONT_OPTIONS.find((option) => option.value === effectiveFillableFont)?.label}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Fillable Color</div>
            <Input
              value={value.fillableColor}
              onChange={(event) => update({ fillableColor: event.target.value })}
              className="h-11 rounded-[14px] bg-white font-mono"
              placeholder="#0f172a"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function DocumentTopBar({
  title,
  subtitle,
  statusLabel,
  statusClassName,
  onBack,
  onMore,
}) {
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

export function DocumentHeroCard({ eyebrow, value, helper, stats = [] }) {
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

export function DocumentSummaryDisclosure({
  eyebrow,
  value,
  helper,
  stats = [],
  defaultOpen = false,
  compactLabel = 'Quick Summary',
  openLabel = 'Show full summary',
  closeLabel = 'Hide full summary',
}) {
  const [open, setOpen] = React.useState(defaultOpen)
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

export function DocumentActionGrid({ actions }) {
  const iconByKey = {
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

export function DocumentStatusStrip({ items }) {
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

export function DocumentSection({ title, children, className = '', defaultOpen = false, summary }) {
  const [open, setOpen] = React.useState(defaultOpen)

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
}) {
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
                    item.type === 'group' ? (
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
                  <div key={section.title} className="space-y-2">
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

export function DocumentDetailRows({ rows }) {
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

export function DocumentSummaryList({ rows }) {
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

export function DocumentActionSheet({ open, onOpenChange, title, subtitle, actions }) {
  const iconMap = {
    payment: CircleDollarSign,
    copy: Copy,
    clone: Copy,
    convert: DownloadIcon,
    archive: Archive,
    delete: Trash2,
    open: FolderOpen,
    export: FileText,
    pdf: FileText,
    projectLink: FolderPlus,
    projectView: FolderOpen,
    documentsLink: GitBranchPlus,
    documentsView: Workflow,
  }
  const toneMap = {
    payment: {
      tile: 'bg-emerald-50 text-emerald-700',
      chevron: 'text-emerald-300',
    },
    copy: {
      tile: 'bg-blue-50 text-blue-700',
      chevron: 'text-blue-300',
    },
    clone: {
      tile: 'bg-violet-50 text-violet-700',
      chevron: 'text-violet-300',
    },
    convert: {
      tile: 'bg-amber-50 text-amber-700',
      chevron: 'text-amber-300',
    },
    archive: {
      tile: 'bg-slate-100 text-slate-700',
      chevron: 'text-slate-300',
    },
    open: {
      tile: 'bg-blue-50 text-blue-700',
      chevron: 'text-blue-300',
    },
    export: {
      tile: 'bg-blue-50 text-blue-700',
      chevron: 'text-blue-300',
    },
    pdf: {
      tile: 'bg-slate-100 text-slate-700',
      chevron: 'text-slate-300',
    },
    projectLink: {
      tile: 'bg-emerald-50 text-emerald-700',
      chevron: 'text-emerald-300',
    },
    projectView: {
      tile: 'bg-emerald-50 text-emerald-700',
      chevron: 'text-emerald-300',
    },
    documentsLink: {
      tile: 'bg-violet-50 text-violet-700',
      chevron: 'text-violet-300',
    },
    documentsView: {
      tile: 'bg-violet-50 text-violet-700',
      chevron: 'text-violet-300',
    },
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[min(72vh,620px)] flex-col rounded-t-[26px] px-0 pb-4"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200" />
        <SheetHeader className="border-b border-border px-4 pb-3 pt-3 text-left">
          <SheetTitle className="text-base font-extrabold text-foreground">{title}</SheetTitle>
          {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
        </SheetHeader>
        <div className="min-h-0 overflow-y-auto px-3 pt-2">
          <div className="space-y-0.5 pb-1">
            {actions.map((action, index) => {
              const danger = !!action.danger
              const Icon = action.icon || iconMap[action.iconKey] || Ellipsis
              const tone = toneMap[action.iconKey] || toneMap.export
              const nextNeedsSeparator = !danger && actions[index + 1]?.danger

              return (
                <div key={action.label} className={cn(nextNeedsSeparator && 'pb-2')}>
                  <button
                    type="button"
                    disabled={action.disabled}
                    onClick={() => {
                      onOpenChange(false)
                      action.onClick()
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-[18px] px-3 py-2.5 text-left transition',
                      danger ? 'hover:bg-red-50' : 'hover:bg-slate-50',
                      action.disabled && 'opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-[12px]',
                        danger ? 'bg-red-50 text-red-600' : tone.tile,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className={cn('text-sm font-bold', danger ? 'text-red-700' : 'text-foreground')}>{action.label}</div>
                      {action.subtitle ? <div className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{action.subtitle}</div> : null}
                    </span>
                    <ChevronRight className={cn('h-4 w-4 shrink-0', danger ? 'text-red-300' : tone.chevron)} />
                  </button>
                  {nextNeedsSeparator ? <div className="mx-3 mt-1.5 border-t border-slate-100" /> : null}
                </div>
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function DocumentPdfSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  settingsNode,
  templateValue,
  onTemplateChange,
  templates,
  actions = [],
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-[30px] px-0 pb-6">
        <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-slate-200" />
        <SheetHeader className="border-b border-border px-5 pb-4 pt-4 text-left">
          <SheetTitle className="text-base font-extrabold text-foreground">{title}</SheetTitle>
          {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
        </SheetHeader>
        <div className="space-y-5 px-5 py-5">
          {settingsNode ? settingsNode : null}
          {templateValue && onTemplateChange && templates?.length ? (
            <div className="space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Template</div>
              <DocumentTemplatePicker value={templateValue} onChange={onTemplateChange} templates={templates} />
            </div>
          ) : null}
          {actions.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  type="button"
                  variant={action.variant || 'outline'}
                  className={cn('h-12 rounded-2xl', action.className)}
                  disabled={action.disabled}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function DocumentBottomBar({ actions }) {
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

export function DocumentFloatingFab({ onClick, label = 'Download PDF' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-28 right-4 z-20 grid h-14 w-14 place-items-center rounded-[18px] bg-slate-950 text-white shadow-[0_16px_36px_-18px_rgba(15,23,42,0.7)] transition hover:bg-slate-800 md:right-6"
    >
      <Download className="h-5 w-5" />
    </button>
  )
}
