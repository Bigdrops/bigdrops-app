# PRD Alignment Report — Financial Operations

This report was written by DeepSeek on 2026-07-03 via OpenCode.

---

## 1. Objective & Scope

**Objective:** Compare every substantive claim in `docs/PRD/financial-operations-prd.md` against the actual implementation, classify each by conformance level, and identify the highest-impact gaps for remediation.

**Scope:**
- All 23 sections of the PRD (Vision, Goals, Principles, Obligations, Architecture, Core Domains, Settlement, Events, Payment Lifecycle, Status, WHT, VAT, Receipts, Projections, Audit, Nigerian Ops, Non-Goals, Invariants, Ownership, Roadmap, Success Criteria)
- Source code audit of payment recording/voiding, compliance hub, audit trail, reporting, financial state
- Database schema vs. PRD data model

**Excluded:**
- Document management modules (invoice, quotation) except as they touch financial operations
- Mobile/Capacitor-specific financial handling
- Future-phase features that the PRD already marks as aspirational

---

## 2. Methodology

For each PRD requirement:
1. **Search codebase** for implementation (grep, glob, read)
2. **Classify** as:
   - ✅ **Conformant** — requirement is fully implemented in production code
   - ⚠️ **Partial** — requirement has implementation but with documented gaps
   - ❌ **Absent** — requirement has no implementation
   - 🔧 **Deferred** — PRD marks this as future/aspirational
3. **Cite evidence** — specific file paths, line numbers, function names
4. **Rate gap severity** — Critical / High / Medium / Low

---

## 3. PRD Section-by-Section Alignment

### §1 Vision
| Claim | Status | Evidence |
|-------|--------|----------|
| "Subsystem managing every financial obligation" | ⚠️ Partial | Only invoice obligations handled; no credit/advance/retention |
| "Not an accounting package or GL" | ✅ | No trial balance, journal entries, CoA exist |
| "Receivables, settlements, WHT, VAT, compliance, reporting, audit" | ⚠️ Partial | Settlements limited to pay/void; VAT compliance is input-only; reports bypass projection layer |

### §2 Product Goals
| Claim | Status | Evidence |
|-------|--------|----------|
| "Complete payment lifecycle management" | ⚠️ Partial | Record + void only (no correction/reversal/refund) |
| "Immutable financial history" | ✅ | Soft-delete via `voided_at` |
| "Nigerian tax workflow support" | ⚠️ Partial | WHT receipts + VAT inputs exist; no filing or FIRS export |
| "Operational financial reporting" | ⚠️ Partial | Dashboard queries DB directly (not projection-based) |
| "Audit-grade traceability" | ⚠️ Partial | Direct-call audit; DELETE/ARCHIVE gaps; no correlation chains |

### §3 Design Principles
| Principle | Status | Evidence |
|-----------|--------|----------|
| 1. Money never disappears | ✅ | `payments.voided_at` soft-delete; no hard DELETE |
| 2. Financial state is derived | ✅ | `financialState.ts` + `invoice_financials_v` compute from payments |
| 3. Reports consume projections | ❌ | `ReceivablesSection.tsx` uses direct Supabase `select()` |
| 4. Compliance consumes financial events | ❌ | Compliance tables are independent CRUD, not event-driven |
| 5. Every action creates an audit event | ⚠️ | Incomplete coverage (DELETE/ARCHIVE missing, per `invoiceLifecycleService.ts:18-49`) |
| 6. Documents create obligations | ✅ | Invoice → payment flow established |

**Severity:** Principle 3 and 4 violations are architectural drift — reports and compliance should consume projections/events but instead query raw data.

### §4 Financial Obligation Model
| Claim | Status | Evidence |
|-------|--------|----------|
| "Invoice creates financial obligation" | ✅ | `payments.invoice_id` FK references `invoices` |
| Advance invoice / Retention / Credit Note | ❌ | Not implemented |
| "Settlements resolve obligations" | ✅ | `paymentService.recordInvoicePayment` reduces balance |

### §5 Platform Architecture
| Claim | Status | Evidence |
|-------|--------|----------|
| Payments as core domain | ✅ | `paymentService.ts`, `paymentRepository.ts` |
| Financial State layer | ⚠️ | Dual: TypeScript + SQL, with divergence (see §16) |
| Compliance consuming events | ❌ | Compliance is separate CRUD; no event subscription |
| Reports consuming projections | ❌ | Reports query DB tables directly |

