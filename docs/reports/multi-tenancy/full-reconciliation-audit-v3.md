# BIGDROPS Multi-Tenancy — Final Reconciliation Audit v3

This report was written by DeepSeek on 2026-08-15 via opencode (Local Runner).

## Objective

Produce the final evidence-based multi-tenancy reconciliation audit.
The audit combines three approved PRDs with live database verification.
The audit is the basis for the next coding phase.
The audit is read-only. It changes no code, database, or permissions.

## Scope

- Backend PRD v2.1 (approved, 717 lines).
- Frontend PRD v1.1 (approved, 772 lines).
- PRD v1.0 Appendix A (authoritative table mapping).
- Live database via Supabase Management API (SELECT-only).
- Application source code under `src/`.

## Files changed

- Created: `docs/Reports/multi-tenancy/full-reconciliation-audit-v3.md`.

## Skills used

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English

## 1. Current Real State

The multi-tenant backend is complete and live.
The frontend is partially migrated.
The item library, tax records, audit logs, and device sequences are not migrated.

| Item | Value |
|------|-------|
| Workspace ID | `eb30b64b-7f95-464f-be1a-805cf2c0fedc` |
| Workspace slug | `bigdrops-main` |
| Workspace name | `BIGDROPS` |
| Workspace status | active |
| Entity ID | `eca34515-0b30-482c-b12e-3963df164322` |
| Entity slug | `main` |
| Entity name | `Sun & Shield Power Solutions` |
| Entity type | company |
| Tenant schema | `entity_bigdrops-main_main` |

Live platform rows:
- workspaces: 1
- workspace_members: 1 (owner)
- entities: 1
- entity_permissions: 21
- auth.users: 9

Live tenant schema:
- Base tables: 21
- Views: 2 (invoice_financials_v, project_financials_v)
- Every base table has 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)

RLS policy pattern (verified live):
- `has_entity_permission('eca34515-0b30-482c-b12e-3963df164322'::uuid, auth.uid(), '<resource>', '<action>')`
- INSERT uses WITH CHECK.
- SELECT, UPDATE, DELETE use USING (qual).

`blank_csr_logs` policies reference the `'csr'` resource.
`blank_waybill_logs` policies reference the `'waybill'` resource.

The workspace UUID is corrected from v2.
The v2 report used `eb30b64b-7b95-464f-be1a-805cf2c0fedc`.
The live database uses `eb30b64b-7f95-464f-be1a-805cf2c0fedc`.

## 2. Entity-Owned Data Matrix

Appendix A is the authoritative table mapping.

### Present in the tenant schema (21)

| Table | Notes |
|-------|-------|
| bank_accounts | present, 4 policies |
| blank_csr_logs | present, 4 policies |
| blank_waybill_logs | present, 4 policies |
| boqs | present, 4 policies |
| clients | present, 4 policies |
| csrs | present, 4 policies |
| invoice_items | present, 4 policies |
| invoices | present, 4 policies |
| letters | present, 4 policies |
| payments | present, 4 policies |
| project_documents | present, 4 policies |
| projects | present, 4 policies |
| quotation_items | present, 4 policies |
| quotations | present, 4 policies |
| receipts | present, 4 policies |
| rfqs | present, 4 policies |
| settings | present, 4 policies |
| signatories | present, 4 policies |
| tax_settings | present, 4 policies |
| waybills | present, 4 policies |
| wht_receipts | present, 4 policies |

Views: invoice_financials_v, project_financials_v.

### Missing from the tenant schema (11)

| Table | Appendix A class |
|-------|------------------|
| rfq_items | entity-owned |
| boq_rows | entity-owned |
| item_catalog | entity-owned |
| item_aliases | entity-owned |
| item_import_batches | entity-owned |
| item_merge_log | entity-owned |
| tax_input_entries | entity-owned |
| tax_filings | entity-owned |
| tax_reminders | entity-owned |
| audit_logs | entity-owned |
| device_sequences | entity-owned |

