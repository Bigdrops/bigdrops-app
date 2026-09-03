# PDF Generation & Delivery Architecture Audit

**Report written by Buffy (OpenCode) on 2026-07-13 via Freebuff.**

---

## 1. Executive Summary

BIGDROPS operates **5 distinct PDF rendering pipelines** and **3 separate delivery mechanisms**. The system has evolved organically — each document type was built with its own PDF rendering approach before the `pdf-new` unified layer existed. This has resulted in **significant duplication across generation, Blob creation, and delivery paths**.

A unified PDF pipeline is **strongly recommended** but requires careful phased migration. The `pdf-new` subsystem already provides the abstraction that all commercial documents (Invoice, Quotation) use, and it can be extended to cover all document types with moderate effort.

**Key finding:** 48 source files currently depend on `@react-pdf/renderer` directly. A unified pipeline would reduce this to ~5-8 core files.

---

## 2. Current Architecture

### 2.1 Document Types & Their PDF Pipelines

| Document Type | Rendering Engine | Preview Model | PDF Component | Download Path | # Templates |
|---|---|---|---|---|---|
| **Invoice** | `pdf-new/` layers | `domain/invoice/previewModel.ts` | `pdf-new/index.ts → generateInvoicePdf()` | Domain: `document-view/invoice/invoicePdfActions.ts` | 7 (Industry, Ledger, Crest, Minimal, Evergreen, Bolt, Ember) |
| **Quotation** | `pdf-new/` layers | `domain/quotation/previewModel.ts` | `pdf-new/index.ts → generateQuotationPdf()` | Domain: `domain/quotation/pdfDownloadHandler.ts` | 7 (same templates as Invoice) |
| **Waybill** | Direct `@react-pdf/renderer` templates | `domain/waybill/engine/assembly.ts → buildWaybillRenderModel()` | `components/waybill/WaybillPDF.tsx` | Shared: `downloadPdfFromElement()` | 6 (Evergreen, Minimal, Thermal, Classic, Premium, Slate) |
| **CSR** | Direct `@react-pdf/renderer` preview templates | `domain/csr/csrRenderModel.ts` | `components/csr/preview-templates/*.tsx` | Shared: `downloadPdfFromElement()` | 4+ (IndustryCsr, Minimal, Zinc, Sentinel) |
| **BOQ** | `table-document/` adapter | N/A (raw DB rows) | `components/boq/BoqPdfDocument.tsx → TableDocumentPdfDocument` | Shared: `downloadPdfFromElement()` | 1 (Modern) |
| **RFQ** | `table-document/` adapter | N/A (raw DB rows) | `components/rfq/RfqPdfDocument.tsx → TableDocumentPdfDocument` | Shared: `downloadPdfFromElement()` | 1 (Modern) |
| **Receipt** | `pdf-new/ReceiptPdf.tsx` (standalone) | `domain/receipt/previewModel.ts → buildReceiptPreviewData()` | `components/pdf-new/ReceiptPdf.tsx` | Shared: `downloadPdfFromElement()` | 1 |
| **Project Document** | Direct `@react-pdf/renderer` | N/A | `components/project/ProjectDocumentPDF.tsx` | `pages/ProjectDocumentView.tsx` (uses downloadPdfFromElement) | 1 |

### 2.2 Pipeline Comparison

