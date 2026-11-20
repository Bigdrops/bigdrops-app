# Stage 3D Implementation Report — Conversational Document Lifecycle, Attachments & Operational Intelligence

**Project:** BOUXRE (formerly BIGDROPS)  
**Phase:** Stage 3D  
**Date:** 2026-11-19  
**Status:** IMPLEMENTED AND VERIFIED (Unit & Application Integration Levels)  
**Decision Reference:** DEC-44  
**Test Suite:** `src/tests/ai-assistant/bolu-stage-3d-capabilities.test.js` (23 passing tests)  
**Regression Suites:** 111 passing tests across Stages 3A.1, 3A.2, 3B, 3C (134 total)  
**Verification Baseline:** `bun run audit:load` clean (0 new violations), `bun run typecheck` (`tsc --noEmit`) exit 0  

---

## 1. Executive Summary & Objective

Stage 3D completes the remaining approved invoice and quotation capability gaps identified during Stage 3 discovery for the Bolu AI Assistant. Extending beyond field editing (Stage 3A), grouped line items / custom detail chips (Stage 3B), and PDF presentation controls (Stage 3C), Stage 3D delivers:

1. **Document Lifecycle Operations:** Governed state transitions (`archive`, `restore`, quotation `convert_to_invoice`, `update_status`) respecting the strict boundary between quotation proposal workflows and invoice payment state derived from the payments ledger.
2. **Quotation Validity Independence:** Independent domain handling of `valid_until` for quotations distinct from invoice `due_date`, with explicit clearing support, Gate 1 baseline Derivation, Gate 2 stale checks, and business language labeling.
3. **Reference Link Attachments:** Secure conversational attachment management in `custom_fields.attachments`, with URL scheme enforcement, localhost/private network blocking, order-significant fingerprinting, and Gate 2 concurrency validation. Direct binary file upload through chat is documented and reported as BLOCKED due to the absence of a tenant-scoped document attachment bucket.
4. **Payment-Term Reachability:** Conversational reachability for `custom_payment_terms` preserved alongside predefined terms (`Net 7`, `Net 14`, `Net 30`, `Due on Receipt`), adhering to invoice vs quotation persistence contracts with 500-character bounding.
5. **Modification Idempotency & Replay Safety:** Dual-layer protection combining in-process `executedOperationIds` with persistent `custom_fields.last_operation_id` and `applied_operation_ids`, protecting against duplicate attachment modifications or repeated lifecycle transitions across serverless restarts and network retries.
6. **Contextual Operational Intelligence:** A dedicated operational intelligence module (`src/lib/ai-assistant/bolu-intelligence.ts`) generating grounded, actionable business observations and optional suggestions without unsolicited automation or model-invented facts.

---

## 2. Verified Domain Rules & System Findings

### 2.1 Document Lifecycle & Status Semantics

Inspection of live schema migrations (`invoices_status_check`, `quotations_status_check`) and application actions (`view-invoice-actions.ts`, `view-quotation-actions.ts`) established the following operational boundaries:

- **Quotations:** Valid persisted statuses are `'open'`, `'converted'`, and `'archived'`. Legacy statuses (`draft`, `sent`, `accepted`, `rejected`) were eliminated from BOUXRE in earlier database sweeps and are strictly rejected. Marking a quotation "accepted" in BOUXRE is realized operationally by converting it to an invoice via `convert_to_invoice`.
- **Invoices:** Permitted statuses under `invoices_status_check` are `'unpaid'`, `'partially_paid'`, `'paid'`, and `'archived'`. Invoice payment status is derived directly from the payments ledger (`payments` table / `invoice_financials_v`). Status cannot be manipulated as an arbitrary scalar; conversational requests to mark an invoice paid or unpaid are rejected with clear business guidance directing the user to the payment sheet.
- **Archive & Restore:** Archiving sets `archived_at = new Date().toISOString()` and updates `status = 'archived'`. Restoring clears `archived_at = null` and resets active status (`'open'` for quotations, `'unpaid'` for invoices).
- **Quotation Conversion:** Quotation conversion calls the canonical `convertQuotationToInvoice` function (`src/pages/view-quotation-actions.ts`), creating an authorized draft invoice linked via `source_quotation_id`, updating the quotation to `'converted'`, and preserving the unique database index idempotency guard.

