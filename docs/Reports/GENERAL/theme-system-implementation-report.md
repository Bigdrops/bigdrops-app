# Theme System Implementation Report

This report was written by Codebuff on 2026-08-29 via Freebuff.

---

## Objective

Bring the production theme architecture into alignment with the PRD (`04-theme-system.md`) while preserving the existing extensible token-engine approach. Fix the disconnect where `app_theme_preset_id` was saved but never used.

## Scope

4 files modified. No new files created. No unrelated UI refactors.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/themePresets.ts` | Expanded from 2 legacy presets to 9 total (2 canonical + 5 additional + 2 legacy). Added dark variants, PRD semantic tokens, legacy ID migration. |
| `src/lib/themeTokens.ts` | Added `bd-surface-raised` and `bd-surface-strong` to the token type registry. |
| `src/components/app/AppShell.tsx` | Rewrote `AppThemeManager` to read `app_theme_preset_id` from settings instead of hardcoded dark-class mapping. Applied PRD semantic tokens as CSS custom properties. |
| `src/pages/settings/AppThemeSettingsSection.tsx` | Updated to show all non-legacy themes. Fixed type references. |

---

## Theme Architecture Implemented

```
Theme Preset → Token Bundle (bd-* + shadcn bridge) + Semantic Tokens (--bg, --ink, etc.) → CSS variables on :root
```

Each theme preset contains:
- **Bundle**: `ThemeTokenBundle` applied via `applyThemeTokenBundle()` — sets `bd-*` and shadcn bridge tokens
- **Semantic tokens**: `Record<string, string>` applied as CSS custom properties — sets PRD tokens (`--bg`, `--surface`, `--ink`, `--primary`, etc.)
- **Dark variant**: Optional dark-mode token set for themes that support light/dark toggling

---

## Canonical Themes Added

| Theme ID | Label | Mode | Source |
|----------|-------|------|--------|
| `slate-navy` | Slate Navy | Light | `04-theme-system.md`, `mobile-dashboard-v6.html` |
| `liquid-onyx` | Liquid Onyx | Dark | `04-theme-system.md`, `liquid-onyx.html` |

---

## Additional Prototype Themes Mapped

| Theme ID | Label | Source |
|----------|-------|--------|
| `amber-terracotta` | Amber Terracotta | `mobile-dashboard-v2.html` |
| `ocean-teal` | Ocean Teal | `mobile-dashboard-v3.html` |
| `rose-gold` | Rose Gold | `mobile-dashboard-v4.html` |
| `forest-green` | Forest Green | `mobile-dashboard-v5.html` |
| `warm-cocoa` | Warm Cocoa | `mobile-dashboard-v7.html` |

All 5 additional themes have both light and dark variants extracted from the HTML prototypes.

---

## Legacy Preset Handling

| Legacy ID | Migrates To | Behavior |
|-----------|-------------|----------|
| `bmw` | `liquid-onyx` | `resolveLegacyPresetId()` maps old ID to new canonical ID |
| `modern-minimalist` | `slate-navy` | Same migration path |

Existing users with `bmw` or `modern-minimalist` in their `app_theme_preset_id` setting will automatically get the equivalent canonical theme applied. The legacy presets are still defined in the registry for backward compatibility but are hidden from the Settings UI.

---

## Key Fix: app_theme_preset_id Now Controls Active Theme

**Before:** `AppThemeManager` used `getPresetId()` which read the `dark` class on `<html>` and mapped it to `bmw` (dark) or `modern-minimalist` (light). The persisted `app_theme_preset_id` from settings was completely ignored.

**After:** `AppThemeManager` calls `resolveThemeMode(settings)` to read the actual persisted preset, then applies that theme's token bundle and semantic tokens. Dark mode toggling within a theme uses the theme's dark variant.

---

## Verification

- `bun run audit:load`: passed
- `bun run typecheck`: passed (0 errors in modified files; pre-existing node_modules errors unchanged)
- `git status`: 4 files modified, all intended
- No `bun run build` (hardware policy)

---

## Remaining Blockers Before Dashboard Implementation

1. **CSS variable conflicts**: The existing `index.css` defines `:root` and `.dark` CSS variables in HSL format that may conflict with the hex-based semantic tokens applied by the theme engine. The theme engine's `setProperty` calls override these at runtime, but the CSS fallbacks may cause brief flashes on load. Consider aligning the CSS defaults with the canonical theme values.

2. **formTheme.css**: This file exposes structural tokens (typography, spacing) as overridable CSS variables. Per the PRD, these should be restricted to `:root` only and not overridden in theme contexts. This is a known tech debt item flagged in `Design.md` §16.

3. **Dark mode persistence**: The current `main.tsx` pre-renders by reading `localStorage.getItem('theme')` and toggling the `dark` class. This is separate from the `app_theme_preset_id` in Supabase settings. These two systems need to be coordinated so that theme selection and dark mode state are consistent.

4. **Theme-specific gradient**: The `--gradient` token is set per-theme but the `body` radial gradient in `index.css` uses `color-mix` with `--primary` and `--secondary`. These should be verified to work correctly with all theme primary/secondary values.
