# Commercial Document Engine Rename — Implementation Report

**Date:** 2026-06-26  
**Status:** ✅ COMPLETE — typecheck clean, build clean, zero stale references

---

## Summary

Renamed the shared PDF rendering engine from `Pdf*` prefix to `CommercialDocument*` prefix across the entire codebase. This is a **semantic architectural rename only** — no rendering changes, no visual redesign, no business logic changes.

## Symbols Renamed

| Old Name | New Name | File |
|---|---|---|
| `PdfTemplateData` | `CommercialDocumentData` | `industryAdapter.ts` |
| `PdfTemplateDesign` | `CommercialDocumentDesign` | `industryAdapter.ts` |
| `adaptPdfTemplateData()` | `adaptCommercialDocumentData()` | `industryAdapter.ts` |
| `compactPdfTemplate` | `compactCommercialDocument` | `pdfCompact.ts` |
| `PdfPartyCard` | `CommercialPartyCard` | `commercialDocumentBlocks.tsx` |
| `PdfGroupHeaderRow` | `CommercialGroupHeaderRow` | `commercialDocumentBlocks.tsx` |
| `PdfGroupFooterRow` | `CommercialGroupFooterRow` | `commercialDocumentBlocks.tsx` |

## Files Renamed

| Old Path | New Path |
|---|---|
| `src/components/pdf-new/templates/pdfTemplateBlocks.tsx` | `src/components/pdf-new/templates/commercialDocumentBlocks.tsx` |

## Files Modified

### Source Files (8)
- `src/components/pdf-new/industryAdapter.ts` — Type + function rename
- `src/components/pdf-new/core/pdfCompact.ts` — Export rename
- `src/components/pdf-new/templates/commercialDocumentBlocks.tsx` — **Created** (renamed from pdfTemplateBlocks.tsx)
- `src/components/pdf-new/templates/Industry.tsx` — Import + usage updates
- `src/components/pdf-new/templates/Apex.tsx` — Import + type updates
- `src/components/pdf-new/templates/Bolt.tsx` — Import + type updates
- `src/components/pdf-new/templates/ObsidianReceipt.tsx` — Import + type updates
- `src/components/pdf-new/templates/Ledger.tsx` — Import + type updates

### Consumer Files (3)
- `src/components/pdf-new/index.ts` — Import + all `adaptCommercialDocumentData` calls
- `src/domain/invoice/previewModel.ts` — Import + call
- `src/domain/quotation/previewModel.ts` — Import + call

### Test Files (3)
- `src/tests/pdf-new/index.test.js` — Import + all test calls
- `src/tests/pdf-new/industryLayout.test.js` — Import + file path + calls
- `src/tests/invoice/previewPipelineSync.test.js` — Regex assertions

### Deleted Files (1)
- `src/components/pdf-new/templates/pdfTemplateBlocks.tsx`

## Verification

- ✅ `bun run typecheck` — zero errors
- ✅ `bun run build` — success (pre-existing chunk size warnings unrelated to this change)
- ✅ Grep for `PdfTemplateData|PdfTemplateDesign|compactPdfTemplate|PdfPartyCard|PdfGroupHeaderRow|PdfGroupFooterRow|adaptPdfTemplateData` — zero matches
- ✅ All 5 templates (Industry, Apex, Bolt, ObsidianReceipt, Ledger) import `CommercialDocumentData`
- ✅ `commercialDocumentBlocks.tsx` exports `CommercialPartyCard`, `CommercialGroupHeaderRow`, `CommercialGroupFooterRow`
- ✅ Industry.tsx uses `compactCommercialDocument` (no `compactPdfTemplate`)
