# BIGDROPS Financial Operations — Platform Architecture Specification

**Type:** Business Architecture Specification
**Status:** Living document
**Version:** 3.0
**Date:** 2026-07-04
**Repository path:** `docs/prd/financial-operations-prd.md`

---

## 1. Purpose & Scope

Financial Operations is the subsystem responsible for managing receivables created by invoices. It bridges document management and future accounting integrations via payments, withholding tax (WHT) receipts, and compliance tracking. It is **not** an accounting package, General Ledger, or ERP.

### 1.1 In Scope

- Invoice-based receivables
- Payment recording, voiding, and settlement derivation
- WHT lifecycle (expected → deducted → recorded → certificate received → verified)
- VAT operational tracking (inputs only)
- Compliance workflows (hub with independent CRUD tabs)
- Operational financial reporting

### 1.2 Out of Scope (and never will be)

Financial Operations does **not** own:
- Pricing rules or invoice calculations (owned by Calculation Engine — see §4)
- Inventory valuation, payroll, procurement, supplier accounting, depreciation
- Budgeting, forecasting, or chart of accounts
- These are future modules that will consume clean financial events

---

## 2. Architecture Philosophy

Six invariants govern every design decision:

| # | Invariant | Rationale |
|---|-----------|-----------|
| 1 | Money never disappears | Payments are soft-deleted (`voided_at`), never hard-deleted |
| 2 | Financial state is derived, never stored | `balance_due`, `computed_status` are SQL/TS projections of payment sums |
| 3 | Calculation Engine is sole source of financial truth | No downstream module recalculates prices, taxes, or totals |
| 4 | Compliance consumes; never produces financial state | WHT receipts and VAT inputs are evidence, not obligations |
| 5 | Reports are read-only projections | No independent calculation engine; no write-back to financial tables |
| 6 | Operational state and financial state are independent | Document status (draft/issued/cancelled) lives on document table; financial status is derived from payments |

---

## 3. Financial Source of Truth Hierarchy

The financial platform has a single ownership chain.

```
Calculation Engine
  ↓
Financial Obligation (Invoice)
  ↓
Settlement (Payments)
  ↓
Financial State (Derived)
  ↓
Consumers (Compliance, Reports, Dashboards, Exports, Future Accounting)
```

Upstream domains never consume downstream state.
Downstream domains never overwrite upstream truth.
Financial truth flows in one direction.

---

## 4. Calculation Engine — Single Source of Truth

### 4.1 Ownership

The Calculation Engine is the sole authority for all financial computations. No downstream module may independently compute prices, taxes, or totals.

| Function | File | Responsibility |
|----------|------|----------------|
| `computeDocument()` | `src/lib/Calculations.ts` | Canonical pipeline: VAT, WHT, discount, subtotal, grand total |
| `calcTotals()`, `resolveRowVat()` | `src/domain/invoice/calculations.ts` | Invoice-specific normalization wrapper |
| `calcTotals()` | `src/domain/quotation/calculations.ts` | Quotation totals — reuses invoice domain pattern |

### 4.2 Rules

- All per-row financial computation routes through `Calculations.ts`.
- The invoice domain wrapper (`calculations.ts`) normalizes legacy state shapes before calling the canonical engine.
- No other module (payment, compliance, report) computes prices, taxes, or totals.
- **Quotations reuse the invoice calculation layer.** No duplication.
- **Waybills strip all monetary values** — `RawWaybillItem` type explicitly forbids `unit_price`, `rate`, `vat`, `discount`, `subtotal`, `grand_total`.
- **BOQ/RFQ `cp` and `sp` fields** are untyped display strings. No financial computation exists in BOQ/RFQ domain.

---

## 5. Data Flow Authority Map

```
┌──────────────────────────────────────────────────────────────┐
│                    Calculation Engine                         │
│  src/lib/Calculations.ts (canonical)                         │
│  src/domain/invoice/calculations.ts (normalization wrapper)  │
│  Computes: prices, VAT, WHT, totals, discounts               │
│  Outputs → invoices.{subtotal, vat, wht, discount, total}    │
└──────────────────────┬───────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                    Payment Module                             │
│  paymentService.ts → paymentRepository.ts → payments table   │
│  Records: cash_amount, wht_amount                             │
│  Consumes: invoice totals for status sync                    │
│  Does NOT compute: taxes, totals, rates                      │
└──────────────────────┬───────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                    Financial State (Derived)                  │
│  financialState.ts (TS) + invoice_financials_v (SQL)         │
│  Derives: balance_due, settled, computed_status, overpayment  │
└──────┬────────────────────────────────────┬──────────────────┘
       ↓                                    ↓
┌──────────────┐              ┌────────────────────────────┐
│  Compliance  │              │  Reports                   │
│  (consumes)  │              │  (read-only projections)   │
│  WHT, VAT    │              │  Direct DB queries today   │
│  receipts    │              │  No calc engine            │
└──────────────┘              └────────────────────────────┘
```

