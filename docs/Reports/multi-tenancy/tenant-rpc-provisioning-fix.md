# Tenant RPC Provisioning Fix Report

This report was written by GLM on 2026-08-19 via opencode.

## Objective

Fix the production error `Could not find the function entity_bigdrops-main_main.save_invoice_with_items_transaction(...) in the schema cache`. The tenant schema `entity_bigdrops-main_main` had almost no lifecycle and audit RPCs. Every schema-scoped RPC call from `tenantClient.rpc(...)` failed.

## Scope

- Database only. No application code changed.
- Migration `supabase/migrations/20260827000000_tenant_rpc_provisioning.sql` (new file, prior session started it, this session completed and applied it).
- Migration history repair: one stray file deleted, one orphaned file renamed.

## Files changed

- `supabase/migrations/20260827000000_tenant_rpc_provisioning.sql` (new): completes the tenant RPC installer.
- `supabase/migrations/20260827000001_tenant_settings_identity_backfill.sql` (renamed from `20260810010000_tenant_settings_identity_backfill.sql`): same content, new timestamp.
- `supabase/migrations/20260818000000_seed_wildcard_creator_permission.sql` (deleted): stray duplicate of the already-applied `20260818000000_creator_wildcard_permission_seed.sql`.

## Skills used

- supabase

Documentation standard: ADS-STE100 Simplified Technical English

## Changes made

### 1. Completed the tenant RPC migration

The migration file was truncated at function 23 of 27. This session appended:

- Function 23 `record_letter_duplicated` (completed).
- Function 24 `record_letter_archived`.
- Function 25 `record_audit_log` (tenant copy; writes to `public.audit_logs`).
- Function 26 `record_activity_event` (tenant copy; writes to `public.activity_events`).
- Function 27 `revert_invoice_to_quotation_transaction` (fixed status mapping version).
- Part 4: `provision_entity()` re-created with step 8.9 `PERFORM public._prov_install_tenant_rpcs(v_schema_name)`.
- Part 5: backfill loop over all `entity_*` schemas.
- Final `NOTIFY pgrst, 'reload schema'`.

`activity_events` and `audit_logs` are not in `_prov_get_template_tables()`. They stay in `public`. The tenant copies of functions 25 and 26 exist only so the schema-scoped `tenantClient.rpc(...)` calls resolve. Their bodies write to the public tables.

### 2. Fixed a dollar-quote nesting bug

The outer installer function used tag `$function$`. The 27 embedded bodies also used `$function$`. Postgres cannot nest same-tag dollar quotes. The parser closed the outer string at the first embedded `AS $function$` and raised a syntax error at `declare`. Fix: the outer installer now uses tag `$install$`. Embedded bodies keep `$function$`.

### 3. Repaired the migration history drift

`supabase db push` refused to run because two local files claimed versions already recorded on the remote database under different names:

| Version | Remote record (applied) | Local file (blocked) | Action |
| --- | --- | --- | --- |
| 20260810010000 | quotation_data_migration | tenant_settings_identity_backfill | Renamed to 20260827000001 |
| 20260818000000 | creator_wildcard_permission_seed | seed_wildcard_creator_permission | Deleted (content duplicate) |

The deleted file was a duplicate of the applied `creator_wildcard_permission_seed.sql`. Both redefine `_prov_seed_default_permissions()` with the same three idempotent `INSERT ... ON CONFLICT DO NOTHING` blocks.

The renamed backfill was never recorded in remote history. Its target state already exists on production: tenant settings are populated and wildcard grants are present. The backfill is guarded and only fills NULL or empty values, so the re-run is a no-op or near no-op.

### 4. Applied both migrations

`supabase db push` applied:

- `20260827000000_tenant_rpc_provisioning.sql`
- `20260827000001_tenant_settings_identity_backfill.sql`

## Verification result

- Tenant schema function count: 27. All 27 RPCs from the installer list are present in `entity_bigdrops-main_main` with canonical signatures.
- Ticket RPCs verified present: `save_invoice_with_items_transaction`, `record_csr_created`, `record_waybill_created`, `record_audit_log`, `revert_invoice_to_quotation_transaction`.
- `public._prov_install_tenant_rpcs(text)` exists.
- `public.record_activity_event` exists with the full whitelist signature (11 args).
- `public.record_payment_transaction(uuid, jsonb)` exists.
- `provision_entity()` contains the `_prov_install_tenant_rpcs` call.
- `NOTIFY pgrst, 'reload schema'` ran as the last statement of the migration.
- One tenant schema exists (`entity_bigdrops-main_main`); the Part 5 backfill loop covered it.
- `bun run audit:load`: passed.
- `bun run typecheck`: passed.
- `git status`: this task changed only the three migration files listed above. Eight modified `src/` files (PDF output and invoice view components) pre-date this task and were not touched.
- `bun run build`: skipped due to hardware policy.

## Risks or limitations

- The pre-existing `src/` modifications are uncommitted. They are not part of this task.
- `provision_entity()` returns early for entities already marked `ready`. Existing schemas do not receive RPC re-installs on re-provision. The Part 5 backfill covers existing schemas once. Future repairs must call `_prov_install_tenant_rpcs` directly.
- The renamed settings backfill grants wildcard permissions (`resource = '*'`) to workspace owners through the redefined seeder. Production already had these grants, so no behavior changed.
- The earlier failed `--include-all` push may have executed the settings backfill DO block before it failed on the duplicate history key. The backfill is guarded, so the applied push stayed consistent.

## Deferred work

- Commit the migration changes (not requested).
- Remove `record_payment_recorded` from `database.types.ts` if it stays uncalled (not requested; it is typed but never invoked by the frontend).
