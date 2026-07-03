# Document Transformation Standard (The 3 Laws System) — v1.0

> This standard defines lifecycle rules for ALL financial documents:
> Invoice, Quotation, Waybill, CSR, BOQ, RFQ.

---

## 1. Core Principle

Documents have two distinct states:
- 🟡 **UNSAVED** (draft state)
- 🟢 **SAVED** (persistent identity state)

Rules differ per state.

---

## 2. Law 1 — Edit Law (State-Aware Edit Rule)

### 2.1 Domain Rule (Identity Immutability)

Saved documents have an immutable identity. Identity consists of:
- `client_id`
- `document_number`
- `type`
- **Lineage:** `sourceDocumentId`, `sourceDocumentType`, `sourceDocumentNumber`

Attempting to modify any of these identity fields after a document is saved **MUST be rejected**.

> Saved documents lock identity — including lineage. Unsaved documents do not.

### 2.2 Unsaved Documents (Draft Mode)

All fields are fully editable.

Allowed:
- client selection
- document number preview (not locked yet)
- items (including all item-level financials: unit price, discount, VAT, etc.)
- structure
- metadata
- totals (auto-calculated)

### 2.3 Required User Feedback (Saved Documents)

If a user attempts to change any identity field (client, document number, type, or lineage) on a saved document, the system MUST:
- Block the action
- Show the message:

> "Client, document number, and lineage cannot be changed after saving."
> "To use a different client or number, please duplicate this document."

### 2.4 User Experience for Immutable Identity Fields

The following requirements apply to the presentation of immutable identity fields on saved documents.

#### 2.4.1 Visual Indicators

Identity fields on saved documents MUST present a visible indication that the field is locked. The indication MUST be present before any user interaction with the field.

Acceptable indicators include, but are not limited to:
- a lock icon adjacent to the field
- a visual style change (e.g., reduced opacity, muted colour)
- a tooltip or popover explaining the lock on hover or focus

The indicator MUST NOT be the sole mechanism for communicating immutability. It MUST be accompanied by the feedback message defined in §2.3 when a user attempts modification.

#### 2.4.2 Interaction Behaviour

When a user interacts with an immutable identity field on a saved document, the system MUST respond with one of the following behaviours:

**Option A — Non-interactive display:** The field renders as read-only text. The user cannot initiate a change through any input mechanism (click, tap, keyboard).

**Option B — Interception with guidance:** The field remains visually interactive, but any modification attempt is intercepted. The system MUST:
1. Prevent the change from being applied to the document state
2. Display the feedback message defined in §2.3
3. Offer the user a path to duplicate the document, where the duplicated copy becomes fully editable

If Option B is used, the interception MUST occur before the document state is modified. The system MUST NOT temporarily mutate and then revert the field value.

#### 2.4.3 Duplicate-from-Editable-State

When the user selects the duplicate path from the feedback message, the system MUST:
1. Duplicate the document using the rules in §3 (Duplicate Law)
2. Open the duplicated document in form view (unsaved state)
3. Allow the user to modify all fields, including the previously locked identity fields

The duplicated document MUST be a new draft with a new identity (§3). The user MUST NOT be returned to the original saved document's edit view.

---

## 3. Law 2 — Duplicate Law (New Entry State Rule)

Duplication ALWAYS creates a new document in **UNSAVED** state.

**Must:**
- Open document in **FORM** view
- Set state → `unsaved (draft)`
- **Generate a new document number** according to the document numbering policy; the duplicated document must never reuse the source document number
- Clear `client_id`
- Clear `id`
- Clear document-level financial state (payment records, workflow approvals, payment status, balance due)
- Reset workflow state
- **Clear lineage:** `sourceDocumentId`, `sourceDocumentType`, `sourceDocumentNumber`

**Must preserve:**
- **Items** — all item-level attributes including:
  `description`, `qty`, `unit_price`, `discount`, `vat`, `rate`, `subtotal`, etc.
