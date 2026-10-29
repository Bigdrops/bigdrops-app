# CSR Production Template Compactness Audit

This report was written by Buffy on 2026-10-27 via Freebuff Desktop.

## Objective

Explain how the production CSR templates (Industry, Minimal, Zinc) produce compact documents. Prove behaviour with a heavy-fixture render. Recommend a Round 2 page architecture before design work resumes.

## Scope

- Read-only trace of the production CSR PDF path.
- Static analysis of the three templates and shared helpers.
- Diagnostic render of all three templates with the supplied QSV91G fixture.
- Conceptual comparison of three materials arrangements against the 18-item fixture.

## Files changed

- `docs/reports/pdf/csr-production-template-compactness-audit.md` (this report, created).
- Temporary diagnostic outputs in `.tmp-csr-verify2/` (script, 3 PDFs, 5 PNGs, 1 JSON). Untracked working directory. Not part of the repository deliverables.

No production file, template, Round 2 prototype, manifest, or lockfile was modified.

Skills used: pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Production rendering path

Verified path from form data to PDF bytes:

1. `src/pages/ViewCSR.tsx:235-246` — `buildCsrPreviewData(csr, { signatories, client })` builds the model. `getCsrBranding(settings)` builds branding. `handleDownload` calls `downloadPdfFromElement({ element: getCsrPdfDocument(...) })`.
2. `src/components/csr/csrUtils.ts` — `parseCsrMaterials` reads `materialsRows` + `meta` from `materials_used`. `buildCsrPreviewData` adds `technicianRemarks`, display flags, and `layoutDensity`.
3. `src/domain/csr/csrRenderModel.ts:144-161` — `computeLayoutDensity` sets density. Rule: narrative total > 900 chars or > 4 materials → `tight`. > 520 chars or > 2 materials → `compact`. The QSV91G fixture reaches `tight` (1928 narrative chars, 18 materials). Line 178: empty `status` resolves to `'Complete'`.
4. `src/components/csr/preview-templates/index.tsx:25-32` — `getCsrPdfDocument` routes template keys via `getCsrTemplateVariant` (`src/components/csr/CSRPreviewContent.js`): `'8'` → Industry (default), `'6'` → Minimal, `'3'` → Zinc.
5. Template components render React-PDF trees: `IndustryCsr.tsx`, `Minimal.tsx`, `Zinc.tsx`. Shared helpers live in `components.tsx`, `layoutModel.ts`, `utils.ts`, `ClientNotesBlock.tsx`.
6. `src/components/document-view/shared/downloadPdf.tsx:14-30` — `downloadPdfFromElement` runs `pdf(element).toBlob()` from `@react-pdf/renderer` 4.3.2 inside `exportPdfToDevice`.
7. Fonts: `index.tsx:9` calls `registerPdfFillableFonts()` at module load (`src/lib/pdfFontRegistry.ts:89`). It registers `@fontsource` WOFF files and a hyphenation callback that never breaks `digits+unit` tokens (protects `1200`, `LITERS` wraps). Fillable text colour/font come from `getFillablePdfTheme` (`utils.ts:70-77`, `src/lib/pdfDesignPreset.ts`).

Secondary path: `src/pages/CsrFormPage.tsx:435,572` calls `pdf(getCsrPdfDocument(...)).toBlob()` directly for the form flow.

Not traced end to end: the on-screen `CSRPreviewPanel` HTML preview (uses `CSR_TEMPLATE_VARIANTS` tokens such as `pagePadding`; preview-only, does not affect PDF geometry).

## 2. Comparison matrix

