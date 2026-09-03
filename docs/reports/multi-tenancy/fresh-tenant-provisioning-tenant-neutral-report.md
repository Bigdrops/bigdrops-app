# Fresh-Tenant Provisioning Tenant-Neutral Repair Report

This report was written by Buffy on 2026-09-02 via Freebuff.

## Objective

Make BIGDROPS fresh-company provisioning fully automatic, tenant-neutral, and repeatable. Eliminate every active dependency on `entity_bigdrops-main_main` from the provisioning engine.

## Scope

- `supabase/migrations/20260902140000_provisioning_tenant_neutral.sql`
- `tenant_master_template` schema
- `provision_entity()` function
- `_prov_install_canonical_triggers()` (new function)
- Existing tenant view reinstallation

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260902140000_provisioning_tenant_neutral.sql` | New migration — tenant-neutral provisioning repair |

## Skills Used

NONE

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### 1. Dropped broken views from `tenant_master_template`

The template contained 3 views (`invoice_financials_v`, `project_financials_v`, `item_price_summary_v`) that were cloned from `entity_bigdrops-main_main` and contained hardcoded references to that schema. These views would propagate broken cross-schema references to every new tenant.

Dropped all 3 views. The template now has 32 tables and 0 views.

Views are created correctly during provisioning by `_prov_install_financial_views()` and `_prov_install_item_library()`, which use `format()` to scope views to the target tenant schema.

### 2. Created `_prov_install_canonical_triggers()`

New function that creates the standard trigger set (`set_row_updated_at`, `stamp_row_ownership`) on a target table without requiring a source schema.

- Introspects the target table's columns to decide which triggers apply
- Uses `public.set_row_updated_at()` and `public.stamp_row_ownership()` (existing public functions)
- No dependency on any specific tenant schema
- Handles `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` idempotently

### 3. Updated `provision_entity()`

Step 9 now calls `_prov_install_canonical_triggers(v_schema_name, v_table)` instead of `_prov_install_triggers('entity_bigdrops-main_main', v_schema_name, v_table)`.

The old `_prov_install_triggers()` function is preserved for backward compatibility with historical migration scripts but is no longer used by the active provisioning path.

### 4. Backfilled views on existing tenants

The migration's `DO $$` block iterates all `entity_*` schemas and calls `_prov_install_financial_views()` and `_prov_install_item_library()` to ensure existing tenants have tenant-neutral views.

## Verification Result

| Check | Result |
|-------|--------|
| `entity_bigdrops-main_main` exists | ✅ 32 tables, 30 functions, 3 views, 8 triggers |
| `tenant_master_template` has 0 views | ✅ 0 views |
| `tenant_master_template` has 32 tables | ✅ 32 tables |
| `provision_entity()` has no `entity_bigdrops-main_main` reference | ✅ grep confirms 0 active references |
| `_prov_install_canonical_triggers()` exists | ✅ deployed |
| `provision_entity()` calls `_prov_install_canonical_triggers()` | ✅ confirmed |
| Existing tenants have tenant-neutral views | ✅ Both Main and Agbado verified |
| No bare `RETURNS activity_events` in new migration | ✅ clean |
| No `public.activity_events` / `public.audit_logs` in new migration | ✅ clean (comments only) |
| `bun run build` | Skipped (hardware policy) |

## Remaining Acceptance Gate

The provisioning engine is now fully tenant-neutral. The final acceptance test requires:

1. Create ONE new disposable company through the **normal BIGDROPS UI** company creation flow
2. Verify provisioning completes automatically (status = `ready`)
3. Verify the new tenant has all required objects (32 tables, 30 functions, 3 views, 8 triggers, RLS policies, settings, permissions)
4. Verify views reference the new tenant schema, not `entity_bigdrops-main_main`
5. Verify no references to deleted public operational tables

**This test must be performed by a human through the application UI.** The CLI cannot simulate the full UI creation flow with proper JWT context.

## Risks or Limitations

- The acceptance test requires human UI interaction
- `_prov_install_triggers()` is preserved but unused by the active provisioning path
- Template has 0 views — this is by design (views are created by dedicated functions during provisioning)

## Deferred Work

- Delete disposable test tenants (Agbado, any future test companies) after acceptance
- Consider removing `_prov_install_triggers()` in a future cleanup migration
