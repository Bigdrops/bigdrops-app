# 01 — Functional Requirements & Document Coverage Matrix

- **Status:** AUTHORITATIVE SPECIFICATION & FUNCTIONAL REQUIREMENTS
- **Architecture:** Forme Engine (`@formepdf/react` & `@formepdf/core` v0.20.1) + `pdfcn` Presentation Layer
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Scope:** Eight In-Scope Document Types (Invoice, Quotation, PO, CPS, RFQ, Waybill, Receipt, CSR). BOQ Excluded.

---

## 1. Document Coverage Matrix

The following matrix records the exact architectural state, current backend, and migration requirements for all eight in-scope document families:

| Document Type | Family Group | Current Backend | Existing Templates & Status | Canonical Preparation Status | Resolver & Customization Status | Shared Infrastructure Requirements | Remaining Migration Work | Certification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Invoice** (`invoice`) | Commercial (AR) | Forme (`@formepdf/react`) + React-PDF (`@react-pdf/renderer`) | 4 retained commercial templates: `Industry` (selectable as `Industry — Forme` and `Industry — React-PDF`), `Minimal` (React-PDF), `Evergreen` (React-PDF), `Crest` (React-PDF). Retired templates (`Ledger`, `Bolt`, `Ember`) deleted. | ✅ Complete (`src/domain/invoice/previewModel.ts`, `prepareDocumentModel.ts`). | Commercial customization active (`src/domain/pdf/customization/commercial.ts`). Integrated with Master Resolver. | Static Inter TTF, Archivo Black, Noto Sans, media resolver, Forme primitives, delivery. | Dual-renderer selectable in picker (`Industry — Forme` vs `Industry — React-PDF`); retired templates deleted. | 🔄 Active Migration (Dual-Renderer Comparison Active) |
| **Quotation** (`quotation`) | Commercial (Sales) | Forme (`@formepdf/react`) + React-PDF | Shares commercial templates (`Industry — Forme` primary, `Industry — React-PDF` comparison, `Minimal`, `Evergreen`, `Crest` React-PDF). Active production. | ✅ Complete (`src/domain/quotation/previewModel.ts`, `prepareDocumentModel.ts`). | Commercial customization active. Integrated with Master Resolver. | Static Inter TTF, Archivo Black, Noto Sans, media resolver, Forme primitives, delivery. | Dual-renderer selectable in picker (`Industry — Forme` vs `Industry — React-PDF`); retired templates deleted. | 🔄 Active Migration (Dual-Renderer Comparison Active) |
| **Purchase Order** (`po`) | Commercial (AP / Supplier) | Print / Form View (`PurchaseOrderDetail.tsx`, `SharedDocumentForm.tsx`) | Existing PO layout and form descriptors active in application. Dedicated PDF template pending. | ⚠️ **Incomplete / Missing** (`preparePurchaseOrderDocument.ts` required; domain math exists in `calculations.ts`). | Needs commercial customization integration. | Shared commercial fonts (Inter TTF), vendor media resolution, diagnostics, Forme primitives, delivery. | Implement dedicated canonical preparation contract (`preparePurchaseOrderDocument.ts`); build supplier-facing Forme PO template; integrate with master resolver. | ⛔ Blocked on Canonical Preparation |
| **Cost Pricing Sheet** (`cps`) | Commercial / Costing | Forme (`@formepdf/react`) | 2 Forme templates (`CpsIndustryDocument.tsx`, `LedgerCpsDocument.tsx`). | ✅ Complete (`src/domain/cps/pdfDownloadHandler.ts`). | Direct Forme call. Not integrated into Master Resolver. | Requires M1B static TTF fonts to eliminate silent Helvetica fallback defect. | Fix font loader (`src/components/pdf/forme/fonts.ts`); connect to Master Deterministic Resolver; integrate with `CompositePdfDelivery`. | 🛠️ Corrected (Template exists; blocked on font fix) |
| **Request for Quotation** (`rfq`) | Procurement | React-PDF | `TableDocumentPdfDocument.tsx`. Active production. | ✅ Complete (Unpriced procurement table data). | Basic preset. | Static Inter TTF, table layout primitives, delivery. | Build Forme RFQ template preserving unpriced procurement semantics; integrate with master resolver and delivery. | ⛔ Pending Forme Implementation |
| **Waybill** (`waybill`) | Logistics | React-PDF | 6 templates (`evergreen`, `minimal`, `thermal`, `classic`, `premium`, `slate`). Active production. | ✅ Complete (`src/components/waybill/waybillUtils.ts`). | Customization engine adoption complete (`waybill-pdf-customization-engine-adoption.md`). | Requires Caveat script TTF font for handwritten signatures, logistics primitives, delivery. | Build Forme Waybill templates; bundle `Caveat-Regular.ttf` and `Caveat-Bold.ttf`; integrate with master resolver and delivery. | ⛔ Pending Forme Implementation |
| **Receipt** (`receipt`) | Accounting | React-PDF | `ReceiptPdf.tsx`. Active production. | ✅ Complete (`src/domain/receipt/previewModel.ts`, snapshot builder). | Basic preset (`getDefaultPdfDesignPreset('receipt')`). | Static Inter TTF, currency glyph (`₦`), delivery. | Build Forme Receipt template; enforce strict financial immutability; integrate with master resolver and delivery. | ⛔ Pending Forme Implementation |
| **Customer Service Report** (`csr`) | Technical / Service | React-PDF (legacy) + Forme (new) | 2 Forme templates implemented: `CsrPortraitReferenceDocument.tsx` and `CsrBlueprintLandscapeDocument.tsx`. | ✅ Complete (`src/domain/pdf/resolver/csr/prepareCsrDocument.ts`, `csrPreparedContract.ts`). | Fully integrated into Master Resolver (`src/domain/pdf/resolver/index.ts`). | `ArchivoBlack-Regular.ttf` (active), `Caveat` script TTF, field engineering layout. | Finalize customization picker scrollbar discoverability; physical on-device print testing; connect to `CompositePdfDelivery`. | 🔄 Advanced (Templates ready; pending delivery) |