| Stage | Invoice | Quotation | Waybill | CSR | BOQ/RFQ | Receipt |
|---|---|---|---|---|---|---|
| **Entry point** | `ViewInvoice.tsx → actions.handleDownload()` | `ViewQuotation.tsx → handleDownloadQuotationPdf()` | `ViewWaybill.tsx → handleDownload()` | `ViewCSR.tsx → handleDownload()` | `ViewBoq.tsx / ViewRfq.tsx → handleDownload()` | `ViewReceipt.tsx → handleDownload()` |
| **Data shaping** | `buildInvoicePreviewModel()` → `invoicePdfActions.ts` | `buildQuotationPreviewModel()` → `pdfDownloadHandler.ts` | `buildWaybillRenderModel()` | `buildCsrPreviewData()` | N/A (raw rows) | `buildReceiptPreviewData()` |
| **Blob creation** | `pdf-new/index.ts → pdf(React.createElement).toBlob()` | `pdf-new/index.ts` (same entry) | `downloadPdfFromElement → pdf(element).toBlob()` | `downloadPdfFromElement → pdf(element).toBlob()` | `downloadPdfFromElement → pdf(element).toBlob()` | `downloadPdfFromElement → pdf(element).toBlob()` |
| **Download** | Internal `downloadBlob()` in pdf-new/index.ts | Internal `downloadBlob()` in pdf-new/index.ts | `downloadPdfFromElement → exportPdfToDevice()` | `downloadPdfFromElement → exportPdfToDevice()` | `downloadPdfFromElement → exportPdfToDevice()` | `downloadPdfFromElement → exportPdfToDevice()` |
| **Native save** | N/A (web-only Blob download) | N/A (web-only Blob download) | `exportPdfToDevice → Filesystem.writeFile` | `exportPdfToDevice → Filesystem.writeFile` | `exportPdfToDevice → Filesystem.writeFile` | `exportPdfToDevice → Filesystem.writeFile` |
| **Native open** | N/A | N/A | `downloadPdfFromElement → openExportedPdf()` | `downloadPdfFromElement → openExportedPdf()` | `downloadPdfFromElement → openExportedPdf()` | `downloadPdfFromElement → openExportedPdf()` |
| **Share** | `shareDocument.ts` (URL share) | `shareDocument.ts` (URL share) | `shareDocument.ts` (URL share) | `shareDocument.ts` (URL share) | `shareDocument.ts` (URL share) | N/A |
| **Preview** | `QuotationDocumentPreview.tsx` (HTML) | `CsrDocumentPreview.tsx` (HTML) | `WaybillDocumentPreview.tsx` (HTML) | `BoqDocumentPreview.tsx` / `RfqDocumentPreview.tsx` | `TableDocumentPdfDocument` as render | Web-based screen |

---

## 3. Generated Blob Creation Points

All Blob creation flows through `@react-pdf/renderer`'s `pdf(element).toBlob()`:

| Location | Document Types | Wrapped? |
|---|---|---|
| `pdf-new/index.ts` (line 74) | Invoice, Quotation | Yes — custom `generatePdf()` wrapper with template selection and local download |
| `downloadPdfFromElement.tsx` (line 25) | Waybill, CSR, BOQ, RFQ, Receipt | Yes — wrapped with native export logic |
| `blankWaybillTemplate.tsx` (line ~270) | Blank Waybill (download-only) | No — manual createObjectURL/download pattern |

---

## 4. Delivery Mechanisms

| Mechanism | Web | Native (Capacitor) | Used By |
|---|---|---|---|
| **Blob download** (`URL.createObjectURL` + `<a>` click) | ✅ | ✅ | `pdf-new/index.ts` (Invoice/Quotation), `blankWaybillTemplate.tsx` (blank waybill) |
| **Native file export** (`Filesystem.writeFile`) | ❌ | ✅ | `exportPdfToDevice()` → called by `downloadPdfFromElement` |
| **Native file open** (`FileOpener.open`) | ❌ | ✅ | `openExportedPdf()` → called by `downloadPdfFromElement` after save |
| **Native share** (`Share.share`) | ❌ | ✅ | `shareExportedPdf()` → called by `downloadPdfFromElement` as fallback |
| **Web Share API** (`navigator.share`) | ✅ | ❌ | `shareDocument.ts` (URL/share text via system share sheet) |
| **Clipboard copy** (`navigator.clipboard`) | ✅ | ✅ | `shareDocument.ts` fallback |

### 4.1 Critical Duplication: Two Download Paths

**Path A — `pdf-new/index.ts` (Invoice/Quotation):**
1. Creates Blob via `pdf(Renderer).toBlob()`
2. Downloads locally via `downloadBlob()` using `document.createElement('a')` + `URL.createObjectURL()`
3. Does NOT save to native device filesystem
4. Does NOT open or share after download
5. Returns `{ status, filename }` — no file path/URI

