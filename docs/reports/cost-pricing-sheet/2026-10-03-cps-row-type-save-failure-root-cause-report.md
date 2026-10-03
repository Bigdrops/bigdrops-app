# CPS Row-Type Save Failure Root Cause Report

This report was written by Muse Spark on 2026-10-03 via OpenCode.

## Objective

Diagnose the production Mobile/Fold CPS save failure, repair the divergence at its authoritative source, and cover mixed grouped and ungrouped documents with regression tests.

## Scope

- `supabase/migrations/20261003204928_cps_rows_row_type_canonical.sql`
- `src/tests/critical/cpsSaveSerialization.test.js`
- This report.

No application source file changed. No business semantic changed.

## Files Changed

- `supabase/migrations/20261003204928_cps_rows_row_type_canonical.sql`
- `src/tests/critical/cpsSaveSerialization.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-row-type-save-failure-root-cause-report.md`

## Skills Used

Skills used: karpathy, supabase
Documentation standard: ASD-STE100 Simplified Technical English

---

## Exact Observed Production Error

```text
new row for relation "cps_rows" violates check constraint "cps_rows_row_type_check"
```

The tested CPS contained 15 items, 3 groups, and a selected client.

## Current CPS Architecture Confirmation

```text
CpsFormPage
→ CostPricingSheetEditor (shared production controller)
→ useLayoutMode
├── Desktop → CostPricingSheetDesktopForm
└── Mobile/Fold → CostPricingSheetForm
```

Both presentations produce `TableDocumentRow` state and converge at one serializer. No presentation owns a persistence contract.

---

## Current Domain: Every Active CPS row_type

The canonical type is `TableRowType = 'item' | 'section'` in `src/domain/table-document/types.ts`.

| Value | Meaning | Created by |
| --- | --- | --- |
| `item` | Ordinary priced line item | `createEmptyTableRow` default, `createCpsRow` item branch, `appendCpsRow`, `insertCpsRow`, import adapter item mapping |
| `section` | Group container header | `createCpsRow` section branch, `appendCpsRow` section path, import adapter section mapping |

Group membership lives in `row.group_id` (string or null). Ungrouped items carry null. Groups persist as `cps_rows` with their own `group_id` identity plus `section_title`. Group metadata is not stored elsewhere.

Normalization coerces any non-section value to `item` on read. No current code creates, reads, or branches on `section_header`, `option`, or `group`. Repository search returns zero references to those values in `src`. They are dead vocabulary, not compatibility reads.

## Normalization Behavior

`normalizeDbCps` and `mapLegacyRowToRow` map stored rows into the two-value domain model. `denormalizeToDbCpsRow` passes `row_type` through untouched inside the spread remainder. No translation occurs at the boundary in either direction.

## Group Representation

Groups are first-class persisted rows: `row_type = 'section'`, `section_title` set, `group_id` self-identifying. Items reference groups by that key. Order is positional (`sort_order`); membership never derives from adjacency.

---

## Save Pipeline: Exact Mobile and Desktop Paths

Mobile path:

```text
CostPricingSheetForm save payload
→ CostPricingSheetMobileHost commit (mergeMobilePayload)
→ editor setCps plus CpsFormPage currentCpsRef
→ useCpsSave validate, buildPayload, persist, afterSave
→ denormalizeToDbCpsRow per row
→ cps_rows delete plus insert
```

Desktop path:

```text
CostPricingSheetDesktopForm callbacks
→ editor state
→ CpsFormPage currentCpsRef
→ useCpsSave (same strategy)
→ denormalizeToDbCpsRow per row
→ cps_rows delete plus insert
```

Convergence point: `useCpsSave` with the single serializer `denormalizeToDbCpsRow`. Imported rows pass through the same serializer. There is no mobile-only or import-specific serialization.

## Exact Serializer

`denormalizeToDbCpsRow` in `src/domain/cps/normalize.ts` strips transient keys (`id`, `_uiKey`, timestamps), packs presentation fields into `cells`, and spreads the remainder — including `row_type` verbatim — into the insert payload with `cps_sheet_id`, numeric `quantity`, and `sort_order`.

