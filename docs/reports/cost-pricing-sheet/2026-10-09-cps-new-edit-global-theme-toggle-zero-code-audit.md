# CPS New/Edit Global Theme Toggle Integration — Zero-Code Architecture Audit

This report was written by Buffy on 2026-10-09 via Freebuff.

Skills used: karpathy, frontend-design, react-useeffect, tailwind-css-patterns
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Decide if CPS New/Edit can safely adopt the application's existing global theme toggle. No code change is in scope.

The audit answers 14 required questions and recommends one integration option. It does not implement it.

## Scope

In scope: the active CPS New/Edit route, the global theme system, the shared `ThemeToggleButton`, and the CPS-local theme mechanism.

Out of scope: CPS View, PDF/Forme, the legacy `CpsJ3Form`, and any CSS redesign. No source, CSS, provider, test, or migration file was changed.

## Initial Git Status (before investigation)

```text
branch: main        HEAD: b6fbd3c8 📝 docs(android): add launcher icon and cold launch reports

 D docs/prd/.../filter-icon-comparison.html
 D docs/prd/.../BIGDROPS Cold Launch - Mobile Fold2 - Linear Dark.html
 M android/app/src/main/res/drawable/ic_launcher_background.xml
 M android/app/src/main/res/mipmap-*/ic_launcher*.png   (15 files)
 M android/app/src/main/res/values/ic_launcher_background.xml
 M src/components/cps/CostPricingSheetEditor.tsx
 M src/components/cps/CostPricingSheetForm.tsx
 M src/components/cps/CpsImportSheet.tsx
 M src/components/cps/CpsMarkupSheet.tsx
 M src/components/useInvoiceColumns.tsx
 M src/domain/cps/columns.ts
 M src/domain/cps/importAdapter.ts
 M src/domain/cps/instant-markup.ts
 M src/domain/import/utils.ts
 M src/tests/critical/cpsImportView.test.js
 M src/tests/critical/cpsInstantMarkup.test.js
 M src/tests/critical/cpsMarkupPresentation.test.js
?? docs/prd/.../icons/... (AppIcon.icon, android/, README.md, appstore.png, playstore.png)
?? docs/prd/.../cold-launch-tenant-tree/variations/*.html  (2 files)
?? docs/reports/android/android-launcher-icon-official-export-2026-10-08.md
?? docs/reports/cost-pricing-sheet/2026-10-08-cps-instant-markup-custom-columns-zero-code-audit.md
?? docs/reports/cost-pricing-sheet/2026-10-09-cps-instant-markup-custom-columns-implementation.md
?? docs/reports/invoice-quote/2026-10-08-invoice-column-settings-duplicate-regression-audit.md
?? src/domain/financial/columnIdentity.ts
?? src/tests/critical/financialColumnIdentity.test.js
```

Note: CPS files were already dirty from a concurrent agent at the start of this task. This audit left them untouched.

## Acceptance Criteria — Direct Answers

1. **What controls the global application theme?** `useUserThemePreferences` owns the preference state. `AppThemeManager` inside `AppShell.tsx` is the only DOM writer.
2. **What controls the CPS New/Edit theme?** A component-local React state (`internalTheme`) in `CostPricingSheetForm.tsx`, applied as `data-theme` on the CPS root. The editor never passes a `theme` prop, so the local value starts at `light`.
3. **Are the two mechanisms independent?** The *actions* are independent. The local toggle never writes the global preference and never changes the `.dark` class. But the visual *output* is shared: the CPS color tokens read the global `--bd-*` variables.
4. **Does CPS currently follow global theme changes?** Partly. Mobile/fold colors follow the global tokens (theme family and mode). Desktop dark/light follows the global `.dark` class but uses a private hardcoded palette that does not track the theme family. See §6.
5. **Why was CPS excluded from the shared-toggle pass?** Two confirmed reasons: `CpsFormPage` renders `Layout ... hidePageHeader immersive`, and `immersive` suppresses both the mobile and desktop Layout headers, so no shared header exists to host the toggle. In addition, the bespoke CPS mobile top bar already renders a local `themeBtn`.
6. **Can CPS safely use the global theme controller?** Yes for the toggle action; state-preservation risk is low (see §7). The rule is: wire the toggle to the global preference; do not remount, and do not add a theme-dependent React key.
7. **Can its existing visual styling be preserved?** Mobile: mostly yes, because it already reads global tokens. Desktop: the private literal palette would not match a global theme-family change unless it is bridged, which is a CSS task, not a theme task.
8. **Can the current local toggle be removed or repurposed?** Yes. Repurpose is safer: keep the `tb-btn` markup, set its state from the global preference, and send the tap to the global `save()`. The local `data-theme` on the root becomes redundant.
9. **Could integration remount CPS or lose unsaved state?** Only if integration adds a theme-dependent `key` or conditional mount. The current keys are stable per document id. A preference change re-renders consumers; it does not remount the route.
10. **Which integration option is safest?** Option B (§8).
11. **What exact files would a future implementation touch?** See §9.
12. **What regression coverage is required?** See §10.
13. **What remains unverified?** All rendered visual behavior. No browser or device run was made. See §11.
14. **Were all application source files left unchanged?** Yes. Only this report was created. See final git status.

