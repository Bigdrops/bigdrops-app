# Quotation RLS Permission Root Cause and Fix Report

This report was written by DeepSeek (opencode) on 2026-08-14 via Local Runner.

## Objective

- Identify why creating a new quotation fails with the error `new row violates row-level security policy for table "quotations"`.
- Identify why existing quotations appear to flash empty on the View and List pages.
- Fix the failure with the smallest correct database change.

## Scope

- Quotation insert, view, and list behavior.
- Tenant isolation and row-level security (RLS) rules.
- Database permission seeding for the production entity.
- No invoice changes.
- No JavaScript changes.

## Files Changed

- `supabase/migrations/20260814000001_quotation_permission_seed.sql` (new)

## Skills Used

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English

## Root Cause

### 1. Missing quotation permission rows

The production entity `entity_bigdrops-main_main` (id `eca34515-0b30-482c-b12e-3963df164322`) had permission rows only for these resources:

- `client`
- `invoice`
- `payment`
- `receipt`
- `setting`

The database had no `quotation` rows in `public.entity_permissions`. It also had no wildcard rows.

The default permission seeder `public._prov_seed_default_permissions()` never included `quotation` in its resource list. Therefore:

- `has_entity_permission(entity, user, 'quotation', 'view')` returned false.
- `has_entity_permission(entity, user, 'quotation', 'create')` returned false.

### 2. RLS policies blocked quotation access

The tenant table `entity_bigdrops-main_main.quotations` has these RLS policies:

| Command | Policy | Expression |
|---------|--------|------------|
| SELECT | `quotations_select` | `has_entity_permission(..., 'quotation', 'view')` |
| INSERT | `quotations_insert` | `WITH CHECK has_entity_permission(..., 'quotation', 'create')` |
| UPDATE | `quotations_update` | `has_entity_permission(..., 'quotation', 'edit')` |
| DELETE | `quotations_delete` | `has_entity_permission(..., 'quotation', 'delete')` |

Because the permission rows were absent, every policy returned false.

### 3. Why the save failed

The save path `src/hooks/useQuotationSave.ts` writes to the tenant client with:

```ts
tenantClient.from('quotations').insert([payload]).select().single()
```

The INSERT policy `WITH CHECK` returned false. The database rejected the row. This is the exact registry error reported.

### 4. Why the view flashed empty

The view path reads the tenant table. The SELECT policy returned false. The query returned no rows. The page navigated back to the list.

### 5. Why the list still showed data

The list adapter `src/config/moduleAdapters.ts` reads the public `quotations` table, not the tenant table. RLS on the public table did not block it. Therefore the list showed 321 rows while the tenant read failed.

## Live Database Evidence

The investigation used the Supabase Management API with the service role. This bypasses RLS, so it could prove the data and the permission state.

- Tenant `quotations` row count: 321
- Public `quotations` row count: 322
- `quotation` rows in `entity_permissions`: 0 (before fix)
- Permission rows for the production entity: 17 (before fix)
- Workspace owner: user `b676c7a8-7834-40dd-bc45-655822c5c5e6`
- Workspace id: `eb30b64b-7f95-464f-be1a-805cf2c0fedc`

## Fix Applied

The migration `20260814000001_quotation_permission_seed.sql` does two things.

### 1. Extended the seeder

The function `public._prov_seed_default_permissions()` now includes `quotation` in its resource list:

```sql
VALUES
    ('invoice'), ('payment'), ('receipt'), ('setting'), ('quotation')
```

This applies automatically to all future provisioned entities. The provisioning engine calls this function at step 8.7.

### 2. Backfilled the production entity

The migration resolves the production entity from the schema name `entity_bigdrops-main_main`. It then grants default permissions to each workspace owner.

The grant uses `INSERT ... ON CONFLICT DO NOTHING`. It is idempotent and safe to re-run.

## Verification

Applied to the linked project via `supabase db query --linked`.

After the fix:

- The production entity now has `quotation view/create/edit/delete` permission rows.
- The seeder function body includes `quotation`.
- The RLS policies exist and reference `quotation`.

Commands:

- `bun run audit:load`: passed
- `bun run typecheck`: passed
- `git status`: new migration file staged
- `bun run build`: skipped due to hardware policy

## Risks or Limitations

- The live verification could not execute a real user session against the tenant RLS. The evidence is based on the policy expressions and the permission rows. A full end-to-end test requires the application UI.
- The `quotation_items` tenant table count was not verifiable through the REST API. This does not affect the root cause or the fix.

## Deferred Work

- Re-run the end-to-end save flow in the application to confirm the fix in the UI.
- Review whether other resources such as `waybill` and `csr` have permission rows for the production entity. The migration pattern in this report applies to them if needed.
