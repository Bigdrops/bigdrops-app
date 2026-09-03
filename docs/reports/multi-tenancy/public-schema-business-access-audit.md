# Public-Schema Business Access Audit Report

This report was written by DeepSeek on 2026-08-17 via Local Runner.

## 1. Objective

The objective of this audit is to identify every business-domain read and write that reaches the public schema in the BIGDROPS frontend codebase.

The audit classifies each site as one of four types:

- MUST TENANT-SCOPE
- INTENTIONALLY PUBLIC
- TEMPORARILY PUBLIC
- UNKNOWN

The audit also traces cross-module tenancy flows. The audit does not change any code.

## 2. Scope

The scope of this audit is:

- All `.from()` and `.rpc()` call sites in `src/`.
- The Supabase public schema.
- The tenant schema `entity_bigdrops-main_main`.
- The `TenantClient` abstraction.
- The database views and RPC functions used by the frontend.
- The classification of every business-domain access site.

The scope excludes:

- Storage buckets (`supabase.storage.from(...)`).
- Auth-only tables (`profiles`, `device_installations`).
- LocalStorage-based storage (`src/domain/boq/storage.ts`).
- Files with no database access.

## 3. Background

The product uses one Supabase project with one public schema. The multi-tenancy migration copies business tables into per-entity schemas. It never drops the public copies.

`TenantClient` (`src/lib/tenantClient.ts`) is the tenant-schema wrapper. Its `from` method calls `client.schema(schemaName).from(table)`. Its `rpc` method passes schema options but has never been tested against a schema-bound RPC. `TenantClient` is the only place in `src/` that calls `.schema(`.

This means every `supabase.from('business_table')` reads and writes the public copy of that table. Every `supabase.rpc('...')` calls the public-schema function.

## 4. Decisive Database Facts

The live database query returned these facts.

### 4.1 Table and View Placement

The following tables exist in BOTH the public schema and the tenant schema:

- `bank_accounts`, `blank_csr_logs`, `blank_waybill_logs`, `clients`, `device_sequences`
- `item_aliases`, `item_catalog`, `item_import_batches`, `item_merge_log`
- `letters`, `payments`, `receipts`, `settings`, `signatories`
- `tax_filings`, `tax_input_entries`, `tax_reminders`, `tax_settings`

The following tables exist ONLY in the public schema:

- `activity_events`, `device_installations`, `notification_preferences`, `notifications`
- `push_device_tokens`, `push_delivery_logs`

The following views exist in BOTH schemas:

- `invoice_financials_v`, `project_financials_v`

The following view exists ONLY in the public schema:

- `item_price_summary_v`

The `audit_logs` table exists in BOTH schemas. It is confirmed by this query.

The query did not cover every tenant-schema table. Earlier investigation established that the tenant schema also holds `invoices`, `invoice_items`, `quotations`, `quotation_items`, `waybills`, `csrs`, `rfqs`, `rfq_items`, `boqs`, `boq_rows`, `projects`, `project_documents`, `wht_receipts`, and related tables.

### 4.2 RPC Placement

The following business RPCs exist ONLY in the public schema:

- `save_invoice_with_items_transaction(p_entity_id, p_invoice_payload, p_items, p_mode)`
- `revert_invoice_to_quotation_transaction(p_invoice_id, p_quotation_payload, p_quotation_items_payload[, p_entity_id])`
- `delete_invoice_with_items_transaction(p_entity_id, p_invoice_id)`
- `merge_item_catalog_entries` (signature not returned by this query)
- `get_item_suggestions(search_text, result_limit)`
- `get_next_sequence` (signature not returned by this query)
- `is_platform_operator(p_user_id, p_required_role)`
- `record_activity_event(...)`
- `record_audit_log(...)`
- `record_invoice_created(p_invoice_id, p_actor_id, p_actor_label, p_source[, p_entity_id])`
- `record_quotation_created(p_quotation_id, p_actor_id, p_actor_label, p_source)`

The transaction RPCs (`save_invoice_with_items_transaction`, `revert_invoice_to_quotation_transaction`, `delete_invoice_with_items_transaction`) accept a `p_entity_id` argument. They run on the public schema. It is not confirmed from the frontend whether they internally route writes to the tenant schema via the entity id.

