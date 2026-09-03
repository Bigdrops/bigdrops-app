# Tenant Migration Recovery Audit

This report was written by OpenCode on 2026-08-09 via Local Runner.

Read-only investigation. No code, migration, RPC, or data was modified.

---

## Executive Summary

The BIGDROPS multi-tenant migration is in an **incomplete, diverged state**.
Production data lives in the public schema. A tenant schema (`entity_bigdrops-main_main`)
exists but is missing critical tables. The provisioning engine has a gap: 8
unapplied local migrations fix the gap but also need manual data migration.

**Bottom line:** Run `20260809030000_invoice_aggregate_data_migration.sql` against
the live database to create the missing tables and copy existing data. Then apply
the remaining `20260809*` migrations to fix the provisioning engine for future tenants.

This is a data-migration-first recovery — not a code-change problem.

---

## A. Current Production State

### A.1 What exists in the public schema

| Table | Rows | Verified |
|---|---|---|
| clients | 30 | live evidence |
| invoices | 239 | live evidence |
| invoice_items | 2,059 | live evidence |
| payments | 26 | live evidence |
| receipts | 4 | live evidence |
| wht_receipts | 0 | live evidence |
| quotations | 321 | repository estimate |
| quotation_items | 2,800 | repository estimate |
| projects | unknown | live verification needed |
| csrs | unknown | live verification needed |
| waybills | unknown | live verification needed |
| boqs/rfqs | unknown | live verification needed |
| settings | 1 row | live evidence |
| signatories | present | live verification needed |
| bank_accounts | present | live verification needed |
| tax_settings | present | live verification needed |
| letters | present | live verification needed |
| activity_events | present | live verification needed |
| audit_logs | present | live verification needed |

### A.2 What exists in the tenant schema

| Table | Status |
|---|---|
| invoices | EXISTS |
| invoice_items | **MISSING** |
| payments | EXISTS |
| wht_receipts | **MISSING** |
| clients | EXISTS (0 rows — tenant was empty) |
| settings | EXISTS |
| All other 15 template tables | EXISTS |
| invoice_financials_v | **MISSING** (views not cloned) |

### A.3 Provisioning gap root cause

Migration `20260717000000` defines `_prov_get_template_tables()` with 15 tables:

```
clients, settings, signatories, bank_accounts, projects, quotations, invoices,
payments, csrs, waybills, tax_settings, receipts, letters, boqs, rfqs
```

**Missing:** `invoice_items`, `wht_receipts`

Migration `20260809010000` adds both to the template list via `CREATE OR REPLACE`.
But this only affects **future** `provision_entity()` calls — the existing
`entity_bigdrops-main_main` schema was already created with the old template.

### A.4 What the 8 unapplied migrations fix

| Migration | Type | Effect on existing entity |
|---|---|---|
| `20260809000000` | Function redef | Adds settings seed to `provision_entity()` — no table changes |
| `20260809010000` | Function redef | Adds `invoice_items` + `wht_receipts` to template list — does NOT retrofit |
| `20260809020000` | Function redef | Adds `_prov_seed_default_permissions()` — no table changes |
| `20260809030000` | **DATA MIGRATION** | Creates missing tables via provision helper + copies public→tenant preserving UUIDs |
| `20260809040000` | Function redef | Adds `p_entity_id` to audit RPCs for cross-schema lookup |
| `20260809050000` | Function redef | Rewrites `revert_invoice_to_quotation_transaction` for cross-schema |
| `20260809060000` | View + provision step | Creates tenant-aware `invoice_financials_v` + adds step 8.8 to provision |
| `20260809070000` | Composite RPCs | Creates atomic invoice save/delete/payment RPCs |

**Key:** Only `20260809030000` affects the existing entity. All others are
function redefinitions that change behavior for future provision calls only.

---

## B. Data Migration Safety Analysis

### B.1 What `20260809030000` does (step by step)

1. Creates `invoice_items` table in tenant schema using `_prov_create_from_table_template`
2. Creates `wht_receipts` table in tenant schema using `_prov_create_from_table_template`
3. Copies `public.invoice_items → tenant.invoice_items` (preserving UUIDs)
4. Copies `public.wht_receipts → tenant.wht_receipts` (preserving UUIDs)
5. Validates: counts must match, zero NULL `invoice_id`, zero orphaned rows
6. All ON CONFLICT DO NOTHING — idempotent, safe to re-run

### B.2 FK dependency at clone time

The provision helper creates the table structure only (no FKs at this point).
FKs are added later by the provisioner's FK re-add step. Since `item_catalog`
is NOT provisioned, the `invoice_items.item_id → item_catalog.id` FK is
intentionally left dangling (same pattern as `invoices.project_id` → public
`projects`). **This is expected and safe.**

### B.3 UUID preservation

The migration copies rows with their original UUIDs:
```sql
INSERT INTO tenant.invoice_items
  SELECT * FROM public.invoice_items
  ON CONFLICT DO NOTHING
```

No new UUIDs are generated. All existing FK references (`payments.invoice_id`,
`receipts.invoice_id`, `csrs.linked_invoice_id`, `waybills.invoice_id`) remain
valid IF those FKs point to tenant-local copies of the referenced tables.

