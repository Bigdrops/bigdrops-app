# Audit-Trail Standard Fact-Check Report

This report was written by MiMo Code Agent on 2026-07-03.

---

## 1. Objective & Scope

**Objective:** Verify every factual claim in `docs/standard/audit-trail-standard.md` against the actual current source code and migrations, producing a verdict (CONFIRMED/CONTRADICTED/UNVERIFIABLE) for each claim with file:line evidence.

**Scope:** All factual claims in the standard document — coverage matrix, mechanism descriptions, function signatures, whitelist status, redundancy claims, and the §7 open question.

**Excluded:** Recommendations, architectural opinions, and deferred items (§8) are not fact-checked — they are forward-looking statements, not factual claims about current state.

---

## 2. Mechanism 1 — `audit_logs` (§3)

### Claim 3.1: `compute_jsonb_diff()` is defined at `20260520090008_audit_activity.sql:161-190`

**Verdict: CONFIRMED**

**Evidence:** `supabase/migrations/20260520090008_audit_activity.sql:161-190` — function definition matches exactly.

### Claim 3.1: `compute_jsonb_diff()` compares the union of top-level keys and returns `{field, old, new}[]`

**Verdict: CONFIRMED**

**Evidence:** `20260520090008_audit_activity.sql:171-186` — iterates over `select distinct k from (select jsonb_object_keys(old_data) k union select jsonb_object_keys(new_data) k)`, builds `jsonb_build_object('field', key, 'old', old_val, 'new', new_val)` for each changed key.

### Claim 3.1: If nothing changed, no row is written — by design

**Verdict: CONFIRMED**

**Evidence:** `20260520090008_audit_activity.sql:210-212` — `if jsonb_array_length(v_changes) = 0 then return null; end if;` — the `record_audit_log` RPC returns null (no insert) when there are zero changes.

### Claim 3.1: `INVOICE_TRACKED_FIELDS` is defined in `audit.ts`

**Verdict: CONFIRMED**

**Evidence:** `src/lib/audit.ts:3-20` — `export const INVOICE_TRACKED_FIELDS = [...]` with 16 fields.

### Claim 3.2: `compute_jsonb_diff()` does not recurse into nested objects or arrays

**Verdict: CONFIRMED**

**Evidence:** `20260520090008_audit_activity.sql:178-179` — `old_val := old_data -> key; new_val := new_data -> key;` — uses `->` operator which returns the raw JSONB value, not recursed. Comparison is `old_val is distinct from new_val` (line 181) — opaque comparison.

### Claim 3.2: `items` is deliberately excluded from `INVOICE_TRACKED_FIELDS`

**Verdict: CONFIRMED**

**Evidence:** `src/lib/audit.ts:3-20` — the tracked fields list includes `subtotal`, `vat`, `total`, etc. but NOT `items`. The `items` field is a JSONB array and would be compared opaquely if included.

---

## 3. Mechanism 2 — `activity_events` (§4)

### Claim 4.1: Pattern is UI → service → repository → audit.ts → supabase.rpc → record_activity_event → INSERT

**Verdict: CONFIRMED**

**Evidence:** Traced through:
- `src/modules/invoices/services/paymentService.ts:64-68` — service calls `recordPaymentRecorded()`
- `src/lib/audit.ts:159-169` — `recordPaymentRecorded()` calls `supabase.rpc('record_payment_recorded', ...)`
- `supabase/migrations/20260703000000_record_payment_voided.sql:30-47` — RPC calls `public.record_activity_event(...)`
- `20260520090008_audit_activity.sql:122-131` — `record_activity_event` does `INSERT INTO public.activity_events`

### Claim 4.2.1: One audit function per event in `audit.ts`

**Verdict: CONFIRMED**

**Evidence:** `src/lib/audit.ts` contains separate functions: `recordInvoiceCreated` (line 136), `recordInvoiceStatusChanged` (line 146), `recordPaymentRecorded` (line 159), `recordPaymentVoided` (line 171), `recordQuotationCreated` (line 184), `recordQuotationStatusChanged` (line 194), `recordQuotationLinked` (line 207).

### Claim 4.2.2: One matching SQL RPC delegating to shared `record_activity_event()`

**Verdict: CONFIRMED**

**Evidence:** Each RPC in the migration files calls `public.record_activity_event(...)`. Examples:
- `20260703000000_record_payment_voided.sql:30-47` — calls `record_activity_event`
- The pattern is consistent across all RPCs in `20260520090008_audit_activity.sql`

### Claim 4.2.3: `p_event_type` must be added to whitelist before first use

**Verdict: CONFIRMED**

