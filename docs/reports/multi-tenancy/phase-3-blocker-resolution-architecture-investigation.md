# Phase 3 Blocker Resolution & Architecture Investigation

This report was written by Buffy on 2026-08-09 via Freebuff.

Read-only investigation. No code, migration, RPC, schema, or data was modified.

The previous Phase 3 inventory (`phase-3-invoice-write-path-inventory.md`) is
treated as an advisory hypothesis set. Every claim was re-verified directly
against the repository. Repository evidence wins where they disagree; every
discrepancy is reported in Section J.

---

## A. Provisioning Completeness

### A.1 Template table list — CONFIRMED

`_prov_get_template_tables()` (20260717000000_entity_provisioning_engine.sql:35-46)
returns exactly:

```
clients, settings, signatories, bank_accounts, projects, quotations, invoices,
payments, csrs, waybills, tax_settings, receipts, letters, boqs, rfqs
```

The **live production dump** (`live-public-schema.sql:161-171`) contains the
identical list. Both sources agree.

### A.2 Objects absent from provisioning

| Object | In template list? | Verified | Requirement class |
|---|---|---|---|
| invoices | YES | migration + live dump | invoice CRUD |
| payments | YES | migration + live dump | invoice CRUD / financial |
| receipts | YES | migration + live dump | invoice financial (receipts) |
| invoice_items | **NO** | migration + live dump | **invoice CRUD (items)** |
| wht_receipts | **NO** | migration + live dump | invoice financial (WHT) |
| activity_events | **NO** | migration + live dump | invoice history/audit |
| audit_logs | **NO** | migration + live dump | invoice history/audit |
| invoice_financials_v + other views | **NO** | migration + live dump | invoice financial computation |
| item_catalog | **NO** | migration + live dump | shared/global — intentionally public |
| bank_accounts | YES | migration + live dump | invoice financial (payment) |
| signatories | YES | migration + live dump | invoice PDF |

### A.3 invoice_items dependency analysis

Schema (`20260520090003_invoices.sql:48-73`):

- Columns: `id uuid PK default gen_random_uuid()`, `description NOT NULL`,
  `quantity`, `unit_price`, `amount`, `vat_rate`, `sort_order`, `row_type`,
  `group_name`, `invoice_id uuid default gen_random_uuid()`, `item_id uuid`,
  `custom_data jsonb default '{}'`, `discount_rate`, `install_rate_*`,
  `group_id`, `updated_at`.
- **Foreign keys on invoice_items** (from migrations):
  - `invoice_items_item_id_fkey` — `invoice_items(item_id) REFERENCES
    item_catalog(id)` (20260520090005_items_catalog.sql:89).
  - There is **no FK from invoice_items to invoices** in any migration.
- **item_catalog** is shared/global and is NOT provisioned into tenant schemas.
  The provisioning FK re-add logic (`_prov_readd_foreign_keys`) only re-adds a
  FK when the referenced table exists in the target schema (line ~120-126). If
  `invoice_items` were added to the template, its `item_id` FK would be dropped
  at clone time and **not re-added** (item_catalog stays public), leaving a
  cross-schema FK-less link — the same pattern the engine already accepts for
  `invoices.project_id` → public `projects`.
- `invoice_id` on invoice_items has no FK, so no tenant-local FK dependency
  exists for the parent link either.
- **Classification: CONFIRMED BLOCKER** for any Phase 3 path that writes
  `invoice_items` into the tenant schema (save flow, conversion flow, delete
  flow). The table simply does not exist there.

### A.4 _prov_table_to_resource() mapping

From `_prov_table_to_resource()` (20260717000000:49-72):
invoices→invoice, payments→payment, receipts→receipt, csrs→csr, waybills→waybill,
quotations→quotation, projects→project, clients→client, settings→setting,
signatories→signatory, bank_accounts→bank_account, tax_settings→tax_setting,
letters→letter, boqs→boq, rfqs→rfq. Fallback: table name itself.

- Every **currently provisioned** invoice-related table has a mapping.
- If `invoice_items` were added, the fallback would produce resource
  `'invoice_items'` (no explicit case). Tenant RLS would then require
  `invoice_items/view`, `invoice_items/create`, etc. rows — a different
  resource namespace than `invoice`. **ARCHITECTURAL DECISION REQUIRED**:
  resource mapping for a future `invoice_items` table (map to `invoice` vs
  dedicated resource).
- `wht_receipts` fallback → `'wht_receipts'` (same consideration).

### A.5 _prov_install_rls() and installed policies

`_prov_install_rls()` (20260717000000:322-355) installs per cloned table:

- `{table}_select` FOR SELECT TO public — `has_entity_permission(...,'view')`
- `{table}_insert` FOR INSERT TO authenticated — `'create'`
- `{table}_update` FOR UPDATE TO authenticated — `'edit'`
- `{table}_delete` FOR DELETE TO authenticated — `'delete'`

Action vocabulary used by the engine: `view`, `create`, `edit`, `delete`
(confirmed lines 331/338/345/352). Tenant invoice writes therefore require
entity_permissions rows of exactly these resource/action pairs (Section H).

### A.6 Invoice triggers

Public `invoices` triggers (20260520090003_invoices.sql:196-197):

- `trg_invoices_set_updated_at` — BEFORE UPDATE, `set_row_updated_at()`
  (core_tables.sql:31-39): sets `new.updated_at = now()`.
- `trg_invoices_stamp_ownership` — BEFORE INSERT OR UPDATE,
  `stamp_row_ownership()` (core_tables.sql:41-64): sets `created_by` on INSERT
  and `updated_by` on INSERT/UPDATE from `auth.uid()` (SECURITY DEFINER,
  search_path public).

Provisioning clone implementation (`_prov_clone_table`, lines 179-199):
`CREATE TABLE ... (LIKE ... INCLUDING ALL)` — **triggers are not copied by
LIKE**. Verified: no trigger creation exists anywhere in the provisioning
pipeline. Therefore tenant `invoices` tables lack both triggers.

Live dump cross-check: the dump contains the public-schema triggers
(`trg_invoices_set_updated_at` at 4435, `trg_invoices_stamp_ownership` at 4439)
but **no tenant-schema triggers** (dump contains no `entity_bigdrops-*` schema
at all — see D.1).

