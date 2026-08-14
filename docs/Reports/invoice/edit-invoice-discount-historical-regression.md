# Edit Invoice Global Discount — Historical Regression Forensic Report

This report was written by Buffy (Freebuff) on 2026-08-14 via Freebuff.

## 1. Objective

This is a forensic investigation. The goal is to find the exact code-level regression that broke global-discount persistence during Invoice Edit.

The reference point is the repository state approximately 300 commits before HEAD.

The investigation is read-only. It changes no application code, no migrations, and no database data.

## 2. Current behavior

- The user opens an existing invoice in Edit mode.
- The user enters a global discount.
- The user saves.
- On reload or view, the global discount is missing or not applied.
- The user enables the discount column in Column Manager and enters a row-level discount value.
- The discount then works.

The workaround is confirmed by live data. Invoice SASINV080 stores `discount_rate = 2` on its item row and its column config marks the discount column as `show`. Invoice SASINV079 stores `discount_rate = 0` on its item row and its column config marks the discount column as `hide_display`.

## 3. Expected historical behavior

- The global discount applies to the whole invoice.
- The global discount works when the discount column is disabled or hidden.
- Column Manager controls only the display and input of the row-level discount column.
- Column Manager is not a master switch for the global discount.
- `NULL` row `discount_rate` means "inherit global discount".
- A row-level discount value is an explicit override.

## 4. Current code path

The current global-discount path is:

1. Hydration.
   - `src/hooks/useInvoiceHydration.ts` line 123 sets `invoice.discount` from `legacyCalculationState.editableInputs.discountValue`.
   - `src/domain/invoice/calculations.ts` line 90: `buildEditableCalculationInputs` writes `discountValue: useGlobalDiscountInput ? calculationInputs.discountValue : 0`.
   - `src/domain/invoice/calculations.ts` line 171: `useGlobalDiscountInput = standardItems.some(item => item.discount_rate === null || item.discount_rate === undefined)`.
   - When every row carries an explicit `discount_rate`, the form discount loads as 0.

2. Form totals.
   - `src/pages/InvoiceFormPage.tsx` builds `calculationInputs` from `invoice.discount` and calls `computeDocument`.
   - `src/lib/Calculations.ts` `normalizeDocumentInput` reads the global discount from `cf.calculationInputs.discountValue` unless the discount column is `hide_full` (line 586).
   - `src/lib/Calculations.ts` line 203: `inheritsGlobal = item.discount_rate == null`.
   - `src/lib/Calculations.ts` line 308: a row with an explicit `discount_rate` (including 0) does not inherit the global discount.

3. Save payload.
   - `src/hooks/useInvoiceSave.ts` line 210 writes `calculationInputs` into `custom_fields`.
   - `src/hooks/useInvoiceSave.ts` line 252 writes `discount: documentTotals.discount` into the invoice row.
   - `documentTotals.discount` is the engine-computed discount total. When rows carry explicit 0, this total is 0.

4. Item persistence.
   - `src/domain/invoice/factories.ts` `toDbItem` writes `discount_rate: item.discount_rate ?? null`. The client preserves NULL.
   - The save calls the RPC `save_invoice_with_items_transaction` with `p_mode = 'update'`.
   - The deployed RPC writes `(v_item->>'discount_rate')::numeric` verbatim.

5. View and PDF.
   - Both call `computeDocument`.
   - Rows with stored `discount_rate = 0` are explicit overrides.
   - The global discount does not apply to them.

## 5. Historical code path

The historical commit used the same calculation engine, the same hydration discount logic, and the same column logic.

The save path was different. The save logic lived inside `src/pages/InvoiceFormPage.tsx`.

- Line 581: `const itemsToSave = items.map((item, index) => toDbItem(item, effectiveId!, index))`.
- Line 610: `await supabase.from('invoice_items').insert(itemsToSave)`.

The items were inserted directly through the Supabase client. The client preserved NULL `discount_rate`. The database received NULL. Rows inherited the global discount. The global discount worked independently of Column Manager.

## 6. Historical commit selected

- Current HEAD: `d05684a6f65da52fc11c90e1826ea13e78b04de1`.
- Commit count at HEAD: 2076.
- Historical commit: `81fa401298ee7619b476121cd06ef31429f85c04`.
- This is the 300th ancestor on the first-parent chain.
- Commit date: 2026-07-05 07:33:57 +0100.
- Commit subject: "fix(ui): resolve layout regressions on mobile document views and log waybill architectural assessment".
- Commits between historical and HEAD: 314.

## 7. Current vs historical comparison

The following files are byte-identical between the historical commit and HEAD:

| File | Historical hash | Current hash | Result |
|---|---|---|---|
| `src/lib/Calculations.ts` | 65e6bb03 | 65e6bb03 | SAME |
| `src/domain/invoice/calculations.ts` | bbba32f3 | bbba32f3 | SAME |
| `src/domain/invoice/columns.ts` | e601deac | e601deac | SAME |
| `src/domain/invoice/normalize.ts` | 2c14d1ae | 2c14d1ae | SAME |
| `src/domain/invoice/factories.ts` | 082ec734 | 082ec734 | SAME |

The files that changed:

| File | Change |
|---|---|
| `src/hooks/useInvoiceSave.ts` | New file at HEAD. Did not exist historically. |
| `src/pages/InvoiceFormPage.tsx` | Save logic moved out. 383 lines changed. |
| `src/hooks/useInvoiceHydration.ts` | Tenant client only. Discount logic unchanged. |

The calculation engine, the hydration discount gate, and the client item serializer did not change between the historical commit and HEAD.

The save path changed completely. The direct client insert was replaced by the composite RPC.

## 8. Exact changed logic

The changed logic is in the item insert of the composite RPC.

- `supabase/migrations/20260809070000_invoice_composite_transactions.sql` created `save_invoice_with_items_transaction`.
- Its item insert used:
  ```sql
  coalesce((v_item->>'discount_rate')::numeric, 0)
  ```
- A missing or NULL `discount_rate` became the literal number 0.

The engine semantics for 0 and NULL did not change:

- `src/lib/Calculations.ts` line 203: `const inheritsGlobal = item.discount_rate == null`.
- `src/lib/Calculations.ts` line 308: `if (!inheritsGlobal) { effectiveDiscountRate = D(item.discount_rate) ... }`.
- The test file `src/tests/critical/calculations.test.js` Block 9b asserts that `discount_rate = 0` means zero discount, not inherit global.

The RPC coercion destroyed the "inherit global" state on every save between 2026-08-09 and the NULL fix.

## 9. Git commits responsible for the change

| Commit | Date | Subject | Role |
|---|---|---|---|
| `a0764f98` | 2026-08-09 | feat(tenant): phase 3 blocker resolution and invoice aggregation | Introduced the RPC and its COALESCE. Switched `useInvoiceSave` to call the RPC. |
| `00947cc6` | 2026-08-14 | fix(invoice): invoice edit discount null persistence fix | Replaced COALESCE with a verbatim cast. No backfill. |
| `69d5343f` | 2026-04-29 | feat: enhance PDF generation and quotation handling | Introduced `hideDiscountFully` in the engine. Predates the comparison window. |

The first meaningful change that caused the regression is `a0764f98`.

## 10. Supabase persistence comparison

The live deployed RPC was inspected read-only with:

```sql
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname = 'save_invoice_with_items_transaction';
```

The deployed body contains:

```sql
(v_item->>'discount_rate')::numeric
```

There is no COALESCE on `discount_rate`. The NULL-preserving fix (migration `20260814000000`) is deployed.

Live data for the affected invoices:

| Invoice | invoices.discount | ci.discountValue | type / timing | item discount_rate | column config |
|---|---|---|---|---|---|
| SASINV079 | 24918.66 | 24918.66 | fixed / before | 0 | hide_display |
| SASINV080 | 25427.2 | 2 | percent / before | 2 | show |

Both invoices have one item row each.

SASINV079 still carries `discount_rate = 0`. The global fixed discount of 24918.66 is stale. The engine computes 0 for this invoice because the row is an explicit zero override.

SASINV080 carries `discount_rate = 2`. This is the row-level workaround. The engine computes 25427.2, which matches the stored value.

## 11. Root cause

The root cause is a concrete regression in the item write path.

Commit `a0764f98` introduced `save_invoice_with_items_transaction` with `coalesce((v_item->>'discount_rate')::numeric, 0)` in its item insert. Every item saved through this RPC had its NULL `discount_rate` coerced to 0.

The engine, which is unchanged for over 300 commits, treats a stored 0 as an explicit per-row override. A row with 0 does not inherit the global discount. Once every row carries 0, the computed discount total becomes 0. The save then overwrites the typed global discount with this computed 0.

The edit hydration adds a second layer. `useGlobalDiscountInput` becomes false when every row carries an explicit rate. The form then loads the global discount as 0. Any new global discount typed into the form is computed away again on save because the rows still carry explicit 0.

The regression is the NULL to 0 coercion in the RPC item insert, combined with the hydration gate and the save overwrite that the coercion triggers.

## 12. Why Column Manager currently affects global discount

There are two dependencies.

Direct dependency. The engine zeroes the global discount when the discount column is `hide_full`:

- `src/lib/Calculations.ts` line 586: `hideDiscountFully ? 0 :` for `discountValue`.
- `src/lib/Calculations.ts` lines 648 to 650: row `discount_rate` forced to null when `hide_full`.

