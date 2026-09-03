# Theme System Regression Fix — Shared State Architecture

This report was written by Buffy on 2026-08-29 via Codebuff.

## Objective

Fix the critical theme-system regression where theme changes from Settings or Dashboard were not reflected in the DOM until app restart. The root cause was disconnected state sources.

## Root Cause

**Two independent `useUserThemePreferences` hook instances** produced separate React state trees:

1. `AppShell.tsx` called `useUserThemePreferences(userId)` — its `preference` state drove `AppThemeManager` (DOM/CSS).
2. `AppThemeSettingsSection.tsx` called `useUserThemePreferences(userId)` — its `preference` state was completely independent.
3. `DashboardOverview.tsx` also called `useUserThemePreferences(userId)` — yet another independent instance.

When the user changed theme in Settings, the settings hook called `save()`, updated its own React state, wrote to localStorage, and persisted to Supabase. **But AppThemeManager's hook instance was never notified.** The DOM theme never changed until the component tree remounted (restart/reload).

This is a classic React hook isolation problem: each call to a hook creates independent state, even if the hook uses the same user ID.

## Fix

Created a **shared `ThemePreferenceContext`** so that:

1. **AppShell** is the single hook consumer — calls `useUserThemePreferences(userId)` once.
2. **ThemePreferenceProvider** wraps all routes, exposing `preference`, `loading`, `save`, and `refresh` to the entire tree.
3. **AppThemeManager** receives `preference` as a prop (same object from AppShell).
4. **AppThemeSettingsSection** consumes via `useThemePreferenceContext()` — the **same state** as AppShell.
5. **DashboardOverview** receives `preference` + `saveThemePref` as props from AppShell.

### Runtime flow (after fix):

```
User tap (Dashboard toggle or Settings selector)
  → saveThemePref({ themeMode: 'light' })  [from shared context]
  → useUserThemePreferences.save()          [in AppShell]
  → setPreference(nextPref)                 [AppShell state updates]
  → ThemePreferenceProvider re-renders
  → AppThemeManager receives new preference [via prop]
  → useEffect([preference.themePresetId, preference.themeMode]) fires
  → DOM/CSS updates immediately
  → Supabase persistence occurs asynchronously
```

## Files Changed

| File | Change |
|------|--------|
| **`src/contexts/ThemePreferenceContext.tsx`** | **New file** — React Context + Provider + consumer hook |
| **`src/components/app/AppShell.tsx`** | Wraps routes with `ThemePreferenceProvider`; passes `preference` as prop to `AppThemeManager` and through routes to Dashboard |
| **`src/pages/settings/AppThemeSettingsSection.tsx`** | Replaced `useUserThemePreferences()` with `useThemePreferenceContext()` |
| **`src/components/dashboard/DashboardOverview.tsx`** | Accepts `preference` and `saveThemePref` as props instead of calling hook independently |
| **`src/pages/DashboardRedesign.tsx`** | Accepts and passes through `preference` and `saveThemePref` props |

## Proven Runtime Path

1. `AppShell` calls `useUserThemePreferences(userId)` → single state source.
2. `ThemePreferenceProvider` wraps entire route tree with this state.
3. `AppThemeManager` receives `preference` as prop → DOM owner.
4. `AppThemeSettingsSection` reads from context → same state.
5. `DashboardOverview` receives props → same state.
6. Settings `save()` → AppShell state → AppThemeManager reacts → DOM updates.
7. Dashboard toggle `save()` → same AppShell state → same path.

**Only ONE place calls `useUserThemePreferences()`** — verified by grep:
```
src/components/app/AppShell.tsx:243:  const { preference, loading: prefLoading, save: saveThemePref } = useUserThemePreferences(session.user.id)
```

## Theme Ownership Confirmation

- AppThemeManager is the **sole** root DOM theme mutator.
- No dashboard or settings component directly manipulates `document.documentElement.classList`.
- All `classList` references are read-only (`.contains()` checks in Toaster and AndroidSystemBars).
- Default: Slate Navy Light.
- Liquid Onyx: Slate Navy's dark variant only (not a selectable family).
- Theme persistence: user-scoped via Supabase `user_preferences` table + user-scoped localStorage.
- `themeMode` stores `'light' | 'dark' | 'system'` — never a preset ID.

## Verification

- `bun run audit:load` — passed
- `bun run typecheck` — passed
- `git status` — 5 files changed (1 new context file + 4 modified), no unrelated changes
- Static: only one `useUserThemePreferences()` call site
- Static: no direct `document.documentElement.classList` mutations from dashboard/settings
- Static: no MutationObserver theme loops
- Static: no effect dependency loops
- Static: `preferenceRef` prevents stale closures in `save()`

## Limitations

- Runtime visual verification requires manual testing on device/browser.
- The `refresh` function in the context is a no-op placeholder. If a component needs to re-fetch from DB, this should be wired to the hook's actual `refresh`.

## Deferred Work

- Wire `refresh` in context to the actual hook `refresh` function (currently no-op).
- Visual verification of theme switching on actual device.
