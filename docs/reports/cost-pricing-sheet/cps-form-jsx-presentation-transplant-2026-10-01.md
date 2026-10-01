# CPS Form JSX Presentation Transplant Report

This report was written by Codex on 2026-10-01 via Codex desktop.

## Objective

- Transplant the CPS Form presentation from `docs/templates/react-temps/form/cps-j2.jsx`.
- Keep the existing BIGDROPS CPS domain logic.
- Keep the existing CPS persistence, import, markup, client, photo, and calculation workflows.

## Scope

- The work changed the CPS Form presentation only.
- The work did not change database schema.
- The work did not change CPS View files during this task.
- CPS View files were already modified before this task started. They remain in the worktree.
- The template file was a read-only source artifact.

## Files Changed

- `src/components/cps/CostPricingSheetFormPresentations.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CpsImportSheet.tsx`
- `src/components/cps/cost-pricing-sheet-form.css`
- `docs/reports/cost-pricing-sheet/cps-form-jsx-presentation-transplant-2026-10-01.md`

Related pre-existing worktree files were not edited in this task:

- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-view.css`
- `src/domain/cps/viewData.ts`
- `src/pages/ViewCps.tsx`
- `src/domain/cps/row-operations.ts`
- `src/tests/critical/cpsRowOperations.test.js`

## Skills Used

Skills used: vercel-react-best-practices, vercel-composition-patterns, accessibility, tailwind-capacitor, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Source Template

- Source file: `docs/templates/react-temps/form/cps-j2.jsx`
- Use: presentation source only.
- Not used: demo state, demo clients, demo rows, demo import, demo photo storage, demo calculations, demo markup state, and demo theme ownership.

## Changes Made

- Transplanted the template item row structure into the production Form.
- Restored the right-side item X as the row delete control.
- Kept the duplicate/copy rail control as a disabled placeholder.
- Transplanted the compact sub-description toggle, preview, rail, and editable area.
- Moved Make / Brand and Photo into the template item-field flow.
- Kept Qty and Unit as compact side-by-side controls.
- Kept CP and SP as compact side-by-side controls with arrow labels.
- Kept TCP, TSP, and Profit as compact three-column summary cells.
- Kept Margin as a compact line below the summary cells.
- Kept Insert Below as a small item-level action.
- Transplanted the compact group header and group footer pattern.
- Kept Add item to this group as an explicit group action.
- Transplanted the compact Columns sheet presentation.
- Transplanted the CPS Import sheet presentation while keeping the production importer.
- Added the CPS clear-all confirmation presentation.
- Extended CPS CSS with template-derived sheet, item, group, import, column, and dialog classes.

## Prototype Behavior Not Transplanted

- The template sample clients were not copied.
- The template sample rows were not copied.
- The template local save handler was not copied.
- The template local calculation code was not copied.
- The template markup persistence model was not copied.
- The template FileReader photo storage was not copied.
- The template JSON parse/import rules were not copied.
- The template theme switcher was not copied.
- Prototype labels such as Draft, Phone, Fold, Workspace, Desktop, and version text were not added.

## Production Mapping

- Row creation still uses CPS row-operation helpers.
- Base Add Line Item creates `group_id: null`.
- Add Item to Group passes the target group id to row insertion.
- Insert Below preserves the source row group id.
- Group membership remains explicit through `row.group_id`.
- CPS import still uses `cpsImportSchema` and `applyCpsImport`.
- CPS calculations still use the existing CPS totals adapter.
- Client selection still uses the existing production ClientSelector flow.
- Photo upload still uses the existing production Cloudinary path.
- Notes remain at the bottom of the form.

## Visual Deviations

- The Client Picker implementation remains the shared production component. This preserves search, create, select, clear, `client_id`, and `client_snapshot`.
- The duplicate icon is a disabled placeholder. This preserves the approved non-mutating behavior until duplication is implemented.
- Group member rows stay in source order. They are not visually nested by adjacency because `group_id` is the membership source of truth.

## Verification

- `bun run typecheck`: passed.
- `bun test src/tests/critical/cpsRowOperations.test.js src/tests/critical/cpsImportView.test.js src/tests/critical/cpsInstantMarkup.test.js src/tests/critical/cpsNormalize.test.js`: passed, 47 tests.
- `git diff --check`: passed.
- `git status --short`: completed. It shows this task's modified files and pre-existing modified View files.
- `bun run audit:load`: not applicable. No schema, query, or data-layer logic was touched.
- `supabase db push`: not applicable. No SQL changed.
- `bun run build`: skipped due to hardware policy.

## Static Checks

- `docs/templates/react-temps/form/cps-j2.jsx` was not edited.
- CPS View files were not edited during this task.
- CPS importer files were not edited.
- Calculation source files were not edited.
- No database migration was added.
- No prototype or device labels were found in the edited CPS Form files.

## Risks Or Limitations

- Final visual fidelity still needs physical-device review on the target Android phone and fold widths.
- The worktree contains pre-existing CPS View changes. They are outside this task and were not reverted.
- The template source file is currently untracked in the worktree. It was present before this task and was used read-only.

## Deferred Work

- Implement duplicate row behavior in a separate task if product owners approve it.
- Perform real-device review for visual parity with `cps-j2.jsx`.
