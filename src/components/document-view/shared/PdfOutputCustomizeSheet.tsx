import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

import { PdfBankControls, PdfDocumentOptionsCard, type PdfOutputSettingsValue } from '@/components/PdfOutputSettings'
import DocumentTemplateDesignOverrides from '@/components/document/DocumentTemplateDesignOverrides'
import { type InvoicePdfTemplateId } from '@/domain/invoice/types'
import type { PdfDesignPreset, PdfDesignPresetDocument } from '@/lib/pdfDesignPreset'
import { getPdfDesignPreset, setPdfDesignPreset } from '@/lib/pdfDesignPreset'

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
    id: 'apex',
    label: 'Apex',
    eyebrow: 'Placeholder',
    shell: 'bg-white border border-slate-200',
    accents: ['h-1.5 w-full rounded-full bg-slate-900', 'h-1 w-2/5 rounded-full bg-slate-300', 'h-1 w-4/5 rounded-full bg-slate-200'],
    columns: ['h-7 w-full rounded-md border border-slate-200 bg-slate-50', 'h-1 w-full rounded-full bg-slate-200', 'h-1 w-3/4 rounded-full bg-slate-200'],
  },
  {
    id: 'bolt',
    label: 'Bolt',
    eyebrow: 'Banner',
    shell: 'bg-white border border-slate-200',
    accents: ['h-4 w-full rounded-[10px] bg-[#1a56db]', 'h-1 w-2/5 rounded-full bg-[#93c5fd]', 'h-1 w-4/5 rounded-full bg-slate-200'],
    columns: ['h-7 w-full rounded-md bg-[#eff6ff]', 'h-1 w-full rounded-full bg-slate-200', 'h-1 w-3/4 rounded-full bg-slate-200'],
  },
  {
    id: 'obsidian-receipt',
    label: 'Obsidian Receipt',
    eyebrow: 'Elegant',
    shell: 'bg-white border border-slate-200',
    accents: ['h-1.5 w-full rounded-full bg-[#2f7f7c]', 'h-1 w-2/5 rounded-full bg-[#8c8279]', 'h-1 w-3/5 rounded-full bg-slate-100'],
    columns: ['h-7 w-full rounded-md bg-slate-50', 'h-1 w-full rounded-full bg-slate-200', 'h-1 w-2/3 rounded-full bg-slate-200'],
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
  const [draftPreset, setDraftPreset] = useState<PdfDesignPreset>(() => getPdfDesignPreset(documentType))
  const [draftTemplateId, setDraftTemplateId] = useState<InvoicePdfTemplateId>(templateId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraftValue(value)
    setDraftPreset(getPdfDesignPreset(documentType))
    setDraftTemplateId(templateId)
  }, [documentType, open, templateId, value])

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

        <div className="rounded-[24px] border border-border bg-card p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">PDF Design</div>
              <div className="mt-1 text-xs text-muted-foreground">Pick a template, then fine-tune fonts and colors.</div>
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
                      ? 'border-slate-950 bg-slate-950 text-white shadow-xl ring-2 ring-slate-950 ring-offset-2'
                      : 'border-border bg-card text-foreground hover:border-slate-300 hover:bg-slate-50/50',
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
                          active ? 'text-slate-400' : 'text-muted-foreground'
                        )}>
                          {option.eyebrow}
                        </div>
                        <div className="mt-0.5 truncate text-sm font-bold tracking-tight">
                          {option.label}
                        </div>
                      </div>
                      {active && (
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500">
                          <CheckCircle2 className="size-3 text-white" />
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


          <div className="mt-4 border-t border-slate-100 pt-4">
            <DocumentTemplateDesignOverrides value={draftPreset} onChange={setDraftPreset} />
          </div>
        </div>

        <button
          type="button"
          className="h-11 w-full rounded-[18px] bg-[hsl(var(--bd-button-primary-bg))] text-sm font-semibold text-[hsl(var(--bd-button-primary-text))] transition hover:bg-[hsl(var(--bd-button-primary-bg))]/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </DocumentSheet>
  )
}
