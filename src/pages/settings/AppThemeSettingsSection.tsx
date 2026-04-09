import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Palette, RotateCcw, Sparkles } from 'lucide-react'
import { saveSettings, useSettings } from '@/hooks/useSettings'
import { normalizeHexColor } from '@/lib/colorTheme'
import { THEME_PRESETS, type ThemePresetId, resolveThemeMode } from '@/lib/themePresets'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { SettingsField, SettingsInput, SettingsSaveButton } from './SettingsFormPrimitives'
import { SettingsLoadingState } from './SettingsLoadingState'
import { getErrorMessage } from './settings-helpers'
import type { SettingsToastFn } from './settings-types'

const DEFAULT_BACKGROUND = '#F5F5F5'
const DEFAULT_CARD = '#FAFAFA'

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
        'text-left transition-transform active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'
      )}
    >
      <Card
        className={cn(
          'h-full border bg-card/95 shadow-sm ring-1 ring-transparent transition-colors',
          selected
            ? 'border-primary bg-primary/5 ring-primary/20'
            : 'border-border hover:border-primary/30 hover:bg-muted/30'
        )}
      >
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <CardDescription className="text-[11px] leading-relaxed">
                {description}
              </CardDescription>
            </div>
            {selected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
          </div>
          <div
            className="rounded-xl border border-border/70 p-2"
            style={{ backgroundColor: preview.background }}
          >
            <div className="flex items-center gap-2 rounded-lg p-2" style={{ backgroundColor: preview.card }}>
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
        </CardHeader>
      </Card>
    </button>
  )
}

export function AppThemeSettingsSection({ onToast }: { onToast: SettingsToastFn }) {
  const { settings, loading } = useSettings()
  const [selectedMode, setSelectedMode] = useState<ThemePresetId>('custom')
  const [background, setBackground] = useState('')
  const [card, setCard] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (loading || !settings) return

    setSelectedMode(resolveThemeMode(settings) ?? 'custom')
    setBackground(settings.app_background_color || '')
    setCard(settings.app_card_color || '')
  }, [loading, settings])

  const handleSelectPreset = async (presetId: ThemePresetId) => {
    setSelectedMode(presetId)
    setSaving(true)
    try {
      await saveSettings({ app_theme_preset_id: presetId })
      setSaved(true)
      if (presetId !== 'custom') {
        const label = THEME_PRESETS.find((preset) => preset.id === presetId)?.label
        onToast(`${label ?? 'Theme preset'} applied`)
      } else {
        onToast('Custom mode active')
      }
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      onToast(getErrorMessage(error))
    }
    setSaving(false)
  }

  const selectedPreset = useMemo(
    () => THEME_PRESETS.find((preset) => preset.id === selectedMode) ?? null,
    [selectedMode]
  )

  const handleSave = async () => {
    if (selectedMode !== 'custom') return

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
        app_theme_preset_id: 'custom',
        app_background_color: normBg,
        app_card_color: normCard,
      })
      setSaved(true)
      onToast('Custom app theme updated')
      setTimeout(() => setSaved(false), 2500)
    } catch (error) {
      onToast(getErrorMessage(error))
    }
    setSaving(false)
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      await saveSettings({
        app_theme_preset_id: 'custom',
        app_background_color: null,
        app_card_color: null,
      })
      setSelectedMode('custom')
      setBackground('')
      setCard('')
      onToast('Theme reset to default')
    } catch (error) {
      onToast(getErrorMessage(error))
    }
    setSaving(false)
  }

  if (loading) return <SettingsLoadingState />

  return (
    <div className="space-y-6">
      <Card className="border-border bg-muted/40">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Palette size={18} />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold">App Theme</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Pick a preset for the whole product, or switch to Custom to keep using
                manual background and card colors.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">Presets</div>
            <div className="text-xs text-muted-foreground">
              One selection updates the full semantic token bundle.
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Global
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
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-sm font-semibold text-foreground">Custom</div>
          <div className="text-xs text-muted-foreground">
            Use manual colors only when you want to override the default neutral base.
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSelectPreset('custom')}
          className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <Card
            className={cn(
              'border transition-colors',
              selectedMode === 'custom'
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border hover:border-primary/30 hover:bg-muted/20'
            )}
          >
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Custom Theme</CardTitle>
                  <CardDescription className="text-[11px] leading-relaxed">
                    Manual background and card surface editor. Existing saved custom values are
                    preserved here.
                  </CardDescription>
                </div>
                {selectedMode === 'custom' ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : null}
              </div>
            </CardHeader>
          </Card>
        </button>
      </div>

      {selectedMode === 'custom' ? (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Custom Color Editor</CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              These values apply only when Custom mode is selected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                    onChange={(e) => setBackground(e.target.value.toUpperCase())
                    }
                    className="h-[42px] w-12 cursor-pointer rounded-lg border border-input bg-background p-1"
                  />
                </div>
              </SettingsField>

              <SettingsField label="Card / Box Surface">
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
                    className="h-[42px] w-12 cursor-pointer rounded-lg border border-input bg-background p-1"
                  />
                </div>
              </SettingsField>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Theme settings are global. Preset mode ignores these manual values until you
                switch back to Custom.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        <SettingsSaveButton saving={saving} saved={saved} onClick={handleSave} />
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleReset}
          disabled={saving}
          className="w-full gap-2 rounded-xl py-3 text-sm font-bold"
        >
          <RotateCcw size={15} />
          Reset to Default
        </Button>
      </div>
    </div>
  )
}
