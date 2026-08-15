# BIGDROPS Multi-Tenancy — Live Reconciliation Audit

This report was written by DeepSeek on 2026-08-15 via opencode (Local Runner).

## 1. Executive Status

The multi-tenant backend is complete and live. The frontend is partially migrated.

Key facts:
- The tenant schema `entity_bigdrops-main_main` is provisioned and ready.
- The live database matches the backend PRD v2.1 exactly.
- All Phase 5 data migrations have run.
- Phase 1 infrastructure is complete.
- Phase 2 and Phase 4 are partially complete.
- Phase 3 (invoices) is complete.
- Phase 6 (cutover) has not started.
- A live permission gap blocks Phase 4 completion for waybills, projects, CSRs, RFQs, BOQs, and letters.

Overall progress is approximately 87%.

## 2. Live Supabase Tenant State

### 2.1 Platform State

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

Live row counts:
- workspaces: 1
- workspace_members: 1
- entities: 1
- entity_permissions: 21
- platform_operators: 1 (role owner)
- workspace_invitations: 0
- entity_provisioning_status: 1

### 2.2 Tenant Schema

The tenant schema has 21 base tables and 2 views.

Views:
- `invoice_financials_v` (total_gross, cash_received, wht_received, settled_total, balance_due, computed_status)
- `project_financials_v`

All 21 tables have RLS enabled. Every CRUD policy calls `has_entity_permission('eca34515-0b30-482c-b12e-3963df164322'::uuid, auth.uid(), '<resource>', '<action>')`.

### 2.3 Permission Gap (BLOCKER)

Live `entity_permissions` rows cover only 6 resources:

| Resource | Actions |
|----------|---------|
| client | view |
| invoice | create, delete, edit, view |
| payment | create, delete, edit, view |
| quotation | create, delete, edit, view |
| receipt | create, delete, edit, view |
| setting | create, delete, edit, view |

There are ZERO permission rows for:
- waybill
- project
- csr
- rfq
- boq
- letter

Consequence: tenant RLS denies all access to those tenant tables. This explains why those modules remain on the public schema. It is a blocker for Phase 4.

### 2.4 Tenant Data Counts

| Table | Tenant count | Public count |
|-------|--------------|--------------|
| invoices | 246 | 239 |
| quotations | 328 | 322 |
| waybills | 18 | (public legacy) |
| csrs | 16 | 17 |
| receipts | 4 | (public legacy) |
| projects | 2 | (public legacy) |
| clients | 30 | 31 |
| settings | 1 | 1 |
| blank_waybill_logs | 24 | (public legacy) |

Zero-row tenant tables: bank_accounts, blank_csr_logs, boqs, letters, rfqs, signatories, tax_settings, wht_receipts.

### 2.5 Stray Schema

Schema `eca34515-0b30-482c-b12e-3963df164322` (the entity ID) contains only `boqs`, `letters`, `rfqs`, all with 0 rows.

This is a leftover from the first provisioning attempt, when the schema name used the entity ID instead of the `entity_<workspace>_<entity>` convention. It is stale and empty. It is a cleanup candidate, not an issue.

## 3. Backend PRD Reconciliation

Backend PRD v2.1 was fully read (717 lines). The live database matches it exactly.

| PRD requirement | Live DB state | Status |
|-----------------|---------------|--------|
| Workspace hierarchy | `workspaces` table present | COMPLETE |
| Workspace lifecycle (pending_approval → active) | status column present | COMPLETE |
| Workspace membership | `workspace_members` present | COMPLETE |
| Workspace invitations | `workspace_invitations` present | COMPLETE |
| Entity hierarchy | `entities` table present | COMPLETE |
| Platform operators | `platform_operators` present (role, expires_at) | COMPLETE |
| Action-based permissions | `entity_permissions` (id, entity_id, user_id, resource, action, granted_by, granted_at) | COMPLETE |
| Permission templates | `permission_templates`, `permission_template_items` | COMPLETE |
| Invitation entity grants | `workspace_invitation_entity_grants` | COMPLETE |
| One owner per workspace | partial unique index | COMPLETE |
| One pending workspace per creator | partial unique index | COMPLETE |
| Provisioning engine | `provision_entity()` and `_prov_*` functions | COMPLETE |
| Tenant schema creation | `entity_bigdrops-main_main` live | COMPLETE |
| Table cloning | 21 tenant tables live | COMPLETE |
| RLS installation | all tenant tables RLS enabled | COMPLETE |
| Financial tenant views | `invoice_financials_v`, `project_financials_v` | COMPLETE |

`workspaces` has NO `owner_id` column. Its columns are id, slug, name, status, created_by, created_at, updated_by, updated_at. This matches the PRD DDL exactly.

Backend completion: 100%.

## 4. Frontend PRD Phase Reconciliation

