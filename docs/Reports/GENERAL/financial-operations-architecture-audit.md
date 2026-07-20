# Financial Operations Architecture Audit

This report was written by DeepSeek on 2026-07-03.

---

## 1. Objective & Scope

### Objective
Audit the BIGDROPS Financial Operations ecosystem — Payments, Reports, Compliance Hub, and Audit Trail — as one interconnected business system. Assess architectural integrity, data flow correctness, ownership boundaries, and readiness for Nigerian regulatory workflows.

### What is Intentionally Excluded
- Frontend UI polish, responsive behaviour, and component styling
- Non-financial document types (BOQ, RFQ, CSR, Waybill — except where they intersect with financial operations)
- Item catalog pricing logic (`item_price_summary_v`)
- Authentication/authorization architecture
- Performance benchmarking or load testing
- Mobile (Capacitor) build specifics
- Receipts module (identified as absent; see Findings §20)

### Systems Under Audit
| System | Primary Code Location | Primary Tables |
|---|---|---|
| Payments | `src/modules/invoices/services/paymentService.ts`, `src/modules/invoices/repositories/paymentRepository.ts`, `src/domain/invoice/financialState.ts` | `payments`, `wht_receipts` |
| Reports | `src/pages/Reports.tsx`, `src/components/reports/reportUtils.ts` | `invoice_financials_v`, `project_financials_v` |
| Compliance Hub | `src/pages/ComplianceHub.tsx`, `src/domain/compliance/`, `src/modules/compliance/` | `tax_settings`, `tax_input_entries`, `tax_filings`, `tax_reminders`, `wht_receipts` |
| Audit Trail | `src/lib/audit.ts`, `src/domain/audit/` | `audit_logs`, `activity_events` |

---

## 2. Evidence Sources

### Files read in full (non-exhaustive list)
| File | Lines | Purpose |
|---|---|---|
| `src/lib/audit.ts` | 269 | Central audit service, 9 convenience functions |
| `src/domain/invoice/financialState.ts` | 79 | Calculates payment state from payments records |
| `src/domain/invoice/resolveInvoiceStatus.ts` | 77 | Presentation-layer status resolver with OVERDUE |
| `src/domain/invoice/actions.js` | 149 | Invoice detail/list action definitions |
| `src/domain/invoice/advanceProjection.invariant.ts` | 71 | Advance invoice architectural invariants |
| `src/domain/documentActionState.js` | 26 | Project/document action state logic |
| `src/domain/prefixConstants.ts` | 24 | Prefix resolution engine |
| `src/components/reports/reportUtils.ts` | 192 | Report utility functions (tax aggregation, aging, status) |
| `src/domain/compliance/types.ts` | 261 | Compliance domain type definitions |
| `src/domain/compliance/whtSummary.ts` | 67 | WHT summary computation |
| `src/domain/compliance/import/contracts.ts` | ~200 | JSON import contracts for WHT, VAT, tax filings |
| `src/modules/compliance/services/whtReceiptService.ts` | ~200 | WHT receipt CRUD, file upload |
| `src/modules/compliance/services/taxFilingService.ts` | ~100 | Tax filing CRUD with status transitions |
| `src/modules/compliance/services/taxInputService.ts` | ~80 | VAT input entry CRUD |
| `src/components/compliance/WhtReceiptsPanel.tsx` | ~550 | WHT receipts UI with full CRUD |
| `src/pages/ComplianceHub.tsx` | ~100 | Compliance dashboard with 5 tabs + settings |
| `src/modules/invoices/services/paymentService.ts` | ~150 | Payment recording, normalization, voiding |
| `src/modules/invoices/repositories/paymentRepository.ts` | ~80 | Direct Supabase payment queries |
| `src/pages/Reports.tsx` | ~300 | Reports page (receivables, tax, projects tabs) |

