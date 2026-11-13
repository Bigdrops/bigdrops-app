# 04 — Test Plan & Quality Assurance Strategy (PDF Rendering Migration)

- **Status:** AUTHORITATIVE TEST PLAN & CERTIFICATION GATES
- **Architecture:** Forme Engine (`@formepdf/react` & `@formepdf/core` v0.20.1) + `pdfcn` Presentation Layer
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Scope:** Eight In-Scope Document Types. BOQ Excluded.

---

## 1. Test Philosophy & Scope

This test plan defines the verification strategy to ensure that documents rendered by Forme maintain complete visual fidelity, mathematical accuracy, and superior pagination compared to legacy React-PDF output.

Verification combines:
1. Real production benchmark documents (`SASQUO-000427`, `SASQUO-000428`, `SASQUO-430`).
2. Targeted synthetic stress documents.
3. Cross-platform runtime verification (Browser, Bun CLI tests, and Capacitor mobile WebViews).

---

## 2. Gate 1 Representative Document Suite

| Document Identifier | Source / Path | Characteristics & Test Target | Gate 1 Requirement |
| :--- | :--- | :--- | :--- |
| **`DOC-SHORT-01`** | Synthetic Short Invoice | 2 line items, simple header, standard footer. | Verify balanced spacing without artificial gaps or stretched margins on single page. |
| **`SASQUO-000427`** | `docs/templates/ref-invquo/SASQUO-000427 (1).pdf` | 13 line items (Atlas Copco compressor parts), closing block. | Primary natural pagination benchmark: must fit on **1 page naturally in Normal Mode** with calibrated columns and decoupled closing layout. |
| **`DOC-WRAP-DESC`** | Synthetic Technical Quote | 8 line items with extensive multi-line technical descriptions (3–6 lines per cell). | Verify clean intra-row wrapping, row height expansion, and no clipping across page breaks. |
| **`DOC-LARGE-TOTALS`** | Synthetic Commercial Invoice | 10 line items, discount breakdown, multi-tax rows, 3-account bank details block. | Verify adaptive closing layout: side-by-side if space permits, or clean stacking/continuation without empty pages. |
| **`SASQUO-430`** | `docs/templates/ref-invquo/SASQUO-430 (1).pdf` | 18 line items, extensive commercial terms, warranty notes. | Multi-page benchmark: verify natural pagination across pages, repeating table headers, and clean terms flow. |
| **`DOC-ATTACH-SIG`** | Synthetic Service Contract | 12 items, schedule attachments, dual signature block with company stamp. | Verify signature block integrity (`wrap={false}`) without forcing preceding sections onto another page. |
| **`DOC-MULTIPAGE-DIST`** | Synthetic 4-Page Quotation | 45 items with varying section lengths. | Verify stable multi-page distribution without unexpected page breaks or stranded headings. |
| **`SASQUO-000428`** | `docs/templates/ref-invquo/SASQUO-000428.pdf` | 6 line items with `2″`, `3″`, `4″` pipe dimensions. | Typography benchmark: verify double-prime symbols render cleanly without corrupting into digits `23`, `33`, `43`. |
| **`DOC-OVERFLOW-25`** | Synthetic Overflow Invoice | 25 line items (exceeds single page capacity). | Force 1 Page fallback benchmark: verify graceful fallback to clean 2-page document when uncompressible. |

---

## 3. Test Suites & Verification Criteria

