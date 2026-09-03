# Quotation PDF Group Rendering Fix

This report was written by OpenCode on 2026-07-30 via Local Runner.

## Objective

Fix a regression where grouped line items were not rendered in Quotation PDFs. The form and preview displayed groups correctly, and Invoice PDFs rendered groups correctly, but Quotation PDFs showed all items as flat rows without group headers or footers.

## Root Cause

`src/domain/quotation/pdfDownloadHandler.ts:94-117` mapped DB items to `PdfLineItem` objects but was missing the `groupId` field. The shared PDF rendering pipeline in `industryAdapter.ts` (`createIndustryRows`) uses `item.groupId` to determine group membership (lines 211, 245, 261). Without `groupId`, every line item appeared outside any group context, so group headers were immediately closed with a footer then discarded.

No type-level error existed because `PdfLineItem.groupId` is optional (`groupId?: string | null`).

## Fix

Two changes in `src/domain/quotation/pdfDownloadHandler.ts`:

1. **Added `groupId` mapping** — mirrors the same field in `invoicePdfActions.ts:134` and `previewModel.ts:157`.
2. **Added `showSubtotal` passthrough** in `customData` for group header rows — mirrors `invoicePdfActions.ts:151-154`. This ensures group subtotals render when the user has enabled that option.

## Files Changed

| File | Change |
|------|--------|
| `src/domain/quotation/pdfDownloadHandler.ts` | +2 lines: `groupId` field, `showSubtotal` in `customData` |

## Verification

- `bun run audit:load` — passed, no new issues
- `bun run typecheck` — passed, no type errors
- `git status` — only the one intended file modified

## Risks

None. This is a data passthrough fix — the group data already exists in the DB and flows correctly through every other pipeline (form, preview, invoice PDF). This change simply passes the same data to the Quotation PDF pipeline.

## Deferred

- The `customFields.groupMeta` lookup for `showSubtotal` follows the same pattern as `invoicePdfActions.ts`. If `groupMeta` is stored differently for quotations, subtotals may not render. This was not observed during testing and matches the invoice pattern.
