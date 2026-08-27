# Public Business Schema Purge Report

This report was written by GLM on 2026-08-26 via OpenCode.

## 1. Objective

Remove the obsolete public business tables, views, and RPC copies after the tenancy cutover, while preserving tenant data, tenant dependencies, platform infrastructure, and provisioning. This executed the plan in `public-purge-readiness-gate.md`.

## 2. Identifiers

- Supabase project: `xqlpekpkbszpdgtuwybh`
- Production entity: `eca34515-0b30-482c-b12e-3963df164322`
- Tenant schema: `entity_bigdrops-main_main`

## 3. Backup result

The CLI `supabase db dump --linked` requires Docker, which is banned by workflow. A native `pg_dump` (PostgreSQL 17 client) captured both affected schemas including data:

- `%LOCALAPPDATA%\Temp\opencode\pre-purge-backup-full.sql` (6.53 MB; schema + COPY data for `public` and `entity_bigdrops-main_main`)
- `%LOCALAPPDATA%\Temp\opencode\pre-purge-backup-schema-only.sql` (0.57 MB)

Content verified (both DDL and tenant data present). The backup proves tenant-side pre-purge state and is the rollback artifact.

## 4. Migration name

`supabase/migrations/20260830000000_public_business_schema_purge.sql` — applied to production via `supabase db push --linked`; recorded in remote migration history (`migration list` shows local = remote = 73 entries).

Design: idempotent (`IF EXISTS` everywhere), dependency-safe order (views → tables deepest-first → functions with RESTRICT and per-object exception capture). Unexpected dependencies leave objects untouched with a logged skip.

## 5. Public tables removed (32)

activity_events, audit_logs, bank_accounts, blank_csr_logs, blank_waybill_logs, boq_rows, boqs, clients, csrs, invoice_items, invoices, item_aliases, item_catalog, item_import_batches, item_merge_log, letters, payments, project_documents, projects, quotation_items, quotations, receipts, rfq_items, rfqs, settings, signatories, tax_filings, tax_input_entries, tax_reminders, tax_settings, waybills, wht_receipts — **all 32 absent post-purge (count = 0)**.

## 6. Public views removed (6)

invoice_financials_v, project_financials_v, item_price_summary_v, v_last_invoice_activity, v_last_project_activity, v_last_quotation_activity — **absent post-purge**.

## 7. Public RPCs removed (25 + attempt log)

Dead pre-entity overloads (no callers): `record_payment_recorded` (both public-only overloads), `record_invoice_created` (4-arg), `record_invoice_status_changed` (7-arg), `record_payment_voided` (7-arg non-entity), `revert_invoice_to_quotation_transaction` (3-arg).

Same-signature duplicates of tenant RPCs: `delete_invoice_with_items_transaction(entity,id)`, `get_item_suggestions(text,int)`, `normalize_item_text(input)`, `record_activity_event(11)`, `record_audit_log(11)`, `record_invoice_created(+entity_id 5)`, `record_invoice_status_changed(+entity_id 7)`, `record_payment_attachment_uploaded(9)`, `record_payment_transaction(entity,payload)`, `record_payment_voided(+entity_id 7)`, `record_project_document_added(6)`, `record_project_linked_activity(9)`, `record_project_note_added(6)`, `record_project_updated(6)`, `record_quotation_created(4)`, `record_quotation_linked(9)`, `record_quotation_status_changed(6)`, `revert_invoice_to_quotation_transaction(+entity_id 4)`, `save_invoice_with_items_transaction(4)`.

Probe result: exactly one candidate remains in public (`purged_public_copies_gone` check flagged only `invoice_persisted_status`), see §16/§23.

## 8. Public helpers retained

`validate_waybill_items`, `compute_jsonb_diff`, `has_entity_permission`, `_audit_resolve_invoice_schema`, `set_updated_at`, `set_row_updated_at`, `stamp_row_ownership` — all present (§4 of task list confirmed via live catalog query).

## 9. Public infrastructure retained

