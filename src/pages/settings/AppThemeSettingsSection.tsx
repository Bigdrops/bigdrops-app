import { useEffect, useState } from 'react'
import { Palette, RotateCcw } from 'lucide-react'
import { saveSettings, useSettings } from '@/hooks/useSettings'
import { SettingsField, SettingsSaveButton, SettingsInput } from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import { getErrorMessage } from './settings-helpers'
import type { SettingsToastFn } from './settings-types'
import { normalizeHexColor } from '@/lib/colorTheme'

type Preset = {
  label: string
  background: string
  card: string
}

const PRESETS: Preset[] = [
  { label: 'Default', background: '#F5F5F5', card: '#FAFAFA' },
  { label: 'Soft Grey', background: '#E2E8F0', card: '#F1F5F9' },
  { label: 'Warm Paper', background: '#FDFCF0', card: '#FEFEF7' },
]

export function AppThemeSettingsSection({ onToast }: { onToast: SettingsToastFn }) {
  const { settings, loading } = useSettings()
  const [background, setBackground] = useState('')
  const [card, setCard] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!loading && settings) {
      setBackground(settings.app_background_color || '')
      setCard(settings.app_card_color || '')
    }
  }, [loading, settings])

  const handleReset = async () => {
    setSaving(true)
    try {
      await saveSettings({ 
        app_background_color: null,
        app_card_color: null
      })
      setBackground('')
      setCard('')
      onToast('Theme reset to default')
    } catch (error) {
      onToast(getErrorMessage(error))
    }
    setSaving(false)
  }

  const handleSave = async () => {
    const normBg = background ? normalizeHexColor(background) : null
    const normCard = card ? normalizeHexColor(card) : null

    if (background && !normBg) {
      onToast('Invalid background hex color code.')
      return
    }
    if (card && !normCard) {
      onToast('Invalid card hex color code.')
      return
    }

    setSaving(true)
    try {
      await saveSettings({ 
        app_background_color: normBg,
        app_card_color: normCard
      })
      setSaved(true)
      onToast('App Theme updated')
      setTimeout(() => setSaved(false), 2500)
    } catch (error) {
      onToast(getErrorMessage(error))
    }
    setSaving(false)
  }

  const applyPreset = (preset: Preset) => {
    setBackground(preset.background)
    setCard(preset.card)
  }

  if (loading) return <SettingsLoadingState />

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Palette size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">App Theme</div>
            <div className="text-xs text-muted-foreground">
              Customize the look and feel of the authenticated app environment.
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-muted/50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <SettingsField label="Page Background">
          <div className="flex gap-2">
            <SettingsInput
              value={background}
              onChange={setBackground}
              placeholder="#F5F5F5"
            />
            <input
              type="color"
              value={normalizeHexColor(background) || '#F5F5F5'}
              onChange={(e) => setBackground(e.target.value.toUpperCase())}
              className="h-[42px] w-12 cursor-pointer rounded-lg border border-input bg-background p-1"
            />
          </div>
        </SettingsField>

        <SettingsField label="Card / Box Surface">
          <div className="flex gap-2">
            <SettingsInput
              value={card}
              onChange={setCard}
              placeholder="#FAFAFA"
            />
            <input
              type="color"
              value={normalizeHexColor(card) || '#FAFAFA'}
              onChange={(e) => setCard(e.target.value.toUpperCase())}
              className="h-[42px] w-12 cursor-pointer rounded-lg border border-input bg-background p-1"
            />
          </div>
        </SettingsField>
      </div>

      <div className="rounded-xl border border-slate-200 bg-blue-50/30 p-3">
        <p className="text-[11px] leading-relaxed text-blue-700 font-medium">
          Note: Theme settings are global. Changes reflect for all authenticated users.
          The default neutral theme uses #F5F5F5 for pages and #FAFAFA for components.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <SettingsSaveButton saving={saving} saved={saved} onClick={handleSave} />
        <button
          onClick={handleReset}
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-muted/50 disabled:opacity-50"
        >
          <RotateCcw size={15} />
          Reset to Default
        </button>
      </div>
    </div>
  )
}