| Aspect | Industry (`'8'`, default) | Minimal (`'6'`) | Zinc (`'3'`) |
|---|---|---|---|
| Page | `size="A4"`, 595.28 × 841.89 pt | same | same |
| Page padding (comfortable → tight) | 8 → 6 pt all sides | 20/24 → 10/12 pt | 12 → 10 pt |
| Base font (comfortable → tight) | 7.8 → 7.2 pt Helvetica | 8.5 → 7 pt | 8 → 7.4 pt |
| Narrative text / line-height | 6.3–7.2 pt, lh 1.1 (tight) | 7.5–8.5 pt, lh 1.4 | 7–7.7 pt, lh 1.22–1.3 |
| Header | accent band, 48 pt logo slot (letter fallback), brand block; doc-id row with title + Report No./date | brand block left; 220 pt label/value ID table right (CSR Number, Report Date, conditional rows) | brand block left; right ID box (Service Report, number, date) |
| Client block | one flex-wrap card row: Client (flex 1), Address (flex 2), Start/End, conditional Call/Basis/System Status; PO only if `show_po` | one bordered row: 33.33 / 50 / 16.66 % (Client, Site Address, Service Date) | `grid3`: 33.33 % cards + 66.66 % address + window/call/basis/system conditionals |
| Equipment | 7 cards, `flex: 1` in wrap row | 6 cells at 16.66 % | 25 % × 4 + 25/75 % row |
| Readings | `ReadingsStrip` inside the equipment section: 6 equal cells, value over label | second 16.66 % row inside equipment section | `ReadingsStrip` (9.5 pt values) inside asset section |
| Narrative grouping | Problem in own section; Service Rendered section nests Defects + Technician Remarks (conditional) | Problem \| Defects side-by-side 50/50 row; Service Rendered full width; **engineer remarks not rendered** | Problem \| Service side-by-side; Defects below; Technician Remarks conditional below |
| Status | 5 pills, `flex: 1`, `minWidth 18%` | 5 checkbox items in 2 columns + Service Time table | lifecycle journey bar only; `statusGrid: { display: 'none' }` |
| Materials | `templateId="industry"` → 3 blocks × 6 rows for 18 items | `templateId="minimal"` → 2 blocks × 9 rows | `templateId="zinc"` → 2 blocks × 9 rows, in a flex row beside Customer Feedback when present |
| Acknowledgement | container: top row (name/comment, `paddingBottom` 18 pt tight), bottom row `minHeight` 45 pt at 40/30/30 %, signature image max 50 × 88 pt | bordered box: header bar; top row `minHeight` 36 pt; bottom row `minHeight` 60 pt: client 50 % + technician split (image max 30 × 90 pt) | container: top halves `paddingBottom` 20 pt; bottom row `minHeight` 50 pt at 40/30/30 %, image max 56 × 96 pt |
| Footer | only if `branding.footerText`; centred 5.5 pt | always: black bar, `Official Service Document | …` + **hardcoded `Page 01 of 01`** | only if `branding.footerText`; centred 6 pt |
| Empty-value behaviour | label renders, value blank; dates fall back to `Not recorded` | equipment/time/readings fall back to `—`; header ID `—` | `PdfField` returns `null` when value empty: the card disappears |
| Conditional sections | PO, call type, service basis, system status, defects, remarks, readings, materials, ack flags | call type/basis/system rows in header table; defects; readings row | PO, call type, service basis, system status, defects, remarks, customer feedback, ack flags |

## 3. Verified techniques behind the compact layout

