# BIGDROPS Multi-Tenancy Completeness Audit — Final Report

This report was written by OpenCode on 2026-08-10 via Local Runner.

---

## 1. Objective and Scope

**Objective:** Determine whether the BIGDROPS application is fully multi-tenant or only the invoice aggregate has been migrated. Answer the question: "Is BIGDROPS multi-tenant?"

**Scope:** READ-ONLY audit of every data access path in `src/`. No code changes, no migrations, no builds.

**Method:** Grep-based enumeration of `tenantClient.from(`, `tenantClient.rpc(`, `supabase.from(`, and `useEntity()` across the entire codebase. Cross-referenced with 14 existing multi-tenancy reports in `docs/Reports/` and `docs/Reports/multi-tenancy/`.

---

## 2. Infrastructure Status

### 2.1 Tenant Context Layer — COMPLETE

| Component | File | Status |
|---|---|---|
| Workspace Provider | `src/lib/tenant/contexts.tsx` | Conforms to PRD v1.1 |
| Entity Provider | `src/lib/tenant/contexts.tsx` | Conforms. Sole owner of resolved schema name |
| Authorization Provider | `src/lib/tenant/contexts.tsx` | Conforms. Direct SELECT on `entity_permissions` permitted by RLS |
| Tenant Client | `src/lib/tenantClient.ts` | Conforms. Routing abstraction only |
| Diagnostic Page | `src/pages/debug/TenantDebug.tsx` | Conforms. Uses provider state |
| Provider wiring | `src/components/app/AppShell.tsx` | Conforms. Hierarchy: Auth → Workspace → Entity → Authorization |
| Business Switcher | `src/components/layout/BusinessSwitcher.tsx` | Decorative only. Shows "not enabled" placeholder |

**Schema naming:** `entity_${workspace.slug}_${entity.slug}` — matches backend contract.

**Provisioning:** Member-scoped RPC `get_entity_provisioning_status(p_entity_id)`. Six-state union enforced by runtime type guard. `schemaName` resolves only when status is `ready`.

### 2.2 Provisioning Engine — COMPLETE (with caveats)

| Migration | Status |
|---|---|
| `20260714000001_multi_tenancy_rls.sql` | Applied. 12 recursion bugs found and fixed in Round 5 |
| `20260717000000_round_4_platform_operators.sql` | Applied |
| `20260717000001_round_5_rls_fixes.sql` | Applied |
| `20260718000000_round_6_entity_provisioning.sql` | Applied. 4 bugs found and fixed during execution |
| `20260809010000_invoice_aggregate_provisioning.sql` | Applied. Adds invoice_items, wht_receipts to template |
| `20260809030000_invoice_aggregate_data_migration.sql` | The ONLY proven data migration. Copies invoices + items from public → tenant |

**Template tables (15):** clients, settings, signatories, bank_accounts, projects, quotations, invoices, payments, csrs, waybills, tax_settings, receipts, letters, boqs, rfqs.

**Known gaps:** Triggers not cloned by LIKE. Views (`invoice_financials_v`) not cloned. Live DB drift from migrations (CHECK constraints, INSERT policies, revert RPC exist in production but not in migrations).

### 2.3 What EXISTS in Tenant Schema (`entity_bigdrops-main_main`)

| Table | Status |
|---|---|
| invoices | Populated (239 rows from data migration) |
| invoice_items | Populated (2,059 rows from data migration) |
| payments | Populated (26 rows) |
| receipts | Populated (4 rows) |
| wht_receipts | Populated (from data migration) |
| clients | Exists (30 rows in public, tenant copy status unknown) |
| settings | Exists (template) |
| signatories | Exists (template) |
| bank_accounts | Exists (template) |
| projects | Exists (template) |
| quotations | Exists (321 rows in public, tenant copy status unknown) |
| csrs | Exists (template) |
| waybills | Exists (template) |
| letters | Exists (template) |
| boqs | Exists (template) |
| rfqs | Exists (template) |
| tax_settings | Exists (template) |

---

## 3. Complete Module Matrix

### 3.1 Data Access Summary

