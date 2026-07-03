# BIGDROPS Financial Operations Platform — Product Requirements Document (Architecture v2.1)

**Status:** Final  
**Date:** 2026-07-03  
**Authors:** Architect rector, Architect dorime  
**Repository path:** `docs/PRD/financial-operations-prd.md`

---

## 1. Vision

Financial Operations is the subsystem responsible for managing every financial obligation created inside BIGDROPS from document issuance until final financial closure.

It is **not** an accounting package.  
It is **not** a General Ledger.  
It is the operational financial platform that sits between document management and future accounting integrations.

Its responsibilities are:

- receivables
- settlements
- credits
- payment lifecycle
- withholding tax lifecycle
- VAT operational lifecycle
- compliance workflow
- financial reporting
- financial audit
- financial projections

Everything involving money flows through Financial Operations.

---

## 2. Product Goals

BIGDROPS Financial Operations must provide:

- complete payment lifecycle management
- immutable financial history
- Nigerian tax workflow support
- operational financial reporting
- audit‑grade traceability
- consistent financial state across every module

The platform must become the single financial truth for the business.

---

## 3. Design Principles

1. **Money never disappears.** Every financial action is preserved forever. Nothing involving money is deleted.
2. **Financial state is derived.** It is never manually maintained.
3. **Reports consume projections.** Reports never perform business calculations.
4. **Compliance consumes financial events.** Compliance never owns payment logic.
5. **Every financial action creates an audit event.** Without exception.
6. **Business documents create obligations.** Financial Operations settles obligations.

---

## 4. Financial Obligation Model

Every financial event begins with an **obligation** — a legal or commercial expectation to pay or receive money.

```

Document
↓
Financial Obligation
↓
Settlement
↓
Financial State

```

**Obligations include:**
- Invoice
- Advance Invoice
- Retention
- Debit Note (future)
- Credit Note (negative obligation)

Obligations are created by business documents and are the root of all financial flows.  
Settlements resolve obligations. Financial State summarises the outcome.

---

## 5. Platform Architecture

```

Invoices   Quotations   Advance Invoices   Retention   Credits
│
▼
Financial Obligations
│
▼
Financial Operations
│
┌──────────────┼──────────────┐
│              │              │
Payments     Financial State    Credits
│              │              │
└──────────────┼──────────────┘
▼
Financial Events
│
┌──────────────┼──────────────┐
│              │              │
Audit       Compliance       Reports
│
Dashboards

```

---

## 6. Core Domains

### 6.1 Payments
Responsible for recording settlement events.

**Owns:** payment recording, corrections, reversals, credits, allocations, refunds, receipts, settlement history  
**Does not own:** invoice calculations, VAT/WHT calculations, reports, compliance, audit storage

### 6.2 Financial State
Responsible for all derived financial information.

**Owns:** outstanding balance, settled amount, overpayment, credit available, settlement %, receivable amount, aging, financial status  
**Consumes:** financial obligations, settlements, credits and immutable financial events.  
**Produces:** projections

**Financial State is a derived projection, never stored as mutable business data.**  
It is always rebuilt from authoritative sources and can be discarded and regenerated at any time.

Everything else reads Financial State. Nothing recalculates balances.

### 6.3 Compliance
Responsible for statutory workflow.

**Owns:** WHT certificates, VAT inputs, filings, reminders, evidence  
**Consumes:** payment events, invoice events  
**Never computes financial values.**

### 6.4 Reports
Responsible for presentation.

**Consumes projections exclusively.** Never performs financial calculations.  
**Produces:** dashboards, receivables, collections, tax summaries, profitability, exports.

### 6.5 Audit
Responsible for immutable financial history.

**Owns:** immutable event storage, correlation chains, actor attribution, timestamps, before/after snapshots, historical reconstruction, event lookup, compliance evidence  
**Does not own:** business rules, financial calculations, validation, workflow, permissions

Every financial event published by any domain is automatically recorded by Audit.  
Audit is a **platform service** — not a downstream consumer that domains must manually call.

---

## 7. Settlement Model

Settlements are the mechanisms that resolve obligations.

```

Settlement
├── Payment
├── Credit Application
├── Refund
├── Adjustment
├── Reversal
└── Write‑off

```

All settlements are immutable. Corrections append new settlement entries; original records never change.

### Settlement Allocation

Allocations associate settlement records with one or more financial obligations. Allocations are immutable and preserve the history of how settlements were distributed. This enables complex scenarios such as splitting a single payment across multiple invoices or combining multiple payments to settle one obligation.

