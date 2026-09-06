import { type ReactNode } from 'react'
import { Palette, PenLine, Type } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PDF_FONT_OPTIONS,
  PDF_FILLABLE_FONT_OPTIONS,
  type PdfFillableFontChoice,
} from '@/lib/pdfDesignPreset'
import type { ResolvedPdfCustomization } from '@/domain/pdf/customization/types'

// ── Types ────────────────────────────────────────────────────────

interface HandwritingFont {
  value: PdfFillableFontChoice
  label: string
}

interface DocumentCustomizeCardProps {
  /** Currently resolved customization from usePdfCustomization */
  customization: ResolvedPdfCustomization

  // ── Engine setters ────────────────────────────────────────────
  setDocumentFont: (font: string) => void
  setInkFont: (font: string) => void
  setInkColour: (color: string) => void

  // ── Template picker (injected by each document family) ────────
  templatePicker: ReactNode

  // ── Ink color config ──────────────────────────────────────────
  colorSwatches: string[]
  customColor: string | 'auto'
  onCustomColorChange: (color: string | 'auto') => void

  // ── Handwriting font config ───────────────────────────────────
  handwritingFonts: HandwritingFont[]
  customFont: string | 'auto'
  onCustomFontChange: (font: PdfFillableFontChoice | 'auto') => void

  // ── Accent color (commercial documents) ───────────────────────
  showAccentColor?: boolean
  accentColor?: string
  accentEnabled?: boolean
  onAccentColorChange?: (color: string) => void
  onAccentEnabledChange?: (enabled: boolean) => void
  accentColorSwatches?: string[]

  // ── Document font (optional — hidden when capability disabled) ─
  showDocumentFont?: boolean

  // ── Compact / Landscape toggles (commercial documents) ────────
  compact?: boolean
  onCompactChange?: (compact: boolean) => void
  showCompact?: boolean

  landscape?: boolean
  onLandscapeChange?: (landscape: boolean) => void
  showLandscape?: boolean

  // ── Save ──────────────────────────────────────────────────────
  saving?: boolean
  onSave: () => void
}

// ── Component ────────────────────────────────────────────────────

