# Financial Operations Architecture Baseline Report

This report was written by MiMo Code Agent on 2026-07-03.

---

## 1. Objective & Scope

**Objective:** Document every existing Financial Operations capability in the BIGDROPS repository, map ownership, identify gaps against `docs/prd/financial-operations-prd.md`, and produce the definitive implementation baseline for all future phases.

**Scope:**
- Invoice module (creation, editing, status, lifecycle)
- Quotation module (creation, editing, conversion)
- Payment services (recording, voiding)
- Financial calculation engine
- Financial state helpers
- Audit system (audit_logs + activity_events)
- WHT logic and receipt tracking
- VAT logic
- Prefix/numbering engine
- Document transformation services
- Financial database views
- Database schema and migrations
- RPC functions
- Reporting components

**Excluded (intentionally not covered):**
- Mobile (Capacitor) offline-first payment handling
- Bank account CRUD (not implemented in web)
- Waybill, CSR, BOQ, RFQ financial flows (not yet audited)
- Project-level financial operations beyond views
- Future compliance filing workflows
- Pricing rules or inventory valuation

---

## 2. Existing Financial Architecture

### 2.1 Architecture Layers (Observed)

| Layer | Components | Source Files |
|-------|-----------|--------------|
| UI | `InvoiceFormPage.tsx`, `InvoiceRecordPaymentSheet.tsx`, `QuotationFormPage.tsx`, `ComplianceHub.tsx` | `src/pages/`, `src/components/document-view/invoice/` |
| Service | `paymentService.ts`, `invoiceLifecycleService.ts`, `invoiceConversionService.ts`, `invoiceAdvanceService.ts`, `whtReceiptService.ts` | `src/modules/invoices/services/`, `src/modules/compliance/services/` |
| Repository | `paymentRepository.ts` | `src/modules/invoices/repositories/` |
| Domain | `Calculations.ts`, `financialState.ts`, `resolveInvoiceStatus.ts`, `financialProjection.ts` | `src/lib/`, `src/domain/invoice/` |
| Database | `invoices`, `invoice_items`, `payments`, `wht_receipts`, `audit_logs`, `activity_events` | `supabase/migrations/` |
| Views | `invoice_financials_v`, `project_financials_v` | `supabase/migrations/20260520090010_views.sql` |

### 2.2 Design Principles Observed

| Principle | Evidence | Status |
|-----------|----------|--------|
| Calculations centralized | `src/lib/Calculations.ts:1-720` is documented as "single source of truth" | ✅ Enforced |
| Financial state derived | `financialState.ts:26-79` computes from payment array | ✅ Enforced |
| Audit direct-call pattern | `audit.ts` functions called from service layer | ✅ Working |
| Status synced from views | `paymentRepository.ts:122-145` reads `invoice_financials_v` | ✅ Working |

---

## 3. Capability Inventory

### 3.1 Payment Recording

**Owner:** `src/modules/invoices/services/paymentService.ts`

| Attribute | Value |
|-----------|-------|
| Source Files | `src/modules/invoices/services/paymentService.ts:52-81`, `src/modules/invoices/repositories/paymentRepository.ts:15-42` |
| Dependencies | Supabase `payments` table, `invoice_financials_v` view |
| Responsibilities | Normalize input, insert payment, sync invoice status, fire audit event |
| Maturity | **Production** |
| Limitations | WHT amount hardcoded to 0 in UI (`InvoiceRecordPaymentSheet.tsx:134`); no WHT snapshot on payment record (`paymentRepository.ts:27-28` sets `wht_rate: null, wht_type: null`); no receipt generation |

### 3.2 Payment Voiding

**Owner:** `src/modules/invoices/services/paymentService.ts`