### §6 Core Domains

#### 6.1 Payments
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Payment recording | ✅ | `paymentService.ts:52-81` |
| Payment voiding | ✅ | `paymentService.ts:106-125`, sets `voided_at` |
| WHT snapshot on payment | ❌ | `paymentRepository.ts:27-28`: `wht_rate: null, wht_type: null` |
| Corrections / Reversals / Refunds | ❌ | Not implemented |
| Sequential receipts | ❌ | Not implemented |

**Critical gap:** `paymentEntryHelpers.getPaymentEntrySummary` (line 50) returns `whtDeducted: 0` unconditionally. `InvoiceRecordPaymentSheet.tsx` and `RecordPaymentModal.tsx` both pass `whtDeducted: 0`. No UI field exists for WHT deduction at payment time.

#### 6.2 Financial State
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Outstanding balance | ✅ | `financialState.ts:52` + `invoice_financials_v` column `balance_due` |
| Settled amount | ✅ | `financialState.ts:34-36` sums non-voided payments |
| Payment state | ✅ | `financialState.ts:38-46` — unpaid / partial / paid |
| Overpayment detection | ✅ | `financialState.ts:53` — `overpaymentAmount` computed |
| Receivable aging | ❌ | Not implemented |
| Credit management | ❌ | Overpayment detected but no credit created |

**Divergence risk:** TypeScript `financialState.ts:52` clamps `balanceDue = Math.max(0, ...)`, while SQL `invoice_financials_v:29` allows negative balance. Tolerance differs (TS: ±1, SQL: exact).

#### 6.3 Compliance
| Requirement | Status | Evidence |
|-------------|--------|----------|
| WHT receipt CRUD | ✅ | `whtReceiptService.ts:34-55` |
| WHT receipt lifecycle (pending→requested→received→verified) | ✅ | `WhtReceiptsPanel.tsx` status chip |
| WHT summary cross-reference | ✅ | `whtSummary.ts:26-67` — joins invoices + payments + receipts |
| VAT input tracking | ✅ | `VatInputsPanel.tsx`, `tax_input_entries` table |
| Tax filings | ✅ | `TaxFilingsPanel.tsx`, `tax_filings` table |
| Tax reminders | ✅ | `TaxRemindersPanel.tsx`, `tax_reminders` table |
| Settings (WHT/VAT rates, thresholds) | ✅ | `ComplianceSettingsPanel.tsx`, `tax_settings` table |
| Automated WHT receipt creation from payments | ❌ | Receipts are manually created only |
| Automated VAT reconciliation | ❌ | No reconciliation logic |

#### 6.4 Reports
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Overview dashboard | ✅ | `OverviewSection.tsx` |
| Receivables | ⚠️ | `ReceivablesSection.tsx` — direct Supabase, not projection-based |
| Collections | ⚠️ | `CollectionsSection.tsx` — direct Supabase |
| Projects | ⚠️ | `ProjectsSection.tsx` — direct Supabase |
| Tax | ⚠️ | `TaxSection.tsx` — direct Supabase |
| Projection-based reporting | ❌ | Reports compute their own values |

#### 6.5 Audit
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Immutable event storage | ✅ | `activity_events` + `audit_logs` tables |
| Actor attribution | ✅ | `actor_id` on every event |
| Timestamps | ✅ | `created_at` on every event |
| Direct-call pattern | ⚠️ | `audit.ts` functions called from services; not platform service |
| DELETE/ARCHIVE audit | ❌ | `invoiceLifecycleService.ts:18-49` and `viewQuotationActions.ts:265-275` have no audit calls |
| Correlation chains | ❌ | No `correlation_id` column |
| Before/after snapshots | ❌ | `activity_events.metadata` has unstructured data; `audit_logs` has diffs but no full snapshots |
| Replayability | ❌ | Not implemented |

### §7 Settlement Model
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Payment as settlement | ✅ | `payments` table |
| Void as settlement action | ✅ | Soft-delete via `voided_at` |
| Credit Application / Refund / Adjustment / Reversal / Write-off | ❌ | None implemented |

