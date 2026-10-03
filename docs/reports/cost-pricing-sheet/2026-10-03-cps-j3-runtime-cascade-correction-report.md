# CPS J3 Runtime Cascade Correction Report

This report was written by Codex on 2026-10-03 via Codex desktop.

## Objective

Find the runtime cause of the CPS J3 light-mode discrepancy.

Apply only the smallest correction after proof.

## Scope

- Runtime control: `C:\Users\DELL\Desktop\bgd-soft\Tsx-playground\src\previews\test3.tsx`
- BIGDROPS component: `src/components/cps/CpsJ3Form.tsx`
- Canonical HTML: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-mobile-fold.html`
- BIGDROPS route context inspected: `src/pages/CpsFormPage.tsx`, `src/components/Layout.tsx`, `src/components/app/AppShell.tsx`
- Host style files inspected: `src/index.css`, `src/styles/formTheme.css`

The BIGDROPS authenticated route was blocked by the sign-in gate during automated Playwright measurement.

To avoid a fake session, the BIGDROPS runtime measurement mounted `src/components/cps/CpsJ3Form.tsx` through Vite-served modules at the BIGDROPS origin. The probe used a Layout-like wrapper with `data-bd-shell` and `data-bd-layout` attributes. This preserved BIGDROPS global CSS, font loading, Vite transform, and host cascade.

## Files Changed

- `src/components/cps/CpsJ3Form.tsx`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-j3-runtime-cascade-correction-report.md`

## Skills Used

Skills used: superpowers:systematic-debugging, karpathy, webapp-testing, frontend-design, redesign-existing-projects, tailwind-css-patterns, accessibility, safe-area-handling

Documentation standard: ASD-STE100 Simplified Technical English

## Runtime Control

Environment measured:

- Browser: Playwright Chromium, headless
- Viewport: 393 x 852 CSS px
- Device scale factor: 3
- Mobile mode: enabled
- Color scheme: light

Standalone control values:

- `window.innerWidth`: 393
- `document.documentElement.clientWidth`: 393
- `visualViewport.width`: 393
- `visualViewport.scale`: 1
- `.wrap` width: 393
- `.wrap` padding left/right: 14 px
- `.itemtools` width: 365
- `--gutter`: 14 px

BIGDROPS probe values after correction:

- `window.innerWidth`: 393
- `document.documentElement.clientWidth`: 393
- `visualViewport.width`: 393
- `visualViewport.scale`: 1
- `.cps-j3-root` width: 393
- `.cps-j3-root` padding left/right: 14 px
- `.itemtools` width: 365
- `--gutter`: 14 px

Effective width was not the cause.

## Representative Element Comparison

Before correction, BIGDROPS changed selected J3 controls through cascade specificity:

| Element | Standalone value | BIGDROPS before | Result |
| --- | --- | --- | --- |
| Toolbar button font size | 8.5 px | 14 px | mismatch |
| Toolbar button font weight | 800 | 400 | mismatch |
| Toolbar button border | 1 px | 0 px | mismatch |
| Toolbar button background | white | transparent | mismatch |
| Header title font size | 13.5 px | 36 px | mismatch |
| Header title font family | Manrope | Inter | mismatch |
| Group title font size | 12.5 px | 14 px | mismatch |
| Group title weight | 700 | 400 | mismatch |

After correction, representative values matched the control:

| Element | Standalone | BIGDROPS after |
| --- | --- | --- |
| Header title | Manrope, 13.5 px, 800 | Manrope, 13.5 px, 800 |
| Section heading | Manrope, 10 px, 800 | Manrope, 10 px, 800 |
| Sheet title label | Manrope, 8.5 px, 800 | Manrope, 8.5 px, 800 |
| Sheet title input | Manrope, 12 px, 600, 42 px high | Manrope, 12 px, 600, 42 px high |
| Description field | Manrope, 12.5 px, 600, 60 px high | Manrope, 12.5 px, 600, 60 px high |
| Group title | Manrope, 12.5 px, 700 | Manrope, 12.5 px, 700 |

## Font Result

The standalone control reported:

- `document.fonts.status`: loaded
- `document.fonts.check('800 12px Manrope')`: true
- `document.fonts.check('600 12px "DM Mono"')`: true

The BIGDROPS probe after correction computed Manrope and DM Mono on the measured elements.

The BIGDROPS `document.fonts.check(...)` result stayed false for some checked weights because the page also loads host fonts and duplicate font declarations. The measured element widths matched the standalone control, so active text metrics were corrected for the tested elements.

## Toolbar Result

Standalone toolbar:

- Available width: 365 px
- Button widths:
  - COLUMNS: 89.34 px
  - IMPORT: 78.73 px
  - MARKUP: 82.23 px
  - CLEAR ALL: 83.75 px
- Gap count: 3
- Gap size: 8 px
- Required width: 358.05 px
- Rows: 1

BIGDROPS before correction:

- Available width: 365 px
- Button widths:
  - COLUMNS: 113.98 px
  - IMPORT: 96.84 px
  - MARKUP: 102.11 px
  - CLEAR ALL: 109.38 px
- Required width: 446.31 px
- Rows: 2

BIGDROPS after correction:

- Available width: 365 px
- Button widths:
  - COLUMNS: 89.34 px
  - IMPORT: 78.73 px
  - MARKUP: 82.23 px
  - CLEAR ALL: 83.75 px
- Required width: 358.05 px
- Rows: 1

The toolbar wrapped because the host cascade made the buttons larger. It did not wrap because of a narrower content width.

## Winning Cascade Rules

The Chrome DevTools Protocol matched-style trace found this causal order on `.itemtools .itbn`:

- Expected J3 rule: `.itbn`
  - `font-size: 8.5px`
  - `font-weight: 800`
  - `border: 1px solid var(--line)`
  - `background: var(--card)`
  - `color: var(--sub)`
- Winning J3 isolation reset before correction: `.cps-j3-root button`
  - `font: inherit`
  - `color: inherit`
  - `background: none`
  - `border: 0`

The reset was in `src/components/cps/CpsJ3Form.tsx`.

Cause:

- The original prototype reset used low-specificity global selectors such as `button`.
- The isolation pass changed them to `.cps-j3-root button`.
- `.cps-j3-root button` has higher specificity than `.itbn`.
- Therefore the reset overrode component classes that it was supposed to initialize.

Additional host rule:

- `src/styles/formTheme.css` defines `h1, .bd-h1` with `!important`.
- This overrode `.tb-title h1`.
- `src/styles/formTheme.css` also defines `label, .bd-label` with an important font family.
- This changed label font resolution inside J3.

## Root Cause

Classification:

- G. J3 isolation selector regression
- E. host important typography override

Evidence:

- Available toolbar width was equal in both environments.
- J3 toolbar controls had larger runtime widths only in BIGDROPS.
- The matched-style trace showed `.cps-j3-root button` beat `.itbn`.
- The matched-style trace and computed values showed host heading typography beat `.tb-title h1`.

## Fix

The fix did not change canonical toolbar geometry.

Changes made:

- Replaced high-specificity scoped reset selectors with `:where(...)` selectors.
- Set source-equivalent root metrics on `.cps-j3-root`:
  - `font-size: 16px`
  - `line-height: normal`
  - `text-size-adjust: auto`
- Added local J3 heading protection for `.tb-title h1` against host `h1 !important`.
- Added local J3 label font protection for `.lb` against host `label` typography.

This is smaller and safer than changing J3 control sizes because it restores the original reset role. The reset initializes elements but no longer outranks component classes.

## After Verification

Runtime measurements after correction:

- `.cps-j3-root` width: 393 px
- `.itemtools` width: 365 px
- Toolbar required width: 358.05 px
- Toolbar rows: 1
- CLEAR ALL remained on the first row.
- Header title matched the standalone control.
- Sheet title label matched the standalone control.
- Sheet title input matched the standalone control.
- First item description field matched the standalone control.
- Group title matched the standalone control.

Command verification:

- `bun run typecheck`: passed.
- `git diff --check`: passed. Git reported a line-ending warning for `src/components/cps/CpsJ3Form.tsx`.
- `git status`: dirty with the task-modified `src/components/cps/CpsJ3Form.tsx`, this new report, and pre-existing untracked CPS reports.
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `supabase db push`: not applicable.
- `bun run build`: skipped due to hardware policy.

## Changes Made

- Corrected J3 reset specificity with `:where(...)`.
- Locally isolated J3 root typography from BIGDROPS body typography.
- Locally protected J3 header and label typography from host important rules.
- No production CPS behavior was wired.
- No dark-mode work was performed.
- No playground file was modified.

## Supabase Push Status

Not applicable.

No SQL changed.

No database file changed.

## Risks or Limitations

The authenticated BIGDROPS route could not be measured directly because the automated browser was stopped by the sign-in page.

The BIGDROPS measurement used the same component served by BIGDROPS Vite and a Layout-like wrapper. This measured the relevant CSS and cascade failure without creating a fake session.

## Deferred Work

- Use the user's authenticated browser or a sanctioned test account for direct route-level visual confirmation.
- Keep dark-mode correction deferred.
- Keep production CPS wiring deferred.
