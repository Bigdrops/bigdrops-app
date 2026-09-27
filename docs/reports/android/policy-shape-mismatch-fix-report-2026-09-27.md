# Policy Shape Mismatch Fix Report

This report was written by Muse Spark on 2026-09-27 via OpenCode.

## Objective

Fix the proven composition defect where the validated camelCase policy reached the state machine as `rawPolicy`. Keep all update semantics unchanged.

## Scope

- Retain the raw RPC row through classification.
- Pass the raw row to the state machine.
- Type-level guard against repeat substitution.
- Composition regression test.

## Files Changed

- `src/domain/appUpdate/policyFetchResult.ts` — `rawRow` retained on every outcome; row type moved to the state machine module.
- `src/domain/appUpdate/updateStateMachine.ts` — exported `PolicyRpcRow`; `rawPolicy` narrowed from `unknown` to `PolicyRpcRow | null`. No behavior change.
- `src/hooks/useAppUpdate.ts` — passes `policyResult.rawRow` as `rawPolicy` (one line).
- `src/lib/appUpdate/releasePolicyClient.ts` — catch-path return gains `rawRow: null` (found by typecheck).
- `src/tests/critical/productionComposition.test.js` — new composition regression suite.

## Skills Used

Skills used: karpathy, react-dev
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- The classifier keeps the original snake_case row on valid and malformed outcomes, null otherwise.
- The hook feeds that row to the machine. Passing the validated policy object is now a compile error.
- State-machine validation logic is untouched. It validates the row it was designed to receive.
- Throttle, forced checks, coordination, grace rules, anchors, discovery gating, promotion model, platform boundary, and Settings mapping are unchanged.

## Verification Result

- `bun run typecheck`: zero errors. It caught one missed return site during implementation, now fixed.
- Pre-fix empirical check (test run against HEAD domain copies outside the repo): 3 fail, 3 pass. The 1013-versus-1014 grace test fails pre-fix, proving the test reproduces the production bug.
- Post-fix focused update tests: 44 pass, 0 fail (38 existing plus 6 new).
- `git diff --check` on task files: clean.
- `bun run audit:load`: not applicable (no schema, query, or data-layer change).
- `bun run build`: skipped due to hardware policy.
- `supabase db push`: not applicable.

## Supabase Push Status

Not applicable. No schema change. No policy mutation. Live row stays at approved 1014.

## Risks or Limitations

- None introduced. The change restores the documented contract on one call path.

## Deferred Work

- Human device validation: keep 1013 installed, press Check for updates once, expect the grace update path toward verified 1014.