- **Classification: CONFIRMED BLOCKER (data parity).** If tenant invoice
  writes become authoritative without these triggers, `updated_at` will not
  auto-maintain and `created_by`/`updated_by` will remain null on tenant rows —
  incomplete data compared to public behavior.

### A.7 payments and other required tables

- `payments` is provisioned. FKs: `payments_invoice_id_fkey` →
  invoices(id) (20260520090003:152) — re-added as tenant-local after clone.
- `receipts` is provisioned, with FKs `receipts_payment_id_fkey` and
  `receipts_invoice_id_fkey` → tenant-local invoices/payments
  (20260706000000:44-52). **No live-verification needed for presence** (both
  migration and dump list it).
- `wht_receipts` is NOT provisioned (A.2) and its FKs reference payments and
  invoices (20260520090003:153-154).

---

## B. Financial Computation — invoice_financials_v

### B.1 View definition (migration)

`20260520090010_views.sql:15-37` — unqualified references to `invoices` and
`payments` (resolves to public), aggregates `cash_received`, `wht_received`,
`settled_total`, `balance_due`, and a `CASE` producing `computed_status` in
{paid, partially_paid, unpaid}. No schema-qualified references. No explicit RLS
(schema-search-path views).

### B.2 CRITICAL: live dump view differs from migration view

`live-public-schema.sql` contains TWO definitions of the view:

- Line 2614: a stub/column-signature form (`SELECT NULL::uuid ...`) — the CSV
  export artifact referenced by the migration header comment.
- Line 4374: the real live definition. **It differs from the migration**
  version: `computed_status` produces `'paid' | 'partial' | 'overdue' | else
  i.status` and filters voided payments in the JOIN (`p.voided_at IS NULL`).
  The migration version produces `'paid' | 'partially_paid' | 'unpaid'`.

This is **production drift**: the repository view and the live view are not the
same. Impact: `paymentRepository.syncInvoiceStatusFromFinancials` writes
`computed_status` back into `invoices.status`, which has a live CHECK
constraint `invoices_status_check` = {unpaid, partially_paid, paid, archived}
(dump line ~2699). A live computed value of `'partial'`/`'overdue'` would
**violate that CHECK** on write-back. The migration's own `invoices` table
(20260520090003) has no such CHECK — another migration-vs-live divergence.

- **Classification: LIVE VERIFICATION REQUIRED** for the actual current view
  body and CHECK constraint in production; the migration definition is not
  authoritative for production behavior.

### B.3 Consumers of invoice_financials_v (complete)

| # | File:Line | Direct/Indirect | User-facing | Must be tenant-aware if invoices move |
|---|---|---|---|---|
| 1 | src/modules/invoices/repositories/paymentRepository.ts:60 | direct (fetchInvoiceFinancials) | yes (invoice status) | yes |
| 2 | src/modules/invoices/repositories/paymentRepository.ts:137 | direct (syncInvoiceStatusFromFinancials) | yes (writes invoices.status!) | yes |
| 3 | src/hooks/useInvoiceDetailData.js:132 | direct | yes (invoice detail) | yes |
| 4 | src/hooks/useDashboardData.ts:364 | direct | yes (dashboard) | yes |
| 5 | src/pages/ClientDetail.tsx:219 | direct | yes (client detail) | yes |
| 6 | src/hooks/useProjectDocumentFetch.ts:149 | direct | yes (project detail) | yes |
| 7 | src/modules/reports/repositories/reportRepository.ts:18 | direct | yes (reports/export) | yes |
| 8 | src/domain/invoice/resolveInvoiceStatus.ts (imports financialState.ts) | indirect (client-side financial state; parallel derivation) | yes | n/a (pure TS) |
| 9 | supabase/migrations/20260520090007_notifications.sql:287 (generate_invoice_notifications) | indirect (SQL joins view) | background | yes if notifications remain invoice-aware |
| 10 | src/lib/database.types.ts:2520+ | type generation only | no | n/a |

**Silent-wrong-status consumers:** items 1 and 2 (paymentRepository) read
`computed_status` and write it back to `invoices.status`. If invoices move to
tenant and these reads stay public (or vice versa), they can return stale
status or fail. The view itself never fails when invoices exist in the read
schema — it returns wrong numbers instead. **This is the silent-misreport risk.**

### B.4 Architectural alternatives (not selected)

- **OPTION A — Tenant-local financial view:** tenant-provisioned view; RLS
  follows tenant policies; requires provisioning of the view + underlying
  joins per tenant; compatible with tenant invoices; duplicates view per
  entity; status write-back works only if read/write schemas align.
- **OPTION B — Global RPC/view resolving tenant context:** one view/RPC that
  resolves schema at runtime; must handle RLS and schema resolution security;
  single definition; risk of leaking cross-tenant data if resolution is wrong.
- **OPTION C — Application-side financial calculation:** financialState.ts is
  already a parallel derivation (documented in multiple reports). Moving
  authoritative computation client-side risks drift with any SQL consumer and
  breaks SQL-based reporting (reportRepository, notifications).

**Classification: ARCHITECTURAL DECISION REQUIRED.** Absence of tenant-aware
financial computation is not itself a static blocker (options exist), but the
migration-vs-live view divergence (B.2) is a live-verification item that must
be resolved first.

---

## C. Invoice Numbering

### C.1 Implementation

- `getNextInvoiceNumber(rows, prefix)` (src/domain/documentConversion.ts:8-23):
  pure function. Takes a **rows array already fetched by the caller**, filters
  by prefix, extracts trailing digits, returns `prefix + (max+1) padded to 3`.
  It does not query the database itself.
- `resolvePrefix(prefixes, 'invoice')` (src/domain/prefixConstants.ts:17-26):
  reads `settings.document_prefixes` (tenant settings since Phase 2) with
  `DEFAULT_PREFIXES` fallback.

### C.2 Who fetches the rows (the actual query)

All callers fetch `invoice_number` from **public** `supabase.from('invoices')`:

- src/hooks/useInvoiceSave.ts:274 (create path retry loop)
- src/pages/InvoiceFormPage.tsx:269-273 (draft number prefill)
- src/pages/Invoices.tsx:105 (clone prefill)
- src/pages/viewQuotationActions.ts:156 (quotation→invoice conversion)
- src/modules/invoices/services/invoiceLifecycleService.ts:188 (duplicate,
  hardcoded `SASINV-B%` filter — legacy prefix)
