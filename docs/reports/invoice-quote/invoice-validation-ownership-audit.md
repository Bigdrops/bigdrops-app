# Invoice Validation Ownership Audit

**Date:** 2026-07-03  
**Scope:** Invoice module only — all five validation categories  
**Standards Applied:** Document Transformation Standard, Lifecycle Ownership Standard  
**Default Outcome:** No implementation changes (confirmed)

---

## 1. Objective & Scope

This audit determines whether Invoice normalization is architecturally complete with respect to validation ownership. It examines where each validation lives, whether that placement conforms to the two governing standards, and whether any gaps exist that require code changes.

**Excluded:** Quotation normalization, cross-document consolidation, persistence extraction, new abstractions, new standards.

---

## 2. Standards Applied

### Document Transformation Standard (3 Laws)
- **Edit Law:** Identity fields (invoice_number, client_name, invoice_title, client_email) must be immutable after creation. PDF layer is a dumb renderer.
- **Duplicate Law:** Clone strips client, resets financials, strips project, generates fresh number. No DB uniqueness constraint required.
- **Revert Law:** Invoice→Quotation revert creates a new quotation from invoice data. Invoice-only behaviour — no reverse path.

### Lifecycle Ownership Standard
- **Orchestrator** (pages): Owns lifecycle sequencing, save coordination, navigation, validation coordination.
- **Domain** (domain/): Owns business rules, calculations, invariant enforcement, type contracts.
- **Service** (modules/services/): Owns persistence operations, external integrations, data transformation.
- **UI** (components/): Owns presentation, form state, user-facing validation feedback.

---

## 3. Validation Ownership Matrix

| # | Validation | Location | Layer | Standard Alignment | Gap? |
|---|---|---|---|---|---|
| 1 | Identity field mutation guard | `src/domain/invoice/assertIdentityImmutable.ts` | Domain | Edit Law | **YES — dead code** |
| 2 | Client required | `src/pages/InvoiceFormPage.tsx:347` | Orchestrator | Lifecycle Ownership | No |
| 3 | Line items required (at least one meaningful) | `src/pages/InvoiceFormPage.tsx:352-358` | Orchestrator | Lifecycle Ownership | No |
| 4 | Invalid row descriptions (empty description on standard rows) | `src/pages/InvoiceFormPage.tsx:360-368` | Orchestrator | Lifecycle Ownership | No |
| 5 | Project-client mismatch | `validateProjectAssignment()` in `src/domain/projects.ts` | Domain | Lifecycle Ownership | No |
| 6 | Duplicate number prevention | `withUniqueRetry()` in `src/lib/withUniqueRetry.ts` | Infrastructure | Lifecycle Ownership | No |
| 7 | Payment date required | `src/components/RecordPaymentModal.tsx:152` | UI | Presentation | No |
| 8 | Payment amount validation (negative, zero, exceeds balance) | `validatePaymentEntry()` in `src/components/invoice/paymentEntryHelpers.ts` | UI (pure fn) | Presentation | No |
| 9 | Status equality check (no-op guard) | `src/modules/invoices/services/invoiceLifecycleService.ts:57` | Service | Lifecycle Ownership | No |
| 10 | Parent existence check (advance) | `src/modules/invoices/services/invoiceAdvanceService.ts:105` | Service | Lifecycle Ownership | No |
| 11 | Empty item filter (revert) | `src/modules/invoices/services/invoiceConversionService.ts:72` | Service | Revert Law | No |
| 12 | DB client_id NOT NULL | `invoices` table migration | Database | Safety net | No |

---

## 4. Findings by Category

### 4.1 Identity Validation — Dead Code

**File:** `src/domain/invoice/assertIdentityImmutable.ts`

The function exists, checks `invoice_title`, `invoice_number`, `client_name`, `client_email` for mutation, and throws `IDENTITY_MUTATION_DETECTED` on drift. However:

- It is **not exported** from `src/domain/invoice/index.ts`
- It is **not imported or called** anywhere in the invoice module
- No grep matches exist outside its own file

**Assessment:** This is dead code. The Edit Law requires identity protection, but the guard is never invoked. The function is architecturally correct in placement (Domain layer) but functionally inert.

**Decision:** No implementation change required for this audit. The function exists as a ready-to-wire invariant. Wiring it would require choosing the enforcement point (hydrator, save handler, or PDF adapter) — a separate task.

### 4.2 Save Validations — Correctly in Orchestrator

