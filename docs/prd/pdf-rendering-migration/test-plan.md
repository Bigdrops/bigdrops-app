# 04 — Test Plan & Quality Assurance Strategy (PDF Rendering Migration)

- **Status:** APPROVED TEST PLAN & FROZEN DOCUMENTATION BASELINE (Ready for M1 Planning)
- **Architecture:** Forme Engine (`@formepdf/react` & `@formepdf/core` v0.20.1) + `pdfcn` Design System
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Last Updated:** 2026-10-30

---

## 1. Test Philosophy & Scope

This test plan defines the verification strategy to ensure that documents rendered by Forme maintain complete visual fidelity, mathematical accuracy, and superior pagination compared to the legacy React-PDF implementation.

Verification uses a representative corpus of real production documents from `docs/templates/ref-invquo/` alongside targeted synthetic stress documents. No mock approximations are accepted as primary evidence.

> [!NOTE]
> Measurements reported in investigation benchmarks (e.g. 113.73 pt, 75.25 pt, 58 pt vs 72 pt) are observed empirical evidence on the reference files. They serve as diagnostic test targets rather than universal physical laws.

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
- **Objective:** Verify that documents use available page height efficiently, never break prematurely, and paginate cleanly across all document profiles before compaction is attempted.
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

### 🧪 TS-2: Typography & Character Encoding
- **Objective:** Verify that technical symbols, currency symbols, and special characters render accurately without corruption.
- **Test Cases:**
  - [ ] **TC-2.1 (Double-Prime on `SASQUO-000428`):** Render `SASQUO-000428`. Extract text from output PDF using MuPDF/pdftotext. Verify descriptions contain `2"`, `3"`, `4"` or `2″`, `3″`, `4″`. Confirm digits `23`, `33`, `43` do not appear.
  - [ ] **TC-2.2 (Nigerian Naira Symbol):** Render an invoice containing amounts formatted in Nigerian Naira. Verify the `₦` glyph renders correctly in header, table cells, and totals.
  - [ ] **TC-2.3 (Engineering Symbols):** Test line items containing squared (`m²`), multiplication (`3 × 4`), degree (`45°`), and tolerance (`±0.5`). Verify all glyphs render cleanly.
  - [ ] **TC-2.4 (Scoped Emoji Fallback):** Inject automotive emoji (`🛞`, `🚗`) into line item descriptions. Verify output PDF generates without syntax errors. Confirm surrounding text is completely preserved. Confirm supported icons render cleanly or unmapped emoji strip safely without crashing.

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
  - [ ] **TC-4.2 (Legibility-First Candidate Floor Enforcement):** Confirm font size never scales below candidate floor of **7 pt** and table row padding never scales below candidate floor of **2 pt**. Conduct visual readability inspection on printed/screen output.
  - [ ] **TC-4.3 (No Overlapping Elements):** Measure bounding boxes via `renderDocumentWithLayout`. Assert zero overlap between adjacent views.
  - [ ] **TC-4.4 (Graceful Fallback on `DOC-OVERFLOW-25`):** Run Force 1 Page mode on a 25-item document. Verify the engine detects the deficit exceeds candidate threshold (120 pt), aborts single-page compaction, and outputs a clean 2-page document with an in-app notice. Assert zero content was dropped to force fitting.

---

### 🧪 TS-5: Interactive Image Hyperlinks & Logo Aspect Ratios
- **Objective:** Verify interactive hyperlinks embedded over images and custom coordinate overlays, and verify logo aspect ratio preservation.
- **Test Cases:**
  - [ ] **TC-5.1 (Direct Image Link):** Render an invoice with a clickable header logo (`<Image href="https://example.com">`). Inspect PDF objects using MuPDF. Assert `/Annots` contains `/Subtype /Link` with `/URI (https://example.com)`.
  - [ ] **TC-5.2 (Coordinate Overlay Link):** Place an absolute `<View href="https://verify.bourxe.com">` over a signature badge. Click the badge in Adobe Acrobat and Google Chrome PDF viewers. Assert browser navigates to the target URL.
  - [ ] **TC-5.3 (Coordinate Alignment):** Verify link annotation bounding box matches image dimensions exactly in both Portrait and Landscape orientations.
  - [ ] **TC-5.4 (Logo Aspect Ratio Preservation):** Test logos with varying width-to-height ratios ($1:1$, $3:1$, $1:3$). Confirm images preserve natural proportions via `objectFit: 'contain'` without horizontal or vertical stretching.

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

### 🧪 TS-8: Font Packaging & Offline Mobile Export
- **Objective:** Verify reliable font asset delivery across web and offline mobile environments.
- **Test Cases:**
  - [ ] **TC-8.1 (Static Asset Loading):** Verify static TTF fonts load cleanly from `public/fonts/` during browser export.
  - [ ] **TC-8.2 (Capacitor Mobile Offline Export):** Test client-side PDF export in an offline Capacitor Android/iOS container. Confirm fonts embed successfully without network access.
  - [ ] **TC-8.3 (Binary Fallback Verification):** If static asset delivery fails in offline mobile testing, verify base64/binary font bundling embeds identically.

---

### 🧪 TS-9: Forme API Empirical Verification Suite
- **Objective:** Validate runtime behavior of Forme APIs during Phase 1 & 2.
- **Test Cases:**
  - [ ] **TC-9.1 (Runtime Repeating Headers):** Test multi-page table with `<Row header>`. Verify header rows repeat in exported PDF byte stream.
  - [ ] **TC-9.2 (Runtime Layout Coordinates):** Call `renderDocumentWithLayout`. Assert returned AST contains valid `x, y, width, height` numbers for all pages.
  - [ ] **TC-9.3 (Runtime Dynamic Footer):** Render pages with varying footer heights. Confirm content container stops above footer without overlapping.

---

### 🧪 TS-10: Financial & Data Integrity
- **Objective:** Verify that rendering migration does not alter business values or financial calculations.
- **Test Cases:**
  - [ ] **TC-10.1 (Calculations Immutability):** Compare subtotal, VAT (7.5%), total, and balance due between legacy React-PDF output and Forme output for `SASQUO-000427`. Assert values match to 2 decimal places.
  - [ ] **TC-10.2 (Model Independence):** Verify rendering templates receive data solely through `PdfDocumentModel`. Assert zero Supabase client calls exist in rendering components.

---

### 🧪 TS-11: Verification & Resource Safeguards
- **Objective:** Ensure compliance with repository operational guardrails.
- **Test Cases:**
  - [ ] **TC-11.1 (Typecheck):** Execute `bun run audit:load` followed by `bun run typecheck`. Assert zero TypeScript compilation errors.
  - [ ] **TC-11.2 (Build Prohibition):** Confirm `bun run build` was **NOT** executed during development or testing.
  - [ ] **TC-11.3 (Git Working Tree):** Execute `git status`. Verify that only files designated in the PRD scope were modified.