### Migrations read
| Migration | Tables Created |
|---|---|
| `20260520090001_projects.sql` | `projects`, `project_documents` |
| `20260520090003_invoices.sql` | `invoices`, `invoice_items`, `payments`, `wht_receipts` |
| `20260520090004_csrs.sql` | `csrs`, `waybills`, `blank_waybill_logs` |
| `20260520090009_tax.sql` | `tax_settings`, `tax_input_entries`, `tax_filings`, `tax_reminders` |
| `20260520090010_views.sql` | `invoice_financials_v`, `project_financials_v`, `item_price_summary_v`, `v_last_invoice_activity`, `v_last_project_activity`, `v_last_quotation_activity` |
| Audit migrations | `audit_logs`, `activity_events`, associated RPC functions |

---

## 3. Raw Findings

### 3.1 Payments Architecture

#### Data Flow
```
InvoiceRecordPaymentSheet (UI)
  → paymentService.recordInvoicePayment({ invoiceId, cashAmount, whtAmount, ... })
    → paymentRepository.insertPayment({ invoice_id, cash_amount, wht_amount, ... })
      → supabase.from('payments').insert(...)
    → recordPaymentRecorded() → supabase.rpc('record_payment_recorded')
      → activity_events table (PAYMENT_RECORDED event)
```

#### Schema (payments table, 15 columns)
| Column | Type | Always Set? | Notes |
|---|---|---|---|
| `id` | uuid | auto | PK |
| `invoice_id` | uuid | yes | FK → invoices(id) |
| `amount` | numeric | yes | Deprecated — always = `cash_amount` |
| `cash_amount` | numeric | yes | Primary cash field (default 0) |
| `wht_amount` | numeric | yes | Primary WHT field (default 0) |
| `wht_rate` | numeric | **no** | Always null; column exists but never populated |
| `wht_type` | text | **no** | Always null; column exists but never populated |
| `wht_certificate_ref` | text | sometimes | Populated when user provides certificate ref |
| `date` | date | yes | Payment date |
| `method` | text | sometimes | Payment method string |
| `reference` | text | sometimes | Payment reference |
| `notes` | text | sometimes | Free text |
| `voided_at` | timestamptz | sometimes | Soft-delete timestamp |
| `void_reason` | text | sometimes | Reason for voiding |
| `bank_account_id` | uuid | sometimes | FK → bank_accounts |
| `currency_code` | text | yes | Default 'NGN' |
| `recorded_by` | uuid | sometimes | FK → auth.users |
| `source` | text | yes | 'live' or 'import' |

#### Key Finding: Payment normalization in `paymentService.ts`
```typescript
// paymentService.ts — normalizePaymentInput()
cash_amount: Number(input.cash_amount ?? input.amount ?? 0),
wht_amount: Number(input.wht_amount ?? 0),
wht_rate: null,     // Always hardcoded to null
wht_type: null,     // Always hardcoded to null
```
The `wht_rate` and `wht_type` columns exist in the schema but the application always sets them to `null`. This means any downstream system (reports, compliance) cannot derive the WHT rate from the payment record itself — it must look up the parent invoice's WHT configuration.

#### Payment State Calculation (`financialState.ts`)

```typescript
// Core logic:
const cash = Number(p.cash_amount ?? p.amount ?? 0)  // Fallback to deprecated amount field
const wht = Number(p.wht_amount ?? 0)
const settledAmount = cashReceived + whtSettled
const balanceDue = Math.max(0, invoiceTotal - settledAmount)  // Clamped to 0
const overpaymentAmount = settledAmount > invoiceTotal + tolerance ? settledAmount - invoiceTotal : 0
const tolerance = 1  // Default tolerance in Naira
```

**Mismatch with `invoice_financials_v` view:** The view does `coalesce(i.total, 0) - coalesce(sum(p.cash_amount + p.wht_amount), 0)` — raw subtraction without clamping or tolerance. This means:
- `financialState.ts` reports `balanceDue = 0` for overpayments (clamped) and exposes `overpaymentAmount`
- `invoice_financials_v` reports negative `balance_due` for overpayments and has no overpayment field
- Reports page, dashboard, and client detail all use the view directly, so they see negative balances but no overpayment signal

