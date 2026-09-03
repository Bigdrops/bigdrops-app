# Phase 1 — Integrity Foundation: Implementation Report

This report was written by OpenCode on 2026-07-04 via Local Runner.

## Objective & Scope

Implement three Integrity Foundation fixes for the BIGDROPS financial operations platform:
1. **WHT snapshot persistence** — Capture `wht_rate` and `wht_type` at payment record time instead of inserting `null`
2. **Financial state alignment** — Align the TypeScript `paid` check with the SQL canonical view `invoice_financials_v`
3. **Dead code removal** — Delete the unused `RecordPaymentModal.tsx` component

Out of scope: payment system redesign, new user workflows, changes to `src/lib/Calculations.ts`, document transformation logic, prefix engine, or WHT UI fields.

---

## Evidence

### Task 1 — WHT Snapshot Persistence

**Problem:** `insertPayment` in `paymentRepository.ts:27-28` hardcoded `wht_rate: null, wht_type: null` on every payment record, discarding the invoice's configured WHT values.

**Changes:**

- `src/modules/invoices/types/paymentTypes.ts` — Added `wht_rate: number | null` and `wht_type: string | null` to both `InvoicePayment` and `PaymentInput` interfaces.

- `src/modules/invoices/repositories/paymentRepository.ts` — Added `fetchInvoiceWhtConfig(invoiceId)` which does a single-row select of `wht_rate, wht_type` from the `invoices` table. Updated `insertPayment` to read `payload.wht_rate ?? null` and `payload.wht_type ?? null` instead of hardcoded nulls.

- `src/modules/invoices/services/paymentService.ts` — In `recordInvoicePayment`, added a call to `fetchInvoiceWhtConfig(input.invoiceId)` and populates `payload.wht_rate` and `payload.wht_type` before calling `insertPayment`.

### Task 2 — Financial State Alignment

**Problem:** `calculateInvoiceFinancialState` in `financialState.ts:59` used `settledAmount >= invoiceTotal - tolerance` (default tolerance = 1), creating a 1 Naira gap where TS considers an invoice "paid" but the SQL view `invoice_financials_v` classifies it as still having a `balance_due > 0`.

**Change:** `src/domain/invoice/financialState.ts:59` — Changed condition from `settledAmount >= invoiceTotal - tolerance` to `settledAmount >= invoiceTotal`. This aligns TS `paid` detection with SQL's exact `balance_due <= 0` logic.

**No callers pass a non-default tolerance** — verified via grep. The only reference to `tolerance` beyond this file is in the regression test file `payments-regression.test.ts` which uses mock globals and is effectively a no-op.

### Task 3 — Dead UI Removal

**Problem:** `src/components/RecordPaymentModal.tsx` (351 lines) was unused by any source file.

**Verification:** Grep for `RecordPaymentModal` across all non-deleted files found only:
- 3 self-references (the file itself)
- References in `docs/Reports/` (documentation)

Zero imports from any `src/` TS/TSX/JS file. The current payment recording flow uses `RecordPaymentSheet` (via `RecordPaymentSheetTrigger`), not this modal.

**Change:** Deleted `src/components/RecordPaymentModal.tsx`.

---

## Verification Results

| Gate | Result |
|------|--------|
| `bun run audit:load` | Passed (0 new issues) |
| `bun run typecheck` | Passed (0 errors) |
| `git status` | 5 files changed — exactly the intended set |
| `git diff` | No unintended changes |

---

## Risks & Limitations

- `fetchInvoiceWhtConfig` returns `null` silently if the invoice row is missing (should not happen in practice since the invoice exists by the time a payment is recorded).
- WHT fields on `InvoicePayment` type were added but no downstream consumers are reading them yet — this is a future concern (Phase 2).
- The deleted `RecordPaymentModal.tsx` referenced `paymentEntryHelpers`, `loadBankAccountsList`, and `calculatePreviousSettled` — none of these are affected since the modal was the only consumer.
- Build was not tested due to the 4GB RAM constraint documented in AGENTS.md.

## Deferred Work

- No Phase 2 work was started.
- WHT certificate reference tracking, compliance hub integration, and payment allocation logic remain for future phases.
