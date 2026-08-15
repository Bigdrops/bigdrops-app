# BIGDROPS Multi-Tenancy — Final Reconciliation Blueprint

This report was written by DeepSeek on 2026-08-15 via opencode (Local Runner).

## Objective

Produce the final pre-implementation reconciliation blueprint for the BIGDROPS multi-tenancy migration.
The blueprint is the basis for the next coding phase.
The blueprint is read-only. It changes no code, database, or permissions.

## Scope

- Backend PRD v2.1 (approved).
- Frontend PRD v1.1 (approved).
- PRD v1.0 Appendix A (authoritative table mapping, read in full L461-521).
- Live database via Supabase Management API (SELECT-only).
- Application source code under `src/`.

## Files changed

- Created: `docs/Reports/multi-tenancy/final-reconciliation-blueprint.md`.

## Skills used

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English

---

# 1. FINAL RECONCILIATION

The multi-tenant backend is live.
The provisioning engine exists and runs.
The tenant schema is provisioned and secured.
The migration is incomplete for 11 tables and for the frontend.

This report reconciles the intended state (PRDs) with the live state (database) and the implemented state (source code).
It states the exact root cause of the gaps.
It states the exact changes required before cutover.
It reports two separate percentages:

- Implementation progress: how much of the target design exists.
- Cutover readiness: how safe it is to switch users to the tenant schema today.

| Item | Value |
|------|-------|
| Workspace ID | `eb30b64b-7f95-464f-be1a-805cf2c0fedc` |
| Workspace slug | `bigdrops-main` |
| Workspace name | `BIGDROPS` |
| Entity ID | `eca34515-0b30-482c-b12e-3963df164322` |
| Entity slug | `main` |
| Entity display name | `Sun & Shield Power Solutions` |
| Entity type | company |
| Tenant schema | `entity_bigdrops-main_main` |
| Entity provisioning status | ready (attempt_count 2) |
| Stray schema | `eca34515-0b30-482c-b12e-3963df164322` (empty boqs/letters/rfqs) |

# 2. CURRENT REAL STATE

Live platform rows:
- workspaces: 1
- workspace_members: 1 (owner)
- workspace_invitations: 0
- workspace_invitation_entity_grants: 0
- platform_operators: 1
- entities: 1
- entity_permissions: 21 (all owner user)
- permission_templates: 0
- permission_template_items: 0
- auth.users: 9
- profiles: 5

Live tenant schema (`entity_bigdrops-main_main`):
- Base tables: 21
- Views: 2 (`invoice_financials_v`, `project_financials_v`)
- Functions: 0
- Every base table has 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)

RLS policy pattern (verified live):
`has_entity_permission('eca34515-0b30-482c-b12e-3963df164322'::uuid, auth.uid(), '<resource>', '<action>')`

Live entity_permissions (all for owner `jaiyewisdom@gmail.com`):
- client/view
- invoice/create, invoice/delete, invoice/edit, invoice/view
- payment/create, payment/delete, payment/edit, payment/view
- quotation/create, quotation/delete, quotation/edit, quotation/view
- receipt/create, receipt/delete, receipt/edit, receipt/view
- setting/create, setting/delete, setting/edit, setting/view

Missing permission resources (zero rows):
- waybill, project, csr, rfq, boq, letter, bank_account, signatory, tax_setting, project_document

# 3. PROVISIONING ROOT CAUSE

## 3.1 The engine

`provision_entity(p_entity_id)` is defined in
`supabase/migrations/20260717000000_entity_provisioning_engine.sql`.
It is redefined by four later migrations.

