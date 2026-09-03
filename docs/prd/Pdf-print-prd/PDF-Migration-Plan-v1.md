# PDF Architecture Migration Plan v1

**Status:** Execution Plan  
**Version:** 1.0  
**Owner:** BIGDROPS Platform  
**Last Updated:** 2026-07-13  
**Architecture Reference:** `docs/prd/PDF-Architecture-v1.md`

---

## 1. Executive Summary

This document defines the step-by-step migration execution plan to unify the PDF generation and delivery infrastructure across all BIGDROPS document types. The plan follows the architecture defined in `PDF-Architecture-v1.md` with the following core principles:

- **No big-bang rewrite** — Incremental migration, one document family at a time
- **Safest first** — Build contracts, wrap existing behavior, then migrate
- **Isolation** — If Invoice migration fails, Waybill/CSR/Receipt/BOQ/RFQ remain untouched
- **Backward compatibility** — Old APIs wrap new infrastructure until all callers migrate
- **Verification at every step** — Typecheck, audit:load, tests pass before proceeding

---

## 2. Current State Mapping (from Architecture Doc)

| Document Type | Current Generation | Current Delivery | Migration Phase |
|---------------|-------------------|------------------|-----------------|
| **Invoice** | `pdf-new` (via `generateInvoicePdf`) | `downloadPdfFromElement` → `exportPdfToDevice` | Phase 3 |
| **Quotation** | `pdf-new` (via `generateQuotationPdf`) | `downloadPdfFromElement` → `exportPdfToDevice` | Phase 3 |
| **Receipt** | `@react-pdf/renderer` direct in `ReceiptPdf.tsx` | `downloadPdfFromElement` → `exportPdfToDevice` | Phase 4 |
| **CSR** | `pdf-new` templates | `downloadPdfFromElement` → `exportPdfToDevice` | Phase 5 |
| **Waybill** | `WaybillPDF` component + templates | `downloadPdfFromElement` → `exportPdfToDevice` | Phase 5 |
| **BOQ** | `TableDocumentPdfDocument` | `downloadPdfFromElement` → `exportPdfToDevice` | Phase 6 |
| **RFQ** | `TableDocumentPdfDocument` | `downloadPdfFromElement` → `exportPdfToDevice` | Phase 6 |
| **Project Documents** | Various | Various | Phase 7 |
| **Blank Waybill** | `blankWaybillTemplate.tsx` | Direct | Phase 7 |

---

## 3. Phase Definitions

### Phase 0 — Baseline & Safety (Week 0)

**Goal:** Establish verification baseline and safety net before any changes.

#### What Changes First
- Nothing in production code
- Create verification scripts and baseline metrics

#### Files Touched (New)
```
scripts/verify-pdf-migration.mjs           # Verification runner
scripts/pdf-migration-baseline.json        # Baseline metrics snapshot
docs/reports/PDF-Migration/phase0-baseline.md
```

#### What Stays Untouched
- All existing PDF generation and delivery code

#### Verification Criteria
```bash
bun run typecheck        # Must pass
bun run audit:load       # Must pass  
bun run test             # Must pass (all critical tests)
git status               # Clean (no unintended changes)
```

#### Rollback Strategy
- N/A (no code changes)

#### Dependencies
- None (foundational phase)

---

### Phase 1 — Create PdfAsset Contract (Week 1)

**Goal:** Define the canonical `PdfAsset` type and minimal generator contract. Zero behavioral changes.

#### What Changes First
- New infrastructure types/contracts (no consumers yet)

#### Files Created
```
src/lib/pdf/PdfAsset.ts                 # Core PdfAsset interface
src/lib/pdf/PdfGenerator.ts             # Generator interface + PdfAssetCreator
src/lib/pdf/PdfDelivery.ts              # Delivery interface
src/lib/pdf/index.ts                    # Barrel export
src/lib/pdf/types.ts                    # Shared types (DeliveryMode, DeliveryResult, FeedbackEvent)
```

#### Files Modified (Minimal)
- None — this phase only adds new files

#### What Stays Untouched
- All existing PDF generation (`pdf-new`, `ReceiptPdf`, `WaybillPDF`, `TableDocumentPdfDocument`)
- All existing delivery (`downloadPdfFromElement`, `exportPdfToDevice`)
- All view pages (`ViewInvoice`, `ViewWaybill`, `ViewCSR`, `ViewReceipt`, `ViewQuotation`, `ViewBoq`, `ViewRfq`)

