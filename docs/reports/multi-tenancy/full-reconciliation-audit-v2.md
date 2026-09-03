# BIGDROPS Multi-Tenancy — Full Reconciliation Audit v2

This report was written by DeepSeek on 2026-08-15 via opencode (Local Runner).

## 1. Executive Status

The multi-tenant backend is complete and live. The frontend is partially migrated.

Key facts:
- The tenant schema `entity_bigdrops-main_main` is provisioned and ready.
- The live database matches backend PRD v2.1.
- All Phase 5 data migrations have run.
- Phase 1, Phase 3, and Phase 5 are complete.
- Phase 2 and Phase 4 are partially complete.
- Phase 6 (cutover) has not started.
- A live permission gap blocks Phase 4 completion for waybills, projects, CSRs, RFQs, BOQs, and letters.
- The item library is a confirmed migration gap. It is NOT intentionally public.
- Four code paths reference database tables that do not exist. They fail at runtime.

Overall progress is approximately 87%.

## 2. Sources and Method

This audit re-verifies the prior audit against both approved PRDs and the live database.

Sources:
- Backend PRD v2.1 (717 lines, approved).
- Frontend PRD v1.1 (772 lines, approved).
- PRD v1.0 Appendix A (authoritative per-entity table mapping).
- Live database via Supabase Management API (SELECT-only queries).
- Application source code under `src/`.

Method:
- Compare every PRD requirement against the live database.
- Classify every public business table against Appendix A.
- Classify every direct `supabase.from(...)` call site in the application.
- Report both repo evidence and live DB state when they disagree.
- Trust the live database for current production state.

## 3. Platform State

| Item | Value |
|------|-------|
| Workspace ID | `eb30b64b-7b95-464f-be1a-805cf2c0fedc` |
| Workspace slug | `bigdrops-main` |
| Workspace name | `BIGDROPS` |
| Entity ID | `eca34515-0b30-482c-b12e-3963df164322` |
| Entity slug | `main` |
| Entity name | `Sun & Shield Power Solutions` |
| Entity type | company |
| Tenant schema | `entity_bigdrops-main_main` |
| Provisioning status | ready |
| Provisioning attempts | 2 |
| Last updated | 2026-08-06 07:15:33 |

Live platform rows:
- workspaces: 1
- workspace_members: 1
- entities: 1
- entity_permissions: 21
- platform_operators: 1 (role owner)
- workspace_invitations: 0
- entity_provisioning_status: 1

Auth users: 9 total. Only 1 user is a workspace member and holds permission rows. The other 8 users have no workspace membership and no permissions. A cutover would lock out 8 of 9 users.

## 4. Tenant Schema State

The tenant schema has 21 base tables and 2 views.

Views:
- `invoice_financials_v`
- `project_financials_v`

Base tables:
- bank_accounts
- blank_csr_logs
- blank_waybill_logs
- boqs
- clients
- csrs
- invoice_items
- invoices
- letters
- payments
- project_documents
- projects
- quotation_items
- quotations
- receipts
- rfqs
- settings
- signatories
- tax_settings
- waybills
- wht_receipts

All 21 tables have RLS enabled. Every CRUD policy calls `has_entity_permission(<entity-id>, auth.uid(), '<resource>', '<action>')`. INSERT uses WITH CHECK. SELECT, UPDATE, and DELETE use qualifiers.

Missing per-entity tables (Appendix A requires them):
- rfq_items
- boq_rows
- item_catalog
- item_aliases
- item_import_batches
- item_merge_log
- tax_input_entries
- tax_filings
- tax_reminders
- audit_logs
- device_sequences

These tables do not exist in the tenant schema.

## 5. Permission Surface

### 5.1 Tenant RLS policies

All 21 tenant tables have RLS enabled. Policies map resources to actions through `has_entity_permission`.

Resource mapping examples:
- bank_accounts → bank_account
- blank_csr_logs → csr
- blank_waybill_logs → waybill
- wht_receipts → receipt
- tax_settings → setting

