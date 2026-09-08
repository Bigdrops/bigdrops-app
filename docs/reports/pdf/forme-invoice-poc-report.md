# Forme Invoice POC & pdfcn Catalogue Report

This report was written by Muse Spark on 2026-09-08 via Opencode.

## Objective

Inventory the pdfcn template/block catalogue for Takumi and Forme. Build an isolated Forme POC on the same representative invoice as the Takumi POC. Compare React-PDF, Takumi, and Forme on BIGDROPS document requirements. No migration was performed.

## Scope

Isolated POC under `docs/Reports/pdf/poc/`. Production PDF code, financial logic, standards, and delivery pipeline were not touched. Only `package.json`/`bun.lock` gained the two Forme dependencies.

## Files Changed

See Final Status.

## Skills Used

Skills used: pdf-rendering-correctness, react-pdf, shadcn
Documentation standard: ASD-STE100 Simplified Technical English

## PART 1 — pdfcn Catalogue Audit

Sources inspected: upstream `registry.json` (full item list), `pdfcn.dev/r/{takumi|forme}/{utils,text,table}.json`, `pdfcn.dev/r/{takumi|forme}/invoice-minimal.json`, `pdfcn.dev/r/theme-professional.json`, `pdfcn.dev/docs/installation`, `pdfcn.dev/docs/blocks`, `docs.formepdf.com` (quickstart, components, page-breaks, fonts).

### 1.1 Catalogue shape (both bases mirror each other)

| Kind | Takumi items | Forme items | Notes |
|---|---|---|---|
| Base utils | `takumi/utils` (theme-provider, pdf-primitives, pdf-svg, resolve-color; deps `takumi-pdf`, `@takumi-rs/helpers`) | `forme/utils` (+`maybe-fixed`; deps `@formepdf/react`, `@formepdf/core`) | Verified by direct fetch |
| Components (24 each) | alert, badge, card, data-table, divider, form, graph, heading, keep-together, key-value, link, list, page-break, page-footer, page-header, page-number, pdf-image, qrcode, section, signature, stack, table, text, watermark | Same 24 names under `forme/` | Names from `registry.json`; contents sampled |
| Blocks (10 each) | invoice-classic, invoice-consultant, invoice-corporate, invoice-creative, invoice-minimal, invoice-modern; report-financial, report-marketing, report-operations, report-security | Same 10 names under `forme/` | Names from `registry.json`; invoice-minimal content fetched for both |
| Themes (shared, 9) | professional, modern, minimal, executive, corporate, elegant, vivid, forest, blueprint (+ shared primitives + types) | Same | Verified by fetch |

### 1.2 Critical catalogue distinctions (source-inspected, not assumed)

- pdfcn `Table` (both bases) renders flexbox Views, not a native table. Same styles, same API, same limitation in both bases.
- Forme base primitives wrap `@formepdf/react` directly with NO unit conversion (points, react-pdf-like). Takumi base converts pt→px at the boundary (96/72). Same numeric tokens produce different physical sizes per base.
- Forme base adds `MaybeFixed`/`Fixed` (repeating header/footer) — the Takumi base has no equivalent.
- The `invoice-minimal` block (both bases, inspected verbatim) is demo-grade: flat data shape (`description/quantity/unitPrice`, `subtotal/tax/total`), hardcoded `$` formatting, single 7% tax, hardcoded `rightText="Page 1 of 1"` (not dynamic numbering), 3 sample rows, US/India-flavored fields (GST). It contains no VAT/WHT/discount rows, no groups, no row numbers, no currency formatting, no amount-in-words, no bank details, no signature image, no attachments.
- No catalogue item provides row enumeration, grouped subtotals, advance/balance summaries, or BIGDROPS column semantics. Those remain BIGDROPS-owned work under any renderer.

### 1.3 Catalogue verdict (fit category B)

