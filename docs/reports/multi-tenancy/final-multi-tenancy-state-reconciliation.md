# Final Multi-Tenancy State Reconciliation

This report was written by GLM on 2026-08-19 via opencode.

## 1. Executive Summary

The BIGDROPS tenancy cutover is nearly complete but not purge-ready. All queries in this report ran against the live production database on 2026-08-19.

Verified good state:

- The single production entity (`eca34515-0b30-482c-b12e-3963df164322`, schema `entity_bigdrops-main_main`) contains all 32 business tables.
- Every public business table is fully contained in the tenant schema, with two exceptions: `letters` (2 public-only rows) and `audit_logs` (8 public-only rows).
- Tenant row counts exceed public for invoices, invoice items, quotations, quotation items, and blank waybill logs. Post-cutover growth happens in the tenant schema only.
- All 27 lifecycle/audit tenant RPCs exist with canonical signatures. Invoice create and edit work live.
- No tenant-to-public foreign keys exist.
- Raw public `supabase.from()` access in the application is almost eliminated.

Remaining blockers, in order of severity:

1. The letters module still reads and writes public through raw `supabase`. A letter created on 2026-08-19 landed in `public.letters`.
2. The audit subsystem is split-brain. Tenant RPCs write to `public.audit_logs` and `public.activity_events`. The tenant `audit_logs` table exists but receives no writes and is stale. The audit UI reads public. `activity_events` has no tenant table at all.
3. Six live code sites fall back from `tenantClient` to public `supabase` for business tables (waybills, projects).
4. The item library is tenant-scoped at the app layer, but its tenant RPC and view are missing. `get_item_suggestions` exists only in public. `item_price_summary_v` exists only in public. `merge_item_catalog_entries` exists nowhere. Item suggestions silently return empty. Item merge always fails.
5. The provisioning template list has 17 tables. The live tenant schema has 32. A newly provisioned entity would be missing 15 tables, including `quotation_items`, `rfq_items`, `boq_rows`, `project_documents`, all item-library tables, all compliance tables, and `audit_logs`.
6. Four notification generator functions read public business tables. Nothing schedules or calls them today. They break at purge unless rewritten or dropped.

## 2. Current Architecture

- Platform: one workspace `bigdrops-main`, one entity `main` (Sun & Shield Power Solutions), one tenant schema `entity_bigdrops-main_main`.
- Entity ID: `eca34515-0b30-482c-b12e-3963df164322`. Workspace owner: `b676c7a8-7834-40dd-bc45-655822c5c5e6` (jaiyewisdom@gmail.com).
- Application data access: `tenantClient` (schema-scoped wrapper, `src/lib/tenantClient.ts:30`) for business data; raw `supabase` for auth, profiles, notifications, and device data.
- Provisioning: `public.provision_entity()` clones template tables, installs RLS, re-adds foreign keys, installs 27 tenant RPCs (step 8.9), and marks the entity ready.

## 3. Public Schema Classification (51 tables)

### GLOBAL INFRASTRUCTURE — keep public (11)

workspaces, workspace_members, workspace_invitations, workspace_invitation_entity_grants, entities, entity_permissions, entity_provisioning_status, permission_templates, permission_template_items, platform_operators, profiles (user data).

### USER / DEVICE / NOTIFICATION SCOPED — keep public (8)

devices, device_installations, push_device_tokens, push_delivery_logs, notifications, notification_preferences, notification_runs, and device functions (`generate_device_code`, `ensure_android_device_assignment`, `get_device_code_counter_seeds`, `admin_revoke_device_assignment`, `admin_update_device_assignment_code`).

### UNKNOWN — requires investigation (1)

- `device_sequences`: 0 rows in public, 0 rows in tenant, no runtime usage in `src` (generated types only). Legacy numbering scaffolding. Classify and drop from one or both schemas.

### BUSINESS DATA — must move/purge (31 shared tables + activity_events)

All of the following exist in BOTH schemas. Public copies are the purge targets:

audit_logs, bank_accounts, blank_csr_logs, blank_waybill_logs, boq_rows, boqs, clients, csrs, invoice_items, invoices, item_aliases, item_catalog, item_import_batches, item_merge_log, letters, payments, project_documents, projects, quotation_items, quotations, receipts, rfq_items, rfqs, settings, signatories, tax_filings, tax_input_entries, tax_reminders, tax_settings, waybills, wht_receipts.

Plus one public-only business table:

- `activity_events` (246 rows): no tenant counterpart exists.

## 4. Tenant Schema Verification

Tables: 32 present. All business domains covered: documents (invoices, quotations, waybills, csrs, letters, boqs, rfqs + item tables), finance (payments, receipts, wht_receipts), compliance (tax_*), support (clients, projects, project_documents, settings, signatories, bank_accounts), item library (item_catalog, item_aliases, item_import_batches, item_merge_log), audit (audit_logs), and blank logs.

Tenant RPCs: 27 installed and verified by signature dump. All frontend-required business RPCs resolve in the tenant schema except two (see item-library finding): `get_item_suggestions` and `merge_item_catalog_entries`.

Tenant views: `invoice_financials_v` and `project_financials_v` exist and the application reads both through `tenantClient` (reportRepository, useDashboardData, paymentRepository, ClientDetail, useProjectDocumentFetch). `item_price_summary_v` is MISSING in the tenant schema.

Notable write-path verification: `record_payment_transaction` is called through `tenantClient` (`src/modules/invoices/services/paymentService.ts:102`) and exists in the tenant schema.

## 5. Public Business Data Remaining

Row counts (public / tenant):

| Table | Public | Tenant | Public-only rows |
| --- | --- | --- | --- |
| invoices | 239 | 248 | 0 |
| invoice_items | 2060 | 2089 | 0 |
| quotations | 321 | 331 | 0 |
| quotation_items | 2799 | 2837 | 0 |
| payments | 26 | 26 | 0 |
| receipts | 4 | 4 | 0 |
| waybills | 18 | 18 | 0 |
| csrs | 17 | 17 | 0 |
| clients | 32 | 32 | 0 |
| projects | 2 | 2 | 0 |
| project_documents | 2 | 2 | 0 |
| letters | 2 | 0 | 2 |
| settings | 1 | 1 | 0 |
| signatories | 1 | 1 | 0 |
| bank_accounts | 1 | 1 | 0 |
| boqs / boq_rows | 0 / 0 | 0 / 0 | 0 |
| rfqs / rfq_items | 3 / 54 | 3 / 54 | 0 |
| item_catalog | 1394 | 1394 | 0 |
| item_aliases | 1000 | 1000 | 0 |
| item_import_batches / item_merge_log | 0 / 0 | 0 / 0 | 0 |
| blank_csr_logs | 0 | 0 | 0 |
| blank_waybill_logs | 24 | 26 | 0 |
| tax_settings / tax_filings / tax_input_entries / tax_reminders | 0 | 0 | 0 |
| wht_receipts | 0 | 0 | 0 |
| audit_logs | 436 | 428 | 8 |
| activity_events | 246 | (no table) | 246 |

The 8 public-only `audit_logs` rows are all post-cutover writes (2026-08-18 and 2026-08-19): 5 quotation CREATE/UPDATE events and 3 invoice CREATE/UPDATE events. They went to public because the tenant `record_audit_log` function inserts into `public.audit_logs` by design of migration `20260827000000`.

Dependencies blocking public drops (all internal to public; no tenant-to-public foreign keys):