- src/hooks/useInvoiceSave.ts:275 uses `withUniqueRetry` (src/lib/withUniqueRetry.ts) which only retries on error code **23505** (unique violation).

### C.3 Uniqueness constraints

- **No unique index/constraint on `invoices.invoice_number`** in any migration
  (grep across supabase/migrations: zero hits) nor in the live dump
  (`CREATE UNIQUE INDEX ... invoice_number`: zero hits). `withUniqueRetry`
  would therefore never trigger for invoice numbers — it only fires on PK
  collisions (impossible with gen_random_uuid). The DB does **not** prevent
  duplicates; it merely stores them.
- `receipts.receipt_number` DOES have a unique index
  (`idx_receipts_number`, 20260706000000:33) — receipts are protected,
  invoices are not.

### C.4 Behavior if writes move to tenant while numbering reads public

- Duplicate generation: **possible and likely** — both schemas would compute
  `max+1` from disjoint sets (public sees legacy rows; tenant starts empty →
  tenant would restart at `{prefix}001`, colliding with the earliest public
  number). Two schemas can independently generate the same number.
- Numbering reset: yes, for tenant-only reads (empty tenant → starts at 001).
- DB constraint: does not exist → cannot prevent, only expose.
- Strategy dependence: the answer changes with the legacy-data strategy
  (D): full migration keeps a single set; dual-read splits; new-only splits.

### C.5 Other invoice_number readers

Display/search/export/PDF/linked docs all read the same public rows (see G).
Exports via reportRepository read public. Notifications read
`public.invoices` via SQL. Audit RPCs read `public.invoices`.

**Classification: ARCHITECTURAL DECISION REQUIRED** (numbering authority and
legacy-data strategy). The absence of a DB uniqueness constraint is a
**CONFIRMED fact** and a latent duplicate risk, but not by itself a blocker
while a single schema remains authoritative.

---

## D. Existing Public Invoice Data

### D.1 What can be established statically

- Tables and relationships are fully derivable from migrations (see A.2, A.3,
  A.7). Relationship graph:
  - invoices 1—N invoice_items (no FK; app-enforced via invoice_id)
  - invoices 1—N payments (payments_invoice_id_fkey)
  - payments 1—1 wht_receipts (wht_receipts_payment_id_fkey,
    wht_receipts_invoice_id_fkey)
  - invoices 1—N receipts (receipts_invoice_id_fkey ON DELETE RESTRICT;
    receipts_payment_id_fkey ON DELETE RESTRICT)
  - invoices 1—N waybills (waybills_invoice_id_fkey)
  - csrs.linked_invoice_id (no FK; app-enforced)
  - quotations/quotation_items: conversion history stored inside
    invoices.custom_fields / quotations.custom_fields (conversionTrail), not
    via FK
  - activity_events/audit_logs: entity_id references invoices (no FK)
- The live dump (`live-public-schema.sql`) is a **schema-only export** (0 COPY
  statements) that contains NO `entity_bigdrops-*` schema at all. Row counts:
  **not statically determinable — requires human/database verification.**
- No fixtures/seed data with counts exist in migrations or docs.

### D.2 Cutover-relevant relationships

invoice→invoice_items, invoice→payments, invoice→wht_receipts, invoice→receipts
(RESTRICT FKs — deletion order matters), invoice→csr (linked_invoice_id),
invoice→waybill (invoice_id FK), invoice→quotation conversion trails in
custom_fields, invoice→activity/audit (entity_id), invoice→project
(invoices.project_id → public projects).

### D.3 Architectural strategies (not selected)

- **A. FULL ONE-TIME MIGRATION:** move all history pre-cutover. IDs are uuid
  (stable if copied as-is); invoice numbers would move intact (one set, no
  renumber); child rows move with parent; linked docs (csr/waybill FKs) need
  coordinated re-pointing; audit/activity history placement depends on E;
  search/pagination/export/PDF all follow schema choice; RESTRICT FKs force
  order-of-operations.
- **B. DUAL-READ WITH TENANT WRITES:** new writes tenant, legacy readable
  public. Needs read precedence; search/pagination must merge or split;
  numbering splits (C.4); edits to legacy invoices stay public; reporting must
  union schemas; PDFs follow record source.
- **C. ENTITY CUTOVER:** point-in-time switch. Same mechanics as B but bounded;
  legacy becomes read-only; edit policy needed for legacy (E/architectural).
- **D. NEW-ONLY:** permanent split-brain. Simplest; permanent dual-source
  search/report/PDF; numbering permanently split; future migration harder.

### D.4 ID stability

IDs are `gen_random_uuid()`; no serials. **IDs can remain stable if rows are
copied, not regenerated.** FKs referencing invoices (payments, receipts,
wht_receipts, waybills) must move in the same transaction/sequence as their
parent. `invoices.project_id` → public projects stays cross-schema either way.

**Classification: ARCHITECTURAL DECISION REQUIRED** — no repository document
establishes an approved strategy. The previous report's claim that public
invoice data exists is **partially confirmed** (relationships proven; counts
are live-verification).

---

## E. Audit & Activity Architecture

### E.1 RPC inventory (migrations) referencing public invoice data

| Function | Migration | SECURITY DEFINER | search_path | Reads | Writes |
|---|---|---|---|---|---|
| record_invoice_created | 20260520090003:203 | yes | 'public' | public.invoices | activity_events (via record_activity_event) |
| record_invoice_status_changed | 20260520090003:242 | yes | 'public' | public.invoices | activity_events |
| record_payment_recorded | 20260520090003:279 + 20260705000000 | yes | 'public' | public.invoices | activity_events |
| record_payment_voided | 20260703000000:4 | yes | 'public' | public.invoices | activity_events |
| record_payment_attachment_uploaded | 20260705100000:118 | yes | 'public' | (payment/invoice context) | activity_events |
| record_activity_event | 20260520090008:79 + whitelist updates | yes | 'public' | public.activity_events (dedupe) | activity_events |
| record_audit_log | 20260520090008:192 | yes | 'public' | — | audit_logs |
| record_quotation_linked | 20260520090002 | yes | 'public' | public.quotations | activity_events |
| revert_invoice_to_quotation_transaction | **NOT in migrations** | yes | (see E.3) | — | quotations, quotation_items, invoice_items, invoices |

