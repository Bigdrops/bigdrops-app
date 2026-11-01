# BOUXRE PDF Architecture Reconciliation & Migration Foundation

**Date:** 2026-10-31  
**Project:** BOUXRE (BIGDROPS App) — B2B Business Management Suite  
**Classification:** Core System Architecture Specification & Audit Reconciliation  
**Status:** Completed Architecture Specification (Strictly Read-Only Investigation)  
**Deliverable File:** `docs/reports/pdf/pdf-architecture-reconciliation-and-migration-foundation.md`  
**Writing Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Executive Architecture Decision

### 1.1 Architectural Position
BOUXRE requires a modern, deterministic PDF generation and delivery architecture that serves all active document types while eliminating the premature page breaks, WinAnsi character corruptions, and fragmented delivery pipelines of the legacy React-PDF implementation.

The target architecture is established as:
1. **Canonical Data & Business Layer:** Domain-owned, renderer-neutral document preparation contracts. Business math, tax rules, and document lifecycle are strictly isolated from presentation.
2. **Document Registration & Resolution Authority:** The Master Deterministic Template Resolver (`src/domain/pdf/resolver/`), responsible for template discovery, data validation, and envelope construction.
3. **Presentation & Design System:** `pdfcn` presentation primitives (`src/components/pdf/pdfcn/primitives.tsx`) and the PDF Customization Engine (`src/domain/pdf/customization/`), managing design tokens, capability gating, and user styling preferences.
4. **Rendering Backend:** **Forme** (`@formepdf/core` and `@formepdf/react` v0.20.1), providing WebAssembly layout computation, native table header repetition, dynamic footer reservation, and coordinate inspection.
5. **Universal Delivery & Feedback Layer:** `src/lib/pdf/` (`CompositePdfDelivery`, `WebPdfDelivery`, `NativePdfDelivery`, and `DefaultFeedbackBus`), providing unified Web download, Capacitor mobile persistence, and UI events.

### 1.2 Does a Central Authority Exist Today?
**No single central authority governs the existing PDF system.**

The previous audit documented a fragmented system. This reconciliation clarifies the specific roles:
- The **Master PDFCN Resolver (`src/domain/pdf/resolver/`)** is currently a **template registration and document resolution authority** for the Forme pipeline. It does **not** own fonts, branding assets, page geometry, or delivery.
- The **PDF Customization Resolver (`src/domain/pdf/customization/resolver.ts`)** is a **presentation policy and styling authority**. It governs user customization sockets (accent colors, fonts, handwriting options), not template resolution or file generation.
- The **PDF Delivery Subsystem (`src/lib/pdf/CompositePdfDelivery.ts`)** is the **file persistence and delivery authority**. It is bypassed by 5 of the 8 document types.

### 1.3 What Must Become Authoritative vs. What Remains Independent
- **Centralized Infrastructure:**
  - Font binary management and embedding (`public/fonts/`).
  - Master template registry and envelope typing (`src/domain/pdf/resolver/`).
  - Delivery pipeline (`src/lib/pdf/CompositePdfDelivery.ts`).
  - Customization policy gating (`src/domain/pdf/customization/`).
  - Common presentation primitives (Forme `<Table>`, `<Row>`, `<Cell>`, `<Fixed>`, `<Text>`, `<View>`).
- **Independently Owned:**
  - **Canonical Data Models:** Each document domain owns its data structure, calculations, and validation rules.
  - **Document Family Semantics:** Commercial documents, Procurement requests, Logistics waybills, and Field Service reports have distinct operational purposes and must retain independent layout structures.
  - **Templates:** Individual visual templates retain their unique visual identity and must never be collapsed into a monolithic conditional renderer.

---

## 2. Current Architecture and Evidence

