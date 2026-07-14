import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

import { PdfBankControls, PdfDocumentOptionsCard, type PdfOutputSettingsValue } from '@/components/PdfOutputSettings'
import DocumentTemplateDesignOverrides from '@/components/document/DocumentTemplateDesignOverrides'
import { type InvoicePdfTemplateId } from '@/domain/invoice/types'
import { usePdfCustomization } from '@/domain/pdf/customization/hooks'
import { COMMERCIAL_CAPABILITIES, COMMERCIAL_POLICY, COMMERCIAL_TEMPLATE_DEFAULTS, bridgeToCommercialDesignPreset, resolveCommercialDocumentFamily } from '@/domain/pdf/customization/commercial'
import type { PdfDesignPreset, PdfDesignPresetDocument } from '@/lib/pdfDesignPreset'
import { getDefaultPdfDesignPreset } from '@/lib/pdfDesignPreset'

import DocumentSheet from './DocumentSheet'

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
    id: 'industry',
    label: 'Industry',
    eyebrow: 'Structured',
    shell: 'bg-white border border-slate-200',
    accents: ['h-1.5 w-full rounded-full bg-slate-700', 'h-0.5 w-full rounded-full bg-slate-200', 'h-0.5 w-4/5 rounded-full bg-slate-200'],
    columns: ['h-7 w-full rounded-md border border-slate-200 bg-white', 'h-1 w-full rounded-full bg-slate-200', 'h-1 w-5/6 rounded-full bg-slate-200'],
  },
  {
    id: 'ledger',
    label: 'Ledger',
    eyebrow: 'Editorial',
    shell: 'bg-[#2F3A44] border border-[#24303A]',
    accents: ['h-2.5 w-12 rounded-full bg-[#D8C7A3]', 'h-1 w-4/5 rounded-full bg-white/70', 'h-1 w-3/5 rounded-full bg-white/40'],
    columns: ['h-7 w-full rounded-md bg-[#F3EFE6]', 'h-1 w-full rounded-full bg-white/45', 'h-1 w-2/3 rounded-full bg-white/30'],
  },
  {
    id: 'crest',
    label: 'Crest',
    eyebrow: 'Coming Soon',
    shell: 'bg-white border border-slate-200',
    accents: ['h-1.5 w-full rounded-full bg-[#1e3a5f]', 'h-1 w-2/5 rounded-full bg-[#c9a96e]', 'h-1 w-3/5 rounded-full bg-slate-200'],
    columns: ['h-7 w-full rounded-md border border-slate-200 bg-slate-50', 'h-1 w-full rounded-full bg-slate-200', 'h-1 w-2/3 rounded-full bg-slate-200'],
  },
  {
    id: 'minimal',
    label: 'Minimal',
    eyebrow: 'Restrained',
    shell: 'bg-white border border-slate-200',
    accents: ['h-1.5 w-full rounded-full bg-[#111827]', 'h-0.5 w-4/5 rounded-full bg-slate-300', 'h-0.5 w-3/5 rounded-full bg-slate-200'],
    columns: ['h-7 w-full rounded-md border border-slate-200 bg-white', 'h-1 w-full rounded-full bg-slate-200', 'h-1 w-5/6 rounded-full bg-slate-200'],
  },
  {
    id: 'evergreen',
    label: 'Evergreen',
    eyebrow: 'Fresh',
    shell: 'bg-white border border-slate-200',
    accents: ['h-1.5 w-full rounded-full bg-[#1f6e5c]', 'h-1 w-2/5 rounded-full bg-[#2a8a73]', 'h-1 w-3/5 rounded-full bg-[#e8f3ef]'],
    columns: ['h-7 w-full rounded-md bg-[#f0f6f2]', 'h-1 w-full rounded-full bg-[#d4dfd8]', 'h-1 w-2/3 rounded-full bg-[#d4dfd8]'],
  },
  {
    id: 'bolt',
    label: 'Bolt',
    eyebrow: 'Certificate',
    shell: 'bg-[#faf8f0] border border-[#1b4332]',
    accents: ['h-1.5 w-full rounded-full bg-[#2d6a4f]', 'h-1 w-2/5 rounded-full bg-[#52b788]', 'h-1 w-3/5 rounded-full bg-[#d4a373]'],
    columns: ['h-7 w-full rounded-md bg-white border border-[#d1d5db]', 'h-1 w-full rounded-full bg-[#d1d5db]', 'h-1 w-2/3 rounded-full bg-[#d1d5db]'],
  },
  {
    id: 'ember',
    label: 'Ember',
    eyebrow: 'Warm',
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
  showBalanceDueOption?: boolean
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
  showBalanceDueOption = false,
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

  const basePreset = getDefaultPdfDesignPreset(documentType)
  const [draftPreset, setDraftPreset] = useState<PdfDesignPreset>(
    () => bridgeToCommercialDesignPreset(basePreset, customization),
  )

  useEffect(() => {
    if (!open) return
    setDraftValue(value)
    setDraftTemplateId(templateId)
    setDraftPreset(bridgeToCommercialDesignPreset(getDefaultPdfDesignPreset(documentType), customization))
  }, [documentType, open, templateId, value, customization])

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
      await onSave(draftValue, draftPreset, draftTemplateId)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <DocumentSheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <div className="space-y-4">
        {!designOnly ? (
          <>
            <PdfBankControls value={draftValue} onChange={setDraftValue} bankAccounts={bankAccounts} />

            <PdfDocumentOptionsCard
              value={draftValue}
              onChange={setDraftValue}
              companyTagline={companyTagline}
              footerText={footerText}
              showBalanceDueOption={showBalanceDueOption}
              defaultOpen
            />
          </>
        ) : null}

        <div className="rounded-[24px] border border-bd-border bg-bd-surface p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-bd-text">PDF Design</div>
              <div className="mt-1 text-xs text-bd-text-muted">Pick a template, then fine-tune fonts and colors.</div>
            </div>
          </div>

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
                        <div className={cn(
                          'text-[10px] font-extrabold uppercase tracking-[0.16em]',
                          active ? 'text-bd-text-muted' : 'text-bd-text-muted'
                        )}>
                          {option.eyebrow}
                        </div>
                        <div className={cn(
                          'mt-0.5 truncate text-sm font-bold tracking-tight',
                          active ? 'text-bd-button-primary-text' : 'text-bd-text'
                        )}>
                          {option.label}
                        </div>
                      </div>
                      {active && (
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-bd-button-primary-bg">
                          <CheckCircle2 className="size-3 text-bd-button-primary-text" />
                        </div>
                      )}
                    </div>
                  </div>

                  {!active && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 transition-opacity hover:opacity-100" />
                  )}
                </button>
              )
            })}
          </div>


          <div className="mt-4 border-t border-bd-border pt-4">
            <DocumentTemplateDesignOverrides value={draftPreset} onChange={handlePresetChange} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[24px] border border-bd-border bg-bd-surface px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-bd-text">Compact Layout</div>
            <div className="mt-0.5 text-xs text-bd-text-muted">Condense margins and spacing to fit content onto fewer pages</div>
          </div>
          <button
            type="button"
            onClick={() => setDraftValue((prev) => ({ ...prev, compact: !prev.compact }))}
            className={`relative ml-3 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
              draftValue.compact ? 'bg-bd-brand' : 'bg-bd-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-bd-card-bg shadow-md transition-transform duration-200 ${
                draftValue.compact ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-[24px] border border-bd-border bg-bd-surface px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-bd-text">Landscape Layout</div>
            <div className="mt-0.5 text-xs text-bd-text-muted">Force page orientation to landscape for wider content</div>
          </div>
          <button
            type="button"
            onClick={() => setDraftValue((prev) => ({ ...prev, landscapeLayout: !prev.landscapeLayout }))}
            className={`relative ml-3 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
              draftValue.landscapeLayout ? 'bg-bd-brand' : 'bg-bd-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-bd-card-bg shadow-md transition-transform duration-200 ${
                draftValue.landscapeLayout ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <button
          type="button"
          className="h-11 w-full rounded-[18px] bg-bd-button-primary-bg text-sm font-semibold text-bd-button-primary-text transition hover:bg-bd-button-primary-bg/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Settings'}
        </button>
      </div>
    </DocumentSheet>
  )
}
