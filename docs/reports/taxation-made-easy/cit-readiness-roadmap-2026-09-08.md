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

## Statutory CIT Calculation Flow

The NTA 2025 defines a multi-stage calculation. Each stage requires specific
data. The stages are not interchangeable and have strict dependency order.

```
Revenue (accounting period)
  minus Expenses (accounting period)
  equals Accounting Profit
    plus Add-backs (disallowed items per section 21)
    minus Allowable deductions (section 20 items not in expenses)
    equals Assessable Profits (section 22(1))
      minus Losses (section 27(5), same trade, carry-forward)
      minus Capital Allowances (First Schedule, section 27(1))
      equals Total Profits (section 27(1))
        times CIT Rate (section 56)
        equals CIT Liability
          plus Development Levy (section 59, 4%, non-small companies)
          equals Total Tax Liability
```

### Verified statutory values (from NRS-docs/NIGERIA-TAX-ACT-2025.md)

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

### Unresolved statutory items (external authoritative-source dependencies)

| Item | Status | Impact |
|------|--------|--------|
| NTAA 2025 primary text | Absent from repository | CIT filing deadline, CIT payment deadline, general VAT return deadline, WHT remittance deadline, WHT rate table — all unresolved |
| Presidential Order / 25% CIT | Effective status not verified | Cannot use 25% rate in production; must use 30% |
| First Schedule capital-allowance values | Partially verified | Plant and machinery rates, building rates, motor vehicle rates — need verification from primary source |
| WHT subsidiary regulation | Absent from repository | WHT rate table and remittance deadline unresolved |

---

## Prerequisite 1: Expense / Running-Cost Capture and Accounting/Tax Consumption

### Current state: IMPLEMENTED (Increment 10) + PARTIAL (consumption)

Increment 10 (Record Capture Foundation) is independently verified and closed.
The capture surface exists and is wired into ComplianceHub.

**What exists:**

- `RecordCaptureSheet.tsx`: bottom-sheet form capturing date, vendor, category,
  reference, amount (gross), notes, evidence files.
- `reverseVat()` in `src/lib/Calculations.ts`: derives net/vat split from gross
  amount using 7.5% rate.
- `tax_input_entries` table: stores `net_amount`, `vat_amount`, `is_recoverable`,
  `category`, `vendor_name`, `date`, `reference`, `evidence`.
- Audit trail: `recordExpenseRecorded()` in `src/lib/audit.ts`.
- ComplianceHub wiring: `RecordCaptureSheet` imported and rendered in
  `ComplianceHub.tsx`.
- Entity scoping: `useEntity()` tenant context.

**What is missing — the accounting/tax consumption gap:**

- `tax_input_entries` stores VAT inputs only. It has no field for:
  - Expense classification for accounting (chart-of-accounts mapping).
  - Expense classification for tax (allowable / disallowable per section 20/21).
  - Whether the expense is capital expenditure (disallowable, section 21).
  - Whether the expense is private or domestic (disallowable, section 21).
  - Connection to a journal entry or accounting period.
- No aggregation of expenses into an accounting-period expense total.
- No integration with a future income statement.
- The Record Capture surface captures individual entries. It does not produce
  an accounting-period expense figure.

**The point at which an expense becomes accounting/tax relevant:**

An expense record is a source transaction, not an accounting posting. It
becomes accounting-relevant when:
1. It is posted to a journal entry within an accounting period.
2. The journal entry is balanced (debits equal credits).
3. The accounting period is open.

It becomes tax-relevant when:
1. It has been posted to the journal (accounting fact exists).
2. A tax-adjustment layer classifies it as allowable (§20) or disallowable
   (§21).
3. The classification produces a statutory adjustment entry.

Record Capture alone does not reach either threshold. It produces source
transactions that feed the accounting layer.

### Dependency on other prerequisites

- Requires Prerequisite 2 (accounting periods) to assign expenses to periods.
- Requires Prerequisite 3 (income statement) to aggregate expenses into
  accounting-period totals.
- Requires a future chart of accounts for expense classification.
- Requires a future tax-adjustment layer for allowable/disallowable
  classification.

### Implementation blocks