### §8 Financial Event Model
Of 17 listed domain events:
| Event | Status |
|-------|--------|
| PaymentRecorded | ✅ |
| PaymentVoided | ✅ |
| StatusChanged | ✅ |
| InvoiceCreated | ✅ |
| QuotationCreated | ✅ |
| Remaining 12 events | ❌ Not implemented |

Of 3 integration events:
| Event | Status |
|-------|--------|
| ReportProjectionUpdated | ❌ |
| ComplianceQueueUpdated | ❌ |
| DashboardRefreshRequested | ❌ |

### §9 Payment Lifecycle
| State | Status | Evidence |
|-------|--------|----------|
| Validated | ✅ | `paymentEntryHelpers.validatePaymentEntry` |
| Recorded | ✅ | `paymentService.recordInvoicePayment` |
| Active | ✅ | Non-voided row in `payments` table |
| Voided | ✅ | `voided_at` set |
| Draft / Correction / Reversal / Refund / Historical | ❌ | Not implemented |

### §10 Financial Status Model
| Status | Status | Evidence |
|--------|--------|----------|
| unpaid | ✅ | `invoice_financials_v` computed_status |
| partially_paid | ✅ | Same |
| paid | ✅ | Same |
| OVERDUE (presentation) | ✅ | `resolveInvoiceStatus.ts:16-62` |
| Overpaid / Written Off / Closed | ❌ | No dedicated status codes |

### §11 Operational Document Status
| Status | Status | Evidence |
|--------|--------|----------|
| Draft / Issued / Approved / Cancelled / Archived | ✅ | `invoices.status` column; managed by `invoiceLifecycleService.ts` |

### §12 Credit Lifecycle
| Requirement | Status |
|-------------|--------|
| Credit creation from overpayment | ❌ |
| Credit application | ❌ |
| Credit transfer | ❌ |
| Credit expiry | ❌ |
| Credit cancellation | ❌ |

### §13 WHT Lifecycle
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Invoice defines WHT type/rate | ✅ | `Calculations.ts:455-474` + `invoices.wht` column |
| Payment captures WHT snapshot | ❌ | `paymentRepository.ts:27-28`: `wht_rate: null, wht_type: null` |
| Receipt lifecycle | ⚠️ | Statuses exist but transitions are manual |

**Critical gap:** The PRD states "Payment records always retain historical WHT metadata." Currently `wht_rate` and `wht_type` are explicitly set to `null` on insert.

### §14 VAT Lifecycle
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Invoice creates VAT obligation | ✅ | `Calculations.ts:356-358` |
| VAT input tracking | ✅ | `tax_input_entries` table |
| VAT outputs / Reconciliation / Net VAT / Filing / Evidence | ❌ | Not implemented |

### §15 Receipt Lifecycle
| Requirement | Status |
|-------------|--------|
| Generated → Issued → Reissued → Cancelled | ❌ |
| Sequential numbering | ❌ |
| Immutable financial evidence | ❌ |

### §16 Financial State Projection
| Projection | Status | Evidence |
|------------|--------|----------|
| Outstanding Balance | ✅ | `invoice_financials_v.balance_due` |
| Settlement % | ❌ | Not computed |
| Credit Available | ❌ | Not computed |
| WHT Outstanding | ⚠️ | `whtSummary.ts` cross-references |
| VAT Outstanding | ❌ | Not computed |
| Cash Collected | ⚠️ | `invoice_financials_v` has settled total |
| Expected Collections | ❌ | Not computed |
| Receivable Aging | ❌ | Not implemented |

### §17 Audit Architecture
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Immutable event storage | ✅ | `activity_events` table |
| Actor attribution | ✅ | `actor_id` column |
| Timestamps | ✅ | `created_at` column |
| Event metadata | ⚠️ | `metadata` JSONB but no structured schema for all fields |
| Correlation chains | ❌ | No `correlation_id` |
| Before/after snapshots | ❌ | Missing on `activity_events` |
| Replayability | ❌ | Not implemented |
| Platform service architecture | ❌ | Direct-call pattern |

