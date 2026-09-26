# Item Library Cleanup Session Hook Order Fix Report

This report was written by Codex on 2026-09-26 via Codex Desktop.

## Objective

Fix the React crash in:

Item Library > Cleanup Hub > Clean & Standardize Catalog.

The crash happened after the user selected the default 50 item batch size and clicked Start Cleanup Session.

## Scope

This task changed only the Cleanup Hub session lifecycle.

It did not change:

- duplicate detection;
- cleanup snapshot validation;
- cleanup preflight validation;
- merge semantics;
- forward Item Library learning;
- historical backfill data;
- Tier C rows;
- Tier D rows;
- autocomplete;
- pricing;
- invoice or quotation calculations.

## Files changed

- `src/modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx`
- `src/tests/item-library/cleanupSessionHookLifecycle.test.js`
- `docs/reports/item-library/item-library-cleanup-session-hook-order-fix-2026-09-26.md`

## Skills used

Skills used: react-dev, typescript-advanced-types, karpathy, webapp-testing

Documentation standard: ASD-STE100 Simplified Technical English

## Root cause

The exact component was `ItemLibraryAdvancedCleanupPanel`.

The exact hook was the setup-only `useMemo` that calculated `sessionEstimate`.

Before the fix, that hook was inside this early-return branch:

- `if (!lockedSession && !isDuplicates) { ... return ... }`

The failing transition was:

1. The component rendered the setup screen.
2. The setup branch called `useMemo` for `sessionEstimate`.
3. The user clicked Start Cleanup Session.
4. `handleLockSession` set `lockedSession`.
5. The same component instance rendered the active session UI.
6. The setup branch no longer ran.
7. React saw fewer hooks than the previous render.
8. React threw error #300.

The recent snapshot/preflight hardening did not cause this defect. It was temporally near the crash report, but the hook violation was in the setup/session render branch.

## Implementation fix

The `sessionEstimate` `useMemo` now runs before the setup early return.

The hook returns `null` when it is not needed:

- duplicate workflow;
- active locked session;
- invalid or missing batch size.

This keeps the hook order stable for:

- setup render;
- Start Cleanup Session transition;
- active batch render;
- reset to setup;
- re-entry into a new session.

## Why hook ordering is now invariant

All React hooks in `ItemLibraryAdvancedCleanupPanel` execute before the setup early return.

The setup early-return branch now contains no hook declarations.

The active duplicate-review branch and active full-catalog branch reuse the same shared hook block.

## Batch selection coverage

The defect was generic.

The crash was not specific to 50 items. Any full-catalog setup branch could call the setup-only hook, then skip it after `lockedSession` became populated.

The fix covers:

- 25;
- 50;
- 100;
- All;
- Custom.

All options use the same setup branch and Start Cleanup Session transition.

## Regression tests

Added `cleanupSessionHookLifecycle.test.js`.

The test covers:

- setup render with the default 50 item estimate;
- duplicate review branch render after the shared hook block;
- a source-level guard that forbids React hooks inside the setup early-return branch.

The source-level guard fails against the defective hook placement.

## Verification

- Focused regression test: passed.
  - Command: `bun test src/tests/item-library/cleanupSessionHookLifecycle.test.js`
  - Result: 3 passed, 0 failed.
- Relevant cleanup tests: passed.
  - Command: `bun test src/tests/item-library/cleanupSessionHookLifecycle.test.js src/tests/item-library/itemCleanupExchangeFlagged.test.js src/tests/item-library/itemCleanupExchangeFlaggedRegression.test.js src/tests/item-library/catalogCleanupSession.test.js`
  - Result: 24 passed, 0 failed.
- `bun run typecheck`: passed.
- `git diff --check`: passed.
- `bun run audit:load`: not run. No schema, SQL, RPC, or data-layer query logic changed.
- `supabase db push`: not applicable.
- `bun run build`: skipped due to hardware policy.

## Git status note

The workspace had many pre-existing unrelated changes before this task.

After verification, `git status` also showed a repository index anomaly where many tracked files appeared as deleted and the same paths appeared as untracked. The affected files still exist on disk. `GIT_INDEX_FILE` was not set.

No cleanup or reset was performed because concurrent-agent safety rules prohibit changing unrelated workspace state.

## Risks or limitations

The browser Playwright harness was attempted but was too slow and unstable for this repository state on this host.

The committed regression uses server rendering and a source guard for the exact hook-placement defect.

## Deferred work

No UI redesign was done.

No Cleanup Hub data contract change was done.

No database work was done.
