# CPS Contiguous Group Validation Report

This report was written by Codex on 2026-10-04 via Codex Desktop.

## Objective

Reject invalid CPS JSON group membership before import preview or form application.

## Scope

- CPS JSON import schema.
- Generic JSON group validation.
- CPS import preview error handling.
- CPS and JSON import tests.

PDF, calculation, conversion, numbering, prefix, and schema code were not changed.

## Files changed

- `src/domain/import/groupMembership.ts`
- `src/domain/import/validate.ts`
- `src/domain/cps/importAdapter.ts`
- `src/components/cps/CpsImportSheet.tsx`
- `src/tests/critical/jsonGroupImport.test.js`
- `src/tests/critical/cpsImportView.test.js`
- `docs/reports/json-import/2026-10-04-cps-contiguous-group-validation-report.md`

## Skills used

typescript-advanced-types, systematic-debugging, test-driven-development, karpathy, verification-before-completion

## Documentation standard

ASD-STE100 Simplified Technical English

## Previous validation gap

The validator checked duplicate item references, unknown groups, dangling `itemIds`, empty groups, and some `group_id` to `itemIds` conflicts.

It did not check that each group occupied one contiguous block in `items[]`.

The CPS-specific import sheet used `cpsImportSchema.parse()` and then called `applyCpsImport()`. It did not pass through the generic validator before preview.

## Membership contract found

The current contract keeps two membership fields:

- `groups[].itemIds`
- `items[].group_id`

Both fields remain part of the accepted contract.

They must agree exactly.

## Invariants enforced

- Each non-empty `temp_ref` must be unique.
- Each non-empty `group_id` must reference a declared group.
- Each `groups[].itemIds` entry must resolve to one item.
- One item cannot belong to more than one group.
- `groups[].itemIds` and `items[].group_id` must agree exactly.
- `groups[].itemIds` order must match source `items[]` order.
- Each group must occupy one contiguous source block.
- A group cannot reopen after a standalone item or another group closes it.
- Empty groups remain rejected.
- Standalone items remain valid.

## Validation location

The shared validator is `validateImportGroupMembership()`.

The generic import path calls it from `validateImportData()`.

The CPS-specific path calls it through `cpsImportSchema.superRefine()`.

`applyCpsImport()` also calls it defensively before it builds rows.

## Malformed fixtures rejected

- Group reopened after a standalone item.
- Group reopened after another group.
- Repeatedly interleaved groups.
- Unknown `group_id`.
- Dangling `groups[].itemIds`.
- Item listed in multiple groups.
- `group_id` versus `itemIds` disagreement.
- `itemIds` order disagreement.
- Duplicate `temp_ref`.
- The supplied scattered `grp_1`, `grp_2`, and `grp_3` pattern.

## Valid fixtures accepted

- Standalone-only document.
- Grouped-only document.
- Contiguous grouped document.
- Mixed standalone and grouped blocks.
- Standalone rows between different groups.

## Verification result

- `bun test src/tests/critical/jsonGroupImport.test.js`: passed, 20 tests.
- `bun test src/tests/critical/cpsImportView.test.js`: passed, 22 tests.
- `bun test src/tests/critical/cpsNormalize.test.js src/tests/critical/cpsRowOperations.test.js`: passed, 18 tests.
- `bun run typecheck`: passed.
- `bunx eslint src/components/cps/CpsImportSheet.tsx src/domain/cps/importAdapter.ts src/domain/import/validate.ts src/domain/import/groupMembership.ts src/tests/critical/jsonGroupImport.test.js src/tests/critical/cpsImportView.test.js`: passed.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

Not applicable. No SQL changed.

## Compatibility impact

Malformed JSON payloads that previously imported with scattered group membership now fail validation.

Valid standalone, grouped, and mixed documents remain accepted.

## Risks or limitations

Existing saved CPS documents are not migrated.

The CPS form still supports manual non-contiguous membership because this task only changes JSON import admission.

## Deferred work

None.
