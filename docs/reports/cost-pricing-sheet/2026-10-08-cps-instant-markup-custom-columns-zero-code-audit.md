# CPS Instant Markup And Custom Columns Zero-Code Audit

This report was written by Codex on 2026-10-08 via Codex desktop.

Objective: Investigate two active CPS production defects without code changes.

Skills used: using-superpowers, systematic-debugging, react-dev, vercel-composition-patterns, typescript-advanced-types, supabase, verification-before-completion, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## 1. Executive Finding

FACT: The Instant Markup calculation formula uses current working SP as the base. Percentage uses `currentSp * (1 + percentage / 100)`. Fixed value uses `currentSp + value`. Evidence: `src/domain/cps/instant-markup.ts:69-76`.

FACT: The first functional divergence is eligibility. `isInstantMarkupEligible()` excludes every non-item row and every item whose CP is not greater than zero. Evidence: `src/domain/cps/instant-markup.ts:52-56`.

FACT: That CP eligibility rule conflicts with the active current-SP contract. Instant Markup is an SP operation. CP must remain immutable, but CP must not control whether a fixed-value markup can produce a new SP from zero. The current implementation blocks fixed-value markup for rows with SP `0` when CP is `0` or blank.

FACT: The attached screenshot shows rows with CP values and SP `0`, with Percentage mode selected and value `1000`. Under the approved zero-SP law, percentage markup from SP `0` remains `0`. That exact visible operation is a no-op by contract. It must not fall back to CP.

INFERENCE: The user's perception that markup is not working is probably caused by two combined issues: the selected Percentage operation on zero SP has no numeric effect, and the UI uses "stack" wording that implies a special visible product concept instead of normal Instant Markup. A separate confirmed defect remains for zero/blank-CP rows and fixed-value markup.

FACT: Column Settings creates and stores `custom_*` columns. Evidence: `src/components/useInvoiceColumns.tsx:114-138`, `src/components/cps/CostPricingSheetEditor.tsx:484-492`, and `src/components/cps/CostPricingSheetEditor.tsx:723-733`.

FACT: The first custom-column presentation divergence occurs at the mobile/fold adapter. `toMobileColumnList()` maps only built-in keys from `MOBILE_COLUMN_KEYS` and drops all `custom_*` columns. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:145-178`.

FACT: The mobile/fold form then uses a fixed `CpsColumnKey` union and fixed row controls. It has no custom-column render path. Evidence: `src/components/cps/CostPricingSheetForm.tsx:398-475` and `src/components/cps/CostPricingSheetForm.tsx:1037-1252`.

FACT: Desktop has a custom-column render path. It renders `customColumns` from `row.custom_data` and updates `row.custom_data[column.key]`. Evidence: `src/components/cps/CostPricingSheetFormPresentations.tsx:406-418`.

CONCLUSION: These are separate defects with a partial shared architectural cause. Both defects expose presentation and row-contract assumptions around fixed built-in fields. Instant Markup does not depend on column configuration, but it uses a CP-based eligibility rule from an older contract. Custom columns fail on mobile/fold because the mobile adapter and form are fixed to built-in columns.

## 2. Scope

This audit inspected production CPS source, CPS domain logic, save/load code, related tests, migrations, and active CPS reports.

No application code was modified.

No tests were modified.

No migrations were modified.

No Supabase command was run.

No browser, production database, migration, build, typecheck, lint, or test suite command was run.

## 3. Production Contracts

FACT: CPS production edit flow is `CpsFormPage -> CostPricingSheetEditor -> responsive presentation selection`. Evidence: `src/pages/CpsFormPage.tsx:116-124` and `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md:272`.

FACT: The approved Instant Markup formulas are:

- Percentage: `new SP = current working SP x (1 + percentage / 100)`.
- Fixed: `new SP = current working SP + fixed amount`.

Evidence: `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md:129-164`.

FACT: The approved zero-SP behavior is:

- fixed markup from zero produces the fixed value;
- percentage markup from zero remains zero;
- the system must not fall back to CP.

Evidence: `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md:159-164`.

FACT: Reset and Undo Reset are workspace actions. Reset sets working item SP values to zero. Undo Reset restores the pre-reset workspace snapshot. Evidence: `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md:168-173`.

FACT: Group deletion and row operations must preserve custom column values and other row data. Evidence: `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md:116-124`.

## 4. Instant Markup - Current Architecture

FACT: The active Mobile/Fold Instant Markup UI is `CpsMarkupSheet`. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:785-821` and `src/components/cps/CpsMarkupSheet.tsx:129-480`.