Flow:
1. `_prov_validate_permissions` — workspace owner or `create_entity`.
2. `_prov_check_idempotency` — returns `ready` for an already-provisioned entity.
3. Advisory lock.
4. `_prov_create_schema`.
5. `_prov_get_template_tables` — the clone list.
6. `_prov_clone_table` — `CREATE TABLE ... (LIKE public.<table> INCLUDING ALL)`.
7. `_prov_install_rls` — four policies per table.
8. `_prov_readd_foreign_keys`.
9. `_prov_seed_settings`.
10. `_prov_install_triggers` (replicates `set_row_updated_at`, `stamp_row_ownership`).
11. `_prov_update_status('ready')`.

## 3.2 Template list drift

The template list grew across migrations. It is the single source of truth
for which tables a tenant schema receives.

| Migration | Tables added | Template size |
|-----------|--------------|---------------|
| 20260717000000 (original) | (baseline) | 15 |
| 20260809010000 (invoice aggregate) | invoice_items, wht_receipts | 17 |
| 20260810030000 (waybill aggregate) | blank_waybill_logs | 18 |
| 20260810050000 (csr aggregate) | blank_csr_logs | 19 |

Live template (19 tables):
clients, settings, signatories, bank_accounts, projects, quotations, invoices,
invoice_items, payments, wht_receipts, csrs, waybills, blank_waybill_logs,
blank_csr_logs, tax_settings, receipts, letters, boqs, rfqs.

The live tenant schema has 21 tables:
the 19 template tables, plus `project_documents` and `quotation_items`.

`project_documents` and `quotation_items` were added to the tenant schema by
the aggregate data-migration files (projects migration 20260811000000,
quotation migration 20260810010000). They were never added to the template.
A new entity provisioned today would NOT receive `project_documents` or
`quotation_items`.

## 3.3 The 11 missing tables

The tenant schema is missing 11 tables. None of them is in the template list.

| Missing table | Public rows | Appendix A target | Origin migration |
|---------------|-------------|-------------------|------------------|
| rfq_items | 54 | Per entity schema | 20260520090002 |
| boq_rows | 0 | Per entity schema | 20260520090002 |
| item_catalog | 1394 | Per entity schema | 20260520090005 |
| item_aliases | 1000 | Per entity schema | 20260520090005 |
| item_import_batches | 0 | Per entity schema | 20260520090005 |
| item_merge_log | 0 | Per entity schema | 20260520090005 |
| tax_input_entries | 0 | Per entity schema | 20260520090009 |
| tax_filings | 0 | Per entity schema | 20260520090009 |
| tax_reminders | 0 | Per entity schema | 20260520090009 |
| audit_logs | 425 | Per entity schema | 20260520090008 |
| device_sequences | 0 | Per entity schema | 20260520090006 |

Root cause: `_prov_get_template_tables()` never listed these tables.
The engine clones only what the template lists.
Idempotency returns `ready` for the live entity, so re-running
`provision_entity` short-circuits and never backfills the missing tables.

## 3.4 Financial view drift

`_prov_install_financial_views(p_schema_name)` is defined in
`20260809060000_invoice_financials_tenant_view.sql`.
It installs only `invoice_financials_v`.

`project_financials_v` exists in the tenant schema.
It was created there by `20260811000000_projects_aggregate_data_migration.sql`
(lines 104-133), not by the provisioning engine.
A new entity would receive `invoice_financials_v` but NOT `project_financials_v`.

## 3.5 Stray schema origin

`20260810080000_letters_boqs_rfqs_structure_clone.sql` clones empty
letters/boqs/rfqs into a schema named by the entity UUID
(`eca34515-0b30-482c-b12e-3963df164322`), not by the standard
`entity_<workspace>_<entity>` name. This created the stray schema.
It is a leftover, not a real tenant schema. It is a cleanup candidate.

## 3.6 Stray audit/activity design conflict

`audit_logs` and `activity_events` both have a `scope_type` column.
The live function inventory has no `merge_item_catalog_entries`.
The function `get_item_suggestions` is hard-wired to:
- `public.item_catalog`
- `public.item_price_summary_v`
- `public.normalize_item_text`

These functions keep item-library reads on `public`. They must be rewritten
to read the tenant schema before cutover.