---

## 2. Document-Family Functional Requirements

### 🧾 FR-1A: Commercial Invoice Requirements (`invoice`)
- **Business Role:** Outgoing legally-binding billing demand sent to a customer (Accounts Receivable).
- **Mandatory Content:**
  1. Company identity (Name, RC/CAC, TIN, Corporate Address, Contact).
  2. Client identity ("Bill To", Contact, Address, TIN).
  3. Invoice Number, Issue Date, Due Date, Payment Terms.
  4. Project reference and optional customer PO number.
  5. Multi-column item table (Description, Make, Quantity, Unit, Unit Price, Amount).
  6. Financial calculations (Subtotal, Subtotal Discount, VAT @ 7.5%, Extra Charges, Withholding Tax deduction, Total Due, Balance Due).
  7. Amount in Words prominently formatted under totals.
  8. Mandatory receiving bank details (Bank Name, Account Name, Account Number, Sort Code).
  9. Authorized sign-off and company stamp.

### 🧾 FR-1B: Commercial Quotation Requirements (`quotation`)
- **Business Role:** Outgoing commercial offer and sales estimate submitted to a client.
- **Mandatory Content:**
  1. Quotation Number, Issue Date, Validity Period ("Valid Until").
  2. Client identity ("Bill To", Address, Attention).
  3. Commercial scope of materials/works with multi-tier item groups.
  4. Financial calculations (Subtotal, Discounts, VAT, Total, Withholding Tax estimate).
  5. Optional receiving bank accounts.
  6. Commercial terms, warranty notes, payment milestones, delivery schedule.
  7. Client acceptance signature and date block.