| Module | `tenantClient.from()` calls | `supabase.from()` calls | Migration Status |
|---|---|---|---|
| **Invoice** | 31 | 10 | MIXED — mostly migrated |
| **Receipt** | 1 (via paymentService) | 0 | MOSTLY MIGRATED — 1 leak in ViewReceipt.tsx:32 |
| **Quotation** | 6 | 29 | NOT MIGRATED — 83% on public |
| **Waybill** | 0 | 18 | NOT MIGRATED — 100% on public |
| **CSR** | 0 | 12 | NOT MIGRATED — 100% on public |
| **BOQ** | 0 | 15 | NOT MIGRATED — 100% on public |
| **RFQ** | 0 | 21 | NOT MIGRATED — 100% on public |
| **Project** | 0 | 12 | NOT MIGRATED — 100% on public |
| **Client** | 4 | 3 | MIXED — mostly migrated |
| **Settings** | 1 | 20 | NOT MIGRATED — 95% on public |
| **Item Library** | 0 | 8 | NOT MIGRATED — 100% on public |
| **Compliance** | 1 | 17 | NOT MIGRATED — 94% on public |
| **Reports** | 1 | 1 | MIXED |
| **Dashboard/Search** | 4 | 14 | NOT MIGRATED — 78% on public |
| **Auth/Profiles** | 0 | 5 | GLOBAL (should remain public) |
| **Notifications** | 0 | 2 | NOT MIGRATED |
| **TOTAL** | **48** | **~188** | **20% migrated** |

### 3.2 Migration Completeness by Module

| Module | Status | Detail |
|---|---|---|
| **Invoice** | 🟡 PARTIAL | 31 tenantClient calls (saves, lifecycle, payments). 10 supabase calls remain (signatories, bank_accounts, quotation lookups, reference data). Data migration complete. |
| **Receipt** | 🟢 MOSTLY | All receipt inserts use tenantClient via paymentService. 1 public leak at `ViewReceipt.tsx:32`. |
| **Client** | 🟡 PARTIAL | 4 tenantClient calls (list, detail, selector). 3 supabase calls remain (AddClient, EditClient). |
| **Quotation** | 🔴 NOT MIGRATED | 6 tenantClient calls vs 29 supabase calls. Save path, list, detail, actions all on public. |
| **Waybill** | 🔴 NOT MIGRATED | Zero tenantClient. 18 supabase calls. Items stored as JSONB. |
| **CSR** | 🔴 NOT MIGRATED | Zero tenantClient. 12 supabase calls. 1 exception: ViewCSR.tsx:185 reads clients via tenantClient. |
| **BOQ** | 🔴 NOT MIGRATED | Zero tenantClient. 15 supabase calls. Items live in localStorage, not DB. |
| **RFQ** | 🔴 NOT MIGRATED | Zero tenantClient. 21 supabase calls. |
| **Project** | 🔴 NOT MIGRATED | Zero tenantClient. 12 supabase calls. |
| **Settings** | 🔴 NOT MIGRATED | 1 tenantClient call vs 20 supabase calls. Singleton model (`id=1`). |
| **Item Library** | 🔴 NOT MIGRATED | Zero tenantClient. 8 supabase calls. Public→tenant routing gap in itemLibraryRepository. |
| **Compliance** | 🔴 NOT MIGRATED | 1 tenantClient call vs 17 supabase calls. |
| **Reports** | 🟡 MIXED | 1 tenantClient, 1 supabase. |
| **Dashboard/Search** | 🔴 NOT MIGRATED | 4 tenantClient vs 14 supabase calls. |
| **Auth/Profiles** | ⚪ GLOBAL | Should remain on public schema. Not tenant-scoped. |

---

## 4. Cross-Tenant Leak Audit

### 4.1 Public-Schema Access Points (potential leaks)

Every `supabase.from()` call on a business table is a potential cross-tenant read/write. The following are NOT auth/profiles (which are legitimately global):

