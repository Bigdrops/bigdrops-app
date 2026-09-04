# Discount Percent Equivalent Consumption Fix Report

This report was written by Buffy on 2026-09-04 via Freebuff.

## Objective

Correct a defect from the prior task. The PDF label layer recalculated the discount percentage instead of consuming the value already computed by `calculateDocument()`. This fix makes the label layer consume the pre-computed value only.

## Scope

- Remove the duplicate percentage arithmetic in `src/domain/document/pdfSummaryLabels.ts`.
- Thread `discountPercentEquivalent` from the calculation result into the label call sites.
- Re-investigate the file casing finding with three separate questions.
- Correct the `whtBase` finding wording.
- Verify and report.

## Files Changed

| File | Change |
|------|--------|
| `src/domain/document/pdfSummaryLabels.ts` | Removed the `(discountAmount / (subtotal + installRateTotal)) * 100` arithmetic. Simplified `DiscountLabelExtras` to `{ discountType?, discountPercentEquivalent? }`. Added the required doc comment. |
| `src/domain/invoice/projections/financialProjection.ts` | Call site passes `discountPercentEquivalent` read from the totals result. `TotalsProjectionInput` gained the `discountPercentEquivalent?: number` field. |
| `src/domain/quotation/previewModel.ts` | Call site passes `discountPercentEquivalent` read from the totals result. |
| `src/components/document-view/invoice/invoicePdfActions.ts` | Threads `discountPercentEquivalent: totals.discountPercentEquivalent` into `buildInvoicePreviewModel`. |
| `src/domain/invoice/renderTypes.ts` | `BuildInvoicePreviewModelInput.totals` gained the `discountPercentEquivalent?: number` field. |

## Skills Used

- pdf-rendering-correctness

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### pdfSummaryLabels.ts

`DiscountLabelExtras` is now:

```ts
type DiscountLabelExtras = {
  discountType?: 'percent' | 'fixed'
  discountPercentEquivalent?: number
}
```

The function no longer receives `discountAmount`, `subtotal`, or `installRateTotal`. It performs no percentage arithmetic.

The function decides whether to display the percentage. It shows the percentage when the discount is fixed and the discount amount is greater than zero. The `discountPercentEquivalent > 0` check is the amount signal, because the removed fields are no longer available. The engine derives an equivalent of zero when the discount is zero, so this check correctly hides `(0%)`.

The function formats `discountPercentEquivalent` directly. It does not derive that number.

The doc comment states the required usage rule:

- For a percent discount, `discountPercentEquivalent` equals the configured discount percentage.
- For a fixed discount, it is the equivalent percentage the calculation engine already derived from its own discount base.
- This value is display-only and must not be recalculated at this layer.

### Call sites

Both call sites pass the value read directly from the `calculateDocument()` / `computeDocument()` result object:

```ts
getPdfSummaryLabels(quotation, {
  discountType: (customFields?.calculationInputs?.discountType ?? customFields?.discountType) as 'fixed' | 'percent' | undefined,
  discountPercentEquivalent: totals?.discountPercentEquivalent,
})
```

The `discountType` passed by the call sites derives from the same custom-field source that `normalizeDocumentInput()` reads (`ci.discountType ?? cf.discountType`). The engine normalizes the same expression. No mismatch exists between the two sources.

The invoice path threads the field through `invoicePdfActions.ts` into `buildInvoicePreviewModel()`, whose `totals` input type in `renderTypes.ts` now includes `discountPercentEquivalent`.

## Verification Result

- `bun run audit:load`: passed (pre-existing warnings only, no new warnings from these changes)
- `bun run typecheck`: passed (exit code 0)
- `git status` before changes: the working tree contained the prior task's changes plus pre-existing untracked items from another agent.
- `git status` after changes: my files `src/domain/document/pdfSummaryLabels.ts`, `src/domain/invoice/renderTypes.ts`, `src/domain/invoice/projections/financialProjection.ts`, `src/domain/quotation/previewModel.ts`, and `src/components/document-view/invoice/invoicePdfActions.ts` carry the fix. The other visible changes (`src/App.tsx`, `src/domain/tenant/tenantCreation.ts`, `supabase/functions/postgrest-schema-exposure/`, `supabase/migrations/20260903100000_pgrst_queue_not_cron.sql`, the NRS-docs PDF deletions) belong to another agent's concurrent work and were not touched.

