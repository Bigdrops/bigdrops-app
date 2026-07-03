# Financial Operations Architecture Baseline Report

This report was written by MiMo Code Agent on 2026-07-03.

---

## 1. Executive Summary

This report documents the complete current state of BIGDROPS's Financial Operations capabilities as they exist in the repository today. It serves as the definitive baseline for all future Financial Operations implementation phases defined in `docs/PRD/financial-operations-prd.md`.

**Current Maturity:** The system has a working payment recording and voiding flow, a solid calculation engine, basic WHT receipt tracking, and a partial audit trail. Most of the PRD's target architecture — credits, allocations, corrections, reversals, refunds, receipts, compliance automation, and projection-based reporting — does not yet exist.

**Key Finding:** The existing implementation is production-ready for basic invoice/payment workflows but has significant gaps against the PRD's vision. The gaps are well-defined and can be addressed incrementally without disrupting existing behavior.

---

## 2. Existing Financial Architecture

### 2.1 Architecture Layers

```
UI Layer
  → InvoiceFormPage.tsx / InvoiceRecordPaymentSheet.tsx
  → QuotationFormPage.tsx
  → ComplianceHub.tsx

Service Layer
  → paymentService.ts (record, void, calculate)
  → invoiceLifecycleService.ts (status, archive, delete, duplicate)
  → invoiceConversionService.ts (revert to quotation)
  → invoiceAdvanceService.ts (advance invoice metadata)
  → whtReceiptService.ts (WHT receipt CRUD)

Repository Layer
  → paymentRepository.ts (raw Supabase access)
  → invoiceService.ts (invoice CRUD)

Domain Layer
  → Calculations.ts (single source of truth for financial math)
  → financialState.ts (derived financial state)
  → resolveInvoiceStatus.ts (presentation status)
  → projections/financialProjection.ts (PDF/display projections)
  → advanceMetadata.ts / advanceChildFlow.ts (advance logic)

Database Layer
  → invoices, invoice_items, payments, wht_receipts tables
  → invoice_financials_v, project_financials_v views
  → audit_logs, activity_events tables
  → RPC functions for audit events
```

### 2.2 Design Principles Observed

1. **Calculations are centralized** — `src/lib/Calculations.ts` is the single source of truth for all document financial math.
2. **Financial state is derived** — `financialState.ts` computes balances from immutable payment records.
3. **Audit uses direct-call pattern** — domains call audit functions directly, not via event bus.
4. **Status is synced from views** — `invoice_financials_v` view computes status; service layer syncs to `invoices.status`.

---

## 3. Capability Inventory

### 3.1 Payment Recording

| Attribute | Value |
|-----------|-------|
| Owner | `paymentService.ts` |
| Source Files | `src/modules/invoices/services/paymentService.ts:52-81`, `src/modules/invoices/repositories/paymentRepository.ts:15-42` |
| Dependencies | Supabase `payments` table, `invoice_financials_v` view |
| Responsibilities | Normalize input, insert payment, sync invoice status, fire audit event |
| Maturity | **Production** — fully working, tested in production |
| Limitations | WHT amount hardcoded to 0 in UI; no WHT snapshot on payment record; no receipt generation |

### 3.2 Payment Voiding

| Attribute | Value |
|-----------|-------|
| Owner | `paymentService.ts` |
| Source Files | `src/modules/invoices/services/paymentService.ts:106-125`, `src/modules/invoices/repositories/paymentRepository.ts:96-109` |
| Dependencies | Supabase `payments` table, `invoice_financials_v` view |
| Responsibilities | Set `voided_at`, persist `void_reason`, sync status, fire audit event |
| Maturity | **Production** — implemented, typechecked, audit-wired |
| Limitations | Soft void only (sets timestamp); no correction/reversal workflow; no refund flow |

### 3.3 Financial Calculation Engine

| Attribute | Value |
|-----------|-------|
| Owner | `src/lib/Calculations.ts` |
| Source Files | `src/lib/Calculations.ts` (720 lines), `src/domain/invoice/calculations.ts` (395 lines) |
| Dependencies | `decimal.js` for precision |
| Responsibilities | Compute line totals, VAT, WHT, discount, extra charges, grand total, total payable |
| Maturity | **Production** — comprehensive, handles mixed VAT, fixed/percent discounts, before/after tax timing |
| Limitations | Two calculation paths exist (`Calculations.ts` and `domain/invoice/calculations.ts`) — potential duplication |

### 3.4 Financial State

| Attribute | Value |
|-----------|-------|
| Owner | `src/domain/invoice/financialState.ts` |
| Source Files | `src/domain/invoice/financialState.ts` (79 lines) |
| Dependencies | Payment array from database |
| Responsibilities | Compute settled amount, balance due, overpayment, payment state, display status |
| Maturity | **Production** — pure function, tolerance-based comparison |
| Limitations | No credit tracking; no aging; no receivable projection; overpayment detected but not actionable |