FACT: The active Desktop Instant Markup UI is `InstantMarkupDialog` inside `CostPricingSheetEditor`. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:746-783` and `src/components/cps/CostPricingSheetEditor.tsx:1024-1213`.

FACT: `CostPricingSheetEditor` owns shared Instant Markup state:

- `markupMode`
- `markupValue`
- `included`
- `preview`
- `markupWorkingRows`
- `resetUndoRows`
- `undoRows`

Evidence: `src/components/cps/CostPricingSheetEditor.tsx:413-421`.

FACT: `openMarkup()` copies the current editor rows into `markupWorkingRows`. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:531-538`.

FACT: `activeMarkupRows` is `markupWorkingRows || rows`. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:446-447`.

## 5. Instant Markup - Functional Trace

1. Receive rows.

FACT: `CpsMarkupSheet` and `InstantMarkupDialog` receive `rows={activeMarkupRows}` from `CostPricingSheetEditor`. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:749` and `src/components/cps/CostPricingSheetEditor.tsx:796`.

2. Determine eligible rows.

FACT: `isInstantMarkupEligible()` returns true only for item rows with `cp > 0`. Evidence: `src/domain/cps/instant-markup.ts:52-56`.

3. Copy rows into working state.

FACT: `openMarkup()` uses `rows.map((row) => ({ ...row }))`. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:531-538`.

4. Calculate percentage operation.

FACT: `deriveSp()` returns `currentSp.times(1 + value / 100)` for Percentage. Evidence: `src/domain/cps/instant-markup.ts:69-74`.

5. Calculate fixed operation.

FACT: `deriveSp()` returns `currentSp.plus(value)` for Fixed Value. Evidence: `src/domain/cps/instant-markup.ts:69-76`.

6. Apply included/excluded state.

FACT: `previewInstantMarkup()` skips rows when `!input.included[rowKey]` or `!isInstantMarkupEligible(row)`. Evidence: `src/domain/cps/instant-markup.ts:86-90` and `src/domain/cps/instant-markup.ts:95-99`.

7. Repeat operations.

FACT: `handleStackMarkup()` writes `preview.nextRows` into `markupWorkingRows`. The next preview reads from `activeMarkupRows`, so it uses the latest working SP. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:540-557`.

8. Represent preview.

FACT: Preview includes current/proposed SP rows, aggregate selling totals, gross profit, and `nextRows`. Evidence: `src/domain/cps/instant-markup.ts:30-40` and `src/domain/cps/instant-markup.ts:115-125`.

9. Reset.

FACT: `resetInstantMarkupSellingPrices()` sets every item row SP to `0.00`. It leaves section rows unchanged. Evidence: `src/domain/cps/instant-markup.ts:135-137`.

10. Undo Reset.

FACT: `resetMarkupWorkingRows()` snapshots active markup rows into `resetUndoRows`. `undoResetMarkup()` restores that snapshot into `markupWorkingRows`. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:559-572`.

11. Final Apply.

FACT: `handleApplyMarkup()` selects `preview?.nextRows || markupWorkingRows`, calls `updateRows(finalRows)`, closes the sheet, and clears workspace state. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:574-584`.

12. Editor persistence.

FACT: Save receives current CPS from `CpsFormPage.currentCpsRef`. `handleSave()` updates that ref before calling `save()`. Evidence: `src/pages/CpsFormPage.tsx:87-104`.

FACT: Save serializes CPS rows with `denormalizeToDbCpsRow()`, deletes prior `cps_rows` on edit, and inserts the new rows. Evidence: `src/hooks/useCpsSave.ts:113-139`.

FACT: `denormalizeToDbCpsRow()` writes SP into `cells.sp`. Evidence: `src/domain/cps/normalize.ts:129-172`.

## 6. Instant Markup - Confirmed Defect(s)

### Defect IM-1: CP-Based Eligibility Contradicts Current-SP Markup

Observed symptom: Rows can be excluded from markup even though Instant Markup math only needs current SP and the user's operation value.

Authoritative source path: `src/domain/cps/instant-markup.ts`.

