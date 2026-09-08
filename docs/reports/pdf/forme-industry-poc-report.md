# Forme Industry Invoice POC Report

This report was written by Muse Spark on 2026-09-08 via Opencode.

## Objective

Prove whether Forme can carry a BIGDROPS-owned Industry Invoice template with the real commercial document grammar — not another simplified demo. Answer: can Forme become the rendering engine underneath a BIGDROPS-owned Industry template without compromising existing grammar?

## Scope

Isolated POC under `docs/Reports/pdf/poc/`. Production IndustryTemplate, adapter, calculations, standards, and delivery pipeline untouched. No pdfcn demo block used as the template. No migration.

## Files Changed

See Final Status.

## Skills Used

Skills used: pdf-rendering-correctness, react-pdf, shadcn
Documentation standard: ASD-STE100 Simplified Technical English

## Architecture

```
Fixture input (deterministic items + stored-field passthroughs)
→ computeDocument() [production] + formatPdfCurrencyString() [production]
→ IndustryPocModel [poc/fixture-industry.ts, prepared strings + stored fields]
→ IndustryInvoiceDocument [poc/industry-document.tsx, BIGDROPS-owned,
   native Forme Table/Row/Cell, design prop]
→ renderDocument() [@formepdf/core] → PDF
```

Reference (read-only): `IndustryTemplate.tsx` (680 lines), `industryAdapter.ts` (`CommercialDocumentData`, group semantics), `industryStyles.ts` (production metrics), `compact.ts` (compact spacing), `financialProjection.ts` (amount-in-words = stored field).

## Production Capabilities Inspected

Header (INVOICE title, number/issue/due/PO meta rows, custom fields, logo right); From/To party cards with accent surfaces; table (S/N auto-numbering, description main+sub, make, qty/unit no-hyphen cells, currency cells, zebra rows, group_header title-cased rows, group_footer subtotals-or-rule, accent header bg); closing bank box + totals box (lines, main total, amount-in-words, balance-due banner, advance box — advance correctly absent here); rich-text notes/terms; attachments; additional fields; signature (image/name/role); fixed footer (extra text, tagline, Page N of M, doc number, company). Customization: design preset (accent/text/muted/border/surface colors, header/body fonts, use-flags), compact mode, portrait/landscape.

## Forme Industry Implementation

`poc/industry-document.tsx` reproduces every section above except rich-text HTML parsing (plain strings rendered; port needed) and signature image (fixture has name/role only; the Image mechanism is proven by the logo). Group semantics mirror production exactly: header row per group, footer with prepared-amount subtotal (adapter-level sum of prepared line totals, same as `resolvePreviewGroupSubtotal`), S/N auto-numbering across data rows only. Design prop mirrors `CommercialDocumentDesign` subset (accent, useCustomColors, compact).

## Table Architecture

Native Forme `Table` with explicit columns (S/N 30 fixed, description 0.41 fraction, qty 52, unit 52, price 90, amount 98 — authored to fit the 547.28pt content width from production 24pt side margins). Header `<Row header>` repeats on every content page (6/6 long pages). No pdfcn abstraction used — deliberately, per the known repeat limitation.

## Density Results (8-row, like-for-like)

| Output | Pages | Bytes | Values |
|---|---|---|---|
| Forme Industry default | 2 | 75,917 | exact |
| Forme Industry accent+compact | 2 | 75,926 | exact |
| React-PDF Industry baseline (same sections, production metrics) | 2 | 10,069 | n/a (Helvetica corrupts ₦) |

The earlier "density gap" was a comparison artifact (full Industry content vs sparse demo invoice). With equal content, all renderers agree at 2 pages: p1 carries header + parties + full 8-row grouped table; p2 carries bank + totals + words + balance + notes + terms + attachments + fields + signature. Compact spacing does not reclaim a page for this content volume — also true in production metrics.

## Long-Document Results (64 rows, 8 groups)

6 pages. Header repeats pp1–6. Group headers/footers intact on pp1–5. All closing sections together on p6. All 133 money strings exact. Page numbers correct all pages. No split rows observed.

## Customization Mapping