### 2.1 Component Mapping & Ownership

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DOCUMENT DOMAINS                                     │
│  Invoice (previewModel.ts)         Quotation (previewModel.ts)   PO (purchaseOrderService)│
│  CPS (viewData.ts)                 RFQ (normalize.ts)            Waybill (assembly.ts)    │
│  Receipt (previewModel.ts)         CSR (prepareCsrDocument.ts)                            │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             CUSTOMIZATION & RESOLUTION                                 │
│  src/domain/pdf/customization/resolver.ts   ──► Resolves accent/fonts from user settings│
│  src/domain/pdf/resolver/registry.ts        ──► Resolves template & builds envelope   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
┌──────────────────────────────────────────┐  ┌──────────────────────────────────────────┐
│          LEGACY REACT-PDF PATH           │  │             FORME / PDFCN PATH           │
│  src/components/pdf/renderers/PdfRenderer│  │  src/components/pdf/pdfcn/adapter.ts    │
│  @react-pdf/renderer (v4.3.2)            │  │  @formepdf/react & @formepdf/core v0.20.1│
│  WOFF Font Registry (pdfFontRegistry.ts) │  │  Static TTF / ArchivoBlack-Regular.ttf   │
└────────────────────┬─────────────────────┘  └────────────────────┬─────────────────────┘
                     │                                             │
                     └──────────────────────┬──────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DELIVERY & PERSISTENCE                                    │
│  CompositePdfDelivery (WebPdfDelivery / NativePdfDelivery) ◄── Consistently used by 3 │
│  downloadPdfFromElement / exportPdfToDevice.ts             ◄── Bypassed by 5 docs     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Duplicated and Bypassed Execution Paths
Repository inspection confirms multiple generation and delivery bypasses:
1. **Invoice & Quotation:** Route through `src/components/pdf/index.ts` (`generatePdf` $\to$ `DefaultPdfGenerator` $\to$ `CompositePdfDelivery`).
2. **Receipt:** Routes through `src/pages/ViewReceipt.tsx`, which independently instantiates `DefaultPdfGenerator` and `CompositePdfDelivery`, duplicating lines 122–148 of `src/components/pdf/index.ts`.
3. **Waybill & RFQ:** Route through `src/components/document-view/shared/downloadPdf.tsx` (`downloadPdfFromElement`), which bypasses `DefaultPdfGenerator` and invokes `exportPdfToDevice` directly with `pdf(element).toBlob()`.
4. **Blank Waybill:** In `src/components/waybill/blankWaybillTemplate.tsx#L305`, an independent Blob generator and browser download routine bypasses both `CompositePdfDelivery` and `downloadPdfFromElement`.
5. **Blank CSR:** In `src/pages/CsrFormPage.tsx#L435` and `#L572`, direct calls to `@react-pdf/renderer`'s `pdf().toBlob()` bypass all delivery abstractions.
6. **Project Documents (External PO/Receipt fallback):** In `src/pages/ProjectDocumentView.tsx#L84`, direct calls to `pdf().toBlob()` invoke local file saving.
7. **CPS Forme:** In `src/components/pdf/index.ts#L160` (`generateCpsFormePdf`), Forme's `renderDocument` is called directly, bypassing the master PDFCN adapter (`src/components/pdf/pdfcn/adapter.ts`).
8. **CSR Forme:** In `src/components/pdf/index.ts#L198` (`generateCsrPdfcnPdf`), Forme generates output through the master PDFCN adapter (`src/components/pdf/pdfcn/adapter.ts`).

---

## 3. Target Responsibility Boundaries

To prevent monolithic abstractions, the 8 core responsibilities are mapped to dedicated layers:

| Architectural Layer | Core Responsibility | Must Own | Must NOT Own | Target Codebase Location |
| :--- | :--- | :--- | :--- | :--- |
| **1. PDF Standards & Infrastructure** | Platform rules, measurement, font loading, geometry constants | Physical font assets (`.ttf`), Unicode filtering, A4 dimensions, safe margins | Document layouts, business calculations, database queries | `src/lib/pdf/`, `public/fonts/`, `docs/standard/` |
| **2. Canonical Document Preparation** | Renderer-neutral data transformation | Data mapping, locked totals formatting, entity validation | JSX, font families, page breaks, PDF rendering APIs | `src/domain/<docType>/`, `src/domain/pdf/resolver/<docType>/` |
| **3. Document Registration & Resolution** | Deterministic template discovery and dispatch | Template lookup by `(docType, templateId)`, envelope construction | File saving, font registration, layout computation | `src/domain/pdf/resolver/` |
| **4. Customization & Policy** | User-selected visual styling | Accent color, font family selection, fillable ink options, template defaults | Document structure, financial math, tenant database state | `src/domain/pdf/customization/` |
| **5. pdfcn Presentation Layer** | Reusable UI design tokens and primitives | Forme component wrappers (`Table`, `Row`, `Cell`, `Text`, `Fixed`), border tokens, spacing scales | Business data rules, delivery mechanisms | `src/components/pdf/pdfcn/` |
| **6. Forme Rendering Engine** | Layout computation and vector output generation | Wasm layout execution (`renderDocumentWithLayout`), byte array output | Data fetching, database access, file persistence | `@formepdf/core`, `@formepdf/react` |
| **7. PDF Delivery & Diagnostics** | File persistence, platform dispatch, feedback | Web blob download, Capacitor native save/share, feedback bus events | Template JSX, layout rules, document contracts | `src/lib/pdf/CompositePdfDelivery.ts`, `DefaultFeedbackBus.ts` |
| **8. Document-Family Templates** | Visual arrangement of document content | Visual composition, column alignment, section arrangement, aesthetic identity | Tax math, file saving, device filesystem access | `src/components/pdf/pdfcn/<family>/` |

