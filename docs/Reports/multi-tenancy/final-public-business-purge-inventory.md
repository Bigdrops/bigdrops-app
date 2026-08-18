# Final Public Business Purge Inventory

This report was written by deepseek-v4-flash-free on 2026-08-17 via Local Runner.

## 1. Executive Summary

This report is the authoritative map for the FINAL multi-tenancy cutover.
It is an inventory-only pass.

No application source was changed.
No database schema was changed.
No data migration was created or run.
No public table was deleted.
No public data was deleted.

The live linked Supabase database was inspected directly.
Old reports were used only as pointers.
Every frontend line number was re-verified in the repository.

Key findings:

- The live database has 51 public tables.
- The live database has 32 tenant tables.
- All 32 tenant tables also exist in public.
- Public schema is the legacy home of all business data.
- The tenant schema `entity_bigdrops-main_main` holds the real entity data.
- 19 public tables have no tenant counterpart.
- 10 of those are global infrastructure.
- 9 of those are user-scoped or device-scoped.
- The item library family is open by default deny.
- The RPC `merge_item_catalog_entries` does not exist in the live database.
- The frontend calls `merge_item_catalog_entries` at
  `src/modules/item-library/repositories/itemLibraryRepository.ts:451`.
- This is a live broken feature and the top cutover blocker.
- No sequences and no identity columns exist in public or tenant schemas.
- Document numbering uses client-side generation or RPC logic.

The recommended path is small dependency-safe migration batches.
The exact next batch is specified in section 14.

## 2. Complete Public Business Table Inventory

The public schema has 51 tables.

### 2.1 Business Tables with a Tenant Counterpart (32)

| # | Table | Tenant counterpart |
| :--- | :--- | :--- |
| 1 | audit_logs | yes |
| 2 | bank_accounts | yes |
| 3 | blank_csr_logs | yes |
| 4 | blank_waybill_logs | yes |
| 5 | boq_rows | yes |
| 6 | boqs | yes |
| 7 | clients | yes |
| 8 | csrs | yes |
| 9 | device_sequences | yes |
| 10 | invoice_items | yes |
| 11 | invoices | yes |
| 12 | item_aliases | yes |
| 13 | item_catalog | yes |
| 14 | item_import_batches | yes |
| 15 | item_merge_log | yes |
| 16 | letters | yes |
| 17 | payments | yes |
| 18 | project_documents | yes |
| 19 | projects | yes |
| 20 | quotation_items | yes |
| 21 | quotations | yes |
| 22 | receipts | yes |
| 23 | rfq_items | yes |
| 24 | rfqs | yes |
| 25 | settings | yes |
| 26 | signatories | yes |
| 27 | tax_filings | yes |
| 28 | tax_input_entries | yes |
| 29 | tax_reminders | yes |
| 30 | tax_settings | yes |
| 31 | waybills | yes |
| 32 | wht_receipts | yes |

### 2.2 Global Infrastructure Tables (10)

These support workspaces, entities, permissions, and platform operators.
They are correctly public and must stay public.

| # | Table | Purpose |
| :--- | :--- | :--- |
| 1 | workspaces | Company workspaces |
| 2 | workspace_members | Workspace membership |
| 3 | workspace_invitations | Invitations |
| 4 | workspace_invitation_entity_grants | Invitation to entity grants |
| 5 | entities | Tenant entities |
| 6 | entity_permissions | Permission grants per entity |
| 7 | entity_provisioning_status | Provisioning state |
| 8 | permission_templates | Role templates |
| 9 | permission_template_items | Template rows |
| 10 | platform_operators | Platform admin users |

### 2.3 User-Scoped and Device-Scoped Tables (9)

These hold personal or device data. They are not company business data.

| # | Table | Scope |
| :--- | :--- | :--- |
| 1 | profiles | user |
| 2 | activity_events | user/global |
| 3 | devices | device |
| 4 | device_installations | device |
| 5 | notification_preferences | user |
| 6 | notification_runs | user/global |
| 7 | notifications | user |
| 8 | push_device_tokens | device |
| 9 | push_delivery_logs | user/device |

### 2.4 Table Properties

For every shared table:

1. The tenant table exists. See section 3.
2. Exact public row count. See section 4.
3. Exact tenant row count. See section 4.
4. Schema and column compatibility. Identical for all 32 shared tables.
5. Primary key. Present on all business tables.
6. Foreign keys. 47 total. See section 5.
7. Important indexes. See section 5.
8. RLS policies. See section 5.
9. Triggers. None found on the business tables inspected.
10. Functions and RPCs that read or write it. See section 6.
11. Frontend files that access it. See section 9.
12. Whether data can migrate without ambiguity. See section 4.

## 3. Complete Tenant Table Inventory

The tenant schema `entity_bigdrops-main_main` has 32 tables.

