# CPS New/Edit Global Theme Toggle Integration — Implementation Report (Option B)

This report was written by Buffy on 2026-10-09 via Freebuff.

Date: 2026-10-09

Objective: Make the existing CPS New/Edit theme button control the same global light/dark preference as the Dashboard, and expose one theme button in the CPS desktop form header.

Scope: CPS New/Edit only — mobile, fold, and desktop presentations. Theme-control integration only. No redesign, no palette change, no token change, no provider change.

Skills used: frontend-design, react-useeffect, tailwind-css-patterns, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Executive Summary

The CPS New/Edit route now has exactly one theme authority: the existing global user theme preference. The mobile `tb-btn` and a new desktop TopBar control both read and write that preference through `useThemePreferenceContext()` and the existing `save()` handler. No local theme state remains in the active path.

Option B from the audit report was implemented: the mobile CPS keeps its `tb-btn` markup and CSS and only its behavior changed; the desktop TopBar gains one control.

- No new preference store, no `localStorage`, no direct Supabase write.
- No change to `AppThemeManager`, the provider, the Dashboard control, theme tokens, or palettes.
- `data-theme` on the CPS root is preserved and now follows the resolved global mode.

## Sources Read Before Editing

- `docs/reports/cost-pricing-sheet/2026-10-09-cps-new-edit-global-theme-toggle-zero-code-audit.md`
- `src/components/theme/ThemeToggleButton.tsx`
- `src/lib/themeToggle.ts`
- `src/contexts/ThemePreferenceContext.tsx`
- `src/components/app/AppShell.tsx` (provider and `AppThemeManager` confirmation)
- `src/components/cps/CostPricingSheetEditor.tsx`, `CostPricingSheetForm.tsx`, `CostPricingSheetFormPresentations.tsx`, `cost-pricing-sheet-form.css`
- `src/tests/critical/themeToggleExposure.test.js` (unchanged-invariant baseline)

## Components Changed

1. `src/components/cps/CostPricingSheetEditor.tsx`
   - Reads the global preference once: `const { preference: themePreference, save: saveThemePreference } = useThemePreferenceContext()`.
   - Resolves the mode with the shared helper: `resolveIsDark(themePreference.themeMode, prefersDark)`.
   - Derives `resolvedTheme: 'light' | 'dark'`.
   - Defines `handleToggleTheme` that calls the existing shared save with the existing fields only:
     `saveThemePreference({ themeMode: nextThemeMode(isDarkTheme), themePresetId: themePreference.themePresetId })`.
   - Forwards `resolvedTheme` and `handleToggleTheme` to the mobile host, which forwards them to `CostPricingSheetForm` as the controlled `theme` and `onToggleTheme` props.

2. `src/components/cps/CostPricingSheetForm.tsx` (mobile/fold)
   - Removed the local authority: `internalTheme` state and `themeIcon` state are deleted.
   - `theme` is now `controlledTheme ?? defaultTheme` with no local state.
   - The header button: kept `tb-btn` markup and geometry; added `type="button"`; icon now `themeToggleIcon(isDarkTheme)`; label now `themeToggleAriaLabel(isDarkTheme)`; click calls `onToggleTheme?.(isDarkTheme ? 'light' : 'dark')`.
   - `data-theme={theme}` on `.cps-form-root` is preserved.
   - Corrected the stale JSDoc and the file header line that claimed `data-theme` is set on `<html>`.

3. `src/components/cps/CostPricingSheetFormPresentations.tsx` (desktop)
   - Imports and renders the shared `ThemeToggleButton` once in the existing `TopBar`, after Back/title/Save.
   - No prop-contract change; no CSS palette change.

4. `src/components/cps/cost-pricing-sheet-form.css`
   - Added one adapter rule, `.cps-form .cps-tb-theme`, that keeps the CPS top-bar button geometry (40x40, 11px radius, CPS line/card/sub colours) for the shared button. It contains no palette definition and does not alter any existing rule.

5. `src/tests/critical/cpsThemeToggleIntegration.test.js` (new)
   - Focused regression coverage for the wiring.

## How The Global Preference Is Wired

The global preference continues to live in `useUserThemePreferences` and is provided by `ThemePreferenceProvider` in `AppShell`. Only its value changes reach the DOM, through the unchanged `AppThemeManager`.

- Mobile/fold: the editor is the single reader. It passes a controlled `theme` and a `onToggleTheme` callback that calls the shared `save`. The form never persists and never mutates the DOM.
- Desktop: the shared `ThemeToggleButton` reads the same context and calls the same `save`. It is the exact component already used by the Layout headers.

Both presentations therefore use one preference, one `save` path, and one icon convention (moon in light, sun in dark). No competing local theme action remains.

## How CPS `data-theme` Is Synchronized

`resolvedTheme` is computed in the editor from the global preference. It is passed as the controlled `theme` prop to the mobile form, which writes `data-theme={theme}` on the CPS root. The value therefore always equals the resolved global light/dark mode.

