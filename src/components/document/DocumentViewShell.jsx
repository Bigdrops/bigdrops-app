import {
  Archive,
  ArrowLeft,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Download as DownloadIcon,
  Download,
  Ellipsis,
  FileText,
  FolderOpen,
  Pencil,
  Trash2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export function DocumentSection({ title, children, className = '' }) {
  return (
    <section className={cn('space-y-2', className)}>
      <div className="px-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
      {children}
    </section>
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
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[30px] px-0 pb-6">
        <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-slate-200" />
        <SheetHeader className="border-b border-border px-5 pb-4 pt-4 text-left">
          <SheetTitle className="text-base font-extrabold text-foreground">{title}</SheetTitle>
          {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
        </SheetHeader>
        <div className="px-3 pt-2">
          <div className="space-y-1">
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
                      'flex w-full items-center gap-3 rounded-[22px] px-3 py-3 text-left transition',
                      danger ? 'hover:bg-red-50' : 'hover:bg-slate-50',
                      action.disabled && 'opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-11 w-11 shrink-0 place-items-center rounded-[14px]',
                        danger ? 'bg-red-50 text-red-600' : tone.tile,
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className={cn('text-sm font-bold', danger ? 'text-red-700' : 'text-foreground')}>{action.label}</div>
                      {action.subtitle ? <div className="mt-0.5 text-[11px] text-muted-foreground">{action.subtitle}</div> : null}
                    </span>
                    <ChevronRight className={cn('h-4 w-4 shrink-0', danger ? 'text-red-300' : tone.chevron)} />
                  </button>
                  {nextNeedsSeparator ? <div className="mx-3 mt-2 border-t border-slate-100" /> : null}
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
          {settingsNode}
          <div className="space-y-2">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Template</div>
            <DocumentTemplatePicker value={templateValue} onChange={onTemplateChange} templates={templates} />
          </div>
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