## 1. Global Theme Authority Trace (confirmed source facts)

| Concern | Authority | Evidence |
| --- | --- | --- |
| State origin | `useUserThemePreferences(userId)` | `src/hooks/useUserThemePreferences.ts` |
| Persistence | `user_preferences` table (`theme_preset_id`, `theme_mode`) | same file, `.from('user_preferences').select('theme_preset_id, theme_mode')` and `.upsert(...)` |
| Cache | user-scoped `localStorage` key `bigdrops_user_theme_<userId>` | same file, `LOCAL_STORAGE_PREFIX = 'bigdrops_user_theme_'` |
| Dark resolution | `themeMode` `'dark'` → true; `'light'` → false; `'system'` → OS match | `AppThemeManager`, `determineIsDark()` |
| Provider | `ThemePreferenceProvider` value `{ preference, loading, save, refresh }` | `src/contexts/ThemePreferenceContext.tsx`; mounted in `AppShell` |
| Single DOM writer | `AppThemeManager` | `src/components/app/AppShell.tsx` |
| DOM class | `document.documentElement.classList.toggle('dark', isDark)` | `AppThemeManager` |
| DOM tokens | `applyThemeTokenBundle(bundle)` + PRD semantic tokens as inline styles on `documentElement` | `AppThemeManager`; `src/lib/themeTokens.ts` |
| `data-theme` on `<html>` | never set anywhere | `grep` for `data-theme` + `documentElement` finds only a JSDoc string |
| Navigation / remount on change | none | `AppThemeManager` returns `null`; effect dependency is `[preference.themePresetId, preference.themeMode]` |

Key facts:

- The `.dark` class and the `--bd-*` HSL triplets are the only global theme signals on the DOM. There is no global `data-theme` attribute.
- `AppThemeManager` has one effect owner and skips redundant writes with `lastApplied`.
- The shared `ThemeToggleButton` (`src/components/theme/ThemeToggleButton.tsx`) only calls `save({ themeMode: nextThemeMode(isDark), themePresetId: preference.themePresetId })`. It does not touch the DOM. It renders `type="button"`.
- Helpers live in `src/lib/themeToggle.ts` (`resolveIsDark`, `nextThemeMode`, `themeToggleIcon`, `themeToggleAriaLabel`).

## 2. CPS New/Edit Local Theme Authority Trace (confirmed source facts)

Production tree:

```text
/cost-pricing-sheets/new      → NewCps  → CpsFormPage mode="create"
/cost-pricing-sheets/edit/:id → EditCps → CpsFormPage mode="edit"
CpsFormPage.tsx
└── Layout title=... hidePageHeader immersive
    └── CostPricingSheetEditor.tsx
        ├── useDesktopComposition ? CostPricingSheetDesktopForm  (.cps-form)
        │     └── imports cost-pricing-sheet-form.css
        └── CostPricingSheetMobileHost → CostPricingSheetForm   (.cps-form-root)
              └── inline <style>{CPS_FORM_CSS}</style>
```

