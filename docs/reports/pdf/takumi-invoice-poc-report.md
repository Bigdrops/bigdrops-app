# Takumi Invoice POC Report

This report was written by Muse Spark on 2026-09-07 via Opencode.

## Objective

Test whether the Takumi/pdfcn stack reproduces one representative BIGDROPS commercial invoice closely enough to justify deeper evaluation. No migration was performed. React-PDF remains the production renderer.

## Scope

Isolated POC under `docs/Reports/pdf/poc/`. Production code was not touched. Financial math was not reimplemented. Only `package.json`/`bun.lock` gained the two authorized Takumi dependencies.

## Files Changed

See Final Status.

## Skills Used

Skills used: pdf-rendering-correctness, react-pdf, shadcn
Documentation standard: ASD-STE100 Simplified Technical English

## 1. Executive Verdict

POC PARTIALLY PASSED — SPECIFIC BLOCKERS REMAIN

Pass evidence: exact A4 geometry, exact financial values, correct font embedding including the ₦ glyph, clean multi-page flow with intact rows, totals kept together on the last page, logo embedded at correct dimensions, native `<thead>` repeats.

Blockers: the vendored pdfcn `Table` does not repeat headers (flexbox, not `<table>`); its description column lays out narrow, so an 8-row invoice needs 2 pages where React-PDF needs 1; the Takumi Bun default entry is broken on Windows; pdfcn's default theme names fonts Takumi cannot resolve without registration.

## 2. Environment

- BIGDROPS: React 19.2.0, Vite 7.3.1, TypeScript 5.9.3, Tailwind 3.4.1, Bun 1.3.14, @react-pdf/renderer 4.3.2.
- Takumi: `takumi-pdf@0.14.3`, `@takumi-rs/helpers@2.13.7` (new in `package.json`, alphabetical placement preserved).
- pdfcn sources: fetched live 2026-09-07 from `pdfcn.dev/r/{takumi/text,takumi/table,takumi/utils,theme-professional}.json` (upstream `shadcn-labs/pdfcn`). Vendored verbatim into `poc/vendor/` with only import paths rewritten and provenance headers added.
- Measurement tools: `pdf-lib` (existing dependency) for geometry, `pdf-parse` v2 (existing devDependency) for text assertions.

## 3. Architecture

```
BIGDROPS business data (deterministic POC input)
→ computeDocument() [src/lib/Calculations.ts, production]
→ formatNaira() [src/lib/formatters/money.ts, production]
→ PocPreparedModel [poc/fixture.ts, presentation strings only]
→ POC adapter [poc/invoice-document.tsx, vendored pdfcn Takumi JSX]
→ takumi-pdf render() [size a4, margins, fonts, images, footer]
→ PDF bytes → poc/*.pdf
```

The adapter receives prepared values only. It computes nothing. The production path (`DefaultPdfGenerator`, `PdfRenderer`, `IndustryTemplate`, `invoicePdfActions`) was not modified or called.

## 4. Test Results