### 🧾 FR-1C: Purchase Order Requirements (`po` / `purchase_order`)
- **Business Role:** Outgoing procurement contract sent to a vendor/supplier authorizing expenditure (Accounts Payable).
- **Mandatory Content & Structural Rules:**
  1. **Supplier-Facing Orientation:** Header prominently displays "PURCHASE ORDER" and issuer as the **Buyer**. Counterparty is **Order From · Supplier / Vendor** (`supplier_name`, supplier contact, supplier address).
  2. **PO Semantics:** PO Number (`po_number`), PO Date (`po_date`), Procurement Payment Terms.
  3. **Procurement Pricing:** Column headers must display **Unit Cost** (`unit_cost`), never "Unit Price". Line amounts reflect procurement expenditure.
  4. **Flat Line Items:** PO line items are flat procurement lines; they do not use client sales groupings.
  5. **No Receiving Bank Details:** The issuing company is paying, not receiving funds. Bank receiving blocks are strictly hidden.
  6. **No Withholding Tax Deduction:** WHT deductions do not appear on outgoing purchase commitments.
  7. **Procurement Authorizations:** Signature block provides Buyer Purchasing Officer and Management Authorization sign-offs.
  8. **Preservation of Existing Templates:** PO has its own layout and supplier-facing fields. It must not be replaced by a generic invoice template.
  9. **Canonical Preparation Gap:** The dedicated preparation contract `preparePurchaseOrderDocument.ts` must be implemented before Forme rendering integration (Milestone M1C).

### 🧾 FR-11: Cost Pricing Sheet Requirements (`cps`)
- **Business Role:** Detailed internal and client-facing engineering cost estimation and schedule.
- **Requirements:**
  1. Dense schedule layout supporting multi-level item categorization and line-item notes.
  2. Elimination of the silent Helvetica fallback bug by linking CPS templates to M1B static TrueType fonts.
  3. Integration into the Master Deterministic Resolver and `CompositePdfDelivery`.

### 🧾 FR-12: Request for Quotation Requirements (`rfq`)
- **Business Role:** Procurement bidding inquiry sent to multiple vendors to request pricing.
- **Requirements:**
  1. Detailed technical specifications, quantities, units, and delivery requirements.
  2. **Unpriced Semantics:** Pricing columns, subtotals, tax rows, and totals must be omitted from the table layout. RFQ must never be reduced to an invoice with prices hidden.
  3. Submission deadline and vendor response instructions.

### 🧾 FR-13: Waybill Logistics Requirements (`waybill`)
- **Business Role:** Delivery manifest accompanying goods in transit.
- **Requirements:**
  1. Dispatch metadata: Waybill Number, Date, Time, Transport Mode, Driver Name, Vehicle Number.
  2. Sender and receiver corporate details.
  3. Item schedule recording Description, Quantity, Unit, Condition (Good / Damaged / Partial), and custom tracking columns.
  4. Physical signature blocks for Dispatcher and Receiver, supporting `Caveat` script font for simulated pen completion or clean blank lines for physical sign-off.

### 🧾 FR-14: Receipt Requirements (`receipt`)
- **Business Role:** Legal proof of payment acknowledging receipt of funds against an invoice.
- **Requirements:**
  1. Receipt Number, Payment Date, Linked Invoice Number, Payment Method (Transfer, Cash, POS), Transaction Reference.
  2. Received Amount displayed in bold figures and complete words.
  3. Issuer details and payer details.
  4. Strict financial immutability; rendering template must never modify transaction values.

### 🧾 FR-15: Customer Service Report Requirements (`csr`)
- **Business Role:** Technical engineering service report recording generator maintenance and field operations.
- **Requirements:**
  1. Service provider and client corporate details.
  2. Diesel generator technical specifications (Generator Model, Engine Serial Number, Alternator Serial Number, KVA Rating).
  3. Operational readings table (Voltage, Frequency, Battery Vdc, Temperature °C, Pressure, Engine Hours).
  4. Parts and materials replaced schedule with adaptive column partitioning.
  5. Independent **Portrait Reference** (`Archivo Black` headings) and **Blueprint Landscape** (technical grid) templates.

---

## 3. Shared PDF Infrastructure Requirements

