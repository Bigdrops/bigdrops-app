# CIT-Readiness Roadmap

This report was written by opencode on 2026-09-08 via Freebuff.
Updated 2026-09-13 to reflect Gates A–G completion.

## Objective

Map the statutory Nigerian Corporate Income Tax (CIT) calculation stages to
BIGDROPS current capability. Establish what exists, what is defined, what is
implemented, what is missing, and what depends on what. Produce a
dependency-aware implementation sequence. Identify the first practical
implementation block after Increment 10.

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
| ETR minimum | 15% (MNE ≥€750M or company ≥₦50B) | §57 |

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

## Implementation Status (as of 2026-09-13)

### Completed

| Block | Description | Status |
|-------|-------------|--------|
| **Gate A** | Entity accounting boundary (entity-scoped architecture) | **DONE** — entity scoping via schema-based isolation; TenantClient sets `search_path` to entity schema |
| **Gate B** | Money-precision decision (Decimal.js, precision 20, ROUND_HALF_UP) | **DONE** — `src/domain/accounting/money.ts`; all monetary values stored as `string` at domain boundary |
| **Chart of accounts** | 14-account Nigerian seed chart (asset, liability, equity, revenue, expense) | **DONE** — `src/domain/accounting/chartOfAccounts.ts`; includes CIT (2310), Dev Levy (2320), Tax Expense (5500) |
| **Journal/posting kernel** | Balanced double-entry postings; posted journals immutable | **DONE** — `src/domain/accounting/postingKernel.ts` + `factories.ts` + `invariants.ts`; 14 kernel tests |
| **Accounting-period model** | 4-state lifecycle (planned → open → closed → locked) | **DONE** — types in `accounting/types.ts`; DB triggers enforce period guard |
| **Accounting services** | Posting, source transactions, reporting, reconciliation, reversal | **DONE** — 6 service files in `src/modules/accounting/` |
| **Record Capture** | Expense source transaction capture | **DONE** — Increment 10, independently verified |
| **Tax settings** | TIN, VAT config, CIT category, year-end | **DONE** — `tax_settings` table; Gate B |
| **Tax input entries** | VAT input records with recovery tracking | **DONE** — `tax_input_entries` table; Gate C |
| **Gate D** | Accounting-tax bridge forensics readiness | **DONE** — verified |
| **Gate E** | Rules engine (rule resolver + classifier + computation) | **DONE** — `src/domain/tax/ruleResolver.ts`, `classifier.ts`, `computation.ts`; 28 tests |
| **Gate F** | Tax computation orchestrator | **DONE** — `src/domain/tax/orchestrator.ts`; pure domain, no DB; 14 tests |
| **Gate G** | Journal posting bridge + service | **DONE** — `src/domain/tax/taxBridge.ts` + `src/modules/tax/taxPostingService.ts`; 18 tests |
| **Phase 2A schema** | `tax_computation_inputs`, `tax_computation_results` tables | **DONE** — migration deployed |
| **Entity scoping fix** | Tax services use TenantClient pattern | **DONE** — `computationService.ts`, `taxPostingService.ts`, UI pages |
| **Tax UI pages** | TaxOverview, NewTaxComputation, TaxDetail | **DONE** — lazy-loaded in AppShell, navigation wired |
| **Tax navigation** | Desktop sidebar + mobile more options | **DONE** — navData, Layout, MoreOptions |

### Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Accounting kernel | 14 | ✅ Pass |
| Accounting reporting | 20 | ✅ Pass |
| Accounting persistence | 10 | ✅ Pass |
| Phase 2A architecture | 34 | ✅ Pass |
| Gate E rules engine | 28 | ✅ Pass |
| Gate F tax computation | 14 | ✅ Pass |
| Gate G journal posting | 18 | ✅ Pass |
| Navigation validation | Fixed | ✅ Pass |
| **Total critical** | **419/423** | **4 pre-existing env var failures (not ours)** |

### Remaining (Not Yet Implemented)

