# Document Transformation Standard (The 3 Laws System)

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

Attempting to modify any of these fields after a document is saved **MUST be rejected**.

> Saved documents lock identity. Unsaved documents do not.

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

If a user attempts to change an identity field on a saved document, the system MUST:
- Block the action
- Show the message:

> "Client and document number cannot be changed after saving."
> "To use a different client or number, please duplicate this document."

---

## 3. Law 2 — Duplicate Law (New Entry State Rule)

Duplication ALWAYS creates a new document in **UNSAVED** state.

**Must:**
- Open document in **FORM** view
- Set state → `unsaved (draft)`
- Generate NO final document number (preview only if needed)
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

---

## 4. Law 3 — Revert Law (Invoice Recovery & Navigation Rule)

Revert is a **type‑correction or navigation** tool that applies only to Invoices.
It is NOT rollback, NOT undo.

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
Revert acts as a smart navigation/rollback, depending on whether the invoice has diverged (per §4.2).

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

## 5. Required Identity Contract

The document identity describes **what the document is**, not what happened to it.  
Lifecycle events (creation, duplication, conversion, revert) are recorded in the audit trail.

```ts
interface DocumentIdentity {
  id: string
  type: "invoice" | "quotation" | "waybill" | "csr" | "boq" | "rfq"
  documentNumber: string
  clientId: string

  // lineage — where this document came from
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

6. Transformation Matrix

Operation State Result
Create Unsaved → Saved New identity created
Edit (unsaved) Draft Full freedom
Edit (saved) Saved Identity-locked edits
Duplicate Draft New draft with items + pricing, no client/no number/no lineage
Convert Saved New identity + new type, lineage set to source document
Revert (unsourced) Invoice Delete invoice, create quotation
Revert (sourced, identical) Invoice Navigate to source quotation
Revert (sourced, modified) Invoice Warn → delete invoice, keep source quotation

---

7. Distinction Between Convert, Duplicate, and Revert

· Duplicate preserves content but creates a fresh identity — a new draft with no lineage.
· Convert preserves business intent while changing document type (e.g., quotation → invoice) — lineage is maintained.
· Revert corrects document type (invoice back to quotation) when no conversion was appropriate, or simply navigates back to the source quotation.

All three operations generate corresponding audit trail entries.

---

8. System Behavior Rules

8.1 Client Change (Saved Only)

· BLOCK always
· Suggest duplication

8.2 Document Number (Saved Only)

· BLOCK always
· System-controlled only

8.3 Duplicate Entry Behavior

· Open form
· Clear client
· Clear document number
· Clear lineage (sourceDocumentId, sourceDocumentType, sourceDocumentNumber)
· Clear payment/approval records
· Preserve all items and pricing settings
· Place in draft mode

8.4 Revert Behavior

· Only for Invoices
· Unsourced invoice → convert to quotation (destructive)
· Sourced, unmodified → direct navigation to source quotation (non-destructive)
· Sourced, modified → warn with source number, then delete and redirect (destructive)

---

9. Cross-Document Scope

Applies to: Invoice, Quotation, Waybill, CSR, BOQ, RFQ

Revert is Invoice‑only. All other documents are blocked from revert entirely.

---

10. Enforcement Layer

Rules enforced at:

1. Domain layer (authoritative)
2. Service layer (validation)
3. UI layer (messages and confirmations)
4. Audit trail (lifecycle event recording)

---

11. Final Principle

Drafts are flexible. Saved documents lock identity. Duplicates carry all item‑level financial data but shed client, document identity, and lineage — they are a new origin. Revert is a smart invoice correction tool: if no source, it becomes a quotation; if sourced and unmodified, it’s a direct navigation back; if sourced and modified, it’s a warned deletion. The audit trail is the single source of truth for all lifecycle events.