---

## 8. Financial Event Model

Financial Operations is event‑driven.  
Every Financial Event is a Domain Event. Not every Domain Event is necessarily published outside Financial Operations.

### Domain Events (internal to Financial Operations)
- PaymentRecorded
- PaymentCorrected
- PaymentVoided
- PaymentReversed
- PaymentRefunded
- ReceiptGenerated
- CreditCreated
- CreditApplied
- CreditExpired
- WHTReceiptRequested
- WHTReceiptReceived
- WHTReceiptVerified
- VATFiled
- WHTFiled
- ReminderGenerated
- BalanceUpdated
- StatusChanged
- OverpaymentDetected
- CreditAvailable

### Integration Events (consumed by downstream systems)
- ReportProjectionUpdated
- ComplianceQueueUpdated
- DashboardRefreshRequested

---

## 9. Payment Lifecycle

```

Payment Draft
↓
Validated
↓
Recorded
↓
Active
↓
Correction  or  Void  or  Reversal  or  Refund
↓
Historical

```

Payments are immutable. Corrections create new records; original payments remain unchanged.

---

## 10. Financial Status Model

Financial status is derived from settlements. Possible states:

- Outstanding
- Partial
- Paid
- Overpaid
- Written Off
- Closed

This status belongs to Financial State and is never manually edited.

---

## 11. Operational Document Status

Document lifecycle remains independent:

- Draft
- Issued
- Approved
- Cancelled
- Archived

Operational status must never be confused with financial status.

---

## 12. Credit Lifecycle

Credits are first‑class entities that originate from overpayments, refunds, adjustments, credit notes, or retention releases (future).

States: Created, Applied, Transferred, Expired, Cancelled.  
Credits are immutable.

---

## 13. WHT Lifecycle

- **Invoice** defines WHT type and rate.
- **Payment** captures a snapshot of the WHT rate, type, and amount at that moment.
- **Compliance** manages the receipt lifecycle:

```

Receipt Requested → Receipt Received → Verified → Filed

```

Payment records always retain historical WHT metadata, even if the invoice configuration changes later.

---

## 14. VAT Lifecycle

Invoice creates a VAT obligation. Compliance tracks:

```

VAT inputs → VAT outputs → Reconciliation → Net VAT → Filing → Evidence

```

---

## 15. Receipt Lifecycle

Every payment produces a receipt.

States: Generated → Issued → Reissued → Cancelled.  
Receipts receive sequential numbering and become immutable financial evidence.

---

## 16. Financial State Projection

Financial State exposes projections **only**. Examples:

- Outstanding Balance
- Receivable Aging
- Collection Progress
- Settlement %
- Credit Available
- WHT Outstanding
- VAT Outstanding
- Cash Collected
- Expected Collections

These projections are the sole source consumed by Reports and Dashboards.  
Projections are disposable — they can be rebuilt at any time from immutable events.

---

## 17. Financial Audit Architecture

### 17.1 Audit as a Platform Service

**Target architecture:** When any domain publishes a financial event, the Audit service records it automatically. Domains do not call audit functions directly; they emit events, and Audit subscribes.

**Implementation Note (current baseline):**  
The current implementation uses the verified direct‑call audit pattern documented in `docs/STANDARD/audit-trail-standard.md`. The platform‑service architecture described here is the target architecture. Migration shall occur incrementally without changing observable business behaviour.

**Migration strategy:**  
The platform‑service model will be reached incrementally:

1. **Phase 1:** Extend the verified direct‑call pattern to all remaining financial events (Quotation UPDATE/DELETE/ARCHIVE, Compliance CRUD, CSR, Waybill) per the coverage matrix.
2. **Phase 2:** Introduce an internal publisher abstraction behind the existing function signatures — no behavioural change, no new schema.
3. **Phase 3:** Publisher dispatches to a dedicated Audit Platform service.
4. **Phase 4:** Domains emit events; they no longer know audit implementation details.

The destination has not changed. The migration strategy now reflects the verified implementation baseline rather than an assumption.

### 17.2 Event Metadata
Every financial event carries immutable metadata:

| Field | Description |
|---|---|
| Event ID | Unique identifier for this event |
| Correlation ID | Links all events in the same business transaction |
| Parent Event ID | Predecessor event (if any) |
| Aggregate ID | The root entity (invoice, payment, credit, etc.) |
| Aggregate Type | Type of root entity |
| Event Version | Schema version for evolvable events |
| Event Timestamp | When the event occurred |
| Actor | Who performed the action |
| Source | System or user origin |
| Reason | Business justification (required for voids, reversals) |
| Before Snapshot | State prior to the event |
| After Snapshot | State after the event |

