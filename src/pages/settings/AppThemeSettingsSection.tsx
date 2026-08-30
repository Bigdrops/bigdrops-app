import { useEffect, useState } from 'react'
import { Loader2, Palette, RotateCcw, Sparkles, Check } from 'lucide-react'
import { saveSettings, useSettings } from '@/hooks/useSettings'
import { useThemePreferenceContext } from '@/contexts/ThemePreferenceContext'
import { useEntity } from '@/lib/tenant/contexts'
import { normalizeHexColor } from '@/lib/colorTheme'
import { BASE_THEME_MODE, THEME_PRESETS, SELECTABLE_THEME_PRESETS, isThemePresetId, type ThemePresetId } from '@/lib/themePresets'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SettingsField, SettingsInput } from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import { getErrorMessage } from './settings-helpers'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { feedback } from '@/lib/feedback'

const BASE_BACKGROUND = '#EDF1F5'
const BASE_CARD = '#FFFFFF'
const DEFAULT_BACKGROUND = BASE_BACKGROUND
const DEFAULT_CARD = BASE_CARD

type PresetCardProps = {
  title: string
  description: string
  preview: {
    background: string
    card: string
    primary: string
    accent: string
  }
  selected: boolean
  onSelect: () => void
}

function PresetCard({ title, description, preview, selected, onSelect }: PresetCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group text-left transition-all active:scale-[0.98] outline-none',
      )}
    >
      <div
        className={cn(
          'h-full rounded-[var(--bd-radius-xl)] border p-4 transition-all',
          selected
            ? 'border-bd-button-primary-bg bg-[hsl(var(--bd-button-primary-bg)/0.03)] ring-1 ring-[hsl(var(--bd-button-primary-bg)/0.2)]'
            : 'border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg hover:border-bd-border hover:bg-[hsl(var(--bd-surface-muted)/0.3)]'
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-bd-text">{title}</h4>
            <p className="text-[11px] leading-relaxed text-bd-text-muted">
              {description}
            </p>
          </div>
          <div className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
            selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-bd-border bg-transparent text-transparent"
          )}>
            <Check size={12} strokeWidth={3} />
          </div>
        </div>
        
        <div
          className="rounded-xl border border-[hsl(var(--bd-border)/0.5)] p-2"
          style={{ backgroundColor: preview.background }}
        >
          <div className="flex items-center gap-2 rounded-lg p-2 shadow-sm" style={{ backgroundColor: preview.card }}>
            <div className="h-6 w-6 rounded-md" style={{ backgroundColor: preview.primary }} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="h-2.5 w-16 rounded-full bg-black/15" />
              <div className="h-2 w-12 rounded-full bg-black/10" />
            </div>
            <div
              className="h-6 w-10 rounded-md"
              style={{ backgroundColor: preview.accent }}
            />
          </div>
        </div>
      </div>
    </button>
  )
}