#### Void Payment Gap
`voidInvoicePayment()` in `paymentService.ts`:
```typescript
// Sets voided_at, but NEVER calls recordPaymentVoided()
// No audit trail for payment voiding
```
The corresponding audit function `recordPaymentVoided()` does not exist anywhere in `src/lib/audit.ts`. Only `recordPaymentRecorded()` exists (for payment creation).

### 3.2 Reports Architecture

#### Data Sources by Tab
| Tab | Source | Filter Location |
|---|---|---|
| Overview | `invoice_financials_v` | SQL (supabase.from().select) |
| Receivables | `invoice_financials_v` | SQL + client-side range check |
| Collections | `payments` table (direct) | SQL join to invoices |
| Tax | `invoice_financials_v` + `payments` table | SQL |
| Projects | `project_financials_v` | SQL |

#### Tax Metrics Computation (`reportUtils.ts:16-31`)
```typescript
// Ownership violation: Domain logic in UI layer
computeReportTaxMetrics(invoices, payments)
  vatChargedValue = Σ invoices.vat
  expectedWhtExposureValue = Σ invoices.wht
  actualWhtDeductedValue = Σ payments.wht_amount
  vatLessActualWhtValue = vatChargedValue - actualWhtDeductedValue
```
This is a pure frontend aggregation. The same logic exists in the domain layer (`whtSummary.ts`) for Compliance Hub. Neither calls the other — the logic is duplicated.

#### Aging Buckets (`reportUtils.ts:97-108`)
```typescript
getAgingBucket(dueDate):
  <=0 days past due: "Current"
  1-30 days: "1–30"
  31-60 days: "31–60"
  61+: "61+"
```
Aging is computed client-side in the UI layer, not in SQL or a domain service. Same pattern as `getReceivableStatus()` (line 82).

#### Dashboard Data Sources (3 parallel paths)
| Path | Location | Source | Compute |
|---|---|---|---|
| `variant='overview'` | `useDashboardData.ts:479` | RPC `get_dashboard_financial_metrics` | Server-side aggregate |
| `variant='classic'` | `useDashboardData.ts:364` | `invoice_financials_v` (client reduce) | Client-side re-aggregation |
| Cache seed | `useDashboardData.ts:300-328` | `readDashboardCache` (localStorage, 2min TTL) | Stored previous result |

### 3.3 Compliance Hub Architecture

#### Schema (5 tables)
| Table | Key Columns | FK Links |
|---|---|---|
| `wht_receipts` | `payment_id`, `invoice_id`, `wht_rate`, `wht_amount`, `receipt_status`, `receipt_file_url` | → payments(id), → invoices(id) |
| `tax_settings` | `tin`, `vat_enabled`, `vat_threshold`, `notes` | → settings(id) |
| `tax_input_entries` | `date`, `vendor_name`, `category`, `net_amount`, `vat_amount`, `is_recoverable` | → settings(id) |
| `tax_filings` | `tax_type`, `period_start/end`, `amount_due`, `amount_paid`, `status` | → settings(id), self-ref `linked_filing_id` |
| `tax_reminders` | `tax_type`, `due_date`, `status` | → settings(id), → tax_filings(id) |

#### What Works
- 5-tab hub: Overview, WHT Receipts, VAT Inputs, Tax Filings, Reminders, Settings
- WHT Receipt CRUD with file upload to Supabase Storage (`compliance` bucket)
- Tax filing CRUD with status transitions (draft → submitted → filed)
- VAT input entry management
- JSON import support (WHT receipts, VAT inputs, tax filings) per `docs/standard/json-import-standard.md`
- Fire-and-forget WHT receipt creation on the WHT Receipts panel
- Compliance overview using RPC `get_compliance_summary`