**Path B — `downloadPdfFromElement.tsx` (Waybill, CSR, BOQ, RFQ, Receipt, Project):**
1. Receives a React element
2. Creates Blob via `pdf(element).toBlob()` inside `exportPdfToDevice()`
3. On Web: Downloads via `downloadBlobOnWeb()` (same `createObjectURL` pattern)
4. On Native: Saves to `Filesystem.writeFile()` in cache directory, then attempts `openExportedPdf()`, falls back to `shareExportedPdf()`
5. Emits feedback events (`download:start`, `download:success`, `download:fail`)
6. Returns `{ fileName, path, uri, sizeBytes }` — full file metadata

---

## 5. Duplication Analysis

### 5.1 Duplicated Logic

| What's Duplicated | Where | Impact |
|---|---|---|
| `pdf(element).toBlob()` | `pdf-new/index.ts` + `downloadPdfFromElement.tsx` + `blankWaybillTemplate.tsx` | 3 separate Blob creation points |
| `URL.createObjectURL()` + `<a>` download | `pdf-new/index.ts` (downloadBlob) + `pdfexport.ts` (downloadBlobOnWeb) + `blankWaybillTemplate.tsx` | 3 web download implementations |
| Header field normalization (issueDateLabel, documentNumberLabel) | `industryAdapter.ts` + each document's preview model | Logic duplicated per document type |
| Money formatting (`formatPdfMoney`, `formatPdfCurrencyString`) | `industryAdapter.ts` + each document's custom table columns | Formatting strings redone per document type |
| Template resolution (`switch` on templateId) | `pdf-new/index.ts` + `WaybillPDF.tsx` + CSR template index | Each document has its own template picker |
| Font registration | `pdfFontRegistry.ts` (shared) | ✅ Already shared |
| Signatory resolution | `invoicePdfActions.ts` + `pdfDownloadHandler.ts` + `ViewCSR.tsx` | Same pattern reimplemented |

### 5.2 Already-Shared Abstractions (Reusable)

| Abstraction | Location | Used By | Notes |
|---|---|---|---|
| `downloadPdfFromElement()` | `document-view/shared/downloadPdf.tsx` | Waybill, CSR, BOQ, RFQ, Receipt, Project | Already the de facto shared delivery layer |
| `exportPdfToDevice()` | `lib/native/pdfexport.ts` | `downloadPdfFromElement` (single call site) | Clean abstraction for native vs web |
| `shareExportedPdf()` / `openExportedPdf()` | `lib/native/pdfexport.ts` | `downloadPdfFromElement` (post-save) | Ready for reuse |
| `shareDocument()` | `document-view/shared/shareDocument.ts` | Multiple View pages | URL/text sharing only |
| `pdfFontRegistry.registerPdfFonts()` | `lib/pdfFontRegistry.ts` | Global | ✅ Already shared |
| `PdfCurrencyText` | `pdf-new/pdfCurrency.tsx` | TableDocumentPdf, ReceiptPdf | ✅ Already shared |
| `PdfRenderer` | `pdf-new/renderers/PdfRenderer.tsx` | pdf-new templates only | Wraps `<Document>` with Template + layout resolution |

---

## 6. Proposed Unified Architecture

### 6.1 Core Abstraction: `PdfAsset`

Introduce a single `PdfAsset` type that all document PDFs produce:

```typescript
type PdfAsset = {
  fileName: string
  blob: Blob
  sizeBytes: number
  documentType: PdfDocumentType  // 'invoice' | 'quotation' | 'waybill' | 'csr' | 'boq' | 'rfq' | 'receipt' | 'project'
  metadata: Record<string, string>
}
```

### 6.2 Generation Layer (Decoupled)

Each document family would have a **pure generation function** that produces `PdfAsset`:

```typescript
// Single contract for all document types
async function generatePdfAsset<T>(
  document: T,
  config: PdfGenerationConfig
): Promise<PdfAsset>
```

This replaces:
- `generateInvoicePdf()` / `generateQuotationPdf()` in `pdf-new/index.ts`
- `WaybillPDF.tsx` component-as-generator
- `getCsrPdfDocument()` in CSR utils
- `BoqPdfDocument` / `RfqPdfDocument` components-as-generators
- `ReceiptPdf.tsx` component-as-generator

