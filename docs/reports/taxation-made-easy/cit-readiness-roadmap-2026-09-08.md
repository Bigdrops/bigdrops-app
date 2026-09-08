# CIT-Readiness Roadmap

This report was written by opencode on 2026-09-08 via Freebuff.

## Objective

Map the statutory Nigerian Corporate Income Tax (CIT) calculation stages to
BIGDROPS current capability. Establish what exists, what is defined, what is
implemented, what is missing, and what depends on what. Produce a
dependency-aware implementation sequence. Identify the first practical
implementation block after Increment 10.

This is a documentation-only report. No application code, schema, migration,
or tax calculation logic was changed.

## Scope

- Statutory CIT provisions: NTA 2025 sections 3, 4, 5, 6, 20, 21, 22, 27,
  56, 57, 59, 202, and First Schedule Part I.
- Current BIGDROPS capability: source code, PRDs, audit reports, types.
- Increment 10 (Record Capture Foundation): independently verified and closed.
- All PRD-folder documents as listed in Readme.md.
- Authoritative document order per AGENTS.md: AGENTS.md, Taxation-Made-Easy
  PRDs, Accounting-foundation-blueprint-v1.md, adaptive-uiux-alignment.md,
  applicable standards.

## Skills Used

- karpathy
- writing-clearly-and-concisely

## Documentation Standard

ASD-STE100 Simplified Technical English

## Terminology

This document uses the following authoritative names:

- **NTA 2025**: Nigeria Tax Act 2025. Primary statute governing CIT, WHT,
  and other taxes. Source in repository: `NRS-docs/NIGERIA-TAX-ACT-2025.md`.
- **NTAA 2025**: Nigeria Tax Administration Act 2025. Governs filing
  deadlines, payment deadlines, penalties, and procedural rules. Absent from
  repository. External authoritative-source dependency.

Do not use these terms interchangeably. The NTA defines what is taxed and at
what rate. The NTAA defines when it must be filed and paid.

---

## Statutory CIT Calculation: Conceptual Model

The NTA 2025 defines a multi-stage calculation. Each stage requires specific
data. The stages are sequential. The output of one stage is the input of the
next.

**This is a statutory concept model, not an implementation-ready formula.
Each stage is defined by the NTA 2025. The ordering rules within each stage
are verified from authoritative statutory material. Implementation must
follow the same sequence.**

### Stage 1: Accounting Profit

Accounting profit is the starting point. It is the result of
accounting-period revenue minus accounting-period expenses, computed from
posted journal entries. It is not the same as cash received minus cash paid.

Accounting profit is defined in the accounting layer, not the tax layer.
The tax layer reads it as an input.

### Stage 2: Tax Adjustments (Accounting-to-Tax Bridge)

Tax adjustments transform accounting profit into assessable profits. Two
categories of adjustment:

**Add-backs** (disallowed items per section 21). These are expenses that
reduced accounting profit but are not deductible for tax purposes:

- Accounting depreciation (disallowable per section 21; replaced by
  capital allowances).
- Capital expenditure (disallowable per section 21; subject to capital
  allowances instead).
- Private and domestic expenses (disallowable per section 21).
- Penalties and fines (disallowable per section 21).
- Taxes on profits of the company (disallowable per section 21).
- Unapproved pensions and gratuities (disallowable per section 21).

**Deductions** (allowable items per section 20). These are items that
are deductible for tax but were not captured as accounting expenses:

- Bad debts written off (allowable per section 20).
- Pre-commencement expenses (allowable per section 20).
- Stock and inventory losses (allowable per section 20).

Not all section 20 items are deductions from accounting profit. Some are
standalone allowances. The specific treatment depends on the item.

### Stage 3: Assessable Profits

Assessable profits are the output of Stage 2. They represent the profit
subject to CIT after statutory adjustments.

Section 22(1) ties assessable profits to the accounting period immediately
preceding the year of assessment.

### Stage 4: Loss Deduction

Tax losses from prior periods may reduce assessable profits, subject to
section 27(5):

- Losses are ring-fenced to the same trade.
- Losses are deductible in the first year of assessment following the
  year in which the loss was incurred.
- Losses continue to be deductible in subsequent years until fully
  recouped.
- Digital-asset losses are ring-fenced separately (section 27(6)).

### Stage 5: Capital Allowances

Capital allowances are statutory deductions from assessable profits, per
the First Schedule of the NTA 2025 and section 27(1). They replace
accounting depreciation as the tax deduction for asset cost recovery.