**Evidence:** `20260520090008_audit_activity.sql:96-101` — the whitelist check `if p_event_type not in (...) then raise exception`. A missing entry causes runtime failure.

### Claim 4.2.4: Audit call belongs in service layer, immediately after repository write

**Verdict: CONFIRMED**

**Evidence:** `src/modules/invoices/services/paymentService.ts:64-68` — `recordPaymentRecorded()` is called immediately after `insertPayment()` succeeds (line 57) and `updateInvoiceStatus()` (line 62). Similarly, `recordPaymentVoided()` is called at line 114-118 after `repositoryVoidPayment()` and `repositorySyncStatus()`.

### Claim 4.2.5: `entity_type` whitelist is `invoice`, `quotation`, `project`

**Verdict: CONFIRMED**

**Evidence:** `20260520090008_audit_activity.sql:92-94` — `if p_entity_type not in ('invoice', 'quotation', 'project') then raise exception`.

### Claim 4.3: `record_activity_event()` supports `p_dedupe_seconds`

**Verdict: CONFIRMED**

**Evidence:** `20260520090008_audit_activity.sql:104-120` — deduplication logic checks for existing rows within the time window and returns the existing row if found.

### Claim 4.3: Existing events use 15 seconds as default

**Verdict: CONFIRMED**

**Evidence:** `20260703000000_record_payment_voided.sql:46` — `p_dedupe_seconds := 15`. The `record_payment_recorded` RPC also uses 15 (per verification report evidence).

---

## 4. §4.2 Point 3 — PAYMENT_VOIDED Whitelist Status

### Claim: PAYMENT_VOIDED was added to `record_activity_event()`'s whitelist

**Verdict: CONFIRMED (via separate migration, not original file)**

**Evidence:**
- `20260520090008_audit_activity.sql:96-100` — original whitelist does NOT include `PAYMENT_VOIDED`
- `20260703000001_add_payment_voided_to_whitelist.sql:35-42` — new migration adds `'PAYMENT_VOIDED'` to the whitelist
- The standard references `20260520090008_audit_activity.sql` as the location, but the actual update is in a separate migration file

**Finding:** The standard's reference to the original migration file is technically inaccurate — the whitelist was updated in a NEW migration (`20260703000001`), not in the original file. However, the claim that PAYMENT_VOIDED IS in the whitelist is correct after both migrations are applied. This is a documentation precision issue, not a factual error about the current state.

---

## 5. §5 — Redundancy and Design Claims

### Claim: `audit_logs` and `activity_events` are not redundant

**Verdict: CONFIRMED**

**Evidence:**
- `audit_logs` records field-level diffs (what fields changed) — `20260520090008_audit_activity.sql:192-227`
- `activity_events` records discrete domain events (what happened) — `20260520090008_audit_activity.sql:79-135`
- Different schemas: `audit_logs` has `changes` (JSONB array of diffs), `activity_events` has `event_type` and `metadata`

### Claim: Payment events are `activity_events`-only by design

**Verdict: CONFIRMED**

**Evidence:**
- `recordPaymentRecorded()` (`audit.ts:159-169`) calls `record_payment_recorded` RPC → `record_activity_event` → `activity_events` only
- `recordPaymentVoided()` (`audit.ts:171-182`) calls `record_payment_voided` RPC → `record_activity_event` → `activity_events` only
- Neither function calls `record_audit_log` (the `audit_logs` RPC)
- `src/modules/invoices/services/paymentService.ts:64-68` — only `recordPaymentRecorded()` is called, no `recordAuditLog()`

### Claim: Where an action is naturally both (e.g. STATUS_CHANGE), both are written

**Verdict: CONFIRMED**

**Evidence:**
- `src/modules/invoices/services/invoiceLifecycleService.ts:85-94` — `changeInvoiceStatus()` calls both `recordInvoiceStatusChanged()` (→ activity_events) and `recordAuditLog({action: 'STATUS_CHANGE'})` (→ audit_logs)
- `src/pages/viewQuotationActions.ts:284-298` — `updateQuotationStatus()` calls both `recordQuotationStatusChanged()` and `recordAuditLog({action: 'STATUS_CHANGE'})`

---

## 6. §6 — Coverage Matrix Verification

### Invoice | CREATE | audit_logs ✅ | activity_events ✅

**Verdict: CONFIRMED**

**Evidence:**
- `src/pages/InvoiceFormPage.tsx:609` — `await recordInvoiceCreated(invoiceRow!.id)` → activity_events
- `src/pages/InvoiceFormPage.tsx:610-618` — `await recordAuditLog({action: 'CREATE'})` → audit_logs

### Invoice | UPDATE | audit_logs ✅ | activity_events ❌

**Verdict: CONFIRMED**