---

## 6. Financial Obligation Model

### 6.1 Current Scope

Invoices create financial obligations. Payments settle them.

```
Invoice (obligation origin)
  ↓
Payments (cash_amount + wht_amount)
  ↓
Financial State (balance_due, computed_status — derived)
```

### 6.2 Planned Obligation Types (not implemented)

In priority order:
1. **Advance invoices** — partial payment before delivery, metadata exists but no full lifecycle
2. **Credit notes / Debit notes** — correction instruments
3. **Retentions** — held amount released on milestone

---

## 7. Settlement Architecture

### 7.1 What Settlement Tracks

Settlement is the act of recording money received against an invoice. It tracks two dimensions:

| Dimension | Source | Persistence |
|-----------|--------|-------------|
| Cash amount | User-entered at payment time | `payments.cash_amount` |
| WHT amount | User-entered at payment time | `payments.wht_amount` |

**VAT is NOT a settlement dimension.** VAT is embedded in `invoices.grand_total` and computed by the Calculation Engine. Settlement compares total payments against grand total to derive balance.

### 7.2 Payment Schema Authority

Design decisions encoded in the `payments` table (`supabase/migrations/20260520090001_invoices.sql`):

- `invoice_id` (FK → invoices) — every settlement references an obligation
- `cash_amount` (numeric, not null) — actual cash received
- `wht_amount` (numeric, not null) — withholding tax deducted at source
- `wht_rate` (numeric, nullable) — **schema exists but is never populated** (`paymentRepository.ts:27-28` hardcodes `null`)
- `wht_type` (text, nullable) — **same: schema exists, never populated**
- `voided_at` (timestamptz, nullable) — soft-delete mechanism

### 7.3 Payment Lifecycle — Implemented

The current payment flow is a simple record-and-void model:

```
UI (InvoiceRecordPaymentSheet)
  → validatePaymentEntry (paymentEntryHelpers.ts)
  → recordInvoicePayment (paymentService.ts)
  → insert into payments table (paymentRepository.ts)
  → Active (non-voided)
  → voidPayment (paymentService.ts) → sets voided_at
```

### 7.4 Payment Lifecycle — Not Implemented

Draft, Correction, Reversal, Refund, Credit Application states do not exist.

### 7.5 Fast-Pay Divergence

Two code paths exist for recording payments:

| Path | File | Capability |
|------|------|------------|
| Full-service | `paymentService.ts` | Cash + WHT settlement with audit events, status sync |
| Fast-pay | `paymentEntryHelpers.ts` | Cash-only, hardcodes `whtDeducted: 0`, used by UI |

The fast-pay path diverges from full-service — it cannot record WHT even if the form were extended.

---

## 8. WHT Architecture — Five-Stage Evidence Pipeline

Withholding Tax follows a five-stage evidence pipeline. Each stage maps to specific tables and columns in the database.

### Stage 1: Expected (Invoice)

The Calculation Engine computes the WHT amount expected on an invoice. This is the obligation layer — what WHT *should* be deducted.

- `invoices.wht` — computed total from Calculation Engine
- `invoices.wht_rate`, `invoices.wht_type` — stored on the invoice record

**Status:** ✅ Fully implemented

### Stage 2: Deducted (Payment)

When a payment is recorded, the WHT actually deducted at source is captured. Due to partial payments, deducted WHT may differ from expected WHT.

- `payments.wht_amount` — actual WHT deducted at payment time
- `payments.wht_rate`, `payments.wht_type` — **columns exist in schema but are hardcoded `null`** (`paymentRepository.ts:27-28`)

**Status:** ⚠️ Partially implemented — `wht_amount` is captured, but `wht_rate` and `wht_type` are never populated

### Stage 3: Recorded (Audit Event)

Each payment insertion is an audit event that records the WHT deduction in the payment table.

- `payments` row (insert event) — the audit trail of WHT being deducted
- Audit events: `payment_recorded`, `payment_voided` via `audit.ts`

**Status:** ✅ Fully implemented — payments create audit events, though WHT snapshot is incomplete (see Stage 2)

### Stage 4: Certificate Received

A physical WHT receipt certificate is manually created and linked to a payment via the `wht_receipts` table.

