# Industrial Forme Commercial Template — Consolidated Correction Report

Date: 2026-11-01
Template: `industrial`
Renderer: `IndustrialFormeDocument`
Baseline: commit `646bdc3b` (starting HEAD `992d24af`)

## 1. Purpose

This report records one consolidated correction pass on the Industrial Forme template for invoices and quotations. The pass keeps the graphite, steel and orange visual direction.

## 2. Result

The template now renders only supplied data. It no longer adds currency, payment terms, project references, signature areas or document-control panels that the source model does not provide. Table geometry, column allocation, glyph coverage, settings and signature sizing are corrected. The targeted type check, lint and rendered-PDF tests pass.

## 3. Files changed

- `src/components/pdf/forme/IndustrialFormeDocument.tsx` — template corrections.
- `src/components/pdf/forme/industrialLayout.ts` — new module for column allocation and group-label parsing.
- `src/components/pdf/forme/glyphs.tsx` — new per-glyph font run helper.
- `src/components/pdf/forme/fonts.ts` — registers the internal Greek glyph subset.
- `src/components/pdf/index.ts` — route resolver returns `industrial-forme` for the `industrial` template.
- `src/components/pdf/industryAdapter.ts` — adds the `currency` field from the document identity.
- `src/components/pdf/engine/group.ts` — prefers the supplied `groupLabel`.
- `public/fonts/NotoSansGreek-Regular.ttf` — new OFL glyph subset for Ohm.
- `src/domain/quotation/amountInWords.ts` — new resolver for quotation amount in words.
- `src/domain/quotation/previewModel.ts` — exposes `previewAmountInWords`.
- `src/domain/quotation/pdfDownloadHandler.ts` — reads the resolved words and no longer sets a fixed currency.
- `src/tests/pdf/formeIndustrialTemplate.test.ts` — expanded rendered-PDF tests.
- `src/tests/pdf/dualIndustryRendererRouting.test.ts` — resolver coverage.
- `src/tests/quotation/quotationAmountInWords.test.ts` — resolver coverage.

## 4. Corrections

### 4.1 Data fidelity

- The Industrial template renders no currency code. The total callout shows the amount only. The `currency` field remains in the shared adapter for other renderers.
- Amount in words comes from `data.totals.amountInWords`. The template does not calculate amounts.
- Missing values omit the field and its label. The template does not render `-`, `—`, `–`, `N/A`, `null`, `undefined` or `NaN`.
- Zero is valid data and still renders.
- The template source has no `Net 30` term, no fixed `NGN` code and no Document Control panel.
- The template does not render issuer `customInfo` entries such as the TIN. It does not add a bank fallback sentence.

### 4.2 Table geometry

- The content width is `pageWidth − 2 × margin`.
- The row budget is `contentWidth − 4 × 0.71 pt`. This budget accounts for the outer frame and the table border. The old code subtracted a wrapper that did not exist and made the table 22.68 pt short.
- Column widths always sum to the row budget, with 0.01 pt rounding.
- The description column keeps a 120 pt minimum when space allows.
- Optional columns (`make`, `install_rate`, `vat_rate`, `discount_rate`) shrink toward legible minimums before the description loses space.
- The test suite covers the widest supported combination and a narrow 420 pt budget.
- A rendered-PDF test confirms that no rectangle passes the right content edge in portrait or landscape.

### 4.3 Groups

- The group header is a solid accent band. It has a letter cell only when the supplied label contains a letter.
- `getGroupLabel` reads `groupLabel` before `groupName`. The Group A letter is no longer lost.
- The group footer always draws the orange top rule and the graphite bottom rule.
- A supplied group subtotal renders. A missing subtotal does not create an empty cell.

### 4.4 Typography and glyphs

- Fonts are Inter, Archivo Black, Caveat and Noto Sans.
- `glyphRuns()` moves `₦` to Noto Sans and `Ω` to the internal Greek Noto Sans subset.
- A rendered-PDF test confirms that `NotoSans` and `NotoSansGreek` are embedded and that no Helvetica or Arial font is used.

### 4.5 Settings

- `showTagline` controls the issuer tagline.
- `useCustomColors` and `accentColor` control the accent stripe and group band.
- `useCustomFonts`, `headerFont` and `bodyFont` control the display and body fonts.
- `layout.orientation` swaps the A4 page dimensions and the column budget.