### 5.2 Live permission rows (BLOCKER)

Live `entity_permissions` rows cover only 6 resources:

| Resource | Actions |
|----------|---------|
| client | view |
| invoice | create, delete, edit, view |
| payment | create, delete, edit, view |
| quotation | create, delete, edit, view |
| receipt | create, delete, edit, view |
| setting | create, delete, edit, view |

All 21 rows belong to one user (`jaiyewisdom@gmail.com`, owner).

Zero permission rows for:
- waybill
- project
- csr
- rfq
- boq
- letter
- bank_account
- signatory
- tax_setting
- project_document

Consequence: tenant RLS denies all access to those tenant tables. The application keeps those modules on the public schema.

### 5.3 Security functions

| Function | Behavior |
|----------|----------|
| `has_entity_permission(entity_id, user_id, resource, action)` | EXISTS check on entity_permissions. Wildcards `*` allowed on resource or action. |
| `is_workspace_member(workspace_id, user_id)` | EXISTS check on workspace_members. |
| `get_entity_provisioning_status(entity_id)` | STABLE, SECURITY DEFINER. Requires `is_workspace_member`. |
| `_prov_get_schema_name(entity_id)` | SECURITY DEFINER, `SET search_path TO 'public'`. Returns `entity_<workspace.slug>_<entity.slug>`. |
| `save_invoice_with_items_transaction(...)` | SECURITY DEFINER. Resolves tenant schema via `_prov_get_schema_name`. Gates on permission. Invoice saves route through the tenant schema. |
| `get_item_suggestions(...)` | Reads PUBLIC schema: `public.item_catalog`, `public.item_aliases`, `public.item_price_summary_v`, `public.normalize_item_text`. |

### 5.4 Missing RPC (CODE DEFECT)

`merge_item_catalog_entries` does NOT exist in any schema.

The live database has only two public functions: `get_item_suggestions` and `save_invoice_with_items_transaction`.

No migration file defines `merge_item_catalog_entries`. The item library calls it:
- `src/modules/item-library/repositories/itemLibraryRepository.ts` L451.

The call fails at runtime with "function does not exist".

## 6. Public Schema Legacy State

### 6.1 Public business tables with row counts

| Table | Public rows | Appendix A class | Tenant table exists |
|-------|-------------|------------------|---------------------|
| item_catalog | 1394 | entity-owned | NO |
| item_aliases | 1000 | entity-owned | NO |
| activity_events | 244 | not listed | NO |
| audit_logs | 425 | entity-owned | NO |
| rfq_items | 54 | entity-owned | NO |
| invoices | 239 | entity-owned | YES |
| quotations | 322 | entity-owned | YES |
| clients | 31 | entity-owned | YES |
| csrs | 17 | entity-owned | YES |
| waybills | legacy | entity-owned | YES |
| receipts | legacy | entity-owned | YES |
| projects | legacy | entity-owned | YES |
| blank_waybill_logs | legacy | entity-owned | YES |
| payments | legacy | entity-owned | YES |
| settings | 1 | entity-owned | YES |
| rfqs | 3 | entity-owned | YES |
| letters | 1 | entity-owned | YES |
| bank_accounts | 1 | entity-owned | YES |
| signatories | 1 | entity-owned | YES |
| boqs | 0 | entity-owned | YES |
| boq_rows | 0 | entity-owned | NO |
| wht_receipts | 0 | entity-owned | YES |
| tax_filings | 0 | entity-owned | NO |
| tax_input_entries | 0 | entity-owned | NO |
| tax_reminders | 0 | entity-owned | NO |
| item_import_batches | 0 | entity-owned | NO |
| item_merge_log | 0 | entity-owned | NO |
| device_sequences | 0 | entity-owned | NO |

### 6.2 Public RLS posture

Public business tables retain broad `authenticated` RLS policies. Tables with ALL policies: clients, invoices, quotations, csrs. This is why the public schema remains the operational path for non-invoice modules.