All activity RPCs **hardcode `public.invoices`** via `select * into v_invoice
from public.invoices where id = p_invoice_id` and raise
'Invoice not found' otherwise. **CONFIRMED.**

### E.2 activity_events / audit_logs placement

- Written by SECURITY DEFINER RPCs into **public** tables. RLS on both tables
  is SELECT-only for authenticated (20260520090008). No tenant copies are
  provisioned (A.2).
- Consumers: `useAuditTrail.ts:87,95` reads both public tables for the audit
  timeline UI. Views `v_last_invoice_activity` etc. join public activity to
  public invoices.

**Classification: ARCHITECTURAL DECISION REQUIRED** — the repo gives no signal
that activity/audit must become tenant-local. Global audit is coherent as long
as invoice lookup is schema-aware. No static blocker; the dependency on
public.invoices in the RPC bodies is a confirmed fact whose resolution is
architectural.

### E.3 revert_invoice_to_quotation_transaction (live dump)

`live-public-schema.sql:2040-2131` defines it: SECURITY DEFINER, **no explicit
search_path**, inserts a quotation + quotation items, then
`DELETE FROM invoice_items WHERE invoice_id = ...; DELETE FROM invoices WHERE
id = ...`. It exists **only in the live database**, not in migrations
(CONFIRMED drift). Because it has no `SET search_path`, its unqualified table
references resolve via the caller's search_path (a security-relevant detail).

**Classification:** existence = CONFIRMED (via dump, not migrations);
live signature/behavior = **LIVE VERIFICATION REQUIRED** (dump may predate
current production).

---

## F. Transaction Boundaries

Deterministic flow table (verified from code):

| Flow | Step | Operation | Table | Depends on prev | Rollback | Partial-failure risk |
|---|---|---|---|---|---|---|
| Invoice create (useInvoiceSave persist+afterSave) | 1 | INSERT | invoices (withUniqueRetry) | — | no | yes |
| | 2 | DELETE | invoice_items | step1 (effectiveId) | no | orphan header |
| | 3 | INSERT | invoice_items | step1 | no | missing items |
| | 4 | RPC audit | activity_events/audit_logs | step1 | no | missing audit |
| Invoice edit | 1 | UPDATE | invoices | — | no | yes |
| | 2 | DELETE+INSERT | invoice_items | step1 | no | item drift |
| | 3 | RPC audit | audit tables | step1 | no | missing audit |
| Invoice delete (useInvoiceMutations) | 1 | DELETE | invoice_items | — | no | items gone, header orphan |
| | 2 | DELETE | invoices | step1 | no | orphan items |
| Invoice list delete (Invoices.tsx) | 1 | DELETE | invoice_items | — | no | same |
| | 2 | DELETE | invoices | step1 | no | same |
| Record payment (recordInvoicePayment) | 1 | INSERT | payments | — | no | yes |
| | 2 | SELECT view + UPDATE | invoices.status | step1 | no | status stale |
| | 3 | RPC audit | activity_events | step1 | no | missing audit |
| | 4 | INSERT | wht_receipts (auto draft) | step1 | no | missing WHT |
| | 5 | INSERT | receipts (+withUniqueRetry) | step1 | no | missing receipt |
| | 6 | fetch /api upload | payments.attachments (server) | step1 | no | missing attachment |
| Payment void | 1 | UPDATE | payments.voided_at | — | no | yes |
| | 2 | SELECT view + UPDATE | invoices.status | step1 | no | status stale |
| | 3 | RPC audit | activity_events | step1 | no | missing audit |
| | 4 | UPDATE | receipts (void) | step1 | no | un-voided receipt |
| Status change | 1 | UPDATE | invoices.status | — | no | yes |
| | 2 | RPC audit | activity_events/audit_logs | step1 | no | missing audit |
| Archive (list + lifecycle) | 1 | UPDATE | invoices.archived_at | — | no | low |
| Quotation→invoice | 1 | INSERT | invoices | — | no | yes |
| | 2 | INSERT | invoice_items | step1 | no | items missing |
| | 3 | UPDATE | quotations (status/trail) | step1 | no | quotation not marked |
| | 4 | RPC audit | activity_events/audit_logs | step1 | no | missing audit |
| Invoice→quotation revert | 1 | RPC (single fn) | quotations, quotation_items, invoice_items, invoices | atomic in RPC | YES (single statement) | low (but RPC undefined in repo) |
| Attach CSR/waybill | 1 | UPDATE | csrs.linked_invoice_id / waybills.invoice_id | — | no | low |
| Batch ops | 1 | UPDATE/DELETE | invoices (in id-set) | — | no | per-statement |
| Custom-fields save | 1 | UPDATE | invoices.custom_fields | — | no | low |

Classification:

- **MUST BE ATOMIC:** invoice create (header+items+numbering),
  invoice edit (update+item replace), invoice delete (items+header),
  payment record (payment+status+receipt+WHT), payment void, revert RPC.
- **CAN REMAIN SEQUENTIAL:** archive, status change, attach, batch, custom
  fields (single-statement, low blast radius) — though each still benefits
  from audit-order discipline.
- **ARCHITECTURAL DECISION REQUIRED:** whether to move composite flows into
  transactional RPCs vs. compensating logic. No implementation prescribed.
- **LIVE VERIFICATION REQUIRED:** whether `revert_invoice_to_quotation_transaction`
  actually exists/behaves as in the dump.

---

## G. Expanded Invoice Read Inventory

Direct `.from()` reads (all **public** supabase unless noted):