- **Pricing setup** — tax mode, discount rules, global settings
- **Structure** — sections, notes, terms
- **Layout configuration** — column visibility, ordering
- **Attachments** (optional, per system rules)

**Must NOT preserve:**
- Client identity
- Document number
- Lineage references (source document links)
- Any payment/approval/workflow records tied to the original document

> Duplicate = a clean draft pre-filled with the original's line items and pricing, but no identity, no client, no payments, no lineage — a new origin.  
> Lifecycle events (duplication, creation, etc.) are recorded in the audit trail, not on the document itself.

### 3.3 Editable State as Source

Duplication MAY originate from the current in-memory editable document state, not only from the last persisted database version.

When duplicating from an editable state (e.g., a document currently open in edit mode with unsaved changes):
- The system MUST use the current form state as the source for items, pricing, structure, and metadata
- The system MUST NOT re-fetch the persisted version from the database as the duplication source
- The identity clearing rules in §3.1仍然 apply: client, document number, lineage, and all payment/approval records MUST be cleared
- The items and pricing preserved in the duplicate reflect what the user currently sees, not what was last saved

This ensures that a user who makes edits and then decides to duplicate a document captures their intended state, not a stale persisted version.

---

## 4. Law 3 — Revert Law (Invoice Correction & Navigation Rule)

Revert is a **document correction operation** whose behavior depends on document lineage.  
It applies only to Invoices and is NOT rollback, NOT undo.

### 4.1 Revert Eligibility

**✅ Revert is ONLY available for:**
- Document type = `Invoice`

**❌ Revert MUST be blocked for:**
- Quotation
- Waybill
- CSR
- BOQ
- RFQ

---

### 4.2 Invoice Divergence Definition

An invoice is considered **modified** (diverged from its source quotation) if any persisted business data differs. This includes changes to:
- Line items (additions, removals, or modifications)
- Quantities
- Pricing (unit price, rate)
- Discounts
- Taxes
- Notes
- Terms
- Additional charges
- Attachments (if tracked)

Pure metadata changes (timestamps, audit records, view counts) do **not** constitute divergence.

---

### 4.3 Revert Behavior — Case A: Invoice WITHOUT source quotation

This is the “I should have created a quotation first” scenario.

1. Delete the invoice permanently
2. Create a **new quotation** from the invoice’s snapshot
3. Redirect user to the newly created quotation

> Revert = conversion from invoice back to quotation when no source exists.  
> Audit trail records: invoice deletion, quotation creation.

---

### 4.4 Revert Behavior — Case B: Invoice WITH source quotation

The invoice was created from an existing quotation.
Revert’s behavior depends on whether the invoice has diverged (per §4.2).

#### 4.4.1 Invoice is identical to its source quotation

- **Do NOT delete anything.**
- **Redirect directly to the source quotation’s view page.**
- No warning needed — the invoice is just a mirror.

#### 4.4.2 Invoice has diverged from its source quotation

1. **Show a confirmation dialog** with the source quotation number:
   > "This invoice was created from quotation **{{sourceQuotationNumber}}** and has been modified. Reverting will permanently delete this invoice and return you to the original quotation. Continue?"

2. If user confirms:
   - Delete the invoice permanently
   - Redirect to the source quotation’s view page
   - The source quotation remains untouched

3. If user cancels: do nothing.

> Revert for a modified sourced invoice is a destructive delete (with warning) — changes made in the invoice are lost.  
> Audit trail records: invoice deletion, return-to-source event.

---

### 4.5 State Transformation Model

| Scenario | Action |
|----------|--------|
| Invoice (no source) → Revert | Create NEW quotation + delete invoice |
| Invoice (with source) identical → Revert | Redirect to source quotation (no deletion) |
| Invoice (with source) modified → Revert | Warn → delete invoice → redirect to source quotation |
| Quotation / Waybill / CSR / BOQ / RFQ → Revert | BLOCK |

---

## 5. Guided Recovery Workflow

This section defines a normative recovery workflow for situations where a user needs to change an immutable identity field on a saved document. It applies across all document types.

### 5.1 Interception

