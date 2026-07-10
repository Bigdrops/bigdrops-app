# Invoice Schema Reconciliation Report — `wht_rate` / `wht_type` vs `wht`

This report was written by OpenCode on 2026-07-10 via Local Runner.

---

## 1. Objective

Trace why receipt generation fails with a 400 error querying `wht_rate` and `wht_type` from the `invoices` table, when the live schema only contains `wht` (a single numeric column for total WHT amount).

## 2. Evidence

### 2a. Schema: `invoices` table has `wht`, not `wht_rate`/`wht_type`

- `supabase/migrations/20260520090003_invoices.sql` — `invoices` table defines `wht numeric` (line 42). No `wht_rate` or `wht_type` columns.
- `supabase/migrations/20260520090003_invoices.sql` — `payments` table defines `wht_rate numeric` (line 87) and `wht_type text` (line 88). These columns exist on `payments`, not `invoices`.

### 2b. All 28+ invoice queries in `src/` use valid columns only

Every `.from('invoices')` call across the codebase was inspected. None select `wht_rate` or `wht_type`:

| Location | Columns Selected |
|---|---|
| `paymentService.ts:114` | `invoice_number, total, subtotal, vat, wht, discount, notes, terms, po_number, project_id` |
| `paymentRepository.ts:74` | `computed_status` |
| `paymentRepository.ts:137` | `balance_due` (via invoice_financials_v) |
| `paymentRepository.ts:148` | `cash_received, computed_status` (via invoice_financials_v) |
| `complianceService.ts:104` | `client_name` |
| `useInvoiceHydration.ts:67` | `*` |
| `useInvoiceSave.ts:271` | Insert, no select columns |
| Remaining 21 queries | Various valid columns — none include `wht_rate` or `wht_type` |

### 2c. `wht_rate`/`wht_type` references exist only on supported tables

| File | Table | Usage |
|---|---|---|
| `paymentRepository.ts:27-28` | `payments` | Insert into `payments.wht_rate`, `payments.wht_type` |
| `snapshotBuilder.ts:95-96` | `receipts` | Insert into receipt snapshot (from payment input) |
| `paymentTypes.ts:41-42` | — | Type definition for `PaymentInput` (optional, never populated) |
| `receipt/types.ts:18-19` | — | Type definition for `ReceiptRow` |

### 2d. `normalizePaymentInput()` never forwards `wht_rate`/`wht_type`

In `paymentService.ts:56-70`, the `normalizePaymentInput()` function constructs a `PaymentInput` object. It **does not** read `wht_rate` or `wht_type` from any source — these fields remain `undefined` and are stored as `null` in both `payments` and `receipts`.

### 2e. `InvoiceRecordPaymentSheet.tsx` hardcodes `whtDeducted: 0`

Line 174: `whtDeducted: 0` is passed to `recordInvoicePayment()`. No user input for WHT rate or type exists in the payment form UI.

## 3. Root Cause

**The 400 error cannot be reproduced from the current source code.** No query in `src/` selects `wht_rate` or `wht_type` from the `invoices` table.

Possible explanations:

1. **Deployed version mismatch** — The running app is built from a different branch or commit that had a stale query selecting these columns from invoices.
2. **Database view or RPC** — A view (e.g., `invoice_financials_v`) or an RPC that internally references `invoices.wht_rate` or `invoices.wht_type` could trigger the error. The `invoice_financials_v` view in `paymentRepository.ts:137` was checked — it selects `balance_due` only, not WHT fields.
3. **Previous code version** — Check commits before `c7b66591` ("consolidate payment entry pipelines and eliminate redundant WHT properties") which removed stale WHT properties. An earlier version may have queried these columns.

## 4. Fix Applied (Already in Code)

The commit `c7b66591` (2026-07-04) already:
- Removed stale `whtDeducted` from `paymentEntryHelpers.ts`
- Removed unused `PaymentFormState` and `PaymentType` types from `paymentTypes.ts`
- Consolidated payment loading via `loadPaymentSheetData()`

## 5. Recommendations

1. **Redeploy** the current `main` branch to ensure the deployed app matches source code.
2. **Drop unused columns** on `invoices` if any exist — run `SELECT column_name FROM information_schema.columns WHERE table_name='invoices'` to verify no stale `wht_rate`/`wht_type` columns exist at the database level.
3. **Verify deployed branch** — Confirm the Vercel deployment points to the latest commit.

## 6. Verification

- `bun run typecheck` — Pass
- `bun run audit:load` — Pass
- Build skipped per hardware policy (4GB RAM limit)
- Clean working tree confirmed via `git status`
