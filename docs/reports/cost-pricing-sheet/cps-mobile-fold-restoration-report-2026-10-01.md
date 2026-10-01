# CPS Mobile Fold Restoration Report

This report was written by Codex on 2026-10-01 via Codex desktop.

## Objective

Restore the live Cost & Pricing Sheet mobile and fold presentation from the last known-good repository implementation.

Keep the valid explicit group membership fixes from the later work.

## Scope

The work changed the CPS form presentation, CPS row operation helpers, and focused CPS row operation tests.

The work did not change the database, migrations, importer contract, calculations, Instant Markup formulas, Client Picker architecture, Cloudinary workflow, PDF output, or View page.

## Files changed

- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetFormPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-form.css`
- `src/domain/cps/row-operations.ts`
- `src/tests/critical/cpsRowOperations.test.js`
- `docs/reports/cost-pricing-sheet/cps-mobile-fold-restoration-report-2026-10-01.md`

## Skills used

Skills used: gitnexus-exploring, gitnexus-refactoring, vercel-react-best-practices, accessibility, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Restoration source

The historical source was commit `a38dc30d`, `feat(cps): add cost pricing sheet module from BOQ migration`.

`git log` showed this as the tracked history source for the CPS presentation files.

The restoration compared the current uncommitted reconstruction against `HEAD` for:

- `src/components/cps/CostPricingSheetFormPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-form.css`
- `src/components/cps/CostPricingSheetEditor.tsx`

## Restored from history

The Line Items toolbar geometry was restored from `HEAD`.

The mobile item spacing, field height, sub-description treatment, and row-data spacing were restored from `HEAD`.

The group bar height, padding, action sizing, and Add Item footer were restored from `HEAD`.

The mobile edge and gutter behavior came from the `HEAD` stylesheet. No new gutter system was added.

The compact header geometry remained from the known-good implementation. No large mobile title treatment was added.

## Preserved later functionality

The base Add Line Item action still creates an independent row with `group_id: null`.

Add Item to Group now passes the explicit target group id.

Insert Below keeps the source row membership:

- grouped source item: inserted row gets that group id
- ungrouped source item: inserted row gets `group_id: null`

Group membership remains explicit. `row.group_id` is the source of truth.

Physical row adjacency does not determine membership.

Non-contiguous group membership can exist without row reordering.

## Presentation details

CP now displays the approved `↓ CP` label.

SP now displays the approved `↑ SP` label.

The rejected `CP Money Out` and `SP Money In` labels were removed.

The sub-description presentation was restored to the historical rail/accent treatment.

The right-side item control is now an X button. It removes the intended item row.

The row rail duplicate control is restored with a copy icon. It is a disabled placeholder. It does not delete a row and does not mutate CPS state.

Each group has a clear Add Item to Group action in the header and footer. The action assigns the target group id.

TCP, TSP, and Profit remain a compact horizontal mobile summary row. This is the only retained visual exception to the historical CSS because it was an explicitly approved later improvement.

Notes remains at the bottom of the form.

No Draft, Phone, Mobile/Fold Workspace, Desktop Workspace, candidate, or device label was restored.

## Locked contracts

The Longcat CPS import contract was not semantically modified.

The importer still preserves source item order and explicit `grp_N` / `item_N` relationships.

The CP/SP calculation semantics were not changed.

Instant Markup was not changed.

Client Picker and Add Client behavior were not changed.

Cloudinary photo behavior was not changed.

Keyboard safety rules were preserved.

## Verification

- `bun test src/tests/critical/cpsRowOperations.test.js src/tests/critical/cpsImportView.test.js src/tests/critical/cpsInstantMarkup.test.js src/tests/critical/cpsNormalize.test.js`: passed, 47 tests
- `bun run typecheck`: passed
- `git diff --check`: passed with line-ending warnings only
- `git status`: changed CPS files, row-operation helper, CPS row-operation tests, and reports present
- Candidate HTML status check: passed, no modification
- `supabase db push`: not applicable
- `bun run audit:load`: not run, because no schema, query, or data-layer logic changed
- `bun run build`: skipped due to hardware policy

## Risks or limitations

Physical-device review is still required for exact visual confirmation of the restored mobile and fold presentation.

## Deferred work

Duplicate row behavior remains intentionally deferred. The restored copy icon is a placeholder only.