| Concern | Finding | Evidence |
| --- | --- | --- |
| Local theme value origin | React state `internalTheme`, default `'light'` | `CostPricingSheetForm.tsx` `useState<'light' \| 'dark'>(defaultTheme)` |
| Effective theme | `theme = controlledTheme ?? internalTheme` | same file |
| Editor passes `theme`? | No | `CostPricingSheetMobileHost` passes `modeLabel`, `onBack`, `onSave`, `saving`, … but no `theme`/`defaultTheme` |
| DOM attribute | `data-theme={theme}` on `<div className="cps-form-root wrap">` | same file |
| Local persistence | none | no `localStorage`, no Supabase in the form |
| Local toggle | `<button className="tb-btn" id="themeBtn" ...>` in the mobile top bar | same file |
| Toggle handler | `toggleTheme()` → `setInternalTheme(next)` + `setThemeIcon(...)` + `onToggleTheme?.(next)` | same file |
| Desktop theme control | none | `TopBar` in `CostPricingSheetFormPresentations.tsx` renders Back, title, Save only |

Important corrections to earlier reports:

- The JSDoc on the `theme` prop says "Sets data-theme on documentElement". This is inaccurate. The attribute is set on the CPS root `<div>`, not on `documentElement`.
- The `2026-10-05-cps-new-edit-colour-theme-audit.md` states that `CostPricingSheetFormPresentations` is unmounted and that the mobile form is not mounted. Direct source reading shows both are mounted: `CostPricingSheetEditor.tsx` imports and renders `CostPricingSheetForm` (mobile/fold) and `CostPricingSheetDesktopForm` (desktop). This audit uses the direct source as authority.
- The `2026-10-03-cps-form-theme-manager-integration-report.md` correctly records that only the mobile `CPS_FORM_CSS` was bridged to `--bd-*`, and that the local `data-theme` and local toggle were intentionally kept.

## 3. CSS Dependency Analysis

There are two CPS color authorities.

### 3.1 Mobile/fold — `CPS_FORM_CSS` (inline in `CostPricingSheetForm.tsx`)

- Root `.cps-form-root`. Colors bridge to global tokens: `--ink:hsl(var(--bd-text, …))`, `--bg:hsl(var(--bd-app-bg, …))`, `--accent:hsl(var(--bd-brand, …))`, `--red:hsl(var(--bd-status-danger-text, …))`, and so on.
- The dark block `.cps-form-root[data-theme="dark"]` reads the *same* global variables. Only the fallback triplets differ.
- Consequence (source-level inference): with the app active, `--bd-*` is always defined, so the theme family and mode already paint the mobile form through the global tokens. The local `data-theme` mainly changes fallbacks plus a few non-token values.

Non-token differences between the two mobile blocks (these change even when `--bd-*` is defined):

| Token | Light block | Dark block |
| --- | --- | --- |
| `--group-head` | `linear-gradient(115deg, hsl(var(--bd-text)), hsl(var(--bd-brand)) 58%, hsl(var(--bd-surface-strong)))` | `linear-gradient(115deg, hsl(var(--bd-surface)), hsl(var(--bd-surface-strong)))` |
| `--group-on` | `#f8fafc` | `#e2e8f0` |
| `--shadow-ear` | `rgba(15,23,42,.16)` | `rgba(0,0,0,.45)` |

This is why the local attribute is not purely vestigial: the group header gradient structure and the header text tone depend on it.

### 3.2 Desktop — `cost-pricing-sheet-form.css` (imported by `CostPricingSheetFormPresentations.tsx`)

- Root `.cps-form`. The token block uses hardcoded literals. The file has zero `hsl(var(--bd-…))` uses.
- Dark selectors: `.dark .cps-form`, `[data-theme="dark"] .cps-form`, `.cps-form[data-theme="dark"]`.
- Consequence (source-level inference): because `AppThemeManager` toggles `.dark` on `documentElement`, the desktop CPS form already switches to its dark palette when the *global* mode is dark. It does not track the global theme *family*, because it does not read `--bd-*`.

### 3.3 Specificity and ownership

- Both blocks set the same variable names on their own root. They cannot collide, because the roots differ (`.cps-form-root` vs `.cps-form`).
- The desktop dark selector has higher specificity than `.cps-form`, so it wins over the light block when the ancestor `.dark` class is present.
- No shared component carries CPS colors. `fabFloat.css` is motion only.
- A second bridge exists for Invoice (`src/components/document/document-cps-overrides.css`). It is out of scope and must not change.

## 4. Does CPS Currently Follow Global Theme Changes?

