# PostgREST Exposure Repair Report

This report was written by Muse Spark on 2026-09-05 via OpenCode.

## Objective

Make the exposure pipeline complete automatically. Fix the root miss. Keep fail-closed behavior.

## Scope

- Fixed: entity-schema listing RPC, edge validation source, probe Gate 2 rule.
- Untouched: lifecycle, RLS, provisioning engine, tenant schemas, business data, leakage fixes, UI.

## Files Changed

- `supabase/migrations/20260905195257_entity_schema_listing_rpc.sql`: new read-only RPC.
- `supabase/functions/postgrest-schema-exposure/index.ts`: RPC validation.
- `supabase/migrations/20260905200145_exposure_probe_queue_state.sql`: probe correction.

## Skills Used

Skills used: supabase
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- Root cause found: edge validation read `pg_namespace` through PostgREST. System catalogs are not servable. Every run since v6 failed closed. Queue row sat idle.
- New RPC returns tenant schema names server-side. Service-role only. No arguments.
- Edge function calls the RPC. Fail-closed validation preserved. Required-schema invariant preserved.
- Probe Gate 2 now checks queue state. Namespace plus no pending row means served. Membership and shape guards unchanged.
- Invoked the function through the normal path. Result `processed:1`. Queue row marked processed. REST returns 200 for the schema.
- Migration history sequential through `20260905200145`.

## Verification Result

- Live REST probe: 200 for Anthropology schema.
- Queue: anthropology row processed. No pending rows remain.
- `bun run typecheck`: passed.
- `bun run audit:load`: passed (pre-existing warnings only).
- Focused tests: 39 pass, 0 fail.
- `git status`: only the 3 listed files changed by this task.
- `bun run build`: not executed. Docker not started.

## Risks and Limitations

- Exposure true-path in the app needs a user session. CLI verified fail-closed paths and REST serving.
- New migration files remain uncommitted in the worktree. Commit them before any branch cleanup.
- Edge function secrets were not inspected. The successful run proves the current secret set works.

## Deferred Work

- App-session confirmation of Anthropology usability.
- Commit of the two new migration files plus the edge change.
