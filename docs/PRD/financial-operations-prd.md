# BIGDROPS Financial Operations Platform — Product Requirements Document

**Status:** Revised to match current implementation
**Date:** 2026-07-03
**Repository path:** `docs/PRD/financial-operations-prd.md`

---

## Status Legend

| Marker | Meaning |
|--------|---------|
| ✅ IMPLEMENTED | Feature exists and is used in production |
| ⚠️ PARTIAL | Feature exists but has known gaps |
| 🔧 TARGET | Not yet implemented — aspirational design |
| ❌ MISSING | Explicitly excluded from scope or removed |

---

## 1. Vision

Financial Operations is the subsystem responsible for managing receivables created by invoices. It is **not** an accounting package or General Ledger — it bridges document management and future accounting integrations via payments, WHT receipts, and compliance tracking.

Its current scope:
- receivables (invoice-based)
- payment recording and voiding
- withholding tax lifecycle (invoice → receipt)
- VAT operational tracking
- compliance workflow (hub with tabs)

✅ **Invoices, Payments, WHT receipts, VAT inputs, compliance hub** exist.
🔧 **Expense tracking, profit/loss, attendance** are future modules.

---

## 2. Product Goals

✅ BIGDROPS Financial Operations must provide:
- payment recording and voiding
- immutable financial history (soft-delete via voided_at)
- Nigerian WHT receipt workflow
- VAT input tracking
- operational financial reporting (direct DB queries)
- audit‑grade traceability (direct-call pattern)

🔧 Future goals:
- complete payment lifecycle (corrections, reversals, refunds)
- platform audit service (event subscription)
- projection-based reporting
- automated compliance workflows

---

## 3. Design Principles

| # | Principle | Status |
|---|-----------|--------|
| 1 | Money never disappears — payments use soft-delete (`voided_at`) | ✅ |
| 2 | Financial state is derived from payments, never manually set | ✅ |
| 3 | Reports consume projections | ❌ Reports query DB directly |
| 4 | Compliance consumes financial events | ⚠️ Compliance reads separate tables |
| 5 | Every financial action creates an audit event | ⚠️ Partial coverage (DELETE/ARCHIVE missing) |
| 6 | Business documents create obligations; Financial Operations settles them | ✅ |

---

## 4. Financial Obligation Model

✅ **Implemented:** Invoices create financial obligations. Payments settle them.

```
Invoice
  ↓
Payments (cash_amount + wht_amount)
  ↓
invoice_financials_v (balance_due, computed_status)
```

🔧 **Target:** Advance invoices, retentions, debit notes, credit notes as additional obligation types.

---

## 5. Platform Architecture

✅ **Current architecture:**

```
Invoices  (document module)
  ↓
Financial Operations
  ├── Payments (recording, voiding)
  ├── Financial State (derived from payments)
  ├── Compliance Hub
  │   ├── WHT Receipts (CRUD + status lifecycle)
  │   ├── VAT Inputs (CRUD)
  │   ├── Tax Filings (CRUD)
  │   ├── Tax Reminders (CRUD)
  │   └── Settings
  └── Reports (direct DB queries)
```

🔧 **Target:** Add credit management, payment corrections/reversals, projection layer, platform audit.

---

## 6. Core Domains

### 6.1 Payments

✅ **Owns:** payment recording, voiding, settlement history
⚠️ **Gaps:** WHT amount not captured at payment time (`whtDeducted: 0` hardcoded); no WHT rate/type snapshot on payment record
🔧 **Target (not implemented):** payment corrections, reversals, refunds, sequential receipts, allocation, credits

### 6.2 Financial State

✅ **Owns:** outstanding balance, settled amount, payment state, overpayment detection
✅ **Consumes:** invoice totals + non-voided payment sums
✅ **Produced by:** `financialState.ts` (TypeScript) + `invoice_financials_v` (SQL view)
⚠️ **Divergence:** TypeScript clamps balance to 0; SQL view allows negative; tolerance mismatch

### 6.3 Compliance

✅ **Owns:** WHT receipt lifecycle, VAT input tracking, tax filings, tax reminders
⚠️ **Gaps:** WHT receipts are manually created (not auto-generated from payments); settings configure WHT/VAT rates but don't drive workflows

### 6.4 Reports

⚠️ **Owns:** dashboard display (overview, receivables, collections, projects, tax)
❌ **Violates Principle 3:** Reports query Supabase directly instead of consuming a projection layer

### 6.5 Audit

