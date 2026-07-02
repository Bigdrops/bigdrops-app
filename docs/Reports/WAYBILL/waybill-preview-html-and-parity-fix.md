# Waybill Preview HTML Leak & PDF Parity Fix — Work Report

**Date:** 2026-06-27
**Scope:** 2 files — `WaybillDocumentPreview.tsx` (rewrite), `ViewWaybill.tsx` (wiring)
**Verification:** `bun run typecheck` passes (2 pre-existing errors in `MobileItemCard.tsx` only)

---

## Problem

1. **HTML tag leak:** Raw `<p>`, `<strong>`, `<br>` tags were visible in the on-screen preview because `richTextToPlainText()` was never called on item descriptions or notes.
2. **Preview/PDF parity:** The preview used a manually constructed `WaybillPreviewData` object with hardcoded fields and a fixed 4-column grid, while the PDF used the engine's `WaybillRenderModel` with dynamic columns. Any column change (custom columns, visibility, qty/unit merging) would only reflect in the PDF, not the preview.

## Solution

### Option A (chosen): Wire engine model into preview

#### `WaybillDocumentPreview.tsx` — Full rewrite

| Before | After |
|---|---|
| Accepted `preview: WaybillPreviewData` | Accepts `model: WaybillRenderModel \| null` |
| Hardcoded 4 columns (description, qty, rate, amount) | Dynamic columns from `model.table.columns` |
| Fixed `grid-template-columns: 1fr 60px 80px 80px` | Computed `1fr minmax(70px,auto) ...` per column count |
| Raw cell values (HTML tags visible) | All cell values passed through `richTextToPlainText()` |
| Manual field mapping from preview object | Destructured from model blocks (branding, header, parties, logistics, table, notes) |

#### `ViewWaybill.tsx` — Model computation

Removed the hardcoded `preview` object (company info, consignee, vehicle, items, etc.) and replaced with a `model` computed via `buildWaybillRenderModel()` using the same column resolution logic as `handleDownload`:

- Standard columns filtered out `quantity` and `unit`, replaced with merged `qtyLabel`
- Custom columns from `customFields.customColumns` appended
- Column visibility from `customFields.columnVisibility` respected
- Company settings mapped to `CompanySettings` interface
- Null fallback: `model` is `null` if `rawWaybill` or `settings` is unavailable (preview component returns null)

### Fallback (Option B): Manual field alignment — Not needed

## Files Changed

| File | Lines | Change |
|---|---|---|
| `src/components/document-view/waybill/WaybillDocumentPreview.tsx` | 1–109 | Full rewrite: accepts `WaybillRenderModel`, renders dynamically, sanitizes HTML |
| `src/pages/ViewWaybill.tsx` | 277–302 (insert), 563 (edit) | Replaced `preview` object with model computation via `buildWaybillRenderModel()` |

## Key Design Decisions

1. **`richTextToPlainText` applied on render, not at model-build time.** The engine's `buildRows()` uses `normalizeBlank()` which only converts null/undefined to `''` — it does NOT strip HTML. Applying sanitization in the preview component (rather than modifying the engine) preserves the no-touch zone rule for engine resolvers.

2. **Dynamic column widths:** First column gets `1fr` (description text area), rest get `minmax(70px, auto)`. This matches the visual proportions of the old hardcoded grid while supporting any number of columns.

3. **`model` computed inline (not memoized)** in `ViewWaybill.tsx` — consistent with the previous `preview` object pattern. The computation is lightweight (column mapping + single `buildWaybillRenderModel` call).

4. **Trade-off: linked invoice number dropped.** The old preview included `customFields.references?.linkedInvoiceNumber` or `waybill.po_number` under "Ref No". The engine model only provides `poNumber` from `waybill.po_number`. If linked invoice number is needed later, it should be added to the engine model.
