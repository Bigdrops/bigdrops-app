# Invoice-to-Quotation Revert Fix Report

This report was written by opencode (mimo-v2.5-free) on 2026-09-05 via Local Runner.

---

## Objective

Fix the broken Invoice → Quotation revert workflow at the DB layer by installing the canonical 4-parameter tenant-scoped `revert_invoice_to_quotation_transaction` function in all provisioned tenant schemas, correct stale comments, and account for incomplete entity provisioning.

## Scope

- DB function installation across 4 tenant schemas
- Migration file cleanup (remove unintended schema creation)
- Stale code comment corrections
- Live DB verification of function placement and schema state

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260905000000_revert_invoice_canonical_tenant_install.sql` | Removed `CREATE SCHEMA IF NOT EXISTS` for agam, issa-certified, ororo. Cleaned up stale section headers and comments. |
| `src/modules/invoices/services/invoiceConversionService.ts` | Fixed stale comment at line 24: `"quotations remain public"` → `"quotation and invoice reads route through the tenant schema"` |
| `src/pages/viewQuotationActions.ts` | (previously fixed) Comment at line 158-159 corrected to `"routes through the tenant schema"` |

## Skills Used

- `supabase` — DB workflow, Management API SQL execution
- `supabase-postgres-best-practices` — Schema and function verification

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### 1. Migration File Cleanup

The applied migration (`20260905000000_revert_invoice_canonical_tenant_install.sql`) contained `CREATE SCHEMA IF NOT EXISTS` statements for 3 entities (agam, issa-certified, ororo) as a side effect of a bug fix. Schema creation does not belong in a bug fix migration. Removed:

- Lines 40-42: `CREATE SCHEMA IF NOT EXISTS` for all 3 schemas
- Section A header and associated comments
- Stale PROBLEM description referencing missing schemas
- Numbered FIX list referencing schema creation

The migration now contains only:
- The 4 `CREATE OR REPLACE FUNCTION` statements (main, agbado, alarm, ogombo)
- The safety `DROP FUNCTION` for any public schema remnants

### 2. Stale Comment Corrections

**`invoiceConversionService.ts:24`** — Changed:
```
// Phase 3: quotations remain public; the invoice source read targets the
// tenant schema (invoices is part of the aggregate).
```
To:
```
// Phase 3: quotation and invoice reads route through the tenant schema.
```

Rationale: After the revert function fix, quotations route through the tenant schema via `tenantClient.from('quotations')`. The old comment was inaccurate.

**`viewQuotationActions.ts:158-159`** — Already correct (fixed in prior session):
```
// Phase 3: invoices/invoice_items are aggregate → tenant. Quotation
// read/write also routes through the tenant schema.
```

### 3. Stale Schemas Created (Side Effect)

The original migration created 3 empty schemas on the live DB before the cleanup was applied:

| Schema | Tables | Functions | Status |
|--------|--------|-----------|--------|
| `entity_bigdrops-main_agam` | 0 | 0 | Empty artifact — no business tables |
| `entity_bigdrops-main_issa-certified` | 0 | 0 | Empty artifact — no business tables |
| `entity_bigdrops-main_ororo` | 0 | 0 | Empty artifact — no business tables |

These schemas have no tables, no functions, and no views. They are empty namespaces created as a side effect of the original migration's `CREATE SCHEMA IF NOT EXISTS` statements. The provisioning engine will populate them with business tables when those entities are first used. No action required.

### 4. Function Installation Verification (Live DB)

| Schema | `revert_invoice_to_quotation_transaction` | `__SCHEMA__` qualified refs |
|--------|------------------------------------------|---------------------------|
| `entity_bigdrops-main_main` | ✅ Installed | ✅ Yes |
| `entity_bigdrops-main_agbado` | ✅ Installed | ✅ Yes |
| `entity_bigdrops-main_alarm` | ✅ Installed | ✅ Yes |
| `entity_bigdrops-main_ogombo` | ✅ Installed | ✅ Yes |
| `public` | ❌ Absent (correct) | N/A |

### 5. Provisioning Engine Inspection

The provisioning engine (`20260902120000_provisioning_engine_repair.sql:1509-1608`) already handles the revert function via `__SCHEMA__` template substitution. When the engine provisions a new entity, it installs all 27 functions including `revert_invoice_to_quotation_transaction` with proper `__SCHEMA__.quotations` qualified references. No changes needed.

## Verification Result

| Check | Result |
|-------|--------|
| `bun run audit:load` | ✅ Passed (no new warnings) |
| `bun run typecheck` | ✅ Passed (0 errors) |
| `git status` | ✅ Clean — only intended changes |
| `git diff --stat` | ✅ 2 files changed (migration cleanup + comment fix) |
| Live DB: 4 functions present | ✅ Confirmed in main, agbado, alarm, ogombo |
| Live DB: public function absent | ✅ Confirmed |
| Live DB: 3 schemas empty | ✅ Confirmed (0 tables, 0 functions each) |

## Risks or Limitations

- The 3 empty schemas (agam, issa-certified, ororo) exist on the live DB as empty namespaces. They are harmless but will persist until the provisioning engine populates them or they are manually dropped. This is a cosmetic issue, not a functional one.
- The migration file `20260905000000_revert_invoice_canonical_tenant_install.sql` was already applied to the live DB. The file edits (removing CREATE SCHEMA) correct the migration for future use and documentation accuracy, but do not affect the already-applied state.

## Deferred Work

- **Provisioning engine integration**: The 3 incomplete entities (agam, issa-certified, ororo) need their business tables provisioned. This is a separate concern from the revert fix and should be handled by the existing provisioning engine when those entities are first used.
- **Schema cleanup**: The 3 empty schemas could be dropped if those entities are confirmed inactive. This requires a separate decision and migration.