1. **Density ladder.** `computeLayoutDensity` shrinks padding, font, and section margins in two steps (`compact`, `tight`). Heavy content selects `tight` automatically. Verified: all three diagnostic renders report `layoutDensity=tight`.
2. **Small type at tight.** Body 7.0–7.4 pt, narrative line-height 1.1–1.3, labels 5.2–6.5 pt. Page padding 6–10 pt.
3. **Multi-column materials.** `resolveMaterialColumnBlocks` (`layoutModel.ts:28`) with per-template policy (`layoutModel.ts:8-13`): industry 100 pt / 12 pt rows / 3 columns → capacity 24; minimal 160 / 14 / 4 → 44; zinc 140 / 14 / 4 → 40. At 18 items: industry 3 × 6, minimal 2 × 9, zinc 2 × 9. Above capacity the section falls back to a comma-separated paragraph (`formatCommaMaterialsText`). Not triggered at 18 items.
4. **Narrative pairing.** Minimal puts Problem | Defects in one row. Zinc puts Problem | Service in one row. Two of four narratives then share the tallest block's height.
5. **Readings folded into equipment.** All three templates place the readings strip inside the equipment section. No separate section title. One strip row measured ≈ 17 mm (Industry, Minimal) and ≈ 23 mm (Zinc, larger values) on the rendered pages.
6. **Conditional omission.** Empty fields consume almost nothing. Zinc removes the whole card (`PdfField` → `null`).
7. **Bounded, grow-only signature areas.** `minHeight` on acknowledgement rows, `maxHeight/maxWidth` with `objectFit: contain` on signature images. Nothing is clipped; rows grow if content needs it.
8. **Hyphenation guard.** `pdfFontRegistry.ts:72-82` blocks hyphen splits on `digits+unit` tokens, so `1200`, `200Ah` stay intact while wrapping.
9. **No scaling, no truncation.** React-PDF has no fit-to-page transform. Overflow produces a second page, never a clipped field. The only clamp in the system is `ClientNotesBlock.tsx` (fixed 30 mm height, `maxLines: 5`, ellipsis) and it applies only to optional comments. It did not trigger in the diagnostic.
10. **Density-driven empty fallbacks.** `—`, blank, or omitted values keep rows at one line.

## 4. 18-item stress test (QSV91G fixture)

Method:
- Rendered through the real production path: `getCsrPdfDocument` + `renderToBuffer` from `@react-pdf/renderer` 4.3.2, run under Bun. No production file changed. Script: `.tmp-csr-verify2/render-csr-diag.tsx`.
- Fixture used verbatim (all four narratives, six readings, both dates, `system_down: true`, 18 materials in order). Missing fields left empty, as in the source. Branding text taken from the reference screenshots. No logo URL supplied, so Industry/Zinc used their letter-slot fallback.
- Page metrics from `pdf-lib`. Content checks from `pdf-parse` text extraction, space-insensitive (letter-spaced uppercase extracts with spaces between glyphs). Visual checks from rasterised page images (`pdf-parse getScreenshot`).

Results:

| Check | Industry | Minimal | Zinc |
|---|---|---|---|
| Pages | **1** | 2 | 2 |
| Page size | 595.28 × 841.89 pt (A4) | same | same |
| Materials found / order | 18/18, ordered | 18/18, ordered | 18/18, ordered |
| 4 narratives present in full | 4/4 | **3/4** (engineer remarks not rendered by template) | 4/4 |
| 6 readings present | 6/6 | 6/6 | 6/6 |
| Both dates, `DOWN`, status | all present | all present | all present |
| Acknowledgement on 1 page | yes, complete | body complete on page 1 | **signature row orphaned to page 2** |
| What page 2 contains | — | footer bar only (114 chars of text); bar background splits onto page 1 | `RECIPIENT SIGNATURE TECHNICIAN SIGNATURE TECHNICIAN NAME` (56 chars) |
| Clipping / overlap found | none | none | none |

Visual findings (rasterised pages):
- Industry page 1 holds the whole document and keeps roughly 10–13 % free space at the foot.
- Minimal materials block shows 1–9 | 10–18 in two columns, no name wraps at that column width.
- Industry materials block shows 1–6 | 7–12 | 13–18 in three columns. Four long names wrap (items 15, 16, 17, 18). No row is cut.
- Minimal page 2 footer prints `PAGE 01 OF 01` while physically being page 2. The hardcoded page number is wrong under spill.
- Minimal never renders `engineer_remarks` anywhere in the template. This is a template gap, not an overflow.
- Zinc lifecycle active marker (dark dot and label on the dark bar) has low contrast under the default preset.

Failure sizes (page counts exact; magnitudes estimated from style constants):
- Minimal overflows by roughly one footer bar (≈ 19 pt).
- Zinc overflows by roughly one signature row (≈ 50–55 pt).

