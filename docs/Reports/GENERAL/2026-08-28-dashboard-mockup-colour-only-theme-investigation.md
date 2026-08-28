# Dashboard Mockup Shape and Colour-Only Theme Investigation

This report was written by Muse Spark on 2026-08-28 via Opencode.

## Objective

Determine if the live dashboard can adopt the visual shape of `docs/mockups/Dashboard/mobile-dashboard.html` and if the theme system can adopt the mockup themes with colour-only power, consistent with previous colour-only behaviour.

## Scope

Investigation only. No code changes.

Included:
- Mockup files in `docs/mockups/Dashboard/`
- Live dashboard files
- Theme token and preset system

Excluded:
- Implementation of shape or theme changes
- Visual design approval

Files inspected:
- `docs/mockups/Dashboard/mobile-dashboard.html`
- `docs/mockups/Dashboard/mobile-dashboard.tsx`
- `src/components/dashboard/DashboardOverview.tsx`
- `src/components/dashboard/KpiGrid.tsx`
- `src/lib/themeTokens.ts`
- `src/lib/themePresets.ts`
- `src/lib/colorTheme.ts`
- `src/components/app/AppShell.tsx`
- `src/hooks/useSettings.js`
- `src/pages/settings/AppThemeSettingsSection.tsx`

## Files Changed

None. Investigation produced no file modifications.

## Skills Used

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English

## Changes Made

No changes made. This section records findings only.

### 1. Dashboard shape adoption

Live dashboard shares the mockup section inventory:

- Sticky header with identity and controls
- Metric grid with bar indicator
- Recent activity list
- Payment reminder banner
- Recent alerts carousel
- Audit trail

Live uses `KpiGrid.tsx:110` with a data-driven bar (`KpiBar` at `KpiGrid.tsx:58`, 20 segments, tone map `METRIC_TONE`). Mockup uses hardcoded tick bars `mobile-dashboard.html:338` with manual `on` counts. Both use 2-column grid. Live limits cards with `KPI_CARD_COUNT` at `KpiGrid.tsx:111`. Mockup hardcodes 4 cards.

Header, navigation, search, notifications and FAB exist in both. Live delegates to `MobileChromeContext`, `NotificationBell`, `GlobalSearch`, and `UnifiedActionSheet`. Mockup implements them inline.

Shape delta is presentational. Mockup adds:

- Gradient treatment on the collected card `mobile-dashboard.html:305`
- Carved circular decoration `mobile-dashboard.html:279`
- `Manrope` and `DM Mono` typography `mobile-dashboard.html:40`
- Card radius `18px`, shadow `html:36`, compact section spacing
- Discrete tick bar styling

No data model change is required. Adoption needs CSS class and token mapping only.

Feasibility: Feasible. The live dashboard can take the mockup shape by restyling `KpiGrid`, `DashboardOverview`, and shared card primitives. No new routes or queries are required.

### 2. Theme system current state

Live theme uses a token bundle. `themeTokens.ts:13` defines 114 tokens:

- `THEME_COLOR_TOKENS` — colour variables (`background`, `primary`, `bd-surface`, `bd-border`, `bd-status-*`, `bd-nav-*`, etc.)
- `THEME_NON_COLOR_TOKENS` — radius, font family and size, spacing, density, padding, gaps

Application occurs in `AppShell.tsx:88` (`AppThemeManager`) via `applyThemeTokenBundle` at `AppShell.tsx:112`. Removal uses `clearThemeTokenBundle` at `AppShell.tsx:129`.

Preset definitions live in `themePresets.ts:26`. Two fixed presets exist: `bmw` and `modern-minimalist`. Each preset bundles colour tokens and non-colour tokens (radius, font, spacing). Example: `bmw` sets `radius`, `bd-radius-*`, `bd-font-family` at `themePresets.ts:52`. `modern-minimalist` sets radius, font, space at `themePresets.ts:140`.

Settings persistence uses `app_theme_preset_id`, `app_theme_tokens`, `app_background_color`, `app_card_color` (`useSettings.js:9`). The settings UI at `AppThemeSettingsSection.tsx:103` writes `saveSettings({ app_theme_preset_id })`.

Current defect: `AppShell.tsx:92` selects preset from the `dark` class alone:

```
getPresetId = () => documentElement.classList.contains('dark') ? 'bmw' : 'modern-minimalist'
```

It does not read `settings.app_theme_preset_id` or `app_theme_tokens`. The `resolveThemeMode` helper at `themePresets.ts:185` is unused in `AppShell`. Result: the settings page shows success feedback but the selection has no effect on the live UI. Theme is coupled to dark mode only.

Mockup theme uses `--primary` and `--secondary` plus derived soft variants via `color-mix` (`mobile-dashboard.html:26`). Light and dark values are controlled by `:root` and `[data-theme="dark"]` blocks (`mobile-dashboard.html:43,68`). Custom colours use hex inputs and JS `hexToHsl`/`darkVariant` to derive a lighter, desaturated dark variant (`mobile-dashboard.html:1644`). `darkVariant` lifts lightness by 26 and reduces saturation by 12. The React mockup duplicates this logic (`mobile-dashboard.tsx:63`).

Previous live behaviour with colour-only power: `themeTokens.ts:174` (`normalizeThemeTokenValue`) already gates non-colour tokens when `allowRadius` is false and validates hex via `normalizeHexColor` (`colorTheme.ts:5`) and HSL triplet via `HSL_TRIPLET_RE`. The preset builder at `themePresets.ts:172` currently passes `allowRadius: true`, so non-colour power is active.

### 3. Colour-only theme feasibility with mockup palette

The mockup can supply colour-only presets. Mapping:

