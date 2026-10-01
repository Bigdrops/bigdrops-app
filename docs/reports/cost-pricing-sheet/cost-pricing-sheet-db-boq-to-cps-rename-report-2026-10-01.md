# Cost & Pricing Sheet BOQ to CPS Database Rename Report

This report was written by Buffy on 2026-10-01 via Freebuff.

## Objective

Remove the legacy BOQ names from the hosted database and from the source tree.

Rename the shared `'boq'` discriminator, the query module id, the export domain id, the
persisted keys, and the route URLs.

## Scope

In scope:

- Rename the database tables, columns, primary keys, foreign keys, check constraints, indexes,
  and row level security policies.
- Rename the workspace permission resource id and the stored prefix key.
- Move the activity event entity type value.
- Update the source tree to match the new names.
- Rename the route URLs to `/cost-pricing-sheets`.

Out of scope:

- The generated document number prefix value. See "Risks or limitations".
- The `audit_logs` table. See "Risks or limitations".
- Historical migration files and historical reports.

## Files changed

Added:

- `supabase/migrations/20261001081028_rename_boq_to_cps.sql`

Moved:

- `src/domain/pdf/customization/boq.ts` to `src/domain/pdf/customization/cps.ts`

Edited (35 files):

- `src/components/app/AppShell.tsx`
- `src/components/cps/CpsList.tsx`
- `src/components/layout/navData.ts`
- `src/components/table-document/TableDocumentExportController.tsx`
- `src/components/table-document/TableDocumentExportSegment.tsx`
- `src/components/table-document/TableDocumentPdfDocument.tsx`
- `src/components/table-document/TableDocumentPreview.tsx`
- `src/components/table-document/TableRowsEditor.tsx`
- `src/config/filterCapabilities.ts`
- `src/config/moduleAdapters.ts`
- `src/context/DocumentQueryContext.tsx`
- `src/domain/cps/calculateCpsTotals.ts`
- `src/domain/cps/factories.ts`
- `src/domain/cps/normalize.ts`
- `src/domain/cps/types.ts`
- `src/domain/pdf/customization/cps.ts`
- `src/domain/pdf/customization/types.ts`
- `src/domain/prefixConstants.ts`
- `src/domain/table-document/templateRegistry.ts`
- `src/domain/table-document/types.ts`
- `src/domain/team/role-permissions.ts`
- `src/hooks/useCpsSave.ts`
- `src/lib/iconRegistry.ts`
- `src/lib/pdf/types.ts`
- `src/lib/pdfDesignPreset.ts`
- `src/pages/CpsFormPage.tsx`
- `src/pages/ViewCps.tsx`
- `src/pages/ViewQuotation.tsx`
- `src/pages/view-cps-actions.ts`
- `src/pages/settings/AdminSettingsSection.tsx`
- `src/pages/settings/ArchivesSettingsSection.tsx`
- `src/pages/settings/DocumentPrefixesSettingsSection.tsx`
- `src/pages/settings/RoleBuilder.tsx`
- `src/services/exportFetchers.ts`
- `src/tests/critical/cpsImportView.test.js`
- `src/tests/critical/cpsNormalize.test.js`
- `src/tests/critical/documentNumbering.test.js`
- `src/types/exportHub.ts`
- `src/types/queryPlatform.ts`
- `src/utils/exportCompilers.ts`
- `src/utils/exportSchemas.ts`

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### 1. Database probe result

The live database held the legacy names in thirteen schemas. The list:

- Eleven tenant schemas, for example `entity_bigdrops-main_main`.
- `tenant_master_template`.
- One orphan schema with an empty `boqs` table and no dependencies.

Objects found:

- Tables `boqs` and `boq_rows`.
- Columns `boqs.boq_number`, `boq_rows.boq_id`, `quotations.source_boq_id`.
- Primary keys `boqs_pkey` and `boq_rows_pkey`.
- Check constraint `boq_rows_row_type_check`.
- Foreign keys `boq_rows_boq_id_fkey`, `boq_rows_boq_id_fkey_clone`, and
  `quotations_source_boq_id_fkey`.
- Indexes, for example `boqs_archived_at_idx`, `idx_boqs_archived_at`,
  `idx_quotations_source_boq_id`, and `boq_rows_boq_id_sort_order_idx`.
- Row level security policies `boqs_select`, `boqs_insert`, `boqs_update`, `boqs_delete`, and
  the four `boq_rows_` policies.
- The check constraint `check_document_prefixes_format`, which pattern checks the stored prefix
  key `boq`.