| File:Line | Table/View | Operation | Cache | Must be tenant-aware if invoices move |
|---|---|---|---|---|
| src/config/moduleAdapters.ts:127-129 (active list) | invoices + payments embed | SELECT | bd:list:invoices:v1:all (5 min) | yes |
| src/hooks/useInvoiceList.ts:65,285 | invoices | SELECT (+client options) | INVOICE_CACHE_KEY | yes (partially legacy; Invoices.tsx imports only its cache key/type) |
| src/hooks/useInvoiceDetailData.js:69,104,110,132,144 | invoices, payments, invoice_financials_v, invoice_items | SELECT | — | yes |
| src/hooks/useInvoiceHydration.ts:67,107 | invoices, invoice_items | SELECT | — | yes |
| src/modules/invoices/services/invoiceService.ts:5,16,27 | invoices, invoice_items | SELECT | — | yes |
| src/hooks/useInvoiceReferenceData.ts | invoices?/settings | SELECT | — | settings tenant; invoice rows public |
| src/pages/Invoices.tsx:105 | invoices (numbering) | SELECT | — | yes (numbering) |
| src/pages/InvoiceFormPage.tsx:269 | invoices (numbering) | SELECT | — | yes (numbering) |
| src/pages/viewQuotationActions.ts:156,197 | invoices, invoice_items | SELECT/INSERT | — | yes |
| src/pages/ClientDetail.tsx:156,219 | invoices, invoice_financials_v | SELECT | — | yes |
| src/pages/ComplianceHub.tsx:85,90,183 | invoices, payments, wht_receipts | SELECT | — | yes |
| src/pages/settings/ArchivesSettingsSection.tsx:87 | invoices (archived) | SELECT | — | yes |
| src/pages/CsrFormPage.tsx:175 | invoices | SELECT | — | yes |
| src/pages/ViewReceipt.tsx:33 | receipts | SELECT | — | yes |
| src/hooks/useGlobalSearch.ts:47 | invoices | SELECT (ilike) | — | yes |
| src/hooks/useDashboardData.ts:355,364,470 | invoices, invoice_financials_v | SELECT | — | yes |
| src/hooks/useProjectDocumentFetch.ts:118,149 | invoices, invoice_financials_v | SELECT | — | yes |
| src/modules/reports/repositories/reportRepository.ts:18,33,46 | invoice_financials_v, invoices, payments | SELECT | — | yes (reports/exports) |
| src/modules/item-library/repositories/itemLibraryRepository.ts:82,296,335,350,412,471,497 | invoice_items, invoices | SELECT | — | yes (item usage analytics) |
| src/modules/compliance/services/complianceService.ts:96,104 | wht_receipts, invoices | SELECT | — | yes |
| src/modules/compliance/repositories/complianceRepository.ts:5 | wht_receipts | SELECT | — | yes |
| src/modules/invoices/services/invoiceLifecycleService.ts:21,27,38,65,71,110,116,127,188 | invoices | SELECT (pre/post write snapshots, numbering) | — | yes |
| src/modules/invoices/services/invoiceConversionService.ts:22 | invoices.custom_fields | SELECT | — | yes |
| src/modules/invoices/services/invoiceAdvanceService.ts:70 | invoices | SELECT | — | yes |
| src/modules/invoices/services/paymentService.ts:116-117,163 | invoices, receipts, clients(tenant), settings(tenant) | SELECT | — | invoices/receipts public; settings/clients tenant |
| src/modules/invoices/repositories/paymentRepository.ts:6,32,46,74,98,117,128,148 | payments, invoice_financials_v, invoices | SELECT | — | yes |
| src/modules/invoices/repositories/invoiceChildDocRepository.ts:25-33 | csrs, waybills | SELECT | — | yes (linked docs) |
| src/domain/receipt/receiptRepository.ts:8-65 | receipts | SELECT | — | yes |
| src/components/document-view/invoice/sections/PaymentHistoryCard.tsx:32 | receipts | SELECT | — | yes |
| src/components/document-view/invoice/InvoicePaymentsSection.tsx | payments (via props/hooks) | — | — | yes |
| src/hooks/useAuditTrail.ts:87,95 | audit_logs, activity_events | SELECT | — | can remain global if audit stays global |
| src/lib/audit.ts:222 | invoices | SELECT (before RPC) | — | yes |
| src/pages/ViewWaybill.tsx / ViewCSR.tsx | invoices (via services) | — | — | yes |
| src/domain/documentRelationships.js:65 | invoices | SELECT | — | yes |

Reads that can legitimately remain global: `item_catalog` (shared catalog),
`activity_events`/`audit_logs` (if global-audit model chosen), `profiles`,
`workspaces`/`entities`/`entity_permissions`, `notifications` (global),
`telegram_topics`.

Explicit failure modes if writes move to tenant while these stay public:
- stale data (list/detail show nothing new),
- no data (tenant rows invisible to public reads),
- incomplete data (items written to tenant, read from public),
- wrong financial status (view read public vs tenant split),
- broken linked docs (csr/waybill point to public invoice that no longer
  receives updates).

---

## H. Live Verification Items

REQUIRES HUMAN/DATABASE VERIFICATION:

1. Whether the production entity has `invoice/create`, `invoice/view`,
   `invoice/edit`, `invoice/delete` entity_permissions rows.
2. Whether the production entity has `payment/create`, `payment/view`,
   `payment/edit`, `payment/delete` rows.
3. Whether `revert_invoice_to_quotation_transaction` exists in the live
   database; if it does, its signature, implementation, schema references,
   and transaction behavior cannot be confirmed statically (dump may be
   stale).
4. Whether `public.payments` has a live INSERT policy. (The live dump
   `payments_authenticated_insert` at line 5202 suggests yes — but migrations
   do not define one; current production state requires live check.)
5. Whether production tenant `invoices`/`payments` tables contain the expected
   tables, columns, constraints, indexes, triggers, RLS policies.
6. Whether production tenant structures match current provisioning code (the
   dump contains no tenant schema at all, so tenant structure is unknown).
7. Whether repository migration state matches production schema state
   (confirmed drift exists: live view, CHECK constraint, payments INSERT
   policy, revert RPC are all absent from migrations).
8. Whether additional RLS policies exist in production that are absent from
   migrations (dump shows `payments_authenticated_insert`,
   `wht_receipts_authenticated_insert` absent from migrations).
9. Whether existing production invoice data exists and its approximate row
   counts.
10. Whether live database drift exists for invoice-related RPCs (dump
    `revert_invoice_to_quotation_transaction` not in migrations).

---

## I. Reconciled Write-Site Count

The previous report said "23 production frontend/API write sites" while listing
32 numbered rows. Fresh deterministic inventory (this investigation):

