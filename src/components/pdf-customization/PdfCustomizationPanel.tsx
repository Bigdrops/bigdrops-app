/**
 * PDF Customization Panel — Shared UI
 *
 * Capability-driven side panel for PDF appearance settings.
 * No document-specific logic. Composes resolved state + setters.
 */

'use client'

import type { ResolvedPdfCustomization, PdfCustomizationPolicy } from '@/domain/pdf/customization/types'
import { PDF_ACCENT_SWATCHES, PDF_FONT_OPTIONS, PDF_FILLABLE_FONT_OPTIONS } from '@/lib/pdfDesignPreset'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HugeiconsIcon } from '@hugeicons/react'
import { Undo02Icon } from '@hugeicons/core-free-icons'

export interface PdfCustomizationPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customization: ResolvedPdfCustomization
  policy: PdfCustomizationPolicy
  onAccentColorChange: (color: string) => void
  onDocumentFontChange: (font: string) => void
  onInkFontChange: (font: string) => void
  onInkColourChange: (color: string) => void
  onReset: () => void
}

function AccentColorSection({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Accent Color</Label>
      <div className="flex flex-wrap gap-2">
        {PDF_ACCENT_SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => onChange(swatch)}
            className={`h-6 w-6 rounded-full border-2 transition-all ${
              value === swatch ? 'border-bd-accent scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: swatch }}
          />
        ))}
      </div>
      <Input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full cursor-pointer"
      />
    </div>
  )
}

function DocumentFontSection({
  value,
  onChange,
}: {
  value: string
  onChange: (font: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Document Font</Label>
      <Select value={value} onValueChange={onChange}>
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
  )
}

function HandwritingFontSection({
  value,
  onChange,
}: {
  value: string
  onChange: (font: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Handwriting Font</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PDF_FILLABLE_FONT_OPTIONS.map((font) => (
            <SelectItem key={font.value} value={font.value}>
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function HandwritingColorSection({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Handwriting Color</Label>
      <Input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full cursor-pointer"
      />
    </div>
  )
}

export function PdfCustomizationPanel({
  open,
  onOpenChange,
  customization,
  policy,
  onAccentColorChange,
  onDocumentFontChange,
  onInkFontChange,
  onInkColourChange,
  onReset,
}: PdfCustomizationPanelProps) {
  const hasAnySection = policy.accentColor || policy.documentFont || policy.handwritingFont || policy.handwritingColor

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>PDF Customization</SheetTitle>
          <SheetDescription>
            Configure appearance for this document.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
          {!hasAnySection && (
            <p className="text-xs text-bd-muted">
              No customization options available for this document.
            </p>
          )}

          {policy.accentColor && (
            <>
              <AccentColorSection
                value={customization.accentColor}
                onChange={onAccentColorChange}
              />
              <Separator />
            </>
          )}

          {policy.documentFont && (
            <>
              <DocumentFontSection
                value={customization.documentFont}
                onChange={onDocumentFontChange}
              />
              <Separator />
            </>
          )}

          {policy.handwritingFont && (
            <>
              <HandwritingFontSection
                value={customization.handwritingFont}
                onChange={onInkFontChange}
              />
              <Separator />
            </>
          )}

          {policy.handwritingColor && (
            <HandwritingColorSection
              value={customization.handwritingColor}
              onChange={onInkColourChange}
            />
          )}
        </div>

        <div className="border-t border-bd-overlay-border px-6 py-4">
          <div className="flex gap-2">
            <SheetClose asChild>
              <Button variant="outline" className="flex-1">
                Done
              </Button>
            </SheetClose>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onReset}
              title="Reset to defaults"
            >
              <HugeiconsIcon icon={Undo02Icon} strokeWidth={2} />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