- The check constraint `activity_events_entity_type_check`, which permits the value `boq`.
- The workspace tables `public.permission_template_items` (2 rows) and
  `public.entity_permissions` (68 rows).
- Three functions: `public._perm_pair_is_canonical`, `public._prov_table_to_resource`, and
  `public._prov_get_template_tables`.

No view and no other function referenced the legacy tables.

### 2. Migration

The migration `20261001081028_rename_boq_to_cps.sql` applies this name map:

| Old name | New name |
| --- | --- |
| `boqs` | `cps_sheets` |
| `boq_rows` | `cps_rows` |
| `boq_number` | `cps_number` |
| `boq_id` | `cps_sheet_id` |
| `source_boq_id` | `source_cps_id` |

The migration has four parts:

1. A loop over the tenant schemas. It renames the columns, then the tables, then every
   constraint, index, and policy whose name contains `boq`. Postgres rewrites foreign keys
   automatically when a table or column is renamed.
2. It copies the stored prefix value from the `boq` key to the `cps_sheets` key in
   `settings.document_prefixes`. It then replaces the
   `check_document_prefixes_format` constraint, so the constraint checks
   `cps_sheets` instead of `boq`.
3. It drops the `activity_events_entity_type_check` constraint, moves the value `boq` to
   `cps_sheets`, and adds the constraint again with the new value.
4. It re-creates the three workspace functions. The migration reads each function body from
   the catalog and replaces the name text. The rest of each body stays unchanged. It then
   moves the resource id `boq` to `cps_sheets` in the three permission tables.

The migration ends with `NOTIFY pgrst, 'reload schema'`, so PostgREST picks up the renamed
tables.

Every step is guarded. The migration is safe to run twice.

### 3. Source tree

A codemod applied the rename to 43 files. The codemod changed both string values and
identifiers, because these names are database and URL values.

| Item | Old value | New value |
| --- | --- | --- |
| Tables | `boqs`, `boq_rows` | `cps_sheets`, `cps_rows` |
| Columns | `boq_number`, `boq_id`, `source_boq_id` | `cps_number`, `cps_sheet_id`, `source_cps_id` |
| Query module id | `boqs` | `cps_sheets` |
| Export domain id | `BOQS` | `CPS_SHEETS` |
| List cache key | `bd:list:boqs:v1:all` | `bd:list:cps_sheets:v1:all` |
| Icon registry key | `boq` | `cps_sheets` |
| Role resource id | `boq` | `cps_sheets` |
| Prefix key | `boq` | `cps_sheets` |
| PDF preset key | `boq`, `boq_pdf_design_preset` | `cps_sheets`, `cps_sheets_pdf_design_preset` |
| Document type discriminator | `boq` | `cps_sheets` |
| Audit entity type | `boq` | `cps_sheets` |
| Routes | `/boqs`, `/boqs/new`, `/boqs/edit/:id`, `/boqs/:id` | `/cost-pricing-sheets`, `/cost-pricing-sheets/new`, `/cost-pricing-sheets/edit/:id`, `/cost-pricing-sheets/:id` |

Points of care:

- The route replacement ran before the bare token rules. Otherwise `/boqs` became
  `/cps_sheets`.
- The codemod renamed `source_boq_id` before `boq_id`. Otherwise `source_boq_id` became
  `source_cps_sheet_id`.
- The codemod renamed the export domain id before the bare token rules. It also caught the
  identifier `updateBOQStatus`, which contains the letters `BOQS`. The result was the ugly
  name `updateCPS_SHEETStatus`. The repair renamed it to `updateCpsStatus`.
- The four exports in `src/pages/view-cps-actions.ts` are now `archiveCpsRecord`,
  `deleteCpsRecord`, `updateCpsStatus`, `duplicateCpsRecord`, and `convertCpsToQuotation`.
- `src/services/exportFetchers.ts` mapped the export child table to `boq_items`. That table
  never existed. The correct child table is `boq_rows`, which is now `cps_rows`. The new map
  points at `cps_rows`.
- The dormant Cost & Pricing Sheet branch in the shared `table-document` preview and PDF
  components now renders `COST & PRICING SHEET` and `Project / Client`.

### 4. Saved PDF preset protection

The browser stored the Cost & Pricing Sheet design preset under the local storage key
`boq_pdf_design_preset`. The rename moves the key to `cps_sheets_pdf_design_preset`.

`src/lib/pdfDesignPreset.ts` has a `LEGACY_DESIGN_PRESET_KEYS` map and a `readStoredPreset`
helper. `getPdfDesignPreset` and `hasSavedPdfDesignPreset` now read the current key first and
the legacy key second. A saved preset is not lost.