| Block | Description | Depends on |
|-------|-------------|------------|
| B1.1 | Extend `tax_input_entries` with `expense_type` (enum: operating, capital, private, other) and `account_classification` (text, chart-of-accounts code). | Chart of accounts design (Phase 1) |
| B1.2 | Extend `tax_input_entries` with `tax_classification` (enum: allowable, disallowable, pending). Default pending. | Tax-adjustment layer design (Phase 2) |
| B1.3 | Create `expense_line_items` view or materialization that aggregates `tax_input_entries` by accounting period for income-statement consumption. | Prerequisite 2 (accounting periods) |
| B1.4 | Wire expense aggregation into income-statement computation. | Prerequisite 3 (income statement) |

---

## Prerequisite 2: Accounting Periods and Accrual-Based Revenue Recognition

### Current state: PARTIAL (periods exist, no accrual model)

**What exists:**

- `tax_filings` has `period_start` and `period_end` fields. These define
  filing periods, not accounting periods.
- `tax_reminders` has `period_start` and `period_end` fields. Same pattern.
- `settings` has `year_end_month` and `year_end_day`. Defines the company's
  financial year end.
- Invoice dates (`issue_date`) and payment dates exist. Revenue is tracked
  as invoice-cash, not accrual.

**What is missing:**

- No accounting-period model with open/closed/locked states.
- No revenue recognition policy. Revenue today equals invoice issue date
  amounts. The accounting foundation blueprint (section 12) requires invoice
  as claim; recognition policy in the accounting layer.
- No accrual-basis revenue: revenue for a period is not determined by when
  the service was performed or the invoice was issued, but by the
  accounting-period assignment.
- No period-lock mechanism that prevents back-dated postings.

**Why accrual matters for CIT:**

Section 22(1) ties assessable profits to the accounting period immediately
preceding the year of assessment. If revenue is invoice-cash (recognized
when the invoice is issued or paid), it does not match the statutory basis.
The accounting layer must assign revenue to the period in which it is
earned, not when the invoice is created or paid.

### Dependency on other prerequisites

- Requires Phase 0 decisions (GATE A: entity accounting boundary, GATE B:
  money precision).
- Requires Phase 1 accounting foundation (chart of accounts, journal kernel,
  posting boundary).
- Independent of Prerequisites 3-6 for design, but dependent for
  implementation.

### Implementation blocks

| Block | Description | Depends on |
|-------|-------------|------------|
| B2.1 | Design accounting-period model: planned → open → closed → locked. Period scoping per GATE A decision. | GATE A, GATE B |
| B2.2 | Define revenue-recognition policy: when does an invoice amount become recognized revenue? Options: invoice date, service delivery date, payment date, or explicit accrual posting. | B2.1 |
| B2.3 | Implement period lifecycle: open period, post to period, close period, lock period. Reject back-dated postings to closed periods. | B2.1, Phase 1 posting kernel |
| B2.4 | Map existing invoice revenue to accounting-period revenue. Revenue for CIT is accounting-period revenue, not invoice cash. | B2.2, B2.3 |

---

## Prerequisite 3: Income Statement / P&L Computation

### Current state: MISSING

**What exists:**

- `Reports.tsx` has a "Financial Overview" tab. It shows invoice aggregates,
  not an income statement.
- `Reports.tsx` has a "Tax Positions" tab. It shows VAT charged and WHT
  exposure. No profit computation.
- `computeDocumentTotals()` computes invoice-level totals. It does not
  aggregate across documents or periods.

**What is missing:**

- No income statement or profit-and-loss computation.
- No revenue-minus-expenses calculation.
- No accounting-profit figure.
- No separation between operating revenue, other income, cost of goods sold,
  operating expenses, and non-operating items.

**Why it matters for CIT:**

Accounting profit is the starting point for the statutory bridge (section
22(1)). Without an income-statement computation, there is no accounting
profit, and therefore no starting point for tax adjustments.

### Dependency on other prerequisites

- Requires Prerequisite 1 (expense capture) for the expense side.
- Requires Prerequisite 2 (accounting periods) for period-scoped aggregation.
- Requires Phase 1 accounting foundation (chart of accounts, journal kernel,
  posting boundary) for journal-derived reporting.

### Implementation blocks