| Capability | Result | Evidence | Blocker |
|---|---|---|---|
| A4 portrait | Pass | `595.28x841.89pt` on all outputs via pdf-lib; matches React-PDF baseline `595.28x841.89pt` | None |
| Long table (64 rows, 7 pages) | Pass | Content flows across pages; totals on last page only; `breakInside: avoid` holds | None for flow |
| Row integrity | Pass | 64/64 rows intact on exactly one page (8 apparent multi-hits are substring artifacts of repeated batch labels) | None |
| Repeated headers (pdfcn Table) | Fail | Header labels (`Unit Price`) appear on page 1 only, all 7 pages checked | pdfcn Table is flexbox Views; Takumi `<thead>` repeat cannot apply. Needs a custom repeat solution. |
| Repeated headers (native table control) | Pass | `Description`/`Unit Price` present on both pages of `takumi-thead-repeat.pdf` | None — proves the engine can do it; pdfcn components do not use it |
| Page breaks | Pass | No split rows; `TotalsBlock` kept together via `breakInside: avoid`; footer `Page N of M` correct on every page | None |
| Logo | Pass | 1 embedded image, 240x96 source, displayed at width 120 (2x sharpness); `images: [{src, data}]` mechanism works offline | Visual sharpness not eyeballed (no raster tool in scope) |
| Fonts (Inter 400/500/600/700 + latin-ext) | Pass | Embedded subsets: Inter Regular/Bold/SemiBold; woff bytes accepted | Weight 500 has no dedicated file mapped in output (only Regular/Bold/SemiBold subsets embedded); verify 500 rendering visually later |
| Fonts (₦ U+20A6) | Pass | Inter latin subsets lack ₦ (render fails without cover); registering DejaVu Sans fallback (production's `PDF_GLYPH_FONT_FAMILY` strategy) fixes it; `₦20,428,406.88` extracts correctly | pdfcn default theme (`Helvetica`/`Times-Roman`) is unresolvable by Takumi; every project must retarget theme fonts |
| Financial values | Pass | Base: 21/21 strings exact; long: 133/133 exact; invoice number found; all via pdf-parse text extraction | None |
| Multi-page invoice | Pass with note | 7-page output correct and complete | Density note below |

Density finding (worse): the 8-row invoice needs 2 pages via pdfcn Table (table p1; totals/notes/signature p2) versus 1 page via React-PDF. Per-page text shows heavy description wrapping in the pdfcn path while the native-table control lays the same strings out on single lines. Root cause is unproven without raster inspection; candidates are flex distribution in the vendored Table versus the control.

## 5. React-PDF Comparison

Equivalent: page size (exact A4 both), document structure (header, parties, table, totals, notes, terms, signature, footer), totals placement, page numbering, logo presence.

Better (Takumi): real ₦ extraction (`₦20,428,406.88` vs baseline `¦20,428,406` — Helvetica/WinAnsi corruption, the exact issue production's DejaVu/Noto workaround addresses); documented `<thead>` repeat for native tables.

Worse (Takumi/pdfcn path): page density (2 pages vs 1 for the 8-row invoice); no header repeat in pdfcn Table; theme fonts need manual retargeting; no `minPresenceAhead`, custom hyphenation, or emoji source (per upstream from-react-pdf map).

Unproven: visual spacing/typography/hierarchy parity (no raster inspection available); landscape; browser-bundle WASM init under Vite; low-end Android performance; PDF/A output.

## 6. Production Migration Implications

Before any migration discussion, BIGDROPS would need to build:

- A canonical-model-to-pdfcn adapter (prepared `PdfDocumentModel` → pdfcn props), owned by BIGDROPS.
- A theme retarget (Inter + DejaVu coverage) replacing pdfcn's Helvetica/Times-Roman defaults.
- A header-repeat strategy for multi-page tables (custom repeated header or native-table sections).
- Density tuning to reach single-page invoices where production achieves them.
- A Vite browser-bundle WASM init path (POC used Bun server-side init; the `takumi-pdf/next` and `no-init` entries exist but were not exercised in a client bundle).
- A visual regression harness (PDF-to-image + side-by-side review); text extraction alone is insufficient.
- Windows workaround for the broken `takumi-pdf` Bun entry (manual `no-init` init) or an upstream fix.
- Landscape, emoji, hyphenation, and PDF/A decisions per document type.

## 7. Recommendation

Do NOT migrate. Authorize deeper evaluation only if the density and header-repeat items are resolved: tune the table layout to fit the 8-row invoice on one A4 page, implement a repeat strategy, raster-compare against the React-PDF baseline, and prove the Vite client-bundle path. Re-run this matrix after those changes.

## Verification

- `git status` before: pre-existing concurrent-agent entries (settings files, PRD html, test file, two prior pdfcn reports); `components.json` already contained the `@pdfcn` mapping from the prior task.
- After: intentional changes are `package.json` + `bun.lock` (two Takumi deps), `poc/` (19 new files), and this report. No production source file was modified. No React-PDF file was touched. `src/lib/Calculations.ts` and formatters were imported at runtime only.
- Typecheck/lint/tests/audit were not run: the POC sits outside `tsconfig.json` `include` (`src` only), and no application code changed. Build was not run (permanent ban).
- Observation: a concurrent agent staged the full working tree mid-task (`git add` equivalent), including this task's new files. The index was left untouched per concurrent-agent safety rules. Staging state is reported, not managed, here.

## Limitations Respect

- No React-PDF code removed or replaced. No Invoice/Quotation/Waybill migration. No Forme install or evaluation. No template architecture rewrite. No standards or PRD modification. Takumi only; minimum deps only (`takumi-pdf`, `@takumi-rs/helpers`).

## Deferred Work

- Visual (raster) comparison and density root-cause analysis.
- Vite client-bundle WASM proof.
- Landscape, emoji, hyphenation, PDF/A checks.
- Takumi vs Forme decision (Forme explicitly out of scope).

## Final Status

- Files Created: `docs/Reports/pdf/poc/` — `fixture.ts`, `invoice-document.tsx`, `make-logo.ts`, `render-poc.tsx`, `analyze-poc.tsx`, `reactpdf-baseline.tsx`, `measurements.json`, `analysis.json`, `takumi-invoice-a4.pdf`, `takumi-invoice-long.pdf`, `takumi-thead-repeat.pdf`, `reactpdf-invoice-baseline.pdf`, `assets/poc-logo.png`, `vendor/` (10 files: `pdf-primitives.tsx`, `resolve-color.ts`, `pdf-theme-types.ts`, `primitives.ts`, `professional.ts`, `theme-provider.tsx`, `text.tsx`, `table.styles.ts`, `table.tsx`, `table.types.ts`); `docs/Reports/pdf/takumi-invoice-poc-report.md` (this report).
- Files Modified: `package.json`, `bun.lock` (two added Takumi dependencies only).
- Files Deleted: none.
- Production Code Touched: none (all new files live under `docs/Reports/pdf/poc/`; production modules were only imported).
- React-PDF Status: remains the production renderer, untouched.