### 🧪 TS-1: Natural Pagination & Gate 1 Suite (Normal Mode)
- **Objective:** Verify efficient space utilization, clean multi-page breaks, and adaptive closing flow before compaction is attempted.
- **Test Cases:**
  - [ ] **TC-1.1 (Space Utilization on `SASQUO-000427`):** Render `SASQUO-000427` in Normal mode. Confirm that with candidate column widths (Make $\ge 72\text{ pt}$) and decoupled closing layout, the complete document fits naturally onto **1 physical page**.
  - [ ] **TC-1.2 (Adaptive Closing Flow):** When vertical content height approaches the bottom page margin, confirm that Totals stay attached to line items while Bank Details adaptively stack or move to continuation pages without forcing an unnecessary blank page.
  - [ ] **TC-1.3 (Clean Table Row Pagination):** Render `SASQUO-430`. Confirm tables split cleanly between rows. No table row may be clipped or sliced horizontally across a page boundary. Zero content loss during row transitions.
  - [ ] **TC-1.4 (Oversized Table Row Handling):** Render a document containing an oversized table row whose description height exceeds available page height. Verify that the row does not clip, overlap, or omit content. Test natural fragmentation across the boundary or controlled virtual sub-row fallback.
  - [ ] **TC-1.5 (Repeating Table Headers):** Confirm table header (`<Row header>`) repeats at the top of Page 2 on `SASQUO-430` and all multi-page documents in the Gate 1 suite.
  - [ ] **TC-1.6 (Dynamic Footer Reservation):** Confirm `<Fixed position="footer">` dynamically reserves exact measured footer height. Confirm page styles contain no hardcoded defensive padding (`paddingBottom: 48`).
  - [ ] **TC-1.7 (Selective Keep-Together Rules):**
    - Confirm signature blocks use `wrap={false}` to prevent signatures from being severed across page breaks.
    - Confirm commercial terms, long notes, and equipment schedules fragment naturally across page breaks without forced blank areas.
    - Confirm section headings are kept with following text to prevent orphaned titles where practical.
  - [ ] **TC-1.8 (Gate 1 Suite Certification):** Execute all tests in `TS-1` across the complete 7-profile Gate 1 suite. Gate 1 passes only when 100% of documents paginate cleanly in Normal Mode.

---

### 🧪 TS-2: Typography & Read-Only Glyph Diagnostics
- **Objective:** Verify that technical symbols, currency symbols, and special characters render accurately without corruption, and confirm read-only diagnostics report missing characters without altering text.
- **Test Cases:**
  - [ ] **TC-2.1 (Double-Prime on `SASQUO-000428`):** Render `SASQUO-000428`. Extract text from output PDF using pdftotext/MuPDF. Verify descriptions contain `2"`, `3"`, `4"` or `2″`, `3″`, `4″`. Confirm digits `23`, `33`, `43` do not appear.
  - [ ] **TC-2.2 (Nigerian Naira Symbol):** Render an invoice containing amounts formatted in Nigerian Naira. Verify the `₦` glyph renders correctly in header, table cells, and totals.
  - [ ] **TC-2.3 (Engineering Symbols):** Test line items containing squared (`m²`), multiplication (`3 × 4`), degree (`45°`), and tolerance (`±0.5`). Verify all glyphs render cleanly.
  - [ ] **TC-2.4 (Read-Only Glyph Diagnostics):** Test input strings containing unmapped glyphs. Confirm diagnostic service emits structured warning containing missing code points. Assert original user text in rendered PDF remains uncorrupted and unmutated.
  - [ ] **TC-2.5 (Scoped Emoji Fallback):** Inject automotive emoji (`🛞`, `🚗`) into line item descriptions. Verify output PDF generates without syntax errors. Confirm surrounding text is completely preserved. Confirm supported icons render cleanly or unmapped emoji strip safely without crashing.

---

### 🧪 TS-3: Compact Presentation Mode
- **Objective:** Verify that Compact mode systematically reduces spacing across all candidate styling tokens.
- **Test Cases:**
  - [ ] **TC-3.1 (Candidate Token Application):** Inspect rendered AST using Forme `renderDocumentWithLayout`. Confirm:
    - Document margin $= 24\text{ pt}$ (candidate target, reduced from 36 pt).
    - Table row padding $= 3\text{ pt}$ (candidate target, reduced from 6 pt).
    - Body font size $= 8\text{ pt}$ (candidate target, reduced from 9 pt).
    - Party card vertical padding $= 6\text{ pt}$ (candidate target, reduced from 12 pt).
  - [ ] **TC-3.2 (Content Completeness & Legibility):** Confirm zero line items, notes, VAT entries, bank details, or signatures are omitted in Compact mode. Confirm text remains comfortably readable.

---

