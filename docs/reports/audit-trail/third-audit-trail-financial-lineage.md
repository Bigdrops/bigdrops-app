# Third Audit: Invoice & Quotation Audit-Trail, Financial-State, and Lineage Integrity

**Date:** 2026-07-03
**Scope:** Read-only third audit round — zero code, schema, or doc modifications
**Prior reports audited:** `payment-record-audit-report.md`, `invoice-quotation-workflow-audit-and-repair.md`

---

## 1. Objective & Scope

This audit verifies or falsifies claims from two prior audit reports across six specific areas:

1. **R1 — Call-site completeness:** Do all state-mutating actions write to both `audit_logs` and `activity_events`?
2. **R2 — Void-payment audit trail:** Does voiding a payment produce an audit record?
3. **R3 — Overpayment divergence:** Does the TypeScript financial state match the SQL view?
4. **R4 — `compute_jsonb_diff` behavior:** How does the diff function handle arrays and nested objects?
5. **R5 — Quotation audit coverage:** Are all quotation lifecycle events audited?
6. **R6 — Double-void guard:** Can a payment be voided twice?

**Excluded:** Waybill, CSR, BOQ, RFQ, project, and notification audit trails. Mobile (Capacitor) code paths.

---

## 2. Findings

### R1: Call-site Completeness

**Method:** Enumerated every state-mutating action, traced whether each calls `recordAuditLog()` (→ `audit_logs`), an RPC (→ `activity_events`), both, or neither.

#### Invoice mutations

| Action | audit_logs | activity_events | Verdict | Evidence |
|--------|-----------|----------------|---------|----------|
| CREATE (form) | ✅ | ✅ | Both | `InvoiceFormPage.tsx:594-603` |
| UPDATE (form) | ✅ | ❌ | audit_logs only | `InvoiceFormPage.tsx:606-614` |
| STATUS_CHANGE | ✅ | ✅ | Both | `invoiceLifecycleService.ts:85-94` |
| DELETE | ❌ | ❌ | **Neither** | `invoiceLifecycleService.ts:35-49` |
| ARCHIVE | ❌ | ❌ | **Neither** | `invoiceLifecycleService.ts:18-32` |
| PAYMENT_RECORDED | ❌ | ❌ | **Neither** | `paymentService.ts:50-72` |
| PAYMENT_VOIDED | ❌ | ❌ | **Neither** | `paymentService.ts:98-106` |
| REVERT_TO_QUOTATION | ❌ | ❌ | **Neither** | `invoiceConversionService.ts:14-85` |

#### Quotation mutations

| Action | audit_logs | activity_events | Verdict | Evidence |
|--------|-----------|----------------|---------|----------|
| CREATE (form) | ✅ | ✅ | Both | `QuotationForm.tsx:670-679` |
| UPDATE (form) | ✅ | ❌ | audit_logs only | `QuotationForm.tsx:681-691` |
| STATUS_CHANGE | ✅ | ✅ | Both | `viewQuotationActions.ts:283-298` |
| LINK (convert) | ✅ | ✅ | Both | `viewQuotationActions.ts:235-261` |
| DUPLICATE | ✅ | ✅ | Both | `viewQuotationActions.ts:129-143` |
| DELETE | ❌ | ❌ | **Neither** | `viewQuotationActions.ts:265-270` |
| ARCHIVE | ❌ | ❌ | **Neither** | `viewQuotationActions.ts:272-275` |

**Pattern observed:** When audit is present, it tends to write to both systems together. The gaps are consistent — DELETE, ARCHIVE, and PAYMENT operations write to neither.

**Prior report claim verified:** "Many write sites call both `recordAuditLog()` and an RPC" — **CONFIRMED** for CREATE, STATUS_CHANGE, and LINK actions. The gaps identified (DELETE, ARCHIVE, PAYMENT) are real.

---

### R2: Void-Payment Audit Trail

**Claim from prior report:** "`voidInvoicePayment()` sets `voided_at` but calls no audit function" — **CONFIRMED**.

**Evidence chain:**

