import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemePreferenceContext } from '@/contexts/ThemePreferenceContext'
import {
  nextThemeMode,
  resolveIsDark,
  themeToggleAriaLabel,
  themeToggleIcon,
} from '@/lib/themeToggle'

/**
 * Shared light/dark theme toggle.
 *
 * This is the single reusable form of the Dashboard's theme control. It reads
 * and writes the SAME user theme preference as the Dashboard (`themeMode` +
 * `themePresetId`), through the shared `ThemePreferenceContext`, so no theme
 * state is introduced or duplicated here.
 *
 * Behaviour is identical to the Dashboard control:
 *   - moon icon in light mode, sun icon in dark mode;
 *   - tapping flips `themeMode` between explicit `light` and `dark`;
 *   - `AppThemeManager` reacts to the preference change and applies the theme
 *     to the DOM, so this button never mutates the DOM itself.
 *
 * It renders `type="button"`, so it can never submit a surrounding form, trigger
 * a save, or navigate away from the current page.
 */
export type ThemeToggleButtonProps = {
  className?: string
  iconClassName?: string
}

export function ThemeToggleButton({
  className,
  iconClassName = 'size-[17px]',
}: ThemeToggleButtonProps) {
  const { preference, save } = useThemePreferenceContext()
  const isDark = resolveIsDark(
    preference.themeMode,
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  const handleToggle = () => {
    void save({
      themeMode: nextThemeMode(isDark),
      themePresetId: preference.themePresetId,
    })
  }

  return (
    <button
      type="button"
      aria-label={themeToggleAriaLabel(isDark)}
      onClick={handleToggle}
      className={cn(
        'grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[12px] bg-[hsl(var(--bd-surface-raised))] text-[hsl(var(--bd-ink))] shadow-[0_2px_6px_rgba(30,28,24,0.05),inset_0_1px_rgba(255,255,255,0.35)] transition active:scale-95',
        className,
      )}
    >
      {themeToggleIcon(isDark) === 'sun' ? (
        <Sun className={iconClassName} strokeWidth={1.9} />
      ) : (
        <Moon className={iconClassName} strokeWidth={1.9} />
      )}
    </button>
  )
}

export default ThemeToggleButton
