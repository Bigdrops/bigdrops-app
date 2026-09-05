# CIT Readiness Audit Report

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Audit BIGDROPS's readiness for Corporate Income Tax (CIT) under Nigerian law. Establish what BIGDROPS can truthfully calculate, explain, support with records, and eventually help a company file for CIT. This is an audit and gap-analysis only. No application code, schema, migration, or tax calculation logic was changed. No CIT was implemented.

## Scope

- Read the statutory CIT provisions in `NRS-docs/NIGERIA-TAX-ACT-2025.md` (canonical).
- Cross-checked against `NRS-docs/Cable-Ngn-tax-act-2025-v2.md`.
- Read the current obligation state in `NRS-docs/OBLIGATION-LOOKUP-INDEX.md`.
- Read the tax PRDs: `Technical-plan.md` (v1.0), `Technical-plan-v1.1.md`, `Files-tax-monthly-v1.md`, `Record-capture-v1.md`, `bigdrops-tax-ux-vision-v1.md`, `Openai-ux-contribution.md`, `Readme.md`.
- Searched the repository for CIT implementation and accounting structures.
- API and direct tax-authority integration are out of scope.

## Baseline Git Status

Captured before the audit:

```
AM docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md
MM docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md
A  docs/reports/general/files-tax-monthly-prd-audit-2026-09-05.md
A  docs/reports/general/invoice-to-quotation-revert-blocker.md
A  docs/reports/general/invoice-to-quotation-revert-fix.md
A  docs/reports/general/vat-filing-support-prd-update-2026-09-05.md
A  docs/reports/multi-tenancy/workspace-management-gaps-audit.md
M  src/domain/tenant/tenantCreation.ts
M  src/modules/invoices/services/invoiceConversionService.ts
M  src/pages/settings/AdminSettingsSection.tsx
M  src/pages/viewQuotationActions.ts
A  supabase/migrations/20260905000000_revert_invoice_canonical_tenant_install.sql
A  supabase/migrations/20260905010000_workspace_management_gaps.sql
?? docs/Reports/general/record-capture-prd-audit-2026-09-05.md
?? docs/Reports/multi-tenancy/ownership-transfer-ui.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-capture-v1.md
```

All changes above pre-date this audit. They belong to other agents or earlier sessions. This audit did not touch them.

## Skills Used

- `karpathy`
- `writing-clearly-and-concisely`

## Documentation Standard

ASD-STE100 Simplified Technical English

## Sources Reviewed

- `NRS-docs/NIGERIA-TAX-ACT-2025.md` — sections 3, 4, 5, 6, 20, 21, 22, 27, 29, 56, 57, 59, 202, First Schedule Part I.
- `NRS-docs/Cable-Ngn-tax-act-2025-v2.md` — cross-check of the same sections.
- `NRS-docs/OBLIGATION-LOOKUP-INDEX.md` — CIT rows at lines 49-55 and 70-72.
- `Technical-plan.md` — sections 2.3, 8.2, 8.3, 9.4.
- `Technical-plan-v1.1.md` — patch scope, sections 5 and 8.
- `src/lib/Calculations.ts`, `src/pages/Reports.tsx`, `src/components/reports/reportUtils.ts`, `src/components/reports/TaxSection.tsx`, `src/components/compliance/*`, `src/domain/compliance/types.ts`, migrations `20260520090000_core_tables.sql`, `20260520090003_invoices.sql`, `20260520090009_tax.sql`, `20260705100000_payment_attachments.sql`.

## Statutory CIT Model

### Who is liable

- Section 3: income tax is imposed on the profits or gains of any company or enterprise.
- Section 4: income, profits or gains accruing in or derived from Nigeria are chargeable, including profits from trade or business, fees, royalties, gains from disposal of property or fixed assets, and any other income.
- Section 5: a company may be charged in its own name or through a principal officer, agent, receiver, liquidator, or administrator.
- Section 6: the profits of a Nigerian company are deemed to accrue in Nigeria wherever they arise.

### Company classification

