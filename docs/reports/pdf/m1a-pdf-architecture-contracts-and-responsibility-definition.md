# M1A — PDF Architecture Contracts and Responsibility Definition

**Date:** 2026-10-31  
**Project:** BOUXRE (BIGDROPS App) — B2B Business Management Suite  
**Classification:** Architecture Contract Specification  
**Status:** Complete Specification (Strictly Read-Only Investigation)  
**Deliverable File:** `docs/reports/pdf/m1a-pdf-architecture-contracts-and-responsibility-definition.md`  
**Writing Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Executive Contract Decision

### 1.1 Purpose of Milestone M1A
This document defines the formal architectural contracts and interface boundaries for the BOUXRE PDF system. Following the completion of the PDF Architecture Audit and Reconciliation, Milestone M1A converts approved high-level principles into exact, implementation-ready contracts across the entire document lifecycle.

### 1.2 Implemented Boundaries vs. Recommended Extensions
Repository inspection confirms that several core architectural boundaries already exist in partial form, while others currently exist only as recommendations:

| Boundary / Subsystem | Current Implementation Status in Repository | Reconciled M1A Contract Decision |
| :--- | :--- | :--- |
| **Canonical Data Preparation** | **Implemented** across domain packages (`invoice`, `quotation`, `waybill`, `cps`, `receipt`, `csr`). Core PO lacks a dedicated builder. | **Preserve & Standardize:** Document domains retain 100% ownership of business math, validation, and data extraction. PO canonical contract defined. |
| **Master Deterministic Resolver** | **Implemented for CSR** in `src/domain/pdf/resolver/` (`registry.ts`, `types.ts`). | **Preserve & Extend:** Keep the resolver as a deterministic template registry and envelope builder. Extend `PdfcnDocumentType` to all 8 document types. Prevent resolver from owning fonts or delivery. |
| **PDF Customization Engine** | **Implemented for 5/8 docs** in `src/domain/pdf/customization/` (`resolver.ts`, `hooks.ts`, `commercial.ts`, `waybill.ts`, `csr.ts`, `cps.ts`). | **Preserve & Isolate:** Retain pure merge logic (`Capabilities`, `Policy`, `Defaults`, `User Settings`). Do not turn it into a template registry. Extend coverage to PO, RFQ, and Receipt. |
| **pdfcn Presentation Primitives** | **Implemented** in `src/components/pdf/pdfcn/primitives.tsx` (`Document`, `Page`, `View`, `Text`, `Table`, `Row`, `Cell`, `Fixed`, `Svg`, `mergeStyles`). | **Preserve & Adopt Universally:** Reusable presentation tokens and layout wrappers around Forme. Prohibit business logic and delivery code. |
| **Forme Rendering Engine** | **Installed and Active** (`@formepdf/react` and `@formepdf/core` v0.20.1) in CPS (`src/components/pdf/forme/`) and CSR (`src/components/pdf/pdfcn/csr/`). | **Preserve:** Forme executes Wasm layout computation and vector PDF generation. It does not fetch data or save files. |
| **PDF Generation Adapter** | **Fragmented:** Split between `src/components/pdf/pdfcn/adapter.ts` (CSR) and `src/components/pdf/index.ts#L160` (CPS). | **Consolidate (Proposed for M1C):** Establish a single, type-safe generation entry point `generatePdfcnDocument(envelope, element, options)`. |
| **Composite Delivery Subsystem** | **Implemented** in `src/lib/pdf/CompositePdfDelivery.ts`, but bypassed by 5 of 8 document types. | **Consolidate (Proposed for M1C):** Enforce that all document exports terminate at `CompositePdfDelivery`. Eliminate manual `pdf().toBlob()` calls in page components. |
| **Diagnostics & Error Tracing** | **Fragmented:** Three separate error classes (`PdfcnRenderError`, `CpsPdfStageError`, `CpsPdfPipelineError`). | **Standardize (Proposed for M1C):** Introduce a single stage-tagged error model (`PdfPipelineError`) tracking failure across the 7 lifecycle stages. |