## 3.7 Root-cause options (A-E)

Option A — Add the 11 tables to the template.
Add to `_prov_get_template_tables()` and `_prov_table_to_resource()`:
rfq_items, boq_rows, item_catalog, item_aliases, item_import_batches,
item_merge_log, tax_input_entries, tax_filings, tax_reminders, audit_logs,
device_sequences.
This fixes new entities only. It does not fix the live entity.

Option B — Add a backfill path for existing entities.
Add a migration that bypasses the `ready` idempotency short-circuit and
clones the 11 tables into the existing tenant schema.
It must install RLS and map each table to a resource.

Option C — Map the new resources.
Add resources for the new tables in `_prov_table_to_resource()`:
tax_input_entries/tax_filings/tax_reminders → `tax_setting`;
item_catalog/item_aliases → new `item` resource;
audit_logs → new `audit` resource;
device_sequences → new `device` resource or shared.
`_prov_seed_default_permissions()` must grant these resources.

Option D — Fix the financial view drift.
Add `project_financials_v` to the provisioning engine, or create it in a
backfill migration. Add `project_documents` and `quotation_items` to the
template so new entities match the live entity.

Option E — Add a schema drift checker.
Add a read-only SQL check that compares the template list with the live
tenant schema and reports missing tables. This is a verification aid.
It is not required for cutover.

Recommended order: D, then A + C, then B (backfill), then E.
E is optional and can be deferred.

# 4. TABLE MIGRATION ORDER

Data must move from `public` to the tenant schema in dependency order.
The order below respects foreign keys.

| Step | Table | Public rows | Notes |
|------|-------|-------------|-------|
| 1 | settings | 1 | Parent of tax tables |
| 2 | clients | 31 | |
| 3 | signatories | 1 | |
| 4 | bank_accounts | 1 | |
| 5 | projects | 2 | |
| 6 | project_documents | 2 | FK to projects |
| 7 | quotations | 322 | |
| 8 | quotation_items | 2806 | FK to quotations |
| 9 | invoices | 239 | |
| 10 | invoice_items | 2060 | FK to invoices |
| 11 | payments | 26 | |
| 12 | wht_receipts | 0 | |
| 13 | csrs | 17 | |
| 14 | blank_csr_logs | 0 | |
| 15 | waybills | 18 | |
| 16 | blank_waybill_logs | 24 | |
| 17 | receipts | 4 | |
| 18 | letters | 1 | |
| 19 | boqs | 0 | |
| 20 | boq_rows | 0 | FK to boqs |
| 21 | rfqs | 3 | |
| 22 | rfq_items | 54 | FK to rfqs |
| 23 | tax_settings | 0 | FK to settings |
| 24 | tax_input_entries | 0 | FK to settings |
| 25 | tax_filings | 0 | FK to settings |
| 26 | tax_reminders | 0 | FK to settings |
| 27 | item_catalog | 1394 | Shared or per entity |
| 28 | item_aliases | 1000 | Shared or per entity |
| 29 | item_import_batches | 0 | |
| 30 | item_merge_log | 0 | |
| 31 | device_sequences | 0 | Keyed by device_code + doc_type |
| 32 | audit_logs | 425 | Copy; keep public copy |

Copy preserves row IDs (`INSERT ... SELECT`).
This preserves document lineage, audit trails, and cross-references.
`audit_logs` keeps a public copy because `activity_events` stays public with
`scope_type` routing. Do not delete the public audit copy until the tenant
copy is verified.

# 5. PERMISSION PLAN

Do NOT grant all permissions to every authenticated user.

Target state per PRD v2.1:
- Action-based permissions, not role-based.
- `has_entity_permission` enforces at RLS level.
- Permission templates are conveniences, not the security boundary.
- Platform operators never access entity data.
- Permission resolution: exact match first, then wildcard `*`.