#### What Does NOT Exist
- No `document-column-standard.md` config support for compliance records
- No document lifecycle (no state machine, no revert, no duplicate — compliance records are standalone)
- No PDF generation for compliance documents
- No audit trail integration (compliance operations are never logged to `audit_logs` or `activity_events`)

#### WHT Receipt Creation Flow
```
WhtReceiptsPanel → whtReceiptService.createWhtReceipt() → supabase.from('wht_receipts').insert()
```
This is a fire-and-forget operation. There is no linkage between the payment recording flow and WHT receipt creation:
- Payment recording (`InvoiceRecordPaymentSheet`) does not auto-create a WHT receipt
- The sheet explicitly hardcodes `whtDeducted: 0` for the search/selection phase
- User must proactively go to Compliance Hub and create WHT receipts manually

### 3.4 Audit Trail Architecture

#### Two Parallel Systems

**System 1: `audit_logs` (main UI-facing trail)**
- JSONB `changes` array (computed via `compute_jsonb_diff`)
- 1 RLS policy, 4 indexes
- Accessed via `recordAuditLog()` in `src/lib/audit.ts`
- Action types: CREATE, UPDATE, DELETE, STATUS_CHANGE, LINK, UNLINK
- Entity types: invoice, quotation, project (typed as `AuditEntityType`)
- **No CHECK constraints** on `action` or `entity_type` — accepts any string

**System 2: `activity_events` (secondary, DB-function-triggered)**
- JSONB `metadata` field
- 4 RLS policies, 5 indexes
- Accessed via `record_activity_event()` PL/pgSQL function
- Used by dedicated RPC functions: `record_invoice_created`, `record_invoice_status_changed`, `record_payment_recorded`, `record_quotation_created`, `record_quotation_status_changed`, `record_quotation_linked`, `record_project_updated`, `record_project_note_added`, `record_project_linked_activity`

#### Audit Coverage Matrix

| Entity | CREATE | UPDATE | STATUS_CHANGE | DELETE | LINK/UNLINK | PAYMENT |
|---|---|---|---|---|---|---|
| Invoice | ✅ | ✅ | ✅ | ❌ hard-delete | ✅ | ✅ (PAYMENT_RECORDED) |
| Quotation | ✅ | ✅ | ✅ | ❌ | ✅ (linked) | N/A |
| Project | ✅ | ✅ | ❌ | ❌ | ✅ (linked activity) | N/A |
| Payment | N/A | N/A | N/A | ❌ (void audit missing) | N/A | ✅ (via recordPaymentRecorded) |
| WHT Receipt | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| CSR | ❌ | ❌ | ❌ | ❌ | ❌ | N/A |
| Waybill | ❌ | ❌ | ❌ | ❌ | ❌ | N/A |
| BOQ | ❌ | ❌ | ❌ | ❌ | ❌ | N/A |
| RFQ | ❌ | ❌ | ❌ | ❌ | ❌ | N/A |

### 3.5 Nigerian Regulatory References

The codebase contains Nigerian-specific financial and regulatory references:
- Currency: `formatNaira()` used throughout, `currency_code` default `'NGN'` in payments table
- Date locale: `'en-NG'` used in report date formatting
- Tax types in Compliance Hub: tax_filings `tax_type` field includes WHT and VAT
- FIRS reference numbers: placeholder strings in Compliance Hub UI panels (e.g., `"e.g. FIRS-2025-001"`, `"e.g. FIRS-WHT-2025-001"`, `"e.g. FIRS-12345"`)
- No formal Nigerian tax authority integration (no FIRS API, no automated return preparation, no pre-filled tax forms)

---

## 4. Fact vs. Conclusion

### Facts (Directly Observed)

