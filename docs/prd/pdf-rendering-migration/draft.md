# PRD — PDF Rendering Architecture Migration: Forme & pdfcn

- **Project:** BIGDROPS Business Management Suite
- **Document Type:** Master Product Requirements Document (PRD)
- **Status:** APPROVED SPECIFICATION & FROZEN DOCUMENTATION BASELINE (Ready for M1 Planning)
- **Updated Date:** 2026-10-30
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Target Rendering Engine:** Forme (`@formepdf/react` and `@formepdf/core` v0.20.1)
- **Document Component System:** `pdfcn` Design System

---

## 1. Core Objective & Architectural Boundaries

BIGDROPS will replace `@react-pdf/renderer` as its document rendering engine. The replacement architecture uses **Forme** (`@formepdf/react` and `@formepdf/core`) as the underlying layout and PDF generation engine, wrapped by the **pdfcn** document design system.

This migration replaces fragile layout workarounds with deterministic, template-driven document rendering.

### 1.1 Strict Domain Boundaries
- **Forme is the Renderer:** Forme executes layout geometry, text flow, font embedding, and PDF byte generation.
- **`pdfcn` is the Presentation System:** `pdfcn` owns design tokens, typography scales, colors, borders, and reusable document components.
- **Canonical Model Independence:** The business document model (`PdfDocumentModel`) must remain 100% renderer-independent. It must never import Forme, React-PDF, or PDF styling primitives.
- **Locked Business Calculations:** Financial calculations (subtotals, discounts, VAT, totals, withholding tax) remain strictly in the business domain layer (`src/domain/` and `src/lib/Calculations.ts`). Rendering components are presentation renderers only and must never calculate or mutate financial values.

### 1.2 Pre-Production Approval & Progressive Rollout
New Forme Invoice and Quotation templates must be built, verified, and approved before production document traffic switches to Forme.

Migration occurs progressively by document family. Existing production templates will continue to run on `@react-pdf/renderer` until their Forme replacements pass all functional, mathematical, and visual regression tests across the representative document suite.

The target architectural flow is:

```
+-------------------------------------------------------------+
|                      Application State                      |
|                (Supabase / Domain Entities)                 |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                  Canonical Document Model                   |
|                      (PdfDocumentModel)                     |
|           *Strictly renderer-independent; math locked*      |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                   pdfcn Presentation Layer                  |
|                 (Design Tokens & Components)                |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                     Forme Engine Backend                    |
|             (@formepdf/react & @formepdf/core)              |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                         Output PDF                          |
|         (Accurate Vector Stream with Embedded Fonts)        |
+-------------------------------------------------------------+
```

---

## 2. Problem Statement & Investigation Evidence

The legacy `@react-pdf/renderer` pipeline causes recurring defects in production documents. Formal investigations on 2026-10-30 analyzed real quotation cases (`SASQUO-000427`, `SASQUO-000428`, `SASQUO-430`) and identified root causes.

> [!NOTE]
> Specific measurements cited below (e.g. 113.73 pt, 75.25 pt, 58 pt vs 72 pt) represent **empirical investigation evidence from observed reproduction documents**. They serve as diagnostic benchmarks rather than universal constants across all business documents.

### 2.1 Natural Pagination Failure (Observed Case: `SASQUO-000427`)

Investigation reference: `docs/reports/2026-10-30-industry-invoice-quotation-natural-pagination-investigation.md` and `docs/templates/ref-invquo/Screenshot_2026-10-30-07-12-40-825_com.google.android.apps.docs.jpg`.

1. **Coupled Closing Block:** In `IndustryTemplate.tsx` (line 386), the Bank Details section and the Totals section are grouped inside an indivisible horizontal container:
   ```tsx
   <View style={styles.closingRow} wrap={false}>
   ```
   In quotation `SASQUO-000427`, this combined container measured **113.73 pt** in height.
2. **Premature Page Break:** Page 1 retained **75.25 pt** of usable content height. Because 113.73 pt exceeded 75.25 pt, the layout engine pushed the entire closing container to Page 2.
3. **Empty Page Defect:** Page 2 displayed only the closing container and footer. More than 84% of Page 2 remained blank.
4. **Adaptive Decoupling Requirement:** Bank Details and Totals must not be rigidly coupled. The layout engine must allow Bank Details and Totals to adapt: displaying side-by-side when space and content permit, and falling back gracefully (stacking or flowing to continuation pages) when space is restricted.