When a user attempts to modify an immutable identity field on a saved document, the system MUST intercept the attempt before any document state mutation occurs.

The interception MUST:
1. Prevent the field value from changing
2. Present the user with a clear explanation of why the change is blocked
3. Offer a single, explicit recovery path: duplicate the document

### 5.2 Identity Preservation

The recovery workflow MUST preserve the original document's identity. The original document MUST remain unchanged after the recovery workflow completes.

The original document's:
- `client_id` MUST NOT be altered
- `document_number` MUST NOT be altered
- `sourceDocumentId`, `sourceDocumentType`, `sourceDocumentNumber` MUST NOT be altered
- Payment records, workflow approvals, and balance state MUST NOT be altered

### 5.3 Editable State

The recovery workflow MUST operate on the current in-memory editable document state, not on a re-fetched persisted version from the database.

This means:
- If the user has unsaved changes in the form, those changes ARE included in the source data for duplication
- The system MUST NOT discard unsaved changes before performing the recovery duplicate
- The duplicated document reflects the user's current intended state

### 5.4 New Identity

The duplicated document produced by the recovery workflow MUST:
- Receive a new `id` (database primary key)
- Receive a new `document_number` per the numbering policy (§3.1)
- Have `client_id` cleared (set to null or empty)
- Have lineage cleared (`sourceDocumentId`, `sourceDocumentType`, `sourceDocumentNumber` removed)
- Have all payment/approval/workflow records cleared
- Be placed in unsaved (draft) state

### 5.5 Runtime Cleanup

After the recovery duplicate is created and opened in form view, the system MUST:
- Clear any transient UI state that was specific to the original document (e.g., validation error states, transient selection states)
- Ensure the new document's form state is fully independent of the original document's form state
- NOT carry over any runtime-only state (e.g., unsaved row edits, temporary group selections) unless explicitly part of the editable state described in §5.3

---

## 6. Required Identity Contract

The document identity describes **what the document is**, not what happened to it.  
Lifecycle events (creation, duplication, conversion, revert) are recorded in the audit trail.

```ts
interface DocumentIdentity {
  id: string
  type: "invoice" | "quotation" | "waybill" | "csr" | "boq" | "rfq"
  documentNumber: string
  clientId: string

  // lineage — where this document came from (immutable after save)
  sourceDocumentId?: string
  sourceDocumentType?: string
  sourceDocumentNumber?: string   // for display in revert warnings

  createdAt: string
  updatedAt: string
}
```

The audit trail is the authoritative source for lifecycle history (e.g., “Invoice reverted”, “Quotation duplicated”, “Client locked after save”).
No transformation type or origin flag is stored on the document.

---

## 7. Transformation Matrix

Operation State Result
Create Unsaved → Saved New identity created
Edit (unsaved) Draft Full freedom
Edit (saved) Saved Identity-locked edits (incl. lineage)
Duplicate Draft New draft with items + pricing, no client/no number/no lineage
Convert Saved New identity + new type, lineage set to source document
Revert (unsourced) Invoice Delete invoice, create quotation
Revert (sourced, identical) Invoice Navigate to source quotation
Revert (sourced, modified) Invoice Warn → delete invoice, keep source quotation

---

## 8. Audit Trail Event Types

The following table defines the canonical audit trail event types for document lifecycle operations. Every lifecycle operation MUST record a corresponding audit trail entry.

| Event Type | Description | Document Type |
|------------|-------------|---------------|
| `CREATE` | Document created from blank or prefill | All |
| `UPDATE` | Document saved with changes | All |
| `DUPLICATE` | Document duplicated from existing | All |
| `CONVERT` | Document converted to different type (e.g., quotation → invoice) | All |
| `REVERT` | Invoice reverted to quotation or source | Invoice |
| `DELETE` | Document permanently deleted | All |
| `PAYMENT_RECORDED` | Payment recorded against document | Invoice, Quotation |
| `PAYMENT_VOIDED` | Payment voided/removed from document | Invoice, Quotation |