1. `financialState.ts` clamps balance_due to 0 with tolerance of 1 Naira; `invoice_financials_v` does not clamp
2. `paymentService.ts` always sets `wht_rate: null` and `wht_type: null` in `normalizePaymentInput()`
3. `recordPaymentVoided()` function does not exist anywhere in `src/lib/audit.ts`
4. `computeReportTaxMetrics()` in `reportUtils.ts:16-31` is a pure frontend function duplicating domain logic
5. Compliance Hub has 5 database tables with no audit trail, no document column config, and no document lifecycle
6. `wht_receipts` table has `wht_rate` and `wht_amount` columns, but no application code creates WHT receipts during payment recording
7. The `paymentService.recordInvoicePayment()` function calls `recordPaymentRecorded()` (audit), but `voidInvoicePayment()` does not call any audit function
8. `getAgingBucket()` and `getReceivableStatus()` in `reportUtils.ts` are client-side functions duplicating domain logic
9. 15 migration files define the full schema; no `invoices.status` CHECK constraint exists
10. The `invoices.status` column defaults to `'unpaid'` but is never read by `resolveInvoiceStatus.ts` — it is derived from payments
11. Dashboard has 3 parallel data sources (RPC, view, localStorage cache) with inconsistent aggregation
12. Project documents type includes `'receipt'` as a valid `ProjectDocumentType` value

### Conclusions (Interpretations)

1. **WHT decoupling is architectural, not accidental.** The payment recording UI explicitly separates cash and WHT tracking, directing users to Compliance Hub post-payment. This is a conscious design decision to maintain payment recording simplicity.

2. **Financial state derivation is bifurcated.** `financialState.ts` (domain layer, with tolerance + overpayment detection) and `invoice_financials_v` (SQL view, raw subtraction) serve different consumers but produce inconsistent results for overpayments. Reports and dashboards use the view; invoice detail views use the domain function.

3. **The compliance module is a standalone SQL-backed CRUD app.** It does not participate in document lifecycle, audit trails, or project tracking. It operates independently, linked only by foreign keys from `wht_receipts` to `payments` and `invoices`.

4. **Audit coverage is comprehensive for core documents but absent for financial compliance operations.** Invoice and quotation operations are heavily audited. But payment voiding, WHT receipt creation, and all compliance CRUD operations leave no audit trail.

5. **Nigerian regulatory workflows are underdeveloped.** The UI contains placeholder references to FIRS, but no automated tax preparation, no TIN validation, no VAT return calculation, and no pre-filled forms exist. Compliance relies entirely on manual user entry.

---

## 5. Cross-System Data Flow Map