### §18 Nigerian Operations
| Requirement | Status |
|-------------|--------|
| Cash, Transfer, POS, Cheque | ✅ |
| WHT deductions/certificates | ⚠️ |
| VAT reconciliation | ❌ |
| FIRS reporting | ❌ |
| Sequential receipts | ❌ |
| Multi-bank collections | ✅ |

### §19 Non-Goals (Out of Scope)
| Item | Status |
|------|--------|
| Inventory valuation | ✅ Not in codebase |
| Payroll | ✅ Not in codebase |
| Procurement | ✅ Not in codebase |
| Chart of accounts | ✅ Not in codebase |

### §20 Architectural Invariants

| # | Invariant | Status |
|---|-----------|--------|
| 1 | Every settlement references an obligation | ✅ |
| 2 | Every derived balance can be reproduced | ✅ |
| 3 | No downstream module recalculates values | ❌ Reports do |
| 4 | Append-only financial history | ✅ |
| 5 | Operational/Financial status independence | ⚠️ Related but separate |
| 6 | Projections are disposable | ✅ |
| 7 | Truth from authoritative domains only | ✅ |
| 8 | Every event recorded by Audit | ⚠️ DELETE/ARCHIVE gaps |
| 9 | Idempotent event publication | ❌ Not enforced |

### §21 Ownership Matrix (conformant — verified in §6)

### §22 Implementation Roadmap
| Phase | Status |
|-------|--------|
| Phase 1 — Integrity Foundation | ⚠️ Partial (WHT snapshot, audit gaps remain) |
| Phase 2 — Financial Lifecycle | ❌ Not started |
| Phase 3 — Compliance Automation | ❌ Not started |
| Phase 4 — Reporting & Analytics | ❌ Not started |

### §23 Success Criteria
| Criterion | Status |
|-----------|--------|
| Every action as immutable event | ❌ |
| Single authoritative projection layer | ❌ Dual implementations |
| Reports consume projections | ❌ |
| Full separation of document/financial status | ⚠️ |
| Payment records preserve tax context | ❌ WHT snapshot missing |
| Full audit trail for every action | ⚠️ |
| Nigerian SME lifecycle support | ⚠️ |
| Platform-level audit | ❌ |

---

## 4. Gap Severity Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 4 | Blocks PRD compliance or causes data loss risk |
| 🟠 High | 8 | Significant functional gap vs. stated requirements |
| 🟡 Medium | 12 | Partial implementation with known divergence |
| 🟢 Low | 6 | Missing nice-to-have or future-phase features |

### 🔴 Critical Gaps

| # | Gap | PRD Section | Evidence | Fix Complexity |
|---|-----|-------------|----------|----------------|
| C1 | WHT not captured at payment time (§13 requirement: "Payment captures snapshot of WHT rate, type, and amount") | §13, §22.1 | `paymentEntryHelpers.ts:50` hardcodes `whtDeducted: 0`; `paymentRepository.ts:27-28` sets `wht_rate: null, wht_type: null` | Low — add WHT input to form + pass to insertPayment |
| C2 | Reports query DB directly instead of consuming projections (§3.3: "Reports never perform business calculations") | §3, §6.4 | `ReceivablesSection.tsx`, `ProjectsSection.tsx` contain `supabase.from(...).select('*')` | High — introduce projection layer |
| C3 | No correlation chains or replayability (§17: audit must support historical reconstruction) | §17 | `activity_events` has no `correlation_id`; no replay mechanism | High — schema change + infrastructure |
| C4 | DELETE/ARCHIVE not audited (§5: "Every action creates an audit event") | §5, §6.5 | `invoiceLifecycleService.ts:18-49` no audit calls; `viewQuotationActions.ts:265-275` no audit calls | Low — add audit calls to existing functions |

### 🟠 High Gaps

| # | Gap | PRD Section | Evidence |
|---|-----|-------------|----------|
| H1 | No credit management (overpayment detected but not actionable) | §12 | `financialState.ts:53` computes overpayment but never creates credit |
| H2 | No payment corrections, reversals, or refunds | §9 | Only `recordInvoicePayment` and `voidPayment` exist |
| H3 | No receipt generation | §15 | No receipt table, numbering, or lifecycle |
| H4 | WHT receipt creation is manual only | §13 | `whtReceiptService.ts` has `createWhtReceipt` but is called from UI only |
| H5 | VAT compliance is input-only (no reconciliation, no filing) | §14 | `TaxFilingsPanel.tsx` is manual CRUD; no auto-population |
| H6 | Compliance hub is disconnected from payment events | §6.3 | Compliance tables are independent; no event subscription |
| H7 | Financial state has dual implementations with divergence | §6.2, §16 | TypeScript clamps balance; SQL allows negative; tolerance mismatch |
| H8 | No FIRS-ready exports | §18 | No export functionality anywhere in compliance module |