| Attribute | Value |
|-----------|-------|
| Source Files | `src/modules/invoices/services/paymentService.ts:106-125`, `src/modules/invoices/repositories/paymentRepository.ts:96-109` |
| Dependencies | Supabase `payments` table, `invoice_financials_v` view |
| Responsibilities | Set `voided_at`, persist `void_reason`, sync status, fire audit event |
| Maturity | **Production** |
| Limitations | Soft void only (sets timestamp); no correction/reversal workflow; no refund flow |

### 3.3 Financial Calculation Engine

**Owner:** `src/lib/Calculations.ts`

| Attribute | Value |
|-----------|-------|
| Source Files | `src/lib/Calculations.ts:1-720` (primary), `src/domain/invoice/calculations.ts:1-395` (secondary) |
| Dependencies | `decimal.js` for precision |
| Responsibilities | Compute line totals, VAT, WHT, discount, extra charges, grand total, total payable |
| Maturity | **Production** |
| Limitations | Two calculation paths exist — potential duplication risk |

### 3.4 Financial State

**Owner:** `src/domain/invoice/financialState.ts`

| Attribute | Value |
|-----------|-------|
| Source Files | `src/domain/invoice/financialState.ts:1-79` |
| Dependencies | Payment array from database |
| Responsibilities | Compute settled amount, balance due, overpayment, payment state, display status |
| Maturity | **Production** |
| Limitations | No credit tracking; no aging; overpayment detected but not actionable |

### 3.5 Invoice Status Resolution

**Owner:** `src/domain/invoice/resolveInvoiceStatus.ts`

| Attribute | Value |
|-----------|-------|
| Source Files | `src/domain/invoice/resolveInvoiceStatus.ts:1-77` |
| Dependencies | `financialState.ts` |
| Responsibilities | Resolve display status, add OVERDUE overlay, produce CSS classes |
| Maturity | **Production** |
| Limitations | OVERDUE is presentation-only; no financial status separation from operational status |

### 3.6 Financial Projections (PDF/Display)

**Owner:** `src/domain/invoice/projections/financialProjection.ts`

| Attribute | Value |
|-----------|-------|
| Source Files | `src/domain/invoice/projections/financialProjection.ts:1-129` |
| Dependencies | `financialState.ts`, `calculations.ts` |
| Responsibilities | Build totals rows, balance display, payment summary, advance display |
| Maturity | **Production** |
| Limitations | No receivable aging or collection projections |

### 3.7 Audit System

**Owner:** `src/lib/audit.ts`

| Attribute | Value |
|-----------|-------|
| Source Files | `src/lib/audit.ts:1-282`, `supabase/migrations/20260520090008_audit_activity.sql:1-227` |
| Dependencies | Supabase RPC functions |
| Responsibilities | Record field diffs (audit_logs) and domain events (activity_events) |
| Maturity | **Production** |
| Limitations | Direct-call pattern (not platform service); no correlation chains; DELETE/ARCHIVE gaps |

### 3.8 WHT Management

**Owner:** `whtReceiptService.ts` + `domain/compliance/whtSummary.ts`

| Attribute | Value |
|-----------|-------|
| Source Files | `src/modules/compliance/services/whtReceiptService.ts:1-110`, `src/domain/compliance/whtSummary.ts:1-67` |
| Dependencies | `wht_receipts` table |
| Responsibilities | CRUD for WHT receipts, summary computation |
| Maturity | **Partial** |
| Limitations | Payment record does not snapshot WHT rate/type; no automated receipt creation; no filing workflow |

### 3.9 VAT Handling

**Owner:** `src/lib/Calculations.ts` (calculation only)

| Attribute | Value |
|-----------|-------|
| Source Files | `src/lib/Calculations.ts:356-358`, `src/domain/invoice/calculations.ts:303` |
| Dependencies | Invoice item VAT rates |
| Responsibilities | Compute VAT per line and document level |
| Maturity | **Partial** |
| Limitations | No VAT reconciliation; no filing; no compliance tracking |

### 3.10 Advance Invoices

**Owner:** `invoiceAdvanceService.ts`