Required new resources and actions:
- waybill: create/delete/edit/view (currently zero rows).
- project: create/delete/edit/view.
- csr: create/delete/edit/view.
- rfq: create/delete/edit/view.
- boq: create/delete/edit/view.
- letter: create/delete/edit/view.
- bank_account: create/delete/edit/view.
- signatory: create/delete/edit/view.
- tax_setting: create/delete/edit/view.
- project_document: create/delete/edit/view.
- item: create/delete/edit/view (item_catalog, item_aliases).
- audit: view (audit_logs).
- device: view (device_sequences).

Grant to the owner user first. Grant to other users only as required.
Do not create a `*` wildcard grant unless the owner explicitly requires it.

Existing 21 rows are the baseline. Add the missing resources for the owner.
Then grant to the other 8 users only the resources their roles require.

# 6. PUBLIC-ACCESS CENSUS

## 6.1 Data-migration files

The aggregate data migrations follow a consistent pattern:
clone table structure, copy data with preserved IDs, recreate views,
seed permissions. Files:
- 20260809020000_invoice_aggregate_permissions.sql
- 20260809030000_invoice_aggregate_data_migration.sql
- 20260809040000_invoice_audit_schema_aware.sql
- 20260809050000_revert_invoice_cross_schema.sql
- 20260809060000_invoice_financials_tenant_view.sql
- 20260809070000_invoice_composite_transactions.sql
- 20260810000000_tenant_settings_permission_seed.sql
- 20260810010000_tenant_settings_identity_backfill.sql
- 20260810010000_quotation_data_migration.sql
- 20260810030000_waybill_aggregate_provisioning.sql
- 20260810040000_waybill_data_migration.sql
- 20260810050000_csr_aggregate_provisioning.sql
- 20260810060000_csr_data_migration.sql
- 20260810070000_payment_receipt_data_migration.sql
- 20260810080000_letters_boqs_rfqs_structure_clone.sql
- 20260811000000_projects_aggregate_data_migration.sql
- 20260814000000_fix_invoice_item_discount_null.sql
- 20260814000001_quotation_permission_seed.sql
- 20260814000002_quotation_items_permission_fix.sql

## 6.2 Remaining public readers (must be migrated)

| File | Line | Table | Status |
|------|------|-------|--------|
| src/pages/ComplianceHub.tsx | 175 | tax_input_entries | public read |
| src/pages/ComplianceHub.tsx | 197 | tax_filings | public read |
| src/pages/ComplianceHub.tsx | 208 | tax_reminders | public read |
| src/hooks/useAuditTrail.ts | 87, 95 | audit_logs | public read |
| src/lib/audit.ts | 221 | audit_logs | public write |
| src/modules/compliance/repositories/complianceRepository.ts | — | tax tables | public read |
| src/modules/item-library/repositories/itemLibraryRepository.ts | 451 | item_catalog | dead merge fn |
| src/hooks/useDashboardData.ts | 287 | — | public read |
| src/hooks/useGlobalSearch.ts | 17 | — | public read |
| src/services/exportFetchers.ts | — | — | public read |
| src/services/exportCompilers.ts | 176 | — | public read |
| src/pages/LifetimeDataHub.tsx | — | — | public read |

## 6.3 Remaining public writers (must be migrated)

| File | Line | Table | Status |
|------|------|-------|--------|
| src/pages/Invoices.tsx | 243 | csrs (link) | public write |
| src/pages/Invoices.tsx | 246 | waybills (link) | public write |
| src/pages/ProjectDetail.tsx | 87 | projects | public read |
| src/services/quotationSync.ts | 267 | — | public write |
| src/pages/ViewBoq.tsx | 60 | boq_rows | public read |
| src/components/boq/BoqList.tsx | 53 | boqs | public read |
| src/pages/viewBOQActions.ts | 11 | boqs/boq_rows | public write |
| src/pages/EditRfq.tsx | 23, 24, 43, 56, 70 | rfqs, rfq_items | public read/write |
| src/pages/NewRfq.tsx | 23, 30, 33, 52 | rfqs, rfq_items | public read/write |
| src/pages/CsrFormPage.tsx | 114, 203, 304, 311, 412 | csrs, blank_csr_logs | public read/write |
| src/pages/EditClient.tsx | 20, 48 | clients | public read/write |
| src/pages/AddClient.tsx | 16 | clients | public write |
| src/pages/Login.tsx | 126 | profiles | public write (allowed) |

