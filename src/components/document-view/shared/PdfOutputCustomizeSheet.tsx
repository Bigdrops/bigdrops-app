import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

import { PdfBankControls, PdfDocumentOptionsCard, type PdfOutputSettingsValue } from '@/components/PdfOutputSettings'
import { type InvoicePdfTemplateId } from '@/domain/invoice/types'
import { usePdfCustomization } from '@/domain/pdf/customization/hooks'
import type { ResolvedPdfCustomization, PdfCustomizationDocumentFamily } from '@/domain/pdf/customization/types'
import { COMMERCIAL_CAPABILITIES, COMMERCIAL_POLICY, COMMERCIAL_TEMPLATE_DEFAULTS, bridgeToCommercialDesignPreset, loadEngineSettings, resolveCommercialDocumentFamily } from '@/domain/pdf/customization/commercial'
import type { PdfDesignPreset, PdfDesignPresetDocument } from '@/lib/pdfDesignPreset'
import { getPdfDesignPreset, hasSavedPdfDesignPreset, setPdfDesignPreset, PDF_ACCENT_SWATCHES } from '@/lib/pdfDesignPreset'

import DocumentSheet from './DocumentSheet'
import DocumentCustomizeCard from './DocumentCustomizeCard'

type BankAccountOption = {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  sortCode: string
  isDefault?: boolean
}

const INVOICE_PDF_TEMPLATE_OPTIONS = [
  {
    id: 'industry', label: 'Industry', eyebrow: 'Structured',
    shell: 'bg-white border border-slate-200',
    accents: ['h-1.5 w-full rounded-full bg-slate-700', 'h-0.5 w-full rounded-full bg-slate-200', 'h-0.5 w-4/5 rounded-full bg-slate-200'],
    columns: ['h-7 w-full rounded-md border border-slate-200 bg-white', 'h-1 w-full rounded-full bg-slate-200', 'h-1 w-5/6 rounded-full bg-slate-200'],
  },
  {
    id: 'ledger', label: 'Ledger', eyebrow: 'Editorial',
    shell: 'bg-[#2F3A44] border border-[#24303A]',
    accents: ['h-2.5 w-12 rounded-full bg-[#D8C7A3]', 'h-1 w-4/5 rounded-full bg-white/70', 'h-1 w-3/5 rounded-full bg-white/40'],
    columns: ['h-7 w-full rounded-md bg-[#F3EFE6]', 'h-1 w-full rounded-full bg-white/45', 'h-1 w-2/3 rounded-full bg-white/30'],
  },
  {
    id: 'crest', label: 'Crest', eyebrow: 'Coming Soon',
    shell: 'bg-white border border-slate-200',
    accents: ['h-1.5 w-full rounded-full bg-[#1e3a5f]', 'h-1 w-2/5 rounded-full bg-[#c9a96e]', 'h-1 w-3/5 rounded-full bg-slate-200'],
    columns: ['h-7 w-full rounded-md border border-slate-200 bg-slate-50', 'h-1 w-full rounded-full bg-slate-200', 'h-1 w-2/3 rounded-full bg-slate-200'],
  },
  {
    id: 'minimal', label: 'Minimal', eyebrow: 'Restrained',
    shell: 'bg-white border border-slate-200',
    accents: ['h-1.5 w-full rounded-full bg-[#111827]', 'h-0.5 w-4/5 rounded-full bg-slate-300', 'h-0.5 w-3/5 rounded-full bg-slate-200'],
    columns: ['h-7 w-full rounded-md border border-slate-200 bg-white', 'h-1 w-full rounded-full bg-slate-200', 'h-1 w-5/6 rounded-full bg-slate-200'],
  },
  {
    id: 'evergreen', label: 'Evergreen', eyebrow: 'Fresh',
    shell: 'bg-white border border-slate-200',
    accents: ['h-1.5 w-full rounded-full bg-[#1f6e5c]', 'h-1 w-2/5 rounded-full bg-[#2a8a73]', 'h-1 w-3/5 rounded-full bg-[#e8f3ef]'],
    columns: ['h-7 w-full rounded-md bg-[#f0f6f2]', 'h-1 w-full rounded-full bg-[#d4dfd8]', 'h-1 w-2/3 rounded-full bg-[#d4dfd8]'],
  },
  {
    id: 'bolt', label: 'Bolt', eyebrow: 'Certificate',
    shell: 'bg-[#faf8f0] border border-[#1b4332]',
    accents: ['h-1.5 w-full rounded-full bg-[#2d6a4f]', 'h-1 w-2/5 rounded-full bg-[#52b788]', 'h-1 w-3/5 rounded-full bg-[#d4a373]'],
    columns: ['h-7 w-full rounded-md bg-white border border-[#d1d5db]', 'h-1 w-full rounded-full bg-[#d1d5db]', 'h-1 w-2/3 rounded-full bg-[#d1d5db]'],
  },
  {
    id: 'ember', label: 'Ember', eyebrow: 'Warm',
    shell: 'bg-[#f4f6f8] border border-[#2c3e50]',
    accents: ['h-1.5 w-full rounded-full bg-[#2c3e50]', 'h-1 w-2/5 rounded-full bg-[#e67e22]', 'h-1 w-3/5 rounded-full bg-[#e9edf2]'],
    columns: ['h-7 w-full rounded-md bg-white border border-[#e9edf2]', 'h-1 w-full rounded-full bg-[#e9edf2]', 'h-1 w-2/3 rounded-full bg-[#e9edf2]'],
  },
] as const satisfies ReadonlyArray<{
  id: InvoicePdfTemplateId
  label: string
  eyebrow: string
  shell: string
  accents: readonly string[]
  columns: readonly string[]
}>