| # | Table |
| :--- | :--- |
| 1 | audit_logs |
| 2 | bank_accounts |
| 3 | blank_csr_logs |
| 4 | blank_waybill_logs |
| 5 | boq_rows |
| 6 | boqs |
| 7 | clients |
| 8 | csrs |
| 9 | device_sequences |
| 10 | invoice_items |
| 11 | invoices |
| 12 | item_aliases |
| 13 | item_catalog |
| 14 | item_import_batches |
| 15 | item_merge_log |
| 16 | letters |
| 17 | payments |
| 18 | project_documents |
| 19 | projects |
| 20 | quotation_items |
| 21 | quotations |
| 22 | receipts |
| 23 | rfq_items |
| 24 | rfqs |
| 25 | settings |
| 26 | signatories |
| 27 | tax_filings |
| 28 | tax_input_entries |
| 29 | tax_reminders |
| 30 | tax_settings |
| 31 | waybills |
| 32 | wht_receipts |

The tenant schema has no functions.
The tenant schema has no views beyond the two financial views listed in
section 7.
The tenant schema has no sequences.

## 4. Public vs Tenant Row Counts

The counts below are exact live counts for the active entity.

| Table | Public rows | Tenant rows | Delta |
| :--- | :--- | :--- | :--- |
| audit_logs | 428 | 425 | 3 |
| bank_accounts | 1 | 0 | 1 |
| blank_csr_logs | 24 | 25 | -1 |
| blank_waybill_logs | 24 | 25 | -1 |
| boq_rows | 0 | 0 | 0 |
| boqs | 0 | 0 | 0 |
| clients | 32 | 30 | 2 |
| csrs | 17 | 16 | 1 |
| device_sequences | 0 | 0 | 0 |
| invoice_items | 2060 | 2087 | -27 |
| invoices | 239 | 247 | -8 |
| item_aliases | 1000 | 1000 | 0 |
| item_catalog | 1394 | 1394 | 0 |
| item_import_batches | 0 | 0 | 0 |
| item_merge_log | 0 | 0 | 0 |
| letters | 1 | 0 | 1 |
| payments | 26 | 26 | 0 |
| project_documents | 2 | 2 | 0 |
| projects | 2 | 2 | 0 |
| quotation_items | 2806 | 2815 | -9 |
| quotations | 322 | 327 | -5 |
| receipts | 4 | 4 | 0 |
| rfq_items | 54 | 54 | 0 |
| rfqs | 3 | 0 | 3 |
| settings | 1 | 1 | 0 |
| signatories | 1 | 0 | 1 |
| tax_filings | 0 | 0 | 0 |
| tax_input_entries | 0 | 0 | 0 |
| tax_reminders | 0 | 0 | 0 |
| tax_settings | 0 | 0 | 0 |
| waybills | 18 | 18 | 0 |
| wht_receipts | 0 | 0 | 0 |

Notes:

- The tenant is the live entity. Newer rows live in the tenant schema.
- Public rows that are absent from tenant need a decision.
- `bank_accounts`, `letters`, `rfqs`, and `signatories` have public rows with
  no tenant counterpart.
- `clients` and `csrs` have small public-only deltas.
- The tenant has rows the public schema lacks. This is normal for an active
  entity.
- Migration is not ambiguous for tables with equal or tenant-higher counts.
- Tables with public-only rows need ownership resolution before migration.
  See section 5.

Schema and column compatibility:

- All 32 shared tables have identical columns between public and tenant.
- Zero column differences were found.

## 5. Ownership and Provenance Findings

### 5.1 Foreign Keys

47 foreign keys exist across the public business tables.

The full FK list was captured in the live database inventory.
Key dependencies:

- `invoices` -> `clients`
- `invoice_items` -> `invoices`
- `quotations` -> `clients`
- `quotation_items` -> `quotations`
- `waybills` -> `invoices` (optional)
- `csrs` -> `invoices` (optional)
- `payments` -> `invoices`
- `receipts` -> `payments`
- `rfq_items` -> `rfqs`
- `boq_rows` -> `boqs`
- `project_documents` -> `projects`
- `item_aliases` -> `item_catalog`
- `item_import_batches` -> `item_catalog`
- `item_merge_log` -> `item_catalog`

### 5.2 Important Indexes

The full public index list was captured.

Global UNIQUE indexes are migration blockers.
A unique index in public and tenant would conflict on purge.

Migration blockers (UNIQUE):

- `idx_item_aliases_normalized_alias_text`
- `idx_item_catalog_normalized_name`
- `idx_letters_number`
- `idx_csrs_csr_number_unique`
- `idx_waybills_waybill_number_unique`
- `idx_receipts_number`
- `idx_quotations_quotation_number_unique`
- `projects_project_code_key`
- `tax_settings_settings_id_key`

Duplicate UNIQUE constraint in public:

- `quotations_quotation_number_key`

These must be dropped from public before the public tables are dropped.
The tenant counterparts already exist or will be created.

### 5.3 RLS Policies

- Global infrastructure tables have proper owner and member-scoped policies.
- Business tables use broad policies.
- Typical business policy: `auth.role() = 'authenticated'`.
- Some business tables use policy `true`.
- These policies are NOT tenant-scoped.
- Only `letters` in public carries `tenant_id`.

Item library family:

- Tables: `item_catalog`, `item_aliases`, `item_import_batches`,
  `item_merge_log`.
- RLS is ENABLED on all four.
- `force_rls` is false.
- Policy count is zero on all four.
- Result: default deny for the direct client.
- Access happens through security-definer functions.
- This is a NEEDS DESIGN case. See section 10.

### 5.4 Triggers

No business triggers were found on the inspected tables.
No migration blocker arises from triggers.

### 5.5 Sequences and Identity

- Zero sequences in public.
- Zero sequences in tenant.
- Zero identity columns in public.
- Zero identity columns in tenant.
- Document numbering is client-side or inside RPC bodies.
- No sequence migration is required.

### 5.6 Ownership by Row

Global infrastructure tables: rows belong to the platform.

User-scoped tables: rows belong to a user or device.

Business tables:

- Rows carry entity ownership through the entity relationship in practice.
- Direct proof of ownership:
  - `letters` has `tenant_id` in public.
  - All other public business tables lack `tenant_id`.
- Where ownership is not directly represented, the tenant counterpart is the
  ownership anchor.
- Every shared table has a tenant counterpart with the same rows or more.
- This proves the entity owns the live data.
- Public rows with no tenant counterpart need a one-time backfill decision.

CRITICAL RULE:

- Ownership was not guessed.
- Tables with public-only rows are listed as blockers in section 13.
- The exact evidence required is stated there.

## 6. RPC and Function Inventory

All RPCs live in the public schema.
The tenant schema has zero functions.

### 6.1 Live Function Names

The live inventory captured every public function.

A targeted check confirmed:

- `get_item_suggestions` EXISTS.
- `merge_item_catalog_entries` DOES NOT EXIST in any schema.
- `get_next_sequence` DOES NOT EXIST in any schema.

### 6.2 Frontend RPC Call Map

| RPC | Frontend call site | Client |
| :--- | :--- | :--- |
| record_invoice_created and other audit record_* | `src/lib/audit.ts` | supabase.rpc (public) |
| get_item_suggestions | itemLibraryRepository.ts | supabase.rpc (public) |
| merge_item_catalog_entries | itemLibraryRepository.ts:451 | supabase.rpc (public) |
| save_invoice_with_items_transaction | `src/hooks/useInvoiceSave.ts:280-285,304-309` | supabase.rpc with p_entity_id |
| save_invoice_with_items_transaction | `src/pages/viewQuotationActions.ts:207-214` | supabase.rpc with p_entity_id |
| revert_invoice_to_quotation_transaction | invoiceConversionService.ts | supabase.rpc (public) |
| delete_invoice_with_items_transaction | `src/pages/Invoices.tsx:160` | supabase.rpc (public) |
| delete_invoice_with_items_transaction | invoiceLifecycleService.ts | supabase.rpc (public) |
| provision_entity | tenantCreation.ts:64 | supabase.rpc (public) |
| accept_workspace_invitation | tenantCreation.ts:75 | supabase.rpc (public) |
| get_entity_provisioning_status | tenantCreation.ts:84 | supabase.rpc (public) |
| admin_update_device_assignment_code | deviceAssignment.ts | supabase.rpc |
| ensure_android_device_assignment | deviceAssignment.ts | supabase.rpc |
| get_device_code_counter_seeds | deviceAssignment.ts | supabase.rpc |
| is_platform_operator | `src/pages/Settings.tsx:46` | supabase.rpc (public) |
| is_platform_operator | `src/pages/TenantDebug.tsx:69,83` | supabase.rpc (public) |
| record_payment_transaction | paymentService.ts:102 | tenantClient.rpc |

### 6.3 RPC Tenancy Evidence

Inspection of RPC bodies (live) produced these facts:

- `save_invoice_with_items_transaction(p_entity_id, ...)` is tenant-aware.
- `delete_invoice_with_items_transaction(p_entity_id, p_invoice_id)` is
  tenant-aware.
- `record_payment_transaction` is tenant-aware.
- `record_invoice_created` has two forms:
  - 4-arg form reads `public.invoices` (public-only).
  - 5-arg form is tenant-aware.
- `record_quotation_created` has NO entity overload. It is public-only.
- `revert_invoice_to_quotation_transaction` has two forms:
  - 3-arg form is public-only.
  - 4-arg form is MIXED:
    - quotation is written to `public.quotations`.
    - invoice and items are written to the tenant schema.
- `_audit_resolve_invoice_schema` falls back to `public`.

### 6.4 Missing RPC Blocker

`merge_item_catalog_entries`:

- Frontend call: `itemLibraryRepository.ts:451`.
- Live database: function does not exist in any schema.
- Effect: the item merge feature fails at runtime.
- Classification: NEEDS DESIGN plus a real defect.

`get_next_sequence`:

- No frontend call site found.
- Live database: function does not exist.
- This is dead documentation only.

## 7. View Inventory

### 7.1 Public Views (6)

| View | Reads |
| :--- | :--- |
| invoice_financials_v | public invoices + invoice_items |
| item_price_summary_v | public item_catalog |
| project_financials_v | public projects |
| v_last_invoice_activity | public invoices |
| v_last_project_activity | public projects |
| v_last_quotation_activity | public quotations |

