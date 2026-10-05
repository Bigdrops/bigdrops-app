# CPS PDF Four-Template Pass Report

This report was written by Muse Spark on 2026-10-05 via Opencode.

## Objective

- Extract the shared CPS PDF model from template ownership.
- Rename the mistaken Lorem template to Ledger without visual change.
- Add Industry as the fourth CPS template from the established design family.

## Scope

- Model extraction, rename, one new template, registry, handler selection, tests.
- No schema change. No numbering change. No conversion change. No runtime change.
- Schedule and Compact rendering unchanged. Invoice/Quotation output untouched.

## Files Changed

- Added `src/components/pdf/cpsPreparedModel.ts` (shared contract plus two helpers).
- Added `src/components/pdf/forme/CpsIndustryDocument.tsx` (new Industry template).
- Added `src/tests/critical/cpsIndustry.test.js` (8 tests).
- Renamed `LoremCpsDocument.tsx` to `LedgerCpsDocument.tsx` (identifiers updated).
- Renamed `cpsLorem.test.js` to `cpsLedger.test.js` (identifiers updated).
- Modified `src/components/pdf/forme/CpsFormeDocument.tsx` (imports shared model; no render changes).
- Modified `src/components/pdf/forme/LedgerCpsDocument.tsx` (rename plus shared helpers).
- Modified `src/domain/cps/pdfDownloadHandler.ts` (shared types, ledger/industry selection).
- Modified `src/domain/cps/pdfPreferences.ts` (ledger plus industry registry).
- Modified `src/tests/critical/cpsPdf.test.js` (four-template list expectation).

## Skills Used

Skills used: pdf-rendering-correctness, karpathy, design-artifact, typescript-advanced-types, test-driven-development
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

### New shared CPS PDF model location

- `src/components/pdf/cpsPreparedModel.ts`, beside the generic PDF `types.ts`.
- Owns `CpsPdfModel`, `CpsPdfRow`, `CpsPdfGroup`, `CpsPdfColumnKey` (renamed from `CpsForme*`).
- Owns two multi-consumer helpers: `groupedItemKeys` and `formatQuantityValue`.
- No renderer imports. No calculations. Pure contract.

### What was extracted from CpsFormeDocument.tsx

- The three interfaces and the column-key union moved out verbatim, then renamed.
- The file now imports the contract. All render code is byte-identical in behavior.
- Schedule and Compact output verified unchanged by the existing suite.

### Lorem to Ledger rename

- File, component, registry id (`ledger`), label (`Ledger`), handler selection, and tests renamed.
- Retired `lorem` id falls back to schedule. The retired files are gone.
- A test asserts no case-insensitive `lorem` remains in the ledger file, handler, or registry.
- Historical reports keep the old name. History was not rewritten.

### Confirmation that no active Lorem identity remains

- Registry ids are exactly Schedule, Compact, Ledger, Industry.
- `selectCpsFormeDocument('lorem')` returns schedule.
- `LedgerCpsDocument.tsx` contains no `lorem` in any casing.
- The old `LoremCpsDocument.tsx` path no longer exists.

### Industry reuse and adaptation strategy

- Finding: no Forme Industry template exists. Invoice and Quotation Industry is React-PDF (`presentation/industry/`), whose components cannot render inside a Forme tree.
- Strategy: adapt the Industry design language, not its components. Tokens ported: page ink and grays, 27 px letterspaced title role, label-value meta rows, gray party boxes, banded table header, zebra rows, 3 px group accent edge, hairline rules, right-aligned figures-only group footers with 2 px closing rule, 232 px totals box with ruled final row, 58 px thumbnails.
- Deliberate deviations: CPS 7-column contract kept across all templates; CPS bans the Industry "Subtotal" label so footers stay figures-only; money stays ink grayscale for family consistency instead of CPS brown/green; member count rides muted beside the group title; no "Open image" caption because the thumbnail itself is the proven link.
- No Invoice concepts (due date, balance, payment, advance) and no Quotation concepts (validity, acceptance) were ported. No status, no signatures.
- No shared Industry file was modified. Invoice/Quotation behavior is intact by construction.

### Registry final state

- Order: Schedule, Compact, Ledger, Industry. Default: Schedule. Unknown ids fall back to Schedule.
- The Customize sheet lists all four automatically from the registry.

### Tests executed

- TDD order: the new suite failed on missing modules first, then passed after implementation.
- 39 tests pass across `cpsIndustry`, `cpsLedger`, `cpsPdf` (`bun test`).
- Coverage: model ownership, rename completeness, registry order and fallback, Industry hierarchy and foreign-concept exclusion, authoritative totals and group figures, image href matrix, no-math source scans, schedule/compact invariance.
- `bun run typecheck`: passed. `eslint` on touched files: passed. `git diff --check`: clean.

## Verification

Verification:

- bun run audit:load: not run (no schema, query, or data-layer change)
- bun run typecheck: passed
- Targeted tests: 39 pass, 0 fail
- git diff --check: clean
- git status: task files only; pre-existing work untouched
- supabase db push: not applicable
- bun run build: not run per task instruction

## Supabase Push Status

- Not applicable. No migration written. No schema changed.

## Risks Or Limitations

- The repo `node --experimental-loader` path fails on unrelated files at baseline. `bun test` is the working runner.
- `cpsViewProductionRedesign.test.js` has 5 failures on view markup and CSS owned by another agent's in-flight work. Untouched and reported, not fixed.
- A naming collision now exists in spirit: legacy React-PDF `templates/Ledger.tsx` (Invoice family) vs Forme `LedgerCpsDocument` (CPS family). Different directories, renderers, and pickers, but human readers should know both exist.
- Zebra striping uses row parity across all rows; headers and footers carry explicit backgrounds so only item rows show it.
- Group walls break at page boundaries by design; corners do not reconnect.

## Deferred Work

- Human visual comparison of all four templates on real documents.
- Client street address remains unavailable by product decision (rendered lines only).
- Compact template relationship review (unchanged here).

## Human Verification Still Required

- Open each of the four templates from the Customize sheet and confirm visual identity.
- Confirm Ledger output matches the former Lorem output pixel for pixel.
- Confirm Industry reads as Industry family while carrying CPS content.
- Confirm a thumbnail tap opens its original image on device viewers.