The project lead committed `717566ce` (fix(invoice): discount percent equivalent exposure) during the session. That commit captured the earlier task's work and part of this task's edits.

## Risks or Limitations

- The `discountPercentEquivalent > 0` amount check is an indirect signal. It hides `(0%)` correctly for a zero discount. It cannot distinguish a discount clamped by the engine from a discount that yields zero percent. This is display-only and has no effect on calculations.
- Backward compatibility is preserved. A call without the extras parameter behaves as before.

## Deferred Work

1. **File casing investigation (three separate answers):**

   a. **git ls-files paths:** `git ls-files` shows two tracked files: `src/lib/Calculations.ts` (PascalCase) and `src/domain/invoice/calculations.ts` (lowercase). These are two different files in two different directories. There is no lowercase `src/lib/calculations.ts` tracked by git.

   b. **Import statement casing:** All imports of the canonical engine use `@/lib/Calculations` (PascalCase) — eight import statements across the codebase. The lowercase imports (`@/domain/invoice/calculations`, `./calculations`, `../calculations`) reference the separate parallel file `src/domain/invoice/calculations.ts`. No code imports `@/lib/calculations` in lowercase.

   c. **Filesystem masking on a case-sensitive Linux build:** On the case-insensitive NTFS filesystem, `src/lib/calculations.ts` and `src/lib/Calculations.ts` resolve to the same file, which masks any casing discrepancy. Git tracks only `src/lib/Calculations.ts`. Since every import uses the PascalCase path, a case-sensitive Linux build target (Vercel) would resolve every import correctly. The casing mismatch is a documentation concern (AGENTS.md says `src/lib/Calculations.ts`, which matches the tracked path), not a build break. No rename was performed.

2. **Entry point naming split:** AGENTS.md §3 names `calcTotals()` and `resolveRowVat()` as the required financial entry points. The canonical file exports `calculateDocument()` and `computeDocument()` instead. `calcTotals()` and `resolveRowVat()` live in `src/domain/invoice/calculations.ts` as a separate, parallel calculation layer. This split remains unresolved and requires a separate decision.

3. **`whtBase` finding (corrected wording):** `whtBase` is computed internally but not exposed in `DocumentResult`. A caller that needs it must currently reconstruct it from other result values, which is a source-of-truth risk.

   I checked two code paths that produce a document result:

   - `src/lib/Calculations.ts` (`calculateDocument()`): `whtBase = max(subtotal + installRateTotal + extraChargesTotal − totalDiscount, 0)` and `grandTotal = subtotal + installRateTotal + extraChargesTotal − totalDiscount + totalVat`. The relationship `grandTotal − totalVat = whtBase` holds when the pre-clamp base is non-negative. When the base is negative, `whtBase` is clamped to zero while `grandTotal − totalVat` is negative. A caller must apply the same `max(0, …)` clamp to reconstruct the value.
   - `src/domain/invoice/calculations.ts` (parallel layer): `whtBase = max(grandTotal − vatAmount, 0)`. The same clamp applies.

   I did not check every code path that produces a `DocumentResult`. The relationship holds with the clamp in the two paths I inspected, but other producers may differ. Treat `grandTotal − vatAmount` as an approximation unless verified per path.

4. **`afterTaxFixedDiscount`:** Computed internally in section 4 of `calculateDocument()` but not exposed in `DocumentResult`. Only relevant when `discountType === 'fixed'` and `discountTiming === 'after_tax'`. Display-only follow-up, not blocking.

## Required Statement

The PDF layer now reads `discountPercentEquivalent` from the calculation engine result and performs no percentage arithmetic of its own.