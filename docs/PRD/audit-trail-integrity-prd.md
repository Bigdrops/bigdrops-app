
# Invoice & Quotation Audit-Trail Integrity — PRD v1.1

**Status:** Approved for implementation (Phase 1 — surgical fix only)
**Date:** 2026-07-03
**Authors:** Sirius 7, Gu Change (peer-reviewed by rector, dorime)
**Repository path:** `docs/PRD/audit-trail-integrity-prd.md`
**Evidence basis:** `docs/Reports/invoice-quote/` — three prior audit rounds:
1. Payment Recording System — Architecture & Data Flow Audit (DeepSeek)
2. Financial Operations Architecture Audit (DeepSeek)
3. Third Audit: Invoice & Quotation Audit-Trail, Financial-State, and Lineage Integrity

---

## 1. Purpose

This PRD authorizes one narrow, evidence-backed fix to close a confirmed audit-trail
gap in payment voiding. It exists to prevent this work from depending on any single
conversation, architect, or AI session — it is the durable record of what was found,
what will be built, and what is explicitly out of scope.

This is **not** the Financial Operations platform PRD (`financial-operations-prd.md`,
authored by rector/dorime). That document is long-term architectural vision. This
document is a small, immediately actionable fix derived from verified evidence. The
two are sequenced, not competing — see §7.

---

## 2. Problem Statement (Evidence-Based, Not Speculative)

Confirmed by direct source inspection (file:line citations below), not inference:

1. **`voidInvoicePayment()` calls no audit function.**
   `paymentService.ts:98-106` → `paymentRepository.ts:96-131`. Voiding a payment sets
   `payments.voided_at` and resyncs `invoices.status`, but writes nothing to
   `audit_logs` or `activity_events`. The only trace that a void occurred is the
   `voided_at` timestamp itself.

2. **`recordPaymentRecorded()` exists but is never called.**
   Defined at `audit.ts:159`, wired to the `record_payment_recorded` RPC
   (→ `activity_events`, event type `PAYMENT_RECORDED`). Grep across the full
   codebase returns zero call sites other than the definition. Payment *recording*
   — not just voiding — currently produces no activity_events entry either.

3. **`void_reason` is accepted but discarded.**
   `VoidPaymentInput` (`paymentService.ts:92-96`) accepts a `reason` string.
   `voidInvoicePayment()` never passes it to the repository layer.
   `paymentRepository.ts:96-106`'s `voidPayment()` only sets `voided_at` — the
   `payments.void_reason` column (`20260520090003_invoices.sql:92`) is never written.

4. **Double-void is silently absorbed, not blocked or logged.**
   The guard `.is("voided_at", null)` (`paymentRepository.ts:101`) means a second
   void call affects 0 rows and throws no error. This is acceptable as a guard, but
   compounds finding #1 — there is no way to see that a second void was attempted.

**Pattern confirmed by the third audit (R1):** where audit exists at all, it is
written to `audit_logs` and `activity_events` together (CREATE, STATUS_CHANGE, LINK).
There is no observed case of one system being written and the other missed. The gap
is calls that write to **neither**, not a divergence between the two systems. This
directly resolves the earlier open question of whether `audit_logs`/`activity_events`
need architectural unification — the evidence says no, not yet: fix the missing
calls first, using the pattern already proven to work.

---

## 3. Objective

Close the three confirmed gaps above in `paymentService.ts` and `audit.ts` only,
using the existing, already-working direct-call audit pattern. No new schema, no
new event bus, no new entity types.

---

## 4. Scope

**In scope:**
- `src/lib/audit.ts` — add `recordPaymentVoided()`, following the exact shape of
  the existing `recordPaymentRecorded()`.
- `src/modules/invoices/services/paymentService.ts` — wire `recordPaymentRecorded()`
  into `recordInvoicePayment()` (currently dormant); wire `recordPaymentVoided()`
  into `voidInvoicePayment()`; pass `reason` through to the repository call.
- `src/modules/invoices/repositories/paymentRepository.ts` — extend `voidPayment()`
  to accept and persist `void_reason` alongside `voided_at`.

**Explicitly out of scope for this PRD:**
- DELETE/ARCHIVE audit gaps on Invoice and Quotation (confirmed by the third audit,
  §2 of that report) — real gaps, but not the source of the original pain point
  (one-way, unreversible-looking payment recording). Tracked as a follow-up PRD.
- `invoice_financials_v` negative `balance_due` on overpayment — confirmed
  divergence from `financialState.ts`'s clamped value, but currently harmless
  (only `computed_status` is read from the view, and its `<=0` threshold handles
  negative values correctly). Tracked as a documented risk, not fixed here.
- `revert_invoice_to_quotation_transaction` — referenced in code
  (`invoiceConversionService.ts:75`) with no corresponding migration file anywhere
  in the repository. This is a live-risk finding, not part of this fix. Rector/
  dorime have taken ownership of verifying this before any Phase 1 work touches
  document-transformation lineage (PRD §17.6 of the Financial Operations PRD).
- Any event bus, correlation ID, or platform-level audit service
  (Financial Operations PRD §17.1) — deferred pending the outcome of this fix.
- `compute_jsonb_diff` array-diff behavior — confirmed non-recursive, but no
  invoice-tracked field currently includes arrays (`items` is excluded from
  `INVOICE_TRACKED_FIELDS`), so no fix is triggered by this finding.

---

## 5. Requirements

### 5.1 `recordPaymentVoided()` (new, in `audit.ts`)
- Mirror `recordPaymentRecorded()`'s existing shape and call pattern exactly —
  same RPC style, same `audit_logs` + `activity_events` dual-write behavior already
  proven correct for CREATE/STATUS_CHANGE/LINK actions.
