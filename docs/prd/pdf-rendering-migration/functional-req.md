# 01 — Functional Requirements & Problem Register (PDF Rendering Migration)

- **Status:** APPROVED SPECIFICATION & FROZEN DOCUMENTATION BASELINE (Ready for M1 Planning)
- **Architecture:** Forme Engine (`@formepdf/react` & `@formepdf/core` v0.20.1) + `pdfcn` Design System
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Last Updated:** 2026-10-30

---

## 1. Consolidated Problem Register (Investigation Evidence Baseline)

The requirements in this specification resolve verified defects identified during the 2026-10-30 investigations.

> [!NOTE]
> Specific measurements cited below (e.g. 113.73 pt, 75.25 pt, 58 pt vs 72 pt) are **empirical investigation evidence from specific observed reproduction documents**. They are diagnostic benchmarks rather than universal constants across all business documents.

| Defect ID | Problem Summary | Root Cause in Legacy Implementation | Measured Impact (Observed Baseline) |
| :--- | :--- | :--- | :--- |
| **PR-01** | **Indivisible Closing Block** | `IndustryTemplate.tsx` wraps Bank Details and Totals in an indivisible horizontal `<View wrap={false}>`. | Pushed an indivisible **113.73 pt** block to Page 2 in `SASQUO-000427` despite **75.25 pt** of free space on Page 1. Left Page 2 84% blank. |
| **PR-02** | **Table Column Geometry Inflation** | `table.ts` hardcodes `make: { pdfWidth: 58 }`. Net text width is only 46 pt after 12 pt padding. | Wrapped `"Atlas Copco"` onto 2 lines across all 13 rows in `SASQUO-000427`, inflating table height by **~131 pt**. |
| **PR-03** | **Defensive Page Padding** | React-PDF cannot dynamically measure fixed footers. Page styles force `paddingBottom: 48`. | Withheld **~30 pt** of valid printable content height on every page. |
| **PR-04** | **Incomplete Compact Wiring** | `compact.ts` declares 32 style overrides. `IndustryTemplate.tsx` only applied 3 (`page`, `header`, `customTitle`). | Saved only **20 pt** instead of available ~180 pt in `SASQUO-000427`. Compaction failed to prevent page breaks. |
| **PR-05** | **Double-Prime Character Corruption** | `safeText.ts` exempts `0x2000-0x206F`. Inter lacks `U+2033`. React-PDF fell back to standard Helvetica with WinAnsi 8-bit encoding. | Dimensions `2″`, `3″`, `4″` rendered as `23`, `33`, `43` in `SASQUO-000428.pdf`. *(WinAnsi modulo-256 truncation is a technically plausible suspected cause requiring empirical tracing).* |
| **PR-06** | **Naira & Special Symbol Deficiencies** | Standard PDF fonts lack the Nigerian Naira symbol (`₦`, `U+20A6`) and engineering symbols (`²`, `×`, `±`, `°`). | Missing currency symbols or corrupt fallback squares in commercial invoices. |
| **PR-07** | **Emoji Vector Syntax Failures** | OpenType COLR/CBDT color emoji tables are unhandled in vector PDF pipelines. | Emoji like `🛞` in line items cause syntax errors or unrendered glyphs. |
| **PR-08** | **Missing Interactive Links & Logo Distortion** | React-PDF cannot position interactive links over images, and templates distort logos by ignoring aspect ratio. | Inability to place clickable badges, and company logos appear stretched or squashed. |
| **PR-09** | **Unsafe Rich-Text Ingestion** | HTML tags in user-entered descriptions or terms pass unparsed into text components. | Causes raw HTML strings (e.g. `<b>bold</b>`) to render literally or crash XML parsers. |

---

## 2. Functional Requirements

