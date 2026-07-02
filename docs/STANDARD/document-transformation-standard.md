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

### 2.1 Unsaved Documents (Draft Mode)

**All fields are fully editable.**

Allowed:
- client selection
- document number preview (not locked yet)
- items
- structure
- metadata
- totals (auto-calculated)

> Unsaved documents have NO identity constraints.

### 2.2 Saved Documents (Persisted Mode)

**Immutable fields:**
- `client_id`
- `document_number`
- `type`

If user attempts to change immutable fields:
- **Block** the action
- **Show message:**
  > "Client and document number cannot be changed after saving."
  > "To use a different client or number, please duplicate this document."

> Saved documents lock identity. Unsaved documents do not.

---

## 3. Law 2 — Duplicate Law (New Entry State Rule)

Duplication ALWAYS creates a new document in **UNSAVED** state.

**Must:**
- Open document in **FORM** view
- Set state → `unsaved (draft)`
- Generate NO final document number (preview only if needed)
- Clear `client_id`
- Clear `id`
- Reset workflow state
- Reset financial state

**Must preserve:**
- Items
- Structure
- Layout configuration
- Pricing setup
- Attachments (optional, per system rules)

**Must NOT preserve:**
- Client
- Document number
- Workflow state
- Financial state

> Duplicate = new draft initialized from snapshot, not a copy of identity.

---

## 4. Law 3 — Revert Law (Sourceless Invoice Recovery Rule)

### Core Intent

Revert exists to fix **wrong document type creation at origin time**.
It is NOT rollback, NOT restore, NOT undo.

---

### 4.1 Revert Eligibility

**✅ Revert is ONLY allowed when:**
- Document type = `Invoice`
- AND `sourceDocumentId` IS NULL (no quotation source)

**❌ Revert MUST be blocked when:**

| Case | Behavior |
|------|----------|
| Invoice HAS source quotation | BLOCK — this is a converted invoice |
| Quotation | BLOCK |
| Waybill | BLOCK |
| CSR | BLOCK |
| BOQ | BLOCK |
| RFQ | BLOCK |

**Blocked message:**
> "This invoice cannot be reverted because it was created from a quotation."

---

### 4.2 Valid Revert Behavior

**Case: Invoice WITHOUT source quotation** (the ONLY valid revert scenario)

1. Delete invoice permanently
2. Create **new quotation** from invoice snapshot
3. Redirect user to newly created quotation

> Revert = "This should have been a quotation from the start."

---

### 4.3 State Transformation Model

| Scenario | Action |
|----------|--------|
| Invoice (no source) → Revert | Create NEW quotation + delete invoice |
| Invoice (with source quotation) → Revert | BLOCK |
| Quotation → Revert | BLOCK |
| Waybill / CSR / BOQ / RFQ → Revert | BLOCK |

---

## 5. Required Identity Contract

```ts
interface DocumentIdentity {
  id: string
  type: "invoice" | "quotation" | "waybill" | "csr" | "boq" | "rfq"
  documentNumber: string
  clientId: string
  // lineage
  sourceDocumentId?: string
  sourceDocumentType?: string
  // lifecycle state tracking
  transformationType: "created" | "duplicated" | "converted" | "reverted"
  createdAt: string
  updatedAt: string
}
```

---

6. Transformation Matrix

Operation State Result
Create Unsaved → Saved New identity created
Edit (unsaved) Draft Full freedom
Edit (saved) Saved Identity-locked edits
Duplicate Draft New document, no client, no number
Convert Saved New identity + new type
Revert Invoice only (no source) Delete invoice, create quotation from snapshot

---

7. System Behavior Rules

7.1 Client Change (Saved Only)

· BLOCK always
· Suggest duplication

7.2 Document Number (Saved Only)

· BLOCK always
· System-controlled only

7.3 Duplicate Entry Behavior

· Open form
· Clear client
· Clear document number
· Reset identity
· Place in draft mode

7.4 Revert Behavior

· Only for Invoice
· Requires NO source quotation (sourceless)
· Destructive delete of invoice
· Create new quotation from snapshot

---

8. Cross-Document Scope

Applies to: Invoice, Quotation, Waybill, CSR, BOQ, RFQ

Revert is NOT shared behavior. Only Invoice participates in the revert lifecycle, and only when sourceless.

---

9. Enforcement Layer

Rules enforced at:

1. Domain layer (authoritative)
2. Service layer (validation)
3. UI layer (messages only)

---

10. Final Principle

Drafts are flexible. Saved documents are identity-locked. Revert is invoice-specific type-correction for documents created without a quotation origin.

```

---

 