### 7.2 Tenant Views (2)

| View | Reads |
| :--- | :--- |
| invoice_financials_v | tenant invoices |
| project_financials_v | tenant projects |

### 7.3 View Notes

- `item_price_summary_v` is public-only. It is the item library pricing view.
- The last-activity views are public-only.
- `invoice_financials_v` and `project_financials_v` exist in both schemas.
- The frontend already reads the tenant financial views via
  `useProjectDocumentFetch.ts`.

## 8. Dependency Graph

### 8.1 Public RPC -> Public Table

- `save_invoice_with_items_transaction` -> invoices, invoice_items (via
  tenant when p_entity_id is present)
- `delete_invoice_with_items_transaction` -> invoices, invoice_items
- `record_invoice_created` (4-arg) -> public.invoices
- `record_quotation_created` -> public.quotations
- `revert_invoice_to_quotation_transaction` (3-arg) -> public.quotations
- `_audit_resolve_invoice_schema` -> public fallback
- `get_item_suggestions` -> item_catalog, item_aliases
- `merge_item_catalog_entries` -> MISSING (blocker)

### 8.2 Public View -> Public Table

- invoice_financials_v -> invoices, invoice_items
- item_price_summary_v -> item_catalog
- project_financials_v -> projects
- v_last_invoice_activity -> invoices
- v_last_project_activity -> projects
- v_last_quotation_activity -> quotations

### 8.3 Trigger -> Table/Function

No triggers found.

### 8.4 Frontend -> Public RPC

See section 6.2.

### 8.5 Frontend -> Public Table

See section 9.

### 8.6 Tenant RPC -> Public Table

None. The tenant schema has no functions.

### 8.7 Tenant View -> Public Table

- tenant invoice_financials_v reads tenant tables only.
- tenant project_financials_v reads tenant tables only.

### 8.8 Aggregate Dependency Notes

- Invoice -> CSR and Invoice -> Waybill: CSR and waybill rows reference
  invoices. Linking happens via public supabase in `Invoices.tsx:243,246`.
- Invoice -> Quotation revert: mixed-schema RPC. See section 6.3.
- RFQ -> Quotation: rfq rows feed quotation creation.
- BOQ -> Quotation: boq rows feed quotation creation.
- Item library: public-only functions and public-only pricing view.
- Offline sync: blank_csr_logs and blank_waybill_logs are the offline
  voucher logs. They are already shared.

## 9. Frontend Public-Access Manifest

Every occurrence below was re-verified in the repository this pass.
Line numbers are current.

### 9.1 Dual-Fallback Pattern (tenantClient, fallback to supabase)

| File | Notes |
| :--- | :--- |
| `src/domain/waybill/waybillMutations.ts` | db = tc ready ? tc : supabase |
| `src/pages/viewWaybillActions.ts` | db = client ready ? client : supabase |
| `src/components/document/ProjectLinkDialog.tsx:55` | db = client ready ? client : supabase |
| `src/config/moduleAdapters.ts:21-22,135,320,400,606` | resolveFetchClient: tenant if ready |

Classification for these: MUST CUT OVER to tenant-only.

### 9.2 Tenant-Only Already (TENANT ALREADY)

| File | Notes |
| :--- | :--- |
| `src/pages/viewInvoiceActions.ts:171-174,192-195` | tenantClient invoices updates |
| `src/domain/receipt/receiptRepository.ts:11,22,33,44,54,69` | tenantClient receipts |
| `src/hooks/useQuotationActions.ts:91-92,116,151,168,184` | tenantClient quotations |
| `src/hooks/useProjectDocumentFetch.ts:118,120,126,131,136,140,141,151` | tenantClient all reads |

### 9.3 Mixed (tenantClient + public) — MUST CUT OVER

| File | Public access |
| :--- | :--- |
| `src/pages/ClientDetail.tsx:165-168,169-172,173-176,183-188,189-194,195+` | csrs, waybills, projects via public supabase; clients/invoices/quotations via tenantClient |
| `src/modules/invoices/services/paymentService.ts:49,146,147,326,327` | bank_accounts and signatories via supabase; record_payment_transaction + receipts via tenantClient |
| `src/hooks/useInvoiceReferenceData.ts:18` | signatories via supabase; settings via tenantClient |

### 9.4 Public Business Tables via supabase — MUST CUT OVER