| Block | Description | Depends on |
|-------|-------------|------------|
| B3.1 | Design income-statement structure: revenue, cost of goods sold, gross profit, operating expenses, operating profit, other income/expenses, profit before tax. | Phase 1 chart of accounts |
| B3.2 | Implement income-statement computation from journal entries. Revenue from posted invoices; expenses from posted expense entries. Period-scoped. | B2.3, B3.1, Phase 1 posting kernel |
| B3.3 | Produce accounting-profit figure for a given accounting period. This is the starting input for the tax-adjustment layer. | B3.2 |

---

## Prerequisite 4: Fixed-Asset Register, Accounting Depreciation, and Tax Capital Allowances

### Current state: MISSING

**What exists:**

- No fixed-asset register.
- No depreciation computation.
- No capital-allowance computation.
- No asset categories or useful-life definitions.

**What is missing:**

- Asset register: asset identity, acquisition cost, acquisition date, asset
  category, useful life, business-use proportion, disposal date.
- Accounting depreciation: periodic depreciation charge against asset book
  value. This is an accounting concept only.
- Tax capital allowances: statutory deduction from assessable profits per
  the First Schedule. This is a separate computation from accounting
  depreciation.
- Balancing adjustments on disposal (First Schedule rules).

**The critical distinction: accounting depreciation ≠ tax capital allowance.**

Accounting depreciation is the systematic allocation of an asset's cost
over its useful life. It is an accounting estimate. It reduces the asset's
book value on the balance sheet.

Tax capital allowances are statutory deductions from assessable profits
allowed by the First Schedule of the NTA 2025. They are computed using
statutory rates and categories, not accounting estimates. An asset's
capital allowance may differ from its accounting depreciation in:

- Rate: statutory rate vs. estimated useful life.
- Category: plant and machinery vs. building vs. motor vehicle — each has
  a different statutory rate.
- Timing: capital allowances may begin in the year of acquisition;
  depreciation may follow a different convention.
- Proration: capital allowances are prorated for partly-used assets
  (§27(3)); depreciation may or may not be.

**The tax adjustment:**

In the accounting-to-tax bridge (Phase 2), accounting depreciation is
added back to accounting profit (it is a disallowable deduction per section
21). Capital allowances are then deducted from assessable profits (section
27(1)). The net effect is:

```
Accounting Profit
  + Accounting Depreciation (add-back, disallowable per §21)
  - Capital Allowances (deduction per §27(1) and First Schedule)
  = Adjusted Profit (before losses)
```

This two-step adjustment is mandatory. CIT must not simply use accounting
depreciation as the tax deduction.

### Dependency on other prerequisites

- Requires Phase 1 accounting foundation (chart of accounts, journal kernel)
  for asset register and depreciation postings.
- Requires Phase 2 tax-adjustment layer for capital-allowance computation.
- Requires Phase 3 statutory rules engine for First Schedule rates.
- Independent of Prerequisites 1-3 for design, but dependent for
  full integration.

### Implementation blocks

| Block | Description | Depends on |
|-------|-------------|------------|
| B4.1 | Design fixed-asset register: asset identity, acquisition cost, acquisition date, category (plant/machinery, building, motor vehicle, mast, mining, agriculture, intangible, heavy transport), useful life, business-use proportion, disposal date, disposal proceeds. | Phase 1 |
| B4.2 | Implement accounting depreciation: periodic charge against book value. Straight-line v1 default per blueprint section 15. Posts to journal. | B4.1, Phase 1 posting kernel |
| B4.3 | Design capital-allowance computation: per-asset statutory allowance using First Schedule rates. Separate from depreciation. Produces a period-scoped capital-allowance figure. | B4.1, Phase 3 statutory rules |
| B4.4 | Implement tax-adjustment entry: add back accounting depreciation, deduct capital allowances. Produces a statutory adjustment figure for the income-statement bridge. | B4.2, B4.3, Phase 2 bridge |
| B4.5 | Implement balancing adjustments on asset disposal. | B4.1, B4.3 |

---

## Prerequisite 5: Company Classification Data

### Current state: PARTIAL (type exists, data missing)

**What exists:**

- `domain/compliance/types.ts` defines `CitCategory = 'small' | 'medium' |
  'large' | 'exempt'`. The `'medium'` value is not in the NTA 2025 (no
  medium band exists in §56). The `'exempt'` value is not a defined NTA
  category.
- `TaxSettings` interface has `tin`, `vat_enabled`, `vat_threshold`,
  `cit_category`, `year_end_month`, `year_end_day`.
