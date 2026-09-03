# Fresh Company Provisioning Forensic Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## A. Fresh Company Identity

| Field | Value |
|-------|-------|
| Entity ID | `ab20ab4a-cb7e-4562-9e5f-b2d22212679f` |
| Display Name | Agbado |
| Slug | `agbado` |
| Entity Type | `company` |
| Workspace ID | `eb30b64b-7f95-464f-be1a-805cf2c0fedc` |
| Workspace Slug | `bigdrops-main` |
| Workspace Name | BIGDROPS |
| Created At | `2026-09-02 08:10:23.106201+00` |
| is_active | `true` |

---

## B. Provisioning State

| Field | Value |
|-------|-------|
| Status | `failed` |
| Attempt Count | 1 |
| Retry Limit | (default: 3) |
| Last Error | `type "activity_events" does not exist` |
| Updated At | `2026-09-02 08:10:23.665024+00` |

The entity was created at `08:10:23.106` and provisioning failed by `08:10:23.665` — the entire attempt took approximately 0.56 seconds. One attempt was made. No retries occurred.

---

## C. Tenant Schema State

| Check | Result |
|-------|--------|
| Schema `entity_agbado` exists? | **NO** |
| Partial tables? | None — cleanup removed the schema |
| Cleanup ran? | **YES** — `_prov_cleanup_on_error()` dropped the schema on failure |

The provisioning exception handler executed `_prov_cleanup_on_error(v_schema_name)`, which runs `DROP SCHEMA <schema> CASCADE` if the schema exists. The schema was either never created or was created and immediately cleaned up.

---

## D. Actual Creation Call Chain

```
UI: CreateCompanySheet.tsx / CompanyCreation.tsx
  → createEntity({ workspaceId, displayName, slug })
    → supabase.from('entities').insert(...)
    → Entity row created in public.entities
  → provisionEntity(entity.id)
    → supabase.rpc('provision_entity', { p_entity_id: entityId })
    → provision_entity(p_entity_id uuid)  [SECURITY DEFINER]
      → Step 1: _prov_validate_permissions(entity_id)
        → SELECT from public.entities, public.workspace_members
      → Step 2: _prov_check_idempotency(entity_id)
        → SELECT from public.entity_provisioning_status
      → Step 3: pg_advisory_xact_lock(hashtext(entity_id))
      → Step 4: _prov_get_schema_name(entity_id)
        → Returns 'entity_agbado'
      → Step 5: _prov_update_status(entity_id, 'creating')
        → INSERT/UPDATE entity_provisioning_status
      → Step 6: _prov_create_schema('entity_agbado')
        → CREATE SCHEMA entity_agbado
      → Step 7: Clone loop (32 tables)
        → _prov_get_template_tables() → ARRAY[32 table names]
        → FOREACH table:
            → _prov_clone_table('tenant_master_template', 'entity_agbado', table)
              → CREATE TABLE entity_agbado.<table> (LIKE tenant_master_template.<table> INCLUDING ALL)
              → DROP foreign keys referencing template
            → _prov_install_rls('entity_agbado', table, entity_id, resource)
              → CREATE POLICY ... ON entity_agbado.<table> ...
      → Step 8: FK loop (32 tables)
        → _prov_readd_foreign_keys('tenant_master_template', 'entity_agbado', table)
      → Step 9: _prov_install_tenant_rpcs('entity_agbado')
        → Creates ~30 tenant-local RPC functions via EXECUTE
        → ❌ FAILS: function body contains "RETURNS activity_events"
        → ❌ public.activity_events does not exist → type error
        → EXCEPTION caught by WHEN OTHERS
      → Step 13: EXCEPTION handler
        → _prov_cleanup_on_error('entity_agbado') → DROP SCHEMA CASCADE
        → _prov_update_status(entity_id, 'failed', 'type "activity_events" does not exist')
        → Returns { status: 'failed', error: '...' }
  → Frontend receives { status: 'failed' }
    → Displays: "Provisioning failed during schema creation."
```

**Exact failure step:** Step 9 — `_prov_install_tenant_rpcs('entity_agbado')`.

---

## E. Exact Failure Point

### Primary Failure: `_prov_install_tenant_rpcs()` → embedded function bodies

The function `_prov_install_tenant_rpcs(p_schema_name text)` creates approximately30 tenant-local functions via `EXECUTE` of dynamically constructed SQL. The SQL text is embedded as string literals within the function body.

**21 embedded functions** contain `RETURNS activity_events` in their declaration. These functions also have `SET search_path TO 'public'`. When PostgreSQL creates each function, it resolves the return type `activity_events` against `search_path`. Since `public.activity_events` was dropped by the purge migration, the type does not exist in `public`, and the `CREATE FUNCTION` statement fails with:

