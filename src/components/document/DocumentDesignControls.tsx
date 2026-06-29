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
  type PdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TemplatePreview {
  shell: string
  nodes: string[]
}

const templatePreviewById: Record<string, TemplatePreview> = {
  default: {
    shell: 'bg-white border border-slate-200',
    nodes: ['h-1.5 w-full rounded-full bg-slate-800', 'h-0.5 w-3/5 rounded-full bg-slate-200', 'h-0.5 w-2/5 rounded-full bg-slate-300'],
  },
  industry: {
    shell: 'bg-white border border-slate-200',
    nodes: ['h-1.5 w-full rounded-full bg-slate-700', 'h-0.5 w-full rounded-full bg-slate-200', 'h-0.5 w-4/5 rounded-full bg-slate-200'],
  },
  ledger: {
    shell: 'bg-[#2F3A44] border border-[#24303A]',
    nodes: ['h-2.5 w-12 rounded-full bg-[#D8C7A3]', 'h-1 w-4/5 rounded-full bg-white/70', 'h-1 w-3/5 rounded-full bg-white/40'],
  },
  apex: {
    shell: 'bg-white border border-[#b8c4c4]',
    nodes: ['h-1.5 w-full rounded-full bg-[#1a2f2f]', 'h-1 w-2/5 rounded-full bg-[#0d7c7c]', 'h-1 w-4/5 rounded-full bg-[#e6f4f4]'],
  },
  bolt: {
    shell: 'bg-[#faf8f0] border border-[#1b4332]',
    nodes: ['h-1.5 w-full rounded-full bg-[#2d6a4f]', 'h-1 w-2/5 rounded-full bg-[#52b788]', 'h-1 w-4/5 rounded-full bg-[#d4a373]'],
  },
  ember: {
    shell: 'bg-[#f4f6f8] border border-[#2c3e50]',
    nodes: ['h-1.5 w-full rounded-full bg-[#2c3e50]', 'h-1 w-2/5 rounded-full bg-[#e67e22]', 'h-1 w-4/5 rounded-full bg-[#e9edf2]'],
  },
  bordered_schedule: {
    shell: 'bg-white border border-slate-300',
    nodes: ['h-1.5 w-full bg-slate-700', 'h-0.5 w-full bg-slate-300', 'h-4 w-full border border-slate-400 bg-white'],
  },
  minimal: {
    shell: 'bg-white border border-slate-200',
    nodes: ['h-1 w-full rounded-full bg-slate-300', 'h-0.5 w-full rounded-full bg-slate-200', 'h-0.5 w-4/5 rounded-full bg-slate-200'],
  },
  elegant: {
    shell: 'bg-amber-50',
    nodes: ['h-1.5 w-16 rounded-full bg-amber-600', 'h-1 w-full rounded-full bg-amber-200', 'h-1 w-3/5 rounded-full bg-stone-200'],
  },
}

interface Template {
  id: string
  label?: string
  description?: string
  name?: string
  thumbnail?: string
}

interface DocumentTemplatePickerProps {
  value: string
  onChange: (templateId: string) => void
  templates: Template[]
}

export function DocumentTemplatePicker({ value, onChange, templates }: DocumentTemplatePickerProps) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4">
      {templates.map((template) => {
        const active = value === template.id
        const preview = templatePreviewById[template.id] || templatePreviewById.minimal

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onChange(template.id)}
            className={cn(
              'relative flex w-[220px] shrink-0 flex-col overflow-hidden rounded-[24px] border p-1.5 transition-all duration-300',
              active
                ? 'border-bd-button-primary-bg bg-bd-button-primary-bg text-bd-button-primary-text shadow-xl ring-2 ring-bd-button-primary-bg ring-offset-2'
                : 'border-bd-border bg-bd-card-bg text-bd-text hover:border-bd-border hover:bg-bd-surface-muted/50',
            )}
          >
            <div className={cn('mb-3 flex h-[100px] flex-col justify-between rounded-[18px] p-3 shadow-inner', preview.shell)}>
              <div className="space-y-1.5">
                {preview.nodes.slice(0, 2).map((nodeClass, index) => (
                  <div key={`${template.id}-${index}`} className={cn(nodeClass, 'opacity-80')} />
                ))}
              </div>
              <div className="space-y-2">
                {preview.nodes.slice(2).map((nodeClass, index) => (
                  <div key={`${template.id}-col-${index}`} className={nodeClass} />
                ))}
              </div>
            </div>
            
            <div className="px-2 pb-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold tracking-tight">
                  {template.label || template.name}
                </span>
                {active && (
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-bd-button-primary-bg">
                    <CheckCircle2 className="size-3 text-bd-button-primary-text" />
                  </div>
                )}
              </div>
              <div className={cn(
                'mt-0.5 line-clamp-1 text-[11px] leading-tight',
                active ? 'text-bd-text-muted' : 'text-bd-text-muted'
              )}>
                {template.description}
              </div>
            </div>

            {!active && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 transition-opacity hover:opacity-100" />
            )}
          </button>
        )
      })}
    </div>
  )
}

interface DesignSection {
  key?: string
  title: string
  description?: string
  content: React.ReactNode
  defaultOpen?: boolean
}

interface DocumentDesignPanelProps {
  title: string
  subtitle?: string
  badge?: string
  sections: DesignSection[]
}