### 🧾 FR-1: Natural Pagination (Normal Mode)
- **Priority:** Must Have
- **User Story:** As a sales manager, I want my document to flow naturally across pages without premature page breaks, so that pages look balanced and professional.
- **Acceptance Criteria:**
  1. **Efficient Space Utilization:** The document engine must place content onto the current page until remaining usable height is less than the height of the next single indivisible element.
  2. **Adaptive Closing Layout:** The Bank Details block and the Totals block must not be locked into an indivisible container:
     - When page width and vertical space permit, Bank Details and Totals render side-by-side.
     - When vertical space is restricted, Totals remain prioritized with line items on the primary page, while Bank Details adaptively stack or move to the continuation page.
     - *Scope Boundary:* Closing sections must avoid *premature* breaks, but are not guaranteed to never break when content volume legitimately requires multi-page flow. No custom row-balancing algorithm will be used without measured evidence.
  3. **Calibrated Column Widths (Candidate Target):** Table column widths must allocate sufficient space for common data values. The candidate target for the `make` column is at least **72 pt** (subject to empirical testing) to eliminate 2-line wraps for common manufacturer names.
  4. **Clean Table Row Pagination & Oversized Row Handling:**
     - Ordinary table rows should remain intact across page boundaries where possible. An absolute indivisibility guarantee is not imposed on every row.
     - Tables must paginate cleanly between rows without clipping or silent loss.
     - **Oversized Row Handling Strategy:** If an individual table row's content exceeds the available page height, the layout engine must handle it safely to prevent clipping, overlapping, or silent content omission. Natural fragmentation across the page boundary is preferred if supported and verified in Forme; otherwise, a controlled fallback (e.g., splitting multi-paragraph descriptions across virtual sub-rows) must be implemented during Phase 2.
  5. **Repeating Table Headers:** When a table spans multiple pages, the table header row (`<Row header>`) must repeat automatically at the top of every continuation page.
  6. **Dynamic Footer Reservation:** Forme `<Fixed position="footer">` must measure the exact rendered height of the footer and reserve only that space. Global defensive page padding (`paddingBottom: 48`) must be removed.
  7. **Selective Keep-Together Rules:**
     - Small logical units (single signature blocks, ordinary single table rows) must be protected using `wrap={false}`.
     - Long sections (commercial terms, notes, attachments) must be allowed to fragment naturally across pages. Blanket keep-together on long sections is prohibited.
     - Section headings must not be stranded as orphans at the bottom of a page without accompanying body text where practical.
  8. **Gate 1 Representative Document Suite:** Natural pagination must pass 100% across the complete representative document suite before Compact Mode or Force 1 Page Mode can be implemented:
     - Short documents with few line items.
     - The original 13-item `SASQUO-000427` quotation.
     - Documents with long and wrapping descriptions.
     - Documents with large totals and bank details.
     - Documents with notes and commercial terms.
     - Documents with attachments and signatures.
     - Multi-page documents with different content distributions.

---

### 🧾 FR-2: Compact Presentation Mode
- **Priority:** Must Have
- **User Story:** As a user, I want to activate Compact mode to reduce document spacing systematically, so that dense documents fit on fewer pages while maintaining readability.
- **Acceptance Criteria:**
  1. **Consistent Candidate Token Application:** When `density: 'compact'` is selected, the template must apply all 32 candidate styling overrides, including:
     - Document margins reduced from 36 pt to 24 pt (provisional candidate target).
     - Table row vertical padding reduced from 6 pt to 3 pt (provisional candidate target).
     - Table cell font size adjusted to 7.5 pt from 8 pt (provisional candidate target).
     - Body font size adjusted to 8 pt from 9 pt (provisional candidate target).
     - Party cards vertical padding reduced from 12 pt to 6 pt (provisional candidate target).
     - Section gaps reduced from 16 pt to 8 pt (provisional candidate target).
  2. **Content Preservation & Readability:** Compact mode must never hide, truncate, or omit line items, totals, VAT, bank details, or signatures. Text must remain comfortably legible.
  3. **Visual Hierarchy:** Visual hierarchy between document title, table headers, and line items must remain distinct.

---