- Accept: `paymentId`, `invoiceId`, `amount` (cash + WHT), `reason`, `actorId`.
- Must not require any new database column beyond what already exists
  (`payments.void_reason` already exists in schema — see §2.3).

### 5.2 Wire into `paymentService.ts`
- `recordInvoicePayment()`: after successful `insertPayment()`, call
  `recordPaymentRecorded()`. (This activates dormant code — zero new logic, only
  a missing call site being filled in, per finding #2.)
- `voidInvoicePayment()`: after successful `repositoryVoidPayment()`, call
  `recordPaymentVoided()` with the `reason` supplied by the caller.
- Pass `reason` through to `paymentRepository.voidPayment()` instead of discarding it.

### 5.3 `paymentRepository.ts`
- `voidPayment(paymentId, reason)` — extend the existing `UPDATE` to also set
  `void_reason = reason` in the same statement that sets `voided_at`. No schema
  change required; the column already exists and is currently unused.

### 5.4 Preserve existing behavior (AGENTS.md compliance)
- `recordInvoicePayment()`'s UI-facing timing, return shape, and success/error
  behavior must be unchanged from the user's perspective.
- No change to `financialState.ts`, `invoice_financials_v`, or any calculation logic.
- No change to `INVOICE_TRACKED_FIELDS` or `compute_jsonb_diff`.

---

## 6. Verification

- `bun run typecheck`, `bun run build`.
- Manual/scripted test: record a payment → confirm one new `audit_logs` row and one
  new `activity_events` row exist, matching the shape already produced by other
  audited actions (CREATE/STATUS_CHANGE).
- Manual/scripted test: void that payment with a reason → confirm a new
  `recordPaymentVoided()`-produced row exists in both systems, and
  `payments.void_reason` is populated (was previously always null).
- Manual/scripted test: void the same payment a second time → confirm the existing
  `.is("voided_at", null)` guard still silently no-ops (unchanged behavior), and
  confirm no duplicate/false audit row is created for the second attempt.
- Confirm no regression to `recordInvoicePayment()`'s existing UI flow, timing, or
  error handling.

---

## 7. Relationship to the Financial Operations Platform PRD

The Financial Operations PRD (rector/dorime, `financial-operations-prd.md`) describes
a long-term target architecture — obligation model, immutable financial events,
Audit as a platform service, correlation chains. This PRD's fix operates entirely
within the *current* direct-call audit pattern and does not build toward or against
that target architecture.

**Agreed sequencing (per cross-architect handshake, 2026-07-03):**
- This fix proceeds now. Files touched: `audit.ts`, `paymentService.ts`,
  `paymentRepository.ts` (invoice/quotation service layer only).
- Rector/dorime hold implementation prompts touching `audit.ts`,
  `paymentService.ts`, `invoiceLifecycleService.ts`, or `viewQuotationActions.ts`
  until this fix lands and is verified.
- Once verified, the actual post-fix audit_logs/activity_events wiring will be
  written up as evidence and handed to rector/dorime. **The verified implementation
  will be used to refine the migration strategy toward the platform-level audit
  architecture described in the Financial Operations PRD** — the destination
  (§17.1's platform-service model) stays the intended North Star; the route and
  timing toward it may change based on what this evidence shows.

---

## 8. Architectural Migration Note

This PRD intentionally preserves the existing direct-call audit pattern. It should
not be interpreted as rejecting the long-term Audit Platform architecture defined in
the Financial Operations PRD.

Instead, it establishes a verified baseline from which future architectural
evolution can proceed safely. Future phases may introduce event publication,
correlation chains, or centralized audit orchestration only after they demonstrate
measurable value over the verified implementation documented here.

---

## 9. Deferred Work (Explicit, for Follow-Up PRDs)

| Item | Why deferred |
|---|---|
| DELETE/ARCHIVE audit on Invoice + Quotation | Real gap, not the original pain point; smaller surgical fix, separate PRD |
| `invoice_financials_v` negative `balance_due` | Currently harmless; needs a schema decision (`GREATEST(0,...)` vs. documenting the divergence) |
| `revert_invoice_to_quotation_transaction` missing migration | Owned by rector/dorime, blocking their §17.6 work, not this fix |
| Quotation UPDATE missing `activity_events` write | Same class of gap as invoice UPDATE; batch with DELETE/ARCHIVE follow-up |
| Audit-trail standard document (`docs/STANDARD/audit-trail-standard.md`) | Explicitly deferred until this fix is implemented and proven — a standard codifies what works, and nothing has been implemented yet |
| Event bus / correlation IDs / platform-service Audit | Deferred pending evidence from this fix's outcome |

---

## 10. Success Criteria

This PRD is complete when:
- A payment record produces a visible `audit_logs` + `activity_events` pair.
- A payment void produces a visible `audit_logs` + `activity_events` pair, with
  `reason` persisted to `payments.void_reason`.
- No existing behavior (recording flow, status sync, financial calculations) has
  changed from the user's or any downstream consumer's perspective.
- `bun run typecheck` and `bun run build` pass.
- The write-up of actual post-fix wiring exists and has been handed to rector/dorime.

---

## 11. Documentation Hierarchy (for reference)

```

Financial Operations PRD
    ↓ (defines target architecture)
Audit Integrity PRD (this document)
    ↓ (defines verified current implementation + immediate fix)
Audit Trail Standard (deferred until §5 is implemented and proven)
    ↓ (codifies naming, required events, conventions, testing)
Implementation prompts
```
```