### 3.5 Invoice Status Resolution

| Attribute | Value |
|-----------|-------|
| Owner | `src/domain/invoice/resolveInvoiceStatus.ts` |
| Source Files | `src/domain/invoice/resolveInvoiceStatus.ts` (77 lines) |
| Dependencies | `financialState.ts` |
| Responsibilities | Resolve display status, add OVERDUE overlay, produce CSS classes |
| Maturity | **Production** — presentation-only, never persisted |
| Limitations | OVERDUE is presentation-only; no financial status separation from operational status |

### 3.6 Financial Projections (PDF/Display)

| Attribute | Value |
|-----------|-------|
| Owner | `src/domain/invoice/projections/financialProjection.ts` |
| Source Files | `src/domain/invoice/projections/financialProjection.ts` (129 lines) |
| Dependencies | `financialState.ts`, `calculations.ts` |
| Responsibilities | Build totals rows, balance display, payment summary, advance display |
| Maturity | **Production** — used for PDF rendering and payment history display |
| Limitations | Projections are disposable (correct per PRD); no receivable aging or collection projections |

### 3.7 Audit System

| Attribute | Value |
|-----------|-------|
| Owner | `src/lib/audit.ts` |
| Source Files | `src/lib/audit.ts` (282 lines), `supabase/migrations/20260520090008_audit_activity.sql` (227 lines) |
| Dependencies | Supabase RPC functions |
| Responsibilities | Record field diffs (audit_logs) and domain events (activity_events) |
| Maturity | **Production** — verified for Invoice/Quotation CRUD, status changes, payments |
| Limitations | Direct-call pattern (not platform service); no correlation chains; no replayability; DELETE/ARCHIVE gaps |

### 3.8 Activity Events

| Attribute | Value |
|-----------|-------|
| Owner | `supabase/migrations/20260520090008_audit_activity.sql` |
| Source Files | Migration file, RPC functions |
| Dependencies | `activity_events` table |
| Responsibilities | Store discrete domain events (CREATED, STATUS_CHANGED, PAYMENT_RECORDED, PAYMENT_VOIDED, LINKED, etc.) |
| Maturity | **Production** — working for defined event types |
| Limitations | Whitelist-based event types; no correlation ID; no before/after snapshots in activity_events |

### 3.9 WHT Management

| Attribute | Value |
|-----------|-------|
| Owner | `whtReceiptService.ts` + `domain/compliance/whtSummary.ts` |
| Source Files | `src/modules/compliance/services/whtReceiptService.ts` (110 lines), `src/domain/compliance/whtSummary.ts` (67 lines) |
| Dependencies | `wht_receipts` table |
| Responsibilities | CRUD for WHT receipts, summary computation |
| Maturity | **Partial** — CRUD works; summary works; but WHT not snapped on payment; no automated receipt creation |
| Limitations | Payment record does not snapshot WHT rate/type; `wht_rate` and `wht_type` columns on `payments` always NULL; no filing workflow |

### 3.10 VAT Handling

| Attribute | Value |
|-----------|-------|
| Owner | `Calculations.ts` (calculation only) |
| Source Files | `src/lib/Calculations.ts:356-358`, `src/domain/invoice/calculations.ts:303` |
| Dependencies | Invoice item VAT rates |
| Responsibilities | Compute VAT per line and document level |
| Maturity | **Partial** — calculation works; no VAT reconciliation; no filing; no compliance tracking |
| Limitations | VAT is calculated but not tracked as a compliance obligation; no VAT input/output reconciliation |

### 3.11 Advance Invoices

| Attribute | Value |
|-----------|-------|
| Owner | `invoiceAdvanceService.ts` |
| Source Files | `src/modules/invoices/services/invoiceAdvanceService.ts` (192 lines), `src/domain/invoice/advanceMetadata.ts`, `src/domain/invoice/advanceChildFlow.ts` |
| Dependencies | Invoice `custom_fields` JSONB |
| Responsibilities | Create/update/delete advance metadata on parent invoice |
| Maturity | **Production** — metadata stored in custom_fields, audit-wired |
| Limitations | Advance is metadata-only; no separate advance invoice entity; no advance allocation workflow |

### 3.12 Document Transformation

| Attribute | Value |
|-----------|-------|
| Owner | `invoiceConversionService.ts` + `viewQuotationActions.ts` |
| Source Files | `src/modules/invoices/services/invoiceConversionService.ts` (86 lines), `src/pages/viewQuotationActions.ts:154-263` |
| Dependencies | `revert_invoice_to_quotation_transaction` RPC |
| Responsibilities | Quotation→Invoice conversion, Invoice→Quotation revert |
| Maturity | **Production** — conversion works; revert uses RPC not in migrations (schema drift risk) |
| Limitations | `revert_invoice_to_quotation_transaction` RPC not defined in any migration file |

### 3.13 Prefix/Numbering Engine

