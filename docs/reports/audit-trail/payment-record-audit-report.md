# Payment Recording System — Architecture & Data Flow Audit

This report was written by DeepSeek on 2026-07-03.

---

## 1. Objective & Scope

**Objective:** Document the full architecture of the payment recording system — how a payment moves from the UI through service, repository, domain, and database layers, including audit trails, downstream consumers (financial views, projects, compliance, reports), and gap areas.

**Excluded:**
- Payment data export / CSV compilation
- Offline-first payment handling (Capacitor SQLite fallback)
- CRUD for bank accounts

---

## 2. System Overview

Payment recording spans 5 architectural layers:

```
UI (RecordPaymentSheet)
  → PaymentEntryHelpers (validation + summary projection)
  → PaymentService (orchestration)
    → PaymentRepository (raw Supabase access)
    → Supabase triggers (none — status is client-driven)
  → Domain layer (financialState.ts)
  → Downstream: DB views → projects, compliance, reports
```

---

## 3. Layer-by-Layer Evidence

### 3.1 UI Layer — `InvoiceRecordPaymentSheet.tsx`

- **Path:** `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx`
- **Opened from:** `InvoiceOverlays.tsx` (line 148), triggered via `InvoiceRecordPaymentSheet` component at line 148
- **Flow:** User enters cash amount → validates → calls `recordInvoicePayment()` → on success, records audit via `recordPaymentRecorded()` → closes
- **WHT handling:** Hardcoded `whtDeducted: 0` (line 134). A helper text warns the user when the invoice has WHT configured (lines 298–303), directing them to Compliance Hub after settlement — WHT reconciliation is async, not inline

### 3.2 Validation — `paymentEntryHelpers.ts`

- **Path:** `src/components/invoice/paymentEntryHelpers.ts`
- Key functions:
  - `getPaymentEntrySummary()` — computes settlement totals, remaining balance
  - `validatePaymentEntry()` — validates non-negative, non-zero, not exceeding balance
  - `buildFullPaymentPreset()` — helper for "Pay Full Balance" button
- **Note:** `whtDeducted` is always 0 in this helper — no WHT input on the recording form

### 3.3 Service Layer — `paymentService.ts`

- **Path:** `src/modules/invoices/services/paymentService.ts`
- `recordInvoicePayment()` — normalizes input, calls `insertPayment()`, then fetches `invoice_financials_v` view to determine computed status, updates `invoices.status` column
- `voidInvoicePayment()` — sets `voided_at` timestamp, re-syncs status from `invoice_financials_v`
- `calculatePreviousSettled()` — sums prior `cash_amount + wht_amount` for a given invoice
- `loadBankAccountsList()` — fetches bank accounts
- `refreshInvoicePaymentState()` — returns computed status from view

### 3.4 Repository Layer — `paymentRepository.ts`

- **Path:** `src/modules/invoices/repositories/paymentRepository.ts`
- Raw Supabase CRUD:
  - `insertPayment()` — INSERT into `payments` table
  - `fetchPaymentsForInvoice()` — SELECT `cash_amount, wht_amount` for non-voided payments
  - `fetchInvoiceFinancials()` — SELECT computed_status from `invoice_financials_v`
  - `updateInvoiceStatus()` — UPDATE `invoices.status` (DB only stores "unpaid" | "paid")
  - `voidPayment()` — SET `voided_at = now()` with guard `is("voided_at", null)`
  - `syncInvoiceStatusFromFinancials()` — re-reads view, syncs status
- **Key detail:** `insertPayment` sets `wht_rate: null, wht_type: null` — these fields exist in the schema but are never populated

### 3.5 Domain Layer — `financialState.ts`

- **Path:** `src/domain/invoice/financialState.ts`
- `calculateInvoiceFinancialState()` — pure function, source of truth for derived states
- Input: invoice total + payment array (with `cash_amount`, `wht_amount`, `voided_at`)
- Output: `{ settledAmount, cashReceived, whtSettled, balanceDue, overpaymentAmount, paymentState, displayStatus, statusTone }`
- Tolerance-based comparison (±1 currency unit) to determine paid vs partially_paid vs unpaid
- **Overpayment:** Detected when `settledAmount > invoiceTotal + tolerance`, reported as data but **no UI enforces overpayment handling** — the recording sheet blocks amounts exceeding balance via validation