export function DocumentDesignPanel({ title, subtitle = '', badge = 'Persistent preset', sections }: DocumentDesignPanelProps) {
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((section, index) => [section.key || String(index), section.defaultOpen !== false])),
  )

  return (
    <Card className="overflow-hidden rounded-[26px] border-bd-border bg-bd-surface shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-bd-text-muted">
              <Palette className="h-4 w-4 text-bd-text-muted" />
              {title}
            </div>
            {subtitle ? <div className="mt-2 max-w-2xl text-sm leading-6 text-bd-text-muted">{subtitle}</div> : null}
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
              <div key={sectionKey} className="overflow-hidden rounded-[22px] border border-bd-border bg-bd-card-bg shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <button
                  type="button"
                  onClick={() => setOpenSections((current) => ({ ...current, [sectionKey]: !open }))}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <div className="min-w-0">
                    <div className="text-base font-extrabold tracking-[-0.03em] text-bd-text">{section.title}</div>
                    {section.description ? <div className="mt-1 text-sm text-bd-text-muted">{section.description}</div> : null}
                  </div>
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-bd-border bg-bd-surface text-bd-text-muted">
                    {open ? <ChevronDown className="h-4 w-4 rotate-180" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                {open ? <div className="border-t border-bd-border px-4 py-4">{section.content}</div> : null}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

interface FillableWritingControlsProps {
  value: PdfDesignPreset
  onChange: (preset: PdfDesignPreset) => void
  showModeToggle?: boolean
}

function FillableWritingControls({ value, onChange, showModeToggle = true }: FillableWritingControlsProps) {
  const effectiveFillableFont = getEffectiveFillableFont(value)

  const update = (patch: Partial<PdfDesignPreset>) => {
    onChange({
      ...value,
      ...patch,
    })
  }

  return (
    <div className="rounded-[18px] border border-bd-border bg-bd-surface-muted/30 p-4">
      {showModeToggle ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-bd-text-muted">Fillable Font</div>
            <div className="mt-1 text-sm text-bd-text-muted">
              Auto uses the current body font until you switch to a manual fillable font.
            </div>
          </div>
          <div className="inline-flex rounded-full border border-bd-border bg-bd-surface p-1">
            <button
              type="button"
              onClick={() => update({ fillableFontMode: 'auto' })}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold transition',
                value.fillableFontMode === 'auto' ? 'bg-bd-button-primary-bg text-bd-button-primary-text' : 'text-bd-text-muted',
              )}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => update({ fillableFontMode: 'custom' })}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold transition',
                value.fillableFontMode === 'custom' ? 'bg-bd-button-primary-bg text-bd-button-primary-text' : 'text-bd-text-muted',
              )}
            >
              Custom
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-bd-text-muted">Fillable Writing</div>
          <div className="mt-1 text-sm text-bd-text-muted">
            Control the handwriting-style font and color used for dynamic document values.
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-bd-text-muted">Fillable Font Choice</div>
          <Select
            value={value.fillableFontMode === 'custom' ? value.fillableFont : effectiveFillableFont}
            onValueChange={(next) => update({ fillableFont: next as any, fillableFontMode: 'custom' })}
            disabled={showModeToggle && value.fillableFontMode !== 'custom'}
          >
            <SelectTrigger className="h-11 rounded-[14px] bg-bd-surface disabled:opacity-70">
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
          <div className="text-xs text-bd-text-muted">
            Effective fillable font: {PDF_FONT_OPTIONS.find((option) => option.value === effectiveFillableFont)?.label}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-bd-text-muted">Fillable Color</div>
          <Input
            value={value.fillableColor}
            onChange={(event) => update({ fillableColor: event.target.value })}
            className="h-11 rounded-[14px] bg-bd-surface font-mono"
            placeholder="#0f172a"
          />
        </div>
      </div>
    </div>
  )
}

interface DocumentDesignStyleEditorProps {
  value: PdfDesignPreset
  onChange: (preset: PdfDesignPreset) => void
  accentLabel?: string
  showAccentControls?: boolean
  showFontControls?: boolean
  showFillableControls?: boolean
}

export function DocumentDesignStyleEditor({
  value,
  onChange,
  accentLabel = 'Accent Color',
  showAccentControls = true,
  showFontControls = true,
  showFillableControls = true,
}: DocumentDesignStyleEditorProps) {
  const update = (patch: Partial<PdfDesignPreset>) => {
    onChange({
      ...value,
      ...patch,
    })
  }

  return (
    <div className="space-y-5">
      {showAccentControls ? (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-bd-text-muted">{accentLabel}</div>
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
                    active ? 'border-bd-button-primary-bg scale-[1.03]' : 'border-white/80',
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
              className="h-11 rounded-[14px] bg-bd-surface font-mono"
              placeholder="#14b8a6"
            />
          </div>
        </div>
      ) : null}

      {showFontControls ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-bd-text-muted">Header Font</div>
            <Select value={value.headerFont} onValueChange={(next) => update({ headerFont: next as any })}>
              <SelectTrigger className="h-11 rounded-[14px] bg-bd-surface">
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
            <div className="text-xs text-bd-text-muted">
              {PDF_FONT_OPTIONS.find((option) => option.value === value.headerFont)?.description}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-bd-text-muted">Body Font</div>
            <Select value={value.bodyFont} onValueChange={(next) => update({ bodyFont: next as any })}>
              <SelectTrigger className="h-11 rounded-[14px] bg-bd-surface">
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
            <div className="text-xs text-bd-text-muted">
              {PDF_FONT_OPTIONS.find((option) => option.value === value.bodyFont)?.description}
            </div>
          </div>
        </div>
      ) : null}

      {showFillableControls ? <FillableWritingControls value={value} onChange={onChange} /> : null}
    </div>
  )
}

interface DocumentFillableWritingEditorProps {
  value: PdfDesignPreset
  onChange: (preset: PdfDesignPreset) => void
}

export function DocumentFillableWritingEditor({ value, onChange }: DocumentFillableWritingEditorProps) {
  return <FillableWritingControls value={value} onChange={onChange} showModeToggle={false} />
}