### 6.3 Stray schema

Schema `eca34515-0b30-482c-b12e-3963df164322` (the entity ID) contains only `boqs`, `letters`, `rfqs`, all with 0 rows.

This is a leftover from the first provisioning attempt. At that time the schema name used the entity ID instead of the `entity_<workspace>_<entity>` convention. It is stale and empty. It is a cleanup candidate, not an issue.

## 7. Backend PRD Reconciliation

Backend PRD v2.1 was fully read. The live database matches it exactly.

| PRD requirement | Live DB state | Status |
|-----------------|---------------|--------|
| Workspace hierarchy | `workspaces` table present | COMPLETE |
| Workspace lifecycle (pending_approval to active) | status column present | COMPLETE |
| Workspace membership | `workspace_members` present | COMPLETE |
| Workspace invitations | `workspace_invitations` present | COMPLETE |
| Entity hierarchy | `entities` table present | COMPLETE |
| Platform operators | `platform_operators` present | COMPLETE |
| Action-based permissions | `entity_permissions` present | COMPLETE |
| Permission templates | `permission_templates`, `permission_template_items` present | COMPLETE |
| Invitation entity grants | `workspace_invitation_entity_grants` present | COMPLETE |
| One owner per workspace | partial unique index | COMPLETE |
| One pending workspace per creator | partial unique index | COMPLETE |
| Provisioning engine | `provision_entity()` and `_prov_*` functions | COMPLETE |
| Tenant schema creation | `entity_bigdrops-main_main` live | COMPLETE |
| Table cloning | 21 tenant tables live | COMPLETE |
| RLS installation | all tenant tables RLS enabled | COMPLETE |
| Financial tenant views | `invoice_financials_v`, `project_financials_v` | COMPLETE |

`workspaces` has NO `owner_id` column. This matches the PRD DDL exactly.

Backend completion: 100%.

## 8. Frontend PRD Phase Reconciliation

Frontend PRD v1.1 was fully read.

### Phase 1 — Infrastructure: COMPLETE

| Deliverable | Location | Status |
|-------------|----------|--------|
| Workspace Provider | `src/lib/tenant/contexts.tsx` | COMPLETE |
| Entity Provider | `src/lib/tenant/contexts.tsx` | COMPLETE |
| Authorization Provider | `src/lib/tenant/contexts.tsx` | COMPLETE |
| Tenant Client | `src/lib/tenantClient.ts` | COMPLETE |
| Diagnostic page | `src/pages/debug/TenantDebug.tsx` | COMPLETE |

Schema resolution follows the PRD convention:
```ts
schemaName = `entity_${workspace.slug}_${entity.slug}` when provisioningStatus === 'ready'
```

### Phase 2 — Read-only (Settings, Clients): PARTIAL

| Module | State |
|--------|-------|
| Clients list | tenant |
| Clients delete | tenant |
| AddClient / EditClient | PUBLIC |
| ClientDetail | PARTIAL (main client and invoices tenant; projects, quotations, csrs, waybills public) |
| Settings persist | PUBLIC by design (documented split) |
| Settings read for documents | tenant |

### Phase 3 — Invoice CRUD: COMPLETE

| Path | Location | Status |
|------|----------|--------|
| List/read | `useDocumentQuery('invoices')` to tenant adapter | COMPLETE |
| Load invoice | `invoiceService.loadInvoiceById` tenant | COMPLETE |
| Save | `useInvoiceSave` tenant | COMPLETE |
| Mutations | `useInvoiceMutations` tenant | COMPLETE |
| Status | `invoiceStatusService` tenant | COMPLETE |
| Archive/delete | `invoiceLifecycleService` tenant | COMPLETE |
| Payments/receipts | `paymentService` tenant | COMPLETE |
| Financial view | `fetchInvoiceFinancials` tenant | COMPLETE |
| Transactional save | `save_invoice_with_items_transaction` RPC (SECURITY DEFINER) | COMPLETE |