pdfcn supplies useful primitives and demo blocks, but BIGDROPS would own its templates. Blocks accelerate layout ideas, not production documents. Result: **B — useful as primitives/examples, requiring BIGDROPS-owned templates.** Not A (blocks are too thin and too opinionated: fixed 3-column layouts, `$`, GST, hardcoded page text). Not C (primitives, themes, and utils are genuinely reusable).

## PART 2 — Forme POC

### 2.1 Method

- Same fixture as the Takumi POC (`poc/fixture.ts`, reused unmodified): 8-row base invoice (mixed 7.5% VAT, exempt row, 10% row discount, 5% global discount before_tax, 5% WHT) plus a deterministic 64-row long variant. All values from production `computeDocument()` + `formatNaira()`. Adapter computes nothing.
- Vendored Forme sources verbatim into `poc/vendor-forme/` (utils, theme-provider, text, table + styles + types, resolve-color; shared theme/types reused from `poc/vendor/`). Only import paths rewritten; provenance headers added.
- Dependencies added: `@formepdf/react@0.20.1`, `@formepdf/core@0.20.1` (package.json diff proves only these two).
- Renderer: `renderDocument()` from `@formepdf/core` under Bun. Four outputs: `forme-invoice-a4.pdf` (pdfcn bordered table + S/N column, 8 rows), `forme-invoice-long.pdf` (same, 64 rows), `forme-invoice-native.pdf` (native Forme Table, 64 rows + group row + zebra), `forme-invoice-landscape.pdf` (base model, landscape page).
- Measurement: `pdf-lib` geometry, `pdf-parse` v2 text assertions (whitespace-flattened matching; cells wrap mid-number).

### 2.2 Runtime findings (Bun)