#### PdfAsset Contract (from Architecture Doc)
```typescript
// src/lib/pdf/PdfAsset.ts
export interface PdfAsset {
  fileName: string;           // Sanitized filename with extension
  blob: Blob;                 // The PDF binary
  mimeType: 'application/pdf';
  sizeBytes: number;
  metadata: PdfMetadata;
}

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  keywords?: string[];
  documentType: DocumentType;  // 'invoice' | 'quotation' | 'receipt' | 'csr' | 'waybill' | 'boq' | 'rfq' | 'project'
  documentNumber: string;      // e.g., "INV-001", "WAY-005"
  templateId?: string;         // Template identifier used
  generatedAt: Date;
}
```

#### Generator Contract
```typescript
// src/lib/pdf/PdfGenerator.ts
export interface PdfGenerator {
  generate(input: GeneratorInput): Promise<PdfAsset>;
}

export interface GeneratorInput {
  element: React.ReactElement;     // The @react-pdf/renderer Document tree
  fileName: string;                // Base filename (without extension)
  documentType: DocumentType;
  documentNumber: string;
  templateId?: string;
  metadata?: Partial<PdfMetadata>;
}

export interface PdfAssetCreator {
  createAsset(input: GeneratorInput): Promise<PdfAsset>;
}
```

#### Delivery Contract
```typescript
// src/lib/pdf/PdfDelivery.ts
export type DeliveryMode = 
  | 'download'     // Web download / native save
  | 'open'         // Open in native viewer
  | 'share'        // System share sheet
  | 'print'        // Print dialog
  | 'email';       // Email attachment (future)

export interface DeliveryOptions {
  mode: DeliveryMode;
  asset: PdfAsset;
  title?: string;
  onProgress?: (event: FeedbackEvent) => void;
}

export interface DeliveryResult {
  success: boolean;
  mode: DeliveryMode;
  filePath?: string;
  uri?: string;
  error?: string;
}

export interface PdfDelivery {
  deliver(options: DeliveryOptions): Promise<DeliveryResult>;
}
```

#### Feedback Events (Architecture Invariant 10)
```typescript
// src/lib/pdf/types.ts
export type FeedbackEventType = 
  | 'generation:start'
  | 'generation:complete'
  | 'generation:error'
  | 'delivery:start'
  | 'delivery:progress'
  | 'delivery:complete'
  | 'delivery:error';

export interface FeedbackEvent {
  type: FeedbackEventType;
  documentType: DocumentType;
  documentNumber: string;
  timestamp: Date;
  payload?: Record<string, unknown>;
  error?: Error;
}
```

#### Verification Criteria
```bash
bun run typecheck        # New types compile
bun run audit:load       # No query regressions
bun run test             # Existing tests pass
# No existing files modified
git status               # Only new files in src/lib/pdf/
```

#### Rollback Strategy
- Delete `src/lib/pdf/` directory
- No consumers yet, zero risk

#### Dependencies
- Phase 0 complete

---

### Phase 2 — Create PdfDelivery Infrastructure (Week 1-2)

**Goal:** Implement the unified delivery layer that wraps existing `exportPdfToDevice`, `shareExportedPdf`, `openExportedPdf`. This becomes the single delivery point.

#### What Changes First
- Implementation of `PdfDelivery` interface
- Wrap existing native/web delivery logic

#### Files Created
```
src/lib/pdf/delivery/WebPdfDelivery.ts       # Web implementation
src/lib/pdf/delivery/NativePdfDelivery.ts    # Capacitor implementation
src/lib/pdf/delivery/PdfDeliveryFactory.ts   # Platform selector
src/lib/pdf/delivery/FeedbackBus.ts          # Centralized feedback emitter
src/lib/pdf/delivery/index.ts                # Barrel export
```

#### Files Modified
```
src/lib/native/pdfexport.ts                  # REFACTOR: Extract pure functions, keep exports for backward compat
src/components/document-view/shared/downloadPdf.tsx  # REFACTOR: Delegate to PdfDelivery (wrapper)
```

#### Implementation Detail

**WebPdfDelivery.ts** — Wraps `downloadBlobOnWeb`:
```typescript
export class WebPdfDelivery implements PdfDelivery {
  async deliver(options: DeliveryOptions): Promise<DeliveryResult> {
    const { asset, mode } = options;
    this.emit('delivery:start', { mode, fileName: asset.fileName });
    
    try {
      if (mode === 'download') {
        const url = URL.createObjectURL(asset.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = asset.fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        this.emit('delivery:complete', { mode, fileName: asset.fileName });
        return { success: true, mode };
      }
      // Other modes fall back to download on web
      return { success: false, mode, error: `Mode ${mode} not supported on web` };
    } catch (e) {
      this.emit('delivery:error', { mode, error: e });
      return { success: false, mode, error: String(e) };
    }
  }
}
```