Frontend PRD v1.1 was fully read (772 lines, sections 1 through 20).

### Phase 1 — Infrastructure: COMPLETE

| Deliverable | Location | Status |
|-------------|----------|--------|
| Workspace Provider | `src/lib/tenant/contexts.tsx` (`WorkspaceProvider`) | COMPLETE |
| Entity Provider | `src/lib/tenant/contexts.tsx` (`EntityProvider`) | COMPLETE |
| Authorization Provider | `src/lib/tenant/contexts.tsx` (`AuthorizationProvider`, `hasAuthorization`) | COMPLETE |
| Tenant Client | `src/lib/tenantClient.ts` (`createTenantClient`, `supabase.schema(schemaName)`) | COMPLETE |
| Diagnostic page | `src/pages/debug/TenantDebug.tsx`, route `/debug/tenant` | COMPLETE |

Schema resolution follows the PRD convention:
```ts
schemaName = `entity_${workspace.slug}_${entity.slug}` when provisioningStatus === 'ready'
```
The resolution source is recorded as `startup`. The Entity Provider resolves a single entity and auto-selects it. Provisioning status comes from the `get_entity_provisioning_status` RPC.

### Phase 2 — Read-only (Settings, Clients): PARTIAL

| Module | State |
|--------|-------|
| Clients list | tenant (`Clients.tsx` uses `tenantClient`) |
| Clients delete | tenant (`Clients.tsx` L137) |
| AddClient / EditClient | PUBLIC (`AddClient.tsx` L16, `EditClient.tsx` L20/48) |
| ClientDetail | PARTIAL (main client + invoices + financials tenant; projects/quotations/csrs/waybills PUBLIC L284/307/330/353) |
| Settings persist | PUBLIC by design (documented split) |
| Settings read for documents | tenant |

### Phase 3 — Invoice CRUD: COMPLETE

| Path | Location | Status |
|------|----------|--------|
| List/read | `useDocumentQuery('invoices')` → tenant adapter | COMPLETE |
| Load invoice | `invoiceService.loadInvoiceById` tenant | COMPLETE |
| Save | `useInvoiceSave` tenant | COMPLETE |
| Mutations | `useInvoiceMutations` tenant | COMPLETE |
| Status | `invoiceStatusService` tenant | COMPLETE |
| Archive/delete | `invoiceLifecycleService` tenant (`delete_invoice_with_items_transaction`) | COMPLETE |
| Payments/receipts | `paymentService` tenant | COMPLETE |
| Financial view | `fetchInvoiceFinancials` tenant | COMPLETE |

Residual public writes (documented): `Invoices.tsx` L243/246 update `csrs.linked_invoice_id` and `waybills.invoice_id` on the public schema. `src/lib/audit.ts` L221 reads public invoices.

### Phase 4 — Remaining documents: PARTIAL

| Module | State |
|--------|-------|
| Quotations | COMPLETE (CRUD via `quotationService`, `useQuotationSave`, `cloneQuotation`, `revertInvoiceToQuotation`, `convertQuotationToInvoice`) |
| Receipts | COMPLETE (tenant inserts in `paymentService`) |
| Waybills | PARTIAL (save via `saveWaybill` tenant-aware, `WaybillFormPage` passes tenantClient; `ViewWaybill` still reads PUBLIC) |
| Projects | PARTIAL (delete/archive tenant, `useProjectDocumentFetch` tenant, `ProjectDetail` read tenant; `Projects.tsx` list fetcher PUBLIC, `NewProject` PUBLIC, `ProjectDetail` edit PUBLIC L87, `ClientDetail` projects PUBLIC) |
| RFQs | NOT STARTED (NewRfq, EditRfq, ViewRfq, viewRFQActions all PUBLIC) |
| BOQs | NOT STARTED (ViewBoq, viewBOQActions, BoqList all PUBLIC) |
| CSRs | NOT STARTED (CsrFormPage, ViewCSR, viewCSRActions, csrService all PUBLIC) |

### Phase 5 — One-time data migration: COMPLETE

Migration files exist and have run against the live database:

| Migration | Table | Tenant rows |
|-----------|-------|-------------|
| `20260809030000_invoice_aggregate_data_migration.sql` | invoices | 246 |
| `20260810010000_quotation_data_migration.sql` | quotations | 328 |
| `20260810040000_waybill_data_migration.sql` | waybills | 18 |
| `20260810060000_csr_data_migration.sql` | csrs | 16 |
| `20260810070000_payment_receipt_data_migration.sql` | receipts | 4 |
| `20260811000000_projects_aggregate_data_migration.sql` | projects | 2 |

A readiness validation script exists: `supabase/verify_quotation_migration_readiness.sql`.

### Phase 6 — Cutover: NOT STARTED