- `tax_settings` table stores these fields. `cit_category` is a text field
  that accepts the enum values.

**What is missing:**

- No capture of gross turnover per annum (required for §202 classification).
- No capture of total fixed assets (required for §202 classification).
- No capture of whether the business provides professional services
  (required for §202 exclusion).
- No capture of legal form (corporate or other — section 3 requires a
  "company").
- No automatic classification logic. The user must manually set
  `cit_category`.
- `cit_category` enum values (`medium`, `exempt`) conflict with the NTA 2025
  categories. The canonical categories are: small company (0%), other
  company (30%/25%).

**What CIT treatment requires:**

- The company must be classified as "small company" or "other company" per
  §202.
- Classification determines: CIT rate (0% vs. 30%), development-levy
  exclusion (small companies are excluded per §59(1)).
- Classification depends on: gross turnover, total fixed assets, professional
  services flag, and legal form.
- Classification must be verified before CIT can be computed. Presenting a
  CIT figure without verified classification would require invented values.

### Dependency on other prerequisites

- Independent of Prerequisites 1-4 for data capture design.
- Required before any CIT computation (Prerequisite 6).
- Requires Phase 0 decisions (GATE A) for entity scoping.

### Implementation blocks

| Block | Description | Depends on |
|-------|-------------|------------|
| B5.1 | Correct `cit_category` enum: remove `medium` and `exempt`. Replace with `small` and `other`. Align with §202. | — |
| B5.2 | Add fields to `tax_settings` or a new `company_classification` table: `gross_turnover` (numeric), `total_fixed_assets` (numeric), `professional_services` (boolean), `legal_form` (enum: corporate, other). | GATE A |
| B5.3 | Implement classification logic: given turnover, fixed assets, professional-services flag, and legal form → classify as small or other per §202. | B5.2 |
| B5.4 | Wire classification into CIT computation: determine rate (0% or 30%) and development-levy exclusion. | B5.3, Prerequisite 6 |

---

## Prerequisite 6: NTAA 2025 Authoritative Text / Deadline Dependency

### Current state: EXTERNAL DEPENDENCY

**What exists:**

- The NTA 2025 is in the repository (`NRS-docs/NIGERIA-TAX-ACT-2025.md`).
- The NTAA 2025 is absent from the repository.
- The CIT-readiness audit (2026-09-05) identified this as a gap.
- The Waterfall Roadmap (Phase 3, unresolved items) lists NTAA-dependent
  values as explicit blockers.

**What is missing:**

- NTAA 2025 primary text. This governs:
  - CIT annual return deadline.
  - CIT payment deadline.
  - General VAT return deadline.
  - WHT remittance deadline.
  - WHT rate table (subsidiary regulation).
- Without the NTAA, filing and payment deadlines cannot be stated as
  verified values.

**Impact on CIT readiness:**

The NTAA absence does not block CIT calculation. It blocks:
- CIT filing deadline display and reminders.
- CIT payment deadline tracking.
- Compliance status representation (filing on time vs. overdue).
- WHT rate table (if used for CIT-related WHT).

The calculation itself (accounting profit → tax adjustments → CIT liability)
does not require the NTAA. The compliance and filing layers do.

### Dependency on other prerequisites

- Independent of Prerequisites 1-5 for calculation.
- Required for compliance/filing (Phase 4).
- External dependency: the NTAA 2025 text must be sourced and added to
  `NRS-docs/` by a human or external process.

### Implementation blocks

| Block | Description | Depends on |
|-------|-------------|------------|
| B6.1 | Source NTAA 2025 primary text and add to `NRS-docs/`. | External — human action |
| B6.2 | Extract CIT filing deadline, CIT payment deadline, WHT rate table, and WHT remittance deadline from NTAA. Add to `OBLIGATION-LOOKUP-INDEX.md`. | B6.1 |
| B6.3 | Wire deadlines into compliance reminders and filing panels. | B6.2, Phase 4 |

---

## Surrounding Business Capabilities: CIT Relevance Map

### Purchases / Purchase Orders (PO)

A PO is a business commitment, not an accounting transaction. It does not
create an expense, a liability, or a tax consequence at the time of
creation.

The PO becomes accounting/tax relevant at specific points:

| Event | Accounting effect | Tax effect |
|-------|-------------------|------------|
| PO created | None. Commitment only. | None. |
| Goods/services received | Potential accrual: liability recognized if goods received but not yet invoiced. | None until expense is posted. |
| Supplier invoice received | Expense recognized (accrual basis). Posts to journal: debit expense, credit accounts payable. | Expense becomes a candidate for allowable/disallowable classification per §20/§21. |
| Payment made | Liability settled. Posts to journal: debit accounts payable, credit cash/bank. | None additional (expense already recognized at invoice). |
| VAT charged on purchase | VAT input recorded in `tax_input_entries`. | Recoverable VAT per VAT rules. Separate from CIT. |

**Do not treat a PO as automatically being an expense or accounting
transaction.** The PO is an upstream business event. The expense is
recognized when the supplier invoice is received (accrual basis) or when
payment is made (cash basis, if that is the chosen recognition policy).

### Credit Notes / Refunds

Credit notes reduce revenue. They are accounting transactions that reverse
or reduce the original invoice's revenue posting.

| Event | Accounting effect | Tax effect |
|-------|-------------------|------------|
| Credit note issued | Reduces revenue for the period. Posts a reversal or contra entry to the journal. | Reduces accounting profit for the period. Affects CIT. |
| Refund paid | Cash outflow. Posts to journal: debit revenue/contrary, credit cash/bank. | None additional (revenue already reduced). |

Credit notes must be posted to the same accounting period as the original
invoice, or to the period in which they are issued (depending on the
recognition policy). They reduce the revenue figure used for CIT.

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
1. WHT credits must be available for offset against CIT liability at filing.
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
rates:

```
Total Profits (from bridge)
  times CIT Rate (§56: 0% small, 30% other)
  equals CIT Liability
    plus Development Levy (§59: 4%, non-small)
    equals Total Tax Liability
      minus WHT Credits
      minus Prior Payments
      equals Amount Payable / (Refundable)
```

### Compliance / Transmission

The compliance layer manages filing, payment, evidence, and reconciliation.
It consumes CIT calculation outputs and produces compliance positions.

The compliance layer is Phase 4 of the Waterfall Roadmap. It depends on:
- CIT calculation (this roadmap).
- NTAA 2025 deadlines (Prerequisite 6).
- Evidence layer (reusable from VAT filing support).

---

## Dependency Graph

```
Prerequisite 1 (Expenses) ─────┐
                                ├──→ Prerequisite 3 (Income Statement) ──→ Tax Bridge → CIT
Prerequisite 2 (Periods) ──────┘         │
                                          │
Prerequisite 4 (Fixed Assets) ────────────┤
                                          │
Prerequisite 5 (Classification) ──────────┤
                                          │
Prerequisite 6 (NTAA) ────────────────────┘ (blocks compliance, not calculation)
```

### What can proceed in parallel

- Prerequisites 1, 2, 4, and 5 can be designed in parallel.
- Prerequisite 6 is an external dependency (human action).
- Statutory-source acquisition (First Schedule rates, Presidential Order
  status) can proceed in parallel with all prerequisites.

### What must be sequential

1. Prerequisite 2 (periods) must exist before Prerequisite 3 (income
   statement) can aggregate revenue and expenses by period.
2. Prerequisites 1 and 2 must exist before Prerequisite 3 can compute
   accounting profit.
3. Prerequisite 4 (fixed assets) must exist before the tax bridge can
   compute capital allowances.
4. Prerequisite 5 (classification) must exist before CIT rates can be
   applied.
5. All prerequisites must exist before CIT can be computed.

---

## Implementation Sequence

### After Increment 10: First Practical Block

The first practical implementation block after Increment 10 is:

**Block A: Company Classification Capture (Prerequisite 5)**

This is the smallest, most independent block. It requires:
- Correct the `cit_category` enum (remove `medium`, `exempt`).
- Add classification fields to `tax_settings`.
- Implement classification logic.

It has no dependencies on other prerequisites. It can be implemented
immediately after Increment 10. It unblocks CIT rate determination.

### Full implementation sequence

