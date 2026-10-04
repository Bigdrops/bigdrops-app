# CPS PDF Customization Completion Report

This report was written by Muse Spark on 2026-10-04 via Opencode.

## Objective

- Complete the CPS PDF customization backlog on the native Forme architecture.
- Ship template choice, supported font rendering, text colour control, page orientation, and visibility-aware PDF columns.
- Keep one prepared-data authority and one delivery pipeline. No engine math in templates.

## Scope

- CPS PDF output only. No calculation changes. No schema changes. No conversion changes.
- In scope: display prefs store, Forme template rewrite, font bridge, download handler wiring, Customize sheet controls, capability flag, regression tests.
- Out of scope: pre-existing failures in unrelated suites (reported, not touched).

## Files Changed

- Added `src/domain/cps/pdfPreferences.ts`: template id, orientation, localStorage prefs with validation.
- Added `src/components/pdf/forme/fonts.ts`: shippable-font resolver plus Forme registration with Helvetica fallback.
- Rewrote `src/components/pdf/forme/CpsFormeDocument.tsx`: `CpsScheduleDocument` plus `CpsCompactDocument`, shared header, parties, totals, notes, footer helpers, visible-column model, font, accent, orientation.
- Updated `src/domain/cps/pdfDownloadHandler.ts`: prefs read, customization resolve, font ensure, template select, column gating, null-out of hidden make, unit, spec fields.
- Updated `src/components/cps/CostPricingSheetViewPresentations.tsx`: template picker, accent section, landscape toggle in `CpsCustomizeSheet`.
- Updated `src/domain/pdf/customization/cps.ts`: accent color capability enabled.
- Updated `src/domain/pdf/customization/hooks.ts`: exported `loadSettings` for handler use.
- Extended `src/tests/critical/cpsPdf.test.js`: 10 new tests, 15 total in file.

## Skills Used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- Prefs default to schedule portrait. Invalid stored values fall back to defaults.
- Schedule template renders full detail with photos, spec, make. Compact template renders condensed rows with no photos, no spec, no make.
- Both templates render only columns present in `visibleColumns`. Hidden columns leave no gaps.
- Description, quantity, SP always render. CP, make, unit, spec follow the Column sheet visibility state.
- Hidden make, unit, spec fields are nulled before row build. Quantity text drops the unit suffix when unit hides.
- Font resolves through the shared font registry. Unknown or unloadable fonts fall back to Helvetica. Registration failure never blocks download.
- Accent applies to title and group band titles only. Cost and sell keep semantic colors.
- Landscape uses swapped A4 dimensions. Forme Page has no orientation prop.
- Resolver import fixed: `resolveFull` lives in `resolver.ts`, not `hooks.ts`.
- Strict types replace three `any` uses in the handler. Lint passes.

## Verification Result

Verification:

- `bun run audit:load`: ran, repo-wide pre-existing warnings only
- `bun run typecheck`: passed
- CPS scope `bun test` (cpsPdf, cpsConversion, cpsCalculationAuthority, cpsInstantMarkup, cpsMarkupPresentation, cpsPrefix): 72 pass, 0 fail
- `eslint` on all touched files: passed
- `git diff --check`: clean
- `supabase db push`: not applicable (no SQL changed)
- `bun run build`: skipped due to hardware policy

## Supabase Push Status

- Not applicable. No migration written. No schema changed.

## Risks Or Limitations

- Full `bun run test` shows failures outside CPS scope: `cpsViewProductionRedesign` (3, stale assertions on CSS padding, conversion call count, FAB props), `itemCleanupExportImport`, `invoiceAccountingIntegration`, `paymentAccountingIntegration`, `remediationContract`, `sourceTransactionContract`.
- Evidence shows these failures come from prior sessions or committed code, not this pass. Touched files were left unchanged per concurrent-agent rules.
- Font rendering needs a runtime check on device. Unit tests cover mapping and fallback, not glyph output.
- CP hide path is defensive. The column deny list blocks CP hide in the sheet, so CP exclusion triggers only if a stored config carries it.

## Deferred Work

- Update the three stale `cpsViewProductionRedesign` assertions to match the conversion-options pass output. Owner: view production area.
- Triage the accounting and cleanup suite failures. Owner: respective domain sessions.
- Runtime PDF visual check for both templates, both orientations, each shippable font.