## Verification result

Verification:

- `supabase db push`: passed. The migration applied on the first attempt. No error occurred.
- Database re-scan: zero tables, zero columns, zero constraints, zero indexes, and zero
  policies still carry a `boq` name.
- Database spot check: `cps_sheets` exists in 13 schemas. `cps_rows` exists in 12 schemas. The
  old count was the same.
- Database spot check: `entity_bigdrops-main_main.cps_sheets` returns 3 rows.
  `entity_bigdrops-main_main.cps_rows` returns 1 row.
- Database spot check: the foreign key is `quotations_source_cps_id_fkey`. The indexes are
  `cps_sheets_pkey`, `cps_rows_pkey`, `cps_sheets_archived_at_idx`, and
  `idx_quotations_source_cps_id`.
- Database spot check: the permission tables hold 2 and 68 rows with the resource
  `cps_sheets`, and zero rows with the resource `boq`.
- Database spot check: `public._prov_get_template_tables()` returns `cps_sheets` and
  `cps_rows`. The three permission and provisioning functions no longer contain the text
  `boq`.
- Source re-scan: no file under `src` contains an old route, an old table name, or an old
  column name.
- `bun run audit:load`: passed. 847 files scanned. The warning counts are unchanged.
- `bun run typecheck`: passed. No errors.
- `bun run test`: 520 passed, 5 failed. The 5 failures are pre-existing and unrelated.
  - `invoiceAccountingIntegration`
  - `paymentAccountingIntegration`
  - `remediationContract`
  - `sourceTransactionContract`
  - `itemCleanupExportImport` (one assertion)
  - These tests fail because `src/supabase.ts` reads `import.meta.env.VITE_SUPABASE_URL`,
    which is undefined in the node runner. The count matches the earlier baseline of
    520 of 525.
- `git diff --check`: clean.
- `git status`: dirty. Uncommitted work from earlier tasks is present. No pre-existing change
  was reverted.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

Passed. The migration `20261001081028_rename_boq_to_cps.sql` is applied to the hosted project
`xqlpekpkbszpdgtuwybh`.

No error occurred and no second push was necessary.

## Risks or limitations

- **The generated document prefix value did not change.** The prefix key is now `cps_sheets`,
  but its stored value stays `BOQ`. For example a new sheet number is still `BOQ-000007`. This
  choice protects existing document numbers, the automatic cursor families, and the
  `sourceNumber.startsWith('BOQ-')` check in `ViewQuotation.tsx`. To change the value, update
  the stored prefix and `DEFAULT_PREFIXES.cps_sheets` in `src/domain/prefixConstants.ts`.
- **The `audit_logs` entity type check does not permit the new value.** The constraint
  `audit_logs_entity_type_check` permits only `invoice`, `quotation`, and `project`. The
  function `record_audit_log` writes to `audit_logs`. Therefore the Cost & Pricing Sheet audit
  row is rejected today. It was also rejected before the rename, because the old code wrote
  `boq`. This is a pre-existing defect. This task did not change it. The `useCpsSave` catch
  block hides the error.
- Deploy the code and the migration together. Between the two events the live site queries
  tables that no longer exist.
- The cache key changed. The first list load after the deploy refetches from the database.
- The saved PDF preset under the legacy key is read but not migrated. It stays in the browser
  storage until the user saves a new preset.
- `live-public-schema.sql` at the repository root is a schema dump artifact. It still shows
  `public.boqs`. That table no longer exists in the live database, so the file was already
  stale. This task did not regenerate it.
- The orphan schema `eca34515-0b30-482c-b12e-3963df164322` had an empty `boqs` table with no
  policies and no dependencies. The migration renamed it with the other schemas.

## Deferred work

1. Set the generated document prefix value to `CPS` for new tenants. This changes generated
   document numbers. It needs an explicit decision.
2. Widen `audit_logs_entity_type_check` to permit the Cost & Pricing Sheet entity type. This
   defect predates this task and also affects CSR, waybill, receipt, and letter audits.
3. Regenerate or remove the stale `live-public-schema.sql` dump.
4. Remove the legacy local storage read in `pdfDesignPreset.ts` after the preset keys have
   moved on all clients.
5. Remove the legacy prefix value read in `readStoredPreset` after the cutover period.
6. Rename the `settings.document_prefixes` automatic cursor families from `BOQ-` to `CPS-`
   when the prefix value changes.