```
┌──────────────────────────────────────────────────────────────────┐
│                      PAYMENTS SYSTEM                             │
│                                                                  │
│  RecordPaymentModal → paymentService → paymentRepository         │
│       │                    │                                        │
│       │ cash_amount +      │ wht_rate: null                      │
│       │ wht_amount         │ wht_type: null                      │
│       ▼                    ▼                                        │
│  payments table         audit: recordPaymentRecorded()           │
│  (voided_at soft-delete)                                          │
│       │                                                          │
│       ▼                                                          │
├──────────────────────────────────────────────────────────────────┤
│                      FINANCIAL STATE                             │
│                                                                  │
│  financialState.ts          invoice_financials_v                 │
│  (balanceDue clamped,       (raw subtraction,                    │
│   overpayment detected)      no overpayment)                     │
│       │                           │                              │
│       ▼                           ▼                              │
│  resolveInvoiceStatus.ts     Reports page                       │
│  InvoiceDetail (domain)      Dashboard                           │
│  PDF generation              ClientDetail                        │
│                               ProjectFinancials                  │
├──────────────────────────────────────────────────────────────────┤
│                      COMPLIANCE HUB                              │
│                                                                  │
│  WHT Receipts Panel ←→ wht_receipts table                       │
│  Tax Inputs Panel  ←→ tax_input_entries                         │
│  Tax Filings Panel  ←→ tax_filings                              │
│  Tax Reminders Panel ←→ tax_reminders                           │
│                                                                  │
│  NO AUDIT TRAIL │ NO PROJECT LINK │ NO DOC LIFECYCLE            │
├──────────────────────────────────────────────────────────────────┤
│                      AUDIT TRAIL                                 │
│                                                                  │
│  audit_logs          activity_events                             │
│  (JSONB changes)     (JSONB metadata)                            │
│  │                   │                                           │
│  ▼                   ▼                                           │
│  UI: AuditTrailPanel + AuditTrailItem                           │
│                                                                  │
│  Missing: payment void, WHT receipt, compliance CRUD            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Ownership Violations

| File | Line(s) | Violation | Severity |
|---|---|---|---|
| `src/components/reports/reportUtils.ts` | 16-31 | `computeReportTaxMetrics()` — tax aggregation (domain logic) in UI component utility | HIGH |
| `src/components/reports/reportUtils.ts` | 82-108 | `getReceivableStatus()`, `getAgingBucket()` — business categorization and aging logic in UI utility | HIGH |
| `src/hooks/useDashboardData.ts` | 342-451 | Client-side re-aggregation of `invoice_financials_v` rows (redundant computation, duplicate of view logic) | MEDIUM |
| `src/components/reports/reportUtils.ts` | 64-69 | `isWithinRange()` — date range filtering in UI utility | LOW |
| `src/modules/invoices/services/paymentService.ts` | ~50-60 | `normalizePaymentInput()` sets `wht_rate: null, wht_type: null` — discarding schema-supported columns without documentation | MEDIUM |

---

## 7. Gaps and Risks

### 7.1 Missing Audit Coverage (CRITICAL)
- Payment voiding has zero audit trail — `voidPayment()` sets `voided_at` but calls no audit function
- WHT receipt creation/modification/deletion has no audit trail
- All Compliance Hub CRUD (tax inputs, tax filings, tax reminders, settings) has no audit trail
- Invoice hard-delete (`deleteInvoice()` in `invoiceLifecycleService.ts`) has no audit trail
- CSR, Waybill, BOQ, RFQ have zero audit coverage

### 7.2 Calculation Duplication (HIGH)
- `financialState.ts` vs `invoice_financials_v`: different balance_due for overpayments
- `reportUtils.ts: computeReportTaxMetrics()` duplicates `whtSummary.ts: summarizeComplianceWht()`
- Dashboard uses 3 different aggregation paths (RPC, view reduce, localStorage) with different aggregation logic

### 7.3 No Cross-System Event Propagation (MEDIUM)
- Payment recording does not trigger WHT receipt creation
- Payment voiding does not update compliance status
- Compliance settings changes do not propagate to invoice WHT calculation
- No event bus or trigger chain between systems

### 7.4 WHT Rate/Type Discard (MEDIUM)
- `payments.wht_rate` and `payments.wht_type` columns exist in schema but are never populated
- Downstream consumers must cross-reference invoices to determine WHT rate
- If invoice WHT rate changes post-payment, the original payment rate is lost

### 7.5 Schema Constraints (MEDIUM)
- `payments.invoice_id` FK is nullable — orphaned payment records possible
- `audit_logs.entity_id` has no FK constraint to any table
- `audit_logs.action` and `entity_type` have no CHECK/ENUM constraint
- `invoices.status` has no CHECK/ENUM constraint

### 7.6 Overpayment Handling (LOW-MEDIUM)
- Detected by `financialState.ts` but no action taken
- No credit memo system
- No refund flow
- `balance_due` in reports can go negative (view) or clamp to 0 (domain)

---

## 8. Verification

This is a read-only architectural audit. No production code, migrations, or configuration files were modified. All findings are derived from reading the existing codebase at `C:\Users\DELL\Desktop\bigdrops-app`.

**Verification performed:**
- Full read of 5 SQL migration files defining payments, invoices, tax, views, and audit
- Full read of 6+ TypeScript domain/service files
- Partial read of 10+ UI component/hook files
- grep-assisted search across `src/` for cross-references
- GitNexus impact analysis not run (read-only audit)

---

## 9. Risks & Limitations

- This audit covers only the financial operations subsystem. Other subsystems (item catalog, project management, document transformation) were only read where they intersect with financial operations.
- Some files were identified by grep but not read in full when patterns were clearly non-financial (e.g., `temp-build/`, `_disabled/` test files).
- RPC function definitions in `supabase/migrations/` were read where they existed as CREATE OR REPLACE FUNCTION blocks. Some functions (e.g., `get_compliance_summary`, `get_dashboard_financial_metrics`) are referenced in code but their SQL definitions were not found in migration files — these may exist as Supabase Dashboard-created SQL functions.
- No runtime testing was performed. Schema-level assertions (CHECK constraints, FKs) were verified from migration files only.

---

## 10. Nigerian Business Workflow Assessment

### Current State
| Requirement | Status | Evidence |
|---|---|---|
| NGN currency | ✅ | `currency_code = 'NGN'` default, `formatNaira()` |
| Nigerian date locale | ✅ | `locale: 'en-NG'` in report formatting |
| TIN tracking | ⚠️ Partial | `tax_settings.tin` column exists, no validation or lookup |
| WHT tracking | ⚠️ Partial | `payments.wht_amount` stored, but rate/type discarded, receipts are manual |
| VAT (output) | ✅ | `invoices.vat` column, `Calculations.ts` VAT calculation |
| VAT (input) | ✅ | `tax_input_entries` with `vat_amount` and `is_recoverable` |
| FIRS reference | ⚠️ Partial | Placeholder strings in UI, no FIRS API integration |
| Withholding Tax receipts | ⚠️ Partial | `wht_receipts` table exists, no auto-creation from payment |
| Tax filing management | ✅ | `tax_filings` with status workflow, amendment chain |
| Tax reminders | ✅ | `tax_reminders` with due date and linked filing |
| Auto VAT return prep | ❌ | No automated return calculation |
| Auto WHT credit note | ❌ | No automated credit note generation |
| CAC/TCC/ITF compliance | ❌ | No database tables or UI for non-tax compliance |

### What Must Be Added for Nigerian Compliance
1. **WHT rate preservation** — `payments.wht_rate` and `payments.wht_type` must be populated at payment time
2. **Auto WHT receipt creation** — Payment recording should optionally or automatically create a `wht_receipts` record
3. **Auto VAT return calculation** — Sum output VAT from invoices, deduct input VAT from `tax_input_entries`, compute net payable
4. **FIRS integration** — API or export for FIRS e-filing for VAT and WHT
5. **TIN validation** — Validate client TIN at invoice/quote creation time
6. **WHT credit note generation** — Generate credit note from payments with WHT
7. **Non-tax compliance** — CAC registration, TCC tracking, ITF levy tracking, NSITF compliance

---

## 11. Deferred Work

The following were identified as out of scope for this audit but should be addressed in future phases:

1. **Receipts module**: The `ProjectDocumentType` includes `'receipt'` and `wht_receipts` table exists, but there is no dedicated Receipts module. All references are stubs or fire-and-forget insert operations.
2. **Notifications system**: Payment events, compliance reminders, and audit events do not trigger notifications.
3. **Dashboards and widgets**: The Compliance Hub overview uses a dedicated RPC, but no widgets exist for the main dashboard.
4. **Expense tracking**: Identified in AGENTS.md as "Pending" — not part of this audit.
5. **Profit/Loss reporting**: Identified in AGENTS.md as "Pending" — not part of this audit.

---

## 12. Standards Gaps

The following should be added to `docs/standard/`:
1. **Financial Operations Standard** — Defines WHT lifecycle, payment recording invariants, financial state derivation rules
2. **Audit Trail Standard** — Defines what must be audited (all financial events), what is excluded, and retention policy
3. **Compliance Module Standard** — Defines compliance record lifecycle, required fields for Nigerian tax compliance, and audit integration requirements

---

## Appendix A: Financial State Derivation Comparison

| Property | `financialState.ts` | `invoice_financials_v` | Report / Dashboard |
|---|---|---|---|
| cashReceived | Σ non-voided `(cash_amount ?? amount ?? 0)` | SUM(cash_amount) FILTER(voided_at IS NULL) | Uses view |
| whtSettled | Σ non-voided `wht_amount` | SUM(wht_amount) FILTER(voided_at IS NULL) | Uses view |
| settledAmount | cashReceived + whtSettled | cash_received + wht_received | Uses view |
| balanceDue | `Math.max(0, total - settled)` | `total - settled` (can be negative) | Uses view |
| overpaymentAmount | `> total + tolerance ? diff : 0` | **Not available** | **Not available** |
| paymentState | paid / partially_paid / unpaid | paid / partially_paid / unpaid | Client-side re-derivation |
| tolerance | 1 Naira | 0 Naira | N/A |
| source function | Domain | SQL VIEW | Client (UI/hook) |

## Appendix B: WHT Data Flow (Current vs. Required)

```
CURRENT:
  Payment Recording → payments.wht_amount stored, rate/type discarded
                     → No WHT receipt created
                     → reportUtils.computeReportTaxMetrics() sums payments.wht_amount
                     → compliance/whtSummary.ts sums payments.wht_amount for receipts status
                     → Compliance Hub: user manually creates WHT receipt

