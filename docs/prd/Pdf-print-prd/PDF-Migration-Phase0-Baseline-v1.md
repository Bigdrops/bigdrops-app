# PDF Migration Phase 0 — Baseline & Safety

> This document freezes the current PDF behavior before any migration work begins.
> **Phase 0 must not modify any PDF behavior.** It only maps, catalogs, and records.

---

## 1. PDF Entry Points (cataloged)

| Entry Point | File Path | Document Type | Trigger |
|-------------|-----------|---------------|---------|
| `generateInvoicePdf` | `src/components/pdf-new/index.ts:119` | Invoice | ViewInvoice → Actions → Download PDF |
| `generateQuotationPdf` | `src/components/pdf-new/index.ts:123` | Quotation | ViewQuotation → Actions → Download PDF |
| `downloadPdfFromElement` (CSR) | `src/pages/ViewCSR.tsx:234` | CSR | ViewCSR → Download button |
| `downloadPdfFromElement` (BOQ) | `src/pages/ViewBoq.tsx:112` | BOQ | ViewBoq → Download button |
| `downloadPdfFromElement` (RFQ) | `src/pages/ViewRfq.tsx:113` | RFQ | ViewRfq → Download button |
| `downloadPdfFromElement` (Waybill) | `src/pages/ViewWaybill.tsx:273` | Waybill | ViewWaybill → Download button |
| `downloadPdfFromElement` (Receipt) | `src/pages/ViewReceipt.tsx:50` | Receipt | ViewReceipt → Download button |
| `downloadBlankWaybillTemplate` | `src/components/waybill/blankWaybillTemplate.tsx:288` | Blank Waybill | WaybillFormPage → "Download Blank" |
| `downloadBlankCsr` (inline) | `src/pages/CsrFormPage.tsx:301` | Blank CSR | CsrFormPage → "Download Blank CSR" |
| `generateInvoicePdf` (offline CSR) | `src/pages/CsrFormPage.tsx:439` | CSR | Field CSR save → auto PDF download |
| `downloadInvoicePdfDocument` | `src/components/document-view/invoice/invoicePdfActions.ts:15` | Invoice (duplicate) | InvoiceMoreSheet → Export PDF |
| `ProjectDocumentCard.handleExport` | `src/components/project/ProjectDocumentCard.tsx:166` | Project Document | Project Document Card → Export PDF |

---

## 2. Direct `react-pdf` Usage (cataloged)

| Usage | File Path | Component/Function | Method Called |
|-------|-----------|-------------------|---------------|
| `pdf(element).toBlob()` | `src/components/pdf-new/index.ts:110` | `generateInvoicePdf` / `generateQuotationPdf` | `.toBlob()` |
| `pdf(element).toBlob()` | `src/components/waybill/blankWaybillTemplate.tsx:305` | `downloadBlankWaybillTemplate` | `.toBlob()` |
| `pdf(element).toBlob()` | `src/pages/CsrFormPage.tsx:322, 439` | `handleDownloadBlankCsr` / field CSR save | `.toBlob()` |
| `pdf(element).toBlob()` | `src/pages/ProjectDocumentView.tsx:83` | Project Document View | `.toBlob()` |
| `pdf(element).toBlob()` | `src/components/project/ProjectDocumentCard.tsx:74` | Project Document Card | `.toBlob()` |
| `pdf(element).toBlob()` | `src/components/document-view/shared/downloadPdf.tsx:26` | `downloadPdfFromElement` | `.toBlob()` |
| Template components (JSX) | `src/components/pdf-new/templates/*.tsx` | Industry, Ledger, Crest, Minimal, Evergreen, Bolt, Ember | `Document`, `Page`, `View`, `Text`, `Image`, `StyleSheet` |
| Waybill templates | `src/components/waybill/*Template.tsx` | Classic, Premium, Evergreen, Slate, Minimal, Thermal | `Document`, `Page`, `View`, `Text`, `Image`, `StyleSheet` |
| CSR templates | `src/components/csr/preview-templates/*.tsx` | Zinc, Minimal, Sentinel, Nexus, Industry | `Document`, `Page`, `View`, `Text`, `Image`, `StyleSheet` |
| Receipt template | `src/components/pdf-new/ReceiptPdf.tsx` | Receipt | `Document`, `Page`, `View`, `Text`, `Image`, `StyleSheet` |
| BOQ/RFQ template | `src/components/table-document/TableDocumentPdfDocument.tsx` | BOQ, RFQ | `Document`, `Page`, `View`, `Text`, `StyleSheet` |
| PdfRenderer wrapper | `src/components/pdf-new/renderers/PdfRenderer.tsx:1` | `PdfRenderer` | `Document` |