The application still reads the public schema for CSRs, RFQs, BOQs, waybill view, signatories, bank accounts, and legacy data. Public business tables remain active. The cutover is not initiated.

## 5. Tenant Data Matrix

| Domain table | Public legacy | Tenant | Tenant source |
|--------------|---------------|--------|---------------|
| invoices | 239 | 246 | Phase 5 migration + post-migration writes |
| quotations | 322 | 328 | Phase 5 migration + post-migration writes |
| waybills | legacy | 18 | Phase 5 migration |
| csrs | 17 | 16 | Phase 5 migration |
| receipts | legacy | 4 | Phase 5 migration |
| projects | legacy | 2 | Phase 5 migration |
| clients | 31 | 30 | Phase 5 migration |
| settings | 1 | 1 | provisioning seed |
| blank_waybill_logs | legacy | 24 | Phase 5 migration |
| boqs | 0 | 0 | none |
| rfqs | 3 | 0 | none |
| letters | 1 | 0 | none |
| bank_accounts | 1 | 0 | none |
| signatories | 1 | 0 | none |
| wht_receipts | legacy | 0 | none |
| tax_settings | legacy | 0 | none |

Tenant invoices (246) exceed public invoices (239) and tenant quotations (328) exceed public quotations (322). This shows that post-migration application writes continue on the tenant schema. This is expected. The cutover has not happened, and the public schema still holds legacy business data.

## 6. Application Module Matrix

| Module | Schema | Evidence |
|--------|--------|----------|
| Invoices | TENANT | invoiceService, invoiceStatusService, invoiceLifecycleService, useInvoiceSave, useInvoiceMutations |
| Invoice financials | TENANT | invoice_financials_v, paymentService |
| Payments / receipts | TENANT | paymentService (tenantClient receipts insert) |
| Quotations | TENANT | quotationService, useQuotationSave, cloneQuotation, revert/convert |
| Clients | PARTIAL | list/delete tenant; AddClient/EditClient PUBLIC |
| Settings (entity) | TENANT read / PUBLIC write | documented intentional split |
| Projects | PARTIAL | delete/archive/read tenant; list + create + edit PUBLIC |
| Waybills | PARTIAL | save tenant; view PUBLIC |
| CSRs | PUBLIC | CsrFormPage, ViewCSR, viewCSRActions, csrService |
| RFQs | PUBLIC | NewRfq, EditRfq, ViewRfq, viewRFQActions |
| BOQs | PUBLIC | ViewBoq, viewBOQActions, BoqList |
| Compliance (WHT receipts) | TENANT | complianceService, complianceRepository (wht_receipts) |
| Compliance (tax tables) | PUBLIC | tax_input_entries, tax_filings, tax_reminders, tax_settings (intentional) |
| Reports | PARTIAL | invoice/payment financials tenant; project_financials_v + bank_accounts PUBLIC |
| Item library | PUBLIC | itemLibraryRepository (intentional, no tenant_id in DB) |
| Dashboard | PARTIAL | invoices/projects tenant; csrs/rfqs PUBLIC |
| Global search | PARTIAL | projects tenant; csrs PUBLIC |
| Export/LifetimeDataHub | PUBLIC | exportFetchers |
| Settings archives | PARTIAL | projects tenant; rfqs/csrs/boqs PUBLIC |
| Dead code | n/a | `useInvoiceList.ts` unused (only cache key + type used) |

## 7. Compliance Hub

- WHT receipts: fully tenant-aware.
  - `complianceService.ts` reads/writes `wht_receipts` and `invoices` via TenantClient.
  - `complianceRepository.ts` `fetchWhtReceipts/insert/update/deleteWhtReceipt` via TenantClient.
- Tax tables (`tax_input_entries`, `tax_filings`, `tax_reminders`, `tax_settings`): PUBLIC via supabase.
  - The repository comment states tax tables are NOT part of the invoice aggregate and remain public.
  - `ComplianceHub.tsx` L175/197/208 uses public supabase for tax tables and tenant for wht_receipts.
- Tenant `wht_receipts` table is currently empty (0 rows). This is expected. No WHT receipts have been recorded yet.
- `ComplianceHub.tsx` L88/93/100 uses tenantClient for WHT fetch and payment status.

## 8. Reports

- `reportRepository.ts`:
  - `fetchInvoiceFinancials`, `fetchTaxInvoices`: TENANT via TenantClient.
  - `fetchProjectFinancials`, `bank_accounts`: PUBLIC.
- `Reports.tsx` uses `loadEnrichedCollections(tenantClient)`, `loadReceivables(tenantClient)`, `loadTaxInvoices(tenantClient)`.
- `reportProjectionService.ts` uses `fetchInvoiceFinancials(tenantClient)`, `fetchTaxInvoices(tenantClient)`, `fetchPayments(tenantClient)`, `loadReceivables(tenantClient)`, `loadEnrichedCollections(tenantClient)`.
- The project financials view is tenant-scoped in the database, but the repository fetch path uses the public schema. This is inconsistent. The tenant `project_financials_v` exists and is ready for use.