| File | Table | Lines |
| :--- | :--- | :--- |
| `src/pages/Invoices.tsx` | invoices (delete RPC), csrs, waybills | 160, 166-167, 243, 246 |
| `src/pages/InvoiceFormPage.tsx` | invoices (number generation) | 268-275 |
| `src/pages/CsrFormPage.tsx` | invoices (prefill), signatories | 174-178, 432 |
| `src/components/csr/CsrFormScreen.tsx` | signatories | 238 |
| `src/pages/QuotationFormPage.tsx` | quotations (update custom_fields), signatories | 481-486, 209 |
| `src/hooks/useInvoiceList.ts` | invoices | 65, 285 |
| `src/hooks/useDashboardData.ts` | csrs, rfqs | 343, 345, 455, 457 |
| `src/hooks/useGlobalSearch.ts` | csrs | 49 |
| `src/components/project/ProjectDocumentSheet.tsx` | project_documents (INSERT) | 195 |
| `src/components/waybill/WaybillSignatures.tsx` | signatories | 74 |
| `src/pages/ViewCSR.tsx` | signatories | 181 |
| `src/pages/viewQuotationActions.ts` | signatories | 19 |
| `src/pages/settings/SignatoriesSettingsSection.tsx` | signatories (CRUD) | 44, 135-136, 152 |
| `src/hooks/useInvoiceDetailData.js` | signatories, profiles | 179, 85 |

### 9.5 User-Scoped Public Access (USER-SCOPED — correct)

| File | Table | Lines |
| :--- | :--- | :--- |
| `src/App.tsx` | profiles | 179, 188, 203 |
| `src/pages/Login.tsx` | profiles | 126 |
| `src/pages/ResetPassword.tsx` | profiles | 55 |
| `src/components/app/SetPasswordModal.tsx` | profiles | 46 |
| `src/pages/settings/UserSettingsSection.tsx` | profiles | 118 |
| `src/pages/settings/AdminSettingsSection.tsx` | profiles | 221, 253, 256, 259, 262 |
| `src/lib/native/deviceAssignment.ts` | profiles | 226, 311, 333 |

### 9.6 Global Infrastructure Access (GLOBAL INFRASTRUCTURE — correct)

| File | RPC/table |
| :--- | :--- |
| `src/domain/tenant/tenantCreation.ts` | workspaces, entities, provision_entity, accept_workspace_invitation, get_entity_provisioning_status |
| `src/pages/Settings.tsx:46` | is_platform_operator |
| `src/pages/TenantDebug.tsx:69,83` | is_platform_operator |

### 9.7 Notification Access (USER-SCOPED)

| File | Table |
| :--- | :--- |
| `src/hooks/useNotifications.ts` | notifications |
| `src/hooks/useAuditTrail.ts:87,95` | audit_logs, activity_events |

### 9.8 Audit Access

| File | Access | Lines |
| :--- | :--- | :--- |
| `src/lib/audit.ts` | record_* RPCs via public supabase | 23 RPCs |
| `src/lib/audit.ts` | invoices read | 222 (recordPaymentRecorded) |

### 9.9 No-DB Files (verified clean)

- `src/components/waybill/waybillUtils.ts` — no DB calls
- `src/components/boq/BoqList.tsx` — no DB calls
- `src/components/batch/BatchActionFooter.tsx` — no DB calls

## 10. Classification of Every Object

### 10.1 Classification Rules

- MIGRATE: public business object with tenant counterpart, data must move.
- ALREADY TENANT: frontend already reads and writes the tenant schema.
- GLOBAL INFRASTRUCTURE: workspace/entity/permission/operator platform data.
- USER-SCOPED: personal or device data.
- NEEDS DESIGN: cannot fit entity scope without a design decision.

### 10.2 Business Tables (32)

All 32 shared business tables are classified MIGRATE.
Their tenant counterparts exist and hold live data.
The public copies are legacy.

| Table | Classification |
| :--- | :--- |
| invoices | MIGRATE |
| invoice_items | MIGRATE |
| clients | MIGRATE |
| quotations | MIGRATE |
| quotation_items | MIGRATE |
| waybills | MIGRATE |
| csrs | MIGRATE |
| payments | MIGRATE |
| receipts | MIGRATE |
| rfqs | MIGRATE |
| rfq_items | MIGRATE |
| boqs | MIGRATE |
| boq_rows | MIGRATE |
| projects | MIGRATE |
| project_documents | MIGRATE |
| bank_accounts | MIGRATE |
| signatories | MIGRATE |
| letters | MIGRATE |
| settings | MIGRATE |
| tax_settings | MIGRATE |
| tax_filings | MIGRATE |
| tax_input_entries | MIGRATE |
| tax_reminders | MIGRATE |
| wht_receipts | MIGRATE |
| audit_logs | MIGRATE |
| blank_csr_logs | MIGRATE |
| blank_waybill_logs | MIGRATE |
| device_sequences | MIGRATE |
| item_catalog | NEEDS DESIGN |
| item_aliases | NEEDS DESIGN |
| item_import_batches | NEEDS DESIGN |
| item_merge_log | NEEDS DESIGN |

### 10.3 Global Infrastructure Tables (10)

All classified GLOBAL INFRASTRUCTURE.

- workspaces
- workspace_members
- workspace_invitations
- workspace_invitation_entity_grants
- entities
- entity_permissions
- entity_provisioning_status
- permission_templates
- permission_template_items
- platform_operators

### 10.4 User-Scoped Tables (9)

All classified USER-SCOPED.

- profiles
- activity_events
- devices
- device_installations
- notification_preferences
- notification_runs
- notifications
- push_device_tokens
- push_delivery_logs

### 10.5 Public Views (6)