### 🧾 FR-1: Natural Pagination & Adaptive Closing Layout
- **Priority:** Must Have (Gate 1 Requirement)
- **Acceptance Criteria:**
  1. **Efficient Space Utilization:** The document engine must place content onto the current page until remaining usable height is less than the height of the next single indivisible element.
  2. **Adaptive Closing Layout:** Bank Details and Totals must not be locked into an indivisible container (`wrap={false}`):
     - When vertical space permits, Bank Details and Totals render side-by-side.
     - When vertical space is restricted, Totals stay attached to line items on the primary page, while Bank Details adaptively stack or move to the continuation page.
  3. **Calibrated Column Widths:** Table column widths must allocate sufficient space for common data values. The candidate target for the `make` column is at least **72 pt** (subject to empirical testing) to eliminate 2-line wraps for `"Atlas Copco"`.
  4. **Clean Table Row Pagination & Oversized Row Strategy:**
     - Ordinary table rows remain intact across page boundaries where possible.
     - For oversized rows exceeding available page height, the layout engine must handle content safely (natural internal fragmentation or virtual sub-row splitting) to prevent clipping or silent content loss.
  5. **Repeating Table Headers:** When a table spans multiple pages, `<Row header>` must repeat automatically at the top of every continuation page.
  6. **Dynamic Footer Reservation:** Forme `<Fixed position="footer">` dynamically reserves exact measured footer height. Defensive global page padding (`paddingBottom: 48`) is removed.
  7. **Selective Keep-Together Rules:**
     - Small logical units (signature blocks, single table rows) are protected using `wrap={false}`.
     - Long sections (commercial terms, notes, attachments) fragment naturally across pages.

---

### 🧾 FR-2: Compact Presentation Mode
- **Priority:** Must Have
- **Acceptance Criteria:**
  1. **Consistent Candidate Token Application:** When `density: 'compact'` is selected, the template must apply all 32 candidate styling overrides (margins from 36 pt to 24 pt, row padding from 6 pt to 3 pt, body font from 9 pt to 8 pt).
  2. **Content Preservation:** Compact mode must never hide, truncate, or omit line items, totals, VAT, bank details, or signatures.

---

### 🧾 FR-3: Force 1 Page Mode
- **Priority:** Must Have
- **Acceptance Criteria:**
  1. **Two-Pass Layout Measurement:** Uses Forme's `renderDocumentWithLayout` to measure actual rendered height.
  2. **Progressive Compaction Execution:** Pass 1 (Compact tokens) $\to$ Pass 2 (Margins down to candidate floor 18 pt, row padding down to candidate floor 2 pt) $\to$ Pass 3 (Typography down to candidate floor 7 pt).
  3. **Legibility-First Safeguard:** Candidate floors (7 pt font, 2 pt padding) are provisional targets subject to readability testing. The system must never drop content or allow bounding boxes to overlap to force a 1-page fit.
  4. **Graceful Multi-Page Fallback:** If a document exceeds single-page limits after safe compaction, the engine aborts 1-page mode and outputs a clean, readable 2-page document with an in-app notice.

---

### 🧾 FR-4: First-Class Landscape Orientation
- **Priority:** Must Have
- **Acceptance Criteria:**
  1. **Geometric Recalculation:** All widths, heights, margins, and column budgets recalculate from first principles for A4 Landscape ($297 \times 210\text{ mm}$).
  2. **No Transform Hacks:** The engine must not use CSS rotation, canvas rotation, or PDF matrix transform workarounds.
  3. **Table Width Budgeting:** Tables expand to consume full landscape printable width ($841.89\text{ pt}$ minus margins).

---

### 🧾 FR-5: Interactive Hyperlinks & Image Geometry
- **Priority:** Must Have
- **Acceptance Criteria:**
  1. **Direct Image Links:** Forme `<Image href="https://...">` elements output native PDF `/Annots` objects with `/Subtype /Link`.
  2. **Coordinate Overlays:** Absolutely positioned `<View href="...">` elements generate clickable hot-spots matching exact bounding boxes.
  3. **Forme Explicit Dimensions:** Image primitives must specify explicit numeric `width` and `height` props. CSS `objectFit` is not recognized by Forme's `Style` interface and causes compilation errors.
  4. **Aspect Ratio Preservation:** Image containers preserve natural proportions via explicit width/height constraints or flex wrappers.

