# Cost & Pricing Sheet End-to-End Human Test Readiness Report

This report was written by Codex on 2026-09-29 via Codex Desktop.

## Objective

Complete the Cost & Pricing Sheet workflow for human testing.

The required loop is:

JSON Import -> Create CPS -> Save -> View CPS -> Edit CPS -> Save changes -> View updated CPS.

## Scope

This task covered:

- Form presentation separation.
- JSON import.
- Photo upload and persistence metadata.
- Real persisted View page.
- Edit hydration through the shared form page.
- Focused tests for import, normalization, Instant Markup, and View data.

This task did not implement:

- PDF rendering.
- Forme.
- PDF customization.
- Activity Trail UI.
- Related Documents UI.
- Repository-wide BOQ to CPS identifier rename.

## Files changed

- `src/components/boq/BoqEditor.tsx`
- `src/components/boq/BoqEditorParts.tsx`
- `src/components/boq/BoqFormPresentations.tsx`
- `src/domain/boq/columns.ts`
- `src/domain/boq/importAdapter.ts`
- `src/domain/boq/viewData.ts`
- `src/pages/ViewBoq.tsx`
- `src/tests/critical/boqImportView.test.js`
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-end-to-end-human-test-readiness-report-2026-09-29.md`

This task also builds on earlier CPS files in the same working tree:

- `src/pages/BoqFormPage.tsx`
- `src/hooks/useBoqSave.ts`
- `src/components/boq/BoqImportSheet.tsx`
- `src/lib/itemPhotoUpload.ts`

## Skills used

Skills used: vercel-react-best-practices, typescript-advanced-types, tailwind-css-patterns, mobile-app-ui-design, accessibility, supabase, html-prototype, karpathy, capacitor-keyboard, tailwind-capacitor

Documentation standard: ASD-STE100 Simplified Technical English

## Standards used

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- `docs/standard/json-import-standard.md`
- `docs/standard/document-image-upload-policy.md`
- `docs/standard/document-form-consolidation-standard.md`
- `docs/standard/document-save-orchestration.md`
- `docs/standard/fab-standard.md`
- `docs/standard/document-column-standard.md`

## Changes made

- Kept `BoqFormPage` as the shared new/edit orchestration layer.
- Kept `useBoqSave` as the `useDocumentSave` strategy boundary.
- Kept `BoqEditor` as the shared form controller.
- Added `BoqDesktopFormPresentation`.
- Added `BoqMobileFoldFormPresentation`.
- Kept one shared state, row model, calculation model, import path, photo path, and save path for both presentations.
- Replaced the dead `ViewBoq` placeholder with a real persisted-data View page.
- Added `buildBoqViewData()` for authoritative View rows and totals.
- Strengthened the CPS JSON import adapter:
  - deterministic group IDs;
  - grouped row ordering;
  - CP and SP preservation;
  - photo URL preservation;
  - item custom fields mapped to deterministic BOQ custom columns.
- Added row-editor support for imported custom columns.
- Preserved Instant Markup behavior.
- Preserved semantic theme-token styling.

## End-to-end readiness

| Step | Status | Evidence |
|---|---|---|
| Open New CPS | PASS | `NewBoq.tsx` delegates to `BoqFormPage`; `BoqFormPage` loads a new BOQ model. |
| JSON Import | PASS | `BoqImportSheet` uses shared `JsonImportLayout`; `applyBoqImport()` populates real form state. |
| Inspect imported data | PASS | Imported groups, rows, CP, SP, photos, and custom fields render in the form. |
| Modify data | PASS | Shared controller updates `table_rows` and metadata. |
| Use Instant Markup | PASS | Existing domain logic and tests remain passing. |
| Add item photos | PASS | Form uses `documentImageUploadPolicy` and the Cloudinary upload path. |
| Save | PASS | `useBoqSave` uses `useDocumentSave`. |
| View CPS | PASS | `ViewBoq` loads `boqs` and `boq_rows`, normalizes data, and renders real rows. |
| Edit CPS | PASS | `EditBoq` delegates to `BoqFormPage`; edit hydration uses `normalizeDbBoq()`. |
| Save edited CPS | PASS | Edit save uses the shared save strategy and row persistence. |
| View updated CPS | PASS | Save navigation returns to `/boqs/:id`; View reloads persisted data. |

## Form architecture result

Desktop and mobile/fold now have separate frontend presentation components:

- `BoqDesktopFormPresentation`
- `BoqMobileFoldFormPresentation`

They consume the same controller props from `BoqEditor`.

They do not duplicate:

- form state;
- domain state;
- calculation logic;
- Instant Markup logic;
- validation;
- normalization;
- persistence;
- save orchestration;
- import semantics;
- photo upload infrastructure.

## View result

`ViewBoq` now shows:

- document identity;
- title;
- status;
- metadata;
- groups;
- ungrouped rows;
- continuous item numbering;
- descriptions;
- specification;
- make/brand;
- quantity and unit;
- CP;
- SP;
- cost;
- selling amount;
- profit;
- margin;
- totals;
- notes;
- item photos;
- Edit action;
- placeholder customization/export/share actions where backing work is out of scope.

The View uses `buildBoqViewData()` and `computeBoqCommercialView()`.

## JSON import result

Import supports:

- document title;
- client/project;
- site/reference;
- groups;
- item rows;
- description;
- sub-description/specification;
- make/brand;
- quantity;
- unit;
- CP;
- SP;
- image URL;
- row notes;
- item custom fields.

Imported values use the same production `Boq` and `TableDocumentRow` state as manual entries.

## Photo result

Photos use:

- `src/lib/documentImageUploadPolicy.ts`
- `src/lib/itemPhotoUpload.ts`
- the existing Cloudinary cloud and unsigned preset used by Invoice item photos.

Photo metadata survives the static round trip:

upload URL -> row state -> save row cells/custom row data -> normalize -> View/Edit row state.

## Mobile and keyboard-risk result

The implementation avoids the main keyboard-risk patterns by static inspection:

- The primary mobile form uses normal page scrolling.
- The mobile form does not use a fixed viewport-height workspace.
- Desktop/mobile/fold selection is based on layout mode, not visual viewport height changes during input.
- Row inputs use normal DOM inputs inside the page flow.
- Save uses the existing `FormFooter`.
- Import uses the shared sheet.

Device keyboard behavior was not verified in a browser or on a physical device in this task.

Human testing must still verify:

- focused CP/SP inputs stay visible with the software keyboard open;
- import JSON textarea remains usable with the keyboard open;
- `FormFooter` does not cover the focused input when the keyboard is closed or dismissed;
- no viewport jump occurs on mobile/fold.

## Verification result

- `git status` before changes: captured. The working tree already had many pre-existing changes.
- `bun run audit:load`: passed with existing repository warnings.
- `bun run typecheck`: passed.
- Focused CPS/BOQ tests: passed.
  - `src/tests/critical/boqInstantMarkup.test.js`
  - `src/tests/critical/boqNormalize.test.js`
  - `src/tests/critical/boqImportView.test.js`
- `git diff --check`: passed. Git reported line-ending warnings only.
- `supabase db push`: not applicable. No schema migration was created.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

Supabase push status: not applicable.

No schema change was made.

## Risks or limitations

- View V4.1 is implemented for the human test loop, but PDF/Forme/export actions remain disabled placeholders.
- The customization affordance is present as a disabled surface only.
- Mobile/fold keyboard behavior was inspected statically, not validated on device.
- Import update/merge mode is not implemented.
- Existing repository warnings from `audit:load` remain outside this task.
- The working tree contains many pre-existing unrelated changes.

## Deferred work

- Physical mobile/fold keyboard validation.
- Full V4.1 action backing for export, share, duplicate, archive, delete, and conversion.
- PDF/Forme rendering.
- Activity Trail UI.
- Related Documents UI.
- Import update/merge mode.

## Final status

The Cost & Pricing Sheet workflow is ready for the requested human test loop.

Classification:

- Form controller and shared state: PASS.
- Separate desktop and mobile/fold presentation components: PASS.
- JSON import into real form state: PASS.
- Photo upload path and metadata round trip: PASS by static/domain verification.
- Save and edit orchestration: PASS.
- Real persisted View: PASS.
- Instant Markup regression: PASS.
- Mobile/fold keyboard safety: STATIC PASS, pending device validation.