### 4.3 tenant_id and RLS

Only ONE public business table carries a `tenant_id` column:

- `letters`

No other public business table has a `tenant_id` column.

RLS is enabled on the queried public tables. The policies are broad authenticated-user policies, not tenant-scoped. Example policy names:

- `boqs_delete_own`, `clients` (approved users only), `csrs` (Allow authenticated read)
- `invoices` (Allow authenticated read), `quotations` (authenticated quotations read)
- `waybills_authenticated_all`, `rfqs_authenticated_delete`
- `bank_accounts_authenticated_delete`, `signatories_authenticated_delete`
- `letters_authenticated_delete`, `payments_authenticated_delete`
- `tax_filings` (auth_delete_tax_filings)
- `notifications` (System can insert)
- `notification_preferences` (delete own)
- `audit_logs` (Team members can view all audit logs)
- `activity_events` (Authenticated users can read activity events)

This means the public tables are protected only by authenticated-user RLS. They are NOT tenant-isolated. The `letters` table has a `tenant_id` column, but its RLS policy is `letters_authenticated_delete`, not a tenant-id check.

The audit query for `item_catalog` RLS returned a NULL policy name. This means the query could not retrieve a policy name for that table. The RLS status of `item_catalog` is not confirmed.

## 5. Wiring Patterns

The frontend uses three access patterns:

### 5.1 Tenant-wired with silent public fallback

The code selects the tenant client when it is ready, and falls back to the public client otherwise.

Example: `src/domain/waybill/waybillMutations.ts:20`

```ts
const db = tc?.isReady ? tc : supabase
```

Classification impact: the site is tenant-wired, but a silent public fallback exists when `isReady` is false.

### 5.2 Caller-injected TenantClient

The repository function requires a `TenantClient` argument. There is no fallback.

Examples:

- `src/modules/invoices/repositories/paymentRepository.ts`
- `src/modules/compliance/repositories/complianceRepository.ts` (wht_receipts functions only)
- `src/domain/receipt/receiptRepository.ts`

### 5.3 Direct public `supabase`

The code imports `supabase` from `@/supabase` and calls `.from()` or `.rpc()` directly. This always reaches the public schema.

## 6. Findings: Components

| File | Line | DB Object | Operation | Client | Classification | Reason |
|------|------|-----------|-----------|--------|----------------|--------|
| src/components/csr/CsrFormScreen.tsx | 238 | signatories | select | supabase | TEMPORARILY PUBLIC | signatories has a tenant copy; component not yet migrated |
| src/components/waybill/waybillUtils.ts | 561, 599 | none | none | none | NONE | pure column-map utility; no database access |

The remaining component leads (BatchActionFooter, ClientSelector, ColumnManager, AndroidBackHandler, ProjectLinkDialog x2, AttachExistingDocumentSheet) have no direct `.from()` or `.rpc()` calls.

## 7. Findings: Hooks