**NativePdfDelivery.ts** — Wraps existing `exportPdfToDevice`, `shareExportedPdf`, `openExportedPdf`:
```typescript
export class NativePdfDelivery implements PdfDelivery {
  async deliver(options: DeliveryOptions): Promise<DeliveryResult> {
    const { asset, mode } = options;
    this.emit('delivery:start', { mode, fileName: asset.fileName });
    
    try {
      // Convert PdfAsset.blob to base64 for Filesystem.writeFile
      const base64 = await blobToBase64(asset.blob);
      const file = await exportPdfToDevice({
        fileName: asset.fileName,
        subdirectory: options.subdirectory || 'exports',
        buildBlob: () => Promise.resolve(asset.blob), // Already have blob
      });
      
      if (mode === 'share') await shareExportedPdf(file, options.title);
      else if (mode === 'open') await openExportedPdf(file);
      
      this.emit('delivery:complete', { mode, fileName: file.fileName, path: file.path });
      return { success: true, mode, filePath: file.path, uri: file.uri };
    } catch (e) {
      this.emit('delivery:error', { mode, error: e });
      return { success: false, mode, error: String(e) };
    }
  }
}
```

**downloadPdfFromElement.tsx** — Becomes a thin adapter:
```typescript
// BEFORE: Direct pdf(element).toBlob() + exportPdfToDevice
// AFTER:  Delegates to PdfGenerator + PdfDelivery
export async function downloadPdfFromElement(options: DownloadPdfFromElementOptions) {
  const generator = getPdfGenerator(); // Default implementation
  const delivery = getPdfDelivery();   // Platform-appropriate
  
  const asset = await generator.generate({
    element: options.element,
    fileName: options.fileName,
    documentType: options.documentType || 'unknown',
    documentNumber: options.fileName,
  });
  
  return delivery.deliver({
    asset,
    mode: 'download',
    onProgress: (e) => emitFeedback(mapFeedbackEvent(e)),
  });
}
```

#### What Stays Untouched
- All document-specific PDF templates (`pdf-new/templates/*`, `WaybillPDF`, `ReceiptPdf`, `TableDocumentPdfDocument`)
- All view pages (they still call `downloadPdfFromElement` — same API)
- `exportPdfToDevice`, `shareExportedPdf`, `openExportedPdf` — kept as exports for backward compat

#### Verification Criteria
```bash
bun run typecheck
bun run audit:load
bun run test
# Manual: Test Invoice download on web + Android
# Manual: Test Waybill download on web + Android
# Manual: Test CSR download on web + Android
# Verify feedback events fire (check console/toast)
```

#### Rollback Strategy
- Revert `downloadPdfFromElement.tsx` to original implementation
- Delete new delivery files
- `exportPdfToDevice` et al. remain unchanged

#### Dependencies
- Phase 1 complete (PdfAsset, Generator, Delivery contracts exist)

---

### Phase 3 — Migrate Invoice + Quotation (Week 2-3)

**Goal:** Move Invoice and Quotation to use the new `PdfGenerator` + `PdfDelivery` pipeline. These use the `pdf-new` infrastructure which is the most mature.

#### What Changes First
- Create `InvoicePdfGenerator` and `QuotationPdfGenerator` implementing `PdfGenerator`
- Update view pages to use new generator + delivery (via adapter)

#### Files Created
```
src/lib/pdf/generators/InvoicePdfGenerator.ts
src/lib/pdf/generators/QuotationPdfGenerator.ts
src/lib/pdf/generators/index.ts
```

#### Files Modified
```
src/domain/invoice/pdfRender.contract.ts        # Ensure PdfRenderPayload aligns
src/domain/invoice/buildPdfRenderPayload.ts     # No change, verify compatibility
src/domain/quotation/pdfDownloadHandler.ts      # REFACTOR: Use new generator + delivery
src/components/document-view/invoice/useInvoiceActions.ts  # Update handleDownload
src/pages/ViewInvoice.tsx                       # Verify onDownload prop works
src/pages/ViewQuotation.tsx                     # Update download handler
```

#### Implementation Detail

**InvoicePdfGenerator.ts**:
```typescript
import { generateInvoicePdf } from '@/components/pdf-new'; // Existing
import { PdfGenerator, GeneratorInput, PdfAsset } from '../PdfGenerator';

export class InvoicePdfGenerator implements PdfGenerator {
  async generate(input: GeneratorInput): Promise<PdfAsset> {
    // generateInvoicePdf currently calls pdf(element).toBlob() internally
    // We need to extract the blob creation to return PdfAsset
    const blob = await generateInvoicePdfAsBlob(input); // New helper
    
    return {
      fileName: `${input.fileName}.pdf`,
      blob,
      mimeType: 'application/pdf',
      sizeBytes: blob.size,
      metadata: {
        documentType: 'invoice',
        documentNumber: input.documentNumber,
        templateId: input.templateId,
        generatedAt: new Date(),
        ...input.metadata,
      },
    };
  }
}

// Helper that extracts blob from existing generateInvoicePdf
async function generateInvoicePdfAsBlob(input: GeneratorInput): Promise<Blob> {
  const { pdf } = await import('@react-pdf/renderer');
  return pdf(input.element).toBlob();
}
```