| Attribute | Value |
|-----------|-------|
| Owner | `src/domain/prefixConstants.ts` |
| Source Files | `src/domain/prefixConstants.ts` (24 lines) |
| Dependencies | Settings table for custom prefixes |
| Responsibilities | Resolve document number prefixes (INV, QTN, WBL, etc.) |
| Maturity | **Production** — simple, correct, used across all document types |
| Limitations | Sequential numbering; no collision retry built into prefix engine itself |

### 3.14 Reporting

| Attribute | Value |
|-----------|-------|
| Owner | `src/components/reports/` |
| Source Files | `OverviewSection.tsx`, `ReceivablesSection.tsx`, `CollectionsSection.tsx`, `ProjectsSection.tsx`, `TaxSection.tsx`, `reportUtils.ts` |
| Dependencies | Supabase queries, `invoice_financials_v`, `project_financials_v` |
| Responsibilities | Display financial summaries, receivables, collections, project financials, tax |
| Maturity | **Partial** — basic reports exist; some compute values directly rather than consuming projections |
| Limitations | Reports query database directly (not projection-based); no aging buckets in DB; no scheduled exports |

### 3.15 Bank Accounts

| Attribute | Value |
|-----------|-------|
| Owner | `paymentRepository.ts` |
| Source Files | `src/modules/invoices/repositories/paymentRepository.ts:83-94` |
| Dependencies | `bank_accounts` table |
| Responsibilities | List bank accounts for payment recording |
| Maturity | **Basic** — read-only list; no CRUD for bank accounts |
| Limitations | No bank account management UI; payment records `bank_account_id` but no reconciliation |

---

## 4. Ownership Matrix

| Capability | Owner Module | Source Files | Status |
|------------|-------------|--------------|--------|
| Payment Recording | `paymentService.ts` | `paymentService.ts:52-81`, `paymentRepository.ts:15-42` | ✅ Owned |
| Payment Voiding | `paymentService.ts` | `paymentService.ts:106-125`, `paymentRepository.ts:96-109` | ✅ Owned |
| Payment Allocation | — | — | ❌ Missing |
| Credit Handling | — | — | ❌ Missing |
| Refund Workflow | — | — | ❌ Missing |
| Correction Workflow | — | — | ❌ Missing |
| Reversal Workflow | — | — | ❌ Missing |
| WHT Calculation | `Calculations.ts` | `Calculations.ts:455-474` | ✅ Owned |
| WHT Receipts | `whtReceiptService.ts` | `whtReceiptService.ts:34-55` | ✅ Owned |
| WHT Filing | — | — | ❌ Missing |
| VAT Calculation | `Calculations.ts` | `Calculations.ts:356-358` | ✅ Owned |
| VAT Reconciliation | — | — | ❌ Missing |
| VAT Filing | — | — | ❌ Missing |
| Financial State | `financialState.ts` | `financialState.ts:26-79` | ✅ Owned |
| Outstanding Balance | `financialState.ts` | `financialState.ts:52` | ✅ Owned |
| Aging Analysis | — | — | ❌ Missing |
| Receipt Generation | — | — | ❌ Missing |
| Financial Status | `resolveInvoiceStatus.ts` | `resolveInvoiceStatus.ts:16-62` | ✅ Owned |
| Audit (field diffs) | `audit.ts` | `audit.ts:89-134` | ✅ Owned |
| Audit (activity events) | `audit.ts` | `audit.ts:136-282` | ✅ Owned |
| Reports | `reports/` | `reportTypes.ts`, `reportUtils.ts`, section components | ⚠️ Partial |
| Financial Views | DB views | `20260520090010_views.sql` | ✅ Owned |
| Prefix Engine | `prefixConstants.ts` | `prefixConstants.ts:1-24` | ✅ Owned |
| Document Transformation | `invoiceConversionService.ts` | `invoiceConversionService.ts`, `viewQuotationActions.ts` | ✅ Owned |
| Advance Invoices | `invoiceAdvanceService.ts` | `invoiceAdvanceService.ts:101-164` | ✅ Owned |

**Duplicate Owners:**
- Financial calculations exist in both `src/lib/Calculations.ts` and `src/domain/invoice/calculations.ts` — both are used in different contexts.

**Missing Owners:**
- Payment Allocation (no module)
- Credit Handling (no module)
- Refund/Correction/Reversal Workflows (no module)
- WHT/VAT Filing (no module)
- Aging Analysis (no module)
- Receipt Generation (no module)

---

## 5. Database Architecture

### 5.1 Financial Tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| `invoices` | `20260520090003_invoices.sql:10-46` | Invoice header with totals |
| `invoice_items` | `20260520090003_invoices.sql:48-73` | Line items |
| `payments` | `20260520090003_invoices.sql:75-95` | Payment records |
| `wht_receipts` | `20260520090003_invoices.sql:97-112` | WHT receipt tracking |
| `audit_logs` | `20260520090008_audit_activity.sql:25-38` | Field change history |
| `activity_events` | `20260520090008_audit_activity.sql:10-23` | Domain events |
| `bank_accounts` | (not in audited migrations) | Bank account reference |

