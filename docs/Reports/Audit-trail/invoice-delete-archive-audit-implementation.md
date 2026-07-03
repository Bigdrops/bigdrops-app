# Invoice DELETE & ARCHIVE Audit Implementation — Phase 2

This report was written by DeepSeek on 2026-07-03.

---

## 1. Objective & Scope

Close the confirmed Invoice DELETE and ARCHIVE audit gaps by adding `recordAuditLog()` calls in the existing service layer, following the exact proven pattern from §3 of the audit-trail standard. Strictly limited to:

- `src/lib/audit.ts` — add `'ARCHIVE'` to `AuditAction` type and the early-return exclusion in `recordAuditLog()`
- `src/modules/invoices/services/invoiceLifecycleService.ts` — add `recordAuditLog()` after successful `deleteInvoice()` and `archiveInvoice()` repository mutations

Not in scope: Quotation DELETE/ARCHIVE, Invoice UPDATE `activity_events` write, BOQ, RFQ, Compliance, CSR, Waybill, or any payment-related code.

---

## 2. Changes

### 2.1 `src/lib/audit.ts` — 2 lines

**Line 53** — Added `'ARCHIVE'` to the `AuditAction` union type so the existing `recordAuditLog()` accepts it as a valid action:

```diff
- type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'LINK' | 'UNLINK'
+ type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'STATUS_CHANGE' | 'LINK' | 'UNLINK'
```

**Line 116** — Added `action !== 'ARCHIVE'` to the early-return guard so ARCHIVE actions (which, like DELETE, may not change any tracked field) always write an audit row:

```diff
  if (
    action !== 'CREATE' &&
    action !== 'DELETE' &&
+   action !== 'ARCHIVE' &&
    isSamePayload(p_old_data, p_new_data)
  ) {
```

**Rationale:** `archived_at` is not an `INVOICE_TRACKED_FIELDS` member. Without this exclusion, an ARCHIVE action with identical tracked-field payloads would be silently skipped. This mirrors the existing exclusions for CREATE and DELETE.

### 2.2 `src/modules/invoices/services/invoiceLifecycleService.ts`

#### `deleteInvoice()` — +6 lines

Added a pre-delete fetch (`.maybeSingle()` to preserve the existing no-error-on-missing behaviour) and a non-blocking `recordAuditLog()` call after the delete succeeds:

```typescript
const { data: invoice } = await supabase
  .from("invoices")
  .select("*")
  .eq("id", invoiceId)
  .maybeSingle()

// ... existing delete ...

try {
  const { recordAuditLog, INVOICE_TRACKED_FIELDS } = await import("@/lib/audit")
  await recordAuditLog({
    entityType: "invoice",
    recordId: invoiceId,
    entityLabel: invoice?.invoice_number ?? null,
    action: "DELETE",
    oldData: invoice,
    trackedFields: INVOICE_TRACKED_FIELDS,
  })
} catch (auditErr) {
  console.error("Audit trail failed:", auditErr)
}
```

**Pattern:** Identical to `changeInvoiceStatus()` — dynamic import of audit functions, fire-and-forget in try/catch, placed immediately after the repository write succeeds.

**Why `.maybeSingle()`:** The original `deleteInvoice()` succeeds silently when no row matches. A `.single()` fetch would throw `PGRST116` for missing rows, changing behaviour. `.maybeSingle()` returns `null` safely, preserving the original contract.

#### `archiveInvoice()` — +12 lines

Added a pre-archive fetch, post-archive fetch, and non-blocking `recordAuditLog()` call. Mirrors the `changeInvoiceStatus()` pattern exactly:

```typescript
const { data: previousInvoice } = await supabase
  .from("invoices")
  .select("*")
  .eq("id", invoiceId)
  .maybeSingle()

// ... existing update { archived_at } ...

try {
  const { recordAuditLog, INVOICE_TRACKED_FIELDS } = await import("@/lib/audit")
  const { data: updatedInvoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle()

  await recordAuditLog({
    entityType: "invoice",
    recordId: invoiceId,
    entityLabel: updatedInvoice?.invoice_number ?? null,
    action: "ARCHIVE",
    oldData: previousInvoice,
    newData: updatedInvoice,
    trackedFields: INVOICE_TRACKED_FIELDS,
  })
} catch (auditErr) {
  console.error("Audit trail failed:", auditErr)
}
```

---

## 3. Call Site Confirmation

| Caller | Function Called | Behaviour Before | Behaviour After |
|---|---|---|---|
| `useInvoiceMutations.ts:209` | `deleteInvoice(id)` | Deletes invoice, navigates to `/invoices` | Same, plus audit log written non-blockingly |
| `useInvoiceActions.ts:107` | `deleteInvoice(invoice.id)` | Deletes invoice, navigates to `/invoices` | Same, plus audit log written non-blockingly |
| `useInvoiceMutations.ts:224` | `archiveInvoice(id)` | Archives invoice, navigates to `/invoices` | Same, plus audit log written non-blockingly |
| `useInvoiceActions.ts:96` | `archiveInvoice(invoice.id)` | Archives invoice, navigates to `/invoices` | Same, plus audit log written non-blockingly |