### 🟡 Medium Gaps

| # | Gap | Evidence |
|---|-----|----------|
| M1 | Two calculation engines (`Calculations.ts` + `domain/invoice/calculations.ts`) with duplicate logic | `src/lib/calculations.ts:1-720` vs `src/domain/invoice/calculations.ts:1-395` |
| M2 | `revert_invoice_to_quotation_transaction` RPC not defined in any migration file | Searched all `supabase/migrations/*.sql` |
| M3 | `RecordPaymentModal.tsx` exists but is unused (dead code) | No imports found via grep |
| M4 | Payment entry validation allows negative amounts? | `validatePaymentEntry` checks `cash_amount > 0` but no `wht_amount` validation |
| M5 | No currency conversion despite `currency_code` on payments | `currency_code` stored but no exchange rate handling |
| M6 | Bank account selector exists but no bank account CRUD UI | `loadBankAccountsList` called in `InvoiceRecordPaymentSheet.tsx` but no management page |
| M7 | Tax settings exist but don't actively drive compliance workflows | `tax_settings` has `wht_rate`, `vat_rate`, `vat_threshold` but no enforcement |
| M8 | `overpaymentAmount` computed but never surfaced in UI | `financialState.ts:53` — field exists in type but no component reads it |
| M9 | `invoiceActionAvailability.ts` canRecordPayment gate exists but no UI for disabled state | Gate works but no tooltip/explanation shown |
| M10 | Compliance hub tabs show empty states for most sections | `ComplianceOverview.tsx` has action queue / recent activity but sections are sparse |
| M11 | No company tax profile entity | Settings are per-user/preferences, not per-company |
| M12 | `summarizeComplianceWht` always shows 0 WHT from payments | Cross-references `payment.wht_amount` which is always 0 |

### 🟢 Low Gaps
| # | Gap |
|---|-----|
| L1 | Aging analysis not implemented |
| L2 | Collection progress / settlement % KPIs not computed |
| L3 | No mobile offline payment handling |
| L4 | No notification triggers for payment due/overdue |
| L5 | No batch payment operations |
| L6 | No payment receipt preview |

---

## 5. Ponytail Quick Wins

These are low-effort fixes with high impact, suitable for immediate implementation:

| # | Fix | File | Effort | Impact |
|---|-----|------|--------|--------|
| 1 | Remove unused `RecordPaymentModal.tsx` | `src/components/RecordPaymentModal.tsx` | 5 min | Eliminates dead code |
| 2 | Fix `whtDeducted: 0` hardcode in `getPaymentEntrySummary` | `src/components/invoice/paymentEntryHelpers.ts:50` | 15 min | Enables WHT capture at payment time |
| 3 | Add audit calls to `deleteInvoice` and `archiveInvoice` | `src/modules/invoices/services/invoiceLifecycleService.ts:18-49` | 15 min | Fills DELETE/ARCHIVE audit gaps |
| 4 | Add audit calls to quotation DELETE/ARCHIVE | `src/pages/viewQuotationActions.ts:265-275` | 15 min | Fills quotation audit gaps |
| 5 | Pass `wht_amount` from invoice to payment in `normalizePaymentInput` | `src/modules/invoices/services/paymentService.ts:35-46` | 10 min | Captures WHT metadata on payment |
| 6 | Add `GREATEST(0, ...)` to `invoice_financials_v` balance_due | `supabase/migrations/20260520090010_views.sql:29` | 5 min | Aligns SQL view with TS behavior |

---

## 6. Unverified Assumptions