This keeps the mobile CSS dependencies intact. The group-header gradient, `--group-on`, and `--shadow-ear` still resolve from `data-theme`, but now agree with the global mode instead of defaulting to `light`.

## Button Placement

- Mobile and Fold: the existing header button, `id="themeBtn"`, unchanged position (after Back, title, and Save). One control.
- Desktop: one new control in the existing `cps-form-topbar-inner`, at the far right after Save. One control.
- The two branches are mutually exclusive (`useDesktopComposition`), and the Layout headers remain hidden (`immersive`), so no viewport shows two controls.

## State-Preservation Safeguards

- The radio of change is the preference, not the route. A preference change re-renders consumers; it does not remount the form.
- The mobile host key is unchanged and depends only on the document id: `key={`cps-mobile-${cps.id}`}`. No theme value is part of any key.
- No component is mounted conditionally on theme. `useDesktopComposition` depends on layout only.
- The toggle never navigates, reloads, resets editor state, or triggers Save. `onSave` remains on the Save controls only.
- The new buttons are `type="button"`, so they cannot submit or save.
- Unsaved rows, groups, markup, and uploads are untouched by the toggle.

## Tests And Results

Run on 2026-10-09 against the final working tree.

- Typecheck: `bun run typecheck` -> exit 0.
- Focused new suite: `src/tests/critical/cpsThemeToggleIntegration.test.js` -> 14 tests, 14 pass.
- Scoped existing suites:
  - `themeToggleExposure.test.js` -> 8 pass (unchanged invariant).
  - `cpsMarkupPresentation.test.js` and `cpsRowOperations.test.js` -> pass.
  - Combined scoped run -> 63 tests, 0 fail.
- Lint (`eslint`) on the four changed source files: no new finding is attributable to this change. The reported findings are pre-existing lines (the `react-refresh/only-export-components` exports, the `set-state-in-effect` effects at lines 1392/1409/1419/1657, the unused `onColumnsChange`, and the editor `exhaustive-deps`/`immutability` items) and the new test file is clean.

`bun run build` was not run (banned on this host). `bun run audit:load` was not run, as instructed. No schema or query change exists.

### Pre-existing failures observed in the wider CPS suite (not caused by this change)

A broad `cps*.test.js` run showed 9 failures in suites unrelated to the theme path:

- `cpsIndustry.test.js`, `cpsLedger.test.js`, `cpsPdf.test.js`: fail with `ERR_UNKNOWN_FILE_EXTENSION ".tsx"` — a Node loader limitation in these suites, an environment issue.
- `cpsViewProductionRedesign.test.js` (5 tests): asserts on `CostPricingSheetViewPresentations.tsx`, `cost-pricing-sheet-view.css`, `ViewCps.tsx`, and the download FAB. None of these files is changed by this task, so these failures exist independently.
- `cpsCalculationAuthority.test.js` (1 test): a numeric-format assertion in the markup domain. It depends on `src/domain/cps/instant-markup.ts`, which carries pre-existing concurrent working-tree changes that this task did not touch.

## Git Status

### Before

Branch `main`, HEAD `b6fbd3c8`. The working tree already contained unrelated concurrent changes (Android launcher icons, several `src/domain/cps/*` and `src/domain/import/utils.ts` edits, three CPS test edits, and untracked reports and domain files). `CostPricingSheetEditor.tsx` and `CostPricingSheetForm.tsx` were already modified by another agent; `CostPricingSheetFormPresentations.tsx` and `cost-pricing-sheet-form.css` were clean.

### After

- Modified by this task: `src/components/cps/CostPricingSheetEditor.tsx`, `src/components/cps/CostPricingSheetForm.tsx`, `src/components/cps/CostPricingSheetFormPresentations.tsx`, `src/components/cps/cost-pricing-sheet-form.css`.
- Added by this task: `src/tests/critical/cpsThemeToggleIntegration.test.js`.
- All other entries in `git status` are unchanged pre-existing concurrent work and were not touched.

No file outside this list was written. The concurrent changes in the two shared CPS files were preserved because all edits were applied on top of the current working-tree content.

## Risks Or Limitations

- The adapter rule `.cps-form .cps-tb-theme` is required because `.cps-form button` (specificity 0,1,1) otherwise overrides the shared button's utility background and colour. The rule is a geometry adapter, not a palette definition. It was verified by source cascade analysis, not by a rendered browser capture.
- The desktop `.dark .cps-form` palette continues to be private literals, so desktop CPS follows the global light/dark mode but not the global theme family. This is a pre-existing condition and is out of scope.
- No device or browser visual run was made. See the next section.

## Behavior Requiring Device Confirmation

- Mobile and Fold: the theme button tap must flip the whole app and must not remount the form or clear unsaved rows.
- Desktop: the new TopBar button must match the Back button geometry, must show moon in light and sun in dark, and must flip the desktop CPS palette.
- Cross-check the mobile group-header gradient now follows the global dark mode.

## Deferred Work

- Bridge the desktop `cost-pricing-sheet-form.css` literals to `--bd-*` if desktop must track the theme family.
- Run a device and desktop visual check across at least two theme families.
