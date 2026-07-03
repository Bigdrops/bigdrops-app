# Payment Recording & Advance Invoice Audit Verification

This report was written by DeepSeek on 2026-07-03.

## Objective & Scope

Verify whether payment recording and advance invoice creation are currently being audited in the live Supabase instance and whether the activity feed UI displays those events. Read-only investigation — no code modifications.

## 1. Code Verification: `recordPaymentRecorded()` and `recordPaymentVoided()`

| Function | File:Line | Calls RPC? |
|---|---|---|
| `recordPaymentRecorded()` | `src/lib/audit.ts:191-201` | YES — `supabase.rpc('record_payment_recorded', ...)` |
| `recordPaymentVoided()` | `src/lib/audit.ts:203-214` | YES — `supabase.rpc('record_payment_voided', ...)` |

### Callers in paymentService.ts

| Call site | File:Line | Invocation |
|---|---|---|
| `recordInvoicePayment()` → `recordPaymentRecorded()` | `src/modules/invoices/services/paymentService.ts:65` | `await recordPaymentRecorded(input.invoiceId, payload.amount, payload.notes \|\| null)` |
| `voidInvoicePayment()` → `recordPaymentVoided()` | `src/modules/invoices/services/paymentService.ts:115` | `await recordPaymentVoided(input.paymentId, input.invoiceId, amount, input.reason \|\| null)` |

**Result: FOUND.** Both functions exist, are called from the service layer, and call Supabase RPCs. The audit call is wrapped in a try/catch that logs but does not rethrow — so a failed audit write never blocks the payment operation.

## 2. Database/RPC Verification

| RPC | Migration file | Lines | Behavior |
|---|---|---|---|
| `record_payment_recorded` | `20260520090003_invoices.sql` | 279-315 | Delegates to `record_activity_event()` with `event_type = 'PAYMENT_RECORDED'` |
| `record_payment_voided` | `20260703000000_record_payment_voided.sql` | 4-49 | Delegates to `record_activity_event()` with `event_type = 'PAYMENT_VOIDED'` |

Both RPCs exist in migration files. The whitelist in `record_activity_event()` (defined in `20260703000001_add_payment_voided_to_whitelist.sql:35-37`) includes:

```
'CREATED', 'UPDATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED',
'PAYMENT_VOIDED',
'LINKED', 'UNLINKED', 'NOTE_ADDED', 'DOCUMENT_ADDED',
'ARCHIVED', 'UNARCHIVED'
```

**Result: FOUND.** Both RPCs exist. `PAYMENT_RECORDED` and `PAYMENT_VOIDED` are whitelisted in `record_activity_event()`. An RPC call that omitted the whitelist entry (such as the original `20260520090008_audit_activity.sql` which has `PAYMENT_VOIDED` missing) would fail at runtime with `"Unsupported event_type: ..."` — this was addressed by the separate migration `20260703000001`.

## 3. Live Data Check (Supabase)

Queried `activity_events` via Supabase REST API (service_role key) on 2026-07-03:

### PAYMENT_RECORDED rows (all time)

```
10 rows found, spanning 2026-04-23 to 2026-07-03
Most recent: SASINV055 at 2026-07-03T07:17:56
```

### PAYMENT_VOIDED rows

```
0 rows found
```

### All event types in last 7 days (2026-06-26 to 2026-07-03)

```
CREATED      — 13 rows (invoices + quotations)
LINKED       —  1 row  (quotation)
PAYMENT_RECORDED — 1 row  (SASINV055)
```

**Result: PAYMENT_RECORDED data IS being written to `activity_events`.** The live instance correctly records payment events. `PAYMENT_VOIDED` has zero rows — this is consistent with §7 of the standard which documents it as "implemented but not yet runtime-verified."

## 4. The Root Cause: Why the Activity Feed Shows No Payment Actions

The Activity Card component on the invoice detail page (`src/components/document-view/invoice/sections/ActivityCard.tsx:15`) uses the `useAuditTrail` hook.

That hook (`src/hooks/useAuditTrail.ts:71-77`) queries **only `audit_logs`**:

```ts
const { data, error: auditError } = await supabase
  .from('audit_logs')
  .select(AUDIT_LOG_SELECT)
  .eq('entity_type', entityType)
  .eq('entity_id', entityId)
  .order('created_at', { ascending: false })
  .limit(50)
```

Meanwhile, `recordPaymentRecorded()` writes to **`activity_events`** — a separate table. The two mechanisms are intentionally split per §5 of the audit standard:

> "Payment events (PAYMENT_RECORDED, PAYMENT_VOIDED) are domain events, not field diffs — they correctly use activity_events only."