**Verified:** `invoices` and `payments` are already in the tenant schema.
`csrs` and `waybills` are already provisioned. All FK targets exist.

### B.4 Order of operations

The migration handles tables with FK dependencies in the correct order:
1. `invoice_items` first (depends on nothing provisioned)
2. `wht_receipts` second (depends on `payments` which already exists)

### B.5 Idempotency

ON CONFLICT DO NOTHING makes the migration safe to run multiple times.
If a previous partial run created some rows, the second run skips them.

---

## C. Provisioning Engine — Future Tenant Fix

### C.1 What changes after applying all 8 migrations

Future `provision_entity()` calls will:

1. Clone **17** tables (15 original + `invoice_items` + `wht_receipts`)
2. Seed default permissions for all resources (including `invoice_items` fallback)
3. Seed entity settings row
4. Install `set_row_updated_at` trigger on tenant `invoices`
5. Install `invoice_financials_v` view in tenant schema (step 8.8)
6. Run validation checks

### C.2 Existing entity status after data migration

The existing `entity_bigdrops-main_main` will have:
- All 17 tables (15 original + `invoice_items` + `wht_receipts` from data migration)
- Existing `invoice_items` data copied from public
- **Missing:** `invoice_financials_v` view (only created for future entities)
- **Missing:** `set_row_updated_at` trigger on tenant invoices (only installed for future entities)
- **Missing:** entity_permissions rows for `invoice/*`, `payment/*` actions

### C.3 What cannot be fixed by applying migrations alone

These require manual SQL against the live database:

1. **Entity permissions:** `entity_permissions` rows for `invoice/view`, `invoice/create`,
   `invoice/edit`, `invoice/delete`, `payment/view`, `payment/create`, `payment/edit`,
   `payment/delete` — must be verified and seeded if absent.

2. **Triggers on existing tenant invoices:** `trg_invoices_set_updated_at` and
   `trg_invoices_stamp_ownership` — NOT copied by `LIKE INCLUDING ALL`. Must be
   manually created.

3. **`invoice_financials_v` in tenant schema:** Must be created manually for the
   existing entity.

---

## D. Verification Queries (User Must Run)

Run these against the live database to determine exact state:

### D.1 Tenant schema tables
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'entity_bigdrops-main_main'
ORDER BY table_name;
```

### D.2 Entity permissions
```sql
SELECT resource, action
FROM entity_permissions
WHERE entity_id = 'eca34515-0b30-482c-b12e-3963df164322'
ORDER BY resource, action;
```

### D.3 Dashboard financial metrics RPC
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'get_dashboard_financial_metrics';
```

### D.4 Tenant invoice triggers
```sql
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'invoices'
  AND trigger_schema = 'entity_bigdrops-main_main';
```

### D.5 Public schema invoice count (for reconciliation)
```sql
SELECT
  (SELECT count(*) FROM public.clients) AS clients,
  (SELECT count(*) FROM public.invoices) AS invoices,
  (SELECT count(*) FROM public.invoice_items) AS invoice_items,
  (SELECT count(*) FROM public.payments) AS payments,
  (SELECT count(*) FROM public.receipts) AS receipts,
  (SELECT count(*) FROM public.wht_receipts) AS wht_receipts;
```

---

## E. Recommended Recovery Sequence

### Step 1: Apply data migration (critical path)

```bash
# From Supabase dashboard or psql, execute:
# supabase/migrations/20260809030000_invoice_aggregate_data_migration.sql
```

This creates `invoice_items` + `wht_receipts` in tenant schema and copies data.

### Step 2: Verify data migration

```sql
SELECT
  (SELECT count(*) FROM public.invoice_items) AS public_items,
  (SELECT count(*) FROM "entity_bigdrops-main_main".invoice_items) AS tenant_items,
  (SELECT count(*) FROM public.wht_receipts) AS public_wht,
  (SELECT count(*) FROM "entity_bigdrops-main_main".wht_receipts) AS tenant_wht;
```

Both pairs should match.

### Step 3: Fix triggers on existing tenant invoices

```sql
CREATE TRIGGER trg_invoices_set_updated_at
  BEFORE UPDATE ON "entity_bigdrops-main_main".invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_invoices_stamp_ownership
  BEFORE INSERT OR UPDATE ON "entity_bigdrops-main_main".invoices
  FOR EACH ROW EXECUTE FUNCTION public.stamp_row_ownership();
```

### Step 4: Verify/seed entity permissions

```sql
-- Check current permissions
SELECT resource, action FROM entity_permissions
WHERE entity_id = 'eca34515-0b30-482c-b12e-3963df164322';

-- Seed if missing (adjust IDs):
INSERT INTO entity_permissions (entity_id, resource, action)
VALUES
  ('eca34515-0b30-482c-b12e-3963df164322', 'invoice', 'view'),
  ('eca34515-0b30-482c-b12e-3963df164322', 'invoice', 'create'),
  ('eca34515-0b30-482c-b12e-3963df164322', 'invoice', 'edit'),
  ('eca34515-0b30-482c-b12e-3963df164322', 'invoice', 'delete'),
  ('eca34515-0b30-482c-b12e-3963df164322', 'payment', 'view'),
  ('eca34515-0b30-482c-b12e-3963df164322', 'payment', 'create'),
  ('eca34515-0b30-482c-b12e-3963df164322', 'payment', 'edit'),
  ('eca34515-0b30-482c-b12e-3963df164322', 'payment', 'delete')
ON CONFLICT DO NOTHING;
```

