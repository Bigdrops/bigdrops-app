# Agam Forensic Probe Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Objective

Determine the exact database state of the second company "Agam" and whether the newly fixed provisioning architecture can safely retry provisioning.

---

## Forensic Findings

### 1. Agam Entity Record

| Field | Value |
|-------|-------|
| Entity ID | `f2cbeffe-7666-47e6-9caf-145d1e952867` |
| Display Name | `Agam` |
| Slug | `agam` |
| Entity Type | `company` |
| Workspace ID | `eb30b64b-7f95-464f-be1a-805cf2c0fedc` |
| Workspace Slug | `bigdrops-main` |
| Is Active | `true` |
| Created At | `2026-09-01 21:49:21.51103+00` |

**FACT:** Agam exists in `public.entities` with a valid entity record.

### 2. Provisioning Status

| Field | Value |
|-------|-------|
| Status | `failed` |
| Last Error | `relation "public.clients" does not exist` |
| Attempt Count | `1` |
| Updated At | `2026-09-01 21:49:22.045453+00` |

**FACT:** Agam's provisioning failed with the old `public.clients` error. This confirms the failure occurred BEFORE the master template fix.

### 3. Tenant Schema

| Check | Result |
|-------|--------|
| Expected schema name | `entity_bigdrops-main_agam` |
| Schema exists? | **NO** |
| Partial schema? | **NO** |

**FACT:** Agam's tenant schema does NOT exist. The provisioning cleanup function (`_prov_cleanup_on_error`) dropped it after the failure.

**FACT:** The only entity schema in the database is `entity_bigdrops-main_main` (the original tenant).

### 4. Schema Lifecycle Evidence

The provisioning flow was:
1. `CREATE SCHEMA entity_bigdrops-main_agam` — succeeded
2. `_prov_clone_table('public', 'entity_bigdrops-main_agam', 'clients')` — FAILED (public.clients doesn't exist)
3. Exception handler caught the error
4. `_prov_cleanup_on_error('entity_bigdrops-main_agam')` — dropped the schema
5. `_prov_update_status(entity_id, 'failed', error)` — recorded failure

**FACT:** The schema was created and then cleaned up. No partial state remains.

### 5. Master Template Verification

| Check | Result |
|-------|--------|
| `tenant_master_template` exists? | ✅ Yes |
| Table count | 32 |
| Tables with business data | 0 |
| Views | 3 (`invoice_financials_v`, `item_price_summary_v`, `project_financials_v`) |

**FACT:** The master template is correct and contains zero business data.

### 6. Provisioning Function Verification

| Function | Uses `tenant_master_template`? | References `public.*` operational tables? |
|----------|-------------------------------|------------------------------------------|
| `provision_entity()` | ✅ Yes (`v_template_schema := 'tenant_master_template'`) | ❌ No |
| `_prov_clone_table()` | ✅ Yes (receives source schema as parameter) | ❌ No |
| `_prov_readd_foreign_keys()` | ✅ Yes (receives source schema as parameter) | ❌ No |
| `_prov_install_rls()` | N/A (operates on target schema) | ❌ No |
| `_prov_install_tenant_rpcs()` | N/A (operates on target schema) | ❌ No |

**FACT:** No provisioning function references `public.clients`, `public.invoices`, or any other deprecated public operational table.

### 7. Retry Safety

| Check | Result |
|-------|--------|
| Provisioning status | `failed` |
| Attempt count | `1` |
| Retry limit | `3` |
| Attempts remaining | `2` |
| Tenant schema exists? | No (cleaned up) |
| Schema creation will succeed? | Yes (no conflict) |
| Template available? | Yes |

**FACT:** Agam is safe to retry. The idempotency check allows retry when `status = 'failed'` AND `attempt_count < retry_limit`. Agam has 1 attempt out of 3 allowed.

**FACT:** Since the tenant schema was cleaned up, the retry will:
1. Create a fresh schema
2. Clone from `tenant_master_template` (not `public`)
3. Install RLS, RPCs, settings, permissions
4. Mark as `ready`

---

## Answers to Acceptance Criteria

| Question | Answer |
|----------|--------|
| Does Agam exist in public.entities? | **Yes** |
| What is Agam's exact entity ID? | `f2cbeffe-7666-47e6-9caf-145d1e952867` |
| What is Agam's workspace ID? | `eb30b64b-7f95-464f-be1a-805cf2c0fedc` |
| What is Agam's tenant schema name? | `entity_bigdrops-main_agam` (not yet created) |
| Does Agam's tenant schema exist? | **No** — cleaned up after failure |
| If it exists, how many tables? | N/A — schema does not exist |
| Is it empty, partial, or complete? | N/A — schema does not exist |
| What provisioning status is recorded? | `failed` |
| What exact provisioning error? | `relation "public.clients" does not exist` |
| Was the old public.clients failure from pre-template path? | **Yes** — confirmed by timestamp (2026-09-01, before template fix) |
| Does tenant_master_template exist? | **Yes** — 32 tables, 0 rows, 3 views |
| Does provision_entity() use tenant_master_template? | **Yes** — confirmed in deployed function |
| Does _prov_readd_foreign_keys() depend on public? | **No** — takes source schema as parameter |
| Any other provisioning dependencies on deleted public tables? | **No** — verified via `pg_proc` search |
| Is Agam safe to retry? | **Yes** — 1/3 attempts used, schema cleaned up, template available |
| If safe, what retry path? | Call `provision_entity('f2cbeffe-7666-47e6-9caf-145d1e952867')` via RPC or application retry flow |

---

## Recommended Next Action

**Retry Agam's provisioning** using the existing `provision_entity()` RPC. The function will:
1. Detect status = `failed`, attempt_count = 1
2. Allow retry (1 < 3)
3. Create schema `entity_bigdrops-main_agam`
4. Clone 32 tables from `tenant_master_template`
5. Install RLS, triggers, RPCs, settings, permissions
6. Mark as `ready`

The retry can be executed via:
- The application's "Retry" button on the Company Setup Failed screen
- Direct RPC call: `SELECT public.provision_entity('f2cbeffe-7666-47e6-9caf-145d1e952867')`

---

## Verification

- `git status`: no application code modified
- Database queries: all read-only (SELECT)
- No production data deleted or modified
- Existing tenant `entity_bigdrops-main_main` untouched