### 1.3 System Readiness
The existing codebase **cannot** support the unified lifecycle without implementation changes. However, all required architectural foundations already exist as working code in isolated areas:
- The master template registry in `src/domain/pdf/resolver/registry.ts` already implements the registration and resolution pattern used by CSR.
- The Forme adapter in `src/components/pdf/pdfcn/adapter.ts` already converts Forme React trees into raw bytes and standard Blobs.
- `CompositePdfDelivery` in `src/lib/pdf/CompositePdfDelivery.ts` already handles platform-specific web downloads and native Capacitor file saving.

The work of M1 is not to invent a new architecture from scratch, but to formalize the contracts that connect these existing pieces and eliminate legacy bypasses.

---

## 2. Verified Current-State Architecture

### 2.1 Concrete Repository Tracing by Layer

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. CANONICAL PREPARATION LAYER (Domain-Owned)                                           │
│  • Invoice:   src/domain/invoice/previewModel.ts (buildInvoicePreviewModel)             │
│  • Quotation: src/domain/quotation/previewModel.ts (buildQuotationPreviewModel)         │
│  • CPS:       src/domain/cps/pdfDownloadHandler.ts (buildCpsFormeModel)                 │
│  • Waybill:   src/domain/waybill/engine/assembly.ts (buildWaybillRenderModel)           │
│  • Receipt:   src/domain/receipt/previewModel.ts (buildReceiptPreviewData)              │
│  • CSR:       src/domain/pdf/resolver/csr/prepareCsrDocument.ts (prepareCsrDocument)   │
│  • RFQ:       Inline mapping in src/components/rfq/RfqPdfDocument.tsx (mapItemsToRows)  │
│  • PO:        NO DEDICATED PREPARATION in src/modules/purchase-order/                   │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. CUSTOMIZATION RESOLUTION LAYER (src/domain/pdf/customization/)                       │
│  • Pure Resolver:   resolver.ts (resolveSettings, resolvePdfCustomization, resolveFull) │
│  • Document Sockets: commercial.ts, waybill.ts, csr.ts, cps.ts                          │
│  • Persistence:     localStorage keys 'bigdrops_pdf_customization_<family>'             │
│  • Gaps:            PO, RFQ, and Receipt are absent from customization domains          │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. MASTER TEMPLATE RESOLVER LAYER (src/domain/pdf/resolver/)                            │
│  • Registry:        registry.ts (registerPdfcnTemplate, getPdfcnTemplate, resolve...)   │
│  • Envelope:        types.ts (PdfcnDocumentEnvelope, PdfcnPageConfig, PdfcnTemplateDef) │
│  • Active Scope:    CSR templates registered only; Invoice/Quotation/Waybill not yet    │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. PRESENTATION & RENDERING ADAPTER LAYER                                               │
│  • Primitives:      src/components/pdf/pdfcn/primitives.tsx (Forme wrappers)           │
│  • CSR Adapter:     src/components/pdf/pdfcn/adapter.ts (renderPdfcnToBytes/Blob)       │
│  • CPS Adapter:     src/components/pdf/index.ts#L160 (generateCpsFormePdf) [DUPLICATE]  │
│  • React-PDF:       src/components/pdf/renderers/PdfRenderer.tsx [LEGACY]               │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 5. DELIVERY & DIAGNOSTICS LAYER                                                         │
│  • Central Delivery: src/lib/pdf/CompositePdfDelivery.ts (WebPdfDelivery / Native)     │
│  • Feedback Bus:     src/lib/pdf/DefaultFeedbackBus.ts (DefaultFeedbackBus.emit)       │
│  • Bypasses:         downloadPdfFromElement (Waybill, RFQ), direct pdf().toBlob()       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Concrete Bypasses and Duplicate Responsibilities
1. **Duplicate Forme Byte Generation:**
   - `src/components/pdf/pdfcn/adapter.ts` renders Forme elements to bytes and wraps them into `PdfAsset` for CSR.
   - `src/components/pdf/index.ts#L160` (`generateCpsFormePdf`) independently imports `@formepdf/core/browser`, calls `renderDocument`, checks byte arrays, and invokes `CompositePdfDelivery` for CPS.
