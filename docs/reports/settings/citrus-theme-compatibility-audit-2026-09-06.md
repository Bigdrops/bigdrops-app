# ShadcnBlocks Citrus Theme Compatibility Audit

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Verdict

- Directly compatible: NO
- Chiselable into existing theme system: YES
- Difficulty: MODERATE
- Recommended path: B — Extract/adapt Citrus into the existing BIGDROPS theme registry

## Existing BIGDROPS Theme Architecture

- Definition: `ThemePresetDefinition` in `src/lib/themePresets.ts` — id, label, description, isDark, 4-color preview, token bundle, semantic tokens.
- Registration: add ID to `ADDITIONAL_THEME_IDS` plus `ALL_THEME_IDS`, one `THEME_PRESETS` entry, one `DARK_VARIANTS` entry. The Settings selector reads `SELECTABLE_THEME_PRESETS`. Six families registered today plus two legacy IDs.
- Smallest unit: one `CoreColors` object of about 20 hex values. `buildBundle` derives roughly 100 tokens plus the PRD semantic set.
- Discovery: `SELECTABLE_THEME_PRESETS` renders `PresetCard` items in `AppThemeSettingsSection.tsx` with 4-color previews.
- Persistence: `useUserThemePreferences` stores the preset ID in user-scoped localStorage plus the settings row.
- Application: `AppShell` applies the bundle and semantic tokens as CSS variables on `documentElement` at runtime. Full runtime switching with no reload.
- Mechanism: CSS variables consumed via `hsl(var(--token))` in Tailwind 3.4 config plus `var(--bd-*)` component styles. No theme classes or data attributes.
- Dark mode: each family carries its own light and dark `CoreColors` pair. No `.dark`-class dependency for theme colors.
- Contract rule (Facelift PRD): themes change color only. Typography, spacing, radius, and layout must not change per theme.

## Citrus Architecture

- Distribution: `bunx shadcn add @shadcnblocks/theme/citrus` writes theme CSS into globals.css. Free theme, light plus dark included. (Fact: documented install flow.)
- Token set: official shadcn contract — background, foreground, card, popover, border, input, ring, primary, secondary, accent, muted, destructive, chart 1-5, sidebar set, radius. (Fact: token list on the theme page.)
- Anchors: primary lime-chartreuse `#b8e954`, secondary deep teal `#45807a`, near-white canvas. (Fact: published DESIGN.md values.)
- Typography: Host Grotesk display, Onest body, Lora serif moments. (Fact: theme page.)
- Shape: soft radii, quiet shadows. (Fact: theme page.)
- Registry slug for direct JSON fetch not confirmed. Raw variable format (oklch versus HSL) not confirmed from a primary source. Treated as inference below.

## Compatibility Matrix

| Area | BIGDROPS current system | Citrus | Compatible? | Adaptation |
|---|---|---|---|---|
| Theme registration | Preset ID plus bundle entry | CLI file write, no registry | No | Add one preset entry, chisel values in |
| Runtime switching | CSS vars on documentElement | Static globals.css blocks | With adaptation | Map values into bundle, keep engine |
| Persistence | Preset ID in storage plus settings | None built in | With adaptation | Free: ID persistence already generic |
| CSS variables | `hsl(var(--x))` triplets, bd set | Standard shadcn set | Partial | Convert format; derive bd/PRD tokens from anchors |
| Tailwind | 3.4 config mapping | Targets TW4 globals.css | With adaptation | Values portable; do not run CLI into this repo |
| Typography | Locked Manrope per PRD | Host Grotesk/Onest/Lora | Exclude | PRD forbids per-theme typography; skip fonts |
| Radius | Theme-invariant per PRD | Soft radii opinion | Exclude | Keep BIGDROPS radius tokens |
| Shadows | Token-driven quiet set | Quiet shadows | Compatible | Map to existing shadow usage |
| Component tokens | ~100 bd/PRD tokens derived | ~30 shadcn tokens only | With adaptation | Derive full set from ~20 core colors via `buildBundle` |
| Dark mode | Per-family dark pair | Light plus dark included | Compatible | Author a dark `CoreColors` from Citrus dark tokens |
| Settings selector | Reads registry, 4-color preview | None | Compatible | Free: preview derives from core colors |

## Chiselability: MODERATE

- Boundary: read Citrus light/dark hex anchors, author two `CoreColors` objects, register one preset ID. No architecture change.
- `buildBundle` plus `normalizeThemeTokenBundle` do all derivation and validation. Unknown keys rejected safely.
- Exclusions required by PRD: fonts, radius, spacing. Color only.
- Format risk: if Citrus ships oklch values, convert to hex triplets at chisel time (anchors publish hex) or add an oklch branch to the normalizer.
- Do not run the CLI: `components.json` paths and TW4 assumptions do not match this repo (TW3, `src/index.css`).

## Other ShadcnBlocks Themes

- All 13 listed themes share one documented mechanism: official shadcn variables, light plus dark, fonts plus radius, one-line CLI into globals.css.
- Representative: YES. One chisel pipeline (anchors → `CoreColors` pair → registry entry) repeats per theme.
- Pro themes (Alpine, Stripe) need license access for exact tokens. Same mechanism otherwise.

## Recommended Next Step

- Path B. Future implementation: extract Citrus light/dark anchors, author `CITRUS_LIGHT`/`CITRUS_DARK` `CoreColors`, append ID to `ADDITIONAL_THEME_IDS`, add preset plus dark-variant entries, verify selector preview, toggle, persistence, and dark pair at runtime.
- No engine, selector, persistence, or Tailwind changes needed.

## Scope / Verification

- Read-only audit. No Citrus installation. No code, config, dependency, or migration changes.
- No build, typecheck, lint, or audit commands run.
- Skills used: NONE (no theme-design skill registered in the project index; architecture skill not required for read-only audit).
- Documentation standard: ASD-STE100 Simplified Technical English.
- Git boundary checked before and after; only this report file added.