- Foreign keys: invoice_items → item_catalog; quotation_items → item_catalog, quotations; item_aliases → item_catalog; item_merge_log → item_catalog, item_import_batches; payments → invoices; receipts → clients, invoices, payments; waybills → clients, invoices, projects; wht_receipts → invoices, payments; quotations → clients, projects; invoices → projects; projects → clients; csrs → projects, signatories; blank_csr_logs → csrs; blank_waybill_logs → waybills; boq_rows → boqs; rfq_items → rfqs; project_documents → projects; tax_filings/tax_input_entries/tax_reminders/tax_settings → settings; tax_reminders → tax_filings.
- Drop order consequence: `item_catalog` must drop after invoice_items, quotation_items, item_aliases, and item_merge_log. `settings` must drop after the four tax tables.
- RLS policies exist on 27 public business tables (legacy; drop with tables).
- Triggers exist on public invoices, letters, projects, quotations, quotation_items, receipts, item_catalog, item_aliases, item_import_batches (`*_set_updated_at`, `*_stamp_ownership`).
- Referencing views (public): invoice_financials_v, project_financials_v, item_price_summary_v, v_last_invoice_activity, v_last_project_activity, v_last_quotation_activity.
- Referencing functions (public): generate_invoice_notifications, resolve_invoice_notifications (read public.invoices, public.activity_events, public.invoice_financials_v); generate_quotation_notifications, resolve_quotation_notifications (read public.quotations and public.activity_events); get_item_suggestions (reads public.item_catalog, public.item_price_summary_v); record_audit_log / record_activity_event (write public.audit_logs / public.activity_events).

## 6. Application Public-Access Findings

Acceptable public access (global/user/device/notification only):

- `profiles`: App.tsx, Login, ResetPassword, SetPasswordModal, AdminSettingsSection, UserSettingsSection.
- `notification_preferences`, `push_delivery_logs`: useNotificationPreferences, sendPushForNotification.
- `device_installations`: AdminSettingsSection.
- Public RPCs: provision_entity, accept_workspace_invitation, get_entity_provisioning_status (tenantCreation.ts); is_platform_operator (TenantDebug.tsx, Settings.tsx); device RPCs (deviceAssignment.ts).

Cutover bugs (business data through public):

1. `src/domain/correspondence/letter/letterRepository.ts:1` imports raw `supabase`; every letter operation (lines 13, 31, 49, 65, 79, 92) hits `public.letters`. Live evidence: LTR-000002 was created in public on 2026-08-19.
2. `src/hooks/useAuditTrail.ts:86-95` reads `audit_logs` and `activity_events` through raw `supabase`.
3. `src/pages/Waybills.tsx:90,106,138` and `src/pages/ViewWaybill.tsx:171,602` use `tenantClient?.isReady ? tenantClient : supabase` for waybill reads, updates, deletes, and archive. When the tenant client is not ready, these hit public.
4. `src/components/document/ProjectLinkDialog.tsx:55` uses the same fallback and queries `projects` and link target tables through it.

Deferred by design (do not count as failures): `src/lib/native/quotationSync.ts` (public quotations, quotation_items) and `src/lib/native/csrSync.ts` (public csrs). See the deferred-work ticket in section 13.

## 7. RPC Findings

Public function inventory, classified:

- GLOBAL — keep public: the 16 `_prov_*` provisioning functions, `_audit_resolve_invoice_schema`, provision_entity, get_entity_provisioning_status, accept_workspace_invitation, create_workspace_invitation, revoke_workspace_invitation, guard_workspace_invitation_entity_workspace, approve_workspace, apply_permission_template, assign_role_to_company_member, remove_role_from_company_member, seed_preloaded_role_templates, seed_preloaded_roles_on_workspace_activation, has_entity_permission, is_platform_operator, is_workspace_member, is_workspace_owner, compute_jsonb_diff, set_updated_at, set_row_updated_at, touch_updated_at, stamp_row_ownership, handle_new_user, rls_auto_enable, device functions, notification functions (upsert_notification x2, resolve_notification x2, run_notification_jobs).
- OBSOLETE PUBLIC BUSINESS COPIES — tenant copies exist and work; remove after cutover completes: save_invoice_with_items_transaction, delete_invoice_with_items_transaction, revert_invoice_to_quotation_transaction (two overloads: legacy 3-arg and current 4-arg), record_activity_event, record_audit_log, record_invoice_created (two overloads), record_invoice_status_changed (two overloads), record_payment_attachment_uploaded (two overloads), record_payment_transaction, record_payment_voided (two overloads), record_project_document_added, record_project_linked_activity, record_project_note_added, record_project_updated, record_quotation_created, record_quotation_linked, record_quotation_status_changed.
- Note: record_csr_*, record_waybill_*, and record_letter_* were already removed from public and exist tenant-only. Invoice/payment/project/quotation record_* still have both copies.
- PUBLIC-ONLY, STILL REQUIRED: get_item_suggestions and its helper normalize_item_text. The frontend calls get_item_suggestions through the tenant client. A tenant copy does not exist. Item suggestions fail silently today.
- MISSING EVERYWHERE: merge_item_catalog_entries. The frontend calls it (`itemLibraryRepository.ts:452`) and throws on error. No migration ever created it. Item merge is broken in every schema.
- DEAD / UNUSED: log_activity_event, invoice_persisted_status, validate_waybill_items (present in generated types only; no runtime calls).
- PURGE-BLOCKING DEAD CODE: generate_invoice_notifications, generate_quotation_notifications, resolve_invoice_notifications, resolve_quotation_notifications read public.invoices/public.quotations/public.activity_events/public.invoice_financials_v. No pg_cron jobs exist (`cron.jobs` absent) and no frontend or edge function invokes them. They are unscheduled dead code that still blocks the purge.

## 8. View Findings

| Public view | Tenant copy | App usage | Verdict |
| --- | --- | --- | --- |
| invoice_financials_v | yes | via tenantClient | public copy obsolete; drop at purge |
| project_financials_v | yes | via tenantClient | public copy obsolete; drop at purge |
| item_price_summary_v | NO | via tenantClient (item library summary, history, filter counts) | BLOCKER: create tenant copy or the item library stays broken |
| v_last_invoice_activity | no | none (generated types only) | obsolete; drop at purge |
| v_last_project_activity | no | none (generated types only) | obsolete; drop at purge |
| v_last_quotation_activity | no | none (generated types only) | obsolete; drop at purge |

## 9. Letter Ownership Finding

Both public-only letters belong to the target entity. Ownership is established; do not treat LTR-000001 as an unresolvable blocker.

- LTR-000001, id `6787502b-aafd-4aec-b3eb-d519ae999ba8`, draft. Created 2026-07-13 by `b676c7a8-7834-40dd-bc45-655822c5c5e6` (jaiyewisdom@gmail.com, owner of workspace bigdrops-main). Recipient `49524916-ad37-419e-9238-df715a2e55e8` = BLUESKY AGRO ALLIED LTD, a client in `entity_bigdrops-main_main.clients`.
- LTR-000002, id `b429c4b5-f26e-4c1d-a461-4399839fad6e`, draft. Created 2026-08-19 by the same owner. Recipient `e84d330e-4922-4b04-b040-eba1cf986d07` = Boden Industries Limited, also a tenant client.

Sequence: cut over the letters module first (section 13, action 1), then copy both rows into the tenant schema, then drop public.letters. Copying now would fork the data because the module still writes public.

## 10. Item-Library Finding

Desired end state per the tenancy model: business item-library data is entity-scoped. The application layer already complies — `itemLibraryRepository.ts` takes a `TenantClient` and performs every read and write schema-scoped. Data is complete in the tenant schema (item_catalog 1394/1394, item_aliases 1000/1000, public subset of tenant, import batches and merge log empty).

What is missing to finish the item-library cutover:

1. Tenant copies of `get_item_suggestions` and helper `normalize_item_text` (source: `supabase/migrations/20260520090005_items_catalog.sql:139`).
2. Tenant copy of the `item_price_summary_v` view (source: `supabase/migrations/20260520090010_views.sql:63`). The repository reads it directly at lines 235, 282, and 412 for the summary list, price context, and filter counts.
3. `merge_item_catalog_entries` must be authored. It never existed in any migration. The frontend contract (itemLibraryRepository.ts:452-458): args `p_winner_item_id uuid`, `p_merged_item_ids uuid[]`; result fields `winner_item_id`, `merged_item_ids`, `aliases_added`, `retired_item_ids`, `relinked_invoice_rows`, `relinked_quotation_rows`.
4. The provisioning template table list and `_prov_install_tenant_rpcs` must include the item-library tables, the view, and both RPCs so new entities receive them.

Current user-visible symptoms: item suggestions return silently empty (errors swallowed at itemLibraryRepository.ts:217-231), and item merge throws a "function not found" style error on every attempt.

## 11. Public Purge Readiness Matrix

"SAFE TO DROP" assumes the listed blockers are cleared first. Drop children before parents per the FK list in section 5.

| Table | Tenant replacement | Data complete | App cutover complete | Dependencies remain | Safe to drop | Blocker |
| --- | --- | --- | --- | --- | --- | --- |
| clients | yes | yes | yes | FK from projects, quotations, receipts, waybills | yes (after children) | none |
| settings | yes | yes | yes | FK from tax_* tables | yes (after tax tables) | none |
| signatories | yes | yes | yes | FK from csrs | yes | none |
| bank_accounts | yes | yes | yes | none | yes | none |
| projects | yes | yes | PARTIAL | FK from invoices, quotations, csrs, waybills, project_documents | no | ProjectLinkDialog public fallback |
| quotations | yes | yes | yes | FK from quotation_items | yes (after items) | notification generators read public.quotations |
| quotation_items | yes | yes | yes | FK to item_catalog | yes (before item_catalog) | none |
| invoices | yes | yes | yes (verified live) | FK from payments, receipts, waybills, wht_receipts; item FK from invoice_items | yes (after children) | notification generators read public.invoices |
| invoice_items | yes | yes | yes | FK to item_catalog | yes (before item_catalog) | none |
| payments | yes | yes | yes | FK from receipts, wht_receipts | yes | none |
| receipts | yes | yes | yes | none | yes | none |
| waybills | yes | yes | PARTIAL | FK from blank_waybill_logs | no | Waybills.tsx / ViewWaybill.tsx public fallbacks |
| blank_waybill_logs | yes | yes | yes | none | yes (with waybills) | none |
| csrs | yes | yes | yes | FK from blank_csr_logs | yes | offline csrSync deferred (ticket) |
| blank_csr_logs | yes | yes | yes | none | yes (with csrs) | none |
| boqs / boq_rows | yes | yes | yes | boq_rows FK | yes | none |
| rfqs / rfq_items | yes | yes | yes | rfq_items FK | yes | none |
| project_documents | yes | yes | yes | none | yes | none |
| tax_settings / tax_filings / tax_input_entries / tax_reminders | yes | yes | yes | FK to settings | yes (before settings) | none |
| wht_receipts | yes | yes | yes | none | yes | none |
| letters | table yes, 0 rows | NO (2 rows) | NO | none | no | letters module still on public; migrate 2 rows after cutover |
| item_catalog / item_aliases / item_import_batches / item_merge_log | yes | yes | PARTIAL | FK from invoice_items, quotation_items, item_aliases, item_merge_log | no | tenant RPC + view missing; merge function never authored |
| audit_logs | yes (stale) | NO (8 rows) | NO | none | no | split-brain write/read path (section 12, item 2) |
| activity_events | NO table | NO (246 rows) | NO | read by dead notification generators | no | architectural decision required |
| device_sequences | both schemas, 0 rows | n/a | no usage | none | unknown | classify as global or legacy |

## 12. Exact Blockers

