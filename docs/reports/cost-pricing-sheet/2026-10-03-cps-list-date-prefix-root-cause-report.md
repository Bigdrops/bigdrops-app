# CPS List Date and Prefix Root Cause Report

This report was written by Muse Spark on 2026-10-03 via OpenCode.

## Objective

Correct CPS list metadata to show the canonical document date, and audit why automatic CPS numbers use SASBOQ after the BOQ to CPS rename. Preserve save, numbering continuity, and history.

## Scope

- `src/config/moduleAdapters.ts`
- `src/components/cps/CpsList.tsx`
- `src/tests/critical/cpsListDate.test.js`
- This report.

No prefix, numbering, schema, save, view, calculation, or UI-architecture change was made.

## Files Changed

- `src/config/moduleAdapters.ts`
- `src/components/cps/CpsList.tsx`
- `src/tests/critical/cpsListDate.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-list-date-prefix-root-cause-report.md`

## Skills Used

Skills used: karpathy
Documentation standard: ASD-STE100 Simplified Technical English

---

## Invoice Reference: Exact Files Inspected

- List card mapping: `src/pages/Invoices.tsx` (`renderInvoiceRow`).
- Card component: `src/components/layout/ModuleRowCard.tsx` (shared with CPS).
- Date formatter: `src/lib/formatters/date.ts` (`formatDisplayDate`).
- List query platform: `src/context/DocumentQueryContext.tsx` plus `src/config/moduleAdapters.ts`.

## Invoice Metadata Hierarchy

Title holds the client name. Subtitle holds the invoice number. Tertiary holds the formatted issue date with a `No date` fallback. An amount sits at the card edge. Status renders only as badges from a status resolver. The date format is `formatDisplayDate` with `en-GB` locale and day short-month year options, which yields values such as 30 Sept 2026.

## Invoice Canonical Date Source

`invoice.issue_date`, persisted on the parent record and projected by the invoice list query.

## CPS List Before: Exact Files

- Page: `src/pages/CostPricingSheets.tsx` (mounts `DocumentQueryProvider` for `cps_sheets` plus `CpsList`).
- List: `src/components/cps/CpsList.tsx` (query consumer plus `ModuleRowCard` mapping).
- Query: `cpsSheetsAdapter` in `src/config/moduleAdapters.ts`.

## Current Card Metadata Mapping

Title holds the client name or title. Subtitle holds the CPS number. Tertiary held `cps.status || 'open'`. The badge held the same status again through `statusLabel`.

## Source of Lowercase open

`tertiary={cps.status || 'open'}` in `CpsList.tsx`. It duplicates the badge as a metadata line.

## Source of OPEN Badge

`statusLabel={cps.status || 'open'}` with warning and success token classes in the same file. It stays unchanged.

## Current List Sorting Field

`created_at` descending (`initialSortBy` in the CPS adapter). Latest means most recently created. No sorting defect was found, so sorting was not changed.

---

## Canonical CPS Date Field

`issue_date` on the `cps_sheets` parent record.

## Form Source

The New and Edit form Issue Date field, held in form document state and committed through the editor into the save payload.

## Save Payload Mapping

`cps_number`, `title`, `issue_date`, `project_name`, `notes`, client fields, rows, and columns flow through `useCpsSave` into the parent record. No date translation occurs.

## Persisted Value on Recent Lorem Ipsum Records

Hosted probe on the main entity schema: `SASBOQ-000004`, `SASBOQ-000005`, and `SASBOQ-000006` each persist `issue_date` `2026-10-03` with status `open`. The visible Issue Date persisted correctly. The defect was never in the save path.

## List Query Mapping

The CPS adapter selected `id, cps_number, client_name, created_at, status, project_id, title, total`. It never selected `issue_date`, so the card could not render it. This omission is the root cause of the missing date.

## Root Cause of Missing Date

Projection omission in the list adapter, combined with a card mapping that filled the metadata line with status. Persistence, hydration, and normalization are all correct.

## Exact Fix

- Added `issue_date` to the CPS adapter select projection.
- Set card tertiary to the formatted `issue_date` with a `No date` fallback, using invoice-identical formatter options.
- Versioned both list cache keys from `v1` to `v2` (adapter plus list constant) so previously cached rows without the field cannot render stale cards.

## Final Date Formatting Behavior

`formatDisplayDate` with empty fallbacks, `en-GB` locale, and two-digit day, short month, and numeric year options. Missing or invalid dates render `No date`, matching the Invoice convention. The status badge remains the only status representation.

---

## Prefix: Current CPS Numbering Resource Key