### 🧾 FR-3: Force 1 Page Mode
- **Priority:** Must Have
- **User Story:** As a business user, I want to force a quotation or invoice onto a single page when its content can reasonably fit, so that I can send a clean 1-page document to customers.
- **Acceptance Criteria:**
  1. **Two-Pass Layout Measurement:** The rendering pipeline must use Forme's `renderDocumentWithLayout` to measure actual rendered height rather than estimating from row counts or string lengths.
  2. **Progressive Compaction Execution:**
     - **Pass 1:** Render with standard Compact tokens. If document height $\le 841.89\text{ pt}$ (A4 height), produce the PDF.
     - **Pass 2:** If document height exceeds 1 page by $\le 120\text{ pt}$ (provisional candidate threshold), apply aggressive micro-compaction:
       - Reduce document margins to candidate floor of 18 pt.
       - Reduce table row padding to candidate floor of 2 pt.
       - Reduce body text to candidate floor of 7 pt.
     - **Pass 3:** Re-measure layout. If height fits 1 page, produce single-page PDF.
  3. **Legibility Over Page Count (Non-Negotiable Core Principle):**
     - Force 1 Page must prioritize commercial legibility over achieving a single-page target.
     - The **7 pt typography floor** and **2 pt row padding floor** are **provisional candidate targets** requiring empirical readability testing before final approval; they are not permanently fixed or universally non-negotiable.
     - The system must never silently omit line items, descriptions, taxes, totals, bank details, or signatures to satisfy a page-count target.
     - Bounding boxes must never overlap.
     - The system must never produce unreadable or degraded output simply to satisfy a 1-page target.
  4. **Graceful Multi-Page Fallback:** If a document exceeds the single-page threshold after maximum safe compaction (e.g., 25+ line items), the engine must abort 1-page mode and output a clean, readable 2-page document with an informational notice in the UI preview.

---

### 🧾 FR-4: First-Class Landscape Orientation
- **Priority:** Must Have
- **User Story:** As a procurement officer, I want to generate documents in A4 Landscape orientation, so that wide multi-column tables display without truncation.
- **Acceptance Criteria:**
  1. **Native Geometric Recalculation:** When switching from Portrait ($210 \times 297\text{ mm}$) to Landscape ($297 \times 210\text{ mm}$), all widths, heights, margins, and column budgets must recalculate from first principles.
  2. **No Transform Hacks:** The engine must not use CSS rotation, canvas rotation, or PDF matrix transform workarounds.
  3. **Table Width Budgeting:** Tables must expand to consume the full available landscape width ($841.89\text{ pt}$ minus margins). Column widths must distribute proportionally.
  4. **Header and Footer Flow:** Headers and footers must span the entire landscape width and preserve correct page numbering (`Page X of Y`).

---

### 🧾 FR-5: Interactive Image Hyperlinks & Logo Aspect Ratios
- **Priority:** Must Have
- **User Story:** As a vendor, I want clickable hyperlinks placed over company logos and payment QR badges, and I want company logos to render without distortion, so that exported PDFs look professional and interactive.
- **Acceptance Criteria:**
  1. **Direct Image Links:** Forme `<Image href="https://...">` elements must output native PDF `/Annots` objects with `/Subtype /Link`.
  2. **Coordinate Overlays:** Absolutely positioned `<View href="https://...">` elements placed over image containers must generate clickable hot-spots matching the view's exact bounding box.
  3. **Logo Aspect Ratio Preservation:** Company logos must maintain their natural aspect ratio. Image containers must apply `objectFit: 'contain'` semantics so that logos are never stretched, compressed, or distorted horizontally or vertically.
  4. **Scale & Transform Invariance:** Link annotations must remain precisely aligned with underlying visual elements across document scaling, page margins, and orientation changes.
  5. **External URL Handling:** Exported PDFs must launch valid URLs in external browser windows when clicked in standard PDF viewers (Adobe Acrobat, Apple Preview, Google Chrome, mobile viewers).

---

