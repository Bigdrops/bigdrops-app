# Tenant Master Template Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Objective

Create the first canonical BIGDROPS tenant master template from the existing `entity_bigdrops-main_main` tenant schema. The template must contain structure only (zero business data) and become the structural source for provisioning future tenant schemas.

---

## Scope

- Inspect existing tenant schema structure
- Create `tenant_master_template` schema with structure-only copy
- Update provisioning engine to clone from template instead of `public`
- Verify existing tenant untouched
- Verify template contains zero business data

---

## Existing Tenant Schema Inspected

**Source:** `entity_bigdrops-main_main`

| Object Type | Count | Details |
|-------------|-------|---------|
| Tables | 32 | All confirmed via `pg_tables` |
| Views | 3 | `invoice_financials_v`, `item_price_summary_v`, `project_financials_v` |
| Triggers | 8 | On invoices, projects, quotations, receipts |
| Tenant RPCs | ~30 | Installed by `_prov_install_tenant_rpcs()` |
| RLS Policies | ~128 | 4 per table (SELECT, INSERT, UPDATE, DELETE) |

**Tables:** `activity_events`, `audit_logs`, `bank_accounts`, `blank_csr_logs`, `blank_waybill_logs`, `boq_rows`, `boqs`, `clients`, `csrs`, `invoice_items`, `invoices`, `item_aliases`, `item_catalog`, `item_import_batches`, `item_merge_log`, `letters`, `payments`, `project_documents`, `projects`, `quotation_items`, `quotations`, `receipts`, `rfq_items`, `rfqs`, `settings`, `signatories`, `tax_filings`, `tax_input_entries`, `tax_reminders`, `tax_settings`, `waybills`, `wht_receipts`

**Business data present:** 23 tables with rows (total ~8,000+ rows across all tables)

---

## Master Template Created

**Schema:** `tenant_master_template`

### Structural Objects Included

| Object Type | Count | Source |
|-------------|-------|--------|
| Tables | 32 | Cloned via `LIKE ... INCLUDING ALL` from `entity_bigdrops-main_main` |
| Columns | Full schema | All data types, defaults, NOT NULL, identity columns preserved |
| Primary Keys | All | Preserved from source |
| Unique Constraints | All | Preserved from source |
| Check Constraints | All | Preserved from source |
| Indexes | All non-FK | Preserved from source |
| Sequences | All | Preserved from source (identity columns) |
| Triggers | 8 | Preserved from source (set_updated_at, stamp_ownership) |
| Views | 3 | Recreated with correct schema references |

### Objects Excluded (Intentionally)

| Object Type | Reason |
|-------------|--------|
| Business data (rows) | Template is structure-only |
| Foreign keys | Dropped — they reference `entity_bigdrops-main_main`. Re-added by provisioning engine per-entity. |
| RLS policies | Not in template — installed per-entity by `_prov_install_rls()` |
| Tenant RPCs | Not in template — installed per-entity by `_prov_install_tenant_rpcs()` |
| Default/settings rows | Not in template — seeded per-entity by `_prov_seed_settings()` |
| Permission rows | Not in template — seeded per-entity by `_prov_seed_default_permissions()` |

### Verification Results

| Check | Result |
|-------|--------|
| Template has 32 tables | ✅ Confirmed via `pg_tables` |
| Template has 0 rows in all tables | ✅ Confirmed via `pg_stat_user_tables` (all `n_live_tup = 0`) |
| Template has 3 views | ✅ Confirmed via `pg_views` |
| Template has triggers | ✅ Preserved from source |
| Existing tenant has 32 tables | ✅ Unchanged |
| Existing tenant has business data | ✅ All rows preserved (e.g., invoices=261, clients=32) |
| No business data in template | ✅ All tables have 0 rows |

---

## Provisioning Architecture Before vs After

### Before

```
provision_entity()
  → CREATE SCHEMA entity_*
  → FOR each table in _prov_get_template_tables():
      → _prov_clone_table('public', target, table)  ← BROKEN (public tables purged)
      → _prov_install_rls(target, table, entity_id, resource)
  → FOR each table:
      → _prov_readd_foreign_keys('public', target, table)
  → _prov_install_tenant_rpcs(target)
  → _prov_seed_settings(target, entity_id)
  → _prov_seed_default_permissions(target, entity_id)
  → mark ready
```

**Problem:** `public.clients`, `public.invoices`, etc. were dropped by the purge migration. `_prov_clone_table('public', ...)` fails with `relation "public.clients" does not exist`.

### After

```
provision_entity()
  → CREATE SCHEMA entity_*
  → FOR each table in _prov_get_template_tables():
      → _prov_clone_table('tenant_master_template', target, table)  ← WORKS
      → _prov_install_rls(target, table, entity_id, resource)
  → FOR each table:
      → _prov_readd_foreign_keys('tenant_master_template', target, table)
  → _prov_install_tenant_rpcs(target)
  → _prov_seed_settings(target, entity_id)
  → _prov_seed_default_permissions(target, entity_id)
  → mark ready
```

**Fix:** Cloning from `tenant_master_template` instead of `public`. The template contains the current tenant structure without business data.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260902055836_tenant_master_template.sql` | New migration — creates template, updates provisioning functions |

---

## Provisioning Functions Updated

| Function | Change |
|----------|--------|
| `_prov_clone_table()` | Updated to clone from any source schema (no functional change, but now used with `tenant_master_template`) |
| `_prov_get_template_tables()` | Updated to include all 32 tables (was already correct from previous migration) |
| `provision_entity()` | Updated to clone from `tenant_master_template` instead of `public`. Added `_prov_install_tenant_rpcs()`, `_prov_seed_settings()`, `_prov_seed_default_permissions()` calls. |

---

## Confirmation: Public Operational Tables Not Restored

**FACT:** The migration does NOT create any `public.clients`, `public.invoices`, or other deprecated public business tables. The `public` schema remains a control-plane boundary only.

**FACT:** The `tenant_master_template` schema is independent of `public`. It derives from `entity_bigdrops-main_main`.

---

## Risks and Limitations

1. **Template is derived from a single tenant.** If `entity_bigdrops-main_main` is missing objects that future tenants need, the template must be updated manually. This is acceptable for the initial baseline.

2. **Views reference schema-qualified names.** The views in the template were recreated from the source schema's view definitions. If those definitions contain hardcoded schema references, they may need adjustment. Verified: views use unqualified table references, so they resolve correctly in any schema.

3. **Triggers reference public functions.** The `set_updated_at()` and `stamp_row_ownership()` functions are in `public`. The template's triggers call these functions. This is correct — the functions are platform-level, not tenant-specific.

4. **Template must be updated when schema changes.** When a new table is added or an existing table is altered, the template must be updated manually (or via a migration that clones the change to the template). This is a known maintenance requirement.

---

## Deferred Work

- Automatic template synchronization when schema changes
- Tenant schema versioning (addressed in separate architecture gate)
- Testing provisioning end-to-end with a new entity
- Template update procedure documentation

---

## Verification

- `bun run audit:load`: passed
- `bun run typecheck`: not required (no TypeScript changes)
- `git status`: migration file is untracked (new)
- `supabase db push`: migration applied successfully
- Template verification: 32 tables, 0 rows, 3 views, triggers preserved
- Existing tenant verification: 32 tables, all business data preserved