---

## 3. Download Paths (cataloged)

| Path | File Path | Platform | Mechanism |
|------|-----------|----------|-----------|
| Web download (Blob URL + anchor) | `src/components/pdf-new/index.ts:20-29` | Web | `URL.createObjectURL` + `<a download>` |
| Web download (Blob URL + anchor) | `src/components/waybill/blankWaybillTemplate.tsx:306-313` | Web | `URL.createObjectURL` + `<a download>` |
| Web download (Blob URL + anchor) | `src/pages/CsrFormPage.tsx:323-328` | Web | `URL.createObjectURL` + `<a download>` |
| Native export (Capacitor Filesystem) | `src/lib/native/pdfexport.ts:69-110` | Android/iOS | `Filesystem.writeFile` + `Filesystem.getUri` |
| Native open (FileOpener) | `src/lib/native/pdfexport.ts:126-132` | Android/iOS | `FileOpener.open` |
| Native share (Share API) | `src/lib/native/pdfexport.ts:112-124` | Android/iOS | `Share.share` with file URI |
| Web fallback in `exportPdfToDevice` | `src/lib/native/pdfexport.ts:48-67` | Web | `downloadBlobOnWeb` (Blob URL + anchor) |
| Unified download entry | `src/components/document-view/shared/downloadPdf.tsx:13-52` | Web + Native | Calls `exportPdfToDevice` → then `openExportedPdf` / `shareExportedPdf` |

---

## 4. Native Delivery Paths (cataloged)

| Path | File Path | Platform | Capacitor Plugin |
|------|-----------|----------|------------------|
| `Filesystem.writeFile` (Cache dir) | `src/lib/native/pdfexport.ts:92-97` | Android/iOS | `@capacitor/filesystem` |
| `Filesystem.mkdir` (recursive) | `src/lib/native/pdfexport.ts:84-90` | Android/iOS | `@capacitor/filesystem` |
| `Filesystem.getUri` | `src/lib/native/pdfexport.ts:99-102` | Android/iOS | `@capacitor/filesystem` |
| `Share.share` | `src/lib/native/pdfexport.ts:119-123` | Android/iOS | `@capacitor/share` |
| `FileOpener.open` | `src/lib/native/pdfexport.ts:127-131` | Android/iOS | `@capacitor-community/file-opener` |
| `isNativePlatform()` check | `src/lib/native/capacitor.ts` | All | Custom utility |
| Platform detection | `src/lib/native/capacitor.ts` | All | `Capacitor.isNativePlatform()` |

---

## 5. Existing Tests / Manual Matrix

| Test | File Path | Coverage | Status |
|------|-----------|----------|--------|
| pdfCustomizationResolver | `src/tests/critical/pdfCustomizationResolver.test.ts` | Customization resolver logic (8 scenarios) | ✅ Passes |
| pdfRegressionCleanup (invoice) | `src/tests/invoice/pdfRegressionCleanup.test.js` | Invoice preview model, financial projection, document media, industry template, adapter, table, settings, customize sheet, view page | ✅ Passes |
| pdfCurrency | `src/tests/pdf-new/pdfCurrency.test.js` | Currency formatting in PDF | ✅ Passes |
| pdfTemplateLayout (CSR) | `src/tests/csr/pdfTemplateLayout.test.js` | CSR template layout validation | ✅ Passes |
| Manual: Invoice PDF download | ViewInvoice page | End-to-end invoice PDF generation + download | Manual |
| Manual: Quotation PDF download | ViewQuotation page | End-to-end quotation PDF generation + download | Manual |
| Manual: CSR PDF download | ViewCSR page | End-to-end CSR PDF generation + download | Manual |
| Manual: Waybill PDF download | ViewWaybill page | End-to-end waybill PDF generation + download | Manual |
| Manual: BOQ PDF download | ViewBoq page | End-to-end BOQ PDF generation + download | Manual |
| Manual: RFQ PDF download | ViewRfq page | End-to-end RFQ PDF generation + download | Manual |
| Manual: Receipt PDF download | ViewReceipt page | End-to-end receipt PDF generation + download | Manual |
| Manual: Project Document PDF | ProjectDocumentView page | End-to-end project doc PDF generation + download | Manual |
| Manual: Blank Waybill | WaybillFormPage | Blank waybill template download | Manual |
| Manual: Blank CSR | CsrFormPage | Blank CSR template download | Manual |
| Manual: Native Android save/open/share | Android device | `exportPdfToDevice` → `Filesystem` → `FileOpener`/`Share` | Manual |
| Manual: Web download | Browser | Blob URL + anchor click | Manual |