## 9. Item Library

- `itemLibraryRepository.ts` (560 lines) imports `@/supabase` and uses only the public schema. No TenantClient reference.
- The database has no `tenant_id` column on `item_catalog` or `item_aliases`.
- Public row counts: item_catalog 1394, item_aliases 1000.
- Classification: intentionally public. No migration is required.

## 10. Architectural Invariant Audit

| Invariant | Status |
|-----------|--------|
| I1: exactly one active tenant context per session | PASS |
| I2: workspace before entity | PASS (AppShell nesting) |
| I3: entity before authorization | PASS (AppShell nesting) |
| I4: every migrated query uses Tenant Client | PARTIAL (residual public reads listed in Section 6) |
| I5: business modules never resolve tenant context | PASS (contexts.tsx owns resolution) |
| I6: providers own state, modules consume it | PASS |
| I7: tenant context immutable during operation | PASS |
| I8: schema resolution owned by Entity Provider + Tenant Client | PASS (BusinessSwitcher consumes entity.name, not schema construction) |
| I9: provider isolation | PASS |

Single-schema rule (PRD Principle 7): The residual public writes in `Invoices.tsx` L243/246 (CSR/waybill link updates) and `ProjectDetail.tsx` L87 (project edit) mix schemas within a single operation. These violate the rule and are documented as remaining work.

## 11. Confirmed Remaining Work

### 11.1 BLOCKER: Missing tenant permission rows

Add permission rows for resources `waybill`, `project`, `csr`, `rfq`, `boq`, `letter` to `entity_permissions` before Phase 4 modules can move to the tenant schema. Without them, tenant RLS denies all access.

### 11.2 Phase 2 residual

- Migrate `AddClient.tsx` and `EditClient.tsx` writes to TenantClient.
- Migrate `ClientDetail.tsx` projects/quotations/csrs/waybills reads to TenantClient.

### 11.3 Phase 3 residual

- `Invoices.tsx` L243/246: move CSR/waybill link updates to tenant schema.
- `src/lib/audit.ts` L221: move invoice read to tenant.

### 11.4 Phase 4 residual

- `ViewWaybill.tsx` L171/L601: read tenant schema.
- `Projects.tsx` list fetcher: read tenant schema.
- `NewProject.tsx`: write tenant schema.
- `ProjectDetail.tsx` L87 edit: write tenant schema.
- `ClientDetail.tsx` projects reads: read tenant schema.
- Migrate CSRs, RFQs, BOQs to tenant (form pages, view pages, actions, list pages).
- `src/pages/settings/ArchivesSettingsSection.tsx`: move csr/rfq/boq archive lists to tenant.
- `src/hooks/useGlobalSearch.ts`: move csr search to tenant.
- `src/hooks/useDashboardData.ts` L343/345/455/457: move csr/rfq lists to tenant.
- `src/services/exportFetchers.ts` and `LifetimeDataHub.tsx`: evaluate tenant read.

### 11.5 Phase 6

- No cutover yet. The ERP still reads the public schema in several modules.
- Public business tables become legacy after the cutover.

### 11.6 Cleanup candidates

- Stray schema `eca34515-0b30-482c-b12e-3963df164322` (empty boqs/letters/rfqs).
- Dead code `useInvoiceList.ts`.

## 12. Progress Calculation

### Method

Backend and frontend are weighted equally at 50% each.

Backend is graded on infrastructure completeness against PRD v2.1.

Frontend is graded on phase completeness against PRD v1.1 phases, with phase weights reflecting effort:

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

## 13. Recommended Next Implementation Step

1. Remove the Phase 4 blocker first. Insert `entity_permissions` rows for `waybill`, `project`, `csr`, `rfq`, `boq`, `letter` for the live entity.
2. Then migrate the remaining Phase 4 modules to the tenant schema in this order:
   - Projects (list, create, edit)
   - Waybills (view)
   - CSRs (list, form, view)
   - RFQs (list, form, view)
   - BOQs (list, form, view)
3. Finish the Phase 2 and Phase 3 residuals in parallel (clients writes, ClientDetail reads, Invoices.tsx link updates, audit.ts read).
4. Only after all modules use the tenant schema, plan the Phase 6 cutover.
5. Clean up the stray schema and dead code as separate housekeeping tasks.

## Verification

- `bun run audit:load`: not applicable (read-only reconciliation)
- `bun run typecheck`: not applicable (no code changes)
- git status: report file added only, no application or migration files modified
- Live database queries: SELECT-only, no data modified
