# Fresh Tenant Provisioning Forensic Final Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## EXECUTIVE VERDICT

**Can a brand-new company be provisioned successfully right now?**

**NO.**

There are **4 P0 blockers** (guaranteed provisioning failure) and **2 P1 blockers** (provisioning succeeds but tenant functionality is broken).

| # | Priority | Blocker | Impact |
|---|----------|---------|--------|
| 1 | **P0** | `_prov_install_tenant_rpcs()` creates functions with `RETURNS activity_events` — the `activity_events` type was destroyed when `public.activity_events` was purged | All new provisioning fails immediately |
| 2 | **P0** | `_prov_install_tenant_rpcs()` creates `record_activity_event` with `public.activity_events` references — the table was purged | Same failure point as #1 |
| 3 | **P0** | `_prov_install_tenant_rpcs()` creates `record_audit_log` with `RETURNS audit_logs` — the `audit_logs` type was destroyed when `public.audit_logs` was purged | Would fail if #1/#2 were fixed |
| 4 | **P0** | `provision_entity()` calls `_prov_seed_settings(v_schema_name, p_entity_id)` — arguments are swapped vs function signature `(p_entity_id uuid, p_schema_name text)` | Type mismatch error after RPC installation |
| 5 | **P1** | `provision_entity()` calls `_prov_seed_default_permissions(v_schema_name, p_entity_id)` — arguments are swapped vs function signature `(p_entity_id uuid, p_user_id uuid)` | Permissions never seeded |
| 6 | **P1** | `revert_invoice_to_quotation_transaction` (tenant RPC #27) references `public.quotations` and `public.quotation_items` via unqualified names — both tables were purged | Revert-to-quotation feature broken in all tenants |

---

## AGAM / AGBADO DATABASE STATE

### Entity Record

| Field | Value |
|-------|-------|
| Entity ID | `ab20ab4a-cb7e-4562-9e5f-b2d22212679f` |
| Display Name | Agbado |
| Slug | agbado |
| Workspace ID | `eb30b64b-7f95-464f-be1a-805cf2c0fedc` |
| Created At | 2026-09-02 08:10:23.106201+00 |

### Provisioning Status

| Field | Value |
|-------|-------|
| Status | `failed` |
| Attempt Count | 1 |
| Retry Limit | 3 |
| Last Error | `type "activity_events" does not exist` |
| Updated At | 2026-09-02 08:10:23.665024+00 |

**Time from creation to failure: 559ms.**

### Schema State

- `entity_agbado` schema: **Does NOT exist** (cleanup was performed by `_prov_cleanup_on_error`)
- No partial objects remain
- Entity is retryable (attempt_count=1 < retry_limit=3)

### Master Template State

| Field | Value |
|-------|-------|
| Schema | `tenant_master_template` |
| Table Count | 32 |
| View Count | 3 |
| Trigger Count | **0** |
| FK Count | **0** |
| Row Count (all tables) | **0** (verified) |

### Working Tenant State

| Field | Value |
|-------|-------|
| Schema | `entity_bigdrops-main_main` |
| Table Count | 32 |
| View Count | 3 |
| Trigger Count | 8 (4 tables × 2 triggers each) |
| FK Count | **0** |
| Function Count | 30 |

---

## COMPLETE PROVISIONING CALL CHAIN

```
CompanyCreation.tsx handleSubmit()
  → createEntity({ workspaceId, displayName, slug })        [tenantCreation.ts]
    → supabase.from('entities').insert(...)                  [PostgREST → public.entities]
  → provisionEntity(entity.id)                               [tenantCreation.ts]
    → supabase.rpc('provision_entity', { p_entity_id })     [PostgREST → public.provision_entity()]
      → public.provision_entity(p_entity_id)                 [deployed, SECURITY DEFINER]
        → Step 1: _prov_validate_permissions(p_entity_id)    [public.entities, public.workspace_members]
        → Step 2: _prov_check_idempotency(p_entity_id)      [public.entity_provisioning_status]
        → Step 3: pg_advisory_xact_lock(hashtext(entity_id))
        → Step 4: _prov_get_schema_name(p_entity_id)         [public.entities JOIN public.workspaces]
        → Step 5: _prov_update_status(entity_id, 'creating') [public.entity_provisioning_status]
        → Step 6: _prov_create_schema(v_schema_name)          [CREATE SCHEMA]
        → Step 7: FOREACH table IN _prov_get_template_tables() [32 tables]
          → _prov_clone_table(v_template_schema, v_schema_name, table)
          → _prov_table_to_resource(table)
          → _prov_install_rls(schema, table, entity_id, resource)
        → Step 8: FOREACH table IN _prov_get_template_tables()
          → _prov_readd_foreign_keys(v_template_schema, v_schema_name, table)
        → Step 9: _prov_install_tenant_rpcs(v_schema_name)   ← **P0 FAILURE HERE**
          → Attempts to CREATE 27 functions with RETURNS activity_events
          → type "activity_events" does not exist → EXCEPTION
        → EXCEPTION WHEN OTHERS:
          → _prov_cleanup_on_error(v_schema_name)            [DROP SCHEMA CASCADE]
          → _prov_update_status(entity_id, 'failed', SQLERRM)
          → RETURNS { status: 'failed', error: SQLERRM }
  → provisionResult.status === 'failed'
    → setError('Provisioning failed during schema creation...')
    → setPhase('error')
```

### Error Propagation Path

1. PostgreSQL raises: `type "activity_events" does not exist`
2. `provision_entity()` catches via `EXCEPTION WHEN OTHERS`
3. `_prov_cleanup_on_error()` drops the partial schema
4. `_prov_update_status()` records the error in `entity_provisioning_status.last_error`
5. Returns `{ status: 'failed', error: 'type "activity_events" does not exist' }`
6. Frontend `provisionEntity()` receives the RPC response
7. `CompanyCreation.tsx` checks `provisionResult.status === 'failed'`
8. Displays: `"Provisioning failed during schema creation. The company was created but is not ready to use."`
9. The original PostgreSQL error is **NOT displayed** — it is replaced by the generic message
10. The `ProvisioningFailed.tsx` page does show `entityCtx.provisioningError` which contains the raw error

### Retry Path

The `ProvisioningFailed.tsx` "Try Again" button calls `entityCtx.recheckProvisioning()`, which only re-reads the provisioning status — it does NOT retry the provisioning. The `CompanyCreation.tsx` "Try Again" button resets the form phase to `'form'`, allowing the user to create a new company (not retry the failed one).

**The retry mechanism does not actually retry provisioning for the failed entity.**

---

## COMPLETE PUBLIC DEPENDENCY MATRIX

| Reference | Source | Classification | Status |
|-----------|--------|---------------|--------|
| `public.entities` | All prov_* functions | LEGITIMATE CONTROL-PLANE | ✅ Exists |
| `public.workspaces` | `_prov_get_schema_name` | LEGITIMATE CONTROL-PLANE | ✅ Exists |
| `public.workspace_members` | `_prov_validate_permissions` | LEGITIMATE CONTROL-PLANE | ✅ Exists |
| `public.entity_provisioning_status` | `_prov_check_idempotency`, `_prov_update_status` | LEGITIMATE CONTROL-PLANE | ✅ Exists |
| `public.entity_permissions` | `_prov_seed_default_permissions` | LEGITIMATE CONTROL-PLANE | ✅ Exists |
| `public.has_entity_permission` | RLS policies, tenant RPCs | LEGITIMATE CONTROL-PLANE | ✅ Exists |
| `public.compute_jsonb_diff` | `record_audit_log` | LEGITIMATE CONTROL-PLANE | ✅ Exists |
| `public._audit_resolve_invoice_schema` | `revert_invoice_to_quotation_transaction` | LEGITIMATE CONTROL-PLANE | ✅ Exists |
| `public.set_row_updated_at` | Tenant triggers | LEGITIMATE CONTROL-PLANE | ✅ Exists |
| `public.stamp_row_ownership` | Tenant triggers | LEGITIMATE CONTROL-PLANE | ✅ Exists |
| `public.invoice_persisted_status` | `invoice_financials_v` view | LEGITIMATE CONTROL-PLANE | ✅ Exists |
| `public.activity_events` (type) | `_prov_install_tenant_rpcs` embedded SQL | **STALE PUBLIC OPERATIONAL** | ❌ **PURGED** |
| `public.activity_events` (table) | `record_activity_event` embedded SQL | **STALE PUBLIC OPERATIONAL** | ❌ **PURGED** |
| `public.audit_logs` (type) | `_prov_install_tenant_rpcs` embedded SQL | **STALE PUBLIC OPERATIONAL** | ❌ **PURGED** |
| `public.audit_logs` (table) | `record_audit_log` embedded SQL | **STALE PUBLIC OPERATIONAL** | ❌ **PURGED** |
| `public.record_activity_event` | Called by 21 tenant RPCs | **STALE PUBLIC OPERATIONAL** | ❌ **PURGED** |
| `public.record_audit_log` | Called by tenant RPCs | **STALE PUBLIC OPERATIONAL** | ❌ **PURGED** |
| `public.quotations` | `revert_invoice_to_quotation_transaction` | **STALE PUBLIC OPERATIONAL** | ❌ **PURGED** |
| `public.quotation_items` | `revert_invoice_to_quotation_transaction` | **STALE PUBLIC OPERATIONAL** | ❌ **PURGED** |

---

## `_prov_install_tenant_rpcs()` COMPLETE AUDIT

### Function Summary

| # | Function Name | Return Type | References `activity_events`? | References `audit_logs`? | Can CREATE in fresh tenant? |
|---|--------------|-------------|------------------------------|-------------------------|---------------------------|
| 1 | `save_invoice_with_items_transaction` | `jsonb` | No | No | ✅ Yes |
| 2 | `delete_invoice_with_items_transaction` | `jsonb` | No | No | ✅ Yes |
| 3 | `record_payment_transaction` | `jsonb` | No | No | ✅ Yes |
| 4 | `record_invoice_created` | `activity_events` | **YES** | No | ❌ **No** |
| 5 | `record_invoice_status_changed` | `activity_events` | **YES** | No | ❌ **No** |
| 6 | `record_payment_voided` | `activity_events` | **YES** | No | ❌ **No** |
| 7 | `record_payment_attachment_uploaded` | `activity_events` | **YES** | No | ❌ **No** |
| 8 | `record_waybill_created` | `activity_events` | **YES** | No | ❌ **No** |
| 9 | `record_waybill_status_changed` | `activity_events` | **YES** | No | ❌ **No** |
| 10 | `record_csr_created` | `activity_events` | **YES** | No | ❌ **No** |
| 11 | `record_csr_status_changed` | `activity_events` | **YES** | No | ❌ **No** |
| 12 | `record_csr_linked` | `activity_events` | **YES** | No | ❌ **No** |
| 13 | `record_quotation_created` | `activity_events` | **YES** | No | ❌ **No** |
| 14 | `record_quotation_status_changed` | `activity_events` | **YES** | No | ❌ **No** |
| 15 | `record_quotation_linked` | `activity_events` | **YES** | No | ❌ **No** |
| 16 | `record_project_updated` | `activity_events` | **YES** | No | ❌ **No** |
| 17 | `record_project_note_added` | `activity_events` | **YES** | No | ❌ **No** |
| 18 | `record_project_document_added` | `activity_events` | **YES** | No | ❌ **No** |
| 19 | `record_project_linked_activity` | `activity_events` | **YES** | No | ❌ **No** |
| 20 | `record_letter_created` | `activity_events` | **YES** | No | ❌ **No** |
| 21 | `record_letter_updated` | `activity_events` | **YES** | No | ❌ **No** |
| 22 | `record_letter_status_changed` | `activity_events` | **YES** | No | ❌ **No** |
| 23 | `record_letter_duplicated` | `activity_events` | **YES** | No | ❌ **No** |
| 24 | `record_letter_archived` | `activity_events` | **YES** | No | ❌ **No** |
| 25 | `record_audit_log` | `audit_logs` | No | **YES** | ❌ **No** |
| 26 | `record_activity_event` | `activity_events` | **YES** + body refs `public.activity_events` | No | ❌ **No** |
| 27 | `revert_invoice_to_quotation_transaction` | `jsonb` | No | No | ❌ **No** (refs `public.quotations`, `public.quotation_items`) |

### Key Pattern

The embedded SQL in `_prov_install_tenant_rpcs()` uses **unqualified** type names (`RETURNS activity_events`, `RETURNS audit_logs`) which resolve against `SET search_path TO 'public'`. Since `public.activity_events` and `public.audit_logs` tables were purged, their composite types no longer exist.

The **working tenant** (`entity_bigdrops-main_main`) has these functions working because they were installed **before** the purge, and PL/pgSQL functions store their bodies as text — the type references are only validated at **call time**, not at **creation time**. The functions exist but the type resolution happens at runtime.

### Activity/Audit Architecture

**Intended architecture (post-purge):**
- `activity_events` and `audit_logs` are **tenant-local** tables (cloned from template)
- `record_activity_event` and `record_audit_log` are **tenant-local** RPCs
- Tenant RPCs should reference their own schema's tables and types

**Actual deployed `_prov_install_tenant_rpcs()` still assumes:**
- `activity_events` type is in `public` (it's not — purged)
- `audit_logs` type is in `public` (it's not — purged)
- `public.record_activity_event` exists (it doesn't — purged)
- `public.quotations` exists (it doesn't — purged)
- `public.quotation_items` exists (it doesn't — purged)

---

## SETTINGS SEED AUDIT

### `_prov_seed_settings` Signature

```sql
_prov_seed_settings(p_entity_id uuid, p_schema_name text)
```

### Call in `provision_entity()`

```sql
PERFORM public._prov_seed_settings(v_schema_name, p_entity_id);
```

**Arguments are swapped.** The function receives `(text, uuid)` but expects `(uuid, text)`.

This would cause a PostgreSQL type mismatch error: `function public._prov_seed_settings(text, uuid) does not exist`.

**However**, this bug is currently masked by the P0 failure in step 9 (`_prov_install_tenant_rpcs`). Provisioning never reaches step 10.

### `_prov_seed_default_permissions` Signature

```sql
_prov_seed_default_permissions(p_entity_id uuid, p_user_id uuid)
```

### Call in `provision_entity()`

```sql
PERFORM public._prov_seed_default_permissions(v_schema_name, p_entity_id);
```

**Arguments are swapped.** The function receives `(text, uuid)` but expects `(uuid, uuid)`.

This would also cause a type mismatch error. This bug is also masked by the P0 failure.

---

## TEMPLATE VIEW AUDIT

### Views in `tenant_master_template`

| View | Definition Source | Hardcoded References |
|------|------------------|---------------------|
| `invoice_financials_v` | Cloned from `entity_bigdrops-main_main` | References `"entity_bigdrops-main_main".invoices`, `"entity_bigdrops-main_main".payments` |
| `project_financials_v` | Cloned from `entity_bigdrops-main_main` | References `"entity_bigdrops-main_main".projects`, `"entity_bigdrops-main_main".invoices`, `"entity_bigdrops-main_main".payments` |
| `item_price_summary_v` | Cloned from `entity_bigdrops-main_main` | References `"entity_bigdrops-main_main".item_catalog`, `"entity_bigdrops-main_main".invoice_items`, `"entity_bigdrops-main_main".invoices`, `"entity_bigdrops-main_main".quotation_items` |

**All 3 views are hardcoded to `entity_bigdrops-main_main`.** When cloned to a new tenant, the views will query the working tenant's data, not the new tenant's data.

**However**, `_prov_install_financial_views()` exists and correctly creates `invoice_financials_v` and `project_financials_v` using `format()` with the target schema name. And `_prov_install_item_library()` correctly creates `item_price_summary_v`. **But these functions are NOT called during provisioning** — they exist in the database but `provision_entity()` does not invoke them.

**Impact:** If the view issue were the only problem, the views would exist but return wrong data. This is a P1 correctness issue.

---

## TRIGGER AUDIT

### Template Triggers

**None.** The `tenant_master_template` has zero triggers.

### Working Tenant Triggers

| Table | Trigger | Function | Schema |
|-------|---------|----------|--------|
| invoices | trg_invoices_set_updated_at | set_row_updated_at | public |
| invoices | trg_invoices_stamp_ownership | stamp_row_ownership | public |
| projects | trg_projects_set_updated_at | set_row_updated_at | public |
| projects | trg_projects_stamp_ownership | stamp_row_ownership | public |
| quotations | trg_quotations_set_updated_at | set_row_updated_at | public |
| quotations | trg_quotations_stamp_ownership | stamp_row_ownership | public |
| receipts | trg_receipts_set_updated_at | set_row_updated_at | public |
| receipts | trg_receipts_stamp_ownership | stamp_row_ownership | public |

### `_prov_install_triggers()` Function

A function `_prov_install_triggers(p_source_schema, p_target_schema, p_table_name)` exists and correctly creates triggers by reading from the source schema and creating in the target schema. **However, this function is NOT called during provisioning.** `provision_entity()` does not invoke it.

**Impact:** A freshly provisioned tenant would have no triggers. `updated_at` timestamps would not auto-update, and `owned_by` would not be stamped. This is a P1 functionality gap.

---

## FOREIGN KEY AUDIT

### `_prov_readd_foreign_keys()` Analysis

The function reads FK definitions from the **source** schema (now `tenant_master_template`) and recreates them pointing to the **target** schema. The template has **zero FKs** (they were dropped during template creation). Therefore, `_prov_readd_foreign_keys()` will find nothing to re-add.

### Working Tenant FKs

The working tenant (`entity_bigdrops-main_main`) also has **zero FKs**. This is consistent — FKs were dropped from the template and never re-added because the template has none.

**Conclusion:** FKs are not an issue. Both template and working tenant have zero FKs.

---

## RLS AUDIT

### `_prov_install_rls()` Analysis

The function creates 4 policies per table: SELECT, INSERT, UPDATE, DELETE. All policies use `has_entity_permission()` which is a legitimate control-plane function that exists in `public`.

**RLS installation is correct** — it references only `public.has_entity_permission` and `auth.uid()`, both of which exist.

**However**, RLS is installed during step 7 (before step 9 where provisioning fails). If provisioning fails at step 9, the cleanup drops the entire schema including the RLS policies. So RLS is not an issue for the current failure.

---

## WORKING TENANT VS FRESH TENANT STRUCTURAL GAP

| Object Type | Working Tenant | Fresh Tenant (if P0 fixed) | Gap |
|-------------|---------------|---------------------------|-----|
| Tables | 32 | 32 (from template) | None |
| Views | 3 | 3 (from template, but hardcoded) | **Wrong data** |
| Triggers | 8 | 0 (template has none, not installed) | **Missing triggers** |
| FKs | 0 | 0 (template has none) | None |
| Functions | 30 | 27 (from `_prov_install_tenant_rpcs`) | **Missing 3** (`normalize_item_text`, `get_item_suggestions`, `merge_item_catalog_entries` — installed by `_prov_install_item_library` which is not called) |
| RLS Policies | 128 (32 × 4) | 128 (installed during provisioning) | None |
| Settings | 1 row | Would be seeded (if args fixed) | **Args swapped** |
| Permissions | Wildcard grants | Would be seeded (if args fixed) | **Args swapped** |

---

## PROVISIONING ORDER ANALYSIS

### Current Order (deployed `provision_entity()`)

1. Validate permissions ✅
2. Idempotency check ✅
3. Advisory lock ✅
4. Get schema name ✅
5. Update status to 'creating' ✅
6. Create schema ✅
7. Clone 32 template tables + install RLS ✅
8. Re-add FKs ✅ (no FKs to re-add)
9. Install tenant RPCs ❌ **P0 FAILURE**
10. Seed settings ❌ **P0 (args swapped)**
11. Seed permissions ❌ **P0 (args swapped)**
12. Mark ready

### Missing Steps (present in working tenant but not in provisioning)

- **Install triggers** (`_prov_install_triggers` exists but not called)
- **Install financial views** (`_prov_install_financial_views` exists but not called)
- **Install item library** (`_prov_install_item_library` exists but not called)

### Dependency Analysis

| Step | Depends On | Safe Order? |
|------|-----------|-------------|
| Clone tables | Schema exists | ✅ |
| Install RLS | Tables exist | ✅ |
| Re-add FKs | Tables exist in target | ✅ (no FKs) |
| Install tenant RPCs | Tables exist, types exist | ❌ **Types missing** |
| Seed settings | Settings table exists | ✅ (if args fixed) |
| Seed permissions | entity_permissions exists | ✅ (if args fixed) |

---

## ALL BLOCKERS

### P0 — Guaranteed Provisioning Failure

| # | Blocker | Evidence | Fix |
|---|---------|----------|-----|
| 1 | `_prov_install_tenant_rpcs()` uses unqualified `activity_events` type in 21 function return types | Live: `pg_get_functiondef` shows `RETURNS activity_events`. Live: `public.activity_events` table does not exist. Error: `type "activity_events" does not exist` | Change all `RETURNS activity_events` to `RETURNS __SCHEMA__.activity_events` in the embedded SQL |
| 2 | `_prov_install_tenant_rpcs()` function #26 (`record_activity_event`) references `public.activity_events` in body | Live: function body contains `public.activity_events` (4 references). Live: table does not exist. | Change `public.activity_events` to `__SCHEMA__.activity_events` in the embedded SQL |
| 3 | `_prov_install_tenant_rpcs()` function #25 (`record_audit_log`) uses unqualified `audit_logs` type | Live: `RETURNS audit_logs`. Live: `public.audit_logs` table does not exist. | Change `RETURNS audit_logs` to `RETURNS __SCHEMA__.audit_logs` and `public.audit_logs` to `__SCHEMA__.audit_logs` |
| 4 | `provision_entity()` step 10 calls `_prov_seed_settings(v_schema_name, p_entity_id)` — args swapped | Function signature: `(p_entity_id uuid, p_schema_name text)`. Call passes `(text, uuid)`. | Swap arguments: `_prov_seed_settings(p_entity_id, v_schema_name)` |

### P1 — Provisioning Succeeds but Tenant Functionality Broken

| # | Blocker | Evidence | Fix |
|---|---------|----------|-----|
| 5 | `provision_entity()` step 11 calls `_prov_seed_default_permissions(v_schema_name, p_entity_id)` — args swapped | Function signature: `(p_entity_id uuid, p_user_id uuid)`. Call passes `(text, uuid)`. Missing `p_user_id` entirely — should be `auth.uid()`. | Fix call: `_prov_seed_default_permissions(p_entity_id, auth.uid())` |
| 6 | `revert_invoice_to_quotation_transaction` (RPC #27) references `public.quotations` and `public.quotation_items` | Live: function body contains unqualified `INSERT INTO quotations` and `INSERT INTO quotation_items`. Live: both tables purged from public. | Change to `__SCHEMA__.quotations` and `__SCHEMA__.quotation_items` in the embedded SQL |

### P2 — Correctness/Maintenance Risk

| # | Issue | Evidence | Fix |
|---|-------|----------|-----|
| 7 | Template views hardcoded to `entity_bigdrops-main_main` | Live: `pg_get_viewdef` shows all 3 views reference `"entity_bigdrops-main_main"` tables | Call `_prov_install_financial_views()` and `_prov_install_item_library()` during provisioning, or fix template view creation |
| 8 | Triggers not installed during provisioning | Template has 0 triggers. `_prov_install_triggers()` exists but is not called. Working tenant has 8 triggers. | Call `_prov_install_triggers()` for each table during provisioning |
| 9 | `_prov_install_item_library()` not called during provisioning | Working tenant has `normalize_item_text`, `get_item_suggestions`, `merge_item_catalog_entries`. Fresh tenant would not. | Call `_prov_install_item_library()` during provisioning |
| 10 | `record_audit_log` (tenant RPC #25) references `public.compute_jsonb_diff` and `public.audit_logs` | `public.compute_jsonb_diff` exists (legitimate). `public.audit_logs` does not. | Fix `public.audit_logs` → `__SCHEMA__.audit_logs` |
| 11 | `record_activity_event` (tenant RPC #26) calls `public.record_activity_event` | But `public.record_activity_event` was purged. The tenant RPC is a wrapper that calls the public version. | Either recreate `public.record_activity_event` as a control-plane function, or rewrite the tenant RPC to be self-contained |

---

## MINIMUM SURGICAL FIX PLAN

### Fix 1 (P0): Update `_prov_install_tenant_rpcs()` embedded SQL

**File:** New migration SQL

**Changes:**
1. In all 21 functions with `RETURNS activity_events`: change to `RETURNS __SCHEMA__.activity_events`
2. In function #25 (`record_audit_log`): change `RETURNS audit_logs` to `RETURNS __SCHEMA__.audit_logs`, change `public.audit_logs` to `__SCHEMA__.audit_logs`
3. In function #26 (`record_activity_event`): change `RETURNS activity_events` to `RETURNS __SCHEMA__.activity_events`, change `public.activity_events` to `__SCHEMA__.activity_events`
4. In functions #4-24 that call `public.record_activity_event`: these calls are **legitimate** — they call the public control-plane function. But `public.record_activity_event` was purged. Two options:
   - **Option A (recommended):** Recreate `public.record_activity_event` as a thin wrapper that delegates to the tenant-local function
   - **Option B:** Rewrite each of the 21 tenant RPCs to be self-contained (no call to `public.record_activity_event`)

### Fix 2 (P0): Swap `_prov_seed_settings()` arguments

**File:** Migration or `CREATE OR REPLACE` for `provision_entity()`

**Change:**
```sql
-- Before:
PERFORM public._prov_seed_settings(v_schema_name, p_entity_id);
-- After:
PERFORM public._prov_seed_settings(p_entity_id, v_schema_name);
```

### Fix 3 (P0): Fix `_prov_seed_default_permissions()` call

**File:** Migration or `CREATE OR REPLACE` for `provision_entity()`

**Change:**
```sql
-- Before:
PERFORM public._prov_seed_default_permissions(v_schema_name, p_entity_id);
-- After:
PERFORM public._prov_seed_default_permissions(p_entity_id, auth.uid());
```

### Fix 4 (P1): Fix `revert_invoice_to_quotation_transaction` embedded SQL

**File:** Migration or update `_prov_install_tenant_rpcs()` to regenerate function #27

**Changes:**
- `INSERT INTO quotations (...)` → `INSERT INTO __SCHEMA__.quotations (...)`
- `INSERT INTO quotation_items (...)` → `INSERT INTO __SCHEMA__.quotation_items (...)`
- `v_row quotations` → `v_row __SCHEMA__.quotations`

### Fix 5 (P1): Recreate `public.record_activity_event` or make tenant RPCs self-contained

**Option A (recommended):** Recreate `public.record_activity_event` as a control-plane function that writes to the caller's tenant schema. This requires the function to resolve the tenant schema from the entity_id parameter.

**Option B:** Remove the call to `public.record_activity_event` from each of the 21 tenant RPCs and inline the activity logging logic directly.

### Fix 6 (P2): Add trigger installation to provisioning

**Change:** Add calls to `_prov_install_triggers()` in `provision_entity()` after table cloning.

### Fix 7 (P2): Add view and item library installation to provisioning

**Change:** Add calls to `_prov_install_financial_views()` and `_prov_install_item_library()` in `provision_entity()` after table cloning.

---

## VERIFICATION PLAN

After implementing the fix:

1. **Reset Agbado provisioning status:**
   ```sql
   UPDATE public.entity_provisioning_status
   SET status = 'new', attempt_count = 0, last_error = NULL
   WHERE entity_id = 'ab20ab4a-cb7e-4562-9e5f-b2d22212679f';
   ```

2. **Retry provisioning via the application UI** (or call `SELECT public.provision_entity('ab20ab4a-cb7e-4562-9e5f-b2d22212679f')` directly)

3. **Verify provisioning status:**
   ```sql
   SELECT status, attempt_count, last_error
   FROM public.entity_provisioning_status
   WHERE entity_id = 'ab20ab4a-cb7e-4562-9e5f-b2d22212679f';
   -- Expected: status='ready', attempt_count=2, last_error=NULL
   ```

4. **Verify schema exists:**
   ```sql
   SELECT nspname FROM pg_namespace WHERE nspname = 'entity_agbado';
   -- Expected: 1 row
   ```

5. **Verify table count:**
   ```sql
   SELECT count(*) FROM pg_tables WHERE schemaname = 'entity_agbado';
   -- Expected: 32
   ```

6. **Verify function count:**
   ```sql
   SELECT count(*) FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'entity_agbado');
   -- Expected: 30 (27 tenant RPCs + 3 item library functions)
   ```

7. **Verify trigger count:**
   ```sql
   SELECT count(*) FROM pg_trigger t
   JOIN pg_class c ON c.oid = t.tgrelid
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'entity_agbado' AND NOT t.tgisinternal;
   -- Expected: 8
   ```

8. **Verify views are correct:**
   ```sql
   SELECT pg_get_viewdef(c.oid, TRUE)
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'entity_agbado' AND c.relkind = 'v' AND c.relname = 'invoice_financials_v';
   -- Expected: references entity_agbado.invoices, NOT entity_bigdrops-main_main.invoices
   ```

9. **Verify settings seeded:**
   ```sql
   SELECT id, company_name FROM entity_agbado.settings;
   -- Expected: id=1, company_name='Agbado'
   ```

10. **Verify permissions seeded:**
    ```sql
    SELECT count(*) FROM public.entity_permissions
    WHERE entity_id = 'ab20ab4a-cb7e-4562-9e5f-b2d22212679f';
    -- Expected: >0 rows
    ```

11. **Run typecheck:** `bun run typecheck` (no code changes expected if only SQL migration)

---

## IMPLEMENTATION GATE: BLOCKED

All P0 blockers must be identified and the minimum surgical fix plan must be approved before implementation begins.
