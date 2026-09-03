# Waybill Tenant Migration Investigation Report

This report was written by opencode (deepseek-v4-flash-free) on 2026-08-19 via Local Runner.

## 1. Objective

Fix the Waybill aggregate on the live tenant.

The user reported two symptoms:

1. The Waybills list shows 0 waybills.
   The filter tabs All, External, and Internal are all empty.
2. Waybill usage or download fails.
   The error is `permission denied for table blank_waybill_logs`.
   Error IDs: `err_1786867394170_skxi22`, `err_1786867368602_icl2u7`.

This report documents the investigation and the fix migration.

## 2. Scope

The scope of this task is the Waybill aggregate on the production entity.

The aggregate covers:

- The tenant `waybills` table.
- The tenant `blank_waybill_logs` table.
- The `entity_permissions` rows for the `waybill` resource.

The scope does NOT include:

- Other aggregates (invoice, quotation, receipt, setting, payment, client).
- Frontend code changes.
- Public table provenance.
- The data-copy portion of Phase 4 of the migration plan.

## 3. Environment

- Repo root: `C:\Users\DELL\Desktop\bigdrops-app`
- Branch: `main`
- HEAD: `4fee5fc9` (1 commit ahead of origin/main)
- Workspace: `eb30b64b-7f95-464f-be1a-805cf2c0fedc` (slug `bigdrops-main`)
- Entity: `eca34515-0b30-482c-b12e-3963df164322` (slug `main`, name "Sun & Shield Power Solutions")
- Tenant schema: `entity_bigdrops-main_main`
- Workspace owner: `b676c7a8-7834-40dd-bc45-655822c5c5e6`
- Supabase project ref: `xqlpekpkbszpdgtuwybh`
- `.env` location: repo root

## 4. Root Cause

There are two independent root causes.

### 4.1 Missing `waybill` permission rows

The live entity has no `waybill` rows in `public.entity_permissions`.

The production `entity_permissions` table has 21 rows for 6 resources only:

- `client`: view
- `invoice`: view, create, edit, delete
- `payment`: view, create, edit, delete
- `quotation`: view, create, edit, delete
- `receipt`: view, create, edit, delete
- `setting`: view, create, edit, delete

The `waybill` resource is absent.

The tenant RLS policy for `waybills` and `blank_waybill_logs` calls `has_entity_permission(entity_id, auth.uid(), 'waybill', action)`.

With no `waybill` rows, the predicate is false for every workspace member.

Result:

- The Waybills list returns 0 rows.
- The query succeeds at the grant level.
- RLS filters out every row.

### 4.2 Missing table grant for `blank_waybill_logs`

The tenant `blank_waybill_logs` table has no grant for `authenticated`.

The table was cloned by `20260810040000_waybill_data_migration.sql` via `_prov_clone_table()` and `_prov_install_rls()`.

Those functions grant nothing.

`_prov_install_rls()` only:

- Enables RLS.
- Forces RLS.
- Creates four policies.

It does not issue any GRANT statement.

Result:

- Any query on tenant `blank_waybill_logs` fails before RLS is evaluated.
- The error is `permission denied for table blank_waybill_logs`.

This is why the tenant `waybills` SELECT works (0 rows via RLS) but the `blank_waybill_logs` access fails (grant-level denial).

## 5. Why Base Tenant Tables Work

The base tenant tables such as `invoices` and `waybills` receive grants from an un-migrated source.

The migration history has:

- No `ALTER DEFAULT PRIVILEGES` anywhere.
- Only 4 migrations with GRANT statements:
  - `20260730000000` (function EXECUTE)
  - `20260814000002` (to authenticated)
  - `20260815000000` (to authenticated)
  - `20260817000000` (to anon, authenticated, service_role)
- No grants on original base tenant tables.

The original provisioning that granted the base tables is not recorded in the migration files.

This is consistent with the symptoms:

- `waybills` (base table): has a grant, SELECT works.
- `blank_waybill_logs` (later clone): no grant, access denied.

The fix adds explicit grants regardless. It is version-independent.

## 6. Files Changed

### 6.1 Migration added

- `supabase/migrations/20260819000001_waybill_permission_and_grant_fix.sql` (new)

The migration:

1. Resolves the entity id from the schema name `entity_bigdrops-main_main`.
2. Backfills `waybill` view/create/edit/delete permission rows.
3. Grants SELECT/INSERT/UPDATE/DELETE on tenant `waybills` and `blank_waybill_logs`.