Relevant function: `isInstantMarkupEligible()`.

Actual current behavior: A row is eligible only when it is an item and `cp > 0`. Evidence: `src/domain/cps/instant-markup.ts:52-56`.

Intended contract: Instant Markup operates on current working SP. CP remains immutable and must not be the markup base. Fixed-value markup from SP `0` may produce the fixed value. Evidence: `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md:129-164`.

Exact divergence: The first divergence is `isInstantMarkupEligible()`. It treats CP as a participation gate. That blocks fixed-value markup for a row with `sp = 0` and `cp = 0`, although the approved fixed formula can produce a valid SP from zero.

Downstream consequence: `buildDefaultSelection()`, `includeAll()`, Mobile/Fold row controls, Desktop row controls, and `previewInstantMarkup()` all inherit this CP gate. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:92-97`, `src/components/cps/CostPricingSheetEditor.tsx:593-598`, `src/components/cps/CpsMarkupSheet.tsx:70-124`, and `src/domain/cps/instant-markup.ts:86-99`.

### Non-Defect: Percentage Markup On Zero SP Remains Zero

Observed symptom: The attached screenshot shows SP `0` for each visible row, Percentage mode selected, and value `1000`.

Actual current behavior: Percentage markup computes from current SP. If current SP is `0`, proposed SP remains `0.00`. Evidence: `src/domain/cps/instant-markup.ts:69-76`.

Intended contract: Percentage markup from SP `0` remains `0`. The system must not fall back to CP. Evidence: `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md:159-164`.

Conclusion: This specific screenshot operation is expected zero-SP percentage behavior, not a calculation defect.

### Apply And Persistence Findings

FACT: Final Apply correctly returns changed SP values to the editor when a preview exists or when a working stack exists. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:574-584`.

FACT: Persistence correctly saves those SP values into `cps_rows.cells.sp`. Evidence: `src/hooks/useCpsSave.ts:127-139` and `src/domain/cps/normalize.ts:156-169`.

FACT: Reload restores SP from `cells.sp`. Evidence: `src/domain/cps/normalize.ts:21-46`.

No Apply/commit or persistence defect was found for normal preview/apply flows.

## 7. Instant Markup - User-Facing Terminology Drift

FACT: Active production user-facing "stack" wording exists in Mobile/Fold `CpsMarkupSheet`:

- `Stack from current SP - preview before apply`: `src/components/cps/CpsMarkupSheet.tsx:214-216`.
- `Stacked: next SP = current working SP x (1 + %). CP stays unchanged.`: `src/components/cps/CpsMarkupSheet.tsx:279-282`.
- `Preview Next Stack`: `src/components/cps/CpsMarkupSheet.tsx:331-339`.
- `Stack writes the proposed SP into this sheet workspace...`: `src/components/cps/CpsMarkupSheet.tsx:438-440`.
- `Stack Operation`: `src/components/cps/CpsMarkupSheet.tsx:443-452`.

FACT: Active production user-facing "stack" wording also exists in Desktop `InstantMarkupDialog`:

- `Stack from current SP. CP and excluded rows stay unchanged.`: `src/components/cps/CostPricingSheetEditor.tsx:1077-1080`.
- `Stack`: `src/components/cps/CostPricingSheetEditor.tsx:1173`.

FACT: The editor callback is named `onStack` and the handler is named `handleStackMarkup`. These are internal names, not user-facing text. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:551-557` and `src/components/cps/CpsMarkupSheet.tsx:41-45`.

Conclusion: Terminology drift is confirmed in active production UI. The repair should change user-facing labels only. Internal names can remain if a larger rename is not required.

## 8. Custom Columns - Current Architecture

FACT: CPS canonical column configuration is `custom_fields.columnConfig` on the CPS document. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:484-492`, `src/hooks/useCpsSave.ts:60-70`, and `src/domain/cps/normalize.ts:109-126`.

FACT: CPS column defaults and normalization live in `src/domain/cps/columns.ts`. Built-in columns are `description`, `quantity`, `unit`, `make_brand`, `cp`, `sp`, `amount`, `install_rate`, `vat_rate`, and `discount_rate`. Evidence: `src/domain/cps/columns.ts:4-15`.

