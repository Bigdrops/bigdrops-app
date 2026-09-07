# Increment 7 — Accounting Activity Coverage Audit

This report was written by MiMo on 2026-09-07 via OpenCode.

## Objective

Audit the existing business flows in the BIGDROPS codebase to determine which monetary activities should feed the accounting system, what already feeds it, and what gaps remain. This is a read-only audit — no code, migration, test, or documentation changes.

## Scope

- All business modules that produce or should produce monetary data: invoices, payments, expenses, purchases, fixed assets, refunds, credit notes, other income, WHT, VAT.
- The accounting kernel and its two existing ingestion adapters (Increment 4A and 4B).
- Blueprint target flow: Business Activity → Source Transaction → Journal.
- Out of scope: implementation of missing adapters, schema changes, tax logic, compliance reporting.

## Skills Used

- karpathy
- supabase
- supabase-postgres-best-practices
- ponytail

## Documentation Standard

ASD-STE100 Simplified Technical English

## Accounting Foundation Context

### What Already Feeds the Accounting System

**1. Invoice Creation (Increment 4A — CLOSED)**

- Entry point: `src/modules/invoices/services/invoiceAccountingService.ts`
- Flow: invoice creation → `ingest_source_transaction('invoice')` → `confirm_source_transaction()` → `post_from_source_transaction()` → `post_accounting_entry()`
- Journal produced: debit 1200 (Accounts Receivable), credit 4000 (Revenue)
- Money precision: all amounts converted to kobo strings, stored as NUMERIC(18,2)
- Idempotency: one source transaction per invoice ID

**2. Payment Recording (Increment 4B — CLOSED)**

- Entry point: `src/modules/invoices/services/paymentAccountingService.ts`
- Flow: payment → `record_payment_transaction` RPC → `ingest_source_transaction('payment')` → confirm → post
- Journal produced: debit 1100 (Bank/Cash), credit 1200 (Accounts Receivable)
- WHT excluded from journal by design (no authoritative rate table treatment yet)
- Permission-gated: requires `payment/create` permission

### What Does NOT Feed the Accounting System

| Area | Status | Monetary Data Exists | Feeds Accounting |
|------|--------|---------------------|-----------------|
| Expenses | MISSING | No | No |
| Purchases/PO | PARTIAL (project doc only) | Yes (`project_documents.total`) | No |
| Fixed Assets | STUB (chart accounts only) | No | No |
| Refunds | MISSING | No | No |
| Credit Notes | MISSING | No | No |
| Other Income | MISSING | No | No |
| VAT (output) | Calculated on invoices | Yes (`invoices.vat`) | No |
| VAT (input) | Recorded in tax_input_entries | Yes (`tax_input_entries.vat_amount`) | No |
| WHT | Tracked on invoices/payments | Yes (`invoices.wht`, `payments.wht_amount`) | No (excluded by design) |

## Detailed Audit by Area

### Expenses

**Current state: MISSING.** No expense module exists. The only references are:
- `src/domain/accounting/chartOfAccounts.ts:26` — seed account `5000 Operating Expenses`
- `src/domain/accounting/types.ts:6` — `AccountType` includes `'expense'`
- `src/components/compliance/VatInputsPanel.tsx:133` — UI label mentioning expenses

No expense forms, tables, models, hooks, or services exist. No monetary data is captured.

**Gap:** The entire expense recording pipeline is absent. Expenses are a core input for accounting profit calculation and CIT. Without expenses, the P&L is incomplete and CIT is understated.

### Purchases

**Current state: PARTIAL — project documents only.** Purchase orders exist as one subtype of the generic `project_documents` table (along with receipts, receiving waybills, and other). They are not a first-class business module.

Files:
- `src/domain/projectDocuments.ts:45` — `ProjectDocumentType = 'purchase_order' | 'receipt' | 'receiving_waybill' | 'other'`
- `src/components/project/ProjectDocumentSheet.tsx:63` — PO creation form with line items, VAT, WHT
- `src/components/project/ProjectDocumentStep3Review.tsx:37` — PO review step
- DB: `project_documents` table with `total`, `vat`, `wht` columns and `data` JSONB holding line items

Missing:
- No dedicated `purchase_orders` table
- No supplier/vendor registry (names are free-text)
- No PO status workflow (draft → approved → received)
- No accounts payable tracking
- No accounting integration (POs do not generate source transactions)
- Items stored in JSONB, not a dedicated items table