Capital allowances are computed per asset, using statutory rates and
categories. They are separate from accounting depreciation. The two must
not be confused.

Capital allowances are deducted after the loss deduction (Stage 4) to
produce total profits.

### Stage 6: Total Profits

Total profits are the output of Stages 3, 4, and 5. They represent the
profit subject to the CIT rate.

### Stage 7: CIT Rate Application

The CIT rate is applied to total profits per section 56:

- Small company (section 202 criteria met): 0% (section 56(a)).
- Other company: 30% from date of commencement (section 56(b)).
- Presidential Order reduction to 25%: effective from the date specified
  in the Order (section 56(b)). Status of any current Order: unresolved
  (see Unresolved Items below).

The CIT rate depends on company classification (Stage 7 prerequisite).

### Stage 8: Development Levy

Development Levy is 4% of assessable profits per section 59(1). It is
added to the CIT liability to produce total tax liability.

Small companies and non-resident companies are excluded from Development
Levy (section 59(1)).

### Stage 9: Total Tax Liability

Total tax liability is CIT liability plus Development Levy.

### Stage 10: Credits and Prior Payments

WHT credits (from `wht_receipts`) reduce the amount payable. Prior
payments (from `tax_filings.amount_paid`) reduce the amount payable.
These do not reduce the CIT liability itself.

### Stage 11: Amount Payable / (Refundable)

The final figure: total tax liability minus WHT credits minus prior
payments.

---

## Verified Statutory Values (from NTA 2025)

| Parameter | Value | Citation |
|-----------|-------|----------|
| Small company gross turnover | ≤ ₦50,000,000 per annum | §202 |
| Small company fixed assets | ≤ ₦250,000,000 | §202 |
| Professional services exclusion | Not classified as small company | §202 |
| CIT rate — small company | 0% | §56(a) |
| CIT rate — other companies | 30% from commencement | §56(b) |
| CIT rate — Presidential Order reduction | 25% effective from date per Order | §56(b) |
| Development Levy | 4% on assessable profits | §59(1) |
| Development Levy exclusion | Small companies and non-resident companies | §59(1) |
| Loss carry-forward | Same trade only, first year after loss, until recouped | §27(5) |
| Digital-asset losses | Ring-fenced | §27(6) |
| Capital allowances | Per First Schedule categories, section 27(1) | First Schedule |
| Proration of allowances | Partly-used assets prorated per §27(3); no proration below 10% non-taxable income per §27(4) | §27(3), §27(4) |

---

## Unresolved Items (Authoritative-Source Dependencies)

These items are genuinely unresolved. They are external dependencies, not
implementation gaps. Do not invent values for them.

| Item | Status | Impact |
|------|--------|--------|
| NTAA 2025 primary text | Absent from repository | CIT filing deadline, CIT payment deadline, general VAT return deadline, WHT remittance deadline — all unresolved |
| Presidential Order / 25% CIT | Effective status not verified | Cannot use 25% rate in production; must use 30% |
| First Schedule capital-allowance rates | Partially verified from NTA 2025 text in repository | Plant and machinery rates, building rates, motor vehicle rates — verify from primary source |
| WHT subsidiary regulation | Absent from repository | WHT rate table and remittance deadline unresolved |

---

## Prerequisites for CIT Readiness

Six prerequisites must be satisfied before CIT can be computed. They are
ordered by dependency, not by ease of implementation.

### Prerequisite 1: Accounting Foundation

**The accounting foundation is the base capability on which all other
CIT prerequisites depend.** Without it, there is no accounting-period
revenue, no accounting-period expenses, no accounting profit, and no
starting point for tax adjustments.

**Current state: NOT IMPLEMENTED**

The Accounting Foundation Blueprint (v1) defines the required architecture:

- Entity-scoped accounting: all accounting data scoped to the entity.
- Chart of accounts: defines account categories (revenue, expense,
  asset, liability, equity).
- Journal/posting kernel: balanced double-entry postings. Source
  transactions are posted to journals. Posted journals are immutable.
- Source-transaction boundary: Record Capture produces source
  transactions. A source transaction becomes an accounting fact only
  when posted to a journal.
- Period controls: accounting periods with open/closed/locked states.
  Back-dated postings to closed periods are rejected.

**What exists:**

- `tax_input_entries` stores individual VAT-input records. These are
  source transactions, not journal postings.
- `tax_filings` stores filing records with period dates. These are
  compliance records, not accounting periods.