2. **Delivery Bypasses:**
   - Waybill (`src/pages/ViewWaybill.tsx#L288`) and RFQ (`src/pages/ViewRfq.tsx#L120`) use `downloadPdfFromElement` (`src/components/document-view/shared/downloadPdf.tsx`), which calls `@react-pdf/renderer`'s `pdf(element).toBlob()` directly and invokes `exportPdfToDevice` without routing through `CompositePdfDelivery`.
   - Blank Waybill (`src/components/waybill/blankWaybillTemplate.tsx#L305`) generates a Blob directly and calls `window.URL.createObjectURL` manually.
   - Blank CSR (`src/pages/CsrFormPage.tsx#L435` and `#L572`) calls `@react-pdf/renderer`'s `pdf(element).toBlob()` directly.
3. **Fragmented Diagnostics:**
   - Errors in commercial documents throw raw `Error` strings.
   - Errors in CPS throw `CpsPdfStageError` or `CpsPdfPipelineError`.
   - Errors in Forme CSR throw `PdfcnRenderError`.

---

## 3. Target PDF Lifecycle Contract

The unified lifecycle consists of 8 strictly ordered stages. Each stage has a single owner, clear input/output contracts, and explicit constraints:

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE 8 LIFECYCLE STAGES                                    │
│                                                                                           │
│  Stage 1: Canonical Data Preparation        (Domain Packages)                             │
│     │                                                                                     │
│     ▼                                                                                     │
│  Stage 2: Customization & Policy Resolution (src/domain/pdf/customization/)               │
│     │                                                                                     │
│     ▼                                                                                     │
│  Stage 3: Deterministic Template Resolution (src/domain/pdf/resolver/registry.ts)         │
│     │                                                                                     │
│     ▼                                                                                     │
│  Stage 4: Rendering Envelope Construction   (src/domain/pdf/resolver/types.ts)            │
│     │                                                                                     │
│     ▼                                                                                     │
│  Stage 5: Template Presentation Composition (src/components/pdf/pdfcn/<docType>/)         │
│     │                                                                                     │
│     ▼                                                                                     │
│  Stage 6: Forme Layout & Byte Generation    (src/components/pdf/pdfcn/adapter.ts)         │
│     │                                                                                     │
│     ▼                                                                                     │
│  Stage 7: Platform Delivery & Persistence   (src/lib/pdf/CompositePdfDelivery.ts)        │
│     │                                                                                     │
│     ▼                                                                                     │
│  Stage 8: Feedback & Diagnostics Dispatch   (src/lib/pdf/DefaultFeedbackBus.ts)           │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Stage Specifications

