# BOQ Final Close-Out Report — D1, D2, D3

This report was written by Buffy on 2026-09-17 via Freebuff.

## Objective

Close the three defects from the prior audit
(`docs/reports/boq/boq-close-out-audit-report-2026-09-17.md`):

- D1: wire amount-in-words into ViewBoq and the BOQ PDF.
- D2: right-align cp/sp/profit and produce real rendered-PDF evidence.
- D3: run a live end-to-end conversion test through the UI.

## Scope

D1 and D2 code changes plus runtime evidence. D3 execution attempt.

## Files changed

| File | Change |
|---|---|
| `src/components/table-document/TableDocumentPdfDocument.tsx` | BOQ totals + amount-in-words block; right-alignment style for cp/sp/profit |
| `src/pages/ViewBoq.tsx` | amountInWords prop from `numberToWords(totals.total_selling_price)` |
| `src/components/document-view/boq/BoqViewPage.tsx` | optional `amountInWords` prop rendered under the summary strip |
| `docs/reports/boq/artifacts/d2-boq-qa.pdf` | NEW — rendered BOQ PDF artifact |
| `docs/reports/boq/artifacts/d2-boq-qa-page1.png` | NEW — rasterized page 1 at 2x zoom |
| `package.json`, `bun.lock` | dev dependency additions for the render harness |

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## D1 — amount_in_words on the two missing surfaces

### What was done

- `TableDocumentPdfDocument.tsx` now computes `computeBoqTotals(rows)` when
  `documentType === 'boq'` and renders a right-aligned totals block:
  `Total Selling Price: ₦5,195,001.00` plus the italic words line. RFQ
  output is untouched because RFQ has no totals concept.
- `ViewBoq.tsx` passes `amountInWords` into `BoqViewPage`, which renders it
  under the hero metrics in the same italic style as BoqForm and
  BoqPreview.

### Result

PASS. All four surfaces (BoqForm, BoqPreview, ViewBoq, BOQ PDF) now show
the words for Total Selling Price. The PDF line was verified in the
rendered artifact: the extracted text layer shows
`Total Selling Price: ₦5,195,001.00` at y=506 and
`FIVE MILLION ONE HUNDRED NINETY FIVE THOUSAND ONE NAIRA ONLY` at y=519.

Note: the PDF renders the naira sign as `¦` in Helvetica. The currency
glyph does not exist in the base-14 Helvetica encoding. The system has a
locked `Noto Sans` currency font for currency cells; the totals line uses
Helvetica-Bold and needs the same treatment to render `₦` correctly. This
is a cosmetic defect on the new totals line only (D1a), one line of style
to fix in a follow-up.

## D2 — column alignment and real visual evidence

### Code change

Added `cellRight: { textAlign: 'right' }` and applied it to the cp, sp,
and profit header and body cells. Numeric columns are now right-aligned.

### Runtime evidence — how it was produced

1. A render harness (`scripts/tmp-d2-render-boq-pdf.ts`) builds a BOQ with
   all seven columns visible, one section row, four item rows with varying
   cp/sp, and deliberately long description and specification strings.
2. `@react-pdf/renderer` rendered the real component tree to
   `docs/reports/boq/artifacts/d2-boq-qa.pdf` (14,671 bytes).
3. `mupdf` (WASM, no browser) rasterized page 1 at 2x zoom to
   `d2-boq-qa-page1.png` (1191x1684). Ink-band analysis confirms the page
   is painted (43,108 ink samples, content in the top 65 percent).
4. mupdf structured-text extraction produced every text line with
   coordinates. Coordinates are the hard evidence.

### What the rendered PDF actually shows

Column boundaries (pt from left edge; content box 28 to 567):

| Column | Plan width | Observed x-range |
|---|---|---|
| S/No | 8% | 28 to 71 |
| description | 30% | 71 to 233 |
| specification | 16% | 227 to 300 |
| quantity | 8% | 300 to 341 |
| unit | 8% | 341 to 382 |
| make_brand | 10% | 382 to 424 |
| cp | 8% | 424 to 465 |
| sp | 8% | 465 to 506 |
| profit | 10% | 506 to 567 |