### 🧪 TS-4: Force 1 Page Mode
- **Objective:** Verify that Force 1 Page mode compresses qualifying documents to single-page output while prioritizing commercial legibility.
- **Test Cases:**
  - [ ] **TC-4.1 (Borderline Document Fit):** Test a 14-item document that slightly overflows Page 1. Select "Force 1 Page". Verify output is exactly **1 physical page**.
  - [ ] **TC-4.2 (Legibility-First Floor Enforcement):** Confirm font size never scales below candidate floor of **7 pt** and table row padding never scales below candidate floor of **2 pt**. Conduct visual readability inspection on printed/screen output.
  - [ ] **TC-4.3 (No Overlapping Elements):** Measure bounding boxes via `renderDocumentWithLayout`. Assert zero overlap between adjacent views.
  - [ ] **TC-4.4 (Graceful Fallback on `DOC-OVERFLOW-25`):** Run Force 1 Page mode on a 25-item document. Verify the engine detects the deficit exceeds candidate threshold (120 pt), aborts single-page compaction, and outputs a clean 2-page document with an in-app notice. Assert zero content was dropped to force fitting.

---

### 🧪 TS-5: Interactive Hyperlinks & Image Geometry
- **Objective:** Verify interactive hyperlinks embedded over images and custom coordinate overlays, and verify explicit image sizing in Forme.
- **Test Cases:**
  - [ ] **TC-5.1 (Direct Image Link):** Render an invoice with a clickable header logo (`<Image href="https://example.com">`). Inspect PDF objects using MuPDF. Assert `/Annots` contains `/Subtype /Link` with `/URI (https://example.com)`.
  - [ ] **TC-5.2 (Coordinate Overlay Link):** Place an absolute `<View href="https://verify.bourxe.com">` over a signature badge. Click the badge in Adobe Acrobat and Google Chrome PDF viewers. Assert browser navigates to the target URL.
  - [ ] **TC-5.3 (Coordinate Alignment):** Verify link annotation bounding box matches image dimensions exactly in both Portrait and Landscape orientations.
  - [ ] **TC-5.4 (Forme Explicit Sizing):** Confirm all `<Image>` primitives specify explicit numeric `width` and `height` props. Confirm zero usage of invalid `objectFit` style properties.

---

### 🧪 TS-6: Landscape Orientation
- **Objective:** Verify that A4 Landscape generates correct geometric layouts from first principles.
- **Test Cases:**
  - [ ] **TC-6.1 (Page Dimensions):** Inspect PDF mediabox. Assert dimensions are exactly $[0, 0, 841.89, 595.28]$ (A4 Landscape points).
  - [ ] **TC-6.2 (Table Expansion):** Verify table width expands to consume full landscape printable width ($841.89 - 2 \times 36 = 769.89\text{ pt}$).
  - [ ] **TC-6.3 (Header and Footer):** Verify header and footer span full landscape width. Confirm page numbering shows `Page 1 of 1`.

---

### 🧪 TS-7: 5-Step Rich-Text Conversion
- **Objective:** Verify safe rendering of rich-text HTML formatted strings across platforms.
- **Test Cases:**
  - [ ] **TC-7.1 (Inline Tags):** Render descriptions containing `<b>bold</b>`, `<strong>strong</strong>`, `<i>italic</i>`, and `<u>underline</u>`. Verify text renders with proper font weights/styles without displaying raw HTML tags.
  - [ ] **TC-7.2 (Block Lists & Paragraphs):** Render notes containing `<ul><li>Item 1</li><li>Item 2</li></ul>` and `<p>Paragraph</p>`. Verify structured list and paragraph rendering.
  - [ ] **TC-7.3 (Sanitization & Fallback):** Inject arbitrary or malformed HTML (`<script>`, `<div style="...">`, unclosed tags). Confirm DOMPurify strips unsafe tags and unmapped structures fall back gracefully to plain text without crashing.
  - [ ] **TC-7.4 (Mobile WebView Compatibility):** Confirm rich-text sanitization and AST conversion execute successfully in simulated mobile WebView environments.

---

