# Payment Lifecycle Audit Trail — Implementation Report

This report was written by AI Coding Agent on 2026-07-03.

---

## Objective & Scope

**Objective:** Close three audit gaps in the payment lifecycle per PRD §5:
1. **GAP-1:** Activate dormant `recordPaymentRecorded()` call in `recordInvoicePayment()`
2. **GAP-2:** Add `recordPaymentVoided()` for void operations (new RPC + audit function)
3. **GAP-3:** Persist void reason string into `payments.void_reason` (column exists, always NULL)

**Scope:** Payment lifecycle only. Invoice quotation modules untouched.

**Exclusions:** `financialState.ts`, `invoice_financials_v`, `invoiceLifecycleService.ts`, `INVOICE_TRACKED_FIELDS`, `compute_jsonb_diff`, all Quotation modules.

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/audit.ts:171-182` | Added `recordPaymentVoided()` function |
| `src/modules/invoices/services/paymentService.ts:12,52-81,106-125` | Wired audit calls into both service functions |
| `src/modules/invoices/repositories/paymentRepository.ts:96-120` | Extended `voidPayment()` with reason; added `fetchPaymentById()` |
| `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx:150-152` | Removed duplicate manual `recordPaymentRecorded` call |
| `supabase/migrations/20260703000000_record_payment_voided.sql` | New migration for `record_payment_voided` RPC |

---

## Implementation Details

### GAP-1: `recordPaymentRecorded()` Activation

**Problem:** `recordPaymentRecorded()` existed in `audit.ts:159` but was never called from the service layer.

**Finding:** `InvoiceRecordPaymentSheet.tsx:150-152` had a manual dynamic-import call to `recordPaymentRecorded()` — this was a 4th call site not mentioned in the original audit. Leaving it would cause duplicate `activity_events` rows.

**Fix:** Wired `recordPaymentRecorded()` into `recordInvoicePayment()` in `paymentService.ts:64-68` after `insertPayment()` succeeds. Removed the duplicate manual call from `InvoiceRecordPaymentSheet.tsx`.

**Audit call:** `recordPaymentRecorded(invoiceId, amount, notes)` — non-blocking, wrapped in try/catch.

### GAP-2: `recordPaymentVoided()` Creation

**Problem:** No audit trail for payment void operations.

**Fix:**
1. Created `record_payment_voided` RPC in migration `20260703000000_record_payment_voided.sql` — mirrors `record_payment_recorded` exactly, with `event_type = 'PAYMENT_VOIDED'`, includes `payment_id` in metadata
2. Added `recordPaymentVoided(paymentId, invoiceId, amount, reason?)` to `src/lib/audit.ts:171-182`
3. Wired into `voidInvoicePayment()` in `paymentService.ts:114-118` after `repositoryVoidPayment()` succeeds

**Audit call:** `recordPaymentVoided(paymentId, invoiceId, amount, reason)` — non-blocking, wrapped in try/catch.

### GAP-3: `void_reason` Persistence

**Problem:** `payments.void_reason` column exists but is always NULL — `voidPayment()` never wrote to it.

**Fix:**
1. Extended `voidPayment(paymentId, reason?)` in `paymentRepository.ts:96-109` to set `void_reason` in the same UPDATE as `voided_at`
2. Added `fetchPaymentById(paymentId)` to `paymentRepository.ts:111-120` — needed to get payment amount before voiding for audit metadata
3. Service layer passes `input.reason` through to `repositoryVoidPayment(input.paymentId, input.reason)` in `paymentService.ts:111`

**Note:** All 3 callers of `voidInvoicePayment()` already pass `reason: string` — no caller modification needed.

---

## Backward Compatibility

| Call Site | Change Required | Reason |
|-----------|----------------|--------|
| `useInvoiceActions.ts:188` | No | Already passes `reason: string` |
| `viewInvoiceActions.ts:230-240` | No | Already passes `reason: string` |
| `useInvoiceMutations.ts:252` | No | Already passes `reason: string` |
| `RecordPaymentModal.tsx:164` | No | No manual audit call — benefits from new wired-in `recordPaymentRecorded()` |
| `InvoiceRecordPaymentSheet.tsx:150-152` | Yes | Removed duplicate manual `recordPaymentRecorded` call to prevent double activity_events rows |

---

## Verification

- **Typecheck:** `tsc --noEmit --skipLibCheck` — passed (0 errors in modified files; pre-existing `@types/mdx` JSX namespace errors unrelated)
- **Audit load:** `bun run audit:load` — passed (no new issues from changes)
- **Build:** Timeout at 300s (large codebase) — no errors reported before timeout

---

## Risks & Limitations

1. **Migration requires `record_activity_event` RPC** — the new `record_payment_voided` RPC depends on the existing `record_activity_event` function. If that function is not available in the target environment, the migration will fail.
2. **15-second dedupe window** — `record_activity_event` has a 15-second dedupe window. Rapid void+re-record operations within 15 seconds could be deduplicated incorrectly.
3. **Amount calculation** — `fetchPaymentById()` sums `cash_amount + wht_amount` for the audit record. If a payment has both, the total is correct; if either is null/undefined, `normalizeAmount()` in the service handles it.
4. **Console.error for audit failures** — Audit failures are caught and logged to console, not surfaced to the user. This matches existing `recordPaymentRecorded()` conventions.

---

## Deferred Work

- Running `supabase db push` or `supabase migration up` to apply the migration in dev/staging environments
- Verifying the `record_payment_voided` RPC works end-to-end in a live Supabase instance
- Updating the prior audit report (`docs/Reports/Audit-trail/third-audit-trail-financial-lineage.md`) to reflect implementation completion