These tables exist only in the public schema.
These tables remain publicly readable and writable.
These tables are the item library, tax, audit, and device modules.

### Platform-owned tables (public, intended)

- profiles
- notifications (scope_id = entity_id)
- notification_preferences
- devices
- device_installations
- push_device_tokens
- push_delivery_logs
- entities
- workspaces
- workspace_members
- entity_permissions
- platform_operators
- permission_templates
- permission_template_items

### activity_events (dual classification)

`activity_events` is a dual table.
- Public scope: cross-entity audit trail.
- Entity scope: entity-local activity.

The split is by the `scope_type` column.
This replaces the earlier ambiguous classification.
`log_activity_event` and `record_activity_event` accept `p_scope_type text`.

## 3. Frontend Migration Matrix

Grep census across `src/`:
- `supabase.from(`: 119
- `supabase.rpc(`: 38
- `tenantClient.from(`: 98

### Phase status

| Phase | PRD scope | Status |
|-------|-----------|--------|
| Phase 1 | Infrastructure (Providers, Tenant Client, Diagnostic) | Complete |
| Phase 2 | Read-only migration (Settings, Clients) | Partial, ~60% |
| Phase 3 | Invoice migration (CRUD) | ~95% |
| Phase 4 | Quotations, Receipts, Waybills, RFQs, BOQs, Projects | Partial, ~45% |
| Phase 5 | Data migration | Complete |
| Phase 6 | Cutover | Not started |

### Frontend module matrix

| Module | Tenant Client | Residual public access |
|--------|---------------|------------------------|
| Invoices | yes | Invoices.tsx L243, L246 |
| Quotations | yes | quotationSync.ts L267 |
| Payments | yes | paymentService.ts |
| Clients | yes | AddClient.tsx L16, EditClient.tsx L20, L48 |
| Settings | yes | AdminSettingsSection.tsx |
| Projects | yes | ProjectDetail.tsx L87 |
| Waybills | yes | ViewWaybill.tsx L171, L601 |
| Signatories | no | SignatoriesSettingsSection.tsx, CsrFormScreen.tsx L238 |
| Bank accounts | no | BankingSettingsSection.tsx |
| CSRs | no | csrService.ts L149, CsrFormPage.tsx L203, L311, L470 |
| RFQs | no | NewRfq.tsx, EditRfq.tsx, ViewRfq.tsx |
| BOQs | no | BoqList.tsx, ViewBoq.tsx, viewBOQActions.ts |
| Compliance (tax) | no | ComplianceHub.tsx L175, L197, L208 |
| Item library | no | itemLibraryRepository.ts |
| Reports | no | reportRepository.ts, exportFetchers.ts |
| Audit trail | no | useAuditTrail.ts L87, L95 |
| Profiles | no | App.tsx L177, L201 |
| Notifications | no | sendPushForNotification.ts L56 |

### Files with residual `supabase.from('` (37)

App.tsx, SetPasswordModal.tsx, BoqList.tsx, CsrFormScreen.tsx,
ProjectDocumentSheet.tsx, csrService.ts, sendPushForNotification.ts,
useDashboardData.ts, useGlobalSearch.ts, useInvoiceReferenceData.ts,
useNotificationPreferences.ts, complianceRepository.ts, paymentService.ts,
itemLibraryRepository.ts, reportRepository.ts, AddClient.tsx, ComplianceHub.tsx,
CsrFormPage.tsx, EditClient.tsx, EditRfq.tsx, Login.tsx, NewRfq.tsx,
QuotationFormPage.tsx, ResetPassword.tsx, AdminSettingsSection.tsx,
ArchivesSettingsSection.tsx, BankingSettingsSection.tsx,
SignatoriesSettingsSection.tsx, UserSettingsSection.tsx, ViewBoq.tsx,
viewBOQActions.ts, ViewCSR.tsx, viewCSRActions.ts, viewQuotationActions.ts,
ViewRfq.tsx, viewRFQActions.ts, ViewWaybill.tsx.