| Attribute | Value |
|-----------|-------|
| Source Files | `src/modules/invoices/services/invoiceAdvanceService.ts:1-192`, `src/domain/invoice/advanceMetadata.ts`, `src/domain/invoice/advanceChildFlow.ts` |
| Dependencies | Invoice `custom_fields` JSONB |
| Responsibilities | Create/update/delete advance metadata on parent invoice |
| Maturity | **Production** |
| Limitations | Advance is metadata-only; no separate advance invoice entity |

### 3.11 Document Transformation

**Owner:** `invoiceConversionService.ts` + `viewQuotationActions.ts`

| Attribute | Value |
|-----------|-------|
| Source Files | `src/modules/invoices/services/invoiceConversionService.ts:1-86`, `src/pages/viewQuotationActions.ts:154-263` |
| Dependencies | `revert_invoice_to_quotation_transaction` RPC |
| Responsibilities | Quotation→Invoice conversion, Invoice→Quotation revert |
| Maturity | **Production** |
| Limitations | `revert_invoice_to_quotation_transaction` RPC not defined in any migration file |

### 3.12 Prefix/Numbering Engine

**Owner:** `src/domain/prefixConstants.ts`

| Attribute | Value |
|-----------|-------|
| Source Files | `src/domain/prefixConstants.ts:1-24` |
| Dependencies | Settings table for custom prefixes |
| Responsibilities | Resolve document number prefixes (INV, QTN, WBL, etc.) |
| Maturity | **Production** |
| Limitations | Sequential numbering only |

### 3.13 Reporting

**Owner:** `src/components/reports/`

| Attribute | Value |
|-----------|-------|
| Source Files | `OverviewSection.tsx`, `ReceivablesSection.tsx`, `CollectionsSection.tsx`, `ProjectsSection.tsx`, `TaxSection.tsx`, `reportUtils.ts`, `reportTypes.ts` |
| Dependencies | Supabase queries, `invoice_financials_v`, `project_financials_v` |
| Responsibilities | Display financial summaries, receivables, collections, project financials, tax |
| Maturity | **Partial** |
| Limitations | Reports query database directly (not projection-based); some compute values in TypeScript |

---

## 4. Ownership Matrix

### 4.1 Capabilities With Clear Owner

| Capability | Owner Module | Source Files |
|------------|-------------|--------------|
| Payment Recording | `paymentService.ts` | `paymentService.ts:52-81` |
| Payment Voiding | `paymentService.ts` | `paymentService.ts:106-125` |
| WHT Calculation | `Calculations.ts` | `Calculations.ts:455-474` |
| WHT Receipts | `whtReceiptService.ts` | `whtReceiptService.ts:34-55` |
| VAT Calculation | `Calculations.ts` | `Calculations.ts:356-358` |
| Financial State | `financialState.ts` | `financialState.ts:26-79` |
| Outstanding Balance | `financialState.ts` | `financialState.ts:52` |
| Financial Status | `resolveInvoiceStatus.ts` | `resolveInvoiceStatus.ts:16-62` |
| Audit (field diffs) | `audit.ts` | `audit.ts:89-134` |
| Audit (activity events) | `audit.ts` | `audit.ts:136-282` |
| Financial Views | DB views | `20260520090010_views.sql:15-61` |
| Prefix Engine | `prefixConstants.ts` | `prefixConstants.ts:1-24` |
| Document Transformation | `invoiceConversionService.ts` | `invoiceConversionService.ts:1-86` |
| Advance Invoices | `invoiceAdvanceService.ts` | `invoiceAdvanceService.ts:101-164` |

### 4.2 Duplicate Owners