- `settings` has `year_end_month` and `year_end_day`. Defines the
  company's financial year end.
- Invoice data exists (amounts, dates, payments). These are source
  transactions.
- Record Capture (Increment 10) captures expense source transactions.

**What is missing:**

- No chart of accounts.
- No journal/posting kernel.
- No accounting-period model.
- No posting boundary between source transactions and journal entries.
- No period-lock mechanism.

**Why this must come first:**

Every subsequent prerequisite (expense aggregation, income statement,
fixed-asset register, capital allowances) requires accounting-period
data from posted journals. The journal kernel is the foundation. Without
it, there is no accounting profit, and the tax-adjustment layer has
nothing to transform.

### Prerequisite 2: Expense Source Transactions and Accounting Consumption

**Current state: Record Capture IMPLEMENTED (Increment 10). Accounting
consumption NOT IMPLEMENTED.**

Increment 10 (Record Capture Foundation) is independently verified and
closed. The capture surface exists and is wired into ComplianceHub. It
must not be modified or extended to satisfy accounting or tax
requirements.

**What exists (Record Capture — closed, do not modify):**

- `RecordCaptureSheet.tsx`: bottom-sheet form capturing date, vendor,
  category, reference, amount (gross), notes, evidence files.
- `reverseVat()` in `src/lib/Calculations.ts`: derives net/vat split
  from gross amount using 7.5% rate.
- `tax_input_entries` table: stores `net_amount`, `vat_amount`,
  `is_recoverable`, `category`, `vendor_name`, `date`, `reference`,
  `evidence`.
- Audit trail: `recordExpenseRecorded()` in `src/lib/audit.ts`.
- ComplianceHub wiring: `RecordCaptureSheet` imported and rendered in
  `ComplianceHub.tsx`.
- Entity scoping: `useEntity()` tenant context.

**The accounting consumption layer (not yet implemented):**

Record Capture produces factual source transactions. A separate
downstream layer must consume these source transactions and produce
accounting-period expense figures. This layer:

1. Reads source transactions from `tax_input_entries`.
2. Maps each source transaction to a chart-of-accounts code (accounting
   classification). This mapping is a downstream decision, not a field
   on the source record.
3. Posts balanced journal entries to the journal kernel.
4. Assigns journal entries to an accounting period.
5. Aggregates posted expenses by accounting period for income-statement
   consumption.

**Do not add accounting-classification or tax-classification fields to
`tax_input_entries`.** The record remains factual at capture. The
classification happens downstream, in the accounting layer, after the
record is captured.

**The tax treatment layer (not yet implemented):**

After accounting consumption, a separate tax-adjustment layer classifies
each posted expense as:

- Allowable (deductible per section 20).
- Disallowable (not deductible per section 21).
- Partially allowable (subject to specific rules).

This classification is a tax-layer decision. It reads accounting facts
(from posted journals), not source transactions. It does not modify
source records or journal entries. It produces statutory adjustment
entries for the income-statement bridge.

**The point at which an expense becomes accounting/tax relevant:**

An expense source transaction is not an accounting posting. It becomes
accounting-relevant when posted to a balanced journal entry within an
open accounting period. It becomes tax-relevant when the tax-adjustment
layer classifies it and produces a statutory adjustment entry.

### Prerequisite 3: Accounting Periods and Revenue Recognition

**Current state: NOT IMPLEMENTED**

**What exists:**

- `tax_filings` has `period_start` and `period_end`. These define
  filing periods, not accounting periods.
- `settings` has `year_end_month` and `year_end_day`.
- Invoice dates (`issue_date`) and payment dates exist. Revenue is
  tracked as invoice-cash, not accrual.

**What is missing:**

- No accounting-period model with open/closed/locked states.
- No revenue recognition policy. Revenue today equals invoice issue
  date amounts.
- No accrual-basis revenue: revenue for a period is not determined by
  when the service was performed or the invoice was issued, but by the
  accounting-period assignment.
- No period-lock mechanism that prevents back-dated postings.

**Why accrual matters for CIT:**

Section 22(1) ties assessable profits to the accounting period
immediately preceding the year of assessment. If revenue is
invoice-cash (recognized when the invoice is issued or paid), it does
not match the statutory basis. The accounting layer must assign revenue
to the period in which it is earned, not when the invoice is created
or paid.

### Prerequisite 4: Income Statement / P&L Computation

**Current state: NOT IMPLEMENTED**

**What exists:**