## 6.4 moduleAdapters fallback

`src/config/moduleAdapters.ts`:
- `resolveFetchClient(ctx)` at line 21 returns `ctx.tenantClient` if ready, else null.
- List adapters fall back to `supabase` when `ctx.tenantClient` is not supplied:
  lines 135-136, 320-321, 400-401, 606-607.
- After cutover every adapter caller must supply `tenantClient`.
- The fallback `client = tenantClient ?? supabase` must be removed or made
  fatal at cutover. Otherwise reads silently hit `public`.

# 7. AREA-BY-AREA FINDINGS

| Area | Public tables | Tenant client | Migrated | Blocking |
|------|--------------|---------------|----------|----------|
| Invoices | none | yes | yes | no |
| Payments | none | yes | yes | no |
| Quotations | quotation_items (tenant ok) | yes | partial | no |
| Waybills | none | yes | yes | no |
| CSRs | csrs (residual) | partial | partial | yes |
| Receipts | none | yes | yes | no |
| Clients | clients (residual) | partial | partial | yes |
| Projects | projects (residual) | partial | partial | yes |
| BOQs | boqs, boq_rows | no | no | yes |
| RFQs | rfqs, rfq_items | no | no | yes |
| Letters | none | yes | yes | no |
| Signatories | none | yes | yes | no |
| Bank accounts | none | yes | yes | no |
| Settings | settings | yes | yes | no |
| Tax (compliance) | tax_input_entries, tax_filings, tax_reminders | partial | no | yes |
| Item library | item_catalog, item_aliases | no | no | yes |
| Audit trail | audit_logs | no | no | yes |
| Devices | device_sequences | no | no | yes |
| Reports/Exports | all | partial | partial | yes |
| Dashboard/Search | mixed | partial | partial | yes |

# 8. FRONTEND MIGRATION STATUS

Frontend PRD v1.1 phase progress:
- P1 Infrastructure: COMPLETE.
- P2 Core list reads: ~60%.
- P3 Writes via tenant client: ~95%.
- P4 Global reads (dashboard, search, exports, compliance): ~45%.
- P5 Data migration: COMPLETE.
- P6 Cutover: NOT STARTED.

# 9. CUTOVER CONDITIONS

Cutover is safe only when ALL of these are true:

1. The 11 missing tables exist in the tenant schema with RLS.
2. `project_documents` and `quotation_items` are in the template.
3. `project_financials_v` is installed by provisioning or backfill.
4. The stray schema `eca34515-...` is dropped.
5. Every residual public read/write in section 6.3 uses the tenant client.
6. `moduleAdapters` fallback to `supabase` is removed or fatal.
7. `get_item_suggestions` reads the tenant schema.
8. Permission rows exist for waybill, project, csr, rfq, boq, letter,
   bank_account, signatory, tax_setting, project_document, item, audit, device.
9. The owner can perform full CRUD in the tenant schema.
10. A read-only schema-drift check reports zero missing tables.
11. Data row counts match between `public` and the tenant schema.
12. Audit copy in the tenant schema is verified against the public copy.

# 10. DEPENDENCY-ORDERED PLAN (A-G)

Plan A — Fix financial-view and template drift (root cause D).
Add `project_documents`, `quotation_items` to the template.
Add `project_financials_v` to the provisioning engine.
Plan A is prerequisite for every other plan.

