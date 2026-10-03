# CPS Form Theme Manager Integration Report

This report was written by Buffy on 2026-10-03 via Freebuff.

## Objective

Connect the approved CPS form to the existing BIGDROPS Theme Manager for color only.

The Theme Manager must paint the CPS form.

The CPS form must keep its own shape.

## Scope

- `src/components/cps/CostPricingSheetForm.tsx`

Theme Manager files were inspected. They were not changed.

No popup, workflow, or production behavior was built.

## Files Changed

- `src/components/cps/CostPricingSheetForm.tsx`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-form-theme-manager-integration-report.md`

## Skills Used

Skills used: karpathy, frontend-design, tailwind-css-patterns, react-useeffect, accessibility

Documentation standard: ASD-STE100 Simplified Technical English

## Theme Manager Contract

### Token definitions

File: `src/lib/themeTokens.ts`.

Two token groups exist:

- `THEME_COLOR_TOKENS`: color roles. Examples: `background`, `foreground`, `card`, `primary`, `border`, `muted`, `destructive`, and the `bd-*` bridge tokens.
- `THEME_NON_COLOR_TOKENS`: radius, spacing, padding, gaps, font families, font sizes, font weights, line heights, letter spacing, and icon sizes.

### Semantic roles owned

| Concept | Token |
| --- | --- |
| Application/page background | `bd-app-bg` (bridge of `background`) |
| Primary surface | `bd-surface` / `bd-card-bg` (bridge of `card`) |
| Raised surface | `bd-surface-raised` |
| Muted surface | `bd-surface-muted` (bridge of `muted`) |
| Strong surface | `bd-surface-strong` |
| Primary text | `bd-text` (bridge of `foreground`) |
| Secondary text | `bd-text-muted` (bridge of `muted-foreground`) |
| Muted text | `bd-text-soft` |
| Border/divider | `bd-border`, `bd-border-strong` |
| Brand/accent | `bd-brand`, `bd-button-primary-bg`, `bd-brand-foreground` |
| Positive/success | `bd-status-success-text` |
| Warning | `bd-status-warning-text` |
| Destructive | `bd-status-danger-text`, `destructive` |

### Application mechanism

File: `src/components/app/AppThemeManager.tsx` (inside `src/components/app/AppShell.tsx`).

The manager:

- reads the user theme preference;
- resolves a theme family id and light or dark mode;
- toggles the `dark` class on `document.documentElement`;
- writes the token bundle to `document.documentElement` inline styles through `applyThemeTokenBundle()`;
- writes the PRD semantic tokens to `document.documentElement` inline styles.

Values are stored as HSL triplets. Example: `222 47% 11%`. Consumers wrap them with `hsl()`.

Presets live in `src/lib/themePresets.ts`. `THEME_PRESETS` holds 21 families. Each family has a light bundle and a dark variant.

### Non-color finding

The manager also owns non-color tokens. These are:

- `bd-font-family`, `bd-font-display-family`, and the font size, weight, and spacing tokens;
- `radius` and `bd-radius-*`;
- `bd-layout-padding`, `bd-layout-content-max`, `bd-layout-density`;
- `bd-space-*`, `bd-card-padding`, `bd-section-gap`, `bd-row-gap`, `bd-field-gap`, `bd-sheet-padding`;
- `bd-button-padding-x`, `bd-button-padding-y`;
- `bd-icon-size-*`, `bd-icon-stroke`.

Decision: these were NOT mapped into the CPS form. The geometry freeze forbids it.

### Bridge default

File: `src/styles/formTheme.css`.

The bridge sets `--bd-app-bg`, `--bd-surface`, `--bd-text`, `--bd-border`, and the rest from the shadcn tokens. The dark block redefines the same names.

## CPS Color Inventory (before mapping)

The CPS form owned these local tokens on `.cps-form-root`:

| Local token | Light value | Semantic role |
| --- | --- | --- |
| `--ink` | `#0f172a` | primary text |
| `--sub` | `#475569` | secondary text |
| `--faint` | `#8b9ab0` | muted text |
| `--line` | `rgba(15,23,42,.10)` | border |
| `--line-strong` | `rgba(15,23,42,.20)` | strong border |
| `--bg` | `#eef2f7` | page background |
| `--card` | `#ffffff` | surface |
| `--soft` | `#f6f9fc` | muted surface |
| `--accent` | `#1e3a5f` | brand |
| `--accent-soft` | `rgba(30,58,95,.13)` | brand tint |
| `--accent-ink` | `#ffffff` | text on brand |
| `--red` / `--red-soft` | `#dc2626` | destructive |
| `--green` / `--green-soft` | `#15803d` | positive |
| `--rail` | `rgba(15,23,42,.22)` | item rail line |
| `--cost` / `--cost-soft` | `#b45309` | CP cost semantics |
| `--sell` / `--sell-soft` | `#15803d` | SP selling semantics |
| `--loss` | `#b91c1c` | negative profit |
| `--group-*` | navy family | group presentation |
| `--bg-bd-button-primary-bg` | `#1e3a5f` | primary button fill |
| `--bd-button-primary-text` | `#f1f5f9` | primary button text |
| `--mono` | `'DM Mono',monospace` | font (non-color) |
| `--gutter` | `14px` | gutter (geometry) |

## Token Mapping

