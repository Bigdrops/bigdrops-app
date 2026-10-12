/**
 * Scoped coordination for Capacitor Android hardware back handling.
 *
 * The central `AndroidBackHandler` keeps the only `backButton` listener in
 * the app. Route screens must NOT add competing listeners; instead they
 * register a scoped intercept callback here. The central handler consults
 * registered guards (most-recent first) before its default navigation.
 *
 * A guard returns `true` when it consumed the back press (for example by
 * opening an unsaved-changes dialog) and `false` to let handling continue.
 */
export type AndroidBackGuard = () => boolean

const guards = new Set<AndroidBackGuard>()

export function registerAndroidBackGuard(guard: AndroidBackGuard): () => void {
  guards.add(guard)
  return () => {
    guards.delete(guard)
  }
}

export function consultAndroidBackGuards(): boolean {
  for (const guard of [...guards].reverse()) {
    if (guard()) return true
  }
  return false
}