**useInvoiceActions.ts** — Update `handleDownload`:
```typescript
// BEFORE: Calls generateInvoicePdf which does generation + download
// AFTER:  Uses generator + delivery
const handleDownload = async () => {
  const generator = new InvoicePdfGenerator();
  const delivery = getPdfDelivery();
  
  const asset = await generator.generate({
    element: <InvoicePdfDocument model={previewModel} templateId={pdfTemplateId} compact={pdfOutput.compact} />,
    fileName: invoice.invoice_number,
    documentType: 'invoice',
    documentNumber: invoice.invoice_number,
    templateId: pdfTemplateId,
  });
  
  await delivery.deliver({ asset, mode: 'download' });
};
```

#### What Stays Untouched
- `pdf-new` templates (`Industry.tsx`, `Crest.tsx`, `Bolt.tsx`, etc.)
- `PdfRenderer.tsx` (rendering component)
- Invoice/Quotation preview models (`buildInvoicePreviewModel`, `buildQuotationPreviewModel`)
- Financial calculations (`Calculations.ts`, `computeDocument`)

#### Verification Criteria
```bash
bun run typecheck
bun run audit:load
bun run test
# Manual: Invoice PDF download (web) - verify file opens, correct content
# Manual: Invoice PDF download (Android) - verify file saves, opens, shares
# Manual: Quotation PDF download (web + Android)
# Manual: Invoice share, open, print flows
# Verify feedback toasts appear: "Download ready", "Download failed"
# Compare PDF output byte-for-byte with pre-migration (visual regression)
```

#### Rollback Strategy
- Revert `useInvoiceActions.ts` `handleDownload` to call `generateInvoicePdf` directly
- Revert `pdfDownloadHandler.ts` for Quotation
- Delete generator files
- Old `generateInvoicePdf` / `generateQuotationPdf` unchanged in `pdf-new`

#### Dependencies
- Phase 2 complete (PdfDelivery working)
- Phase 1 complete (contracts exist)

---

### Phase 4 — Migrate Receipt (Week 3-4)

**Goal:** Move Receipt to new pipeline. Receipt uses a different renderer (`@react-pdf/renderer` direct in component).

#### What Changes First
- Create `ReceiptPdfGenerator`
- Update `ViewReceipt.tsx` download handler

#### Files Created
```
src/lib/pdf/generators/ReceiptPdfGenerator.ts
```

#### Files Modified
```
src/pages/ViewReceipt.tsx                    # Update download handler
src/components/pdf-new/ReceiptPdf.tsx        # Verify compatibility (no change needed)
src/domain/receipt/previewModel.ts           # Verify ReceiptPreviewData structure
```

#### Implementation Detail

**ReceiptPdfGenerator.ts**:
```typescript
import { ReceiptPdf } from '@/components/pdf-new/ReceiptPdf';
import { PdfGenerator, GeneratorInput, PdfAsset } from '../PdfGenerator';

export class ReceiptPdfGenerator implements PdfGenerator {
  async generate(input: GeneratorInput): Promise<PdfAsset> {
    // ReceiptPdf is a @react-pdf/renderer Document component
    const { pdf } = await import('@react-pdf/renderer');
    const blob = await pdf(input.element).toBlob();
    
    return {
      fileName: `${input.fileName}.pdf`,
      blob,
      mimeType: 'application/pdf',
      sizeBytes: blob.size,
      metadata: {
        documentType: 'receipt',
        documentNumber: input.documentNumber,
        templateId: input.templateId,
        generatedAt: new Date(),
        ...input.metadata,
      },
    };
  }
}
```

**ViewReceipt.tsx** — Update download:
```typescript
const handleDownload = async () => {
  const generator = new ReceiptPdfGenerator();
  const delivery = getPdfDelivery();
  
  const asset = await generator.generate({
    element: <ReceiptPdf model={previewData} designPreset={designPreset} />,
    fileName: previewData.receipt_number,
    documentType: 'receipt',
    documentNumber: previewData.receipt_number,
  });
  
  await delivery.deliver({ asset, mode: 'download' });
};
```

#### What Stays Untouched
- `ReceiptPdf.tsx` component (template)
- `previewModel.ts` (data preparation)
- Receipt financial calculations

#### Verification Criteria
```bash
bun run typecheck
bun run audit:load
bun run test
# Manual: Receipt PDF download (web + Android)
# Verify: Amount in words, payment method, invoice reference, signatures render correctly
```