---

## 6. Git Baseline

- **Commit**: `ca2fbf742147da3a748ea5467bc0f03cc49f00f0` — "Create PDF-Architecture-v1.md"
- **Branch**: `main` (or current working branch)

### Files to be Modified in Migration (from PDF-Migration-Plan-v1.md)

**Phase 1 (New Contracts):**
- `src/lib/pdf/PdfAsset.ts` (new)
- `src/lib/pdf/PdfGenerator.ts` (new)
- `src/lib/pdf/PdfDelivery.ts` (new)
- `src/lib/pdf/types.ts` (new)

**Phase 2 (Delivery Infrastructure):**
- `src/lib/pdf/delivery/WebPdfDelivery.ts` (new)
- `src/lib/pdf/delivery/NativePdfDelivery.ts` (new)
- `src/lib/pdf/delivery/PdfDeliveryFactory.ts` (new)
- `src/lib/pdf/FeedbackBus.ts` (new)
- `src/components/document-view/shared/downloadPdf.tsx` (modify → adapter)
- `src/lib/native/pdfexport.ts` (modify → extract utilities only)

**Phase 3 (Invoice + Quotation):**
- `src/components/pdf-new/generators/InvoicePdfGenerator.ts` (new)
- `src/components/pdf-new/generators/QuotationPdfGenerator.ts` (new)
- `src/components/document-view/invoice/invoicePdfActions.ts` (modify)
- `src/pages/ViewInvoice.tsx` (modify)
- `src/pages/ViewQuotation.tsx` (modify)

**Phase 4 (Receipt):**
- `src/components/pdf-new/generators/ReceiptPdfGenerator.ts` (new)
- `src/pages/ViewReceipt.tsx` (modify)

**Phase 5 (CSR + Waybill):**
- `src/components/pdf-new/generators/CsrPdfGenerator.ts` (new)
- `src/components/pdf-new/generators/WaybillPdfGenerator.ts` (new)
- `src/pages/ViewCSR.tsx` (modify)
- `src/pages/ViewWaybill.tsx` (modify)

**Phase 6 (BOQ + RFQ + Project Documents):**
- `src/components/pdf-new/generators/TableDocumentPdfGenerator.ts` (new)
- `src/pages/ViewBoq.tsx` (modify)
- `src/pages/ViewRfq.tsx` (modify)
- `src/pages/ProjectDocumentView.tsx` (modify)

**Phase 7 (Project Documents + Blank Waybill):**
- `src/components/pdf-new/generators/ProjectDocumentPdfGenerator.ts` (new)
- `src/components/pdf-new/generators/BlankWaybillPdfGenerator.ts` (new)
- `src/components/waybill/blankWaybillTemplate.tsx` (modify)
- `src/pages/CsrFormPage.tsx` (modify blank CSR)

**Phase 8 (Cleanup):**
- Remove legacy adapters in `downloadPdf.tsx`, `pdfexport.ts`, `invoicePdfActions.ts`
- Remove direct `pdf().toBlob()` calls from templates

---

## 7. Phase 0 Verification Checklist

☐ All entry points mapped
☐ All `react-pdf` usage mapped
☐ All download paths mapped
☐ All native delivery paths mapped
☐ Tests documented
☐ Git baseline captured (`ca2fbf742147da3a748ea5467bc0f03cc49f00f0`)
☐ **No behavior modified**
☐ Ready for Phase 1

---

## 8. Verification Commands (run before Phase 1)

```bash
# Type-check passes
bun run typecheck

# Audit passes
bun run audit:load

# Critical tests pass
bun run test

# Git status clean
git status
```

---

*Generated by Phase 0 exploration. This document must not be modified during Phase 1+ implementation — it is the frozen baseline.*