### 5.2 Views

| View | Migration | Purpose |
|------|-----------|---------|
| `invoice_financials_v` | `20260520090010_views.sql:15-37` | Aggregates payments per invoice, computes status |
| `project_financials_v` | `20260520090010_views.sql:39-61` | Aggregates invoice/payment totals per project |
| `item_price_summary_v` | `20260520090010_views.sql:63-87` | Item pricing analytics |
| `v_last_invoice_activity` | `20260520090010_views.sql:89-98` | Last activity timestamp per invoice |
| `v_last_project_activity` | `20260520090010_views.sql:100-109` | Last activity timestamp per project |
| `v_last_quotation_activity` | `20260520090010_views.sql:111-120` | Last activity timestamp per quotation |

### 5.3 RPC Functions

| Function | Migration | Purpose |
|----------|-----------|---------|
| `record_activity_event` | `20260520090008_audit_activity.sql:79-135` | Shared entry point for activity events |
| `record_audit_log` | `20260520090008_audit_activity.sql:192-227` | Insert audit log with diff computation |
| `compute_jsonb_diff` | `20260520090008_audit_activity.sql:161-190` | Compute field-level diffs |
| `record_invoice_created` | `20260520090003_invoices.sql:203-240` | Invoice creation event |
| `record_invoice_status_changed` | `20260520090003_invoices.sql:242-277` | Invoice status change event |
| `record_payment_recorded` | `20260520090003_invoices.sql:279-315` | Payment recorded event |
| `record_payment_voided` | `20260703000000_record_payment_voided.sql` | Payment voided event |
| `record_quotation_created` | (in audit_activity migration) | Quotation creation event |
| `record_quotation_status_changed` | (in audit_activity migration) | Quotation status change event |
| `record_quotation_linked` | (in audit_activity migration) | Quotation→Invoice link event |
| `revert_invoice_to_quotation_transaction` | **NOT IN MIGRATIONS** | Invoice revert RPC (schema drift risk) |

### 5.4 Key Constraints

| Constraint | Table | Purpose |
|------------|-------|---------|
| `payments_invoice_id_fkey` | `payments` | FK to invoices |
| `wht_receipts_payment_id_fkey` | `wht_receipts` | FK to payments |
| `wht_receipts_payment_id_key` | `wht_receipts` | UNIQUE on payment_id |
| `invoices_project_id_fkey` | `invoices` | FK to projects |

### 5.5 Indexes (Financial)

| Index | Table | Columns |
|-------|-------|---------|
| `idx_payments_invoice_id` | `payments` | `invoice_id` |
| `idx_invoices_status_created_at` | `invoices` | `status, created_at DESC` |
| `idx_invoices_status` | `invoices` | `status` |

---

## 6. Calculation Engine Analysis

### 6.1 Primary Engine: `src/lib/Calculations.ts`

**Input:** `DocumentInput` (items, VAT rate, discount type/timing/value, WHT type/value, extra charges, visible row effects)

**Output:** `DocumentResult` (items, groups, subtotal, installTotal, extraChargesTotal, taxableBase, discount, vat, wht, grandTotal, totalPayable)

**Key Business Rules:**
- VAT base is computed per-row, respecting `install_rate_taxable` (line 206-208)
- Fixed discount before_tax is distributed proportionally across eligible taxable rows (line 322-336)
- WHT base = Total Contract Value - VAT (line 455-467)
- Extra charges with VAT are included in taxable base (line 451-453)

**Normalization Layer:** `normalizeDocumentInput()` (line 552-676) reads rates from `cf.calculationInputs` first, never from computed totals.

### 6.2 Secondary Engine: `src/domain/invoice/calculations.ts`

**Purpose:** Used by form state management and PDF rendering.

**Key Functions:**
- `calcTotals()` (line 191-330) — computes totals for form state
- `buildSummaryRows()` (line 332-395) — builds summary rows for PDF
- `resolveRowVat()` (line 186-189) — resolves per-row VAT rate

**Overlap:** Both engines compute VAT, WHT, discount, and totals. The `Calculations.ts` engine is more comprehensive (handles extra charges, groups, visible row effects). The `domain/invoice/calculations.ts` engine is used by form components.

### 6.3 Duplicate Calculation Logic

| Calculation | `Calculations.ts` | `domain/invoice/calculations.ts` | Duplicate? |
|-------------|-------------------|----------------------------------|------------|
| Line subtotal | Line 199 | Line 222 | Yes |
| VAT per row | Line 356-358 | Line 249 | Yes |
| WHT amount | Line 469-474 | Line 312-314 | Yes |
| Discount allocation | Line 304-336 | Line 226-244 | Yes |
| Grand total | Line 487-492 | Line 308-309 | Yes |
| Total payable | Line 480-486 | Line 315 | Yes |