**No call-site changes required.** The audit addition is entirely internal to the service functions. All existing flows (error handling, navigation, UI feedback) are unchanged.

---

## 4. Coverage Matrix Update

Updated from `docs/STANDARD/audit-trail-standard.md` §6:

| Entity | Action | `audit_logs` | `activity_events` | Verified live? |
|---|---|---|---|---|
| Invoice | CREATE | ✅ | ✅ | Pre-existing, in production |
| Invoice | UPDATE | ✅ | ❌ | Pre-existing gap — not in this task's scope |
| Invoice | STATUS_CHANGE | ✅ | ✅ | Pre-existing, in production |
| Invoice | **DELETE** | **✅** | **❌** | **Newly added (Phase 2) — not yet live-verified** |
| Invoice | **ARCHIVE** | **✅** | **❌** | **Newly added (Phase 2) — not yet live-verified** |
| Invoice | PAYMENT_RECORDED | — | ✅ | Verified live, 2026-07-03 |
| Invoice | PAYMENT_VOIDED | — | ✅ (implemented) | Not yet verified |
| Quotation | CREATE | ✅ | ✅ | Pre-existing, in production |
| Quotation | UPDATE | ✅ | ❌ | Pre-existing gap — not in this task's scope |
| Quotation | STATUS_CHANGE | ✅ | ✅ | Pre-existing, in production |
| Quotation | LINK (convert) | ✅ | ✅ | Pre-existing, in production |
| Quotation | DUPLICATE | ✅ | ✅ | Pre-existing, in production |
| Quotation | DELETE | ❌ | ❌ | Gap — deferred |
| Quotation | ARCHIVE | ❌ | ❌ | Gap — deferred |

**Note:** `activity_events` remains ❌ for DELETE and ARCHIVE because there is no existing RPC for `record_invoice_deleted` or `record_invoice_archived`. Adding those would require new RPCs (explicitly excluded by this task's constraints). The `audit_logs` write is the important gap closure — it creates a permanent record of the action with actor identity.

---

## 5. Risks & Limitations

1. **`activity_events` not written for DELETE/ARCHIVE.** The standard's "dual mechanism" (§5) is partially fulfilled — `audit_logs` is written via `recordAuditLog()`, but `activity_events` has no dedicated RPC for these actions. Full dual-write would require new RPCs (`record_invoice_deleted`, `record_invoice_archived`) and whitelist updates, which were explicitly out of scope. See §7 Deferred Work.

2. **Pre-fetch adds one extra `SELECT` per delete/archive.** In the worst case (deleting a non-existent invoice), this is a wasted query. Impact is negligible for normal usage (the invoice exists; the button is only shown for existing records).

3. **Audit failure is non-blocking, silently logged.** If `recordAuditLog()` throws (network error, auth failure), the delete/archive still succeeds. This matches the existing `changeInvoiceStatus()` pattern. The error goes to `console.error` — no user-visible feedback, no retry. Acceptable for Phase 2.

4. **`ARCHIVE` action in `audit_logs` records the same tracked-field payload before and after.** Since `archived_at` is not in `INVOICE_TRACKED_FIELDS`, the diff will show no field changes. The audit row still records the action, actor, entity, and timestamp — sufficient for forensic purposes. If field-level diffing of the archive event is needed, `archived_at` should be added to `INVOICE_TRACKED_FIELDS` (a separate decision).

---

## 6. Verification

- `bun run audit:load` — passed (pre-existing warnings only)
- `bun run typecheck` — **passed, zero errors**
- `bun run build` — timed out after 5 min (pre-existing infrastructure issue, no new errors surfaced before timeout)

**Manual verification steps (not yet executed):**
1. Delete an invoice via UI
2. SQL: `SELECT * FROM audit_logs WHERE entity_type = 'invoice' AND action = 'DELETE' ORDER BY created_at DESC LIMIT 1;` — confirm row exists with actor info
3. Archive an invoice via UI
4. SQL: `SELECT * FROM audit_logs WHERE entity_type = 'invoice' AND action = 'ARCHIVE' ORDER BY created_at DESC LIMIT 1;` — confirm row exists with actor info

---

## 7. Deferred Work

| Item | Reason |
|---|---|
| DELETE/ARCHIVE `activity_events` RPCs | Requires new SQL RPC + whitelist update — out of scope for Phase 2 |
| Quotation DELETE/ARCHIVE audit | Same pattern, separate module — per project lead direction |
| Invoice UPDATE `activity_events` write | Confirmed gap, not in this task's scope |
| BOQ/RFQ audit coverage | Explicitly excluded per project lead direction |
| Add `archived_at` to `INVOICE_TRACKED_FIELDS` | Would enable field-diff visibility for archive — optional, depends on business need |