### 2.2 Table Column Geometry Inflation

Investigation of `src/components/pdf/table.ts` (line 157) revealed that the `make` column was hardcoded to a fixed width of `58 pt`:
1. Subtracting horizontal cell padding (6 pt on each side, total 12 pt) leaves only **46 pt** of printable text width.
2. Common equipment manufacturer names (for example, `"Atlas Copco"`) require approximately 55 pt of width.
3. The engine wraps `"Atlas Copco"` onto two lines across all 13 table rows in `SASQUO-000427`.
4. This avoidable wrap added approximately **131 pt** of unnecessary table height. A provisional candidate width of **72 pt** for the `make` column eliminates all 13 line wraps and permits the table to fit comfortably on Page 1.

### 2.3 Defensive Page Padding

React-PDF lacked dynamic measurement for fixed footers. As a workaround, the legacy template applied `paddingBottom: 48` to `<Page>` in `industryStyles.ts`. This defensive offset withheld approximately 30 pt of valid printable space on every page.

Forme provides native `<Fixed position="footer">` support. Forme measures the exact rendered height of the footer and reserves only the required space.

### 2.4 Incomplete Existing Compaction

A compaction system was previously written in `src/components/pdf/presentation/industry/compact.ts`. It declared 32 style overrides.
However, `IndustryTemplate.tsx` only applied three overrides (`page`, `header`, `customTitle`), saving only 20 pt. The remaining 29 overrides (for table padding, row heights, party cards, and totals) were never wired into the template. Compaction failed because it was never completed.

### 2.5 Typography & Character Corruption (Observed Case: `SASQUO-000428`)

Investigation reference: `docs/reports/2026-10-30-forme-invoice-quotation-industry-template-investigation.md`.

In quotation `SASQUO-000428.pdf`, pipe dimensions `2″`, `3″`, and `4″` corrupted into `23`, `33`, and `43`:
1. **Observed Reproduction:** The double-prime symbol (`″`, Unicode `U+2033`) in engineering descriptions consistently rendered as the digit `3` in the exported PDF, producing `"23"`, `"33"`, and `"43"`.
2. **Technically Plausible Suspected Cause:** `safeText.ts` exempted Unicode code points in the range `0x2000-0x206F`. Inter Latin does not contain glyph `U+2033`. React-PDF fell back to standard Helvetica with WinAnsi 8-bit encoding ($0–255$). Truncating the 16-bit code point modulo 256:
   $$\text{0x2033} \pmod{\text{256}} = \text{0x33} = 51_{10} = \text{'3'}$$
   *Classification:* This encoding truncation is a **technically plausible suspected cause** consistent with the observed defect and documented codebase comments in `src/components/pdf/core/safeText.ts`. However, it must not be claimed as proven fact until the exact font fallback and byte stream are traced empirically during Phase 1.
3. **Additional Glyphs:** Similar corruption risks exist for Nigerian Naira (`₦`, `U+20A6`), mathematical multiplication (`×`, `U+00D7`), degree symbols (`°`, `U+00B0`), plus-minus (`±`, `U+00B1`), and automotive emoji (`🛞`, `U+1F6DE`).

### 2.6 Interactive Hyperlinks & Logo Distortion

Commercial B2B quotations require clickable regions over product images, manufacturer stamps, and payment badges. React-PDF cannot position interactive links reliably over image layers. Furthermore, legacy templates frequently distorted company logos by failing to preserve natural image aspect ratios.

---

## 3. Superseded Technology Decisions

The following architectural directions from previous PRD drafts or exploratory spikes are permanently superseded:

| Legacy / Superseded Decision | Status | Replacement Decision in Forme Architecture |
| :--- | :--- | :--- |
| **Takumi PDF Engine Spike** | ⏭️ SUPERSEDED | Abandoned. Replaced by Forme (`@formepdf/react` and `@formepdf/core`). |
| **Typst / CLI Binary Spikes** | ⏭️ SUPERSEDED | Abandoned due to browser bundle constraints and binary process isolation. |
| **Puppeteer / Headless Chrome HTML-to-PDF** | ⏭️ SUPERSEDED | Excluded due to host memory limits and high latency. |
| **Generic pdfcn as Renderer** | ⏭️ SUPERSEDED | Clarified: `pdfcn` is the component and token design system; Forme is the PDF rendering engine. |
| **Single Indivisible Closing Container** | ⏭️ SUPERSEDED | Replaced by decoupled adaptive layout for Bank Details and Totals. |
| **Global Page Padding for Footer Spacing** | ⏭️ SUPERSEDED | Replaced by Forme `<Fixed position="footer">` dynamic reservation. |
| **String-Length Layout Estimations** | ⏭️ SUPERSEDED | Replaced by multi-pass layout engine with exact bounding-box measurement via `renderDocumentWithLayout`. |

---

## 4. Retained Architectural Principles

The following principles from the original PRD remain active:

1. **Renderer-Independent Canonical Model:** The application domain layer and `PdfDocumentModel` must never import Forme, React-PDF, or PDF-specific styling primitives.
2. **Immutable Parent Document Data:** PDF rendering components are renderers only. They must never mutate invoice records, line items, or tax calculations.
3. **First-Class Landscape Orientation:** Landscape A4 ($297 \times 210\text{ mm}$) must recalculate layout geometry from first principles. CSS/matrix transform hacks are prohibited.
4. **Progressive Migration by Family:** Documents migrate one family at a time (Quotation $\to$ Invoice $\to$ Waybill $\to$ CSR). `@react-pdf/renderer` stays installed until all consumers migrate.
5. **Host Resource Constraints:** `bun run build` must never be run in development or CI environments. Verification relies on `bun run audit:load`, `bun run typecheck`, and focused test execution.

---

## 5. Three Pagination Modes Architecture

The Forme architecture formalizes three explicit document density modes:

```
+-----------------------------------------------------------------------------------+
| Mode 1: NORMAL MODE (Natural Flow)                                               |
| - Default spacing tokens, standard typography (9 pt body, 8 pt table)             |
| - Clean multi-page pagination; ordinary table rows break cleanly without clipping |
| - Repeating table headers on continuation pages                                   |
| - Decoupled Bank Details & Totals; adaptive fallback if space restricted          |
+-----------------------------------------------------------------------------------+
                                          |
                                          | User requests denser layout
                                          v
+-----------------------------------------------------------------------------------+
| Mode 2: COMPACT MODE (Content-Aware Density Reduction)                            |
| - Systematic token reductions (32 candidate styling overrides)                    |
| - Compact typography (8 pt body, 7.5 pt table, reduced row/card padding)          |
| - Preserves 100% of document content and readability                              |
+-----------------------------------------------------------------------------------+
                                          |
                                          | User explicitly requests 1-page fit
                                          v
+-----------------------------------------------------------------------------------+
| Mode 3: FORCE 1 PAGE MODE (Multi-Pass Single-Page Fitting)                        |
| - Active available-space measurement via renderDocumentWithLayout                 |
| - Progressive compaction passes (margins -> row padding -> typography scale)      |
| - LEGIBILITY FIRST: Candidate floors (7 pt font, 2 pt padding) subject to testing |
| - Fallback: Gracefully outputs clean 2-page document if 1-page fit violates guards|
+-----------------------------------------------------------------------------------+
```

> [!IMPORTANT]
> **Natural Pagination is an Absolute Prerequisite:**  
> Natural pagination (Normal Mode) must be verified and signed off across a full representative document suite before Compact Mode or Force 1 Page Mode can be implemented. Compaction must never be used to mask or compensate for fundamentally broken natural pagination.

### 5.1 Mode 1: Normal Mode
- Default presentation mode for all newly created documents.
- Uses standard line-heights ($1.35$), standard party cards ($100\text{--}110\text{ pt}$), and standard table row padding ($6\text{ pt}$).
- When content exceeds Page 1, tables split cleanly between rows without clipping or row splitting.
- Table headers repeat automatically on continuation pages.
- Adaptive closing layout: Bank Details and Totals render side-by-side when available space and content permit; if vertical space is restricted, Totals remain prioritized with line items while Bank Details adaptively stack or move to continuation pages.