### 3.6 Status Resolution — `resolveInvoiceStatus.ts`

- **Path:** `src/domain/invoice/resolveInvoiceStatus.ts`
- Wraps `calculateInvoiceFinancialState()` for presentation
- Adds OVERDUE as a computed overlay (presentation-only, never persisted) when `due_date < today` and not paid
- Returns `{ primary, statusTone, display_labels[], display_classes[] }`

### 3.7 Financial Projections — `financialProjection.ts`

- **Path:** `src/domain/invoice/projections/financialProjection.ts`
- `buildPaymentSummaryProjection()` — computes payment progress %, formats for `PaymentHistoryCard.tsx`
- `buildTotalsProjection()` — summary/totals rows for PDF preview
- `buildBalanceDisplayProjection()` — conditional "Balance Due" row
- `buildAdvanceDisplayProjection()` — advance payment summary (only for virtual projections)

### 3.8 Audit Trail

- **Path:** `src/lib/audit.ts` (lines 150–152 in `InvoiceRecordPaymentSheet.tsx`)
- `recordPaymentRecorded()` — fires on successful payment recording
- **No void-payment audit event observed** in the payment service path — `voidInvoicePayment()` at `paymentService.ts:98` does not call any audit function

---

## 4. Database Schema & Views

### 4.1 Payments Table (`20260520090003_invoices.sql:85-104`)

```
payments:
  id UUID PK
  invoice_id UUID FK → invoices.id
  cash_amount numeric NOT NULL DEFAULT 0
  wht_amount numeric NOT NULL DEFAULT 0
  amount numeric NOT NULL DEFAULT 0
  date date NOT NULL
  method text NOT NULL
  reference text
  notes text
  source text (default: 'live')
  bank_account_id UUID FK
  wht_rate numeric
  wht_type text
  voided_at timestamptz
  created_at / updated_at
```

### 4.2 `invoice_financials_v` (views.sql:15-37)

```
Aggregates non-voided payments per invoice:
- cash_received, wht_received, settled_total, balance_due, computed_status
```

### 4.3 `project_financials_v` (views.sql:39-61)

```
Aggregates invoice totals and payment totals per project:
- total_invoiced, cash_collected, wht_collected, total_collected, outstanding
```

### 4.4 Consumers of Views

| Consumer | File | What it reads |
|---|---|---|
| Invoice list (client) | `moduleAdapters.ts:129` | `invoices.payments(cash_amount, wht_amount, amount, voided_at)` |
| Invoice list (hook) | `useInvoiceList.ts:66` | Same select shape |
| Project page | `useProjectDocumentFetch.ts:138` | `project_financials_v`, `invoice_financials_v` |
| Client workspace | `clientWorkspace.ts:148` | `invoice.balance_due` |

---

## 5. Edge Cases & Gap Analysis

### 5.1 WHT Receipt Creation

**Not wired inline.** When `whtDeducted` is nonzero:
- The compliance `createWhtReceipt()` function exists at `whtReceiptService.ts:34`
- A `wht_receipts` table exists with FK to both `invoice_id` and `payment_id`
- But the payment recording sheet **always passes `whtDeducted: 0`** (line 134)
- The user is shown a hint to "track within Compliance Hub" — WHT receipt creation is a separate async workflow

### 5.2 Overpayment

- Domain detects it (`financialState.ts:53`)
- **No mechanism exists to handle it:**
  - No negative-payment (credit/refund) flow
  - No "excess balance" warning beyond the validation block in the recording sheet
  - No way to apply overpayment to another invoice

### 5.3 Voided Payment Audit

- `voidInvoicePayment()` at `paymentService.ts:98` sets `voided_at` and re-syncs status
- **No audit event is recorded** — compare with recording which calls `recordPaymentRecorded()`
- The `viewInvoiceActions.ts` wrapper at line 230 also does not add audit

### 5.4 Invoice Status Sync: DB vs Domain

- DB stores raw `"unpaid" | "paid"` (set by `updateInvoiceStatus()`)
- Domain derives `"partially_paid"` and `"overdue"` from payments + due_date
- **Race condition:** If multiple payments arrive simultaneously, `updateInvoiceStatus()` overwrites the DB column each time — the last writer wins. However, `invoice_financials_v` always recomputes from raw payments, so downstream views are consistent. The `invoices.status` column is only a snapshot for list filtering.

