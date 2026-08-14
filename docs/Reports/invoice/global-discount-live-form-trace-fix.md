# Invoice Global Discount — Live Form Value Trace and Fix Report

This report was written by Buffy (Freebuff) on 2026-08-14 via Freebuff.

## 1. Objective

Trace the live Invoice Edit global Discount value through the calculation pipeline and fix the exact divergence against the working Quotation reference.

## 2. The value trace (executed, not inferred)

The trace below runs the exact functions the form calls: hydration inference, `buildCalculationInputs`, and `computeDocument`. Inputs use realistic persisted state.

### INVOICE (SASINV079 profile: fixed global discount, rows corrupted to 0)

| Stage | Value |
|---|---|
| UI typed global discount | 30000 |
| form `invoice.discount` | 30000 |
| `calculationInputs.discountValue` | 30000 |
| item `discount_rate` after hydration | 0 |
| `computeDocument` discount | 0 |
| `totalPayable` | 1366712 (unchanged) |

### QUOTATION (equivalent profile: rows NULL)

| Stage | Value |
|---|---|
| UI typed global discount | 30000 |
| form state discount | 30000 |
| `calculationInputs.discountValue` | 30000 |
| item `discount_rate` after hydration | null |
| `computeDocument` discount | 30000 |
| `totalPayable` | 1334462 (changed) |

## 3. The concrete comparison

- QUOTATION DOES: hydrate rows with `discount_rate = null`, so rows inherit the global discount. Quotation rows were never coerced.
- INVOICE DOES: hydrate rows with `discount_rate = 0`, so the engine reads an explicit zero override per row. The Aug 2026 save RPC coerced NULL to 0 for inheriting rows.
- DIFFERENCE: the item `discount_rate` value after hydration. Form, inputs, and engine are identical.
- LOSS: `src/lib/Calculations.ts` line 203, `const inheritsGlobal = item.discount_rate == null`. The engine is correct; the data is corrupted.

## 4. Loss classification

- INPUT LOSS: none. `calculationInputs.discountValue` carries the typed value.
- CALCULATION LOSS: none. The engine applies its documented semantics to the rows it receives.
- DISPLAY LOSS: none. The summary renders `documentTotals.discount` when it is non-zero.
- PERSISTENCE LOSS: none in new saves. The RPC preserves NULL since migration `20260814000000`.
- DATA LOSS: the corrupted `discount_rate = 0` rows. This is the only boundary.

## 5. Exact file or function responsible

- Data origin: `save_invoice_with_items_transaction` COALESCE, commit `a0764f98` (2026-08-09).
- App boundary: invoice hydration in `src/hooks/useInvoiceHydration.ts` had no healing step. The quotation hydration (`buildQuotationFormState`) has one.

## 6. The fix

Extend the healing to the corrupted population, porting the quotation mechanism.

- `src/domain/invoice/normalize.ts`: `healLegacyCalculationOverrides` now also heals `discount_rate = 0` to null when the document has a persisted non-zero global discount. This is the corruption signature of the Aug 2026 RPC.
- `src/hooks/useInvoiceHydration.ts`: pass the persisted global discount into the helper.
- The next edit-save persists NULL through the normal save path, so the rows self-repair. No migration, no backfill.

## 7. Files changed

- `src/domain/invoice/normalize.ts`
- `src/hooks/useInvoiceHydration.ts`
- `src/tests/critical/globalDiscountHydration.test.js`

## 8. Whether Calculations.ts was changed

No. The engine receives the correct typed value. Changing it was not required and would alter locked semantics.

## 9. Why this fix is smaller and safer than changing the shared engine

- The engine, quotation path, and NULL/0 semantics are untouched.
- Healing applies only to rows stored as 0 on documents with a persisted global discount, or to legacy documents without calculation inputs.
- Documents without a global discount keep explicit 0. Deliberate zero overrides stay valid.
- The fix follows the quotation reference, which heals 0 to null in hydration.

## 10. Tests added or updated

- Test 7 updated: corrupted 0 heals with a persisted global discount; deliberate 0 is kept without one.
- Test 10 added: SASINV079 profile end to end, typed global discount changes the total.

## 11. Verification result

- `bun run audit:load`: passed. Warnings are pre-existing and unrelated.
- `bun run typecheck`: passed, no errors.
- `bun run test`: 134 tests passed, 0 failed.
- `git diff --check`: passed.

## 12. Remaining issue

The invoice view path (`useInvoiceDetailData`) does not heal yet. The quotation view heals through `buildQuotationFormState`. An edit-save persists NULL, after which the view recomputes correctly. Full view parity is deferred.

## 13. Behavior deliberately left unchanged

- Engine NULL and 0 semantics.
- Row-level discount overrides on documents without a global discount.
- Column Manager visibility semantics.
- The quotation implementation.
- Percent and fixed calculation rules.
- The percentage display contract for PDF summaries.