export default function DocumentCustomizeCard({
  customization,
  setDocumentFont,
  setInkFont,
  setInkColour,
  templatePicker,
  colorSwatches,
  customColor,
  onCustomColorChange,
  handwritingFonts,
  customFont,
  onCustomFontChange,
  showAccentColor = false,
  accentColor,
  accentEnabled,
  onAccentColorChange,
  onAccentEnabledChange,
  accentColorSwatches,
  showDocumentFont = true,
  compact,
  onCompactChange,
  showCompact = false,
  landscape,
  onLandscapeChange,
  showLandscape = false,
  saving = false,
  onSave,
}: DocumentCustomizeCardProps) {
  return (
    <div className="space-y-3">
      {/* ── Template ─────────────────────────────────────────── */}
      <div className="rounded-[20px] border border-bd-border bg-bd-surface p-3">
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-bd-text-muted">
          Template
        </div>
        {templatePicker}
      </div>

      {/* ── Accent Color ─────────────────────────────────────── */}
      {showAccentColor && onAccentColorChange && onAccentEnabledChange && accentColor != null ? (
        <AccentColorSection
          accentColor={accentColor}
          accentEnabled={accentEnabled ?? true}
          onAccentColorChange={onAccentColorChange}
          onAccentEnabledChange={onAccentEnabledChange}
          swatches={accentColorSwatches ?? ['#14b8a6', '#3b82f6', '#ef4444', '#f59e0b', '#6366f1', '#111827']}
        />
      ) : null}

      {/* ── Document Font ─────────────────────────────────────── */}
      {showDocumentFont ? (
        <div className="rounded-[20px] border border-bd-border bg-bd-card-bg p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-bd-text">
            <Type className="h-4 w-4 text-bd-button-primary-bg" />
            Document Font
          </div>
          <Select value={customization.documentFont} onValueChange={setDocumentFont}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PDF_FONT_OPTIONS.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {/* ── Ink Color (service documents only) ─────────────────── */}
      {colorSwatches.length > 0 ? (
        <InkColorSection
          customColor={customColor}
          onCustomColorChange={onCustomColorChange}
          colorSwatches={colorSwatches}
        />
      ) : null}

      {/* ── Handwriting Font (service documents only) ────────────── */}
      {handwritingFonts.length > 0 ? (
        <HandwritingFontSection
          customFont={customFont}
          onCustomFontChange={onCustomFontChange}
          handwritingFonts={handwritingFonts}
        />
      ) : null}

      {/* ── Compact / Landscape ───────────────────────────────── */}
      {(showCompact || showLandscape) ? (
        <div className="rounded-[20px] border border-bd-border bg-bd-surface p-3 space-y-2">
          {showCompact && compact != null && onCompactChange ? (
            <ToggleRow
              label="Compact Layout"
              description="Condense margins and spacing to fit content onto fewer pages"
              checked={compact}
              onToggle={() => onCompactChange(!compact)}
            />
          ) : null}
          {showLandscape && landscape != null && onLandscapeChange ? (
            <ToggleRow
              label="Landscape Layout"
              description="Force page orientation to landscape for wider content"
              checked={landscape}
              onToggle={() => onLandscapeChange(!landscape)}
            />
          ) : null}
        </div>
      ) : null}

      {/* ── Save ──────────────────────────────────────────────── */}
      <button
        type="button"
        className="h-12 w-full rounded-[18px] bg-bd-button-primary-bg text-sm font-bold text-bd-button-primary-text transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={saving}
        onClick={onSave}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}

// ── Sub-sections ─────────────────────────────────────────────────

function AccentColorSection({
  accentColor,
  accentEnabled,
  onAccentColorChange,
  onAccentEnabledChange,
  swatches,
}: {
  accentColor: string
  accentEnabled: boolean
  onAccentColorChange: (color: string) => void
  onAccentEnabledChange: (enabled: boolean) => void
  swatches: string[]
}) {
  return (
    <div className="rounded-[20px] border border-bd-border bg-bd-card-bg p-3">
      <div
        className="flex cursor-pointer items-center justify-between select-none"
        onClick={() => onAccentEnabledChange(!accentEnabled)}
      >
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-bd-text">
            <Palette className="h-4 w-4 text-bd-button-primary-bg" />
            Accent Color
          </div>
          <p className="text-xs text-bd-text-muted">
            Override the template accent color used in headers and rules.
          </p>
        </div>
        <Switch
          checked={accentEnabled}
          onCheckedChange={onAccentEnabledChange}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {accentEnabled ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {swatches.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => onAccentColorChange(swatch)}
                className={cn(
                  'h-8 w-8 rounded-lg border-2 shadow-sm transition',
                  accentColor.toLowerCase() === swatch.toLowerCase()
                    ? 'border-bd-text scale-110 ring-2 ring-bd-text/20'
                    : 'border-transparent hover:border-bd-text-muted/40',
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
          <Input
            type="color"
            value={accentColor}
            onChange={(e) => onAccentColorChange(e.target.value)}
            className="mt-2 h-9 w-full cursor-pointer rounded-[12px]"
          />
        </div>
      ) : null}
    </div>
  )
}

function InkColorSection({
  customColor,
  onCustomColorChange,
  colorSwatches,
}: {
  customColor: string | 'auto'
  onCustomColorChange: (color: string | 'auto') => void
  colorSwatches: string[]
}) {
  const active = customColor !== 'auto'

  return (
    <div className="rounded-[20px] border border-bd-border bg-bd-card-bg p-3">
      <div
        className="flex cursor-pointer items-center justify-between select-none"
        onClick={() => onCustomColorChange(active ? 'auto' : colorSwatches[0])}
      >
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-bd-text">
            <PenLine className="h-4 w-4 text-bd-button-primary-bg" />
            Ink Color
          </div>
          <p className="text-xs text-bd-text-muted">
            Override the fillable text color with a custom hex value.
          </p>
        </div>
        <Switch
          checked={active}
          onCheckedChange={(checked) =>
            onCustomColorChange(checked ? colorSwatches[0] : 'auto')
          }
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {active ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {colorSwatches.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => onCustomColorChange(swatch)}
                className={cn(
                  'h-8 w-8 rounded-lg border-2 shadow-sm transition',
                  customColor.toLowerCase() === swatch.toLowerCase()
                    ? 'border-bd-text scale-110 ring-2 ring-bd-text/20'
                    : 'border-transparent hover:border-bd-text-muted/40',
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
          <Input
            type="color"
            value={active ? customColor : '#000000'}
            onChange={(e) => onCustomColorChange(e.target.value)}
            className="mt-2 h-9 w-full cursor-pointer rounded-[12px]"
          />
        </div>
      ) : null}
    </div>
  )
}

function HandwritingFontSection({
  customFont,
  onCustomFontChange,
  handwritingFonts,
}: {
  customFont: string | 'auto'
  onCustomFontChange: (font: string | 'auto') => void
  handwritingFonts: HandwritingFont[]
}) {
  const active = customFont !== 'auto'

  return (
    <div className="rounded-[20px] border border-bd-border bg-bd-card-bg p-3">
      <div
        className="flex cursor-pointer items-center justify-between select-none"
        onClick={() => onCustomFontChange(active ? 'auto' : handwritingFonts[0]?.value || ('Caveat' as PdfFillableFontChoice))}
      >
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-bd-text">
            <Type className="h-4 w-4 text-bd-button-primary-bg" />
            Handwriting Font
          </div>
          <p className="text-xs text-bd-text-muted">
            Swap the handwriting script used for fillable data entries.
          </p>
        </div>
        <Switch
          checked={active}
          onCheckedChange={(checked) =>
            onCustomFontChange(checked ? handwritingFonts[0]?.value || ('Caveat' as PdfFillableFontChoice) : 'auto')
          }
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {active ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {handwritingFonts.map((font) => (
            <button
              key={font.value}
              type="button"
              onClick={() => onCustomFontChange(font.value)}
              className={cn(
                'rounded-[14px] px-4 py-2.5 text-sm font-medium border transition-all active:scale-95',
                customFont === font.value
                  ? 'bg-bd-button-primary-bg text-bd-button-primary-text border-bd-button-primary-bg shadow-sm ring-2 ring-bd-button-primary-bg/20'
                  : 'bg-bd-surface-muted text-bd-text border-bd-border hover:border-bd-text-muted',
              )}
            >
              {font.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string
  description?: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-bd-border bg-bd-card-bg px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-bd-text">{label}</div>
        {description ? (
          <div className="mt-0.5 text-xs text-bd-text-muted">{description}</div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'relative ml-3 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none',
          checked ? 'bg-bd-brand' : 'bg-bd-border',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-bd-card-bg shadow-md transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  )
}
