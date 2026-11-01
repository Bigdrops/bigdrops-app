# PDF Rendering Architecture Specification — Forme & pdfcn

- **Project:** BOUXRE Business Management Suite
- **Document Type:** Master Architecture & System Design Specification
- **File:** `docs/prd/pdf-rendering-migration/architecture.md`
- **Status:** AUTHORITATIVE ARCHITECTURE BASELINE
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Target Rendering Engine:** Forme (`@formepdf/react` and `@formepdf/core` v0.20.1)
- **Document Component System:** `pdfcn` Presentation & Design System

---

## 1. Core Objective & Architectural Boundaries

BOUXRE will replace `@react-pdf/renderer` as its document rendering engine across all eight in-scope document types:
- **Commercial Group:** Invoice, Quotation, Purchase Order (PO), Cost Pricing Sheet (CPS), Receipt
- **Procurement Group:** Request for Quotation (RFQ)
- **Logistics Group:** Waybill
- **Technical / Service Group:** Customer Service Report (CSR)  
*(Bill of Quantities / BOQ is explicitly excluded).*

The target architecture replaces fragile layout workarounds with deterministic, template-driven rendering. It uses **Forme** (`@formepdf/react` and `@formepdf/core`) as the underlying layout and PDF byte generation engine, wrapped by the **pdfcn** document design system.

### 1.1 Strict Responsibility Boundaries
To prevent architectural coupling, the PDF generation system enforces strict separation across six distinct subsystems (formally established in Milestone M1A):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BOUXRE PDF SYSTEM LIFECYCLE                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Domain Preparation Layer                                            │
│    • Resolves business data from Supabase/domain entities.             │
│    • Executes locked financial math via src/lib/Calculations.ts.       │
│    • Emits canonical, renderer-neutral prepared document models.       │
│    • Strictly renderer-independent; zero PDF or styling imports.       │
├────────────────────────────────────────────────────────────────────────┤
│                                  │                                     │
│                                  ▼                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Master Template Resolver                                            │
│    • Sits in src/domain/pdf/resolver/index.ts.                         │
│    • Discovers and validates registered templates per document family. │
│    • Selects template deterministically based on document request.     │
│    • Constructs the rendering envelope containing data and metadata.   │
│    • Does NOT own fonts, branding assets, geometry, or delivery.       │
├────────────────────────────────────────────────────────────────────────┤
│                                  │                                     │
│                                  ▼                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 3. PDF Customization Engine                                            │
│    • Evaluates user design preferences (accents, fonts, density).      │
│    • Validates preferences against template capability manifests.      │
│    • Enforces safety overrides and system defaults.                    │
├────────────────────────────────────────────────────────────────────────┤
│                                  │                                     │
│                                  ▼                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 4. pdfcn Presentation Layer                                            │
│    • Provides design tokens (colors, spacing, typography scales).      │
│    • Provides low-level rendering primitives (View, Text, Image, Table)│
│    • Standardizes shared document components without forcing layouts.  │
├────────────────────────────────────────────────────────────────────────┤
│                                  │                                     │
│                                  ▼                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Forme Engine Backend                                                │
│    • Manages layout geometry, line breaks, pagination, and font streams│
│    • Compiles React JSX components into vector PDF bytes.              │
├────────────────────────────────────────────────────────────────────────┤
│                                  │                                     │
│                                  ▼                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 6. Composite Delivery Subsystem                                        │
│    • Manages document dispatch, local caching, download, and printing. │
│    • Reports user feedback and execution telemetry.                    │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Architectural Principles
- **Forme is the Renderer:** Forme executes layout geometry, text flow, font embedding, and PDF byte generation.
- **`pdfcn` is the Presentation System:** `pdfcn` owns design tokens, typography scales, colors, borders, and reusable primitives.
- **Canonical Model Independence:** Prepared document models must remain 100% renderer-independent. They must never import Forme, React-PDF, or PDF styling primitives.
- **Locked Business Calculations:** Financial calculations (subtotals, discounts, VAT, totals, withholding tax) remain strictly in the business domain layer (`src/domain/` and `src/lib/Calculations.ts`). Rendering components are presentation renderers only and must never calculate or mutate financial values.
- **No Universal Table or Layout Abstraction:** Shared infrastructure does not force identical layouts or universal table abstractions onto all document families. Each document family preserves its own table semantics, column budgets, and pagination rules.
- **Pre-Production Approval & Progressive Rollout:** Migration occurs progressively by document family. Existing production templates will continue to run on `@react-pdf/renderer` until their Forme replacements pass all functional, mathematical, and visual regression tests.