---

### 🧾 FR-6: Unicode & Read-Only Glyph Diagnostics
- **Priority:** Must Have
- **Acceptance Criteria:**
  1. **Text Preservation Rule:** User input text passes through to rendering unmodified. Automated sanitizers that strip emojis, rewrite primes, or delete characters are prohibited.
  2. **Read-Only Glyph Diagnostics:** A diagnostic utility inspects text strings against target font character maps, reporting unmapped glyphs via structured telemetry without mutating document content.
  3. **Double-Prime & Prime Rendering:** Primes (`U+2032`, `U+2033`) render accurately from fonts containing these glyphs. Hex serialization into digits (`23`, `33`, `43`) is permanently eliminated.
  4. **Nigerian Naira Symbol:** The Naira currency symbol (`₦`, `U+20A6`) is supported in all monetary cells via static TrueType font embedding or vector SVG glyph fallback.
  5. **Engineering Symbols:** Squared (`²`, `U+00B2`), multiplication (`×`, `U+00D7`), degree (`°`, `U+00B0`), and plus-minus (`±`, `U+00B1`) render cleanly.
  6. **Scoped Emoji Fallback:** Surrounding text is preserved 100%. Supported business symbols map to small curated monochrome SVG icons; unmapped emojis strip safely from text runs without crashing.

---

### 🧾 FR-7: 5-Step Rich-Text Conversion Pipeline
- **Priority:** Should Have
- **Acceptance Criteria:**
  1. **Structured Pipeline:**
     1. *Sanitize:* Incoming HTML sanitized via DOMPurify with strict allowlist.
     2. *Parse:* Sanitized content parsed into an intermediate tree.
     3. *Convert:* Permitted nodes mapped into an allowlisted document AST.
     4. *Render:* AST rendered using Forme primitives (`<Text>`, `<Strong>`, `<Em>`, `<UnorderedList>`, `<ListItem>`).
     5. *Fallback:* Unsupported or malformed nodes strip gracefully to plain text.
  2. **Scope Boundaries:** Strictly limited to commercial basics (inline `<b>`, `<strong>`, `<i>`, `<em>`, `<u>` and block `<ul>`, `<ol>`, `<li>`, `<p>`, `<br>`). Arbitrary CSS, tables, and scripts are stripped.

---