| Block | Description | Depends on | Priority |
|-------|-------------|------------|----------|
| **Income statement / P&L** | Revenue-minus-expenses per accounting period; accounting-profit figure | Accounting foundation (done) | Medium — needed for real accounting profit input to tax computation |
| **Fixed-asset register** | Asset identity, cost, category, useful life, depreciation | Accounting foundation (done) | Medium — needed for capital allowances |
| **Capital allowances** | Per-asset statutory computation using First Schedule rates | Fixed-asset register, statutory rules | Medium — deducts from assessable profits |
| **Tax-adjustment layer** | Add-backs (depreciation, capex, private expenses) and deductions (bad debts, stock losses) | Income statement, capital allowances | Medium — transforms accounting profit to assessable profit |
| **Loss register** | Carry-forward per §27(5): same trade, first year after loss | Income statement | Low — computed in Gate F orchestrator, no standalone register |
| **Development Levy UI** | Display in TaxDetail.tsx | Gate F (computed), UI (exists) | Low — value computed and stored in `input_snapshot` |
| **ETR minimum UI** | Display s.57 ETR check in TaxDetail.tsx | Gate F (flagged in trace) | Low — trace data exists, not surfaced in UI |
| **NTAA deadlines** | Filing and payment deadlines | External dependency (NTAA 2025 text) | Low — does not block calculation |
| **Compliance / filing** | Filing workflow, NRS submission | NTAA, CIT calculation | Low — Phase 4 scope |

---

## Dependency Graph

```
Accounting Foundation (DONE)
  │
  ├──→ Expense Source + Accounting Consumption (Record Capture DONE)
  │         │
  │         ├──→ Accounting Periods + Revenue Recognition (Periods DONE)
  │         │         │
  │         │         └──→ Income Statement / P&L (NOT DONE)
  │         │                    │
  │         │                    └──→ Tax Adjustments (Stage 2)
  │         │                               │
  │         └──────────────────────────────→│
  │                                         │
  ├──→ Fixed-Asset Register (NOT DONE)
  │         │                               │
  │         └──→ Capital Allowances ────────→│
  │                                         │
  └──→ Company Classification (DONE) ──→ CIT Rate (Stage 7)
                                              │
  Gate E Rules Engine (DONE) ─────────────────┤
  Gate F Computation (DONE) ──────────────────┤
  Gate G Journal Posting (DONE) ──────────────┘
                                              │
                                              └──→ CIT Calculation
                                                     │
                                                     └──→ NTAA → Compliance
```

### What must be sequential

1. Accounting foundation must exist before anything else. **DONE.**
2. Expense accounting consumption depends on posting kernel and chart of
   accounts. **Record Capture DONE; accounting consumption layer partial.**
3. Accounting periods depend on period model. **DONE.**
4. Income statement depends on posted revenue and expenses by period.
   **NOT DONE — binding constraint for real accounting profit.**
5. Fixed-asset register depends on posting kernel. **NOT DONE.**
6. Capital allowances depend on fixed-asset register and statutory rules.
   **NOT DONE.**
7. Tax-adjustment layer depends on income statement and capital allowances.
   **NOT DONE — but Gate F orchestrator accepts manual input for now.**
8. Company classification depends on entity scoping. **DONE.**
9. CIT calculation depends on tax adjustments, capital allowances, loss
   register, and classification. **Gate F DONE — accepts manual inputs;
   automated pipeline needs income statement + fixed assets.**

### What can proceed in parallel

- Income statement and fixed-asset register can be built in parallel.
- Development Levy and ETR minimum UI enhancements can be done now.
- Statutory-source acquisition (First Schedule rates, Presidential
  Order status) can proceed in parallel with all work.
- NTAA 2025 text acquisition is an external dependency (human action).

---

## Data Sufficiency for CIT

For each CIT input, the current status and what is needed:

| CIT input | Current status | What is needed |
|-----------|---------------|----------------|
| Revenue | Invoice amounts exist. Not accrual-basis. Not posted to journals. | Accounting-period revenue from posted journal entries (income statement). |
| Expenses | `tax_input_entries` captures individual entries. Record Capture exists. Not aggregated by period. | Accounting consumption layer: source → journal → period → aggregate. Or manual input to Gate F. |
| Accounting profit | Not computed automatically. Gate F accepts manual input. | Income-statement computation: revenue minus expenses per accounting period. |
| Tax adjustments | Gate F orchestrator accepts adjustments array. No automated derivation. | Tax-adjustment layer: add-backs (depreciation, capex, private expenses, penalties) and deductions (bad debts, stock losses). |
| Capital allowances | Gate F accepts `qce` array. No automated computation. | Fixed-asset register → per-asset statutory computation using First Schedule rates. |
| Tax losses | Gate F accepts `loss_opening_balance` and `loss_arising`. No standalone register. | Loss register with carry-forward per §27(5). |
| Company classification | Gate E classifier: turnover, fixed_assets, sector → entity_type + company_type. **DONE.** | — |
| CIT rate | Gate E rule resolver: company_type → rate. **DONE.** | — |
| Development levy | Gate F computes: assessable_profit × 4% (excl. small + non-resident). **DONE.** | — |
| ETR minimum | Gate F flags in trace. **DONE.** | UI display. |
| WHT credits | `wht_receipts` table exists. | Available for offset at filing. Not a blocker. |
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