### 5.2 Mode 2: Compact Mode
- Activated by setting `density: 'compact'` in document presentation settings.
- Applies consistent token reductions across all component styles (provisional candidate targets):
  - Page margin reduces from $36\text{ pt}$ to $24\text{ pt}$ (candidate target).
  - Table row vertical padding reduces from $6\text{ pt}$ to $3\text{ pt}$ (candidate target).
  - Body font reduces from $9\text{ pt}$ to $8\text{ pt}$ (candidate target).
  - Party card vertical padding reduces from $12\text{ pt}$ to $6\text{ pt}$ (candidate target).
- All 32 candidate tokens declared in `compact.ts` are wired and applied deterministically.
- Preserves all document content and structural readability.

### 5.3 Mode 3: Force 1 Page Mode
- Activated when the user selects the explicit "Force 1 Page" toggle.
- Uses Forme's multi-pass layout calculation (`renderDocumentWithLayout`):
  1. **Pass 1:** Measure the document using Compact mode tokens.
  2. **Pass 2:** If total height exceeds 1 physical page ($841.89\text{ pt}$ for A4 portrait), calculate the required vertical compression deficit:
     $$\text{Deficit} = H_{\text{total}} - H_{\text{usable\_page}}$$
  3. **Pass 3:** If deficit is within candidate threshold ($\le 120\text{ pt}$), progressively reduce margins (down to candidate floor $18\text{ pt}$), table row vertical padding (down to candidate floor $2\text{ pt}$), and font sizes (down to candidate floor $7\text{ pt}$).
- **Legibility Over Page Count (Non-Negotiable Core Principle):**
  - Force 1 Page must prioritize commercial legibility over achieving a single-page target.
  - The 7 pt typography floor and 2 pt row padding are **provisional candidate targets** requiring empirical readability testing before final approval; they are not permanently fixed or universally non-negotiable.
  - The system must never silently omit line items, totals, VAT, bank details, or signatures to fit onto one page.
  - The system must never allow text or bounding boxes to overlap.
  - The system must never produce unreadable or degraded text simply to satisfy a 1-page constraint.
  - **Graceful Multi-Page Fallback:** If acceptable fitting cannot be achieved without violating legibility or safeguards, the system aborts single-page compaction and produces a clean, readable 2-page document with an explicit preview notice.

---

## 6. Selective Keep-Together Behavior & Oversized Table Rows

To maintain clean pagination without creating artificial whitespace, keep-together rules are applied selectively:

1. **Selective Small-Unit Protection:** Keep-together constraints (`wrap={false}`) are reserved exclusively for small, indivisible logical units:
   - Individual signature blocks (signature line, company stamp, signatory name, title).
   - Ordinary single table rows (preventing horizontal row splitting where content fits normally).
   - Single payment method cards.
2. **Natural Fragmentation for Long Content:** Potentially long sections must be allowed to fragment naturally across page boundaries:
   - Commercial terms and conditions.
   - Long explanatory notes.
   - Equipment attachments and schedules.
   - Multi-account bank details tables.
3. **Blanket Keep-Together Prohibition:** Imposing blanket `wrap={false}` across entire notes, terms, or closing sections is prohibited.
4. **Heading Orphan Mitigation:** Section headings (e.g. "Commercial Terms", "Payment Instructions") should be kept with at least two lines of following body text where practical to prevent orphaned headings at page bottoms.
5. **Oversized Table Row Strategy:**
   - Ordinary table rows should remain intact across page boundaries where possible. However, the system does not impose an absolute indivisibility guarantee on every row.
   - If an individual table row's content (e.g. an extensive scope-of-work description or sub-item specification) exceeds the remaining or total available page height, the layout engine must handle it safely:
     - The strategy must prevent clipping, text overlapping, and silent content loss.
     - Natural internal fragmentation of the row across the page boundary is preferred if supported and empirically verified in Forme.
     - If Forme does not natively support cleanly fragmenting an individual row, the system must employ a controlled fallback during implementation (such as splitting multi-paragraph row descriptions across virtual sub-rows) to ensure no content is hidden or severed.

---

## 7. Adaptive Closing Sections

Rather than enforcing rigid row locking or premature custom balancing algorithms, closing sections implement an adaptive layout:

1. **Side-by-Side Presentation:** When remaining vertical page space $\ge H_{\text{closing}}$ and page width permits, Bank Details and Totals display side-by-side.
2. **Deliberate Readable Fallback:** When remaining space is insufficient to accommodate both blocks side-by-side:
   - Totals remain prioritized immediately beneath the line-item table on the primary page.
   - Bank Details adaptively stack below Totals or flow cleanly onto the continuation page.
