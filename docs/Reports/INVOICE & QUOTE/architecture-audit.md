# Invoice & Quotation PDF Architecture Audit

**Date:** 2025-07-10  
**Scope:** Read-only analysis of the `src/components/pdf-new/` rendering system  
**Question:** Is the Industry template infrastructure template-neutral, or coupled to the Industry template?

---

## 1. System Overview

The PDF rendering pipeline has three layers:

```
Domain layer (invoice/quotation preview models)
  → Adapter layer (industryAdapter.ts)
    → Template layer (5 template components)
```

**Entry point:** `src/components/pdf-new/index.ts` — `generatePdf()` dynamically imports the correct template based on a `templateId` string (`"industry"`, `"apex"`, `"bolt"`, `"obsidian-receipt"`, `"ledger"`).

**Renderer shell:** `src/components/pdf-new/renderers/PdfRenderer.tsx` — a 3-line wrapper: `<Document><Template data={data} layout={layout} compact={compact} /></Document>`. No pagination logic, no domain knowledge.

---

## 2. The Universal Contract: `IndustryTemplateData`

**File:** `src/components/pdf-new/industryAdapter.ts`

`adaptIndustryData()` transforms `PdfDocumentModel` → `IndustryTemplateData`. This is the **single adapter that exists** — every template consumes this same output type.

**All 5 templates import `IndustryTemplateData`:**
- `templates/Industry.tsx`
- `templates/Apex.tsx`
- `templates/Bolt.tsx`
- `templates/ObsidianReceipt.tsx`
- `templates/Ledger.tsx`

**The adapter is structurally generic.** It produces:
- `identity` (number, title, dates, status)
- `company` / `client` (party objects with name, address, phone, email, customInfo)
- `table.rows[]` (line items with cells, group headers/footers, subtotals)
- `totals` (summary rows with label + amount)
- `notes`, `terms`, `bankDetails`, `signature`, `logo`, `attachments`
- `design` (colors, fonts, layout flags)

**Verdict:** The contract is template-neutral in shape. The problem is naming.

---

## 3. Naming Coupling (Real)

| Symbol | Location | Problem |
|---|---|---|
| `IndustryTemplateData` | `industryAdapter.ts` | Type name implies Industry-specific; actually the universal contract |
| `adaptIndustryData()` | `industryAdapter.ts` | Function name implies Industry-specific; actually the universal adapter |
| `IndustryPartyCard` | `industryTemplateBlocks.tsx` | Component name implies Industry-only; not imported by other templates |
| `IndustryGroupHeaderRow` | `industryTemplateBlocks.tsx` | Same |
| `IndustryGroupFooterRow` | `industryTemplateBlocks.tsx` | Same |
| `compactIndustry` | `core/pdfCompact.ts` | Object name implies Industry-specific; shape is generic |
| `industryStyles` | `templates/industryStyles.ts` | Import path coupling in `industryTemplateBlocks.tsx` |
| `industryTemplateBlocks.tsx` | Filename | File name implies Industry-only ownership |

**Impact:** A developer reading the code would assume `IndustryTemplateData` is an Industry-specific type, when it is actually the universal rendering contract. This creates confusion about where the abstraction boundary is.

---

## 4. Naming Coupling (Not Real)

The `Industry` prefix on block components is **not a runtime coupling** — only `Industry.tsx` imports `IndustryPartyCard`, `IndustryGroupHeaderRow`, `IndustryGroupFooterRow` from `industryTemplateBlocks.tsx`. The other templates implement their own party/group components inline or use different patterns.

The file `industryTemplateBlocks.tsx` is effectively **owned by the Industry template**, not shared infrastructure. The "Industry" prefix is accurate for the *implementation* but misleading because the file sits alongside shared utilities.

---

## 5. Structural Coupling (Real)

### 5a. Table Infrastructure → Invoice Domain

`src/components/pdf-new/table.ts` imports:
- `getPdfColumns`, `getPdfCellValue` from `domain/invoice/columns`
- `normalizeQuantity` from `domain/invoice/normalize`

This means the **shared rendering layer** depends on **invoice-specific domain logic**. Quotation PDF generation also flows through this path (via `adaptIndustryData` which calls `buildPdfRowCells`), so the coupling is not technically wrong — but the import paths reveal that the table abstraction was built for invoices first and generalized later.

### 5b. Preview Models → Industry Adapter

Both `domain/invoice/previewModel.ts` and `domain/quotation/previewModel.ts` call `adaptIndustryData()` directly to build preview items. The quotation preview model also imports `buildSummaryRows` from `domain/invoice`.

### 5c. PdfRenderer → Convention-Based Layout Extraction

`PdfRenderer` reads `data.template.pageLayout` — a convention embedded in the data model, not a typed contract. If a template omits `template.pageLayout`, the renderer gets `undefined` silently.

### 5d. pdfCurrency.ts → Hardcoded ₦ Symbol

`lib/formatters/pdfCurrency.ts` hardcodes `PDF_CURRENCY_SYMBOL = '₦'`. This is not template-coupled, but it is locale-coupled — the "universal" currency renderer only works for Naira.