- `Reports.tsx` has a "Financial Overview" tab. It shows invoice
  aggregates, not an income statement.
- `Reports.tsx` has a "Tax Positions" tab. It shows VAT charged and
  WHT exposure. No profit computation.
- `computeDocumentTotals()` computes invoice-level totals. It does not
  aggregate across documents or periods.

**What is missing:**

- No income statement or profit-and-loss computation.
- No revenue-minus-expenses calculation.
- No accounting-profit figure.
- No separation between operating revenue, other income, cost of goods
  sold, operating expenses, and non-operating items.

**Why it matters for CIT:**

Accounting profit is the starting point for the statutory bridge
(Stage 2). Without an income-statement computation, there is no
accounting profit, and therefore no starting point for tax adjustments.

### Prerequisite 5: Fixed-Asset Register, Purchases, and Capital Allowances

**Current state: NOT IMPLEMENTED**

This prerequisite connects purchases, fixed-asset acquisition, asset
management, accounting depreciation, and tax capital allowances into a
single acquisition-to-deduction path.

**The acquisition path (PO → tax deduction):**

A supplier transaction can result in different accounting treatments
depending on its economic nature. The economic-nature decision must
occur before the accounting treatment is applied.

```
PO / Purchase Order
  → Supplier Transaction (invoice received, goods/services delivered)
    → Determine Economic Nature
      → Operating Expense (consumed within the period)
      → Inventory (held for resale)
      → Fixed Asset (multi-period use, meets capitalization threshold)
      → Prepaid / Deferred Item (payment before benefit period)
      → Other Accounting Category
```

The economic-nature determination is a business decision made at the
point of supplier invoice receipt (or goods receipt, depending on the
recognition policy). It is not made at the PO stage. A PO is a
commitment, not an expense.

**When the economic nature is "fixed asset":**

```
Supplier Transaction (fixed asset)
  → Register in Fixed-Asset Register
    → Asset identity, acquisition cost, acquisition date, category,
      useful life, business-use proportion
  → Accounting Depreciation (periodic, accounting concept)
    → Charge against book value per useful life
    → Posts to journal
  → Tax Capital Allowance (statutory, separate computation)
    → Computed per First Schedule rates and categories
    → Deducted from assessable profits
    → Separate from accounting depreciation
```

**The critical distinction: accounting depreciation ≠ tax capital
allowance.**

Accounting depreciation is the systematic allocation of an asset's cost
over its useful life. It is an accounting estimate. It reduces the
asset's book value on the balance sheet.

Tax capital allowances are statutory deductions from assessable profits
allowed by the First Schedule of the NTA 2025. They are computed using
statutory rates and categories, not accounting estimates. An asset's
capital allowance may differ from its accounting depreciation in:

- Rate: statutory rate vs. estimated useful life.
- Category: plant and machinery vs. building vs. motor vehicle — each
  has a different statutory rate.
- Timing: capital allowances may begin in the year of acquisition;
  depreciation may follow a different convention.
- Proration: capital allowances are prorated for partly-used assets
  (§27(3)); depreciation may or may not be.

**The tax adjustment:**

In the accounting-to-tax bridge (Stage 2), accounting depreciation is
added back to accounting profit (disallowable per section 21). Capital
allowances are then deducted from assessable profits (section 27(1)).
The net effect is:

```
Accounting Profit
  + Accounting Depreciation (add-back, disallowable per §21)
  - Capital Allowances (deduction per §27(1) and First Schedule)
  = Adjusted Profit (before losses)
```

This two-step adjustment is mandatory. CIT must not simply use
accounting depreciation as the tax deduction.

**What exists:**

- No fixed-asset register.
- No depreciation computation.
- No capital-allowance computation.
- No asset categories or useful-life definitions.
- No connection between purchase orders and asset acquisition.

**What is missing:**

- Asset register: asset identity, acquisition cost, acquisition date,
  asset category, useful life, business-use proportion, disposal date.
- Economic-nature determination logic at the supplier-transaction
  level.
- Accounting depreciation: periodic depreciation charge against asset
  book value.
- Tax capital allowances: statutory deduction per First Schedule.
- Balancing adjustments on disposal (First Schedule rules).

### Prerequisite 6: Company Classification

**Current state: PARTIAL (type exists, data missing)**

**What exists:**

- `domain/compliance/types.ts` defines `CitCategory = 'small' |
  'medium' | 'large' | 'exempt'`. The `'medium'` value is not in the
  NTA 2025 (no medium band exists in §56). The `'exempt'` value is not
  a defined NTA category.