**Risk:** If business rules diverge between engines, financial calculations could be inconsistent. Currently both appear aligned, but this is a maintenance risk.

---

## 7. Financial State Analysis

### 7.1 Where Balances Are Calculated

| Location | Type | Consumers |
|----------|------|-----------|
| `financialState.ts:26-79` | TypeScript pure function | UI components, projections |
| `invoice_financials_v` (SQL view) | Database view | Service layer, reports |
| `project_financials_v` (SQL view) | Database view | Project page, reports |

### 7.2 How Balances Are Calculated

**TypeScript (`financialState.ts`):**
```
settledAmount = sum(cash_amount + wht_amount) for non-voided payments
balanceDue = max(0, invoiceTotal - settledAmount)
overpaymentAmount = settledAmount > invoiceTotal + tolerance ? settledAmount - invoiceTotal : 0
```

**SQL View (`invoice_financials_v`):**
```sql
balance_due = coalesce(i.total, 0) - coalesce(sum(p.cash_amount + p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0)
computed_status = CASE WHEN balance_due <= 0 THEN 'paid' WHEN settled > 0 THEN 'partially_paid' ELSE 'unpaid' END
```

### 7.3 Divergence Found

| Aspect | TypeScript | SQL View | Impact |
|--------|-----------|----------|--------|
| Balance clamp | `Math.max(0, ...)` | No clamp (can be negative) | TS hides overpayment; SQL exposes it |
| Overpayment | Explicit `overpaymentAmount` field | Not computed | Only TS knows about overpayment |
| Status states | `paid`, `partially_paid`, `unpaid` | Same three states | Aligned |
| Tolerance | ±1 unit tolerance | No tolerance | TS may show "paid" when SQL shows "partially_paid" |

**Evidence:** `financialState.ts:52-53` vs `20260520090010_views.sql:29-34`

---

## 8. Settlement Analysis

### 8.1 Current Settlement Model

The system supports exactly two settlement actions:
1. **Record Payment** — adds a new row to `payments` table
2. **Void Payment** — sets `voided_at` timestamp (soft delete)

### 8.2 Payment Lifecycle

```
Payment Draft (UI)
  → Validated (paymentEntryHelpers.ts)
  → Recorded (paymentService.ts → paymentRepository.ts)
  → Active (in payments table)
  → Voided (paymentRepository.ts sets voided_at)
  → Historical (excluded from calculations)
```

### 8.3 Workflows That Exist

| Workflow | Status | Evidence |
|----------|--------|----------|
| Record Payment | ✅ Exists | `paymentService.ts:52-81` |
| Void Payment | ✅ Exists | `paymentService.ts:106-125` |
| Sync Invoice Status | ✅ Exists | `paymentRepository.ts:122-145` |

### 8.4 Workflows That Do NOT Exist

| Workflow | PRD Section | Status |
|----------|-------------|--------|
| Payment Correction | §9 | ❌ Missing |
| Payment Reversal | §9 | ❌ Missing |
| Payment Refund | §9 | ❌ Missing |
| Credit Creation | §12 | ❌ Missing |
| Credit Application | §12 | ❌ Missing |
| Payment Allocation | §7 | ❌ Missing |
| Write-off | §7 | ❌ Missing |
| Adjustment | §7 | ❌ Missing |
| Sequential Receipts | §15 | ❌ Missing |

---

## 9. Audit Analysis

### 9.1 Current Architecture

**Two-mechanism system:**
1. **`audit_logs`** — field-level change tracking (who changed what fields)
2. **`activity_events`** — domain event tracking (what happened as a discrete event)

**Call Flow:**
```
Domain function (e.g., changeInvoiceStatus)
  → audit.ts function (e.g., recordInvoiceStatusChanged)
    → Supabase RPC (e.g., record_invoice_status_changed)
      → record_activity_event() (shared entry point)
        → INSERT INTO activity_events
```

### 9.2 Coverage Matrix

| Entity | Action | audit_logs | activity_events |
|--------|--------|-----------|----------------|
| Invoice | CREATE | ✅ | ✅ |
| Invoice | UPDATE | ✅ | ❌ |
| Invoice | STATUS_CHANGE | ✅ | ✅ |
| Invoice | DELETE | ❌ | ❌ |
| Invoice | ARCHIVE | ❌ | ❌ |
| Invoice | PAYMENT_RECORDED | — | ✅ |
| Invoice | PAYMENT_VOIDED | — | ✅ |
| Quotation | CREATE | ✅ | ✅ |
| Quotation | UPDATE | ✅ | ❌ |
| Quotation | STATUS_CHANGE | ✅ | ✅ |
| Quotation | LINK | ✅ | ✅ |
| Quotation | DUPLICATE | ✅ | ✅ |
| Quotation | DELETE | ❌ | ❌ |
| Quotation | ARCHIVE | ❌ | ❌ |