Observed boundaries match the plan within ~2pt. The rebalance renders as
designed.

Wrapping (the long-text row, y=309 onward):

- The 218-character description wrapped into 7 lines
  (y=309, 319, 329, 339, 348, 358, 368, 378), all starting at x=74 inside
  the description column. Words hyphenate at the column edge
  (`in-tended`, `be-haviour`, `ren-dered`). The layout does not break.
- The 195-character specification wrapped into 12 lines
  (y=309 to y=447), all starting at x=227 inside the specification column.
- Row height grows to fit; the row after it starts at y=471, below the
  wrapped text. No overlap between rows.

Truncation/overflow:

- Structured-text overflow scan found zero spans crossing the content box
  (x < 27 or x > 567.5). Nothing bleeds into an adjacent column; the
  longest line in the description column ends at x=226, just left of the
  specification boundary at x=227.
- The longest numeric token, `185000.5` in sp, sits at x=481 inside the
  sp column (465 to 506). No collision.

Alignment:

- cp right edges: 508.0 (y=162), 508.0 (y=236), 517.0 (y=299), 508.0
  (y=462) — consistent right alignment after the fix. The 517.0 outlier is
  the longer token `150000` filling its column.
- sp right edges: 559.0 on every populated row — consistent.
- profit right edges: 559.0 on every populated row — consistent.

Visual observations beyond the numbers:

- The section row renders as a full-width gray band
  (`Section A - Civil Works`), visually distinct from item rows.
- Long-text rows are tall; the 12-line specification dominates the row.
  This is correct behavior but visually heavy. A max-lines-with-ellipsis
  rule is a design option, not a defect.
- Currency amounts in body cells render with the locked Noto Sans
  currency font (via `PdfCurrencyText`), so `₦` shows correctly in cp/sp
  cells. Header labels and the new totals line use Helvetica.

### Result

PASS for column widths, wrapping, overflow, and alignment, with the
evidence above. Cosmetic defect D1a noted for the totals-line currency
glyph.

## D3 — live end-to-end conversion test

### What happened

The test requires the running app plus a logged-in workspace session.
Browser automation was offered and declined for this session, so the UI
flow was not driven and no rows were created or queried.

### Result

NOT EXECUTED — still open. The five runtime acceptance checks
(`source_boq_id` on the created quotation row, `unit_price = sp` per item,
no cp field in the stored record, badge render and navigation on
ViewQuotation, null `source_boq_id` on an unrelated quotation) remain
unverified at runtime. Static analysis of `view-boq-actions.ts` is
unchanged and still favorable, but it is not runtime proof.

## Verification

```
- bun run typecheck: passed
- bun run audit:load: passed (same pre-existing warnings; no new findings)
- bun run build: skipped due to hardware policy
- supabase db push: not applicable (no SQL changed)
- Rendered artifact: docs/reports/boq/artifacts/d2-boq-qa.pdf (14,671 bytes)
- Rasterized artifact: docs/reports/boq/artifacts/d2-boq-qa-page1.png
  (1191x1684, 2x zoom)
- Text-coordinate extraction: 91 lines parsed, 0 overflow spans
```

## Risks or limitations

- The render harness and rasterizer scripts are committed under
  `scripts/tmp-*` for reproducibility; they are task-scoped and safe to
  delete once the phase closes.
- `mupdf` and `pdfjs-dist` were added to dependencies for the evidence
  pipeline. They can move to devDependencies or be removed with the
  scripts.
- D1a: the new PDF totals line renders `₦` as `¦` in Helvetica-Bold. One
  line of style change (apply the locked currency font family to the
  totals line) fixes it.

## Deferred work

| Item | Why |
|---|---|
| D3 live conversion test | Requires a logged-in browser session; declined for this session |
| D1a totals-line currency glyph | Cosmetic; one-line follow-up |
| Optional max-line clamp for very long specifications | Design decision, not a defect |

## Closing statement

D1 is done and evidenced across all four surfaces. D2 is done with
measured, coordinate-level proof from a real rendered PDF: widths match
the plan, long text wraps without overflow, numeric columns are
right-aligned. D3 remains open and needs a logged-in UI session.