- `TaxSettings` interface has `tin`, `vat_enabled`, `vat_threshold`,
  `cit_category`, `year_end_month`, `year_end_day`.
- `tax_settings` table stores these fields.

**What is missing:**

- No capture of gross turnover per annum (required for §202).
- No capture of total fixed assets (required for §202).
- No capture of whether the business provides professional services
  (required for §202 exclusion).
- No capture of legal form (section 3 requires a "company").
- No automatic classification logic.
- `cit_category` enum values (`medium`, `exempt`) conflict with the
  NTA 2025 categories.

**What CIT treatment requires:**

- The company must be classified as "small company" or "other company"
  per §202.
- Classification determines: CIT rate (0% vs. 30%), development-levy
  exclusion (small companies excluded per §59(1)).
- Classification depends on: gross turnover, total fixed assets,
  professional services flag, and legal form.

### Prerequisite 7: NTAA 2025 Authoritative Text

**Current state: EXTERNAL DEPENDENCY**

The NTAA 2025 is absent from the repository. It governs filing
deadlines, payment deadlines, and procedural rules. It does not block
CIT calculation. It blocks compliance/filing.

---

## Dependency Graph

```
Prerequisite 1 (Accounting Foundation)
  │
  ├──→ Prerequisite 2 (Expense Source + Accounting Consumption)
  │         │
  │         ├──→ Prerequisite 3 (Accounting Periods + Revenue Recognition)
  │         │         │
  │         │         └──→ Prerequisite 4 (Income Statement / P&L)
  │         │                    │
  │         │                    └──→ Tax Adjustments (Stage 2)
  │         │                               │
  │         └──────────────────────────────→│
  │                                         │
  ├──→ Prerequisite 5 (Fixed Assets / Purchases / Capital Allowances)
  │         │                               │
  │         └──────────────────────────────→│
  │                                         │
  └──→ Prerequisite 6 (Company Classification) ──→ CIT Rate (Stage 7)
                                                       │
                                                       └──→ CIT Calculation
                                                              │
                                                              └──→ Prerequisite 7 (NTAA) → Compliance
```

### What must be sequential

1. Prerequisite 1 (accounting foundation) must exist before anything
   else. It provides the journal kernel, chart of accounts, and period
   model that all subsequent layers consume.
2. Prerequisite 2 (expense accounting consumption) depends on
   Prerequisite 1 (posting kernel, chart of accounts).
3. Prerequisite 3 (accounting periods) depends on Prerequisite 1
   (period model).
4. Prerequisite 4 (income statement) depends on Prerequisites 2 and 3
   (posted revenue and expenses by period).
5. Prerequisite 5 (fixed assets) depends on Prerequisite 1 (asset
   register and depreciation postings) and Phase 3 statutory rules
   (capital-allowance rates).
6. Prerequisite 6 (classification) depends on Prerequisite 1 (GATE A:
   entity scoping). It can be designed in parallel with Prerequisites
   2–5 but must be implemented before CIT rate application.
7. Prerequisite 7 (NTAA) is an external dependency. It does not block
   calculation.

### What can proceed in parallel

- Prerequisites 2, 3, 5, and 6 can be designed in parallel after
  Prerequisite 1 is established.
- Prerequisite 7 is an external dependency (human action).
- Statutory-source acquisition (First Schedule rates, Presidential
  Order status) can proceed in parallel with all prerequisites.

---

## Implementation Sequence

### After Increment 10: First Practical Block

**Block A: Accounting Foundation Core (Prerequisite 1)**

The first practical implementation block after Increment 10 is the
accounting foundation core. This is the block that best establishes the
next required architectural capability toward CIT readiness.

**Why this block comes first:**

The accounting foundation is the base on which every other CIT
prerequisite depends. Without a journal kernel, chart of accounts, and
period model, there is no way to:

- Post expense source transactions to journals (Prerequisite 2).
- Assign revenue and expenses to accounting periods (Prerequisite 3).
- Compute accounting profit (Prerequisite 4).
- Post depreciation or capital allowances (Prerequisite 5).

Company classification (Prerequisite 6) can be designed in parallel, but
it produces only a rate determination. It cannot produce a CIT
calculation without accounting-period profit data. The accounting
foundation is the binding constraint.

**What this block includes:**