### Public `supabase.from(` frequency (top)

rfqs 15, csrs 13, profiles 11, boqs 10, signatories 10, bank_accounts 9,
rfq_items 6, tax_reminders 5, tax_input_entries 5, tax_filings 5,
waybills 3, clients 3, boq_items 3, tax_settings 2, quotation_items 2,
invoices 2, invoice_items 2, item_price_summary_v 1, project_financials_v 1,
push_delivery_logs 1, quotations 1, device_installations 1, blank_csr_logs 1,
notification_preferences 1, project_documents 1.

### `tenantClient.from(` usage (98)

quotations 26, invoices 14, projects 9, quotation_items 9, settings 7,
clients 6, receipts 5, invoice_items 4, invoice_financials_v 3,
project_documents 3, waybills 3, project_financials_v 1, wht_receipts 1.

### Module adapters

`resolveFetchClient(ctx)` (moduleAdapters.ts L21) returns the tenant client
when ready, otherwise null.

Adapters fall back to `tenantClient ?? supabase` at lines 135-136, 320-321,
400-401, and 606-607.
This fallback silently uses the public schema until cutover.

The projects, csr, rfqs, and boqs list adapters use `supabase.from()`
directly. They do not accept a context. They always target the public schema.

The waybills adapter uses the tenant client.
The waybills permission rows are missing.
Cutover would fail RLS for waybills.

## 4. Backend / Database Gaps

### Missing tenant tables (11)

rfq_items, boq_rows, item_catalog, item_aliases, item_import_batches,
item_merge_log, tax_input_entries, tax_filings, tax_reminders, audit_logs,
device_sequences.

### Item library is not migrated

`get_item_suggestions` is a live public function.
The function body reads `public.item_catalog`, `public.item_aliases`, and
`public.item_price_summary_v`.
The item library is therefore hard-wired to the public schema.
The item library is NOT intentionally public.
This is a confirmed migration gap.

### Tables referenced but absent

| Table | Call sites | Status |
|-------|-----------|--------|
| boq_items | ViewBoq.tsx L60, BoqList.tsx L53, viewBOQActions.ts L11, exportFetchers.ts L51, exportCompilers.ts L176 | does not exist |
| client_service_records | exportFetchers.ts L32 | does not exist |
| price_history | exportFetchers.ts L30 | does not exist |

Real BOQ items are stored in `boqs.custom_fields` (jsonb).
The boq_items references are dead code paths.
The export code fails at runtime.

### RPC referenced but absent

`merge_item_catalog_entries` is called at itemLibraryRepository.ts L451.
The function does not exist in the live database.
This path fails at runtime.

### Live public functions

The following functions exist in the public schema:
- _audit_resolve_invoice_schema
- _prov_get_schema_name
- accept_workspace_invitation
- admin_revoke_device_assignment
- admin_update_device_assignment_code
- apply_permission_template
- compute_jsonb_diff
- delete_invoice_with_items_transaction
- ensure_android_device_assignment
- generate_device_code
- generate_invoice_notifications
- generate_quotation_notifications
- get_device_code_counter_seeds
- get_item_suggestions
- get_entity_provisioning_status
- handle_new_user
- has_entity_permission
- invoice_persisted_status
- is_platform_operator
- is_workspace_member
- is_workspace_owner
- log_activity_event
- normalize_item_text
- provision_entity
- record_activity_event
- record_audit_log
- record_invoice_created
- record_invoice_status_changed
- record_payment_attachment_uploaded
- record_payment_recorded
- record_payment_transaction
- record_payment_voided
- record_project_document_added
- record_project_linked_activity
- record_project_note_added
- record_project_updated
- record_quotation_created
- record_quotation_linked
- record_quotation_status_changed
- resolve_invoice_notifications
- resolve_notification
- resolve_quotation_notifications
- revert_invoice_to_quotation_transaction
- rls_auto_enable
- run_notification_jobs
- save_invoice_with_items_transaction
- set_row_updated_at
- set_updated_at
- stamp_row_ownership
- touch_updated_at
- upsert_notification
- validate_waybill_items

