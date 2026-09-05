# TekVwarho-ProAudit Nigeria Tax Architecture Audit Report

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Evaluate the GitHub repository EfeObus/TekVwarho-ProAudit as a reference
implementation for the BIGDROPS Nigeria NTA 2025 tax and compliance
architecture.

This audit is read-only. No repository was modified.

## Scope

- Inspect the TekVwarho source, tests, and documentation.
- Compare every statutory claim against the canonical BIGDROPS NTA 2025
  materials in NRS-docs/.
- Use the completed TaxBridge audit as a comparison input only.
- Do not treat agreement between TekVwarho and TaxBridge as proof of
  statutory correctness.
- Produce exactly two documentation artifacts:
  - this audit report;
  - a curated reference under the Refrences/ folder.

## Skills used

karpathy, writing-clearly-and-concisely

No tax or accounting-specific skill exists in docs/PROJECTSKILLINDEX.md.
This audit was performed from source architecture and statutory text.

## Documentation standard

ASD-STE100 Simplified Technical English

## Repository identity and version

- Repository: EfeObus/TekVwarho-ProAudit
- Inspected commit: 2c9d905, dated 2026-01-30
- Clone depth: 1 (shallow). No history beyond the head commit.
- Version: 0.1.0 (pyproject.toml)
- License: Proprietary (pyproject.toml line 6)
- Stack: Python 3.11, FastAPI, SQLAlchemy async, PostgreSQL, Alembic
- README claims: "NRS-2026 Compliant", "Production Ready"
- Last commit is 7 months before this audit. Active maintenance is not
  established.

## Files changed

- docs/Reports/general/tekvwarho-proaudit-nigeria-tax-architecture-audit-2026-09-05.md
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Refrences/tekvwarho-proaudit-nigeria-tax-reference.md

## Changes made

None. This task created documentation only. The working tree was not
modified in any other way.

## Baseline git status