### I.1 FRONTEND DIRECT WRITE SITES (supabase.from().insert/update/delete on invoice tables)

| # | File:Line(s) | Operation | Table | Schema | Client | Production? |
|---|---|---|---|---|---|---|
| 1 | src/hooks/useInvoiceSave.ts:271 | INSERT | invoices | public | supabase | yes |
| 2 | src/hooks/useInvoiceSave.ts:279 | UPDATE | invoices | public | supabase | yes |
| 3 | src/hooks/useInvoiceSave.ts:289 | DELETE | invoice_items | public | supabase | yes |
| 4 | src/hooks/useInvoiceSave.ts:299 | INSERT | invoice_items | public | supabase | yes |
| 5 | src/hooks/useInvoiceMutations.ts:208 | DELETE | invoice_items | public | supabase | yes |
| 6 | src/modules/invoices/services/invoiceLifecycleService.ts:28 | UPDATE | invoices | public | supabase | yes |
| 7 | src/modules/invoices/services/invoiceLifecycleService.ts:72 | DELETE | invoices | public | supabase | yes |
| 8 | src/modules/invoices/services/invoiceLifecycleService.ts:117 | UPDATE | invoices | public | supabase | yes |
| 9 | src/modules/invoices/services/invoiceStatusService.ts:20 | UPDATE | invoices | public | supabase | yes |
| 10 | src/modules/invoices/services/invoiceAdvanceService.ts:64 | UPDATE | invoices | public | supabase | yes |
| 11 | src/modules/invoices/repositories/paymentRepository.ts:33 | INSERT | payments | public | supabase | yes |
| 12 | src/modules/invoices/repositories/paymentRepository.ts:75 | UPDATE | invoices | public | supabase | yes |
| 13 | src/modules/invoices/repositories/paymentRepository.ts:99 | UPDATE | payments | public | supabase | yes |
| 14 | src/modules/invoices/repositories/paymentRepository.ts:129 | UPDATE | payments | public | supabase | yes |
| 15 | src/modules/invoices/repositories/paymentRepository.ts:149 | UPDATE | invoices | public | supabase | yes |
| 16 | src/modules/invoices/repositories/invoiceChildDocRepository.ts:36 | UPDATE | csrs | public | supabase | yes |
| 17 | src/modules/invoices/repositories/invoiceChildDocRepository.ts:45 | UPDATE | waybills | public | supabase | yes |
| 18 | src/modules/invoices/services/paymentService.ts:160 | INSERT | receipts | public | supabase | yes |
| 19 | src/domain/receipt/receiptRepository.ts:16 | INSERT | receipts | public | supabase | yes |
| 20 | src/domain/receipt/receiptRepository.ts:99 | UPDATE | receipts | public | supabase | yes |
| 21 | src/pages/Invoices.tsx:135 | UPDATE | invoices | public | supabase | yes |
| 22 | src/pages/Invoices.tsx:155 | DELETE | invoice_items | public | supabase | yes |
| 23 | src/pages/Invoices.tsx:156 | DELETE | invoices | public | supabase | yes |
| 24 | src/pages/Invoices.tsx:231 | UPDATE | csrs | public | supabase | yes |
| 25 | src/pages/Invoices.tsx:234 | UPDATE | waybills | public | supabase | yes |
| 26 | src/pages/viewQuotationActions.ts:197 | INSERT | invoices | public | supabase | yes |
| 27 | src/pages/viewQuotationActions.ts:204 | INSERT | invoice_items | public | supabase | yes |
| 28 | src/pages/viewQuotationActions.ts:221 | UPDATE | quotations | public | supabase | yes |
| 29 | src/pages/viewInvoiceActions.ts:169 | UPDATE | invoices | public | supabase | yes |
| 30 | src/pages/viewInvoiceActions.ts:188 | UPDATE | invoices | public | supabase | yes |
| 31 | src/components/document-view/invoice/useInvoiceActions.ts:171 | UPDATE | invoices | public | supabase | yes |
| 32 | src/components/document-view/invoice/useInvoiceActions.ts:186 | UPDATE | invoices | public | supabase | yes |
| 33 | src/components/batch/BatchActionFooter.tsx:108 | UPDATE | invoices | public | supabase | yes |
| 34 | src/components/batch/BatchActionFooter.tsx:119 | UPDATE | invoices | public | supabase | yes |
| 35 | src/components/batch/BatchActionFooter.tsx:131 | UPDATE | invoices | public | supabase | yes |
| 36 | src/components/batch/BatchActionFooter.tsx:143 | DELETE | invoices | public | supabase | yes |
| 37 | src/components/document/ProjectLinkDialog.tsx:185 | UPDATE | invoices (project_id) | public | supabase | yes (generic component used with tableName="invoices") |
| 38 | src/modules/compliance/repositories/complianceRepository.ts:11 | INSERT | wht_receipts | public | supabase | yes |
| 39 | src/modules/compliance/repositories/complianceRepository.ts:17 | UPDATE | wht_receipts | public | supabase | yes |
| 40 | src/modules/compliance/repositories/complianceRepository.ts:23 | DELETE | wht_receipts | public | supabase | yes |

### I.2 SERVER/API WRITE PATHS

| # | File:Line(s) | Operation | Table | Schema | Client | Production? |
|---|---|---|---|---|---|---|
| 1 | api/upload-payment-attachment.ts:171-174 | UPDATE | payments.attachments | public | service-role admin client | yes |

### I.3 RPC-BASED WRITE PATHS

| # | File:Line | RPC | DB writes performed | Schema | Production? |
|---|---|---|---|---|---|
| 1 | src/modules/invoices/services/invoiceConversionService.ts:75 | revert_invoice_to_quotation_transaction | INSERT quotations + quotation_items; DELETE invoice_items + invoices | public (unqualified) | yes (RPC live; not in migrations) |

### I.4 AUDIT/ACTIVITY WRITE PATHS (consequence of invoice ops)

