import { useEffect, useState } from 'react'
import { CheckCircle2, Palette, RotateCcw, Sparkles, Check, Pencil } from 'lucide-react'
import { saveSettings, useSettings } from '@/hooks/useSettings'
import { normalizeHexColor } from '@/lib/colorTheme'
import { BASE_THEME_MODE, THEME_PRESETS, type FixedThemePresetId, type ThemeMode, resolveThemeMode } from '@/lib/themePresets'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SettingsField, SettingsInput } from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import { getErrorMessage } from './settings-helpers'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { SettingsActionFooter } from '@/components/settings/SettingsActionFooter'
import { feedback } from '@/lib/feedback'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

const BASE_BACKGROUND = '#EDF1F5'
const BASE_CARD = '#FFFFFF'
const BASE_PRIMARY = '#1F4ED8'
const BASE_ACCENT = '#F1F5F9'
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

export function AppThemeSettingsSection() {
  const { settings, loading } = useSettings()
  const [selectedMode, setSelectedMode] = useState<ThemeMode>(BASE_THEME_MODE)
  const [background, setBackground] = useState('')
  const [card, setCard] = useState('')
  const [saving, setSaving] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  useEffect(() => {
    if (loading || !settings) return

    setSelectedMode(resolveThemeMode(settings))
    setBackground(settings.app_background_color || '')
    setCard(settings.app_card_color || '')
  }, [loading, settings])

  const handleSelectPreset = async (presetId: FixedThemePresetId | typeof BASE_THEME_MODE | 'custom') => {
    setSelectedMode(presetId)
    setSaving(true)
    try {
      if (presetId === BASE_THEME_MODE) {
        await saveSettings({
          app_theme_preset_id: null,
          app_background_color: null,
          app_card_color: null,
          app_theme_tokens: null,
        })
        setBackground('')
        setCard('')
        feedback.success('Default Bigdrops theme restored')
      } else if (presetId === 'custom') {
        await saveSettings({ app_theme_preset_id: 'custom' })
        feedback.success('Custom mode active')
      } else {
        await saveSettings({ app_theme_preset_id: presetId })
        const label = THEME_PRESETS.find((preset) => preset.id === presetId)?.label
        feedback.success(`${label ?? 'Theme preset'} applied`)
      }
    } catch (error) {
      feedback.error(getErrorMessage(error))
    }
    setSaving(false)
  }

  const handleSaveCustom = async () => {
    if (selectedMode !== 'custom') return

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
      await saveSettings({
        app_theme_preset_id: 'custom',
        app_background_color: normBg,
        app_card_color: normCard,
        app_theme_tokens: null,
      })
      feedback.success('Custom theme updated')
      setIsEditorOpen(false)
    } catch (error) {
      feedback.error(getErrorMessage(error))
    }
    setSaving(false)
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      await saveSettings({
        app_theme_preset_id: null,
        app_background_color: null,
        app_card_color: null,
        app_theme_tokens: null,
      })
      setSelectedMode(BASE_THEME_MODE)
      setBackground('')
      setCard('')
      feedback.success('Default Bigdrops theme restored')
      setIsEditorOpen(false)
    } catch (error) {
      feedback.error(getErrorMessage(error))
    }
    setSaving(false)
  }

  if (loading) return <SettingsLoadingState />

  const activePreset = THEME_PRESETS.find(p => p.id === selectedMode)
  const themeLabel = selectedMode === 'custom' ? 'Custom Theme' : activePreset?.label || 'Default Theme'

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
            Aesthetics
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsEditorOpen(true)}
          className="rounded-full border-bd-border bg-bd-card-bg text-xs font-bold shadow-sm hover:bg-bd-surface-muted"
        >
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Configure Theme
        </Button>
      </div>

      <SettingsSummaryCard 
        title="App Appearance"
        description="Global theme settings that define the visual language of your workspace."
      >
        <SettingsSummaryRow 
          label="Active Language" 
          value={
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{themeLabel}</span>
              {selectedMode === 'custom' && (
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
                <div className="flex-1" style={{ backgroundColor: selectedMode === 'custom' ? (normalizeHexColor(background) || BASE_BACKGROUND) : (activePreset?.preview.background || BASE_BACKGROUND) }} />
                <div className="flex-1" style={{ backgroundColor: selectedMode === 'custom' ? (normalizeHexColor(card) || BASE_CARD) : (activePreset?.preview.card || BASE_CARD) }} />
             </div>
             <p className="text-[11px] text-bd-text-muted leading-relaxed max-w-[200px]">
               Selected theme applies to all pages and surfaces across the application.
             </p>
          </div>
        </div>
      </SettingsSummaryCard>

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-lg">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>Configure Theme</SheetTitle>
            <SheetDescription>
              Switch between presets or define a custom workspace color palette.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-8 py-6">
              {/* Presets Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-[11px] font-black uppercase tracking-widest text-bd-text-muted">Semantic Presets</h5>
                  <Badge variant="outline" className="gap-1 border-emerald-100 bg-emerald-50 text-emerald-700 font-bold text-[9px] uppercase">
                    <Sparkles className="h-2.5 w-2.5" />
                    Recommended
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {THEME_PRESETS.map((preset) => (
                    <PresetCard
                      key={preset.id}
                      title={preset.label}
                      description={preset.description}
                      preview={preset.preview}
                      selected={selectedMode === preset.id}
                      onSelect={() => handleSelectPreset(preset.id)}
                    />
                  ))}
                  
                  {/* Default Reset Button Styled as Card */}
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(BASE_THEME_MODE)}
                    className="group text-left transition-all active:scale-[0.98] outline-none"
                  >
                    <div className={cn(
                      "h-full rounded-[var(--bd-radius-xl)] border p-4 transition-all",
                      selectedMode === BASE_THEME_MODE
                        ? "border-bd-button-primary-bg bg-[hsl(var(--bd-button-primary-bg)/0.03)] ring-1 ring-[hsl(var(--bd-button-primary-bg)/0.2)]"
                        : "border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg hover:border-bd-border hover:bg-[hsl(var(--bd-surface-muted)/0.3)]"
                    )}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-sm font-bold">Standard UI</h4>
                        <div className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                          selectedMode === BASE_THEME_MODE ? "border-emerald-500 bg-emerald-500 text-white" : "border-bd-border bg-transparent text-transparent"
                        )}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      </div>
                      <p className="text-[11px] text-bd-text-muted">Default Bigdrops experience.</p>
                    </div>
                  </button>

                  {/* Custom Trigger Styled as Card */}
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('custom')}
                    className="group text-left transition-all active:scale-[0.98] outline-none"
                  >
                    <div className={cn(
                      "h-full rounded-[var(--bd-radius-xl)] border p-4 transition-all",
                      selectedMode === 'custom'
                        ? "border-bd-button-primary-bg bg-[hsl(var(--bd-button-primary-bg)/0.03)] ring-1 ring-[hsl(var(--bd-button-primary-bg)/0.2)]"
                        : "border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg hover:border-bd-border hover:bg-[hsl(var(--bd-surface-muted)/0.3)]"
                    )}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-sm font-bold">Custom Build</h4>
                        <div className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                          selectedMode === 'custom' ? "border-emerald-500 bg-emerald-500 text-white" : "border-bd-border bg-transparent text-transparent"
                        )}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      </div>
                      <p className="text-[11px] text-bd-text-muted">Manual surface overrides.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Custom Editor Section */}
              {selectedMode === 'custom' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
                   </div>
                </div>
              )}

              {/* Reset Control */}
              <div className="pt-4">
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

          <SettingsActionFooter 
            onSave={selectedMode === 'custom' ? handleSaveCustom : () => setIsEditorOpen(false)}
            onCancel={() => setIsEditorOpen(false)}
            saving={saving}
            saveLabel={selectedMode === 'custom' ? "Save Custom Colors" : "Close Configuration"}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