#### Rollback Strategy
- Revert `ViewReceipt.tsx` download handler
- Delete `ReceiptPdfGenerator.ts`

#### Dependencies
- Phase 2 complete

---

### Phase 5 — Migrate CSR + Waybill (Week 4-5)

**Goal:** Move CSR and Waybill to new pipeline. Both use `pdf-new` templates with customization engines.

#### What Changes First
- Create `CsrPdfGenerator` and `WaybillPdfGenerator`
- Update `ViewCSR.tsx` and `ViewWaybill.tsx` download handlers

#### Files Created
```
src/lib/pdf/generators/CsrPdfGenerator.ts
src/lib/pdf/generators/WaybillPdfGenerator.ts
```

#### Files Modified
```
src/pages/ViewCSR.tsx                        # Update handleDownload
src/pages/ViewWaybill.tsx                    # Update handleDownload
src/components/csr/csrUtils.ts               # Verify getCsrPdfDocument compatibility
src/components/waybill/WaybillPDF.tsx        # Verify component compatibility
src/domain/waybill/engine/assembly.ts        # Verify buildWaybillRenderModel output
```

#### Implementation Detail

**CsrPdfGenerator.ts**:
```typescript
import { getCsrPdfDocument } from '@/components/csr/csrUtils';
import { PdfGenerator, GeneratorInput, PdfAsset } from '../PdfGenerator';

export class CsrPdfGenerator implements PdfGenerator {
  async generate(input: GeneratorInput): Promise<PdfAsset> {
    const { pdf } = await import('@react-pdf/renderer');
    const blob = await pdf(input.element).toBlob();
    
    return {
      fileName: `${input.fileName}.pdf`,
      blob,
      mimeType: 'application/pdf',
      sizeBytes: blob.size,
      metadata: {
        documentType: 'csr',
        documentNumber: input.documentNumber,
        templateId: input.templateId,
        generatedAt: new Date(),
        ...input.metadata,
      },
    };
  }
}
```

**WaybillPdfGenerator.ts**:
```typescript
import { WaybillPDF } from '@/components/waybill/WaybillPDF';
import { PdfGenerator, GeneratorInput, PdfAsset } from '../PdfGenerator';

export class WaybillPdfGenerator implements PdfGenerator {
  async generate(input: GeneratorInput): Promise<PdfAsset> {
    const { pdf } = await import('@react-pdf/renderer');
    const blob = await pdf(input.element).toBlob();
    
    return {
      fileName: `${input.fileName}.pdf`,
      blob,
      mimeType: 'application/pdf',
      sizeBytes: blob.size,
      metadata: {
        documentType: 'waybill',
        documentNumber: input.documentNumber,
        templateId: input.templateId,
        generatedAt: new Date(),
        ...input.metadata,
      },
    };
  }
}
```

**ViewCSR.tsx** — Update `handleDownload`:
```typescript
const handleDownload = async () => {
  if (!previewData || downloading) return;
  setDownloading(true);
  try {
    const generator = new CsrPdfGenerator();
    const delivery = getPdfDelivery();
    
    const asset = await generator.generate({
      element: getCsrPdfDocument(previewData, designPreset, template),
      fileName: previewData.csr_number,
      documentType: 'csr',
      documentNumber: previewData.csr_number,
      templateId: template,
    });
    
    await delivery.deliver({ asset, mode: 'download' });
    showToast('Download ready', `${previewData.csr_number} exported as PDF.`, 'success');
  } catch (error) { /* ... */ }
  finally { setDownloading(false); }
};
```

**ViewWaybill.tsx** — Update `handleDownload`:
```typescript
const handleDownload = async () => {
  if (!waybill || downloading) return;
  setDownloading(true);
  try {
    const generator = new WaybillPdfGenerator();
    const delivery = getPdfDelivery();
    
    const asset = await generator.generate({
      element: <WaybillPDF model={model} designPreset={designPreset} template={template} />,
      fileName: waybill.waybill_number,
      documentType: 'waybill',
      documentNumber: waybill.waybill_number,
      templateId: template,
    });
    
    await delivery.deliver({ asset, mode: 'download' });
    showToast('Download ready', `${waybill.waybill_number} exported as PDF.`, 'success');
  } catch (error) { /* ... */ }
  finally { setDownloading(false); }
};
```

#### What Stays Untouched
- CSR templates (`Zinc.tsx`, `Sentinel.tsx`, `Nexus.tsx`, `Minimal.tsx`, `IndustryCsr.tsx`)
- Waybill templates (`EvergreenTemplate`, `MinimalTemplate`, `ThermalTemplate`, `ClassicTemplate`, `PremiumTemplate`, `SlateTemplate`)
- Customization engines (`usePdfCustomization`, `bridgeToDesignPreset`)
- Render models (`buildWaybillRenderModel`, `buildCsrPreviewData`)