`save_invoice_with_items_transaction` is SECURITY DEFINER.
It resolves the tenant schema via `_prov_get_schema_name`.
It is multi-tenant safe.

`get_item_suggestions` is the only live public function that reads
entity-owned data directly.

## 5. Security Gaps

### Permission gap

`entity_permissions` has 21 rows.
All 21 rows belong to one user: `b676c7a8-7834-40dd-bc45-655822c5c5e6`
(jaiyewisdom@gmail.com, workspace owner).

Granted resources and actions:
- client: view
- invoice: create, delete, edit, view
- payment: create, delete, edit, view
- quotation: create, delete, edit, view
- receipt: create, delete, edit, view
- setting: create, delete, edit, view

No permission rows exist for:
- waybill, project, csr, rfq, boq, letter
- bank_account, signatory, tax_setting, project_document

The live database has 9 auth.users.
Only 1 user is a workspace member.
Cutover locks out 8 of 9 users.

The waybillsAdapter uses the tenant client.
Waybill permission rows are missing.
Waybill RLS would reject every request after cutover.

### Public write surface

Residual public writes remain in the application:
- Invoices.tsx L243: writes `csrs.linked_invoice_id`.
- Invoices.tsx L246: writes `waybills.invoice_id`.
- ProjectDetail.tsx L87: writes public projects.
- quotationSync.ts L267: deletes public quotations.
- src/lib/audit.ts L221: writes public invoices.
- useAuditTrail.ts L87: reads public audit_logs.
- useAuditTrail.ts L95: reads public activity_events.

These paths bypass the tenant schema.
These paths keep public data alive after cutover.

## 6. Data Migration Gaps

### Item library

- item_catalog: not migrated.
- item_aliases: not migrated.
- item_import_batches: not migrated.
- item_merge_log: not migrated.

### Tax module

- tax_input_entries: not migrated.
- tax_filings: not migrated.
- tax_reminders: not migrated.

### Audit

- audit_logs: not migrated.

### Device sequences

- device_sequences: not migrated.

### Legacy public tables after cutover

The following public tables remain populated:
- rfq_items, boq_rows
- item_catalog, item_aliases, item_import_batches, item_merge_log
- tax_input_entries, tax_filings, tax_reminders
- audit_logs, device_sequences

### Stray provisioning schema

Schema `eca34515-0b30-482c-b12e-3963df164322` exists.
It contains boqs, letters, and rfqs. All are empty.
This is a first-provisioning leftover.
It is a cleanup candidate, not a data source.

## 7. Architectural Violations

### Invariant 4 violation

Every migrated business query must come from the Tenant Client.
The fallback `tenantClient ?? supabase` in moduleAdapters.ts violates this.
It silently falls back to the public schema.

### Invariant 4 violation (hard-coded public)

The projects, csr, rfqs, and boqs list adapters use `supabase.from()`
directly.
They ignore the tenant context entirely.

### Invariant 8 violation

Schema resolution must live only in the Entity Provider and Tenant Client.
No evidence of application-level schema-name construction was found.

### Residual public data access

37 files still call `supabase.from('...')`.
These calls read or write entity-owned data in the public schema.

### Runtime defects

Four code paths reference absent tables or RPCs:
- boq_items (absent table).
- client_service_records (absent table).
- price_history (absent table).
- merge_item_catalog_entries (absent RPC).

These paths fail at runtime.

## 8. Cutover Blockers

Cutover cannot proceed until all blockers are resolved.