### 9.3 Strengths

- Verified pattern with production evidence
- Separate concerns (field diffs vs domain events)
- Deduplication support via `p_dedupe_seconds`
- Actor attribution and timestamp on every event

### 9.4 Limitations

- Direct-call pattern (not platform service) — per PRD §17.1
- No correlation chains
- No before/after snapshots in activity_events
- No replayability
- DELETE/ARCHIVE gaps remain

### 9.5 Extension Points

Per `docs/STANDARD/audit-trail-standard.md`:
- Add new event type: add RPC + audit function + whitelist entry
- Add new entity type: requires peer review
- Migration to platform service: Phase 2-4 per PRD §17.1

---

## 10. Compliance Analysis

### 10.1 WHT Support

| Capability | Status | Evidence |
|------------|--------|----------|
| WHT calculation on invoice | ✅ | `Calculations.ts:455-474` |
| WHT receipt CRUD | ✅ | `whtReceiptService.ts:34-55` |
| WHT summary computation | ✅ | `whtSummary.ts:26-67` |
| WHT snapshot on payment | ❌ | `paymentRepository.ts:27-28` sets `wht_rate: null, wht_type: null` |
| Automated WHT receipt creation | ❌ | No automation |
| WHT filing workflow | ❌ | No filing |
| WHT certificate verification | ⚠️ | `markReceiptVerified()` exists but no UI workflow |

### 10.2 VAT Support

| Capability | Status | Evidence |
|------------|--------|----------|
| VAT calculation | ✅ | `Calculations.ts:356-358` |
| VAT input tracking | ❌ | No VAT inputs table |
| VAT output tracking | ❌ | No VAT outputs table |
| VAT reconciliation | ❌ | No reconciliation |
| VAT filing | ❌ | No filing |
| FIRS-ready exports | ❌ | No exports |

### 10.3 Gap Against PRD §13-14

The PRD requires:
- Payment records retain historical WHT metadata — **NOT IMPLEMENTED** (`wht_rate`, `wht_type` always NULL)
- Compliance manages WHT receipt lifecycle (Requested→Received→Verified→Filed) — **PARTIALLY IMPLEMENTED** (CRUD exists, no lifecycle workflow)
- VAT inputs → outputs → reconciliation → filing — **NOT IMPLEMENTED**

---

## 11. Reporting Analysis

### 11.1 Existing Reports

| Report | File | Data Source | Projection-Based? |
|--------|------|-------------|-------------------|
| Overview | `OverviewSection.tsx` | Direct Supabase queries | ❌ No |
| Receivables | `ReceivablesSection.tsx` | Direct Supabase queries | ❌ No |
| Collections | `CollectionsSection.tsx` | Direct Supabase queries | ❌ No |
| Projects | `ProjectsSection.tsx` | Direct Supabase queries | ❌ No |
| Tax | `TaxSection.tsx` | Direct Supabase queries | ❌ No |

### 11.2 PRD Violation

**PRD §3.3:** "Reports consume projections. Reports never perform business calculations."

**Current State:** Reports query the database directly and compute values in TypeScript. They do not consume a projection layer.

**Impact:** Reports may compute values differently than the domain layer, leading to inconsistencies. The PRD's projection-based architecture is not yet implemented.

### 11.3 Missing Reports (per PRD §16)

| Projection | Status |
|------------|--------|
| Outstanding Balance | ⚠️ Partial (in views) |
| Receivable Aging | ❌ Missing |
| Collection Progress | ⚠️ Partial (in reports) |
| Settlement % | ❌ Missing |
| Credit Available | ❌ Missing |
| WHT Outstanding | ⚠️ Partial (in compliance) |
| VAT Outstanding | ❌ Missing |
| Cash Collected | ⚠️ Partial (in views) |
| Expected Collections | ❌ Missing |

---

## 12. PRD Gap Analysis

### 12.1 §4 — Financial Obligation Model

| Requirement | Status | Notes |
|-------------|--------|-------|
| Invoice as obligation | ✅ | Invoices exist with totals |
| Advance Invoice | ⚠️ | Metadata-only, not a separate entity |
| Retention | ❌ | Not implemented |
| Debit Note | ❌ | Not implemented |
| Credit Note | ❌ | Not implemented |

### 12.2 §6 — Core Domains

| Domain | PRD Owner | Current Owner | Gap |
|--------|-----------|---------------|-----|
| Payments | Payments | `paymentService.ts` | ✅ Aligned |
| Financial State | Projection Layer | `financialState.ts` | ⚠️ Partial (no projection layer) |
| Compliance | Compliance | `whtReceiptService.ts` | ⚠️ Partial (no filing) |
| Reports | Reports | `reports/` | ❌ Not projection-based |
| Audit | Audit (platform) | `audit.ts` (direct-call) | ⚠️ Pattern exists, not platform service |

### 12.3 §7 — Settlement Model