1. `useInvoiceActions.ts:184-200` — `confirmVoidPayment()` calls `voidInvoicePayment()` then `syncInvoiceStatus()` then `refresh()`
2. `paymentService.ts:98-106` — `voidInvoicePayment()` calls:
   - `repositoryVoidPayment(paymentId)` → `paymentRepository.ts:96-106` — sets `voided_at = new Date().toISOString()` WHERE `id = paymentId AND voided_at IS NULL`
   - `repositorySyncStatus(invoiceId)` → `paymentRepository.ts:108-131` — reads `invoice_financials_v.computed_status`, writes to `invoices.status`
3. **No audit function is called** — no `recordAuditLog`, no `recordInvoiceStatusChanged`, no `recordPaymentRecorded`

**Impact:** After voiding a payment:
- The `audit_logs` table has no record of the void
- The `activity_events` table has no PAYMENT_VOIDED event
- The `invoices.status` field is updated (via `syncInvoiceStatusFromFinancials`) but without an audit trail
- The `payments.voided_at` timestamp is the only evidence the payment was voided

**Dead code:** `recordPaymentRecorded()` is defined at `audit.ts:159` and calls the `record_payment_recorded` RPC (which inserts into `activity_events` with event_type `PAYMENT_RECORDED`). However, **zero call sites exist in the entire codebase** — confirmed by grep returning only the definition itself (`audit.ts:159`). This function was built but never wired into the payment recording flow (`paymentService.ts:50-72` also does not call it).

---

### R3: Overpayment Divergence

**Claim from prior report:** "TypeScript `financialState.ts` clamps `balanceDue` to `Math.max(0, ...)` and reports `overpaymentAmount`, but the SQL view `invoice_financials_v` does raw subtraction with no clamp" — **CONFIRMED**.

**TypeScript** (`financialState.ts:52-53`):
```ts
balanceDue: Math.max(0, invoiceTotal - settledAmount),
overpaymentAmount: settledAmount > invoiceTotal + tolerance
  ? settledAmount - invoiceTotal : 0
```

**SQL view** (`20260520090010_views.sql:29`):
```sql
coalesce(i.total, 0) - coalesce(
  sum(p.cash_amount + p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0
) AS balance_due
```

- No `GREATEST(0, ...)` clamp
- No `overpayment_amount` column
- `balance_due` can be negative in the view

**SQL view `computed_status`** (`20260520090010_views.sql:30-34`):
```sql
CASE
    WHEN ... <= 0 THEN 'paid'
    WHEN ... > 0 THEN 'partially_paid'
    ELSE 'unpaid'
END
```

The `<=0` threshold means the status correctly resolves to `paid` even when `balance_due` is negative. But the negative value is exposed to any code reading `balance_due` directly.

**Who reads what:**
- `paymentRepository.ts:58-70` — `fetchInvoiceFinancials()` reads `invoice_financials_v.computed_status` only (not `balance_due`)
- `paymentRepository.ts:108-131` — `syncInvoiceStatusFromFinancials()` reads `computed_status` only
- `paymentService.ts:57-58` — reads `financialsRow?.computed_status`
- `financialState.ts` — used by the TS-side financial projection (PDF rendering, display)

**Risk:** If any future code reads `invoice_financials_v.balance_due` expecting it to be non-negative, it will get a negative number for overpaid invoices. The TS layer's clamp is invisible to SQL consumers.

---

### R4: `compute_jsonb_diff` Behavior

**Full definition** (`20260520090008_audit_activity.sql:161-190`):

```sql
CREATE OR REPLACE FUNCTION public.compute_jsonb_diff(old_data jsonb, new_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  result jsonb := '[]'::jsonb;
  key text;
  old_val jsonb;
  new_val jsonb;
begin
  for key in
    select distinct k from (
      select jsonb_object_keys(old_data) k
      union
      select jsonb_object_keys(new_data) k
    ) s
  loop
    old_val := old_data -> key;
    new_val := new_data -> key;
    if old_val is distinct from new_val then
      result := result || jsonb_build_array(
        jsonb_build_object('field', key, 'old', old_val, 'new', new_val)
      );
    end if;
  end loop;
  return result;
end;
$function$;
```

**Behavior:**
- Iterates over the **union** of all top-level keys from `old_data` and `new_data`
- For each key, compares using `IS DISTINCT FROM` (null-safe comparison)
- If different, appends `{field, old, new}` to a JSONB array result
- **Does NOT recurse** into nested objects — nested JSONB values are compared as opaque blobs
- For arrays: the entire array is compared as a single JSONB value. Two arrays with elements in different order are considered different. Two arrays with the same elements in the same order are considered equal.

