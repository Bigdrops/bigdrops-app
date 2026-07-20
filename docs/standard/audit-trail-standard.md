
# Activity & Audit Trail Standard — v1.0 (Partial)

**Status:** Active for all currently-audited action types (CREATE, UPDATE,
STATUS_CHANGE, LINK, DUPLICATE, PAYMENT_RECORDED — all verified working in
some form prior to or during this work). `PAYMENT_VOIDED` newly added, pattern
documented but **not yet runtime-verified** — see §7. DELETE/ARCHIVE gaps
remain open and unaddressed — see §8.
**Date:** 2026-07-03
**Authors:** Sirius 7, Gu Change
**Repository path:** `docs/standard/audit-trail-standard.md`
**Supersedes:** No prior standard existed for this domain — this is the first
codification of a mechanism that already existed and was already working for
most action types before this document was written.
**Evidence basis:**
- `docs/prd/audit-trail-integrity-prd.md` (v1.1)
- `docs/reports/audit-trail/` — three audit rounds + implementation +
  verification reports
- Live SQL confirmation, 2026-07-03: `PAYMENT_RECORDED` activity_events row
  confirmed present after a real payment recording.

---

## 1. Purpose

BIGDROPS already has a working general-purpose activity/audit tracking system.
Before this document existed, it correctly tracked CREATE, UPDATE,
STATUS_CHANGE, LINK, and DUPLICATE actions on Invoice and Quotation. This
standard codifies **that existing, already-proven system** — not a new one
invented for this task — so any future module (Compliance, CSR, Waybill, BOQ,
RFQ, or any other domain) can extend audit coverage by following a pattern
that has been running in production, rather than reinventing logging per
module.

The payment-recording/voiding work done in this thread is **one instance** of
extending this system into a domain (payments) that had a gap — it is not the
system's frame or its origin. Do not read this standard as "the payment audit
standard." It is the general activity-tracking standard, with payments as the
most recently added and most rigorously verified example.

Per project convention: a standard describes what is proven. Where something
here is not yet proven, it is marked explicitly rather than presented as
settled.

---

## 2. Scope

Applies to any code that records an activity or state change against a
tracked entity (`invoice`, `quotation`, `project`, and any entity type added
per §6) via either of the two existing mechanisms described in §3 and §4.
This standard does not invent a new mechanism — it documents the two that
already exist and specifies how to extend each correctly.

---

## 3. Mechanism 1 — `audit_logs` (Field-Diff / Change Tracking)

**Status: proven, in production use prior to this work.**

Used for CRUD-style field changes: CREATE, UPDATE, STATUS_CHANGE, LINK,
DUPLICATE, on Invoice and Quotation, via `recordAuditLog()` in `audit.ts`.

### 3.1 How it works
- Each tracked entity type defines a `TRACKED_FIELDS` list (e.g.
  `INVOICE_TRACKED_FIELDS` in `audit.ts`).
- On a mutation, old and new row data are passed to `compute_jsonb_diff()`
  (SQL function, `20260520090008_audit_activity.sql:161-190`), which
  compares the union of top-level keys and returns a `{field, old, new}[]`
  array for anything that changed.
- If nothing in the tracked fields changed, no row is written — this is by
  design, not a gap.
- The result is inserted into `audit_logs` via the `record_audit_log` RPC.

### 3.2 Known limitation (confirmed, not yet impactful)
`compute_jsonb_diff()` does not recurse into nested objects or arrays —
it compares them as opaque values. Currently no tracked field is an array
(`items` is deliberately excluded from `INVOICE_TRACKED_FIELDS`), so this is
a documented constraint, not an active bug. Any future module adding an array
or nested object to its tracked fields must account for this — either exclude
it from tracking (as done for `items`) or extend `compute_jsonb_diff()`
deliberately, as a separate reviewed change.

---

## 4. Mechanism 2 — `activity_events` (Domain Event Tracking)

**Status: proven for CREATE, STATUS_CHANGE, LINK, DUPLICATE, and now
PAYMENT_RECORDED (verified live, 2026-07-03).**

Used for discrete domain events that aren't naturally a field diff — e.g. "a
payment was recorded," "a quotation was converted," "a document was linked."

### 4.1 The pattern

```
UI component
  → service function (e.g. recordInvoicePayment())
    → repository write (raw table INSERT/UPDATE)
    → domain-specific function in src/lib/audit.ts (e.g. recordPaymentRecorded())
      → supabase.rpc('record_<event>', { ...params, p_actor_id, p_source })
        → record_activity_event() [shared entry point — do not bypass]
          → INSERT INTO activity_events
```

### 4.2 Required elements for adding a new event type
1. One audit function per event, in `audit.ts`, mirroring the shape of an
   existing one (e.g. `recordPaymentRecorded()`):
   ```ts
   export async function record<EventName>(...args, reason?: string | null) {
     const actor = await getActor()
     return supabase.rpc('record_<event_snake_case>', {
       ...mapped_params,
       p_actor_id: actor.id,
       p_actor_label: actor.label,
       p_source: 'web',
       p_reason: reason ?? null,
     })
   }
   ```
2. One matching SQL RPC delegating to the shared `record_activity_event()`
   — never insert into `activity_events` directly from a new RPC.