- Section 202 defines "small company" as a company that earns gross turnover of ₦50,000,000 or less per annum, with total fixed assets not exceeding ₦250,000,000, provided that a business providing professional services is not classified as a small company.
- "Small business" does not occur in the Act. There is no separate statutory "small business" classification in the NTA.
- The lookup index (line 55) flags a mismatch: `Technical-plan.md` section 8.3 lists the turnover figure as ₦100,000,000. The statutory figure is ₦50,000,000. The statutory figure wins.

### Rates and thresholds

- Section 56: a small company pays CIT at 0%; any other company pays 30% from the commencement of the Act. The 30% rate is reduced to 25% effective from a date determined by a presidential Order. The lookup index records both: 0% (A 428, JSON 42, MD 1604) and 30%/25% (A 428, JSON 42, MD 1606-1608).
- Section 57: an effective-tax-rate floor of 15% applies only to multinational groups with group turnover of at least €750 million, or companies with aggregate turnover of ₦50,000,000,000 and above. It does not apply to an ordinary SME.
- Section 59: a development levy of 4% is imposed on the assessable profits of companies chargeable under Chapters Two and Three, other than small companies and non-resident companies. This is a separate levy, not part of the 30% rate. The lookup index records it at A 429-430, JSON 43-44, MD 1649.
- Education Tax (Tertiary Education Trust Fund) is funded by the development levy under section 59(3). It is not a separate charge in the NTA.

### The tax base: accounting profit to taxable profit

- Section 22(1): the assessable profits of a trade or business for each year of assessment are the profits of the accounting period immediately preceding the year of assessment. This is a preceding-year basis, tied to the accounting period.
- Section 27(1): the total profits of a company for a year of assessment are the total assessable profits from all sources, including chargeable gains, less losses and capital allowances.
- The statutory bridge is: accounting profit → statutory adjustments → assessable profits → less losses and capital allowances → total profits → apply the rate.

### Allowable deductions (section 20)

- Expenses wholly and exclusively incurred in the production of income, including: interest on debt; rent; salaries, wages and employee benefits; repairs; costs of defending title to assets; approved pension contributions; loss of stock or inventory; bad and doubtful debts (with recovery rules); research and development expenses; certain pre-commencement expenses; and costs of assistive devices.
- Non-Naira expenses are deductible only to the extent of the Naira equivalent at the CBN official exchange rate.

### Disallowed deductions (section 21)

- Capital repaid or withdrawn; capital expenditure; domestic or private expenses; sums recoverable under insurance; taxes on profits; depreciation or impairment of fixed assets; unapproved pension fund payments; reserves out of profits; connected-person payments inconsistent with transfer pricing regulations; expenses of exempt income; penalties and fines; and expenses on which VAT was due but not charged.

### Capital allowances

- Section 27(1) and (2) deduct capital allowances from assessable profits in accordance with Part I of the First Schedule.
- The First Schedule defines qualifying capital expenditure: plant and machinery, buildings, masts, mining, agriculture, intangible assets, motor vehicles, and heavy transportation.
- Allowances are prorated where an asset is only partly used in generating assessable profits (section 27(3)); not prorated where non-taxable income is below 10% of total income (section 27(4)).
- Capital allowances require a fixed-asset register and depreciation-equivalent records.

### Tax losses

- Section 27(5): a loss is deductible only from the trade or business in which it was incurred, up to the amount of that loss, against the first year of assessment after the loss, then subsequent years until fully recouped.
- Digital-asset losses are ring-fenced (section 27(6)).

### Filing and payment

- The NTA does not fix the CIT annual return deadline or the CIT payment deadline. Filing and payment administration is delegated to the Nigeria Tax Administration Act, 2025 (NTAA), which is absent from the repository. The lookup index line 71 records the WHT deadline as NOT IN NRS-DOCS; the same absence applies to the CIT return and payment deadlines.
- The audit therefore does not state a CIT filing or payment deadline.

## BIGDROPS Current Capability

### What exists

