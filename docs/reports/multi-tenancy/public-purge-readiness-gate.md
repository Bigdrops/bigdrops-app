# Public Purge Readiness Gate — Final Reconciliation

This report was written by deepseek-v4-pro on 2026-08-25 via opencode.

## Objective

Establish the final, evidence-based gate before any public business data is removed, and formally classify offline quotation/CSR sync as deferred future work.

## Current tenancy state

- Production tenant: entity `eca34515-0b30-482c-b12e-3963df164322`, schema `entity_bigdrops-main_main`.
- Tenant schema: 32 business tables.
- Tenant views: `invoice_financials_v`, `project_financials_v`, `item_price_summary_v`.
- Tenant audit objects: `audit_logs`, `activity_events`, redirect of 23 audit RPCs to tenant tables.
- Tenant item-library objects: `normalize_item_text`, `get_item_suggestions`, `merge_item_catalog_entries`, `item_price_summary_v`.
- Tenant lifecycle/audit RPCs: 27 installed and verified.
- Provisioning template: 32 tables; resource mapping complete.

## Active application public-access status

Repository-wide multiline search for `supabase.from(`, `supabase.rpc(`, and `supabase.schema(` against business tables returns exactly two files:

- `src/lib/native/quotationSync.ts` — `quotations`, `quotation_items`.
- `src/lib/native/csrSync.ts` — `csrs`.

No other raw public business access remains. All active business reads and writes use `tenantClient`. `database.types.ts` is not imported by any application code, and no `.from<...>()` typed call exists.

## Offline-sync classification

**DEFERRED — NOT PART OF CURRENT TENANCY CUTOVER.**

The two offline modules are reachable from `QuotationList.tsx`, `CSR.tsx`, and `src/app/useSyncBootstrap.ts` (wired in `App.tsx`). Every public-table access is guarded by `canUseAndroidNativeSqlite()`, which is false on the web deployment, so the sync never runs. The feature is non-functional and is intentionally excluded from the current cutover.

The modules are retained, not deleted. They do not block TypeScript or type safety after the public purge because they address tables by string and do not use generated types. The decision is to retain them and mark them dead/deferred.

## Active purge blockers

None. The offline-sync modules are non-functional and guarded, so they are excluded from the purge dependency graph rather than treated as an active blocker.

## Deferred future work

Offline quotation/CSR sync tenant-awareness. Full architecture scope is recorded in `docs/tickets/Deferred-Work/deferred-offline-sync-debt.md`. It is not implemented now.

## Public business objects eligible for purge

Business tables (32, each has a tenant replacement): `activity_events`, `audit_logs`, `bank_accounts`, `blank_csr_logs`, `blank_waybill_logs`, `boq_rows`, `boqs`, `clients`, `csrs`, `invoice_items`, `invoices`, `item_aliases`, `item_catalog`, `item_import_batches`, `item_merge_log`, `letters`, `payments`, `project_documents`, `projects`, `quotation_items`, `quotations`, `receipts`, `rfq_items`, `rfqs`, `settings`, `signatories`, `tax_filings`, `tax_input_entries`, `tax_reminders`, `tax_settings`, `waybills`, `wht_receipts`.

Business views (6): `invoice_financials_v`, `project_financials_v`, `item_price_summary_v`, `v_last_invoice_activity`, `v_last_project_activity`, `v_last_quotation_activity`.

Business RPCs: the public copies of the tenant lifecycle/audit RPCs, `save_invoice_with_items_transaction`, `delete_invoice_with_items_transaction`, `record_payment_transaction`, `normalize_item_text`, `get_item_suggestions`, and the public `record_*` delegators.

## Public business objects still required

None of the business tables, views, or RPCs above is required by active application functionality.

Functions that MUST be retained because surviving tenant objects reference them:

- `public.validate_waybill_items` — referenced by the `check_items_json_structure` CHECK constraint on tenant `waybills`.
- `public.compute_jsonb_diff` — referenced by tenant `record_audit_log`.
- `public.has_entity_permission` — referenced by every tenant RLS policy.
- `public._prov_*` provisioning engine — required to provision future entities.
- `public.set_updated_at` / `set_row_updated_at` / `stamp_row_ownership` — trigger helpers referenced by cloned tables.

## Exact purge execution plan

This plan is for a future task. Do not execute it here.

1. Take a full dump: `supabase db dump --linked -f pre-purge-backup.sql`.
2. Drop business views first (they depend on tables): the 6 views.
3. Drop business tables in dependency order (children before parents). Reference order: `quotation_items`, `invoice_items`, `rfq_items`, `boq_rows`, `item_aliases`, `item_merge_log`, `project_documents`, `blank_csr_logs`, `blank_waybill_logs`, `tax_reminders`, `tax_filings`, `tax_input_entries`, `payments`, `wht_receipts`, then `quotations`, `invoices`, `rfqs`, `boqs`, `item_catalog`, `item_import_batches`, `projects`, `csrs`, `waybills`, `settings`, `tax_settings`, `letters`, `receipts`, `clients`, `signatories`, `bank_accounts`, `audit_logs`, `activity_events`. Use `DROP TABLE IF EXISTS ... CASCADE` so dependent triggers, policies, and indexes go with them.
4. Drop business RPCs, excluding the retained helper list above. Derive the exact drop list from a live `pg_depend` check at execution time: any public function whose dependents include tenant objects must be retained.
5. Reload PostgREST: `NOTIFY pgrst, 'reload schema';`.
6. Regenerate `database.types.ts` from the live schema (cosmetic — no code imports it, but keeps the file in sync).
7. Verify with queries: tenant table/view/RPC counts unchanged; no active query targets public business tables; `has_entity_permission`, `compute_jsonb_diff`, `validate_waybill_items`, and `_prov_*` still present in public.
8. Rollback: restore from the pre-purge dump.

## Provisioning-template status

Complete: `_prov_get_template_tables()` returns the 32 business tables; `_prov_table_to_resource()` maps every table to its resource; `provision_entity` installs settings, triggers, financial views, item-library objects, and tenant RPCs.

## RPC/view status

All tenant RPCs and views are installed and verified. Public copies remain only as purge candidates.

## Verification results

- `bun run typecheck`: passed. This task changed no application code, so typecheck is a repository safety check only.
- `bun run audit:load`: not re-run; no code changed in this task.
- `git status`: one file changed by this task (`docs/Reports/multi-tenancy/offline-sync-tenant-aware-deferral.md`). The working tree also contains concurrent, unrelated changes from another task (`src/App.tsx` legacy signup-approval cleanup, deletion of `src/pages/PendingApproval.tsx`), which do not affect the offline-sync reachability or this determination.
- `bun run build`: skipped per hardware policy.

## Files modified

- `docs/Reports/multi-tenancy/offline-sync-tenant-aware-deferral.md` — updated with the full future architecture scope and the non-functional classification.

## Remaining risks

- The exact public RPC drop list must be derived from a live `pg_depend` check at purge time to avoid removing helpers referenced by tenant objects.
- The offline modules still reference public tables at runtime and would fail on native Android if the offline feature is ever revived without the tenant-aware redesign.

## Determination

**READY FOR PURGE.**

## Skills used

supabase

## Documentation standard

ADS-STE100 Simplified Technical English
