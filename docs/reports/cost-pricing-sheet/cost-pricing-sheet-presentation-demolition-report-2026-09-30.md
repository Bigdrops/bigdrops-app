# Cost & Pricing Sheet Presentation Demolition Report

This report was written by Codex on 2026-09-30 via Codex Desktop.

## Objective

Remove the rejected Cost & Pricing Sheet Form and View presentation.

Stop after demolition.

Do not implement V13 Form or V4.1 View.

## Scope

This task removed rejected production presentation surfaces only.

This task preserved CPS domain and workflow infrastructure.

## Files changed

- `src/components/boq/BoqEditor.tsx`
- `src/components/boq/BoqEditorParts.tsx`
- `src/components/boq/BoqFormPresentations.tsx`
- `src/pages/ViewBoq.tsx`
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-presentation-demolition-report-2026-09-30.md`

## Skills used

Skills used: vercel-react-best-practices, typescript-advanced-types, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Dependency graph before deletion

The rejected form graph was:

- `src/pages/BoqFormPage.tsx`
  - imported `src/components/boq/BoqEditor.tsx`
- `src/components/boq/BoqEditor.tsx`
  - imported `src/components/boq/BoqEditorParts.tsx`
  - imported `src/components/boq/BoqFormPresentations.tsx`
  - imported `src/components/boq/BoqImportSheet.tsx`
  - imported `src/domain/boq/instant-markup.ts`
  - imported `src/lib/itemPhotoUpload.ts`
  - imported `src/domain/boq/calculations.ts`
  - imported `src/domain/boq/columns.ts`
- `src/components/boq/BoqFormPresentations.tsx`
  - imported `src/components/boq/BoqEditorParts.tsx`

The rejected view graph was:

- `src/components/app/AppShell.tsx`
  - lazy-loaded `src/pages/ViewBoq.tsx`
- `src/pages/ViewBoq.tsx`
  - imported `src/domain/boq/viewData.ts`
  - imported `src/domain/boq/normalize.ts`
  - rendered the rejected View presentation.

## DELETED

- `src/components/boq/BoqEditorParts.tsx`
  - Deleted because it contained rejected row, metric, rail, preview, and photo presentation components.
- `src/components/boq/BoqFormPresentations.tsx`
  - Deleted because it contained the rejected desktop and mobile/fold form compositions.

## PRESERVED

- `src/pages/BoqFormPage.tsx`
  - Preserved. It owns create/edit orchestration.
- `src/pages/NewBoq.tsx`
  - Preserved. It remains a thin route delegator.
- `src/pages/EditBoq.tsx`
  - Preserved. It remains a thin route delegator.
- `src/hooks/useBoqSave.ts`
  - Preserved. It owns the CPS `useDocumentSave` strategy.
- `src/domain/boq/calculateBoqTotals.ts`
  - Preserved. It owns authoritative CPS costing totals.
- `src/domain/boq/calculations.ts`
  - Preserved. It is the CPS calculation adapter.
- `src/domain/boq/instant-markup.ts`
  - Preserved. It owns Instant Markup domain behavior.
- `src/domain/boq/importAdapter.ts`
  - Preserved. It owns CPS JSON import parsing and state application.
- `src/components/boq/BoqImportSheet.tsx`
  - Preserved. It is reusable import infrastructure for the future V13 entry point.
- `src/domain/boq/normalize.ts`
  - Preserved. It owns persistence normalization and row/photo round trip.
- `src/domain/boq/columns.ts`
  - Preserved. It owns reusable CPS column definitions.
- `src/domain/boq/viewData.ts`
  - Preserved. It is presentation-neutral View data preparation.
- `src/lib/itemPhotoUpload.ts`
  - Preserved. It owns the Cloudinary item photo upload helper.
- `src/tests/critical/boqInstantMarkup.test.js`
  - Preserved. It verifies Instant Markup semantics.
- `src/tests/critical/boqNormalize.test.js`
  - Preserved. It verifies BOQ/CPS normalization.
- `src/tests/critical/boqImportView.test.js`
  - Preserved. It verifies import, photo metadata, and view-data mapping.

## DECOUPLED

- `src/components/boq/BoqEditor.tsx`
  - The rejected mixed controller/presentation implementation was removed.
  - The file now contains only a minimal neutral route boundary.
  - It keeps the `BoqEditor` import contract used by `BoqFormPage`.
- `src/pages/ViewBoq.tsx`
  - The rejected View presentation was removed.
  - The file now contains only a minimal neutral route boundary.
  - It keeps the route import contract used by `AppShell`.

## TEMPORARY ROUTE BOUNDARIES

- `src/components/boq/BoqEditor.tsx`
  - Message: `Cost & Pricing Sheet form presentation pending V13 implementation.`
  - Purpose: keep New/Edit routes compilable.
  - It contains no row layout, pricing workspace, rail, Instant Markup UI, import trigger, photo UI, or V13 approximation.
- `src/pages/ViewBoq.tsx`
  - Message: `Cost & Pricing Sheet view presentation pending V4.1 implementation.`
  - Purpose: keep the View route compilable.
  - It contains no document layout, groups, totals, actions, or V4.1 approximation.

## UNTOUCHED CANDIDATES

The following accepted candidate files were not edited:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v13-desktop.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v13-mobile-fold.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-desktop-v4.1.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-mobile-fold-v4.1.html`

## DEPENDENCY CHECK

The exact import search found no surviving production imports for:

- `@/components/boq/BoqEditorParts`
- `@/components/boq/BoqFormPresentations`
- `BoqDesktopFormPresentation`
- `BoqMobileFoldFormPresentation`

The deleted presentation components are no longer reachable.

## DOMAIN SAFETY

The following remain available for the rebuild:

- CPS costing calculations.
- CPS calculation adapter.
- `computeDocument()` separation.
- Instant Markup domain logic.
- JSON Import adapter and sheet.
- Cloudinary photo upload helper.
- Row photo metadata persistence.
- BOQ/CPS normalization.
- Column domain definitions.
- View data preparation.
- `useBoqSave`.
- `useDocumentSave` integration.
- New/Edit route delegation.
- Create/Edit route contracts.

## NO REBUILD

No V13 Form production presentation was implemented.

No V4.1 View production presentation was implemented.

No candidate HTML file was changed.

The final visual state is intentionally incomplete.

## Verification result

- `git status` before changes: captured.
- Focused CPS tests: passed.
  - `src/tests/critical/boqInstantMarkup.test.js`
  - `src/tests/critical/boqNormalize.test.js`
  - `src/tests/critical/boqImportView.test.js`
- `bun run typecheck`: passed.
- `bun run audit:load`: not run. No query, schema, or data-layer logic changed.
- `git diff --check`: passed. Git reported line-ending warnings only for modified TypeScript files.
- `git status` after changes: captured. Only scoped demolition files and this report are changed.
- `supabase db push`: not applicable. No SQL changed.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

Supabase push status: not applicable.

No migration was created.

## Risks or limitations

- New/Edit/View routes are intentionally not visually usable.
- The future V13 and V4.1 implementation must reconnect preserved import, photo, column, Instant Markup, save, and calculation infrastructure.
- `BoqImportSheet` remains available as reusable import infrastructure, but it is not currently reachable from the neutral form boundary.

## Deferred work

- Implement the accepted V13 Form from the candidate files.
- Implement the accepted V4.1 View from the candidate files.
- Reconnect preserved CPS JSON Import, Cloudinary photos, columns, and Instant Markup through the accepted V13 surface.