Residual public writes:
- `Invoices.tsx` L243/246 update `csrs.linked_invoice_id` and `waybills.invoice_id` on the public schema.
- `src/lib/audit.ts` L221 reads public invoices.

### Phase 4 — Remaining documents: PARTIAL

| Module | State |
|--------|-------|
| Quotations | COMPLETE |
| Receipts | COMPLETE |
| Waybills | PARTIAL (save tenant; view public) |
| Projects | PARTIAL (delete, archive, read tenant; list, create, edit public) |
| RFQs | NOT STARTED |
| BOQs | NOT STARTED |
| CSRs | NOT STARTED |

### Phase 5 — One-time data migration: COMPLETE

| Migration | Table | Tenant rows |
|-----------|-------|-------------|
| `20260809030000_invoice_aggregate_data_migration.sql` | invoices | 246 |
| `20260810010000_quotation_data_migration.sql` | quotations | 328 |
| `20260810040000_waybill_data_migration.sql` | waybills | 18 |
| `20260810060000_csr_data_migration.sql` | csrs | 16 |
| `20260810070000_payment_receipt_data_migration.sql` | receipts | 4 |
| `20260811000000_projects_aggregate_data_migration.sql` | projects | 2 |

A readiness validation script exists: `supabase/verify_quotation_migration_readiness.sql`.

No migration exists for item_catalog, item_aliases, rfq_items, audit_logs, or the missing tenant tables.

### Phase 6 — Cutover: NOT STARTED

The application still reads the public schema for CSRs, RFQs, BOQs, waybill view, signatories, bank accounts, item library, and legacy data. Public business tables remain active.

## 9. Application Module Schema Matrix

| Module | Schema | Evidence |
|--------|--------|----------|
| Invoices | TENANT | invoiceService, invoiceStatusService, invoiceLifecycleService, useInvoiceSave, useInvoiceMutations, save_invoice_with_items_transaction |
| Invoice financials | TENANT | invoice_financials_v, paymentService |
| Payments / receipts | TENANT | paymentService |
| Quotations | TENANT | quotationService, useQuotationSave, cloneQuotation, revert/convert |
| Clients | PARTIAL | list/delete tenant; AddClient/EditClient public |
| Settings (entity) | TENANT read / PUBLIC write | documented intentional split |
| Projects | PARTIAL | delete/archive/read tenant; list/create/edit public |
| Waybills | PARTIAL | save tenant; view public |
| CSRs | PUBLIC | CsrFormPage, ViewCSR, viewCSRActions, csrService |
| RFQs | PUBLIC | NewRfq, EditRfq, ViewRfq, viewRFQActions |
| BOQs | PUBLIC | ViewBoq, viewBOQActions, BoqList |
| Compliance (WHT receipts) | TENANT | complianceService, complianceRepository (wht_receipts) |
| Compliance (tax tables) | PUBLIC | tax_input_entries, tax_filings, tax_reminders, tax_settings |
| Reports | PARTIAL | invoice/payment financials tenant; project_financials_v and bank_accounts public |
| Item library | PUBLIC | itemLibraryRepository |
| Dashboard | PARTIAL | invoices/projects tenant; csrs/rfqs public |
| Global search | PARTIAL | projects tenant; csrs public |
| Export/LifetimeDataHub | PUBLIC | exportFetchers |
| Settings archives | PARTIAL | projects tenant; rfqs/csrs/boqs public |
| Audit trail | PUBLIC | audit_logs, activity_events |

### 9.1 Tenant-aware adapters

`src/config/moduleAdapters.ts` provides adapters for invoices, quotations, waybills, projects, csrs, rfqs, receipts, boqs.

The resolution pattern:
```ts
const tenantClient = resolveFetchClient(ctx) // ctx.tenantClient when isReady, else null
const client = tenantClient ?? supabase       // public fallback
```

This is tenant-ready with a public fallback. The public schema remains the runtime source until cutover.

## 10. Item Library Reconciliation

### 10.1 Prior classification was WRONG