Separate cases:
- The NT-855-G6 record with 4 materials is the record in the three screenshots. Each screenshot matches one template and shows a single page. That case fits.
- The QSV91G record with 18 materials fits only Industry. Minimal and Zinc spill.

Limitations of the diagnostic:
- Ran under Bun, not the browser. Same React-PDF engine and Yoga layout. WOFF registration succeeded.
- `designPreset` passed as `{}` (library default). Custom presets change colour and font choice, not geometry.
- `footerText` empty, so Industry/Zinc footers were skipped. A tenant footer adds ≈ 10 pt; Industry still has headroom.
- No logo asset exists, so the logo path is untested.
- Overflow magnitudes are estimates. Page counts and content checks are exact.

## 5. Recommendation for the Round 2 page architecture

**One page is realistic for this fixture.** Production Industry proves it: 1 page, A4, all fields, all narratives, 18/18 materials, complete acknowledgement, spare space at the foot.

Round 2 prototypes A/B/C do not fit today. Measured total content is ≈ 506 mm (Concept A, both pages) against a 297 mm sheet. The gap comes from design metrics, not from the data:

| Metric | Round 2 (current) | Industry (tight, proven) |
|---|---|---|
| Page margins | 9–13 mm | ≈ 2.1 mm (6 pt) |
| Body text | 8.1–9 pt | 6.3–7.2 pt |
| Narrative line-height | 1.38–1.44 | 1.1 |
| Section headers | bars + rules + 2–4 mm gaps (≈ 8–10 mm each) | single 6.8 pt ruled title (≈ 4 mm) |
| Materials | full-width table, ≈ 135 mm measured | 3 × 6 columns, ≈ 55 mm |
| Readings | 6 stacked label/value rows (≈ 35–40 mm) | one strip row (≈ 17 mm) |
| Document control | 6-row vertical table | compact row inside header |

Applying the ranked changes in section 7 brings Concept A to ≈ 266 mm of content, which fits one A4 page with margin. The honest decision for Round 2:

- **Target one page at Industry-class density** (7.2–8 pt body, 4–6 mm margins, multi-column materials, single-strip readings, ruled single-line section titles). This matches the proven production precedent.
- **Keep the deliberate two-page design** only if a concept's identity requires ≥ 8.5 pt body text or 10 mm+ margins. The current two-page prototypes remain valid in that case.
- Do not copy three defects found in production: Minimal's dropped engineer remarks, Minimal's hardcoded `Page 01 of 01`, and Zinc's orphaned signature row.

## 6. Materials arrangement: options and trade-offs

Arrangement heights for the actual 18 names (row ≈ 16.4 pt at 8 pt text with 3 pt vertical padding; wrap ≈ +10.4 pt per extra line; block container +16 pt):

| Arrangement | Column width per group | Rows tall | Observed/estimated wraps | Height | Qty association |
|---|---|---|---|---|---|
| Full-width table, No./Item/Qty/Unit (Round 2 baseline) | 188 mm | 18 | none | ≈ 110 mm (135 mm measured in Concept A with its header and padding) | best: aligned columns |
| 2 groups × 9, inline `item │ qty unit` (production minimal/zinc) | ≈ 97 mm | 9 | 0 observed in renders | ≈ 58 mm | qty on same line, not aligned |
| 3 groups × 6, inline (production industry) | ≈ 65 mm | 6 | 4 observed (items 15, 16, 17, 18) | ≈ 55 mm | qty on same line, not aligned |
| 3 groups × 6, Item/Qty/Unit sub-columns | item ≈ 45 mm | 6 | more: most names exceed 29 chars | ≈ 49–55 mm | aligned columns |
| 2 groups × 9, Item/Qty/Unit sub-columns | item ≈ 77 mm | 9 | ~4 (items 15, 16, 17, 18) | ≈ 59 mm | aligned columns |

