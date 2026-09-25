# JSON Group Import Determinism Fix Report

This report was written by Muse Spark on 2026-09-25 via opencode.

## Objective

Fix unreliable group creation in quotation and invoice JSON import. Make valid group imports deterministic. Report errors explicitly. Never drop groups silently.

## Scope

JSON import pipeline only:

- Parse, normalize, validate, resolve, apply.
- Add mode with groups.
- Invoice and quotation adapters share the same pipeline.

Out of scope:

- Database schema changes.
- PDF rendering changes.
- Financial calculation changes.
- Update mode group edits.

## Files changed

- `src/domain/import/normalize.ts`
- `src/domain/import/validate.ts`
- `src/domain/import/apply.ts`
- `src/domain/import/resolve.ts`
- `src/tests/critical/jsonGroupImport.test.js` (new)
- `docs/reports/json-import/json-group-determinism-fix.md` (this report)

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Documentation standard

This report uses ASD-STE100 Simplified Technical English. It uses short sentences. It uses active voice. It uses one idea per paragraph.

## Changes made

### Root causes found

- `apply.ts` removed groups when items were clustered. Clustered items are the normal case. This caused the same JSON to pass or fail based on item order.
- `validate.ts` did not check group references. Dangling `group_id` or `itemIds` fell back to ungrouped items with no error.
- `normalize.ts` used `Math.random()` for missing group ids. The same JSON produced different ids on each import.
- `apply.ts` copied `temp_ref` into editor items. It also copied raw `group_id` over the resolved group assignment.

### `src/domain/import/normalize.ts`

- Replace random group id generation with deterministic ids.
- Missing id becomes `grp_<index+1>`. Collisions get a numeric suffix.
- Trim `group.id` and each `itemIds` entry.
- Drop empty `itemIds` entries.
- Deduplicate generated ids in input order.

### `src/domain/import/validate.ts`

- Add group relationship validation for Add mode.
- Reject duplicate group ids.
- Reject duplicate item `temp_ref` values.
- Reject groups with empty `itemIds`.
- Reject `itemIds` entries that list more than one group.
- Reject `itemIds` entries with no matching item `temp_ref`.
- Reject items with unknown `group_id`.
- Reject grouped items with missing `temp_ref`.
- Reject items whose `temp_ref` is absent from the matching group `itemIds`.
- Reject items listed in a group but missing `group_id`.
- Use `items[].group_id` as the canonical relationship. Validate `groups[].itemIds` against it.

### `src/domain/import/apply.ts`

- Remove `hasScatteredGroups` and the silent cluster-strip path.
- Build one complete document in `buildApplyResult` before editor state changes.
- Resolve groups only through canonical `group_id`.
- Throw an explicit import error on any dangling or conflicting reference.
- Never convert a grouped item to an ungrouped item silently.
- Preserve input item order.
- Rebuild existing group state from existing items and headers, so appends never drop pre-existing groups.
- Remap imported group ids only on true collision (same id, different name) to deterministic `<id>_imported` values.
- Merge same id plus same name without duplicate headers.
- Emit no second header when the group already exists in the document.
- Skip `temp_ref`, `group_id`, and `row_number` in `assignResolvedFields`.
- Set `group_id` and `group_name` only from the matched group.
- Strip `temp_ref` from final editor items. `toDbItem` already strips it from database records.
- Ignore group fields in Update mode.

### `src/domain/import/resolve.ts`

- Replace `(validated as any).groups` with `validated.groups`.
- No behavior change. Pass groups through with correct types.

## Verification result

Verification:

- `bun run audit:load`: passed (only pre-existing bloat and query warnings)
- `bun run typecheck`: passed
- New test `src/tests/critical/jsonGroupImport.test.js`: 10 passed
- `bun run test` (full critical suite): 445 passed, 4 failed
- The 4 failures are pre-existing environment errors (`import.meta.env.VITE_SUPABASE_URL` missing in `invoiceAccountingIntegration`, `paymentAccountingIntegration`, `remediationContract`, `sourceTransactionContract`). They do not touch import code.
- `git status`: only task files changed. Pre-existing changes preserved.
- `supabase db push`: not applicable (no SQL change)
- `bun run build`: skipped due to hardware policy

## Supabase push status

No database change. Push not required.

## Risks or limitations

- Imports that relied on silent group stripping now fail with an explicit error. Users must fix the JSON.
- Strict two-way check requires both `group_id` and `itemIds` to agree. JSON with only one side present fails fast. This matches the ticket.
- Group ids from import (`grp_1`) are used directly as editor `group_id`. No UUID remap occurs.

## Deferred work

- No migration needed.
- No adapter changes needed. Adapters already apply the complete result.
- No prompt changes needed. Prompt already requests both `group_id` and `itemIds`.
- No repair mode added. The ticket requires rejection of dangling references, so strict rejection is the correct behavior.
