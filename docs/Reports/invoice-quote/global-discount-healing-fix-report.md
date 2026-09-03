# Invoice Global Discount Healing Fix Report

This report was written by Buffy on 2026-08-14 via Freebuff.

## Objective

Fix the Invoice global discount so it works the same way as the working
Quotation global discount.

## Scope

- Compare the Quotation and Invoice global discount paths.
- Find the first point where the Invoice path diverges.
- Apply the smallest fix that makes the Invoice path match the Quotation path.
- Do not modify the shared calculation engine.

## Why Quotation global discount works

QUOTATION DOES:

- Hydrate every row through `buildQuotationFormState`.
- Heal stored `discount_rate = 0` to `null` for documents without persisted
  calculation inputs.
- Pass rows with `discount_rate = null` to `computeDocument`.
- Let rows inherit the global discount.
- Use the same healing for the edit form and the view page.

The quotation item RPC stores `discount_rate` verbatim. It never coerces
`NULL` to `0`. Quotation rows therefore stay `null` unless the user sets a
row override.

## Why Invoice global discount failed

INVOICE DOES:

- Hydrate edit rows through `healLegacyCalculationOverrides`.
- Heal `discount_rate = 0` to `null` only when the document has a persisted
  global discount greater than zero.
- Keep `discount_rate = 0` when the persisted global discount is zero.
- Fetch view rows in `useInvoiceDetailData` without any healing.

The invoice item RPC (`save_invoice_with_items_transaction`) coerced a missing
`discount_rate` to `0` through `COALESCE` before 2026-08-14. Every invoice
saved through that RPC has `discount_rate = 0` on all inheriting rows. The
calculation engine reads `discount_rate = 0` as an explicit zero override, so
those rows never inherit the global discount.

THIS DIFFERENCE CAUSED THE BUG:

- In Edit mode, an invoice saved without a discount kept rows at `0`. When
  the user typed a global discount, the rows did not inherit it. The discount
  field did nothing. The Quotation path applies the typed discount.
- In View mode, corrupted rows were never healed. A saved global discount did
  not show in the totals, PDF, or CSV. The Quotation view path heals.

## Exact files or functions where the Invoice path diverged

- `src/domain/invoice/normalize.ts` — `healLegacyCalculationOverrides`.
  The healing condition required a persisted non-zero discount.
- `src/hooks/useInvoiceHydration.ts` — the edit-form hydration caller.
- `src/hooks/useInvoiceDetailData.js` — the view data fetch. It did no
  healing at all.

## Changes made

### `src/domain/invoice/normalize.ts`

Changed `healLegacyCalculationOverrides`:

- Removed the `persistedGlobalDiscount` parameter.
- Documents with persisted calculation inputs now heal `discount_rate = 0` to
  `null` unconditionally.
- The heal does not depend on the persisted discount value.
- Non-zero row overrides stay unchanged.
- Legacy documents without calculation inputs keep the existing heal for
  `vat_rate` and `discount_rate`.

### `src/hooks/useInvoiceHydration.ts`

Removed the persisted-discount check. The edit form now heals corrupted rows
in every case, so a discount typed in Edit always applies.

### `src/hooks/useInvoiceDetailData.js`

The view data fetch now heals items through the same helper. The view, PDF,
and CSV receive inheriting rows and apply the global discount like the
Quotation view path.

### `src/tests/critical/globalDiscountHydration.test.js`

- Updated TEST 7 for the corrected heal rule.
- Added TEST 11: the confirmed regression. An invoice saved without a
  discount heals rows, so a discount typed in Edit applies.
- Added TEST 12: the deterministic fixed-discount reference. Subtotal
  100,000, fixed 10,000, before tax, produces discount 10,000.
- Updated TEST 10 to use the simplified helper signature.

## Whether Calculations.ts was changed

No. `src/lib/Calculations.ts` is unchanged. The engine treats identical
inputs identically for both document types. The divergence was in the row
data passed to the engine.

## Verification of the deterministic example

Subtotal 100,000, global discount 10%, before tax:

- Invoice and Quotation both produce discount 10,000.
- Invoice and Quotation both produce the same total.

Subtotal 100,000, global discount 10,000 fixed, before tax:

- Invoice and Quotation both apply discount 10,000.

## Verification result

- `bun run audit:load`: passed. Warnings are pre-existing and unrelated.
- `bun run typecheck`: passed, no errors.
- `bun run test`: 136 tests passed, 0 failed.
- `git diff --check`: passed.
- `git status`: only the intended source files are modified.
- `bun run build`: skipped due to hardware policy.

## Risks or limitations

- A deliberate `discount_rate = 0` row on an invoice with persisted
  calculation inputs is indistinguishable from RPC corruption. It is now
  healed to `null` and inherits the global discount. The discount column is
  hidden by default, so deliberate zero overrides are rare. Non-zero
  overrides are always preserved.
- The invoice view cache stores healed items, so the behavior is consistent
  after a reload.

## Deferred work

- None for the global discount field.
- Pre-existing audit warnings remain out of scope.
