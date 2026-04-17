import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useSettings, saveSettings } from '@/hooks/useSettings'
import {
  normalizeDocumentFillableSettings,
  serializeDocumentFillableSettings,
} from '@/lib/documentFillableSettings'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { SettingsLoadingState } from './SettingsLoadingState'
import type { SettingsToastFn } from './settings-types'

type FillableSettings = Record<string, { enabled: boolean }>

const rowClassName =
  'flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40'

const rows = [
  { key: 'csr', label: 'CSR', description: 'Show fillable-writing controls under Customize on CSR pages.' },
  { key: 'waybill', label: 'Waybill', description: 'Show fillable-writing controls under Customize on Waybill pages.' },
  { key: 'invoice', label: 'Invoice', description: 'Show fillable-writing controls inside invoice Customize.' },
  { key: 'quotation', label: 'Quotation', description: 'Show fillable-writing controls inside quotation Customize.' },
]

export function DocumentsSettingsSection({ onToast }: { onToast: SettingsToastFn }) {
  const { settings, loading } = useSettings()
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [fillableSettings, setFillableSettings] = useState<FillableSettings>(() =>
    normalizeDocumentFillableSettings(null) as FillableSettings,
  )
  const fillableSettingsRef = useRef<FillableSettings>(fillableSettings)

  useEffect(() => {
    if (!loading) {
      const normalized = normalizeDocumentFillableSettings(settings?.document_fillable_settings) as FillableSettings
      setFillableSettings(normalized)
      fillableSettingsRef.current = normalized
    }
  }, [loading, settings])

  useEffect(() => {
    fillableSettingsRef.current = fillableSettings
  }, [fillableSettings])

  const updateEntry = async (key: string, enabled: boolean) => {
    const previousSettings = fillableSettingsRef.current
    const nextSettings = {
      ...previousSettings,
      [key]: {
        ...previousSettings[key],
        enabled,
      },
    }

    setFillableSettings(nextSettings)
    fillableSettingsRef.current = nextSettings

    try {
      await saveSettings({
        document_fillable_settings: serializeDocumentFillableSettings(nextSettings),
      })
    } catch (error) {
      setFillableSettings(previousSettings)
      fillableSettingsRef.current = previousSettings
      onToast(getUserFacingMutationMessage(error, { action: 'save' }))
    }
  }

  const toggleEntry = (key: string) => {
    const currentValue = fillableSettingsRef.current?.[key]?.enabled
    updateEntry(key, !currentValue)
  }

  const rowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, key: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleEntry(key)
    }
  }

  if (loading) return <SettingsLoadingState />

  if (activePanel !== 'fillable-writing') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4">
          <div className="text-sm font-bold text-foreground">Documents</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Control which document view pages expose fillable-writing controls inside Customize.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActivePanel('fillable-writing')}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm transition hover:bg-muted/30"
        >
          <div>
            <div className="text-sm font-bold text-foreground">Fillable Writing</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Show or hide fillable font and color controls on supported document view pages.
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-300" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-4">
        <div>
          <div className="text-sm font-bold text-foreground">Fillable Writing</div>
          <div className="mt-1 text-xs text-muted-foreground">
            This only controls whether the font and color controls appear under Customize. It does not pick the fonts here.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActivePanel(null)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-muted/50"
        >
          Back
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.key}
            role="button"
            tabIndex={0}
            aria-label={`${row.label} fillable writing`}
            aria-pressed={fillableSettings[row.key].enabled}
            onClick={() => toggleEntry(row.key)}
            onKeyDown={(event) => rowKeyDown(event, row.key)}
            className={rowClassName}
          >
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground">{row.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{row.description}</div>
            </div>
            <Switch
              checked={fillableSettings[row.key].enabled}
              onCheckedChange={(next) => updateEntry(row.key, next)}
              onClick={(event) => event.stopPropagation()}
              className="border border-slate-300 bg-slate-200 shadow-sm data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600 [&>span]:bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