- `wht_receipts` table — manually created via Compliance WhtReceiptsPanel
- Status lifecycle: `pending → requested → received → verified`
- No automation between states — all transitions are manual

**Status:** ⚠️ Partially implemented — schema and manual CRUD exist; no auto-generation from payment events

### Stage 5: Verified

The WHT receipt certificate is verified against the tax authority records. This is the final confirmation that WHT was properly remitted.

- `wht_receipts.receipt_status = 'verified'` — manual status update
- Cross-referenced by `summarizeComplianceWht()` in `whtSummary.ts`, which joins invoices → payments → receipts

**Status:** ⚠️ Partially implemented — status field exists and is used in compliance summary, but verification is purely manual

### WHT Pipeline Summary

```
Expected → Deducted → Recorded → Certificate Received → Verified
  ✅          ⚠️         ✅              ⚠️                  ⚠️
```

The primary gap is at Stage 2: WHT rate/type are never captured at payment time, which means the compliance summary falls back to invoice-level WHT amounts when payment-level data is absent (`whtSummary.ts:59-61`).

---

## 9. VAT Lifecycle

VAT follows a lifecycle model from calculation through evidence. Each stage represents a different concern in the VAT pipeline.

### Stage 1: Calculated

The Calculation Engine computes VAT on sales documents. VAT is embedded in `grand_total` and not tracked as a separate field on the invoice.

**Status:** ✅ Implemented — `Calculations.ts` computes per-row VAT

### Stage 2: Collected

VAT collected on sales is part of the payment received. It is embedded in `grand_total` and not tracked separately as a settlement dimension.

**Status:** ⚠️ Embedded in `grand_total`, not tracked separately — settlement only compares total payments against grand total

### Stage 3: Input

VAT paid on purchases (input VAT) is tracked manually via `tax_input_entries` table. These are evidence records, not financial obligations.

**Status:** ✅ Implemented — `tax_input_entries` table with manual CRUD via `VatInputsPanel.tsx`

### Stage 4: Liability

Net VAT liability (outputs minus inputs) is not computed. There is no reconciliation between collected VAT and input claims.

**Status:** ❌ Not implemented

### Stage 5: Filing

VAT returns and FIRS reporting are not implemented.

**Status:** ❌ Not implemented

### Stage 6: Evidence

Supporting documentation for VAT filings (receipts, invoices, schedules) is not implemented.

**Status:** ❌ Not implemented

### VAT Lifecycle Summary

```
Calculated → Collected → Input → Liability → Filing → Evidence
    ✅          ⚠️        ✅        ❌          ❌        ❌
```

### Design Rule

VAT on sales documents is **computed by the Calculation Engine** and embedded in `grand_total`. Compliance tracks VAT inputs separately as evidence records. There is no automated reconciliation between computed VAT and input claims.

---

## 10. Financial Consumers

Everything below Financial State is a consumer. Consumers read derived financial data; they never compute it independently.

- **Compliance** — reads WHT/VAT state for evidence tracking
- **Reports** — reads projections for display
- **Dashboard** — reads summary metrics
- **Analytics** — future consumer
- **PDF Exports** — dumb renderers
- **Future Accounting** — external module consuming clean events

Consumers must not:

- Query raw payment or invoice tables for financial values
- Recalculate balances, taxes, or totals
- Write financial state back to authoritative tables

---

## 11. Compliance Architecture

### 11.1 Ownership Boundary

Compliance **consumes** financial data via SQL joins. It does **not** produce, modify, or own financial state.

| Tab | Table | CRUD Pattern | Audit |
|-----|-------|-------------|-------|
| WHT Receipts | `wht_receipts` | Direct Supabase calls from component | None |
| VAT Inputs | `tax_input_entries` | Direct Supabase calls from component | None |
| Tax Filings | `tax_filings` | Direct Supabase calls from component | None |
| Tax Reminders | `tax_reminders` | Direct Supabase calls from component | None |
| Settings | — | Direct Supabase calls from component | None |

### 11.2 Architecture Violation

Compliance components (`WhtReceiptsPanel.tsx:193`, `VatInputsPanel.tsx:61`, etc.) call `supabase.from(...).insert/update/delete` directly, bypassing any service or repository layer. This means:

- No validation layer before writes
- No audit events for compliance mutations
- No event-driven hooks from invoice/payment lifecycle
- WHT receipts are never auto-generated from payment events

### 11.3 Future Direction

Compliance should subscribe to financial events (payment recorded, invoice issued) and automatically create or suggest compliance records (WHT receipt creation, VAT filing reminders).

---

## 12. Financial State