| File | Line | DB Object | Operation | Client | Classification | Reason |
|------|------|-----------|-----------|--------|----------------|--------|
| src/hooks/useGlobalSearch.ts | 49 | csrs | select | supabase | MUST TENANT-SCOPE | csrs has a tenant copy; sibling tables in this hook already use tenantClient |
| src/hooks/useGlobalSearch.ts | 45-48, 50 | clients, projects, invoices, quotations, waybills | select | tenantClient | TENANT | fully tenant-wired |
| src/hooks/useInvoiceReferenceData.ts | 18 | signatories | select | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/hooks/useInvoiceReferenceData.ts | 19 | bank_accounts | select | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/hooks/useInvoiceReferenceData.ts | 20 | settings | select | tenantClient | TENANT | fully tenant-wired |
| src/hooks/useInvoiceHydration.ts | 70, 110 | invoices, invoice_items | select | tenantClient | TENANT | fully tenant-wired |
| src/hooks/useInvoiceDetailData.js | 85 | profiles | select | supabase | INTENTIONALLY PUBLIC | auth profile, not business data |
| src/hooks/useInvoiceDetailData.js | 104, 110 | payments | select | tenantClient | TENANT | fully tenant-wired |
| src/hooks/useInvoiceDetailData.js | 132 | invoice_financials_v | select | tenantClient | TENANT | fully tenant-wired |
| src/hooks/useInvoiceDetailData.js | 144 | invoice_items | select | tenantClient | TENANT | fully tenant-wired |
| src/hooks/useInvoiceDetailData.js | 178-179 | signatories | select | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/hooks/useInvoiceDetailData.js | 186-187 | bank_accounts | select | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/hooks/useInvoiceDetailData.js | 195 | settings | select | tenantClient | TENANT | fully tenant-wired |
| src/hooks/useDashboardData.ts | 343, 455 | csrs | select | supabase | MUST TENANT-SCOPE | csrs has a tenant copy; siblings in same Promise.all use tenantClient |
| src/hooks/useDashboardData.ts | 345, 457 | rfqs | select | supabase | MUST TENANT-SCOPE | rfqs has a tenant copy; siblings in same Promise.all use tenantClient |
| src/hooks/useDashboardData.ts | 336, 342, 344, 346, 347, 448, 454, 456, 458, 459 | quotations, waybills, invoice_financials_v, projects | select | tenantClient | TENANT | fully tenant-wired |
| src/hooks/useDashboardData.ts | 8 | boq storage | read | localStorage | NONE | localStorage, not database |
| src/hooks/useNotifications.ts | 61, 92, 120 | notifications | select, update | supabase | INTENTIONALLY PUBLIC | user-scoped push inbox; no tenant copy exists |
| src/hooks/useNotificationPreferences.ts | 38, 89, 100 | notification_preferences | select, upsert, delete | supabase | INTENTIONALLY PUBLIC | user-scoped preferences; no tenant copy exists |
| src/hooks/useAuditTrail.ts | 87, 95 | audit_logs, activity_events | select | supabase | INTENTIONALLY PUBLIC | audit trail reads via public audit RPC layer |
| src/hooks/useInvoiceSave.ts | 280, 304 | save_invoice_with_items_transaction | rpc | supabase | UNKNOWN | RPC is entity-scoped; must verify internal tenant routing |
| src/hooks/useQuotationActions.ts | 92 | quotations | update | tenantClient | TENANT | fully tenant-wired |
| src/hooks/useSettings.js | 117, 204 | settings | read, write | tenantClient | TENANT | fully tenant-wired; public.settings no longer written |
| src/hooks/useSettings.js | 273, 279 | storage bucket | upload, url | supabase.storage | INTENTIONALLY PUBLIC | storage, not business table |
| src/hooks/useLetterSave.ts | (via repo) | letters | CRUD | letterRepository | see repository row | routes through letterRepository |

The hooks `useItemSuggestionEngine`, `useItemMerge`, `useItemAliases`, `useItemHistoryList` route through `../services` to `itemLibraryService` (pure domain logic) to the repositories. They contain no direct supabase calls.

## 8. Findings: Pages