Proven: accent color flows into header bg, card/bank/totals borders, section titles, balance banner (green fill `0.078 0.325 0.176` confirmed in decompressed content streams of the compact output, absent in default). Compact spacing mode applies (margins/paddings mirror `compactCommercialDocument`). Landscape proven in the prior POC (exact geometry). Column config, optional sections (bank/attachments/fields render conditionally on prepared data), logo, footer behavior all demonstrated structurally. Font slots map to registered Inter (theme retarget required, as before). Unproven: full 7-template preset system, user-facing customization UI binding.

## React-PDF Comparison

Equivalent: page geometry, section order and presence, table structure with groups, totals placement, footer behavior, page numbering. Better (Forme): real ₦ (baseline Helvetica corrupts to ¦), dynamic header repetition without fixed-band workarounds. Worse (Forme): file size (~7.5x larger: 75KB vs 10KB for the same content — subset embedding overhead), no rich-text pipeline yet, compact mode buys no page. Unproven visually: raster-level spacing/typography parity (geometry + text evidence only).

## PASS/PARTIAL/FAIL/UNPROVEN Matrix

Title, identity, dates, PO, custom fields: PASS. Issuer/recipient/attention: PASS. Logo: PASS. S/N enumeration: PASS. Descriptions + sub-lines: PASS. Qty/unit/price: PASS. Discount/VAT/WHT presentation: PASS (values exact). Group headers/footers/subtotals: PASS. Subtotal/discount/VAT/WHT/total-payable/balance/words: PASS (exact). Bank details: PASS. Notes/terms: PASS (plain-text; rich-text port UNPROVEN). Attachments/additional fields: PASS. Signature name/role: PASS (image path UNPROVEN, mechanism proven). Fixed footer + dynamic numbering: PASS. A4 portrait: PASS. Multi-page integrity: PASS. One-page 8-row density: PARTIAL (2 pages, matches production baseline — acceptable, not a renderer defect). Advance summary: not represented by fixture (correct per skill rules) — structurally mappable, UNPROVEN. Landscape: PASS (prior POC). Compact mode: PASS (applies; saves no page here).

## Limitations

- No raster inspection; visual parity limited to geometry/text/fill evidence.
- Rich-text notes/terms need a Forme rich-text port (production renders HTML).
- 500/600 weight rendering not visually confirmed (subsets observed: Regular/Bold only).
- Inter proven via downloaded variable TTF, not repo-shipped files (repo ships woff/woff2; Forme byte path is TTF-only).
- Browser/Vite, Vercel, Android, PDF/A-UA, emoji untested. File size ~7.5x React-PDF output.
- Amount-in-words carried as stored-field passthrough (matches production semantics).

## Exact Generated Outputs

`poc/industry-a4.pdf`, `poc/industry-compact.pdf`, `poc/industry-long.pdf`, `poc/reactpdf-industry-baseline.pdf`, `poc/industry-measurements.json`, `poc/fixture-industry.ts`, `poc/industry-document.tsx`, `poc/render-industry.tsx`, `poc/reactpdf-industry-baseline.tsx`.

## Dependency Changes

None in this task. `@formepdf/react` + `@formepdf/core` 0.20.1 already present from the prior POC.

## Git Status Verification

- Before: prior POC files present; `components.json` carried `@pdfcn`; Forme deps in `package.json`; assorted concurrent-agent entries.
- After: new files all under `docs/Reports/pdf/poc/` + this report. No `package.json`/`bun.lock` change. Zero production files modified. Zero existing POC files modified (fixture/logo reused by import).
- Not run per constraints: build, typecheck, lint.

## Recommendation

Distinguish the four layers:

- Forme engine: CAPABLE — geometry, pagination, native repeat, numbering, embedding all proven.
- Forme native components: CAPABLE for Industry grammar (Table/Row/Cell/Fixed/Imageplaceholders all exercised).
- pdfcn abstractions/blocks: NOT USED here by design; prior verdict stands (demos, no repeat).
- BIGDROPS-owned template: PROVEN FEASIBLE — this POC reproduces the full Industry section set with exact values at acceptable complexity (~450-line template + ~200-line fixture).

Central answer: **yes — Forme can realistically carry a BIGDROPS-owned Industry Invoice template without compromising existing commercial grammar**, subject to the listed ports (rich text, weight visuals, browser/bundle proof, size budget). No migration is authorized; React-PDF remains production. Next: raster visual parity + Vite/Vercel proof before any migration design.