⚠️ **Owns:** immutable event storage (`activity_events` + `audit_logs`), actor attribution, timestamps
❌ **Gaps:** direct-call pattern (not platform service); no correlation chains; no before/after snapshots on activity_events; DELETE/ARCHIVE not recorded

---

## 7. Settlement Model

✅ **Implemented:**

```
Settlement
├── Payment (recorded in payments table)
└── Void (soft-delete via voided_at)
```

🔧 **Not implemented:** Credit Application, Refund, Adjustment, Reversal, Write‑off

---

## 8. Financial Event Model

✅ **Implemented domain events (via direct-call audit):**
- `payment_recorded` (record_payment_recorded RPC)
- `payment_voided` (record_payment_voided RPC)
- `invoice_status_changed`
- `invoice_created`, `quotation_created`

🔧 **Target (not implemented):** PaymentCorrected, PaymentReversed, PaymentRefunded, ReceiptGenerated, CreditCreated, CreditApplied, CreditExpired, WHTReceiptRequested, WHTReceiptReceived, WHTReceiptVerified, VATFiled, WHTFiled, ReminderGenerated, BalanceUpdated, OverpaymentDetected, CreditAvailable

---

## 9. Payment Lifecycle

✅ **Implemented:**

```
UI entry (InvoiceRecordPaymentSheet)
  → Validate (paymentEntryHelpers.validatePaymentEntry)
  → Record (paymentService.recordInvoicePayment)
  → Active (payments row, non-voided)
  → Void (paymentService.voidPayment → sets voided_at)
```

❌ **Not implemented:** Draft, Correction, Reversal, Refund states

---

## 10. Financial Status Model

✅ **Derived statuses** (from invoice_financials_v):
- `paid` (balance_due <= 0)
- `partially_paid` (settled > 0 but balance > 0)
- `unpaid` (no payments)
- ✅ OVERDUE is presentation-only overlay

🔧 **Not implemented:** Overpaid, Written Off, Closed — these have no dedicated status

---

## 11. Operational Document Status

✅ **Independent from financial status:**
- Draft, Issued, Approved, Cancelled, Archived
- These statuses are on the `invoices` table directly, managed by invoice lifecycle services

---

## 12. Credit Lifecycle

❌ **Not implemented.** Overpayment is detected in `financialState.ts:53` but no credit is created. No credit application, transfer, expiry, or cancellation workflow exists.

---

## 13. WHT Lifecycle

✅ **Implemented:**

```
Invoice defines wht_rate, wht_type
  → InvoiceCalculations.ts computes wht
  → Compliance tracks receipts (manual CRUD)
```

⚠️ **Gaps:**
- Payment recording does NOT capture WHT rate/type/amount snapshot (`whtDeducted: 0` hardcoded)
- Receipts are manually created, not auto-generated from payment events
- WHT receipt status lifecycle: `pending → requested → received → verified` — but no automation between states
- `summarizeComplianceWht` cross-references invoices/payments/receipts but WHT always shows 0 from payments

---

## 14. VAT Lifecycle

⚠️ **Implemented:** VAT input tracking (`tax_input_entries` table, VatInputsPanel)
❌ **Not implemented:** VAT outputs, reconciliation, net VAT computation, filing, evidence

---

## 15. Receipt Lifecycle

❌ **Not implemented.** PRD describes receipt states (Generated → Issued → Reissued → Cancelled) and sequential numbering. None of this exists.

---

## 16. Financial State Projection

⚠️ **Partial — two parallel implementations:**
| Projection | TypeScript (financialState.ts) | SQL (invoice_financials_v) |
|------------|-------------------------------|---------------------------|
| balance_due | `Math.max(0, total - settled)` | `MAX(0, total - SUM(payments))` |
| computed_status | derived from balance | `CASE WHEN balance_due <= 0 THEN 'paid'...` |
| overpayment | computed but unused | not computed |

🔧 **Not implemented:** Receivable aging, collection progress, settlement %, credit available, WHT outstanding, VAT outstanding, expected collections

---

## 17. Financial Audit Architecture

### 17.1 Current Implementaiton

⚠️ **Direct-call pattern** (documented in `docs/STANDARD/audit-trail-standard.md`):
- Service functions call `audit.ts` helpers directly
- Helpers call Supabase RPCs
- RPCs insert into `activity_events` + `audit_logs`

### 17.2 Event Metadata

⚠️ `activity_events` stores: event_type, metadata, actor_id, created_at
❌ **Missing:** correlation_id, parent_event_id, aggregate_id/type, event_version, before/after snapshots, source, reason

### 17.3 Correlation Chains

❌ **Not implemented**