Conclusions:
- Any multi-column block saves ≈ 55–80 mm over the full-width table. This is the single largest saving available.
- For this fixture, 3 × 6 and 2 × 9 land within ≈ 5 mm of each other. 3 × 6 wins on height; 2 × 9 wins on wrap count.
- Sub-columns keep quantities aligned but narrow the item column, which adds wraps. Inline `item │ qty unit` keeps qty adjacent to its item without wraps.
- Reading order stays correct in both block layouts because row numbers continue across groups (1–6 | 7–12 | 13–18).
- **Recommendation:** start with the production-style 3 × 6 inline block (proven one-page result on this exact fixture). Fall back to 2 × 9 with Item/Qty/Unit sub-columns if quantity alignment matters more than ≈ 5 mm. Keep the full-width table only when the page budget has slack.

Readings grouping: the single 6-cell strip is the most efficient verified option (≈ 17 mm with the long temperature and pressure strings wrapping to 2–3 lines inside their cells). All six labels survive. A 3 × 2 grid would cost roughly double. Do not merge values into combined cells: that would lose labels or change meaning.

## 7. Design changes to test next, ranked by benefit

1. **Multi-column materials block** (3 × 6 inline): saves ≈ 70–80 mm. Highest benefit, matches production.
2. **Section-header diet** (replace bars + gaps with a single ruled 7 pt title, 1–2 mm margins): saves ≈ 30–40 mm across ~9 sections.
3. **Narrative line-height 1.44 → 1.25–1.3 and body 8.8/8.4 → 7.8–8 pt**: saves ≈ 25–45 mm. Verify legibility at review.
4. **Readings → one horizontal strip** inside the equipment/identity block: saves ≈ 15–25 mm, keeps all labels.
5. **Page margins 9–13 mm → 4–6 mm**: saves ≈ 10–15 mm and widens text columns (fewer wrapped lines).
6. **Document control → horizontal strip in the header** (CSR number, dates, call type, basis, system status as label/value cells): saves ≈ 15–25 mm versus a vertical table; every field still visible.
7. **Narrative 2-up pairing** (Problem | Defects, Service | Remarks): saves ≈ 15–25 mm where blocks are stacked. Concept A already uses a 2 × 2 grid.
8. **Merge status + service window into the header/docket row**: saves ≈ 10 mm.
9. **Signature areas sized with `minHeight` (grow-only)** instead of tall fixed boxes: saves ≈ 5–10 mm with no clipping risk.
10. **Keep visible `not supplied` markers** for missing source data (Round 2 honesty rule). Cost is near zero when markers sit inside normal value cells. Do not adopt production's silent omission.

## Verification

- `git status` recorded before and after. Investigation changed no tracked file. New files: this report plus artefacts under `.tmp-csr-verify2/`.
- Diagnostic render: 3 PDFs, exact A4 (595.28 × 841.89 pt), page counts 1 / 2 / 2.
- Content checks: 18/18 materials ordered in all three; narratives 4/4 Industry, 4/4 Zinc, 3/4 Minimal; readings 6/6; dates and `DOWN` present in all three.
- Visual checks: rasterised page images inspected for all pages. No clipping or overlap found.
- `bun run build`: not run (hardware policy).
- `bun run typecheck`, `bun run lint`, `bun run audit:load`: not run (prohibited for this read-only task).
- `bun run test`: not run (no test changed).
- supabase db push: not applicable (no SQL changed).

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- Screenshot capture through the preview window failed (window was covered). Rasterised PDF page images were used instead. Visual inspection was completed on those rasters.
- Overflow magnitudes for Minimal and Zinc are estimates. Page counts are exact.
- The browser PDF path (`pdf().toBlob()` in the client bundle) was not executed; the same React-PDF document model was rendered through `renderToBuffer`.
- The `> 24 items → comma-paragraph` materials fallback is verified by code reading only.
- Round 2's explicit `not supplied` markers cost slightly more space than production's omission behaviour.

## Deferred work

- Round 2 prototype changes. Spacing corrections were halted by request and remain paused.
- Applying the ranked changes to Concepts A/B/C.
- Choosing between one-page and two-page targets per concept.
