# CPS Mobile Fold Image Reconstruction And Group Membership Report

This report was written by Codex on 2026-10-01 via Codex desktop.

## Objective

Correct the live Cost & Pricing Sheet mobile and fold form.

Use the attached good screenshot as the primary source for the mobile line item layout.

Fix row creation so the base Add Line Item action always creates an ungrouped item.

## Scope

The work changed only the CPS form presentation and CPS-owned row creation helpers.

The work did not change the database, importer contract, calculations, PDF output, View page, Client Picker architecture, or Cloudinary workflow.

## Files changed

- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetFormPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-form.css`
- `src/domain/cps/row-operations.ts`
- `src/tests/critical/cpsRowOperations.test.js`
- `docs/reports/cost-pricing-sheet/cps-mobile-fold-image-reconstruction-group-membership-2026-10-01.md`

## Skills used

Skills used: image-to-code, vercel-react-best-practices, accessibility, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Source evidence

The attached good screenshot was inspected and used as the visual source of truth.

The `/skill:image-to-code` skill was loaded and used for screenshot-to-code reconstruction.

The candidate HTML was inspected as supporting evidence only. It was not modified.

## Changes made

The mobile Line Items toolbar now uses compact bounded controls for Columns, Import, and Markup. Clear All remains destructive and compact in the same toolbar composition when width allows it.

The mobile item composition now follows the screenshot order:

- item number and rail controls
- description
- sub-description or specification
- Make / Brand
- Photo
- Quantity and Unit
- CP Money Out and SP Money In
- TCP, TSP, and Profit
- Margin
- Insert Below

The description and sub-description fields now use shorter mobile heights, tighter padding, and clearer hierarchy.

Quantity and Unit now use a compact side-by-side mobile grid.

CP and SP now use a compact side-by-side mobile grid. Their cost and selling visual treatments remain distinct.

Before this change, TCP, TSP, and Profit could appear as large stacked mobile blocks. After this change, they appear as three compact cells on one horizontal row, as shown in the screenshot. Margin is now a compact line below that row.

The group header now uses a compact dark transition bar with a remove control, group title, item count, and explicit Add Item action.

The item-card layout is denser. It keeps touch targets usable and keeps editable text at a mobile-safe size.

Header prototype labels were not restored. Draft, Phone, Mobile/Fold Workspace, Desktop Workspace, candidate text, and device labels remain absent from production UI.

Notes remains at the bottom of the form. It was not moved back into Document Details.

## Group membership behavior

The base Add Line Item action now creates a row with `group_id: null`.

This is true when there are no groups, one group, or multiple groups.

Add Group creates a section row. It does not capture unrelated rows.

Add Item to Group creates an item with the explicit target group id.

Group membership now comes from `row.group_id`. Physical adjacency does not define membership.

The renderer now supports non-contiguous group membership without row reordering.

Insert Below keeps the current explicit semantics. If used inside a grouped item, the inserted row uses that item group id. If used inside an ungrouped item, the inserted row uses `group_id: null`.

## Tests added

Added focused CPS row operation tests for:

- Add Line Item with zero groups
- Add Line Item with one existing group
- Add Line Item with multiple existing groups
- Add Item to Group A
- Add Item to Group B
- ungrouped item creation after a grouped item
- no mutation of existing groups during ungrouped item creation
- non-contiguous group membership without row reordering
- explicit group insert index behavior

## Locked contracts

The Longcat CPS import contract was not semantically modified.

The import regression tests still pass.

The calculation and Instant Markup code paths were not changed.

The Client Picker and Add Client architecture were not changed.

The Cloudinary photo workflow was not changed.

Keyboard-safety rules remain in place. The existing keyboard-open Save FAB hiding and keyboard inset CSS were preserved.

## Verification

- `bun run typecheck`: passed
- `bun test src/tests/critical/cpsRowOperations.test.js src/tests/critical/cpsImportView.test.js src/tests/critical/cpsInstantMarkup.test.js src/tests/critical/cpsNormalize.test.js`: passed, 43 tests
- `git diff --check`: passed
- Candidate HTML status check: passed, no modification
- `supabase db push`: not applicable
- `bun run audit:load`: not run, because no schema, query, or data-layer logic changed
- `bun run build`: skipped due to hardware policy

## Risks or limitations

Real-device review can still identify small visual differences in exact pixel spacing, Chrome viewport behavior, and font rendering.

The mobile reconstruction was made from the attached screenshot and production CSS. It was not validated with a physical device during this task.

## Deferred work

No deferred functional work is required for the Add Line Item group-membership bug.

Real-device visual review remains the final check for exact screenshot fidelity.