### 4.6 Signature

- A signature area renders only when the model supplies an image or a name.
- The image is sized by height only. Forme keeps the aspect ratio.
- The image sits in a clipped fixed-height box.
- A test uses a 240 × 72 px signature image.

### 4.7 Compact mode and pagination

- Compact mode reduces padding, gaps and margins.
- A rendered-PDF test measures the lowest content baseline. Compact mode frees more than 20 pt of vertical space on the sample.
- The template does not use blanket `wrap={false}`.
- Multi-page output keeps A4 page geometry and the fixed footer.

### 4.8 Follow-up review corrections

- The `COMMERCIAL DOCUMENT` eyebrow does not render.
- Party reference codes (`PT-01`, `PT-02`), metadata codes (`M-01`), and the remaining panel codes (`SCH-01`, `PAY`, `N-01`, `T-01`) do not render.
- The total callout does not render `NGN` or any other currency code.
- A quotation PDF now shows amount in words. A stored `amount_in_words` value wins. When the stored value is empty, the resolver converts the authoritative `totalPayable` with the shared number-to-words formatter.
- The resolver returns an empty string when no total exists. It returns `ZERO NAIRA ONLY` only for a real zero total.
- The quotation download handler no longer sets `currency: "NGN"`.

### 4.9 Second review pass

- The amount in words sits in its own bordered panel below the total. It has an `AMOUNT IN WORDS` label and renders at 8.5 pt bold graphite (7.5 pt in compact mode).
- The `ISSUED BY` panel is removed. The client block uses the full width.
- The issuer TIN and other `customInfo` entries no longer render in the Industrial template.
- The `PARTY` and `ISSUER` header chips are removed.
- The company tagline stays in the company masthead under the address. `showTagline` still controls it.

## 5. Verification

Commands run:

- `bun run typecheck` — pass.
- `bunx eslint` on the changed component, new helper and new test files — pass for those files.
- `bun test src/tests/pdf/formeIndustrialTemplate.test.ts` — 19 pass, 0 fail.
- `bun test src/tests/pdf/dualIndustryRendererRouting.test.ts` — 5 pass, 0 fail.
- `bun test src/tests/quotation/quotationAmountInWords.test.ts` — 5 pass, 0 fail.
- `bun test src/tests/pdf/formeIndustryTemplate.test.ts` — 7 pass, 0 fail.
- `bun test src/tests/pdf/formeIndustryRefinement.test.ts` — 12 pass, 0 fail.

The tests render PDF bytes and inspect the page count, page size, link annotations, font resources, text baselines and drawn rectangles. The tests also inspect the serialized element tree for content, style, grouping, settings and glyph runs.

`bun run audit:load` was not run. This pass does not change database schemas, queries or data-layer logic. `bun run build` was not run.

## 6. Limitations

- **No purchase-order PDF contract.** `PdfDocumentKind` accepts only `invoice` and `quotation`. The template can render a purchase order only when a future model supplies that kind.
- **No signature intrinsic size.** `PdfSignature` has no width or height. The template can keep the aspect ratio and clip the height, but it cannot measure the source image.
- **No `.ind-run` continuation bar.** Forme has no per-page continuation marker for a table. The template cannot draw this bar.
- **No visual raster inspection.** The host has no PDF rasterizer. Verification uses PDF structure, content streams and serialized elements. It does not use page screenshots.
- **No end-to-end quotation download test.** The resolver and the rendered template are tested separately. The download handler needs browser or native file delivery, so it was not executed in this pass.

## 7. Pre-existing items not changed

- `src/tests/pdf/index.test.js` has two failures at HEAD. The test expects `150,000` and `text`; the committed adapter returns `₦ 150,000` and `rich-text`. This pass does not change that adapter code.
- `src/components/pdf/index.ts` and `src/tests/pdf/dualIndustryRendererRouting.test.ts` contain existing `@typescript-eslint/no-explicit-any` reports. This pass does not change those lines.
- `src/domain/quotation/previewModel.ts` and `src/domain/quotation/pdfDownloadHandler.ts` contain existing `@typescript-eslint/no-explicit-any` and unused-variable reports. This pass does not change those lines.
- `src/tests/invoice/totalsTruthPreview.test.js` has three failures at HEAD. The test expects the old `ViewInvoice` and `ViewQuotation` source strings. This pass does not change those pages.
