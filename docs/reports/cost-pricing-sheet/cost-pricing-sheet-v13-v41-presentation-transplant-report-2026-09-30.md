# Cost & Pricing Sheet V13 V4.1 Presentation Transplant Report

This report was written by Codex on 2026-09-30 via Codex Desktop.

## Objective

Replace the rejected Cost & Pricing Sheet Form and View presentation.

Use the accepted V13 Form and V4.1 View HTML candidates as the visual contract.

Keep the working Cost & Pricing Sheet domain, save, import, photo, and calculation architecture.

## Scope

This task changed presentation and route binding only.

This task did not change database schema, Supabase queries, calculation formulas, PDF rendering, Forme, or Quotation and Invoice presentation.

## Files changed

- `src/components/boq/BoqEditor.tsx`
- `src/components/boq/BoqV13FormPresentations.tsx`
- `src/components/boq/boq-v13-form.css`
- `src/components/boq/BoqV41ViewPresentations.tsx`
- `src/components/boq/boq-v41-view.css`
- `src/pages/ViewBoq.tsx`
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-v13-v41-presentation-transplant-report-2026-09-30.md`

Pre-existing changed files were not edited by this task:

- `src/components/Layout.tsx`
- `src/components/layout/DesktopSidebar.tsx`
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-presentation-demolition-report-2026-09-30.md`

## Skills used

Skills used: html-prototype, frontend-design, vercel-react-best-practices, tailwind-css-patterns, accessibility, typescript-advanced-types, mobile-app-ui-design, capacitor-keyboard, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Replaced the temporary Form placeholder with a shared `BoqEditor` controller.
- Added explicit V13 desktop Form ownership in `BoqV13DesktopFormPresentation`.
- Added explicit V13 mobile/fold Form ownership in `BoqV13MobileFoldFormPresentation`.
- Added scoped V13 candidate CSS with hardcoded candidate visual values.
- Reconnected JSON Import, column management, photo upload, save, and Instant Markup.
- Replaced the temporary View placeholder with real persisted data loading.
- Added explicit V4.1 desktop View ownership in `BoqV41DesktopViewPresentation`.
- Added explicit V4.1 mobile/fold View ownership in `BoqV41MobileFoldViewPresentation`.
- Added scoped V4.1 candidate CSS with hardcoded candidate visual values.
- Kept user-facing terminology as `Cost & Pricing Sheet` on the Form and View surfaces.

## Old production presentation removed

- The old generic Form card composition is not used.
- The old generic View card/grid composition is not used.
- The deleted `BoqEditorParts.tsx` and `BoqFormPresentations.tsx` remain deleted.
- No surviving production import references the deleted presentation files.

## Structural fidelity matrix

| Candidate region | V13 desktop Form | V13 mobile/fold Form | V4.1 desktop View | V4.1 mobile/fold View | Production owner | Status |
|---|---|---|---|---|---|---|
| Outer shell | Sticky top bar and 1360px two-column room | 430px phone shell and 780px fold width | 1720px fluid schedule plus rail | 600px phone shell and 780px fold shell | CSS and presentation owners | PASS |
| Header | Back, title, number, mode, Save | Back, compact title, number, mode, phone/Fold save | Back, number, status, Download, Edit, Share, Customize, More | Compact app bar with number, status, Share, Customize, More | Form and View owners | PASS |
| Metadata | Four-column identity grid | Two-column identity grid | Dossier card with monogram and context | Dossier head plus context disclosure | Form and View owners | PASS |
| Primary toolbar/actions | Item, Group, Import, Columns, Instant Markup, Clear | Same action set in mobile toolbar | Top bar actions plus rail actions | App bar, FAB, More sheet | Form and View owners | PASS |
| Schedule body | Row rail, two-column item editor, commercial side | Phone row stack, fold recomposition by width | Continuous document surface | Continuous full-width document surface | Form and View owners | PASS |
| Groups | Gradient group header and bordered group wrapper | Full-bleed group wrapper | Group pipe with ghost letter | Group pipe with ghost letter | Form and View owners | PASS |
| Individual row treatment | Description first, sub-description, CP/SP, profit strip, photo | Touch-safe row stack with same fields | Number, description, compact photo, commercial column | Number, description, compact photo row, commercial block | Form and View owners | PASS |
| Pricing cells | CP and SP styled as cost/sell inputs | Same semantics, mobile sizing | Cost, Sell, Profit rows always visible | Cost, Sell, Profit rows always visible | Form and View owners | PASS |
| Photos | Add/replace/remove row photo | Add/replace/remove row photo | Read-only compact persisted thumbnail | Read-only compact persisted thumbnail | Form owner and View owner | PASS |
| Import | V13 toolbar entry opens JSON import | V13 toolbar entry opens JSON import | Not applicable | Not applicable | `BoqImportSheet` and Form owners | PASS |
| Column management | V13 toolbar entry opens column manager | V13 toolbar entry opens column manager | Not applicable | Not applicable | `ColumnManager` and Form owners | PASS |
| Instant Markup entry | Rail and toolbar entry | Toolbar entry | Not applicable | Not applicable | `BoqEditor` and Form owners | PASS |
| Instant Markup workspace | Right-dock style sheet | Bottom-sheet style sheet | Not applicable | Not applicable | `InstantMarkupDialog` | PASS |
| Totals | Static totals and sticky rail summary | In-flow totals close-out | In-flow summary and rail position | In-flow summary | Form and View owners | PASS |
| Close-out/footer | Notes and totals close-out | Notes and totals close-out | Formal close-out inside document | Formal close-out inside document | Form and View owners | PASS |
| Floating/fixed actions | Desktop top/rail Save only | Phone Save FAB, fold top Save | No desktop FAB | Download FAB and simulated bottom nav | Form and View owners | PASS |
| Customization | Out of scope for Form | Out of scope for Form | Customize action and PDF picker surface | Customize action and PDF picker surface | View owners | PARTIAL |
| Keyboard safety | Desktop not keyboard-sensitive | Single page scroll, 16px phone inputs, no 100vh primary form | View read-only | View read-only | CSS and presentation owners | PASS |