---

## 4. Eight-Document Status Matrix

| Document | Current Production Renderer | Forme Implementation Status | Canonical Prepared Contract | Resolver / Customization Registration | Delivery Path | Key Architectural Gaps | Recommended Next Step |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Invoice** | React-PDF (7 templates) | **Absent** (POC code in `docs/reports/pdf/poc/`) | **Present** (`buildInvoicePreviewModel`, `adaptCommercialDocumentData`) | Registered in Customization (`commercial.ts`); **Absent** in Master Resolver | `generateInvoicePdf` $\to$ `CompositePdfDelivery` | Closing block spill (`wrap={false}`); unwired compact overrides; WinAnsi glyph corruption. | Implement Forme Industry Invoice template after Quotation gate passes. |
| **2. Quotation** | React-PDF (7 templates) | **Absent** (POC code in `docs/reports/pdf/poc/`) | **Present** (`buildQuotationPreviewModel`, `pdfDownloadHandler.ts`) | Registered in Customization (`commercial.ts`); **Absent** in Master Resolver | `generateQuotationPdf` $\to$ `CompositePdfDelivery` | Benchmark failure `SASQUO-000427 (1).pdf` (13 items, closing block spilled to Page 2); `SASQUO-000428.pdf` (prime symbol corruption). | **Gate 1 Benchmark Target:** Build Forme Industry Quotation and verify 1-page natural pagination. |
| **3. Purchase Order (PO)** | **Absent** in core module; Partial in `ProjectDocumentPDF.tsx` | **Absent** | **Absent** in core domain; Partial in `projectDocuments.ts` | **Absent** in both Customization and Master Resolver | `ProjectDocumentView.tsx` calls `pdf().toBlob()` | Outgoing supplier-facing document has NO dedicated PDF generation, preview model, or customization support. | Author canonical supplier-facing PO contract and build Forme PO template. |
| **4. Cost Pricing Sheet (CPS)** | Forme active; legacy React-PDF fallback | **Present** (`LedgerCpsDocument`, `CpsIndustryDocument`) | **Present** (`buildCpsFormeModel` in `pdfDownloadHandler.ts`) | Registered in Customization (`cps.ts`); **Absent** in Master Resolver | Custom `generateCpsFormePdf` $\to$ `CompositePdfDelivery` | Font loader falls back to Helvetica due to `.woff` incompatibility; bypasses master PDFCN resolver. | Migrate CPS into master resolver and align font loading with static TTF store. |
| **5. Request for Quotation (RFQ)** | React-PDF (`TableDocumentPdfDocument.tsx`) | **Absent** | **Partial** (`normalizeDbRfq`, inline row mapping) | **Absent** in both Customization and Master Resolver | `downloadPdfFromElement` $\to$ `exportPdfToDevice` | Unpriced procurement document uses legacy table renderer; hardcoded column widths; bypasses delivery bus. | Define canonical RFQ contract; port to Forme using shared table primitives. |
| **6. Waybill** | React-PDF (6 templates + Blank) | **Absent** | **Present** (`buildWaybillRenderModel` in `assembly.ts`) | Registered in Customization (`waybill.ts`); **Absent** in Master Resolver | `downloadPdfFromElement`; Blank waybill calls `pdf().toBlob()` | Logistics goods schedule uses isolated table math; duplicate Blob generation in blank template. | Migrate Waybill into master resolver; port Evergreen and Minimal templates to Forme. |
| **7. Receipt** | React-PDF (`ReceiptPdf.tsx`) | **Absent** | **Present** (`buildReceiptPreviewData` in `previewModel.ts`) | **Absent** in Customization; **Absent** in Master Resolver | Local `DefaultPdfGenerator` $\to$ `CompositePdfDelivery` | Payment receipt uses local inline styles; bypasses customization engine; lacks multi-template options. | Register Receipt in customization engine; port standalone template to Forme. |
| **8. Customer Service Report (CSR)** | React-PDF (3 legacy templates); Forme qualified | **Qualified** (`CsrLandscapeBlueprint`, `CsrPortraitReference`) | **Present** (`prepareCsrDocument.ts` conforming to `csrPreparedContract.ts`) | Registered in Customization (`csr.ts`); **Fully Registered** in Master Resolver | Dual dispatch in `ViewCSR.tsx`: PDFCN $\to$ Forme adapter $\to$ `CompositePdfDelivery` | **Production Ready:** Verified with 10 passing tests. Remaining work is UI preview integration and certification. | Formalize visual certification; complete UI preview panel integration. |