Captured before inspection (21 pre-existing entries, unchanged):

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
?? docs/Reports/general/cit-readiness-audit-2026-09-05.md
?? docs/Reports/general/luca-vs-bigdrops-accounting-architecture-audit-2026-09-05.md
?? docs/Reports/general/record-capture-prd-audit-2026-09-05.md
?? docs/Reports/general/taxbridge-nigeria-cit-architecture-audit-2026-09-05.md
?? docs/Reports/multi-tenancy/entity-lifecycle-audit.md
?? docs/Reports/multi-tenancy/ownership-transfer-ui.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-capture-v1.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Refrences/
```

All pre-existing entries belong to concurrent agents. They were not
modified.

---

# 1. EXECUTIVE VERDICT

## USEFUL REFERENCE WITH MATERIAL GAPS

TekVwarho contains the strongest accounting layer of the three candidates
evaluated (Luca, TaxBridge, TekVwarho). Its tax values cannot be trusted.

Decisive reasons:

1. **The accounting layer directly addresses the BIGDROPS accounting
   gaps.** Chart of accounts, double-entry journal, fiscal periods,
   balanced-entry constraint, reversal semantics, approval workflow,
   source-document linkage, and a SHA-256 hash-chained immutable ledger
   are all implemented at source level. This is the architecture BIGDROPS
   would need to build natively.
2. **The CIT tax values are wrong and internally inconsistent.** The
   active calculator uses a non-statutory ₦25M/20% medium band and 3%
   Tertiary Education Tax. The canonical NTA 2025 provides a ₦50M
   small-company threshold, 0% small-company rate, 30% other-company rate,
   and a 4% Development Levy. Four different classification schemes
   coexist inside the repository. None matches the canonical text.
3. **The tax layer is disconnected from the accounting layer.** No tax
   calculator reads the journal or ledger. Assessable profit is a
   client-supplied number, and the adjustment service computes
   `accounting_profit = gross_turnover - total_expenses`, the exact
   shortcut the BIGDROPS CIT readiness audit rejected.
4. **Statutory traceability is nearly absent.** Only one citation to an
   NTA section exists in the entire tax domain ("Section 57" in a
   docstring). No citations to §202, §56, §59, or the First Schedule.

The audit separates the accounting-architecture value (reusable) from the
tax values (not reusable).

---

# 2. NIGERIAN CIT IMPLEMENTATION

## Entry point

- File: app/services/tax_calculators/cit_service.py
- Route: POST /api/v1/entities/{id}/tax/cit/calculate (app/routers/tax.py
  lines 917-948)

## Calculation path

1. Client supplies `gross_turnover` and `assessable_profit` (plus
   `is_new_company`, `company_age_years`,
   `claim_minimum_tax_exemption`).
2. `CITCalculator.calculate_cit` classifies the company by turnover.
3. It applies the band rate to the profit.
4. It computes a 0.5% minimum tax of gross turnover.
5. It adds 3% Tertiary Education Tax to the CIT.
6. It returns floats rounded to 2 decimal places.

## Statutory conflicts

| Element | TekVwarho (cit_service.py) | Canonical NTA 2025 | Verdict |
|---|---|---|---|
| Small-company turnover | ≤ ₦25,000,000 | ≤ ₦50,000,000 (§202) | Incorrect |
| Medium band | ₦25M-₦100M at 20% | No medium band (§56: 0%/30%) | Incorrect |
| Large-company rate | 30% | 30% (§56) | Correct |
| Education/levy charge | TET 3% of assessable profit | Development Levy 4% (§59(1)) | Incorrect |
| Minimum tax | 0.5% of turnover | Not found in canonical extract reviewed | Requires verification |
| Fixed-asset condition | Absent from calculator | ≤ ₦250M (§202) | Missing |
| Professional-services exclusion | Absent | Present (§202) | Missing |
| 25% Presidential Order path | Absent | Present (§56) | Missing |

## Internal inconsistency

Four classification schemes coexist in the repository:

1. app/services/tax_calculators/cit_service.py: ₦25M small (0%), 20%
   medium, 30% large, TET 3%
2. app/models/tax.py CITRecord docstring (lines 221-226): ₦50M small
   (0%), ₦50M-₦100M medium (0%), 30% large, Dev Levy above ₦100M
3. app/services/development_levy_service.py: exemption at turnover ≤
   ₦100M AND fixed assets ≤ ₦250M
4. app/services/tax_calculators/minimum_etr_cgt_service.py: small-company
   classification at ₦100M turnover

The README (line 24) states "0% CIT for turnover ≤ ₦50M". The README
agrees with the statute where the code does not. The documentation and the
implementation disagree with each other.

---

# 3. CAPITAL ALLOWANCES

## Finding: not implemented

- `calculate_cit` receives `assessable_profit` directly. It contains no
  capital-allowance logic.
- `CITService.calculate_adjusted_assessable_profit` (cit_service.py lines
  327-332) accepts `capital_allowances` as a client-supplied number:
  `assessable_profit = accounting_profit + add_backs - further_deductions
  - capital_allowances`.
- No First Schedule computation exists. No qualifying expenditure, asset
  category, acquisition-date, business-use proportion, initial allowance,
  annual allowance, or balancing adjustment logic exists.
- The fixed-asset register stores `acquisition_date`, `acquisition_cost`,
  `depreciation_method`, `depreciation_rate`, `useful_life_years`,
  `residual_value`, and `accumulated_depreciation`
  (app/models/fixed_asset.py lines 133-189). It has no First Schedule
  mapping and no business-use proportion field.
- `STANDARD_DEPRECIATION_RATES` (fixed_asset.py lines 70-81) is an
  accounting depreciation schedule (buildings 10%, plant 25%, vehicles
  25%, etc.). It is not the First Schedule capital-allowance schedule.

## Conclusion

A DEPRECIATION journal entry and a fixed-asset register exist. Statutory
capital allowances do not. This is the same gap BIGDROPS identified in
its CIT readiness audit. BIGDROPS must own the capital-allowance layer.

---

# 4. LOSSES

## Finding: no loss engine

- No tax-loss model exists. Searches for loss-carry-forward, carry-back,
  and tax-loss classes found nothing in app/models/.
- The only loss test (tests/test_tax_calculators.py lines 219-227) passes
  a negative profit and asserts CIT of zero. This is not a loss register.
- No year-of-assessment tracking, same-trade restriction, carry-forward
  limit, or recoupment logic exists.

## Conclusion

A single manually supplied loss value is present. A loss engine is not.
BIGDROPS must own the loss layer.

---

# 5. COMPANY CLASSIFICATION

## Finding: incomplete and inconsistent

- The active calculator classifies on turnover only (cit_service.py
  `get_company_size`).
- The fixed-asset condition (₦250M) exists only in the Development Levy
  and CGT services, not in the CIT calculator.
- The professional-services exclusion of §202 does not exist anywhere.
- The entity model (app/models/entity.py) stores `business_type`, `tin`,
  `annual_turnover`, and `fixed_assets_value`. The classification inputs
  could exist, but the CIT path does not use them.

## Conclusion

Classification uses some required inputs in some services and omits them
in others. No single path implements §202 correctly.

---

# 6. DEVELOPMENT LEVY

## Finding: rate correct, threshold incorrect

File: app/services/development_levy_service.py

| Element | TekVwarho | Canonical NTA 2025 | Verdict |
|---|---|---|---|
| Rate | 4% | 4% (§59(1)) | Correct |
| Base | Assessable profit | Assessable profit (§59) | Correct |
| Entity scope | Limited companies only | Companies; small companies excluded | Partially correct |
| Exemption threshold | Turnover ≤ ₦100M AND fixed assets ≤ ₦250M | Small-company definition (§202): turnover ≤ ₦50M, fixed assets ≤ ₦250M | Turnover threshold incorrect |
| Non-resident exclusion | Not found | Excluded (§59) | Missing |

---

# 7. MINIMUM EFFECTIVE TAX RATE

## Finding: thresholds correct; implementation isolated

File: app/services/tax_calculators/minimum_etr_cgt_service.py

| Element | TekVwarho | Canonical NTA 2025 | Verdict |
|---|---|---|---|
| Rate | 15% | 15% (§57) | Correct |
| Company turnover threshold | ₦50,000,000,000 | ₦50B aggregate turnover (§57) | Correct |
| MNE group threshold | €750,000,000 | €750M (§57) | Correct |
| Applied to ordinary SMEs | No (only MNE/₦50B) | No (§57) | Correct |

This is the one statutory area where TekVwarho matches the canonical text
correctly, and where TaxBridge is wrong. The tests
(tests/test_2026_compliance.py lines 168-224) verify the correct
boundaries.

---

# 8. VAT, WHT, PAYE

## VAT

- Rate: 7.5% (vat_service.py line 38). Consistent with the Nigerian
  standard VAT rate.
- Input VAT recovery with vendor IRN validation exists
  (VATRecoveryRecord, vat_recovery_service). This is the 2025/2026 reform
  concept of IRN-based input VAT recovery. Statutory verification against
  NRS-docs is required before reuse.

## WHT

- Rate table hardcoded (wht_service.py lines 53-63): 10% for dividends,
  interest, rent, royalties, technical, management, director fees; 5% for
  professional services (company), contract/supply, consultancy,
  construction.
- No statutory citation. The BIGDROPS WHT rate question is unresolved
  because the subsidiary regulation is not sourced. TekVwarho's rates
  cannot close that item.

## PAYE

- Progressive bands with an ₦800,000 tax-free threshold and CRA of 20%
  (paye_service.py lines 66-118).
- PAYE is personal income tax. It is outside the CIT scope. The bands are
  claimed as 2026 reform values and require statutory verification against
  NRS-docs, which is not part of this audit.

---

# 9. FILING AND COMPLIANCE

## Finding: workflow and hardcoded dates, no statutory return engine

- No TaxReturn, TaxFiling, TaxObligation, or TaxDeadline model exists.
- The filing calendar (app/routers/tax.py lines 1355-1420) generates
  deadlines from hardcoded date rules: VAT 21st, PAYE 10th, WHT 21st, CIT
  30 June. No statutory citation is attached.
- VAT return preparation (tax.py line 304) formats data for FIRS filing.
  It is a data export, not a statutory return computation.
- Penalty logic (compliance_penalty_service.py) uses a 10% base penalty
  plus 2% interest. No NTAA citation exists.
- CITRecord carries an `is_filed` boolean flag. Filing status is a flag,
  not a filing record.

## Conclusion

The filing features are workflow and UI, with hardcoded schedule data.
Because NTAA 2025 is absent from the BIGDROPS NRS-docs, none of these
deadline values may be adopted without a primary source. BIGDROPS must
own the compliance and filing layer.

---

# 10. ACCOUNTING DEPENDENCIES

## Finding: the accounting foundation exists, but does not feed the tax layer

TekVwarho implements, at source level:

- ChartOfAccounts (entity-scoped, parent hierarchy, normal balance)
- FiscalYear and FiscalPeriod (OPEN, PENDING_CLOSE, CLOSED, LOCKED,
  REOPENED; bank-reconciliation gate on close; 13th period permitted)
- JournalEntry (DRAFT, PENDING, POSTED, REVERSED, VOIDED; balanced-entry
  check constraint `total_debit = total_credit`; approval workflow;
  reversal tracking with original/reversal entry IDs; source-document
  linkage; attachments; NGN default currency)
- JournalEntryLine (debit/credit amounts, tax code, tax amount,
  customer/vendor link, dimensions)
- Bank reconciliation (CSV/OFX), trial balance, P&L, balance sheet,
  consolidation, budget, dunning, year-end close
- FixedAsset register with depreciation entries and disposal types
- ImmutableLedgerService: SHA-256 hash chain with chain-integrity
  verification (app/services/immutable_ledger.py)

## Critical boundary finding

The tax calculators never import from the accounting model. The CIT
service derives annual turnover from invoices
(`get_annual_turnover` reads Invoice.total_amount), not from the ledger.
Assessable profit is client-supplied. The accounting-to-tax bridge does
not exist inside TekVwarho either.

---

# 11. TAX ADJUSTMENT LAYER

## Finding: exists as a manual input, not a computed layer

`CITService.calculate_adjusted_assessable_profit` (cit_service.py lines
320-357) accepts `add_backs`, `further_deductions`, and
`capital_allowances` as client-supplied values and computes:

```
accounting_profit = gross_turnover - total_expenses
assessable_profit = accounting_profit + add_backs - further_deductions - capital_allowances
```

This is the `revenue - expenses` shortcut that the BIGDROPS CIT readiness
audit explicitly rejected. There is no statutory adjustment registry, no
allowable/disallowable classification, and no depreciation add-back
automation.

---

# 12. PRECISION AND MONETARY SAFETY

## Finding: good internal discipline, weak boundary contracts

- All accounting columns use Numeric(18,2). All tax services use
  Decimal internally.
- Calculator contracts accept `float` and return `float` rounded to 2
  decimals (cit_service.py, min ETR service).
- The Decimal-to-float conversion at input and output is a precision risk
  at the API boundary.
- No floating-point arithmetic inside the calculations themselves.
- This is materially better than TaxBridge (raw JS numbers and
  Math.round).

---

# 13. RULE ARCHITECTURE

## Finding: no versioning, no effective dates, near-zero citations

- Tax rates are module-level constants (CIT_RATES, WHT_RATES,
  NIGERIA_VAT_RATE) with no effective-date or year-of-assessment
  metadata.
- No `effective_date`, `effective_from`, `year_of_assessment`, or
  `rule_version` exists in the tax services or tax models.
- The only statutory citation in the tax domain is "Section 57" in the
  minimum_etr_cgt_service.py docstring.
- The README "Rule Versioning" claim (line 395) refers to the audit
  system's rule capture, not tax rules.
- The engine cannot represent NTA 2025 versus future amendments.

---

# 14. TESTING

## Finding: extensive tests that validate the wrong boundaries

- 24 test files.
- tests/test_tax_calculators.py: 28 test functions.
- tests/test_2026_compliance.py: 231 test functions.
- Tests exist for CIT, VAT, WHT, PAYE, minimum ETR, CGT, penalties, and
  input VAT recovery.
- Boundary tests encode the wrong thresholds:
  - test_cit_exact_25m_threshold: ₦25M is small (0%)
  - test_cit_exact_100m_threshold: ₦100M is medium (20%)
  - test_cit_medium_business_20_percent: ₦50M pays 20%
- No test covers the statutory ₦50M small-company CIT boundary, the
  professional-services exclusion, or capital allowances.
- The minimum-ETR tests are correct and match §57.
- Tests validate application constants rather than statutory boundaries.

---

# 15. STATUTORY TRACEABILITY

| Rule | Implementation source | Citation in source | Canonical section | Verdict |
|---|---|---|---|---|
| CIT rates | cit_service.py constants | None | §56 | Incorrect values, no citation |
| Small-company | cit_service.py `get_company_size` | None | §202 | Incorrect threshold, no citation |
| Dev Levy | development_levy_service.py | None | §59 | Rate correct, threshold wrong, no citation |
| Min ETR | minimum_etr_cgt_service.py | "Section 57" | §57 | Values correct, single docstring citation |
| Capital allowances | None | None | First Schedule | Missing |
| Losses | None | None | §27 and related | Missing |
| WHT | wht_service.py constants | None | Subsidiary regulation | Unverifiable |

---

# 16. TAXBRIDGE COMPARISON

| Dimension | TaxBridge | TekVwarho |
|---|---|---|
| Small-company threshold | ₦100M (wrong) | ₦25M in calculator, ₦50M in docstring, ₦100M in levy service (all inconsistent) |
| Medium band | 20% at ₦100M | 20% at ₦25M-₦100M (same recurring mistake) |
| Dev Levy / TET | EDT inside rules JSON | TET 3% in calculator; 4% levy service |
| Min ETR | ₦1B threshold (wrong) | ₦50B/€750M (correct) |
| Capital allowances | None | None |
| Losses | None | None |
| Precision | JS floats, Math.round | Decimal internally, float at boundaries |
| Citations | Wrong sections (§55, §40/90) | Nearly none |
| Accounting layer | None | Full double-entry GL |
| Tenancy | Org model | BusinessEntity model |

The recurring mistake across both repositories is the non-statutory
medium band. Agreement between the two repositories does not establish
correctness. The canonical NTA 2025 does not contain a 20% band.

---

# 17. MULTI-TENANCY AND SECURITY

## Finding: entity-scoped at the application layer; no RLS

- BusinessEntity (app/models/entity.py line 40) scopes every accounting
  and tax table via `entity_id` foreign keys with CASCADE delete.
- Access control is application-level
  (`verify_entity_access` in routers). No Postgres row-level security
  policy was found in app/ or the Alembic versions.
- This is closer to BIGDROPS's entity model than Luca's single-tenant
  design, but it lacks the RLS hardening BIGDROPS already has.

---

# 18. REUSABLE DESIGN PATTERNS FOR BIGDROPS

Adopt conceptually:

- Entity-scoped chart of accounts with parent hierarchy and normal
  balance.
- Fiscal-year/period model with OPEN, PENDING_CLOSE, CLOSED, LOCKED,
  REOPENED states and a bank-reconciliation gate before close.
- Journal entry with a database-level balanced-entry constraint
  (`total_debit = total_credit`).
- Non-destructive corrections: POSTED, REVERSED, VOIDED states with
  original/reversal entry links.
- Approval workflow on journal entries.
- Source-document linkage on journal entries (module, document type,
  document id, reference).
- Decimal discipline: Numeric(18,2) columns and Decimal arithmetic.
- The SHA-256 hash-chain ledger as an optional stronger audit pattern,
  kept separate from the core immutable-journal principle.
- Input VAT recovery tracking with vendor IRN (subject to statutory
  verification against NRS-docs).
- Test style: boundary tests at exact thresholds (with corrected values).

## Patterns explicitly NOT to copy

- The ₦25M/₦100M classification bands and the 20% medium rate.
- TET 3% as the education charge.
- The 0.5% minimum tax without statutory verification.
- The `accounting_profit = gross_turnover - total_expenses` shortcut.
- Client-supplied `assessable_profit` with no ledger source.
- Hardcoded filing deadlines with no citation.
- Float conversion at calculator boundaries.
- The Proprietary license. Nothing may be copied from TekVwarho source.

---

# 19. RECOMMENDED OWNERSHIP BOUNDARIES

| Layer | Owner |
|---|---|
| Accounting layer (GL, periods, assets) | Native BIGDROPS accounting module, modeled on TekVwarho/Luca concepts |
| Tax-adjustment layer | BIGDROPS tax domain |
| Nigerian CIT engine | BIGDROPS tax domain, built from canonical NTA 2025 |
| Compliance and filing layer | BIGDROPS compliance domain |

---

# 20. OPEN QUESTIONS

Blocking:

- Which statutory source establishes the WHT rate table and WHT remittance
  deadline? (The subsidiary regulation is not sourced.)
- Does the NTA 2025 retain any minimum-tax concept equivalent to the 0.5%
  turnover charge? (Not found in the canonical extract reviewed.)
- What is the statutory treatment of the 25% Presidential Order path under
  §56, and when does it become effective?

High-risk:

- IRN-based input VAT recovery and B2C real-time reporting: which sections
  of the NTA 2025 govern these, and are they in the canonical NRS-docs?
- CGT at the CIT rate (30%): verify against the NTA 2025 CGT provisions.
- PAYE band values: verify against NRS-docs personal-tax provisions.

Non-blocking:

- Business-use proportion field for fixed assets (needed later for
  capital-allowance proration).

---

# 21. FINAL DECISION

- Recommendation: Use TekVwarho as a reference for the accounting layer
  and for one correct statutory model (minimum ETR). Do not use its tax
  values, its classification logic, or its deadlines.
- Confidence: High.
- Decisive evidence: the accounting models in app/models/accounting.py
  (balanced journal, period lifecycle, reversal semantics, hash-chain
  ledger); the incorrect and internally inconsistent classification in
  cit_service.py; the README-vs-code divergence; the absence of citations;
  the absence of capital-allowance and loss engines.
- Conditions that would change the recommendation: a corrected CIT engine
  matching NTA §56/§202/§59 with per-rule statutory citations and
  effective dates; an automated ledger-to-tax bridge; an open license.

## Verification

- git status before: 21 pre-existing entries captured. All left untouched.
- git status after: baseline plus the two intended documentation files
  only.
- The TekVwarho clone in /tmp/tekvwarho is read-only and unchanged.
- No build, typecheck, lint, audit:load, migration, or application
  execution was run.

## Risks or limitations

- Shallow clone: only the head commit was inspected. No history review.
- The canonical NTA 2025 extract reviewed covers §5-§6, §20-§22, §27,
  §56-§59, §202, and the First Schedule. Rules outside those sections
  (for example, IRN reporting, CGT, and PAYE details) were flagged for
  verification rather than resolved.
- NTAA 2025 is absent from BIGDROPS NRS-docs. All filing-deadline values
  in TekVwarho are unverifiable against primary text and must remain
  unresolved.

## Deferred work

- A separate verification pass against the canonical text for IRN-based
  input VAT recovery, CGT-at-CIT-rate, and PAYE bands.
- Sourcing the WHT subsidiary regulation and the NTAA 2025 gazette text.
- A first-class asset register and capital-allowance computation inside
  the future BIGDROPS accounting module.