import { useEffect, useState } from 'react'
import { Palette, RotateCcw } from 'lucide-react'
import { saveSettings, useSettings } from '@/hooks/useSettings'
import { SettingsField, SettingsSaveButton, SettingsInput } from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import { getErrorMessage } from './settings-helpers'
import type { SettingsToastFn } from './settings-types'
import { normalizeHexColor } from '@/lib/colorTheme'

export function AppearanceSettingsSection({ onToast }: { onToast: SettingsToastFn }) {
  const { settings, loading } = useSettings()
  const [color, setColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!loading && settings) {
      setColor(settings.app_background_color || '')
    }
  }, [loading, settings])

  const handleReset = async () => {
    setSaving(true)
    try {
      await saveSettings({ app_background_color: null })
      setColor('')
      onToast('Appearance reset to default')
    } catch (error) {
      onToast(getErrorMessage(error))
    }
    setSaving(false)
  }

  const handleSave = async () => {
    if (!color) {
        await handleReset()
        return
    }

    const normalized = normalizeHexColor(color)
    if (!normalized) {
      onToast('Invalid hex color code. Use #RRGGBB format.')
      return
    }

    setSaving(true)
    try {
      await saveSettings({ app_background_color: normalized })
      setSaved(true)
      onToast('Appearance updated')
      setTimeout(() => setSaved(false), 2500)
    } catch (error) {
      onToast(getErrorMessage(error))
    }
    setSaving(false)
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
            <div className="text-sm font-bold text-foreground">App Appearance</div>
            <div className="text-xs text-muted-foreground">
              Customize the main background color for the authenticated app shell.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <SettingsField label="Background Hex Color">
          <div className="flex gap-2">
            <SettingsInput
              value={color}
              onChange={setColor}
              placeholder="#F5F5F5"
            />
            <input
              type="color"
              value={normalizeHexColor(color) || '#F5F5F5'}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              className="h-[42px] w-12 cursor-pointer rounded-lg border border-input bg-background p-1"
            />
          </div>
        </SettingsField>

        <SettingsField label="Preview">
            <div className="flex h-[42px] items-center gap-3">
                <div 
                    className="h-8 w-16 rounded-lg border border-border shadow-sm"
                    style={{ backgroundColor: normalizeHexColor(color) || 'transparent' }}
                />
                <span className="text-xs font-medium text-muted-foreground">
                    {color ? (normalizeHexColor(color) || 'Invalid color') : 'Default (Light Grey)'}
                </span>
            </div>
        </SettingsField>
      </div>

      <div className="rounded-xl bg-blue-50/50 p-3 border border-blue-100">
        <p className="text-[11px] leading-relaxed text-blue-700 font-medium">
          Note: This setting applies to all users globally. Resetting will restore the system default background (#F5F5F5).
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