### 🧾 FR-6: Unicode, Symbols & Typography Pipeline
- **Priority:** Must Have
- **User Story:** As an engineer, I want technical pipe dimensions (e.g. 2", 3", 4"), Nigerian Naira currency, and engineering symbols to render correctly, so that quotation specifications are legally and technically accurate.
- **Acceptance Criteria:**
  1. **TrueType / OpenType Embedding:** The rendering engine must embed binary TTF/OTF fonts. Inter TTF must be registered with full Regular, Medium, and Bold weights.
  2. **Double-Prime & Quote Mapping:**
     - The Unicode double-prime character (`″`, `U+2033`) must render as a valid double-prime glyph from an embedded font, or map deterministically to ASCII standard double quote (`"`, `U+0022`).
     - Modulo-256 truncation into digits (`23`, `33`, `43`) is permanently prohibited.
  3. **Nigerian Naira Symbol:** The Naira currency symbol (`₦`, `U+20A6`) must be supported in all monetary cells via an embedded font or a vector SVG glyph fallback.
  4. **Engineering Symbols:** The engine must accurately render squared (`²`, `U+00B2`), multiplication sign (`×`, `U+00D7`), degree symbol (`°`, `U+00B0`), and plus-minus (`±`, `U+00B1`).
  5. **Scoped Emoji Fallback Strategy:**
     - Surrounding text must be preserved 100%.
     - A small, justified set of bundled monochrome vector icons may be supported for verified business symbols.
     - Unmapped emoji must be cleanly stripped or replaced with safe placeholders without corrupting text or crashing PDF generation.
     - Building a large emoji mapping library is explicitly **not** a blocker for initial template delivery.

---

### 🧾 FR-7: 5-Step Rich-Text Conversion Pipeline
- **Priority:** Should Have
- **User Story:** As a user, I want rich-text formatting (bold, italic, bullet lists) in product descriptions to render cleanly in the PDF without showing raw HTML tags.
- **Acceptance Criteria:**
  1. **Structured 5-Step Pipeline:**
     1. **Sanitize:** Incoming HTML sanitized via DOMPurify with strict allowlist (compatible with desktop and Capacitor mobile WebViews).
     2. **Parse:** Sanitized content parsed into an intermediate tree.
     3. **Convert:** Permitted nodes mapped into an allowlisted document AST.
     4. **Render:** AST rendered using Forme primitives (`<Text>`, `<Strong>`, `<Em>`, `<UnorderedList>`, `<ListItem>`).
     5. **Fallback:** Unsupported, malformed, or nested nodes fall back gracefully to plain text.
  2. **Deliberate Formatting Scope:** Initial implementation strictly supports commercial basics: inline `<b>`, `<strong>`, `<i>`, `<em>`, `<u>` and block `<ul>`, `<ol>`, `<li>`, `<p>`, `<br>`. Arbitrary CSS, tables, and scripts are stripped.

---

### 🧾 FR-8: Evidence-Driven Font Packaging
- **Priority:** Must Have
- **User Story:** As a mobile app user, I want PDF generation to work reliably offline on Android and iOS devices.
- **Acceptance Criteria:**
  1. **Static Asset Evaluation:** Evaluate loading static TTF fonts from `public/fonts/` first. Verify licensing, weight completeness, and bundle impact.
  2. **Offline & Mobile Testing:** Empirically verify that Capacitor Android/iOS builds can load static fonts without internet access.
  3. **Binary Bundle Fallback:** Retain base64/binary font bundling as a fallback if static asset delivery fails in offline mobile environments.

---

### 🧾 FR-9: Renderer Independence & Calculation Integrity
- **Priority:** Must Have
- **User Story:** As a software architect, I want rendering templates to be pure presentation components, so that business logic and calculations remain isolated and auditable.
- **Acceptance Criteria:**
  1. **Model Decoupling:** `PdfDocumentModel` must not import Forme, React-PDF, or PDF styling primitives.
  2. **Zero In-Renderer Calculations:** Templates must receive final calculated numbers. No subtotal, tax, discount, or totals math may occur inside rendering components.

---

### 🧾 FR-10: Pre-Production Approval & Progressive Migration
- **Priority:** Must Have
- **User Story:** As a project lead, I want new Forme templates to be built and verified before migrating production traffic, so that customer operations are never disrupted.
- **Acceptance Criteria:**
  1. **Pre-Production Approval:** Forme Invoice and Quotation templates must pass all test plan suites (`TS-1` to `TS-11`) before production switchover.
  2. **Progressive Rollout:** Document families migrate sequentially (Quotation $\to$ Invoice $\to$ Waybill $\to$ CSR).