| File | Line | DB Object | Operation | Client | Classification | Reason |
|------|------|-----------|-----------|--------|----------------|--------|
| src/pages/AddClient.tsx | 16 | clients | insert | supabase | MUST TENANT-SCOPE | clients has a tenant copy |
| src/pages/EditClient.tsx | 20, 48 | clients | select, update | supabase | MUST TENANT-SCOPE | clients has a tenant copy |
| src/pages/NewRfq.tsx | 23, 30, 33, 52 | rfqs, rfq_items | CRUD | supabase | MUST TENANT-SCOPE | rfqs and rfq_items have tenant copies |
| src/pages/EditRfq.tsx | 23, 24, 56, 70 | rfqs, rfq_items | CRUD | supabase | MUST TENANT-SCOPE | rfqs and rfq_items have tenant copies |
| src/pages/CsrFormPage.tsx | 203, 470 | csrs | select | supabase | MUST TENANT-SCOPE | csrs has a tenant copy |
| src/pages/CsrFormPage.tsx | 311 | blank_csr_logs | insert | supabase | MUST TENANT-SCOPE | blank_csr_logs has a tenant copy |
| src/pages/ComplianceHub.tsx | 175 | tax_input_entries | select | supabase | MUST TENANT-SCOPE | tax_input_entries has a tenant copy |
| src/pages/ComplianceHub.tsx | 197 | tax_filings | select | supabase | MUST TENANT-SCOPE | tax_filings has a tenant copy |
| src/pages/ComplianceHub.tsx | 208 | tax_reminders | select | supabase | MUST TENANT-SCOPE | tax_reminders has a tenant copy |
| src/pages/ViewBoq.tsx | 59, 60 | boqs, boq_items | select | supabase | MUST TENANT-SCOPE | boqs and boq_items have tenant copies |
| src/pages/viewBOQActions.ts | 6-38 | boqs, boq_items | CRUD | supabase | MUST TENANT-SCOPE | boqs and boq_items have tenant copies |
| src/pages/Invoices.tsx | 160 | delete_invoice_with_items_transaction | rpc | supabase | UNKNOWN | RPC is entity-scoped; must verify internal tenant routing |
| src/pages/Invoices.tsx | 243, 246 | csrs, waybills | update | supabase | MUST TENANT-SCOPE | page bypasses invoiceChildDocService and writes public csrs/waybills directly |
| src/pages/ViewCSR.tsx | 172 | csrs | select | supabase | MUST TENANT-SCOPE | csrs has a tenant copy |
| src/pages/ViewCSR.tsx | 181 | signatories | select | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/pages/ViewCSR.tsx | 186 | clients | select | tenantClient | TENANT | fully tenant-wired |
| src/pages/viewCSRActions.ts | 5-64 | csrs | CRUD, duplicate | supabase | MUST TENANT-SCOPE | csrs has a tenant copy |
| src/pages/viewRFQActions.ts | 6-38 | rfqs, rfq_items | CRUD, duplicate | supabase | MUST TENANT-SCOPE | rfqs and rfq_items have tenant copies |
| src/pages/viewRFQActions.ts | 61, 94 | quotations | select, insert | tenantClient | TENANT | RFQ-to-quotation conversion writes tenant quotations |
| src/pages/viewQuotationActions.ts | 15, 52, 162, 163, 218, 243, 262, 281, 286, 291, 292, 298 | quotations, clients, invoices | CRUD, convert | tenantClient | TENANT | fully tenant-wired |
| src/pages/viewQuotationActions.ts | 18 | bank_accounts | select | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/pages/viewQuotationActions.ts | 19 | signatories | select | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/pages/QuotationFormPage.tsx | 209 | signatories | select | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/pages/QuotationFormPage.tsx | 210 | bank_accounts | select | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/pages/QuotationFormPage.tsx | 211, 220, 221, 357 | settings, quotations, quotation_items | select, insert | tenantClient | TENANT | fully tenant-wired |
| src/pages/ProjectDetail.tsx | 109, 237, 264 | projects, project_documents | select, delete | tenantClient | TENANT | fully tenant-wired |
| src/pages/ProjectDetail.tsx | 215, 219 | invoices, csrs, quotations, waybills | select, update | supabase | MUST TENANT-SCOPE | project-linking writes public tables directly; search (151-155) uses tenantClient but the write uses public |
| src/pages/settings/ArchivesSettingsSection.tsx | 90-92 | invoices, quotations, projects | select | tenantClient | TENANT | fully tenant-wired |
| src/pages/settings/ArchivesSettingsSection.tsx | 93-96 | rfqs, csrs, waybills, boqs | select | supabase | MUST TENANT-SCOPE | rfqs, csrs, waybills, boqs have tenant copies |
| src/pages/settings/BankingSettingsSection.tsx | 50-176 | bank_accounts | CRUD | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/pages/settings/SignatoriesSettingsSection.tsx | 44-152 | signatories | CRUD | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/pages/settings/AdminSettingsSection.tsx | 221-263 | profiles, device_installations | CRUD | supabase | INTENTIONALLY PUBLIC | auth and device admin; no tenant copies exist |
| src/pages/settings/UserSettingsSection.tsx | 118 | profiles | update | supabase | INTENTIONALLY PUBLIC | auth profile |
| src/pages/App.tsx | 179, 203 | profiles | select, update | supabase | INTENTIONALLY PUBLIC | auth profile |
| src/pages/Login.tsx | 126 | profiles | upsert | supabase | INTENTIONALLY PUBLIC | auth profile |
| src/pages/ResetPassword.tsx | 55 | profiles | update | supabase | INTENTIONALLY PUBLIC | auth profile |
| src/pages/Settings.tsx | 46 | is_platform_operator | rpc | supabase | INTENTIONALLY PUBLIC | platform-operator check |
| src/pages/TenantDebug.tsx | 69, 83 | is_platform_operator, role rpcs | rpc | supabase | INTENTIONALLY PUBLIC | tenant admin debug |

