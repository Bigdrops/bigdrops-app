# Invoice Global Discount — Quotation Reference Comparison Fix Report

This report was written by Buffy (Freebuff) on 2026-08-14 via Freebuff.

## 1. Objective

Fix the Invoice global Discount field by comparing it against the working Quotation global Discount implementation.

## 2. Scope

- Application hydration path only.
- No database changes.
- No migration.
- No production data writes.

## 3. Skills used

- supabase
- supabase-postgres-best-practices
- karpathy
- pdf-rendering-correctness

Documentation standard: ADS-STE100 Simplified Technical English

## 4. The concrete comparison

### QUOTATION DOES X

- The quotation edit form hydrates items through `buildQuotationFormState` (`src/domain/quotation/normalize.ts`).
- That function heals legacy rows: when the document has no saved `calculationInputs`, it converts `vat_rate === 0` and `discount_rate === 0` to `null`.
- Healed rows inherit the global rates.
- The global Discount field therefore works on quotation documents whose rows were stored as 0.
- Quotation item saves always used direct client inserts (`toQuotationItem` to `toDbItem`), which preserve NULL.

### INVOICE DOES Y

- The invoice edit form hydrates items in `useInvoiceHydration` (`src/hooks/useInvoiceHydration.ts`).
- It mapped rows with `mapDbInvoiceItem` and applied no healing. Stored 0 stayed 0.
- The engine reads 0 as an explicit zero override.
- The global Discount therefore could not apply on invoice documents whose rows were stored as 0.

### THAT DIFFERENCE CAUSES THE BUG

- 170 legacy invoices without `calculationInputs` have all 1697 item rows stored at `discount_rate = 0`.
- `quotation_items` has 2806 rows, all NULL, zero rows at 0.
- On those legacy invoices, every row is an explicit 0 override, so the engine computes zero discount and the global Discount field does not affect the summary.
- The quotation path heals the same population and works.

## 5. Exact loss boundary

The loss boundary is the invoice edit hydration: `useInvoiceHydration` loaded legacy rows with `discount_rate = 0` and passed them unchanged to `inferLegacyCalculationState` and the calculation engine.

## 6. Exact file or function responsible

- `src/hooks/useInvoiceHydration.ts` — the missing healing step.
- `src/domain/invoice/normalize.ts` — the missing healing helper.
- The calculation engine was not the loss boundary. It behaved correctly for the data it received.

## 7. Why Quotation works

- Quotation rows were never coerced. The database stores NULL.
- The quotation hydration also heals stored 0 to NULL for documents without saved `calculationInputs`.
- Both mechanisms keep NULL, so rows inherit the global discount.

## 8. Why Invoice fails

- Invoice rows were coerced to 0 by the `save_invoice_with_items_transaction` RPC between 2026-08-09 and 2026-08-14.
- The invoice hydration had no healing step, so stored 0 reached the engine as an explicit override.
- The engine correctly applied the explicit 0 per row, producing zero discount.

## 9. Files changed

- `src/domain/invoice/normalize.ts` — added `healLegacyCalculationOverrides`.
- `src/hooks/useInvoiceHydration.ts` — heal rows before inferring calculation state.
- `src/tests/critical/globalDiscountHydration.test.js` — added tests 7, 8, 9.

## 10. Whether Calculations.ts was changed

No. The shared engine was not modified in this task.

The comparison proved the engine receives different data from the two paths. Quotation sends NULL rows. Invoice sent 0 rows. The engine was correct for both. Changing the engine was not required.

## 11. Why this fix is smaller and safer than changing the shared engine

- The fix ports the exact quotation healing step with the same gate: heal 0 to NULL only when the document has no saved `calculationInputs`.
- Documents with saved `calculationInputs` keep explicit 0. Explicit zero overrides stay valid.
- NULL and 0 semantics in the engine are untouched.
- The shared engine, row-level discounts, Column Manager, and the quotation path are unchanged.
- New saves were already safe: the RPC preserves NULL since migration `20260814000000`.

## 12. Tests added or updated

- Test 7: `healLegacyCalculationOverrides` heals 0 only without saved `calculationInputs`.
- Test 8: legacy invoice rows heal to inherit and the global discount applies end to end.
- Test 9: healed rows serialize back as NULL `discount_rate`.

## 13. Verification result

- `bun run audit:load`: passed. The warnings are pre-existing and unrelated.
- `bun run typecheck`: passed, no errors.
- `bun run test`: 133 tests passed, 0 failed. This includes the 3 new tests.
- `git diff --check`: passed.

## 14. Remaining legacy data issue

Four invoices with saved `calculationInputs` and a persisted global discount have all rows explicit. Example: SASINV079. The healing gate does not apply to them because they have saved `calculationInputs`, and the engine semantics are correct. These need a separately approved data repair. No blanket 0 to NULL migration was introduced.

The invoice view path (`useInvoiceDetailData`) does not heal legacy rows yet. The quotation view heals through `buildQuotationFormState`. An edit-save through the form persists NULL, after which the view recomputes correctly. Full view parity is deferred.

## 15. Behavior deliberately left unchanged

- NULL and 0 semantics.
- Row-level discount overrides.
- Column Manager visibility semantics.
- The shared calculation engine.
- The quotation implementation.
- Percent and fixed discount calculation rules.