- `renderDocument()` works under Bun with the default entry. No Windows path bug (contrast: Takumi's Bun entry is broken on Windows and needed manual init).
- Font byte path parses TTF only: woff/woff2 bytes fail (`unknown magic`); path strings silently fall back to NotoSans. The POC uses the variable Inter TTF (`ofl/inter`, google/fonts) for weights 400/500/600/700. Inter embeds (Regular + Bold subsets observed); ₦ extracts correctly from Inter itself.
- Images embed via data-URI PNG (1 image, 240px source, displayed at 90pt). No pre-fetch registry like Takumi; simpler mechanism.

### 2.3 Test results

| Capability | Result | Evidence |
|---|---|---|
| A4 portrait | PASS | 595.28x841.89pt on all portrait outputs |
| Landscape | PASS | 841.89x595.28pt exact via `size={{width:841.89,height:595.28}}`; values exact |
| One-page density (8 rows) | PARTIAL | 2 pages (same as Takumi POC; React-PDF fits 1). Descriptions wrap word-per-line in the pdfcn Table path |
| Long table (64 rows) | PASS | pdfcn path 9 pages; native path 5 pages; flow correct |
| Row integrity | PASS | 64/64 rows whole; totals block kept together on last page in all variants |
| Repeating headers (pdfcn Table) | FAIL | Header on page 1 of 9 only — same abstraction limitation as Takumi base |
| Repeating headers (native Table) | PASS | Header on pages 1–4 of 4 content pages (absent only on totals page — correct) |
| Horizontal/structural borders | PASS | `bordered` variant renders dividers and outer frame across pages |
| Row enumeration | PASS | S/N column renders 1..64 (header cell wraps as `S/`+`N` at 32–36pt widths — cosmetic) |
| Grouped rows | PARTIAL | Native `colSpan={6}` group row renders on page 2; no subtotal/group-footer concept exists — custom work needed |
| Subtotals/totals | PASS | All 5 totals rows exact (Subtotal/Discount/VAT/WHT/Total Payable) |
| Long descriptions | PARTIAL | Render whole (no clipping once column widths sum correctly); wrap heavily in pdfcn path |
| Terms/notes | PASS | Full notes + terms + signature block render; totals page placement correct |
| Logo | PASS | Embedded 240px PNG via data URI |
| ₦ rendering | PASS | `₦20,428,406.88` extracts exactly; Inter covers U+20A6, no fallback needed |
| Fonts/weights | PARTIAL | Inter 400–700 register and embed; only Regular/Bold subsets observed in output — verify 500/600 visually later |
| Page numbering | PASS | `{{pageNumber}} of {{totalPages}}` resolves on every page via `Fixed` footer (dynamic — unlike the block's hardcoded text) |
| Page-break controls | PASS (docs) | `wrap={false}`, `PageBreak`, `breakBefore` documented; `wrap={false}` used for totals/signature |
| Native column math | CAUTION | Overspecified widths (fixed sum + fraction > content width) squeeze/clip cell text — author columns to fit exactly |

Two POC mistakes were made and corrected during the run (both recorded, neither hidden): native column widths first summed past the content width (caused clipping), and value matching first failed on wrapped mid-number breaks (fixed by whitespace-flattened matching after confirming raw bytes contain the full strings).

### 2.4 Takumi issues from the prior report — disposition

- Missing row enumeration: ADDRESSED in this POC (S/N column works in both Forme paths).
- Missing horizontal borders: ADDRESSED (`bordered` variant + native cells).
- Poor terms/notes presentation: ADDRESSED (full sections render; placement correct).
- Table structure across pages: IMPROVED for native (repeat + intact rows); UNCHANGED for pdfcn abstraction.
- Density/page-count gap: UNCHANGED (Forme pdfcn path matches Takumi: 8 rows → 2 pages vs React-PDF 1 page).

## PART 3 — Comparison (React-PDF vs Takumi vs Forme)

Scale: PASS / PARTIAL / FAIL / UNPROVEN. Evidence: POC execution unless noted.

| Requirement | React-PDF (production) | Takumi (+pdfcn) | Forme (+pdfcn) |
|---|---|---|---|
| A4 correctness | PASS (595.28x841.89) | PASS (exact) | PASS (exact) |
| Portrait | PASS | PASS | PASS |
| Landscape | PASS (layout flag) | UNPROVEN (option exists per docs, not POC-tested) | PASS (exact geometry POC-tested) |
| One-page density | PASS (8 rows → 1 page) | PARTIAL (8 rows → 2 pages) | PARTIAL (8 rows → 2 pages) |
| Long-table flow | PASS | PASS (7 pages, intact rows) | PASS (9/5 pages, intact rows) |
| Repeated headers | PASS (fixed bands) | PARTIAL (engine yes via thead; pdfcn abstraction no) | PASS via native Table; FAIL via pdfcn abstraction |
| Borders | PASS | PARTIAL (abstraction-dependent) | PASS (bordered variant + native) |
| Row enumeration | PASS | UNPROVEN in POC (not implemented there) | PASS (S/N 1..64 POC-tested) |
| Grouped rows | PASS (custom) | UNPROVEN | PARTIAL (colSpan row renders; no subtotal concept) |
| Totals | PASS | PASS (exact) | PASS (exact) |
| Terms/notes | PASS | PASS | PASS |
| Logo/images | PASS (URL/data-uri) | PASS (prefetched bytes) | PASS (data URI/file path) |
| Fonts | PASS (rich registry, local woff) | PASS (local woff bytes + DejaVu strategy) | PARTIAL (TTF-bytes only; woff/woff2 bytes rejected; Inter proven via variable TTF) |
| ₦ rendering | PASS (Noto/DejaVu strategy) | PASS (DejaVu fallback) | PASS (Inter covers it; NotoSans builtin fallback) |
| Page numbering | PASS | PASS (primitives) | PASS (dynamic placeholders) |
| Page breaks | PASS | PASS | PASS |
| Template/block availability | PASS (7 owned templates) | PARTIAL (demos only) | PARTIAL (demos only) |
| BIGDROPS customization fit | PASS (owned) | UNPROVEN (custom layer not built) | UNPROVEN (custom layer not built) |
| Browser/Vite complexity | PASS (proven in app) | UNPROVEN (browser WASM init not tested) | UNPROVEN (browser entry exists per docs, not tested) |
| Runtime/deployment complexity | Known | WASM + manual Windows init workaround | 20MB engine; TTF-only local fonts; otherwise clean Bun/Node API |
| Custom renderer code required | Baseline (exists) | High (adapter + repeat + density + theme) | High (adapter + theme; repeat solved natively) |
| Evidence confidence | Production | POC-measured | POC-measured |
| Migration risk | None (status quo) | Medium-high | Medium |

## PART 4 — Template Fit (already answered in 1.3: category B)

Against BIGDROPS grammar: identity/title/parties/columns/descriptions/rates/discounts/VAT-WHT/totals/balance/notes/terms/signature/footer are all modelable, but pdfcn blocks demonstrate only a fraction (flat items, one tax line, hardcoded totals, hardcoded page text, no groups/enumeration/words/bank/advance). BIGDROPS would author its own templates on either engine. Forme's native Table/Row/Cell + Fixed + placeholders make that authoring easier than Takumi's HTML mapping, but the work remains BIGDROPS-owned either way.

## PART 5 — Architectural Conclusion

Recommendation: **Keep React-PDF for now and defer replacement. Continue deeper Forme evaluation as the preferred candidate direction — not as a migration.**

Rationale: Forme resolves the two hardest Takumi-abstraction blockers (native repeating headers, dynamic page numbers) and matches Takumi on geometry, values, fonts, and ₦. But density parity, 500/600 weight rendering, browser/Vite bundling, and the custom-template layer are unproven, and pdfcn blocks do not materially reduce implementation work. No evidence supports migration today.

Exact tests that would resolve the remainder:

1. Density: retune one Forme invoice (native table, tighter leading) to fit 8 rows on one A4; raster-compare with the React-PDF baseline.
2. Browser: render the same document through a Vite client bundle (`@formepdf/core/browser`) and through Vercel serverless; record bundle size and cold-start cost.
3. Weights: raster-check 500/600 numerals against 400/700.
4. Groups: prototype a BIGDROPS group header + subtotal row that survives page breaks.

## Verification

- `git status` before: Takumi POC intact; `components.json` already carried `@pdfcn`; takumi deps in `package.json`; assorted concurrent-agent entries present.
- After: new files all under `docs/Reports/pdf/poc/` (`vendor-forme/` 7 files, `forme-invoice-document.tsx`, `render-forme.tsx`, 4 Forme PDFs, `forme-measurements.json`, `assets/inter-var.ttf`, this report). Modified: `package.json` + `bun.lock` (Forme deps only — diff verified). No production PDF source modified. No existing POC file modified (fixture/logo reused by import). No unrelated application file modified.
- Not run per constraints: build, typecheck, lint.

## Limitations

- No raster visual inspection (no PDF-to-image tool in scope); spacing/hierarchy/shading judged via text geometry only.
- Browser/Vite, Vercel, Android, PDF/A-UA, emoji, and attachments paths untested.
- Inter proven via variable TTF download, not via repo-shipped files (repo ships woff/woff2 only, which Forme's byte path rejects).
- pdfcn catalogue assessed by registry source + sampled fetches, not by installing every item.

## Final Status

- Files Created: `poc/vendor-forme/` (7), `poc/forme-invoice-document.tsx`, `poc/render-forme.tsx`, `poc/forme-invoice-{a4,long,native,landscape}.pdf`, `poc/forme-measurements.json`, `poc/assets/inter-var.ttf`, this report.
- Files Modified: `package.json`, `bun.lock` (`@formepdf/react`, `@formepdf/core` @ 0.20.1 only).
- Files Deleted: none (one junk HTML file downloaded during font probing was removed within the POC assets).
- Production Code Touched: none.
- React-PDF Status: remains the production renderer, untouched.