### 2.2 Quotation Validity vs Invoice Due Date

- **Quotation Validity:** Quotations persist validity in the `valid_until` column (date format `YYYY-MM-DD`). This represents the offer expiration date. Explicit clearing by passing `null` is supported in both forms and conversation.
- **Invoice Due Date:** Invoices persist payment terms in `due_date`. Attempting to set `valid_until` on an invoice is rejected at validation with explicit guidance that invoices carry payment due dates (`due_date`).
- **Preview & Copy Artifact Parity:** Proposals modifying quotation validity or due date display "Quotation validity" in `ProposalCardView` and `proposalPlainText` rather than "Due date".

### 2.3 Document Attachments & Storage Boundaries

- **Reference Links:** BOUXRE invoice and quotation forms support reference links stored in `custom_fields.attachments` as an array of `{ label: string, url: string }`.
- **Security Hardening:** URL validation enforces `http:` or `https:`, rejects dangerous schemes (`javascript:`, `data:`, `file:`), credential smuggling (`user:pass@host`), and blocks private/local network targets (`localhost`, `127.0.0.1`, RFC1918 private subnets).
- **Binary Upload Blocked:** BOUXRE does not possess an authorized, tenant-scoped storage bucket for invoice or quotation attachment files. Introducing an unauthenticated public bucket or using external presets violates repository governance. Binary file upload through Bolu is therefore honestly reported as BLOCKED, directing users to reference links or external documentation.

### 2.4 Payment Terms Reachability

- **Storage Divergence:** Invoices store predefined terms in `invoices.payment_terms` and bespoke strings in `custom_fields.custom_payment_terms`. Quotations store both in `custom_fields` (`custom_fields.payment_terms` and `custom_fields.custom_payment_terms`).
- **Conversational Parity:** `custom_payment_terms` is fully validated (string, max 500 characters, null to clear), proposal-fingerprinted at Gate 1, and stale-checked at Gate 2.

### 2.5 Operation Idempotency & Replay Safety

- **In-Memory Guard:** `executedOperationIds` (`Set<string>`) blocks immediate duplicate executions within the same runtime instance.
- **Durable Persistence:** Every modification write records `custom_fields.last_operation_id = proposal.opId` and appends to `custom_fields.applied_operation_ids`. Replayed proposals on restarted processes or distributed instances read the persisted record and reject duplicate execution before applying writes.

### 2.6 Operational Intelligence & Business Guidance

- **Module Separation:** Implemented in `src/lib/ai-assistant/bolu-intelligence.ts`.
- **Grounded Facts:** Diagnostics evaluate customer presence, line item count, quotation validity proximity (expiring within 7 days, 1 day, or already expired), custom payment terms, and conversion readiness.
- **Observations vs Suggestions:** Observations state verified business facts; suggestions recommend optional actions. Bolu never executes actions or changes document state merely because a recommendation was generated.

---

## 3. Architecture & Implementation Wiring

### 3.1 Operations Contract (`src/lib/ai-assistant/bolu-operations.ts`)

- Added `'valid_until'` and `'custom_payment_terms'` to `BoluModifyFieldKey`.
- Extended `BoluInvoiceModifyPayload` and `BoluDocumentModifyProposal` with optional `attachmentsChange` and `lifecycleChange` blocks.
- In `validateInvoiceModifyInput`:
  - Added validation for `valid_until` (quotation only, valid date or null), `custom_payment_terms` (max 500 chars), `attachmentsChange` (URL scheme checks, label length checks), and `lifecycleChange` (action validation, family authorization).
- In `buildInvoiceModifyProposal`:
  - Added baseline derivation for `valid_until`, `custom_payment_terms`, `attachmentsChange` (order-significant fingerprint via `fingerprintAttachments`), and `lifecycleChange` (from persisted `status` and `archived_at`).