## 9. Findings: Domain Layer

| File | Line | DB Object | Operation | Client | Classification | Reason |
|------|------|-----------|-----------|--------|----------------|--------|
| src/domain/correspondence/letter/letterRepository.ts | 13-14, 31-32, 49-50, 65-66, 79-80, 92-93 | letters | CRUD | supabase | TEMPORARILY PUBLIC | letters has a tenant copy AND a public tenant_id column; repository filters by tenant_id in queries |
| src/domain/notifications/sendPushForNotification.ts | 24-25 | push_device_tokens | select | supabase | INTENTIONALLY PUBLIC | device push tokens; no tenant copy exists |
| src/domain/notifications/sendPushForNotification.ts | 56 | push_delivery_logs | insert | supabase | INTENTIONALLY PUBLIC | delivery log; no tenant copy exists |
| src/domain/csr/csrService.ts | multiple | csrs | CRUD | supabase | MUST TENANT-SCOPE | all-public CRUD service |
| src/domain/rfq/rfqService.ts | multiple | rfqs | CRUD | supabase | MUST TENANT-SCOPE | all-public CRUD service |
| src/domain/waybill/waybillMutations.ts | 20 | waybills | CRUD | tenantClient with public fallback | TENANT (fallback) | `db = tc?.isReady ? tc : supabase` |
| src/domain/boq/storage.ts | multiple | boq documents | read/write | localStorage | NONE | localStorage `boq_documents_v1`, not database |
| src/domain/receipt/receiptRepository.ts | multiple | receipts | CRUD | tenantClient | TENANT | caller-injected TenantClient |
| src/lib/audit.ts | multiple | record_* RPCs | rpc | supabase | INTENTIONALLY PUBLIC | audit RPC layer; 17+ record RPCs |

## 10. Findings: Modules