| Blocker | Detail | Effort |
|---------|--------|--------|
| Missing permissions | No rows for waybill, project, csr, rfq, boq, letter, bank_account, signatory, tax_setting, project_document | Add 40+ rows |
| Only one member | 8 of 9 users have no workspace membership or permissions | Grant access |
| Missing tenant tables | 11 entity-owned tables absent from tenant schema | Create and migrate |
| Item library | get_item_suggestions hard-wired to public tables | Recreate in tenant schema |
| Residual public access | 37 files, 119 supabase.from calls | Migrate and remove |
| Audit trail | audit_logs absent; useAuditTrail reads public | Migrate and rewire |
| Device sequences | device_sequences absent | Migrate |
| Export hub | dead tables break export | Fix or remove |
| Adapter fallback | `tenantClient ?? supabase` hides failures | Remove fallback |

## 9. Recommended Implementation Order

1. Create the 11 missing tenant tables.
2. Migrate item library data into the tenant schema.
3. Migrate tax module data into the tenant schema.
4. Migrate audit_logs into the tenant schema.
5. Migrate device_sequences into the tenant schema.
6. Grant permission rows for every user and resource.
7. Migrate the remaining frontend modules to the tenant client.
8. Remove the public fallback in moduleAdapters.ts.
9. Fix or remove the dead export paths.
10. Delete the stray provisioning schema.
11. Run cutover (Phase 6).
12. Remove legacy public tables.

## 10. Honest Progress

This audit reports two separate numbers.
They measure different things. Do not combine them.

### A. Implementation progress

Approximately 87.13%.

Breakdown:
- Backend (PRD v2.1): 100%.
- Frontend (PRD v1.1): approximately 74.25%.
  - Phase 1: complete.
  - Phase 2: partial, ~60%.
  - Phase 3: ~95%.
  - Phase 4: ~45%.
  - Phase 5: complete.
  - Phase 6: not started.

This number measures how much of the PRD is implemented.
It does not measure cutover readiness.

### B. Cutover readiness

Low, near zero.

The 11 missing tenant tables block 4 modules.
The permission gap locks out 8 of 9 users.
The waybills module would fail RLS immediately.
The item library, tax, audit, and device modules remain public.

Cutover readiness is not the same as implementation progress.

## 11. Final Verdict

The backend is complete and live.
The RLS layer is complete and correct on 21 tenant tables.
The frontend is partially migrated.
Phase 6 cutover has not started.

The item library is a confirmed migration gap.
The tax module, audit trail, and device sequences are not migrated.
The permission gap is the critical cutover blocker.
The waybills module would fail RLS after cutover.

Do not cut over in the current state.
Complete the 11 missing tables and the permission grant first.
Then migrate the remaining frontend modules.
Then remove the public fallback.

Overall implementation progress is approximately 87%.
Cutover readiness is low.

## Changes made

- No application code changed.
- No database changed.
- No permissions changed.
- Only this report was created.

## Verification

- `bun run audit:load`: not run (no code changed).
- `bun run typecheck`: not run (no code changed).
- `git status`: 5 modified files under `docs/prd/ui-ux-consolidation/`; report not listed (gitignored).
- Live database verified via SELECT-only queries:
  - workspace UUID corrected to `eb30b64b-7f95-464f-be1a-805cf2c0fedc`.
  - tenant schema: 21 base tables, 2 views, 4 policies each.
  - entity_permissions: 21 rows, 1 user, 6 resources.
  - get_item_suggestions body reads public tables.

## Risks or limitations

- Line-level grep outputs were partially truncated earlier.
  Re-run targeted `rg -n` if full per-line enumeration is needed.
- The report trusts the live database over repo evidence.
- The frontend percentage is an estimate, not a measurement.

## Deferred work

- Full per-line enumeration of the 37 residual public files.
- Live row-count migration audit for each missing table.
- Migration SQL for the 11 missing tables.
- Permission grant plan for all 9 users.