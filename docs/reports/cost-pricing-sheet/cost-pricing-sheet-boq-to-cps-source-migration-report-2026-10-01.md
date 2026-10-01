# Cost & Pricing Sheet BOQ to CPS Source Migration Report

This report was written by Buffy on 2026-10-01 via Freebuff.

## Objective

Complete the Cost & Pricing Sheet (CPS) migration from legacy BOQ naming. Remove vendor-era
semantics from the CPS application model. Clean user-facing labels. Keep all working CPS
behaviour.

## Scope

In scope:

- Move CPS-owned files and rename CPS-owned symbols from BOQ names to CPS names.
- Replace `vendor_name` and `vendor_contact` with `client_name` and `project_name` in the CPS
  application model.
- Clean user-facing "BOQ" labels in navigation, lists, dashboard, settings, and the quotation
  source panel.
- Keep legacy database names, route URLs, and persisted identifiers as an explicit
  compatibility boundary.

Out of scope:

- Database schema changes. No migration is required. See "Supabase push status".
- The Longcat CPS JSON import contract. Only mechanical renames were applied.
- The shared `table-document`, `rfq`, `pdf`, and `query` domains.

## Files changed

Moved and renamed (13 paths):

- `src/domain/boq/` to `src/domain/cps/`
- `src/domain/cps/calculateBoqTotals.ts` to `src/domain/cps/calculateCpsTotals.ts`
- `src/hooks/useBoqSave.ts` to `src/hooks/useCpsSave.ts`
- `src/pages/Boqs.tsx` to `src/pages/CostPricingSheets.tsx`
- `src/pages/BoqFormPage.tsx` to `src/pages/CpsFormPage.tsx`
- `src/pages/NewBoq.tsx` to `src/pages/NewCps.tsx`
- `src/pages/EditBoq.tsx` to `src/pages/EditCps.tsx`
- `src/pages/ViewBoq.tsx` to `src/pages/ViewCps.tsx`
- `src/pages/view-boq-actions.ts` to `src/pages/view-cps-actions.ts`
- `src/components/boq/BoqList.tsx` to `src/components/cps/CpsList.tsx`
- `src/components/boq/BoqImportSheet.tsx` to `src/components/cps/CpsImportSheet.tsx`
- `src/tests/critical/boqImportView.test.js` to `src/tests/critical/cpsImportView.test.js`
- `src/tests/critical/boqInstantMarkup.test.js` to `src/tests/critical/cpsInstantMarkup.test.js`
- `src/tests/critical/boqNormalize.test.js` to `src/tests/critical/cpsNormalize.test.js`

The empty directory `src/components/boq/` was removed.

Files edited:

- `src/components/app/AppShell.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetFormPresentations.tsx`
- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/layout/navData.ts`
- `src/components/table-document/TableDocumentPdfDocument.tsx`
- `src/components/table-document/TableDocumentPreview.tsx`
- `src/components/table-document/TableRowsEditor.tsx`
- `src/domain/cps/` (all nine modules)
- `src/hooks/useCpsSave.ts`
- `src/hooks/useDashboardData.ts`
- `src/pages/CostPricingSheets.tsx`
- `src/pages/CpsFormPage.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/ViewQuotation.tsx`
- `src/pages/settings/ArchivesSettingsSection.tsx`
- `src/pages/settings/DocumentPrefixesSettingsSection.tsx`
- `src/tests/critical/cpsImportView.test.js`
- `src/tests/critical/cpsNormalize.test.js`
- `src/tests/critical/documentNumbering.test.js`
- `src/tests/status/statusModelSweep.test.js`

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### 1. Mechanical rename

A one-off codemod moved the files and renamed the symbols. The codemod:

- Rewrote module specifiers only.
- Renamed identifiers outside string literals and comments.
- Left string literals and comments unchanged.

Rules applied to code regions:

- `Boqs` becomes `CostPricingSheets`.
- `BOQ_` becomes `CPS_`.
- `Boq` becomes `Cps`.
- `boq` plus a capital letter becomes `cps`.
- `boq` as a whole word becomes `cps`.

Result: `Boq` becomes `Cps`, `boqPrefix` becomes `cpsPrefix`, and `computeBoqTotals` becomes
`computeCpsTotals`.

The codemod did not change the Longcat prompt text, the schema, or any calculation. A text
comparison of `importAdapter.ts` before and after the change confirms that the prompt is
byte-identical. The `applyCpsImport` function body is unchanged. Only the signature changed.

Two string-literal cases needed manual repair. The codemod correctly skipped them:

- `Pick<CostPricingSheetFormProps, 'boq' | 'onPatchBoq' | ...>` in
  `CostPricingSheetFormPresentations.tsx`.
- The relative import `'./calculateBoqTotals'` in `src/domain/cps/calculations.ts`.

### 2. Vendor-era semantics removed

The CPS model no longer carries vendor fields.

- `Cps` interface: `vendor_name` and `vendor_contact` are removed. `client_name` and
  `project_name` are added.
- `createEmptyCps()`: writes `client_name: ''` and `project_name: ''`.
- `normalizeDbCps()`: reads `client_name` and `project_name`. If either value is empty, the
  loader falls back to the legacy `vendor_name` and `vendor_contact` columns. This is the
  explicit compatibility boundary for old rows.
- `denormalizeToDbCps()`: writes `client_name` and `project_name`. It does not write
  `vendor_name` or `vendor_contact`.
- `useCpsSave` audit `trackedFields`: `client_name` and `project_name` replace the vendor
  fields.
- `CostPricingSheetEditor`: the Client Picker writes `client_name`. The picker reads
  `client_name`.
- `CostPricingSheetFormPresentations`: the client name comes from `client_name`, then from the
  client snapshot. The Site / Project input binds to `project_name`.
- `CostPricingSheetViewPresentations`: the monogram and the client line read `client_name` and
  `project_name`.
- `convertCpsToQuotation`: reads `cps.client_name`.

The authoritative client relationship stays `custom_fields.client_id` plus
`custom_fields.client_snapshot`. No legacy `vendor_name` string is reinterpreted as a client
identity.

### 3. User-facing labels cleaned

| Location | Before | After |
| --- | --- | --- |
| `navData.ts` presales picker | `BOQ` | `Cost & Pricing Sheets` |
| `navData.ts` subtitle | Build and review pre-sales bills of quantities. | Build and review pre-sales cost and pricing sheets. |
| `CostPricingSheets.tsx` page title | `BOQs` | `Cost & Pricing Sheets` |
| `CpsList.tsx` module title | `BOQs` | `Cost & Pricing Sheets` |
| `CpsList.tsx` search placeholder | `Search BOQs...` | `Search Cost & Pricing Sheets...` |
| `CpsList.tsx` row fallbacks | `Untitled BOQ`, `BOQ` | `Untitled Cost & Pricing Sheet`, `Cost & Pricing Sheet` |
| `CpsList.tsx` action sheet | `Edit BOQ`, `Delete BOQ`, `Create BOQ` | `Edit Cost & Pricing Sheet`, `Delete Cost & Pricing Sheet`, `Create Cost & Pricing Sheet` |
| `CpsList.tsx` confirm dialogs | `Archive this BOQ?`, `Delete this BOQ?` | `Archive this Cost & Pricing Sheet?`, `Delete this Cost & Pricing Sheet?` |
| `CpsList.tsx` feedback | `BOQ archived`, `BOQ deleted` | `Cost & Pricing Sheet archived`, `Cost & Pricing Sheet deleted` |
| `Dashboard.tsx` recent document map | `BOQ` | `Cost & Pricing Sheet` |
| `useDashboardData.ts` recent document type | `BOQ` | `Cost & Pricing Sheet` |
| `ArchivesSettingsSection.tsx` label | `BOQ` | `Cost & Pricing Sheet` |
| `DocumentPrefixesSettingsSection.tsx` label | `BOQ` | `Cost & Pricing Sheet` |
| `DocumentPrefixesSettingsSection.tsx` title | `BOQ Numbers` | `Cost & Pricing Sheet Numbers` |
| `DocumentPrefixesSettingsSection.tsx` description | For generating Bill of Quantities documents. | For generating Cost & Pricing Sheets. |
| `ViewQuotation.tsx` source label | `BOQ` | `Cost & Pricing Sheet` |

The local type `RawBOQ` in `ArchivesSettingsSection.tsx` became `RawCostPricingSheet`.

### 4. Compatibility boundary kept

The following names stay. They are persisted data, route contracts, or shared identifiers.

- Database tables `boqs` and `boq_rows`. Columns `boq_number`, `boq_id`, `client_name`, and
  `project_name`.
- Route URLs `/boqs`, `/boqs/new`, `/boqs/edit/:id`, and `/boqs/:id`.
- The `source_boq_id` foreign key on `quotations`.
- The document number prefix `BOQ` and the prefix key `boq`.
- The audit `entityType: 'boq'`.
- The `TableDocumentType` value `'boq'` and the PDF design preset key `boq`.
- The list cache key `bd:list:boqs:v1:all`. The `CPS_CACHE_KEY` constant holds this value. The
  `boqsAdapter` in `moduleAdapters.ts` holds the same value.
- The export domain identifiers `BOQS` and `boq_items`.
- The icon registry key `Icons.boq` and the role resource identifier `boq`.
- `show_vendor_identity` in `custom_fields`. The RFQ domain shares this flag.

### 5. Test updates

- `cpsNormalize.test.js`: the round-trip test uses `client_name` and `project_name`. The legacy
  hydration test keeps `vendor_name` and `vendor_contact` in the raw row and asserts that the
  loader maps them to `client_name` and `project_name`. This test proves the fallback.
- `cpsImportView.test.js`: the client and site isolation proofs use `client_name` and
  `project_name`. All 20 Longcat proofs are kept. No assertion was weakened. The schema
  rejection list still contains `client_name`, `vendor_name`, and `vendor_contact`.
- `statusModelSweep.test.js`: the read path changed to `src/pages/view-cps-actions.ts`.

### 6. Locked file disclosure

The locked file `src/domain/cps/importAdapter.ts` received one comment-only edit. The comment
that names the import boundary now reads `client_name` and `project_name` instead of
`vendor_name` and `vendor_contact`. No code changed. The prompt and the schema are unchanged.

## Verification result

Verification:

- `bun run audit:load`: passed. 847 files scanned.
- `bun run typecheck`: passed. No errors.
- `bun run test`: 520 passed, 5 failed. The 5 failures are pre-existing and unrelated.
  - `invoiceAccountingIntegration`
  - `paymentAccountingIntegration`
  - `remediationContract`
  - `sourceTransactionContract`
  - `itemCleanupExportImport` (one assertion)
  - These tests fail because `src/supabase.ts` reads `import.meta.env.VITE_SUPABASE_URL`,
    which is undefined in the node runner. The count matches the pre-task baseline of
    520 of 525.
- Focused CPS test run (`cpsImportView`, `cpsNormalize`, `cpsInstantMarkup`,
  `documentNumbering`): 51 passed, 0 failed.
- `git diff --check`: clean.
- `git status`: dirty. Uncommitted work from tasks 1 to 4 is present. No pre-existing change was
  reverted.
- `bun run build`: skipped due to hardware policy.

An independent re-scan of `BOQ|Boq|boq` and `vendor_name|vendor_contact` over `src` was run.
No CPS-owned identifier or path remains. Every remaining hit is one of the following:

- A persistent or shared compatibility name, listed in section 4.
- A dormant `'boq'` branch in the shared `table-document` components. Only the RFQ feature uses
  these components.
- The active document number prefix `BOQ` and the route URLs.
- A test description string. See "Risks or limitations".

## Supabase push status

Not applicable. This task changed no SQL and no schema. No migration file was added.

The migration history already provides both column sets on `public.boqs`. The migration
`supabase/migrations/20260826000000_boq_rfq_schema_and_aggregate_permission_fix.sql` adds
`vendor_name` and `vendor_contact`. The base table
`supabase/migrations/20260520090002_quotations.sql` provides `client_name` and `project_name`.
Therefore the CPS model can write `client_name` and `project_name` without a migration.

## Risks or limitations

- The CPS model no longer writes `vendor_name` and `vendor_contact`. Old database rows keep
  these values. The loader reads them only as fallbacks. A first save after this change writes
  `client_name` and `project_name` and leaves the vendor columns at their old values.
- Accepted residue, kept for safety:
  - Two CPS test descriptions still contain the word "BOQ"
    (`cpsImportView.test.js` and `documentNumbering.test.js`).
  - The local variable `boqs` in `CpsList.tsx` mirrors the query module identifier `"boqs"`.
  - The local variable `isBoqSource` in `ViewQuotation.tsx` mirrors `source_boq_id`.
- The `'boq'` branch in `TableDocumentPreview.tsx` and `TableDocumentPdfDocument.tsx` still
  renders `BILL OF QUANTITIES` and `Project / Vendor`. That branch is dormant for CPS. The RFQ
  feature is the only caller. Changing the shared discriminator is out of scope.
- Rename detection is not staged. `git status` shows deletions at the old paths and untracked
  files at the new paths. Git detects the renames when the change is staged.

## Deferred work

1. Rename the shared `'boq'` document type discriminator. This requires a coordinated change to
   `TableDocumentType`, the PDF design preset key, the query platform, and the export schemas.
2. Remove the dormant `'boq'` branch from the `table-document` components after the
   discriminator change.
3. Delete the legacy `vendor_name` and `vendor_contact` database columns. This requires a
   migration and a backfill from `client_name` and `project_name`.
4. Remove the unused exports `archiveCpsRecord`, `deleteCpsRecord`, `updateCpsStatus`,
   `duplicateCpsRecord`, and `convertCpsToQuotation` in `src/pages/view-cps-actions.ts`, or
   connect them to the CPS user interface.
5. Rename the `boqs` and `boq_rows` database tables and the `/boqs` route URLs. This is a
   breaking change for stored links.