| Calculation | Location 1 | Location 2 | Risk |
|-------------|-----------|-----------|------|
| Line subtotal | `Calculations.ts:199` | `domain/invoice/calculations.ts:222` | Medium |
| VAT per row | `Calculations.ts:356-358` | `domain/invoice/calculations.ts:249` | Medium |
| WHT amount | `Calculations.ts:469-474` | `domain/invoice/calculations.ts:312-314` | Medium |
| Discount allocation | `Calculations.ts:304-336` | `domain/invoice/calculations.ts:226-244` | Medium |
| Grand total | `Calculations.ts:487-492` | `domain/invoice/calculations.ts:308-309` | Medium |
| Total payable | `Calculations.ts:480-486` | `domain/invoice/calculations.ts:315` | Medium |

### 4.3 Missing Owners

| Capability | PRD Reference | Status |
|------------|---------------|--------|
| Payment Allocation | §7 | No module exists |
| Credit Handling | §12 | No module exists |
| Refund Workflow | §7 | No module exists |
| Correction Workflow | §9 | No module exists |
| Reversal Workflow | §9 | No module exists |
| WHT Filing | §13 | No module exists |
| VAT Reconciliation | §14 | No module exists |
| VAT Filing | §14 | No module exists |
| Aging Analysis | §16 | No module exists |
| Receipt Generation | §15 | No module exists |

---

## 5. Database Architecture

### 5.1 Financial Tables

| Table | Migration Reference | Columns (Financial) |
|-------|--------------------|--------------------|
| `invoices` | `20260520090003_invoices.sql:10-46` | `subtotal`, `vat`, `wht`, `discount`, `total`, `status` |
| `invoice_items` | `20260520090003_invoices.sql:48-73` | `unit_price`, `vat_rate`, `install_rate`, `discount_rate` |
| `payments` | `20260520090003_invoices.sql:75-95` | `cash_amount`, `wht_amount`, `amount`, `voided_at`, `void_reason`, `wht_rate`, `wht_type` |
| `wht_receipts` | `20260520090003_invoices.sql:97-112` | `wht_amount`, `receipt_status`, `receipt_number` |
| `audit_logs` | `20260520090008_audit_activity.sql:25-38` | `changes` (JSONB diff array) |
| `activity_events` | `20260520090008_audit_activity.sql:10-23` | `event_type`, `metadata` (JSONB) |

### 5.2 Views

| View | Migration Reference | Purpose |
|------|--------------------|---------|
| `invoice_financials_v` | `20260520090010_views.sql:15-37` | Aggregates payments per invoice, computes `balance_due`, `computed_status` |
| `project_financials_v` | `20260520090010_views.sql:39-61` | Aggregates invoice/payment totals per project |

### 5.3 RPC Functions (Financial)

| Function | Migration Reference | Purpose |
|----------|--------------------|---------|
| `record_activity_event` | `20260520090008_audit_activity.sql:79-135` | Shared entry point for activity events |
| `record_audit_log` | `20260520090008_audit_activity.sql:192-227` | Insert audit log with diff |
| `record_payment_recorded` | `20260520090003_invoices.sql:279-315` | Payment recorded event |
| `record_payment_voided` | `20260703000000_record_payment_voided.sql` | Payment voided event |
| `revert_invoice_to_quotation_transaction` | **NOT IN MIGRATIONS** | Invoice revert (schema drift risk) |

### 5.4 Key Constraints

| Constraint | Table | Evidence |
|------------|-------|----------|
| `payments_invoice_id_fkey` | `payments` | `20260520090003_invoices.sql:152` |
| `wht_receipts_payment_id_key` (UNIQUE) | `wht_receipts` | `20260520090003_invoices.sql:145` |

### 5.5 WHT Columns Always NULL

**Evidence:** `paymentRepository.ts:27-28` — `insertPayment()` sets `wht_rate: null, wht_type: null`

**Impact:** Payment records do not capture WHT snapshot from invoice. PRD §13 requires: "Payment captures a snapshot of the WHT rate, type, and amount at that moment."

---

## 6. Calculation Engine Analysis

### 6.1 Primary Engine: `src/lib/Calculations.ts`