### 3.2 Persistent Document Service (`src/lib/ai-assistant/bolu-document-service.ts`)

- In `persistDocumentModification`:
  - Enforced durable replay safety: checks `persistedCf.last_operation_id === proposal.opId` and `persistedCf.applied_operation_ids.includes(proposal.opId)`.
  - Added support for `restore` operations (bypassing `archived_at IS NULL` query constraint when restoring).
  - Enforced Gate 2 stale checks for `valid_until`, `custom_payment_terms`, `attachmentsChange` (fingerprint mismatch detection), and `lifecycleChange` (concurrency check on status/archived state).
  - Integrated canonical `convertQuotationToInvoice` for quotation-to-invoice conversions.
  - Recorded operation IDs in `custom_fields.last_operation_id` and `custom_fields.applied_operation_ids`.
- Exported `clearExecutedOperationIdsForTest()` to support isolated testing of process-boundary replay protection.

### 3.3 Context & Data Layer (`src/lib/ai-assistant/bolu-data.ts`, `bolu-formatting.ts`)

- Extended `BoluRecord` with `validUntil?: string | null` and `paymentTerms?: string | null`.
- Updated `readBoluContextFacts` and `readBoluQuotation` to query `valid_until`.
- Formatted `Valid until` in `factsAsPrompt` when available on quotation records.

### 3.4 Conversational UI & Artifacts (`src/components/ai-assistant/chat/assistant-chat-parts.tsx`)

- Updated `MODIFY_FIELD_LABELS` with `valid_until: 'Quotation validity'` and `custom_payment_terms: 'Custom payment terms'`.
- Configured quotation `due_date` and `valid_until` modifications to render as "Quotation validity".
- Implemented `ModifyLifecyclePanel`: renders action badges (Convert to Invoice, Archive, Restore), status transitions, reasons, and compliance notices.
- Implemented `ModifyAttachmentsPanel`: renders added, removed, and retained reference links with status badges.
- Updated `proposalPlainText`: deterministically formats lifecycle actions, attachment additions/removals, quotation validity, and custom payment terms for clipboard copy.

### 3.5 System Prompt Guardrails (`api/bolu-chat.ts`)

- Instructed the model on Stage 3D lifecycle operations, quotation validity (`valid_until` vs invoice `due_date`), custom payment terms, reference link attachments, and operational intelligence.
- Codified strict negative guardrails: direct binary file upload is unsupported; invoice payment statuses are ledger-derived; suggestions must never be presented as executed actions.

---

## 4. Verification Evidence

### 4.1 Automated Test Execution

```
bun test src/tests/ai-assistant/bolu-stage-3d-capabilities.test.js
```

**Results (23 passing, 0 failing):**
1. `Lifecycle: Quotation transition validation permits open -> archived and restore` (pass)
2. `Lifecycle: Quotation transition to invoice permits open -> converted` (pass)
3. `Lifecycle: Rejects invalid or legacy quotation statuses (draft, sent, accepted, rejected)` (pass)
4. `Lifecycle: Invoice payment status is protected and cannot be modified via update_status` (pass)
5. `Lifecycle Gate 1 & Gate 2: Quotation archive lifecycle proposal and persistence` (pass)
6. `Lifecycle Gate 2 stale rejection: Rejects archive if document status changed concurrently` (pass)
7. `Quotation Validity: valid_until accepted for quotation, rejected for invoice` (pass)
8. `Quotation Validity: Explicit clearing by passing null is supported` (pass)
9. `Quotation Validity: Persisted baseline and Gate 2 stale check` (pass)
10. `Quotation Validity: Successful persistence updates quotation record` (pass)
11. `Attachments: URL validation enforces secure http/https and blocks dangerous schemes` (pass)
12. `Attachments: Label validation enforces non-empty and length limit` (pass)
13. `Attachments: Add and remove operations compute fingerprint and updated set` (pass)
14. `Attachments Gate 1 & Gate 2: Reference link persistence and stale fingerprint detection` (pass)
15. `Attachments Gate 2: Rejects save when attachments changed concurrently in DB` (pass)
16. `Payment Terms: custom_payment_terms validation enforces string and length limit` (pass)
17. `Payment Terms: Persisted baseline and update to custom_payment_terms on invoice and quotation` (pass)
18. `Idempotency: Immediate retry blocked by in-memory cache` (pass)
19. `Idempotency: Replay blocked across cleared in-memory cache via persistent custom_fields record` (pass)
20. `Operational Intelligence: Grounded observations distinguish observations from suggestions` (pass)
21. `UI Preview & Plain Text: Lifecycle changes render with distinct labels and plain text` (pass)
22. `UI Preview & Plain Text: Attachments changes render in preview and plain text` (pass)
23. `UI Preview & Plain Text: Quotation validity shows "Quotation validity" not "Due date"` (pass)

