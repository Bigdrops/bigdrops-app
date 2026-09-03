# Phase 3 Invoice Write-Path Inventory

This report was written by Buffy on 2026-08-09 via Freebuff.

Read-only investigation. No code, migration, RPC, or data was modified.

---

## Executive Summary

### Current architecture

- All invoice reads and writes currently target the **public schema** through the
  global `supabase` client (`src/supabase.ts`).
- Phase 2 moved only `settings` and `clients` READ paths to the Tenant Client
  (`useEntity() → tenantClient`). No invoice table reads or writes use the tenant
  schema.
- The provisioning engine (`provision_entity()`) clones 15 template tables into
  `entity_<workspace>_<entity>` schemas, including `invoices` and `payments`, and
  installs `has_entity_permission()`-based RLS on each.
- All financial calculations stay in `src/lib/Calculations.ts` (LOCKED). Invoice
  numbers come from `getNextInvoiceNumber()` + `resolvePrefix()` reading existing
  `invoices.invoice_number` rows.

### Main write-path findings

- **23 production frontend/API write sites** were found, all on the public schema.
- **No invoice write currently uses the Tenant Client.** The only tenant-schema
  access in invoice flows is the settings/clients reads added in Phase 2
  (`paymentService.ts`, `viewQuotationActions.ts`, `useInvoiceDetailData.js`).
- The provisioning engine clones **`invoices` and `payments`** but the template
  list is **missing `invoice_items`, `wht_receipts`, `activity_events`,
  `audit_logs`, and the `invoice_financials_v` view**. Any tenant-schema invoice
  write that touches those tables would fail (relation does not exist).
- One RPC (`revert_invoice_to_quotation_transaction`) is invoked by the frontend
  but **not defined in any migration in this repository** — confirmed via search.
- Invoice audit RPCs (`record_invoice_created`, `record_payment_recorded`, etc.)
  are hardcoded `SET search_path TO 'public'` SECURITY DEFINER functions that
  read `public.invoices`; they do not know about tenant schemas.

### Major risks

1. **Split-schema writes**: moving any single write step to the tenant schema
   while its read/refetch remains on public produces stale or missing data.
2. **Missing tenant tables/views**: `invoice_items`, `wht_receipts`,
   `invoice_financials_v`, `activity_events`, `audit_logs` are not provisioned.
   Writes to them cannot simply be redirected.
3. **Authorization dependency**: tenant RLS on `invoices`/`payments` requires
   `has_entity_permission()` rows (`invoice/create`, `invoice/edit`,
   `invoice/delete`). Whether the real BIGDROPS entity has them is
   **not statically verifiable**.
4. **Undefined RPC**: `revert_invoice_to_quotation_transaction` has no migration
   definition — it may exist only in a live database (drift) or fail at runtime.
5. **Non-atomic multi-request flows**: every mutation is a sequence of
   independent Supabase requests with no transaction boundary; partial success is
   possible today and would become more dangerous across schemas.

### Readiness classification

**BLOCKED — FURTHER INVESTIGATION REQUIRED**

Blocking evidence: (1) `invoice_items` is not in the provisioning template list;
(2) `invoice_financials_v` and `wht_receipts` are not provisioned; (3) invoice
audit RPCs hardcode `public`; (4) required `entity_permissions` rows are
unverifiable statically; (5) the revert-to-quotation RPC is undefined in the
repo. Phase 3 must not begin until these are resolved.

---

## A. Invoice Write Inventory

Derived table set (from migrations):

- `invoices` (20260520090003)
- `invoice_items` (20260520090003)
- `payments` (20260520090003) — note: there is no `invoice_payments` table
- `wht_receipts` (20260520090003)
- `receipts` (20260706000000)
- `activity_events`, `audit_logs` (20260520090008)
- Views: `invoice_financials_v`, `project_financials_v`, `item_price_summary_v`,
  `v_last_invoice_activity`, `v_last_project_activity`, `v_last_quotation_activity`
  (20260520090010)
- Cross-referenced: `quotations`/`quotation_items` (invoice conversion),
  `csrs`, `waybills` (child docs linked via `invoice_id` / `linked_invoice_id`),
  `bank_accounts`, `signatories`, `item_catalog` (FK from `invoice_items`)

There is **no** `invoice_taxes`, `invoice_discounts`, `invoice_notes`, or
`invoice_attachments` table. Tax/discount/notes are columns on `invoices`;
attachments are JSONB columns on `invoices` and `payments`.