#### Verification Criteria
```bash
bun run typecheck
bun run audit:load
bun run test
# Manual: CSR PDF download (web + Android) - all templates
# Manual: Waybill PDF download (web + Android) - all templates
# Manual: CSR customization (font, color, template) persists and renders in PDF
# Manual: Waybill customization persists and renders in PDF
# Verify: Feedback toasts, share, open flows work
```

#### Rollback Strategy
- Revert `ViewCSR.tsx` and `ViewWaybill.tsx` `handleDownload` to original `downloadPdfFromElement` calls
- Delete generator files
- Zero impact on templates or customization

#### Dependencies
- Phase 2 complete

---

### Phase 6 — Migrate BOQ + RFQ (Week 5-6)

**Goal:** Move BOQ and RFQ (both use `TableDocumentPdfDocument`) to new pipeline.

#### What Changes First
- Create `TableDocumentPdfGenerator` (shared for BOQ/RFQ)
- Update `ViewBoq.tsx` and `ViewRfq.tsx`

#### Files Created
```
src/lib/pdf/generators/TableDocumentPdfGenerator.ts
```

#### Files Modified
```
src/pages/ViewBoq.tsx                        # Update download handler
src/pages/ViewRfq.tsx                        # Update download handler
src/components/table-document/TableDocumentPdfDocument.tsx  # Verify compatibility
src/components/boq/BoqPdfDocument.tsx        # Verify compatibility
src/components/rfq/RfqPdfDocument.tsx        # Verify compatibility
```

#### Implementation Detail

**TableDocumentPdfGenerator.ts** — Generic generator:
```typescript
import { TableDocumentPdfDocument } from '@/components/table-document/TableDocumentPdfDocument';
import { PdfGenerator, GeneratorInput, PdfAsset } from '../PdfGenerator';

interface TableDocumentGeneratorInput extends GeneratorInput {
  documentType: 'boq' | 'rfq';
  documentData: any;
  rows: any[];
  columns: any[];
  templateId: string;
}

export class TableDocumentPdfGenerator implements PdfGenerator {
  async generate(input: GeneratorInput): Promise<PdfAsset> {
    const { pdf } = await import('@react-pdf/renderer');
    // input.element is already the TableDocumentPdfDocument component
    const blob = await pdf(input.element).toBlob();
    
    return {
      fileName: `${input.fileName}.pdf`,
      blob,
      mimeType: 'application/pdf',
      sizeBytes: blob.size,
      metadata: {
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        templateId: input.templateId,
        generatedAt: new Date(),
        ...input.metadata,
      },
    };
  }
}
```

**ViewBoq.tsx** — Update download:
```typescript
const handleDownload = async () => {
  const generator = new TableDocumentPdfGenerator();
  const delivery = getPdfDelivery();
  
  const asset = await generator.generate({
    element: <BoqPdfDocument boq={boq} />,
    fileName: boq.boq_number,
    documentType: 'boq',
    documentNumber: boq.boq_number,
    templateId: boq.template_id,
  });
  
  await delivery.deliver({ asset, mode: 'download' });
};
```

**ViewRfq.tsx** — Similar pattern with `RfqPdfDocument`.

#### What Stays Untouched
- `TableDocumentPdfDocument.tsx` (template)
- `BoqPdfDocument.tsx`, `RfqPdfDocument.tsx` (wrappers)
- BOQ/RFQ data models and storage

#### Verification Criteria
```bash
bun run typecheck
bun run audit:load
bun run test
# Manual: BOQ PDF download (web + Android) - both templates
# Manual: RFQ PDF download (web + Android) - both templates
# Verify: Table columns, sections, pricing render correctly
```

#### Rollback Strategy
- Revert `ViewBoq.tsx`, `ViewRfq.tsx` download handlers
- Delete generator

#### Dependencies
- Phase 2 complete

---

### Phase 7 — Migrate Project Documents + Blank Waybill (Week 6-7)

**Goal:** Migrate remaining document types (Letters, Project Documents, Blank Waybill).

#### Files Created
```
src/lib/pdf/generators/ProjectDocumentPdfGenerator.ts
src/lib/pdf/generators/BlankWaybillPdfGenerator.ts
```

#### Files Modified
```
src/pages/ViewLetter.tsx                     # If exists
src/pages/ProjectDocumentView.tsx            # Update download
src/components/waybill/blankWaybillTemplate.tsx  # Verify
```

#### Verification Criteria
```bash
bun run typecheck
bun run audit:load
bun run test
# Manual: Each remaining document type PDF download
```

#### Rollback Strategy
- Revert view pages, delete generators