---

## 5. Shared Infrastructure vs. Document-Specific Structure

### 5.1 Genuinely Shared Infrastructure
The following capabilities are universal across all 8 document types:
1. **Static Font Assets & Registration:** Physical TrueType (`.ttf`) font files loaded into Forme's `Font.register` runtime.
2. **Tenant Branding & Image Resolution:** `resolveCanonicalLogoUrl()` and `toDataUri()` conversion for safe local rendering.
3. **Safe Text & Unicode Sanitization:** `safeText()` string conversion and character filtering.
4. **Page Container & Geometry Primitives:** A4 page bounding box (`595.28 × 841.89 pt` portrait, `841.89 × 595.28 pt` landscape), baseline padding scales (`[20, 20, 20, 20]`), and orientation configuration.
5. **Forme Layout Elements:** Forme `<Table>`, `<Row>`, `<Cell>`, `<Row header>`, and `<Fixed>`.
6. **File Persistence & Delivery:** `CompositePdfDelivery` supporting browser download and Capacitor Android/iOS native file saving.
7. **Feedback & Telemetry Bus:** `DefaultFeedbackBus` emitting download lifecycle events (`download:start`, `download:success`, `download:fail`).

### 5.2 Document-Specific Structures (Preserving Independence)
Common infrastructure must **never** force distinct document types into identical layouts:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UNIVERSAL FORME INFRASTRUCTURE                  │
│       Font Loading  •  Image Handling  •  Geometry  •  Delivery        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ Commercial Docs  │       │ Logistics Docs   │       │ Technical / CSR  │
│ (Inv, Quo, PO,   │       │ (Waybill)        │       │ (Field Service)  │
│  CPS, Receipt)   │       │                  │       │                  │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ • Buyer / Seller │       │ • Consignor /    │       │ • Engineering    │
│   Two-Party Card │       │   Consignee Card │       │   Identity Block │
│ • Financial Table│       │ • Package & Unit │       │ • Adaptive 1-4   │
│   (Price, VAT,   │       │   Schedule       │       │   Column Parts   │
│   Discounts)     │       │ • Transporter &  │       │ • Gauge Readings │
│ • Bank & Totals  │       │   Vehicle Strip  │       │   (V, A, Hz, Bar)│
│   Closing Box    │       │ • Goods Received │       │ • Dual Engineer/ │
│ • Payment Terms  │       │   Sign-Off       │       │   Client Sign-off│
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

#### Rejection of a Monolithic "Universal Forme Table"
The proposal to create a single "Universal Forme Table" is **rejected**.
- **Commercial Tables (Invoice/Quotation/PO/CPS):** Require currency columns, right-aligned monetary values, multi-level group headers, group subtotals, and discount/VAT calculations.
- **Procurement Tables (RFQ):** Require specification text blocks, make/brand compliance checkmarks, and requested units, with zero pricing columns.
- **Logistics Tables (Waybill):** Require package counts, shipment descriptions, condition remarks, and received quantities.
- **Technical Tables (CSR):** Require content-aware multi-column adaptation (1 column for 1–4 items, 2 columns for 5–8 items, 4 columns for 9+ items) to fit operational parts lists on a single page.