**Impact on `items` arrays:** Since `INVOICE_TRACKED_FIELDS` (`audit.ts:3-20`) does not include `items`, individual item changes are never passed to `compute_jsonb_diff`. The tracked fields are: `invoice_number`, `client_id`, `client_name`, `project_id`, `issue_date`, `due_date`, `status`, `subtotal`, `vat`, `wht`, `discount`, `total`, `po_number`, `notes`, `linked_quote_id`, `linked_csr_id`.

**`record_audit_log` RPC** (`20260520090008_audit_activity.sql:192-227`):
- Calls `compute_jsonb_diff(old_data, new_data)`
- If `jsonb_array_length(v_changes) = 0`, returns null (no insert) — this means no audit row is created when tracked fields are unchanged
- Otherwise inserts into `audit_logs` with the changes array

---

### R5: Quotation Audit Coverage

**Summary of all quotation lifecycle events:**

| Event | audit_logs | activity_events | Notes |
|-------|-----------|----------------|-------|
| Create (form) | ✅ `CREATE` | ✅ `CREATED` | Both systems |
| Update (form) | ✅ `UPDATE` | ❌ | audit_logs only — no activity_events |
| Status change | ✅ `STATUS_CHANGE` | ✅ `STATUS_CHANGED` | Both systems |
| Convert to invoice | ✅ `LINK` | ✅ `LINKED` | Both systems |
| Duplicate | ✅ `CREATE` | ✅ `CREATED` | Both systems |
| Delete | ❌ | ❌ | **No audit** |
| Archive | ❌ | ❌ | **No audit** |

**Quotation update gap:** `QuotationForm.tsx:681-691` calls `recordAuditLog({action: 'UPDATE'})` but does NOT call any activity_events RPC. The `record_quotation_status_changed` RPC exists but is only called from `viewQuotationActions.ts:286` during explicit status changes, not during general field updates.

**Delete/Archive gap:** `deleteQuotationRecord()` (`viewQuotationActions.ts:265-270`) and `archiveQuotationRecord()` (`viewQuotationActions.ts:272-275`) perform direct Supabase operations with no audit logging.

---

### R6: Double-Void Guard

**Claim from prior report:** "`voidPayment()` uses `WHERE id=$ AND voided_at IS NULL`" — **CONFIRMED**.

**Evidence** (`paymentRepository.ts:96-106`):
```ts
export async function voidPayment(paymentId: string): Promise<void> {
  const { error } = await supabase
    .from("payments")
    .update({ voided_at: new Date().toISOString() })
    .eq("id", paymentId)
    .is("voided_at", null)
  if (error) throw error
}
```

The `.is("voided_at", null)` clause means:
- First void: `voided_at` is NULL → UPDATE succeeds → payment is voided
- Second void: `voided_at` is already set → UPDATE affects 0 rows → no error thrown, but payment remains voided

**Additional guard:** The `payments` table has a `void_reason` column (`20260520090003_invoices.sql:92`) but `voidPayment()` does not write to it — it only sets `voided_at`. The `VoidPaymentInput` interface (`paymentService.ts:92-96`) accepts a `reason` string, but `voidInvoicePayment()` passes it nowhere — the reason is lost.

**No settlement guard:** There is no check preventing voiding a payment when the invoice is already fully settled by other payments. The status sync (`syncInvoiceStatusFromFinancials`) will recalculate correctly, but no warning or block is presented to the user.

---

## 3. Fact vs. Conclusion

### Facts (observed directly from source)

1. `voidInvoicePayment()` calls no audit function — traced through `paymentService.ts:98-106` → `paymentRepository.ts:96-131`
2. `recordPaymentRecorded()` exists at `audit.ts:159` with zero call sites — confirmed by grep
3. `invoice_financials_v.balance_due` can be negative — raw subtraction at `20260520090010_views.sql:29`
4. `financialState.ts` clamps `balanceDue` to `Math.max(0, ...)` — at `:52`
5. `compute_jsonb_diff` does not recurse into nested JSONB — definition at `20260520090008_audit_activity.sql:161-190`
6. `deleteQuotationRecord()` and `archiveQuotationRecord()` have no audit — at `viewQuotationActions.ts:265-275`
7. `deleteInvoice()` and `archiveInvoice()` have no audit — at `invoiceLifecycleService.ts:18-49`
8. Quotation UPDATE writes to audit_logs only, not activity_events — at `QuotationForm.tsx:681-691`
9. `revertInvoiceToQuotationService()` calls `supabase.rpc('revert_invoice_to_quotation_transaction')` — at `invoiceConversionService.ts:75` — this RPC is not defined in any migration file in the repository
10. The `void_reason` parameter is accepted but discarded — at `paymentService.ts:98-106`

