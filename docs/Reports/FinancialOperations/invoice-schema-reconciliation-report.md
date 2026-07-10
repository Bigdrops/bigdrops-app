# Invoice Schema Reconciliation Report

This report was written by OpenCode on 2026-07-10 via Local Runner.

## Objective

Resolve a runtime 400 Bad Request error where Supabase rejected a query for non-existent columns `wht_rate` and `wht_type` on the `invoices` table during payment → receipt generation.

## Root Cause

The function `fetchInvoiceWhtConfig()` in `src/modules/invoices/repositories/paymentRepository.ts:15-24` executed:

```sql
SELECT wht_rate, wht_type FROM invoices WHERE id = $1
```

These columns **do not exist** on the `invoices` table. The canonical invoice schema stores a single `wht` column (the total WHT amount). The `wht_rate` and `wht_type` columns exist only on the `payments` table.

This 400 error propagated through `paymentService.ts:recordInvoicePayment()` where `fetchInvoiceWhtConfig()` was called (line 79) before payment insertion. The thrown exception was caught by the outer `try/catch` (line 259), causing the entire payment recording to return `{ success: false }` — and receipt generation never executed.

## Invalid Field References Found

| Location | Line | Query | Status |
|---|---|---|---|
| `src/modules/invoices/repositories/paymentRepository.ts` | 18 | `.select("wht_rate, wht_type")` on `invoices` | **REMOVED** |
| `src/modules/invoices/services/paymentService.ts` | 79-83 | `fetchInvoiceWhtConfig()` call and conditional assignment | **REMOVED** |
| `src/modules/invoices/services/paymentService.ts` | 11 | `import { fetchInvoiceWhtConfig }` | **REMOVED** |

## Why These Are Invalid

- `wht_rate` is not a column on the `invoices` table. The invoice stores only `wht` (total WHT amount).
- `wht_type` is not a column on the `invoices` table.
- These values cannot be derived from the invoice's `wht` field alone (amount ≠ rate).
- The `payments` table **does** have `wht_rate` and `wht_type` columns (both nullable), so the values should be sourced from user input or default to null.

## Corrected Field Mapping

Where `wht_rate` and `wht_type` need to appear on payment records, they are already defined as **optional nullable fields** on `PaymentInput`/`InvoicePayment`. When not explicitly provided (as occurs during payment recording), they default to `null` via the `?? null` fallback in `insertPayment()`:

- `wht_rate`: defaults to `null` (payments table column is `number | null`)
- `wht_type`: defaults to `null` (payments table column is `string | null`)

The `invoices.wht` value is already correctly queried at `paymentService.ts:121` and stored on the receipt snapshot as `invoice_wht`. No changes needed there.

## Impact on Downstream Consumers

| Destination | Field | After Fix | Effect |
|---|---|---|---|
| `payments` table | `wht_rate` | `null` | Nullable — valid |
| `payments` table | `wht_type` | `null` | Nullable — valid |
| `autoCreateWhtReceiptDraft` param | `whtRate` | `null` | Nullable — valid |
| `autoCreateWhtReceiptDraft` param | `whtType` | `null` | Nullable — valid |
| Receipt snapshot (`buildReceiptSnapshot`) | `wht_rate` | `null` | Nullable — valid |
| Receipt snapshot (`buildReceiptSnapshot`) | `wht_type` | `null` | Nullable — valid |

All downstream consumers accept null for these fields. No receipt functionality is lost — payment recording will create receipts with `wht_rate: null` and `wht_type: null` on the receipt snapshot, which is the correct behavior since these values are not known at payment-recording time from the invoice alone.

## Files Changed

1. **`src/modules/invoices/repositories/paymentRepository.ts`** — Removed `fetchInvoiceWhtConfig()` function entirely. This was the only function querying non-existent columns.
2. **`src/modules/invoices/services/paymentService.ts`** — Removed the import of `fetchInvoiceWhtConfig` and its call site (lines 79-83). The payment payload's `wht_rate`/`wht_type` now remain `undefined` (mapped to `null` on insert).

## Verification

- `bun run typecheck` — Passed (1 pre-existing unrelated error: `"receipt"` missing from `PdfCustomizationDocumentFamily` type union)
- `bun run audit:load` — Passed (pre-existing warnings only)
- `git status` — Only the 2 intended files changed

## Confirmation

Does this fix the runtime 400 error? **Yes**. The query `SELECT wht_rate, wht_type FROM invoices` will no longer be executed, eliminating the schema mismatch.

Can receipt generation now proceed? **Yes**. The `fetchInvoiceWhtConfig()` call was the first operation in `recordInvoicePayment()` that hit the database. With it removed, the payment insertion, receipt snapshot creation, and receipt insertion will execute without being short-circuited by a 400 error.