/**
 * Resolve the initial draft preset when the customization sheet opens.
 *
 * The persisted design preset is the single source of truth for the
 * Custom Colors / Custom Fonts toggles. When the engine store holds
 * saved accent/font values, they take precedence over the preset's
 * (the engine is updated on every edit inside this sheet).
 *
 * Legacy default: engine-saved customizations show the toggles ON until the
 * user explicitly saves a preset (matching the historical always-ON modal).
 */
function resolveInitialDraftPreset(
  documentType: PdfDesignPresetDocument,
  docFamily: PdfCustomizationDocumentFamily,
  customization: ResolvedPdfCustomization,
): PdfDesignPreset {
  const persisted = getPdfDesignPreset(documentType)
  if (!loadEngineSettings(docFamily)) return persisted
  const preset = bridgeToCommercialDesignPreset(persisted, customization)
  if (!hasSavedPdfDesignPreset(documentType)) {
    preset.useCustomColors = true
    preset.useCustomFonts = true
  }
  return preset
}

interface PdfOutputCustomizeSheetProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle: string
  documentType: PdfDesignPresetDocument
  value: PdfOutputSettingsValue
  bankAccounts?: BankAccountOption[]
  companyTagline?: string
  footerText?: string
  designOnly?: boolean
  templateId?: InvoicePdfTemplateId
  onSave: (value: PdfOutputSettingsValue, preset: PdfDesignPreset, templateId: InvoicePdfTemplateId) => void | Promise<void>
}