**Current state:** Gate F orchestrator accepts adjustment inputs
manually. Automated derivation from accounting data requires the
income statement and fixed-asset register (not yet built).

### CIT Calculation

The CIT calculation consumes the bridge outputs and applies statutory
rates. See the Conceptual Model section (Stages 1–11) for the full
sequence.

**Current state:** Gate F orchestrator computes CIT from manual inputs.
Gate G bridge posts journal entries (Dr Tax Expense, Cr CIT Payable,
Cr Dev Levy Payable). Fully functional with manual data entry.

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

### 2026-09-08 (baseline)

1. Preserved Record Capture boundary.
2. Reworked expense roadmap.
3. Reworked purchase/PO architecture.
4. Connected purchases to fixed assets.
5. Revised the dependency graph.
6. Revised the first implementation block.
7. Preserved the accounting foundation architecture.
8. Fixed the CIT formula language.
9. Preserved statutory uncertainty.
10. Fixed terminology.
11. Kept Increment 10 closed.
12. Maintained adaptive UI/UX authority.

### 2026-09-13 (update)

1. **Updated all prerequisite statuses.** Accounting foundation (Gate A/B),
   chart of accounts, journal kernel, accounting periods, company
   classification, tax settings, and tax input entries are now DONE.
2. **Added Gates A–G completion.** Tax domain (Gate A), tax settings
   (Gate B), tax input entries (Gate C), forensics readiness (Gate D),
   rules engine (Gate E), computation orchestrator (Gate F), and journal
   posting bridge (Gate G) are all implemented and tested.
3. **Added Phase 2A schema status.** `tax_computation_inputs` and
   `tax_computation_results` tables deployed.
4. **Added entity scoping fix.** Tax services now use TenantClient
   pattern. Entity isolation is by schema, not by `entity_id` column.
5. **Added UI wiring.** TaxOverview, NewTaxComputation, and TaxDetail
   pages created and lazy-loaded. Navigation wired in desktop sidebar
   and mobile more options.
6. **Added test results.** 419/423 tests pass (4 pre-existing env var
   failures).
7. **Updated remaining work.** Income statement, fixed-asset register,
   capital allowances, tax-adjustment layer, and loss register remain.
   These are now clearly scoped as the automated-data-pipeline
   extensions, not core CIT calculation (which works with manual inputs).
8. **Updated dependency graph.** Gates E–G are shown as parallel inputs
   to CIT calculation. The binding constraint for automated data is
   the income statement, not the accounting foundation.
9. **Updated data sufficiency table.** Each CIT input now shows current
   implementation status and what remains.
10. **Added ETR minimum to statutory values.** §57 ETR minimum 15%
    (MNE ≥€750M or company ≥₦50B) added to verified values table.

## Verification

- No application source file, database file, migration, PRD, technical
  plan, or configuration file was modified by this report update.
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
  NTA 2025. The Gate E classifier now uses `company_type` with correct
  NTA categories (`small`, `medium`, `large`), but the DB column in
  `tax_settings` still uses the old enum.
- Gate F computation works with manual inputs. Automated data flow from
  accounting requires the income statement and fixed-asset register
  (not yet built).
- The accounting-to-tax bridge (Stage 2) is not automated. Tax
  adjustments are entered manually in the NewTaxComputation form.

## Deferred Work

- Build income-statement computation (revenue minus expenses per period).
- Build fixed-asset register and capital-allowance computation.
- Build automated tax-adjustment layer (add-backs and deductions from
  accounting data).
- Build loss register with carry-forward tracking.
- Surface ETR minimum check in TaxDetail UI.
- Surface Development Levy breakdown in TaxDetail UI.
- Source NTAA 2025 primary text and add to `NRS-docs/`.
- Verify First Schedule capital-allowance rates from primary source.
- Correct `cit_category` enum in `tax_settings` to match NTA 2025.