| # | Caller (src/lib/audit.ts) | RPC | DB writes |
|---|---|---|---|
| 1 | recordAuditLog (~:90) | record_audit_log | INSERT audit_logs |
| 2 | recordInvoiceCreated (:144) | record_invoice_created | INSERT activity_events |
| 3 | recordInvoiceStatusChanged (:165) | record_invoice_status_changed | INSERT activity_events |
| 4 | recordPaymentRecorded (:196) | record_activity_event (PAYMENT_RECORDED) | INSERT activity_events |
| 5 | recordPaymentVoided (:225) | record_payment_voided | INSERT activity_events |
| 6 | recordQuotationLinked (:263) | record_quotation_linked | INSERT activity_events |
| 7 | recordReceiptGenerated/Voided (:333,354) | record_audit_log | INSERT audit_logs |
| 8 | recordPaymentAttachmentUploaded (:207) | record_payment_attachment_uploaded | INSERT activity_events (exported; no caller found in current src) |

### I.5 NON-PRODUCTION/TOOLING

| # | File | Operations |
|---|---|---|
| 1 | tools/imported-documents/repairImportedDocuments.ts:342,376 | INSERT/DELETE invoice_items |
| 2 | scratch/import_invoices.ts:126,154 | INSERT invoices + invoice_items |
| 3 | scratch/check_invoice.ts, validate_all.ts, query_audit.mjs | reads only |

### I.6 Totals

- Frontend direct writes: **40**
- Server/API writes: **1**
- RPC-based writes: **1** (single physical RPC; multi-table writes inside)
- Audit/activity RPC paths: **8** (7 invoked in current flows; 1 exported
  without callers)
- Non-production/tooling: **3**

Note on overlap: a single application flow can legitimately appear in more
than one category because it invokes an RPC after direct writes (e.g., payment
record = direct INSERT payments + RPC audit; save = direct INSERT invoices +
RPC audit). Each physical DB write is counted once; RPC audit writes are
counted in I.4, not double-counted under direct writes.

Reconciliation of the previous count: the "23" figure undercounted by merging
multiple rows of the 32-row table and excluding the wht_receipts/compliance and
batch/generic-component sites; the 32-row table itself included some rows that
are reads or audit RPCs. The fresh count above is authoritative.

---

## J. Reconciliation of Previous Findings

| Previous Claim | Repository Finding | Status | Classification | Evidence |
|---|---|---|---|---|
| invoice_items not provisioned | CONFIRMED — absent from template list (migration + live dump) | CONFIRMED | CONFIRMED BLOCKER | 20260717000000:40-44; live dump:165-170 |
| wht_receipts not provisioned | CONFIRMED | CONFIRMED | ARCHITECTURAL DECISION REQUIRED (whether WHT becomes tenant) | same |
| financial views not provisioned | CONFIRMED — no views in template list; clone is table-only | CONFIRMED | ARCHITECTURAL DECISION REQUIRED | same + _prov_clone_table |
| activity/audit placement | Global today; tenant copies absent | CONFIRMED | ARCHITECTURAL DECISION REQUIRED | 20260520090008; template list |
| invoice triggers not cloned | CONFIRMED — LIKE does not copy triggers; no trigger creation in pipeline | CONFIRMED | CONFIRMED BLOCKER (data parity) | core_tables.sql:31-64; 20260520090003:196-197; _prov_clone_table:179-199 |
| audit RPC public-schema dependency | CONFIRMED — all invoice RPCs read public.invoices | CONFIRMED | ARCHITECTURAL DECISION REQUIRED (resolution) | 20260520090003:203-307 |
| invoice numbering reads public | CONFIRMED — getNextInvoiceNumber is pure; all callers fetch public rows | CONFIRMED | ARCHITECTURAL DECISION REQUIRED | documentConversion.ts:8-23; callers |
| no DB uniqueness on invoice_number | CONFIRMED — no unique index in migrations or dump | CONFIRMED | NON-BLOCKER alone; risk under split numbering | grep results |
| revert_invoice_to_quotation_transaction undefined in repo | CONFIRMED in migrations; EXISTS in live dump | PARTIALLY CONFIRMED | LIVE VERIFICATION REQUIRED | dump:2040-2131; 0 migration hits |
| entity permissions for invoice actions | Not statically verifiable | NOT VERIFIABLE STATICALLY | LIVE VERIFICATION REQUIRED | no repo data |
| payments INSERT policy missing | Migrations lack it; live dump HAS payments_authenticated_insert | PARTIALLY CONFIRMED (drift) | LIVE VERIFICATION REQUIRED | dump:5202; 20260520090003 |
| public legacy invoice data exists | Relationships proven; counts not statically determinable | PARTIALLY CONFIRMED | LIVE VERIFICATION REQUIRED | schema only; 0 COPY rows |
| write-site count "23" | Actual deterministic frontend direct count = 40 (+1 server, +1 RPC, +8 audit) | CONTRADICTED | — | Section I |
| transaction/partial-write claims | CONFIRMED — multi-request sequential flows, no rollback except revert RPC | CONFIRMED | Section F table | code inspection |
| live invoice_financials_v statuses | Live view returns partial/overdue; migration returns partially_paid — drift | PARTIALLY CONFIRMED (drift discovered) | LIVE VERIFICATION REQUIRED | dump:4374 vs views.sql:15-37 |
| invoices_status_check | Exists live (dump), absent in migration — drift | CONFIRMED (drift) | LIVE VERIFICATION REQUIRED | dump ~2699 |

---

## K. Final Blocker & Decision Register

### 1. CONFIRMED IMPLEMENTATION BLOCKERS

| Blocker | Evidence | Affected flows | Why Phase 3 cannot safely proceed |
|---|---|---|---|
| `invoice_items` not provisioned in tenant schemas | 20260717000000:40-44; live dump:165-170 | Save create/edit, delete, quotation→invoice conversion | Any tenant write to invoice_items fails ("relation does not exist") |
| Tenant invoices lack `trg_invoices_set_updated_at` / `trg_invoices_stamp_ownership` | LIKE does not copy triggers; no trigger provisioning | All tenant invoice writes | updated_at/created_by/updated_by would be wrong/null — data parity break |

### 2. ARCHITECTURAL DECISIONS REQUIRED

1. Invoice data cutover strategy (A full-migration / B dual-read / C entity
   cutover / D new-only) — Section D.3.
2. Invoice numbering authority (which schema is authoritative; how max+1 is
   computed; whether a DB uniqueness constraint is added) — Section C.
3. Financial computation architecture (A tenant-local view / B global
   schema-resolving view-RPC / C application-side) — Section B.4.
