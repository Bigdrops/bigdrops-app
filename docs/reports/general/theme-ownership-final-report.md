# Theme Ownership Correction — Final Report

This report was written by Buffy on 2026-08-30 via Freebuff.

## Objective

Correct the theme persistence architecture so that:
- Slate Navy is the canonical default theme
- Liquid Onyx is Slate Navy's dark variant, not a separate selectable theme
- Theme selection and mode are user-scoped (per authenticated user)
- Dashboard mode changes persist immediately
- The SQL migration is applied to the database

## Files Changed

| File | Change |
|------|--------|
| `src/lib/themePresets.ts` | Removed `liquid-onyx` from `THEME_PRESETS`, `CANONICAL_THEME_IDS`, `ALL_THEME_IDS`. Fixed legacy mappings (`bmw`/`modern-minimalist` → `slate-navy`). Added `SELECTABLE_THEME_PRESETS`. |
| `src/components/app/AppShell.tsx` | Updated `AppThemeManager` to never use `liquid-onyx` as standalone theme ID. Default is always `slate-navy`. |
| `src/pages/settings/AppThemeSettingsSection.tsx` | Uses `SELECTABLE_THEME_PRESETS` (no Liquid Onyx in picker). Added Light/Dark/System mode control. |
| `src/components/dashboard/DashboardOverview.tsx` | Dark mode toggle now persists to `user_preferences` immediately. Accepts `userId` prop. |
| `src/pages/DashboardRedesign.tsx` | Passes `session.user.id` to `DashboardOverview`. |
| `supabase/migrations/20260830030000_user_theme_preferences.sql` | **Applied to database** — `user_preferences` table with RLS scoped by `auth.uid()`. |

## Theme Architecture

```
Theme Families (selectable in Settings)
├── slate-navy (canonical default)
│   ├── Light mode → Slate Navy Light
│   └── Dark mode  → Liquid Onyx
├── amber-terracotta
│   ├── Light mode → Amber Light
│   └── Dark mode  → Amber Dark
├── ocean-teal
├── rose-gold
├── forest-green
└── warm-cocoa
```

**Liquid Onyx is NOT a separate theme.** It is the dark variant of Slate Navy, applied automatically when the user selects Dark mode within the Slate Navy theme family.

## User-Scoped Ownership

| User | Theme | Mode | Visual Result |
|------|-------|------|---------------|
| User A | slate-navy | light | Slate Navy Light |
| User B | forest-green | dark | Forest Green Dark |
| User C | rose-gold | light | Rose Gold Light |

All three users may belong to the same business. Changing User A's theme does not affect User B or User C.

## Persistence Model

1. **Authoritative source**: `user_preferences` table (public schema, RLS by `auth.uid()`)
2. **Performance cache**: User-scoped localStorage (`bigdrops_user_theme_{userId}`)
3. **Default fallback**: `slate-navy` theme, system-preference mode

## Database Migration Applied

```
supabase db push --linked
→ Applied migration 20260830030000_user_theme_preferences.sql
```

Verified:
- Table `user_preferences` exists in `public` schema
- 4 RLS policies: select_own, insert_own, update_own, delete_own (all `auth.uid() = user_id`)
- Trigger for `updated_at` auto-stamp

## Legacy Preset Handling

- `bmw` → `slate-navy` (both map to canonical default)
- `modern-minimalist` → `slate-navy` (both map to canonical default)
- No legacy preset maps to `liquid-onyx` as a standalone theme

## Verification

- `bun run audit:load`: passed
- `bun run typecheck`: passed (0 errors)
- `git status`: 13 files (8 modified, 5 new) — all intended
- Database migration: applied and verified
- No `bun run build` executed (hardware policy)