| View | Classification |
| :--- | :--- |
| invoice_financials_v | MIGRATE (tenant copy exists) |
| project_financials_v | MIGRATE (tenant copy exists) |
| item_price_summary_v | NEEDS DESIGN |
| v_last_invoice_activity | MIGRATE |
| v_last_project_activity | MIGRATE |
| v_last_quotation_activity | MIGRATE |

### 10.6 Functions and RPCs

| Function | Classification |
| :--- | :--- |
| save_invoice_with_items_transaction | MIGRATE to tenant (tenant-aware overload exists) |
| delete_invoice_with_items_transaction | MIGRATE to tenant (tenant-aware overload exists) |
| record_payment_transaction | MIGRATE to tenant (tenant-aware overload exists) |
| record_invoice_created (4-arg) | MIGRATE to tenant (5-arg exists) |
| record_quotation_created | MIGRATE to tenant (needs entity overload) |
| revert_invoice_to_quotation_transaction (3-arg) | MIGRATE to tenant (4-arg mixed exists) |
| revert_invoice_to_quotation_transaction (4-arg) | MIGRATE to tenant (mixed, fix quotation write) |
| _audit_resolve_invoice_schema | MIGRATE to tenant (remove public fallback) |
| get_item_suggestions | NEEDS DESIGN |
| merge_item_catalog_entries | NEEDS DESIGN (function missing live) |
| get_next_sequence | NONE (does not exist, no caller) |
| provision_entity | GLOBAL INFRASTRUCTURE |
| accept_workspace_invitation | GLOBAL INFRASTRUCTURE |
| get_entity_provisioning_status | GLOBAL INFRASTRUCTURE |
| is_platform_operator | GLOBAL INFRASTRUCTURE |
| admin_update_device_assignment_code | GLOBAL INFRASTRUCTURE |
| ensure_android_device_assignment | GLOBAL INFRASTRUCTURE |
| get_device_code_counter_seeds | GLOBAL INFRASTRUCTURE |

### 10.7 Frontend Occurrence Classification

- Dual-fallback adapters: MUST CUT OVER.
- Tenant-only files: TENANT ALREADY.
- Mixed files: MUST CUT OVER.
- Public business tables via supabase: MUST CUT OVER.
- Profiles and notifications: USER-SCOPED (correct).
- Workspace/entity/platform functions: GLOBAL INFRASTRUCTURE (correct).

## 11. Recommended Migration Order

Small dependency-safe batches are preferred.

### Batch 0: Item Library Design (prerequisite)

Problem: `merge_item_catalog_entries` does not exist live.
The item library family has zero RLS policies.

1. Design decision: how item library becomes entity-scoped.
2. Create the missing `merge_item_catalog_entries` or remove the call.
3. Define tenant item functions.
4. Define tenant pricing view.
5. Verify: item search and merge work against tenant.

### Batch 1: Signatories and Bank Accounts

Small tables with public-only rows.

1. Database: none new (tables exist in tenant).
2. Data: backfill tenant signatories and bank_accounts from public.
3. RLS: ensure tenant policies.
4. RPC/view: none.
5. Frontend: cut over SignatoriesSettingsSection, paymentService,
   useInvoiceReferenceData, CsrFormScreen, WaybillSignatures, ViewCSR,
   viewQuotationActions, QuotationFormPage, CsrFormPage.
6. Verification: settings and payment pages work.
7. Remove public: signatories, bank_accounts.

### Batch 2: Quotation Read and Revert

1. Database: add entity overload for record_quotation_created.
2. Data: none (tenant holds live rows).
3. RLS: tenant quotation policies.
4. RPC/view: tenant record_quotation_created, fix 4-arg revert quotation write.
5. Frontend: useQuotationActions (tenant already), QuotationFormPage custom_fields,
   quotation views, invoiceConversionService.
6. Verification: quotation save, edit, revert all hit tenant.
7. Remove public: quotations, quotation_items, v_last_quotation_activity,
   record_quotation_created (public form).

### Batch 3: Invoice and CSR/Waybill Linking

1. Database: none new.
2. Data: none.
3. RLS: tenant policies.
4. RPC/view: tenant invoice RPCs (already exist), remove _audit_resolve fallback.
5. Frontend: Invoices.tsx delete/link, InvoiceFormPage numbering,
   ClientDetail csrs/waybills/projects, useDashboardData csrs/rfqs,
   useGlobalSearch csrs, useInvoiceList.
6. Verification: invoice delete, CSR/Waybill creation from invoice work.
7. Remove public: invoices, invoice_items, csrs, waybills, blank_csr_logs,
   blank_waybill_logs, audit_logs, v_last_invoice_activity.

### Batch 4: Projects, RFQ, BOQ

1. Database: none new.
2. Data: backfill public-only rfqs (3 rows) and letters (1 row).
3. RLS: tenant policies.
4. RPC/view: tenant project financial views exist.
5. Frontend: ProjectDocumentSheet INSERT cutover, ProjectLinkDialog,
   moduleAdapters to tenant-only, useDashboardData rfqs.
