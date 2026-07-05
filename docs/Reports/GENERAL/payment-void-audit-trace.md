# Payment Void Audit Trace Report

This report was written by MiMoCode on 2026-07-05 via Local Runner.

## Objective

Trace the payment void flow from UI click to database update. Confirm whether `recordPaymentVoided()` is wired into the void path.

## Finding: Audit IS Wired — But Fails Silently

Unlike the CSR case (where the UI bypassed the audited function), the payment void flow **correctly calls `recordPaymentVoided()`**. The audit code is in the execution path. The issue is that the RPC call fails silently due to a try/catch that swallows errors.

---

## 1. UI Entry Points

All void buttons converge to the same handler:

| Component | File:Line | Handler |
|-----------|-----------|---------|
| InvoicePaymentSection (table view) | `src/components/invoice/InvoicePaymentSection.tsx:136` | `onVoidPayment(payment.id)` |
| InvoicePaymentSection (card view) | `src/components/invoice/InvoicePaymentSection.tsx:178` | `onVoidPayment(payment.id)` |
| useInvoiceActions (document-view) | `src/components/document-view/invoice/useInvoiceActions.ts:184-187` | Opens void modal → `confirmVoidPayment` |
| useInvoiceMutations (legacy) | `src/hooks/useInvoiceMutations.ts:252` | Calls `voidInvoicePayment()` |
| viewInvoiceActions (page-level) | `src/pages/viewInvoiceActions.ts:230` | Calls `voidPaymentService()` |

## 2. Void Execution Path

### Step 1: UI triggers void
`useInvoiceActions.ts:189-205` — `confirmVoidPayment()`:
```typescript
const result = await voidInvoicePayment({ paymentId: pendingVoidPaymentId, invoiceId: invoice.id, reason });
```

### Step 2: Service function
`src/modules/invoices/services/paymentService.ts:141-159` — `voidInvoicePayment()`:
```typescript
export async function voidInvoicePayment(input: VoidPaymentInput) {
  const payment = await fetchPaymentById(input.paymentId)          // line 143
  const amount = payment ? payment.cash_amount + payment.wht_amount : 0  // line 144
  await repositoryVoidPayment(input.paymentId, input.reason)       // line 146 ← DB UPDATE
  await repositorySyncStatus(input.invoiceId)                      // line 147
  try {
    await recordPaymentVoided(input.paymentId, input.invoiceId, amount, input.reason || null)  // line 150 ← AUDIT
  } catch (auditErr) {
    console.error('Audit trail failed:', auditErr)                 // line 152 ← SILENT SWALLOW
  }
  return { success: true }
}
```

### Step 3: Database UPDATE
`src/modules/invoices/repositories/paymentRepository.ts:107-120` — `voidPayment()`:
```typescript
export async function voidPayment(paymentId: string, reason?: string): Promise<void> {
  const { error } = await supabase
    .from("payments")
    .update({
      voided_at: new Date().toISOString(),
      void_reason: reason ?? null,
    })
    .eq("id", paymentId)
    .is("voided_at", null)
}
```

### Step 4: Audit RPC call
`src/lib/audit.ts:203-214` — `recordPaymentVoided()`:
```typescript
export async function recordPaymentVoided(paymentId, invoiceId, amount, reason) {
  const actor = await getActor()
  return supabase.rpc('record_payment_voided', {
    p_payment_id: paymentId,
    p_invoice_id: invoiceId,
    p_amount: amount,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
  })
}
```

## 3. Audit Call Status

| Check | Result |
|-------|--------|
| `recordPaymentVoided()` defined? | **YES** — `src/lib/audit.ts:203` |
| Called in void path? | **YES** — `src/modules/invoices/services/paymentService.ts:150` |
| RPC function exists? | **YES** — `supabase/migrations/20260703000000_record_payment_voided.sql` |
| `PAYMENT_VOIDED` in whitelist? | **YES** — `supabase/migrations/20260703000001_add_payment_voided_to_whitelist.sql` |
| In `database.types.ts`? | **NO** — stale types, not regenerated |

## 4. Why Audit Fails Silently

The `recordPaymentVoided()` call at `paymentService.ts:150` is wrapped in try/catch (lines 149-153):

```typescript
try {
  await recordPaymentVoided(...)
} catch (auditErr) {
  console.error('Audit trail failed:', auditErr)
}
```

If the RPC throws (e.g., migration not applied, auth state stale, network timeout), the error is logged to console but the void still returns `{ success: true }`. The user sees "Payment voided" success toast, but no audit row is created.

**The `record_payment_voided` RPC writes to `activity_events`, NOT `audit_logs`.** The user should query `activity_events` where `event_type = 'PAYMENT_VOIDED'`, not `audit_logs`.

## 5. Root Cause Summary

This is NOT a code-path bypass (unlike CSR). The audit IS wired correctly. The likely causes are:

1. **Wrong table queried:** Audit rows go to `activity_events`, not `audit_logs`
2. **Migration not applied:** `record_payment_voided` RPC may not exist in the live database
3. **Stale types:** `database.types.ts` doesn't include `record_payment_voided`, masking type errors
4. **Silent failure:** The try/catch at `paymentService.ts:149-153` swallows RPC errors

## 6. Verification

- `bun run audit:load`: Not run (read-only task)
- `bun run typecheck`: Not run (read-only task)
- No files modified

## 7. Deferred Work

1. Investigate whether `record_payment_voided` migration was applied to the live database
2. Regenerate `database.types.ts` to include `record_payment_voided` RPC type
3. Consider adding user-visible error feedback when audit RPC fails (not just console.error)
4. Check `activity_events` table (not `audit_logs`) for PAYMENT_VOIDED rows