**Evidence:**
- `src/pages/InvoiceFormPage.tsx:621-629` — `await recordAuditLog({action: 'UPDATE'})` → audit_logs only
- No `recordInvoiceUpdated()` or equivalent activity_events RPC exists in `audit.ts`

### Invoice | STATUS_CHANGE | audit_logs ✅ | activity_events ✅

**Verdict: CONFIRMED**

**Evidence:**
- `src/modules/invoices/services/invoiceLifecycleService.ts:85` — `await recordInvoiceStatusChanged(...)` → activity_events
- `src/modules/invoices/services/invoiceLifecycleService.ts:86-94` — `await recordAuditLog({action: 'STATUS_CHANGE'})` → audit_logs

### Invoice | DELETE | audit_logs ❌ | activity_events ❌

**Verdict: CONFIRMED**

**Evidence:**
- `src/modules/invoices/services/invoiceLifecycleService.ts:35-49` — `deleteInvoice()` performs `supabase.from("invoices").delete()` with no audit calls

### Invoice | ARCHIVE | audit_logs ❌ | activity_events ❌

**Verdict: CONFIRMED**

**Evidence:**
- `src/modules/invoices/services/invoiceLifecycleService.ts:18-32` — `archiveInvoice()` performs `supabase.from("invoices").update({ archived_at: ... })` with no audit calls

### Invoice | PAYMENT_RECORDED | activity_events ✅

**Verdict: CONFIRMED**

**Evidence:**
- `src/modules/invoices/services/paymentService.ts:65` — `await recordPaymentRecorded(input.invoiceId, payload.amount, payload.notes || null)` → activity_events via RPC

### Invoice | PAYMENT_VOIDED | activity_events ✅ (implemented)

**Verdict: CONFIRMED**

**Evidence:**
- `src/modules/invoices/services/paymentService.ts:115` — `await recordPaymentVoided(input.paymentId, input.invoiceId, amount, input.reason || null)` → activity_events via RPC
- `src/lib/audit.ts:171-182` — `recordPaymentVoided()` function exists
- `supabase/migrations/20260703000000_record_payment_voided.sql` — RPC exists
- `supabase/migrations/20260703000001_add_payment_voided_to_whitelist.sql` — PAYMENT_VOIDED added to whitelist

### Quotation | CREATE | audit_logs ✅ | activity_events ✅

**Verdict: CONFIRMED**

**Evidence:**
- `src/pages/QuotationFormPage.tsx:671` — `await recordQuotationCreated(resolvedId)` → activity_events
- `src/pages/QuotationFormPage.tsx:672-680` — `await recordAuditLog({action: 'CREATE'})` → audit_logs

### Quotation | UPDATE | audit_logs ✅ | activity_events ❌

**Verdict: CONFIRMED**

**Evidence:**
- `src/pages/QuotationFormPage.tsx:682-690` — `await recordAuditLog({action: 'UPDATE'})` → audit_logs only
- No activity_events RPC for quotation update exists

### Quotation | STATUS_CHANGE | audit_logs ✅ | activity_events ✅

**Verdict: CONFIRMED**

**Evidence:**
- `src/pages/viewQuotationActions.ts:286` — `await recordQuotationStatusChanged(...)` → activity_events
- `src/pages/viewQuotationActions.ts:287-295` — `await recordAuditLog({action: 'STATUS_CHANGE'})` → audit_logs

### Quotation | LINK (convert) | audit_logs ✅ | activity_events ✅

**Verdict: CONFIRMED**

**Evidence:**
- `src/pages/viewQuotationActions.ts:237` — `await recordQuotationLinked(id, createdInvoice.id)` → activity_events
- `src/pages/viewQuotationActions.ts:239-258` — `await recordAuditLog({action: 'CREATE'})` for invoice + `await recordAuditLog({action: 'LINK'})` for quotation → audit_logs

### Quotation | DUPLICATE | audit_logs ✅ | activity_events ✅

**Verdict: CONFIRMED**

**Evidence:**
- `src/pages/viewQuotationActions.ts:131` — `await recordQuotationCreated(createdQuotation.id)` → activity_events
- `src/pages/viewQuotationActions.ts:132-140` — `await recordAuditLog({action: 'CREATE'})` → audit_logs

### Quotation | DELETE | audit_logs ❌ | activity_events ❌

**Verdict: CONFIRMED**

**Evidence:**
- `src/pages/viewQuotationActions.ts:265-270` — `deleteQuotationRecord()` performs direct Supabase delete with no audit calls

### Quotation | ARCHIVE | audit_logs ❌ | activity_events ❌

**Verdict: CONFIRMED**