### 🧾 FR-8: Font Asset Infrastructure (M1B Specification)
- **Priority:** Must Have
- **Acceptance Criteria:**
  1. **Static TrueType Binaries Only:** Forme requires uncompressed `.ttf` or `.otf` files. WOFF/WOFF2 and variable fonts are prohibited in production.
  2. **Core Typographic Families:** `Inter` (Regular, Bold), `Archivo Black` (Regular), `Caveat` (Regular, Bold), `Noto Sans` (Regular).
  3. **Single Font Authority:** [`src/components/pdf/forme/fonts.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/pdf/forme/fonts.ts) remains the sole font registration authority.
  4. **Dual-Runtime Resolution:** Resolves filesystem paths (`public/fonts/*.ttf`) in Bun CLI tests and public URLs (`/fonts/*.ttf`) in browser/Capacitor runtimes.
  5. **Observable Fallback:** Unknown font requests emit diagnostic warnings and fall back to `Helvetica`. Silent mapping to `Inter` is prohibited.

---

### 🧾 FR-9: Image & Media Resolution (M1B Specification)
- **Priority:** Must Have
- **Acceptance Criteria:**
  1. **Canonical Source:** [`src/domain/documentMedia.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/documentMedia.ts) (`resolveCanonicalLogoUrl`) is the sole authority for branding URLs.
  2. **CORS & Base64 Reality:** Client-side base64 encoding does not bypass CORS. Browser `fetch()` must succeed before data URI conversion is possible.
  3. **Deterministic 6-Step Decision Path:** Local bundled assets $\to$ cached data $\to$ remote fetch with CORS $\to$ remote fetch failure (graceful null fallback) $\to$ offline operation (text branding fallback) $\to$ missing data (null).
  4. **No Unauthenticated Server Proxy:** Server-side proxying is excluded from M1B pending security review.
  5. **Non-Throwing Media Resolution:** Media loading failures must emit diagnostics and return `null`, never crashing document generation.

---

### 🧾 FR-10: Renderer Independence & Calculation Immutability
- **Priority:** Must Have
- **Acceptance Criteria:**
  1. **Model Decoupling:** Prepared document models must not import Forme, React-PDF, or PDF styling primitives.
  2. **Zero In-Renderer Calculations:** Templates receive final calculated numbers. No financial math (subtotals, taxes, discounts, totals) may occur inside rendering components.

---

### 🧾 FR-16: Pre-Production Approval & Progressive Migration
- **Priority:** Must Have
- **Acceptance Criteria:**
  1. **Pre-Production Approval:** Forme templates must pass all test plan suites before production cutover.
  2. **Progressive Rollout:** Document families migrate sequentially without disrupting active operations.

---

## 4. Authoritative Font & Typography Customization Compatibility Matrix

This matrix records the approved and consolidated 4-family shared typography foundation (`Inter`, `Archivo Black`, `Caveat`, `Noto Sans`) across all eight in-scope document families:

| Document Family | Group | Current Rendering Backend | Font Files & Formats Currently Used | Selectable Customization Options | Persistence Keys & Storage | Required Weights & Styles | Critical Glyph Requirements | Consolidated Typography Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Invoice** (`invoice`) | Commercial (AR) | React-PDF (`@react-pdf/renderer` v4.5.1) | `.woff` via `@fontsource/inter` in `src/lib/pdfSharedFonts.ts`. | Document font (`Inter`), accent color, density, Force 1 Page. | `DESIGN_PRESET_KEYS.INVOICE` in `company_profile` / localStorage. | Regular (400), Bold (700). | Naira `₦` (`U+20A6`), double-prime `″` (`U+2033`), single-prime `′` (`U+2032`), quotes, dashes. | 🟢 **CONSOLIDATED:** Primary document typography standardized on `Inter`. Naira `₦` and primes fully covered. Historical commercial preferences safely normalize to `Inter`. |
| **Quotation** (`quotation`) | Commercial (Sales) | React-PDF | Shares commercial font assets from `src/lib/pdfSharedFonts.ts`. | Document font (`Inter`), accent color, density, Force 1 Page. | `DESIGN_PRESET_KEYS.QUOTATION` in `company_profile` / localStorage. | Regular (400), Bold (700). | Naira `₦` (`U+20A6`), double-prime `″` (`U+2033`), engineering units (`²`, `×`, `±`, `°`). | 🟢 **CONSOLIDATED:** Standardized on `Inter`. Sizing and layout identical to invoice. |
| **Purchase Order** (`po`) | Commercial (AP) | Print / Form View | System fonts / web font stack (`Inter`, sans-serif). | Commercial capabilities (`accentColor: true`). Dedicated preset key pending. | Profile settings / localStorage. | Regular (400), Bold (700). | Naira `₦` (`U+20A6`), procurement numbers, primes (`″`). | 🟢 **CONSOLIDATED:** Supplier-facing PO standardizes on `Inter` (Regular and Bold). |
| **Cost Pricing Sheet** (`cps`) | Commercial / Costing | Forme (`@formepdf/react` v0.20.1) | Forme static font loader (`src/components/pdf/forme/fonts.ts`). | Commercial capabilities (`accentColor: true`, `density: true`). | `DESIGN_PRESET_KEYS.CPS` in `company_profile` / localStorage. | Regular (400), Bold (700). | Naira `₦` (`U+20A6`), dense tabular numbers, multiplication (`×`), dimensions. | 🟢 **CONSOLIDATED:** Standardized on `Inter` with observable font diagnostics. Eliminates silent Helvetica fallback defect. |
| **Request for Quotation** (`rfq`) | Procurement | React-PDF | React-PDF standard fonts + `Inter` table stack. | Fixed typography (`documentFont: false`, `handwritingFont: false`). | Basic preset. | Regular (400), Bold (700). | Engineering units, unpriced item quantities, dimensions (`″`). | 🟢 **CONSOLIDATED:** Standardized on `Inter`. |
| **Waybill** (`waybill`) | Logistics | React-PDF | `Caveat-Regular.woff` & `Caveat-Bold.woff` in `src/assets/pdf-fonts/`. | Handwriting color (Ink Color). Sole handwriting font: `Caveat`. Document font: `Inter`. | `DESIGN_PRESET_KEYS.WAYBILL` in `company_profile` / localStorage. | Regular (400), Bold (700). | Signatures, dispatch timestamps, transport notes, Latin alphanumeric. | 🟢 **CONSOLIDATED:** Sole handwriting font is `Caveat`. Redundant font-family selector removed from customization card. Retired fonts normalize to `Caveat`. |
| **Receipt** (`receipt`) | Accounting | React-PDF | `Inter` body font + `Noto Sans` for currency. | Fixed typography (`documentFont: false`, `handwritingFont: false`). | `DESIGN_PRESET_KEYS.RECEIPT` in `company_profile` / localStorage. | Regular (400), Bold (700). | Naira `₦` (`U+20A6`), bold transaction figures, legal payment text. | 🟢 **CONSOLIDATED:** `Inter` body font with `Noto Sans` currency fallback. |
| **Customer Service Report** (`csr`) | Technical / Service | Forme (new) + React-PDF (legacy) | `ArchivoBlack-Regular.ttf` in `public/fonts/`; `Caveat` (.woff in React-PDF / .ttf in Forme target). | Sole handwriting font: `Caveat`. Ink color override. Display font: `Archivo Black`. Body font: `Inter`. | `csr_view_template`, `csr_custom_color_stash`, `csr_modal_settings`. | Black Display (900), Regular (400), Bold (700), Script (400/700). | Technical metrics (`Vdc`, `Hz`, `kVA`, `°C`, `bar`, `hrs`), generator serial numbers, handwriting script for technician field entries. | 🟢 **CONSOLIDATED:** Active Forme and legacy templates default to `Caveat`. Retired fonts (`Patrick Hand`, `Handlee`, etc.) removed from production and safely normalize to `Caveat`. Redundant handwriting selector removed. |

### 4.1 Consolidated Handwriting System (CSR & Waybill)

1. **Caveat Standard:**
   `Caveat` is the sole supported handwriting-style font across the BOUXRE platform. All template defaults in CSR (`csr-blueprint-landscape`, `csr-reference-portrait`, template 3, 6, 8) and Waybill default to `Caveat`.
2. **Retirement of Redundant Handwriting Families:**
   `Patrick Hand`, `Handlee`, `Kalam`, `Reenie Beanie`, and `Sue Ellen Francisco` are retired from production. Obsolete `.woff` binaries in `src/assets/pdf-fonts/` have been removed after verifying zero remaining consumers.
3. **Customization Card Simplification:**
   Because `Caveat` is the sole handwriting option, the redundant handwriting font selector is removed from `DocumentCustomizeCard.tsx`, avoiding a single-choice dropdown while preserving ink color, template picker, and other customization capabilities.
4. **Safe Backward-Compatibility Normalization:**
   Any legacy user preferences stored in `localStorage` with retired font names automatically normalize to `Caveat` in the customization resolver and preset sanitizers.

### 4.2 Primary Document Typography Strategy

1. **Inter Standard:**
   `Inter` (Regular 400, Bold 700) is the sole primary document typography family for body text, tables, labels, and general headings across commercial, procurement, logistics, and service documents.
2. **Display Typography:**
   `Archivo Black` is the sole display typography family, used for prominent document titles and headings in CSR Portrait Reference.
3. **Glyph Coverage & Defense-in-Depth:**
   `Noto Sans` serves as the locked currency fallback for the Nigerian Naira symbol (`₦`, `U+20A6`) and non-Latin character sets.
