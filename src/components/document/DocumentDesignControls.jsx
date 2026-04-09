import * as React from 'react'
import {
  CheckCircle2,
  ChevronDown,
  Palette,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  getEffectiveFillableFont,
  PDF_ACCENT_SWATCHES,
  PDF_FILLABLE_FONT_OPTIONS,
  PDF_FONT_OPTIONS,
} from '@/lib/pdfDesignPreset'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const templatePreviewById = {
  bold: {
    shell: 'bg-slate-50',
    nodes: ['-mx-1 h-2 rounded-t-sm bg-slate-900', 'h-1 w-full rounded-full bg-slate-300', 'h-1 w-3/4 rounded-full bg-slate-200'],
  },
  standard: {
    shell: 'bg-slate-50',
    nodes: ['h-1.5 w-12 rounded-full bg-slate-950', 'h-1 w-full rounded-full bg-slate-300', 'h-1 w-3/5 rounded-full bg-slate-200'],
  },
  classic: {
    shell: 'bg-violet-50',
    nodes: ['h-1.5 w-16 rounded-full bg-violet-600', 'h-1 w-full rounded-full bg-violet-200', 'h-1 w-3/5 rounded-full bg-slate-200'],
  },
  minimal: {
    shell: 'bg-white border border-slate-200',
    nodes: ['h-1 w-full rounded-full bg-slate-300', 'h-0.5 w-full rounded-full bg-slate-200', 'h-0.5 w-4/5 rounded-full bg-slate-200'],
  },
  modern: {
    shell: 'bg-violet-600',
    nodes: ['h-1.5 w-14 rounded-full bg-white/90', 'h-1 w-full rounded-full bg-white/40', 'h-1 w-3/5 rounded-full bg-white/30'],
  },
  elegant: {
    shell: 'bg-amber-50',
    nodes: ['h-1.5 w-16 rounded-full bg-amber-600', 'h-1 w-full rounded-full bg-amber-200', 'h-1 w-3/5 rounded-full bg-stone-200'],
  },
}

export function DocumentTemplatePicker({ value, onChange, templates }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {templates.map((template) => {
        const active = value === template.id
        const preview = templatePreviewById[template.id] || templatePreviewById.classic

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

export function DocumentDesignPanel({ title, subtitle = '', badge = 'Persistent preset', sections }) {
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

function FillableWritingControls({ value, onChange, showModeToggle = true }) {
  const effectiveFillableFont = getEffectiveFillableFont(value)

  const update = (patch) => {
    onChange({
      ...value,
      ...patch,
    })
  }

  return (
    <div className="rounded-[18px] border border-border bg-muted/30 p-4">
      {showModeToggle ? (
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
      ) : (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Fillable Writing</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Control the handwriting-style font and color used for dynamic document values.
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Fillable Font Choice</div>
          <Select
            value={value.fillableFontMode === 'custom' ? value.fillableFont : effectiveFillableFont}
            onValueChange={(next) => update({ fillableFont: next, fillableFontMode: 'custom' })}
            disabled={showModeToggle && value.fillableFontMode !== 'custom'}
          >
            <SelectTrigger className="h-11 rounded-[14px] bg-white disabled:opacity-70">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PDF_FILLABLE_FONT_OPTIONS.map((option) => (
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
  )
}

export function DocumentDesignStyleEditor({ value, onChange, accentLabel = 'Accent Color', showFillableControls = true }) {
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

      {showFillableControls ? <FillableWritingControls value={value} onChange={onChange} /> : null}
    </div>
  )
}

export function DocumentFillableWritingEditor({ value, onChange }) {
  return <FillableWritingControls value={value} onChange={onChange} showModeToggle={false} />
}