## Exact DB Payload row_type Values

Items emit `item`. Groups emit `section`. A 15-item, 3-group document emits fifteen `item` rows and three `section` rows.

## Exact Offending Row and Value

The offending value is `section` on each group container row. Item rows already satisfy the hosted invariant. The failure reproduces for every CPS containing at least one group, on either presentation, because both share the serializer.

---

## Database: Check Expression

Hosted expression before repair, identical in all 12 schemas (`tenant_master_template` plus 11 `entity_*` schemas):

```sql
CHECK ((row_type = ANY (ARRAY['section_header'::text, 'item'::text, 'option'::text])))
```

## Repository Migration Definition

No repository migration defines this check. The template seed creates `boq_rows` with bare `row_type text NOT NULL`. The expression entered hosted history through the deleted May-2026 remote schema dump, which defined `boq_rows_row_type_check` with the same expression. The BOQ to CPS rename migration renamed that constraint to `cps_rows_row_type_check` without touching its expression.

## Hosted Constraint State

Verified through the approved CLI query path before and after repair. Before: stale three-value vocabulary everywhere. After: canonical two-value vocabulary everywhere (see Fix).

## Allowed row_type Values

Before repair: `section_header`, `item`, `option`. After repair: `item`, `section`.

---

## History: Legacy BOQ Semantics

The May-2026 BOQ vocabulary used `section_header` for section containers, `item` for rows, and `option` for an alternate row class. The September BOQ reconstruction introduced `group_id` membership with `section` containers in application code but never migrated the invariant. The October BOQ to CPS rename preserved table contents and renamed the constraint while retaining its obsolete expression. That omission is the exact divergence point.

## What the Migration Changed and Preserved

The rename changed table, column, constraint, index, policy, prefix-key, activity, and permission names. It preserved document numbers, prefix values, cursors, and row contents. It did not change row_type semantics in either direction.

---

## Root Cause Classification

**B. STALE DATABASE INVARIANT.**

Evidence:

- The application contract `item` and `section` is implemented in factories, row operations, normalization, editor, both presentations, import, and tests, with zero references to the hosted vocabulary anywhere in `src`.
- The hosted expression originates from a deleted May-2026 dump and matches no current producer or consumer.
- Stored-data probe across all entity schemas found exactly one `cps_rows` row (`item` in the main schema). No `section_header` or `option` value exists anywhere.
- The single serializer serves both presentations and import, so no presentation-side divergence exists to repair.

## Canonical Current CPS Contract

- Allowed `row_type` values: `item`, `section`.
- `item`: priced line row with quantity, unit, CP, SP, and optional `group_id`.
- `section`: group container with `section_title` and self-identifying `group_id`.
- `group_id`: string reference for members, null for ungrouped rows, independent of adjacency.
- Legacy `section_header` and `option`: obsolete. Not readable as distinct semantics, not writable, not accepted.

## Why the Repair Location Is Authoritative

The database owns the invariant, and the invariant contradicts the entire application. Repairing the application to emit dead vocabulary would require rewriting every producer, consumer, test, and stored-data reader to serve a check that nothing uses. Updating the check to the contract every layer already implements is the single-point authoritative repair.

---

## Fix: Exact Repair

Forward migration `20261003204928_cps_rows_row_type_canonical.sql`:

- Loops `tenant_master_template` and every `entity_*` schema containing `cps_rows`.
- Asserts no row holds a value outside `item` and `section`, and fails loudly otherwise.
- Drops the stale check under both its current and pre-rename names.
- Adds `cps_rows_row_type_check` with `(row_type = ANY (ARRAY['item', 'section']))`.
- Reloads the PostgREST schema cache.

No group to section translation exists anywhere in this change. The application already emits the canonical values.

## Why This Is Not a Compatibility Patch

