/**
 * Pure helpers for the shared light/dark theme toggle.
 *
 * These mirror the Dashboard's inline theme logic exactly so that every surface
 * exposes the same behaviour. They are intentionally free of React/DOM state so
 * the toggle logic can be unit-tested in isolation.
 *
 * Ownership model (unchanged):
 *   - The user preference lives in `useUserThemePreferences` (user-scoped).
 *   - `AppThemeManager` is the single owner of DOM class mutations.
 *   - A toggle only updates the stored preference; it never touches the DOM.
 */

export type ThemeToggleMode = 'light' | 'dark' | 'system'

/**
 * Resolve whether the current preference renders dark.
 *
 * `system` defers to the OS preference. This matches the Dashboard control.
 */
export function resolveIsDark(themeMode: ThemeToggleMode, prefersDark: boolean): boolean {
  return themeMode === 'dark' || (themeMode === 'system' && prefersDark)
}

/**
 * The next explicit theme mode when the user taps the toggle.
 *
 * A toggle always resolves to an explicit light/dark choice (never `system`),
 * matching the Dashboard control.
 */
export function nextThemeMode(isDark: boolean): 'light' | 'dark' {
  return isDark ? 'light' : 'dark'
}

/**
 * Which icon the toggle shows: the sun in dark mode, the moon in light mode.
 * This preserves the existing Dashboard orientation.
 */
export function themeToggleIcon(isDark: boolean): 'sun' | 'moon' {
  return isDark ? 'sun' : 'moon'
}

/**
 * Accessible label for the toggle (announces the action, not the state),
 * matching the Dashboard control.
 */
export function themeToggleAriaLabel(isDark: boolean): string {
  return isDark ? 'Switch to light mode' : 'Switch to dark mode'
}