**Architectural Rule:** Documents share the low-level primitive `<Table>`, `<Row>`, and `<Cell>`, but each document family defines its own column configuration, cell formatting, and layout calculation.

#### Rejection of Unverified Family Overlap Metrics
The previous audit cited approximate structural overlap percentages (80–90%, 50%, 35%, 20%). Repository inspection confirms these were informal visual estimates, not code-analyzed AST metrics. In this specification, document families are categorized by their **functional and semantic boundaries**, not by unverified percentages.

---

## 6. Font and Rendering Evidence

### 6.1 Verified Physical Reality in Repository
A comprehensive search for font files across `public/`, `src/`, and `docs/` reveals:

```
Physical Font Files Present in Repository:
1. public/fonts/ArchivoBlack-Regular.ttf                 (90,988 bytes)
2. docs/reports/pdf/poc/assets/inter-var.ttf            (876,576 bytes)
3. src/assets/pdf-fonts/Caveat-Bold.woff                (62,180 bytes)
4. src/assets/pdf-fonts/Caveat-Regular.woff             (60,108 bytes)
5. src/assets/pdf-fonts/Handlee-Regular.woff            (20,568 bytes)
6. src/assets/pdf-fonts/Kalam-Bold.woff                 (16,584 bytes)
7. src/assets/pdf-fonts/Kalam-Regular.woff              (17,668 bytes)
8. src/assets/pdf-fonts/PatrickHand-Regular.woff        (17,652 bytes)
9. src/assets/pdf-fonts/ReenieBeanie-Regular.woff       (21,444 bytes)
10. src/assets/pdf-fonts/SueEllenFrancisco-Regular.woff (15,780 bytes)
```

### 6.2 Key Font Findings & Constraints
1. **Forme Rejects WOFF Files:** In `src/components/pdf/forme/fonts.ts#L5`, `FORME_SUPPORTED_FONT_EXTENSIONS = ['.ttf', '.otf']`. Forme cannot load WOFF files. When given a WOFF font from `@fontsource`, it falls back to Helvetica.
2. **Missing TTF Assets:** `public/fonts/` contains **only ArchivoBlack-Regular.ttf**. It does **not** contain TrueType binaries for:
   - `Inter-Regular.ttf`, `Inter-Bold.ttf`, `Inter-Italic.ttf` (Primary document copy).
   - `Caveat-Regular.ttf` (Fillable handwriting).
   - `NotoSans-Regular.ttf` (Supplementary currency glyphs).
3. **Variable Font Incompatibility:** `docs/reports/pdf/poc/assets/inter-var.ttf` is a variable font (`876 KB`). Forme's underlying OpenType parser requires standard static TrueType fonts, not variable font tables.
4. **License & Glyph Verification:**
   - `Archivo Black` is verified under SIL Open Font License (`public/fonts/ArchivoBlack-OFL.txt`).
   - Sourcing static TTF binaries with verified OFL licenses for Inter, Caveat, and Noto Sans is an **absolute blocker** for Milestone M1.

---

## 7. Migration Roadmap

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 0: Baseline & Hygiene Reconciliation (CURRENT)                             │
│ • Reconcile G-01 & G-06 working tree state (relocate reference PDFs)             │
│ • Lock architecture specification (this document)                                │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Shared Infrastructure & Font Store (M1)                                 │
│ • Deploy static TTF fonts to public/fonts/ (Inter, Caveat, Noto Sans)            │
│ • Build universal Forme font registry supporting Node/Bun and Browser            │
│ • Unify Forme generation entry points into generatePdfcnDocument()               │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Quotation Natural-Pagination Gate (M2 - HARD GATE)                      │
│ • Implement Forme Industry Quotation Template                                    │
│ • Verify SASQUO-000427 (1).pdf renders on EXACTLY 1 page in Normal Mode          │
│ • Verify SASQUO-000428.pdf prime symbols render without corruption               │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Commercial Template Rollout & Intelligent Density (M3)                  │
│ • Port Invoice Industry, Ledger, and Crest templates to Forme                    │
│ • Implement two-pass inspection for Compact & Force 1 Page modes                 │
│ • Implement outgoing Supplier-facing Purchase Order (PO) Forme template          │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Remaining Document Family Migrations (M4)                               │
│ • Migrate CPS into Master Resolver (unify with PDFCN adapter)                    │
│ • Port Waybill (Evergreen, Minimal) to Forme                                     │
│ • Port Receipt & RFQ to Forme                                                    │
│ • Formalize production certification for qualified CSR templates                 │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Visual Certification & React-PDF Retirement (M5)                        │
│ • 100% Visual regression testing across representative document corpus           │
│ • Switch production routing to Forme across all view pages                       │
│ • Remove @react-pdf/renderer from package.json                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Reconciling Prerequisites Baseline Hygiene (G-01 & G-06)
- **Previous Finding:** The previous audit assumed M0 was 100% complete.
- **Repository Evidence:** In `git status`, test reference PDFs were moved from `docs/templates/ref-invquo/` to `docs/templates/html-temps/invoice-templates/ref-invquo/`, leaving deletions and untracked files.
- **Reconciliation:** Before M1 implementation begins, working-tree hygiene must be completed by restoring or updating the canonical path of the reference test corpus so that Gate G-01 ("Clean working tree") and Gate G-06 ("Reference corpus exists") pass demonstrably.