Rendered evidence was not collected. The following is source-level inference and is labelled as such.

- **Mobile, theme family:** yes. The bridge reads `--bd-*`, which the global manager rewrites per family.
- **Mobile, light/dark:** yes for most surfaces. The group header structure and `--group-on`/`--shadow-ear` follow the *local* `data-theme`, not the global mode.
- **Desktop, light/dark:** yes, through `.dark .cps-form`.
- **Desktop, theme family:** no. Private literals do not read `--bd-*`.

**Disagreement is possible.** If the global mode is dark while the local `data-theme` stays `light` (the default, because the editor never passes `theme`), the mobile group header uses the light gradient structure while every bridged surface is dark. This is the concrete "CPS disagrees with the app" condition.

## 5. Existing Status Before This Audit

- The shared toggle is not present on CPS at all, because `immersive` suppresses the Layout headers.
- The local toggle exists only on mobile/fold. Desktop CPS has no toggle.
- The unsaved-work problem that motivated the shared-toggle pass still applies to CPS: a user who leaves CPS to reach a theme control loses the form state on unmount.

## 6. Integration Options Comparison

| Criterion | A: Replace local button with `ThemeToggleButton` + adapter | B: Keep CPS button, connect it to the global preference | C: Keep the local mechanism |
| --- | --- | --- | --- |
| Single theme authority | Yes | Yes | No |
| One visible toggle | Yes (if desktop also gets one) | Yes | Yes on mobile, none on desktop |
| CPS visual fidelity | At risk: global button uses Tailwind/`bd-*`, not CPS `tb-btn` geometry | Preserved: same markup and CSS | Preserved |
| No unsaved-state loss | Yes | Yes | Yes |
| No duplicated persistence | Yes | Yes | No (local state is a second authority) |
| No CSS regression | Needs a new adapter style | Low (icon sync only) | None |
| Minimal code change | Moderate | Small | None |
| Mobile×Fold + Desktop | Needs both headers | Needs editor wiring + desktop button | Desktop has no control |

## 7. State-Preservation Risk Analysis

Source-level facts:

- `AppShell` holds `preference`. A change re-renders the provider and its consumers. Route elements are the same component types, so React reconciles instead of remounting.
- The editor state (`cps`, markup, undo, `included`, import, uploads) lives in `CostPricingSheetEditor` `useState`. It is not keyed on theme.
- The mobile host is keyed `key={`cps-mobile-${cps.id}`}`. The key depends on the document id only. This is the critical invariant.
- The local toggle calls `setState` on the form. It does not navigate.

Risks to avoid in a future change:

1. Never add theme to the mobile host `key` or any ancestor `key`.
2. Never mount CPS conditionally on theme.
3. Keep `onSave` on Save controls only. The local `themeBtn` has no `type="button"`. The CPS form uses `<div>` containers and no `<form>` element, so a default submit has no effect today. A future change should still set `type="button"`.
4. Do not add a second preference write path. Reuse the context `save`.

No runtime proof was collected. The safety claim is a static-cascade argument.

## 8. Recommended Approach — Option B

Keep the existing CPS button presentation. Connect its behavior to the global theme preference. Do not remove CPS styling.

Why Option B:

- It satisfies single authority with the smallest change.
- It preserves the CPS `tb-btn` geometry and CSS, so no visual regression.
- It removes the second persistence authority (local `internalTheme` and `data-theme`).
- It matches the already-designed props on `CostPricingSheetForm` (`theme`, `defaultTheme`, `onToggleTheme`), which need only wiring.

Option A is viable later, after a `ThemeToggleButton` adapter that renders CPS `tb-btn` geometry. Do not do both.

## 9. Exact Future Implementation Scope (not implemented)

In scope:

- `src/components/cps/CostPricingSheetEditor.tsx` — read `useThemePreferenceContext()`. Compute `isDark` from `preference.themeMode` with the shared `resolveIsDark`. Pass `theme` (controlled) and `onToggleTheme` (calls the shared `save`) to the mobile host.
- `src/components/cps/CostPricingSheetForm.tsx` — the mobile top bar `themeBtn`. Keep the `tb-btn` markup. Keep `type="button"`. Drive the icon from the controlled theme so it cannot go stale when the global theme changes elsewhere. Optionally keep `data-theme={theme}` for the fallback render.
- `src/components/cps/CostPricingSheetFormPresentations.tsx` — add one global toggle to the desktop `TopBar` (currently none). Reuse `ThemeToggleButton` or a CPS-styled equivalent.
- Desktop CSS (`cost-pricing-sheet-form.css`) — only if desktop must track the theme family. This is a separate colour-bridge task and is outside the toggle task.

