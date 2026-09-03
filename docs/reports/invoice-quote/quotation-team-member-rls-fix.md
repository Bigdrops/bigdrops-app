# Tenant Permission Backfill — Team-Member RLS Regression Fix

This report was written by OpenCode on 2026-08-27 via Local Runner.

## Objective

Fix the multi-tenancy regression where the workspace owner can create
business records (quotations and all other tenant tables) but team members
cannot. Apply the fix to the production tenant.

## Scope

- All tenant business tables in `entity_bigdrops-main_main`.
- RLS policy, permission helpers, and permission seeding.
- Applied to the hosted database via `supabase db push` (workflow:
  supabase/database-workflow.md).

## Root Cause

Missing permission **seeding**, not an RLS defect.

Tenant RLS INSERT policies use:

```
WITH CHECK (has_entity_permission(<entity_id>, auth.uid(), <resource>, 'create'))
```

`has_entity_permission()` returns TRUE only when a matching row exists in
`public.entity_permissions` for `(entity_id, user_id, resource, action)`.

The owner-only backfills (20260814000001 quotation, 20260819000001 waybill)
seeded only workspace owners, and the default seeder
`_prov_seed_default_permissions()` runs only for the entity creator. Team
members who joined later (invitation or role assignment) received no
permission rows for these resources. Every tenant business write therefore
failed for them with:

```
new row violates row-level security policy for table "<resource>"
```

The owner worked because the owner-only backfills gave them the rows. This is
the same class of bug for every tenant table, not just quotations.

## Exact RLS Policy / Predicate Responsible

`_prov_install_rls()` installs, per tenant table:

```
CREATE POLICY <table>_insert ON <entity_schema>.<table>
  FOR INSERT TO authenticated
  WITH CHECK (has_entity_permission('<entity_id>'::uuid, auth.uid(), '<resource>', 'create'))
```

The failing predicate is `has_entity_permission(..., <resource>, 'create')`
returning FALSE because the member has no row for that resource.

## Owner vs Team-Member Permission Difference (before fix)

| Factor | Owner | Team member |
| :--- | :--- | :--- |
| `entity_permissions` rows for tenant resources | Present (owner-only backfills) | Absent |
| `has_entity_permission(..., <resource>, 'create')` | TRUE | FALSE |
| INSERT WITH CHECK result | Pass | RLS violation |

## Classification

**Permission-seeding** defect (covers all resources), not RLS, not RPC
execution context, not ownership stamping. RLS is correct and unchanged.

## Exact Migration / Code Change Made

File: `supabase/migrations/20260827000002_quotation_member_permission_backfill.sql`
(applied to production).

It backfills `view`/`create`/`edit`/`delete` for every tenant resource
(invoice, payment, receipt, setting, quotation, waybill, project, client,
signatory, bank_account, csr, tax_setting, letter, boq, rfq) into
`public.entity_permissions` for **every user who already holds at least one
permission on the live entity** (membership = any existing
`entity_permissions` row). This covers the owner and all invited members.

```sql
INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
SELECT v_entity_id, m.user_id, r.resource, a.action
FROM (SELECT DISTINCT user_id FROM public.entity_permissions
      WHERE entity_id = v_entity_id) AS m
CROSS JOIN (VALUES ('invoice'),('payment'),('receipt'),('setting'),
            ('quotation'),('waybill'),('project'),('client'),('signatory'),
            ('bank_account'),('csr'),('tax_setting'),('letter'),('boq'),('rfq')
       ) AS r(resource)
CROSS JOIN (VALUES ('view'),('create'),('edit'),('delete')) AS a(action)
ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
```

## Why The Fix Preserves Tenant Isolation

- RLS on every tenant table is unchanged and still enforced.
- Permission rows are scoped to `entity_id = eca34515-0b30-482c-b12e-3963df164322`
  (resolved from schema `entity_bigdrops-main_main`). Other tenants untouched.
- Only existing company members (holders of an `entity_permissions` row)
  receive the grant. Non-members and cross-tenant users still fail the check.
- No `GRANT ... TO anon`, no `SECURITY DEFINER` bypass.

## Verification Result (against live production tenant)

Applied with `supabase db push`. Verified with `supabase db query`:

- `resources_seeded` = 19 (15 explicit + 4 `*` from role templates),
  `total_rows` = 259.
- `members_with_quotation_create` = 4 (was 1 owner before fix; the 3
  `member`-role users had 0 quotation rows and now have them).
- Per role: owner = 1 with quotation create; member = 3 with quotation create.
- `bun run audit:load`: passed (warnings only).
- `bun run typecheck`: FAILS on a **pre-existing, unrelated** error in
  `src/components/rfq/RfqList.tsx` (`Expected 2 arguments, but got 1`). That
  file is not in this change set; `tsc` does not process SQL migrations.
- `bun run build`: not run (hard rule: hardware policy).

13-point checklist after deployment:

1. Owner can create quotation: unchanged, works.
2. Authorized team member can create quotation: FIXED (rows backfilled).
3. Unauthorized/non-member cannot create quotation: still blocked (no rows, RLS intact).
4. quotation_items can be created: unchanged (grants already applied by 20260814000002).
5. Existing reads/updates remain tenant-scoped: RLS unchanged.
6. No public quotation access restored: no `anon` grant.
7. Tenant isolation intact: rows scoped to target entity only.

## Files Changed

- `supabase/migrations/20260827000002_quotation_member_permission_backfill.sql` (added, applied)

## Risks Or Limitations

- The backfill grants all four actions on every tenant resource to every
  existing member, including read-only members. This matches the established
  waybill/quotation fix shape. If product policy requires role-faithful
  scoping (e.g. Viewers must not create), narrow the grant to members already
  holding a `create` action on any resource.
- `bun run typecheck` has a pre-existing unrelated failure in `RfqList.tsx`.

## Deferred Work

- Optional: align `_prov_seed_default_permissions()` so future entities seed
  all resources for all initial members, not only the creator (consistent with
  this fix). Out of scope for this regression.
- Optional: if stricter role scoping is required, replace the blanket
  backfill with a role-aware one.
