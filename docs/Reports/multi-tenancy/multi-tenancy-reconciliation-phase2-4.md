# Multi-Tenancy Reconciliation — Hardening Apply, Item Library, and Provisioning Completion

This report was written by deepseek-v4-pro on 2026-08-25 via opencode.

## Objective

Apply and verify the tenant-authoritative hardening migration in production, then complete the item-library tenant objects, the provisioning template, and the resource/permission mapping audit that the previous session deferred.

## Scope

- Entity `eca34515-0b30-482c-b12e-3963df164322`, tenant schema `entity_bigdrops-main_main`.
- Supabase project `xqlpekpkbszpdgtuwybh`.
- Three migrations authored or corrected and applied to production. No application (TypeScript) code changed in this session.

## Hardening migration status

The migration `20260828000000_tenant_authoritative_hardening.sql` was NOT applied at session start (latest applied was `20260827000002`). It was reviewed, found to contain three bugs, corrected, applied, and verified.

### Bugs found and corrected before applying

| # | Bug | Consequence if shipped | Fix |
| :--- | :--- | :--- | :--- |
| 1 | `DROP FUNCTION IF EXISTS public.validate_waybill_items CASCADE` | Cascade-drops the `check_items_json_structure` CHECK constraint on `waybills` in both `public` and every tenant schema, disabling waybill item-shape validation. | Removed the DROP; kept the function. |
| 2 | PART 2 built `entity_bigdrops-main_main.audit_logs` unquoted | Syntax error (hyphen in schema name) on the RPC redirect DO block. | `format('%I', v_schema)` to quote the schema identifier. |
| 3 | PART 2 changed the return type of existing functions via `CREATE OR REPLACE` | `42P13 cannot change return type` (public composite -> tenant composite OID). | `DROP FUNCTION IF EXISTS` before re-create. |

The migration applied cleanly after these corrections.

## Exact production verification results

| # | Check | Result |
| :--- | :--- | :--- |
| 1 | Migration applied | `20260828000000` present in `supabase_migrations.schema_migrations`. |
| 1b | Tenant `activity_events` exists | Present. |
| 2 | Tenant audit RPCs write to tenant tables | `entity_bigdrops-main_main.record_activity_event` returns `"entity_bigdrops-main_main".activity_events` and inserts into the tenant table (verified by `pg_get_functiondef`). |
| 3 | Backfill preserved IDs | `tenant.activity_events` = 264 (public 264), `tenant.audit_logs` = 467 (was 428, public 467), `tenant.letters` = 2 (was 0, public 2). Missing IDs = 0 for both activity and audit. |
| 4 | App audit reads tenant-scoped | `useAuditTrail.ts` reads `audit_logs` + `activity_events` via `tenantClient` only. |
| 5 | No business-data supabase fallback remains | The `tenantClient?.isReady ? tenantClient : supabase` pattern is gone from `src/` (0 matches). Pre-existing direct `supabase` usage remains in unrelated pages (see blockers). |
| 6 | Letters tenant-scoped | `letterRepository.ts` takes `TenantClient`; `Letters.tsx`, `LetterFormPage.tsx`, `ViewLetter.tsx` have no `supabase` import. |
| 7 | Waybills tenant-scoped | `Waybills.tsx`, `ViewWaybill.tsx` have no `supabase` import. |
| 8 | RFQ → quotation tenant-scoped | `rfqService.ts` takes `TenantClient`; `RfqList.tsx` passes `tenantClient`. |
| 9 | `provision_entity` provisions required objects | Now calls `_prov_seed_settings`, `_prov_install_triggers`, `_prov_install_financial_views`, `_prov_install_tenant_rpcs`, `_prov_install_item_library`. |
| 10 | Dead notification functions removed | `run_notification_jobs`, `generate_invoice_notifications`, `resolve_invoice_notifications`, `generate_quotation_notifications`, `resolve_quotation_notifications`, `log_activity_event` all absent from `public`. `validate_waybill_items` preserved. |
| 11 | `device_sequences` removal | Removed from `public` and all tenant schemas (0 rows, no inbound FK). `check_items_json_structure` preserved on both `waybills` tables. |

## Item-library findings

- `normalize_item_text` and `get_item_suggestions` existed only in `public`.
- `item_price_summary_v` existed only in `public`.
- `merge_item_catalog_entries` existed nowhere.

The frontend contract (from `itemLibraryRepository.ts:452`): `merge_item_catalog_entries(p_winner_item_id uuid, p_merged_item_ids uuid[])` returning `winner_item_id`, `merged_item_ids`, `aliases_added`, `retired_item_ids`, `relinked_invoice_rows`, `relinked_quotation_rows`.

Tenant item tables already existed with the required FKs and unique indexes:
- `invoice_items.item_id -> item_catalog(id)`, `quotation_items.item_id -> item_catalog(id)`.
- `item_aliases.item_id -> item_catalog(id)`, unique on `normalized_alias_text`.
- `item_merge_log` FKs to `item_catalog` (from/to) and `item_import_batches`; CHECK on `action`.

## Item-library implementation status

Migration `20260828000001_item_library_tenant_objects.sql` installs four tenant objects via a new `_prov_install_item_library(p_schema_name, p_entity_id)`:

1. `normalize_item_text(input text)` — IMMUTABLE.
2. `item_price_summary_v` — view over tenant `item_catalog`, `invoice_items`, `invoices`, `quotation_items`.
3. `get_item_suggestions(search_text, result_limit)` — SQL STABLE, reads through base-table RLS.
4. `merge_item_catalog_entries` — SECURITY DEFINER, gated on `has_entity_permission(entity_id, auth.uid(), 'item', 'edit')`. Re-points `invoice_items` and `quotation_items` to the winner, moves merged names and aliases to the winner, retires merged items (`is_active = false`), and writes `item_merge_log` rows. Preserves referential integrity (soft-delete, no hard delete).

The merge result matches the frontend contract exactly. `provision_entity` now calls `_prov_install_item_library` (step 8.8).

### Functional verification

- `normalize_item_text('  2.5 MM2 PVC Wire & Cable  ')` -> `2.5 mm2 pvc wire and cable`; `NULL` -> empty.
- `item_price_summary_v` returns 1394 rows.
- `get_item_suggestions('cable', 5)` returns real catalog rows with ranked scores.

## Provisioning-template findings

- Live tenant: 32 business tables. Provisioning template: 17 tables. Gap = 15 tables.
- The 15 missing tables were never cloned for new entities: `activity_events`, `audit_logs`, `blank_csr_logs`, `blank_waybill_logs`, `boq_rows`, `item_catalog`, `item_aliases`, `item_import_batches`, `item_merge_log`, `project_documents`, `quotation_items`, `rfq_items`, `tax_filings`, `tax_input_entries`, `tax_reminders`.

Migration `20260828000002_provisioning_template_completion.sql`:

- Extends `_prov_get_template_tables()` to the full 32-table set.
- Extends `_prov_table_to_resource()` with 15 mappings mirroring the production tenant RLS resources exactly.

Resource mapping verified: `item_catalog -> item`, `project_documents -> project_document`, `quotation_items -> quotation`, `tax_filings -> tax_setting`, `audit_logs -> audit`, `activity_events -> audit`, `blank_csr_logs -> csr`, `boq_rows -> boq`.

Note: `device_sequences` is intentionally absent (dropped by the hardening migration).

## Resource/permission mapping findings

- Resource vocabulary in `entity_permissions`: `*`, `audit`, `bank_account`, `boq`, `client`, `csr`, `device`, `invoice`, `item`, `letter`, `payment`, `project`, `quotation`, `receipt`, `rfq`, `setting`, `signatory`, `tax_setting`, `waybill`.
- `project_documents` RLS uses the `project_document` resource, which has no explicit grant in `entity_permissions` (relies on the `*` wildcard).
- `_prov_seed_default_permissions()` grants the creator `*` (4 actions), 9 full-action resources, and `audit` + `device` view-only. The `*` wildcard covers resources not listed explicitly.
- `device` resource grant is now stale (the `device_sequences` table was dropped).

## Files/migrations changed

- `supabase/migrations/20260828000000_tenant_authoritative_hardening.sql` — corrected (3 bug fixes), applied.
- `supabase/migrations/20260828000001_item_library_tenant_objects.sql` — new, applied.
- `supabase/migrations/20260828000002_provisioning_template_completion.sql` — new, applied.

No application code changed in this session.

## Verification results

- `bun run audit:load`: completed. Pre-existing bloat/query warnings only; none from these changes.
- `bun run typecheck`: passed.
- `git status`: the three migrations are untracked new files; pre-existing staged/unstaged changes from prior sessions remain.
- `bun run build`: skipped per hardware policy.
- Database: all three migrations applied and verified against production with live queries.

## Remaining blockers

1. Pre-existing direct `supabase` usage in business pages (not the fallback pattern, and outside the hardening scope): `ClientDetail.tsx`, `Clients.tsx`, `InvoiceFormPage.tsx`, `NewBoq.tsx`, `viewBOQActions.ts`, `viewCSRActions.ts`, `viewRFQActions.ts`, `ProjectDocumentView.tsx`, `ViewReceipt.tsx`. These still read or write public business data. The public-schema purge cannot run until these are tenant-scoped.
2. `provision_entity` does not call `_prov_seed_default_permissions`. Creator permission seeding for new entities may be missing or handled by the in-progress team-role work. Needs a decision, not a speculative fix.
3. `project_document` resource has no explicit grant; relies on the `*` wildcard.
4. `_prov_seed_default_permissions` still grants the now-dead `device` resource (view).
5. `_prov_readd_foreign_keys` re-adds FKs without their `ON DELETE` action (CASCADE/SET NULL lost on cloned tables). Pre-existing limitation.

## Exact recommended next step

Do NOT start the public-schema purge. The next task is to tenant-scope the remaining pre-existing public `supabase` business pages listed in blocker 1 (clients, invoices, BOQ/CSR/RFQ view actions, project documents, receipts). After that is verified, re-run this report's Phase 1 verification items, then proceed to the purge.

Offline quotation/CSR sync remains deferred (see `offline-sync-tenant-aware-deferral.md`).

## Risks or limitations

- `merge_item_catalog_entries` was not exercised end-to-end against an authenticated session (no mutation of live business data was performed). Its logic was derived from the frontend contract, the table schemas, and the FK/constraint definitions. A dry-run merge on a scratch entity is recommended before relying on it.
- The migration filenames use timestamp `20260828`, which is ahead of the report date. This originates from the previous session and was not changed (renaming applied migrations breaks history).

## Deferred work

- Tenant-scope the remaining public business pages (blocker 1).
- Offline quotation/CSR sync tenant-awareness.
- Creator permission seeding decision for `provision_entity`.

## Skills used

NONE

## Documentation standard

ADS-STE100 Simplified Technical English