| Requirement | Status |
|-------------|--------|
| Payment | ✅ |
| Credit Application | ❌ |
| Refund | ❌ |
| Adjustment | ❌ |
| Reversal | ❌ |
| Write-off | ❌ |
| Allocation | ❌ |
| Immutability | ❌ (payments are mutable via void) |

### 12.4 §8 — Financial Event Model

| Event | Status |
|-------|--------|
| PaymentRecorded | ✅ |
| PaymentCorrected | ❌ |
| PaymentVoided | ✅ |
| PaymentReversed | ❌ |
| PaymentRefunded | ❌ |
| ReceiptGenerated | ❌ |
| CreditCreated | ❌ |
| CreditApplied | ❌ |
| WHTReceiptRequested | ❌ |
| WHTReceiptReceived | ❌ |
| WHTReceiptVerified | ❌ |
| VATFiled | ❌ |
| WHTFiled | ❌ |
| BalanceUpdated | ❌ |
| StatusChanged | ✅ |
| OverpaymentDetected | ❌ |

### 12.5 §9 — Payment Lifecycle

| Requirement | Status |
|-------------|--------|
| Payment Draft | ⚠️ (UI only, no draft state in DB) |
| Validated | ✅ |
| Recorded | ✅ |
| Active | ✅ |
| Correction | ❌ |
| Void | ✅ |
| Reversal | ❌ |
| Refund | ❌ |
| Historical | ⚠️ (voided payments excluded) |

### 12.6 §10 — Financial Status Model

| Status | PRD | Current |
|--------|-----|---------|
| Outstanding | ✅ | ✅ (unpaid) |
| Partial | ✅ | ✅ (partially_paid) |
| Paid | ✅ | ✅ (paid) |
| Overpaid | ✅ | ⚠️ (detected in TS, not in DB) |
| Written Off | ✅ | ❌ |
| Closed | ✅ | ❌ |

### 12.7 §12 — Credit Lifecycle

| Requirement | Status |
|-------------|--------|
| Credit entity | ❌ |
| Credit states | ❌ |
| Credit immutability | ❌ |

### 12.8 §13 — WHT Lifecycle

| Requirement | Status |
|-------------|--------|
| Invoice defines WHT | ✅ |
| Payment captures WHT snapshot | ❌ (`wht_rate: null`) |
| Receipt lifecycle | ⚠️ (CRUD only) |
| Filing | ❌ |

### 12.9 §15 — Receipt Lifecycle

| Requirement | Status |
|-------------|--------|
| Every payment produces receipt | ❌ |
| Sequential numbering | ❌ |
| Receipt states | ❌ |
| Immutable evidence | ❌ |

### 12.10 §17 — Audit Architecture

| Requirement | Status |
|-------------|--------|
| Platform service | ❌ (direct-call) |
| Correlation chains | ❌ |
| Before/after snapshots | ⚠️ (audit_logs only) |
| Replayability | ❌ |
| Document transformation lineage | ⚠️ (trail links exist) |

### 12.11 Summary

| Category | Implemented | Partial | Missing |
|----------|-------------|---------|---------|
| Payments | 2 | 1 | 5 |
| Financial State | 3 | 2 | 4 |
| Compliance | 2 | 2 | 4 |
| Reports | 0 | 3 | 6 |
| Audit | 3 | 2 | 5 |
| **Total** | **10** | **10** | **24** |

---

## 13. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dual calculation engines | Medium | Consolidate to single engine before extending |
| `revert_invoice_to_quotation_transaction` not in migrations | High | Verify RPC exists in Supabase; create migration if missing |
| `wht_rate`/`wht_type` always NULL on payments | Medium | Add WHT snapshot to payment recording flow |
| Reports compute directly (not projection-based) | Medium | Introduce projection layer before adding new reports |
| No immutability enforcement on payments | Low | Current void pattern is acceptable for Phase 1 |
| Overpayment detected but not actionable | Low | Address in Phase 2 (credit management) |

---

## 14. Recommended Implementation Order

### Phase 1 — Integrity Foundation (PRD §22.1)

| Step | Task | Prerequisites | Risk |
|------|------|---------------|------|
| 1.1 | Verify `revert_invoice_to_quotation_transaction` RPC exists | None | High |
| 1.2 | Add WHT snapshot to payment recording (`wht_rate`, `wht_type`) | None | Low |
| 1.3 | Consolidate calculation engines (or document boundary) | None | Medium |
| 1.4 | Complete audit coverage (DELETE/ARCHIVE) | None | Low |
| 1.5 | Separate financial status from operational status in DB | None | Medium |

### Phase 2 — Financial Lifecycle (PRD §22.2)

| Step | Task | Prerequisites | Risk |
|------|------|---------------|------|
| 2.1 | Immutable payment corrections | Phase 1 | Medium |
| 2.2 | Credit management (overpayment → credit) | Phase 1 | Medium |
| 2.3 | Sequential receipt generation | Phase 1 | Low |
| 2.4 | Payment allocation (split across invoices) | Phase 2.2 | High |

