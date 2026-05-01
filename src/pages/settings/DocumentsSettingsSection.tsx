import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

const rowClassName =
  'group flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-amber-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30'

export function DocumentsSettingsSection({ onToast }: { onToast: SettingsToastFn }) {
  const { settings, loading } = useSettings()
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [fillableSettings, setFillableSettings] = useState<FillableSettings>(() =>
    normalizeDocumentFillableSettings(null) as FillableSettings,
  )
  const fillableSettingsRef = useRef<FillableSettings>(fillableSettings)

  useEffect(() => {
    if (!loading) {
      const normalized = normalizeDocumentFillableSettings(
        settings?.document_fillable_settings,
      ) as FillableSettings
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
        <div className="px-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-700/80">
            Document Controls
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm">
          <button
            type="button"
            onClick={() => setActivePanel('fillable-writing')}
            className="group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-amber-50/60"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-900">Fillable Writing</div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:inline rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                Per document
              </span>
              <ChevronRight
                size={14}
                className="text-slate-200 transition-colors group-hover:text-slate-300"
              />
            </div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3.5">
        <button
          type="button"
          onClick={() => setActivePanel(null)}
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-100 bg-white text-amber-700 transition-colors hover:bg-amber-50"
          aria-label="Back to document controls"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900">Fillable Writing</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm">
        {rows.map((row, index) => (
          <div
            key={row.key}
            role="button"
            tabIndex={0}
            aria-label={`${row.label} fillable writing`}
            aria-pressed={fillableSettings[row.key].enabled}
            onClick={() => toggleEntry(row.key)}
            onKeyDown={(event) => rowKeyDown(event, row.key)}
            className={`${rowClassName} ${index !== rows.length - 1 ? 'border-b border-slate-200/80' : ''}`}
          >
            <div className="min-w-0 flex-1 pr-3">
              <div className="text-sm font-bold text-slate-900">{row.label}</div>
              <div className="mt-0 text-[12px] leading-5 text-muted-foreground">
                {row.description}
              </div>
            </div>

            <Switch
              checked={fillableSettings[row.key].enabled}
              onCheckedChange={(next) => updateEntry(row.key, next)}
              onClick={(event) => event.stopPropagation()}
              className="border border-slate-300 bg-slate-200 shadow-sm data-[state=checked]:border-amber-600 data-[state=checked]:bg-amber-600 [&>span]:bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  )
}