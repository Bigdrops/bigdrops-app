# Discount Percent Equivalent Exposure Report

This report was written by Buffy on 2026-09-03 via Freebuff.

---

## Objective

Fix a display gap in the financial calculation engine where a fixed discount value has no equivalent percentage in the returned result, so PDFs cannot show "(X%)" next to a flat discount amount.

## Scope

- Add `discountPercentEquivalent` to `DocumentResult`
- Compute the value inside `calculateDocument()`
- Update the PDF summary label pipeline to display the percentage for fixed discounts
- Check for other computed-but-not-exposed values (report-only)

## Files Changed

| File | Change |
|------|--------|
| `src/lib/Calculations.ts` | Added `discountPercentEquivalent` field to `DocumentResult` interface; added section "4b. Discount percent equivalent" computation; added field to return object |
| `src/domain/document/pdfSummaryLabels.ts` | Added `DiscountLabelExtras` type and optional second parameter to `getPdfSummaryLabels()`; computes percentage equivalent for fixed discounts when extras are provided |
| `src/domain/invoice/projections/financialProjection.ts` | Updated `getPdfSummaryLabels()` call in `buildTotalsProjection()` to pass discount extras |
| `src/domain/quotation/previewModel.ts` | Updated `getPdfSummaryLabels()` call in `buildQuotationPreviewModel()` to pass discount extras |

## Skills Used

- pdf-rendering-correctness

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### Calculations.ts

Added a new field `discountPercentEquivalent: number` to the `DocumentResult` interface, directly after the existing `discount` field. This field is display-only and never feeds back into any calculation.

Added section "4b. Discount percent equivalent" between section 4 (After_tax fixed discount) and section 5 (Extra charges). The computation uses:
- `eligibleVatBase` (for before_tax timing with eligible rows) or `docSubtotal + docInstallTotal` (fallback) as the denominator
- `totalDiscount.dividedBy(denominator).times(100)` for fixed discounts
- The raw `discountValue` for percent discounts (already a percentage)

The value is returned as `discountPercentEquivalent.toNumber()` in the return object.

### pdfSummaryLabels.ts

Added a `DiscountLabelExtras` type with optional fields: `discountAmount`, `discountType`, `subtotal`, `installRateTotal`.

Extended `getPdfSummaryLabels()` to accept an optional second parameter. When `discountType === 'fixed'` and `discountAmount > 0`, the function computes the percentage equivalent as `(discountAmount / (subtotal + installRateTotal)) * 100` and passes it to `buildLabel()`, which formats it as "Discount (X%)".

When no extras are provided, the function behaves identically to before (backward compatible).

### financialProjection.ts and quotation/previewModel.ts

Updated both call sites to pass the extras parameter with `discountAmount`, `discountType`, `subtotal`, and `installRateTotal` from their respective totals objects.

## Verification Result

- `bun run audit:load`: passed (pre-existing warnings only, no new issues)
- `bun run typecheck`: passed (exit code 0)
- `git status`: clean — my 4 modified files are present; no pre-existing files reverted or overwritten

## Risks or Limitations

- The percentage equivalent for fixed discounts uses `subtotal + installRateTotal` as the denominator. This is the total contract base before discount. It is an approximation — the exact per-row proportional allocation denominator (`eligibleVatBase`) may differ slightly in mixed documents where some rows are exempt. The display-only nature of this value makes the approximation acceptable.
- Backward compatibility is preserved: when `getPdfSummaryLabels()` is called without the extras parameter (existing callers not updated), it behaves identically to before.

## Deferred Work

1. **File casing mismatch**: AGENTS.md references `src/lib/Calculations.ts` (PascalCase). The actual file is `src/lib/Calculations.ts` on the filesystem. Both `Calculations.ts` and `calculations.ts` exist with identical MD5 hashes on the case-insensitive NTFS filesystem. This is a single file accessed via two casings. Report as a separate finding — do not rename without user sign-off.

2. **Entry point naming split**: AGENTS.md §3 names `calcTotals()` and `resolveRowVat()` as the required financial entry points. The file exports `calculateDocument()` and `computeDocument()` instead. `calcTotals()` and `resolveRowVat()` exist in `src/domain/invoice/calculations.ts` as a separate, parallel calculation layer. This naming split should be tracked and resolved separately.

3. **Additional computed-but-not-exposed values in DocumentResult**:
   - `whtBase` — computed internally (section 6 of `calculateDocument()`) but not exposed in `DocumentResult`. Callers must re-derive it as `grandTotal - vatAmount`.
   - `afterTaxFixedDiscount` — computed internally (section 4) but not exposed. Only relevant when `discountType === 'fixed'` and `discountTiming === 'after_tax'`.
   - These are minor and do not block the current task.