3. **No Absolute Zero-Break Guarantee:** Closing sections must not be forced to fit artificially when content volume genuinely requires a page continuation. The goal is to eliminate *avoidable premature page breaks*, not to guarantee that closing sections will never cross a page boundary.
4. **Native Layout First:** No custom row-balancing algorithm will be introduced until empirical testing demonstrates that native Forme flex layout is insufficient.

---

## 8. 5-Step Rich-Text Conversion Pipeline

User descriptions and notes in Supabase often contain rich-text HTML tags from rich editors. The pipeline implements a structured 5-step conversion process:

```
[Incoming HTML String]
          │
          ▼
1. Sanitize HTML (DOMPurify with strict allowlist; mobile WebView compatible)
          │
          ▼
2. Parse Sanitized HTML (Lightweight tree parser)
          │
          ▼
3. Convert to Controlled Document AST (Allowlisted nodes: Bold, Italic, List, Paragraph)
          │
          ▼
4. Render AST via Forme (<Text>, <Strong>, <Em>, <UnorderedList>, <ListItem>)
          │
          ▼
5. Apply Predictable Fallback (Unsupported/malformed nodes strip gracefully to text)
```

### 8.1 Tooling Scope & Boundaries
- **DOMPurify is a sanitization tool only:** It purifies HTML strings to prevent XSS and malformed input; it does **not** convert HTML into Forme components.
- **Controlled Scope:** The initial implementation focuses exclusively on essential commercial formatting:
  - Inline formatting: `<b>`, `<strong>`, `<i>`, `<em>`, `<u>`.
  - Block structures: `<ul>`, `<ol>`, `<li>`, `<p>`, `<br>`.
  - Arbitrary HTML, tables, images, and inline CSS styles are excluded and stripped to plain text.
- **Mobile Compatibility:** The sanitization and parsing utilities must execute reliably across desktop and Capacitor mobile WebViews (Android/iOS) without depending on Node.js-specific modules.

---

## 9. Scoped Emoji Fallback Strategy

User descriptions occasionally include equipment emoji (e.g., `"Wheel 🛞"`). OpenType color emoji tables (COLR, CBDT, sbix) cannot be parsed by standard vector PDF generators.

The rendering pipeline handles emoji with a safe, scoped strategy:
1. **Preserve Surrounding Text:** An emoji must never corrupt the surrounding text or crash PDF generation.
2. **Small Justified Icon Set:** A tiny, curated set of monochrome vector SVG icons may be bundled for high-frequency commercial equipment symbols (e.g., standard tools, packages) where there is demonstrated business need.
3. **Safe Fallback:** Any emoji outside the small curated set is stripped cleanly from the rendered text stream or replaced with a safe neutral placeholder without interrupting document flow.
4. **No Blocker for Template 1:** Building an extensive emoji mapping library is explicitly **not** a prerequisite for building the initial Forme Invoice and Quotation templates.

---

## 10. Evidence-Driven Font Packaging Strategy

Forme requires binary TrueType (`.ttf`) or OpenType (`.otf`) fonts for PDF generation and embedding.

The font packaging approach will be determined based on empirical evidence:
1. **Evaluate Static TTF Assets First:** Attempt to load fonts (`Inter-Regular.ttf`, `Inter-Medium.ttf`, `Inter-Bold.ttf`) as static assets via HTTP `fetch()` from `public/fonts/`.
2. **Required Evaluation Criteria:**
   - Font licensing compliance for PDF embedding.
   - Availability of required weights (Regular, Medium, Bold).
   - Glyph coverage (Latin-1, currency symbols, technical symbols).
   - Asset bundle size impact.
   - **Offline / Mobile Export Reliability:** Confirm that Capacitor mobile builds (Android/iOS) can reliably access static font assets without network connectivity.
3. **Binary Bundling Fallback:** If static asset delivery fails in offline mobile environments or web worker boundaries, fall back to bundling fonts as base64/binary modules.
4. **No Premature Commitment:** The final packaging architecture will not be locked until offline mobile testing is performed in Phase 1.

---

## 11. Interactive Image Hyperlinks & Logo Aspect Ratios