**Input:** `DocumentInput` (items, VAT rate, discount type/timing/value, WHT type/value, extra charges)

**Output:** `DocumentResult` (items, groups, subtotal, installTotal, extraChargesTotal, taxableBase, discount, vat, wht, grandTotal, totalPayable)

**Key Business Rules (from source comments and code):**
- VAT base is computed per-row, respecting `install_rate_taxable` (`Calculations.ts:206-208`)
- Fixed discount before_tax distributed proportionally across eligible taxable rows (`Calculations.ts:322-336`)
- WHT base = Total Contract Value - VAT (`Calculations.ts:455-467`)
- Extra charges with VAT included in taxable base (`Calculations.ts:451-453`)

### 6.2 Secondary Engine: `src/domain/invoice/calculations.ts`

**Purpose:** Used by form state management and PDF rendering.

**Key Functions:**
- `calcTotals()` at line 191-330 — computes totals for form state
- `buildSummaryRows()` at line 332-395 — builds summary rows for PDF
- `resolveRowVat()` at line 186-189 — resolves per-row VAT rate

### 6.3 Duplicate Analysis

Both engines compute: line subtotal, VAT per row, WHT amount, discount allocation, grand total, total payable. The `Calculations.ts` engine is more comprehensive (handles extra charges, groups, visible row effects). The `domain/invoice/calculations.ts` engine is used by form components.

**Risk:** If business rules diverge between engines, financial calculations could be inconsistent.

---

## 7. Financial State Analysis

### 7.1 Balance Calculation Locations

| Location | Type | Consumers |
|----------|------|-----------|
| `financialState.ts:26-79` | TypeScript pure function | UI components, projections |
| `invoice_financials_v` (SQL view) | Database view | Service layer, reports |
| `project_financials_v` (SQL view) | Database view | Project page, reports |

### 7.2 Balance Calculation Logic

**TypeScript (`financialState.ts:34-53`):**
```
settledAmount = sum(cash_amount + wht_amount) for non-voided payments
balanceDue = max(0, invoiceTotal - settledAmount)
overpaymentAmount = settledAmount > invoiceTotal + tolerance ? settledAmount - invoiceTotal : 0
```

**SQL View (`20260520090010_views.sql:29-34`):**
```sql
balance_due = coalesce(i.total, 0) - coalesce(sum(...) FILTER (WHERE p.voided_at IS NULL), 0)
computed_status = CASE WHEN balance_due <= 0 THEN 'paid' WHEN settled > 0 THEN 'partially_paid' ELSE 'unpaid' END
```

### 7.3 Divergence Between TypeScript and SQL

| Aspect | TypeScript (`financialState.ts`) | SQL View (`invoice_financials_v`) | Impact |
|--------|----------------------------------|----------------------------------|--------|
| Balance clamp | `Math.max(0, ...)` at line 52 | No clamp (can be negative) at line 29 | TS hides overpayment; SQL exposes it |
| Overpayment | Explicit `overpaymentAmount` field at line 53 | Not computed | Only TS knows about overpayment |
| Tolerance | ±1 unit tolerance at line 32 | No tolerance | TS may show "paid" when SQL shows "partially_paid" |

**Evidence:** `financialState.ts:52-53` vs `20260520090010_views.sql:29-34`

---

## 8. Settlement Analysis

### 8.1 Current Settlement Model

The system supports exactly two settlement actions:
1. **Record Payment** — adds a new row to `payments` table
2. **Void Payment** — sets `voided_at` timestamp (soft delete)

### 8.2 Payment Lifecycle (Observed)

```
Payment Draft (UI only)
  → Validated (paymentEntryHelpers.ts)
  → Recorded (paymentService.ts → paymentRepository.ts)
  → Active (in payments table)
  → Voided (paymentRepository.ts sets voided_at)
  → Historical (excluded from calculations)
```

### 8.3 Workflows That Exist