```
ERROR: type "activity_events" does not exist
```

**4 embedded functions** contain direct references to `public.activity_events` in their body (INSERT/SELECT). Even if the return-type issue were fixed, these body references would also fail.

**21 embedded functions** call `public.record_activity_event(...)`. This function does NOT exist in `public` (verified). It was apparently removed or never migrated to survive the purge. This is an additional failure point that would be hit if the return-type issue were fixed first.

### Secondary Failure (Latent): `_prov_seed_settings()` argument order

`provision_entity()` calls:
```sql
PERFORM public._prov_seed_settings(v_schema_name, p_entity_id);
--                   text first,     uuid second
```

But `_prov_seed_settings` is defined as:
```sql
_prov_seed_settings(p_entity_id uuid, p_schema_name text)
--                 uuid first,       text second
```

The arguments are **swapped**. This would cause a type mismatch error (`text` cannot be implicitly cast to `uuid`). This bug is currently masked because `_prov_install_tenant_rpcs()` fails first. If the RPC installation bug were fixed alone, provisioning would then fail at the settings seed step.

---

## F. public.* Dependency Analysis

All references to `public.*` objects inside `_prov_install_tenant_rpcs()` embedded function bodies:

| Reference | Count | Status | Classification |
|-----------|-------|--------|----------------|
| `public.activity_events` | 4 | ❌ Dropped by purge | **REAL FAILURE** — type/table resolution fails |
| `public.record_activity_event` | 21 | ❌ Does not exist | **REAL FAILURE** — function call fails |
| `public.audit_logs` | 2 | ❌ Dropped by purge | **REAL FAILURE** — table reference fails |
| `public.has_entity_permission` | 4 | ✅ Exists | LEGITIMATE CONTROL-PLANE — no issue |
| `public.compute_jsonb_diff` | 1 | ✅ Exists | LEGITIMATE CONTROL-PLANE — no issue |
| `public._audit_resolve_invoice_schema` | 1 | ✅ Exists | LEGITIMATE CONTROL-PLANE — no issue |

### Template Views (Latent Issue)

The views in `tenant_master_template` (`invoice_financials_v`, `item_price_summary_v`, `project_financials_v`) are hardcoded to reference `entity_bigdrops-main_main`:

```sql
FROM "entity_bigdrops-main_main".invoices i
LEFT JOIN "entity_bigdrops-main_main".payments p ON p.invoice_id = i.id
```

When these views are cloned to a new tenant schema via `LIKE ... INCLUDING ALL`, the view definitions still reference `entity_bigdrops-main_main`. The `_prov_install_financial_views()` and `_prov_install_item_library()` functions create correctly-scoped views, but `provision_entity()` does NOT call these functions. The cloned views from the template would query the wrong schema. This is a latent issue that would surface when a new tenant tries to use `invoice_financials_v` or `item_price_summary_v`.

---

## G. Master Template Verification

| Check | Result |
|-------|--------|
| Schema `tenant_master_template` exists | ✅ Yes |
| Table count | 32 (all expected tables present) |
| Zero business data | ✅ Confirmed (all tables have 0 rows) |
| Views | 3 (`invoice_financials_v`, `item_price_summary_v`, `project_financials_v`) |
| Triggers | Preserved from source (8 triggers) |
| Foreign keys | Dropped (intentionally — re-added by provisioning engine) |
| RLS policies | Not in template (installed per-entity) |
| Indexes | Preserved from source |

**The template is structurally sufficient for `provision_entity()`.** It contains the correct32 tables with the correct structure. The template itself is not the cause of the failure.

### Template Dependency on entity_bigdrops-main_main

The template was cloned from `entity_bigdrops-main_main` via `LIKE ... INCLUDING ALL`. All structural elements (columns, constraints, indexes, triggers) are present. However, the3 views were created using `pg_get_viewdef()` from the source schema, which produced definitions hardcoded to `entity_bigdrops-main_main`. This is a structural defect in the template views.

---

## H. Repository vs Deployed DB Comparison