Financial State is the domain that derives all financial position values from payment data. It owns settled amount, outstanding balance, payment percentage, overpayment detection, and payment state.

### 12.1 Derivation Model

Financial state values are computed by two independent implementations:

| Aspect | TypeScript (`financialState.ts`) | SQL (`invoice_financials_v`) |
|--------|----------------------------------|----------------------------|
| balance clamp | `Math.max(0, total - settled)` | `MAX(0, ...)` |
| overpayment | Computed but unused | Not computed |
| `computed_status` | Derived from balance | `CASE WHEN balance_due <= 0 THEN 'paid'...` |
| tolerance | Configurable (default 1) | None |

The SQL projection and TypeScript projection are intended to represent identical business rules. Maintaining behavioral equivalence between both implementations is mandatory until a single authoritative derivation strategy is adopted.

### 12.2 Not Implemented

- Overpaid status — overpayment is detected in `financialState.ts:53` but no status exists
- Written Off, Closed — no dedicated status
- Receivable aging — no projection exists

---

## 13. Financial Status

Financial Status is the set of output labels derived from Financial State. It is never stored; it is a presentation-layer projection.

| Status | Condition |
|--------|-----------|
| `unpaid` | settled = 0 |
| `partially_paid` | settled > 0 AND balance > 0 |
| `paid` | balance_due <= 0 |
| `overpaid` | settled > total (detected in TS, not surfaced as status) |
| `written_off` | Not implemented |
| `closed` | Not implemented |

OVERDUE is a **presentation-only overlay** applied in the UI based on `due_date`. It is not a financial status — it is a temporal condition on an existing status.

### Document Status Independence

Operational document status (draft, issued, approved, cancelled, archived) lives on `invoices.status` and is managed by document lifecycle services (`invoiceStatusService.ts`, etc.). Financial status is a separate concern derived from the payment view.

---

## 14. Cross-Document Financial Rules

| Document Type | Monetary Values | Calculation Engine | Notes |
|---------------|-----------------|-------------------|-------|
| Invoice | Full (prices, VAT, WHT, totals) | Yes (`Calculations.ts`) | Primary obligation type |
| Quotation | Full (same as invoice) | Yes — reuses invoice domain | Invoice conversion preserves financial state |
| Waybill | **None** | Never | `RawWaybillItem` type forbids monetary fields |
| BOQ / RFQ | `cp`/`sp` as untyped strings | No financial computation | Display fields only — no math done |

### 14.1 PDF Rendering Rule

PDFs are dumb renderers. They receive shaped data via preview functions and never compute prices, taxes, or totals.

### 14.2 Invoice-to-Waybill Transformation

When transforming invoice items to waybills, all monetary values (`unit_price`, `rate`, `vat`, `discount`, `subtotal`, `grand_total`) must be stripped. The waybill is a logistics document, not a financial instrument.

---

## 15. Reporting Architecture

### 15.1 Architectural Rule

Reports are **read-only projections**. They have no independent calculation engine and must not write back to financial tables. Every report surface reads derived financial data — it never computes it.

### 15.2 Current State

Reports query Supabase directly via `supabase.from(...).select('*')` in components like `ReceivablesSection.tsx` and `ProjectsSection.tsx`.

- No projection layer
- No caching or materialization
- Each report component duplicates query logic
- `computeReportTaxMetrics()` in `reportUtils.ts` splits VAT/WHT for tax display

### 15.3 Future Direction

A projection layer should sit between reports and the database, providing:
- Pre-computed aggregates (aging, collection rates, tax summaries)
- Consistent metric definitions across all report surfaces
- Cached/materialized views for performance
- Scheduled exports

---

## 16. Audit Architecture

### 16.1 Current: Direct-Call Pattern

Service functions call `audit.ts` helpers directly, which call Supabase RPCs that insert into `activity_events` + `audit_logs`.

**Tracked events:**
- `payment_recorded`, `payment_voided`
- `invoice_status_changed`, `invoice_created`, `quotation_created`

**Missing:**
- DELETE and ARCHIVE actions on invoices, quotations
- `correlation_id`, `parent_event_id`, `aggregate_id/type`, `event_version`
- Before/after snapshots on `activity_events`
- Structured document transformation lineage

### 16.2 Two-Table Design

- `activity_events` — business events (what happened)
- `audit_logs` — field-level changes (what changed)

### 16.3 Future Direction

Migration path:
1. Extend direct-call pattern to remaining entities (DELETE/ARCHIVE)
2. Introduce internal publisher abstraction
3. Publisher dispatches to audit platform service
4. Domains emit events without knowing audit implementation

---

## 17. Nigerian Operations Support

