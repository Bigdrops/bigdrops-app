# Payment Void Audit Diagnostic Report

This report was written by MiMoCode on 2026-07-05 via Local Runner.

## Root Cause: CHECK Constraint Missing PAYMENT_VOIDED

The `activity_events` table has a CHECK constraint `activity_events_event_type_check` that does **not include `PAYMENT_VOIDED`** as a valid event type. This is the ONLY blocked event type.

---

## Diagnostic Findings

### 1. Migration File Exists

**File:** `supabase/migrations/20260703000000_record_payment_voided.sql`

Defines `CREATE OR REPLACE FUNCTION public.record_payment_voided(...)` at lines 4-49. The function:
- Accepts `p_payment_id`, `p_invoice_id`, `p_amount`, `p_actor_id`, `p_actor_label`, `p_source`, `p_reason`
- Calls `record_activity_event()` with `p_event_type := 'PAYMENT_VOIDED'`
- Writes to `activity_events` table

### 2. RPC Exists in Live Database

Confirmed by calling the RPC with test parameters:
```
RPC call returned error: Invoice not found: 00000000-0000-0000-0000-000000000000
Error code: P0001
```

The error "Invoice not found" proves the function **executes** — it just fails because we passed a non-existent invoice UUID. The migration WAS applied.

### 3. CHECK Constraint Blocks PAYMENT_VOIDED

Test results with `source='web'` (the only allowed source value):

| Event Type | Allowed? |
|------------|----------|
| CREATED | ✅ |
| UPDATED | ✅ |
| STATUS_CHANGED | ✅ |
| PAYMENT_RECORDED | ✅ |
| **PAYMENT_VOIDED** | **❌** |
| LINKED | ✅ |
| UNLINKED | ✅ |
| NOTE_ADDED | ✅ |
| DOCUMENT_ADDED | ✅ |
| ARCHIVED | ✅ |
| UNARCHIVED | ✅ |

`PAYMENT_VOIDED` is the **only** event type blocked by the CHECK constraint.

### 4. Parameters Match

The parameters passed from `recordPaymentVoided()` in `src/lib/audit.ts:203-214` match the RPC signature exactly:

```typescript
// audit.ts passes:
p_payment_id: paymentId,      // uuid
p_invoice_id: invoiceId,      // uuid
p_amount: amount,             // numeric
p_actor_id: actor.id,         // uuid
p_actor_label: actor.label,   // text
p_source: 'web',              // text
p_reason: reason ?? null      // text

// RPC expects:
p_payment_id uuid,
p_invoice_id uuid,
p_amount numeric DEFAULT NULL::numeric,
p_actor_id uuid DEFAULT NULL::uuid,
p_actor_label text DEFAULT NULL::text,
p_source text DEFAULT 'web'::text,
p_reason text DEFAULT NULL::text
```

No parameter mismatch.

### 5. Silent Failure in paymentService.ts

The RPC call at `paymentService.ts:150` is wrapped in try/catch:
```typescript
try {
  await recordPaymentVoided(...)
} catch (auditErr) {
  console.error('Audit trail failed:', auditErr)
}
```

The CHECK constraint violation is caught, logged to console, and swallowed. The void still returns `{ success: true }`.

---

## Fix Required

Update the CHECK constraint on `activity_events.event_type` to include `PAYMENT_VOIDED`:

```sql
ALTER TABLE activity_events
  DROP CONSTRAINT IF EXISTS activity_events_event_type_check;

ALTER TABLE activity_events
  ADD CONSTRAINT activity_events_event_type_check
  CHECK (event_type IN (
    'CREATED', 'UPDATED', 'STATUS_CHANGED',
    'PAYMENT_RECORDED', 'PAYMENT_VOIDED',
    'LINKED', 'UNLINKED', 'NOTE_ADDED',
    'DOCUMENT_ADDED', 'ARCHIVED', 'UNARCHIVED'
  ));
```

This should be added as a new migration file.

---

## Verification

- Migration file exists: ✅ `supabase/migrations/20260703000000_record_payment_voided.sql`
- RPC deployed: ✅ Confirmed by test call
- RPC signature matches: ✅ Parameters align
- CHECK constraint blocks PAYMENT_VOIDED: ✅ Confirmed by insert test
- Other event types work: ✅ 10 of 11 event types allowed
- `source` constraint allows 'web': ✅ Confirmed

## Deferred Work

1. Create migration to update CHECK constraint
2. Regenerate `database.types.ts` to include `record_payment_voided` RPC type
3. Consider adding user-visible error feedback when audit RPC fails
4. Verify CSR/Waybill audit RPCs also work (they write to same table)