| Component | Description | Depends on |
|-----------|-------------|------------|
| GATE A | Entity accounting boundary decision (single-entity vs. multi-entity scoping). | — |
| GATE B | Money-precision decision (integer kobo vs. decimal). | — |
| Chart of accounts | Account categories: revenue, expense, asset, liability, equity. Entity-scoped. | GATE A |
| Journal/posting kernel | Balanced double-entry postings. Source transactions → journal entries. Posted journals are immutable. | Chart of accounts, GATE B |
| Accounting-period model | Periods with planned → open → closed → locked states. Period scoping per GATE A. Back-dated postings rejected for closed periods. | GATE A |

**What this block does NOT include:**

- Expense classification or tax treatment (Prerequisite 2 downstream).
- Revenue recognition policy (Prerequisite 3).
- Income-statement computation (Prerequisite 4).
- Fixed-asset register or depreciation (Prerequisite 5).
- Company classification fields (Prerequisite 6).

### Full implementation sequence

| Order | Block | Prerequisite | Depends on | Waterfall Phase |
|-------|-------|-------------|------------|-----------------|
| 1 | A | Accounting foundation core | GATE A, GATE B | Phase 0–1 |
| 2 | B | Expense accounting consumption | A (posting kernel, chart of accounts) | Phase 1 |
| 3 | C | Accounting periods + revenue recognition | A (period model) | Phase 1 |
| 4 | D | Income statement / P&L | B, C | Phase 1 |
| 5 | E | Fixed-asset register + purchase→asset path | A (posting kernel) | Phase 1 |
| 6 | F | Accounting depreciation | E | Phase 1 |
| 7 | G | Company classification | A (GATE A) | Phase 0–1 |
| 8 | H | Tax-adjustment layer | D, F | Phase 2 |
| 9 | I | Capital allowances (First Schedule) | E, statutory rules | Phase 2–3 |
| 10 | J | Loss register | D | Phase 2 |
| 11 | K | CIT calculation | H, I, J, G | Phase 3 |
| 12 | L | NTAA deadlines | External | Phase 3–4 |
| 13 | M | Compliance / filing | K, L | Phase 4 |

---

## Data Sufficiency for CIT

For each CIT input, the current status and what is needed:

| CIT input | Current status | What is needed |
|-----------|---------------|----------------|
| Revenue | Invoice amounts exist. Not accrual-basis. | Accounting-period revenue from posted journal entries (Block D). |
| Expenses | `tax_input_entries` captures individual entries. Not aggregated. Not classified for accounting/tax. | Source transactions → accounting consumption → posted journal entries by period (Block B). Tax treatment is a separate downstream layer (Block H). |
| Accounting profit | Missing. | Income-statement computation: revenue minus expenses per accounting period (Block D). |
| Tax adjustments | Missing. | Add-backs (depreciation, capital expenditure, private expenses, penalties, taxes on profits, unapproved pensions) and deductions (bad debts, stock losses, pre-commencement expenses). Computed in the tax-adjustment layer (Block H). |
| Capital allowances | Missing. | Per-asset statutory computation using First Schedule rates (Block I). Separate from accounting depreciation (Block F). |
| Tax losses | Missing. | Loss register with carry-forward per §27(5): same trade, first year after loss, until recouped (Block J). |
| Company classification | `cit_category` exists but has wrong enum values. No turnover or fixed-asset data. | Corrected enum, turnover capture, fixed-asset capture, professional-services flag (Block G). |
| CIT rate | Not computable. | Classification (Block G) → 0% or 30%. |
| Development levy | Not computable. | Classification (Block G) → 4% if not small. |
| WHT credits | `wht_receipts` table exists. | Available for offset at filing. Not a blocker for calculation. |
| Prior payments | `tax_filings` stores `amount_paid`. | Available. Not a blocker. |
| Filing deadlines | Missing (NTAA absent). | External dependency. Does not block calculation. |

---

## Surrounding Business Capabilities: CIT Relevance Map

### Purchases / Purchase Orders (PO)

A PO is a business commitment, not an accounting transaction. It does
not create an expense, a liability, or a tax consequence at the time of
creation.

The supplier transaction (invoice received, goods/services delivered)
can result in different accounting treatments depending on its economic
nature:

| Economic Nature | Accounting Treatment | Tax Treatment |
|-----------------|---------------------|---------------|
| Operating expense | Expense in the period. Posts to expense account. | Candidate for allowable/disallowable per §20/§21. |
| Inventory | Asset on balance sheet. Cost of goods sold when sold. | Stock-loss deduction if applicable (§20). |
| Fixed asset | Capitalize. Depreciate over useful life. | Capital allowance per First Schedule. |
| Prepaid / deferred item | Asset on balance sheet. Amortize over benefit period. | Deduction when amortized, subject to §20/§21. |