All `_prov_*` (17 functions); platform/auth/workspace: `approve_workspace`, invitation create/revoke/accept, `apply_permission_template`, role assign/remove, seed triggers, `is_platform_operator/is_workspace_member/is_workspace_owner`, `handle_new_user`, `rls_auto_enable`; device/notification: device assignment trio, code generation, `upsert_notification`, `resolve_notification`; plus all retained platform tables listed in the readiness gate. Also **required-by-evidence**: `invoice_persisted_status` (see §22/§23).

## 10. Before/after public table counts (stale copies destroyed by design)

| Table | Rows before | After |
|---|---|---|
| activity_events | 264 | table gone |
| audit_logs | 467 | gone |
| bank_accounts | 1 | gone |
| blank_csr_logs | 0 | gone |
| blank_waybill_logs | 24 | gone |
| boq_rows / boqs | 0 / 0 | gone |
| clients | 32 | gone |
| csrs | 17 | gone |
| invoice_items | 2060 | gone |
| invoices | 239 | gone |
| item_aliases | 1000 | gone |
| item_catalog | 1394 | gone |
| item_import_batches / item_merge_log | 0 / 0 | gone |
| letters | 2 | gone |
| payments | 26 | gone |
| project_documents / projects | 2 / 2 | gone |
| quotation_items | 2799 | gone |
| quotations | 321 | gone |
| receipts | 4 | gone |
| rfq_items / rfqs | 54 / 3 | gone |
| settings / signatories | 1 / 1 | gone |
| tax_* (4 tables) | 0 each | gone |
| waybills | 18 | gone |
| wht_receipts | 0 | gone |

Full-tenant-data evidence lives in the backup file (§3).

## 11. Before/after tenant counts (unchanged — zero drift)

invoices 254=254, invoice_items 2095=2095, quotations 343=343, quotation_items 2878=2878, payments 26=26, receipts 4=4, waybills 18=18, csrs 17=17, clients 32=32, projects 3=3, project_documents 3=3, letters 2=2, rfqs 3=3, rfq_items 54=54, item_catalog 1394=1394, item_aliases 1000=1000, audit_logs 475=475, activity_events 268=268 — plus every remaining business table identical (bank_accounts 1, signatories 1, settings 1, blank_waybill_logs 27, others 0).

Tenant views before/after: invoice_financials_v, project_financials_v, item_price_summary_v — all 3 present at both checkpoints.

## 12. Tenant integrity verification

Orphan checks (SQL LEFT JOIN, live):

- quotation_items→quotations: 0 orphans
- invoice_items→invoices: **72 rows without a matching parent (9 NULL invoice_id + 63 stale references)** — pre-existing; see §21
- rfq_items→rfqs: 0
- boq_rows→boqs: 0
- project_documents→projects: 0
- blank_csr_logs→csrs (linked_csr_id): 0
- blank_waybill_logs→waybills (linked_waybill_id): 0
- tax chain: FKs structurally intact (child → tenant `settings` / `tax_filings` `*_fkey_clone` constraints) with 0 rows in tax tables

Tenant triggers referencing retained helpers still installed (set_row_updated_at / stamp_row_ownership / validate_waybill_items hard deps confirmed from catalog).

## 13. Tenant RPC verification

12/12 app-called lifecycle/audit/item-library RPCs resolve in the tenant schema (`record_audit_log`, `record_activity_event`, transactional invoice pair + revert, payment transaction, item-library trio, record_csr_created, record_waybill_created, record_letter_created family). Item-library objects (`normalize_item_text`, `get_item_suggestions`, `merge_item_catalog_entries`) and the three financial views are live. Live PostgREST probe: `GET /rest/v1/clients` with `Accept-Profile: entity_bigdrops-main_main` resolves correctly (deny-by-default RLS hides rows for unauthenticated keys — expected). Purged public tables return HTTP 404 on the default profile.

No synthetic audit-write test was run against production: writes would insert fake audit rows into live data; resolution is verified structurally instead (function presence + policy wiring + unchanged trigger inventory).