| Stage | Responsible Layer | Input Contract | Output Contract | Permitted Operations | Prohibited Operations | Downstream Consumer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Preparation** | Document Domain (`src/domain/<docType>/`) | Raw database records, tenant settings, company profile | Canonical Prepared Model (`TPrepared`) | Business math, tax calculations, formatting numbers to strings, field normalization | No JSX, no styling, no font selection, no database mutations | Stage 2 & Stage 3 |
| **2. Customization** | PDF Customization Engine (`src/domain/pdf/customization/`) | User settings, Template Capabilities, Document Policy, Defaults | `ResolvedPdfCustomization` | Pure merge logic, capability gating, fallback resolution | No database queries, no template registration, no layout calculation | Stage 3 (via options) |
| **3. Resolution** | Master Resolver (`src/domain/pdf/resolver/`) | `(documentType, templateId, rawDocument, options)` | `PdfcnTemplateDefinition` | Template lookup by composite key, validation execution | No font loading, no file persistence, no rendering | Stage 4 |
| **4. Envelope** | Master Resolver (`src/domain/pdf/resolver/`) | Prepared Data (`TPrepared`), `PdfcnPageConfig`, metadata | `PdfcnDocumentEnvelope<TPrepared>` | Packaging validated data with page geometry and metadata | No modification of prepared data | Stage 5 |
| **5. Presentation** | Template Component (`src/components/pdf/pdfcn/`) | `PdfcnDocumentEnvelope<TPrepared>` | React Element (Forme JSX tree) | Composing UI using `pdfcn` primitives, applying resolved customization colors/fonts | No financial recalculations, no database queries, no download calls | Stage 6 |
| **6. Rendering** | PDFCN Adapter (`src/components/pdf/pdfcn/adapter.ts`) | React Element | `Uint8Array` (raw PDF bytes) | Invoking Forme Wasm `renderDocument` or `renderDocumentWithLayout`, byte verification | No UI popups, no direct disk writes | Stage 7 |
| **7. Delivery** | Delivery Subsystem (`src/lib/pdf/`) | `PdfAsset` (`blob`, `filename`, `documentType`, `metadata`) | `PdfDeliveryResult` (`success`, `uri`, `path`, `error`) | Web blob URL download, Capacitor Filesystem write, system share/open | No template rendering, no data alteration | Stage 8 |
| **8. Diagnostics** | Feedback Bus (`src/lib/pdf/DefaultFeedbackBus.ts`) | `PdfFeedbackEvent` or `PdfPipelineError` | UI toast / Event emission | Emitting events (`created`, `downloaded`, `failed`) | No blocking errors, no retry loops | UI Layer |

---

## 4. Resolver Contract (`src/domain/pdf/resolver/`)

### 4.1 Explicit Ownership
The Master Resolver is **strictly a template discovery, validation, and envelope construction authority**.
- **It MUST own:**
  - Registration of document types and template identifiers.
  - Deterministic lookup of templates via normalized keys (`documentType:templateId`).
  - Validation of prepared data against document-family rules.
  - Assembly of the immutable `PdfcnDocumentEnvelope`.
- **It MUST NOT own:**
  - Font loading or font binary registration.
  - Physical file persistence or delivery.
  - Business math, currency formatting, or tax logic.
  - User customization persistence or settings dialogs.

### 4.2 Handling Missing Templates and Validation Failures
The resolver must behave deterministically:
1. **Unknown Document Type:** Return `{ success: false, error: 'Document type "<type>" is not registered.' }`.
2. **Unknown Template ID:** Return `{ success: false, error: 'Template "<id>" not found for document type "<type>". Available templates: ...' }`. Do not guess or silently switch templates.
3. **Validation Failure:** If `template.validate(prepared)` returns `{ valid: false, errors: [...] }`, the resolver must return `{ success: false, validationErrors: errors }` and halt rendering before Forme execution.

---

## 5. Customization Contract (`src/domain/pdf/customization/`)

### 5.1 Explicit Ownership
The Customization Engine is **strictly a visual preference and policy resolution authority**.
- **It MUST own:**
  - Capability declarations (`PdfCustomizationCapabilities`: accent color, document font, handwriting font, handwriting color).
  - Document-level policy declarations (`PdfCustomizationPolicy`: master toggle switches per capability).
  - Template defaults (`PdfTemplateDefaults`: concrete fallback values).
  - Pure resolution logic (`resolveSettings`, `resolvePdfCustomization`, `resolveFull`).
  - LocalStorage persistence under existing keys (`bigdrops_pdf_customization_<family>`).
- **It MUST NOT own:**
  - Template registration or document resolution.
  - Page geometry or margin boxes.
  - Forme JSX generation.

### 5.2 Interaction with the Master Resolver
Customization resolution must occur **prior to or alongside** template resolution without creating circular dependencies:
1. The View page uses `usePdfCustomization(family, templateId)` to load user settings.
2. The resolved customization (`ResolvedPdfCustomization`) is passed into `resolvePdfcnDocument({ options: { customization } })`.
3. The resolver passes this customization into `template.render(envelope)`, where the template maps `customization.accentColor` and `customization.documentFont` onto presentation props.
4. Neither subsystem imports the other directly; they communicate through the generic `options` dictionary of `PdfcnResolutionRequest`.

