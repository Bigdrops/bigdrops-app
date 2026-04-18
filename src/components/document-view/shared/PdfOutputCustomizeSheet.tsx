import { useEffect, useState } from 'react'

import { PdfBankControls, PdfSupportingOptions, type PdfOutputSettingsValue } from '@/components/PdfOutputSettings'
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
  onSave: (value: PdfOutputSettingsValue, preset: PdfDesignPreset) => void | Promise<void>
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
  onSave,
}: PdfOutputCustomizeSheetProps) {
  const [draftValue, setDraftValue] = useState<PdfOutputSettingsValue>(value)
  const [draftPreset, setDraftPreset] = useState<PdfDesignPreset>(() => getPdfDesignPreset(documentType))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraftValue(value)
    setDraftPreset(getPdfDesignPreset(documentType))
  }, [documentType, open, value])

  const handleSave = async () => {
    setSaving(true)
    try {
      setPdfDesignPreset(documentType, draftPreset)
      await onSave(draftValue, draftPreset)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <DocumentSheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <div className="space-y-4">
        <PdfBankControls value={draftValue} onChange={setDraftValue} bankAccounts={bankAccounts} />

        <PdfSupportingOptions
          value={draftValue}
          onChange={setDraftValue}
          companyTagline={companyTagline}
          footerText={footerText}
          showBalanceDueOption={showBalanceDueOption}
        />

        <div className="rounded-[24px] border border-border bg-card p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">PDF Design</div>
          <DocumentTemplateDesignOverrides value={draftPreset} onChange={setDraftPreset} />
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