The economic-nature determination is made at the point of supplier
invoice receipt (or goods receipt, depending on the recognition
policy). It is not made at the PO stage.

**Do not treat a PO as automatically being an expense or accounting
transaction.** The PO is an upstream business event. The accounting
treatment depends on the economic nature of what was acquired.

### Credit Notes / Refunds

Credit notes reduce revenue. They are accounting transactions that
reverse or reduce the original invoice's revenue posting.

| Event | Accounting effect | Tax effect |
|-------|-------------------|------------|
| Credit note issued | Reduces revenue for the period. Posts a reversal or contra entry to the journal. | Reduces accounting profit for the period. Affects CIT. |
| Refund paid | Cash outflow. Posts to journal: debit revenue/contrary, credit cash/bank. | None additional (revenue already reduced). |

Credit notes must be posted to the same accounting period as the
original invoice, or to the period in which they are issued (depending
on the recognition policy). They reduce the revenue figure used for CIT.

### Other Income

Other income (interest, gains on disposal, non-operating income) is
included in total profits per section 27(1). It must be:

- Captured as a source transaction.
- Posted to the journal in the correct accounting period.
- Classified as taxable or exempt income.
- Included in the income-statement computation.

Gains on disposal of assets are taxable at the CIT rate per section
27(1) and the definition of "chargeable gains" at section 33.

### VAT

VAT is a separate tax from CIT. VAT does not affect CIT calculation
directly, but has interface requirements:

| Interface | Requirement |
|-----------|-------------|
| VAT on revenue | VAT collected is not revenue. Revenue for CIT is net of VAT. The income-statement must exclude VAT collected. |
| VAT on expenses | VAT paid on purchases may be recoverable. Recoverable VAT is not an expense. The income-statement must exclude recoverable VAT from expenses. |
| Non-recoverable VAT | VAT on disallowed purchases (section 21: expenses on which VAT was due but not charged) may become a non-recoverable expense. This affects the expense total. |
| VAT filing support | `Files-tax-monthly-v1.md` defines VAT filing obligations. The evidence layer (receipts, records) can be reused for CIT evidence. |

VAT does not block CIT. The required interfaces are:
1. Revenue figures must be VAT-exclusive.
2. Expense figures must be VAT-exclusive (recoverable VAT excluded).
3. Non-recoverable VAT may be an expense.

### WHT (Withholding Tax)

WHT is a tax credit, not a CIT expense. WHT deducted by clients reduces
the amount payable to the company but does not reduce CIT liability.

| Interface | Requirement |
|-----------|-------------|
| WHT received | WHT deducted by clients is recorded in `wht_receipts`. This is a tax credit, not revenue reduction. |
| WHT deducted by company | WHT deducted on payments to suppliers (if applicable) is a compliance obligation, not a CIT input. |
| WHT and CIT | WHT credits reduce the amount payable when filing CIT, but do not reduce the CIT liability itself. |

WHT does not block CIT. The required interface is:
1. WHT credits must be available for offset against CIT liability at
   filing.
2. WHT receipts provide evidence for the compliance layer.

### Accounting → Tax Bridge

The accounting-to-tax bridge is the transformation layer between
accounting profit and taxable profit. It is defined in Phase 2 of the
Waterfall Roadmap.

The bridge consumes accounting facts (from Phase 1) and produces
taxable-profit inputs. It applies:

- Add-backs for disallowed items (section 21).
- Deductions for allowable items not yet captured (section 20).
- Capital-allowance deductions (First Schedule).
- Loss deductions (section 27(5)).
- Exempt-income treatment.

The bridge never modifies accounting postings. It reads accounting facts
and records statutory adjustments separately.

### CIT Calculation

The CIT calculation consumes the bridge outputs and applies statutory
rates. See the Conceptual Model section (Stages 1–11) for the full
sequence.

### Compliance / Transmission

The compliance layer manages filing, payment, evidence, and
reconciliation. It consumes CIT calculation outputs and produces
compliance positions.

The compliance layer is Phase 4 of the Waterfall Roadmap. It depends
on:
- CIT calculation (this roadmap).
- NTAA 2025 deadlines (Prerequisite 7).
- Evidence layer (reusable from VAT filing support).

---

## What Is Not Blocked by This Roadmap

