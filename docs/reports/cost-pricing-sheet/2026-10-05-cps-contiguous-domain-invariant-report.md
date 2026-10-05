# CPS Contiguous Group Domain Invariant Report

This report was written by Codex on 2026-10-05 via Codex desktop app.

## Objective

Make contiguous group membership a CPS domain invariant.

## Scope

This task changed CPS row structure validation and CPS row mutation helpers.

This task did not change PDF code, calculation code, conversion code, numbering, prefixes, or database schema.

## Files changed

- `src/domain/cps/group-structure.ts`
- `src/domain/cps/row-operations.ts`
- `src/domain/import/groupMembership.ts`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetForm.tsx`
- `src/tests/critical/cpsRowOperations.test.js`
- `src/tests/critical/cpsNormalize.test.js`

## Skills used

typescript-advanced-types, react-dev, karpathy, systematic-debugging, test-driven-development, verification-before-completion

## Documentation standard

ASD-STE100 Simplified Technical English

## Mutation paths audited

- Add item.
- Add group.
- Insert item below a row.
- Add item to an existing group.
- Assign an item to a group.
- Remove an item from a group.
- Delete an item.
- Delete a group.
- Move an item.
- Move a group block.
- Duplicate placeholder and grouped insert behavior.
- JSON import group validation.
- CPS load and hydration.
- CPS save row serialization.

## Changes made

- Added `validateContiguousGroupSequence()` as the shared contiguous group authority.
- Added `validateCpsGroupStructure()` and `isCpsGroupStructureContiguous()` for CPS table rows.
- Updated JSON import group validation to use the shared contiguous group authority.
- Updated CPS row operations so groups can occupy only one contiguous run.
- Updated desktop row movement to call `moveCpsRow()` instead of raw array splice.
- Updated the mobile/fold form move handler to refuse moves that split a group.
- Added tests for invalid `A -> standalone -> A` and `A -> B -> A`.
- Added tests for valid standalone-only, grouped-only, and mixed documents.
- Added tests for add, assign, remove-from-group, reorder, group move, duplicate insert, delete item, and delete group behavior.
- Added a hydration compatibility test. It detects persisted invalid structure but does not rewrite old data during load.

## Behavior chosen

- Add item to group: insert the item at the end of that group block.
- Assign standalone item to group: move the item into the target group block.
- Remove item from group: clear `group_id`; if that would split the old group, move the item after the group block.
- Move grouped item outside its group: refuse the move and keep the previous row order.
- Insert standalone item inside a group: refuse the move or place the insert after the group block, depending on the operation.
- Move group: move the complete contiguous group block.
- Delete group: remove the group row and keep former members as standalone rows.

## Import behavior

JSON import remains strict.

Malformed external input is rejected. The importer does not reorder, repair, regroup, or silently ungroup scattered members.

## Existing-data compatibility

Persisted non-contiguous CPS rows can be represented by the current row storage model.

Normalization preserves that stored row order and membership. It does not silently migrate or rewrite the document during load.

The new CPS group-structure helper can detect the invalid structure after hydration.

## Verification

- `bun test src/tests/critical/cpsRowOperations.test.js`: passed, 23 tests.
- `bun test src/tests/critical/cpsNormalize.test.js`: passed, 6 tests.
- `bun test src/tests/critical/jsonGroupImport.test.js`: passed, 20 tests.
- `bun test src/tests/critical/cpsImportView.test.js`: passed, 22 tests.
- `bun test src/tests/critical/cpsSaveSerialization.test.js`: passed, 5 tests.
- `bun test src/tests/critical/cpsMarkupPresentation.test.js`: passed, 9 tests.
- `bun test src/tests/critical/cpsCalculationAuthority.test.js`: passed, 17 tests.
- `bun run typecheck`: passed.
- `bunx eslint src/domain/cps/group-structure.ts src/domain/cps/row-operations.ts src/domain/import/groupMembership.ts src/tests/critical/cpsRowOperations.test.js src/tests/critical/cpsNormalize.test.js`: passed.
- `bunx eslint` on all touched files: failed because `CostPricingSheetEditor.tsx` and `CostPricingSheetForm.tsx` contain existing lint violations outside the changed lines.
- `git diff --check`: passed with line-ending warnings only.
- `git status --short --untracked-files=all`: showed only the files changed by this task.
- `bun run audit:load`: skipped. No schema, query, or data-layer logic changed.
- `supabase db push`: not applicable.
- `bun run build`: skipped due to hardware policy.

## Risks or limitations

- Existing malformed persisted CPS documents are detected but not repaired during load.
- Component-file lint remains blocked by existing lint debt in CPS React files.

## Deferred work

- Add user-facing repair or warning UI for existing persisted CPS documents with non-contiguous groups.
- Clean the pre-existing CPS component lint debt in a separate task.