### 6.3 Delivery Layer (Strategy Pattern)

```typescript
type DeliveryStrategy = 'download' | 'save' | 'open' | 'share' | 'print' | 'email'

async function deliverPdf(asset: PdfAsset, strategy: DeliveryStrategy): Promise<DeliveryResult>
```

This consolidates delivery logic into a single `PdfDeliveryService`:

```
PdfDeliveryService
├── download(asset)     → Blob + filename (web)
├── saveToDevice(asset) → Filesystem.writeFile (native)
├── openFile(asset)     → FileOpener.open (native)
├── shareFile(asset)    → Share.share (native) / navigator.share (web)
├── print(asset)        → window.print() (web) / native print
└── email(asset)        → mailto: with attachment
```

### 6.4 Current vs Proposed Flow

**Current (Invoice):**
```
ViewInvoice → useInvoiceActions.handleDownload()
  → invoicePdfActions.downloadInvoicePdfDocument()
    → generateInvoicePdf() [pdf-new/index.ts]
      → PdfRenderer → Template → pdf().toBlob()
      → downloadBlob() [internal web download]
```

**Current (Waybill):**
```
ViewWaybill → handleDownload()
  → downloadPdfFromElement({ element: <WaybillPDF /> })
    → exportPdfToDevice()
      → pdf(element).toBlob()
      → Filesystem.writeFile (native) or downloadBlobOnWeb (web)
    → openExportedPdf() → Share.share() (native fallback)
```

**Proposed (All Document Types):**
```
ViewDocument → handleDownload()
  → PdfGenerationService.generate(document, config)
    → Pure generation function returns PdfAsset { blob, fileName, ... }
  → PdfDeliveryService.deliver(asset, 'save-and-open')
    → Single path: save to device, open, share if open fails
```

---

## 7. Migration Strategy

### 7.1 Files Affected

| Category | Files | Action |
|---|---|---|
| **Core generation** | `pdf-new/index.ts`, `pdf-new/types.ts`, `pdf-new/industryAdapter.ts` | Refactor — extract `generatePdfAsset()` |
| **Domain handlers** | `invoicePdfActions.ts`, `pdfDownloadHandler.ts` (quotation) | Replace with `generatePdfAsset()` call |
| **Document-specific generators** | `WaybillPDF.tsx`, `blankWaybillTemplate.tsx`, CSR preview templates, `BoqPdfDocument.tsx`, `RfqPdfDocument.tsx`, `ReceiptPdf.tsx`, `ProjectDocumentPDF.tsx` | Wrap in `generatePdfAsset()` — keep templates as render functions |
| **Delivery** | `downloadPdf.tsx`, `pdfexport.ts`, `shareDocument.ts` | Consolidate into `PdfDeliveryService` |
| **View pages** | `ViewInvoice.tsx`, `ViewQuotation.tsx`, `ViewWaybill.tsx`, `ViewCSR.tsx`, `ViewBoq.tsx`, `ViewRfq.tsx`, `ViewReceipt.tsx` | Minor — swap to new service calls |
| **New service** | `src/lib/pdf/PdfGenerationService.ts`, `src/lib/pdf/PdfDeliveryService.ts`, `src/lib/pdf/types.ts` | Create |

**Total estimated files: 15-20 modified, 2-3 created, 0 deleted.**

### 7.2 Public API Changes

| Current API | Change |
|---|---|
| `generateInvoicePdf(request)` | Replace with `generatePdfAsset(invoice, config)` |
| `generateQuotationPdf(request)` | Replace with `generatePdfAsset(quotation, config)` |
| `downloadPdfFromElement(options)` | Replace with `PdfDeliveryService.deliver(asset, 'save-and-open')` |
| `exportPdfToDevice(options)` | Internalize into delivery service |
| `exportAndPresentPdf(options)` | Merge into `deliverPdf(asset, mode)` |
| `shareDocument(options)` | Keep as lightweight URL/text share, or merge into delivery service |

**Backward compatibility:** All existing public APIs can be preserved as wrappers around the new unified functions during migration.

### 7.3 Safe Migration Path (Smallest First)