The migration aligns the invariant with the contract all producers already implement. It adds no translation layer, no dual vocabulary, no boundary mapping, no presentation-specific path, and no fallback insert. The application diff for this repair is empty by design.

## Whether Migration Was Required

Yes. The invariant lives in the database. Only a migration can change it.

## Existing-Data Handling

Probed before migration: one stored row (`item`), valid under both expressions. The migration asserts the absence of out-of-contract values in every schema before altering anything, so any unknown legacy data would abort loudly rather than persist silently. No data rewrite was required or performed.

## Confirmation: No Group to Section Regression

Groups remain `section` rows with `group_id` membership, exactly as the domain defines. The migration changes which values the database accepts, not what groups mean.

## Confirmation: Constraint Not Casually Weakened

The invariant still exists under its original name. It accepts exactly the two canonical values and rejects everything else, including the obsolete vocabulary. It was not dropped, broadened, or disabled.

---

## Regression: Mixed Ungrouped and Grouped Test

New `src/tests/critical/cpsSaveSerialization.test.js` builds a mixed document (ungrouped items, two groups, multiple members per group, non-contiguous membership) through the production factories and asserts:

- Every serialized payload `row_type` is inside the canonical set, and legacy values never appear.
- Grouped items retain exact `group_id` values; ungrouped items retain null.
- Repeated serialization keeps identical group identity.
- Normalization round-trip preserves types and membership without drift.
- The append path emits only canonical types.

## Non-Contiguous Membership Test

Included in the new file: a member separated from its group by unrelated rows keeps its `group_id` through serialization, with no adjacency inference.

## Import Save Compatibility

Import rows flow through `applyCpsImport` into the same `TableDocumentRow` model and the same serializer. Existing `cpsImportView` tests (20 cases) pass unchanged. The adapter was not modified.

## Desktop Compatibility

Desktop rows are the same `TableDocumentRow` model through the same serializer. Existing row-operation, normalize, and markup tests pass unchanged.

## Mobile and Fold Compatibility

The mobile commit produces the same model through the same serializer. String identity, group resolution, and ungrouping behavior are unchanged and covered by the new test.

## Stable Identity

Covered by the new test: repeated serialization yields identical `group_id` sequences, and normalization preserves them.

## Calculations Unchanged

`calculateCpsTotals.ts`, `calculations.ts`, markup formulas, and Decimal paths were not touched. Calculation and markup test suites pass unchanged.

## Numbering Unchanged

Prefix engine, cursors, retry, width, and preview were not touched. Numbering tests pass unchanged.

## UI Unchanged

No component, sheet, dialog, card, FAB, placement, or style file changed.

---

## Verification Result

Verification:

- `supabase db push`: passed on first attempt. Migration `20261003204928_cps_rows_row_type_canonical.sql` applied.
- Hosted verification: all 12 schemas now report `CHECK ((row_type = ANY (ARRAY['item'::text, 'section'::text])))` through the approved CLI query path.
- Stored-data probe: one `item` row across all schemas, before and after. No legacy values. No data rewrite needed.
- `bun run audit:load`: ran. Findings are pre-existing (oversized files, broad selects elsewhere). Nothing introduced by this change (one SQL migration plus one test file).
- `bun run typecheck`: passed.
- Targeted tests: 134 passed, 0 failed across save serialization (new, 5), row operations, normalize, instant markup, import view, calculations, and document numbering.
- `git diff --check`: passed with no output.
- `git status`: two new files only (migration plus test). No application source modified.
- Migration and Supabase verification: push plus hosted re-query as above.
- `bun run build`: not executed per hardware policy.

## Supabase Push Status

Passed. Migration applied to hosted on first push with no errors. No manual edits. No dashboard changes.

## Risks or Limitations

- No live save was performed against hosted with real user data in this task. The payload class that failed is covered by the new serialization test, and the hosted invariant now accepts exactly that class.
- Pre-existing `audit:load` findings elsewhere in the repository were not addressed. They are unrelated to this repair.
- The single-group-delete semantic disagreement remains deferred and is unaffected.
