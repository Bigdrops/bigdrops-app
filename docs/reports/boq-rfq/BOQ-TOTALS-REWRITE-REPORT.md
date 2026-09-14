# BOQ Totals Rewrite Report

This report was written by OpenCode on 2026-09-14 via Local Runner.

## Objective
Replace the previous `computeDocument()`-based adapter with a BOQ-native calculation model using `decimal.js`. BOQ is a costing/pricing schedule only — VAT, discount, WHT, and additional charges are quotation/invoice concepts that must not appear in BOQ.

## Scope
BOQ totals and profit display only. Did NOT modify: BOQ storage/CRUD, BOQ→Quotation conversion, canonical document-model, unrelated renderers, unrelated UI refactors.

## Files Changed

| File | Change |
|------|--------|
| `src/domain/boq/calculateBoqTotals.ts` | Rewrote — removed `computeDocument()` import, native Decimal.js arithmetic |
| `src/components/boq/BoqForm.tsx` | Destructured new totals shape; Output tab shows Total Cost/SP/Gross Profit |
| `src/components/boq/BoqPreview.tsx` | Totals strip shows Total Cost/Total Selling Price/Gross Profit |
| `src/pages/ViewBoq.tsx` | Hero metrics show Total Cost/Total Selling Price/Gross Profit |
| `src/components/table-document/TableRowsEditor.tsx` | Added derived read-only Profit field after CP/SP for item rows |
| `src/components/table-document/TableDocumentPreview.tsx` | Added derived Profit column to BorderedSchedule template |
| `src/components/table-document/TableDocumentPdfDocument.tsx` | Added Profit column header and data cells; rebalanced width percentages |

## Skills Used
NONE

## Documentation Standard
ASD-STE100 Simplified Technical English

## Changes Made

### calculateBoqTotals.ts
- Removed `import { computeDocument } from '@/lib/Calculations'`
- Pure Decimal.js arithmetic for all core calculations
- Exports: `computeBoqTotals()` and `computeRowProfit()`
- BoqTotals interface: `{ total_cost, total_selling_price, gross_profit }`
- Gross profit derived from aggregate totals, NOT from summing row-level profits

### UI Totals Presentation
- Subtotal/Discount/VAT/WHT/Grand Total replaced with:
  - Total Cost (Σ CP × Qty)
  - Total Selling Price (Σ SP × Qty)
  - Gross Profit (Total SP − Total Cost)
- Applied across BoqForm, BoqPreview, and ViewBoq hero metrics

### Derived Profit Column
- Per-row Profit = (SP − CP) × Quantity
- Display-only — no persisted profit field
- Shows only when CP or SP columns are visible
- Added to TableRowsEditor (form), TableDocumentPreview (BorderedSchedule), and TableDocumentPdfDocument (PDF)

### PDF Width Rebalancing
- `widthsByKey` adjusted: description 34→30, specification 18→16, quantity/unit 10→8, make_brand 12→10, new profit: 10
- Total: 100%

## Verification Result
- `bun run audit:load`: passed (no new regressions)
- `bun run typecheck`: passed

## Risks or Limitations
- `computeDocument()` and its quotation/invoice consumers were NOT modified — confirmed safe
- PDF column widths were rebalanced; visual review recommended
- `amount_in_words` remains deferred; when implemented for BOQ it must represent Total Selling Price

## Deferred Work
- Visual QA of PDF output with all column combinations
- `amount_in_words` for BOQ (deferred per original spec)