| Module | File:Line | Operation | Severity |
|---|---|---|---|
| **Quotation** | `quotationService.ts:47,52,55,89,100,102` | READ/WRITE quotations | WARNING — legacy fallback |
| **Quotation** | `useQuotationSave.ts:238,243,248,259,269` | WRITE quotations | WARNING — legacy fallback |
| **Quotation** | `viewQuotationActions.ts:15-298` (12 sites) | READ/WRITE/DELETE quotations | WARNING — legacy fallback |
| **Quotation** | `QuotationFormPage.tsx:209-357` (5 sites) | READ/WRITE quotations | WARNING — legacy fallback |
| **Waybill** | `waybillMutations.ts:87,123,126` | READ/WRITE waybills | WARNING — legacy fallback |
| **Waybill** | `Waybills.tsx:88-137` (4 sites) | READ waybills | WARNING — legacy fallback |
| **Waybill** | `WaybillFormPage.tsx:62,103` | READ/WRITE waybills | WARNING — legacy fallback |
| **Waybill** | `viewWaybillActions.ts:5-82` (7 sites) | READ/WRITE/DELETE waybills | WARNING — legacy fallback |
| **Waybill** | `ViewWaybill.tsx:171,601` | READ waybills | WARNING — legacy fallback |
| **CSR** | `csrService.ts:149` | READ CSR | WARNING — legacy fallback |
| **CSR** | `viewCSRActions.ts:5-64` (5 sites) | READ/WRITE/DELETE CSR | WARNING — legacy fallback |
| **CSR** | `ViewCSR.tsx:172,181` | READ CSR | WARNING — legacy fallback |
| **CSR** | `CsrFormPage.tsx:203-470` (3 sites) | READ/WRITE CSR | WARNING — legacy fallback |
| **CSR** | `CsrFormScreen.tsx:238` | READ CSR | WARNING — legacy fallback |
| **RFQ** | `viewRFQActions.ts:5-103` (10 sites) | READ/WRITE/DELETE RFQ | WARNING — legacy fallback |
| **RFQ** | `ViewRfq.tsx:59-235` (3 sites) | READ RFQ | WARNING — legacy fallback |
| **RFQ** | `NewRfq.tsx:23-52` (4 sites) | READ/WRITE RFQ | WARNING — legacy fallback |
| **RFQ** | `EditRfq.tsx:23-70` (4 sites) | READ/WRITE RFQ | WARNING — legacy fallback |
| **BOQ** | `viewBOQActions.ts:5-103` (10 sites) | READ/WRITE/DELETE BOQ | WARNING — legacy fallback |
| **BOQ** | `ViewBoq.tsx:57,58` | READ BOQ | WARNING — legacy fallback |
| **BOQ** | `BoqList.tsx:35,53,60` | READ BOQ | WARNING — legacy fallback |
| **Project** | `useProjectDocumentFetch.ts:118-262` (3 sites) | READ projects | WARNING — legacy fallback |
| **Project** | `Projects.tsx:58,76` | READ projects | WARNING — legacy fallback |
| **Project** | `ProjectDetail.tsx:107-262` (4 sites) | READ projects | WARNING — legacy fallback |
| **Project** | `ProjectDocumentView.tsx:39,40` | READ projects | WARNING — legacy fallback |
| **Project** | `ProjectDocumentSheet.tsx:195` | READ projects | WARNING — legacy fallback |
| **Item Library** | `itemLibraryRepository.ts:296-500` (8 sites) | READ items | WARNING — legacy fallback |
| **Compliance** | `complianceRepository.ts:34-103` (14 sites) | READ compliance | WARNING — legacy fallback |
| **Compliance** | `ComplianceHub.tsx:175-208` (3 sites) | READ compliance | WARNING — legacy fallback |
| **Settings** | `AdminSettingsSection.tsx:221-263` (6 sites) | READ/WRITE settings | WARNING — legacy fallback |
| **Settings** | `ArchivesSettingsSection.tsx:91-96` (6 sites) | READ archives | WARNING — legacy fallback |
| **Settings** | `BankingSettingsSection.tsx:107-148` (4 sites) | READ/WRITE bank accounts | WARNING — legacy fallback |
| **Settings** | `SignatoriesSettingsSection.tsx:135-152` (3 sites) | READ/WRITE signatories | WARNING — legacy fallback |
| **Settings** | `UserSettingsSection.tsx:118` | READ users | WARNING — legacy fallback |
| **Dashboard** | `useDashboardData.ts:362-486` (10 sites) | READ dashboard data | WARNING — legacy fallback |
| **Global Search** | `useGlobalSearch.ts:46-50` (4 sites) | READ search results | WARNING — legacy fallback |
| **Invoice** | `Invoices.tsx:243,246` | READ signatories/bank_accounts | WARNING — legacy fallback |
| **Invoice** | `paymentService.ts:146-327` (4 sites) | READ signatories/bank_accounts | WARNING — legacy fallback |
| **Invoice** | `invoiceConversionService.ts:28` | READ quotation data | WARNING — legacy fallback |
| **Invoice** | `useInvoiceReferenceData.ts:18,19` | READ settings | WARNING — legacy fallback |
| **Invoice** | `useInvoiceDetailData.js:85` | READ settings | WARNING — legacy fallback |
| **Client** | `EditClient.tsx:20,48` | READ/WRITE clients | WARNING — legacy fallback |
| **Client** | `AddClient.tsx:16` | WRITE clients | WARNING — legacy fallback |

**Total public-schema business access points: ~188 across 52 files**

### 4.2 Severity Assessment