| File | Line | DB Object | Operation | Client | Classification | Reason |
|------|------|-----------|-----------|--------|----------------|--------|
| src/modules/invoices/services/invoiceLifecycleService.ts | 74 | delete_invoice_with_items_transaction | rpc | supabase | UNKNOWN | RPC is entity-scoped; must verify internal tenant routing |
| src/modules/invoices/services/invoiceConversionService.ts | 82 | revert_invoice_to_quotation_transaction | rpc | supabase | UNKNOWN | RPC is entity-scoped; must verify internal tenant routing |
| src/modules/invoices/services/invoiceAdvanceService.ts | 62-69 | advance-invoice | rpc | supabase | UNKNOWN | RPC is entity-scoped; must verify internal tenant routing |
| src/modules/invoices/services/invoiceChildDocService.ts | (re-export) | csrs, waybills | link | supabase | MUST TENANT-SCOPE | re-exports linkCsrToInvoice and linkWaybillToInvoice from invoiceChildDocRepository (public) |
| src/modules/invoices/repositories/invoiceChildDocRepository.ts | multiple | csrs, waybills | link | supabase | MUST TENANT-SCOPE | links public csrs/waybills to invoice |
| src/modules/invoices/repositories/paymentRepository.ts | 36, 49, 62 | payments, invoice_financials_v, invoices | CRUD | tenantClient | TENANT | caller-injected TenantClient |
| src/modules/invoices/repositories/paymentRepository.ts | 88-92 | bank_accounts | select | supabase | TEMPORARILY PUBLIC | documented: not part of Phase 3 invoice aggregate |
| src/modules/invoices/services/paymentService.ts | 48-49, 146, 326 | bank_accounts | select | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/modules/invoices/services/paymentService.ts | 147, 327 | signatories | select | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/modules/invoices/services/paymentService.ts | 143-145, 175, 187, 190, 323-325, 355, 367, 370 | invoices, clients, settings, receipts | CRUD | tenantClient | TENANT | fully tenant-wired |
| src/modules/compliance/repositories/complianceRepository.ts | 10-29 | wht_receipts | CRUD | tenantClient | TENANT | caller-injected TenantClient |
| src/modules/compliance/repositories/complianceRepository.ts | 34-103 | tax_input_entries, tax_filings, tax_reminders, tax_settings | CRUD | supabase | MUST TENANT-SCOPE | all four have tenant copies |
| src/modules/compliance/services/complianceService.ts | 96-97, 104-105 | wht_receipts, invoices | select | tenantClient | TENANT | tenant-wired |
| src/modules/compliance/services/complianceService.ts | 201 | dynamic table | insert | tenantClient if wht_receipt, else supabase | MIXED | `const client = type === 'wht_receipt' && tenantClient ? tenantClient : supabase` |
| src/modules/compliance/services/complianceService.ts | 78, 80 | storage bucket compliance | upload, url | supabase.storage | INTENTIONALLY PUBLIC | storage |
| src/modules/reports/repositories/reportRepository.ts | 13 | invoice_financials_v | select | tenantClient | TENANT | fully tenant-wired |
| src/modules/reports/repositories/reportRepository.ts | 29 | project_financials_v | select | supabase | MUST TENANT-SCOPE | view has a tenant copy |
| src/modules/reports/repositories/reportRepository.ts | 38 | invoices | select | tenantClient | TENANT | fully tenant-wired |
| src/modules/reports/repositories/reportRepository.ts | 50 | payments | select | tenantClient | TENANT | fully tenant-wired |
| src/modules/reports/repositories/reportRepository.ts | 62 | bank_accounts | select | supabase | TEMPORARILY PUBLIC | reference data phase pending |
| src/modules/item-library/repositories/itemLibraryRepository.ts | multiple | item_catalog, item_aliases, item_import_batches, item_merge_log, item_price_summary_v | CRUD | supabase | MUST TENANT-SCOPE | item_catalog and aliases have tenant copies; item_price_summary_v does NOT |

## 11. Cross-Module Tenancy Flow Trace

### 11.1 Quotation to Invoice conversion

- `viewQuotationActions.ts` writes tenant quotations and tenant invoices.
- `useInvoiceSave.ts` calls the public RPC `save_invoice_with_items_transaction` with `p_entity_id`.
- Status: RPC-routed. The RPC may internally write the tenant schema. This must be verified in the database.

### 11.2 Invoice to Quotation revert

- `invoiceConversionService.ts:82` calls the public RPC `revert_invoice_to_quotation_transaction` with `p_entity_id`.
- Status: RPC-routed. Must be verified.

### 11.3 Invoice deletion

- `invoiceLifecycleService.ts:74` calls the public RPC `delete_invoice_with_items_transaction` with `p_entity_id`.
- `Invoices.tsx:160` calls the same RPC directly from the page.
- Status: RPC-routed. Must be verified.

### 11.4 RFQ to Quotation conversion

- `viewRFQActions.ts:61,94` writes tenant quotations.
- The RFQ source data is read from public rfqs.
- Status: split-client. RFQ reads public, quotation writes tenant.

### 11.5 BOQ to Quotation conversion

- `ViewBoq.tsx` and `viewBOQActions.ts` read and write public boqs and boq_items.
- Status: fully public. Boq domain storage (`src/domain/boq/storage.ts`) is localStorage and does not participate.

### 11.6 Project document linking

- `ProjectDetail.tsx:151-155` searches tenant invoices, csrs, quotations, waybills.
- `ProjectDetail.tsx:215,219` links the same tables via public supabase.
- Status: split-client. Search uses tenant, write uses public.

### 11.7 Waybill to Invoice link

- `invoiceChildDocRepository.ts` links public waybills to invoices.
- `Invoices.tsx:243,246` links public csrs and waybills directly.
- `waybillMutations.ts` writes waybills through tenantClient with public fallback.
- Status: inconsistent. Waybill writes are tenant-wired, but the invoice-page link and the repository link use public.

### 11.8 Offline sync