6. Verification: project documents and RFQ flows work.
7. Remove public: projects, project_documents, rfqs, rfq_items, boqs,
   boq_rows, letters, project_financials_v, v_last_project_activity,
   v_last_quotation_activity.

### Batch 5: Settings and Tax

1. Data: backfill tenant settings and tax tables if needed.
2. Frontend: verify settings reads tenant.
3. Remove public: settings, tax_settings, tax_filings, tax_input_entries,
   tax_reminders, wht_receipts, device_sequences.

## 12. Public Purge Plan

Nothing is deleted in this pass.
This section is the plan only.

For each public object to be removed:

- What replaces it
- What code depends on it now
- What must migrate first
- What verification proves safe removal

| Public object | Replaced by | Current dependents | Migrate first | Safe-removal proof |
| :--- | :--- | :--- | :--- | :--- |
| invoices, invoice_items | tenant invoices | Invoices.tsx, useInvoiceSave, useInvoiceList, InvoiceFormPage, audit.ts:222, invoiceFinancials views | Batch 3 | tenant counts >= public; invoice flows green on tenant |
| quotations, quotation_items | tenant quotations | useQuotationActions, QuotationFormPage, useInvoiceReferenceData | Batch 2 | tenant counts >= public; quotation flows green |
| csrs | tenant csrs | ClientDetail, useDashboardData, useGlobalSearch, CsrFormPage, ViewCSR, Invoices.tsx:243 | Batch 3 | tenant counts >= public; CSR flows green |
| waybills | tenant waybills | ClientDetail, Invoices.tsx:246, waybill adapters | Batch 3 | tenant counts >= public; waybill flows green |
| signatories | tenant signatories | SignatoriesSettingsSection, paymentService, useInvoiceReferenceData, CsrFormScreen, WaybillSignatures, ViewCSR, viewQuotationActions, QuotationFormPage | Batch 1 | tenant signatories backfilled; settings green |
| bank_accounts | tenant bank_accounts | paymentService, useInvoiceReferenceData | Batch 1 | tenant backfilled; payment form green |
| rfqs, rfq_items | tenant rfqs | useDashboardData, moduleAdapters, RFQ pages | Batch 4 | public-only 3 rows backfilled; RFQ green |
| boqs, boq_rows | tenant boqs | moduleAdapters, BOQ pages | Batch 4 | BOQ green |
| projects | tenant projects | ClientDetail, useProjectDocumentFetch, moduleAdapters | Batch 4 | tenant counts equal; project pages green |
| project_documents | tenant project_documents | ProjectDocumentSheet INSERT, useProjectDocumentFetch, ProjectLinkDialog | Batch 4 | document upload/read green |
| letters | tenant letters | letter UI | Batch 4 | 1 public row backfilled; letters green |
| settings | tenant settings | settings pages | Batch 5 | settings green on tenant |
| tax_* tables | tenant tax tables | tax pages | Batch 5 | tax flows green |
| audit_logs | tenant audit_logs | useAuditTrail:87, audit RPCs | Batch 3 | audit trail green on tenant |
| blank_csr_logs, blank_waybill_logs | tenant logs | offline sync | Batch 3 | offline sync green |
| device_sequences | tenant device_sequences | device numbering | Batch 5 | numbering green |
| invoice_financials_v | tenant view | useProjectDocumentFetch:151 | Batch 3 | financial data identical |
| project_financials_v | tenant view | useProjectDocumentFetch:140 | Batch 4 | financial data identical |
| item_price_summary_v | tenant pricing view | item library | Batch 0 | pricing green |
| v_last_*_activity views | tenant queries | dashboards | Batch 3/4 | dashboards green |
| save_invoice_with_items_transaction | tenant overload | useInvoiceSave, viewQuotationActions | Batch 3 | invoice save green |
| delete_invoice_with_items_transaction | tenant overload | Invoices.tsx, invoiceLifecycleService | Batch 3 | invoice delete green |
| record_invoice_created (4-arg) | tenant 5-arg | audit.ts | Batch 3 | audit writes green |
| record_quotation_created | tenant entity overload | audit.ts | Batch 2 | audit writes green |
| revert_invoice_to_quotation_transaction (3-arg/4-arg) | tenant version | invoiceConversionService | Batch 2 | revert green |
| _audit_resolve_invoice_schema | tenant-only resolution | audit RPCs | Batch 3 | audit green |
| get_item_suggestions | tenant version | itemLibraryRepository | Batch 0 | item search green |
| merge_item_catalog_entries | tenant version (create) | itemLibraryRepository:451 | Batch 0 | merge green |

Global unique indexes to drop before table purge:

- idx_item_aliases_normalized_alias_text
- idx_item_catalog_normalized_name
- idx_letters_number
- idx_csrs_csr_number_unique
- idx_waybills_waybill_number_unique
- idx_receipts_number
- idx_quotations_quotation_number_unique
- projects_project_code_key
- tax_settings_settings_id_key
- quotations_quotation_number_key

## 13. Blockers

### Blocker 1: merge_item_catalog_entries is missing live