---

## 6. Rendering Envelope and Adapter Contract

### 6.1 Envelope Structure
The `PdfcnDocumentEnvelope` is the single source of truth passed to every Forme template renderer:

```ts
export interface PdfcnDocumentEnvelope<TData = unknown> {
  readonly documentType: PdfcnDocumentType
  readonly templateId: string
  readonly templateVersion: string
  readonly pageConfig: PdfcnPageConfig
  readonly data: TData
  readonly customization?: ResolvedPdfCustomization
  readonly metadata: Record<string, unknown>
}
```

### 6.2 Adapter Responsibilities (`src/components/pdf/pdfcn/adapter.ts`)
The adapter coordinates rendering and delivery:
1. **`renderPdfcnToBytes(element: React.ReactElement): Promise<Uint8Array>`**
   - Dynamically resolves `@formepdf/core/browser` (in browser) or `@formepdf/core` (in Node/Bun).
   - Calls `renderDocument(element)` and validates that non-empty bytes are returned.
2. **`renderPdfcnToBlob(element: React.ReactElement): Promise<Blob>`**
   - Wraps the byte array into a standard `Blob([bytes], { type: 'application/pdf' })`.
3. **Proposed Unified Entry Point:**
   ```ts
   export async function generatePdfcnDocument<TData>(
     envelope: PdfcnDocumentEnvelope<TData>,
     element: React.ReactElement,
     options?: { deliver?: boolean; filename?: string }
   ): Promise<PdfcnGenerationResult>
   ```
   - Converts element to Blob.
   - Constructs a canonical `PdfAsset`.
   - If `options.deliver !== false`, calls `CompositePdfDelivery.deliver({ asset, mode: 'download' })`.
   - Emits lifecycle events via `DefaultFeedbackBus`.

---

## 7. pdfcn and Forme Presentation Contract

### 7.1 Responsibility Separation
- **`pdfcn` (Presentation / Design System):**
  - Defines the design vocabulary: spacing, typography scales, border weights, surface fills.
  - Implements reusable Forme wrappers: `src/components/pdf/pdfcn/primitives.tsx`.
  - Implements shared structural patterns: `BrandLogo` (vector SVG fallback), `SignatureStage` (blank line vs image artwork).
- **`Forme` (Rendering Engine):**
  - Executes Wasm layout pass (`renderDocumentWithLayout`).
  - Distributes table columns and repeats table headers (`<Row header>`).
  - Pins running headers and footers (`<Fixed position="footer">`).
  - Compiles vector graphic streams and embeds TrueType fonts.

### 7.2 Independent Document Families
Shared primitives do **not** force identical document layouts:
- **Commercial Documents (Invoice, Quotation, PO, CPS, Receipt):** Use two-party cards (`From` / `To`), financial tables with currency formatting, and closing totals blocks.
- **Logistics Documents (Waybill):** Use carrier strips, consignor/consignee blocks, package count schedules, and goods received sign-offs.
- **Technical Documents (CSR):** Use equipment identity headers, operational gauge reading strips, adaptive 1- to 4-column materials schedules, and technician commissioning blocks.

---

## 8. Delivery and Diagnostics Contract

### 8.1 Delivery Interface (`src/lib/pdf/CompositePdfDelivery.ts`)
The delivery subsystem accepts a canonical `PdfAsset`:
```ts
export type PdfAsset = {
  blob: Blob
  filename: string
  mimeType: string
  sizeBytes: number
  documentType: PdfDocumentType
  metadata: Record<string, unknown>
}
```
- **Web Runtime:** `WebPdfDelivery` triggers a standard browser anchor download (`<a download="...">`).
- **Capacitor Native Runtime:** `NativePdfDelivery` saves the file via `@capacitor/filesystem` into the user's `Documents` directory, then opens or shares the file via `@capacitor/share`.