**Phase 1 — Create abstractions (no behavior change):**
1. Create `src/lib/pdf/types.ts` — `PdfAsset`, `DeliveryStrategy`, `DeliveryResult`
2. Create `src/lib/pdf/PdfGenerationService.ts` — wraps existing `pdf-new/index.ts` generators
3. Create `src/lib/pdf/PdfDeliveryService.ts` — consolidates `downloadPdfFromElement` + `pdfexport.ts` + `shareDocument.ts`

**Phase 2 — Migrate commercial documents (Invoice, Quotation):**
4. Refactor `invoicePdfActions.ts` to use `PdfGenerationService`
5. Refactor `pdfDownloadHandler.ts` to use `PdfGenerationService`
6. Verify: Invoice and Quotation still download correctly

**Phase 3 — Migrate non-commercial documents:**
7. Wrap `WaybillPDF.tsx` in a generation function
8. Wrap CSR preview templates in a generation function
9. Wrap `TableDocumentPdfDocument.tsx` for BOQ/RFQ
10. Wrap `ReceiptPdf.tsx` in a generation function
11. Wrap `ProjectDocumentPDF.tsx` in a generation function

**Phase 4 — Consolidate delivery:**
12. Replace all direct `downloadPdfFromElement` calls with `PdfDeliveryService`
13. Unify native save/open/share flows
14. Add print and email strategies

**Phase 5 — Cleanup:**
15. Remove `blankWaybillTemplate.tsx`'s standalone Blob creation
16. Remove `pdf-new/index.ts`'s internal `downloadBlob()` function
17. Deprecate `exportAndPresentPdf()` in favor of delivery service

### 7.4 Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Template-specific layout breaks | Medium | Keep all existing template components intact; wrap, don't rewrite |
| Native share/open fallback chain | Low | Preserve existing `open → share` fallback order |
| Duplicate Blob creation (memory) | Low | Generate Blob once in generation layer, pass through delivery |
| PDF customization presets break | Medium | Migration path respects existing `PdfDesignPreset` and customization hooks |
| Font registration timing | Low | Keep global `registerPdfFonts()` call, ensure it runs before first generation |

---

## 8. Benefits of Unification

| Benefit | Impact |
|---|---|
| **One Blob creation path** | Eliminates 3 separate `.toBlob()` call sites |
| **One delivery contract** | Every document gets save + open + share + download for free |
| **Consistent error handling** | Feedback events standardized across all document types |
| **Audit-ready** | Single point to add PDF download audit logging |
| **Print support** | One place to add `window.print()` for all document types |
| **Email support** | One place to add mailto: with PDF attachment |
| **Template independence** | Adding a new template doesn't require changing delivery code |
| **Reduced bundle** | Lazy imports centralized in generation service |

---

## 9. Recommendation

**Proceed with unification** but do NOT rewrite any template rendering code. The existing React-PDF template components (Industry, Evergreen, Waybill templates, CSR templates) are production-tested and should be preserved as-is. The unification is purely at the **orchestration layer**:

1. **Generation** — Move `pdf(element).toBlob()` + font registration + template resolution into `PdfGenerationService`
2. **Delivery** — Move native save/open/share + web download + feedback events into `PdfDeliveryService`
3. **Domain** — Keep existing preview model + data shaping logic as-is

---

## 10. Implementation Phases (Recommended Order)

```
Phase 1 (Foundation):  2-3 days  ─── Types + GenerationService + DeliveryService
Phase 2 (Commercial):  1-2 days  ─── Invoice + Quotation migration
Phase 3 (Non-commercial): 2-3 days ─── Waybill + CSR + BOQ + RFQ + Receipt + Project migration
Phase 4 (Consolidation): 1-2 days ─── Delivery unification + cleanup
Phase 5 (Polish):       1 day    ─── Print + Email strategies, dead code removal
```

**Total estimate: 7-11 days** for a complete, safe migration.

---

## 11. Verification

- **Git status (before):** 2 modified + 1 untracked (pre-existing, not from this audit)
- **Git status (after):** Unchanged — no application source files were modified during this audit
- **Read-only verification:** ✅ Passed