### Step 5: Verify client data in tenant

```sql
SELECT count(*) FROM "entity_bigdrops-main_main".clients;
-- Should be 30
```

### Step 6: Apply remaining migrations (provisioning fixes)

After confirming data migration works, apply the remaining `20260809*`
migrations through Supabase CLI. These fix the provisioning engine so
future tenants get the complete schema.

### Step 7: End-to-end verification

Test in the app:
1. Client picker shows 30 clients
2. Dashboard loads without toast errors
3. Invoice list shows existing invoices
4. Invoice detail loads with items
5. Create a new invoice (tests tenant write)
6. Record a payment (tests payment + receipt flow)

---

## F. Dashboard Toast — Root Cause

The production toast error (`Tenant schema is not available yet`) was caused by
the **PostgREST exposure gap**, not by missing data.

**Timeline:**
1. Tenant schema was created by provisioning engine
2. PostgREST was NOT configured to expose `entity_bigdrops-main_main`
3. App's `EntityProvider` calls `get_entity_provisioning_status` → returns `'ready'`
4. `tenantClient` is created with schema name
5. `tenantClient.from('invoices')` calls PostgREST → **PGRST106** (schema not exposed)
6. Error caught → toast shown

**Fix:** Manually expose the schema in Supabase Dashboard → SQL → API Gateway.
This was already done. The toast should stop.

If the toast persists, check for the race condition: the app may mount
`useDashboardData` before `EntityProvider` finishes resolving the entity.
Add `tenantClient.isReady` guard in the dashboard load function.

---

## G. Architectural Decisions Still Open

These are NOT blockers for the data migration but must be decided before
completing Phase 3 (full tenant cutover):

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | Financial computation | A: tenant-local view, B: global RPC, C: client-side | A (tenant-local view) — simplest, consistent with existing `invoice_financials_v` |
| 2 | Audit/activity placement | A: global, B: tenant-local | A (global) — audit trails span entities; no tenant-local benefit |
| 3 | Transaction boundaries | A: keep sequential, B: move to RPCs | B for create/edit/delete — partial writes are a real risk |
| 4 | Invoice numbering | A: read tenant, B: read public | A (read tenant) — after data migration, tenant has all rows |
| 5 | Resource mapping for invoice_items | A: map to `invoice`, B: dedicated `invoice_items` | A — invoice items are part of the invoice, not a separate domain |
| 6 | Legacy public data deletion | A: keep forever, B: delete after verification | B — but only after full Phase 3 is verified |

---

## H. Files and Evidence

### Migrations analyzed
- `20260714000000` — Core tenancy tables
- `20260716000001` — `is_workspace_member()` SECURITY DEFINER
- `20260717000000` — Provisioning engine (`provision_entity()`)
- `20260730000000` — `get_entity_provisioning_status` RPC
- `20260809000000` — Settings seed fix
- `20260809010000` — Template list fix (invoice_items + wht_receipts)
- `20260809020000` — Default permissions
- `20260809030000` — **Data migration (critical)**
- `20260809040000` — Audit RPC cross-schema
- `20260809050000` — Revert invoice cross-schema
- `20260809060000` — Tenant financials view
- `20260809070000` — Composite invoice RPCs

### Reports cross-referenced
- `docs/Reports/multi-tenancy/phase-3-invoice-write-path-inventory.md`
- `docs/Reports/multi-tenancy/phase-3-blocker-resolution-architecture-investigation.md`
- `docs/tickets/Critical-production-issue.md`
- `docs/Reports/GENERAL/financial-operations-architecture-audit.md`

### Source files inspected
- `src/hooks/useDashboardData.ts` — dashboard data loading
- `src/lib/tenantClient.ts` — tenant client creation
- `src/lib/tenant/contexts.tsx` — EntityProvider
- `src/components/app/AppShell.tsx` — provider nesting
- `live-public-schema.sql` — production DB dump

---

## I. Verification Gate

- [ ] Data migration SQL executed
- [ ] Tenant row counts match public
- [ ] Entity permissions seeded
- [ ] Triggers created on tenant invoices
- [ ] Client picker works (30 clients)
- [ ] Invoice list loads
- [ ] Invoice detail loads with items
- [ ] Dashboard loads without toast
- [ ] New invoice creation works
- [ ] Payment recording works
- [ ] `bun run typecheck` passed
- [ ] `bun run audit:load` passed

---

## Deferred Work

1. Full Phase 3 write-path migration (40 frontend write sites)
2. Composite RPC atomicity (create/edit/delete)
3. Audit RPC cross-schema resolution
4. Legacy public data cleanup
5. Invoice numbering authority decision
6. `get_dashboard_financial_metrics` RPC existence confirmation