- **CRITICAL (cross-tenant leak):** None found. All `supabase.from()` calls go to `public` schema, not to another entity's schema. The risk is data visibility within the same workspace, not cross-workspace leaks.
- **WARNING (legacy fallback):** 188 call sites across 52 files. These read/write public-schema data that should eventually migrate to entity schemas.
- **OK (genuinely global):** 5 auth/profiles calls. These should remain on public.

---

## 5. Data Migration Status

### 5.1 Migrations Applied

| Migration | Purpose | Status |
|---|---|---|
| `20260809010000_invoice_aggregate_provisioning.sql` | Add invoice_items, wht_receipts to template tables | Applied |
| `20260809030000_invoice_aggregate_data_migration.sql` | Copy invoices, invoice_items, wht_receipts from public → tenant | Applied. Idempotent. |

### 5.2 Data in Tenant Schema

| Table | Public (source) | Tenant (target) | Status |
|---|---|---|---|
| invoices | 239 | 239 | ✅ Migrated |
| invoice_items | 2,059 | 2,059 | ✅ Migrated |
| payments | 26 | 26 | ✅ Migrated |
| receipts | 4 | 4 | ✅ Migrated |
| wht_receipts | — | — | ✅ Migrated |
| clients | 30 | Unknown | ⚠️ Not verified |
| settings | 1 | Unknown | ⚠️ Not verified |
| quotations | 321 | Unknown | ⚠️ Not verified |
| signatories | — | Unknown | ⚠️ Not verified |
| bank_accounts | — | Unknown | ⚠️ Not verified |
| projects | — | Unknown | ⚠️ Not verified |
| csrs | — | Unknown | ⚠️ Not verified |
| waybills | — | Unknown | ⚠️ Not verified |
| letters | — | Unknown | ⚠️ Not verified |
| boqs | — | Unknown | ⚠️ Not verified |
| rfqs | — | Unknown | ⚠️ Not verified |

### 5.3 Missing from Provisioning

| Table | Impact |
|---|---|
| `invoice_items` | Fixed in `20260809010000` — now in template |
| `wht_receipts` | Fixed in `20260809010000` — now in template |
| `activity_events` | NOT provisioned. Audit trail will not work in tenant schema |
| `audit_logs` | NOT provisioned. Audit trail will not work in tenant schema |
| `invoice_financials_v` | NOT provisioned. Views are not cloned by LIKE |

---

## 6. Architectural Decisions Required

The following decisions are still open from prior reports (Phase 3 blocker investigation):

| # | Decision | Impact |
|---|---|---|
| 1 | Cutover strategy (dual-read, write-only, or big-bang) | Determines migration order |
| 2 | Numbering authority (public or per-schema) | Invoice/waybill numbers may collide across schemas |
| 3 | Financial computation architecture | `invoice_financials_v` must exist in tenant schema |
| 4 | Audit architecture | Audit RPCs hardcode `public.invoices` |
| 5 | Transaction boundaries | All invoice writes are multi-request sequential |
| 6 | Related data treatment | Items, payments, receipts, WHT all need entity scoping |
| 7 | Legacy edit policy | How to handle pre-migration documents |
| 8 | Resource mapping | Settings singleton needs per-entity model |

---

## 7. Known Blockers

| # | Blocker | Module | Severity |
|---|---|---|---|
| 1 | `invoice_items` not provisioned (fixed in migration) | Invoice | RESOLVED |
| 2 | Triggers not cloned by LIKE | Invoice | BLOCKER |
| 3 | `invoice_financials_v` not cloned | Invoice | BLOCKER |
| 4 | Audit RPCs hardcode `public.invoices` | Invoice/Audit | BLOCKER |
| 5 | `revert_invoice_to_quotation_transaction` has no migration definition | Invoice | BLOCKER |
| 6 | Entity permissions rows unseeded | All | BLOCKER |
| 7 | Settings singleton `id=1` model | Settings | BLOCKER |
| 8 | Live DB drift from migrations | All | WARNING |
| 9 | Action string mismatch (`view` vs `read`) | Settings/Clients | WARNING |
| 10 | Entity schema tables data-empty | All | BLOCKER (for reads) |

---

## 8. Complete Module Matrix

