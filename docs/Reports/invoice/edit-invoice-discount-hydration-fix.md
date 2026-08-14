# Edit Invoice Global Discount Hydration Fix Report

This report was written by Buffy (Freebuff) on 2026-08-14 via Freebuff.

## 1. Objective

Fix the Invoice Edit global-discount regression.

A global discount must work when the row-level discount column is hidden in Column Manager. Column Manager must not act as a global-discount switch.

## 2. Scope

The fix touches the invoice edit hydration path only.

The calculation engine was not modified. The NULL and 0 semantics are preserved:

- `discount_rate = NULL` means inherit the global discount.
- `discount_rate = 0` means an explicit zero row override.
- `discount_rate = 5` means an explicit 5 percent row override.

The NULL-preserving RPC behavior was not changed.

## 3. Files changed

- `src/domain/invoice/calculations.ts`
- `src/tests/critical/globalDiscountHydration.test.js` (new)

## 4. Skills used

- supabase
- supabase-postgres-best-practices
- karpathy
- pdf-rendering-correctness

Documentation standard: ADS-STE100 Simplified Technical English

## 5. Changes made

### 5.1 Hydration gate fixed

`inferLegacyCalculationState` derived `useGlobalDiscountInput` from row `discount_rate` NULL-ness. When every row carried an explicit rate, the gate turned off. The form then hydrated the global discount as 0, even when the persisted `calculationInputs.discountValue` held a real value.

The gate now uses the persisted global discount state as the source:

- If the document persisted `customFields.calculationInputs.discountValue`, the gate is on and the editable global discount is that value.
- If the document has no persisted calculation inputs, the legacy row heuristic remains. This preserves the historical fallback for old documents where rate inference from totals is unreliable.

The form global discount input is a dedicated section in `FormCommercialTerms`. It was never gated by column visibility. The defect was that hydration zeroed the value it displayed and the save then persisted the zeroed value.

### 5.2 Calculation engine untouched

`src/lib/Calculations.ts` was not modified.

`const inheritsGlobal = item.discount_rate == null` is unchanged. The explicit-zero override behavior is unchanged.

### 5.3 Save path untouched

`src/hooks/useInvoiceSave.ts` was not modified.

The save payload already writes the form `invoice.discount` into `calculationInputs.discountValue`. With the hydration fix, the form carries the persisted global discount, so editing it persists correctly.

### 5.4 Regression tests added

`src/tests/critical/globalDiscountHydration.test.js` covers:

- Global discount with the discount column hidden (`hide_display`).
- Global discount with the discount column visible (`show`).
- Explicit row override coexisting with NULL rows that inherit.
- Explicit zero override that stays zero.
- Hydration surfacing the persisted global discount when all rows carry explicit rates.
- Legacy fallback behavior for documents without persisted calculation inputs.
- The save path carrying the edited global discount into `calculationInputs`.

## 6. Verification result

- `bun run audit:load`: passed. The ❌ and 🚨 warnings are pre-existing and in unrelated files (CSR, RFQ, waybill, item-library, reports, ComplianceHub).
- `bun run typecheck`: passed, no errors.
- `bun run test`: 128 tests passed, 0 failed. This includes the 8 new regression tests.
- `git diff --check`: passed.

## 7. Risks or limitations

### 7.1 Legacy corrupted rows

Invoices saved through the old RPC between 2026-08-09 and 2026-08-14 have item rows with `discount_rate = 0` that should be NULL. Example: SASINV079.

The application fix does not repair this data. The calculation engine correctly treats stored 0 as an explicit zero override. For these invoices the global discount still does not apply on view until the rows are healed.

This report does not authorize a blanket 0 to NULL migration. Explicit 0 percent overrides are valid and must not be destroyed. A data repair requires a deterministic gate. One candidate gate is: rows on invoices whose `custom_fields.calculationInputs.discountValue` is non-zero and whose discount column is not `hide_full`. This must be approved separately.

### 7.2 Shared domain function

`inferLegacyCalculationState` is shared by quotations. Quotations with persisted calculation inputs now surface their persisted global discount the same way. This is consistent with the product rule that quotations reuse the invoice domain layer.

## 8. Deferred work

- Legacy data repair for corrupted rows, separately approved.
- Optional: a controlled backfill migration with the gate described in section 7.1.