### 8.2 Standardized Stage-Tagged Error Model
All pipeline failures must be wrapped into a standardized, stage-tagged error class:

```ts
export type PdfPipelineStage =
  | 'init'          // Engine or dependency initialization
  | 'prepare'       // Domain data extraction and calculation
  | 'customize'     // Policy and preference resolution
  | 'resolve'       // Template lookup and validation
  | 'render'        // React/Forme layout computation
  | 'bytes'         // Byte array and Blob generation
  | 'delivery'      // File persistence, download, or native save

export class PdfPipelineError extends Error {
  readonly stage: PdfPipelineStage
  readonly documentType: string
  readonly cause?: unknown

  constructor(stage: PdfPipelineStage, documentType: string, message: string, cause?: unknown) {
    super(`[PDF:${documentType}:${stage}] ${message}`)
    this.name = 'PdfPipelineError'
    this.stage = stage
    this.documentType = documentType
    this.cause = cause
  }
}
```

---

## 9. Eight-Document Contract Compatibility Matrix

| Document | Existing Prepared Contract | Existing Resolver Status | Existing Customization Status | Existing Template Status | Existing Delivery Path | Proposed Lifecycle Compatibility | Contract Gaps to Close |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Invoice** | `InvoicePdfModel` (`buildInvoicePreviewModel`) | Absent | Present (`commercial.ts`) | React-PDF (7 templates) | `generateInvoicePdf` $\to$ `CompositePdfDelivery` | **Compatible**: Data contract is complete and renderer-neutral. | Register in Master Resolver; implement Forme Industry template in M3. |
| **Quotation** | `QuotationPdfModel` (`buildQuotationPreviewModel`) | Absent | Present (`commercial.ts`) | React-PDF (7 templates) | `generateQuotationPdf` $\to$ `CompositePdfDelivery` | **Compatible**: Ready for Gate 1 benchmark. | Register in Master Resolver; implement Forme Industry template in M2. |
| **Purchase Order (PO)** | **Absent** in core domain; Partial in `projectDocuments.ts` | Absent | Absent | React-PDF fallback in `ProjectDocumentPDF.tsx` | Local `pdf().toBlob()` | **Incompatible**: Outgoing supplier contract missing. | Define `PurchaseOrderPdfModel` with supplier semantics; register in customization; implement Forme PO template in M3. |
| **Cost Pricing Sheet (CPS)** | `CpsPdfModel` (`buildCpsFormeModel`) | Absent | Present (`cps.ts`) | Forme (`LedgerCpsDocument`, `CpsIndustryDocument`) | Custom `generateCpsFormePdf` $\to$ `CompositePdfDelivery` | **Compatible**: Forme templates already exist. | Register in Master Resolver; unify generation path with PDFCN adapter in M4. |
| **RFQ** | Partial (`normalizeDbRfq`, inline row mapping) | Absent | Absent | React-PDF (`TableDocumentPdfDocument.tsx`) | `downloadPdfFromElement` | **Partially Compatible**: Table layout needs formal contract. | Define `RfqPdfModel` (unpriced specs); register in customization and Master Resolver in M4. |
| **Waybill** | `WaybillRenderModel` (`buildWaybillRenderModel`) | Absent | Present (`waybill.ts`) | React-PDF (6 templates + Blank) | `downloadPdfFromElement`; Blank calls `pdf().toBlob()` | **Compatible**: Data contract is well-typed. | Register in Master Resolver; consolidate blank waybill download path; port to Forme in M4. |
| **Receipt** | `ReceiptPreviewData` (`buildReceiptPreviewData`) | Absent | Absent | React-PDF (`ReceiptPdf.tsx`) | Local `DefaultPdfGenerator` $\to$ `CompositePdfDelivery` | **Compatible**: Single-page model is well-defined. | Register in Customization Engine and Master Resolver; port to Forme in M4. |
| **Customer Service Report (CSR)** | `CsrPreparedDocument` (`prepareCsrDocument.ts`) | **Fully Registered** | Present (`csr.ts`) | **Forme Qualified** (`CsrLandscapeBlueprint`, `CsrPortraitReference`) | `generateCsrPdfcnPdf` $\to$ `CompositePdfDelivery` | **Fully Compatible**: Reference implementation of target architecture. | Synchronize UI preview panel; complete final visual certification. |