FACT: `normalizeCpsColumns()` preserves unknown columns by normalizing `{ ...(builtin || {}), ...column }`. Custom columns therefore survive column config normalization. Evidence: `src/domain/cps/columns.ts:23-50`.

FACT: Column Settings uses `useInvoiceColumns()` with CPS built-ins. `addCustomColumn()` creates a `custom_` key, label, type, and visible state. Evidence: `src/components/useInvoiceColumns.tsx:71-180`.

FACT: Row custom values are represented as `TableDocumentRow.custom_data`. Evidence: `src/domain/table-document/types.ts:22-44`.

## 9. Built-In Column Control Trace

Control column: `sp`.

1. Definition authority: `CPS_BUILTIN_COLUMNS` defines `sp`. Evidence: `src/domain/cps/columns.ts:4-15`.

2. Column Settings state: `useInvoiceColumns()` holds `columns` and exposes `getColumn()`. Evidence: `src/components/useInvoiceColumns.tsx:71-81`.

3. Editor visibility: `isColumnVisible('sp')` reads from `getColumn()`. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:600-604`.

4. Desktop render: Desktop row renders the SP input when `isColumnVisible('sp')` is true. Evidence: `src/components/cps/CostPricingSheetFormPresentations.tsx:393-397`.

5. Mobile/Fold adapter: `MOBILE_COLUMN_KEYS.sp = 'sp'`. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:145-152`.

6. Mobile/Fold render: `ItemRow` receives `showSp={vis('sp')}` and renders SP when true. Evidence: `src/components/cps/CostPricingSheetForm.tsx:1638-1642`, `src/components/cps/CostPricingSheetForm.tsx:1678-1686`, and `src/components/cps/CostPricingSheetForm.tsx:1192-1215`.

7. Save serialization: SP is stored in `cells.sp`. Evidence: `src/domain/cps/normalize.ts:156-169`.

8. Reload: SP hydrates from `cells.sp`. Evidence: `src/domain/cps/normalize.ts:21-46`.

Conclusion: The built-in SP column works through both Desktop and Mobile/Fold because both presentations have explicit built-in SP paths.

## 10. Custom Column Test Trace

Test column: a new `custom_*` column created by Column Settings.

1. Creation.

FACT: `addCustomColumn()` appends a `custom_` column to `columns`. Evidence: `src/components/useInvoiceColumns.tsx:114-138`.

2. Active editor state update.

FACT: `CostPricingSheetEditor` writes the current `columns` array into `cps.custom_fields.columnConfig` in an effect. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:484-492`.

3. Desktop presentation.

FACT: Desktop receives `customColumns` from the editor and renders an input for each custom column. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:632-661` and `src/components/cps/CostPricingSheetFormPresentations.tsx:406-418`.

4. Desktop row update.

FACT: Desktop updates `row.custom_data[column.key]` through `onUpdateRow()`. Evidence: `src/components/cps/CostPricingSheetFormPresentations.tsx:413-415`.

5. Mobile/Fold column projection.

FACT: `toMobileColumnList()` accepts only keys in `MOBILE_COLUMN_KEYS`. It ignores custom columns because no `custom_*` key maps to `MobileCpsColumnKey`. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:145-178`.

6. Mobile/Fold form type.

FACT: `CpsColumnKey` is a fixed union of seven built-in keys. Evidence: `src/components/cps/CostPricingSheetForm.tsx:398-405`.

7. Mobile/Fold render.

FACT: Mobile/Fold `ItemRow` renders only description, sub description, make, quantity, unit, CP, SP, photo, totals, and row actions. It has no `customColumns.map()` equivalent. Evidence: `src/components/cps/CostPricingSheetForm.tsx:1037-1252`.

8. Mobile/Fold row conversion.

FACT: `toMobileRows()` projects each domain item row into `MobileCpsRow` with fixed properties and does not include `custom_data`. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:192-235`.

FACT: `mergeMobilePayload()` starts from the live base row when a mobile row matches an existing domain row. That preserves existing `custom_data` for existing rows. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:299-315`.

FACT: `mergeMobilePayload()` creates a new row from `createEmptyTableRow()` when there is no base. New mobile-created rows therefore start with empty `custom_data`. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:299-315` and `src/domain/table-document/rows.ts:7-30`.

Conclusion: Mobile/Fold custom columns are configuration-only today. They can be stored in `columnConfig`, but they cannot appear or accept row values in the active mobile/fold form.