| Action | Writes to `audit_logs` | Writes to `activity_events` | Visible in Activity Card? |
|---|---|---|---|
| Invoice CREATE | YES - via `recordAuditLog` | YES - via `recordInvoiceCreated` | YES (reads `audit_logs`) |
| Invoice UPDATE | YES - via `recordAuditLog` | NO (deliberate gap) | YES (reads `audit_logs`) |
| Payment Recorded | NO | YES - via `recordPaymentRecorded` | **NO** (UI queries `audit_logs` only) |

**The activity feed does not query `activity_events` at all.** This is the root cause. Payment actions are audited and present in the database, but the Activity Card UI never reads from that table.

## 5. Advance Invoice Audit Coverage

`invoiceAdvanceService.ts:19-42` defines `recordAdvanceAudit()`, which uses `recordAuditLog()` to write to `audit_logs` with entity_type='invoice'. It is called from:

| Action | Call site | Lines |
|---|---|---|
| Advance metadata CREATE | `createOrUpdateAdvance()` | 138-146 |
| Advance metadata UPDATE | `createOrUpdateAdvance()` | 129-137 |
| Advance metadata DELETE | `deleteAdvance()` | 180-188 |

**Result: Advance invoice metadata operations ARE audited (written to `audit_logs`).** Since the Activity Card reads `audit_logs`, advance operations should appear in the activity feed. However, there is no separate `activity_events` entry for advance operations — they only appear as field-diff entries in `audit_logs` for the parent invoice's `custom_fields`.

## 6. Assessment

### Is payment recording currently audited in the live instance?

**YES, at the database level.** `PAYMENT_RECORDED` rows exist in `activity_events` (10 rows, latest 2026-07-03). The code path is complete:
- `paymentService.ts:recordInvoicePayment()` calls `recordPaymentRecorded()`
- `audit.ts:recordPaymentRecorded()` calls `record_payment_recorded` RPC
- RPC writes to `activity_events` via `record_activity_event()`

**NO, at the UI level.** The Activity Card queries only `audit_logs` and never reads `activity_events`. Payment actions are invisible to users viewing the activity feed. This is a **UI-display gap**, not a data-audit gap.

### Is advance invoice creation audited?

**YES, at the `audit_logs` level.** Advance metadata CREATE/UPDATE/DELETE on the parent invoice write to `audit_logs` via `recordAuditLog()`. These entries appear in the activity feed (which reads `audit_logs`). However, there is no `activity_events` entry for advance operations — they render as field-diff entries on the parent invoice record.

### Why the activity feed shows no payment actions

The code is present, deployed, and working. The data IS being written to `activity_events`. The gap is that the **Activity Card UI queries `audit_logs` exclusively** and does not read `activity_events`. Payment events live in `activity_events` and never in `audit_logs` (by design, per §5 of the standard). This is neither a code bug nor a deployment miss — it is a UI design gap: the activity feed component has no awareness of `activity_events`.

**Answer: (d) A new gap exists — the Activity Card UI does not query `activity_events`.**

## 7. Risks & Limitations

- The `useAuditTrail` hook is used by both the Invoice Activity Card and the Quotation Activity Card. Any fix would need to consider whether both should include `activity_events` or if only invoices need it.
- Merging `activity_events` into the existing feed requires careful deduplication (for CREATE actions, which are dual-written to both tables).
- The `PAYMENT_VOIDED` code path is implemented but has zero live rows — it could not be verified end-to-end.
- Advance invoice metadata auditing writes to `audit_logs` with fields from `AUDIT_TRACKED_FIELDS` (not `INVOICE_TRACKED_FIELDS`), which means the field-diff display shows custom advance metadata fields rather than standard invoice fields.

## 8. Files Referenced

| File | Purpose |
|---|---|
| `src/lib/audit.ts:191-201` | `recordPaymentRecorded()` function |
| `src/lib/audit.ts:203-214` | `recordPaymentVoided()` function |
| `src/modules/invoices/services/paymentService.ts:65` | Call to `recordPaymentRecorded()` |
| `src/modules/invoices/services/paymentService.ts:115` | Call to `recordPaymentVoided()` |
| `src/hooks/useAuditTrail.ts:71-77` | UI query — reads `audit_logs` only |
| `src/components/document-view/invoice/sections/ActivityCard.tsx:15` | Activity Card component using `useAuditTrail` |
| `src/modules/invoices/services/invoiceAdvanceService.ts:19-42` | `recordAdvanceAudit()` function |
| `supabase/migrations/20260520090003_invoices.sql:279-315` | `record_payment_recorded` RPC |
| `supabase/migrations/20260703000000_record_payment_voided.sql:4-49` | `record_payment_voided` RPC |
| `supabase/migrations/20260703000001_add_payment_voided_to_whitelist.sql:35-37` | Whitelist including `PAYMENT_RECORDED`, `PAYMENT_VOIDED` |
| `src/domain/audit/auditTypes.ts:10` | `AuditEventType` includes `PAYMENT_RECORDED` |
| `src/domain/audit/auditFormatters.ts:32` | Action label for `PAYMENT_RECORDED` |