4. Audit/activity architecture (global vs tenant-local) and how invoice RPCs
   resolve the invoice row — Section E.
5. Transaction boundaries (which composite flows become atomic; mechanism
   RPC vs compensating) — Section F.
6. Tenant/global treatment of related data: `item_catalog` (shared), `wht_receipts`,
   `bank_accounts`, `signatories`, `notifications`, `activity_events`,
   `audit_logs` — Sections A, E, G.
7. Legacy invoice edit policy once tenant writes are authoritative
   (read-only vs writable legacy; per strategy D) — Section D.
8. Resource mapping for future `invoice_items` / `wht_receipts` provisioning
   (dedicated resource vs map to `invoice`) — Section A.4.

### 3. REQUIRES HUMAN/DATABASE VERIFICATION

1. entity_permissions rows: invoice/* and payment/* for the real entity.
2. revert_invoice_to_quotation_transaction: live existence, signature,
   implementation, schema references, transaction behavior.
3. public.payments INSERT policy current state (dump says yes; migrations no).
4. Production tenant schema structure vs provisioning code (dump has no
   tenant schema).
5. Repository migration state vs production (drift confirmed: live view
   statuses, invoices_status_check, payments/wht_receipts INSERT policies,
   revert RPC).
6. Existing invoice data row counts.
7. Live behavior of `invoice_financials_v` computed_status write-back vs the
   live CHECK constraint (potential live failure on 'partial'/'overdue').

### 4. NON-BLOCKERS / FUTURE WORK

- Missing DB uniqueness on invoice_number (a risk only under split
  numbering; resolve as part of numbering decision).
- `recordPaymentAttachmentUploaded` exported without callers (dead-ish code).
- Dashboard unlimited invoice_financials_v aggregation query (pre-existing
  performance concern, documented elsewhere).
- `useInvoiceList.ts` partially legacy (Invoices.tsx imports only its cache
  key/type; active list path is moduleAdapters).
- migrate-vs-live view/CHECK divergence is a live item (H), not an
  implementation blocker once verified.

---

## Unverified Items (consolidated)

All items in Section H and rows marked LIVE VERIFICATION REQUIRED in Section J.
None were fabricated; each is explicitly marked as requiring
human/database verification.

## Files Inspected

Migrations (22): 20260520090000_core_tables.sql, 20260520090001_projects.sql,
20260520090002_quotations.sql, 20260520090003_invoices.sql,
20260520090004_csrs.sql, 20260520090005_items_catalog.sql,
20260520090007_notifications.sql, 20260520090008_audit_activity.sql,
20260520090009_tax.sql, 20260520090010_views.sql,
20260611000001_document_prefixes.sql, 20260703000000_record_payment_voided.sql,
20260703000001_add_payment_voided_to_whitelist.sql,
20260703100000_add_csr_waybill_to_whitelist.sql,
20260703100001_record_csr_waybill_events.sql,
20260705000000_enrich_payment_metadata.sql,
20260705100000_payment_attachments.sql, 20260706000000_create_receipts.sql,
20260707000000_receipt_snapshot_and_idempotency.sql,
20260714000000_multi_tenancy_core.sql,
20260714000001_multi_tenancy_rls.sql,
20260716000001_multi_tenancy_rls_recursion_fixes.sql,
20260717000000_entity_provisioning_engine.sql,
20260730000000_entity_provisioning_status_member_rpc.sql,
20260809000000_provisioning_settings_seed.sql

Live schema dump: live-public-schema.sql (schema-only; 0 data rows; no tenant
schema; contains revert RPC, payments/wht_receipts INSERT policies,
invoices_status_check, divergent view definition).

Source (src/): supabase.ts, lib/tenant/contexts.tsx, lib/tenantClient.ts,
lib/audit.ts, lib/withUniqueRetry.ts, domain/documentConversion.ts,
domain/prefixConstants.ts, domain/invoice/financialState.ts,
domain/invoice/resolveInvoiceStatus.ts, domain/receipt/receiptRepository.ts,
domain/documentRelationships.js, hooks/useInvoiceSave.ts, useDocumentSave.ts,
useInvoiceMutations.ts, useInvoiceList.ts, useInvoiceDetailData.js,
useInvoiceHydration.ts, useDashboardData.ts, useGlobalSearch.ts,
useAuditTrail.ts, useProjectDocumentFetch.ts, modules/invoices/services/*
(invoiceService, paymentService, invoiceLifecycleService, invoiceStatusService,
invoiceAdvanceService, invoiceConversionService), modules/invoices/repositories/*
(paymentRepository, invoiceChildDocRepository), modules/reports/repositories/
reportRepository.ts, modules/item-library/repositories/itemLibraryRepository.ts,
modules/compliance/services/complianceService.ts,
modules/compliance/repositories/complianceRepository.ts,
pages/Invoices.tsx, InvoiceFormPage.tsx, ClientDetail.tsx, ComplianceHub.tsx,
ViewReceipt.tsx, CsrFormPage.tsx, viewQuotationActions.ts, viewInvoiceActions.ts,
settings/ArchivesSettingsSection.tsx, config/moduleAdapters.ts,
context/DocumentQueryContext.tsx, components/batch/BatchActionFooter.tsx,
components/document/ProjectLinkDialog.tsx,
components/document-view/invoice/useInvoiceActions.ts,
components/document-view/invoice/InvoiceRecordPaymentSheet.tsx,
components/document-view/invoice/sections/PaymentHistoryCard.tsx

API/server: api/upload-payment-attachment.ts, api/edit-payment-caption.ts

Tooling: tools/imported-documents/repairImportedDocuments.ts,
scratch/import_invoices.ts, scratch/check_invoice.ts, scratch/validate_all.ts,
query_audit.mjs

Docs cross-referenced: docs/prd/financial-operations-prd.md,
docs/prd/audit-trail-integrity-prd.md, docs/standard/audit-trail-standard.md,
docs/Reports/invoice/view-invoice-inventory.md,
docs/Reports/GENERAL/financial-operations-architecture-audit.md,
docs/Reports/invoice-quote/third-audit-trail-financial-lineage.md,
docs/Reports/multi-tenancy/phase-3-invoice-write-path-inventory.md (prior
report, reconciled in Section J).
