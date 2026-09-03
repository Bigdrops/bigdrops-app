# Receipts Module — Navigation & List/Detail Wiring Report

**This report was written by OpenCode on 2026-07-08 via Local Runner.**

## Objective

Add a standalone Receipts module (list + detail + navigation) to the BIGDROPS app for browsing, searching, and downloading receipt snapshots — without modifying receipt generation or payment recording.

## Scope

- **Included:** type-system registration, navigation picker, route wiring, list page with search/filter, detail page with PDF download, icon registry, data adapter, repository function.
- **Excluded:** receipt creation/editing/deletion (receipts are immutable), financial calculation changes, PDF template changes, quick tile registration (no tile on home screen — only nav picker).

## Files Modified

| File | Change |
|------|--------|
| `src/types/queryPlatform.ts` | Added `"receipts"` to `ModuleScope`, `ModuleQueryMap` (→ `FinancialQueryState`), `ModuleTypeMap` (→ `"financial"`) |
| `src/lib/iconRegistry.ts` | Added `receipts: Receipt` icon key |
| `src/context/DocumentQueryContext.tsx` | Added `receipts: "financial"` to `MODULE_TYPE_MAP` |
| `src/config/moduleAdapters.ts` | Added `receiptsAdapter` with financial-type adapter (search by receipt/invoice/client, filter by status/amount, sort by date, cache `"bd:list:receipts:v1:all"`); registered in `adapterRegistry` |
| `src/domain/receipt/receiptRepository.ts` | Added `fetchAllReceipts()` and `fetchReceiptById()` |
| `src/components/app/AppShell.tsx` | Added lazy imports and `<Route>` entries for `/receipts` and `/receipts/:id` |
| `src/components/layout/navData.ts` | Added `receipts` entry to `salesPicker` (emerald tint), `getSalesPath()`, and `getActiveTab()` |

## Files Created

| File | Purpose |
|------|---------|
| `src/pages/Receipts.tsx` | List page using `DocumentQueryProvider("receipts")`, `ModuleShell`, `ModuleRowCard`, action sheet (View / Copy Number) |
| `src/pages/ViewReceipt.tsx` | Detail page using `DocumentPage`, `DocumentTopNav`, receipt snapshot display, `FloatingDownloadButton` + `downloadPdfFromElement` with `ReceiptPdf` |

## Files Unchanged (Verified Not Needed)

- `src/domain/receipt/types.ts` — `ReceiptRow` already complete
- `src/domain/receipt/previewModel.ts` — `buildReceiptPreviewData` already exists
- `src/components/pdf-new/ReceiptPdf.tsx` — already renders from `ReceiptPreviewData`
- `src/components/document-view/shared/DocumentPage.tsx`, `DocumentTopNav.tsx`, `downloadPdf.tsx`, `FloatingDownloadButton.tsx` — all already support the patterns used

## Key Decisions

1. **Nav placement:** Receipts lives in the Sales tab (alongside Invoices, Quotations, CSR, Waybills) per the "Financial Operations nav" requirement.
2. **No quick tile:** `quickTiles.ts` is external; receipt list is accessed from the Sales picker only.
3. **Immutable:** No create/edit/delete/duplicate/convert operations — covers the explicit constraint.
4. **Data source:** Receipts are fetched from the `receipts` table only (snapshot pattern), never reconstructed from invoices/payments.

## Risks & Limitations

- `quickTiles.ts` not found at `src/config/quickTiles.ts` — the navigation entry uses `Icons.receipts` directly (with a static emerald tint) rather than reading from a tile registry. If a tile is needed later, the tint/bg will be duplicated until someone registers it in `quickTiles.ts`.
- The `buildReceiptPreviewData` function is assumed to handle all `ReceiptRow` fields — verified by reading source, but no runtime test was run.
- The `receiptsAdapter` fetcher uses a `select("*")` broad query, same as other adapters. This is consistent with existing patterns but flagged by the audit.

## Verification

- `bun run typecheck` — passes (only pre-existing errors in waybill templates)
- `bun run audit:load` — passes (no new warnings from our changes)
- `git status` confirmed no unintended file modifications

## Deferred Work

- **Quick tile registration:** If a home-screen quick tile is desired, add a `receipts` entry to `quickTiles.ts` (wherever that lives in production) with an emerald tint.
- **Receipt PDF preview in list:** The `Receipts` list page shows basic fields; a visible preview (like invoice list does) was not requested.
- **Bulk download:** Only single-PDF download from detail view.
- **Mobile test:** Routes and hooks are typed correctly, but no device/E2E test was run for mobile sheet rendering.