#### Dependencies
- Phase 2 complete

---

### Phase 8 — Remove Duplicate Pipelines (Week 7-8)

**Goal:** Remove legacy orchestration code now that all consumers use the unified pipeline.

#### What Changes First
- Delete legacy generation functions that are no longer called
- Delete duplicate Blob creation calls
- Keep only the unified infrastructure

#### Files to Delete (After Verifying Zero References)
```
src/components/pdf-new/generateInvoicePdf.ts      # If exists as standalone
src/components/pdf-new/generateQuotationPdf.ts    # If exists as standalone
src/components/pdf-new/index.ts                   # Remove legacy exports
src/lib/native/pdfexport.ts                       # Keep only pure utilities, remove exportPdfToDevice if unused
```

#### Files to Modify (Cleanup)
```
src/components/document-view/shared/downloadPdf.tsx  # Simplify to pure adapter
src/lib/feedback.ts                                  # Remove PDF-specific feedback if centralized
```

#### What Stays
- `src/lib/pdf/` — The unified infrastructure
- `src/lib/native/pdfexport.ts` — Pure utilities (`sanitizeFileName`, `toBase64FromBlob`, `downloadBlobOnWeb`)
- `src/components/pdf-new/templates/*` — All templates
- `src/components/pdf-new/renderers/PdfRenderer.tsx`
- All document-specific PDF components (`ReceiptPdf`, `WaybillPDF`, `TableDocumentPdfDocument`, etc.)

#### Verification Criteria
```bash
bun run typecheck
bun run audit:load
bun run test
# Grep for: "toBlob()", "exportPdfToDevice", "downloadPdfFromElement" — should only exist in:
#   - src/lib/pdf/delivery/*.ts
#   - src/lib/pdf/generators/*.ts
#   - src/components/document-view/shared/downloadPdf.tsx (adapter)
# Manual: Full regression test of all document types
```

#### Rollback Strategy
- Git revert the cleanup commits
- Legacy functions restored from history

#### Dependencies
- Phases 3-7 complete and verified
- Zero references to legacy generation functions (grep confirms)

---

## 4. Cross-Phase Dependencies

```
Phase 0 (Baseline)
    ↓
Phase 1 (Contracts) ─────────────────────┐
    ↓                                    │
Phase 2 (Delivery Infra) ←───────────────┤
    ↓                                    │
    ├─→ Phase 3 (Invoice + Quotation)    │
    ├─→ Phase 4 (Receipt)                │  All independent
    ├─→ Phase 5 (CSR + Waybill)          │  after Phase 2
    ├─→ Phase 6 (BOQ + RFQ)              │
    └─→ Phase 7 (Project Docs)           │
    ↓                                    │
Phase 8 (Cleanup) ←──────────────────────┘
```

**Critical Path:** Phase 0 → 1 → 2 → (3,4,5,6,7 in parallel) → 8

---

## 5. Verification Gates (Every Phase)

**Automated (must pass before proceeding):**
```bash
bun run typecheck        # TypeScript compilation
bun run audit:load       # Supabase query patterns
bun run test             # Critical path tests
git status               # No unintended modifications
```

**Manual (per document family migrated):**
| Test | Invoice | Quotation | Receipt | CSR | Waybill | BOQ | RFQ |
|------|---------|-----------|---------|-----|---------|-----|-----|
| Web PDF download | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Android PDF save | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Android PDF open | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Android PDF share | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Customization renders | ✓ | ✓ | N/A | ✓ | ✓ | ✓ | ✓ |
| Feedback toasts | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Visual regression | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**Visual Regression:** Compare PDF output (byte-level or pixel-level) against pre-migration baseline for each document type.

---

## 6. Legacy Code as Adapters (During Migration)

The following legacy code remains as **adapters** until Phase 8:

| Legacy Function | Role During Migration | Removed In |
|-----------------|----------------------|------------|
| `exportPdfToDevice` | Called by `NativePdfDelivery` | Phase 8 |
| `shareExportedPdf` | Called by `NativePdfDelivery` | Phase 8 |
| `openExportedPdf` | Called by `NativePdfDelivery` | Phase 8 |
| `downloadBlobOnWeb` | Called by `WebPdfDelivery` | Phase 8 (or kept as util) |
| `downloadPdfFromElement` | Adapter: `Generator + Delivery` | Phase 8 |
| `generateInvoicePdf` | Unused after Phase 3 | Phase 8 |
| `generateQuotationPdf` | Unused after Phase 3 | Phase 8 |
| `pdf(element).toBlob()` | Only in `PdfGenerator` implementations | Never (in generators) |