---

## 10. Proposed TypeScript Contract Model

The following conceptual interfaces demonstrate the intended type-safe boundaries across the lifecycle:

```ts
// ============================================================================
// 1. DOCUMENT IDENTITY & TYPE ENUMERATION
// ============================================================================
export type PdfDocumentType =
  | 'invoice'
  | 'quotation'
  | 'purchase_order'
  | 'cps'
  | 'rfq'
  | 'waybill'
  | 'receipt'
  | 'csr'

// ============================================================================
// 2. PAGE GEOMETRY & CONFIGURATION
// ============================================================================
export type PdfPageOrientation = 'portrait' | 'landscape'

export interface PdfPageMarginBox {
  top: number
  right: number
  bottom: number
  left: number
}

export interface PdfPageConfig {
  size: 'A4'
  orientation: PdfPageOrientation
  margin: PdfPageMarginBox
  density?: 'comfortable' | 'compact' | 'tight'
}

// ============================================================================
// 3. RENDERING ENVELOPE (Passed to Templates)
// ============================================================================
export interface PdfcnDocumentEnvelope<TPreparedData> {
  readonly documentType: PdfDocumentType
  readonly templateId: string
  readonly templateVersion: string
  readonly pageConfig: PdfPageConfig
  readonly data: TPreparedData
  readonly customization?: ResolvedPdfCustomization
  readonly metadata: {
    readonly generatedAt: number
    readonly tenantId?: string
    readonly documentNumber: string
  }
}

// ============================================================================
// 4. TEMPLATE DEFINITION CONTRACT (Master Resolver Registry)
// ============================================================================
export interface PdfValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

export interface PdfTemplateDefinition<TRawData, TPreparedData> {
  readonly documentType: PdfDocumentType
  readonly templateId: string
  readonly templateName: string
  readonly templateVersion: string
  readonly defaultPageConfig: PdfPageConfig
  readonly prepare: (raw: TRawData, options?: Record<string, unknown>) => TPreparedData
  readonly validate: (prepared: TPreparedData) => PdfValidationResult
  readonly render: (envelope: PdfcnDocumentEnvelope<TPreparedData>) => React.ReactElement
}

// ============================================================================
// 5. UNIFIED GENERATION & DELIVERY CONTRACT
// ============================================================================
export interface PdfGenerationRequest<TRawData> {
  readonly documentType: PdfDocumentType
  readonly templateId: string
  readonly rawDocument: TRawData
  readonly filename?: string
  readonly options?: {
    readonly deliver?: boolean
    readonly deliveryMode?: 'download' | 'save' | 'open' | 'share'
    readonly customization?: ResolvedPdfCustomization
  }
}

export interface PdfGenerationResult {
  readonly status: 'generated'
  readonly filename: string
  readonly uri?: string
  readonly blob?: Blob
  readonly sizeBytes: number
}
```

---

## 11. Contract Dependencies and Implementation Order

The contracts defined in M1A govern the execution of subsequent work packages:

```
┌────────────────────────────────────────────────────────────────────────┐
│ M1A: Architecture Contracts & Responsibility Definition (THIS REPORT) │
│ • Established resolver, customization, envelope, and delivery contracts│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ M1B: Shared Font & Image Asset Infrastructure                          │
│ • Place static TTF font assets in public/fonts/ (Inter, Caveat, Noto)   │
│ • Settle CORS pre-fetching for remote images                           │
│ • Depends on: M1A Envelope & Presentation contracts                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ M1C: Generation & Delivery Consolidation                               │
│ • Implement generatePdfcnDocument() unifying CPS, CSR, and Delivery    │
│ • Introduce stage-tagged PdfPipelineError                              │
│ • Depends on: M1A Envelope, Adapter, and Delivery contracts            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ M1D: Baseline Hygiene & Test Corpus Reconciliation                     │
│ • Restore canonical test reference PDFs in docs/templates/ref-invquo/  │
│ • Settle Gates G-01 & G-06                                             │
│ • Depends on: M1A Eight-Document Matrix                                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ M2: Quotation Natural-Pagination Gate (HARD GATE)                      │
│ • Implement Forme Industry Quotation Template                          │
│ • Certify 1-page natural pagination on SASQUO-000427                   │
│ • Depends on: M1A, M1B, M1C, M1D fully verified                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 12. M1A Acceptance Criteria Checklist

- [x] Every architectural layer (Preparation, Resolution, Customization, Presentation, Rendering, Delivery, Diagnostics) has one distinct, non-overlapping responsibility.
- [x] Existing repository behavior is strictly distinguished from proposed target contracts.
- [x] The end-to-end 8-stage lifecycle is documented with explicit inputs, outputs, and permitted operations.
- [x] Resolver boundaries (`src/domain/pdf/resolver/`) and Customization boundaries (`src/domain/pdf/customization/`) are clearly defined without circular dependencies.
- [x] The envelope structure (`PdfcnDocumentEnvelope`) and generation adapter boundary are established.
- [x] `pdfcn` presentation primitives are kept strictly separate from Forme layout computation.
- [x] `CompositePdfDelivery` is confirmed as the universal file persistence and delivery authority.
- [x] All eight document types (Invoice, Quotation, PO, CPS, RFQ, Waybill, Receipt, CSR) are individually accounted for.
- [x] BOQ is explicitly excluded from scope.
- [x] Proposed TypeScript contracts are type-safe and avoid `any`.
- [x] Existing Forme implementations for CPS and CSR are preserved without unnecessary rewrites.
- [x] All unresolved contract questions and dependencies are documented.
- [x] Zero application source code, tests, dependencies, or existing documentation were modified.

---

## 13. Unresolved Questions

| Unresolved Question | Nature of the Issue | Required Evidence to Settle | Blocked Work Package | Consequence if Left Unresolved |
| :--- | :--- | :--- | :--- | :--- |
| **1. Purchase Order Procurement Fields** | Product domain requirements | Product lead confirmation on required PO vendor fields (vendor address, tax ID, payment terms, delivery terms). | M3 (PO Template Implementation) | Building a PO template that mismatches practical supplier procurement standards. |
| **2. Dynamic Footer Height in Forme** | Rendering engine behavior | Empirical test verifying whether Forme's `<Fixed position="footer">` automatically offsets the bottom table boundary or requires manual page margin reservation. | M2 (Quotation Natural-Pagination Gate) | Potential overlap between table rows and running footers on multi-page documents. |
| **3. Mobile Filesystem Permission Handling** | Native runtime verification | Inspection of Capacitor 8 Android permission behavior when saving to public `Documents` vs internal app sandbox. | M1C (Delivery Consolidation) | Potential save failures on newer Android versions with scoped storage restrictions. |

---

## 14. Audit Integrity & Git Status

### 14.1 Baseline vs. Final Git State
- **Baseline Git Status:** Pre-existing working-tree changes existed in `docs/prd/pdf-rendering-migration/Readme.md`, deleted test files in `docs/templates/ref-invquo/`, and untracked files in `docs/templates/html-temps/invoice-templates/` and `docs/reports/`.
- **Modifications Attributable to This Task:** Exactly **one** new file was created:
  `docs/reports/pdf/m1a-pdf-architecture-contracts-and-responsibility-definition.md`.
- **Zero Application Code Changes:** No source code, tests, configuration, dependencies, or existing reports were modified during this turn.
- **Hardware Gate Compliance:** Neither `bun run build`, `bun run typecheck`, `bun test`, nor `bun run audit:load` were executed.
