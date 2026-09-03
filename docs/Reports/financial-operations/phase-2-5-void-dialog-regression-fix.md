# Void Payment Dialog Regression Fix

This report was written by OpenCode on 2026-07-05 via Local Runner.

## Root Cause

During the Payment History UI redesign, the `onVoidPayment` prop in `ViewInvoice.tsx` was wired directly to `actions.confirmVoidPayment`.

`confirmVoidPayment` is the **dialog confirmation handler** — it expects a `reason: string` argument and reads `pendingVoidPaymentId` from state. It does **not** set `pendingVoidPaymentId` and does **not** open the void modal. It returns immediately when `pendingVoidPaymentId` is `null`.

When the user clicked Void on a payment row, `PaymentHistoryCard` called `onVoidPayment(payment.id)`, which invoked `confirmVoidPayment(payment.id)`. The guard `if (!pendingVoidPaymentId || ...) return;` evaluated to true (`pendingVoidPaymentId` was never set), so the function returned silently. No dialog, no error, no state change.

## Exact Event Chain

```
User clicks "Void" on payment row
  → PaymentHistoryCard.onClick → onVoidPayment(payment.id)
    → (ViewInvoice.tsx) actions.confirmVoidPayment(payment.id)  ← WRONG
      → if (!pendingVoidPaymentId) return;  // null → silent exit
      → // nothing happens
```

## Correct Chain

```
User clicks "Void" on payment row
  → PaymentHistoryCard.onClick → onVoidPayment(payment.id)
    → (ViewInvoice.tsx) actions.handleVoidPayment(payment.id)   ← FIXED
      → setPendingVoidPaymentId(payment.id)
      → ui.openModal("void-payment")
        → VoidPaymentDialog renders (open=true)
          → User enters reason, clicks Confirm
            → onConfirm(reason) → confirmVoidPayment(reason)
              → voidInvoicePayment() → refresh → close modal
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/document-view/invoice/useInvoiceActions.ts:184-187` | Added `handleVoidPayment` function — sets `pendingVoidPaymentId` and opens `MODAL_VOID_PAYMENT` |
| `src/components/document-view/invoice/useInvoiceActions.ts` (return) | Exported `handleVoidPayment` alongside `confirmVoidPayment` |
| `src/pages/ViewInvoice.tsx:154` | Changed `onVoidPayment={actions.confirmVoidPayment}` → `onVoidPayment={actions.handleVoidPayment}` |

## Why The Regression Occurred

`confirmVoidPayment` was already exported from `useInvoiceActions` and served double duty as both the "click Void button" handler and the "dialog confirmed" handler in the old code. When the `PaymentHistoryCard` was redesigned to use Tailwind, the `onVoidPayment` callback was still passed through the chain (`InvoiceWorkspace` → `InvoiceOperationalSections` → `PaymentHistoryCard`), but the parent `ViewInvoice.tsx` was wired to the wrong function name — `confirmVoidPayment` instead of the now-restored `handleVoidPayment`.

The old code likely had `handleVoidPayment` before the refactor and it was dropped. The `setPendingVoidPaymentId` + `ui.openModal` logic was never added to a separate function — it was inline in the old wiring or existed as `handleVoidPayment` and was removed.

## Verification

| Check | Result |
|-------|--------|
| `bun run typecheck` | PASSED |
| `bun run audit:load` | PASSED (no new warnings) |
| `git status` | Only 2 intended files modified |

No files outside the wire-up layer were touched. No business logic, service layer, repository, audit, or database files were modified.