---

## 6. Template Independence (Real)

Each template is a self-contained React component with its own stylesheet:

| Template | Style file | Has own party rendering | Has own table rendering | Has own totals |
|---|---|---|---|---|
| Industry | `industryStyles.ts` | Yes (`IndustryPartyCard`) | Yes (inline) | Yes |
| Apex | `ApexStyles.ts` | No (minimal) | No | No |
| Bolt | `BoltStyles.ts` | Yes (inline) | Yes (inline) | Yes |
| Obsidian | `ObsidianReceiptStyles.ts` | Yes (inline) | Yes (inline) | Yes |
| Ledger | `LedgerStyles.ts` | Yes (inline) | Yes (inline) | Yes |

No template imports styles or components from another template. No template depends on `industryStyles.ts` except `industryTemplateBlocks.tsx` (which is only used by Industry).

---

## 7. Shared Infrastructure (Template-Neutral)

These modules are genuinely template-agnostic:

| Module | Purpose |
|---|---|
| `core/safeText.ts` | Value-to-string coercion |
| `core/richText.ts` | HTML-to-segments parser |
| `core/pdfRichText.ts` | React-PDF rich text renderer |
| `core/displayValue.ts` | `hasDisplayValue()` check |
| `core/description.ts` | Description main/sub extraction |
| `pdfCurrency.tsx` | Currency symbol detection + Noto Sans font |
| `pdfSharedFonts.ts` | Font registration and resolution |
| `pdfDesignPreset.ts` | Design preset storage/normalization |
| `domain/documentMedia.ts` | Logo/image URL resolution |
| `types.ts` | Shared domain types (`PdfDocumentModel`, `PdfColumnDefinition`, etc.) |
| `renderers/PdfRenderer.tsx` | Thin Document+Template shell |

---

## 8. Data Flow Summary

```
Invoice/Quotation Page
  ↓
buildInvoicePreviewModel() / buildQuotationPreviewModel()
  ↓ (calls adaptIndustryData for preview items)
Preview UI (HTML)
  ↓ (user clicks download)
handleDownloadQuotationPdf() / invoice equivalent
  ↓ (builds PdfDocumentModel, calls generatePdf)
generatePdf(templateId, pdfData)
  ↓ (dynamic import of template component)
PdfRenderer → <Document><Template data={...} /></Document>
  ↓
react-pdf renders to blob/URL
```

Both the preview path and the download path call `adaptIndustryData()` — the adapter is the single chokepoint.

---

## 9. Findings Summary

### Is the infrastructure template-neutral?

**Structurally: mostly yes.** The adapter produces a generic shape. Templates are independent. No template imports from another template. The dispatcher is agnostic.

**Semantically: no.** The central contract type (`IndustryTemplateData`) and adapter function (`adaptIndustryData`) carry the "Industry" name, implying they belong to one template when they are actually universal.

### Is there Industry-specific logic leaking into shared code?

**No runtime leakage.** The Industry template's specific behaviors (party cards with customInfo, group headers/footers with subtotals, accent tinting) are all contained within `Industry.tsx` and `industryTemplateBlocks.tsx`. Other templates do not import these.

### Where is the real coupling?

1. **Naming:** `IndustryTemplateData`, `adaptIndustryData`, `IndustryPartyCard`, `compactIndustry` — all misleading names for generic abstractions.
2. **Table → Invoice domain:** `table.ts` imports from `domain/invoice/columns` and `domain/invoice/normalize`.
3. **Preview models → Invoice domain:** Quotation preview imports `buildSummaryRows` from `domain/invoice`.
4. **Currency → Naira:** Hardcoded ₦ symbol in `pdfCurrency.ts`.

---

## 10. Recommendations

### Rename (low risk, high clarity)
- `IndustryTemplateData` → `PdfTemplateData`
- `adaptIndustryData()` → `adaptPdfTemplateData()`
- `compactIndustry` → `compactPdfTemplate`
- `industryTemplateBlocks.tsx` → `pdfTemplateBlocks.tsx`
- `IndustryPartyCard` → `PdfPartyCard`
- `IndustryGroupHeaderRow` → `PdfGroupHeaderRow`
- `IndustryGroupFooterRow` → `PdfGroupFooterRow`
- `industryStyles.ts` → `pdfSharedBlockStyles.ts` (or keep as Industry-owned, move to `templates/Industry/` subfolder)

### Decouple table from invoice domain (medium risk)
- Extract `getPdfColumns`, `getPdfCellValue` into `components/pdf-new/tableColumns.ts` or `domain/shared/pdfColumns.ts`
- Keep `normalizeQuantity` in a shared location

### Extract quotation summary from invoice domain (low risk)
- `buildSummaryRows` could live in `domain/shared/summaryRows.ts` instead of `domain/invoice/`

### Parameterize currency (if multi-currency is planned)
- Pass currency symbol through `PdfDocumentModel` rather than hardcoding in `pdfCurrency.ts`

### Add typed layout contract (optional)
- Type `pageLayout` as `PdfPageLayout | undefined` in `PdfDocumentModel` instead of relying on convention.