| Module | Tables | Provisioned | Data Migrated | Frontend Migrated | Overall |
|---|---|---|---|---|---|
| **Invoice** | invoices, invoice_items, payments, receipts, wht_receipts | ✅ | ✅ | 🟡 Partial | 🟡 60% |
| **Receipt** | receipts | ✅ | ✅ | 🟢 Mostly | 🟢 90% |
| **Client** | clients | ✅ | ⚠️ Unknown | 🟡 Partial | 🟡 50% |
| **Quotation** | quotations | ✅ | ⚠️ Unknown | 🔴 No | 🔴 15% |
| **Waybill** | waybills | ✅ | ⚠️ Unknown | 🔴 No | 🔴 5% |
| **CSR** | csrs | ✅ | ⚠️ Unknown | 🔴 No | 🔴 5% |
| **BOQ** | boqs | ✅ | ⚠️ Unknown | 🔴 No | 🔴 5% |
| **RFQ** | rfqs | ✅ | ⚠️ Unknown | 🔴 No | 🔴 5% |
| **Project** | projects | ✅ | ⚠️ Unknown | 🔴 No | 🔴 5% |
| **Settings** | settings, signatories, bank_accounts, tax_settings | ✅ | ⚠️ Unknown | 🔴 No | 🔴 5% |
| **Item Library** | (items stored in invoices/quotations) | N/A | N/A | 🔴 No | 🔴 0% |
| **Compliance** | wht_receipts | ✅ | ⚠️ Unknown | 🔴 No | 🔴 5% |
| **Reports** | (derived from invoices) | N/A | N/A | 🟡 Mixed | 🟡 30% |
| **Dashboard** | (derived from invoices/payments) | N/A | N/A | 🔴 No | 🔴 10% |
| **Auth/Profiles** | profiles, workspaces, workspace_members, entities, entity_permissions | ⚪ Global | ⚪ Global | ⚪ Global | ⚪ N/A |

---

## 9. Final Verdict

### Is BIGDROPS Multi-Tenant?

**No.** BIGDROPS is not multi-tenant. It is a single-tenant application with multi-tenant infrastructure partially built.

### Quantitative Assessment

| Metric | Value |
|---|---|
| Total `supabase.from()` business calls | ~188 |
| Total `tenantClient.from()` calls | 48 |
| Migration completion | **20%** |
| Modules fully migrated | 0 |
| Modules partially migrated | 3 (Invoice, Receipt, Client) |
| Modules not migrated | 11 |
| Frontend files needing migration | ~52 |
| Known blockers | 10 |
| Architectural decisions open | 8 |

### What Works

1. **Infrastructure layer** is complete and tested (contexts, TenantClient, provisioning engine).
2. **Invoice aggregate** is the only module with a working data migration and partial frontend migration.
3. **Receipt module** is mostly migrated (1 leak).
4. **Client module** is partially migrated.
5. **Provisioning engine** creates entity schemas with all 15 template tables.

### What Doesn't Work

1. **11 of 14 business modules** read/write directly to `public` schema — no tenant isolation.
2. **Dashboard** cannot display entity-scoped data (all queries hit public).
3. **Settings** uses a singleton model (`id=1`) — fundamentally incompatible with multi-tenancy.
4. **Audit trail** is broken in tenant schemas (RPCs hardcode `public`).
5. **Triggers** are not cloned — tenant invoices lack `updated_at` and `ownership` stamps.
6. **Views** are not cloned — `invoice_financials_v` missing from tenant schema.
7. **Entity permissions** are unseeded — tenant RLS blocks all reads without permission rows.
8. **Live DB drift** between migrations and production.

### Estimated Work Remaining

| Phase | Scope | Estimated Effort |
|---|---|---|
| Phase 2: Settings/Clients reads | Migrate reads to tenantClient, backfill data, seed permissions | 3-5 days |
| Phase 3: Invoice writes | Migrate 40 write sites, fix triggers, create views, resolve 8 architectural decisions | 7-10 days |
| Phase 4: Quotation migration | Migrate 35 access points | 3-5 days |
| Phase 5: Waybill/CSR/BOQ/RFQ migration | Migrate 66 access points across 4 modules | 5-7 days |
| Phase 6: Project/Compliance/Dashboard | Migrate 43 access points | 3-5 days |
| Phase 7: Settings rewrite | Replace singleton model with per-entity settings | 5-7 days |
| **Total** | | **26-39 days** |

---

## 10. Deferred Work

- Backend RLS policies for entity schemas (created dynamically by `provision_entity()`).
- Workspace/entity selection UI for multi-result case.
- Cross-entity queries for dashboards (UNION from multiple schemas).
- Cache key scoping (currently global `:all` suffix).
- Route-level isolation (`/w/:wsId/e/:eId/...`).
- PDF rendering entity scoping.
- Notification entity scoping.
- Letter module tenant awareness (uses wrong identifier today).

---

## Delegation Log

```
[DELEGATION] task="Multi-tenancy completeness audit" | domain="multi-tenancy" | subagent="NONE" | justification="Cross-cutting infrastructure audit spanning all modules; no single-domain specialist covers the full scope" | harness="Local Runner"
```