### 6.2 Report added

- `docs/Reports/multi-tenancy/waybill-tenant-migration-investigation.md` (this file)

### 6.3 Files read, not changed

- `supabase/migrations/20260817000000_plan_c_live_entity_backfill.sql`
- `supabase/migrations/20260814000001_quotation_permission_seed.sql`
- `supabase/migrations/20260714000000_multi_tenancy_core.sql`
- `supabase/migrations/20260717000000_entity_provisioning_engine.sql`
- `supabase/migrations/20260810030000_waybill_aggregate_provisioning.sql`
- `supabase/migrations/20260810040000_waybill_data_migration.sql`
- `supabase/migrations/20260814000002_quotation_items_permission_fix.sql`
- `supabase/migrations/20260815000000_plan_a_template_and_financial_view_drift.sql`
- `supabase/migrations/20260818000000_seed_wildcard_creator_permission.sql`
- `supabase/migrations/20260818000000_creator_wildcard_permission_seed.sql`
- `supabase/migrations/20260818000001_multi_tenancy_invitation_correctness.sql`
- `supabase/migrations/20260819000000_preloaded_roles_and_assignment.sql`
- `src/config/moduleAdapters.ts`
- `src/pages/WaybillFormPage.tsx`
- `src/pages/Waybills.tsx`
- `src/domain/waybill/waybillMutations.ts`
- `src/lib/tenantClient.ts`

## 7. Skills Used

Skills used: pdf-rendering-correctness, waybill-template-debug, audit-trail-investigation

Documentation standard: ADS-STE100 Simplified Technical English

## 8. Changes Made

### 8.1 Permission backfill

The migration inserts `waybill` rows for the `waybill` resource:

- resource: `waybill`
- action: `view`, `create`, `edit`, `delete`

The migration targets every user who already holds a permission on the entity.

This covers:

- The workspace owner.
- Any invited members.

The migration does not invent a new membership model.

The insert uses `ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING`.

### 8.2 Table grants

The migration grants:

- `SELECT, INSERT, UPDATE, DELETE ON "entity_bigdrops-main_main".waybills`
- `SELECT, INSERT, UPDATE, DELETE ON "entity_bigdrops-main_main".blank_waybill_logs`

Granted to:

- `anon`
- `authenticated`
- `service_role`

This mirrors `plan-c-live-entity-backfill` (`20260817000000`).

## 9. Why Not Redefine the Seeder

The investigation considered redefining `_prov_seed_default_permissions()`.

The decision was NOT to redefine it.

Reason:

- Two duplicate 20260818 wildcard migrations already redefine the seeder.
- Both use `('*', view/create/edit/delete)` for new entities.
- A third redefinition would create ambiguity about which version is live.
- The live entity needs a targeted backfill, not a seeder change.

The backfill is seeder-version-independent.

## 10. RLS Helper Details

The RLS helper is `public.has_entity_permission()`.

Definition (from `20260714000000_multi_tenancy_core.sql`):

```sql
CREATE OR REPLACE FUNCTION public.has_entity_permission(
    p_entity_id uuid,
    p_user_id uuid,
    p_resource text,
    p_action text
) RETURNS boolean
```

The helper returns true when:

- `(ep.resource = p_resource AND ep.action = p_action)`
- OR `(ep.resource = '*' AND ep.action = p_action)`
- OR `(ep.resource = p_resource AND ep.action = '*')`
- OR `(ep.resource = '*' AND ep.action = '*')`

`_prov_install_rls()` (`20260717000000`) creates four policies per table:

- SELECT: `has_entity_permission(entity_id, auth.uid(), resource, 'view')`
- INSERT: `has_entity_permission(entity_id, auth.uid(), resource, 'create')`
- UPDATE: `has_entity_permission(entity_id, auth.uid(), resource, 'edit')`
- DELETE: `has_entity_permission(entity_id, auth.uid(), resource, 'delete')`

The resource for both `waybills` and `blank_waybill_logs` is `'waybill'`.

The `_prov_table_to_resource()` mapping in `20260810030000`:

- `waybills` → `'waybill'`
- `blank_waybill_logs` → `'waybill'`

## 11. Waybill Aggregate Provisioning

`20260810030000_waybill_aggregate_provisioning.sql` has an 18-table template.

The template includes `'waybills'` and `'blank_waybill_logs'`.

The 18 tables are:

1. clients
2. settings
3. signatories
4. bank_accounts
5. projects
6. quotations
7. invoices
8. invoice_items
9. payments
10. wht_receipts
11. csrs
12. waybills
13. blank_waybill_logs
14. tax_settings
15. receipts
16. letters
17. boqs
18. rfqs

The `_prov_table_to_resource()` mapping is at lines 49-50.

## 12. Why `blank_waybill_logs` Was Not Granted

`20260810040000_waybill_data_migration.sql` clones `blank_waybill_logs`.

The clone path:

1. `_prov_create_schema()` (lines 207-220) — creates schema only, no grants.
2. `_prov_clone_table()` (line 224+) — copies structure and data, no grants.
3. `_prov_install_rls()` (line 309+) — enables RLS and creates policies, no grants.

No GRANT statement runs in this path.

The original base tables received grants from an un-migrated source.

The later clones did not.

## 13. Frontend Access Path

The frontend uses `tenantClient`.

`tenantClient.isReady` is `schemaName !== null`.

For the live entity the schema name is set. The tenantClient is ready.

Every waybill path hits the tenant schema.

The waybill access path:

- `src/config/moduleAdapters.ts` — `waybillsAdapter` (lines 388-433).
- `resolveFetchClient` (lines 22, 135-136).
- `src/pages/WaybillFormPage.tsx` — `blank_waybill_logs` select (line 97), insert (line 108).
- `src/domain/waybill/waybillMutations.ts`.
- `src/lib/tenantClient.ts`.

The cache `bd:list:waybills:v1:all` has a TTL of 5 minutes.

The cache is not the cause of the 0-row result.

## 14. Verification

This report covers a database fix. The local repo has no database connection.

Verification of the migration itself:

- `bun run audit:load`: not applicable (no TypeScript change).
- `bun run typecheck`: not applicable (no TypeScript change).
- `git status`: new untracked files:
  - `supabase/migrations/20260819000001_waybill_permission_and_grant_fix.sql`
  - `docs/Reports/multi-tenancy/waybill-tenant-migration-investigation.md`
- `bun run build`: skipped due to hardware policy.

The migration was executed against production via `supabase db query --linked` on 2026-08-19.

All post-execution checks passed:

1. Tenant `waybills` count is 18 (non-zero).
2. Tenant `blank_waybill_logs` count is 24. The table now has SELECT/INSERT/UPDATE/DELETE grants for `anon`, `authenticated`, and `service_role`.
3. `entity_permissions` now has `waybill` view/create/edit/delete rows for the owner.
4. `has_entity_permission(entity, owner, 'waybill', 'view')` returns `true`.
5. Frontend Waybills list and download should now succeed. The frontend cache `bd:list:waybills:v1:all` has a 5-minute TTL, so the user may need to wait up to 5 minutes or clear the cache.

## 15. Risks and Limitations

- The source of the original base-table grants is not confirmed.
  This does not block the fix.
  The fix adds explicit grants.
- The migration grants to `anon`.
  RLS still gates access via `has_entity_permission()`.
  Anonymous users have no permission rows, so RLS blocks them.
- The migration does NOT redefine `_prov_seed_default_permissions()`.
  New entities created after the wildcard migrations get `'*'` rows.
  New entities created by the quotation-era seeder may still miss `waybill`.
  The live entity is handled by the explicit backfill.
- The 20260818 wildcard migrations share timestamp `20260818000000`.
  Only one version may be applied.
  This is a pre-existing ambiguity.
  The backfill is seeder-version-independent.

## 16. Deferred Work

- Verify the live database after migration execution. DONE 2026-08-19: all checks passed.
- Confirm the source of the original base-table grants.
- Confirm whether `20260810040000` and the 20260818 wildcard migrations are applied to production.
- The data-copy portion of Phase 4 of the migration plan (blocked by the ownership rule).
- The public `waybills` provenance (see `20260520090004_csrs.sql` and `20260520090006_devices.sql`).

## 17. Execution Result

The migration was executed against production on 2026-08-19.

Execution method: `supabase db query --linked --file supabase/migrations/20260819000001_waybill_permission_and_grant_fix.sql`

The migration is idempotent. It can be re-run safely.

Deferred work:

- Confirm the source of the original base-table grants.
- Confirm whether `20260810040000` and the 20260818 wildcard migrations are applied to production.
- The data-copy portion of Phase 4 of the migration plan (blocked by the ownership rule).
- The public `waybills` provenance (see `20260520090004_csrs.sql` and `20260520090006_devices.sql`).