- `deviceHydration.ts` and `offlineAccess.ts` contain no `.from()` or `.rpc()` calls.
- Status: no database access.

### 11.9 Document numbering

- `device_sequences` has a tenant copy.
- `get_next_sequence` is a public RPC (signature not queried).
- Status: RPC-routed. Must be verified.

### 11.10 Audit and activity

- `src/lib/audit.ts` records all audit events through public `record_*` RPCs.
- `useAuditTrail.ts` reads public `audit_logs` and `activity_events`.
- Status: RPC-write, public-read. The audit_logs table has a tenant copy, but the frontend never writes it via TenantClient.

### 11.11 Dashboard aggregates

- `useDashboardData.ts` mixes tenant (quotations, waybills, invoice_financials_v, projects) and public (csrs, rfqs) in the same Promise.all.
- Status: mixed.

### 11.12 Global search

- `useGlobalSearch.ts` mixes tenant (clients, projects, invoices, quotations, waybills) and public (csrs).
- Status: mixed.

### 11.13 Financial views

- `invoice_financials_v` and `project_financials_v` have tenant copies and are read via tenantClient.
- `item_price_summary_v` has NO tenant copy and is read via supabase in itemLibraryRepository.
- Status: mixed. The item price summary view needs a tenant copy or an alternative.

## 12. Classification Summary

| Classification | Count (approximate) | Notes |
|----------------|---------------------|-------|
| MUST TENANT-SCOPE | 25+ sites | csrs, rfqs, boqs, clients, tax_* tables, blank_*_logs, project linking writes, item library, public financial view |
| TEMPORARILY PUBLIC | 15+ sites | signatories and bank_accounts reference data, letters tenant_id repository |
| INTENTIONALLY PUBLIC | 15+ sites | profiles, notifications, notification_preferences, push tables, audit RPCs, storage |
| UNKNOWN | 5+ sites | public transaction RPCs; must verify internal tenant routing |
| TENANT | 40+ sites | fully tenant-wired |

## 13. Completion Verification

### 13.1 Files Changed

- No source files changed.
- No migration files changed.
- No configuration files changed.
- This report created: `docs/Reports/multi-tenancy/public-schema-business-access-audit.md`
- Temporary query files written to the opencode temp directory only.

### 13.2 Commands Used

- `rg` for all `.from()`, `.rpc()`, `supabase`, `tenantClient` call sites in `src/`.
- `Get-ChildItem` for module and directory structure.
- `Read` for call-site context.
- `bunx supabase db query --linked` for table, view, RPC, tenant_id, and RLS facts.
- `git status --short` and `git log --oneline -1` for repository state.

### 13.3 Audit Result

The audit is complete for the codebase. The database facts were verified against the live linked project.

Three items require a follow-up database inspection before final classification:

1. Whether `save_invoice_with_items_transaction`, `revert_invoice_to_quotation_transaction`, and `delete_invoice_with_items_transaction` internally route writes to the tenant schema via `p_entity_id`.
2. Whether `get_next_sequence` internally routes to the tenant schema.
3. Whether `item_price_summary_v` needs a tenant copy, and whether `item_catalog` has RLS.

These items are marked UNKNOWN in this report.

### 13.4 Pre-existing Warnings

- `paymentRepository.ts:88-92` documents that `bank_accounts` stays public until its own migration phase.
- `complianceRepository.ts:8` documents that `tax_*` tables are not part of the invoice aggregate and remain on the public client.
- `reportRepository.ts` comments state invoices, payments, and invoice_financials_v are Phase 3 aggregate and tenant.

### 13.5 Unresolved Ownership Questions

- Who owns the transaction RPC functions (`save_invoice_*`, `revert_*`, `delete_*`)?
- Who owns the tenant-schema copies of csrs, rfqs, boqs, clients, and tax tables?
- Is the RFQ and BOQ migration part of a separate phase?
- When do signatories and bank_accounts migrate?

### 13.6 Git Status

- `git status --short`: clean.
- `git log --oneline -1`: `82cfaa76 ✨ feat(invoice-templates): glass + neon variants`

### 13.7 Git Diff Stat

- No diff. No source files were changed.

### 13.8 Build Status

- `bun run build` was not run due to hardware policy.

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English