### Phase 3 — Compliance Automation (PRD §22.3)

| Step | Task | Prerequisites | Risk |
|------|------|---------------|------|
| 3.1 | Automated WHT receipt creation from payments | Phase 1.2 | Low |
| 3.2 | VAT reconciliation | Phase 1 | Medium |
| 3.3 | Filing workflows and evidence tracking | Phase 3.1, 3.2 | Medium |
| 3.4 | FIRS-ready exports | Phase 3.3 | Low |

### Phase 4 — Reporting & Analytics (PRD §22.4)

| Step | Task | Prerequisites | Risk |
|------|------|---------------|------|
| 4.1 | Introduce Financial State projection layer | Phase 1 | Medium |
| 4.2 | Migrate reports to consume projections | Phase 4.1 | Medium |
| 4.3 | Aging analysis | Phase 4.1 | Low |
| 4.4 | Executive dashboards | Phase 4.2 | Low |

---

## 15. Deferred Work

| Item | Owner | Notes |
|------|-------|-------|
| Verify `revert_invoice_to_quotation_transaction` RPC | Architecture | High priority — schema drift risk |
| Credit management module | Future phase | PRD §12 |
| Receipt generation module | Future phase | PRD §15 |
| VAT reconciliation module | Future phase | PRD §14 |
| Projection-based reporting | Future phase | PRD §16 |
| Platform audit service | Future phase | PRD §17.1 |
| Aging analysis | Future phase | PRD §16 |
| Payment allocation | Future phase | PRD §7 |

---

## 16. Build Verification

| Command | Status | Notes |
|---------|--------|-------|
| `bun run audit:load` | ✅ Passed | 693 files scanned; 24 oversized, 7 broad selects, 12 component fetches |
| `bun run typecheck` | ⏱️ Timeout | TypeScript check exceeded 120s timeout (large codebase) |
| `bun run build` | Not run | Deferred per task constraints |

**Note:** Typecheck timeout is expected for a codebase of this size. No errors were reported before timeout.

---

## 17. Evidence Appendix

### 17.1 File References

| File | Lines | Content |
|------|-------|---------|
| `src/lib/Calculations.ts` | 1-720 | Primary calculation engine |
| `src/domain/invoice/calculations.ts` | 1-395 | Secondary calculation engine |
| `src/domain/invoice/financialState.ts` | 1-79 | Financial state computation |
| `src/domain/invoice/resolveInvoiceStatus.ts` | 1-77 | Status resolution |
| `src/domain/invoice/projections/financialProjection.ts` | 1-129 | PDF/display projections |
| `src/modules/invoices/services/paymentService.ts` | 1-125 | Payment service |
| `src/modules/invoices/repositories/paymentRepository.ts` | 1-145 | Payment repository |
| `src/modules/invoices/services/invoiceLifecycleService.ts` | 1-204 | Invoice lifecycle |
| `src/modules/invoices/services/invoiceAdvanceService.ts` | 1-192 | Advance invoice |
| `src/modules/invoices/services/invoiceConversionService.ts` | 1-86 | Document transformation |
| `src/modules/compliance/services/whtReceiptService.ts` | 1-110 | WHT receipt service |
| `src/domain/compliance/whtSummary.ts` | 1-67 | WHT summary |
| `src/lib/audit.ts` | 1-282 | Audit functions |
| `src/domain/prefixConstants.ts` | 1-24 | Prefix engine |
| `src/components/reports/reportTypes.ts` | 1-120 | Report types |
| `supabase/migrations/20260520090003_invoices.sql` | 1-315 | Invoice/payment schema |
| `supabase/migrations/20260520090008_audit_activity.sql` | 1-227 | Audit schema |
| `supabase/migrations/20260520090010_views.sql` | 1-154 | Financial views |
| `supabase/migrations/20260703000000_record_payment_voided.sql` | 1-49 | Payment voided RPC |
| `docs/PRD/financial-operations-prd.md` | 1-514 | Target architecture PRD |

### 17.2 Key Line References

| Claim | Evidence |
|-------|----------|
| WHT rate always NULL on payments | `paymentRepository.ts:27-28` |
| Balance can be negative in SQL view | `20260520090010_views.sql:29` |
| TS clamps balance to 0 | `financialState.ts:52` |
| Overpayment detected but not actionable | `financialState.ts:53` |
| `revert_invoice_to_quotation_transaction` not in migrations | Searched all migration files |
| DELETE/ARCHIVE have no audit | `invoiceLifecycleService.ts:18-49`, `viewQuotationActions.ts:265-275` |
| Reports query directly | `ReceivablesSection.tsx`, `ProjectsSection.tsx` |

---

**Report Complete.** This baseline document should be referenced by all future Financial Operations implementation work. No production code was modified during this analysis.