3. **`p_event_type` must be added to `record_activity_event()`'s whitelist**
   (`20260520090008_audit_activity.sql`) before first use. A missing entry
   fails only at runtime — this was caught by deliberate tracing during the
   `PAYMENT_VOIDED` addition, not by build or typecheck. This is now a
   mandatory checklist item for every new event type, permanently.
4. The audit call belongs in the **service layer**, immediately after the
   repository write succeeds — never in a UI component. (A UI-layer manual
   call to `recordPaymentRecorded()` was found and removed during this work;
   it would have caused duplicate rows once the service layer also called it.)
5. `entity_type` is a separate, smaller whitelist (`invoice`, `quotation`,
   `project`). Adding a new entity type is a bigger decision than adding an
   event type to an existing entity — treat it as requiring peer review, not
   a routine addition.

### 4.3 Dedupe
`record_activity_event()` supports `p_dedupe_seconds` — a duplicate call
within the window returns the existing row rather than inserting a new one.
Existing events use 15 seconds; treat that as the default unless a specific
event has a reason to differ.

---

## 5. Relationship Between the Two Mechanisms — Resolved Finding

Earlier in this project's audit work, it was an open question whether
`audit_logs` and `activity_events` needed to be unified into one system.
Verified evidence closes this:

- They are not redundant. `audit_logs` answers "what fields changed on this
  record." `activity_events` answers "what happened, as a discrete event,
  in the activity feed."
- Where an action is naturally both (e.g. STATUS_CHANGE), both are written,
  deliberately, by the same call site.
- Payment events (`PAYMENT_RECORDED`, `PAYMENT_VOIDED`) are domain events,
  not field diffs — they correctly use `activity_events` only. This is not a
  gap; it was a mischaracterization in earlier drafts of this work to assume
  "the proven pattern" always meant dual-write. That was true for CRUD
  actions, not universally.
- **No unification, event bus, or platform-service layer is needed on the
  basis of this fork.** Any future proposal to build one should be justified
  by a real, evidenced limitation of the current two-mechanism system — not
  by an assumption that two systems are inherently worse than one.

---

## 6. Current Coverage Matrix (as of this standard's writing)

| Entity | Action | `audit_logs` | `activity_events` | Verified live? |
|---|---|---|---|---|
| Invoice | CREATE | ✅ | ✅ | Pre-existing, in production |
| Invoice | UPDATE | ✅ | ❌ | Pre-existing gap — not in this task's scope |
| Invoice | STATUS_CHANGE | ✅ | ✅ | Pre-existing, in production |
| Invoice | DELETE | ❌ | ❌ | Gap — deferred, §8 |
| Invoice | ARCHIVE | ❌ | ❌ | Gap — deferred, §8 |
| Invoice | PAYMENT_RECORDED | — | ✅ | **Verified live, 2026-07-03** |
| Invoice | PAYMENT_VOIDED | — | ✅ (implemented) | **Not yet verified — §7** |
| Quotation | CREATE | ✅ | ✅ | Pre-existing, in production |
| Quotation | UPDATE | ✅ | ❌ | Pre-existing gap — not in this task's scope |
| Quotation | STATUS_CHANGE | ✅ | ✅ | Pre-existing, in production |
| Quotation | LINK (convert) | ✅ | ✅ | Pre-existing, in production |
| Quotation | DUPLICATE | ✅ | ✅ | Pre-existing, in production |
| Quotation | DELETE | ❌ | ❌ | Gap — deferred, §8 |
| Quotation | ARCHIVE | ❌ | ❌ | Gap — deferred, §8 |

This table is the actual state of activity tracking platform-wide, as
verified across three audit rounds. It should be updated, not replaced, as
each new module or gap is addressed — this is the living reference for
"what is actually audited right now," separate from any module's own
service-layer code.

---

## 7. NOT YET PROVEN: `PAYMENT_VOIDED`

**Status:** Implemented (`recordPaymentVoided()`, `record_payment_voided` RPC,
whitelist updated) and typechecked. **Not yet confirmed against live data.**

The current UI does not expose a tested path to trigger a void. Open question,
unresolved:

(a) requires a role/permission the current session doesn't have,
(b) the void action isn't wired to any current UI surface at all, or
(c) the tested invoice/payment is in a state where void isn't offered by
design.

The service-layer code and its three call sites (`useInvoiceActions.ts`,
`viewInvoiceActions.ts`, `useInvoiceMutations.ts`) are confirmed to exist and
appear correctly wired by source inspection. Whether they are reachable from
the current UI, under the current user role, is unverified.

§4's pattern should be trusted as a template regardless — it was proven by
`PAYMENT_RECORDED`, independent of whether `PAYMENT_VOIDED` specifically has
been exercised yet.

---

## 8. Deferred (Not Addressed by This Round of Work)

| Item | Status |
|---|---|
| Invoice/Quotation DELETE audit | Confirmed gap, real, not in this task's scope |
| Invoice/Quotation ARCHIVE audit | Confirmed gap, real, not in this task's scope |
| Invoice/Quotation UPDATE missing `activity_events` write | Confirmed gap, real, not in this task's scope |
| `invoice_financials_v` negative `balance_due` on overpayment | Documented divergence, currently harmless |
| `revert_invoice_to_quotation_transaction` missing migration | Owned by rector/dorime, blocks their §17.6 work |
| Compliance/CSR/Waybill/BOQ/RFQ — zero audit coverage | Not started; §4/§6's pattern is the template when this begins |
| Event bus / correlation IDs / platform-service Audit | No evidence yet justifies this; see §5 |