### 17.3 Correlation Chains
A single business transaction (e.g., invoice settlement) may produce many events. All share a single correlation ID, allowing auditors to reconstruct the complete chain:

```

Invoice #1001 → Payment Recorded → Receipt Generated → Status Changed
→ Credit Created → WHT Receipt Requested → Reminder Generated
→ Report Projection Updated

```

### 17.4 Business Events vs Change History
- **Business Events** — what happened (Payment Recorded, Receipt Issued).
- **Change History** — who changed what fields (reference edited, notes updated).
- **Timeline** — ordered reconstruction of all events.

These are stored separately to prevent conflation.

### 17.5 Replayability
The financial history must be replayable from immutable events and snapshots, allowing the system to reconstruct financial state at any point in time.

### 17.6 Document Transformation Lineage
BIGDROPS has existing document transformation chains (RFQ → Quotation → Invoice → Advance → etc.). The audit trail preserves both the document lineage and the financial lineage as connected but distinct histories.

### 17.7 Audit Ownership
Audit owns:
- immutable event storage
- correlation chains
- actor attribution
- timestamps
- reason capture
- before/after snapshots
- historical reconstruction
- event lookup
- compliance evidence

Audit does **not** own: business rules, financial calculations, validation, workflow, permissions.

---

## 18. Nigerian Operations

The platform must support:

- Cash, Transfer, POS, Cheque
- Mobilization and retention payments
- WHT deductions and certificates
- VAT reconciliation
- FIRS reporting
- Sequential receipts
- Multi‑bank collections

---

## 19. Non-Goals (Future Integration Boundary)

Financial Operations will **never** own:

- pricing rules or invoice calculations (owned by Calculation Engine)
- inventory valuation
- payroll
- procurement
- supplier accounting
- depreciation
- budgeting or forecasting models
- chart of accounts

Those remain future modules. Financial Operations exposes clean financial events that they can consume.

---

## 20. Architectural Invariants

No implementation may violate the following:

1. Every settlement references an obligation.
2. Every derived balance can be reproduced from immutable records.
3. No downstream module recalculates financial values.
4. Historical financial events are append‑only.
5. Operational state and financial state are independent.
6. Financial projections are disposable and rebuildable, and shall never become the system of record.
7. Financial truth originates only from authoritative domains.
8. Every financial event is recorded by Audit automatically.
9. Every financial event publication must be idempotent.

---

## 21. Explicit Ownership Matrix

| Capability | Owner | Consumers |
|---|---|---|
| Settlement Processing | Payments | Financial State |
| Calculations | Calculation Engine | Financial State |
| Financial State | Projection Layer | Reports, Compliance |
| Compliance | Compliance | Dashboards |
| Reports | Reports | Users |
| Audit | Audit | Everyone |

---

## 22. Implementation Roadmap

### Phase 1 — Integrity Foundation
- Consolidate to a single financial calculation engine.
- Introduce the Financial State projection layer.
- Preserve WHT rate/type snapshots on payment records.
- Eliminate dual ownership of invoice financial status.
- Add database‑level integrity constraints.
- Complete audit coverage using the verified Audit Trail Standard.

### Phase 2 — Financial Lifecycle
- Implement immutable payment corrections and reversals.
- Introduce credit management and overpayment workflows.
- Generate sequential payment receipts.
- Add payment allocation capabilities.

### Phase 3 — Compliance Automation
- Automate WHT receipt creation from payment events.
- Implement VAT reconciliation.
- Build filing workflows, evidence tracking, and FIRS‑ready exports.

### Phase 4 — Reporting & Analytics
- Move reports to consume Financial State projections exclusively.
- Deliver executive dashboards, forecasting, aging analysis, profitability views, and scheduled exports.

---

## 23. Success Criteria

The Financial Operations platform is complete when:

- Every monetary action is represented as an immutable financial event.
- Financial state is derived from a single authoritative projection layer.
- Reports and Compliance consume projections rather than duplicating calculations.
- Operational document status and financial status are fully separated.
- Payment records preserve complete historical tax context, including WHT metadata.
- Every financial action is fully auditable with actor, timestamp, reason, and before/after state.
- The platform supports the full operational financial lifecycle required by Nigerian SMEs while remaining extensible for future ERP and General Ledger integration.
- Audit is a platform‑level capability, not a bolt‑on; correlation chains and replayability are built in.
```

---
