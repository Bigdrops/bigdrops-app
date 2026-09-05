# PostgREST Schema-Exposure Safety Redesign — Final Report

This report was written by opencode/mimo-v2-free on 2026-09-04 via Local Runner.

---

## Objective

Harden the PostgREST schema-exposure Edge Function to be fail-safe after the September 4 production `PGRST002` incident. Implement the safety redesign per the task brief (sections D.1–D.10) without reconnecting automation, modifying production, or creating test tenants.

## Scope

- Rewrite `supabase/functions/postgrest-schema-exposure/index.ts`
- Verify typecheck and audit:load pass
- No production changes, no cron reconnection, no tenant creation

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/postgrest-schema-exposure/index.ts` | Safety redesign: fail-closed, pg_namespace validation, required-schema invariant, pre-PATCH validation, queue safety |

## Skills Used

- ponytail (full mode)

## Documentation Standard

- ASD-STE100 Simplified Technical English

## Changes Made

### Safety Guarantees Implemented

1. **Fail-closed on pg_namespace failure** (D.1): If the `pg_namespace` query fails, the function aborts with a 500 error and releases locks. No PATCH is attempted.

2. **Authoritative DB state** (D.2): `pg_namespace` (filtered to `entity_%`) is the source of truth. The Management API GET response is treated as untrusted — used only to preserve existing valid entity schemas, not for validity decisions.

3. **Required-schema invariant** (D.3): The final `db_schema` set always includes `public`, `graphql_public`, `auth`, `storage`, `extensions`. A pre-PATCH invariant check aborts if any required schema is missing.

4. **Every candidate validated** (D.4): Each claimed schema is checked against `pg_namespace` before inclusion. Only schemas that exist in the DB are added.

5. **Existing valid entity schemas preserved** (D.5): Entity schemas already in the Management API config are carried forward (if they exist in DB), preventing destructive replacement by concurrent invocations.

6. **Pre-PATCH validation boundary** (D.6): Before PATCHing, every entity schema in the final set is validated against `pg_namespace`. If any entity schema is not in the DB, the function aborts — no PATCH.

7. **PROJECT_REF required** (D.7): Env var check at startup. No fallback. Empty or missing values cause immediate throw.

8. **Management API GET untrusted** (D.8): GET response is read for informational purposes only. Validity decisions come exclusively from `pg_namespace`.

9. **Concurrency safety** (D.9): Row-level locking via `claim_pending_pgrst_schemas()` and `release_pgrst_locks()` preserved. Global GET→PATCH race is acknowledged as inherent to the dual-entry design (client + cron).

10. **Queue safety** (D.10): Invalid queue entries (schemas not in DB) are NOT marked as processed. Locks are released, entries left for manual investigation. They never become exposure candidates.

### Removed

- Blind `currentSchemas.includes()` check (replaced with pg_namespace validation)
- Skip-and-mark-processed for invalid entries (now: release lock, leave unprocessed)
- "Best effort" fallback behavior — all failure paths abort

## Verification

```
- bun run audit:load: passed (25 pre-existing bloat warnings, 6 pre-existing broad selects, 3 pre-existing heavy limits)
- bun run typecheck: passed
- git status: clean (only intended file changed)
- bun run build: skipped due to hardware policy
```

## Risks / Limitations

- The `pg_namespace` query uses `.like("nspname", "entity_")` which requires the PostgREST role to have SELECT on `pg_namespace`. If RLS or permissions block this, the function will fail closed (500 error). This is the desired behavior.
- Invalid queue entries accumulate until manually investigated. No automatic cleanup. This is intentional — they serve as an audit trail.
- The global GET→PATCH race (two invocations read GET, both PATCH) is inherent to the dual-entry architecture (client fire-and-forget + cron). Row locking prevents processing the same queue rows, but does not prevent two different batches from reading overlapping GET state. This is acknowledged and acceptable for the current scale.

## Deferred Work

- **Reconnect automation** (provision_entity, tenant creation, App.tsx bootstrap, cron): Explicitly not done per task constraints. Requires separate task.
- **Automatic cleanup of invalid queue entries**: Deferred. Manual investigation is preferred for now.
- **Database-level exposure via provision_entity()**: The DB function does NOT contain step 15 (`_prov_expose_schema_to_postgrest()`). This was confirmed by the forensic audit. Exposing schemas at the DB level would require a separate migration and is out of scope.