Forme provides native PDF annotation support (`/Annots` with `/Subtype /Link`). The template architecture must support:
1. **Clickable Images:** Setting `href="https://..."` directly on `<Image>` elements generates a clickable rectangular annotation across the entire image bounding box.
2. **Coordinate-Accurate Overlays:** Absolutely positioned `<View href="https://...">` overlays placed over image containers enable clickable hot-spots (e.g., specific manufacturer stamps, certifier badges, or interactive QR codes).
3. **Logo Aspect Ratio Preservation:** Company logos must maintain their natural aspect ratio. Image containers must apply `objectFit: 'contain'` semantics so that logos are never stretched, compressed, or distorted horizontally or vertically.
4. **Scaling & Orientation Preservation:** Link annotations must automatically track image scaling, aspect-ratio preservation, and page rotation without coordinate drift.

---

## 12. Technical Capability Verification Status

We distinguish verified repository facts from capabilities requiring implementation-stage empirical verification:

| Capability / API | Target Claim | Verification Status | Verification Method & Source |
| :--- | :--- | :--- | :--- |
| **`renderDocumentWithLayout`** | Exports layout metadata with exact bounding boxes for two-pass measurement. | ✅ Verified in Package | Confirmed exported by `@formepdf/core` v0.20.1 in `node_modules`. |
| **`<Table>`, `<Row>`, `<Cell>`** | Native table primitives for tabular data. | ✅ Verified in Package | Confirmed exported by `@formepdf/react` v0.20.1 in `node_modules`. |
| **`<Fixed position="footer">`** | Native fixed footer positioning. | ✅ Verified in Package | Exported by `@formepdf/react` v0.20.1. Dynamic height reservation requires test suite verification (`TS-9`). |
| **Repeating Header (`<Row header>`)** | Header automatically repeats on continuation pages. | ⏳ Implementation Verification | Prop exists in Forme schema; runtime multi-page repetition behavior must be validated in `TS-9`. |
| **Native Hyperlinks (`<Image href="...">`)** | Direct link generation in PDF vector annotations. | ⏳ Implementation Verification | `<Link>` and `href` props exist; runtime PDF `/Annots` generation must be verified via MuPDF in `TS-5`. |
| **TrueType Font Subsetting** | Font embedding of local `.ttf` files. | ⏳ Implementation Verification | `<Font>` exported; runtime subsetting of Inter TTF and glyph coverage must be verified in `TS-2`. |

---

## 13. Migration Scope & Acceptance Criteria

### 13.1 In-Scope Document Families
1. **Family 1: Quotation (SASQUO)** — Primary reference implementation.
2. **Family 2: Invoice (SASINV)** — Shared Industry template foundation.
3. **Family 3: Waybill** — Logistics and delivery document.
4. **Family 4: Request for Quotation (RFQ) & Bill of Quantities (BOQ)**.
5. **Family 5: Contractor Service Report (CSR)**.

### 13.2 Acceptance Criteria
A document family is certified for production deployment only when:
- New Forme Invoice and Quotation templates are built, reviewed, and approved.
- Natural pagination passes 100% across the complete **Gate 1 Representative Document Suite**:
  - Short documents with few line items.
  - The original 13-item `SASQUO-000427` quotation (zero premature page breaks).
  - Documents with long and wrapping descriptions.
  - Documents with large totals and bank details.
  - Documents with notes and commercial terms.
  - Documents with attachments and signatures.
  - Multi-page documents with different content distributions.
- Ordinary table rows break cleanly without clipping; oversized table rows fragment or wrap safely without content loss.
- Double-prime and special symbols render accurately on `SASQUO-000428`.
- Multi-page documents with complex terms paginate cleanly on `SASQUO-430`.
- Both Portrait and Landscape orientations render correctly from first principles.
- Compact mode applies all candidate styling overrides deterministically without content loss.
- Force 1 Page mode prioritizes commercial legibility over page count, fitting qualifying documents onto a single page while honoring readability safeguards, and providing a clean multi-page fallback when uncompressible.
- Variable-height notes, commercial terms, and signature blocks flow cleanly.
- Company logos preserve natural aspect ratios without distortion.
- Interactive image hyperlinks navigate to correct URLs in exported PDFs.
- `bun run typecheck` passes with zero errors.
- `bun run build` is not executed.
- No business logic or database queries exist inside rendering components.