- Mockup `--primary` maps to live `primary`, `bd-button-primary-bg`, `ring`, `bd-brand`, `bd-fab-bg`
- Mockup `--secondary` maps to live `secondary`, `accent`, `bd-accent`, `secondary-foreground`
- Mockup `--bg` / `--surface` map to live `background`, `card`, `bd-app-bg`, `bd-surface`, `bd-card-bg`
- Mockup `--ink` / `--ink-2` / `--ink-3` map to live `foreground`, `bd-text`, `bd-text-muted`, `muted-foreground`
- Mockup `--line` maps to live `border`, `bd-border`, `input`

Mockup derives soft variants with `color-mix(in srgb, var(--primary) 16%, transparent)` (`mobile-dashboard.html:26`). Live stores HSL triplets (`hexToHslTriplet` at `colorTheme.ts:23`) and consumes them as `hsl(var(--token))`. Both approaches support soft derivation. Mockup JS derivation is not required if CSS `color-mix` or a small JS `darkVariant` is retained. The existing `colorTheme.ts` already converts hex to HSL; the mockup `hslToHex` function is redundant for live use.

Colour-only restriction means:

- Preset definitions contain only `THEME_COLOR_TOKENS`
- `normalizeThemeTokenBundle` runs with a colour-only filter (or `allowRadius: false` and rejection of `bd-space-*`, `bd-font-*`, `bd-layout-*`)
- `AppThemeManager` clears any previously applied `THEME_NON_COLOR_TOKENS` on mode change

No schema migration is required. The `app_theme_tokens` column already stores a filtered bundle (`useSettings.js:78`). Non-colour keys would be dropped on the next save.

Feasibility: Feasible. Live themes can use mockup colours with no additional power. The mechanism exists today; it requires filtering presets and rewiring `AppShell` to read settings.

## Verification Result

- `bun run audit:load`: not run — investigation only, no code change to audit
- `bun run typecheck`: not run — investigation only, no code change to typecheck
- `git status`: clean — no files modified (verified via working directory inspection)
- `bun run build`: skipped due to hardware policy (AGENTS.md section 4)
- `bun run test`: not run — no implementation to test

## Risks or Limitations

- Settings has no effect today. `AppShell.tsx:92` ignores `app_theme_preset_id`. Any colour-only work must fix this wiring first, or user selections remain a no-op.
- If mockup hex logic is copied verbatim, the `darkVariant` feedback loop at `mobile-dashboard.html:1679` can drift colours on repeated toggles. The live system should derive dark values once, not from computed style that already contains a derived value.
- Mockup persists to `localStorage` keys `bigdrops-real-theme`, `bigdrops-primary-hex` (`mobile-dashboard.html:1701`). Live uses `localStorage` key `theme` (`DashboardOverview.tsx:143`) and DB-backed settings (`useSettings.js:116`). Dual persistence can conflict on devices that have visited the mockup file.
- Preset bug in React mockup: `Emerald` preset duplicates `Crimson & Gold` values (`mobile-dashboard.tsx:54`). Do not copy this preset without correction.
- Dead state in React mockup: `hexWarning` (`mobile-dashboard.tsx:137`) is set but never rendered; `aiInputValue` (`mobile-dashboard.tsx:131`) is unused. These have no live equivalent and must not be ported.
- Live `KpiGrid.tsx:77` cards are informational (`article`) with no click handler. Mockup metric cards are buttons (`mobile-dashboard.html:1255`). Changing semantics needs an accessibility review (`role`, `aria-label` on `KpiBar` at `KpiGrid.tsx:62` exists today and must be retained).
- Restricting to colour-only drops `radius`, `bd-font-*`, and spacing control. Existing tenants with custom `app_theme_tokens` containing those keys will lose that customisation on next save. This is intentional for colour-only but needs a one-time clear of `THEME_NON_COLOR_TOKENS` to avoid stale CSS variables.
- `THEME_COLOR_TOKENS` includes status tokens (`bd-status-*`) and overlay tokens (`bd-overlay-*`). A two-colour preset (`primary`/`secondary`) does not cover all 80 colour tokens. Presets must define the full set or rely on base layer defaults. Partial definition leaves some surfaces unthemed.

## Deferred Work

- Shape implementation — restyle `KpiGrid` and `DashboardOverview` to match mockup radius, typography, spacing, and collected-card gradient. No new data work.
- Theme wiring fix — update `AppThemeManager` at `AppShell.tsx:88` to use `resolveThemeMode(settings)` and `getThemePreset` / `normalizeThemeTokenBundle` instead of dark-class toggle. Add subscription to `useSettings` changes.
- Colour-only preset creation — create new entries in `themePresets.ts:26` from mockup palettes (indigo `#4f46e5` / `#8b5cf6` at `mobile-dashboard.html:24` and any additional mockup palettes). Filter to colour tokens only. Keep `BASE_THEME_MODE` as fallback at `themePresets.ts:9`.
- Non-colour token cleanup — on first load after restriction, call `clearThemeTokenBundle(THEME_NON_COLOR_TOKENS)` to remove stale radius, font, and spacing overrides.
- Dark-mode derivation decision — choose one method: keep two fixed colour presets (current live approach) or adopt mockup single-source derivation via `darkVariant` / `color-mix`. Do not mix both without a clear rule.
- Settings UI alignment — `AppThemeSettingsSection.tsx:238` currently shows the two existing presets and a two-field custom editor. If mockup offers more palettes, extend the preset list. Keep custom editor hex-only, validated by `normalizeHexColor` as today.
- Verification after implementation — `bun run audit:load` then `bun run typecheck` then manual visual check in light and dark modes.