The following capabilities can proceed independently of CIT readiness:

| Capability | Why independent |
|------------|-----------------|
| E-invoicing (NRS clearance) | Document-level transmission. Does not require CIT. |
| VAT filing support | Separate tax. `Files-tax-monthly-v1.md` defines the requirement. |
| WHT receipt tracking | Operational record. Does not require CIT. |
| Record Capture (Increment 10) | Closed. No further work needed. |
| Record Engagement prompts | Upstream behavioral layer. Independent of accounting/tax. |
| Compliance Hub enhancements | Manual tracking and reminders. Does not require CIT computation. |

---

## Changes Made

This revision corrected the following architectural issues in the
baseline document:

1. **Preserved Record Capture boundary.** Removed proposals to add
   accounting-classification or tax-classification fields to
   `tax_input_entries`. Record Capture remains factual at capture.
   Classification is a downstream layer.

2. **Reworked expense roadmap.** Defined the accounting consumption
   layer and tax treatment layer as separate downstream components.
   The expense source transaction flows through: source → accounting
   consumption → journal posting → period assignment → tax treatment.

3. **Reworked purchase/PO architecture.** Defined the economic-nature
   determination (operating expense, inventory, fixed asset, prepaid,
   other) as a decision made at supplier-invoice level, not at PO
   level. A PO is a commitment, not an expense.

4. **Connected purchases to fixed assets.** Showed the single
   acquisition path: PO → supplier transaction → economic-nature
   determination → fixed asset (when applicable) → asset register →
   accounting depreciation → tax capital allowance. No two independent
   acquisition paths.

5. **Revised the dependency graph.** The accounting foundation
   (Prerequisite 1) is now the base node. All other prerequisites
   depend on it. The graph reflects actual dependency ordering.

6. **Revised the first implementation block.** Block A is now the
   accounting foundation core (journal kernel, chart of accounts,
   period model), not company classification. The accounting foundation
   is the binding constraint: without it, no other prerequisite can be
   implemented.

7. **Preserved the accounting foundation architecture.** Respects
   entity-scoped accounting, accounting periods, chart of accounts,
   journal/posting kernel, source-transaction boundary, immutable
   posted journals, and period controls as defined in the Accounting
   Foundation Blueprint (v1).

8. **Fixed the CIT formula language.** Rewrote the statutory
   calculation flow as a 11-stage conceptual model with clear stage
   names. Each stage is labeled with its statutory basis. The model is
   marked as a concept model, not an implementation-ready formula.

9. **Preserved statutory uncertainty.** NTAA 2025 deadlines, WHT rates,
   Presidential Order status, and unverified capital-allowance rates
   remain explicitly marked as unresolved authoritative-source
   dependencies.

10. **Fixed terminology.** Distinguished NTA 2025 from NTAA 2025
    consistently throughout.

11. **Kept Increment 10 closed.** No proposals to modify or extend
    Record Capture.

12. **Maintained adaptive UI/UX authority.** The
    adaptive-uiux-alignment.md document remains first-class
    implementation authority for all UI/workflow requirements.

## Verification

- `git status` before producing this report: only pre-existing
  uncommitted changes from other agents plus the original untracked
  roadmap file.
- `git status` after producing this report: only the same pre-existing
  changes plus this revised untracked roadmap file. No staged or
  modified files were created or changed.
- No application source file, database file, migration, PRD, technical
  plan, or configuration file was modified.
- `bun run build`, `bun run typecheck`, `bun run audit:load`, and lint
  were not run, per the task's hardware gate.

## Risks or Limitations

- The NTAA 2025 is absent from the repository. All NTAA-dependent values
  remain unresolved. This is an external dependency, not an implementation
  gap.
- First Schedule capital-allowance rates are partially verified. Full
  verification requires the primary NTA 2025 source text, which is in the
  repository.
- The `cit_category` enum values (`medium`, `exempt`) conflict with the
  NTA 2025. The correction (Block G) is a prerequisite for accurate CIT
  treatment.
- The accounting foundation (Block A) is a substantial architectural
  capability. It is the correct first block because all other blocks
  depend on it, but it represents significant implementation effort.

## Deferred Work

- Implement Block A (accounting foundation core) as the first practical
  block after Increment 10.
- Source NTAA 2025 primary text and add to `NRS-docs/`.
- Verify First Schedule capital-allowance rates from primary source.
- Proceed with Waterfall Roadmap Phase 0 (architecture gates) and
  Phase 1 (accounting foundation).
