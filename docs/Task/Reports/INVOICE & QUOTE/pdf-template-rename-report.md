# PDF Template Rename Report

**Date:** 2025-07-10  
**Phase:** D — Naming Decoupling  
**Status:** Complete  

---

## 1. Objective

Rename template-coupled symbols in the PDF rendering pipeline to reflect their actual generic purpose, eliminating the misleading "Industry" prefix on universal abstractions.

---

## 2. Renames Completed

### Type Renames
| Old Name | New Name | File |
|---|---|---|
| `IndustryTemplateData` | `PdfTemplateData` | `src/components/pdf-new/industryAdapter.ts` |
| `IndustryTemplateDesign` | `PdfTemplateDesign` | `src/components/pdf-new/industryAdapter.ts` |

### Function Renames
| Old Name | New Name | File |
|---|---|---|
| `adaptIndustryData()` | `adaptPdfTemplateData()` | `src/components/pdf-new/industryAdapter.ts` |

### Export Renames
| Old Name | New Name | File |
|---|---|---|
| `compactIndustry` | `compactPdfTemplate` | `src/components/pdf-new/core/pdfCompact.ts` |
| `IndustryPartyCard` | `PdfPartyCard` | `src/components/pdf-new/templates/pdfTemplateBlocks.tsx` |
| `IndustryGroupHeaderRow` | `PdfGroupHeaderRow` | `src/components/pdf-new/templates/pdfTemplateBlocks.tsx` |
| `IndustryGroupFooterRow` | `PdfGroupFooterRow` | `src/components/pdf-new/templates/pdfTemplateBlocks.tsx` |

### File Renames
| Old Name | New Name |
|---|---|
| `src/components/pdf-new/templates/industryTemplateBlocks.tsx` | `src/components/pdf-new/templates/pdfTemplateBlocks.tsx` |

---

## 3. Files Updated

### Core Files
- `src/components/pdf-new/industryAdapter.ts` — Type and function definitions
- `src/components/pdf-new/core/pdfCompact.ts` — Export rename
- `src/components/pdf-new/templates/pdfTemplateBlocks.tsx` — Component and type renames
- `src/components/pdf-new/index.ts` — Import and call site updates

### Template Files (import updates)
- `src/components/pdf-new/templates/Industry.tsx`
- `src/components/pdf-new/templates/Apex.tsx`
- `src/components/pdf-new/templates/Bolt.tsx`
- `src/components/pdf-new/templates/ObsidianReceipt.tsx`
- `src/components/pdf-new/templates/Ledger.tsx`

### Domain Files (import and call site updates)
- `src/domain/invoice/previewModel.ts`
- `src/domain/quotation/previewModel.ts`

### Test Files (import and call site updates)
- `src/tests/pdf-new/industryLayout.test.js`
- `src/tests/pdf-new/index.test.js`
- `src/tests/invoice/previewPipelineSync.test.js`

---

## 4. Verification

| Check | Result |
|---|---|
| `bun run typecheck` | ✅ Passed |
| `bun run build` | ✅ Passed (1m 15s) |

---

## 5. Impact Analysis

### Breaking Changes
None. All renames are internal to the PDF rendering pipeline. No public API changes.

### Template Independence
Maintained. No template imports from another template. The Industry template's block components (`PdfPartyCard`, `PdfGroupHeaderRow`, `PdfGroupFooterRow`) are only imported by `Industry.tsx`.

### Semantic Clarity
The central contract type (`PdfTemplateData`) and adapter function (`adaptPdfTemplateData`) now accurately reflect their generic purpose as the universal rendering contract for all templates.

---

## 6. Remaining Decoupling Work

| Task | Risk | Status |
|---|---|---|
| Extract `getPdfColumns`, `getPdfCellValue` from `domain/invoice` to shared location | Medium | Pending |
| Extract `buildSummaryRows` from `domain/invoice` to `domain/shared/` | Low | Pending |
| Parameterize currency symbol (currently hardcoded ₦) | Low | Pending |

---

## 7. Architecture Reminder

The PDF rendering pipeline has three layers:

```
Domain layer (invoice/quotation preview models)
  → Adapter layer (adaptPdfTemplateData)
    → Template layer (5 template components)
```

**The adapter is the single chokepoint.** All templates consume `PdfTemplateData` from the same adapter function. The naming is now decoupled from the Industry template.