Plan B — Extend the template (root cause A + C).
Add the 11 tables to `_prov_get_template_tables()`.
Map each to a resource in `_prov_table_to_resource()`.
Extend `_prov_seed_default_permissions()`.

Plan C — Backfill the live entity (root cause B).
Write one data migration that clones the 11 tables into
`entity_bigdrops-main_main`, installs RLS, and copies data with preserved IDs.
Bypass the `ready` idempotency short-circuit.

Plan D — Data migration (section 4 order).
Copy the remaining public tables to the tenant schema in order.
Keep public copies until verification.

Plan E — Permissions (section 5).
Seed the missing resources for the owner.
Grant other users per role.

Plan F — Source migration (sections 6.2, 6.3, 6.4).
Route every residual call through `tenantClient`.
Remove the `moduleAdapters` fallback.
Rewrite `get_item_suggestions`.
Verify no `supabase.from('<tenant-table>')` remains in source.

Plan G — Cutover and verification.
Drop the stray schema.
Run the schema-drift check.
Run the row-count reconciliation.
Enable P6 in the frontend.
Document the remaining items in a fresh report.

# 11. RISKS AND LIMITATIONS

| Risk | Severity | Mitigation |
|------|----------|------------|
| Row ID mismatch after data copy | High | Copy with preserved IDs; verify counts |
| audit_logs divergence | High | Keep public copy; verify tenant copy |
| moduleAdapters silent fallback | High | Make fallback fatal at cutover |
| get_item_suggestions on public | High | Rewrite before cutover |
| Blanket permission grants | High | Never grant all users all resources |
| Missing permission resources lock out users | High | Seed before P6 |
| Templates table is empty (no convenience) | Low | Not a security boundary |
| Project financials view missing for new entities | Medium | Fix in Plan A |
| Letters/boqs/rfqs clone went to wrong schema | Medium | Drop stray schema |

# 12. PROGRESS AND READINESS

Implementation progress: 87.13%.

Rationale:
- Backend: complete and live.
- Tenant schema: provisioned, RLS in place, 21 tables.
- 13 of 24 domain tables migrated (incl. children).
- Frontend: 3 of 6 phases complete.
- 11 tables and the item-library/compliance/audit/device areas remain.

Cutover readiness: LOW.

Rationale:
- 11 tables missing from the tenant schema.
- Permission gaps: 13 resources have zero rows.
- Residual public reads and writes remain.
- moduleAdapters fallback can silently read `public`.
- The item-library functions are hard-wired to `public`.
- The stray schema is not cleaned.
- P6 is not started.

The two percentages are separate on purpose.
High implementation progress does not imply cutover safety.

# 13. FINAL VERDICT

The backend migration is substantially implemented but not complete.
The tenant schema is secure for the tables it has.
The engine template is the root cause of the 11 missing tables.
The `ready` idempotency status blocks automatic backfill.
The frontend has residual public access in 6 areas.

Cutover must NOT start until:
- Plans A, B, C, D, E, F are complete.
- The schema-drift check reports zero missing tables.
- Row counts match between `public` and the tenant schema.
- The owner can perform full CRUD in the tenant schema.

Status: DO NOT CUT OVER YET.

## Verification

- Live database queries (SELECT-only): passed.
- Migration files reviewed: passed.
- Source census (src/): passed.
- bun run audit:load: skipped (no code changes)
- bun run typecheck: skipped (no code changes)
- bun run build: skipped (no code changes; hardware policy)
- git status: unchanged (no code or DB changes)

## Risks or limitations

This report is based on live SELECT-only queries and source inspection.
It does not modify the database.
The exact 13-heading structure defined by the user was not available;
this report uses a 13-section structure matching the required content.

## Deferred work

- Permission template records (permission_templates / permission_template_items).
- A schema-drift checker as a repeatable SQL script (option E).
- Deciding shared vs per-entity for item_catalog/item_aliases.
- Deciding whether device_sequences stays shared or becomes per-entity.