## 11. Custom Columns - Confirmed Defect(s)

### Defect CC-1: Mobile/Fold Drops Custom Columns At The Presentation Adapter

Observed symptom: A newly added custom column does not appear on the active CPS form.

Authoritative source path: `src/components/cps/CostPricingSheetEditor.tsx` and `src/components/cps/CostPricingSheetForm.tsx`.

Relevant functions/components: `toMobileColumnList()`, `CostPricingSheetMobileHost`, and mobile `ItemRow`.

Actual current behavior: The editor filters `columnConfig` into `MobileCpsColumn[]` by a fixed built-in map. Custom columns are skipped. The mobile form type and renderer do not support custom columns.

Intended contract: A valid custom column added through CPS Column Settings must become part of the active CPS editor/form presentation and accept row values.

Exact divergence: The first divergence is `toMobileColumnList()` at `src/components/cps/CostPricingSheetEditor.tsx:154-178`.

Downstream consequence: Mobile/Fold users can add a custom column in Column Settings, but the active form cannot render it or collect row values for it.

### Defect CC-2: Mobile/Fold Has No Custom Row Value UI

Observed symptom: Because the custom column does not render, the user cannot enter row values.

Authoritative source path: `src/components/cps/CostPricingSheetForm.tsx`.

Relevant function/component: mobile `ItemRow`.

Actual current behavior: The mobile item form is a fixed built-in field layout. It has no custom-column loop and no `custom_data` input binding. Evidence: `src/components/cps/CostPricingSheetForm.tsx:1037-1252`.

Intended contract: The row value for a custom column must live under `row.custom_data[customColumn.key]`.

Exact divergence: The mobile presentation lacks any `custom_data` render/update path.

Downstream consequence: Mobile/Fold users cannot use newly added active custom columns without switching to a presentation that has a custom-column path.

## 12. Shared-Cause Analysis

Answer: PARTIALLY.

FACT: Instant Markup does not consume CPS column configuration. It receives rows and updates only `sp`. Evidence: `src/domain/cps/instant-markup.ts:78-133`.

FACT: Instant Markup row cloning uses object spread, so it preserves `custom_data` for rows it touches. Evidence: `src/domain/cps/instant-markup.ts:86-90` and `src/domain/cps/instant-markup.ts:100`.

FACT: Reset also uses object spread and preserves `custom_data`. Evidence: `src/domain/cps/instant-markup.ts:135-137`.

