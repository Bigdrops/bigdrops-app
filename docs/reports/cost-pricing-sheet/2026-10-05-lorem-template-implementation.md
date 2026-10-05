# Lorem CPS Template Implementation Report

This report was written by Muse Spark on 2026-10-05 via Opencode.

## Objective

- Implement `cps-pdf-v1.html` as a new alternative Forme CPS template named Lorem.
- Keep existing templates available with unchanged rendering.
- Thread authoritative prepared data only. No template arithmetic.

## Scope

- New template file, registry entry, shared model additions, handler mapping, tests.
- No schema change. No numbering change. No conversion change. No runtime change.
- "Lorem" names the template option only. It never renders in document content.

## Files Changed

- Added `src/components/pdf/forme/LoremCpsDocument.tsx` (new Lorem template).
- Added `src/tests/critical/cpsLorem.test.js` (9 Lorem tests).
- Modified `src/domain/cps/pdfPreferences.ts` (registry entry plus id).
- Modified `src/domain/cps/pdfDownloadHandler.ts` (model fields, client routing, URL validator, selection).
- Modified `src/components/pdf/forme/CpsFormeDocument.tsx` (interface fields only, no render changes).
- Modified `src/tests/critical/cpsPdf.test.js` (2 stale assertions updated for 3 templates).

## Skills Used

Skills used: pdf-rendering-correctness, karpathy, design-artifact, typescript-advanced-types, test-driven-development
Documentation standard: ASD-STE100 Simplified Technical English

Note: `frontend-design` is not registered. It was not loaded.

## Changes Made

### New Lorem template registration

- `CpsPdfTemplateId` accepts `'lorem'`. Registry lists Schedule, Compact, Lorem.
- Default stays `'schedule'`. Unknown ids still fall back to schedule.
- The Customize sheet maps over the registry, so Lorem appears with zero sheet changes.
- The download handler selects `LoremCpsDocument` through the existing staged pipeline.

### Shared prepared-model additions

- Row: `totalCostText`, `quantityValue`, `unitText`, `imageHref`.
- Group: `costSubtotalText`.
- Model: `currency` (`'NGN'`, authority: `ViewCps.tsx` formatter).
- All values come from existing view rows and engine output. No new math.

### Client-information mapping

- Evidence confirmed the defect: client phone/email rendered inside company lines.
- Fix: `companyLines` carries company address only. `clientLines` carries contact, city, phone, email.
- Missing values vanish. No placeholders. No street address invented (no source field exists).

### Seven-column schedule

- Columns: No., Description, Qty, Unit CP, Unit SP, Total Cost, Total Sell.
- Extended cost threads from `row.cost`. Unit CP and Total Cost follow CP visibility.
- Quantity and unit render from split source fields. No display-string parsing.

### Group presentation

- Navy header with actual title plus member counter pill ("N ITEMS").
- Segmented wall: header top edge, side edges on member cells, footer top and bottom edges.
- Figures-only footer with group CP/SP totals under their columns. No subtotal wording.
- No enumeration, no helper text, no keep-together flags. Normal pagination.

### Image-link implementation

- Thumbnails render from `imageDataUri` as before.
- `href` carries the validated original URL via proven Forme `Image href` support.
- Validator parses with `URL` and allows `https:` only. Others yield null.
- Thumbnail never depends on href validity. No helper text beside images.

### Pagination behavior

- No `wrap={false}` anywhere in Lorem. Groups break naturally.
- Footer flows with pagination. No attachment guarantee is claimed.

### Tests performed

- TDD order: new suite failed on missing module first, then passed after implementation.
- 9 new Lorem tests plus 22 existing CPS PDF tests: 31 pass, 0 fail (`bun test`).
- Existing schedule output verified unchanged (no Lorem columns or labels leak).
- `bun run typecheck`: passed. `eslint` on touched files: passed.
- `git diff --check`: clean.

## Verification

Verification:

- bun run audit:load: ran; flags are pre-existing in untouched files only
- bun run typecheck: passed
- Targeted tests (cpsLorem, cpsPdf): 31 pass, 0 fail
- git diff --check: clean
- git status: only task files changed; pre-existing work untouched
- supabase db push: not applicable
- bun run build: not run per task instruction

## Supabase Push Status

- Not applicable. No migration written. No schema changed.

## Risks Or Limitations

- The repo `node --experimental-loader` test path fails on unrelated `.tsx`/`.woff` files at baseline. `bun test` is the working runner. This predates the task.
- `cpsViewProductionRedesign.test.js` has 5 failures about view markup and CSS. Those files belong to another agent's in-flight work and were never touched here. Reported as conflict, not fixed.
- Long specs in a 155 pt portrait description column wrap to several lines. This is accepted reference behavior.
- Group walls break at page boundaries by design. Corners do not reconnect across pages.

## Deferred Work

- Human visual comparison of Lorem against Schedule output.
- Compact template relationship review (unchanged in this task).
- Client street address needs a product decision (extend snapshot vs drop).
