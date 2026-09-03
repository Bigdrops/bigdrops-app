# Audit Load — Oversized Files (Bloat)

This report was written by GLM on 2026-08-26 via OpenCode.

---

## Objective

Track all `bun run audit:load` [BLOAT] warnings. The audit flags files above the 600-line limit. These warnings are severity `⚠️`. They do not block CI today, but they grow unbounded and increase review cost.

Source scan: `bun run audit:load`, 787 files scanned, 2026-08-26.

## Files

| # | Path | Lines |
|---|------|-------|
| 1 | `src/components/ColumnManager.tsx` | 725 |
| 2 | `src/components/csr/CsrFormScreen.tsx` | 892 |
| 3 | `src/components/csr/preview-templates/Minimal.tsx` | 608 |
| 4 | `src/components/pdf-new/presentation/industry/IndustryTemplate.tsx` | 681 |
| 5 | `src/components/pdf-new/templates/CrestStyles.ts` | 651 |
| 6 | `src/components/pdf-new/templates/EvergreenStyles.ts` | 629 |
| 7 | `src/components/query/QueryFilterOverlay.tsx` | 790 |
| 8 | `src/components/ui/circuit-board.tsx` | 674 |
| 9 | `src/components/waybill/ClassicTemplate.tsx` | 606 |
| 10 | `src/components/waybill/EvergreenTemplate.tsx` | 708 |
| 11 | `src/components/waybill/PremiumTemplate.tsx` | 667 |
| 12 | `src/components/waybill/SlateTemplate.tsx` | 641 |
| 13 | `src/components/waybill/WaybillForm.tsx` | 753 |
| 14 | `src/components/waybill/waybillUtils.ts` | 710 |
| 15 | `src/config/moduleAdapters.ts` | 790 |
| 16 | `src/lib/Calculations.ts` | 752 |
| 17 | `src/lib/database.types.ts` | 3392 |
| 18 | `src/lib/native/invoiceCache.ts` | 625 |
| 19 | `src/lib/themePresets.ts` | 1736 |
| 20 | `src/modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx` | 1061 |
| 21 | `src/modules/item-library/domain/itemCleanupExchange.ts` | 1097 |
| 22 | `src/modules/item-library/pages/ItemLibraryPage.tsx` | 631 |
| 23 | `src/pages/QuotationFormPage.tsx` | 775 |
| 24 | `src/pages/ViewWaybill.tsx` | 696 |

## Notes

- `database.types.ts` is generated. Do not hand-split it. Raise the threshold or exclude generated files instead.
- `themePresets.ts` at 1736 lines and the two item-library files above 1000 lines are the largest offenders.
- Split per project architecture rules. Keep business logic in `src/domain/` or `src/lib/`.

## Priority

1. `themePresets.ts`
2. `itemCleanupExchange.ts`
3. `ItemLibraryAdvancedCleanupPanel.tsx`

The remaining files follow in line-count order during normal module work.