### 4.2 Regression Test Execution

```
bun test src/tests/ai-assistant/bolu-stage-3a1-integrity.test.js \
         src/tests/ai-assistant/bolu-stage-3a2-modify-parity.test.js \
         src/tests/ai-assistant/bolu-stage-3b-capabilities.test.js \
         src/tests/ai-assistant/bolu-stage-3c-presentation-controls.test.js
```

**Results (111 passing, 0 failing across 4 files):**
- Stage 3A.1 integrity: 11 passing
- Stage 3A.2 modify parity: 44 passing
- Stage 3B custom fields, groups, item photos: 30 passing
- Stage 3C presentation controls: 26 passing
- **Total Suite:** 134 passing tests with 0 regressions.

### 4.3 Static Checks & Verification Gate

1. `bun run audit:load`: Scanned 1,135 files. 0 new audit violations introduced.
2. `bun run typecheck` (`tsc --noEmit`): Exited with code 0 across the entire repository.
3. Host memory constraint preserved: `bun run build` was never executed (4 GB RAM host guardrail respected).

### 4.4 Responsive UI Design Standard Verification

Per the repository's four-class viewport standard:
1. **Mobile / Fold Closed (360–390px):** Single-column card layout, flexible wrapping on attachment URLs, stacked badge indicators, and compact row presentation.
2. **Fold Open (720–840px):** Balanced flex alignment, inline arrow dividers, and truncated URL previews.
3. **Tablets (1024px):** Standard card padding, full label readability, and structured diff tables.
4. **Desktop (1280px+):** Workstation density, side-by-side artifact rendering, and clear visual hierarchy.

*Honest Inspection Note:* Full browser DOM visual inspection was not possible in this headless sandbox session. Static JSX markup, CSS class assignments (`ac-advance`, `ac-advance-rows`, `ac-advance-val`), and server-side rendering tests (`renderToStaticMarkup`) confirmed proper semantic structure and responsive classes across all proposal panels.

---

## 5. Scope Attribution & Git State Preservation

- **Authorized Scope:** Bolu Stage 3D document lifecycle, quotation validity, attachments, payment terms, idempotency, and intelligence.
- **Preserved Concurrent Changes:**
  - Update dialog promotion and styles (`UpdateModal.tsx`, `useAppUpdate.ts`, `update-dialog-card.css`, `productionUpdateDialog.test.js`).
  - Perch workspace notes (`.perch/PERCH.md`).
  - Stage 3C presentation report (`stage-3c-presentation-controls.md`).
  - Context dev notes (`docs/reports/context-dev/`).
- **No Git Mutations:** No commits or pushes were made (per authorization constraints).
- **No Database Mutations:** No migration files or direct database edits were performed.

---

## 6. Conclusion & Roadmap Disposition

Stage 3D completes the planned Bolu conversational capability parity program for invoices and quotations. The assistant now possesses full document lifecycle transitions, quotation validity management, secure reference link handling, reachable custom payment terms, persistent replay protection, and grounded operational intelligence—all safely governed by Gate 1 proposals and Gate 2 human confirmation.