export function AppThemeSettingsSection({ userId }: { userId?: string | undefined }) {
  const { settings, loading: settingsLoading } = useSettings()
  const { tenantClient } = useEntity()
  const { preference, loading: prefLoading, save: saveThemePref } = useThemePreferenceContext()
  // Theme family: which color palette is selected (null = default slate-navy)
  const [selectedFamily, setSelectedFamily] = useState<ThemePresetId | null>(null)
  // Whether the user has selected a custom build
  const [isCustom, setIsCustom] = useState(false)
  const [background, setBackground] = useState('')
  const [card, setCard] = useState('')
  const [saving, setSaving] = useState(false)

  const loading = settingsLoading || prefLoading

  // Initialize from user-scoped preference
  useEffect(() => {
    if (prefLoading) return
    // Determine which theme family is active
    const presetId = preference.themePresetId
    if (presetId && isThemePresetId(presetId) && presetId !== 'bmw' && presetId !== 'modern-minimalist') {
      setSelectedFamily(presetId)
      setIsCustom(false)
    } else {
      setSelectedFamily(null)
      setIsCustom(false)
    }
  }, [prefLoading, preference.themePresetId])

  useEffect(() => {
    if (settingsLoading || !settings) return
    setBackground(settings.app_background_color || '')
    setCard(settings.app_card_color || '')
  }, [settingsLoading, settings])

  const handleSelectPreset = async (presetId: ThemePresetId | typeof BASE_THEME_MODE | 'custom') => {
    setSaving(true)
    try {
      if (!userId) {
        feedback.error('User session not available')
        return
      }
      // Preserve current mode when switching theme families.
      // Use preferenceRef.current to avoid stale closure.
      const currentMode = preference.themeMode

      if (presetId === BASE_THEME_MODE) {
        setSelectedFamily(null)
        setIsCustom(false)
        await saveThemePref({ themePresetId: 'slate-navy', themeMode: 'light' })
        await saveSettings({
          app_theme_preset_id: null,
          app_background_color: null,
          app_card_color: null,
          app_theme_tokens: null,
        }, tenantClient).catch(() => {})
        setBackground('')
        setCard('')
        feedback.success('Default Bigdrops theme restored')
      } else if (presetId === 'custom') {
        setIsCustom(true)
        await saveThemePref({ themePresetId: null, themeMode: currentMode })
        feedback.success('Custom mode active')
      } else {
        // Preserve current mode when switching theme families
        setSelectedFamily(presetId)
        setIsCustom(false)
        await saveThemePref({ themePresetId: presetId, themeMode: currentMode })
        const label = THEME_PRESETS.find((preset) => preset.id === presetId)?.label
        feedback.success(`${label ?? 'Theme'} applied`)
      }
    } catch (error) {
      feedback.error(getErrorMessage(error))
    }
    setSaving(false)
  }

  const handleSaveCustom = async () => {
    if (!isCustom) return

    const normBg = background ? normalizeHexColor(background) : null
    const normCard = card ? normalizeHexColor(card) : null

    if (background && !normBg) {
      feedback.error('Invalid background hex color code.')
      return
    }
    if (card && !normCard) {
      feedback.error('Invalid card hex color code.')
      return
    }

    setSaving(true)
    try {
      // Theme mode goes to user-scoped preference (keep current mode)
      await saveThemePref({ themeMode: preference.themeMode })
      // Custom colors remain in tenant settings (shared across business)
      await saveSettings({
        app_background_color: normBg,
        app_card_color: normCard,
      }, tenantClient)
      feedback.success('Custom theme updated')
    } catch (error) {
      feedback.error(getErrorMessage(error))
    }
    setSaving(false)
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      // Reset to Slate Navy Light — the canonical default
      await saveThemePref({ themePresetId: 'slate-navy', themeMode: 'light' })
      await saveSettings({
        app_theme_preset_id: null,
        app_background_color: null,
        app_card_color: null,
        app_theme_tokens: null,
      }, tenantClient).catch(() => {})
      setSelectedFamily('slate-navy')
      setIsCustom(false)
      setBackground('')
      setCard('')
      feedback.success('Default Bigdrops theme restored')
    } catch (error) {
      feedback.error(getErrorMessage(error))
    }
    setSaving(false)
  }

  if (loading) return <SettingsLoadingState />

  const activePreset = selectedFamily ? THEME_PRESETS.find(p => p.id === selectedFamily) : null
  const themeLabel = isCustom ? 'Custom Theme' : activePreset?.label || 'Slate Navy'

  // Determine current dark/light mode from user preferences.
  // preference.themeMode is always 'light' | 'dark' | 'system' (never a preset ID).
  const isDark = preference.themeMode === 'dark' ||
    (preference.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  // Display the current mode label
  const currentModeLabel = isDark ? 'Dark' : 'Light'

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
            Aesthetics
          </p>
        </div>
      </div>

      <SettingsSummaryCard 
        title="App Appearance"
        description="Global theme settings that define the visual language of your workspace."
      >
        <SettingsSummaryRow 
          label="Active Theme" 
          value={
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{themeLabel}</span>
              <span className="text-[10px] text-bd-text-muted">{currentModeLabel}</span>
              {isCustom && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 h-5 px-1.5 text-[9px] font-black uppercase">
                  Manual
                </Badge>
              )}
            </div>
          }
          icon={<Palette size={16} />}
        />
        
        <div className="px-5 py-4 border-t border-[hsl(var(--bd-border)/0.3)] bg-[hsl(var(--bd-surface-muted)/0.1)]">
          <div className="flex items-center gap-3">
             <div className="h-10 w-20 rounded-lg border border-[hsl(var(--bd-border)/0.5)] overflow-hidden shadow-sm flex">
                <div className="flex-1" style={{ backgroundColor: isCustom ? (normalizeHexColor(background) || BASE_BACKGROUND) : (activePreset?.preview.background || BASE_BACKGROUND) }} />
                <div className="flex-1" style={{ backgroundColor: isCustom ? (normalizeHexColor(card) || BASE_CARD) : (activePreset?.preview.card || BASE_CARD) }} />
             </div>
             <p className="text-[11px] text-bd-text-muted leading-relaxed max-w-[200px]">
               Theme and mode apply to all pages. Each user's choice is independent.
             </p>
          </div>
        </div>
      </SettingsSummaryCard>

      {/* Theme Family Picker */}
      <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h5 className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Theme Family</h5>
          <Badge variant="outline" className="gap-1 border-emerald-100 bg-emerald-50 text-emerald-700 font-bold text-[9px] uppercase">
            <Sparkles className="h-2.5 w-2.5" />
            Recommended
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SELECTABLE_THEME_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              title={preset.label}
              description={preset.description}
              preview={preset.preview}
              selected={selectedFamily === preset.id}
              onSelect={() => handleSelectPreset(preset.id)}
            />
          ))}

          {/* Custom Theme Card */}
          <button
            type="button"
            onClick={() => handleSelectPreset('custom')}
            className="group text-left transition-all active:scale-[0.98] outline-none"
          >
            <div className={cn(
              "h-full rounded-[var(--bd-radius-xl)] border p-4 transition-all",
              isCustom
                ? "border-bd-button-primary-bg bg-[hsl(var(--bd-button-primary-bg)/0.03)] ring-1 ring-[hsl(var(--bd-button-primary-bg)/0.2)]"
                : "border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg hover:border-bd-border hover:bg-[hsl(var(--bd-surface-muted)/0.3)]"
            )}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="text-sm font-bold">Custom Build</h4>
                <div className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                  isCustom ? "border-emerald-500 bg-emerald-500 text-white" : "border-bd-border bg-transparent text-transparent"
                )}>
                  <Check size={12} strokeWidth={3} />
                </div>
              </div>
              <p className="text-[11px] text-bd-text-muted">Manual surface overrides.</p>
            </div>
          </button>
        </div>

        {/* Mode Control: Light / Dark / System */}
        <div className="space-y-3 pt-2">
          <div className="h-px bg-[hsl(var(--bd-border)/0.3)]" />
          <h5 className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Mode</h5>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const isActive = mode === preference.themeMode
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    if (userId) {
                      saveThemePref({
                        themeMode: mode,
                        themePresetId: preference.themePresetId,
                      })
                    }
                  }}
                  className={cn(
                    "flex-1 h-10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                    isActive
                      ? "bg-bd-button-primary-bg text-bd-button-primary-text shadow-sm"
                      : "border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg text-bd-text-muted hover:border-bd-border"
                  )}
                >
                  {mode === 'light' ? '☀ Light' : mode === 'dark' ? '☽ Dark' : '↺ System'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom Editor Section */}
        {isCustom && (
          <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="h-px bg-[hsl(var(--bd-border)/0.3)]" />
             <h5 className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Manual Color Overrides</h5>
             
             <div className="grid gap-4">
                <SettingsField label="Page Background">
                  <div className="flex gap-2">
                    <SettingsInput
                      value={background}
                      onChange={setBackground}
                      placeholder={DEFAULT_BACKGROUND}
                    />
                    <input
                      type="color"
                      value={normalizeHexColor(background) || DEFAULT_BACKGROUND}
                      onChange={(e) => setBackground(e.target.value.toUpperCase())}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-bd-border bg-bd-card-bg p-1"
                    />
                  </div>
                </SettingsField>

                <SettingsField label="Surface Color">
                  <div className="flex gap-2">
                    <SettingsInput
                      value={card}
                      onChange={setCard}
                      placeholder={DEFAULT_CARD}
                    />
                    <input
                      type="color"
                      value={normalizeHexColor(card) || DEFAULT_CARD}
                      onChange={(e) => setCard(e.target.value.toUpperCase())}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-bd-border bg-bd-card-bg p-1"
                    />
                  </div>
                </SettingsField>

                <Button
                  onClick={handleSaveCustom}
                  disabled={saving}
                  className="w-full h-12 rounded-xl bg-bd-button-primary-bg text-bd-button-primary-text hover:opacity-90 text-xs font-black uppercase tracking-widest"
                >
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Apply Custom Colors'}
                </Button>
             </div>
          </div>
        )}

        {/* Reset Control */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="lg"
            onClick={handleReset}
            className="w-full h-12 rounded-xl border-bd-border bg-bd-card-bg text-xs font-black uppercase tracking-widest shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restore Factory Defaults
          </Button>
        </div>
      </div>
    </div>
  )
}
