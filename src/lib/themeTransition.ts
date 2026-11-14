import { flushSync } from 'react-dom'

/**
 * Light/dark theme transition built on the native View Transitions API.
 *
 * The browser snapshots the page, runs the theme change, snapshots the result
 * and animates between the two. The Venetian blinds reveal itself is pure CSS
 * — see the `::view-transition-*` rules in `src/index.css`.
 *
 * Nothing here owns the theme: the preference belongs to
 * `useUserThemePreferences` and the DOM belongs to `AppThemeManager`. This
 * module only decides *when* the DOM change happens so the browser can
 * capture it.
 */

/**
 * Whether the browser can animate the theme change.
 *
 * Reduced motion is honoured here, not only in CSS, so the page is never
 * briefly replaced by a captured snapshot.
 */
export function canAnimateThemeTransition(): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false
  if (typeof document.startViewTransition !== 'function') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Runs a theme change inside a view transition.
 *
 * `apply` must change the DOM synchronously: the browser captures the old
 * snapshot first, then calls `apply`, then captures the new one. The React
 * update is flushed with `flushSync` for that reason, and `AppThemeManager`
 * applies the theme from a layout effect so the DOM is already updated when
 * `apply` returns.
 */
export function runThemeTransition(apply: () => void): void {
  if (!canAnimateThemeTransition()) {
    apply()
    return
  }

  const transition = document.startViewTransition(() => {
    flushSync(apply)
  })
  // A skipped transition rejects `finished`; it must not surface as an
  // unhandled rejection.
  transition.finished.catch(() => {})
}
