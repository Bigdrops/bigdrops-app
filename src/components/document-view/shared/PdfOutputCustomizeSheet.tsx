import { useEffect, useState } from 'react'

import { PdfBankControls, PdfDocumentOptionsCard, type PdfOutputSettingsValue } from '@/components/PdfOutputSettings'
import DocumentTemplateDesignOverrides from '@/components/document/DocumentTemplateDesignOverrides'
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
    id: 'obsidian-receipt',
    label: 'Obsidian Receipt',
    eyebrow: 'Premium',
    shell: 'bg-[#17191F] border border-slate-800',
    accents: ['h-1 w-full rounded-full bg-[#B98248]', 'h-3 w-3/5 rounded bg-slate-700', 'h-1 w-4/5 rounded-full bg-slate-700'],
    columns: ['h-7 w-full rounded-md border border-slate-700 bg-slate-900', 'h-1 w-full rounded-full bg-slate-700', 'h-1 w-3/4 rounded-full bg-slate-700'],
  },
] as const

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
  templateId?: 'industry' | 'obsidian-receipt'
  onSave: (value: PdfOutputSettingsValue, preset: PdfDesignPreset, templateId: 'industry' | 'obsidian-receipt') => void | Promise<void>
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
  const [draftTemplateId, setDraftTemplateId] = useState<'industry' | 'obsidian-receipt'>(templateId)
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

          <div className="grid grid-cols-2 gap-3">
            {INVOICE_PDF_TEMPLATE_OPTIONS.map((option) => {
              const active = draftTemplateId === option.id

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDraftTemplateId(option.id)}
                  className={[
                    'rounded-[18px] border p-2.5 text-left transition',
                    active
                      ? 'border-slate-950 bg-slate-950 text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)]'
                      : 'border-border bg-white text-foreground hover:border-slate-300 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div className="mb-2.5 overflow-hidden rounded-[14px] border border-black/5 bg-slate-100 p-2">
                    <div className={`flex h-[68px] flex-col justify-between rounded-[12px] p-2 ${option.shell}`}>
                      <div className="space-y-1">
                        {option.accents.map((nodeClass, index) => (
                          <div key={`${option.id}-accent-${index}`} className={nodeClass} />
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        {option.columns.map((nodeClass, index) => (
                          <div key={`${option.id}-column-${index}`} className={nodeClass} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className={`text-[10px] font-extrabold uppercase tracking-[0.16em] ${active ? 'text-slate-300' : 'text-muted-foreground'}`}>
                        {option.eyebrow}
                      </div>
                      <div className="mt-1 text-sm font-bold tracking-[-0.02em]">{option.label}</div>
                    </div>
                    <div
                      className={[
                        'inline-flex shrink-0 rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.18em]',
                        active
                          ? 'border-white/15 bg-white/10 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-500',
                      ].join(' ')}
                    >
                      {active ? 'Selected' : 'Choose'}
                    </div>
                  </div>
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
          className="h-11 w-full rounded-[18px] bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </DocumentSheet>
  )
}
