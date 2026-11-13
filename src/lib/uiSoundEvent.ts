import type { SoundRole } from '@/components/ui/sensory-ui/config/sound-roles'
import { mergeConfig, resolveRole } from '@/components/ui/sensory-ui/config/config'
import { playSound } from '@/components/ui/sensory-ui/config/engine'
import { getUiSoundSettings } from './uiSoundSettings'

/**
 * Fire-and-forget sound trigger for non-component code (libs, download funnels,
 * toast helpers). Reads live settings, no-ops when disabled, and never lets a
 * sound failure surface to the caller.
 *
 * Hero (milestone) sounds are explicitly allowed here - everything else follows
 * the default category policy.
 */
export function uiSound(role: SoundRole): void {
  try {
    const { enabled, volume } = getUiSoundSettings()
    if (!enabled || volume <= 0 || typeof window === 'undefined') return

    const config = mergeConfig({
      enabled,
      volume,
      theme: 'minimal',
      categories: { hero: true },
    })
    const source = resolveRole(role, config)
    if (!source) return

    void playSound(source, { volume: 1 }).catch(() => {
      // audio is best-effort and must never break the flow
    })
  } catch {
    // audio is best-effort and must never break the flow
  }
}