| Order | Block | Prerequisite | Depends on | Waterfall Phase |
|-------|-------|-------------|------------|-----------------|
| 1 | B5.1–B5.4 | Company classification | GATE A | Phase 0 |
| 2 | B2.1–B2.4 | Accounting periods | GATE A, GATE B | Phase 1 |
| 3 | B1.1–B1.2 | Expense classification | Chart of accounts | Phase 1 |
| 4 | B4.1 | Fixed-asset register | Phase 1 | Phase 1 |
| 5 | B4.2 | Accounting depreciation | B4.1, posting kernel | Phase 1 |
| 6 | B3.1–B3.2 | Income statement | B2.3, B1.3, posting kernel | Phase 1 |
| 7 | B3.3 | Accounting-profit figure | B3.2 | Phase 1 |
| 8 | B1.3–B1.4 | Expense aggregation | B2.3, B3.2 | Phase 1 |
| 9 | B4.3 | Capital allowances | B4.1, statutory rules | Phase 2–3 |
| 10 | B4.4 | Depreciation add-back + capital-allowance deduction | B4.2, B4.3 | Phase 2 |
| 11 | B4.5 | Disposal balancing adjustments | B4.1, B4.3 | Phase 2 |
| 12 | Tax bridge | Accounting-to-tax transformation | B3.3, B4.4, loss register | Phase 2 |
| 13 | CIT calculation | Rate application + levy | Bridge output, B5.3 | Phase 3 |
| 14 | B6.1–B6.2 | NTAA deadlines | External | Phase 3–4 |
| 15 | Compliance | Filing, payment, evidence | CIT calculation, B6.2 | Phase 4 |

---

## Data Sufficiency for CIT

For each CIT input, the current status and what is needed:

| CIT input | Current status | What is needed |
|-----------|---------------|----------------|
| Revenue | Invoice amounts exist. Not accrual-basis. | Accounting-period revenue from posted journal entries. |
| Expenses | `tax_input_entries` captures individual entries. Not aggregated. Not classified for accounting/tax. | Period-scoped expense aggregation from posted journal entries with allowable/disallowable classification. |
| Accounting profit | Missing. | Income-statement computation: revenue minus expenses per accounting period. |
| Tax adjustments | Missing. | Add-backs (depreciation, capital expenditure, private expenses, penalties, taxes on profits, unapproved pensions) and deductions (bad debts, stock losses, pre-commencement expenses). |
| Capital allowances | Missing. | Per-asset statutory computation using First Schedule rates. Separate from accounting depreciation. |
| Tax losses | Missing. | Loss register with carry-forward per §27(5): same trade, first year after loss, until recouped. |
| Company classification | `cit_category` exists but has wrong enum values. No turnover or fixed-asset data. | Corrected enum, turnover capture, fixed-asset capture, professional-services flag. |
| CIT rate | Not computable. | Classification (Prerequisite 5) → 0% or 30%. |
| Development levy | Not computable. | Classification (Prerequisite 5) → 4% if not small. |
| WHT credits | `wht_receipts` table exists. | Available for offset at filing. Not a blocker for calculation. |
| Prior payments | `tax_filings` stores `amount_paid`. | Available. Not a blocker. |
| Filing deadlines | Missing (NTAA absent). | External dependency. Does not block calculation. |

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

None. This report changed no file. This report is the only new file.

## Verification

- `git status` before producing this report: recorded above.
- `git status` after producing this report: only this new file under
  `docs/Reports/taxation-made-easy/`.
- No application source file, database file, migration, PRD, technical plan,
  or configuration file was modified.
- `bun run build`, `bun run typecheck`, `bun run audit:load`, and lint were
  not run, per the task's hardware gate.

## Risks or Limitations

- The NTAA 2025 is absent from the repository. All NTAA-dependent values
  remain unresolved. This is an external dependency, not an implementation
  gap.
- First Schedule capital-allowance rates are partially verified. Full
  verification requires the primary NTA 2025 source text, which is in the
  repository.
- The `cit_category` enum values (`medium`, `exempt`) conflict with the
  NTA 2025. The correction (B5.1) is a prerequisite for accurate CIT
  treatment.
- This roadmap does not implement anything. It defines what must be built
  and in what order. Implementation begins with Block A (company
  classification) after Increment 10.

## Deferred Work

- Implement Block A (company classification capture) as the first practical
  block after Increment 10.
- Source NTAA 2025 primary text and add to `NRS-docs/`.
- Verify First Schedule capital-allowance rates from primary source.
- Proceed with Waterfall Roadmap Phase 0 (architecture gates) and Phase 1
  (accounting foundation).