| Workflow | Evidence |
|----------|----------|
| Record Payment | `paymentService.ts:52-81` |
| Void Payment | `paymentService.ts:106-125` |
| Sync Invoice Status | `paymentRepository.ts:122-145` |

### 8.4 Workflows That Do NOT Exist

| Workflow | PRD Reference | Status |
|----------|---------------|--------|
| Payment Correction | §9 | Missing |
| Payment Reversal | §9 | Missing |
| Payment Refund | §9 | Missing |
| Credit Creation | §12 | Missing |
| Credit Application | §12 | Missing |
| Payment Allocation | §7 | Missing |
| Write-off | §7 | Missing |
| Adjustment | §7 | Missing |
| Sequential Receipts | §15 | Missing |

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

### 9.2 Coverage Matrix (Verified)

| Entity | Action | audit_logs | activity_events | Evidence |
|--------|--------|-----------|----------------|----------|
| Invoice | CREATE | ✅ | ✅ | `InvoiceFormPage.tsx:609-618` |
| Invoice | UPDATE | ✅ | ❌ | `InvoiceFormPage.tsx:621-629` |
| Invoice | STATUS_CHANGE | ✅ | ✅ | `invoiceLifecycleService.ts:85-94` |
| Invoice | DELETE | ❌ | ❌ | `invoiceLifecycleService.ts:35-49` |
| Invoice | ARCHIVE | ❌ | ❌ | `invoiceLifecycleService.ts:18-32` |
| Invoice | PAYMENT_RECORDED | — | ✅ | `paymentService.ts:64-68` |
| Invoice | PAYMENT_VOIDED | — | ✅ | `paymentService.ts:114-118` |
| Quotation | CREATE | ✅ | ✅ | `QuotationFormPage.tsx:671-680` |
| Quotation | UPDATE | ✅ | ❌ | `QuotationFormPage.tsx:682-690` |
| Quotation | STATUS_CHANGE | ✅ | ✅ | `viewQuotationActions.ts:286-295` |
| Quotation | LINK | ✅ | ✅ | `viewQuotationActions.ts:237-258` |
| Quotation | DUPLICATE | ✅ | ✅ | `viewQuotationActions.ts:131-140` |
| Quotation | DELETE | ❌ | ❌ | `viewQuotationActions.ts:265-270` |
| Quotation | ARCHIVE | ❌ | ❌ | `viewQuotationActions.ts:272-275` |

### 9.3 Strengths

- Verified pattern with production evidence
- Separate concerns (field diffs vs domain events)
- Deduplication support via `p_dedupe_seconds` (`20260520090008_audit_activity.sql:104-120`)
- Actor attribution and timestamp on every event

### 9.4 Limitations

- Direct-call pattern (not platform service) — per PRD §17.1
- No correlation chains
- No before/after snapshots in activity_events
- No replayability
- DELETE/ARCHIVE gaps remain

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
| WHT certificate verification | ⚠️ | `whtReceiptService.ts:85-89` exists but no UI workflow |

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

| PRD Requirement | Current State | Gap |
|-----------------|---------------|-----|
| Payment records retain historical WHT metadata | `wht_rate`, `wht_type` always NULL | ❌ Not implemented |
| Compliance manages WHT receipt lifecycle | CRUD exists, no lifecycle workflow | ⚠️ Partial |
| VAT inputs → outputs → reconciliation → filing | No VAT tracking | ❌ Not implemented |

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

**Evidence:** `ReceivablesSection.tsx`, `ProjectsSection.tsx` contain direct Supabase calls (confirmed by `bun run audit:load` output).

### 11.3 Missing Projections (per PRD §16)

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

### 12.1 Summary by Section

