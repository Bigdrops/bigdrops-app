# CPS Calculation Authority Audit

This report was written by Muse Spark on 2026-10-04 via OpenCode.

## Objective

Determine whether CPS has one canonical calculation authority or multiple competing engines, trace every consumer, consolidate only where evidence makes the authority unambiguous, and cover the edge-case matrix with regression tests.

## Files Inspected

- `src/domain/cps/calculateCpsTotals.ts`
- `src/domain/cps/calculations.ts`
- `src/domain/cps/instant-markup.ts`
- `src/domain/cps/viewData.ts`
- `src/domain/cps/normalize.ts`
- `src/domain/cps/factories.ts`
- `src/domain/cps/row-operations.ts`
- `src/domain/cps/columns.ts`
- `src/domain/cps/importAdapter.ts`
- `src/domain/table-document/types.ts`
- `src/domain/table-document/rows.ts`
- `src/lib/Calculations.ts` (shared invoice engine, context only)
- `src/hooks/useCpsSave.ts`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetFormPresentations.tsx`
- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/CpsImportSheet.tsx`
- `src/components/cps/CpsMarkupSheet.tsx`
- `src/components/table-document/TableRowsEditor.tsx`
- `src/components/table-document/TableDocumentPreview.tsx`
- `src/components/table-document/TableDocumentPdfDocument.tsx`
- `src/services/exportFetchers.ts`
- `src/utils/exportCompilers.ts`
- `src/pages/ViewCps.tsx`
- `src/tests/critical/cpsInstantMarkup.test.js`
- `src/tests/critical/cpsImportView.test.js`
- `src/tests/critical/cpsNormalize.test.js`
- `src/tests/critical/cpsRowOperations.test.js`
- `src/tests/critical/calculations.test.js`
- `docs/reports/cost-pricing-sheet/` (separation, hardening, client, columns-import, markup, conformance, row-type, React 310 reports)

## Skills Used

Skills used: karpathy, react-dev
Documentation standard: ASD-STE100 Simplified Technical English

---

## Current Calculation Dependency Graph

```text
calculateCpsTotals.ts (Decimal authority)
├── computeCpsTotals ← Editor totals, mobile totals, calculations.ts
│   costing, PDF (cps branch), markup before/after, viewData totals,
│   save costing cache
├── computeCpsRowEconomics ← Editor rowEconomics, mobile ItemRow,
│   (now) viewData rows
└── computeRowProfit ← TableRowsEditor, TableDocumentPreview,
    TableDocumentPdfDocument

calculations.ts (CPS adapter, no formulas of its own)
└── computeCpsCommercialView → computeCpsTotals + shared computeDocument
    context ← useCpsSave, viewData, instant-markup, Editor

instant-markup.ts (SP derivation, Decimal, 2dp)
├── previewInstantMarkup / applyInstantMarkup ← Editor dialog and sheet
└── totals inside preview ← computeCpsCommercialView costing
```

Every CPS financial value displayed, previewed, persisted, or exported flows through `calculateCpsTotals.ts`, except one duplicate found and consolidated below.

## Calculation-Module Classification Table

