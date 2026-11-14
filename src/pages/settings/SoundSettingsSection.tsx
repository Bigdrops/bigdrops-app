import { Volume2, Play } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { SettingsSummaryCard } from '@/components/settings/SettingsSummaryCard'
import { HistogramVolumeSlider } from '@/components/settings/HistogramVolumeSlider'
import { usePlaySound } from '@/components/ui/sensory-ui/config/use-play-sound'
import { useUiSoundSettings, setUiSoundSettings } from '@/lib/uiSoundSettings'

export function SoundSettingsSection() {
  const { enabled, volume } = useUiSoundSettings()
  const { play } = usePlaySound({ sound: 'interaction.confirm' })
  const volumePercent = Math.round(volume * 100)

  return (
    <div className="space-y-4">
      <SettingsSummaryCard
        title="Sound"
        description="Interface sounds for this device. Sounds are synthesized on-device and never leave your device."
      >
        {/* Master toggle */}
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-bold text-bd-text">
              <Volume2 className="size-4 text-primary" />
              Enable sounds
            </div>
            <div className="mt-0.5 text-[12px] leading-5 text-bd-text-muted">
              Short feedback when you save, confirm, or hit an error.
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => setUiSoundSettings({ enabled: checked, volume })}
            aria-label="Enable interface sounds"
            className="mt-1"
          />
        </div>

        {/* Volume */}
        <div className="px-5 py-4">
          <HistogramVolumeSlider
            value={volumePercent}
            onChange={(next) => setUiSoundSettings({ enabled, volume: next / 100 })}
            disabled={!enabled}
          />
        </div>

        {/* Test */}
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-bd-text">Test sound</div>
            <div className="mt-0.5 text-[12px] leading-5 text-bd-text-muted">
              Play a sample now to check your volume.
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={play}
            disabled={!enabled}
            aria-label="Play test sound"
          >
            <Play className="size-3.5" /> Play
          </Button>
        </div>
      </SettingsSummaryCard>

      <p className="px-1 text-[11px] leading-relaxed text-bd-text-muted">
        Follows your system&apos;s reduced-motion setting: if reduced motion is enabled, sounds stay off.
      </p>
    </div>
  )
}
