# CPS Forme PDF Schedule Redesign Report

This report was written by Codex on 2026-10-04 via Codex Desktop.

## Objective

Fix the CPS Forme PDF schedule so item rows render in the PDF.

Improve the Schedule template layout for a printable internal commercial document.

## Scope

- CPS Forme prepared model.
- CPS Forme Schedule and Compact templates.
- CPS PDF regression tests.

No schema, prefix, numbering, conversion, or calculation logic changed.

## Files changed

- `src/components/pdf/forme/CpsFormeDocument.tsx`
- `src/domain/cps/pdfDownloadHandler.ts`
- `src/tests/critical/cpsPdf.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-forme-pdf-schedule-redesign-report.md`

## Skills used

pdf-rendering-correctness, frontend-design, react-dev, typescript-advanced-types, karpathy, systematic-debugging, test-driven-development, verification-before-completion

## Documentation standard

ASD-STE100 Simplified Technical English

## Changes made

- Replaced the Forme item-row fragment component with a cell-array builder.
- This gives Forme concrete `Cell` children inside each `Row`.
- The previous fragment path serialized empty item rows.
- Reused `buildCpsViewData()` and `buildCpsViewSegments()` in the CPS PDF model.
- The PDF model now emits this sequence:
  - group heading
  - grouped member rows
  - group subtotal
  - ungrouped rows
- Added a `group-subtotal` row type to the PDF model.
- Improved Schedule template proportions:
  - larger logo
  - stronger company and document-type hierarchy
  - structured metadata block
  - compact context band
  - wider description column
  - larger schedule typography
  - separate group subtotal rows
  - boxed commercial close-out block
- Kept Compact functional and driven by the same prepared model.
- Kept Helvetica as the runtime-safe font.

## Verification result

- `bun test src/tests/critical/cpsPdf.test.js`: passed, 22 tests.
- `bun test src/tests/critical/calculations.test.js src/tests/critical/cpsCalculationAuthority.test.js src/tests/critical/cpsConversion.test.js`: passed, 96 tests.
- `bun test src/tests/critical/jsonGroupImport.test.js`: passed, 10 tests.
- `bun test src/tests/critical/cpsRowOperations.test.js src/tests/critical/cpsNormalize.test.js src/tests/critical/cpsImportView.test.js`: passed, 38 tests.
- `bun test src/tests/critical/cpsViewIdentity.test.js`: passed as part of a combined run.
- `bun run typecheck`: passed.
- `bunx eslint src/components/pdf/forme/CpsFormeDocument.tsx src/domain/cps/pdfDownloadHandler.ts src/tests/critical/cpsPdf.test.js`: passed.
- `git diff --check`: passed with line-ending warnings only.
- `git status`: completed.
- `bun run build`: skipped due to hardware policy and user instruction.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- `src/tests/critical/cpsViewProductionRedesign.test.js` failed on existing source-string expectations in `CostPricingSheetViewPresentations.tsx`.
- This task did not modify that file.
- Production visual quality still requires human PDF review on Android Chrome and A4 print/PDF viewer.

## Deferred work

- Restore custom Forme-compatible TTF or OTF font assets in a separate task.
- Run a human visual/runtime retest on the deployed Vercel application.