### Conclusions (interpretations)

1. **Audit coverage is inconsistent.** CREATE, STATUS_CHANGE, and LINK actions write to both audit systems. UPDATE writes to audit_logs only. DELETE, ARCHIVE, and PAYMENT operations write to neither. This creates blind spots in the activity feed.

2. **The overpayment divergence is a latent risk, not an active bug.** The TS layer clamps correctly for display/PDF. The SQL view's negative `balance_due` is only consumed by `computed_status` (which handles it correctly via `<=0`). But any future SQL consumer reading `balance_due` directly will get a negative number.

3. **Payment void is a silent operation.** No audit trail, no activity event, no status change event. The only evidence is the `voided_at` timestamp on the payment row and the resulting status change on the invoice (which also lacks an audit event).

4. **The `revert_invoice_to_quotation_transaction` RPC is not in any migration file.** It's referenced in `database.types.ts:3110` and called from `invoiceConversionService.ts:75`, but no SQL definition exists in the migrations. This means either it was created directly in the Supabase dashboard, or it will fail at runtime.

---

## 4. Risks & Limitations

1. **No live-data verification.** All findings are traced from source code. No Supabase local DB or test environment was available to execute queries or verify actual audit_log/activity_events rows.

2. **RPC existence unverified.** The `revert_invoice_to_quotation_transaction` RPC is not in migrations. Its behavior is unknown from source alone.

3. **Mobile (Capacitor) paths not audited.** The audit focused on web-side code. Native bridge calls or offline-first patterns may have different audit behavior.

4. **`compute_jsonb_diff` array ordering.** The function uses `IS DISTINCT FROM` which compares JSONB values structurally. Two arrays with the same elements in different order will produce a diff. This is correct behavior but worth noting.

---

## 5. Verification

- **Build:** Not run (read-only audit)
- **Tests:** Not run (read-only audit)
- **Grep results:** All grep patterns returned expected results; no false positives

---

## 6. Deferred Work

| Item | Reason |
|------|--------|
| Add audit logging to `voidInvoicePayment()` | Requires code change — outside read-only scope |
| Add audit logging to `deleteInvoice()` / `archiveInvoice()` | Requires code change |
| Add audit logging to `deleteQuotationRecord()` / `archiveQuotationRecord()` | Requires code change |
| Wire `recordPaymentRecorded()` into payment recording flow | Requires code change |
| Add `GREATEST(0, balance_due)` to `invoice_financials_v` or document the divergence | Requires schema decision |
| Verify `revert_invoice_to_quotation_transaction` RPC exists in Supabase | Requires dashboard access or migration creation |
| Pass `void_reason` through to `payments.void_reason` column | Requires code change |
| Add activity_events RPC for quotation UPDATE events | Requires new RPC + code change |

---

## 7. Summary of Prior Report Claims

| Claim | Verdict | Evidence |
|-------|---------|----------|
| `voidInvoicePayment()` sets `voided_at` but calls no audit function | **CONFIRMED** | `paymentService.ts:98-106` |
| `recordPaymentRecorded()` is defined but never called | **CONFIRMED** | `audit.ts:159` — zero call sites |
| `invoice_financials_v` does raw subtraction, no clamp | **CONFIRMED** | `20260520090010_views.sql:29` |
| `financialState.ts` clamps and tracks overpayment | **CONFIRMED** | `financialState.ts:52-53` |
| `compute_jsonb_diff` produces changes array from top-level diff | **CONFIRMED** | `20260520090008_audit_activity.sql:161-190` |
| `voidPayment()` guard is `WHERE voided_at IS NULL` | **CONFIRMED** | `paymentRepository.ts:101` |
| DELETE and ARCHIVE have no audit | **CONFIRMED** | `invoiceLifecycleService.ts:18-49`, `viewQuotationActions.ts:265-275` |