1. Letters module cutover: `letterRepository.ts` uses raw `supabase` for all operations; 2 public-only letter rows need migration after cutover.
2. Audit subsystem split-brain: tenant `record_audit_log` and `record_activity_event` write `public.audit_logs` / `public.activity_events` (by design of migration 20260827000000); tenant `audit_logs` table is stale (428 rows, no new writes); `useAuditTrail.ts` reads public; `activity_events` has no tenant table. A single architectural decision is required: tenant-authoritative audit (PRD-pure) or explicitly global audit (exception). Either way the current mixed state must end.
3. Six public-fallback code sites: Waybills.tsx:90,106,138; ViewWaybill.tsx:171,602; ProjectLinkDialog.tsx:55.
4. Item library tenant RPCs/view missing: get_item_suggestions, normalize_item_text, item_price_summary_v; merge_item_catalog_entries never authored.
5. Provisioning template incomplete: 17 tables vs 32 in the live tenant; `_prov_install_tenant_rpcs` covers 27 lifecycle RPCs but no item-library RPCs or views. New entities would be broken.
6. Dead notification generators (generate/resolve invoice/quotation notifications) read public business tables; rewrite tenant-aware or drop.
7. Obsolete public business RPC copies (section 7) and public views (section 8) remain to be dropped in the purge pass.
8. device_sequences is unclassified.

## 13. Exact Next Actions

Ordered. Do not start the purge until actions 1-6 are complete and verified.

1. Cut over `letterRepository.ts` to `TenantClient` (mirror `csrService.ts`). Then copy the 2 public letters into `entity_bigdrops-main_main.letters`.
2. Remove the 6 public-fallback sites (fail fast when the tenant client is not ready; no public fallback for business tables).
3. Decide the audit architecture and implement it:
   - Option A (PRD-pure): create `activity_events` in the tenant schema (and template), rewrite tenant `record_audit_log` / `record_activity_event` to write tenant tables, cut over `useAuditTrail.ts` reads to tenantClient, backfill the 8 public-only audit rows, update the RPC installer.
   - Option B (explicit exception): declare audit_logs and activity_events global platform audit infrastructure, drop the stale tenant `audit_logs` table, and document the exception.
   - Recommendation: Option A. The PRD states all business data lives in the tenant schema, and a tenant `audit_logs` table already exists.
4. Item library: create tenant `get_item_suggestions` + `normalize_item_text` + `item_price_summary_v`; author `merge_item_catalog_entries` from the frontend contract; add all of it to `_prov_install_tenant_rpcs`.
5. Extend `_prov_get_template_tables()` to the full 32-table set so new entities match the live tenant schema.
6. Rewrite or drop the four notification generator functions; drop the dead functions (log_activity_event, invoice_persisted_status, validate_waybill_items) if a final repo check still shows no callers.
7. Classify `device_sequences`; drop the unused copy or copies.
8. Run the purge pass in FK-safe order (children first; item_catalog after invoice_items/quotation_items/item_aliases/item_merge_log; settings after tax tables), dropping public tables, their RLS policies, triggers, the public financial/item views, the v_last_* views, and the obsolete public business RPCs. Reload the PostgREST schema cache after each batch.
9. Regenerate `database.types.ts` after the purge.

### Deferred future ticket: offline quotation/CSR sync

Offline sync for quotations (`src/lib/native/quotationSync.ts`) and CSRs (`src/lib/native/csrSync.ts`) is deferred by explicit instruction. These modules still read and write public `quotations`, `quotation_items`, and `csrs` through raw `supabase`, and offline sync is currently non-functional. The public purge will break these files permanently unless they are gutted first. A future ticket must design a proper offline architecture (tenant-aware queue, conflict resolution, and schema-scoped sync) before any purge removes public business tables, or the dead sync paths must be deleted in the purge pass with the feature re-planned later.

## Verification

- `bun run audit:load`: passed, no blocking warnings.
- `git status` before execution: clean.
- `git status` after execution: only this report file added.
- `bun run build`: skipped due to hardware policy.
- `bun run typecheck`: not run (zero-code-change audit pass, per instructions).

Skills used: supabase, audit-trail-investigation
Documentation standard: ADS-STE100 Simplified Technical English