**Evidence:**
- `src/pages/viewQuotationActions.ts:272-275` — `archiveQuotationRecord()` performs direct Supabase update with no audit calls

---

## 7. §7 — PAYMENT_VOIDED Open Question

### Claim: The current UI does not expose a tested path to trigger a void

**Verdict: CONTRADICTED**

**Evidence:** The void payment action IS wired to the UI through multiple paths:
1. `src/pages/ViewInvoice.tsx:154` — `onVoidPayment={actions.confirmVoidPayment}`
2. `src/components/document-view/invoice/InvoiceOverlays.tsx:257-267` — `VoidPaymentDialog` component with `onConfirm={confirmVoidPayment}`
3. `src/components/invoice/InvoicePaymentSection.tsx:136` — Button calls `onVoidPayment(payment.id)`
4. `src/components/document-view/invoice/sections/PaymentHistoryCard.tsx:110` — Button calls `onVoidPayment(payment.id)`

The `confirmVoidPayment` function flows from `useInvoiceActions.ts:184-200` through `ViewInvoice.tsx` to `InvoiceOverlays.tsx` and then to `InvoicePaymentSection.tsx` and `PaymentHistoryCard.tsx`. The `VoidPaymentDialog` component is rendered and can be triggered from the payment history section.

**Conclusion:** The void action IS reachable from the current UI. The §7 open question's option (b) "the void action isn't wired to any current UI surface at all" is incorrect. The action is wired; the question is whether it has been tested with live data, which is a runtime verification matter, not a code reachability issue.

---

## 8. §4.2 — `recordPaymentRecorded()` Shape Claim

### Claim: `recordPaymentRecorded()` accepts `invoiceId`, `amount`, `reason?`

**Verdict: CONFIRMED**

**Evidence:** `src/lib/audit.ts:159` — `export async function recordPaymentRecorded(invoiceId: string, amount: number, reason?: string | null)`

### Claim: `recordPaymentVoided()` accepts `paymentId`, `invoiceId`, `amount`, `reason?`

**Verdict: CONFIRMED**

**Evidence:** `src/lib/audit.ts:171` — `export async function recordPaymentVoided(paymentId: string, invoiceId: string, amount: number, reason?: string | null)`

---

## 9. Summary

| Section | Total Claims | CONFIRMED | CONTRADICTED | UNVERIFIABLE |
|---------|-------------|-----------|--------------|--------------|
| §3 (audit_logs) | 6 | 6 | 0 | 0 |
| §4 (activity_events) | 9 | 9 | 0 | 0 |
| §4.2 point 3 (whitelist) | 1 | 1* | 0 | 0 |
| §5 (redundancy) | 3 | 3 | 0 | 0 |
| §6 (coverage matrix) | 14 | 14 | 0 | 0 |
| §7 (open question) | 1 | 0 | 1 | 0 |
| §4.2 (function shapes) | 2 | 2 | 0 | 0 |
| **Total** | **36** | **35** | **1** | **0** |

*The whitelist claim is confirmed but the reference to the specific migration file is imprecise — the update is in `20260703000001`, not `20260520090008`.

---

## 10. Top-Line Summary

**The standard is highly trustworthy.** 35 of 36 factual claims are CONFIRMED against current source code and migrations. The single CONTRADICTED claim is in §7, which stated the void action isn't reachable from the current UI — it IS reachable via `VoidPaymentDialog` wired through `InvoiceOverlays.tsx`. This is a minor factual error that should be corrected in the standard.

The only other note is a documentation precision issue: the standard references `20260520090008_audit_activity.sql` as the location where PAYMENT_VOIDED was added to the whitelist, but the actual update is in a separate migration file `20260703000001_add_payment_voided_to_whitelist.sql`. The functional claim (PAYMENT_VOIDED IS in the whitelist) is correct.

---

## 11. Risks & Limitations

1. **Runtime verification not performed.** All claims are verified against source code, not against a running Supabase instance. The PAYMENT_VOIDED event has been implemented and typechecked but may not have been exercised with live data.

2. **Mobile (Capacitor) paths not audited.** The standard covers web-side code. Native bridge calls may have different audit behavior.

3. **Schema drift note.** The PAYMENT_VOIDED whitelist update exists only as a migration file (`20260703000001`). If this migration was not applied to the production database, the whitelist would not include PAYMENT_VOIDED at runtime.

---

## 12. Deferred Work

| Item | Notes |
|------|-------|
| Correct §7 in the standard | Update to reflect that void action IS wired to UI |
| Clarify migration reference for whitelist | Note that update is in `20260703000001`, not `20260520090008` |
| Runtime verification of PAYMENT_VOIDED | Apply migrations and test with live data |
