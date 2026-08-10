import { useEffect, useRef, useState } from 'react'
import { FileEdit, Pencil, Check } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useSettings, saveSettings } from '@/hooks/useSettings'
import { useEntity } from '@/lib/tenant/contexts'
import {
  normalizeDocumentFillableSettings,
  serializeDocumentFillableSettings,
} from '@/lib/documentFillableSettings'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { SettingsLoadingState } from './SettingsLoadingState'
import { SettingsSummaryCard } from '@/components/settings/SettingsSummaryCard'
import { SettingsActionFooter } from '@/components/settings/SettingsActionFooter'
import { feedback } from '@/lib/feedback'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

type FillableSettings = Record<string, { enabled: boolean }>

const rows = [
  {
    key: 'csr',
    label: 'CSR',
    description: 'Show fillable-writing controls inside Customize on CSR pages.',
  },
  {
    key: 'waybill',
    label: 'Waybill',
    description: 'Show fillable-writing controls inside Customize on Waybill pages.',
  },
  {
    key: 'invoice',
    label: 'Invoice',
    description: 'Show fillable-writing controls inside Customize on invoice pages.',
  },
  {
    key: 'quotation',
    label: 'Quotation',
    description: 'Show fillable-writing controls inside Customize on quotation pages.',
  },
] as const

export function DocumentsSettingsSection() {
  const { settings, loading } = useSettings()
  const { tenantClient } = useEntity()
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [fillableSettings, setFillableSettings] = useState<FillableSettings>(() =>
    normalizeDocumentFillableSettings(null) as FillableSettings,
  )
  const [draftSettings, setDraftSettings] = useState<FillableSettings>(fillableSettings)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && settings) {
      const normalized = normalizeDocumentFillableSettings(
        settings.document_fillable_settings,
      ) as FillableSettings
      setFillableSettings(normalized)
      setDraftSettings(normalized)
    }
  }, [loading, settings])

  const toggleDraft = (key: string) => {
    setDraftSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled,
      },
    }))
  }

  const handleCancel = () => {
    setDraftSettings(fillableSettings)
    setIsEditorOpen(false)
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      await saveSettings({
        document_fillable_settings: serializeDocumentFillableSettings(draftSettings),
      }, tenantClient)
      setFillableSettings(draftSettings)
      feedback.success('Document controls updated')
      setIsEditorOpen(false)
    } catch (error) {
      feedback.error(getUserFacingMutationMessage(error, { action: 'save' }))
    }

    setSaving(false)
  }

  if (loading) return <SettingsLoadingState />

  const enabledCount = Object.values(fillableSettings).filter(s => s.enabled).length

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
            Output Controls
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsEditorOpen(true)}
          className="rounded-full border-bd-border bg-bd-card-bg text-xs font-bold shadow-sm hover:bg-bd-surface-muted"
        >
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Edit Controls
        </Button>
      </div>

      <SettingsSummaryCard 
        title="Fillable Writing"
        description="Enable or disable the ability to type directly into PDF fields during customization."
      >
        <div className="px-5 py-4">
          {enabledCount === 0 ? (
            <div className="flex items-center gap-3 text-bd-text-muted">
              <FileEdit size={16} className="opacity-40" />
              <span className="text-sm font-medium italic">All document types disabled</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {rows.filter(r => fillableSettings[r.key]?.enabled).map(row => (
                <div key={row.key} className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-1.5">
                  <Check size={12} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">{row.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingsSummaryCard>

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-lg">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>Document Controls</SheetTitle>
            <SheetDescription>
              Toggle fillable writing capabilities for each document type.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4 py-6">
              {rows.map((row) => (
                <div
                  key={row.key}
                  onClick={() => toggleDraft(row.key)}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg px-4 py-4 transition-colors hover:bg-[hsl(var(--bd-surface-muted)/0.3)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-bd-text">{row.label}</div>
                    <div className="mt-0.5 text-xs text-bd-text-muted leading-relaxed">
                      {row.description}
                    </div>
                  </div>

                  <Switch
                    checked={draftSettings[row.key]?.enabled}
                    onCheckedChange={() => toggleDraft(row.key)}
                    onClick={(e) => e.stopPropagation()}
                    className="data-[state=checked]:bg-bd-button-primary-bg"
                  />
                </div>
              ))}
            </div>
          </div>

          <SettingsActionFooter 
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}