### 5.5 Bank Account Reference for Non-Transfer Methods

- `bank_account_id` is set to `null` for Cash/POS/Cheque/Other (line 142)
- This is correct behavior, but means payment method filtering by bank account only works for Transfer payments

### 5.6 No Payment Evidence/Attachment Support

- No field for receipt upload, payment screenshot, or document attachment on the payment record
- The `payments` table has no `attachment_url` or `evidence` column

### 5.7 No Payment Method Standardization

- Methods are freeform strings: `'Transfer' | 'Cash' | 'POS' | 'Cheque' | 'Other'`
- No DB-level CHECK constraint — could drift if a new method is added in one code path but not others

---

## 6. Data Flow Diagram (Text)

```
┌──────────────────────┐
│  InvoiceRecordPayment │
│  Sheet (UI)          │
│  - validatePayment() │
│  - settlementSummary │
└──────┬───────────────┘
       │ recordInvoicePayment()
       ▼
┌──────────────────────┐
│  PaymentService      │  src/modules/invoices/services/paymentService.ts
│  - normalizePayment()│
│  - record()          │
│  - void()            │
└──────┬───────────────┘
       │
       ├──▶ PaymentRepository
       │    src/modules/invoices/repositories/paymentRepository.ts
       │    - insertPayment() → payments table
       │    - fetchInvoiceFinancials() → invoice_financials_v
       │    - updateInvoiceStatus() → invoices.status
       │
       ├──▶ Audit (recording only)
       │    src/lib/audit.ts → recordPaymentRecorded()
       │
       ▼
┌─────────────────────────────────────┐
│  Domain Layer                       │
│  financialState.ts                  │
│  resolveInvoiceStatus.ts            │
│  projections/financialProjection.ts │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Downstream Consumers               │
│  - invoice_financials_v (DB view)  │
│  - project_financials_v (DB view)  │
│  - Reports (reportTypes.ts)        │
│  - Client workspace (clientWs.ts)  │
│  - Compliance (wht_receipts table) │
│  - Invoice list (moduleAdapters)   │
└─────────────────────────────────────┘
```

---

## 7. Key Files

| File | Role |
|---|---|
| `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` | UI recording form |
| `src/components/document-view/invoice/InvoiceOverlays.tsx` | Sheet orchestration |
| `src/components/invoice/paymentEntryHelpers.ts` | Validation + summary |
| `src/modules/invoices/services/paymentService.ts` | Business orchestration |
| `src/modules/invoices/repositories/paymentRepository.ts` | DB CRUD |
| `src/domain/invoice/financialState.ts` | Financial state engine |
| `src/domain/invoice/resolveInvoiceStatus.ts` | Status display resolver |
| `src/domain/invoice/projections/financialProjection.ts` | Presentation projections |
| `src/modules/compliance/services/whtReceiptService.ts` | WHT receipt creation (async) |
| `src/config/moduleAdapters.ts` | Invoice list with payment join |
| `src/hooks/useProjectDocumentFetch.ts` | Project page financial aggregation |
| `src/lib/audit.ts` | Audit log |
| `supabase/migrations/20260520090010_views.sql` | Financial views |

---

## 8. Risks & Limitations

1. **WHT reconciliation is decoupled** — no inline WHT receipt creation during payment recording
2. **No overpayment handling path** — overpayment is detected but unactionable
3. **No void-payment audit trail** — voiding bypasses audit logging
4. **No payment evidence/attachment** — no receipt upload on payment records
5. **No payment correction/credit note flow** — reversals require voiding + re-recording
6. **Status column race** — `invoices.status` is a stale snapshot; all readers should prefer `invoice_financials_v` or `calculateInvoiceFinancialState()`

---

## 9. Verification

- Code inspection: all listed files read and reviewed
- No runtime tests executed; findings are structural from static analysis
- Migration files confirmed schema definitions (views, payments table)

---

## 10. Deferred Work

- Implementation of inline WHT receipt creation on payment recording (would connect `paymentService.ts` → `whtReceiptService.ts`)
- Overpayment credit/reconciliation flow
- Audit event for voided payments
- Payment evidence/attachment upload
- DB-level CHECK constraint for payment methods