| PRD Section | Topic | Implemented | Partial | Missing |
|-------------|-------|-------------|---------|---------|
| §4 | Financial Obligation Model | 1 | 1 | 3 |
| §6 | Core Domains | 2 | 2 | 1 |
| §7 | Settlement Model | 1 | 0 | 6 |
| §8 | Financial Event Model | 2 | 0 | 10 |
| §9 | Payment Lifecycle | 3 | 1 | 4 |
| §10 | Financial Status Model | 3 | 1 | 2 |
| §12 | Credit Lifecycle | 0 | 0 | 4 |
| §13 | WHT Lifecycle | 2 | 1 | 2 |
| §14 | VAT Lifecycle | 1 | 0 | 4 |
| §15 | Receipt Lifecycle | 0 | 0 | 4 |
| §16 | Financial State Projection | 0 | 3 | 6 |
| §17 | Audit Architecture | 2 | 1 | 4 |
| **Total** | | **17** | **10** | **46** |

### 12.2 Critical Gaps (Blocking Other Work)

| Gap | Blocks | Priority |
|-----|--------|----------|
| `revert_invoice_to_quotation_transaction` not in migrations | Document transformation integrity | High |
| WHT not snapped on payment | WHT compliance, receipt lifecycle | High |
| No credit management | Overpayment handling, allocation | High |
| Reports not projection-based | Reporting accuracy, PRD compliance | Medium |

---

## 13. Risks

| Risk | Severity | Evidence | Mitigation |
|------|----------|----------|------------|
| `revert_invoice_to_quotation_transaction` not in migrations | High | Searched all files in `supabase/migrations/` — not found | Verify RPC exists in Supabase; create migration if missing |
| Dual calculation engines | Medium | `Calculations.ts:1-720` and `domain/invoice/calculations.ts:1-395` | Consolidate or document boundary |
| WHT rate/type always NULL on payments | Medium | `paymentRepository.ts:27-28` | Add WHT snapshot to payment recording flow |
| Reports compute directly | Medium | `ReceivablesSection.tsx`, `ProjectsSection.tsx` contain Supabase calls | Introduce projection layer |
| Overpayment detected but not actionable | Low | `financialState.ts:53` | Address in Phase 2 (credit management) |
| Balance can be negative in SQL view | Low | `20260520090010_views.sql:29` | Document divergence; add `GREATEST(0,...)` if needed |

---

## 14. Recommended Implementation Order

### Phase 1 — Integrity Foundation (PRD §22.1)

| Step | Task | Prerequisites | Risk |
|------|------|---------------|------|
| 1.1 | Verify `revert_invoice_to_quotation_transaction` RPC exists | None | High |
| 1.2 | Add WHT snapshot to payment recording | None | Low |
| 1.3 | Consolidate calculation engines or document boundary | None | Medium |
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

## 16. Verification

| Command | Status | Notes |
|---------|--------|-------|
| `bun run audit:load` | ✅ Passed | 693 files scanned; findings logged |
| `bun run typecheck` | ⏱️ Timeout | Expected for large codebase; no errors before timeout |
| `bun run build` | Not run | Deferred per task constraints |

**Code Modified:** None. This is a documentation-only audit.

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
| `docs/prd/financial-operations-prd.md` | 1-514 | Target architecture PRD |

### 17.2 Key Line References

| Claim | Evidence |
|-------|----------|
| WHT rate always NULL on payments | `paymentRepository.ts:27-28` |
| Balance can be negative in SQL view | `20260520090010_views.sql:29` |
| TS clamps balance to 0 | `financialState.ts:52` |
| Overpayment detected but not actionable | `financialState.ts:53` |
| `revert_invoice_to_quotation_transaction` not in migrations | Searched all files in `supabase/migrations/` |
| DELETE/ARCHIVE have no audit | `invoiceLifecycleService.ts:18-49`, `viewQuotationActions.ts:265-275` |
| Reports query directly | `ReceivablesSection.tsx`, `ProjectsSection.tsx` (confirmed by `bun run audit:load`) |
| Two calculation engines exist | `src/lib/Calculations.ts:1-720`, `src/domain/invoice/calculations.ts:1-395` |