| # | File | Line(s) | Operation | Table | Schema | Client | Direct/Indirect | Notes |
|---|------|---------|-----------|-------|--------|--------|-----------------|-------|
| 1 | src/hooks/useInvoiceSave.ts | 271 | INSERT (retry) | invoices | public | supabase | Direct | Save flow; withUniqueRetry for number collisions |
| 2 | src/hooks/useInvoiceSave.ts | 279 | UPDATE | invoices | public | supabase | Direct | Edit flow |
| 3 | src/hooks/useInvoiceSave.ts | 289 | DELETE | invoice_items | public | supabase | Direct | Edit: delete-then-insert items |
| 4 | src/hooks/useInvoiceSave.ts | 299 | INSERT | invoice_items | public | supabase | Direct | Edit/Create items |
| 5 | src/hooks/useInvoiceMutations.ts | 208 | DELETE | invoice_items | public | supabase | Direct | confirmDelete |
| 6 | src/modules/invoices/services/invoiceLifecycleService.ts | 28 | UPDATE | invoices | public | supabase | Direct | archiveInvoice |
| 7 | src/modules/invoices/services/invoiceLifecycleService.ts | 72 | DELETE | invoices | public | supabase | Direct | deleteInvoice |
| 8 | src/modules/invoices/services/invoiceLifecycleService.ts | 117 | UPDATE | invoices | public | supabase | Direct | changeInvoiceStatus |
| 9 | src/modules/invoices/services/invoiceStatusService.ts | 20 | UPDATE | invoices | public | supabase | Direct | updateInvoiceStatus |
| 10 | src/modules/invoices/services/invoiceAdvanceService.ts | 64 | UPDATE | invoices | public | supabase | Direct | persistParentConfig (custom_fields) |
| 11 | src/modules/invoices/repositories/paymentRepository.ts | 33 | INSERT | payments | public | supabase | Direct | insertPayment |
| 12 | src/modules/invoices/repositories/paymentRepository.ts | 75 | UPDATE | invoices | public | supabase | Direct | updateInvoiceStatus |
| 13 | src/modules/invoices/repositories/paymentRepository.ts | 99 | UPDATE | payments | public | supabase | Direct | voidPayment |
| 14 | src/modules/invoices/repositories/paymentRepository.ts | 129 | UPDATE | payments | public | supabase | Direct | updatePaymentAttachments |
| 15 | src/modules/invoices/repositories/paymentRepository.ts | 149 | UPDATE | invoices | public | supabase | Direct | syncInvoiceStatusFromFinancials |
| 16 | src/modules/invoices/repositories/invoiceChildDocRepository.ts | 36 | UPDATE | csrs | public | supabase | Direct | linkCsrToInvoice |
| 17 | src/modules/invoices/repositories/invoiceChildDocRepository.ts | 45 | UPDATE | waybills | public | supabase | Direct | linkWaybillToInvoice |
| 18 | src/modules/invoices/services/paymentService.ts | 160 | INSERT | receipts | public | supabase | Direct | auto receipt; withUniqueRetry |
| 19 | src/domain/receipt/receiptRepository.ts | 16 | INSERT | receipts | public | supabase | Direct | insertReceipt |
| 20 | src/domain/receipt/receiptRepository.ts | 99 | UPDATE | receipts | public | supabase | Direct | voidReceipt |
| 21 | src/pages/Invoices.tsx | 135 | UPDATE | invoices | public | supabase | Direct | archive from list |
| 22 | src/pages/Invoices.tsx | 155-156 | DELETE | invoice_items + invoices | public | supabase | Direct | delete from list |
| 23 | src/pages/Invoices.tsx | 231, 234 | UPDATE | csrs / waybills | public | supabase | Direct | attach existing doc |
| 24 | src/pages/viewQuotationActions.ts | 204 | INSERT | invoice_items | public | supabase | Direct | convertQuotationToInvoice items |
| 25 | src/pages/viewQuotationActions.ts | ~190-230 | INSERT + UPDATE | invoices + quotations | public | supabase | Direct | convertQuotationToInvoice |
| 26 | src/pages/viewInvoiceActions.ts | 169, 188 | UPDATE | invoices | public | supabase | Direct | custom fields toggle/save |
| 27 | src/components/document-view/invoice/useInvoiceActions.ts | 171, 186 | UPDATE | invoices | public | supabase | Direct | custom fields toggle/save |
| 28 | src/components/batch/BatchActionFooter.tsx | 107-160 | UPDATE/DELETE | invoices | public | supabase | Direct | batch mark-paid/unpaid/archive/delete |
| 29 | api/upload-payment-attachment.ts | 158-174 | SELECT + UPDATE | payments | public | service-role admin client | Direct (server) | attachment upload; serverless |
| 30 | api/edit-payment-caption.ts | 45 | SELECT (writes Telegram, not DB) | payments | public | service-role admin client | Indirect | caption edit via Telegram |
| 31 | src/lib/audit.ts | ~75+ | RPC | activity_events / audit_logs | public | supabase.rpc | Indirect | recordAuditLog + event RPCs |
| 32 | src/modules/invoices/services/invoiceConversionService.ts | 75 | RPC | (undefined) | — | supabase.rpc | Indirect | revert_invoice_to_quotation_transaction — NOT in migrations |