### 7.2 CSR and CPS Classification
- **CSR:** Forme templates (`CsrLandscapeBlueprintTemplate`, `CsrPortraitReferenceTemplate`) are **already qualified** and tested with 10 passing tests in `pdfcnMasterResolver.test.js`. CSR is not a future migration; its remaining work is UI preview synchronization and final visual certification.
- **CPS:** Already implemented in Forme (`LedgerCpsDocument`, `CpsIndustryDocument`). Its remaining work is **infrastructure alignment**: moving its registration into `src/domain/pdf/resolver/registry.ts` and updating its font loader to use the shared static TTF store.

---

## 8. M1 Acceptance Criteria

Before any document migration (Milestone M2) is authorized, Milestone M1 must satisfy these verifiable acceptance criteria:

1. **Clear Ownership & Boundaries:**
   - `src/domain/pdf/resolver/` manages template definitions, validation, and envelope construction.
   - `src/domain/pdf/customization/` manages user preferences and policy gating.
   - `src/lib/pdf/` manages file generation and delivery.
2. **Renderer-Neutral Contract Requirements:**
   - Every document family defines an explicit, typed prepared contract (`TPrepared`) containing all display values. Templates do not perform calculations or database queries.
3. **Static Font Store:**
   - Static TrueType (`.ttf`) files placed in `public/fonts/`:
     - `Inter-Regular.ttf`, `Inter-Bold.ttf`, `Inter-Italic.ttf`
     - `ArchivoBlack-Regular.ttf`
     - `Caveat-Regular.ttf`
     - `NotoSans-Regular.ttf`
   - All font files must include valid OFL license text files in the same directory.
4. **Universal Forme Font Loader:**
   - An updated `src/components/pdf/forme/fonts.ts` that successfully registers TrueType fonts in both browser environments (`/fonts/*.ttf`) and Node/Bun test environments (`public/fonts/*.ttf`), with zero fallback to Helvetica for supported fonts.
5. **Branding & Image Resolution:**
   - Universal utility pre-fetching remote image URLs and returning base64 data URIs or local assets, preventing CORS errors during canvas rendering.
6. **Geometry & Envelope Configuration:**
   - Canonical `PdfcnPageConfig` enforcing A4 dimensions (`595.28 × 841.89 pt` portrait, `841.89 × 595.28 pt` landscape) and standard margin boxes.
7. **Pagination & Measurement Primitives:**
   - Availability of Forme's `<Fixed position="footer">` and `<Fixed position="header">` across all template bases.
   - Validation that `renderDocumentWithLayout` returns element coordinate trees in Node/Bun tests.
8. **Unified Generation & Delivery Entry Point:**
   - A single function `generatePdfcnDocument(envelope, element, options)` replacing separate `generateCpsFormePdf` and `generateCsrPdfcnPdf` implementations.
   - Guarantees that all generation routes through `CompositePdfDelivery` and emits `DefaultFeedbackBus` events.
9. **Diagnostics & Error Boundaries:**
   - Clear stage-tagged errors (`init`, `prepare`, `render`, `bytes`, `delivery`) providing actionable error messages on failure.
10. **Customization Engine Compatibility:**
    - Seamless mapping between `ResolvedPdfCustomization` and template style props without modifying existing localStorage keys.