REQUIRED (Nigerian Compliance):
  Payment Recording → payments.wht_amount, wht_rate, wht_type ALL stored
                     → Auto-create wht_receipts record
                     → Pre-fill WHT certificate reference
                     → Compute VAT return: Σ output VAT - Σ input VAT
                     → Generate WHT credit note
                     → Export for FIRS e-filing
```

## Appendix C: File Index

| Path | Lines | Role |
|---|---|---|
| `src/domain/invoice/financialState.ts` | 79 | Domain: invoice payment state derivation |
| `src/domain/invoice/resolveInvoiceStatus.ts` | 77 | Domain: status + OVERDUE presentation layer |
| `src/domain/invoice/actions.js` | 149 | Domain: action visibility rules |
| `src/domain/invoice/advanceProjection.invariant.ts` | 71 | Domain: advance invoice invariants |
| `src/domain/documentActionState.js` | 26 | Domain: project/document link state |
| `src/domain/prefixConstants.ts` | 24 | Domain: prefix engine |
| `src/lib/audit.ts` | 269 | Service: central audit service |
| `src/lib/Calculations.ts` | ~300 | Service: financial calculation source of truth |
| `src/modules/invoices/services/paymentService.ts` | ~150 | Service: payment CRUD + normalization |
| `src/modules/invoices/repositories/paymentRepository.ts` | ~80 | Repository: payment data access |
| `src/domain/compliance/types.ts` | 261 | Domain: compliance type definitions |
| `src/domain/compliance/whtSummary.ts` | 67 | Domain: WHT summary computation |
| `src/domain/compliance/useCompliancePaginated.ts` | ~50 | Domain: generic compliance pagination hook |
| `src/domain/compliance/import/contracts.ts` | ~200 | Domain: JSON import contracts |
| `src/modules/compliance/services/whtReceiptService.ts` | ~200 | Service: WHT receipt CRUD |
| `src/modules/compliance/services/taxFilingService.ts` | ~100 | Service: tax filing CRUD |
| `src/modules/compliance/services/taxInputService.ts` | ~80 | Service: VAT input CRUD |
| `src/components/reports/reportUtils.ts` | 192 | UI Utility: tax aggregation, aging, status (ownership violation) |
| `supabase/migrations/20260520090003_invoices.sql` | 315 | Schema: invoices, payments, wht_receipts |
| `supabase/migrations/20260520090009_tax.sql` | 124 | Schema: compliance tables |
| `supabase/migrations/20260520090010_views.sql` | 154 | Schema: financial views |