Out-of-scope tools (not production paths, documented for completeness):
`tools/imported-documents/repairImportedDocuments.ts` (156-376),
`scratch/import_invoices.ts` (47-154).

Every production write uses the **public schema**. Schema classification:
- public: all 32 rows above
- tenant: none
- dynamically determined: none
- unknown/not statically determinable: row 32 (RPC target tables unknown)

---

## B. Caller Chains

| Write site | Caller chain | Client acquisition | Entity/tenant context |
|---|---|---|---|
| useInvoiceSave persist | InvoiceFormPage.tsx → useInvoiceSave → useDocumentSave.save() → strategy.persist → supabase.from('invoices') | import { supabase } from '../supabase' | none; no tenantClient |
| useInvoiceSave afterSave | same chain → afterSave → delete/insert invoice_items → audit RPC | global supabase | none |
| paymentRepository.insertPayment | InvoiceRecordPaymentSheet → recordInvoicePayment(payload, tenantClient) → insertPayment | global supabase (tenantClient only used for settings/clients reads) | invoiceId only |
| paymentRepository void/status | useInvoiceMutations.confirmVoidPayment → voidInvoicePayment → repositoryVoidPayment + syncStatus | global supabase | invoiceId/paymentId |
| invoiceLifecycleService | useInvoiceMutations → archiveInvoice/deleteInvoice/changeInvoiceStatus | global supabase | invoiceId |
| invoiceChildDocRepository | useInvoiceMutations.handleAttachExisting / Invoices.tsx handleAttachExisting → attachChildDocument | global supabase | invoiceId + childId |
| invoiceAdvanceService | InvoiceAdvanceSheet → createOrUpdateAdvance / deleteAdvance | global supabase | parentId |
| viewInvoiceActions / useInvoiceActions | Invoice view action sheet → custom fields save | global supabase | invoice.id |
| convertQuotationToInvoice | Quotation view action → viewQuotationActions.ts | global supabase | quotation id; writes invoice+items+quotation |
| revertInvoiceToQuotationService | useInvoiceMutations.handleConvertToQuote → supabase.rpc('revert_invoice_to_quotation_transaction') | global supabase | invoice.id |
| api/upload-payment-attachment | recordInvoicePayment → fetch('/api/upload-payment-attachment') | service-role admin client (server) | paymentId, invoiceNumber |

Findings:
- **Every caller chain resolves to the global public client.** No caller passes
  tenantClient into invoice table writes.
- `recordInvoicePayment` is the only invoice-flow function that receives
  `tenantClient` (Phase 2), but only for `settings`/`clients` reads — payment and
  receipt writes remain public.
- No wrapper, middleware, or interceptor sits between callers and the DB except
  `withUniqueRetry` (number-collision retry) and `useDocumentSave` orchestration.
- No caller obtains entity context at runtime for writes; entity context exists
  only in `EntityProvider`/`useEntity()`.

---

## C. Database RPC and Server-Side Write Paths

Invoice-related RPCs invoked from the frontend:

| RPC | Frontend call site | Function schema | Writes | Tables | Public/tenant | SECURITY DEFINER | search_path | Notes |
|---|---|---|---|---|---|---|---|---|
| record_audit_log | src/lib/audit.ts recordAuditLog | public | INSERT | audit_logs | public | YES | 'public' | Generic audit diff writer |
| record_activity_event | src/lib/audit.ts (recordPaymentRecorded, etc.) | public | INSERT | activity_events | public | YES | 'public' | Whitelist: entity_type in (invoice, quotation, project, csr, waybill); event_type incl. PAYMENT_VOIDED |
| record_invoice_created | src/lib/audit.ts recordInvoiceCreated | public | INSERT (via record_activity_event) | activity_events | public | YES | 'public' | Reads public.invoices first |
| record_invoice_status_changed | audit.ts | public | INSERT | activity_events | public | YES | 'public' | Reads public.invoices |
| record_payment_recorded | audit.ts / paymentService | public | INSERT | activity_events | public | YES | 'public' | Reads public.invoices; enriched metadata (20260705000000) |
| record_payment_voided | audit.ts recordPaymentVoided | public | INSERT | activity_events | public | YES | 'public' | 20260703000000; reads public.invoices |
| record_payment_attachment_uploaded | audit.ts (unused? defined) | public | INSERT | activity_events | public | YES | 'public' | 20260705100000 |
| record_quotation_linked / record_invoice_created | viewQuotationActions.ts | public | INSERT | activity_events | public | YES | 'public' | After quotation→invoice conversion |
| revert_invoice_to_quotation_transaction | invoiceConversionService.ts:75 | **NOT DEFINED in repo migrations** | unknown | unknown | unknown | unknown | unknown | BLOCKER: frontend RPC has no migration definition |

Also in migrations (no current frontend caller found):
- `record_csr_created`, `record_csr_status_changed`, `record_csr_linked`,
  `record_waybill_created`, `record_waybill_status_changed`
  (20260703100001) — callable, used via audit.ts helpers.
- `record_letter_*` (20260710100000) — letters domain.
- `generate_invoice_notifications`, `resolve_invoice_notifications`
  (20260520090007) — notification writer; not frontend-invoked.
- `get_entity_provisioning_status` (20260730000000) — member read RPC, no writes.

Critical RPC facts:
- All audit RPCs are **`SET search_path TO 'public'` and reference
  `public.invoices` explicitly** — they cannot read tenant invoices. Phase 3
  tenant writes would make these RPCs raise "Invoice not found".
- No RPC operates on tenant data. Schema names are hardcoded `public`.
- `record_activity_event` whitelists only
  ('invoice','quotation','project','csr','waybill'); receipts audit uses
  `recordAuditLog` instead.

---

## D. RLS and Authorization

### Public schema (invoice tables)

From 20260520090003_invoices.sql:
- `invoices`: `allow_authenticated_read_invoices` (SELECT), `approved_users_only_invoices` (FOR ALL via profiles.is_approved), `invoices_authenticated_select/delete/update` — **no explicit INSERT policy other than the approved_users FOR ALL**.
- `invoice_items`: `approved_users_only_invoice_items` (FOR ALL), `invoice_items_authenticated_select/delete/update`.
- `payments`: `payments_authenticated_select/delete/update` — **no INSERT policy defined** in the migration (payment writes succeed today only if another policy exists live — requires verification).
- `wht_receipts`: `wht_receipts_authenticated_select/delete/update`.

### Tenant schema (provisioning engine)

`_prov_install_rls` installs, per cloned table, four policies
(SELECT TO public; INSERT/UPDATE/DELETE TO authenticated) all calling
`has_entity_permission(p_entity_id, auth.uid(), resource, action)`.

Resource mapping (`_prov_table_to_resource`): invoices→`invoice`,
payments→`payment`, clients→`client`, settings→`setting`,
signatories→`signatory`, bank_accounts→`bank_account`,
csrs→`csr`, waybills→`waybill`, tax_settings→`tax_setting`,
receipts→`receipt`, letters→`letter`, boqs→`boq`, rfqs→`rfq`.

Actions used by the engine: `view`, `create`, `edit`, `delete`.

### Required permissions for tenant invoice writes

- INSERT invoice → `has_entity_permission(..., 'invoice', 'create')`
- UPDATE invoice → `has_entity_permission(..., 'invoice', 'edit')`
- DELETE invoice → `has_entity_permission(..., 'invoice', 'delete')`
- SELECT invoice → `has_entity_permission(..., 'invoice', 'view')`
- Same set for `payment` resource.

Whether the real BIGDROPS entity has these rows:
**Not verified — requires live/database verification.** (Phase 2 confirmed only
`client/view` and `setting/view` exist for the real entity.)