### 🧪 TS-8: Font Packaging & Dual-Runtime / Mobile Offline Asset Resolution
- **Objective:** Verify reliable font asset delivery across web, Bun CLI, and offline mobile environments.
- **Test Cases:**
  - [ ] **TC-8.1 (Bun CLI Filesystem Resolution):** Verify `ensureFormeFontFamily` resolves filesystem paths (`public/fonts/*.ttf`) via `readFile` in Bun CLI tests.
  - [ ] **TC-8.2 (Browser Public URL Resolution):** Verify static TTF fonts load cleanly from `/fonts/*.ttf` via `fetch()` in browser runtime.
  - [ ] **TC-8.3 (Capacitor Mobile Offline Export):** Test client-side PDF export in an offline Capacitor Android/iOS container. Confirm fonts embed successfully without network access under `base: './'`.
  - [ ] **TC-8.4 (Observable Font Fallback):** Request an unregistered font name. Assert status is `WARN_UNREGISTERED_FAMILY` and font visibly falls back to standard `Helvetica`.

---

### 🧪 TS-9: Forme API Empirical Verification Suite
- **Objective:** Validate runtime behavior of Forme APIs during Phase 1 & 2.
- **Test Cases:**
  - [ ] **TC-9.1 (Runtime Repeating Headers):** Test multi-page table with `<Row header>`. Verify header rows repeat in exported PDF byte stream.
  - [ ] **TC-9.2 (Runtime Layout Coordinates):** Call `renderDocumentWithLayout`. Assert returned AST contains valid `x, y, width, height` numbers for all pages.
  - [ ] **TC-9.3 (Runtime Dynamic Footer):** Render pages with varying footer heights. Confirm content container stops above footer without overlapping.

---

### 🧪 TS-10: Commercial Group Regression & Supplier-Facing PO Correctness
- **Objective:** Verify that Invoice, Quotation, and Purchase Order share commercial infrastructure while preserving distinct layouts, fields, and calculations.
- **Test Cases:**
  - [ ] **TC-10.1 (Invoice AR & Bank Details):** Verify Invoice renders client "Bill To", Receiving Bank Details, VAT (7.5%), WHT deduction, Due Date, and Balance Due.
  - [ ] **TC-10.2 (Quotation Pipeline & Terms):** Verify Quotation renders client "Bill To", Validity Period, commercial terms, and client acceptance block.
  - [ ] **TC-10.3 (PO Supplier-Facing AP Correctness):**
    - Verify PO header displays "PURCHASE ORDER" and Buyer as issuer.
    - Verify counterparty displays **Order From · Supplier / Vendor**.
    - Verify table column displays **Unit Cost**, not Unit Price.
    - Verify Receiving Bank Details are hidden.
    - Verify Withholding Tax (WHT) deduction is not applied.
    - Verify Buyer purchasing officer signature blocks render cleanly.
  - [ ] **TC-10.4 (Preservation of Existing PO Templates):** Confirm PO Forme template uses PO-specific layout and does not force an invoice design.

---

### 🧪 TS-11: Specialized Document Family Certification
- **Objective:** Certify remaining document families against their specific functional requirements.
- **Test Cases:**
  - [ ] **TC-11.1 (CPS Font Fix & Cost Schedule):** Render CPS document in Forme. Extract fonts from PDF. Confirm text renders in `Inter` (or selected family) and does NOT fall back to `Helvetica`. Verify dense cost breakdown schedules render accurately.
  - [ ] **TC-11.2 (RFQ Procurement Unpriced Semantics):** Render RFQ. Confirm table columns show specifications, quantities, and units. Assert pricing, tax, and total columns are absent.
  - [ ] **TC-11.3 (Waybill Logistics & Signatures):** Render Waybill. Confirm goods condition status, vehicle number, and transport mode render cleanly. Confirm signature blocks support `Caveat` script font or blank completion lines.
  - [ ] **TC-11.4 (Receipt Proof of Payment):** Render Receipt. Confirm issuer, payer, payment method, transaction reference, and amount in words render cleanly. Confirm strict financial immutability.
  - [ ] **TC-11.5 (CSR Multi-Orientation & Readings):** Render CSR Portrait Reference (`Archivo Black` headings) and Blueprint Landscape. Confirm 6 operational reading channels and parts replacement schedules render accurately.

---