export default function PdfOutputCustomizeSheet({
  open,
  onClose,
  title,
  subtitle,
  documentType,
  value,
  bankAccounts = [],
  companyTagline = '',
  footerText = '',
  designOnly = false,
  templateId = 'industry',
  onSave,
}: PdfOutputCustomizeSheetProps) {
  const [draftValue, setDraftValue] = useState<PdfOutputSettingsValue>(value)
  const [draftTemplateId, setDraftTemplateId] = useState<InvoicePdfTemplateId>(templateId)
  const [saving, setSaving] = useState(false)

  const docFamily = resolveCommercialDocumentFamily(documentType)
  const { customization, setAccentColor, setDocumentFont } = usePdfCustomization({
    documentFamily: docFamily,
    templateDefaults: COMMERCIAL_TEMPLATE_DEFAULTS,
    capabilities: COMMERCIAL_CAPABILITIES,
    policy: COMMERCIAL_POLICY,
  })

  const [draftPreset, setDraftPreset] = useState<PdfDesignPreset>(() =>
    resolveInitialDraftPreset(documentType, docFamily, customization),
  )

  useEffect(() => {
    if (!open) return
    setDraftValue(value)
    setDraftTemplateId(templateId)
    setDraftPreset(resolveInitialDraftPreset(documentType, docFamily, customization))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handlePresetChange = (next: PdfDesignPreset) => {
    if (next.accentColor !== draftPreset.accentColor) setAccentColor(next.accentColor)
    if (next.headerFont !== draftPreset.headerFont || next.bodyFont !== draftPreset.bodyFont) {
      setDocumentFont(next.bodyFont)
    }
    setDraftPreset(next)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      setPdfDesignPreset(documentType, draftPreset)
      await onSave(draftValue, draftPreset, draftTemplateId)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  // Build the template picker carousel for DocumentCustomizeCard
  const templatePickerNode = (
    <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
      {INVOICE_PDF_TEMPLATE_OPTIONS.map((option) => {
        const active = draftTemplateId === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setDraftTemplateId(option.id)}
            className={cn(
              'relative flex w-[240px] shrink-0 flex-col overflow-hidden rounded-[24px] border p-1.5 transition-all duration-300',
              active
                ? 'border-bd-button-primary-bg bg-bd-button-primary-bg text-bd-button-primary-text shadow-xl ring-2 ring-bd-button-primary-bg ring-offset-2'
                : 'border-bd-border bg-bd-surface text-bd-text hover:border-bd-border hover:bg-bd-surface-muted/50',
            )}
          >
            <div className={cn('mb-3 flex h-[120px] flex-col justify-between rounded-[18px] p-3.5 shadow-inner', option.shell)}>
              <div className="space-y-1.5">
                {option.accents.map((nodeClass, index) => (
                  <div key={`${option.id}-accent-${index}`} className={cn(nodeClass, 'opacity-80')} />
                ))}
              </div>
              <div className="space-y-2">
                {option.columns.map((nodeClass, index) => (
                  <div key={`${option.id}-column-${index}`} className={nodeClass} />
                ))}
              </div>
            </div>
            <div className="px-2 pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-bd-text-muted">
                    {option.eyebrow}
                  </div>
                  <div className="mt-0.5 truncate text-sm font-bold tracking-tight text-bd-text">
                    {option.label}
                  </div>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )

  return (
    <DocumentSheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <div className="space-y-4">
        {/* ── Commercial-specific: Bank controls & Document options ── */}
        {!designOnly ? (
          <>
            <PdfBankControls value={draftValue} onChange={setDraftValue} bankAccounts={bankAccounts} />
            <PdfDocumentOptionsCard
              value={draftValue}
              onChange={setDraftValue}
              companyTagline={companyTagline}
              footerText={footerText}
              defaultOpen
            />
          </>
        ) : null}

        {/* ── Canonical customization card (shared) ── */}
        <DocumentCustomizeCard
          customization={customization}
          setDocumentFont={(font) => {
            setDocumentFont(font)
            handlePresetChange({ ...draftPreset, bodyFont: font as any, headerFont: font as any })
          }}
          setInkFont={() => {}}
          setInkColour={() => {}}
          templatePicker={templatePickerNode}
          colorSwatches={[]}
          customColor="auto"
          onCustomColorChange={() => {}}
          handwritingFonts={[]}
          customFont="auto"
          onCustomFontChange={() => {}}
          showDocumentFont
          showAccentColor
          accentColor={draftPreset.accentColor}
          onAccentColorChange={(color) => handlePresetChange({ ...draftPreset, accentColor: color })}
          accentColorSwatches={PDF_ACCENT_SWATCHES}
          showCompact
          compact={draftValue.compact}
          onCompactChange={(c) => setDraftValue((prev) => ({ ...prev, compact: c }))}
          showLandscape
          landscape={draftValue.landscapeLayout ?? false}
          onLandscapeChange={(l) => setDraftValue((prev) => ({ ...prev, landscapeLayout: l }))}
          saving={saving}
          onSave={() => void handleSave()}
        />
      </div>
    </DocumentSheet>
  )
}