### 17.4 Business Events vs Change History

✅ `activity_events` = business events, `audit_logs` = field-level changes

### 17.5 Replayability

❌ **Not implemented**

### 17.6 Document Transformation Lineage

⚠️ Audit records quotation→invoice conversion events, but no structured lineage

### 17.7 Audit Ownership

⚠️ Audit functions exist in `src/lib/audit.ts` but are library functions, not a platform service

🔧 **Target architecture** (PRD §17.1): Audit as a platform service with event subscription, correlation chains, replayability, and full metadata. Migration phases:
1. Extend direct-call pattern to remaining entities ✅ (partial)
2. Introduce internal publisher abstraction
3. Publisher dispatches to audit platform service
4. Domains emit events without knowing audit implementation

---

## 18. Nigerian Operations

✅ **Supported:**
- Cash, Transfer, POS, Cheque payment methods
- WHT deductions (calculated on invoice, not captured at payment)
- WHT receipt certificates
- VAT tracking
- Multi-bank collections via bank_accounts table

⚠️ **Gaps:**
- Mobilization and retention payments (advance metadata exists, not full support)
- Sequential receipts not implemented
- FIRS reporting not implemented

---

## 19. Non-Goals (Out of Scope)

❌ Financial Operations does **not** own and will **never** own:
- pricing rules or invoice calculations (owned by Calculation Engine)
- inventory valuation
- payroll
- procurement
- supplier accounting
- depreciation
- budgeting or forecasting models
- chart of accounts

These are future modules that will consume clean financial events.

---

## 20. Architectural Invariants

| # | Invariant | Status |
|---|-----------|--------|
| 1 | Every settlement references an obligation | ✅ Payment has invoice_id FK |
| 2 | Every derived balance can be reproduced from immutable records | ✅ payments are soft-delete only |
| 3 | No downstream module recalculates financial values | ⚠️ Reports compute their own |
| 4 | Historical financial events are append‑only | ✅ payments are never hard-deleted |
| 5 | Operational state and financial state are independent | ✅ Different fields/views |
| 6 | Financial projections are disposable and rebuildable | ✅ Views are regenerable |
| 7 | Financial truth originates only from authoritative domains | ✅ Calculation Engine is sole source |
| 8 | Every financial event is recorded by Audit automatically | ⚠️ DELETE/ARCHIVE not recorded |
| 9 | Every financial event publication must be idempotent | ⚠️ Not enforced |

---

## 21. Ownership Matrix

| Capability | Owner | Source | Status |
|------------|-------|--------|--------|
| Settlement Processing | Payment Service | `paymentService.ts` | ✅ |
| Calculations | Calculation Engine | `Calculations.ts` | ✅ |
| Financial State | financialState.ts + invoice_financials_v | dual | ⚠️ |
| Compliance | Compliance Hub components | `ComplianceHub.tsx` + panels | ✅ |
| Reports | Report components | `OverviewSection.tsx` etc. | ⚠️ |
| Audit | audit.ts library | `audit.ts` | ⚠️ |

---

## 22. Implementation Roadmap

### Phase 1 — Integrity Foundation (current baseline)

- ✅ Consolidated calculation engine (two parallel engines exist, documented risk)
- ✅ Financial state via TypeScript + SQL view
- ⚠️ WHT rate/type not snapped on payment (pending fix)
- ⚠️ Audit coverage incomplete (DELETE/ARCHIVE pending)
- ⚠️ Dual ownership of invoice financial status
- ⚠️ Database-level integrity constraints exist

### Phase 2 — Financial Lifecycle (not started)

🔧 Payment corrections, credit management, sequential receipts, payment allocation

### Phase 3 — Compliance Automation (not started)

🔧 Automated WHT receipt creation, VAT reconciliation, filing workflows

### Phase 4 — Reporting & Analytics (not started)

🔧 Projection layer, executive dashboards, aging analysis, scheduled exports

---

## 23. Success Criteria

The Financial Operations platform is complete when:

- ❌ Every monetary action is represented as an immutable financial event
- ⚠️ Financial state is derived from a single authoritative projection layer (dual currently)
- ❌ Reports and Compliance consume projections rather than duplicating calculations
- ⚠️ Operational document status and financial status are separated (different fields but not fully independent)
- ❌ Payment records preserve complete historical tax context (WHT metadata not captured)
- ⚠️ Every financial action is fully auditable (DELETE/ARCHIVE missing)
- ❌ Platform supports full operational financial lifecycle for Nigerian SMEs
- ❌ Audit is a platform-level capability with correlation chains and replayability
