import { Sparkles } from 'lucide-react'

import { Switch } from '@/components/ui/switch'
import { useBoluInteractionPreferences } from '@/hooks/useBoluInteractionPreferences'
import { useBoluNarrationSupport } from '@/hooks/useBoluNarrationSupport'
import { isHapticFeedbackSupported } from '@/lib/ai-assistant/bolu-haptics'
import { BOLU_NARRATION_RATE_MAX, BOLU_NARRATION_RATE_MIN } from '@/lib/ai-assistant/bolu-preferences'
import { cn } from '@/lib/utils'

function PreferenceRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  id: string
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-bd-border/70 px-3 py-2.5">
      <div className="min-w-0">
        <label htmlFor={id} className="text-xs font-semibold text-foreground">
          {title}
        </label>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={title}
      />
    </div>
  )
}

/**
 * BoluInteractionPreferencesCard — haptics and narration preferences.
 *
 * Placed in the existing Bolu settings surface. Preferences are device-scoped
 * (see `bolu-preferences.ts`), so an Android phone and a desktop can differ.
 * Both capabilities default to enabled and are independent of each other.
 */
export function BoluInteractionPreferencesCard() {
  const { preferences, update } = useBoluInteractionPreferences()
  const hapticsSupported = isHapticFeedbackSupported()
  // Native Android speech counts as supported even when the WebView has no
  // `speechSynthesis`.
  const { supported: narrationSupported, resolving: narrationResolving } = useBoluNarrationSupport()

  return (
    <section
      className="rounded-2xl border border-bd-border bg-card p-4 shadow-sm sm:p-5"
      aria-labelledby="bolu-interaction-preferences-title"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-bd-border bg-muted">
          <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 id="bolu-interaction-preferences-title" className="text-sm font-semibold text-foreground">
            Chat interaction
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Haptic feedback and spoken responses for Bolu. These settings apply to this device only.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        <PreferenceRow
          id="bolu-haptics-enabled"
          title="Haptic feedback"
          description={
            hapticsSupported
              ? 'One short pulse when Bolu starts replying.'
              : 'This browser cannot vibrate. The setting is saved for the Android app.'
          }
          checked={preferences.hapticsEnabled}
          onCheckedChange={(checked) => update({ hapticsEnabled: checked })}
        />

        <PreferenceRow
          id="bolu-completion-haptics-enabled"
          title="Completion pulse"
          description="A brief double tap when a response finishes. Requires haptic feedback."
          checked={preferences.completionHapticsEnabled}
          onCheckedChange={(checked) => update({ completionHapticsEnabled: checked })}
          disabled={!preferences.hapticsEnabled}
        />

        <PreferenceRow
          id="bolu-narration-enabled"
          title="Read responses aloud"
          description={
            narrationResolving
              ? 'Checking the device speech engine…'
              : narrationSupported
                ? 'Shows the speaker action on completed responses. The device voice reads them.'
                : 'This device has no speech engine. The speaker action stays disabled.'
          }
          checked={preferences.narrationEnabled}
          onCheckedChange={(checked) => update({ narrationEnabled: checked })}
          disabled={!narrationSupported}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-bd-border/70 px-3 py-2.5">
          <div className="min-w-0">
            <label id="bolu-speaking-speed-label" className="text-xs font-semibold text-foreground">
              Speaking speed
            </label>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Passed to the device voice. The available voice follows the device language.
            </p>
          </div>
          <div
            role="group"
            aria-labelledby="bolu-speaking-speed-label"
            className="inline-flex w-full sm:w-auto items-center justify-between sm:justify-start rounded-lg border border-bd-border bg-muted p-0.5 min-w-0 gap-0.5"
          >
            {[0.8, 1, 1.2, 1.4]
              .filter((rate) => rate >= BOLU_NARRATION_RATE_MIN && rate <= BOLU_NARRATION_RATE_MAX)
              .map((rate) => {
                const isSelected = Math.abs(preferences.narrationRate - rate) < 0.05
                const disabled = !preferences.narrationEnabled || !narrationSupported
                return (
                  <button
                    key={rate}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={disabled}
                    onClick={() => update({ narrationRate: rate })}
                    className={cn(
                      'h-7 min-w-0 flex-1 sm:flex-initial rounded-md px-2.5 text-xs font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      'disabled:pointer-events-none disabled:opacity-50',
                      isSelected
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {rate.toFixed(1)}×
                  </button>
                )
              })}
          </div>
        </div>
      </div>
    </section>
  )
}