## Approximation notes

- The V4.1 group pipe uses an SVG pipe with candidate colors and animation. It does not run the prototype measurement script that computes exact path length.
- The View customization sheet visually represents the candidate template, font, and colour controls. It does not implement PDF rendering or persistent customization.
- The View action rows for Download, Share, CSV, Archive, and Delete are visual affordances where this task had no production action requirement.
- Browser screenshot validation was not run. Static inspection and typecheck cannot prove pixel-perfect fidelity.

## User-visible BOQ terminology

No user-visible `BOQ` text remains in the implemented Form and View surfaces.

The repository list screen still contains legacy `BOQ` labels. That screen was out of scope for this task.

## Candidate styling

Hardcoded candidate colors, borders, shadows, radii, spacing, density, and light/dark variable sets were added in scoped CSS:

- `boq-v13-form.css`
- `boq-v41-view.css`

The styles are scoped to `.cps-v13` and `.cps-v41`.

## Static keyboard-risk findings

- The Form uses document-level scrolling.
- The Form does not use a primary container locked to `100vh`.
- The mobile Form uses `font-size: 16px` for inputs at phone width to reduce iOS zoom risk.
- The phone Save FAB clears the bottom safe area.
- The Instant Markup sheet uses `max-height: 86dvh` and internal scrolling only inside the active sheet.
- Presentation selection uses layout mode and fold state. It does not use visual viewport height.
- Device keyboard behavior still needs human device validation.

## Business architecture preserved

- `BoqFormPage` still owns create/edit orchestration.
- `NewBoq.tsx` and `EditBoq.tsx` remain route delegators.
- `useBoqSave` and `useDocumentSave` remain the save path.
- `computeBoqTotals()` remains the authoritative CPS costing engine.
- `computeDocument()` remains separate through the CPS adapter.
- Instant Markup still calls the domain preview and apply functions.
- JSON Import still applies through `BoqImportSheet` and `applyBoqImport()`.
- Photos still upload through `uploadItemPhoto()`.
- View still uses `buildBoqViewData()` and real persisted data.

## Verification result

- `git status` before changes: captured.
- `bun run typecheck`: passed.
- Focused CPS tests: passed.
  - `src/tests/critical/boqInstantMarkup.test.js`
  - `src/tests/critical/boqNormalize.test.js`
  - `src/tests/critical/boqImportView.test.js`
- `git diff --check`: passed. Git reported line-ending warnings only.
- `git status` after changes: captured. Scoped task files are changed. Pre-existing `Layout.tsx`, `DesktopSidebar.tsx`, and the previous demolition report remain changed.
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `supabase db push`: not applicable. No SQL changed.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

Supabase push status: not applicable.

No migration was created.

## Risks or limitations

- Pixel-level parity needs browser screenshot review.
- The V4.1 group pipe animation is visually translated, but the exact prototype measurement routine is not ported.
- PDF customization is a visual continuity surface only.
- Download and destructive View actions remain non-mutating visual affordances unless already backed elsewhere.

## Deferred work

- Human desktop visual test against V13 and V4.1 candidates.
- Human phone and fold visual test.
- Human mobile keyboard test with metadata, row, CP, SP, quantity, import, and Instant Markup inputs.
- Future production work for PDF/Forme/customization persistence.