| CPS role | BIGDROPS token | Fallback triplet |
| --- | --- | --- |
| `--ink` | `bd-text` | `222 47% 11%` |
| `--sub` | `bd-text-muted` | `215 16% 47%` |
| `--faint` | `bd-text-soft` | `215 16% 65%` |
| `--line` | `bd-border` | `214 30% 88%` |
| `--line-strong` | `bd-border-strong` | `214 25% 75%` |
| `--bg` | `bd-app-bg` | `210 32% 95.5%` |
| `--card` | `bd-surface` | `0 0% 100%` |
| `--soft` | `bd-surface-muted` | `210 32% 95.5%` |
| `--accent` | `bd-brand` | `214 17% 25%` |
| `--accent-ink` | `bd-brand-foreground` | `0 0% 100%` |
| `--red` | `bd-status-danger-text` | `0 72% 51%` |
| `--green` | `bd-status-success-text` | `142 71% 45%` |
| `--rail` | `bd-border-strong` | `214 25% 75%` |
| `--cost` | `bd-status-warning-text` | `32 95% 44%` |
| `--sell` | `bd-status-success-text` | `142 71% 45%` |
| `--loss` | `bd-status-danger-text` | `0 72% 51%` |
| `--group-spine` | `bd-brand` | `214 17% 25%` |
| `--bg-bd-button-primary-bg` | `bd-button-primary-bg` | `214 17% 25%` |
| `--bd-button-primary-text` | `bd-brand-foreground` | `0 0% 100%` |

Tint roles (`--accent-soft`, `--cost-soft`, `--sell-soft`, `--red-soft`, `--green-soft`, `--group-line`, `--group-soft`) derive from their base token with `color-mix()`. The group header gradient derives from `bd-text`, `bd-brand`, and `bd-surface-strong`.

Every fallback triplet matches the previous static color. The standalone render is unchanged when no theme is active.

The mapping is explicit and scoped on `.cps-form-root`. No generic CPS variable is returned to `:root`. Generic collision cannot return.

## Local CPS Semantics Retained

- CP and SP keep separate roles. `--cost` maps to the warning token and `--sell` maps to the success token. They stay distinguishable.
- `--group-on` stays a light constant. It is text on the dark group header in both modes.
- `--mono` stays CPS-local. It is a font, not a color.
- `--gutter` stays CPS-local. It is geometry.
- `--shadow-ear` stays CPS-local. The theme contract has no semantic shadow color.

## Geometry Freeze

The diff touches only the two color-token blocks on `.cps-form-root`.

No geometry declaration was changed. Static diff review confirms no change to dimensions, padding, margin, gaps, border radius, border width, font size, font weight, line height, letter spacing, grid, flex, breakpoints, or gutters.

Preserved:

- `--gutter` stays `14px`, then `18px` at 430px and `24px` at 600px.
- The `:where(...)` reset strategy is unchanged.
- The `.tb-title h1` and `.lb` host-protection rules are unchanged.

A runtime baseline comparison at 393 CSS px was not run in this task. Static diff review shows the geometry declarations are identical, so the baseline is intact. The previous validated baseline remains: root width 393 px, gutter 14 px, itemtools 365 px, toolbar one row.

## Theme Verification

Static verification only. A live browser run was not performed in this task.

Reasoning from the contract:

1. Theme change updates CPS colors. The Theme Manager writes tokens on `documentElement`. The CPS bridge reads those tokens through `var()`. A family change changes the resolved values.
2. Surfaces stay readable. `--bg` and `--card` map to the theme background and surface, which each preset defines as a readable pair.
3. Text hierarchy stays readable. `--ink`, `--sub`, and `--faint` map to the theme text ramp.
4. Borders stay visible. `--line` and `--line-strong` map to the theme border tokens.
5. CP and SP stay distinct. CP uses the warning family. SP uses the success family.
6. Destructive stays recognizable. `--red` and `--loss` map to the danger token.
7. Dark mode stays readable. The dark block reads the same tokens, and the manager writes dark triplets when the `dark` class is set.
8. Geometry is identical across theme changes. No geometry token reads from the Theme Manager.

Presets inspected: `slate-navy` (light) and its dark variant `liquid-onyx`, plus the family list in `THEME_PRESETS`.

## Verification Result

Verification:

- `bun run typecheck`: passed
- `git diff --check`: passed. Git reported a line-ending warning for `src/components/cps/CostPricingSheetForm.tsx`.
- `git status`: one modified file, `src/components/cps/CostPricingSheetForm.tsx`.
- `supabase db push`: not applicable
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `bun run build`: skipped due to hardware policy

## Supabase Push Status

Not applicable.

No SQL changed.

No database file changed.

## Risks or Limitations

- Runtime theme verification was not performed. A live browser run is recommended to confirm preset-to-preset color changes.
- The local `data-theme` attribute and the local theme toggle remain. Removing them would need production theme wiring. That is out of scope.
- Some Theme Manager presets define very low-contrast borders. The CPS border is still visible but subtle in those presets.
- `--group-on` is a fixed light value. On a theme with a light group header it could lose contrast. No current preset produces that condition.

## Deferred Work

- Remove the local theme state after production theme wiring is designed.
- Run live preset-to-preset visual verification.
- Popup workflows remain deferred: columns, import, markup, clear all, and client selection.
- Production CPS wiring remains deferred: save, calculations, PDF, numbering, Cloudinary.
- Component decomposition remains deferred.
