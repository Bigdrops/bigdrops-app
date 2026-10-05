# CPS Visual-Correction Pass Report

This report was written by Muse Spark on 2026-10-05 via Opencode.

## Objective

- Retire Schedule and Compact, leaving Ledger and Industry as the only CPS templates.
- Fix the proven column-overflow defect so all seven financial columns render inside A4 portrait.
- Redesign the Industry header and strengthen Industry groups.
- Replace the text picker with a visual miniature carousel.
- Verify with measured render geometry plus static tests.

## Scope

- Registry, selection fallback, both templates, picker UI, tests.
- No calculation, numbering, conversion, schema, or runtime changes.
- Schedule and Compact components stay in the tree but are no longer selectable.

## Files Changed

- Modified `src/domain/cps/pdfPreferences.ts` (Ledger/Industry registry, ledger default, retired-id migration).
- Modified `src/domain/cps/pdfDownloadHandler.ts` (two-template selection).
- Modified `src/components/pdf/forme/LedgerCpsDocument.tsx` (exact width budget).
- Modified `src/components/pdf/forme/CpsIndustryDocument.tsx` (exact width budget, redesigned header, banded groups).
- Added `src/components/pdf/forme/cpsScheduleGeometry.ts` (shared width arithmetic).
- Modified `src/components/cps/CostPricingSheetViewPresentations.tsx` (shared carousel picker only; another agent's activity lines untouched).
- Modified `src/tests/critical/cpsPdf.test.js`, `cpsLedger.test.js`, `cpsIndustry.test.js` (updated expectations plus geometry, fallback, picker, and wall tests).

## Skills Used

Skills used: pdf-rendering-correctness, karpathy, design-artifact
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

### Root cause of invisible financial columns

- Forme `fraction` widths are shares of the full content width. Vendor docs pair 0.6 plus 0.4.
- Both templates set description to `fraction: 1` (100 percent) plus fixed money columns on top.
- A scratch render measured the table at 587 pt inside 487 pt content. Money columns sat off-page.
- Fix: all-fixed columns. Money keeps exact widths. Description takes the exact remainder.
- Verified by re-render: Ledger money right edge at 562 pt, Industry at 557 pt, both inside the page. Headers repeat per page. Groups split across pages. Dead space is 0 to 4 pt.

### Registry and fallback

- Active ids: `ledger`, `ledger` default. `schedule` and `compact` are typed as retired.
- `resolveActiveTemplateId` maps retired and unknown ids to ledger on read and on write.
- Old saved preferences therefore migrate instead of breaking. No migration needed.

### Ledger correction

- Same visual system, corrected geometry: 28/42/68/68/79/79 fixed plus 177.28 description inside 541.28 content.
- Header height untouched; measured pagination fills pages with zero dead space.
- Wall keeps schedule geometry through full-span header and per-column footer cells.

### Industry redesign

- Header is now one horizontal composition: company row with meta at right, then full-width identity and title. The three-compartment layout is gone.
- Groups use a band header with white title and count, zebra members with accent edge, and a ruled figures-only footer.
- Same exact-budget geometry: 30/48/70/70/82/88 fixed plus remainder description inside 531.28 content.
- No invoice or quotation concepts. No status. No signatures.

### Picker carousel

- The bespoke grid is replaced by the shared `TemplatePickerCarousel` shell with CPS navy and gray themes.
- Two radio cards with miniatures, names, one-line blurbs, snap scroll, and clear selected state.
- Template selection stays the first section of the Customize sheet. Other controls unchanged.

### Tests performed

- 45 tests pass across the three CPS PDF suites (`bun test`).
- New coverage: exact width budgets for both CP states, retired-id migration, carousel wiring, wall geometry, no keep-together flags, counters, image href matrix.
- `eslint` on touched files: passed. `git diff --check`: clean.
- `bun run typecheck`: zero errors in touched files. Four errors exist only in another agent's in-flight audit files and were left untouched per concurrent-agent rules.

## Verification

Verification:

- bun run audit:load: not run (no schema, query, or data-layer change)
- bun run typecheck: passed for task scope; unrelated audit files fail (other agent, reported)
- Targeted tests: 45 pass, 0 fail
- Render measurement: columns inside page, 0 to 4 pt dead space
- git diff --check: clean
- git status: task files only; pre-existing work untouched
- supabase db push: not applicable
- bun run build: not run per task instruction

## Supabase Push Status

- Not applicable. No migration written. No schema changed.

## Risks Or Limitations

- Static tests assert geometry arithmetic, not pixels. A fresh human PDF check is still required.
- `cpsViewProductionRedesign.test.js` has 5 failures proven pre-existing at HEAD (view markup and CSS drift). Untouched and unrelated.
- The node `--experimental-loader` test path fails on unrelated files at baseline. `bun test` is the working runner.
- Another agent's audit and activity-history work shares the worktree and one file region-adjacent edit. Their lines were never modified.
- A naming overlap exists between legacy React-PDF `templates/Ledger.tsx` and Forme `LedgerCpsDocument`. Different renderers, pickers, and directories.

## Deferred Work

- Human rendered-PDF acceptance of new Ledger and Industry output (explicitly required, not claimed here).
- Compact template relationship review (components preserved, selection removed).
- Client street address remains unavailable by standing product decision.

## Human Verification Still Required

- Open Ledger and Industry PDFs on a real device and confirm all seven columns, walls, strip, totals, and thumbnails.
- Confirm pagination has no dead space on realistic documents.
- Confirm the picker carousel swipes, snaps, and shows selection clearly on mobile.
- Confirm a thumbnail tap opens its original image.