- `src/lib/Calculations.ts` computes document-level values through `computeDocument()`: invoice totals, VAT, WHT, and discounts. It has no CIT computation and no accounting-profit concept.
- `Reports.tsx` has five tabs: Financial Overview, Account Receivables, Collections Registry, Project Performance, and Tax Positions. The Tax Positions tab computes VAT charged, expected WHT exposure, and actual WHT deducted. No CIT.
- The Compliance Hub has panels for VAT inputs, WHT receipts, tax filings, and tax reminders.
- `tax_filings` and `tax_reminders` tables accept a `tax_type` of `'vat' | 'wht' | 'cit'`. The CIT label exists for manual tracking only. `TaxFilingsPanel`, `TaxRemindersPanel`, and `ComplianceOverview` render the label; nothing computes a CIT amount.
- `tax_input_entries` stores VAT inputs with `net_amount`, `vat_amount`, and `is_recoverable`.
- `payments` records money received against invoices. It has no money-out path.
- The `settings` table stores company name, address, bank details, and branding. It has no legal-form, TIN, or business-type field.
- `Record-capture-v1.md` (PRD, not implemented) defines the minimum expense and running-cost capture surface.
- `Technical-plan.md` section 9.4 requires a "CIT and Development Levy Estimator" and says "keep the same formula as the prior draft." The formula is not present in the repository. The lookup index line 49 ties the estimator to section 56(a).

### What does not exist

- No income statement, profit and loss, or financial statement computation.
- No expense capture (only a PRD).
- No supplier-payment or money-out recording.
- No fixed-asset register, no depreciation, no capital-allowance computation.
- No journal, ledger, or chart of accounts.
- No accounting-period model beyond invoice issue dates and payment dates.
- No legal-form or TIN capture.
- No CIT filing or payment deadline source (NTAA absent).
- No CIT computation of any kind.

## Data Sufficiency

For each CIT input:

| CIT input | Status | Evidence |
|-----------|--------|----------|
| Revenue | Available but insufficient | Invoice line items and payments exist, but revenue for CIT is accounting-period revenue, not invoice cash. No accrual basis. |
| Expenses | Missing | No expense table or UI. `Record-capture-v1.md` defines the requirement only. |
| Accounting profit | Missing | No profit and loss computation exists. |
| Tax adjustments | Missing | No model for statutory add-backs or disallowances. |
| Capital allowances | Missing | No fixed-asset register or depreciation data. |
| Tax losses | Missing | No loss carry-forward record. |
| Company classification | Missing | No legal-form, TIN, or turnover classification field. |
| Prior tax positions/payments | Available but insufficient | `tax_filings` stores manual `amount_due` and `amount_paid` per period. No computation. |
| Filing/payment deadlines | Unknown | NTAA absent from the repository. |

## Accounting Foundation

BIGDROPS cannot derive accounting profit today. It has invoice revenue and payment records, but no expense side, no accrual basis, no depreciation, and no profit aggregation. The statutory bridge from accounting profit to taxable profit therefore cannot be built.

The minimum accounting foundation required before a defensible CIT figure is possible:

1. Expense and running-cost capture (defined in `Record-capture-v1.md`).
2. A revenue recognition basis for an accounting period (accrual, not invoice cash).
3. An income statement computation: revenue minus expenses equals accounting profit.
4. A fixed-asset register with depreciation.
5. A company-classification record (legal form, TIN, gross turnover, fixed assets, professional-services flag).
6. An accounting-period model aligned to the year of assessment.

## Tax Adjustment Model

The product would need to represent these statutory adjustments:

- Add-backs for disallowed items: depreciation, capital expenditure, private expenses, penalties, taxes on profits, unapproved pension payments.
- Deductions for allowable items not yet captured: bad debts, stock losses, pre-commencement expenses.
- Capital-allowance computation per the First Schedule categories.
- Loss deduction and carry-forward per section 27(5).
- Non-Naira expense conversion at the CBN official rate.
- The development levy at 4% on assessable profits (excluding small companies).
- The effective-tax-rate floor for the ₦50,000,000,000-turnover population only.

The audit does not reduce CIT to "profit × rate." The rate is applied to total profits after losses and capital allowances, and the levy is computed separately.

## Company Classification Requirements

To classify a company, BIGDROPS needs to capture and maintain:

- Legal form (corporate or other).
- Gross turnover per annum.
- Total fixed assets.
- Whether the business provides professional services.

These four facts decide the 0% versus 30% rate and the development-levy exclusion. None of them exists in the current schema.