---

## 2. In-Scope Document Families & Architecture Groupings

The migration covers eight document types with distinct commercial, structural, and presentation requirements:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          DOCUMENT FAMILY ARCHITECTURE MAP                        │
├─────────────────────────┬────────────────────────────────────────────────────────┤
│ 1. Commercial Group     │ Invoice, Quotation, Purchase Order (PO)                │
│    (Shared Infra)       │ • Shared font assets, media resolution, and delivery.  │
│                         │ • INDEPENDENT templates, layouts, and data semantics.  │
│                         │ • PO is supplier-facing (AP); Invoice/Quote are client.│
├─────────────────────────┼────────────────────────────────────────────────────────┤
│ 2. Cost Pricing Sheet   │ Cost Pricing Sheet (CPS)                               │
│    (Engineering Cost)   │ • Dense engineering cost schedules and sub-items.      │
│                         │ • Existing Forme implementation requires TTF font fix. │
├─────────────────────────┼────────────────────────────────────────────────────────┤
│ 3. Procurement Group    │ Request for Quotation (RFQ)                            │
│    (Unpriced Offers)    │ • Unpriced procurement document for vendor bidding.    │
│                         │ • Never reduced to an invoice with prices hidden.      │
├─────────────────────────┼────────────────────────────────────────────────────────┤
│ 4. Logistics Group      │ Waybill                                                │
│    (Transport & Sign)   │ • Goods dispatch, carrier info, physical sign-offs.    │
│                         │ • Requires fillable script fonts (Caveat).             │
├─────────────────────────┼────────────────────────────────────────────────────────┤
│ 5. Accounting Group     │ Receipt                                                │
│    (Payment Evidence)   │ • Proof of payment, transaction reference, amount.     │
│                         │ • Strict financial immutability and simple layout.     │
├─────────────────────────┼────────────────────────────────────────────────────────┤
│ 6. Technical / Service  │ Customer Service Report (CSR)                          │
│    (Field Engineering)  │ • Generator maintenance, operational readings, parts.  │
│                         │ • Independent Portrait and Blueprint Landscape designs.│
└─────────────────────────┴────────────────────────────────────────────────────────┘
```

### 2.1 The Critical Commercial Group: Invoice, Quotation, and Purchase Order (PO)
This requirement is mandatory for the BOUXRE platform:
- **Shared Commercial Infrastructure:** Invoice, Quotation, and Purchase Order share:
  1. Static TrueType font assets and registration.
  2. Image and canonical media resolution (`resolveCanonicalLogoUrl`).
  3. Read-only Unicode and glyph diagnostics.
  4. Low-level Forme presentation primitives (`View`, `Text`, `Table`, `Image`, `Link`).
  5. Shared rendering utilities and delivery pipeline (`CompositePdfDelivery`).
- **Independent Document Semantics & Layouts:**
  - **Invoice (`invoice`):** Outgoing billing demand (Accounts Receivable). Requires bank receiving details, statutory tax breakdown (VAT, WHT), due date, payment terms, and balance due.
  - **Quotation (`quotation`):** Outgoing commercial offer. Requires quotation validity period ("Valid Until"), commercial terms, acceptance signature block, and bank details (optional).
  - **Purchase Order (`po` / `purchase_order`):** Outgoing procurement contract sent to a vendor/supplier (Accounts Payable).
    - Requires supplier snapshot (`supplier_name`, contact, address), procurement delivery terms, `unit_cost` (procurement cost, never sales price), and management authorization signatures.
    - Does **not** include receiving bank accounts (BOUXRE is paying, not receiving).
    - Does **not** deduct Withholding Tax (WHT).
    - **Existing PO Templates Must Be Preserved:** PO has its own layout and supplier-facing fields. It must not be replaced by a generic invoice template.
    - **Canonical Preparation Gap:** PO domain calculations exist in `src/domain/purchase-order/calculations.ts`, but its dedicated canonical PDF preparation contract (`preparePurchaseOrderDocument.ts`) is currently incomplete. This gap is recorded as a specific outstanding requirement (Milestone M1C).

### 2.2 Other Document Families
- **Cost Pricing Sheet (CPS):** Forme implementations exist (`src/components/pdf/forme/CpsIndustryDocument.tsx`, `LedgerCpsDocument.tsx`). However, they suffer from the WOFF font fallback bug, silently rendering in `Helvetica`. CPS requires integration with M1B static TTF fonts, the master resolver, and delivery pipeline.
- **Request for Quotation (RFQ):** Procurement document listing required items, specifications, and quantities without prices. RFQ preserves unpriced procurement semantics and must never be treated as an invoice with blank prices.
- **Waybill:** Logistics document for goods dispatch. Requires transport mode, sender/receiver details, item condition status, and signature blocks supporting handwritten completion or digital capture.
- **Receipt:** Proof of payment acknowledging funds received against an invoice. Requires issuer info, payment method, reference, and received amount in words and figures.
- **Customer Service Report (CSR):** Technical field service report recording diesel generator operational readings (voltage, frequency, pressure, engine hours) and parts replaced. Requires independent Portrait Reference and Blueprint Landscape templates.

---

## 3. Consolidated Problem Register (Investigation Evidence Baseline)

The requirements in this specification resolve verified defects identified during the 2026-10-30 investigations and subsequent audits:

| Defect ID | Problem Summary | Root Cause in Legacy Implementation | Measured Impact & Classification |
| :--- | :--- | :--- | :--- |
| **PR-01** | **Indivisible Closing Block** | `IndustryTemplate.tsx` wraps Bank Details and Totals in an indivisible horizontal `<View wrap={false}>`. | Pushed an indivisible **113.73 pt** block to Page 2 in `SASQUO-000427` despite **75.25 pt** of free space on Page 1. Left Page 2 84% blank. *(Confirmed Reproduction)* |
| **PR-02** | **Table Column Geometry Inflation** | `table.ts` hardcodes `make: { pdfWidth: 58 }`. Net text width is only 46 pt after 12 pt padding. | Wrapped `"Atlas Copco"` onto 2 lines across all 13 rows in `SASQUO-000427`, inflating table height by **~131 pt**. *(Confirmed Reproduction)* |
| **PR-03** | **Defensive Page Padding** | React-PDF cannot dynamically measure fixed footers. Page styles force `paddingBottom: 48`. | Withheld **~30 pt** of valid printable content height on every page. *(Confirmed Code Finding)* |
| **PR-04** | **Incomplete Compact Wiring** | `compact.ts` declares 32 style overrides. `IndustryTemplate.tsx` only applied 3 (`page`, `header`, `customTitle`). | Saved only **20 pt** instead of available ~180 pt in `SASQUO-000427`. Compaction failed to prevent page breaks. *(Confirmed Code Finding)* |
| **PR-05** | **Double-Prime Character Corruption ($2'' \to 23$)** | In `@react-pdf/pdfkit/lib/pdfkit.js`, `encodeText` serializes unmapped characters as `char.toString(16)`. For `U+2033` (8243, `0x2033`), it outputs `'2033'`. In 1-byte WinAnsi text chunks, conforming viewers decode `0x32` (`'2'`), `0x20` (space), and `0x33` (`'3'`), rendering $2''$ as `23`. This defect occurs when Latin-subset fonts (such as `Lato` or `Orbitron`) lack `U+2033` and bypass glyph checks in `safeText.ts`. | Dimensions `2″`, `3″`, `4″` rendered as `23`, `33`, `43` in `SASQUO-000428.pdf`. *(Confirmed Root Cause in legacy React-PDF)* |
| **PR-06** | **Naira & Special Symbol Deficiencies** | Standard PDF fonts lack the Nigerian Naira symbol (`₦`, `U+20A6`) and engineering symbols (`²`, `×`, `±`, `°`). | Missing currency symbols or corrupt fallback squares in commercial invoices. *(Confirmed Code Finding)* |
| **PR-07** | **CPS Forme Font Fallback Defect** | `src/components/pdf/forme/fonts.ts` filters for `.ttf`/`.otf`. All fonts in `src/lib/pdfSharedFonts.ts` are `.woff`. | Every CPS Forme export silently evaluates font source as false and falls back to `Helvetica`. *(Confirmed Code Finding)* |
| **PR-08** | **Missing Interactive Links & Logo Distortion** | React-PDF cannot position interactive links over images, and templates distort logos by ignoring aspect ratio. | Inability to place clickable badges, and company logos appear stretched or squashed. *(Confirmed Reproduction)* |
| **PR-09** | **Unsafe Rich-Text Ingestion** | HTML tags in user-entered descriptions or terms pass unparsed into text components. | Causes raw HTML strings (e.g. `<b>bold</b>`) to render literally or crash XML parsers. *(Confirmed Reproduction)* |

---

## 4. Superseded Technology Decisions

The following architectural directions from previous PRD drafts or exploratory spikes are permanently superseded:

| Legacy / Superseded Decision | Status | Replacement Decision in Forme Architecture |
| :--- | :--- | :--- |
| **Takumi PDF Engine Spike** | ⏭️ SUPERSEDED | Abandoned. Replaced by Forme (`@formepdf/react` and `@formepdf/core`). |
| **Typst / CLI Binary Spikes** | ⏭️ SUPERSEDED | Abandoned due to browser bundle constraints and binary process isolation. |
| **Puppeteer / Headless Chrome HTML-to-PDF** | ⏭️ SUPERSEDED | Excluded due to host memory limits and high latency. |
| **Universal Table / Template Abstraction** | ⏭️ SUPERSEDED | Rejected. Replaced by shared low-level primitives while preserving document-specific layouts. |
| **Silent Font Fallback to Inter** | ⏭️ SUPERSEDED | Rejected. Succeeded by explicit, observable font fallback behavior with diagnostic telemetry. |
| **General-Purpose Silent Unicode Sanitizer** | ⏭️ SUPERSEDED | Rejected. Succeeded by the Text Preservation Rule and read-only glyph diagnostic utilities. |
| **Server-Side Image Proxy** | ⏭️ SUPERSEDED | Excluded from M1B pending security and architectural reviews. |
| **Single Indivisible Closing Container** | ⏭️ SUPERSEDED | Replaced by decoupled adaptive layout for Bank Details and Totals. |
| **Global Page Padding for Footer Spacing** | ⏭️ SUPERSEDED | Replaced by Forme `<Fixed position="footer">` dynamic reservation. |
| **String-Length Layout Estimations** | ⏭️ SUPERSEDED | Replaced by multi-pass layout engine with exact bounding-box measurement via `renderDocumentWithLayout`. |

---

## 5. Retained Architectural Principles

1. **Renderer-Independent Canonical Model:** The application domain layer and prepared document models must never import Forme, React-PDF, or PDF-specific styling primitives.
2. **Immutable Parent Document Data:** PDF rendering components are renderers only. They must never mutate invoice records, line items, or tax calculations.
3. **First-Class Landscape Orientation:** Landscape A4 ($297 \times 210\text{ mm}$) must recalculate layout geometry from first principles. CSS/matrix transform hacks are prohibited.
4. **Progressive Migration by Family:** Documents migrate sequentially. `@react-pdf/renderer` stays installed until all eight document families migrate and pass certification.
5. **Host Resource Constraints:** `bun run build` must never be run in development or CI environments due to host memory constraints.

---

## 6. Three Pagination Modes Architecture

The Forme architecture formalizes three explicit document density modes:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Mode 1: NORMAL MODE (Natural Flow)                                                │
│ • Default spacing tokens, standard typography (9 pt body, 8 pt table)              │
│ • Clean multi-page pagination; ordinary table rows break cleanly without clipping  │
│ • Repeating table headers on continuation pages                                    │
│ • Decoupled Bank Details & Totals; adaptive fallback if space restricted           │
└───────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ User requests denser layout
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Mode 2: COMPACT MODE (Content-Aware Density Reduction)                             │
│ • Systematic token reductions (32 candidate styling overrides)                     │
│ • Compact typography (8 pt body, 7.5 pt table, reduced row/card padding)           │
│ • Preserves 100% of document content and readability                               │
└───────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ User explicitly requests 1-page fit
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Mode 3: FORCE 1 PAGE MODE (Multi-Pass Single-Page Fitting)                         │
│ • Active available-space measurement via renderDocumentWithLayout                  │
│ • Progressive compaction passes (margins -> row padding -> typography scale)       │
│ • LEGIBILITY FIRST: Candidate floors (7 pt font, 2 pt padding) subject to testing  │
│ • Fallback: Gracefully outputs clean 2-page document if 1-page fit violates guards │
└───────────────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Natural Pagination is an Absolute Prerequisite:**  
> Natural pagination (Normal Mode) must be verified and signed off across the complete representative document suite before Compact Mode or Force 1 Page Mode can be implemented. Compaction must never be used to mask broken natural pagination.

### 6.1 Mode 1: Normal Mode
- Default presentation mode for all newly created documents.
- Uses standard line-heights ($1.35$), standard party cards ($100\text{--}110\text{ pt}$), and standard table row padding ($6\text{ pt}$).
- When content exceeds Page 1, tables split cleanly between rows without clipping.
- Table headers repeat automatically on continuation pages.
- Adaptive closing layout: Bank Details and Totals render side-by-side when available space and content permit; if vertical space is restricted, Totals remain prioritized with line items while Bank Details adaptively stack or move to continuation pages.

### 6.2 Mode 2: Compact Mode
- Activated by setting `density: 'compact'` in document presentation settings.
- Applies consistent token reductions across all component styles (provisional candidate targets):
  - Page margin reduces from $36\text{ pt}$ to $24\text{ pt}$.
  - Table row vertical padding reduces from $6\text{ pt}$ to $3\text{ pt}$.
  - Body font reduces from $9\text{ pt}$ to $8\text{ pt}$.
  - Party card vertical padding reduces from $12\text{ pt}$ to $6\text{ pt}$.
- Preserves all document content and structural readability.

### 6.3 Mode 3: Force 1 Page Mode
- Activated when the user selects the explicit "Force 1 Page" toggle.
- Uses Forme's multi-pass layout calculation (`renderDocumentWithLayout`):
  1. **Pass 1:** Measure the document using Compact mode tokens.
  2. **Pass 2:** If total height exceeds 1 physical page ($841.89\text{ pt}$ for A4 portrait), calculate the vertical deficit:
     $$\text{Deficit} = H_{\text{total}} - H_{\text{usable\_page}}$$
  3. **Pass 3:** If deficit is within candidate threshold ($\le 120\text{ pt}$), progressively reduce margins (down to candidate floor $18\text{ pt}$), table row vertical padding (down to candidate floor $2\text{ pt}$), and font sizes (down to candidate floor $7\text{ pt}$).
- **Legibility Over Page Count (Non-Negotiable Core Principle):**
  - Force 1 Page must prioritize commercial legibility over achieving a single-page target.
  - The 7 pt typography floor and 2 pt row padding are provisional candidate targets requiring empirical readability testing before final approval.
  - The system must never silently omit line items, totals, VAT, bank details, or signatures to fit onto one page.
  - Bounding boxes must never overlap.
  - **Graceful Multi-Page Fallback:** If acceptable fitting cannot be achieved without violating legibility or safeguards, the system aborts single-page compaction and produces a clean, readable 2-page document with an explicit preview notice.

---

## 7. Selective Keep-Together Behavior & Oversized Table Rows

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
4. **Heading Orphan Mitigation:** Section headings should be kept with at least two lines of following body text where practical to prevent orphaned headings at page bottoms.
5. **Oversized Table Row Strategy:**
   - Ordinary table rows should remain intact across page boundaries where possible.
   - If an individual table row's content (e.g. extensive scope-of-work description) exceeds the remaining or total available page height, the layout engine must handle it safely to prevent clipping or silent content loss.
   - Natural internal fragmentation of the row across the page boundary is preferred if supported and empirically verified in Forme; otherwise, a controlled fallback (e.g., splitting multi-paragraph row descriptions across virtual sub-rows) must ensure no content is hidden or severed.

---

## 8. Adaptive Closing Sections

1. **Side-by-Side Presentation:** When remaining vertical page space $\ge H_{\text{closing}}$ and page width permits, Bank Details and Totals display side-by-side.
2. **Deliberate Readable Fallback:** When remaining space is insufficient to accommodate both blocks side-by-side:
   - Totals remain prioritized immediately beneath the line-item table on the primary page.
   - Bank Details adaptively stack below Totals or flow cleanly onto the continuation page.
3. **No Absolute Zero-Break Guarantee:** Closing sections must not be forced to fit artificially when content volume legitimately requires a page continuation. The goal is to eliminate avoidable premature breaks.
4. **Native Layout First:** No custom row-balancing algorithm will be introduced until empirical testing demonstrates that native Forme flex layout is insufficient.

---

## 9. 5-Step Rich-Text Conversion Pipeline

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

- **DOMPurify is a sanitization tool only:** It purifies HTML strings to prevent XSS; it does not convert HTML into Forme components.
- **Controlled Scope:** The initial implementation focuses exclusively on essential commercial formatting: inline `<b>`, `<strong>`, `<i>`, `<em>`, `<u>` and block `<ul>`, `<ol>`, `<li>`, `<p>`, `<br>`. Arbitrary CSS, tables, and scripts are stripped.
- **Mobile Compatibility:** The sanitization and parsing utilities must execute reliably across desktop and Capacitor mobile WebViews without Node.js dependencies.

---

## 10. Scoped Emoji Fallback Strategy

1. **Preserve Surrounding Text:** An emoji must never corrupt surrounding text or crash PDF generation.
2. **Small Justified Icon Set:** A small, curated set of monochrome vector SVG icons may be bundled for high-frequency commercial equipment symbols where business need is demonstrated.
3. **Safe Fallback:** Any emoji outside the small curated set is stripped cleanly from the rendered text stream or replaced with a safe neutral placeholder without interrupting document flow.
4. **No Blocker for Template 1:** Building an extensive emoji mapping library is explicitly **not** a prerequisite for building the initial Forme Invoice and Quotation templates.

---

## 11. Font & Image Asset Infrastructure (Consolidated M1B Specification)

### 11.1 TrueType Font Strategy
Forme strictly requires raw OpenType/TrueType SFNT streams (`.ttf` or `.otf`) and rejects WOFF/WOFF2:
1. **Four Core Families:** `Inter` (Commercial body), `Archivo Black` (Technical display headings), `Caveat` (Handwritten sign-offs), `Noto Sans` (Currency fallback).
2. **Static Binaries Only:** Variable fonts (e.g. `inter-var.ttf`) are prohibited in production due to Wasm static table parsing constraints.
3. **Dual-Runtime Resolution:** The single font registration authority ([`src/components/pdf/forme/fonts.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/pdf/forme/fonts.ts)) resolves filesystem paths (`public/fonts/*.ttf`) in Bun tests and public URLs (`/fonts/*.ttf`) in browser/WebView runtimes.
4. **Observable Fallback:** Unknown font requests emit diagnostic warnings and fall back to `Helvetica`. Silent mapping to `Inter` is prohibited.