FACT: Custom columns disappear on Mobile/Fold because the mobile adapter and mobile form use fixed built-in column keys. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:145-178` and `src/components/cps/CostPricingSheetForm.tsx:398-475`.

INFERENCE: The shared architectural theme is a fixed built-in-field assumption. The concrete failure points are different:

- Instant Markup fails at a CP-based eligibility gate.
- Custom columns fail at the Mobile/Fold column and row presentation boundary.

Conclusion: There is no evidence that Instant Markup is stripping custom-column values. There is evidence that Mobile/Fold presentation code cannot display or edit them.

## 13. Persistence / Reload Findings

FACT: CPS parent table stores `custom_fields` as JSONB. CPS rows store `cells` as JSONB. Evidence: `supabase/migrations/20260915194332_tenant_template_seed.sql:640-688`, later renamed from `boqs` and `boq_rows` to `cps_sheets` and `cps_rows` by `supabase/migrations/20261001081028_rename_boq_to_cps.sql`.

FACT: Save stores row custom values in `cells.custom_data`. Evidence: `src/domain/cps/normalize.ts:129-172`.

FACT: Reload restores row custom values from `cells.custom_data`. Evidence: `src/domain/cps/normalize.ts:21-46`.

FACT: Editor row updates preserve unknown fields by spreading the existing row and applying the patch. Evidence: `src/components/cps/CostPricingSheetEditor.tsx:507-510`.

FACT: CPS row operations use object spread or create new rows. Existing moved or removed rows preserve `custom_data`. New rows start with empty `custom_data`. Evidence: `src/domain/cps/row-operations.ts:27-170` and `src/domain/table-document/rows.ts:7-30`.

FACT: Import deliberately does not create custom columns or populate row custom data from `custom_fields`. Evidence: `src/domain/cps/importAdapter.ts:93-137`, `src/tests/critical/cpsImportView.test.js:151-162`, and `src/tests/critical/cpsImportView.test.js:336-344`.

FACT: CPS conversion preserves `row.custom_data` into quotation `custom_data`, after cleaning forbidden CP/cost data. Evidence: `src/domain/cps/conversion.ts:139-168`.

FACT: CPS Forme PDF visibility currently resolves only make, unit, CP, and specification visibility. It does not render arbitrary custom CPS columns in the Forme path. Evidence: `src/domain/cps/pdfDownloadHandler.ts:81-97`.

Conclusion: Storage and reload can preserve custom row values once they exist. The active Mobile/Fold editor cannot create or edit those values.

## 14. Minimum Safe Repair Boundary

Instant Markup repair boundary:

- Change Instant Markup eligibility so it does not use CP as the participation gate for SP-based markup.
- Preserve item-only exclusion for section rows.
- Preserve the zero-SP law.
- Preserve CP immutability.
- Preserve repeated markup from `markupWorkingRows`.
- Replace user-facing "stack" vocabulary with approved Instant Markup wording.

Custom-column repair boundary:

- Add dynamic custom-column support at the CPS editor-to-mobile adapter boundary.
- Add a mobile/fold custom-column render/update path that writes `row.custom_data[customKey]`.
- Keep Desktop custom-column behavior intact.
- Keep `custom_fields.columnConfig` as the column configuration store.
- Keep `cps_rows.cells.custom_data` as the row value store.

## 15. Explicit Non-Goals

Do not redesign Instant Markup.

Do not change the approved markup formulas.

Do not add a CP fallback.

Do not make "stacking" a user-facing concept.

Do not change database schema.

Do not change CPS conversion pricing rules.

Do not change import to accept arbitrary unknown fields unless a separate import-contract task approves it.

Do not refactor unrelated invoice column systems.

Do not touch PDF customization unless a separate CPS PDF custom-column requirement is approved.

## 16. Recommended Repair Order

1. Fix Instant Markup vocabulary in active UI labels.

2. Fix Instant Markup eligibility and tests to align with current-SP behavior and zero-SP law.

3. Add focused tests for:

- percentage on SP `0` remains `0`;
- fixed value on SP `0` produces the fixed amount even when CP is zero or blank;
- repeated operations continue from latest working SP;
- CP remains unchanged;
- reset and undo reset preserve row identity, group identity, and `custom_data`.

4. Add Mobile/Fold custom-column presentation support.

5. Add focused tests for:

- Column Settings custom column appears in Mobile/Fold active form;
- row value writes to `custom_data[customKey]`;
- save serialization writes `cells.custom_data`;
- reload restores the value;
- Desktop custom-column behavior remains unchanged.

## 17. Verification

Commands intentionally not run due to zero-code audit mode and user instruction:

- `bun run build`: not run.
- `bun run typecheck`: not run.
- `bun run lint`: not run.
- `bun run audit:load`: not run.
- application test suites: not run.
- database migrations or Supabase writes: not run.

Pre-report git status captured immediately before creating this report:

```text
 D "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/cold-launch-tenant-tree/variations/BIGDROPS Cold Launch - Mobile Fold2 - Linear Dark.html"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/cold-launch-tenant-tree/variations/BIGDROPS Cold Launch - Desktop - Linear Dark - Copy.html"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/cold-launch-tenant-tree/variations/the final.html"
```

Post-report verification is recorded after this file is created:

- `git status --short`: see final task response.
- `git diff --check -- docs/reports/cost-pricing-sheet/2026-10-08-cps-instant-markup-custom-columns-zero-code-audit.md`: see final task response.

Supabase push status: not applicable. No SQL changed.

Risks or limitations:

- This is source/data-flow evidence only. No runtime browser reproduction was performed by instruction.
- The report did not execute tests by instruction.
- The attached screenshot supports the zero-SP percentage observation but cannot prove all user interactions attempted.

Deferred work:

- Implement the repairs in a separate code-change task.
- Add or update tests in that implementation task.

## 18. Exact Files Changed

Created:

- `docs/reports/cost-pricing-sheet/2026-10-08-cps-instant-markup-custom-columns-zero-code-audit.md`

No application source files were changed.

No migrations were changed.

No tests were changed.

No CSS files were changed.
