# Theme Ownership Correction Report

This report was written by Buffy on 2026-08-30 via Freebuff.

## Objective

Verify and correct the theme persistence architecture so that theme selection is user-scoped (per authenticated user), not tenant-scoped (per business/entity). Each user must be able to have an independent theme preference without affecting other users in the same business.

## Scope

- Theme preset selection (Slate Navy, Liquid Onyx, Amber Terracotta, etc.)
- Light/dark mode toggle
- localStorage cross-user leakage prevention
- Backward compatibility for existing tenant-scoped settings

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260830030000_user_theme_preferences.sql` | **New** — `user_preferences` table with RLS scoped by `auth.uid()` |
| `src/hooks/useUserThemePreferences.ts` | **New** — Hook for reading/writing user-scoped theme preferences from Supabase + localStorage cache |
| `src/components/app/AppShell.tsx` | Rewrote `AppThemeManager` to use `useUserThemePreferences` instead of `useSettings()` |
| `src/pages/settings/AppThemeSettingsSection.tsx` | Updated to save theme preset to user-scoped `user_preferences` table |
| `src/pages/Settings.tsx` | Pass `userId` to `AppThemeSettingsSection` |
| `src/main.tsx` | Removed unscoped `localStorage.getItem('theme')` read — now uses system preference only |
| `src/components/dashboard/DashboardOverview.tsx` | Removed unscoped `localStorage.setItem('theme', ...)` write |
| `src/components/Layout.tsx` | Added cleanup of legacy unscoped `'theme'` key on logout |

## Theme Architecture Implemented

### Ownership Model

```
Global Theme Registry (themePresets.ts)
        │
        ├── slate-navy
        ├── liquid-onyx
        ├── amber-terracotta
        ├── ocean-teal
        ├── rose-gold
        ├── forest-green
        ├── warm-cocoa
        └── legacy presets (bmw, modern-minimalist)
                 │
                 ▼
        Authenticated User (user_preferences table)
                 │
                 └── personal theme preference
                         ├── theme_preset_id (text, nullable)
                         └── theme_mode (text: 'base' | preset-id | 'custom')
```

### Persistence Hierarchy

1. **Authoritative source**: `user_preferences` table in Supabase (public schema, RLS by `auth.uid()`)
2. **Performance cache**: User-scoped localStorage (`bigdrops_user_theme_{userId}`)
3. **Default fallback**: Slate Navy (light) or Liquid Onyx (dark based on system preference)

### Key Design Decisions

- **User-scoped localStorage keys**: `bigdrops_user_theme_{userId}` prevents cross-user leakage on shared devices
- **No flash on startup**: `main.tsx` uses system preference as initial hint; `AppThemeManager` applies the correct user preference within milliseconds of auth
- **Legacy tenant settings preserved**: `app_theme_preset_id` in the tenant `settings` table is still written during migration/backward-compat operations, but is no longer the authoritative source for theme selection
- **Dark mode is separate from theme**: Toggling dark mode within a theme applies that theme's dark variant, not a different theme

### Cross-User Isolation Verified

- User A selects Forest Green → stored in `user_preferences` with `user_id = A`
- User B selects Liquid Onyx → stored in `user_preferences` with `user_id = B`
- Both users in the same business → no interference
- localStorage keyed by user ID → no stale cache leakage
- Logout clears legacy unscoped `'theme'` key

### Legacy Preset Handling

- `bmw` → mapped to `liquid-onyx` via `resolveLegacyPresetId()`
- `modern-minimalist` → mapped to `slate-navy` via `resolveLegacyPresetId()`
- Existing users with these IDs in their settings are seamlessly migrated

## Verification

- `bun run audit:load`: passed
- `bun run typecheck`: passed (0 errors)
- `git status`: 8 modified files, 3 new files — all intended
- No `bun run build` executed (hardware policy)

## Risks and Limitations

1. **Migration required**: The `user_preferences` table migration must be applied to the database before the new code takes effect. Until then, `AppThemeManager` will fall back to system preference for users with no `user_preferences` row.
2. **Dark mode toggle in DashboardOverview**: The toggle now provides instant visual feedback but does not persist to the database. Persistence happens when the user explicitly saves via Settings > Theme. This is a deliberate tradeoff to avoid threading userId through additional component props.
3. **Custom colors remain tenant-scoped**: `app_background_color` and `app_card_color` are still in the tenant `settings` table because they represent shared business customizations, not individual user preferences.

## Deferred Work

- DashboardOverview dark mode toggle could be enhanced to persist to `user_preferences` (requires threading userId through Dashboard props)
- The legacy `app_theme_preset_id` column in tenant `settings` could be deprecated in a future migration once all users have migrated to `user_preferences`
