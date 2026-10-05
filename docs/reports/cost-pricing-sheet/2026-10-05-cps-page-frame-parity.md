# CPS Page-Frame Parity Pass Report

This report was written by Muse Spark on 2026-10-05 via Opencode.

## Objective

- Match Invoice Industry pagination behavior in CPS Ledger and Industry using Forme-native primitives.
- Prove footer pinning, header repetition, fill efficiency, and group splitting by measurement.
- Lock the contract with static regression tests. No template redesign.

## Scope

- Investigation plus two regression tests. No production template changes were needed.
- No calculation, numbering, conversion, schema, or runtime changes.

## Files Changed

- Modified `src/tests/critical/cpsLedger.test.js` (Ledger page-frame contract test).
- Modified `src/tests/critical/cpsIndustry.test.js` (Industry page-frame contract test).

## Skills Used

Skills used: pdf-rendering-correctness, karpathy, design-artifact
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

### How Invoice Industry implements its footer and page frame

- Footer: `<View style={footerZone} fixed>` at page end. Style pins it absolutely (`left: 24, right: 24, bottom: 14`). Page reserves space with `paddingBottom: 64`.
- Footer content: Page X of Y (render prop) left, document number center, company right, under a top border rule.
- Table header repeats through a separate `fixed` header row. The masthead renders once in flow.

### Forme-native equivalent found

- `<Fixed position="footer">` renders in the bottom margin zone on every page. Both CPS templates already use it.
- `<Row header>` repeats the schedule header per page. Both templates already use it.
- Mastheads render once in flow in both templates.
- No React-PDF details were ported. No absolute hacks. No spacer rows.

### Exact Ledger and Industry changes

- None. Measurement showed the existing implementation already meets every benchmark behavior, so no template edit was justified.

### Footer position measurement

- Ledger footer text sits at y 782 on every page (52 pt bottom margin).
- Industry footer text sits at y 774 on every page (56 pt bottom margin).
- Identical position across pages in both templates. Body never overlaps the footer zone.

### Continuation-page behavior measurement

- Schedule column headers repeat on every continuation page in both templates.
- Masthead strings appear only on page 1 in both templates.
- Full pages fill to 22 to 64 pt of the usable bottom; remaining gaps fit no further row.
- A 40-item single group spans pages 2 through 7, proving groups split normally.
- Page labels resolve per page at emit time; live output already shows correct numbering.

## Verification

Verification:

- bun run audit:load: not run (no schema, query, or data-layer change)
- bun run typecheck: zero errors in task files (unrelated audit files fail; other agent, untouched)
- Targeted tests: 47 pass, 0 fail
- eslint on touched files: passed
- git diff --check: clean
- git status: task files only; pre-existing work untouched
- supabase db push: not applicable
- bun run build: not run per task instruction

## Supabase Push Status

- Not applicable. No migration written. No schema changed.

## Risks Or Limitations

- Static tests assert the mechanism, not pixels. Real-device inspection is still required for final acceptance.
- `cpsViewProductionRedesign.test.js` has 5 failures proven pre-existing at HEAD. Untouched.
- The node `--experimental-loader` test path fails on unrelated files at baseline. `bun test` is the working runner.
- Page digits resolve at PDF emit, not in layout data. Correctness rests on untouched template strings plus live-output evidence.

## Deferred Work

- Real-device PDF acceptance of Ledger and Industry pagination (explicitly required, not claimed here).
- Compact template relationship review (components preserved, selection removed).

## Human Verification Still Required

- Open multi-page Ledger and Industry PDFs and confirm footers sit at the physical bottom on every page.
- Confirm continuation pages repeat the schedule header without the masthead.
- Confirm groups break naturally with no stranded footers or dead space.
- Confirm page numbers, document number, and company identity in every footer.
