# Bug Fix Report — Quotation / Invoice `updated_at` NOT NULL Violation

## Commit
`d341435` — pushed to `main`

## Root Cause
In `src/domain/invoice/factories.ts:96`, the `toDbItem()` function destructured `created_at` out of the spread (`...rest`) but **not** `updated_at`. When a new line item (without a persisted `updated_at`) was inserted into the DB, `updated_at` was passed as `null`, violating the `NOT NULL` constraint on `quotation_items.updated_at`.

## Fix
Added `updated_at: _ua` to the destructuring so `updated_at` is stripped from the INSERT payload. The DB default `DEFAULT now()` now applies correctly.

```diff
- const { install_rate_override, _uiKey, id: _id, created_at: _ca, ...rest } = item
+ const { install_rate_override, _uiKey, id: _id, created_at: _ca, updated_at: _ua, ...rest } = item
```

## Impact (callers using `toDbItem`)
| Caller | Table | Pattern |
|---|---|---|
| `QuotationForm.tsx` → `toQuotationItem` | `quotation_items` | delete + insert |
| `EditInvoice.tsx` → `toDbItem` | `invoice_items` | delete + insert |
| `NewInvoice.tsx` → `toDbItem` | `invoice_items` | insert |
| `viewQuotationActions.ts` → `toQuotationItemRow` | `quotation_items` | insert |
| `invoiceConversionService.ts` → `toQuotationItemRow` | `quotation_items` | insert |

## Invoice Check
`invoice_items.updated_at` has `DEFAULT now()` but no `NOT NULL`. Passing `null` would override the default silently. The fix prevents this for both tables.