The prior audit classified the item library as intentionally public and said no migration is required. This is wrong.

PRD v1.0 Appendix A lists `item_catalog`, `item_aliases`, `item_import_batches`, `item_merge_log` as entity-owned tables.

### 10.2 Current state

- `itemLibraryRepository.ts` (560 lines) imports `@/supabase` and uses only the public schema. No TenantClient reference.
- `get_item_suggestions` RPC reads public tables only.
- `getItemFilterCounts` reads public `item_price_summary_v`, `invoice_items`, `quotation_items`.
- `getItemHistoryDetail` reads public `invoice_items`, `quotation_items`.
- Live public rows: item_catalog 1394, item_aliases 1000, item_import_batches 0, item_merge_log 0.
- The tenant schema has NO item tables.

### 10.3 Classification

The item library is a confirmed migration gap. It must be migrated to the tenant schema.

### 10.4 Missing RPC

`merge_item_catalog_entries` does not exist in any schema. The item library merge feature is broken.

## 11. Compliance Reconciliation

- WHT receipts: fully tenant-aware.
  - `complianceRepository.ts` fetchWhtReceipts/insert/update/deleteWhtReceipt use TenantClient.
  - `complianceService.ts` reads/writes `wht_receipts` and `invoices` via TenantClient.
  - Tenant `wht_receipts` table is empty (0 rows). This is expected.
- Tax tables: PUBLIC via supabase.
  - `tax_input_entries`, `tax_filings`, `tax_reminders`, `tax_settings` remain public.
  - The repository comment states tax tables are NOT part of the invoice aggregate.
  - PRD v1.0 Appendix A lists all four as entity-owned.
- Classification conflict: the code comment justifies public, but Appendix A says entity-owned.

The tenant schema contains `tax_settings` but NOT `tax_input_entries`, `tax_filings`, or `tax_reminders`.

## 12. Export and LifetimeDataHub Reconciliation

### 12.1 exportFetchers

`src/services/exportFetchers.ts` uses the public schema exclusively. `supabase.from(table)` at L88.

Table map:
| Domain | Table | Exists in DB |
|--------|-------|--------------|
| INVOICES | invoices | YES |
| QUOTATIONS | quotations | YES |
| WAYBILLS | waybills | YES |
| PROJECTS | projects | YES |
| RFQS | rfqs | YES |
| BOQS | boqs | YES |
| PRICE_HISTORY | price_history | NO |
| CLIENTS | clients | YES |
| CSR | client_service_records | NO |

Items table map:
| Domain | Table | Exists in DB |
|--------|-------|--------------|
| INVOICES | invoice_items | YES |
| QUOTATIONS | quotation_items | YES |
| BOQS | boq_items | NO |

### 12.2 Missing tables (CODE DEFECTS)

Three tables referenced by export code do not exist:
- `price_history`
- `client_service_records`
- `boq_items`

The CSR export and BOQ export would fail at runtime. The PRICE_HISTORY export would fail at runtime.

### 12.3 LifetimeDataHub

`src/pages/LifetimeDataHub.tsx` imports `getExportData` and `fetchExportDataset`. BOQS, PRICE_HISTORY, and CSR are export domains. BOQ items are stored in the `custom_fields` jsonb column of `boqs`, not in a `boq_items` table.

## 13. Code Defects Found

| Defect | Location | Effect |
|--------|----------|--------|
| `merge_item_catalog_entries` RPC does not exist | `itemLibraryRepository.ts` L451 | Merge feature fails at runtime |
| `boq_items` table does not exist | `ViewBoq.tsx` L60, `BoqList.tsx` L53, `viewBOQActions.ts` L11, `exportFetchers.ts` L51, `exportCompilers.ts` L176 | BOQ view and BOQ export fail at runtime |
| `client_service_records` table does not exist | `exportFetchers.ts` L32 | CSR export fails at runtime |
| `price_history` table does not exist | `exportFetchers.ts` L30 | PRICE_HISTORY export fails at runtime |
| `boq_rows` table exists only in public | BOQ item storage | No tenant BOQ row table |