`cps_sheets`. Used by the form page, the save hook, the Settings UI (labeled Cost & Pricing Sheet with no BOQ residue), and the prefix engine default map.

## Current Configured Prefix

`SASBOQ`, stored explicitly in the tenant `settings.document_prefixes` under `cps_sheets`.

## Current Default Prefix

`BOQ` (`DEFAULT_PREFIXES.cps_sheets`). It applies only when no valid configured value exists.

## Current Cursor

Family `SASBOQ-` at sequence 8, consistent with consumed numbers through `SASBOQ-000006` plus uniqueness skip margin. Width is 6 per the canonical serial contract.

## Current Width

6-digit zero-padded serials. Unchanged.

## Exact Source of SASBOQ

The tenant-configured `cps_sheets` prefix value in hosted settings. The engine resolves it through `resolvePrefix`, which prefers a valid stored value over the default. The stored value is a coherent member of the tenant custom family (`SASINV`, `SASQUO`, `SASCSR`, `SASWBL`, `SASRFQ`, `SASPRJ`, `SASBOQ`), not a leftover default: the default is `BOQ`, which this tenant does not use for any module.

## BOQ to CPS Migration Treatment

The rename migration moved the prefix key from `boq` to `cps_sheets` and deliberately preserved the configured value, stating that existing numbers and cursor families must not change. Values, cursors, and historical numbers were untouched by design.

## Prefix Root-Cause Classification: A. Intentional Custom Prefix

`SASBOQ` is explicit tenant configuration inside a consistent custom family. It remains authoritative after the product rename. It is not a stale default (the default is `BOQ`), not a default-custom confusion (the key migrated cleanly and the Settings UI edits the correct key), and not a wrong lookup (every call site resolves `cps_sheets`).

## Whether SASBOQ Is Intentional or Stale

Intentional custom configuration. Evidence: explicit stored value, coherent SAS family across all modules, correct key resolution, migration documentation preserving values, and healthy cursor progression (000004 to 000006).

## Evidence-Derived Intended Future Behavior

Future automatic CPS numbers continue as `SASBOQ-000007` and onward through the unchanged prefix engine. No correction is required, so no prefix section below applies beyond continuity confirmation.

## Authoritative Layer Changed

None. No prefix code, configuration, default, or resource mapping changed.

## Future Prefix Behavior

Unchanged: resolve stored `SASBOQ`, allocate from the `SASBOQ-` cursor, skip occupied identifiers, retry on collision.

## Cursor Continuity

Preserved. Cursor value 8 was read, never written, by this task.

## Next Sequence Behavior

Next automatic allocation follows the engine from cursor 8 with occupied skip. Manual entries never advance it.

## Manual-Number Behavior

Unchanged. Manual identifiers occupy only themselves through the uniqueness constraint.

## Uniqueness and Skip Behavior

Unchanged. `withUniqueRetry` plus occupied skip remain the arbiters.

---

## History: Historical Numbers Not Modified

No historical `cps_number` was read for writing by this task. `SASBOQ-001` through `SASBOQ-000006` remain exactly as stored. No migration touched them.

## History: No List-Time Prefix Replacement

The list renders persisted numbers verbatim. No string replacement, masking, or cosmetic prefix logic was introduced.

---

## Regression

- Save lifecycle unchanged: form, editor, save hook, parent and row persistence, view transition, and React hook order untouched.
- ViewCps hook fix unchanged.
- `item` and `section` contract unchanged. No migration created.
- Group semantics unchanged.
- Calculations unchanged.
- Form UI unchanged.
- Invoice behavior unchanged: its list, formatter, adapter, and card were not modified.

## Verification Result

Verification:

- `bun run typecheck`: passed.
- Targeted tests: 137 passed, 0 failed across the new list-date file (4 tests: projection, card mapping, badge independence, cache versioning), save serialization, row operations, normalize, instant markup, import view, hooks order, calculations, and document numbering.
- `bun run audit:load`: ran. Findings are pre-existing elsewhere (oversized files, broad selects in other modules). The narrowed CPS projection introduces no new finding.
- `git diff --check`: passed. Only line-ending notices on touched files.
- `git status`: 2 modified source files plus 1 new test file. No other scope.
- Supabase and migration status: read-only probes only. No migration created. No hosted edit.
- Confirmation: `bun run build` was not executed per hardware policy.

## Supabase Push Status

Not applicable. No migration created. No hosted change.

## Remaining Known Limitations

- Cached v1 list rows expire naturally; the v2 key forces fresh fetches immediately.
- Date-range filtering and sorting still operate on `created_at`, as before. Only the displayed metadata line changed.
