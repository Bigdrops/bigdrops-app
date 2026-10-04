# CPS Instant Markup Stackable Pricing Report

This report was written by Codex on 2026-10-04 via OpenCode Local Runner.

## Objective

Implement stackable Instant Markup pricing for Cost & Pricing Sheet.

The old behavior derived each new selling price from Cost Price.

The new behavior derives each new selling price from the current working Selling Price.

## Scope

The change is limited to Instant Markup.

No schema changed.

No Supabase change was made.

No CPS calculation formula changed.

No CPS View, conversion, PDF, import, column, photo, numbering, or navigation behavior was changed for this task.

## Skills Used

Skills used: karpathy, react-dev, typescript-advanced-types, frontend-design, systematic-debugging

Documentation standard: ASD-STE100 Simplified Technical English

## Files Inspected

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- `src/domain/cps/instant-markup.ts`
- `src/components/cps/CpsMarkupSheet.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetFormPresentations.tsx`
- `src/tests/critical/cpsInstantMarkup.test.js`
- `src/tests/critical/cpsMarkupPresentation.test.js`
- `src/tests/critical/cpsCalculationAuthority.test.js`
- `src/tests/critical/cpsRowOperations.test.js`

## Old Semantics

Instant Markup used CP as the base.

Percentage:

`new SP = CP * (1 + percentage / 100)`

Fixed value:

`new SP = CP + value`

This could reduce a row that already had a marked-up SP.

## New Semantics

Instant Markup now uses current working SP as the base.

Percentage:

`new SP = current working SP * (1 + percentage / 100)`

Fixed value:

`new SP = current working SP + value`

The domain engine owns these formulas.

The sheet does not implement markup math.

## Working-State Ownership

`CostPricingSheetEditor` owns a sheet-session workspace named `markupWorkingRows`.

The workspace starts as a copy of the current form rows when Instant Markup opens.

Preview reads from the workspace.

Stack Operation writes the preview result back to the workspace and keeps the sheet open.

Apply commits the workspace through `updateRows(finalRows)`.

Intermediate stack operations do not write to Supabase.

## Sequential Lifecycle

Example:

1. Open Instant Markup.
2. Enter `5%`.
3. Preview the next stack.
4. Stack Operation writes the proposed SP into `markupWorkingRows`.
5. Enter `600`.
6. Preview the next stack.
7. Apply commits the cumulative working SP values to the form.

## Preview Semantics

Preview now compares current working SP to proposed next SP.

The aggregate preview compares the current working selling total to the proposed next selling total.

CP stays visible as reference data.

Profit and margin use `computeCpsRowEconomics()` and `computeCpsCommercialView()`.

No presentation-owned profit or margin formula was added.

## CP Immutability

The implementation changes only `sp` for item rows.

It does not mutate:

- `cp`
- `quantity`
- description fields
- row identity
- group membership
- custom fields

## Zero-SP Behavior

The base is current SP.

If SP is zero:

- Fixed value stacks from zero.
- Percentage stacks from zero and remains zero.

The implementation does not fall back to CP.

## Eligibility Behavior

The existing no-CP eligibility rule remains.

Rows with zero or missing CP remain ineligible for markup operations.

They remain visible in the sheet.

Reset still zeros all item working SP values in the workspace, including currently excluded and no-CP item rows.

## Enumeration Behavior

The sheet now uses item enumeration as the leading row marker.

The enumeration is continuous across grouped and ungrouped item rows.

Section rows do not consume item numbers.

The enumeration is presentation-only.

It is not written to CPS rows.

## Excluded-Row Behavior

Excluded rows stay visible.

The whole row uses muted Theme Manager tokens.

The row remains readable.

Excluded rows do not receive the next stack operation.

If the user includes the row again, it can participate in a later operation.

## Reset Semantics

Reset is a destructive workspace action.

It requires confirmation.

The confirmation text states that current working selling prices will be set to zero.

Reset does not restore opening prices.

Reset does not restore CP.

Reset does not close the sheet.

## Reset Population

Reset zeros all item rows represented by the markup workspace.

This includes:

- included item rows
- excluded item rows
- item rows with no CP

Section rows stay unchanged.

## Undo Reset Snapshot Lifecycle

Before Reset, the editor captures a complete copy of the current markup workspace in `resetUndoRows`.

Undo Reset restores that exact snapshot.

Undo Reset does not calculate from CP.

Undo Reset clears the snapshot after restore.

Only one immediate Reset snapshot is kept.

## Undo Boundaries

The new Reset undo uses `resetUndoRows`.

The existing post-Apply form undo still uses `undoRows`.

These are separate state machines.

The Reset snapshot does not replace the form-level post-Apply undo snapshot.

## Apply Boundary

Final Apply still uses the existing production authority:

`markup workspace -> updateRows(finalRows) -> productionRowsRevision -> form synchronization -> normal CPS save`

No direct Supabase write was added to `CpsMarkupSheet`.

## Files Changed

- `src/domain/cps/instant-markup.ts`
- `src/components/cps/CpsMarkupSheet.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/tests/critical/cpsInstantMarkup.test.js`
- `src/tests/critical/cpsMarkupPresentation.test.js`
- `src/tests/critical/cpsCalculationAuthority.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-instant-markup-stackable-pricing-pass.md`

## Tests Added Or Updated

- Updated Instant Markup tests for SP-based stacking.
- Added sequential stacking coverage.
- Added zero-SP behavior coverage.
- Added reset-to-zero coverage.
- Updated calculation authority coverage for SP-based markup.
- Added presentation guards for enumeration, muted excluded rows, Reset, Undo Reset, and workspace commit boundaries.

## Verification

- `bun run node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/cpsInstantMarkup.test.js src/tests/critical/cpsMarkupPresentation.test.js src/tests/critical/cpsCalculationAuthority.test.js`: passed
- `bun run node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/cpsRowOperations.test.js`: passed
- `bun run typecheck`: passed
- `bun run build`: skipped due to hardware policy
- `bun run audit:load`: not applicable. No schema, query, or data-layer logic changed.
- `supabase db push`: not applicable. No migration was required.

## Pre-Existing Working-Tree Changes

The following changes existed before this task's edits:

- `docs/standard/prefix-engine-settings-standard.md`
- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/pdf/index.ts`
- `src/components/pdf/templates/CpsSchedule.tsx` deleted
- `src/components/pdf/types.ts`
- `src/domain/cps/conversion.ts`
- `src/domain/cps/normalize.ts`
- `src/domain/cps/pdfDownloadHandler.ts`
- `src/domain/prefixConstants.ts`
- `src/pages/ViewCps.tsx`
- `src/pages/view-cps-actions.ts`
- `src/tests/critical/cpsConversion.test.js`
- `src/tests/critical/cpsPdf.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-conversion-options-pdf-prefix-production-pass.md`
- `src/components/cps/CpsConversionOptionsSheet.tsx`
- `src/components/pdf/forme/`
- `src/tests/critical/cpsPrefix.test.js`

Additional pre-existing changes appeared in the working tree during this session. They were not edited for this task.

## Risks Or Limitations

Runtime phone validation was not performed.

The desktop dialog received the same stack/reset behavior as the mobile sheet. Visual phone validation is still needed for touch density.

## Deferred Work

No deferred code work is required for this task.

Manual runtime validation should confirm:

- the sheet remains bounded with internal row scrolling;
- Reset confirmation appears above the sheet correctly;
- Undo Reset is visible only after Reset;
- final Apply updates the form values before save.