### 8.1 Payment-Specific Events

Payment events are a subset of lifecycle events that track financial state changes:

- **`PAYMENT_RECORDED`**: Fired when a payment is recorded against an invoice or quotation. The audit entry SHOULD include the payment amount, method, and date.
- **`PAYMENT_VOIDED`**: Fired when a previously recorded payment is voided or removed. The audit entry SHOULD include the void reason and reference to the original payment event.

Payment events MUST NOT alter the document's identity fields. They affect financial state only (balance due, payment status, payment records).

---

## 9. Distinction Between Convert, Duplicate, and Revert

· Duplicate preserves content but creates a fresh identity — a new draft with no lineage.
· Convert preserves business intent while changing document type (e.g., quotation → invoice) — lineage is maintained.
· Revert is an invoice‑only correction operation whose behavior depends on lineage: if unsourced, it becomes a quotation; if sourced, it navigates or destructively returns to the source.

All three operations generate corresponding audit trail entries.

---

## 10. System Behavior Rules

10.1 Client Change (Saved Only)

· BLOCK always
· Suggest duplication

10.2 Document Number (Saved Only)

· BLOCK always
· System-controlled only

10.3 Duplicate Entry Behavior

· Open form
· Generate new document number per numbering policy (never reuse source)
· Clear client
· Clear document number
· Clear lineage (sourceDocumentId, sourceDocumentType, sourceDocumentNumber)
· Clear payment/approval records
· Preserve all items and pricing settings
· Place in draft mode

10.4 Revert Behavior

· Only for Invoices
· Unsourced invoice → convert to quotation (destructive)
· Sourced, unmodified → direct navigation to source quotation (non-destructive)
· Sourced, modified → warn with source number, then delete and redirect (destructive)

---

## 11. Cross-Document Scope

Applies to: Invoice, Quotation, Waybill, CSR, BOQ, RFQ

Revert is Invoice‑only. All other documents are blocked from revert entirely.

---

## 12. Enforcement Layer

Rules enforced at:

1. Domain layer (authoritative)
2. Service layer (validation)
3. UI layer (messages and confirmations)
4. Audit trail (lifecycle event recording)

---

## 13. Final Principle

Drafts are flexible. Saved documents lock identity — including lineage. Duplicates carry all item‑level financial data but shed client, document identity, and lineage — they are a new origin. Revert is an invoice‑only correction operation: if no source, it becomes a quotation; if sourced and unmodified, it’s a direct navigation back; if sourced and modified, it’s a warned deletion. The audit trail is the single source of truth for all lifecycle events.

---

## 14. Rationale

This section provides non-normative context for the requirements in §2.4, §3.3, and §5. It explains the business reasoning without prescribing implementation.

### 14.1 Why Identity Fields Are Immutable

Financial documents form a chain of accountability. An invoice is not just a request for payment — it is a legal record that references a specific client, carries a specific document number, and may trace back to a specific quotation or waybill. Changing the client on a saved invoice would retroactively alter the financial relationship recorded in the system. Changing the document number would break the audit trail's referential integrity.

Identity immutability is not a technical convenience — it is a business invariant that preserves the integrity of the financial record.

### 14.2 Why Duplication Is the Recovery Path

When a user needs to change an immutable identity field, the correct response is not to allow the change (which would break the invariant) but to provide a clean copy where the change is permitted. Duplication creates a new document with a fresh identity, preserving the work already done (items, pricing, structure) while allowing the user to correct the identity mistake.

This is why the Edit Law's feedback message directs users to duplicate rather than offering an override or admin bypass.

### 14.3 Why Recovery Uses Editable State

A user working on a document may have made changes that are not yet saved. If the recovery workflow discards those changes and duplicates from the last persisted version, the user loses their work and is forced to re-enter it. By operating on the current editable state, the recovery workflow respects the user's intent and preserves their in-progress work.

This is consistent with the Lifecycle Ownership Standard's principle that the Form State owner is responsible for mutable document state (§4.4 of lifecycle-ownership-standard.md).