`has_entity_permission()` supports wildcard resource/action ('*'). No new
authorization frontend checks were introduced (Phase 2 scope rule).

---

## E. Existing Data and Migration Compatibility

- Tenant invoice tables are created by **cloning public tables** via
  `_prov_clone_table` (`CREATE TABLE ... LIKE ... INCLUDING ALL`), then FKs are
  dropped and re-added within the tenant schema.
- **Missing from the template list**: `invoice_items`, `wht_receipts`,
  `activity_events`, `audit_logs`, and all views (`invoice_financials_v`, etc.).
  Confirmed by reading `_prov_get_template_tables()` — it contains only:
  clients, settings, signatories, bank_accounts, projects, quotations, invoices,
  payments, csrs, waybills, tax_settings, receipts, letters, boqs, rfqs.
- Tenant tables are initially empty (no data copy exists in any migration).
- No cross-schema read/write mechanism exists. No provisioning step copies
  invoice data.
- Existing invoices, invoice_items, payments, receipts, wht_receipts remain in
  **public** after any Phase 3 write migration unless explicitly migrated.
- `invoices.id` and `invoice_items.id` use `gen_random_uuid()` defaults (not
  sequences); numbering is app-side via `getNextInvoiceNumber()`.
- Invoice IDs are referenced by `payments.invoice_id`, `wht_receipts`,
  `receipts.invoice_id`, `csrs.linked_invoice_id`, `waybills.invoice_id`,
  `project_financials_v`, `item_price_summary_v`, `v_last_invoice_activity`,
  and `quotation_items` conversion trails in `custom_fields`.
- Documented strategy: **not established in the repository**. No doc states
  whether Phase 3 is write-only, write+data migration, or dual-read/dual-write.
  This is a blocker for scope definition.

---

## F. Read-After-Write Consistency

Post-write behavior per flow:

- Save (useInvoiceSave): persist → afterSave → `recordAuditLog` → navigate to
  `/invoices/{id}` → InvoiceWorkspace fetches via `useInvoiceDetailData.js`
  which reads `supabase.from('invoices')` (line 69), `payments` (104, 110),
  `invoice_items` (144) — all **public**.
- Record payment: insert payment → fetch `invoice_financials_v` (public view) →
  update invoices.status → audit → insert receipt → fetch receipt. Refresh reads
  public.
- List (Invoices.tsx): `DocumentQueryContext` → `moduleAdapters.ts` invoices
  fetcher reads `supabase.from("invoices")` with embedded `payments(...)` select
  (line 127-129) + list cache `bd:list:invoices:v1:all`.
- Quotation→invoice conversion: inserts invoice+items, updates quotation, then
  audits, then navigates to invoice detail (public reads).

Cross-schema inconsistency risk: **high**. Every write→tenant with read→public
would produce stale or missing UI. Phase 3 must move read paths in lockstep with
writes, or the source of truth splits.

---

## G. Transaction Boundaries and Partial-Write Risk

All invoice mutations are **multiple independent Supabase requests** — no RPC
transactions except the (undefined) revert-to-quotation RPC.

| Flow | Steps | Atomicity | Partial-write risk |
|---|---|---|---|
| Save invoice (create) | insert invoice → insert items → audit | none | invoice saved, items fail → orphan invoice |
| Save invoice (edit) | update invoice → delete items → insert items → audit | none | items replaced but invoice update fails → drift |
| Record payment | insert payment → update status → audit → WHT draft → insert receipt | none | payment persisted even if receipt/audit fail (errors are caught/logged) |
| Delete invoice | delete items → delete invoice | none | items deleted, invoice delete fails |
| Archive | update archived_at | single | low |
| Convert quotation | insert invoice → insert items → update quotation → audit | none | invoice created, quotation not marked converted |
| Batch actions | single update/delete per call | single statement per id-set | low per call |

None of these have rollback logic. Client-side sequential writes dominate; this
must be addressed before or during Phase 3 (e.g., move composite flows into
transactional RPCs).

---

## H. Prevention of Accidental Public Writes

Global-client availability in invoice code:

- `import { supabase } from '@/supabase'` appears in: useInvoiceSave.ts,
  useInvoiceMutations.ts, invoiceLifecycleService.ts, invoiceStatusService.ts,
  invoiceAdvanceService.ts, paymentService.ts, paymentRepository.ts,
  invoiceChildDocRepository.ts, receiptRepository.ts, invoiceService.ts,
  Invoices.tsx, viewInvoiceActions.ts, useInvoiceActions.ts, BatchActionFooter.tsx,
  viewQuotationActions.ts, invoiceConversionService.ts, src/lib/audit.ts.
- `api/upload-payment-attachment.ts` and `api/edit-payment-caption.ts` create a
  **service-role admin client** on the server and operate on the public schema.

Classification:
- **Legacy access Phase 3 should eliminate**: all 32 production write sites
  above.
- **Genuinely global (must stay public)**: activity_events / audit_logs tables
  (audit RPCs), profiles, workspaces, entities, entity_permissions,
  platform_operators, telegram_topics, item_catalog (shared catalog) — and the
  settings seed row for the entity (public.entities already seeded; tenant
  settings are the tenant's copy).
- **Ambiguous — requires architectural decision**: item_catalog shared vs
  per-entity; notifications; activity_events tenant-scoping (the views
  `v_last_*` join public activity_events to public invoices).

---

## I. Dependencies and Blockers

Must exist before Phase 3 implementation:

| Dependency | Status | Evidence |
|---|---|---|
| EntityProvider / useEntity | READY | src/lib/tenant/contexts.tsx (verified in Phase 2) |
| Tenant Client | READY | src/lib/tenantClient.ts `createTenantClient()` |
| Tenant schema resolution | READY | `entity_{workspace}_{entity}`, gated on provisioning 'ready' |
| Tenant `invoices` + `payments` tables | READY | in `_prov_get_template_tables()` |
| Tenant `invoice_items` table | **MISSING** | not in template list — BLOCKER |
| Tenant `wht_receipts` | **MISSING** | not in template list |
| Tenant `invoice_financials_v` view | **MISSING** | views not cloned — BLOCKER |
| Tenant `activity_events`/`audit_logs` | **MISSING** | not in template list |
| Invoice RLS policies (tenant) | READY | `_prov_install_rls` uses has_entity_permission |
| entity_permissions rows (invoice/create, edit, delete) | **Not verified — requires live/database verification** |
| Invoice numbering | Depends on reading existing invoice_number rows | reads must follow the write schema or numbering collides |
| Settings dependencies | READY | tenant settings now seeded (20260809000000) |
| Invoice items dependencies | blocked by #4 |
| Tax/payment dependencies | payments provisioned; wht_receipts not |
| Linked-document dependencies | csrs/waybills provisioned |
| RPC dependencies | audit RPCs hardcode public — must be re-pointed or duplicated |
| revert_invoice_to_quotation_transaction | **MISSING from repo** — verify live |
| Triggers/sequences | `trg_invoices_set_updated_at`, `trg_invoices_stamp_ownership` exist on public; cloned via LIKE INCLUDING ALL → triggers are NOT copied by LIKE — tenant invoices lack these triggers (BLOCKER nuance) |
| Audit requirements | activity/audit tables not tenant-provisioned |

Note on triggers: `CREATE TABLE ... (LIKE public.invoices INCLUDING ALL)` copies
indexes/constraints but **not triggers**. The tenant `invoices` table therefore
lacks `trg_invoices_set_updated_at` and `trg_invoices_stamp_ownership` unless
explicitly recreated.

---

## J. Recommended Implementation Order

Given blockers, the following order is provisional (evidence-based, not a
commitment):

Preconditions (backend/database):
1. Add `invoice_items`, `wht_receipts` to `_prov_get_template_tables()` (new
   migration + `CREATE OR REPLACE`).
2. Recreate invoice triggers (`set_row_updated_at`, `stamp_row_ownership`) in
   tenant schemas during provisioning.
3. Define a tenant-scoped `invoice_financials_v` (or a tenant RPC computing
   status) — the view is not cloned.
4. Decide and document the Phase 3 strategy (write-only vs write+data
   migration vs dual-read). **Not currently documented — must be resolved.**
5. Re-point or duplicate invoice audit RPCs (or seed tenant activity tables)
   since current RPCs read `public.invoices`.
6. Verify/seed `entity_permissions` rows for `invoice/*`, `payment/*` actions.
7. Verify `revert_invoice_to_quotation_transaction` exists in the live DB.

First frontend write path (candidate): `useInvoiceSave.persist` + `afterSave`
(create flow) with `tenantClient`; its reads (`useInvoiceDetailData.js`,
`moduleAdapters.ts`) migrate in the same change to avoid stale UI.

Related write paths: payments, lifecycle (archive/delete/status), advance,
child-doc links, batch actions, conversion flows, serverless attachment API.

Read-after-write adjustments: migrate list adapter + detail hook reads with each
write migration; keep cache keys schema-scoped.

Legacy public-write removal: delete or guard the 32 public write sites after
tenant writes are authoritative.

Verification: `bun run typecheck`, `bun run audit:load`, staging smoke tests.
Production rollout: per-entity flag or phased entity rollout.

---

## K. Phase 3 Readiness

**BLOCKED — FURTHER INVESTIGATION REQUIRED.**

Exact blockers:
1. `invoice_items` (and `wht_receipts`) not in provisioning template list —
   tenant writes to these would fail with "relation does not exist".
2. `invoice_financials_v` not cloned — status computation reads would break.
3. Invoice audit RPCs hardcode `public` schema and read `public.invoices` —
   audit would break for tenant-written invoices.
4. Required `entity_permissions` rows for invoice create/edit/delete are
   unverifiable statically.
5. `revert_invoice_to_quotation_transaction` RPC has no repo definition.
6. Phase 3 strategy (write-only vs data migration vs dual) is undocumented.
7. Tenant `invoices` clones lack updated_at/ownership triggers (LIKE does not
   copy triggers).

These must be resolved by the architecture council before the Phase 3
implementation prompt is constructed.

---

## Unverified Items

- `entity_permissions` rows for invoice/payment actions on the real entity:
  Not verified — requires live/database verification.
- Payments INSERT policy effectiveness on public schema (no INSERT policy in
  the migration; writes succeed today, implying live policy drift):
  Not verified — requires live/database verification.
- Existence/behavior of `revert_invoice_to_quotation_transaction` in the live DB:
  Not verified — requires live/database verification.
- Whether tenant `invoices`/`payments` tables in production were cloned before
  or after the FK/trigger changes: Not verified — requires live/database
  verification.
- Live presence of any additional public RLS policies added outside migrations:
  Not verified — requires live/database verification.

## Files Inspected

Migrations:
- 20260520090000_core_tables.sql, 20260520090001_projects.sql,
  20260520090002_quotations.sql, 20260520090003_invoices.sql,
  20260520090008_audit_activity.sql, 20260520090009_tax.sql,
  20260520090010_views.sql, 20260611000001_document_prefixes.sql,
  20260703000000_record_payment_voided.sql,
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

Source (src/):
- src/supabase.ts, src/lib/tenant/contexts.tsx, src/lib/tenantClient.ts,
  src/lib/audit.ts, src/hooks/useInvoiceSave.ts, src/hooks/useDocumentSave.ts,
  src/hooks/useInvoiceMutations.ts, src/modules/invoices/services/paymentService.ts,
  src/modules/invoices/services/invoiceLifecycleService.ts,
  src/modules/invoices/services/invoiceStatusService.ts,
  src/modules/invoices/services/invoiceAdvanceService.ts,
  src/modules/invoices/services/invoiceConversionService.ts,
  src/modules/invoices/services/invoiceService.ts,
  src/modules/invoices/repositories/paymentRepository.ts,
  src/modules/invoices/repositories/invoiceChildDocRepository.ts,
  src/domain/receipt/receiptRepository.ts,
  src/pages/Invoices.tsx, src/pages/viewQuotationActions.ts,
  src/pages/viewInvoiceActions.ts, src/pages/ViewWaybill.tsx,
  src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx,
  src/components/document-view/invoice/useInvoiceActions.ts,
  src/components/batch/BatchActionFooter.tsx,
  src/context/DocumentQueryContext.tsx, src/config/moduleAdapters.ts,
  src/hooks/useInvoiceDetailData.js

Server/API:
- api/upload-payment-attachment.ts, api/edit-payment-caption.ts

Tooling (not production):
- tools/imported-documents/repairImportedDocuments.ts,
  scratch/import_invoices.ts, query_audit.mjs

Docs cross-referenced:
- docs/Reports/invoice/view-invoice-inventory.md,
  docs/Reports/Audit-trail/third-audit-trail-financial-lineage.md,
  docs/Reports/GENERAL/payment-void-audit-trace.md
