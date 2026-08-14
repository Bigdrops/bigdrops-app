# Edit Invoice — Discount Persistence Forensic Report

This report was written by DeepSeek (OpenCode) on 2026-08-14 via Local Runner.

## 1. Objective

This is a forensic investigation. The goal is to find the exact loss boundary for this defect:

- User edits an invoice.
- User adds a NEW global discount in the edit form.
- User saves.
- The discount does not persist and does not display.

The scope is read-only. This report changes no application code and writes no database data.

## 2. Scope

- Source: invoice edit flow, invoice save flow, invoice view flow.
- Boundary: discount persistence from edit form to database to view.
- Excluded: general edit persistence (resolved), the `hide_full` theory (disproven), quotation flow.

## 3. Root Cause Summary

The discount value is lost because the invoice item write path coerces a `null` item `discount_rate` to `0`.

The calculation engine treats a stored `0` as an explicit per-row override. When every item carries `discount_rate = 0`, the engine does not apply the global discount. The computed discount total becomes 0, and the save overwrites the typed discount with 0.

The full chain is:

1. The item insert in the RPC migration coerces `null` to `0`.
2. The calculation engine treats `0` as an explicit override, not as "inherit global".
3. The invoice normalizer does not heal `0` to `null`. The quotation normalizer does.
4. The edit hydration gate zeroes the form value for existing discounts.
5. The save payload takes the computed (zeroed) discount from document totals.

## 4. Evidence

### 4.1 The item write coerces null to 0

`supabase/migrations/20260809070000_invoice_composite_transactions.sql`, item insert, around line 210:

```
coalesce((v_item->>'discount_rate')::numeric, 0)
```

Every item insert writes a literal `0` when the item has no `discount_rate`. The schema allows `discount_rate: number | null`. The RPC destroys the `null` state that means "inherit global discount".

### 4.2 The engine treats 0 as an explicit override

`src/lib/Calculations.ts` line 203:

```
const inheritsGlobal = item.discount_rate == null
```

Line 308:

```
if (!inheritsGlobal) {
  // Explicit row override (including explicit 0)
  effectiveDiscountRate = D(item.discount_rate)
```

So a stored `0` disables the global discount for that row.

This behavior is intentional and covered by tests. `src/tests/critical/calculations.test.js`, Block 9b lines 355 to 364, asserts that `discount_rate = 0` means zero discount, not inherit global.

### 4.3 Invoice normalize does not heal 0; quotation does

`src/domain/invoice/normalize.ts` line 285 keeps `discount_rate = 0`.

`src/domain/quotation/normalize.ts` line 137 converts `discount_rate === 0 ? null`.

The quotation path heals the corruption. The invoice path does not. This is the asymmetry.

### 4.4 Edit hydration zeroes the form value

`src/domain/invoice/calculations.ts`, `buildEditableCalculationInputs` lines 76 to 92.

When `useGlobalDiscountInput = false`, line 90 writes `discountValue = 0`. The edit form then loads 0. The user sees no existing discount, and any typed value is later overwritten on save.

`src/hooks/useInvoiceHydration.ts` line 123:

```
invoice.discount = editableInputs.discountValue
```

### 4.5 The save payload takes the computed discount

`src/hooks/useInvoiceSave.ts`, `buildPayload`, line 252:

```
discount: documentTotals.discount
```

`documentTotals.discount` comes from the engine. When items do not inherit, this is 0. The typed discount is lost.

### 4.6 Live database evidence

Query against `entity_bigdrops-main_main`:

```
select i.invoice_number, i.discount, i.custom_fields->'calculationInputs'->>'discountValue' as discount_value,
       it.discount_rate, it.unit_price, it.quantity
from entity_bigdrops-main_main.invoices i
left join entity_bigdrops-main_main.invoice_items it on it.invoice_id = i.id
where i.invoice_number in ('SASINV079', 'SASINV080')
```

Results:

| Invoice | invoices.discount | calcInputs.discountValue | discount_type | item discount_rate |
|---|---|---|---|---|
| SASINV079 | 24918.66 | 24918.66 | fixed, before | 0 |
| SASINV080 | 0 | 0 | percent | 0 |

SASINV080 has two item rows, both with `discount_rate = 0`.

SASINV079 stores `discount = 24918.66`, but its items carry `discount_rate = 0`. The engine computes 0 for this invoice. The stored 24918.66 is stale, applied at first save when items were still `null`.

The database columns are internally consistent. The loss is not in column storage. The loss is in engine application of the global discount after the items were coerced to 0.

## 5. Scenario Resolution

- Scenario 4 (engine/column write divergence on save): disproved for these saved states. Stored `invoices.discount` matches `calc_inputs.discountValue`.
- Scenario 5 (view recompute divergence): the loss is here, via the engine. Stored value can differ from recomputed value because items do not inherit.
- `hide_full` theory: disproved. Not part of the chain.

## 6. Fix Recommendation

The fix is in the RPC item write, not in the engine.

1. Change migration line 210 to write the value verbatim:
   `(v_item->>'discount_rate')::numeric`
   This preserves `null` so the engine can apply the global discount.

2. Backfill existing items where `discount_rate = 0` represents "inherit":
   Set `discount_rate = null` for rows that were never given an explicit row override.

3. Optional: heal `0` to `null` in `src/domain/invoice/normalize.ts`, matching the quotation normalizer. This protects against re-corruption by other write paths.

Do not change `Calculations.ts` line 203. The explicit-override semantics are correct and tested.

## 7. Files Changed

None. This is a forensic report.

## 8. Verification

- Live database query: executed, results match storage evidence.
- `src/tests/critical/calculations.test.js` Block 9b: read, confirms engine semantics.
- No code changes made.
- No database writes made.

## 9. Risks and Limitations

- The backfill in the fix recommendation touches existing data. It must be reviewed before execution.
- This report does not run `bun run typecheck` or `bun run test` because no code changed.

## 10. Deferred Work

- Apply the migration fix.
- Apply the backfill.
- Optionally align the invoice normalizer with the quotation normalizer.
