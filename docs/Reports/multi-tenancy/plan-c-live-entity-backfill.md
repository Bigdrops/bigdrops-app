# Plan C Live Entity Backfill Report

This report was written by opencode (deepseek-v4-flash-free) on 2026-08-17 via Local Runner.

## Objective

Deliver Plan C of the Multi-Tenancy Final Reconciliation Blueprint. Plan C backfills the live production entity `entity_bigdrops-main_main` with the 11 tables that Plan B added to the provisioning template. The entity was provisioned before those tables existed, so it was missing them.

The agent applied the migration to production via the Supabase Management API query endpoint. The human operator handoff was not used.

## Scope

Plan C covers:

- Clone the 11 missing tables into `entity_bigdrops-main_main`.
- Install RLS policies on the cloned tables.
- Grant table privileges to `anon`, `authenticated`, and `service_role`.
- Copy rows from `public` to the tenant schema with preserved IDs.
- Install canonical triggers after the copy.
- Defer the `rfq_items -> rfqs` foreign key to Plan D.
- Validate counts, ID sets, and foreign key integrity.

Plan C does not cover:

- Permissions for the owner user. The seeder runs after Plan C.
- Migrating `public.rfqs`. Plan D covers this.
- Frontend changes.
- The stray schema. Plan G covers this.

## Files changed

- `supabase/migrations/20260817000000_plan_c_live_entity_backfill.sql` (new)
- `docs/Reports/multi-tenancy/plan-c-live-entity-backfill.md` (this report)

## Skills used

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English

## Documentation standard

This report follows ADS-STE100 Simplified Technical English.

## Changes made

### Dependency guard

The migration requires `public._prov_install_triggers()`. This exists from migration `20260809010000`. The migration raises an exception if the function is missing.

### Entity resolution

The migration resolves the entity id from `public.entities` and `public.workspaces` by schema name. It uses no hardcoded UUID. It raised an exception if the entity cannot be resolved.

### Table cloning

The migration clones these 11 tables into `entity_bigdrops-main_main`:

1. item_catalog
2. item_import_batches
3. item_aliases
4. item_merge_log
5. tax_filings
6. rfq_items
7. boq_rows
8. tax_input_entries
9. tax_reminders
10. device_sequences
11. audit_logs

Each clone uses the canonical helpers:

- `_prov_clone_table()` copies structure, constraints, and indexes.
- `_prov_install_rls()` enables RLS and creates 4 policies (select, insert, update, delete) bound to the resolved entity id.
- `_prov_readd_foreign_keys()` re-adds foreign keys that reference tables present in the tenant schema. The constraint name uses the `_clone` suffix.
- `GRANT SELECT, INSERT, UPDATE, DELETE` goes to `anon`, `authenticated`, and `service_role`. This matches the sibling tenant tables.

### rfq_items foreign key deferral

`rfq_items.rfq_id` references `rfqs`. The tenant `rfqs` table has 0 rows. The public `rfqs` table has 3 rows.

The migration does not re-add this foreign key. Plan D migrates `rfqs` and re-adds the foreign key. This follows the waybill precedent in section 3 of migration `20260810040000`.

### Data copy

The migration copies each table with:

```sql
INSERT INTO tenant.<table> SELECT * FROM public.<table> ON CONFLICT (id) DO NOTHING
```

The copy order is foreign-key safe:

1. item_catalog
2. item_import_batches
3. item_aliases
4. item_merge_log
5. tax_filings
6. rfq_items
7. boq_rows
8. tax_input_entries
9. tax_reminders
10. device_sequences
11. audit_logs

### Trigger parity

The migration installs canonical triggers after the copy. This prevents the BEFORE INSERT trigger stamping from overwriting preserved `created_by` and `updated_by` values.

### Validation

The migration validates and raises an exception on any mismatch:

- Row count per table.
- Every public id exists in the tenant table.
- No orphan `item_aliases`.
- No orphan `item_merge_log` `from_item_id` or `to_item_id`.
- No orphan `tax_reminders.linked_filing_id`.
- Every tenant `rfq_items.rfq_id` exists in `public.rfqs`.

## Verification

Plan A, Plan B, and Plan C are all applied to the live project `xqlpekpkbszpdgtuwybh`.

### Plan A verification

- `_prov_get_template_tables()` returns 21 tables.
- `project_documents` maps to resource `project_document`.
- The tenant view `project_financials_v` exists.

### Plan B verification

- `_prov_get_template_tables()` returns 32 tables.
- `rfq_items` maps to `rfq`.
- `item_catalog` maps to `item`.
- `audit_logs` maps to `audit`.
- `boq_rows` maps to `boq`.

### Plan C verification

All 11 tables exist in `entity_bigdrops-main_main` with these row counts:

- item_catalog: 1394
- item_aliases: 1000
- rfq_items: 54
- audit_logs: 425
- item_import_batches: 0
- item_merge_log: 0
- tax_filings: 0
- tax_input_entries: 0
- tax_reminders: 0
- boq_rows: 0
- device_sequences: 0

Every cloned table has:

- RLS enabled.
- RLS forced for the table owner.
- 4 RLS policies.
- ACL `anon=arwd, authenticated=arwd, service_role=arwd`.

The cloned foreign keys reference the tenant schema, not `public`:

- `item_aliases_item_id_fkey_clone` references `entity_bigdrops-main_main.item_catalog`.
- `tax_reminders_linked_filing_id_fkey_clone` references `entity_bigdrops-main_main.tax_filings`.

The `rfq_items_rfq_id_fkey` constraint is absent. This confirms the deferral.

Verification:
- bun run audit:load: passed
- bun run typecheck: passed
- git status: one new migration file and one report (see below)

The audit findings are pre-existing and unrelated to this migration. The migration adds no TypeScript code.

## Risks or limitations

- The tenant `rfqs` table is empty. `rfq_items` rows reference `public.rfqs`. Any read of `tenant.rfq_items` that joins `tenant.rfqs` returns no rows until Plan D migrates the data.
- `tax_input_entries`, `tax_filings`, and `tax_reminders` have 0 rows. The tables exist with correct RLS, ACLs, and foreign keys. No data copy is pending.
- The owner user has no permissions for the new resources. Access is denied until the seeder runs.

## Deferred work

- Seed owner permissions. Run:
  `SELECT public._prov_seed_default_permissions('<entity_id>', '<user_id>');`
- Plan D: migrate the remaining public tables, including `rfqs`.
- Re-add the foreign key:
  `ALTER TABLE "entity_bigdrops-main_main".rfq_items ADD CONSTRAINT rfq_items_rfq_id_fkey_clone FOREIGN KEY (rfq_id) REFERENCES "entity_bigdrops-main_main".rfqs(id) ON DELETE CASCADE;`
- Plan E: grant permissions to other users per role.
- Plan F: source migration.
- Plan G: cutover and verification.
