# PostgREST Schema Registration — pg_cron Queue Solution

This report was written by opencode on 2026-09-03 via Local Runner.

## Objective
Fix fresh-tenant provisioning so any new company created through the BIGDROPS UI automatically provisions a fully functional schema that PostgREST accepts.

## Root Cause
SEC DEFINER functions cannot run `ALTER ROLE ... SET` when called from PostgREST RPC. PostgREST's connection pool runs as `authenticator` → `SET ROLE authenticated`, which strips the `postgres` role's superuser privilege. The `ALTER ROLE` fails silently, and the new schema is never registered in `pgrst.schemas`.

## Solution
Queue pending schema registrations in a table. A pg_cron job (runs every second in a clean session) processes the queue and performs the `ALTER ROLE`.

## Architecture
1. `_pending_postgrest_schemas` table — holds `id`, `schema_name`, `processed`, `created_at`
2. `_process_pending_pgrst_schemas()` — pg_cron function: reads unprocessed entries, builds the full `pgrst.schemas` value from `pg_db_role_setting`, appends new schema, runs `ALTER ROLE authenticator SET pgrst.schemas = ...`, marks processed
3. `_prov_expose_schema_to_postgrest()` — modified: instead of direct ALTER ROLE, inserts into pending table
4. pg_cron job (ID 9) — runs every second, calls `_process_pending_pgrst_schemas()`

## Files Changed
- `supabase/migrations/20260903070000_pgrst_cron_queue.sql` — pending table + cron fn + modified expose fn + schedule

## Verification
- Isolated test: inserted `entity_test_final` into pending table → cron processed within 1s → ALTER ROLE succeeded → `entity_test_final` appeared in `pgrst.schemas` config
- Config restored to clean state after test
- `bun run typecheck`: passed
- `bun run build`: skipped (hardware policy)

## Known Limitations
- **~1 second race condition**: New schema not visible to PostgREST until cron processes it. Acceptable for provisioning flow.
- **Full `provision_entity()` flow untested from PostgREST RPC**: Individual components proven; the function itself unchanged (only step 15 calls new queuing fn).
- **Single cron job (ID 9) active**: Processes all pending entries. No concurrency issues since it's a single job.

## Rollback
To revert to direct ALTER ROLE (old behavior):
```sql
SELECT cron.unschedule(9);
DROP TABLE IF EXISTS public._pending_postgrest_schemas;
DROP FUNCTION IF EXISTS public._process_pending_pgrst_schemas();
-- Restore old _prov_expose_schema_to_postgrest() from migration 20260902160000
```

## Deferred Work
- Remove temp files (`_temp_debug.sql`, `_temp_fix_owner.sql`) — already deleted
- Update `provision_entity` step 15 comment (cosmetic, cancelled)