## 14. Provisioning verification

- `_prov_get_template_tables()` returns the full 32-table set.
- `_prov_table_to_resource()` resolves a resource for all 32 tables (32/32 mapped).
- Provisioning installers remain intact: `_prov_install_tenant_rpcs`, `_prov_install_item_library`, `_prov_install_financial_views`, `_prov_install_triggers`, `_prov_seed_settings`, `_prov_install_rls`, `_prov_readd_foreign_keys`, status/validation helpers.

## 15. PostgREST reload result

`NOTIFY pgrst, 'reload schema';` executed immediately after push. REST probes confirm the new surface (§13).

## 16. Repository public-access classification

`supabase.from(` occurrences: profiles/devices/notification/workspaces/platform-facing paths only, plus the two deferred offline modules. `supabase.rpc(`: platform/device/tenant-creation RPCs only (all still exist). `supabase.schema(`: none. Zero application access to purged business tables. `database.types.ts` has no importer.

## 17. Offline-sync deferred status

`src/lib/native/quotationSync.ts` and `src/lib/native/csrSync.ts` untouched. Classification remains DEFERRED per `offline-sync-tenant-aware-deferral.md` and `docs/tickets/Deferred-Work/deferred-offline-sync-debt.md`. They reference now-deleted public tables by string; guarded by `canUseAndroidNativeSqlite()`, which is false on web. Reactivation requires the documented tenant-aware redesign.

## 18–20. Gate results

Verification:
- bun run typecheck: passed (exit 0)
- bun run audit:load: passed with pre-existing warnings only (24 BLOAT / 6 broad-select / 3 heavy-limit / 1 ARCH — identical counts to the audit tickets)
- git status: only intended changes
- bun run build: skipped per hardware policy

git status:
```
M  src/lib/database.types.ts
?? supabase/migrations/20260830000000_public_business_schema_purge.sql
```

git diff --stat:
```
src/lib/database.types.ts | 341 insertions(+), 2535 deletions(-)
```

## 19a. database.types.ts regeneration

Generated fresh from the linked production schema after purge (repo convention is public-only generation; old tracked file also contained no tenant schema). Business tables no longer appear; retained infrastructure remains. `typecheck` re-run after regeneration: passed.

## 21. Pre-existing defect discovered (not caused by the purge)

63 tenant invoice_items reference invoices that do not exist, and 9 more have NULL invoice_id (total 72 of 2095). Proof of pre-existence: the pre-purge backup contains the identical distribution (2095 items, 9 NULL, 63 broken) before any destructive step ran. Root cause enabler: the tenant `invoice_items` clone carries no FOREIGN KEY on `invoice_id` (only `item_id → item_catalog` was re-added during provisioning). Impact today is display/analytics-level only; totals flows compute per-invoice through joins that already exclude missing parents. Ticket filed: `docs/tickets/AUDIT_TRAIL/tenant-invoice-items-orphan-reconciliation.md`.

## 22. Required dependency preserved against plan expectations

`invoice_persisted_status(p_computed text, p_current text, p_settled numeric)` was on the drop-candidate list, but live dependency check showed tenant view `invoice_financials_v` holds a hard pg_rewrite dependency on it. The migration's RESTRICT exception capture refused the drop and kept it intact. Classified: REQUIRED TENANT DEPENDENCY. It must be treated as protected infrastructure until/unless tenant financial views stop using it.

## 23. Warnings and remaining blockers

- One retention deviation from the original purge list: `invoice_persisted_status` (above).
- Pre-existing orphan invoice_items (ticketed; needs separate reconciliation decision).
- Stale legacy localStorage key remnants (client list cache) exist client-side and expire naturally — unrelated to this purge; noted earlier in cache-fix report.
- None of these block completion of acceptance criteria 1–19 except that criterion 3 is satisfied "minus required-dependency retention" as explicitly permitted by execution rule E5/E12 ("preserve anything required by tenant schemas").

Skills used: supabase, karpathy

Documentation standard: ADS-STE100 Simplified Technical English