| Function | Repository Migration | Deployed | Match? |
|----------|---------------------|----------|--------|
| `provision_entity()` | `20260902055836` | `20260902055836` | ✅ YES — uses `tenant_master_template` |
| `_prov_clone_table()` | `20260902055836` | `20260902055836` | ✅ YES — generic source schema |
| `_prov_get_template_tables()` | `20260902055836` | `20260902055836` | ✅ YES — 32 tables |
| `_prov_install_tenant_rpcs()` | `20260827000000` | `20260827000000` | ❌ **NOT UPDATED** — still references `public.activity_events` |
| `_prov_seed_settings()` | `20260809000000` | `20260809000000` | ⚠️ Argument order not updated in migration |
| `_prov_cleanup_on_error()` | `20260717000000` | `20260717000000` | ✅ OK |
| `_prov_validate_permissions()` | `20260717000000` | `20260717000000` | ✅ OK |
| `_prov_check_idempotency()` | `20260717000000` | `20260717000000` | ✅ OK |
| `_prov_get_schema_name()` | `20260717000000` | `20260717000000` | ✅ OK |
| `_prov_create_schema()` | `20260717000000` | `20260717000000` | ✅ OK |
| `_prov_update_status()` | `20260717000000` | `20260717000000` | ✅ OK |
| `_prov_install_rls()` | `20260717000000` | `20260717000000` | ✅ OK |
| `_prov_readd_foreign_keys()` | `20260717000000` | `20260717000000` | ✅ OK |
| `_prov_install_triggers()` | Not called by provision_entity | N/A | OK — triggers cloned via LIKE |
| `_prov_install_financial_views()` | Not called by provision_entity | N/A | OK — views cloned via LIKE (but wrong) |
| `_prov_install_item_library()` | Not called by provision_entity | N/A | OK |
| `_prov_seed_default_permissions()` | `20260717000000` | `20260717000000` | ✅ OK |
| `_prov_table_to_resource()` | `20260717000000` | `20260717000000` | ✅ OK |

**Critical mismatch:** `_prov_install_tenant_rpcs()` was never updated after the public schema purge. The migration `20260902055836` updated the cloning source but missed the RPC installer function.

---

## I. Retry Path

### What the "Try Again" Button Calls

The `Try Again` button in `CreateCompanySheet.tsx` (line 125) and `CompanyCreation.tsx` (line 97) simply resets the UI phase to `'form'`:

```typescript
onClick={() => {
  setPhase('form')
  setError('')
}}
```

It does **NOT** call `provision_entity()` again. It resets the form so the user must re-enter the company name and re-submit the creation flow. This means:

1. A new entity row would be created in `public.entities`
2. A new provisioning attempt would run

There is **NO retry mechanism for an existing failed entity**. The user cannot retry provisioning for `entity_agbado` without creating a completely new company.

### What Would Be Needed for a Proper Retry

A proper retry should:
1. Call `provision_entity(entity_id)` for the existing entity
2. The idempotency check (`_prov_check_idempotency`) would detect `status = 'failed'` and allow re-provisioning
3. The function would create the schema and attempt provisioning again

### Original Database Error vs Displayed Error

| Source | Value |
|--------|-------|
| Actual PostgreSQL error | `type "activity_events" does not exist` |
| Stored in `entity_provisioning_status.last_error` | `type "activity_events" does not exist` |
| Displayed to user | `Provisioning failed during schema creation. The company was created but is not ready to use.` |

The frontend discards the original PostgreSQL error. The `provisionEntity()` function returns `{ status: 'failed', error: SQLERRM }`, and the frontend checks `provisionResult.status === 'failed'` but ignores the error field, displaying a hardcoded generic message instead.

---

## J. Root Cause

The `20260902055836_tenant_master_template.sql` migration updated `provision_entity()` to clone tables from `tenant_master_template` instead of `public`, but did NOT update `_prov_install_tenant_rpcs()`. That function's embedded SQL still creates tenant-local functions with `RETURNS activity_events` and `SET search_path TO 'public'`. Since `public.activity_events` was dropped by the `20260830` purge migration, PostgreSQL cannot resolve the `activity_events` type during `CREATE FUNCTION`, and the entire provisioning transaction fails. The error is caught by the exception handler, the tenant schema is dropped, and the user sees a generic error message that hides the actual root cause.

---

## K. Recommended Fix

### Immediate (Minimum Surgical Fix)

Update `_prov_install_tenant_rpcs()` to change all embedded function bodies from:

```sql
RETURNS activity_events
```

to:

```sql
RETURNS TABLE (/* explicit column definitions */)
```

And change all `public.activity_events` references in the function bodies to the target tenant schema (using the `__SCHEMA__` placeholder pattern already used for other tables).

And change all `public.record_activity_event(...)` calls to reference the correct function (which likely needs to be recreated as a tenant-local function or its logic inlined).

### Secondary Fix (Before Next Provisioning Attempt)

Fix the `_prov_seed_settings()` argument order in `provision_entity()`:

```sql
-- Current (WRONG):
PERFORM public._prov_seed_settings(v_schema_name, p_entity_id);

-- Correct:
PERFORM public._prov_seed_settings(p_entity_id, v_schema_name);
```

### Tertiary Fix (Latent — Before Template Clone)

Update the views in `tenant_master_template` to use unqualified table references instead of hardcoded `entity_bigdrops-main_main`:

```sql
-- Current (WRONG):
FROM "entity_bigdrops-main_main".invoices i

-- Correct:
FROM invoices i
```

Or, have `_prov_install_financial_views()` called by `provision_entity()` to install correctly-scoped views after cloning.

---

## L. Evidence

### Database Evidence

| Claim | Evidence | Query |
|-------|----------|-------|
| Entity "Agbado" exists, status=failed | Live DB query | `SELECT * FROM public.entities WHERE slug='agbado'` |
| Provisioning error = `type "activity_events" does not exist` | Live DB query | `SELECT * FROM public.entity_provisioning_status WHERE entity_id='ab20ab4a-...'` |
| Tenant schema `entity_agbado` does NOT exist | Live DB query | `SELECT nspname FROM pg_namespace WHERE nspname='entity_agbado'` |
| `public.activity_events` does NOT exist | Live DB query | `SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='activity_events')` |
| `public.record_activity_event` does NOT exist | Live DB query | `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname='record_activity_event' AND pronamespace=(...))` |
| `public.audit_logs` does NOT exist | Live DB query | `SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='audit_logs')` |
| `_prov_install_tenant_rpcs` has21 `RETURNS activity_events` | Live DB query | `pg_get_functiondef` + grep |
| `_prov_install_tenant_rpcs` has4 `public.activity_events` refs | Live DB query | `pg_get_functiondef` + grep |
| `_prov_install_tenant_rpcs` has21 `public.record_activity_event` refs | Live DB query | `pg_get_functiondef` + grep |
| `provision_entity()` uses `tenant_master_template` | Live DB query | `pg_get_functiondef(oid)` for provision_entity |
| `_prov_seed_settings` argument order mismatch | Live DB query + migration file comparison | Migration `20260902055836` vs function definition |
| Template views hardcoded to `entity_bigdrops-main_main` | Live DB query | `pg_get_viewdef` for views in `tenant_master_template` |
| Template has32 tables with 0 rows | Live DB query | `pg_tables` + `pg_stat_user_tables` |
| Migration `20260902055836` is applied | Live DB query | `supabase_migrations.schema_migrations` |

### File Evidence

| File | Line(s) | Evidence |
|------|---------|----------|
| `src/domain/tenant/tenantCreation.ts` | 64 | `supabase.rpc('provision_entity', { p_entity_id: entityId })` |
| `src/components/layout/CreateCompanySheet.tsx` | 125 | Generic error message displayed |
| `src/pages/CompanyCreation.tsx` | 97 | Generic error message displayed |
| `supabase/migrations/20260902055836_tenant_master_template.sql` | 238-330 | Updated provision_entity() |
| `supabase/migrations/20260827000000_tenant_rpc_provisioning.sql` | 1833+ | _prov_install_tenant_rpcs() (NOT updated) |

---

## Verification

- `bun run audit:load`: not required (no TypeScript changes)
- `bun run typecheck`: not required (no TypeScript changes)
- `git status`: read-only investigation, no changes made
- `bun run build`: skipped due to hardware policy

---

## Risks and Limitations

1. **No retry mechanism exists.** The "Try Again" button creates a new entity rather than retrying provisioning on the existing failed entity. This means a new entity row is created for every retry attempt, potentially orphaning the failed entity.

2. **Error masking.** The frontend displays a generic message and discards the actual PostgreSQL error. This makes debugging harder for operators and users.

3. **`_prov_seed_settings()` argument order.** A latent bug that would cause a second failure even if the RPC installation bug is fixed.

4. **Template views hardcoded to `entity_bigdrops-main_main`.** Would cause incorrect query results for new tenants, but does not block provisioning.

5. **`public.record_activity_event` does not exist.** Even after fixing the `activity_events` type reference, the21 calls to this non-existent function would cause a second wave of failures.

---

## Deferred Work

1. Update `_prov_install_tenant_rpcs()` to remove all `public.*` operational dependencies
2. Fix `_prov_seed_settings()` argument order in `provision_entity()`
3. Fix template views to use unqualified table references
4. Implement a proper retry mechanism that re-runs `provision_entity()` on the existing entity
5. Surface the actual PostgreSQL error in the UI (or at least in operator logs)
6. Add `provision_entity()` call to the retry path
7. Audit all other `_prov_*` functions for stale `public.*` references after the purge
