# Fresh-Tenant Provisioning Repair Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Objective

Repair the generic BIGDROPS fresh-company provisioning engine so any brand-new company created through the normal UI flow provisions cleanly, deterministically, and repeatedly from zero to ready.

---

## Forensic Analysis Summary

### Agbado Failure Chain

Entity "Agbado" (`ab20ab4a-cb7e-4562-9e5f-b2d22212679f`) was created at 2026-09-02 08:10:23 and failed at 08:10:23.665 (559ms).

**Error:** `type "activity_events" does not exist`

**Root cause:** The `20260902055836_tenant_master_template.sql` migration updated `provision_entity()` to clone from `tenant_master_template` instead of `public`, but did NOT update `_prov_install_tenant_rpcs()`. That function's embedded SQL still creates tenant functions with:
- `RETURNS activity_events` (unqualified — resolves against `search_path TO 'public'`)
- `RETURNS audit_logs` (same issue)
- `public.activity_events` table references (purged)
- `public.audit_logs` table references (purged)
- `public.record_activity_event` function calls (purged)
- Unqualified `quotations` / `quotation_items` references (purged from public)

Since `public.activity_events` was dropped by the `20260830` purge, PostgreSQL fails with `type "activity_events" does not exist` on the first function creation attempt (function #4: `record_invoice_created`).

### Additional Masked Defects

| # | Defect | Severity | Was Masked By |
|---|--------|----------|---------------|
| 1 | `_prov_install_tenant_rpcs()` stale public refs | P0 | — (first failure) |
| 2 | `_prov_seed_settings()` args swapped | P0 | Defect #1 |
| 3 | `_prov_seed_default_permissions()` args wrong | P0 | Defect #1 |
| 4 | Template views hardcoded to `entity_bigdrops-main_main` | P1 | Defect #1 |
| 5 | Triggers not installed during provisioning | P1 | Defect #1 |
| 6 | Item library not installed during provisioning | P1 | Defect #1 |
| 7 | `revert_invoice_to_quotation_transaction` refs `public.quotations` | P1 | Defect #1 |

---

## Modified Files

| File | Change |
|------|--------|
| `supabase/migrations/20260902120000_provisioning_engine_repair.sql` | **NEW** — single migration fixing all provisioning defects |

---

## Changes Made

### 1. `_prov_install_tenant_rpcs()` — Schema-Qualified Types

**Problem:** 21 functions created with `RETURNS activity_events` (unqualified type) and 1 with `RETURNS audit_logs`. The `activity_events` and `audit_logs` composite types were destroyed when their parent tables were purged.

**Fix:** All embedded SQL now uses schema-qualified types:
- `RETURNS activity_events` → `RETURNS __SCHEMA__.activity_events` (21 functions)
- `RETURNS audit_logs` → `RETURNS __SCHEMA__.audit_logs` (1 function)
- `public.activity_events` → `__SCHEMA__.activity_events` (function #26 body)
- `public.audit_logs` → `__SCHEMA__.audit_logs` (function #25 body)

### 2. `_prov_install_tenant_rpcs()` — Self-Contained Activity Logging

**Problem:** Functions #4-24 call `public.record_activity_event(...)` which was purged. Function #26 (`record_activity_event`) itself called `public.record_activity_event` in a circular reference.

**Fix:** All 21 lifecycle RPCs now call `__SCHEMA__.record_activity_event(...)` (the tenant-local version). Function #26 is now fully self-contained — inserts directly into `__SCHEMA__.activity_events` with no public dependency.

### 3. `_prov_install_tenant_rpcs()` — Quotation Schema References

**Problem:** Function #27 (`revert_invoice_to_quotation_transaction`) used unqualified `quotations` and `quotation_items` which resolved to purged public tables.

**Fix:** Changed to `__SCHEMA__.quotations` and `__SCHEMA__.quotation_items` in both INSERT statements and variable declarations.

### 4. `provision_entity()` — Argument Order Fixes

**Problem:**
- `_prov_seed_settings(v_schema_name, p_entity_id)` — args swapped vs signature `(p_entity_id uuid, p_schema_name text)`
- `_prov_seed_default_permissions(v_schema_name, p_entity_id)` — args wrong vs signature `(p_entity_id uuid, p_user_id uuid)`

**Fix:**
- `_prov_seed_settings(p_entity_id, v_schema_name)` — correct order
- `_prov_seed_default_permissions(p_entity_id, auth.uid())` — correct args with creator identity

### 5. `provision_entity()` — Missing Provisioning Steps

**Problem:** The working tenant has triggers, financial views, and item-library functions that the provisioning engine never installs.

**Fix:** Added three new steps after FK re-addition:
- Step 9: `_prov_install_triggers(v_template_schema, v_schema_name, v_table)` — installs `set_row_updated_at` and `stamp_row_ownership` triggers on all 32 tables
- Step 10: `_prov_install_financial_views(v_schema_name)` — creates `invoice_financials_v` and `project_financials_v` scoped to the target schema
- Step 11: `_prov_install_item_library(v_schema_name, p_entity_id)` — installs `normalize_item_text`, `get_item_suggestions`, `item_price_summary_v`, and `merge_item_catalog_entries`

### 6. Backfill — Existing Tenants

**Fix:** The migration ends with a loop that calls `_prov_install_tenant_rpcs()` on every existing `entity_*` schema, fixing the broken functions in `entity_bigdrops-main_main` and any other tenants.

---

## Dependency Classification

| Object | Classification | Action |
|--------|---------------|--------|
| `public.entities`, `public.workspaces`, `public.workspace_members` | LEGITIMATE CONTROL-PLANE | Kept as-is |
| `public.has_entity_permission` | LEGITIMATE CONTROL-PLANE | Kept as-is |
| `public.compute_jsonb_diff` | LEGITIMATE CONTROL-PLANE | Kept as-is |
| `public.invoice_persisted_status` | LEGITIMATE CONTROL-PLANE | Kept as-is |
| `public.set_row_updated_at`, `public.stamp_row_ownership` | LEGITIMATE CONTROL-PLANE | Kept as-is |
| `public._audit_resolve_invoice_schema` | LEGITIMATE CONTROL-PLANE | Kept as-is |
| `public.activity_events` (table/type) | STALE PUBLIC OPERATIONAL | Replaced with `__SCHEMA__` refs |
| `public.audit_logs` (table/type) | STALE PUBLIC OPERATIONAL | Replaced with `__SCHEMA__` refs |
| `public.record_activity_event` | STALE PUBLIC OPERATIONAL | Replaced with tenant-local version |
| `public.quotations`, `public.quotation_items` | STALE PUBLIC OPERATIONAL | Replaced with `__SCHEMA__` refs |

---

## Updated Provisioning Sequence

```
[1. Validate Permissions & Lock]
           │
           ▼
[2. Check Idempotency]
           │
           ▼
[3. Resolve Entity/Schema Name]
           │
           ▼
[4. Create Target Schema]
           │
           ▼
[5. Clone Master Template Tables]  ← source: tenant_master_template
           │
           ▼
[6. Install Tenant RLS]
           │
           ▼
[7. Install Tenant Triggers]      ← NEW: _prov_install_triggers
           │
           ▼
[8. Build Tenant Views]           ← NEW: _prov_install_financial_views
           │
           ▼
[9. Setup Item Library]           ← NEW: _prov_install_item_library
           │
           ▼
[10. Install Tenant RPCs]         ← FIXED: schema-qualified types
           │
           ▼
[11. Re-add Foreign Keys]
           │
           ▼
[12. Seed Settings]               ← FIXED: correct arg order
           │
           ▼
[13. Seed Permissions]            ← FIXED: correct args + auth.uid()
           │
           ▼
[14. Mark Tenant READY]
```

---

## Static Verification

```
- bun run audit:load: passed (pre-existing warnings only, no new issues)
- bun run typecheck: skipped (no TypeScript changes — only SQL migration)
- git status: 3 staged files (2 reports + 1 migration)
```

---

## Runtime Verification Plan

After applying the migration to the live database:

1. Execute: `SELECT public.provision_entity('ab20ab4a-cb7e-4562-9e5f-b2d22212679f')` (retry Agbado)
2. Verify: `SELECT status, attempt_count, last_error FROM public.entity_provisioning_status WHERE entity_id = 'ab20ab4a-cb7e-4562-9e5f-b2d22212679f'` → status=ready
3. Verify schema: `SELECT count(*) FROM pg_tables WHERE schemaname = 'entity_agbado'` → 32
4. Verify functions: `SELECT count(*) FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'entity_agbado')` → 30
5. Verify triggers: `SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'entity_agbado' AND NOT t.tgisinternal` → 8
6. Verify views: `SELECT pg_get_viewdef(c.oid, TRUE) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'entity_agbado' AND c.relkind = 'v' AND c.relname = 'invoice_financials_v'` → references entity_agbado, not entity_bigdrops-main_main
7. Verify settings: `SELECT id, company_name FROM entity_agbado.settings` → id=1, company_name='Agbado'
8. Verify permissions: `SELECT count(*) FROM public.entity_permissions WHERE entity_id = 'ab20ab4a-cb7e-4562-9e5f-b2d22212679f'` → >0

---

## Risks & Limitations

1. **Backfill scope:** The backfill loop runs `_prov_install_tenant_rpcs()` on all existing `entity_*` schemas. If any tenant has custom functions with the same names, they will be overwritten. This is intentional — the old functions are broken.

2. **`entity_bigdrops-main_main` backfill:** The working tenant's `record_activity_event` was previously self-contained (inserts directly into its own schema). The backfill will overwrite it with the new version, which is also self-contained. No functional change.

3. **Frontend retry path:** The current UI "Try Again" button on `ProvisioningFailed.tsx` calls `recheckProvisioning()` which only re-reads status — it does NOT retry `provision_entity()`. This is a pre-existing UX issue not addressed in this migration.

4. **No `bun run build`:** Skipped per hardware policy. No TypeScript changes were made.

---

## Deferred Work

| Item | Priority | Reason |
|------|----------|--------|
| Frontend retry path fix (ProvisioningFailed.tsx) | P2 | Pre-existing UX issue, not a provisioning blocker |
| Recreate Agbado via UI acceptance test | P1 | Requires live database migration to be applied first |
