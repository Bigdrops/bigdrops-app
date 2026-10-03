# CPS J3 Zero-Code Rendering Discrepancy Audit

This report was written by Codex on 2026-10-03 via Codex desktop.

## Objective

Audit why the standalone CPS J3 control render differs from the BIGDROPS-mounted render.

This task made no application code change.

## Scope

- Control file: `C:\Users\DELL\Desktop\bgd-soft\Tsx-playground\src\previews\test3.tsx`
- BIGDROPS component: `src/components/cps/CpsJ3Form.tsx`
- Canonical HTML: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-mobile-fold.html`
- Mount context: `src/pages/CpsFormPage.tsx`
- Host files inspected: `src/components/Layout.tsx`, `src/components/app/AppShell.tsx`, `src/index.css`, `src/styles/formTheme.css`, `src/lib/themePresets.ts`, `tailwind.config.js`, `index.html`
- Playground host files inspected: `C:\Users\DELL\Desktop\bgd-soft\Tsx-playground\src\main.tsx`, `C:\Users\DELL\Desktop\bgd-soft\Tsx-playground\src\playground.css`, `C:\Users\DELL\Desktop\bgd-soft\Tsx-playground\index.html`

## Files Changed

- `docs/reports/cost-pricing-sheet/2026-10-03-cps-j3-zero-code-rendering-discrepancy-audit.md`

## Skills Used

Skills used: superpowers:systematic-debugging, karpathy, frontend-design, redesign-existing-projects, tailwind-css-patterns

Documentation standard: ASD-STE100 Simplified Technical English

## Control File

- External control path: `C:\Users\DELL\Desktop\bgd-soft\Tsx-playground\src\previews\test3.tsx`
- The file was inspected.
- The file was not modified.
- SHA-256: `4B494546FCAA547591947C575105DA5F17B6833A88AF0EEE820E86D9EADBBB79`
- Line count: 2975

The BIGDROPS active file was also inspected.

- BIGDROPS path: `src/components/cps/CpsJ3Form.tsx`
- SHA-256: `255589A5E4C8A04A336B1232668C2737D18D1E1F836375BAC391B7191D195E54`
- Line count: 2970

## Literal Diff Result

The files are not byte-for-byte identical.

Classification: functionally and presentation identical, with integration-only isolation differences.

The diff result was:

- 29 changed lines.
- 12 insertions.
- 17 deletions.

Important differences:

- `test3.tsx` defines candidate variables on `:root`.
- `CpsJ3Form.tsx` defines the same variables on `.cps-j3-root`.
- `test3.tsx` defines dark variables on `[data-theme="dark"]`.
- `CpsJ3Form.tsx` defines dark variables on `.cps-j3-root[data-theme="dark"]`.
- `test3.tsx` applies reset rules to global selectors:
  - `*`
  - `html,body`
  - `button,input,select,textarea`
  - `button`
  - `input,select,textarea`
  - `svg`
- `CpsJ3Form.tsx` scopes those reset rules under `.cps-j3-root`.
- The reduced-motion selector is scoped under `.cps-j3-root`.
- The media-query gutter owners are scoped from `:root` to `.cps-j3-root`.
- `test3.tsx` writes `data-theme` to `document.documentElement`.
- `CpsJ3Form.tsx` removes that effect and places `data-theme={theme}` on the component root.
- `test3.tsx` renders the root as `<div className="wrap">`.
- `CpsJ3Form.tsx` renders the root as `<div className="cps-j3-root wrap" data-theme={theme}>`.

No material differences were found in these presentation rules:

- `.wrap`
- `.itemtools`
- `.itbn`
- `.itbn.danger`
- toolbar gap
- toolbar padding
- toolbar font size
- toolbar font weight
- toolbar flex behavior
- toolbar button labels
- toolbar JSX order
- mobile gutter values
- desktop gutter values
- section spacing values
- group spacing values
- totals spacing values

The isolation work changed cascade scope. It did not change declared J3 geometry.

## HTML Lineage

The canonical HTML and `test3.tsx` were compared at the CSS source level.

The CSS from `:root` onward in `test3.tsx` matches the canonical HTML `<style>` block from `:root` onward.

Result:

- `HTML -> test3.tsx`: source-faithful for the candidate CSS geometry.
- `test3.tsx -> known-good standalone rendering`: accepted by user as compact and correct.
- `test3.tsx -> CpsJ3Form.tsx`: integration-only isolation changes.
- `CpsJ3Form.tsx -> BIGDROPS rendering`: divergence enters through host conditions, or through the interaction between isolation and host conditions.

The HTML uses a direct mobile-first document. The playground host is also small:

- `index.html` viewport: `width=device-width, initial-scale=1.0`
- Shell: `.playground-stage`
- Mobile shell padding: none at 700 px and below.

BIGDROPS has a larger host system around the same component.

## Host Deltas

### Route and Mount

New CPS route:

- `/cost-pricing-sheets/new`
- `src/components/app/AppShell.tsx`
- `NewCps`
- `CpsFormPage` with `mode="create"`
- `Layout` with `immersive`
- `CostPricingSheetForm` from `src/components/cps/CpsJ3Form.tsx`

Edit CPS route:

- `/cost-pricing-sheets/edit/:id`
- `src/components/app/AppShell.tsx`
- `EditCps`
- `CpsFormPage` with `mode="edit"`
- `Layout` with `immersive`
- `CostPricingSheetForm` from `src/components/cps/CpsJ3Form.tsx`

### Effective Width

BIGDROPS `Layout` uses:

- shell root: `.app-ambient`
- main content: `data-bd-shell="main"`
- content wrapper: `data-bd-layout="content"`
- mobile content classes include `w-full px-0 pb-24 pt-0`
- medium screens add `md:px-[var(--bd-layout-padding,1.5rem)]`

On a phone-width viewport, no horizontal padding is added by `Layout`.

Therefore, static source shows that `.cps-j3-root.wrap` should receive the full mobile content width.

The source cannot prove the final computed CSS width on the physical device. That value depends on the browser viewport, address-bar state, and device scaling.

### Root Font Metrics

The J3 component sets:

- `.cps-j3-root { font-family: 'Manrope', sans-serif; }`
- toolbar buttons use explicit `font-size: 8.5px`
- toolbar buttons use explicit `font-weight: 800`
- toolbar buttons use explicit `letter-spacing: .06em`

BIGDROPS also sets global typography through `src/styles/formTheme.css`.

Important host rule:

- `body { font-family: var(--bd-font-family) !important; font-size: var(--bd-font-body-size) !important; line-height: var(--bd-font-body-line-height) !important; }`

This can affect inherited text outside scoped J3 declarations. It does not override the explicit `.itbn` toolbar font size.

### Font Loading

BIGDROPS `index.html` loads Manrope and DM Mono.

BIGDROPS loads:

- Manrope weights 400, 500, 600, 700, 800
- DM Mono weights 400, 500

J3 also imports:

- Manrope weights 400, 600, 700, 800
- DM Mono weights 400, 500, 600

The playground host has a small global Inter fallback. The J3 component imports Manrope and DM Mono itself.

Font metrics can affect toolbar intrinsic width if the intended font is not loaded at the same time or same weight in both hosts.

Static source cannot prove the final active font face on the device.

### Global Box Model

BIGDROPS global CSS includes:

- Tailwind Preflight through `src/index.css`
- `* { @apply border-border; -webkit-tap-highlight-color: transparent; }`
- `input, textarea, select { -webkit-appearance: none; appearance: none; }`
- placeholder color and opacity rules
- `body` background and ambient gradients
- `.app-ambient` isolation and overflow rules

J3 locally scopes reset rules for:

- box sizing
- margin and padding
- button/input/select/textarea font inheritance
- button border/background
- input outline
- SVG display and shrink behavior

No host box-model rule was found that directly changes `.itemtools` or `.itbn`.

### Class Collisions

Generic J3 class names were searched against BIGDROPS CSS.

Findings:

- `.topbar` exists in CSS module files. CSS modules scope those selectors.
- `.mono` exists under `.cps-form .mono` and `.cps-view .mono`. These selectors do not match J3 because J3 does not render `.cps-form` or `.cps-view`.
- `QuotationDocumentPreview.css` has item-related selectors, but they do not match the J3 toolbar selector set.
- No global collision was found for `.itemtools`, `.itbn`, `.wrap`, `.fld`, `.gwrap`, or `.totals`.

No class collision was found that explains the toolbar wrap.

### Cascade and Load Order

BIGDROPS imports app styles before the React app mounts:

- `src/index.css`
- `src/styles/formTheme.css`

J3 renders a local `<style>` element from inside the component.

Normal J3 class rules load after app CSS. They should win against normal host rules with equal or lower specificity.

Important exception:

- `src/styles/formTheme.css` uses `!important` on `body`, `label`, and `h1`.

This can override J3 `h1` and `label` declarations. It can affect header and label appearance. It does not directly explain toolbar wrapping because toolbar buttons are not `h1` or `label`.

### CSS Custom Property Collisions

BIGDROPS theme code sets generic semantic tokens on `document.documentElement`.

Examples:

- `--bg`
- `--surface`
- `--surface-raised`
- `--surface-muted`
- `--surface-strong`
- `--ink`
- `--ink-2`
- `--ink-3`
- `--primary`

The candidate also uses generic variables such as:

- `--bg`
- `--card`
- `--soft`
- `--brand`
- `--cost`
- `--sell`

If J3 variables are left on `:root`, this is a real collision surface.

Current `CpsJ3Form.tsx` scopes J3 variables to `.cps-j3-root`. This should protect descendant J3 values from BIGDROPS root token injection.

This is a concrete cause for the earlier light-mode color discrepancy before isolation. It is not a current toolbar geometry drift by itself.

### Viewport and Text Scaling

BIGDROPS `index.html` uses:

- `width=device-width`
- `initial-scale=1.0`
- `maximum-scale=1.0`
- `user-scalable=no`
- `interactive-widget=resizes-content`

The playground uses:

- `width=device-width`
- `initial-scale=1.0`

The canonical HTML uses a candidate-specific mobile viewport.

This is a host delta. It can change the available CSS viewport during mobile browser states. Static source cannot prove the exact runtime CSS pixel width on the device.

## Toolbar Diagnosis

The toolbar source rules are the same in `test3.tsx` and `CpsJ3Form.tsx`.

Toolbar rules:

- `.itemtools { display:flex; align-items:center; gap:8px; flex-wrap:wrap; row-gap:8px; margin-bottom:14px; }`
- `.itbn { height:36px; padding:0 12px; font-size:8.5px; font-weight:800; letter-spacing:.06em; display:flex; gap:6px; }`
- `.itbn svg { width:11px; height:11px; }`
- `.itbn.danger { margin-left:auto; padding:0 8px; }`

The toolbar wraps by design when its intrinsic width exceeds the line width.

The one-row condition is:

`Columns button width + Import button width + Markup button width + Clear All button width + 24 px gaps <= toolbar available width`

There are three 8 px gaps, so the gap budget is 24 px.

The toolbar available width is:

`viewport CSS width - 2 * --gutter`

For the base mobile candidate, `--gutter` is 14 px.

Therefore:

`available width = viewport CSS width - 28 px`

Because there is no `min-width` or fixed width on `.itbn`, the final button widths depend on:

- active font face
- active font weight
- text rendering metrics
- viewport CSS width
- browser text scaling

Concrete diagnosis:

- The toolbar wrap is not caused by a source-level difference in toolbar CSS or JSX.
- No BIGDROPS class collision was found that overrides `.itemtools` or `.itbn`.
- The wrap can occur if BIGDROPS gives the component a smaller effective CSS width than the standalone host, or if BIGDROPS renders the toolbar text wider through font or text scaling.
- Static inspection cannot prove the final computed pixel widths. A browser computed-style capture is required to identify the exact runtime number.

## Root Cause Classification

Classification: host interference, with one unresolved runtime measurement for toolbar width.

Reasons:

- The active BIGDROPS component and the known-good standalone control are not byte-identical.
- The source differences are integration isolation changes.
- The source differences do not alter toolbar geometry declarations.
- `test3.tsx` preserves the canonical HTML CSS geometry from `:root` onward.
- BIGDROPS has concrete host systems that the playground does not have:
  - app theme token injection on `document.documentElement`
  - global typography rules with `!important`
  - Tailwind Preflight
  - global form element styling
  - different viewport meta
  - application shell wrappers
- The previous generic variable placement was a concrete collision risk for colors and surfaces.
- The current scoped variables reduce that color collision risk.
- The toolbar wrap still requires runtime computed width or font evidence before an exact pixel cause can be named.

## Source Differences

No source drift was found in the canonical mobile geometry.

The current source differences are:

- local root class addition: `.cps-j3-root`
- data-theme moved from `document.documentElement` to `.cps-j3-root`
- root variables moved from `:root` to `.cps-j3-root`
- reset rules moved from global selectors to `.cps-j3-root` selectors
- media-query gutter variable owners moved from `:root` to `.cps-j3-root`

These differences are local isolation differences. They are not a redesign.

## Fixes

No fixes were implemented in this audit.

The only file created was this report.

## Recommended Fix

For the follow-up task, use computed-style evidence before changing presentation code.

Minimum runtime measurements:

- viewport CSS width
- `.cps-j3-root.wrap` computed width
- `.itemtools` computed width
- each `.itbn` computed width
- active `font-family`
- active `font-size`
- active `font-weight`
- loaded font face for Manrope
- `--gutter` computed value
- parent content width from `data-bd-layout="content"`

Then apply the smallest correction:

- If root-token contamination remains, keep J3 tokens scoped under `.cps-j3-root`.
- If host typography `!important` rules affect J3 headings or labels, neutralize them locally at `.cps-j3-root`.
- If the toolbar wrap is due to effective width, fix the wrapper or viewport condition instead of shrinking J3 controls.
- If the toolbar wrap is due to font loading, align the active font face and weight with the standalone control.

Do not redesign the toolbar.

## Verification

- `git status` before audit: completed.
- `git status` after audit: required after report creation.
- `bun run build`: skipped due to hardware policy and task instruction.
- `bun run typecheck`: skipped due to zero-code audit instruction.
- `bun run lint`: skipped due to zero-code audit instruction.
- `bun run audit:load`: skipped due to zero-code audit instruction.
- tests: skipped due to zero-code audit instruction.
- supabase db push: not applicable.

## Supabase Push Status

Not applicable.

No SQL changed.

No database file changed.

## Risks or Limitations

Static source analysis cannot prove the final computed pixel width of the toolbar on the mobile device.

Static source analysis cannot prove the exact loaded font face at paint time.

The toolbar diagnosis is narrowed to host effective width or font metrics. Runtime computed-style capture is required for final pixel proof.

## Deferred Work

- Do not change code in this task.
- Capture runtime computed styles in a follow-up task.
- Fix only the verified host or isolation cause in that follow-up task.
- Keep dark mode out of scope until light-mode fidelity is correct.