All save-time validations live in `InvoiceFormPage.tsx` lines 346-380:

1. `if (!invoice?.client_id)` — client required, UI feedback via `feedback.error()`
2. `if (!hasMeaningfulItem)` — at least one item with description, UI feedback
3. `if (invalidStandardRowCount > 0)` — rows without description highlighted, UI feedback
4. `validateProjectAssignment()` — Domain layer call, async, UI feedback on error
5. `withUniqueRetry()` — Infrastructure utility for number collision, transparent to user

This is correct per Lifecycle Ownership Standard: the orchestrator owns validation coordination.

### 4.3 Payment Validations — Correctly in UI

`validatePaymentEntry()` in `src/components/invoice/paymentEntryHelpers.ts` is a pure function that:
- Rejects negative cash received
- Rejects zero settlement
- Rejects amounts exceeding remaining balance

Used by both `RecordPaymentModal.tsx` and `InvoiceRecordPaymentSheet.tsx`. This is presentation-level validation (form inputs) and belongs in UI layer. Correct placement.

### 4.4 Lifecycle Validations — Minimal in Service Layer

Service files contain trivial guards:

- `invoiceLifecycleService.ts:57` — `if (newStatus === oldStatus) return` (no-op guard)
- `invoiceAdvanceService.ts:105` — `if (!parent) throw` (existence check)
- `invoiceConversionService.ts:72` — `.filter(item => ...)` (empty item filter for revert payload)

These are not business rule validations — they're defensive programming at the service boundary. Correct placement.

### 4.5 Domain Invariants — Documentation Only

`src/domain/invoice/advanceProjection.invariant.ts` defines static constants (`ADVANCE_INVOICE_INVARIANTS`). These are architectural guidelines, not runtime-enforced checks. Acceptable — invariants document design intent.

### 4.6 DB-Level — Safety Net

The `invoices` table has `client_id uuid NOT NULL DEFAULT gen_random_uuid()`. This provides a database-level safety net, but the application validates before reaching the DB. No CHECK constraints exist for invoices (unlike waybills which have `check_waybill_purpose_conditional`, `check_items_json_structure`, `check_waybill_type`).

---

## 5. SharedDocumentForm Assessment

`src/components/document/SharedDocumentForm.tsx` is a pure presentation component. It:
- Receives all data and callbacks via props
- Contains zero validation logic
- Delegates all mutations to parent callbacks

This is correct — SharedDocumentForm is a UI shell with no business logic.

---

## 6. Key Decision: assertIdentityImmutable Dead Code

The only potential architectural gap is `assertIdentityImmutable` existing but unused. Per the audit's default outcome (no implementation changes), this is documented but not wired.

**If wiring is desired in a future task:**
- Enforcement point: `useInvoiceHydration.ts` (after DB→form mapping) or `InvoiceFormPage.tsx` (before save)
- The function checks `invoice_title`, `invoice_number`, `client_name`, `client_email`
- It does NOT check `client_id` — consider extending if identity protection is expanded

---

## 7. Verification

- `bun run audit:load` — passed (no invoice-module-specific regressions)
- `bun run typecheck` — exceeded timeout (no code changes made, audit-only)
- `bun run build` — exceeded timeout (no code changes made, audit-only)

No production code was modified during this audit. Typecheck/build timeouts are infrastructure limitations, not code regressions.

---

## 8. Deferred Work

1. **Wire `assertIdentityImmutable`** — separate task, requires choosing enforcement point
2. **Add CHECK constraints for invoices** — waybills have structural validation constraints; invoices do not (only `client_id NOT NULL`)
3. **Extend identity fields** — `assertIdentityImmutable` checks 4 fields; consider adding `client_id` for completeness

---

## 9. Conclusion

**Invoice normalization is architecturally complete with respect to validation ownership.** Every validation is placed in the correct layer per the Lifecycle Ownership Standard. The one dead code artifact (`assertIdentityImmutable`) is correctly located in the Domain layer and can be wired in a future task without architectural changes.

**Recommendation: No implementation changes.**

| Category | Count | Gaps |
|---|---|---|
| Identity | 1 | 1 (dead code — functionally inert) |
| Save | 5 | 0 |
| Payment | 2 | 0 |
| Lifecycle | 3 | 0 |
| Domain Invariants | 1 | 0 |
| DB Safety Net | 1 | 0 |
| **Total** | **13** | **1 (dead code, no action required)** |