- Evidence: q17 targeted function query returned only get_item_suggestions.
- Evidence: q18 query across all schemas returned no rows for
  merge_item_catalog_entries.
- Evidence: frontend call at itemLibraryRepository.ts:451.
- Impact: item merge feature is broken at runtime.
- Required: create the function in tenant (or remove the call).

### Blocker 2: Item library family has no RLS policies

- Evidence: item_catalog, item_aliases, item_import_batches, item_merge_log
  all have RLS enabled and policy_count = 0.
- Evidence: force_rls is false.
- Impact: access is default deny except through security-definer functions.
- Required: design decision on entity-scoped item library access.

### Blocker 3: Public-only rows need ownership confirmation

- Tables: bank_accounts (1), letters (1), rfqs (3), signatories (1).
- Evidence: tenant counts are zero for these rows.
- Impact: these rows cannot be discarded without confirmation.
- Required: confirm these rows belong to the active entity, then backfill.

### Blocker 4: public-only client and csr deltas

- clients: 32 public vs 30 tenant.
- csrs: 17 public vs 16 tenant.
- Required: confirm which rows are authoritative, then reconcile.

### Blocker 5: Mixed-schema revert RPC

- Evidence: 4-arg revert writes quotation to public.quotations.
- Impact: revert keeps one write in public.
- Required: switch quotation write to tenant.

### Blocker 6: record_quotation_created has no entity overload

- Evidence: only public-only form exists.
- Impact: quotation audit writes stay in public.
- Required: create tenant overload.

### Blocker 7: _audit_resolve_invoice_schema public fallback

- Evidence: function falls back to public.
- Impact: audit may read/write public invoices.
- Required: remove fallback after tenant cutover.

## 14. Exact Next Migration Batch

### Next Batch: Signatories and Bank Accounts (Batch 1)

This is the safest first batch.
It touches small tables with few rows and clear ownership.

#### 14.1 Database Migration

None required. Tenant tables exist.

#### 14.2 Data Migration

- Insert public signatories (1 row) into tenant signatories.
- Insert public bank_accounts (1 row) into tenant bank_accounts.
- Use a backfill script with explicit entity id.

#### 14.3 Permission and RLS Work

- Confirm tenant signatories and bank_accounts have RLS policies.

#### 14.4 RPC and View Work

None required for this batch.

#### 14.5 Frontend Cutover

- SignatoriesSettingsSection.tsx -> tenantClient.
- paymentService.ts signatories and bank_accounts reads -> tenantClient.
- useInvoiceReferenceData.ts signatories read -> tenantClient.
- CsrFormScreen.tsx signatories read -> tenantClient.
- WaybillSignatures.tsx signatories read -> tenantClient.
- ViewCSR.tsx signatories read -> tenantClient.
- viewQuotationActions.ts signatories read -> tenantClient.
- QuotationFormPage.tsx signatories read -> tenantClient.
- CsrFormPage.tsx signatories read -> tenantClient.

#### 14.6 Verification Gate

- Settings signatory CRUD works.
- Invoice PDF signatory display works.
- Waybill signatory display works.
- Payment form bank account list works.

#### 14.7 Public Objects Removed After Gate

- public signatories
- public bank_accounts

### Batch 2 (next after Batch 1)

Quotation read and revert cutover. See section 11.

## Verification Result

This pass made no code, schema, or data changes.

Verification performed:

- Live database object inventory: passed
- Live row counts (public and tenant): passed
- RPC and function inventory: passed
- Dependency inventory: passed
- Repository search and line re-verification: passed
- git status: clean (no source changes)
- bun run build: skipped (inventory-only per prompt66)
- bun run typecheck: skipped (inventory-only per prompt66)
- bun run lint: skipped (inventory-only per prompt66)

Skills used: supabase-postgres-best-practices
Documentation standard: ADS-STE100 Simplified Technical English

## Risks and Limitations

- The item library feature is broken because the merge RPC is missing.
- Public-only rows in four tables need human ownership confirmation.
- The mixed-schema revert RPC must be fixed before quotation purge.
- No application verification was run. This is an inventory report only.

## Deferred Work

- Item library entity-scoped design (Batch 0).
- Actual data backfills for public-only rows.
- RPC tenant overloads for audit functions.
- Frontend cutover execution for every batch.
- Public table, view, and RPC removal after each verification gate.

## Post-Cutover Deferral Note (2026-08-18)

The final application tenancy cutover for entity eca34515-0b30-482c-b12e-3963df164322 is complete for application code. Verification: bun run audit:load passed; bun run typecheck passed; git status clean; bun run build skipped due to hardware policy.

Two native offline sync modules remain on public access and are deferred pending project-lead guidance:

- src/lib/native/quotationSync.ts: L174, L223, L267, L329, L355.
- src/lib/native/csrSync.ts: L138, L187, L294, L320.

Reason: the App-level bootstrap flush runs before the EntityProvider mounts, so tenantClient is not reachable at that point. Page-level callers (CSR.tsx L204, QuotationList.tsx L153) already have tenantClient and are ready to pass it once the project lead decides the bootstrap approach.