### 🧪 TS-12: PDF Delivery, Persistence & Diagnostic Telemetry
- **Objective:** Verify document dispatch through `CompositePdfDelivery`.
- **Test Cases:**
  - [ ] **TC-12.1 (Composite Dispatch):** Export documents across all 8 families. Confirm PDF bytes route through `CompositePdfDelivery`.
  - [ ] **TC-12.2 (Media Failure Graceful Fallback):** Simulate remote logo fetch failure (CORS/offline). Confirm `mediaResolver` returns `null` without throwing, and document outputs clean text branding.
  - [ ] **TC-12.3 (Diagnostic Logging Privacy):** Confirm diagnostic telemetry captures error codes without logging confidential customer pricing or contractual text.

---

### 🧪 TS-13: Verification & Resource Safeguards
- **Objective:** Ensure compliance with repository operational guardrails.
- **Test Cases:**
  - [ ] **TC-13.1 (Static Typecheck Baseline):** Execute `bun run audit:load` followed by `bun run typecheck`. Assert zero TypeScript compilation errors.
  - [ ] **TC-13.2 (Build Prohibition):** Confirm `bun run build` was **NOT** executed during development or testing.
  - [ ] **TC-13.3 (Git Working Tree):** Execute `git status`. Verify that only files designated in the PRD scope were modified.

---

## 14. Current Status (2026-11-12) — Forme Migration Test Evidence

Evidence-label convention: **REPORTED** = test pass/fail from the migration sessions (not re-run in this documentation task) · **HISTORICAL** = pre-existing failure documented in the migration work.

### 14.1 Suites run during the migration passes (REPORTED)

| Suite | Result | Notes |
| :--- | :--- | :--- |
| `src/tests/pdf/csrFormeTemplates.test.ts` (CSR Forme, added in CSR migration) | 10/10 pass | All five templates render; legacy `3`/`6`/`8` aliases resolve; unsupported templates rejected. |
| `src/tests/pdf/waybillFormeTemplates.test.ts` | 13/13 pass | Includes byte-level `%PDF` assertions. |
| `src/tests/pdf/receiptFormeDocument.test.ts` | 4/4 pass | Reported. |
| `src/tests/pdf/rfqFormeTemplates.test.ts` | 10/10 pass | Reported. |
| Project Documents Forme suite | 3/3 pass | Reported. |
| `src/tests/critical/pdfcnMasterResolver.test.js` | 10/10 after CSR-pass expectation update | `isPdfcnCsrTemplate('8'/'3'/'6')` flipped to `true` (they are Forme). |
| `src/tests/csr/pdfTemplateLayout.test.js` | 2 historical failures at HEAD | `formatCommaMaterialsText` (`×` output) and `resolveMaterialColumnBlocks` (row ceiling); test import updated to `src/components/csr/layoutModel.ts`. |
| `src/tests/csr/csrRenderModel.test.js` | 5 historical failures at HEAD | By design (`resolveCallTypeDisplay` returns empty for WARRANTY/PAID SERVICE/AMC). |
| `src/tests/pdf/forme*Template.test.ts` (Architectural, Executive, Heritage) | 3 pre-existing TypeScript errors at HEAD | `Record<string, unknown>` spread, unchanged by the CSR migration. |

### 14.2 Environment notes
- Plain `node --test` cannot load `.tsx` files; Forme-focused suites run under `bun test` (e.g., `bun test src/tests/pdf/csrFormeTemplates.test.ts`).
- The purge task of 2026-11-12 re-ran the suites post-removal: `bun test src/tests/pdf` — 184 pass, 8 fail; every failure is in a file untouched by the purge and pre-existing at HEAD. Critical commercial/CSR/font/routing suites — 73 pass, 0 fail. Forme family suites (CSR/Waybill/RFQ/Receipt) — 37 pass, 0 fail; Project Documents — 3 pass, 0 fail. `bun run typecheck` — only the three pre-existing HEAD errors (`forme*Template.test.ts`, TS2698).
- `pdfCurrency.test.js` now asserts only on active implementations (`industryAdapter.ts`, `formatters/pdfCurrency.ts`, `pdfSharedFonts.ts`, `projectDocuments.ts`); passes 2/2.

### 14.3 Certification gap
No family has closed the suites above as **certified**: TS-1 (Gate 1 suite), TS-6 (landscape), TS-10/TS-11 (family suites) and TS-12 (delivery) remain open for every family. Treat all suite results above as *migration evidence*, not as gates passed.