11. **Verification Gate:**
    - 100% pass rate on an updated `src/tests/critical/pdfcnMasterResolver.test.js` validating the unified font, resolver, and delivery pipeline.

---

## 9. Unresolved Questions and Risks

| Unresolved Issue / Risk | Nature of the Issue | Required Evidence to Settle | Architectural Impact if Left Unresolved |
| :--- | :--- | :--- | :--- |
| **1. Mobile Font Bundling in Capacitor** | Asset packaging for offline mobile export | Verify whether Capacitor 8 webview resolves `/fonts/*.ttf` via local asset loader or requires base64 binary embedding. | Native mobile exports could fail offline or render with system fallback fonts on Android/iOS. |
| **2. Multi-Page Wasm Layout Memory Footprint** | Host environment constraint (4GB RAM) | Profile memory usage of `@formepdf/core` `renderDocumentWithLayout` during a 20-page document layout test in Bun. | Long document exports could exhaust host memory if layout trees are retained excessively. |
| **3. Purchase Order Business Contract** | Domain requirements definition | Review requirements with product leads on required PO fields (delivery address, vendor contact, procurement terms). | Risk of building an incomplete PO template that fails real-world procurement workflows. |
| **4. Reference Test Corpus File Moves** | Working tree hygiene (G-01/G-06) | Inspect why reference PDFs were moved into `html-temps` and decide on their permanent canonical location. | Test automation cannot reliably anchor visual regressions if reference files have unstable paths. |

---

## 10. Final Architecture Recommendation

### 10.1 Coherent Target Architecture
- **Preserve:**
  - The Master Deterministic Resolver (`src/domain/pdf/resolver/`).
  - The PDF Customization Engine (`src/domain/pdf/customization/`).
  - The Composite Delivery Subsystem (`src/lib/pdf/CompositePdfDelivery.ts`).
  - Qualified Forme CSR templates and working Forme CPS templates.
  - Domain-owned canonical data preparation.
- **Consolidate:**
  - Font loading into a single static TrueType store (`public/fonts/`).
  - All Forme generation into `generatePdfcnDocument()`.
  - All file downloads through `CompositePdfDelivery`.
- **Extend:**
  - Master Resolver to register Commercial (Quotation, Invoice, PO), Logistics (Waybill), and Procurement (RFQ) templates.
  - Customization Engine to include Purchase Order, RFQ, and Receipt.
- **Defer:**
  - Compact Mode and Force 1 Page heuristics until **Natural Pagination Gate 1** passes on `SASQUO-000427`.
  - Deprecation of `@react-pdf/renderer` until all 8 document families are certified.

### 10.2 Safest Next Task
**Do not proceed directly to document migration.**

The immediate next task must be:
**"Milestone M1 — Shared Infrastructure, Static Font Store & Baseline Hygiene Reconciliation"**
1. Reconcile G-01 and G-06 working-tree status by restoring the canonical reference test corpus in `docs/templates/ref-invquo/`.
2. Deploy verified static TrueType font files (`Inter`, `Caveat`, `Noto Sans`) and license files to `public/fonts/`.
3. Update `src/components/pdf/forme/fonts.ts` to load static TTF assets reliably across browser and Node/Bun test runtimes.
4. Unify Forme generation under a single adapter entry point in `src/components/pdf/pdfcn/adapter.ts`.
5. Verify with automated tests before opening Milestone M2 (Quotation Natural-Pagination Gate).

---

## 11. Audit Integrity & Git Status

### 11.1 Baseline vs. Final Git State
- **Baseline Git Status Recorded:** Pre-existing uncommitted modifications were present in `docs/prd/pdf-rendering-migration/Readme.md`, deleted test files in `docs/templates/ref-invquo/`, and untracked files in `docs/templates/html-temps/invoice-templates/` and `docs/reports/`.
- **Modifications Attributable to This Task:** Exactly **one** new file was created:
  `docs/reports/pdf/pdf-architecture-reconciliation-and-migration-foundation.md`.
- **Zero Application Code Changes:** No source code, tests, configuration, dependencies, or existing reports were modified during this turn.
- **Strict Read-Only Execution:** Neither `bun run build`, `bun run typecheck`, `bun test`, nor `bun run audit:load` were executed.