| File | Exported functions | Arithmetic | Importers | CPS consumers | BOQ consumers | Status | Classification | Safe to remove | In scope |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/domain/cps/calculateCpsTotals.ts` | `computeCpsTotals`, `computeCpsRowEconomics`, `computeRowProfit` | Decimal | Editor, mobile form, calculations.ts, PDF, table-document views, tests | All CPS surfaces | None | Live | Canonical authority | No | Touched (consumer consolidation only, no formula change) |
| `src/domain/cps/calculations.ts` | `computeCpsCommercialView` | Delegates to canonical plus shared invoice context | useCpsSave, viewData, instant-markup, Editor, tests | Save cache, view totals, markup preview, editor totals | None | Live | Canonical adapter | No | Untouched |
| `src/domain/cps/instant-markup.ts` | `previewInstantMarkup`, `applyInstantMarkup`, eligibility, keys, value parsing | Decimal, 2dp SP rounding | Editor, tests | Markup setup, preview, apply | None | Live | Canonical SP derivation | No | Untouched |
| `src/domain/cps/viewData.ts` | `buildCpsViewData` | Delegates (after fix) | ViewCps, tests | View rows and totals | None | Live | Canonical view adapter | No | Fixed (duplicate removed) |
| `src/domain/invoice/calculations.ts` | `computeDocument` and invoice engine | Decimal | Invoice, quotation, waybill, CSR paths plus CPS commercial context | Context only (`.commercial` member is never read for CPS display) | None | Live elsewhere | Shared non-CPS engine | No | Untouched |
| boqCalculations artifacts | None found | None | None | None | None | Absent | No BOQ calculation file or reference exists in `src` | Not applicable | None |

No file named `boqCalculations` and no `calculateBoqTotals` reference exists in the repository. The BOQ module was removed with its domain. A current CPS document cannot obtain any financial value from BOQ-era calculation code because none remains.

## calculateCpsTotals.ts Findings

Inputs: `TableDocumentRow[]` for totals; one row for economics. Quantity, CP, and SP coerce through `new Decimal(value || 0)`, so empty, null, and zero inputs are safe. Non-item rows are skipped by totals and return zeros from economics.

Outputs: document `{ total_cost, total_selling_price, gross_profit, margin_percent }`; per-row `{ quantity, cp, sp, total_cost_price, total_selling_price, profit, margin_percent, unit_profit }`.

Row filtering: only `row_type === 'item'` contributes. Section rows contribute zero by construction.

Quantity handling: multiplied inside Decimal for every money term.

CP handling: `cp.times(quantity)` summed for cost. SP handling: `sp.times(quantity)` summed for selling.

Zero behavior: zero selling forces margin zero at both levels. Empty row lists yield all zeros.

Decimal behavior: all arithmetic runs in Decimal with default precision. Results convert once via `toNumber()`. No explicit money rounding exists in totals; markup rounds derived SP to 2dp. Native float appears nowhere in this file.

Rounding behavior: presentation layers format to 2dp money and 1dp margin. The engine preserves full precision.

Row economics: `TCP = CP × Qty`, `TSP = SP × Qty`, `Profit = (SP − CP) × Qty` through the single `computeRowProfit`, `Margin = Profit / TSP`, `unit_profit = SP − CP`.

Document economics: `Total Cost = Σ TCP`, `Total Selling = Σ TSP`, `Gross Profit = Selling − Cost`, `Margin = Gross Profit / Selling × 100` with the zero guard. All required semantics verified from source.

## calculations.ts Findings

CPS-specific adapter, not legacy. It maps CPS rows onto the shared invoice engine shape (sections to group headers, SP as unit price) for commercial context, then returns canonical `costing` from `computeCpsTotals`. It defines no formula. It uses no native money math. Repository search proves no CPS consumer reads its `.commercial` member; every consumer reads `.costing`. It remains required by save, view, markup, and editor paths.

## boqCalculations Findings

No surviving artifact. No import. No consumer. No data model. No formulas. Answer to the required question: no, a current CPS document cannot obtain a user-visible financial value from BOQ-era calculation code.

## Exact Canonical Formulas

Row: `TCP = CP × Qty`; `TSP = SP × Qty`; `Profit = (SP − CP) × Qty`; `Margin = TSP > 0 ? Profit / TSP × 100 : 0`; `unit_profit = SP − CP`.

Document: `Total Cost = Σ TCP`; `Total Selling = Σ TSP`; `Gross Profit = Total Selling − Total Cost`; `Margin = Total Selling > 0 ? Gross Profit / Total Selling × 100 : 0`.

Only item rows contribute. Group membership never enters arithmetic. Margin is zero when selling is zero.

## Decimal and Rounding Behavior

Decimal.js carries every money operation. Markup rounds derived SP to 2dp at write time. Totals preserve full precision until display formatting. The 20-digit Decimal division differs in the last digit from native division for repeating decimals (observed `33.333333333333336` versus native `33.33333333333333`); displays round identically, and the Decimal value is authoritative.

## Desktop Calculation Path

Editor computes `computeCpsCommercialView(cps)` once per state and `computeCpsRowEconomics` per row index. Presentations render those values through money and percent formatters. No presentation formula exists.

## Mobile and Fold Calculation Path

The form converts buffer rows to a domain view and calls the same two engine functions for row economics and document totals. No presentation formula exists.

## Instant Markup Calculation Path

Derivation (`SP = CP × (1 + pct/100)` or `SP = CP + value`, 2dp) feeds proposed rows back into `computeCpsCommercialView` for before and after totals. CP is never mutated. Ineligible and excluded rows pass through untouched. Apply writes engine-derived SP values. Undo restores captured rows. Totals after apply come from the canonical totals function, not preview arithmetic.

## Import Calculation Path

The adapter maps `cost_price` to CP and `selling_price` to SP as data only. Imported rows enter editor state and flow through display, totals, save, reload, and view on the canonical path. No separate engine exists.

## Save and Serialization Behavior

Calculated values persist as convenience cache (`costing` inside `custom_fields`) and recompute from rows on every load, view build, markup run, and save. Classification: B plus C. Reload from the same rows reproduces the same economics, covered by round-trip tests. No derived field was added.

## Reload and Hydration Behavior

Normalization restores rows; every consumer recomputes. Stored `costing` is never read as authority (repository search finds producers only).

## View Calculation Path

`buildCpsViewData` takes document totals from the canonical function. Per-row values previously used native float math; this task consolidated them onto `computeCpsRowEconomics`. Form-to-save-to-view preserves financial meaning exactly.

## PDF and Export and Output Calculation Path

`TableDocumentPdfDocument` calls `computeCpsTotals` for `cps_sheets` rows and `computeRowProfit` per row. Shared table-document preview and row editor use `computeRowProfit`. Export fetchers and compilers pass raw rows and compute no CPS economics. No independent formula implementation exists in any output path.

## Section and Group Financial Behavior

Section rows return zeros from economics and are skipped by totals, in the engine, the view, markup eligibility, and PDF. Grouping is structural only.

## Non-Contiguous Group Behavior

Arithmetic never reads `group_id` or position. Grouped, mixed, multi-group, non-contiguous, and reordered row sets with equal items produce equal totals, covered by tests.

## Zero-Value Behavior

Zero CP keeps full selling as profit. Zero SP is representable at calculation level (negative profit allowed). Zero selling forces zero margin. Validation rules that reject zeros live in the save layer and were not changed; calculation semantics and form validation remain separate concerns.

## Edge-Case Test Results

New `cpsCalculationAuthority.test.js` (17 tests, all passing) covers A through M, O through W, and S through V with production functions only:

- A through F: ordinary, ungrouped, grouped, mixed, multi-group, and non-contiguous sets, including grouped-versus-flattened equality.
- G: section zero contribution at both levels.
- H, I, J: decimal quantity, CP, and SP exactness.
- K: zero CP full-profit behavior.
- L: zero SP representability without touching validation.
- M: zero-selling margin at row, document, and empty levels.
- N, O: percentage and fixed-value derivation from CP.
- P, Q: excluded and no-CP rows unchanged with zero affected count.
- R: apply purity plus canonical recomputation of preview output.
- S: import-shaped string numerics.
- T: large monetary exactness.
- U: recomputation without drift.
- V: normalization round-trip.
- W: reorder invariance.
- View consolidation plus a Decimal dust case proving engine use (`0.1 × 3 = 0.3` exactly in view output).

N through R overlap the existing markup suite intentionally at integration level only; the markup suite remains the detailed authority for eligibility, reapplication, and rejection.

## Duplicate Formula Findings

One live duplicate existed: per-row native float math in `buildCpsViewData` (cost, selling, profit, margin). Same formula semantics, non-Decimal arithmetic, reachable on every document view. Consolidated onto `computeCpsRowEconomics` with identical output fields. The now-unused local helper was removed.

No other duplicate exists. The minor native subtraction in the markup aggregate delta operates on two engine-derived numbers for display and was left untouched as out of scope.

## Dead Legacy Findings

None. No BOQ calculation code survives. No compatibility adapter exists. Nothing was deleted.

## Canonicalization Classification: C

Multiple live authorities with identical semantics existed (engine plus one native per-row reimplementation). Consolidated at the view adapter boundary onto the existing production Decimal implementation. No third engine was created. No formula changed. No legacy semantic returned.

## Exact Code Changes

- `src/domain/cps/viewData.ts`: per-row view economics now come from `computeCpsRowEconomics`; removed the local native helper. Totals already used the engine.
- `src/tests/critical/cpsCalculationAuthority.test.js`: new 17-test edge-case matrix.

Each change was necessary: the first removes the only duplicate live formula; the second locks the matrix the task requires.

## Confirmation That No Easier Legacy Regression Was Introduced

No BOQ file was restored. No translation layer was added. No presentation formula was added. The change narrows implementations from two to one.

## Regression Results

- New authority matrix: 17 passed.
- Full targeted run across calculation, import, markup, normalize, row operations, save serialization, hooks order, list date, markup presentation, and numbering suites: 146 passed, 0 failed.
- View, save, import, markup, columns, client, photo, numbering, list, and PDF paths use the same engine inputs and outputs as before.

## Pre-Existing Working-Tree Modifications

Uncommitted before this task (other concurrent work, untouched here): modified `CostPricingSheetEditor.tsx`, `CostPricingSheetForm.tsx`, `CpsList.tsx`, `moduleAdapters.ts`; new `CpsMarkupSheet.tsx`, `cpsListDate.test.js`, `cpsMarkupPresentation.test.js`, and two reports. This task modified only `viewData.ts` and added the matrix test plus this report.

## Verification Commands and Results

- `bun run typecheck`: passed.
- Targeted tests: 146 passed, 0 failed (10 files).
- `git diff --check`: passed (line-ending notices only).
- `git status`: exact scope confirmed (1 modified domain file, 1 new test, 1 new report, plus the pre-existing unrelated entries above).
- `bun run audit:load`: not run. No schema, query, or data-layer logic touched.
- Supabase and migration status: no migration created or pushed. No hosted change.
- Explicit confirmation: `bun run build` was not executed.

## Remaining Risks or Unresolved Questions

- Corrupt non-numeric money strings (for example `cp: "abc"` from hand-edited stored cells) throw inside Decimal rather than coercing to zero. This failure mode predates this task and already exists on every totals path; the consolidation extends the same behavior to view rows for consistency. Input validation blocks such values at entry. No sanitization was added, as that would change semantics beyond this audit.
- The markup aggregate delta subtracts two engine-derived totals with a native operator. Display formatting absorbs the dust. Left as is.