This dependency existed before the comparison window and is not active for the affected invoices. Their column configs are `hide_display` and `show`, not `hide_full`.

Indirect dependency. This is the active mechanism. When rows carry explicit 0, the only way to restore discount is row-level overrides. Row-level inputs are editable only when the discount column is visible in the form. The user enables the column in Column Manager, enters a row value, and the discount works. SASINV080 is the proof: it now has a row `discount_rate = 2` and a saved column config of `show`.

Column Manager is not a global-discount switch. It is the UI door to the only remaining discount path for corrupted rows.

## 13. Why the previous NULL to 0 fix was insufficient

The fix is necessary but not sufficient. It prevents new corruption. It does not restore behavior for three reasons.

1. No backfill. Migration `20260814000000` deliberately keeps legacy 0s. Legacy 0s cannot be distinguished from intentional 0 percent overrides. SASINV079 keeps `discount_rate = 0`.
2. Hydration gate. `useGlobalDiscountInput` is false when every row carries an explicit rate. The form loads the global discount as 0. The user sees no existing discount and any typed value is masked.
3. Save overwrite. The payload writes `discount: documentTotals.discount` (line 252). With explicit zero rows, the computed total is 0. It overwrites the typed global discount in the `invoices.discount` column.

The previous report concluded the loss boundary was the RPC coercion. That is confirmed. The conclusion was incomplete because it did not address the existing corrupted rows, the hydration gate, or the save overwrite.

## 14. Minimal recommended fix

This report does not implement a fix. The direction is:

1. Heal the hydration gate. Surface `calculationInputs.discountValue` as the editable global discount when the discount column is not `hide_full`, regardless of row rates. This restores the historical UX.
2. Heal legacy rows. Set `discount_rate = NULL` for rows where 0 represents "inherit global" and no explicit row override was ever entered. Gate the update to invoices whose `custom_fields.calculationInputs.discountValue` is non-zero and whose discount column is not `hide_full`. This is a data change and requires explicit user approval.
3. Protect the save path. Mirror the quotation normalizer behavior: heal `0` to `null` where the engine documents it as "inherit". Do not change `src/lib/Calculations.ts` lines 203 and 308. The explicit override semantics are correct and tested.

## 15. Risks

- A backfill can erase intentional 0 percent overrides. The gate must be strict.
- Healing 0 to null in the invoice normalizer changes how stored 0 renders. Review before applying.
- Changing the hydration gate changes the form for invoices that genuinely use row-level discounts. The global input must remain clearly separate from row inputs.

## 16. Verification plan

- Reproduce the five cases in the task brief.
- Case 5 is the critical regression: enter a global discount, keep the discount column disabled, save, reload, expect the discount to remain and apply.
- Verify an existing invoice with NULL rows keeps applying the global discount after an edit save.
- Verify an invoice with explicit row overrides keeps its row behavior.
- Extend `src/tests/critical/calculations.test.js` with a case for the invoice normalizer healing and for the RPC preserving NULL.
- Run `bun run audit:load` and `bun run typecheck` after any fix.

## 17. Files inspected

Current code:

- `src/lib/Calculations.ts`
- `src/domain/invoice/calculations.ts`
- `src/domain/invoice/columns.ts`
- `src/domain/invoice/normalize.ts`
- `src/domain/invoice/factories.ts`
- `src/domain/invoice/types.ts`
- `src/domain/financial/resolveFinancialColumns.ts`
- `src/hooks/useInvoiceHydration.ts`
- `src/hooks/useInvoiceSave.ts`
- `src/pages/InvoiceFormPage.tsx`
- `src/components/useInvoiceColumns.tsx`
- `supabase/migrations/20260809070000_invoice_composite_transactions.sql`
- `supabase/migrations/20260814000000_fix_invoice_item_discount_null.sql`
- `src/tests/critical/calculations.test.js`

Historical code (via `git show`):

- `src/pages/InvoiceFormPage.tsx` at `81fa4012`
- `src/hooks/useInvoiceForm.js` at `81fa4012`
- All engine files at `81fa4012` (byte-identical to HEAD)

Previous report:

- `docs/Reports/invoice/edit-invoice-discount-persistence.md`

Live database (read-only):

- Deployed `save_invoice_with_items_transaction` definition
- `entity_bigdrops-main_main.invoices` and `invoice_items` for SASINV079 and SASINV080

## 18. Skills used

- supabase
- supabase-postgres-best-practices
- karpathy
- pdf-rendering-correctness

Documentation standard: ADS-STE100 Simplified Technical English

## 19. Confirmation of scope

- No application source code was changed.
- No migration file was changed.
- No database write was executed. Only SELECT queries were run through the Management API.
- The only file created or modified is this report.
- Runtime behavior was not fixed and is not claimed to be fixed.