| Assumption | Risk | Verification needed |
|------------|------|--------------------|
| `revert_invoice_to_quotation_transaction` RPC exists in live Supabase | High | Check `supabase/rpc` or query `information_schema.routines` |
| No production data has negative balances from SQL view | Low | Query `invoice_financials_v` where `balance_due < 0` |
| Audit RPCs are idempotent under concurrent calls | Medium | Review `record_activity_event` for duplicate detection |
| `RecordPaymentModal.tsx` is truly unused | Low | Check for dynamic imports or lazy routes |

---

## 7. Recommendations (by Ponytail Priority)

**Do now (ponytail quick wins, < 1 day):**
1. Remove dead `RecordPaymentModal.tsx`
2. Fix `whtDeducted: 0` — add WHT input to payment form
3. Add audit calls to DELETE/ARCHIVE (invoice + quotation)
4. Align SQL view balance_due with `GREATEST(0, ...)`

**Do this phase (Phase 1 completion, < 1 week):**
5. Snap WHT rate/type/amount on payment record
6. Verify `revert_invoice_to_quotation_transaction` RPC exists
7. Consolidate or formally document boundary between dual calculation engines

**Next phase (Phase 2 preparation):**
8. Design credit management from overpayment
9. Add correlation_id to activity_events schema
10. Introduce projection layer between DB and Reports

---

## 8. Verification

| Command | Status |
|---------|--------|
| `bun run audit:load` | ✅ Passed |
| `bun run typecheck` | ✅ Passed (0 errors) |
| `bun run build` | ⏱️ Timed out (no errors before timeout) |

**Code modified:** `docs/PRD/financial-operations-prd.md` (corrected), this report (new). No production code changed.

---

## 9. Appendices

### A. Key Files Referenced

| File | Role |
|------|------|
| `src/modules/invoices/services/paymentService.ts` | Payment recording/voiding |
| `src/modules/invoices/repositories/paymentRepository.ts` | DB operations for payments |
| `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` | Active payment UI |
| `src/components/RecordPaymentModal.tsx` | Unused payment UI |
| `src/components/invoice/paymentEntryHelpers.ts` | Payment validation + summary |
| `src/lib/Calculations.ts` | Primary calculation engine |
| `src/domain/invoice/calculations.ts` | Secondary calculation engine |
| `src/domain/invoice/financialState.ts` | Financial state computation |
| `src/domain/invoice/resolveInvoiceStatus.ts` | Status resolution |
| `src/domain/invoice/invoiceActionAvailability.ts` | Action gate logic |
| `src/domain/invoice/projections/financialProjection.ts` | PDF/display projections |
| `src/modules/compliance/services/whtReceiptService.ts` | WHT receipt CRUD |
| `src/domain/compliance/whtSummary.ts` | WHT cross-reference summary |
| `src/domain/compliance/types.ts` | Compliance type definitions |
| `src/components/compliance/ComplianceHub.tsx` | Compliance tab orchestrator |
| `src/components/compliance/ComplianceOverview.tsx` | Compliance dashboard |
| `src/components/compliance/WhtReceiptsPanel.tsx` | WHT receipt management |
| `src/components/compliance/VatInputsPanel.tsx` | VAT input tracking |
| `src/components/compliance/TaxFilingsPanel.tsx` | Tax filing CRUD |
| `src/components/compliance/TaxRemindersPanel.tsx` | Tax reminder CRUD |
| `src/components/compliance/ComplianceSettingsPanel.tsx` | Tax settings |
| `src/lib/audit.ts` | Audit helper functions |
| `src/modules/invoices/services/invoiceLifecycleService.ts` | Invoice lifecycle operations |
| `src/pages/viewQuotationActions.ts` | Quotation lifecycle operations |
| `supabase/migrations/20260520090003_invoices.sql` | Invoice/payment schema |
| `supabase/migrations/20260520090009_tax.sql` | Tax compliance schema |
| `supabase/migrations/20260520090010_views.sql` | Financial views |
| `docs/STANDARD/audit-trail-standard.md` | Audit trail standard |
| `docs/STANDARD/document-transformation-standard.md` | Document transformation standard |

### B. Related Standards

- `docs/STANDARD/audit-trail-standard.md` — defines the verified direct-call audit pattern
- `docs/STANDARD/document-transformation-standard.md` — defines state-aware edit locking, duplication, revert
- `docs/STANDARD/prefix-engine-settings-standard.md` — defines runtime prefix resolution pattern