Out of scope:

- Do not change the CPS color literals in this task.
- Do not change geometry, layout, or breakpoints.
- Do not change the global provider, `AppThemeManager`, or `useUserThemePreferences`.
- Do not change shared components already on `bd-*`.

Duplicate-control prevention:

- Exactly one theme control per CPS presentation. Mobile: the existing `tb-btn`. Desktop: one new button. Never both on the same viewport.
- The shared Layout headers stay hidden on CPS (immersive), so no double toggle can appear.

Unsaved-state protection:

- No theme-dependent keys. Keep `cps-mobile-${cps.id}`.
- The toggle only calls the context `save`. It never navigates.

## 10. Required Regression Coverage (future task)

Source-text regression tests (the existing critical harness reads source text, as in `src/tests/critical/themeToggleExposure.test.js`):

1. CPS mobile top bar renders exactly one theme control.
2. CPS desktop top bar renders exactly one theme control.
3. The CPS theme control calls the shared `useThemePreferenceContext().save` and does not write `localStorage` or Supabase directly.
4. The mobile host `key` does not contain any theme value.
5. No CPS component mounts conditionally on theme.
6. The CPS control has `type="button"` and no `onSave`/`navigate` call.
7. `data-theme` is not required for correctness (the bridged tokens still resolve when it is absent).

Unchanged-invariant tests:

- `themeToggleExposure.test.js` must keep passing.
- The Dashboard inline control stays authoritative and is not replaced by the shared button.
- Theme persistence keeps the single `user_preferences` + `bigdrops_user_theme_` path.

## 11. Unverified Assumptions

1. No rendered check was made. Visual parity between the mobile CPS group header and the global theme is inferred from CSS cascade, not observed.
2. The desktop `.dark .cps-form` match depends on the `.dark` class staying on `documentElement`. That is confirmed in source, but not observed at runtime here.
3. Whether some `--bd-*` theme presets give low-contrast CPS borders was not measured.
4. The claim that a preference change does not remount the route is a React reconciliation argument, not a profiled result.
5. `data-theme` fallback behaviour outside the app shell (no `--bd-*` defined) was read, not rendered.

## 12. Changes Made

None to application source. One Markdown report created:

- `docs/reports/cost-pricing-sheet/2026-10-09-cps-new-edit-global-theme-toggle-zero-code-audit.md`

## Verification Result

Static source inspection only, as required.

- `git status`: run before and after. See below.
- `bun run build`: not run (forbidden for this task).
- `bun run typecheck`, `bun run audit:load`, `lint`, `test`: not run (forbidden for this task).

## Supabase Push Status

Not applicable. No SQL and no database file changed.

## Final Git Status (after report)

Compared with the initial status:

- The tracked change set is identical. No application source, CSS, provider, or test file was modified by this task.
- Two untracked files were added after the initial status:
  - `docs/reports/cost-pricing-sheet/2026-10-09-cps-new-edit-global-theme-toggle-zero-code-audit.md` — this report (mine).
  - `docs/reports/general/2026-10-09-cold-launch-retirement-impact-regression-prevention-audit.md` — not mine. It is a concurrent agent's report. It was left untouched.

This task created only the one Markdown report.

## Risks or Limitations

- The audit is static. Rendered parity is unproven.
- The two CPS colour authorities (bridged mobile, literal desktop) create an uneven response to a theme-family change. This is a pre-existing condition, not caused by this audit.
- The mobile `data-theme` currently defaults to `light`, so the group header can disagree with the global dark mode today.

## Deferred Work

- Implement Option B (toggle wiring), with the tests in §10.
- Bridge the desktop `cost-pricing-sheet-form.css` literals to `--bd-*` if desktop must track the theme family.
- Remove the now-redundant local `data-theme` after the controlled theme is verified on device.
- Run a device and desktop visual check across at least two theme families.