**Gap:** Purchase-side accounting (accounts payable, purchase journal) is absent. The tax_input_entries table captures input VAT from purchases manually, but there is no automated link between POs and accounting.

### Fixed Assets

**Current state: STUB only.** Chart of accounts has two seed entries:
- `1500 Fixed Assets` (debit balance)
- `1510 Accumulated Depreciation` (credit balance)

No asset register, depreciation schedule, purchase recording, or disposal recording exists.

**Gap:** Fixed asset management is absent. For CIT, depreciation is an allowable deduction. Without an asset register, depreciation cannot be computed automatically.

### Refunds / Credit Notes

**Current state: MISSING.** No refund or credit note system exists. The only correction mechanism is payment voiding (`payments.voided_at`, `payments.void_reason`) and journal entry reversals (Increment 1 domain types).

**Gap:** Revenue reversals (refunds, credit notes) have no dedicated flow. The accounting system has journal reversal capability but no business-side trigger for it.

### Other Income

**Current state: MISSING.** No other income recording exists. The only income concept is Revenue (account 4000) from invoices.

**Gap:** Non-invoice income (interest, grants, miscellaneous) has no capture mechanism. Manual journal entries could handle this, but there is no guided flow.

### WHT (Withholding Tax)

**Current state: WORKING — the most complete tax area.**

- Outgoing WHT on invoices: `invoices.wht` column, calculated via `src/lib/Calculations.ts:20-21`
- Incoming WHT deductions on payments: `payments.wht_amount`, `payments.wht_rate`, `payments.wht_type`, `payments.wht_certificate_ref`
- WHT receipts: `wht_receipts` table with full CRUD in `src/modules/compliance/services/complianceService.ts:38-130`
- Auto-creation: `autoCreateWhtReceiptDraft()` creates a draft receipt when a WHT payment is recorded
- UI: `src/components/compliance/WhtReceiptsPanel.tsx`, status strips, matchers
- Chart account: `2200 WHT Control` (liability)

**Gap for accounting:** WHT is explicitly excluded from journal entries. The `paymentAccountingService.ts:25-28` documents this: "no authoritative journal treatment exists yet for the WHT rate table." The WHT liability (deducted but not yet remitted) is tracked operationally but not in the general ledger.

### VAT (Value Added Tax)

**Current state: WORKING — multi-layer.**

- Output VAT on invoices: `invoices.vat` column, calculated per line respecting rate overrides
- Input VAT from purchases: `tax_input_entries.vat_amount` with vendor, category, recoverable flag
- VAT settings: `tax_settings` table with TIN, threshold, CIT category
- Chart account: `2100 VAT Control` (liability)
- KPI cards: `vatOnPaid`, `vatUnpaid`
- The accounting persistence migration explicitly states: "Out of scope: ... tax" (line 14 of `20260905142503_accounting_persistence.sql`)

**Gap for accounting:** No journal entries for VAT collected (output) or VAT paid (input). The net VAT liability is not posted to the general ledger. VAT inputs in `tax_input_entries` are isolated from the invoice/payment system.

### Expense Categories

**Current state: MINIMAL.** The only structured category is the single seed `5000 Operating Expenses` account. The `TaxInputEntry.category` field is free-text (e.g., "Software", "Office") with no FK constraint or lookup.

**Gap:** No expense category taxonomy exists for classifying expenditures in the P&L.

### Supplier / Vendor Management

**Current state: PARTIAL — free-text only.** Vendor names appear in RFQs, BOQs, project documents, and VAT input entries as plain strings. No `suppliers` or `vendors` table exists.

**Gap:** No supplier registry, contacts, addresses, payment terms, or spend tracking. Purchase-side accounting needs supplier references for AP aging and 1099-equivalent reporting.

## Gap Summary for Accounting Profit and CIT

The blueprint target flow (section 6) requires:

```
Business Activity → Record Engagement → Source Transaction → Accounting Transaction → Journal → Period → Accounting Profit → Tax Adjustments → Taxable Profit → CIT/Levy
```

Current coverage of this flow:

| Flow Step | Invoice | Payment | Expense | Purchase | Asset | Refund | Other Income |
|-----------|---------|---------|---------|----------|-------|--------|-------------|
| Business Activity | Yes | Yes | No | Partial | No | No | No |
| Source Transaction | Yes | Yes | No | No | No | No | No |
| Journal | Yes | Yes | No | No | No | No | No |
| Period | Yes | Yes | N/A | N/A | N/A | N/A | N/A |
| Accounting Profit | Partial (revenue only) | Partial (AR settlement only) | No | No | No | No | No |

**Accounting profit** requires all revenue AND all expenses. Currently only revenue from invoices and AR settlement from payments feed the journal. Expenses, purchases, asset depreciation, and refunds are absent.

**Taxable profit** requires accounting profit plus adjustments (non-deductible items, capital allowances). Without the expense side, there is nothing to adjust.

**CIT calculation** requires taxable profit. It cannot be computed accurately without the full P&L.

## Priority Ranking for Increment 8+

| Priority | Area | Rationale |
|----------|------|-----------|
| 1 | Expenses | Core P&L input. Without expenses, accounting profit is understated and CIT is wrong. |
| 2 | Refunds / Credit Notes | Revenue reversals affect accounting profit. Without them, revenue is overstated. |
| 3 | VAT journal treatment | Net VAT liability should appear in the general ledger. |
| 4 | WHT journal treatment | WHT liability should appear in the general ledger. |
| 5 | Purchases (accounts payable) | Purchase-side accounting, AP aging, supplier tracking. |
| 6 | Fixed Assets / Depreciation | Depreciation is a CIT-deductible expense. Can be deferred if assets are few. |
| 7 | Other Income | Lower priority — can use manual journal entries initially. |
| 8 | Expense categories | Structured taxonomy for P&L reporting. Can start minimal. |
| 9 | Supplier registry | Needed for AP but can use free-text initially. |

## Risks and Limitations

- This audit is read-only. The actual implementation of missing adapters is deferred.
- Historical gaps (pre-existing VAT/WHT tracking without journal entries) are noted but not proposed for bulk repair.
- The hosted live verification from Increment 6 remains deferred — no new live tests were run.
- The `project_documents` table holds purchase data in JSONB, which makes it harder to query for accounting purposes than a normalized `purchase_orders` + `purchase_order_items` structure.

## Deferred Work

- Implementation of expense recording adapter and journal treatment.
- Implementation of refund/credit note adapter.
- VAT journal treatment (output VAT debit, input VAT credit, net liability posting).
- WHT journal treatment (WHT liability debit on remittance).
- Purchase orders as a first-class module with AP tracking.
- Fixed asset register and depreciation schedule.
- Other income recording.
- Expense category taxonomy.
- Supplier/vendor registry.

## Verification

- `git diff --check`: passed (no changes made — read-only audit)
- `git status`: clean (only pre-existing uncommitted changes from Increment 6)

## Appendix: Files Referenced

| File | Area |
|------|------|
| `src/domain/accounting/chartOfAccounts.ts` | Seed chart (expenses, assets, VAT, WHT accounts) |
| `src/domain/accounting/types.ts` | Domain types (AccountType includes 'expense') |
| `src/modules/invoices/services/invoiceAccountingService.ts` | Invoice → journal adapter (Increment 4A) |
| `src/modules/invoices/services/paymentAccountingService.ts` | Payment → journal adapter (Increment 4B) |
| `src/modules/compliance/services/complianceService.ts` | WHT receipts, VAT inputs, tax settings |
| `src/components/compliance/WhtReceiptsPanel.tsx` | WHT receipt tracking UI |
| `src/components/compliance/VatInputsPanel.tsx` | VAT input entries UI |
| `src/domain/projectDocuments.ts` | Purchase orders as project documents |
| `src/components/project/ProjectDocumentSheet.tsx` | PO creation form |
| `src/modules/invoices/repositories/paymentRepository.ts` | Payment voiding |
| `src/lib/Calculations.ts` | Financial calculations (VAT, WHT, totals) |
| `supabase/migrations/20260905142503_accounting_persistence.sql` | Accounting tables (tax out of scope) |
| `supabase/migrations/20260520090009_tax.sql` | Tax settings and input entries |
| `supabase/migrations/20260520090003_invoices.sql` | WHT receipts table, payment WHT columns |
| `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Accounting-foundation-blueprint-v1.md` | Architecture source of truth |
