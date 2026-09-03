# BIGDROPS Financial Operations — Definitive Architecture Audit

This report was written by MiMoCode (AI Coding Agent) on 2026-07-03.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Financial Operations Definition](#2-financial-operations-definition)
3. [Payments Architecture](#3-payments-architecture)
4. [Reports Architecture](#4-reports-architecture)
5. [Compliance Architecture](#5-compliance-architecture)
6. [Audit Architecture](#6-audit-architecture)
7. [Cross-System Ownership](#7-cross-system-ownership)
8. [Current Data Flow](#8-current-data-flow)
9. [Lifecycle Analysis](#9-lifecycle-analysis)
10. [Nigerian Workflow Assessment](#10-nigerian-workflow-assessment)
11. [Ledger Assessment](#11-ledger-assessment)
12. [Dependency Maps](#12-dependency-maps)
13. [Business Capability Matrix](#13-business-capability-matrix)
14. [Ownership Violations](#14-ownership-violations)
15. [Architectural Risks](#15-architectural-risks)
16. [Technical Risks](#16-technical-risks)
17. [Regulatory Risks](#17-regulatory-risks)
18. [Missing Capabilities](#18-missing-capabilities)
19. [Recommended Architectural Direction](#19-recommended-architectural-direction)
20. [Final Conclusions](#20-final-conclusions)

---

## 1. Executive Summary

BIGDROPS currently operates as a **document-centric CRUD application with a partial financial overlay**, not as a financial operations platform. The system successfully manages invoice creation, quotation generation, and basic payment recording, but the financial operations subsystem is fragmented across at least five distinct code locations with no unified ledger philosophy.

**Key findings:**

- **Payments are append-only with a single escape hatch (void).** There is no payment editing, no correction entries, no adjustments, no refunds, and no credit management. The only way to fix a payment error is to void it and create a new one — but even this workflow is incomplete because void does not restore the original payment data for re-recording.

- **WHT is structurally split between three disconnected subsystems.** The document calculation engine computes WHT at invoice creation. The payment repository writes `wht_rate: null, wht_type: null` on every payment insertion. The compliance hub independently tracks WHT receipt status using a separate table with no connection to the payment's actual WHT metadata. This creates a three-way data integrity gap.

- **Invoice status exists in two places and is sometimes out of sync.** The `invoices.status` column stores a snapshot, while `invoice_financials_v` computes the true status from payments. The system writes the snapshot after recording a payment but does not enforce consistency on other state changes.

- **Reports compute financial metrics client-side from raw table queries.** There is no server-side financial projection layer. The `computeReportTaxMetrics` function in `reportUtils.ts` duplicates WHT aggregation logic that also exists in `whtSummary.ts` and `financialState.ts`.

- **The audit trail covers document lifecycle but not financial lifecycle.** Payment recording is audited via `PAYMENT_RECORDED` events, but payment voiding, WHT modifications, compliance changes, and settings changes produce no audit records.

- **The system detects overpayments but has no lifecycle for them.** `calculateInvoiceFinancialState` computes `overpaymentAmount` but no downstream code consumes this value for any business action.

**Severity: HIGH.** The current architecture cannot support the stated business goal of becoming a Nigerian financial operations platform without fundamental restructuring of the payment, compliance, and audit subsystems.

---

## 2. Financial Operations Definition

### 2.1 What Financial Operations Should Mean Inside BIGDROPS

Financial Operations is the integrated subsystem that manages the complete lifecycle of money flowing into the business — from the moment an obligation is created (invoice issued) through every settlement event, tax compliance action, reporting cycle, and audit trail entry, until the obligation is fully resolved.

It is NOT merely "payment recording" or "tax tracking." It is the coherent financial nervous system of the business.

### 2.2 Subsystems and Responsibilities

| Subsystem | Owns | Must NOT Own |
|-----------|------|-------------|
| **Payments** | Payment recording, allocation, settlement lifecycle, overpayment handling, refunds, credits, reversals, void strategy, bank account management, receipt generation, payment history | Tax calculation logic, invoice status derivation, compliance evidence, report generation, audit trail storage |
| **Reports** | Financial projections, receivables aging, collections summaries, project profitability, tax position summaries, executive dashboards, export | Raw financial calculation engines, payment recording, compliance status management, audit event creation |
| **Compliance Hub** | WHT receipt lifecycle, VAT input tracking, tax filing management, obligation reminders, tax profile settings, government submission tracking, evidence repository | Payment allocation logic, invoice totals calculation, report generation, audit trail storage |
| **Audit Trail** | Immutable event recording for every financial action, change tracking with before/after snapshots, actor attribution, temporal reconstruction of financial history | Business logic enforcement, financial calculations, compliance status determination, payment processing |

### 2.3 Operational Accounting Boundary

BIGDROPS' Financial Operations should encompass:

1. **Receivables Management** — tracking what is owed, by whom, for how long
2. **Payment Lifecycle** — every event from first payment to final resolution
3. **Withholding Tax Lifecycle** — from deduction at source to certificate receipt
4. **VAT Lifecycle** — from charging on invoices through filing and recovery
5. **Compliance Lifecycle** — from obligation creation through filing and closure
6. **Reporting Lifecycle** — from raw data through projections to executive summaries
7. **Audit Lifecycle** — from event capture through historical reconstruction

---

## 3. Payments Architecture

### 3.1 Current Implementation

**Files involved:**

| Layer | File | Purpose |
|-------|------|---------|
| Types | `src/modules/invoices/types/paymentTypes.ts` | Payment interfaces and type definitions |
| Service | `src/modules/invoices/services/paymentService.ts` | Payment recording orchestration, void orchestration |
| Repository | `src/modules/invoices/repositories/paymentRepository.ts` | Supabase CRUD for payments, financials view, status sync |
| UI Helpers | `src/components/invoice/paymentEntryHelpers.ts` | Payment entry summary calculation, validation, presets |
| UI Component | `src/components/invoice/InvoicePaymentSection.tsx` | Payment history display with void buttons |
| UI Dialog | `src/components/invoice/VoidPaymentDialog.tsx` | Void confirmation with reason input |
| Status Service | `src/modules/invoices/services/invoiceStatusService.ts` | Invoice status update and sync from financials |
| Database | `supabase/migrations/20260520090003_invoices.sql` | payments and wht_receipts table definitions |

### 3.2 Payment Data Model

```sql
payments (
  id uuid PRIMARY KEY,
  invoice_id uuid FK → invoices,
  amount numeric NOT NULL,        -- total settlement (cash + wht)
  date date NOT NULL,
  method text,                     -- "Transfer"|"Cash"|"POS"|"Cheque"|"Other"
  reference text,
  notes text,
  cash_amount numeric NOT NULL DEFAULT 0,
  wht_amount numeric NOT NULL DEFAULT 0,
  currency_code text DEFAULT 'NGN',
  wht_rate numeric,                -- ALWAYS NULL on insert
  wht_type text,                   -- ALWAYS NULL on insert
  wht_certificate_ref text,
  recorded_by uuid,
  voided_at timestamptz,          -- soft delete marker
  void_reason text,
  source text DEFAULT 'live',
  bank_account_id uuid
)
```

**FACT:** The `wht_rate` and `wht_type` columns exist in the schema but are never populated. In `paymentRepository.ts:27-28`, the insert payload explicitly sets them to `null`:

```typescript
wht_rate: null,
wht_type: null,
```

**SEVERITY: HIGH.** This means the payment record loses all WHT context from the original invoice. If a user needs to know what WHT rate was applied to a specific payment, the system cannot answer from the payment record alone.

### 3.3 Payment Recording Flow

1. User enters `cashReceived` amount in `InvoicePaymentSection`
2. `getPaymentEntrySummary()` computes `settlementTotal` and `remainingBalance`
3. `validatePaymentEntry()` checks for negative amounts and balance exceedance
4. `recordInvoicePayment()` is called with a `PaymentRecordInput`
5. `normalizePaymentInput()` normalizes amounts
6. `insertPayment()` writes to `payments` table with `wht_rate: null, wht_type: null`
7. `fetchInvoiceFinancials()` reads `invoice_financials_v` for computed status
8. `updateInvoiceStatus()` writes snapshot status to `invoices.status`

**OBSERVATION:** The payment recording flow is a simple append-and-sync pattern. There is no:
- Validation against the invoice's total for reasonableness
- Calculation of WHT from the invoice's configured WHT rate
- Allocation logic for multi-invoice payments
- Approval workflow
- Idempotency protection beyond the database transaction

### 3.4 Void Mechanism

The void mechanism works as follows:
1. User clicks "Void" button on a payment row
2. `VoidPaymentDialog` prompts for a reason
3. `voidInvoicePayment()` sets `voided_at` to current timestamp
4. `syncInvoiceStatusFromFinancials()` re-reads `invoice_financials_v` and updates status

**FACT:** The void is a soft delete. The payment record remains in the database with `voided_at` populated. The `invoice_financials_v` view filters voided payments via `FILTER (WHERE p.voided_at IS NULL)`.

**GAPS identified:**
- The `void_reason` column exists but is never written to by the repository layer
- No audit event is recorded when a payment is voided
- The voided payment's original data is not preserved in any audit log
- There is no mechanism to "unvoid" a payment
- There is no confirmation that the user should record a new payment after voiding

### 3.5 What Exists vs What Is Missing

| Business Concept | Status | Evidence |
|-----------------|--------|----------|
| Payment Recording | EXISTS | `paymentService.ts:recordInvoicePayment` |
| Payment History | EXISTS | `InvoicePaymentSection.tsx` — displays with running balance |
| Void (Soft Delete) | EXISTS | `paymentRepository.ts:voidPayment` |
| Payment Editing | MISSING | No UPDATE operation on payment amounts/date/method |
| Payment Reversal | MISSING | No reversal mechanism exists |
| Payment Correction | MISSING | No correction entry mechanism |
| Refund | MISSING | No refund concept anywhere in codebase |
| Credit Transfer | MISSING | No credit concept |
| Adjustment | MISSING | No adjustment entry mechanism |
| Overpayment Handling | PARTIAL | Detected in `financialState.ts:53` but no lifecycle |
| Write-off | MISSING | No write-off concept |
| Advance Allocation | PARTIAL | Advance invoices exist but no advance-payment allocation |
| Deposit/Retention | MISSING | No concept |
| Receipt Generation | MISSING | No receipt PDF or confirmation document |
| Percentage Entry | MISSING | No percentage-based payment entry |
| Payment Presets | PARTIAL | Only `buildFullPaymentPreset` exists |
| Multiple Payment Allocation | MISSING | Payment is always single-invoice |
| Bank Transaction Matching | MISSING | No bank reconciliation |
| Payment Approval | MISSING | No approval workflow |

---

## 4. Reports Architecture

### 4.1 Current Implementation

**Files involved:**

| Layer | File | Purpose |
|-------|------|---------|
| Page | `src/pages/Reports.tsx` | Main reports page with tab navigation |
| Types | `src/components/reports/reportTypes.ts` | Report data types |
| Utils | `src/components/reports/reportUtils.ts` | Formatting, aging, tax metric computation |
| Sections | `src/components/reports/OverviewSection.tsx` | Financial overview dashboard |
| | `src/components/reports/ReceivablesSection.tsx` | Accounts receivable analysis |
| | `src/components/reports/CollectionsSection.tsx` | Payment collections registry |
| | `src/components/reports/ProjectsSection.tsx` | Project profitability |
| | `src/components/reports/TaxSection.tsx` | Tax position summary |
| SQL Views | `supabase/migrations/20260520090010_views.sql` | `invoice_financials_v`, `project_financials_v` |

### 4.2 Report Classification

| Report | Tab | Classification | Data Source |
|--------|-----|----------------|-------------|
| Financial Overview | overview | Executive | Client-side aggregation from 4 queries |
| Account Receivables | receivables | Management | `invoice_financials_v` (SQL view) |
| Collections Registry | collections | Operational | `payments` table (direct query) |
| Project Performance | projects | Management | `project_financials_v` (SQL view) |
| Tax Positions | tax | Compliance | Client-side from `invoices` + `payments` |

### 4.3 Financial Logic Ownership

**FACT: The reports page is a major consumer of duplicated financial logic.**

Evidence of duplication:

1. **Tax metrics** are computed in `reportUtils.ts:computeReportTaxMetrics()` which sums `vat` from invoices and `wht_amount` from payments. This same aggregation logic appears in:
   - `whtSummary.ts:summarizeComplianceWht()` — different approach (cross-references invoices ↔ payments via receipt status)
   - `financialState.ts:calculateInvoiceFinancialState()` — computes settled amounts from payments
   - `paymentService.ts:calculatePreviousSettled()` — sums cash_amount + wht_amount

2. **Balance due** is computed in three separate places:
   - `invoice_financials_v` SQL view (line 29): `coalesce(i.total, 0) - coalesce(sum(...))`
   - `financialState.ts:52`: `Math.max(0, invoiceTotal - settledAmount)`
   - `paymentEntryHelpers.ts:43`: `Math.max(0, normalizedBalance - Math.min(...))`

3. **Status determination** follows at least four code paths:
   - `invoice_financials_v` SQL view — CASE statement
   - `financialState.ts` — TypeScript calculation
   - `resolveInvoiceStatus.ts` — presentation layer wrapper
   - `invoiceStatusService.ts` — reads from view, writes to table

**SEVERITY: MEDIUM.** While these are currently consistent, they diverge in edge cases (tolerance handling differs: `financialState.ts` uses tolerance=1, the SQL view uses exact comparison, `paymentEntryHelpers.ts` uses tolerance=0.01).

### 4.4 Report Data Flow Issues

**FACT: The Reports page queries Supabase directly from the component.**

The `Reports.tsx` page contains 4 separate `useCallback` functions that each build Supabase queries, handle loading states, manage request IDs for cancellation, and store results in local state. This means:

- There is no shared data layer between report tabs
- The Collections tab data is loaded independently even though it's also used by the Tax tab
- Each tab refresh requires re-querying all its data sources
- There is no caching between tab switches
- The filter state (date range, client) is managed in the page component and passed down

**OBSERVATION:** The reports are purely read-only projections. They do not modify financial state. This is architecturally correct — reports should consume projections, not compute from raw data. However, the current implementation computes metrics client-side from raw queries rather than consuming pre-computed projections.

---

## 5. Compliance Architecture

### 5.1 Current Implementation

**Files involved:**

| Layer | File | Purpose |
|-------|------|---------|
| Page | `src/pages/ComplianceHub.tsx` | Compliance hub with 5 sections |
| Domain | `src/domain/compliance/types.ts` | TaxSettings, WhtReceipt, TaxInputEntry, TaxFiling, TaxReminder types |
| Domain | `src/domain/compliance/whtSummary.ts` | WHT exposure summary computation |
| Domain | `src/domain/compliance/import/` | JSON import for compliance data |
| Components | `src/components/compliance/ComplianceOverview.tsx` | KPI strip + action queue + recent activity |
| | `src/components/compliance/WhtReceiptsPanel.tsx` | WHT receipt tracking workflow |
| | `src/components/compliance/VatInputsPanel.tsx` | VAT input entries management |
| | `src/components/compliance/TaxFilingsPanel.tsx` | Tax filing records |
| | `src/components/compliance/TaxRemindersPanel.tsx` | Obligation reminders |
| | `src/components/compliance/ComplianceSettingsPanel.tsx` | Tax profile (TIN, VAT settings) |
| SQL | `supabase/migrations/20260520090009_tax.sql` | tax_settings, tax_input_entries, tax_filings, tax_reminders |
| SQL | `supabase/migrations/20260520090003_invoices.sql` | wht_receipts table |

### 5.2 Compliance Hub as Architecture

**FACT: The Compliance Hub is primarily a CRUD dashboard with action routing, not a business engine.**

It loads 6 tables in parallel on mount (`ComplianceHub.tsx:82-108`):
- `invoices` — for VAT and WHT exposure
- `payments` — for WHT deduction tracking
- `wht_receipts` — for receipt lifecycle
- `tax_input_entries` — for recoverable VAT inputs
- `tax_filings` — for filing records
- `tax_reminders` — for obligation tracking

The Overview section (`ComplianceOverview.tsx`) computes:
- VAT charged (sum of invoice.vat)
- Expected WHT exposure (from `summarizeComplianceWht`)
- Recoverable VAT (sum of tax_input_entries where is_recoverable)
- Actual WHT awaiting receipt (cross-referencing payments ↔ receipts)
- Open/overdue filings count

It then builds a prioritized action queue that routes users to the appropriate sub-section.

### 5.3 WHT Receipt Lifecycle

The WHT receipt lifecycle is the most complete compliance workflow:

1. **Untracked** — Payment has wht_amount > 0 but no wht_receipts record
2. **Initialize** — Creates a wht_receipts record with status 'pending'
3. **Pending** — Receipt record exists, waiting for follow-up
4. **Requested** — Receipt has been requested from the client
5. **Received** — Physical or digital receipt received
6. **Verified** — Receipt confirmed and evidence archived

**FACT:** The `wht_receipts` table has a UNIQUE constraint on `payment_id` (line 145 of invoices migration), meaning each payment can have at most one WHT receipt. This is correct — a single payment's WHT deduction should produce one receipt.

### 5.4 What Compliance Hub Is NOT

**FACT: Compliance Hub does not:**
- Enforce tax calculations (that happens in `Calculations.ts`)
- Generate tax reports (Reports tab does that)
- Create audit records for compliance actions
- Validate tax filing completeness
- Interface with government submission APIs
- Reconcile VAT inputs against VAT charged
- Compute net VAT liability automatically
- Track WHT certificate numbers from payments

---

## 6. Audit Architecture

### 6.1 Current Implementation

**Files involved:**

| Layer | File | Purpose |
|-------|------|---------|
| Library | `src/lib/audit.ts` | Client-side audit recording functions |
| Domain | `src/domain/audit/auditTypes.ts` | AuditEntityType, AuditAction, AuditLogRecord types |
| Domain | `src/domain/audit/auditFormatters.ts` | Audit trail display formatting |
| SQL | `supabase/migrations/20260520090008_audit_activity.sql` | activity_events, audit_logs tables + RPC functions |

### 6.2 Audit Tables

```sql
activity_events (
  id uuid PRIMARY KEY,
  entity_type text NOT NULL,        -- 'invoice'|'quotation'|'project'
  entity_id uuid NOT NULL,
  entity_label text,
  event_type text NOT NULL,          -- 'CREATED'|'UPDATED'|'STATUS_CHANGED'|'PAYMENT_RECORDED'|...
  actor_id uuid,
  actor_label text,
  source text DEFAULT 'web',
  scope_type text DEFAULT 'app',
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  reason text
)

audit_logs (
  id uuid PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_label text,
  action text NOT NULL,
  actor_id uuid,
  actor_label text,
  source text DEFAULT 'web',
  scope_type text DEFAULT 'app',
  created_at timestamptz DEFAULT now(),
  changes jsonb DEFAULT '[]',        -- [{field, old, new}]
  reason text
)
```

### 6.3 Audit Event Coverage

| Financial Event | Audited? | Mechanism | Evidence |
|----------------|----------|-----------|----------|
| Invoice Created | YES | `recordInvoiceCreated()` → RPC `record_invoice_created` | `audit.ts:136-144` |
| Invoice Updated | YES | `recordAuditLog()` with tracked fields | `audit.ts:89-134` |
| Invoice Status Changed | YES | `recordInvoiceStatusChanged()` → RPC | `audit.ts:146-157` |
| Invoice Deleted | YES | Via `recordAuditLog()` with action 'DELETE' | `audit.ts:89-134` |
| Payment Recorded | YES | `recordPaymentRecorded()` → RPC `record_payment_recorded` | `audit.ts:159-169` |
| Payment Voided | **NO** | No audit call in `voidInvoicePayment()` | `paymentService.ts:98-106` |
| Payment Edited | **N/A** | Payment editing does not exist | — |
| Payment Reversed | **N/A** | Payment reversal does not exist | — |
| WHT Modified | **NO** | No audit call for WHT changes on payments | — |
| Compliance Record Changed | **NO** | No audit calls in compliance components | — |
| Tax Filing Updated | **NO** | No audit calls in TaxFilingsPanel | — |
| Tax Settings Changed | **NO** | No audit calls in ComplianceSettingsPanel | — |
| Quotation Created | YES | `recordQuotationCreated()` | `audit.ts:171-179` |
| Quotation Linked | YES | `recordQuotationLinked()` | `audit.ts:194-210` |
| Project Updated | YES | `recordProjectUpdated()` | `audit.ts:212-222` |
| Advance Created/Updated | YES | `recordAdvanceAudit()` in advance service | `invoiceAdvanceService.ts:19-42` |

### 6.4 Audit Coverage Assessment

**FACT: The audit system covers document lifecycle well but has critical gaps in financial lifecycle.**

The `record_activity_event` database function restricts `event_type` to: `'CREATED', 'UPDATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED', 'LINKED', 'UNLINKED', 'NOTE_ADDED', 'DOCUMENT_ADDED', 'ARCHIVED', 'UNARCHIVED'`. This means adding new financial event types (e.g., `PAYMENT_VOIDED`, `PAYMENT_EDITED`, `WHT_MODIFIED`) requires updating the database function's validation.

The `entity_type` restriction is similarly limited to `'invoice', 'quotation', 'project'`. Compliance entities (`tax_filings`, `wht_receipts`, `tax_reminders`) cannot currently be audited through this system.

**SEVERITY: HIGH.** An accountant reviewing payment history two years later would see voided payments marked with a strikethrough but would have no record of who voided them, when, or why (despite the `void_reason` column existing).

---

## 7. Cross-System Ownership

### 7.1 Ownership Map

| Data / Concern | Owner | Currently Also Touched By |
|---------------|-------|--------------------------|
| Invoice totals (subtotal, vat, wht, discount, total) | **Calculations.ts** (source of truth) | `invoice/calculations.ts` (parallel implementation) |
| Invoice status (paid/unpaid/partial) | **invoice_financials_v** (SQL view) | `financialState.ts` (TS mirror), `invoiceStatusService.ts` (writer) |
| Payment amounts | **payments table** (DB) | `paymentService.ts` (writer), `paymentRepository.ts` (CRUD) |
| WHT rate/type on invoices | **custom_fields JSON** | `Calculations.ts` (reader), `advanceMetadata.ts` (reader) |
| WHT amount on payments | **payments.wht_amount** (DB) | `paymentRepository.ts` (always writes null for rate/type) |
| WHT receipt status | **wht_receipts table** (DB) | `WhtReceiptsPanel.tsx` (CRUD) |
| WHT summary for compliance | **whtSummary.ts** (TS) | `reportUtils.ts:computeReportTaxMetrics` (partial duplicate) |
| Tax settings | **tax_settings table** (DB) | `ComplianceSettingsPanel.tsx` (CRUD) |
| Tax filings | **tax_filings table** (DB) | `TaxFilingsPanel.tsx` (CRUD) |
| Tax reminders | **tax_reminders table** (DB) | `TaxRemindersPanel.tsx` (CRUD) |
| Audit records | **audit_logs / activity_events** (DB) | `src/lib/audit.ts` (client writer) |
| Bank accounts | **bank_accounts table** (DB) | `paymentRepository.ts` (read), Reports (read) |
| Client balance | **Computed at runtime** | No persistent storage |
| Project financials | **project_financials_v** (SQL view) | Reports (read) |

### 7.2 Financial Calculation Ownership

**There are two parallel financial calculation implementations:**

1. **`src/lib/Calculations.ts`** — The `calculateDocument()` function. Uses `decimal.js` for precision. Handles line-level VAT, discount, WHT, extra charges, group headers, install rates. This is the canonical calculation engine for document creation/editing.

2. **`src/domain/invoice/calculations.ts`** — The `calcTotals()` function. Uses native JavaScript numbers. Handles similar concerns but with a different approach to discount timing, fixed discount distribution, and WHT base calculation.

**FACT:** These two implementations share the same conceptual model but differ in precision (Decimal.js vs native numbers), discount allocation strategy, and WHT base computation. This is a significant architectural risk — any bug fix in one may not be applied to the other.

---

## 8. Current Data Flow

### 8.1 Payment Recording Flow (Current)

```
User enters amount
    ↓
paymentEntryHelpers.getPaymentEntrySummary()     ← Client-side
    ↓
paymentEntryHelpers.validatePaymentEntry()       ← Client-side
    ↓
paymentService.recordInvoicePayment()
    ↓
paymentService.normalizePaymentInput()           ← Client-side normalization
    ↓
paymentRepository.insertPayment()                ← Supabase INSERT
    (wht_rate: null, wht_type: null)             ← WHT context lost
    ↓
paymentRepository.fetchInvoiceFinancials()       ← Supabase READ from view
    ↓
paymentService.updateInvoiceStatus()             ← Supabase UPDATE invoices.status
    ↓
[Optional] audit.recordPaymentRecorded()         ← Supabase RPC (if called)
```

### 8.2 WHT Data Flow (Current — Broken)

```
Invoice Created
    ↓
Calculations.ts computes WHT amount              ← WHT rate + type used
    ↓
Invoice saved with wht = <computed_total>        ← Only total stored on invoice row
    ↓
Custom fields stores calculationInputs.whtValue  ← Rate stored in JSON
    ↓
Payment Recorded
    ↓
paymentRepository.insertPayment()
    wht_rate: null, wht_type: null               ← RATE AND TYPE DISCARDED
    ↓
wht_amount: <user-entered or 0>                  ← Only amount recorded
    ↓
Compliance Hub
    ↓
whtSummary.summarizeComplianceWht()              ← Cross-references invoice.wht vs payment.wht_amount
    ↓
WhtReceiptsPanel creates receipt                 ← From payment, not from invoice WHT config
```

**SEVERITY: HIGH.** The WHT rate and type are available when the invoice is created (stored in `custom_fields.calculationInputs`) but are discarded when the payment is recorded. This means:
- The compliance hub cannot reliably determine the WHT rate for a specific payment
- WHT receipts show the amount but not the rate that produced it
- If the invoice's WHT configuration changes after payment, historical payments have no traceability

### 8.3 Invoice Status Flow (Current — Dual-Source)

```
Invoice Status = invoices.status (persisted snapshot)
                 ↕ (sometimes synced, sometimes stale)
Invoice Status = invoice_financials_v.computed_status (derived from payments)

Two write paths:
1. After payment: fetchInvoiceFinancials() → updateInvoiceStatus()  ← Synced
2. Manual status change: changeInvoiceStatus()                      ← Direct write, no sync
```

**FACT:** The `changeInvoiceStatus` function in `invoiceLifecycleService.ts:52-103` directly updates `invoices.status` without going through the financials view. This means a manual status change can overwrite a payment-derived status, or vice versa.

---

## 9. Lifecycle Analysis

### 9.1 Payment Lifecycle (Current)

```
                     ┌──────────────┐
                     │ Payment      │
                     │ Recorded     │
                     └──────┬───────┘
                            │
                   ┌────────▼────────┐
                   │ Active          │
                   │ (voided_at=null)│
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │ Voided          │
                   │ (voided_at set) │
                   └─────────────────┘
```

**Two states only. No intermediate states. No undo. No history of changes.**

### 9.2 Complete Payment Lifecycle (What Should Exist)

```
Invoice Created
    ↓
Payment Attempted → Validation Failed → Error Displayed
    ↓ (success)
Payment Recorded → Audit Logged → Status Synced
    ↓
Payment Active
    ↓
    ├── Payment Voided → Audit Logged → Status Re-synced → History Preserved
    ├── Payment Edited → Correction Entry Created → Audit Logged
    ├── Payment Reversed → Reversal Entry Created → Audit Logged → Status Re-synced
    ├── Payment Refunded → Refund Entry Created → Audit Logged
    └── Payment Retained (for WHT/collection purposes)

Invoice States:
Created → Issued → Partially Paid → Paid → Closed
                    ↓                  ↓
                    Overpaid → Credit Created
                    ↓
                    Bad Debt → Written Off
                    ↓
                    Archived
```

### 9.3 Invoice Lifecycle (Current)

```
Created (status='unpaid')
    ↓
Status Changed (manual)
    ↓
Payment Recorded → Status Synced from view
    ↓
Voided Payment → Status Re-synced from view
    ↓
Archived (archived_at set)
    ↓
Deleted (hard delete)
```

**Missing states:** `sent`, `overdue` (presentation-only, never persisted), `disputed`, `cancelled`, `closed`.

---

## 10. Nigerian Workflow Assessment

### 10.1 What Current Architecture Supports

| Nigerian Workflow | Support Level | Evidence |
|-------------------|--------------|----------|
| Cash collections | SUPPORTED | PaymentMethod includes "Cash" |
| Bank transfers | SUPPORTED | PaymentMethod includes "Transfer" |
| POS payments | SUPPORTED | PaymentMethod includes "POS" |
| Cheque payments | SUPPORTED | PaymentMethod includes "Cheque" |
| VAT charging (7.5%) | SUPPORTED | `Calculations.ts` handles VAT rate |
| WHT deduction | PARTIAL | Amount computed, but rate/type discarded on payment |
| WHT receipt tracking | SUPPORTED | `wht_receipts` table + Compliance Hub |
| Tax filing records | SUPPORTED | `tax_filings` table |
| Tax reminders | SUPPORTED | `tax_reminders` table |
| TIN storage | SUPPORTED | `tax_settings.tin` column |
| Bank account management | SUPPORTED | `bank_accounts` table |
| Invoice PDF generation | SUPPORTED | PDF system exists |
| Document numbering | SUPPORTED | `resolvePrefix()` engine |

### 10.2 What Current Architecture Does NOT Support

| Nigerian Workflow | Status | Gap Description |
|-------------------|--------|-----------------|
| WHT certificate tracking | MISSING | `wht_certificate_ref` exists on payments but is never populated |
| WHT rate/type at payment level | MISSING | Always null on insert (`paymentRepository.ts:27-28`) |
| VAT input reconciliation | MISSING | `tax_input_entries` exist but no reconciliation against charged VAT |
| Retention payment | MISSING | No retention concept |
| Mobilization payment | MISSING | No mobilization concept (advance exists but differently) |
| Government project deductions | MISSING | No deduction concept beyond WHT |
| Contract completion tracking | MISSING | No contract lifecycle |
| FIRS submission evidence | MISSING | No export/submission workflow |
| Receipt numbering | MISSING | No receipt number generation for payments |
| Payment approval workflow | MISSING | No approval step before recording |
| Multi-currency support | PARTIAL | `currency_code` column exists but is always 'NGN' |
| Withholding remittance tracking | PARTIAL | Compliance tracks receipt status but not remittance dates |
| Audit evidence for FIRS | INCOMPLETE | Audit trail exists but doesn't cover all financial events |

---

## 11. Ledger Assessment

### 11.1 Current Ledger Philosophy

**BIGDROPS currently behaves as a document system with append-only payment records and soft-delete voiding.**

It is NOT:
- An accounting ledger (no double-entry, no journal entries, no chart of accounts)
- An ERP (no module integration, no workflow engine)
- A financial ERP (no general ledger, no trial balance, no financial statements)

It IS:
- A document management system with basic financial overlay
- An invoice-centric application where payments are subordinate records
- A partial compliance tracker bolted onto a document system

### 11.2 Ledger Characteristics Assessment

| Characteristic | Current State | Ideal State |
|---------------|---------------|-------------|
| Append-only payments | YES — new payments only | Should remain append-only |
| Immutable records | NO — void modifies in-place | Should be immutable with correction entries |
| Soft reversal | PARTIAL — void sets timestamp | Should preserve full original data |
| Correction entries | MISSING | Should create adjustment records |
| Adjustment entries | MISSING | Should support balance adjustments |
| Void strategy | SET_TIMESTAMP | Should set timestamp + preserve snapshot + require reason + audit |
| Historical preservation | PARTIAL — voided payments readable | Should include who/when/why + audit |
| Double-entry | NO | Not required for B2B SME platform |
| General ledger | NO | Could be added as future module |

### 11.3 Should Payments Become Immutable?

**FACT:** In proper accounting systems, payment records are typically immutable. Corrections are made through reversal entries or adjustment entries, not by modifying the original record.

**Current behavior:** The `payments` table allows direct UPDATE operations (via Supabase client), but the application code only writes to it via INSERT or the void UPDATE. There is no application-level enforcement of immutability.

**Recommendation direction:** Payments should become immutable financial events. All corrections should create new entries (reversals, adjustments) that reference the original payment. The void mechanism should be preserved as a special case but should also create an audit record.

---

## 12. Dependency Maps

### 12.1 Payment System Dependencies

```
payments (table)
    ├── READ BY: paymentRepository.fetchPaymentsForInvoice()
    ├── READ BY: paymentRepository.fetchInvoiceFinancials() [via invoice_financials_v]
    ├── READ BY: ComplianceHub.tsx [direct query]
    ├── READ BY: Reports.tsx [collections tab]
    ├── READ BY: whtSummary.ts [WHT cross-reference]
    ├── READ BY: WhtReceiptsPanel.tsx [WHT receipt matching]
    ├── WRITTEN BY: paymentRepository.insertPayment()
    ├── WRITTEN BY: paymentRepository.voidPayment()
    └── REFERENCED BY: wht_receipts.payment_id (FK)

invoice_financials_v (view)
    ├── READ BY: paymentRepository.fetchInvoiceFinancials()
    ├── READ BY: paymentRepository.syncInvoiceStatusFromFinancials()
    ├── READ BY: Reports.tsx [receivables tab]
    ├── DEPENDS ON: invoices table
    └── DEPENDS ON: payments table

invoices.status (column)
    ├── WRITTEN BY: paymentRepository.updateInvoiceStatus()
    ├── WRITTEN BY: invoiceStatusService.updateInvoiceStatus()
    ├── WRITTEN BY: invoiceLifecycleService.changeInvoiceStatus()
    └── READ BY: resolveInvoiceStatus.ts [presentation]
```

### 12.2 Compliance System Dependencies

```
tax_settings (table)
    ├── READ BY: ComplianceSettingsPanel.tsx
    ├── FK FROM: tax_input_entries.settings_id
    ├── FK FROM: tax_filings.settings_id
    └── FK FROM: tax_reminders.settings_id

wht_receipts (table)
    ├── FK TO: payments.id (payment_id)
    ├── FK TO: invoices.id (invoice_id)
    ├── READ BY: WhtReceiptsPanel.tsx
    ├── READ BY: ComplianceOverview.tsx [via whtSummary.ts]
    └── WRITE BY: WhtReceiptsPanel.tsx [initialize + update]

tax_filings (table)
    ├── READ BY: TaxFilingsPanel.tsx
    ├── READ BY: ComplianceOverview.tsx
    └── FK FROM: tax_reminders.linked_filing_id
```

### 12.3 Audit System Dependencies

```
audit_logs (table)
    ├── WRITTEN BY: src/lib/audit.ts [recordAuditLog()]
    ├── WRITTEN BY: supabase RPC record_audit_log()
    ├── WRITTEN BY: supabase RPC record_invoice_created()
    ├── WRITTEN BY: supabase RPC record_invoice_status_changed()
    ├── WRITTEN BY: supabase RPC record_payment_recorded()
    ├── READ BY: auditFormatters.ts [buildAuditTrailItems()]
    └── INDEXED BY: entity, actor, action, scope

activity_events (table)
    ├── WRITTEN BY: supabase RPC record_activity_event()
    ├── READ BY: v_last_invoice_activity (view)
    ├── READ BY: v_last_project_activity (view)
    └── READ BY: v_last_quotation_activity (view)
```

### 12.4 Circular Dependencies

**No circular dependencies detected.** The architecture is acyclic — payments depend on invoices, compliance depends on payments and invoices, audit depends on everything, reports depend on everything. This is correct.

### 12.5 Ownership Violations

See Section 14 for detailed analysis.

---

## 13. Business Capability Matrix

| Business Capability | Current Support | Status | Risk | Priority | Owner |
|---------------------|----------------|--------|------|----------|-------|
| Invoice creation | Full | Complete | Low | — | Invoices |
| Quotation creation | Full | Complete | Low | — | Quotations |
| Payment recording | Basic | Partial | HIGH | P1 | Payments |
| Payment history | Display only | Partial | MEDIUM | P2 | Payments |
| Payment void | Soft delete | Partial | HIGH | P1 | Payments |
| Payment editing | None | Missing | CRITICAL | P1 | Payments |
| Payment correction | None | Missing | CRITICAL | P1 | Payments |
| Payment reversal | None | Missing | HIGH | P1 | Payments |
| Payment refund | None | Missing | HIGH | P2 | Payments |
| Credit management | None | Missing | MEDIUM | P3 | Payments |
| Overpayment handling | Detection only | Partial | HIGH | P1 | Payments |
| Advance allocation | Partial | Partial | MEDIUM | P2 | Payments |
| Percentage entry | None | Missing | MEDIUM | P2 | Payments |
| Payment presets | Full only | Partial | LOW | P3 | Payments |
| Multi-invoice allocation | None | Missing | HIGH | P2 | Payments |
| Payment approval | None | Missing | MEDIUM | P3 | Payments |
| Receipt generation | None | Missing | HIGH | P2 | Payments |
| Bank reconciliation | None | Missing | HIGH | P3 | Payments |
| Invoice status (derived) | Dual-source | Partial | HIGH | P1 | Invoices |
| Invoice status (persisted) | Snapshot | Partial | HIGH | P1 | Invoices |
| WHT calculation | Document-level | Complete | Low | — | Calculations |
| WHT rate on payment | Always null | Broken | CRITICAL | P1 | Payments/Compliance |
| WHT receipt tracking | Full workflow | Complete | Low | — | Compliance |
| WHT certificate tracking | Column exists, unused | Missing | HIGH | P2 | Compliance |
| VAT charging | Full | Complete | Low | — | Calculations |
| VAT input tracking | CRUD | Partial | MEDIUM | P2 | Compliance |
| VAT reconciliation | None | Missing | HIGH | P2 | Compliance |
| Tax filing records | CRUD | Partial | MEDIUM | P2 | Compliance |
| Tax reminders | CRUD | Complete | Low | — | Compliance |
| Tax profile settings | CRUD | Complete | Low | — | Compliance |
| Financial overview report | Client-side | Partial | MEDIUM | P2 | Reports |
| Receivables aging | SQL view | Complete | Low | — | Reports |
| Collections registry | Direct query | Complete | Low | — | Reports |
| Project profitability | SQL view | Complete | Low | — | Reports |
| Tax position report | Client-side | Partial | MEDIUM | P2 | Reports |
| Audit: invoice lifecycle | Full | Complete | Low | — | Audit |
| Audit: payment recorded | RPC-based | Complete | Low | — | Audit |
| Audit: payment voided | None | Missing | CRITICAL | P1 | Audit |
| Audit: payment edited | N/A | N/A | N/A | N/A | N/A |
| Audit: compliance changes | None | Missing | HIGH | P2 | Audit |
| Audit: tax settings changes | None | Missing | MEDIUM | P3 | Audit |
| Audit: report exports | None | Missing | LOW | P4 | Audit |

---

## 14. Ownership Violations

### 14.1 Violation: Dual Financial Calculation Engines

**Location:** `src/lib/Calculations.ts` vs `src/domain/invoice/calculations.ts`

**Description:** Two independent implementations of invoice total calculation exist. `Calculations.ts` uses `decimal.js` for precision and handles complex scenarios (group headers, fixed discount allocation, row-level VAT overrides). `invoice/calculations.ts` uses native JavaScript numbers and has a different approach to discount timing and WHT base calculation.

**Impact:** A user editing an invoice might see different totals depending on which code path is active. Bug fixes in one engine may not propagate to the other.

**Severity: HIGH.**

### 14.2 Violation: Invoice Status Dual-Write

**Location:** `paymentRepository.ts:72-81` and `invoiceLifecycleService.ts:52-103`

**Description:** Invoice status is written in two different ways:
1. After payment: Read from `invoice_financials_v` → write to `invoices.status`
2. Manual change: Directly write to `invoices.status`

These two write paths can conflict. A manual status change can overwrite a payment-derived status, and a subsequent payment recording can overwrite a manual status.

**Severity: HIGH.**

### 14.3 Violation: Reports Compute Financial Metrics

**Location:** `src/components/reports/reportUtils.ts:computeReportTaxMetrics()` and `src/pages/Reports.tsx:305-435`

**Description:** The Reports page computes financial metrics (tax exposure, collection totals, aging buckets) using client-side TypeScript code that aggregates data from Supabase queries. This is financial computation happening in the presentation layer.

**Impact:** The same financial metrics computed in Reports may differ from those in Compliance Hub (which uses `whtSummary.ts`) or from those displayed on the invoice detail page (which uses `financialState.ts`).

**Severity: MEDIUM.**

### 14.4 Violation: WHT Data Discarded at Payment Boundary

**Location:** `paymentRepository.ts:27-28`

**Description:** The payment repository discards `wht_rate` and `wht_type` when inserting a payment, even though this data exists on the parent invoice's `custom_fields`. This violates the principle that financial records should be self-contained — a payment record should carry all the tax context needed to understand it.

**Severity: CRITICAL.**

### 14.5 Violation: Compliance Hub Reads All Data at Page Load

**Location:** `ComplianceHub.tsx:82-108`

**Description:** The Compliance Hub loads 6 tables on mount regardless of which section the user navigates to. This is a performance concern and also represents a data ownership issue — the compliance page is directly querying tables that belong to the payment and invoice domains.

**Severity: LOW.**

---

## 15. Architectural Risks

### R1: Financial Inconsistency Across Modules (HIGH)

The same financial metric (e.g., "balance due") is computed in at least 4 different locations using slightly different tolerance and rounding rules. Over time, with floating-point arithmetic and edge cases, these can diverge.

**Evidence:** `financialState.ts` uses tolerance=1, `paymentEntryHelpers.ts` uses tolerance=0.01, `invoice_financials_v` uses exact comparison, `reportUtils.ts` recomputes from raw sums.

### R2: Payment Void Without Audit Trail (HIGH)

A user can void any payment without the system recording who did it, when, or why (despite the `void_reason` column existing). Two years later, an accountant would see a voided payment with no context.

**Evidence:** `paymentService.ts:voidInvoicePayment()` calls `repositoryVoidPayment()` which only sets `voided_at`. No audit RPC is called.

### R3: WHT Three-Way Data Split (HIGH)

WHT data exists in three disconnected locations: the invoice's `custom_fields.calculationInputs`, the payment's `wht_amount` (with null rate/type), and the `wht_receipts` table. No single query can reconstruct the full WHT story for a payment.

### R4: Dual Calculation Engine Drift (MEDIUM)

Two independent calculation engines can produce different results for the same invoice data, especially for edge cases involving fixed discounts, row-level VAT overrides, and extra charges.

### R5: No Financial Immutability (MEDIUM)

Payment records can be directly updated by any Supabase client with authenticated access. There is no application-level enforcement of immutability. A bug in any code path could corrupt historical payment data.

### R6: Reports Stale Data Risk (LOW)

Reports compute metrics from point-in-time queries. If the underlying data changes between tab switches, the displayed totals may be inconsistent across tabs within the same session.

---

## 16. Technical Risks

### T1: Native Number Precision in Calculations (MEDIUM)

`src/domain/invoice/calculations.ts:calcTotals()` uses native JavaScript numbers for all financial math. While `src/lib/Calculations.ts` correctly uses `decimal.js`, the parallel implementation does not. Nigerian Naira amounts can reach billions, and floating-point precision loss becomes measurable.

### T2: Supabase Direct Queries in Components (LOW)

Both `Reports.tsx` and `ComplianceHub.tsx` build Supabase queries directly in component callbacks. There is no abstraction layer, no query caching, and no shared data fetching strategy. This makes it difficult to add features like offline support, optimistic updates, or request deduplication.

### T3: No Database-Level Financial Constraints (MEDIUM)

The `payments` table has no CHECK constraints on amount positivity, no foreign key enforcement beyond the basic `invoice_id` reference, and no trigger to prevent voiding payments that are already voided. The `voidPayment` repository function includes `.is("voided_at", null)` as a safeguard, but this is application-level, not database-level.

### T4: Audit Function Entity Type Restriction (LOW)

The `record_activity_event` database function only accepts `entity_type` in `('invoice', 'quotation', 'project')`. Adding compliance entity types requires a database migration.

---

## 17. Regulatory Risks

### REG1: No FIRS-Compliant Receipt Generation (HIGH)

Nigerian tax law requires businesses to issue receipts for payments received. BIGDROPS has no receipt generation mechanism. Payments are recorded as database rows but produce no customer-facing document.

### REG2: Incomplete WHT Certificate Trail (HIGH)

The `wht_certificate_ref` column on `payments` exists but is never populated. For FIRS audits, the business needs to demonstrate a clear trail from WHT deduction on an invoice → payment with WHT amount → WHT receipt from the deductor → WHT remittance to FIRS. Currently, only the middle steps are tracked.

### REG3: No VAT Reconciliation (MEDIUM)

Nigerian VAT requires monthly filing with reconciliation between VAT charged on sales and VAT paid on purchases (input VAT). BIGDROPS tracks both (via invoices and `tax_input_entries`) but has no reconciliation mechanism to compute net VAT liability.

### REG4: Incomplete Audit Trail for Tax Authorities (MEDIUM)

If FIRS audits the business, they may request evidence of all financial transactions. The current audit trail covers invoice and payment creation but not voids, corrections, or compliance actions.

---

## 18. Missing Capabilities

### 18.1 Critical Missing (Must Have for Financial Operations)

1. **Payment editing with audit trail** — Allow correcting payment amount, date, method while preserving original record
2. **Payment reversal with correction entries** — Create reversal records rather than modifying originals
3. **WHT rate/type preservation on payments** — Store the invoice's WHT configuration at payment time
4. **Payment void audit recording** — Log who voided, when, and why
5. **Receipt generation** — Produce payment receipts (PDF or digital)
6. **Overpayment lifecycle** — Credit creation, application to future invoices
7. **Invoice status consistency** — Single source of truth for status derivation

### 18.2 Important Missing (Should Have for Nigerian Operations)

8. **Percentage-based payment entry** — "Pay 50% of balance" workflow
9. **Payment presets** — 25%, 50%, 75%, 100% of balance
10. **Multi-invoice payment allocation** — Apply one payment across multiple invoices
11. **WHT certificate tracking** — Link certificate numbers to payments
12. **VAT reconciliation** — Net VAT liability computation
13. **Receipt numbering** — Sequential receipt numbers
14. **Payment approval workflow** — Optional approval before finalizing

### 18.3 Valuable Missing (Nice to Have for Growth)

15. **Credit notes** — Issue credits for returns or adjustments
16. **Refund processing** — Track refunds with reasons and audit
17. **Bad debt write-off** — Formalize write-off with approval
18. **Bank reconciliation** — Match bank statements to recorded payments
19. **Client balance tracking** — Persistent client account balances
20. **Payment scheduling** — Future-dated payment recording
21. **Batch payment recording** — Record multiple payments in one session
22. **Export compliance reports** — FIRS-ready VAT and WHT reports

---

## 19. Recommended Architectural Direction

### 19.1 Core Principles

1. **Payments are immutable financial events.** Once recorded, a payment row must never be directly modified. All corrections create new entries referencing the original.

2. **Single source of truth for financial state.** Invoice status, balance due, and settlement amounts must be computed from one authoritative location, not scattered across TypeScript and SQL.

3. **WHT is a first-class citizen at the payment level.** Every payment carrying WHT must store the rate, type, and computed amount as immutable metadata.

4. **Every financial action produces an audit record.** No exception. If it involves money, it must be traceable.

5. **Reports consume projections, not raw data.** Financial metrics should be computed by a dedicated projection layer that reports and dashboards consume.

6. **Compliance is a workflow engine, not a CRUD dashboard.** Tax obligations should drive automated reminders, not require manual navigation.

### 19.2 Ownership Boundaries

```
┌─────────────────────────────────────────────────────┐
│                 PAYMENTS DOMAIN                      │
│  Payment recording, allocation, settlement,          │
│  reversal, refund, credit, void, receipt             │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │ WHT Sub-domain                              │    │
│  │ Rate/type capture, receipt lifecycle,        │    │
│  │ certificate tracking                         │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
         ↓ produces events              ↓ produces events
┌──────────────────────┐    ┌──────────────────────┐
│    AUDIT TRAIL       │    │  REPORTS DOMAIN      │
│  Immutable event     │    │  Projections, aging,  │
│  recording for       │    │  summaries, exports   │
│  every financial     │    │                       │
│  action              │    │  Consumes payment     │
│                      │    │  events, not raw      │
│  Actor, timestamp,   │    │  payment data         │
│  before/after,       │    │                       │
│  reason              │    │                       │
└──────────────────────┘    └──────────────────────┘
         ↑ consumes events          ↑ consumes events
┌─────────────────────────────────────────────────────┐
│               COMPLIANCE DOMAIN                      │
│  Tax profile, VAT tracking, WHT receipt lifecycle,   │
│  filing management, obligation reminders,             │
│  government submission evidence                       │
│                                                      │
│  Consumes payment events for WHT                     │
│  Consumes invoice events for VAT                     │
│  Produces filing and reminder events                 │
└─────────────────────────────────────────────────────┘
```

### 19.3 Data Flow Direction

```
Invoice Created → [Calculations Engine] → Invoice Saved
                                              ↓
Payment Recorded → [Payment Domain] → Payment Saved (immutable)
                         ↓                    ↓
              [Audit Trail] ←───── Event ───→ [Reports Projections]
                         ↓                    ↓
              [Compliance] ←── WHT Event ──→ [Dashboard]
```

### 19.4 Audit Philosophy

Every financial event creates an immutable record in `audit_logs` with:
- `entity_type` extended to include 'payment', 'compliance', 'tax_filing', 'tax_settings'
- `action` extended to include 'PAYMENT_VOIDED', 'PAYMENT_REVERSED', 'PAYMENT_EDITED', 'WHT_MODIFIED', 'COMPLIANCE_CHANGED'
- `changes` array with full before/after snapshots for all modified fields
- `reason` required for destructive operations (void, reverse, write-off)

### 19.5 Compliance Philosophy

Compliance Hub should evolve from a CRUD dashboard to a workflow engine that:
- Automatically creates WHT receipt tracking entries when payments with WHT are recorded
- Generates filing obligations based on tax calendar
- Reconciles VAT charged vs VAT paid to compute net liability
- Exports FIRS-ready reports
- Tracks certificate numbers linked to specific payments

### 19.6 Reporting Philosophy

Reports should:
- Consume a dedicated projection layer (materialized views or computed summaries)
- Never compute financial metrics in TypeScript presentation code
- Be refreshed on-demand or on a schedule, not recomputed on every tab switch
- Support export to standard formats (CSV, PDF)
- Be the single source for all financial dashboards

---

## 20. Final Conclusions

### 20.1 Current State Summary

BIGDROPS' Financial Operations is a **functional but fragmented system** that handles the happy path of invoice → payment → status update well, but breaks down when real-world accounting operations are required. The system is approximately 40% of the way to being a proper financial operations platform.

**What works well:**
- Invoice creation with complex tax/discount calculations
- Basic payment recording and history display
- WHT receipt lifecycle tracking in Compliance Hub
- Tax filing and reminder management
- Document transformation lineage
- Audit trail for document lifecycle events

**What is fundamentally broken:**
- WHT data loss at the payment boundary (wht_rate/type always null)
- Payment void without audit trail
- No payment correction or editing capability
- Dual calculation engines for invoice totals
- Invoice status dual-write with no consistency enforcement
- Overpayment detection without lifecycle

### 20.2 Architectural Maturity Level

| Dimension | Level (1-5) | Notes |
|-----------|-------------|-------|
| Data Integrity | 2 | No immutability, no constraints, dual writes |
| Audit Coverage | 3 | Good for documents, poor for financial events |
| Compliance Integration | 2 | CRUD-based, not workflow-driven |
| Report Accuracy | 3 | Correct for simple cases, edge cases diverge |
| Payment Flexibility | 1 | Append-only with void only |
| Nigerian Workflow Fit | 2 | Basic support, missing key operations |
| Code Organization | 3 | Clear domain separation, but duplicated logic |
| Scalability | 2 | No projections, no caching, direct queries |

### 20.3 Priority Actions for Redesign

1. **P0:** Fix WHT data loss — populate wht_rate and wht_type on payment insert
2. **P0:** Add audit recording for payment voids
3. **P1:** Unify invoice status derivation into a single source of truth
4. **P1:** Implement payment correction with audit trail
5. **P1:** Build payment reversal mechanism with correction entries
6. **P2:** Add overpayment lifecycle (credit creation and application)
7. **P2:** Build receipt generation for payments
8. **P2:** Implement percentage-based payment entry and presets
9. **P2:** Add VAT reconciliation in Compliance Hub
10. **P3:** Build bank reconciliation capability
11. **P3:** Extend audit trail to cover all compliance entities

### 20.4 Report Verdict

This report provides sufficient evidence and analysis for an architect to design a replacement Financial Operations subsystem without repeating discovery work. The current system's strengths (calculation engine, WHT receipt lifecycle, document lineage) should be preserved. Its weaknesses (payment immutability, audit coverage, compliance integration, report consistency) require fundamental architectural changes, not incremental patches.

---

*End of report. No files were modified during this audit. No code was changed. No migrations were generated.*