## Filing and Payment Separation

CIT has the same separation requirements as VAT and WHT:

| Stage | Current state |
|-------|---------------|
| Tax calculation | Does not exist. |
| Return preparation | Does not exist. |
| Filing | Manual only (`tax_filings` status and `submitted_at`). |
| Payment | Manual only (`amount_paid`). |
| Evidence | Missing. |
| Reconciliation | Missing. |

## Evidence Chain

The conceptual traceability chain for CIT:

Accounting records → accounting result (income statement) → tax adjustments → assessable profits → losses and capital allowances → total profits → CIT liability → payments and credits → outstanding position → filing and payment evidence.

BIGDROPS has the first link only partially (invoices and payments). Every other link is missing. Missing records must surface as exceptions, never as assumed values.

## User Experience

A useful CIT experience must explain the figure, not display a liability. It should answer, in plain language:

- How was this calculated?
- Which business records produced the starting accounting figure?
- Which adjustments changed accounting profit into taxable profit?
- Which expenses were allowed or disallowed?
- What capital allowances and losses were applied?
- Which prior payments and credits were recognised?
- What remains payable?
- What records are missing or require review?

This follows the same pattern as the VAT Filing Support section of `Files-tax-monthly-v1.md` (section 4). The presentation layer must not recompute tax values; it must read authoritative calculation outputs.

## PRD versus Technical Plan

- The CIT PRD should define: product intent, the user experience, the evidence chain, the exception model, and the deferred execution decisions.
- The technical plan should define: the data model, the calculation module, the accounting-period model, and the report surfaces.
- `Technical-plan.md` section 9.4 names a CIT and Development Levy estimator but contains no formula. The formula is the responsibility of the technical plan, and it must be written from the statutory sections cited in this report.
- `Technical-plan.md` section 8.3 must be corrected from ₦100,000,000 to ₦50,000,000 for small-company turnover. The lookup index already records this as a mismatch.

## Dependencies Before CIT Implementation

1. Expense and running-cost capture (`Record-capture-v1.md`).
2. Accounting-period and revenue-recognition model.
3. Income statement computation.
4. Fixed-asset register and depreciation.
5. Company-classification capture (legal form, TIN, turnover, fixed assets).
6. NTAA 2025 text added to `NRS-docs/` so filing and payment deadlines resolve inside the repository.
7. VAT Filing Support groundwork (evidence layer) from `Files-tax-monthly-v1.md`, reused for CIT evidence.

## Can BIGDROPS Calculate a Defensible CIT Figure Today?

No. The audit found no CIT computation, no expense data, no accounting profit, no capital-allowance data, no loss records, and no company-classification data. Invoice and payment records alone are not sufficient. Presenting any CIT figure today would require invented or assumed values, which the product must not do.

## Changes Made

None. This audit changed no file. This report is the only new file.

## Verification

- `git status` before the audit: recorded above.
- `git status` after the audit: the only new file is this report under `docs/reports/GENERAL/`.
- No application source file, database file, migration, PRD, technical plan, or configuration file was modified.
- `bun run build`, `bun run typecheck`, `bun run audit:load`, and lint were not run, per the task's hardware gate.

## Risks or Limitations

- The NTAA 2025 is absent from the repository. All NTAA-dependent values — CIT filing deadline, CIT payment deadline, WHT rate table — remain unresolved by design.
- `Technical-plan.md` section 8.3 conflicts with the statutory ₦50,000,000 threshold. The statutory text wins; the correction is a required v1.2 edit, not made here.
- `Technical-plan.md` section 9.4 references a "prior draft" formula that does not exist in the repository. The formula must be authored from the statutory sections, not recovered from memory.
- This audit reviewed tracked files only. Untracked or generated files were not part of the search.

## Deferred Work

- Author the CIT PRD from these findings.
- Write the CIT calculation and development-levy formula into the technical plan from the statutory sections.
- Correct `Technical-plan.md` section 8.3 to the statutory ₦50,000,000 figure.
- Add NTAA 2025 text to `NRS-docs/` to close the filing and payment deadline gap.
- Build the accounting foundation: expenses, accrual revenue, income statement, fixed assets, company classification.