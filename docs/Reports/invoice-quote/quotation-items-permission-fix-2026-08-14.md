# Quotation Items Permission Root Cause and Fix Report

This report was written by DeepSeek (opencode) on 2026-08-14 via Local Runner.

## Objective

- Identify why quotation SASQUO-287 renders with zero items in the View page.
- Identify why inserting a quotation item fails with `permission denied for table "quotation_items"`.
- Fix both failures with the smallest correct database change.

## Scope

- Quotation item insert, view, and list behavior.
- Tenant table grants for the production entity.
- Tenant RLS resource mapping for item tables.
- No invoice changes.
- No JavaScript changes.

## Files Changed

- `supabase/migrations/20260814000002_quotation_items_permission_fix.sql` (new)

## Skills Used

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English

## Root Cause

The production entity `entity_bigdrops-main_main` had two independent defects on its tenant `quotation_items` table.

### 1. Missing table grants

The tenant table `entity_bigdrops-main_main.quotation_items` had privileges for the `postgres` role only. The app roles had none:

| Role | Privileges |
|------|------------|
| `postgres` | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| `authenticated` | none |

The working sibling item table `invoice_items` has `DELETE, INSERT, SELECT, UPDATE` for `authenticated`. The quotation item table did not. Any app INSERT therefore failed with `permission denied for table "quotation_items"`.

### 2. RLS resource mismatch

The tenant `quotation_items` RLS policies were installed with the resource `'quotation_items'`:

```sql
has_entity_permission('...'::uuid, auth.uid(), 'quotation_items', 'view')
```

The `public.entity_permissions` table has `quotation` rows only. It has no `quotation_items` rows. Therefore every policy returned false. The View query returned zero rows, so the quotation appeared empty.

### 3. Why the wrong resource was installed

The provisioning helper `public._prov_table_to_resource()` maps each tenant table to a permission resource. Its mapping had no entry for `quotation_items`. The function fell through to `ELSE p_table` and returned `'quotation_items'`.

The data migration `20260810010000_quotation_data_migration.sql` cloned the tenant table with `_prov_clone_table` and installed RLS with `_prov_install_rls`. It passed the wrong resource into `_prov_install_rls`. The wrong resource was baked into the four policies.

### 4. Why grants were missing

The provisioning engine installs RLS policies only. It never grants table privileges. `_prov_clone_table` uses `CREATE TABLE ... LIKE ... INCLUDING ALL`, which does not copy grants. Tenant table grants were applied manually during rollout. The `quotation_items` table was missed.

## Live Database Evidence

Probes ran against the linked production project via `supabase db query --linked`.

- Tenant `quotation_items` grants for `authenticated`: 0 (before fix)
- Tenant `quotation_items` grants for `authenticated`: 4 (after fix)
- Tenant `quotation_items` RLS policies: 4, all using resource `'quotation_items'` (before fix)
- Tenant `quotation_items` RLS policies: 4, all using resource `'quotation'` (after fix)
- `_prov_table_to_resource('quotation_items')`: returned `'quotation_items'` (before fix), `'quotation'` (after fix)
- SASQUO-287 item row intact: item `8b3ce333-22a9-4ce4-b1c4-dd2e503dc2f4`, quotation `b2bef53a-9918-4a0f-a799-d0c5bbd57cff`, quantity 1.00, amount 33950000.00

## Fix Applied

The migration `20260814000002_quotation_items_permission_fix.sql` does two things.

### 1. Extended the resource mapping

The function `public._prov_table_to_resource()` now includes:

```sql
WHEN 'quotation_items' THEN 'quotation'
```

This applies to all future provisioned entities. The provisioning engine calls this function during `_prov_install_rls`. New tenants now install the correct resource.

### 2. Repaired the production entity

The migration resolves the production entity from the schema name `entity_bigdrops-main_main`. It then:

1. Drops the four wrongly-resourced policies on tenant `quotation_items`.
2. Reinstalls RLS with resource `'quotation'` via `_prov_install_rls`.
3. Grants `SELECT, INSERT, UPDATE, DELETE` on tenant `quotation_items` to `authenticated`.

The grant matches `invoice_items`, the working sibling item table. The policy drop loop is idempotent. Re-running the migration is safe.

## Verification

Applied to the linked project via `supabase db query --linked`.

After the fix:

- `authenticated` has DELETE, INSERT, SELECT, UPDATE on tenant `quotation_items`.
- All four RLS policies reference `has_entity_permission(..., 'quotation', ...)`.
- `_prov_table_to_resource('quotation_items')` returns `'quotation'`.
- The SASQUO-287 item row is intact.

Commands:

- `bun run audit:load`: passed
- `bun run typecheck`: passed
- `git status`: new migration file staged
- `bun run build`: skipped due to hardware policy

## Risks or Limitations

- The live verification could not execute a real user session against the tenant RLS. The evidence is based on the grant table, the policy expressions, and the helper output. A full end-to-end test requires the application UI.
- Other tenant tables have zero app grants. Examples: `blank_csr_logs`, `blank_waybill_logs`, `project_documents`, `project_financials_v`, `wht_receipts`. These are outside the scope of this fix.

## Deferred Work

- Re-run the end-to-end quotation item save flow in the application to confirm the fix in the UI.
- Review the zero-grant tenant tables listed in Risks. Apply the same grant pattern if their features require app access.
