# Item Library Cleanup Snapshot Preflight Hardening Report

This report was written by Codex on 2026-09-25 via Codex Desktop.

## Objective

Harden the Cleanup Hub export, import, and apply protocol.

The main invariant is:

- validate the whole import first;
- mutate second.

## Scope

This task covered the Cleanup Hub exchange contract only.

It did not change:

- duplicate detection;
- merge RPC behavior;
- forward Item Library learning;
- historical backfill data;
- Tier C rows;
- Tier D rows;
- autocomplete;
- pricing or document financial behavior.

## Skills used

Skills used: typescript-advanced-types, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Proven Root Cause

The previous flagged import validator could return `ok: false` and still return valid merge groups in `preview.merge_groups`.

The Cleanup Hub component used `preview.merge_groups` to build applyable merges. It did not require `validation.ok === true`.

This allowed this unsafe sequence:

1. The imported result contained one current proposal and one old or foreign proposal.
2. Validation rejected the old or foreign proposal.
3. The valid proposal still stayed in the preview.
4. The apply action could apply the valid proposal.
5. The UI could then show both an apply result and an import correction warning.

This explains the observed `1 applied, 0 stale, 0 failed` result with one rejected unknown group.

## Current Contract

Exports now include `snapshot_id`.

Flagged cleanup exports include:

- `export_type`;
- `schema_version`;
- `snapshot_id`;
- `generated_at`;
- `scope`;
- `groups`.

Catalog cleanup batch exports include:

- `export_type`;
- `schema_version`;
- `snapshot_id`;
- `session`;
- `batch_id`;
- `generated_at`;
- `scope`;
- `items`.

Imported cleanup results must return the same `snapshot_id`.

## Snapshot Design

The snapshot ID is deterministic.

The ID uses a canonical representation of the exported review set.

The canonical representation sorts groups and items before hashing. Incidental array order does not change the ID.

For flagged cleanup, the fingerprint includes:

- export type;
- schema version;
- mode;
- batch ID when present;
- group IDs;
- group labels;
- item IDs;
- item names;
- aliases;
- active state;
- exported price and usage context.

For catalog cleanup batches, the fingerprint includes:

- export type;
- schema version;
- mode;
- session ID;
- batch ID;
- batch index;
- batch count;
- item IDs;
- item names;
- aliases;
- cleanup flags;
- duplicate group IDs.

`generated_at` is not part of the snapshot ID.

## Preflight Boundary

Top-level validation now rejects before proposal parsing when:

- the result type is wrong;
- the schema version is wrong;
- the source export type is wrong;
- the snapshot ID is missing;
- the snapshot ID does not match;
- the batch ID is wrong.

Proposal validation now rejects the whole flagged payload for application when any proposal is structurally invalid.

When flagged proposal validation fails:

- `ok` is `false`;
- `parsed` is `null`;
- `preview.merge_groups` is empty;
- rejected proposal details remain visible for diagnostics.

The Cleanup Hub component also requires `validation.ok === true` before it exposes applyable merges.

## Backward Compatibility

Legacy imported results without `snapshot_id` are rejected.

The message tells the user to export the current review set and regenerate the cleanup decisions.

This policy avoids unsafe mutation from old exported data.

## Tenant Isolation

The snapshot ID is a correlation check. It is not authorization.

Tenant authorization remains in the existing tenant-scoped repository and merge RPC path.

No client-supplied tenant value was added or trusted.

## Replay Behavior

No new replay table was added.

A repeated result must still match the current exported review set.

After a successful merge changes the review set, a reused result becomes stale through snapshot or existing merge-state checks.

Execution-time stale cases still use the existing safe merge behavior.

## Files changed

- `src/modules/item-library/domain/itemCleanupExchange.ts`
- `src/modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx`
- `src/modules/item-library/types/itemLibrary.ts`
- `src/tests/item-library/itemCleanupExchangeFlagged.test.js`
- `src/tests/item-library/itemCleanupExchangeFlaggedRegression.test.js`
- `src/tests/item-library/catalogCleanupSession.test.js`

## Changes made

- Added snapshot matching to flagged import validation.
- Kept catalog snapshot validation and adjusted its mismatch message.
- Rejected legacy missing-snapshot payloads safely.
- Returned zero applyable flagged merges when structural proposal validation fails.
- Returned `parsed: null` for structurally invalid flagged imports.
- Rejected duplicate flagged group proposals.
- Required successful preflight in the Cleanup Hub component before applyable merges appear.
- Added focused tests for deterministic snapshots, legacy rejection, mismatch rejection, unknown groups, self merge, duplicate group proposals, and the observed mixed old/current import case.

## Verification

- Focused tests: passed.
  - Command: `bun test src/tests/item-library/itemCleanupExchangeFlagged.test.js src/tests/item-library/itemCleanupExchangeFlaggedRegression.test.js src/tests/item-library/catalogCleanupSession.test.js`
  - Result: 21 passed, 0 failed.
- `bun run typecheck`: blocked by known unrelated error.
  - Exact error: `src/pages/settings/AdminSettingsSection.tsx(38,148): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.`
  - This task did not modify `src/pages/settings/AdminSettingsSection.tsx`.
- `git diff --check`: passed.
- `bun run audit:load`: not run. No schema, SQL, RPC, or data-layer query logic changed.
- `supabase db push`: not applicable.
- `bun run build`: skipped due to hardware policy.

## Git Status

Final task changes are limited to the files listed in this report.

No `AdminSettingsSection.tsx` changes exist in this task diff.

## Risks or limitations

The snapshot hash is an integrity and correlation fingerprint. It is not a security token.

The merge RPC remains the authority for execution-time merge safety.

## Deferred work

No Tier C mutation was done.

No duplicate detector behavior was changed.

No automatic fuzzy merge behavior was added.