### 11.2 Shared Font Infrastructure vs. Document-Specific Font Customization

A key architectural boundary must be maintained between **Shared Font Infrastructure** and **Document-Specific Font Customization**:

1. **Shared Font Infrastructure (Subsystem 5 / Forme Backend):**
   - Owns font asset procurement, file-system / URL resolution, static TrueType registration, and low-level typography primitives.
   - Provides baseline typographic stability across all eight document families (`Inter`, `Archivo Black`, `Noto Sans`).
   - Does **not** determine which fonts a user is allowed to pick for a given document type.

2. **Document-Specific Customization (Subsystem 3 / Customization Engine):**
   - Governs user-facing font selection, color selection, and layout options based on document family capabilities (`src/domain/pdf/customization/types.ts`).
   - Persists choices across `localStorage` and `company_profile` preset keys.
   - **Commercial Documents:** Consolidated to `Inter` for body, tables, labels, and standard headings, and `Archivo Black` for prominent display titles. Legacy saved font choices (Roboto, Lato, Montserrat, etc.) safely normalize to `Inter`. Single-choice font dropdowns are omitted from the UI to avoid redundant controls.
   - **Logistics & Service Documents (CSR & Waybill):** Standardized on `Caveat` as the sole supported handwriting-style font for fillable technician entries and driver signatures. All CSR and Waybill templates default to `Caveat`. Redundant single-choice handwriting font selectors are removed from the customization card, while ink color and template selection remain fully functional. Historical preferences referencing retired fonts (Patrick Hand, Handlee, etc.) safely normalize to `Caveat`.
   - For complete per-family asset mappings, weights, glyph requirements, and gap analyses, refer to the [Authoritative Font & Typography Customization Compatibility Matrix](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/functional-req.md#4-authoritative-font--typography-customization-compatibility-matrix).

### 11.3 Image and Media Resolution
1. **Canonical Source:** [`src/domain/documentMedia.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/documentMedia.ts) (`resolveCanonicalLogoUrl`) is the sole authority for branding URLs.
2. **CORS Reality:** Base64 conversion in client-side JavaScript does **not** bypass CORS. Browser `fetch()` must succeed before data URI conversion is possible.
3. **Deterministic 6-Step Decision Path:** Local bundled assets $\to$ cached data $\to$ remote fetch with CORS $\to$ remote fetch failure (graceful null fallback) $\to$ offline operation (text branding fallback) $\to$ missing data (null).
4. **Forme Explicit Dimensions:** Forme `<Image>` primitives must specify explicit numeric `width` and `height` props. CSS `objectFit` is not recognized by Forme's `Style` interface and causes compilation errors.
5. **No Server Proxy:** Server-side proxying is excluded from M1B pending security review.

---

## 12. Technical Capability Verification Status

We distinguish verified repository facts from capabilities requiring implementation-stage empirical verification:

| Capability / API | Target Claim | Verification Status | Verification Method & Source |
| :--- | :--- | :--- | :--- |
| **`renderDocumentWithLayout`** | Exports layout metadata with exact bounding boxes for two-pass measurement. | ✅ Verified in Package | Confirmed exported by `@formepdf/core` v0.20.1 in `node_modules`. |
| **`<Table>`, `<Row>`, `<Cell>`** | Native table primitives for tabular data. | ✅ Verified in Package | Confirmed exported by `@formepdf/react` v0.20.1 in `node_modules`. |
| **`<Fixed position="footer">`** | Native fixed footer positioning. | ✅ Verified in Package | Exported by `@formepdf/react` v0.20.1. Dynamic height reservation requires test suite verification. |
| **Repeating Header (`<Row header>`)** | Header automatically repeats on continuation pages. | ⏳ Implementation Verification | Prop exists in Forme schema; runtime multi-page repetition behavior must be validated. |
| **Native Hyperlinks (`<Image href="...">`)** | Direct link generation in PDF vector annotations. | ⏳ Implementation Verification | `<Link>` and `href` props exist; runtime PDF `/Annots` generation must be verified via MuPDF. |
| **Static TrueType Font Subsetting** | Font embedding of local `.ttf` files. | ⏳ Implementation Verification | `<Font>` exported; runtime subsetting of static Inter TTF and glyph coverage must be verified. |

---

## 13. Acceptance Criteria Across the 8 Document Families

A document family is certified for production deployment only when:
- New Forme templates are built, reviewed, and approved.
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
- Supplier-facing PO templates preserve procurement semantics and layout.
- RFQ preserves unpriced procurement semantics.
- Waybill preserves transport fields, item conditions, and signatures.
- Receipt preserves payment evidence and financial immutability.
- CSR preserves generator operational readings and independent Portrait/Landscape structures.
- `bun run typecheck` passes with zero errors.
- `bun run build` is not executed.
- No business logic or database queries exist inside rendering components.