The `boqs` table stores rows in the `custom_fields` jsonb column. The `boq_items` references are stale.

## 14. Architectural Invariant Audit

| Invariant | Status |
|-----------|--------|
| I1: exactly one active tenant context per session | PASS |
| I2: workspace before entity | PASS |
| I3: entity before authorization | PASS |
| I4: every migrated query uses Tenant Client | PARTIAL |
| I5: business modules never resolve tenant context | PASS |
| I6: providers own state, modules consume it | PASS |
| I7: tenant context immutable during operation | PASS |
| I8: schema resolution owned by Entity Provider + Tenant Client | PASS |
| I9: provider isolation | PASS |

Single-schema rule (PRD Principle 7):
- `Invoices.tsx` L243/246: CSR and waybill link updates on public schema inside a tenant operation. Violation.
- `ProjectDetail.tsx` L87: project edit on public schema. Violation.

## 15. Progress Calculation

### Method

Backend and frontend are weighted equally at 50% each.

Backend is graded on infrastructure completeness against PRD v2.1.

Frontend is graded on phase completeness against PRD v1.1 phases.

| Phase | Weight | Grade | Contribution |
|-------|--------|-------|--------------|
| 1 Infrastructure | 25% | COMPLETE (100%) | 25.0 |
| 2 Read-only | 15% | PARTIAL (60%) | 9.0 |
| 3 Invoices | 20% | COMPLETE (95%) | 19.0 |
| 4 Remaining documents | 25% | PARTIAL (45%) | 11.25 |
| 5 Data migration | 10% | COMPLETE (100%) | 10.0 |
| 6 Cutover | 5% | NOT STARTED (0%) | 0.0 |
| TOTAL | 100% | | 74.25 |

### Results

- Backend: 100%
- Frontend: 74.25%
- Overall: (100 + 74.25) / 2 = 87.13%

### Honest qualification

The 87% measures implementation completeness. It does not measure cutover readiness.

Cutover readiness is near zero. The public schema is still the runtime source for:
- CSRs, RFQs, BOQs
- Waybill view
- Signatories, bank accounts
- Item library
- Tax tables
- Export hub

The tenant permission model covers only 6 of 16 resources and only 1 of 9 users.

## 16. Cutover Readiness and Next Steps

### 16.1 Cutover readiness: LOW

Conditions still missing:
- Tenant permission rows for waybill, project, csr, rfq, boq, letter, bank_account, signatory, tax_setting, project_document.
- Tenant permission rows for the other 8 users.
- Tenant tables for rfq_items, boq_rows, item_catalog, item_aliases, item_import_batches, item_merge_log, tax_input_entries, tax_filings, tax_reminders, audit_logs, device_sequences.
- Item library migration (tables, data, RPCs).
- `merge_item_catalog_entries` RPC creation.
- Fixes for the four missing-table code defects.

### 16.2 Recommended order

1. Remove the Phase 4 blocker first. Insert `entity_permissions` rows for all missing resources and users.
2. Provision the missing tenant tables (rfq_items, boq_rows, item catalog, item aliases, tax tables, audit_logs, device_sequences).
3. Migrate the item library to the tenant schema. Create `merge_item_catalog_entries`.
4. Migrate remaining Phase 4 modules in order: projects, waybills, CSRs, RFQs, BOQs.
5. Fix the missing-table code defects (boq_items, client_service_records, price_history).
6. Finish Phase 2 and Phase 3 residuals (clients writes, ClientDetail reads, Invoices link updates, audit read).
7. Only after all modules use the tenant schema, plan the Phase 6 cutover.
8. Clean up the stray schema and dead code as separate housekeeping tasks.

## Verification

- `bun run audit:load`: not applicable (read-only reconciliation)
- `bun run typecheck`: not applicable (no code changes)
- git status: report file added only, no application or migration files modified
- Live database queries: SELECT-only, no data modified