**Rule:** No document module (Invoice, Quotation, CSR, Waybill, etc.) calls `pdf(...).toBlob()` or Capacitor APIs directly after its migration phase. Only `PdfGenerator` implementations and `PdfDelivery` implementations do.

---

## 7. Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0: Baseline | 0.5 days | 0.5 days |
| Phase 1: Contracts | 1 day | 1.5 days |
| Phase 2: Delivery Infra | 2 days | 3.5 days |
| Phase 3: Invoice + Quotation | 2 days | 5.5 days |
| Phase 4: Receipt | 1.5 days | 7 days |
| Phase 5: CSR + Waybill | 2.5 days | 9.5 days |
| Phase 6: BOQ + RFQ | 1.5 days | 11 days |
| Phase 7: Project Docs | 1 day | 12 days |
| Phase 8: Cleanup | 1 day | 13 days |
| **Buffer (20%)** | **~2.5 days** | **~15.5 days** |

**Total Estimate: ~3 weeks (15-16 working days)**

---

## 8. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Android filesystem permission changes | Medium | High | Test on API 29, 30, 33, 34; keep `exportPdfToDevice` as fallback |
| PDF rendering differences (fonts, layout) | Low | Medium | Visual regression testing per phase; keep templates unchanged |
| Feedback event loss during migration | Low | Medium | Centralized `FeedbackBus`; verify toasts in manual testing |
| TypeScript errors in generators | Low | Low | Strict typing in `PdfGenerator` interface; compile each phase |
| Forgotten caller using legacy API | Medium | Low | Grep for `toBlob()`, `exportPdfToDevice` after each phase |
| Breaking change in `@react-pdf/renderer` | Low | High | Pin version; test PDF output each phase |

---

## 9. Success Criteria (Architecture Invariants Verified)

Per `PDF-Architecture-v1.md` Invariants 1-10:

- [ ] **Invariant 1:** Single PDF blob creation point → Only in `PdfGenerator` implementations
- [ ] **Invariant 2:** `PdfAsset` is universal boundary → All generators return `PdfAsset`; all delivery accepts `PdfAsset`
- [ ] **Invariant 3:** Generation ≠ Delivery → Generators don't download/save/share; Delivery doesn't render
- [ ] **Invariant 4:** Delivery owns platform behavior → Capacitor APIs only in `NativePdfDelivery`
- [ ] **Invariant 5:** Document modules own business meaning → No filesystem/download/share/print/storage in domain
- [ ] **Invariant 6:** Templates are presentation only → Verified: no side effects in templates
- [ ] **Invariant 7:** New docs inherit infrastructure → Add generator + template = full delivery
- [ ] **Invariant 8:** No parallel pipelines → Grep confirms single generator/delivery per platform
- [ ] **Invariant 9:** Backward compat during migration → Adapters exist until Phase 8
- [ ] **Invariant 10:** Feedback centralized → `FeedbackBus` emits all events

---

## 10. File Index (Quick Reference)

### New Infrastructure (Phases 1-2)
```
src/lib/pdf/
├── PdfAsset.ts
├── PdfGenerator.ts
├── PdfDelivery.ts
├── types.ts
├── index.ts
├── delivery/
│   ├── WebPdfDelivery.ts
│   ├── NativePdfDelivery.ts
│   ├── PdfDeliveryFactory.ts
│   ├── FeedbackBus.ts
│   └── index.ts
└── generators/
    ├── InvoicePdfGenerator.ts
    ├── QuotationPdfGenerator.ts
    ├── ReceiptPdfGenerator.ts
    ├── CsrPdfGenerator.ts
    ├── WaybillPdfGenerator.ts
    ├── TableDocumentPdfGenerator.ts
    ├── ProjectDocumentPdfGenerator.ts
    ├── BlankWaybillPdfGenerator.ts
    └── index.ts
```

### Modified Adapters (Phases 2-7)
```
src/components/document-view/shared/downloadPdf.tsx
src/domain/quotation/pdfDownloadHandler.ts
src/components/document-view/invoice/useInvoiceActions.ts
src/pages/ViewInvoice.tsx
src/pages/ViewQuotation.tsx
src/pages/ViewReceipt.tsx
src/pages/ViewCSR.tsx
src/pages/ViewWaybill.tsx
src/pages/ViewBoq.tsx
src/pages/ViewRfq.tsx
src/pages/ProjectDocumentView.tsx
```

### Deleted in Phase 8
```
src/components/pdf-new/generateInvoicePdf.ts
src/components/pdf-new/generateQuotationPdf.ts
# Legacy exports from pdf-new/index.ts
```

---

## 11. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Architecture Owner | | | |
| Platform Lead | | | |
| QA Lead | | | |

---

*This migration plan is derived from `docs/prd/PDF-Architecture-v1.md` and reflects the current codebase state as of 2026-07-13.*