### 17.1 Implemented

- Cash, Transfer, POS, Cheque payment methods
- WHT calculation on invoices (expected layer)
- WHT receipt certificate tracking (manual)
- VAT input tracking (manual)
- Multi-bank collections via `bank_accounts` table

### 17.2 Gaps

- `payments.wht_rate`/`wht_type` columns exist but are never populated
- No FIRS reporting integration
- Sequential receipt numbering not implemented
- Mobilization / advance payment metadata exists but no full lifecycle

---

## 18. Credit & Adjustments

### 18.1 Current

Overpayment is detected in `financialState.ts:53` but no credit is created. It is a derived value, never persisted.

### 18.2 Not Implemented

- Credit notes (obligation reduction)
- Debit notes (additional obligation)
- Overpayment → credit application workflow
- Credit transfer, expiry, cancellation
- Payment allocation across multiple invoices

---

## 19. Architecture Evolution Roadmap

### Phase 1 — Integrity Foundation (Current Baseline)

| Item | Status | Evidence |
|------|--------|----------|
| Consolidated calculation engine | ✅ | `Calculations.ts` is canonical |
| Dual engines with divergence risk | ⚠️ | `calculations.ts` wraps `Calculations.ts` |
| WHT snapshot on payments | ❌ | Schema exists; hardcoded null in repository |
| Full audit coverage (DELETE/ARCHIVE) | ❌ | Not recorded |
| Reports via projection layer | ❌ | Direct DB queries |
| Compliance via service layer | ❌ | Direct Supabase calls from components |

### Phase 2 — Financial Lifecycle

Priority order:
1. Capture WHT rate/type at payment time (populate existing schema columns)
2. Unify fast-pay and full-service payment paths
3. Single authoritative financial state derivation (eliminate dual divergence)
4. Overpayment → credit note workflow
5. Payment allocation across multiple invoices

### Phase 3 — Compliance Automation

Priority order:
1. Auto-generate WHT receipt draft on payment recording
2. VAT reconciliation (outputs vs inputs)
3. Filing workflow with FIRS reporting template
4. Event-driven compliance hooks

### Phase 4 — Reporting & Projections

Priority order:
1. Projection layer (materialized reporting views)
2. Receivable aging analysis
3. Executive dashboard (collection rates, WHT outstanding)
4. Scheduled exports

---

## 20. Business Ownership Matrix

Each business concept in the financial platform has exactly one owner. This table establishes canonical ownership to prevent domain overlap.

| Business Concept | Owner |
|------------------|-------|
| Prices | Calculation Engine |
| VAT | Calculation Engine |
| WHT | Calculation Engine |
| Invoice Total | Calculation Engine |
| Financial Obligation | Invoice Domain |
| Settlement | Payment Domain |
| Financial State | Financial State Domain |
| Compliance Evidence | Compliance Domain |
| Operational Reports | Reporting Domain |
| Audit History | Audit Domain |

---

## 21. Ownership Matrix (by Module)

| Area | Owner Module | Entry Point | Status |
|------|-------------|-------------|--------|
| Price/tax calculation | `src/lib/Calculations.ts` | `computeDocument()` | ✅ Canonical |
| Invoice-specific calc | `src/domain/invoice/calculations.ts` | `calcTotals()`, `resolveRowVat()` | ⚠️ Duplicates above |
| Payment recording | `src/modules/invoices/services/paymentService.ts` | `recordInvoicePayment()` | ✅ |
| Payment DB | `src/modules/invoices/repositories/paymentRepository.ts` | `insertPayment()` | ⚠️ WHT snapshot null |
| Financial state (TS) | `src/domain/invoice/financialState.ts` | `calculateInvoiceFinancialState()` | ✅ |
| Financial state (SQL) | `invoice_financials_v` view | Queried by payment repo | ⚠️ Dual derivation |
| Action gating | `src/modules/invoices/domain/invoiceActionAvailability.ts` | `getInvoiceActionAvailability()` | ✅ |
| Payment UI | `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` | — | ⚠️ Fast-pay only |
| WHT receipts | Compliance UI (direct Supabase) | `WhtReceiptsPanel.tsx` | ⚠️ No service layer |
| VAT inputs | Compliance UI (direct Supabase) | `VatInputsPanel.tsx` | ⚠️ No service layer |
| Tax filings | Compliance UI (direct Supabase) | `TaxFilingsPanel.tsx` | ⚠️ No service layer |
| Reports | Report components (direct Supabase) | — | ❌ No projection layer |
| Audit | `src/lib/audit.ts` (direct-call RPCs) | — | ⚠️ Incomplete |
